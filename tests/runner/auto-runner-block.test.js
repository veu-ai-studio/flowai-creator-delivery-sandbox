// W2 Phase 1 (dispatch 4-of-4, 2026-05-14) — Auto Runner pipeline block gate.
//
// Scope: addresses SSOT_PARKING_LOT ENTRY 003 gap (a).  When an upstream
// agent returns block:true with blockSeverity:'critical', Auto Runner
// must halt the pipeline and mark every downstream step 'skipped' with
// reason 'upstream-blocked-by-step-N'.
//
// This test mirrors the PA #2.7b pattern (tests/agents/pa-2.7b-...) —
// pure-function tests on the gate helpers + static-source assertions on
// AutoRunner.jsx so a regression that silently removes the wire-in is
// caught at CI time.
//
// Vitest config does NOT load the Vite plugin chain, so `@/` imports do
// not resolve here.  The pure gate logic lives in src/lib/runner/
// blockGate.js — that module imports nothing Vite-specific, so we test
// it directly.  AutoRunner.jsx itself is read as TEXT and checked for
// the canonical call sites.

import { describe, it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  shouldHaltOnBlock,
  buildSkippedResult,
  applyBlockGate,
  serializeResultsForPersist,
} from '../../src/lib/runner/blockGate.js';
import { researchViaApi } from '../../src/lib/operationsEngine.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTORUNNER_PATH = path.resolve(HERE, '..', '..', 'src', 'pages', 'AutoRunner.jsx');
const RESEARCH_API_PATH = path.resolve(HERE, '..', '..', 'api', 'research-url.js');

// ─── REQ A — shouldHaltOnBlock semantics ──────────────────────────────────
describe('block gate — shouldHaltOnBlock', () => {
  it('returns false for a step result with no block field', () => {
    expect(shouldHaltOnBlock({ full_output: 'x', summary: 'x' })).toBe(false);
  });

  it('returns false for null / undefined / non-object', () => {
    expect(shouldHaltOnBlock(null)).toBe(false);
    expect(shouldHaltOnBlock(undefined)).toBe(false);
    expect(shouldHaltOnBlock(0)).toBe(false);
    expect(shouldHaltOnBlock('block')).toBe(false);
  });

  it('returns false when block is not strictly true', () => {
    expect(shouldHaltOnBlock({ block: 1 })).toBe(false);
    expect(shouldHaltOnBlock({ block: 'true' })).toBe(false);
    expect(shouldHaltOnBlock({ block: false })).toBe(false);
  });

  it('returns true for block:true with severity "critical"', () => {
    expect(shouldHaltOnBlock({ block: true, blockSeverity: 'critical' })).toBe(true);
  });

  it('returns true for block:true with severity unset (default critical)', () => {
    expect(shouldHaltOnBlock({ block: true })).toBe(true);
  });

  it('returns false for block:true with severity "high" (soft signal — does not halt today)', () => {
    expect(shouldHaltOnBlock({ block: true, blockSeverity: 'high' })).toBe(false);
  });
});

// ─── REQ B — buildSkippedResult / applyBlockGate ──────────────────────────
describe('block gate — buildSkippedResult', () => {
  it('emits a result with _skipped:true and reason upstream-blocked-by-step-N (1-based)', () => {
    const r = buildSkippedResult(0);
    expect(r._skipped).toBe(true);
    expect(r._skippedReason).toBe('upstream-blocked-by-step-1');
    expect(r.full_output).toMatch(/SKIPPED.*upstream blocked at step 1/);
    expect(r.summary).toMatch(/Skipped/);
  });

  it('1-based formatting is correct for index 4 → step 5', () => {
    const r = buildSkippedResult(4);
    expect(r._skippedReason).toBe('upstream-blocked-by-step-5');
  });
});

describe('block gate — applyBlockGate', () => {
  it('marks every step AFTER blockedAtIdx as skipped, leaves earlier steps alone', () => {
    const statuses = ['complete', 'complete', 'running', 'waiting', 'waiting', 'waiting', 'waiting', 'waiting'];
    const results = [
      { full_output: 'r1', summary: 'r1' },
      { full_output: 'r2', summary: 'r2', block: true, blockSeverity: 'critical', blockReason: 'page content insufficient' },
      null, null, null, null, null, null,
    ];
    applyBlockGate({ statuses, results, blockedAtIdx: 1 });
    expect(statuses).toEqual(['complete', 'complete', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped', 'skipped']);
    expect(results[0]).toEqual({ full_output: 'r1', summary: 'r1' });
    expect(results[1].block).toBe(true);
    for (let j = 2; j < 8; j++) {
      expect(results[j]._skipped).toBe(true);
      expect(results[j]._skippedReason).toBe('upstream-blocked-by-step-2');
    }
  });

  it('is idempotent — re-applying with the same index produces the same arrays', () => {
    const statuses = ['complete', 'running', 'waiting', 'waiting'];
    const results = [{ summary: 'a', full_output: 'a' }, { summary: 'b', full_output: 'b', block: true }, null, null];
    applyBlockGate({ statuses, results, blockedAtIdx: 1 });
    const snapStatuses = [...statuses];
    const snapResults = results.map((r) => (r ? { ...r } : null));
    applyBlockGate({ statuses, results, blockedAtIdx: 1 });
    expect(statuses).toEqual(snapStatuses);
    expect(results.map((r) => (r ? { ...r } : null))).toEqual(snapResults);
  });

  it('throws on non-array input or negative index', () => {
    expect(() => applyBlockGate({ statuses: null, results: [], blockedAtIdx: 0 })).toThrow();
    expect(() => applyBlockGate({ statuses: [], results: null, blockedAtIdx: 0 })).toThrow();
    expect(() => applyBlockGate({ statuses: [], results: [], blockedAtIdx: -1 })).toThrow();
    expect(() => applyBlockGate({ statuses: [], results: [], blockedAtIdx: 1.5 })).toThrow();
  });

  it('no-op when blockedAtIdx is the last index', () => {
    const statuses = ['complete', 'complete'];
    const results = [{ summary: 'a', full_output: 'a' }, { summary: 'b', full_output: 'b', block: true }];
    applyBlockGate({ statuses, results, blockedAtIdx: 1 });
    expect(statuses).toEqual(['complete', 'complete']);
  });
});

// ─── REQ C — serializeResultsForPersist preserves block fields ────────────
describe('block gate — serializeResultsForPersist', () => {
  it('carries block fields on the blocking step and _skipped on the rest', () => {
    const STEPS = [{ key: 'research' }, { key: 'design' }, { key: 'build' }];
    const results = [
      { full_output: 'r1', summary: 's1', block: true, blockReason: 'page content insufficient', blockSeverity: 'critical' },
      { full_output: 'SKIPPED', summary: 'Skipped', _skipped: true, _skippedReason: 'upstream-blocked-by-step-1' },
      { full_output: 'SKIPPED', summary: 'Skipped', _skipped: true, _skippedReason: 'upstream-blocked-by-step-1' },
    ];
    const out = serializeResultsForPersist(results, STEPS);
    expect(out.research.block).toBe(true);
    expect(out.research.blockReason).toBe('page content insufficient');
    expect(out.research.blockSeverity).toBe('critical');
    expect(out.design._skipped).toBe(true);
    expect(out.design._skippedReason).toBe('upstream-blocked-by-step-1');
    expect(out.build._skipped).toBe(true);
    expect(out.build.block).toBeUndefined();
  });

  it('truncates full_output to 2000 chars for non-block entries (matches existing persist behavior)', () => {
    const STEPS = [{ key: 'research' }];
    const long = 'a'.repeat(3000);
    const out = serializeResultsForPersist([{ full_output: long, summary: 's' }], STEPS);
    expect(out.research.full_output.length).toBe(2000);
  });

  it('null results emit null entries', () => {
    const STEPS = [{ key: 'a' }, { key: 'b' }];
    const out = serializeResultsForPersist([{ full_output: 'x', summary: 'x' }, null], STEPS);
    expect(out.b).toBeNull();
  });
});

// ─── REQ D — End-to-end gate simulation (8-step pipeline) ─────────────────
describe('block gate — end-to-end 8-step simulation', () => {
  it('Step-1 block halts pipeline; Steps 2–8 marked SKIPPED with upstream-blocked-by-step-1', () => {
    // Simulate the 8-step shape used by Auto Runner.
    const STEPS = [
      { key: 'research' }, { key: 'design' }, { key: 'build' }, { key: 'qa_audit' },
      { key: 'deploy' }, { key: 'govern' }, { key: 'gtm' }, { key: 'monitor' },
    ];
    const statuses = STEPS.map(() => 'waiting');
    const results = STEPS.map(() => null);

    // Step 1 (research) returns block:true critical — mimicking what
    // /api/research-url returns when crawl produces null body.
    statuses[0] = 'complete';
    results[0] = {
      full_output: 'PIPELINE BLOCKED — Page content insufficient — crawl returned no usable body.',
      summary: 'Page content insufficient',
      block: true,
      blockReason: 'Page content insufficient — crawl returned no usable body.',
      blockSeverity: 'critical',
    };

    // Run the gate.
    expect(shouldHaltOnBlock(results[0])).toBe(true);
    applyBlockGate({ statuses, results, blockedAtIdx: 0 });

    // Assert: pipeline halts after Step 1.
    expect(statuses[0]).toBe('complete');
    for (let j = 1; j < STEPS.length; j++) {
      expect(statuses[j]).toBe('skipped');
      expect(results[j]._skipped).toBe(true);
      expect(results[j]._skippedReason).toBe('upstream-blocked-by-step-1');
    }
  });

  it('blocks at Step 3 leave Steps 1–3 untouched and only Steps 4–8 SKIPPED', () => {
    const STEPS = Array.from({ length: 8 }, (_, i) => ({ key: `s${i}` }));
    const statuses = ['complete', 'complete', 'complete', 'waiting', 'waiting', 'waiting', 'waiting', 'waiting'];
    const results = [
      { full_output: 'a', summary: 'a' },
      { full_output: 'b', summary: 'b' },
      { full_output: 'c', summary: 'c', block: true, blockSeverity: 'critical', blockReason: 'critical content gap' },
      null, null, null, null, null,
    ];
    applyBlockGate({ statuses, results, blockedAtIdx: 2 });
    expect(statuses.slice(0, 3)).toEqual(['complete', 'complete', 'complete']);
    expect(statuses.slice(3)).toEqual(['skipped', 'skipped', 'skipped', 'skipped', 'skipped']);
    for (let j = 3; j < 8; j++) {
      expect(results[j]._skippedReason).toBe('upstream-blocked-by-step-3');
    }
  });
});

// ─── REQ E — researchViaApi surfaces block instead of returning null ─────
describe('researchViaApi — block path (W2 Phase 1)', () => {
  const realFetch = global.fetch;
  function mockFetch(impl) { global.fetch = impl; }
  it('returns { block:true, blockReason, blockSeverity:"critical" } when API returns ok:false + block:true', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        ok: false,
        reachable: false,
        block: true,
        blockSeverity: 'critical',
        blockReason: 'Page content insufficient — crawl returned no usable body.',
        reason: 'crawl returned no usable body',
        attempts: [],
        url: 'https://x.example',
      }),
    }));
    try {
      const r = await researchViaApi('https://x.example');
      expect(r).not.toBeNull();
      expect(r.block).toBe(true);
      expect(r.blockSeverity).toBe('critical');
      expect(r.blockReason).toMatch(/Page content insufficient/);
    } finally {
      global.fetch = realFetch;
    }
  });

  it('still returns null when API returns ok:false WITHOUT block (backwards-compatible fall-through)', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, reachable: false, reason: 'timeout' }),
    }));
    try {
      const r = await researchViaApi('https://x.example');
      expect(r).toBeNull();
    } finally {
      global.fetch = realFetch;
    }
  });

  it('still returns analysis on the happy path (no behavior change)', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, analysis: 'PRODUCT OVERVIEW\n- ok', page: { title: 'T' } }),
    }));
    try {
      const r = await researchViaApi('https://x.example');
      expect(r.analysis).toMatch(/PRODUCT OVERVIEW/);
      expect(r.block).toBeUndefined();
    } finally {
      global.fetch = realFetch;
    }
  });
});

// ─── REQ F — Static assertions on AutoRunner.jsx + research-url.js ────────
let _autoRunnerSource = null;
async function autoRunnerSource() {
  if (_autoRunnerSource) return _autoRunnerSource;
  _autoRunnerSource = await readFile(AUTORUNNER_PATH, 'utf8');
  return _autoRunnerSource;
}
let _researchApiSource = null;
async function researchApiSource() {
  if (_researchApiSource) return _researchApiSource;
  _researchApiSource = await readFile(RESEARCH_API_PATH, 'utf8');
  return _researchApiSource;
}

describe('static assertions — AutoRunner.jsx wires the block gate', () => {
  it('imports shouldHaltOnBlock + applyBlockGate from src/lib/runner/blockGate', async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/import\s+\{[^}]*shouldHaltOnBlock[^}]*\}\s+from\s+['"][^'"]*runner\/blockGate['"]/);
    expect(src).toMatch(/import\s+\{[^}]*applyBlockGate[^}]*\}\s+from\s+['"][^'"]*runner\/blockGate['"]/);
  });

  it('calls shouldHaltOnBlock(results[i]) inside the step loop', async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/shouldHaltOnBlock\(\s*results\[i\]\s*\)/);
  });

  it('calls applyBlockGate with statuses/results/blockedAtIdx', async () => {
    const src = await autoRunnerSource();
    // At least two call sites — research-inline branch + the post-step gate.
    const calls = src.match(/applyBlockGate\s*\(/g) || [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/applyBlockGate\(\s*\{\s*statuses\s*,\s*results\s*,\s*blockedAtIdx:\s*i\s*\}\s*\)/);
  });

  it("declares the 'skipped' status variant in the StepCard cfg", async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/skipped\s*:\s*\{/);
    expect(src).toMatch(/SKIPPED/);
  });

  it('renders a PIPELINE BLOCKED banner gated on blockedAtIdx !== null', async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/Pipeline blocked at step/i);
    expect(src).toMatch(/blockedAtIdx\s*!==\s*null/);
  });

  it('declares blockedAtIdx React state via useState', async () => {
    const src = await autoRunnerSource();
    expect(src).toMatch(/useState\([^)]*\)\s*;\s*\/\/[^\n]*blockedAtIdx|setBlockedAtIdx/);
  });

  it('research-step block path emits block:true + blockSeverity on the step result', async () => {
    const src = await autoRunnerSource();
    // The inline research branch must produce a step result carrying
    // block:true so the gate (and the UI) recognise it.
    expect(src).toMatch(/block:\s*true/);
    expect(src).toMatch(/blockSeverity/);
  });
});

describe('static assertions — api/research-url.js emits block on page-fail', () => {
  it('page-fail response includes block:true + blockSeverity:"critical" + blockReason', async () => {
    const src = await researchApiSource();
    // The page-fail branch must add the block envelope.
    expect(src).toMatch(/block:\s*true/);
    expect(src).toMatch(/blockSeverity:\s*['"]critical['"]/);
    expect(src).toMatch(/blockReason/);
  });
});
