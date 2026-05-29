// Layer 2 SSOT — Implementation Plan Panel Driver
//
// Multi-AI panel review answering 20 implementation-planning questions
// against the Layer 1 canonical SSOT + canonical reference + history.
// Saves raw markdown responses, no synthesis, no normalization.
//
// Slot map mirrors Layer 1; Slot 5 (Vercel v0) is now LIVE (W5c-shipped
// adapter; verified by scripts/run-panel-smoke.mjs).

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const DATE = '2026-05-11';
const OUT_DIR = path.join(REPO, 'docs', 'implementation-review');
const OUT_PATH = path.join(OUT_DIR, `layer2-impl-panel-review-${DATE}.md`);

const PER_REVIEWER_TIMEOUT_MS = 240_000;

const CRITICAL_CONTEXT = `
You are a senior architect designing the implementation plan for FlowAI, a $5 billion operating system infrastructure for an AI products company (VEU AI Studio). Your answers will become the canonical implementation plan. Apply the rigor appropriate to that scale.

CRITICAL CONTEXT:
- 25 agents (G3-ratified): #1–#20 defined with full charters; #21–#25 Ops Runner stubs active.
- Layer 1 SSOT is CANONICAL at docs/FLOWAI_SSOT.md — all Layer 2 answers must be consistent with it.
- Phase 0 is COMPLETE (commit 5dec08d, 95 files, 879 passing tests).
- Agents shipped so far: #1 (Lifecycle Engine), #2 (Code Builder), #3 (Self-Renewal) — all SHIPPED-GREEN on flowai-v0.1.
- OrchestratorHub, AgentRegistry, MessageBus are BUILT.
- 8-step pipeline (code-canonical order): Research(1) → Design(2) → Build(3) → Quality Audit(4) → Deploy(5) → Self-Renewal(6) → GTM(7) → Monitor(8).
- All 5 flagship products (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) are REAL production consumers — not experimental.
- FlowAI self-tests through its own pipeline.
- FlowAI will natively orchestrate the 10-AI Panel once built.
`.trim();

const QUESTIONS_BLOCK = `
--- BEGIN 20 LAYER 2 IMPLEMENTATION QUESTIONS ---

PHASES + GATES (PG1–PG5)

PG1. Phase structure: what are the named phases of FlowAI's build from current state (3 agents shipped, Phase 0 complete) to full 25-agent production? How many phases, and what is the exit gate for each?

PG2. Success criteria: for each phase gate, what are the specific, measurable criteria that must be met before advancing? (tests, coverage, governance scores, slot counts, product integration milestones, etc.)

PG3. Rollback policy: if a phase gate fails after partial deployment, what is the rollback protocol? At what granularity (per-agent, per-phase, per-product)?

PG4. Parallel vs sequential: which phases or agent builds can run in parallel, and which must be strictly sequential? What are the hard dependencies?

PG5. Authority progression: agents ship at recommend_only authority. What is the protocol for elevating an agent's authority level, and what gate must it pass first?

AGENT BUILD SEQUENCE (AB1–AB5)

AB1. Build order for remaining 22 agents (#4 through #25): what is the optimal sequence given inter-agent dependencies, product integration needs, and risk profile?

AB2. Dependency map: which agents depend on other agents being live before they can be built or wired? Produce a dependency graph in text form (agent → depends on).

AB3. Ops Runner charters (#21–#25): what specific responsibilities, step assignments, and consumes/produces contracts should each Ops Runner carry?

AB4. Wire-in sequencing: agents ship dormant until OrchestratorHub wire-in. What is the optimal wire-in order and what triggers the wire-in for each agent?

AB5. Testing strategy per agent: beyond the per-agent Gate 5 regression-free smoke test, what is the full testing contract for each agent category (Step-Owner vs Cross-Step vs Always-On)?

PRODUCT INTEGRATION (PI1–PI4)

PI1. Integration sequence: in what order should the 5 flagship products be fully integrated with FlowAI? What criteria determines sequence priority?

PI2. Integration gate: what must be true of both FlowAI and a product before integration begins? (agent count, governance score, product health baseline, etc.)

PI3. Continuous crawl activation: at what phase does FlowAI begin live Playwright crawling of each product? What is the activation protocol?

PI4. 12-agent embedding: when and how do the 12 embedded agents get wired into each product? Is it per-product or simultaneous across all 5?

DEPENDENCY GRAPH + DEFERRED INVENTORY (DG1–DG3)

DG1. Critical path: what is the single longest chain of dependencies from current state to full 25-agent production with all 5 products integrated? What is the bottleneck?

DG2. Deferred features: what capabilities are explicitly deferred to post-production (headless adapters, Ops Runner full charters, marketplace intelligence activation, etc.)? What triggers their activation?

DG3. External dependencies: what external blockers (CEO actions, third-party credentials, Playwright codegen, infrastructure decisions) must be resolved and in what order?

RISK + RECOVERY (RR1–RR3)

RR1. Top 3 implementation risks given current state, and proposed mitigation per risk.

RR2. Minimum viable FlowAI: if forced to ship a stripped version immediately, what is the minimum agent + pipeline + governance set that still delivers the core value proposition?

RR3. Self-testing protocol: how specifically does FlowAI test itself through its own 8-step pipeline? What artifacts, inputs, and pass/fail criteria apply when FlowAI is both the system under test and the test runner?

--- END 20 LAYER 2 QUESTIONS ---
`.trim();

const REVIEWER_TASK = `
You have been given 20 implementation planning questions across Phases+Gates, Agent Build Sequence, Product Integration, Dependency Graph, and Risk+Recovery.

For each question:
  (a) ANSWER: your recommended position in 2–4 lines.
  (b) CONFIDENCE: HIGH | MEDIUM | LOW
  (c) KEY ASSUMPTION: the one assumption your answer depends on.

After all 20, add:
  (1) What implementation questions were NOT asked that a $5B OS infrastructure with 25 agents, 5 real production products, self-testing, and self-orchestrating Panel should have answered before building?
  (2) What is the single highest-risk implementation decision that CEO should personally review before Phase 1 begins?

Return STRUCTURED markdown. No JSON, no preamble.
`.trim();

const SLOT_10_WEB_GROUNDING_ADDENDUM = `

SLOT-10-SPECIFIC: You are the web-grounded reviewer. You do NOT have web-search tool access in this invocation; instead, where the artifact makes a claim that requires external verification (market data, regulatory facts, competitor capabilities, current-state platform features outside the canonical docs), label that claim "UNVERIFIED_NEEDS_WEB" rather than fabricating an answer. Flag the strongest 3 such items at the end of your review.
`.trim();

// ── Slot definitions ─────────────────────────────────────────────────────

const SLOTS = [
  { idx: 1,  provider: 'openrouter',    model: 'anthropic/claude-opus-4.7',          status: 'LIVE' },
  // gpt-5.5-pro times out on large bundles; use
  // gpt-5.5 for full-canonical reviews; reserve pro for <10K artifacts
  { idx: 2,  provider: 'openrouter',    model: 'openai/gpt-5.5',                     status: 'LIVE' },
  { idx: 3,  provider: 'openrouter',    model: 'google/gemini-2.5-pro',              status: 'LIVE' },
  { idx: 4,  provider: 'openrouter',    model: 'perplexity/sonar-pro-search',        status: 'LIVE' },
  // Slot 5 is small-artifact only (<10K tokens). Full-canonical Layer-2
  // implementation bundles (~125 KB) exceed v0 sync-mode limits, so it
  // SKIPs here.
  { idx: 5,  provider: 'vercel_v0',     model: 'v0-1.5-md',                          status: 'SKIP', reason: 'v0 sync-mode exceeds 10K-token limit on full-canonical bundles' },
  { idx: 6,  provider: 'github_models', model: 'openai/gpt-4.1',                     status: 'LIVE' },
  // Phi-3.5-mini removed from GH Models catalog;
  // phi-4-mini-instruct is current catalog equivalent
  { idx: 7,  provider: 'github_models', model: 'microsoft/phi-4-mini-instruct',      status: 'LIVE' },
  { idx: 8,  provider: 'headless',      model: 'base44_chat',                        status: 'DEFERRED', reason: 'Playwright codegen not done' },
  { idx: 9,  provider: 'headless',      model: 'replit_agent',                       status: 'DEFERRED', reason: 'Playwright codegen not done' },
  { idx: 10, provider: 'openrouter',    model: 'openai/gpt-4o-2024-11-20',           status: 'LIVE', mode: 'web_grounded' },
];

// ── Credential loading ───────────────────────────────────────────────────

async function readCredentials() {
  const handoffPath = path.join(REPO, '.env.openrouter-handoff');
  const raw = await readFile(handoffPath, 'utf8');
  const creds = {};
  for (const line of raw.split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0) {
      const k = line.slice(0, eq);
      const v = line.slice(eq + 1).replace(/\s+$/, '');
      if (v) creds[k] = v;
    }
  }
  return creds;
}

// ── Provider adapters ────────────────────────────────────────────────────

async function callOpenRouter({ apiKey, model, system, user, signal }) {
  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/veu-ai-studio/flowai',
      'X-Title': 'FlowAI Layer 2 Implementation Panel',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }),
    signal,
  });
  const latency_ms = Date.now() - t0;
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return {
    ok: res.ok,
    status: res.status,
    latency_ms,
    content: parsed?.choices?.[0]?.message?.content ?? '',
    error: res.ok ? null : (parsed?.error?.message ?? text.slice(0, 300)),
  };
}

async function callVercelV0({ token, model, system, user, signal }) {
  const V0_NEW_ENUM = new Set(['v0-auto', 'v0-mini', 'v0-pro', 'v0-max', 'v0-max-fast']);
  const body = { message: user, system, responseMode: 'sync' };
  if (V0_NEW_ENUM.has(model)) body.modelConfiguration = { modelId: model };
  const t0 = Date.now();
  const res = await fetch('https://api.v0.dev/v1/chats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body),
    signal,
  });
  const latency_ms = Date.now() - t0;
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  let content = '';
  if (parsed) {
    if (typeof parsed.text === 'string' && parsed.text) {
      content = parsed.text;
    } else if (Array.isArray(parsed.messages) && parsed.messages.length) {
      const lastAsst = [...parsed.messages].reverse().find((m) => m.role === 'assistant');
      content = lastAsst?.content ?? lastAsst?.text ?? '';
    } else if (Array.isArray(parsed.latestVersion?.files)) {
      content = parsed.latestVersion.files
        .map((f) => `--- ${f.name ?? f.path ?? 'file'} ---\n${f.content ?? ''}`)
        .join('\n\n');
    } else if (Array.isArray(parsed.files)) {
      content = parsed.files
        .map((f) => `--- ${f.name ?? f.path ?? 'file'} ---\n${f.content ?? ''}`)
        .join('\n\n');
    }
  }
  return {
    ok: res.ok,
    status: res.status,
    latency_ms,
    content,
    error: res.ok ? null : (parsed?.error?.message ?? text.slice(0, 300)),
  };
}

async function callGithubModels({ token, model, system, user, signal }) {
  const t0 = Date.now();
  const res = await fetch('https://models.github.ai/inference/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2026-03-10',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
    }),
    signal,
  });
  const latency_ms = Date.now() - t0;
  const text = await res.text();
  let parsed = null;
  try { parsed = JSON.parse(text); } catch {}
  return {
    ok: res.ok,
    status: res.status,
    latency_ms,
    content: parsed?.choices?.[0]?.message?.content ?? '',
    error: res.ok ? null : (parsed?.error?.message ?? text.slice(0, 300)),
  };
}

// ── Per-slot runner ──────────────────────────────────────────────────────

async function runSlot({ slot, creds, system, user }) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), PER_REVIEWER_TIMEOUT_MS);
  const t0 = Date.now();
  let result = null;
  let error = null;
  try {
    if (slot.provider === 'openrouter') {
      result = await callOpenRouter({ apiKey: creds.OPENROUTER_API_KEY, model: slot.model, system, user, signal: ac.signal });
    } else if (slot.provider === 'github_models') {
      result = await callGithubModels({ token: creds.GITHUB_MODELS_PAT, model: slot.model, system, user, signal: ac.signal });
    } else if (slot.provider === 'vercel_v0') {
      result = await callVercelV0({ token: creds.VERCEL_V0_TOKEN, model: slot.model, system, user, signal: ac.signal });
    } else {
      result = { ok: false, status: 0, latency_ms: 0, content: '', error: 'not implemented' };
    }
  } catch (e) {
    error = e?.message ?? String(e);
    if (e?.name === 'AbortError') error = `timeout after ${PER_REVIEWER_TIMEOUT_MS} ms`;
  } finally {
    clearTimeout(timer);
  }
  const wall_ms = Date.now() - t0;
  return {
    idx: slot.idx,
    provider: slot.provider,
    model: slot.model,
    status: slot.status,
    ok: result?.ok === true,
    http_status: result?.status ?? null,
    latency_ms: result?.latency_ms ?? wall_ms,
    error: error ?? result?.error ?? null,
    content: result?.content ?? '',
  };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const STARTED = new Date();
  const creds = await readCredentials();

  // PHASE B — artifact bundle: FLOWAI_SSOT.md FIRST as canonical anchor
  const ssot = await readFile(path.join(REPO, 'docs', 'FLOWAI_SSOT.md'), 'utf8');
  const ref = await readFile(path.join(REPO, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const hist = await readFile(path.join(REPO, 'docs', 'CANONICAL_HISTORY.md'), 'utf8');

  const artifactBundle = [
    '================================================================================',
    '=== FILE: docs/FLOWAI_SSOT.md (LAYER 1 CANONICAL ANCHOR — ALL ANSWERS MUST AGREE)',
    '================================================================================',
    '',
    ssot,
    '',
    '================================================================================',
    '=== FILE: docs/CANONICAL_REFERENCE.md (current built state)',
    '================================================================================',
    '',
    ref,
    '',
    '================================================================================',
    '=== FILE: docs/CANONICAL_HISTORY.md (sprint history + removed features)',
    '================================================================================',
    '',
    hist,
    '',
    '================================================================================',
    '=== FILE: LAYER_2_IMPLEMENTATION_QUESTIONS',
    '================================================================================',
    '',
    QUESTIONS_BLOCK,
  ].join('\n');

  const baseSystem = CRITICAL_CONTEXT;
  const slot10System = baseSystem + '\n\n' + SLOT_10_WEB_GROUNDING_ADDENDUM;

  const userMessage = `${artifactBundle}\n\n${REVIEWER_TASK}`;

  // PHASE C — parallel panel query
  const liveSlots = SLOTS.filter((s) => s.status === 'LIVE');
  if (liveSlots.length < 5) {
    throw new Error(`abort: ${liveSlots.length} LIVE slots < 5 minimum`);
  }
  console.log(`Running ${liveSlots.length} LIVE slots in parallel (240s/reviewer)...`);

  const results = await Promise.all(
    liveSlots.map((slot) => runSlot({
      slot,
      creds,
      system: slot.mode === 'web_grounded' ? slot10System : baseSystem,
      user: userMessage,
    })),
  );

  // Reattach non-LIVE slots (DEFERRED, SKIP) with placeholders so the report
  // still shows the full 10-slot picture.
  const nonLive = SLOTS.filter((s) => s.status !== 'LIVE').map((s) => ({
    idx: s.idx, provider: s.provider, model: s.model, status: s.status,
    ok: false, http_status: null, latency_ms: 0, error: s.reason, content: '',
  }));
  const all = [...results, ...nonLive].sort((a, b) => a.idx - b.idx);

  // PHASE D — write report
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  const FINISHED = new Date();
  const lines = [];
  lines.push(`# Layer 2 Implementation Plan — 10-AI Panel Review`);
  lines.push('');
  lines.push(`**Started:** ${STARTED.toISOString()}`);
  lines.push(`**Finished:** ${FINISHED.toISOString()}`);
  lines.push(`**Duration:** ${Math.round((FINISHED - STARTED) / 1000)} s`);
  lines.push(`**Per-reviewer timeout:** ${PER_REVIEWER_TIMEOUT_MS} ms`);
  lines.push(`**Layer 1 anchor:** docs/FLOWAI_SSOT.md (canonical)`);
  lines.push('');
  lines.push('## Slot status');
  lines.push('');
  lines.push('| Slot | Provider | Model | Status | HTTP | Latency (ms) | Error |');
  lines.push('|------|----------|-------|--------|------|--------------|-------|');
  for (const r of all) {
    let status;
    if (r.status === 'DEFERRED') status = 'DEFERRED';
    else if (r.status === 'SKIP') status = 'SKIP';
    else status = r.ok ? 'LIVE-OK' : 'LIVE-FAIL';
    lines.push(`| ${r.idx} | ${r.provider} | \`${r.model}\` | ${status} | ${r.http_status ?? '—'} | ${r.latency_ms} | ${r.error ?? ''} |`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const r of all) {
    lines.push(`## Slot ${r.idx} — ${r.provider}:${r.model}`);
    lines.push('');
    if (r.status === 'DEFERRED') {
      lines.push(`> **DEFERRED.** ${r.error}`);
      lines.push('');
      continue;
    }
    if (r.status === 'SKIP') {
      lines.push(`> **SKIP.** ${r.error}`);
      lines.push('');
      continue;
    }
    if (!r.ok) {
      lines.push(`> **FAILED.** HTTP ${r.http_status} after ${r.latency_ms} ms. Error: ${r.error ?? 'unknown'}`);
      lines.push('');
      continue;
    }
    lines.push(`> Latency: ${r.latency_ms} ms · HTTP ${r.http_status}`);
    lines.push('');
    lines.push(r.content || '_empty content_');
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  await writeFile(OUT_PATH, lines.join('\n'), 'utf8');

  const okCount = results.filter((r) => r.ok).length;
  const failCount = results.length - okCount;
  const deferredCount = nonLive.filter((r) => r.status === 'DEFERRED').length;
  const skippedCount = nonLive.filter((r) => r.status === 'SKIP').length;
  process.stdout.write(
    `live_slots_attempted=${results.length} ok=${okCount} failed=${failCount} ` +
    `deferred=${deferredCount} skipped=${skippedCount} out=${path.relative(REPO, OUT_PATH)} ` +
    `duration_s=${Math.round((FINISHED - STARTED) / 1000)}\n`,
  );
  for (const r of results) {
    process.stdout.write(`  slot${r.idx} ${r.provider}:${r.model} ok=${r.ok} http=${r.http_status ?? '—'} latency=${r.latency_ms}ms${r.error ? ' err=' + r.error.slice(0, 120) : ''}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`layer2-impl-panel FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
