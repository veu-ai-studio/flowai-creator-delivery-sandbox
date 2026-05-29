// W3 — Allowlist CI guard (Flag 9 disposition, Position A).
//
// Any evaluator returning status='deferred' whose id is NOT in
// w3/deferred-evaluators.json fails CI. This is the structural guard that
// prevents future deferrals from quietly lowering measurement coverage.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadRubric, loadEvaluators } from '../src/lib/audits/rubricRunner.js';

const ALLOWLIST_PATH = 'w3/deferred-evaluators.json';
const target = { type: 'agent', id: 11 };

function emptyCtx() {
  return {
    auditLog:      { query: async () => [] },
    messageBus:    { query: async () => [], listTopics: async () => [], getTopicHealth: async () => ({ exists: false }) },
    registry:      { getActiveAgents: async () => [], getCharter: async () => null, getSchemaFor: async () => null, validatePayload: () => true },
    auditChain:    { verifyRange: async () => ({ ok: true, breaks: [] }) },
    errorLog:      { query: async () => [] },
    baseAgentRuns: { query: async () => [] },
    clock:         { now: () => 1715000000000 },
    windowMs:      86400000,
    env:           { mode: 'prod' },
  };
}

function loadAllowlist() {
  const p = resolve(process.cwd(), ALLOWLIST_PATH);
  expect(existsSync(p), `Allowlist file missing at ${ALLOWLIST_PATH}`).toBe(true);
  const data = JSON.parse(readFileSync(p, 'utf8'));
  expect(Array.isArray(data.approvedDeferrals)).toBe(true);
  return new Set(data.approvedDeferrals.map(e => e.evaluator));
}

describe('W3 deferred-evaluators allowlist', () => {
  it('w3/deferred-evaluators.json exists and is well-formed', () => {
    const allowed = loadAllowlist();
    expect(allowed.size).toBeGreaterThan(0);
  });

  it('contains exactly the 3 CEO-approved deferred evaluators', () => {
    const allowed = loadAllowlist();
    expect(allowed.has('gov.ip_protection')).toBe(true);
    expect(allowed.has('rdy.performance')).toBe(true);
    expect(allowed.has('rdy.observability')).toBe(true);
    expect(allowed.size).toBe(3);
  });

  it('every entry has a non-empty blockedBy and reason', () => {
    const data = JSON.parse(readFileSync(resolve(process.cwd(), ALLOWLIST_PATH), 'utf8'));
    for (const entry of data.approvedDeferrals) {
      expect(typeof entry.blockedBy).toBe('string');
      expect(entry.blockedBy.length).toBeGreaterThan(0);
      expect(typeof entry.reason).toBe('string');
      expect(entry.reason.startsWith('deferred-pending-')).toBe(true);
    }
  });
});

describe('W3 allowlist CI guard — no evaluator may defer outside the allowlist', () => {
  it('every evaluator that returns status=deferred is listed in the allowlist', async () => {
    const allowed = loadAllowlist();
    const offenders = [];
    for (const version of ['governance.v1', 'readiness.v1']) {
      const rubric = loadRubric(version);
      const evs = await loadEvaluators(version);
      for (const c of rubric.criteria) {
        const r = await evs[c.id](target, emptyCtx());
        if (r.status === 'deferred') {
          if (!allowed.has(c.id)) {
            offenders.push({ rubric: version, criterion: c.id, reason: r.reason ?? '<missing reason>' });
          }
        }
      }
    }
    if (offenders.length > 0) {
      const detail = offenders.map(o => `${o.criterion} (${o.rubric}, reason=${o.reason})`).join(', ');
      throw new Error(`Out-of-allowlist deferred evaluators detected: ${detail}. Add to w3/deferred-evaluators.json with explicit CEO approval, or replace with real measurement.`);
    }
    expect(offenders).toEqual([]);
  });

  it('every allowlisted evaluator does in fact return status=deferred (no stale entries)', async () => {
    const allowed = loadAllowlist();
    const stale = [];
    for (const version of ['governance.v1', 'readiness.v1']) {
      const rubric = loadRubric(version);
      const evs = await loadEvaluators(version);
      for (const c of rubric.criteria) {
        if (!allowed.has(c.id)) continue;
        const r = await evs[c.id](target, emptyCtx());
        if (r.status !== 'deferred') {
          stale.push({ rubric: version, criterion: c.id, observedStatus: r.status });
        }
      }
    }
    if (stale.length > 0) {
      const detail = stale.map(s => `${s.criterion} (${s.rubric}, observed status=${s.observedStatus})`).join(', ');
      throw new Error(`Stale allowlist entries detected: ${detail}. These evaluators are no longer deferred; remove them from w3/deferred-evaluators.json.`);
    }
    expect(stale).toEqual([]);
  });
});
