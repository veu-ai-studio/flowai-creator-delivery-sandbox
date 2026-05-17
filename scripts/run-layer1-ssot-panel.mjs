// Layer 1 SSOT — Panel Review Driver
//
// Multi-AI panel review of the 39 SSOT questions (32 W02-answered +
// 7 meta-governance). Saves raw markdown responses, no synthesis,
// no normalization — per dispatch.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const DATE = '2026-05-11';
const OUT_DIR = path.join(REPO, 'docs', 'philosophy-review');
const OUT_PATH = path.join(OUT_DIR, `layer1-ssot-panel-review-${DATE}.md`);

const PER_REVIEWER_TIMEOUT_MS = 240_000;

const CRITICAL_CONTEXT = `
CRITICAL CONTEXT — apply rigor appropriate to this scale:

- FlowAI is a $5 BILLION operating system infrastructure for an AI products company (VEU AI Studio).
- The 5 flagship products (SAIGE, RelTwin, ReachSMS, PressAI, MyPregLife) are REAL, production-grade — NOT experimental.
- FlowAI has 25 agents (G3-ratified; #21–#25 Ops Runner charters active). BaseAgent.js validator update to 25 is queued for Phase 1.0.
- FlowAI continuously crawls every product (every link, card, modal, page, engine, agent) AND aggressively verifies all wiring (auth flows, payment rails, third-party integrations, GTM trackers, marketplace listings, live monitoring) — fixes broken elements at any time.
- FlowAI runs its own self-tests through the same 8-step pipeline it governs.
- FlowAI will natively orchestrate the 10-AI Panel itself once fully built — current human-assisted panel is the bootstrap only.
- FlowAI runs continuous marketplace intelligence (≥monthly) surfacing Self-Renewal Alerts with Auto/Guided/Manual paths.

You are a senior architect reviewing the philosophical foundation of FlowAI. Apply the rigor appropriate to that scale and commitment.
`.trim();

const QUESTIONS_BLOCK = `
--- BEGIN 39 SSOT QUESTIONS ---

ONTOLOGY (O1–O10)

O1. Primary identity of FlowAI?
W02: FlowAI is primarily an orchestration engine; agents, pipeline, and tools are its apparatus; the platform layer is what makes orchestration multi-tenant.

O2. Ontological status of agents?
W02: Agents are specialized faculties of FlowAI — domain-bounded reasoners that FlowAI invokes, supervises, and recombines per session.

O3. Are the 5 products consumers or instances?
W02: The 5 products are real, production-grade consumers of FlowAI (separate sub-orgs, isolated state) — not instances of FlowAI itself.

O4. Relationship FlowAI ↔ VEU ↔ Marketplace ↔ providers ↔ end-customers?
W02: VEU AI Studio owns FlowAI; FlowAI serves VEU's 5 products plus onboarded external providers; Tool Marketplace is FlowAI's curated knowledge graph of tools ranked per pipeline step; providers serve their own end-customers.

O5. Singular or plural?
W02: Singular as code/canonical (one G3-ratified spec); plural at runtime (one isolated instance per provider org via Supabase RLS + Vercel project boundaries).

O6. "First, not exclusive" — meaning?
W02: VEU's 5 products are real production consumers that exercise FlowAI's full lifecycle (build → audit → ship → continuously monitor → fix); architecture is built to onboard arbitrary additional consumers without code changes once Agent #4 is live.

O7. Boundary with non-FlowAI?
W02: The set of resources subject to its governance contract (BaseAgent.js validators, 95/95, 6-step Clearance, audit log) — anything inside is FlowAI; products at runtime, external services, end-user data are not.

O8. Ongoing role for products under management?
W02: Continuous lifecycle + maintenance engine — crawls every product (every link, card, modal, page, engine, agent), detects breakage via Playwright execution, triggers Agent #3 Self-Renewal to fix at any time, no maintenance windows.

O9. FlowAI as wiring + integration auditor?
W02: FlowAI does not assume any product is "done" upon handoff — actively probes every navigation path, integration endpoint, auth flow, payment rail, third-party service, GTM tracker, marketplace listing for functional connectivity; verifies + completes the wiring to production standard regardless of source tool.

O10. FlowAI as marketplace intelligence engine?
W02: Continuous marketplace intelligence (tools, competitors, integrations, regulations, user expectations); produces monthly Self-Renewal Alerts per product framing each opportunity in Auto/Guided/Manual execution paths so user chooses autonomy level.

LOGIC (L1–L9)

L1. Composition of 5 decision frameworks under conflict?
W02: Strict priority — anti-drift > governance gates > active Objective Lens > Five-Layer evidence tagging > Mode autonomy bounds; higher-priority frameworks veto lower-priority outputs.

L2. Consensus across 25 agents with different authorities?
W02: Role-based deference, not unanimous voting — orchestrator routes to agents with jurisdiction; in-jurisdiction disagreement escalates per authority level.

L3. Multi-input mode aggregation?
W02: Parallel execution per step (Promise.all); compare → head-to-head scorecard; combine → synthesized unified spec with provenance map; benchmark → gap analysis vs reference.

L4. Anti-drift priority when canonical / memory / code disagree?
W02: Code > canonical > user-curated memory > auto-memory; no exceptions; conflicts surfaced for resolution, never silently resolved.

L5. 95/95 passes but 6-step Clearance fails (or inverse)?
W02: All three governance mechanisms must pass independently — none subsumes another — any single failure halts deployment until remediated.

L6. Decision flow when gates cascade?
W02: Pipeline artifacts → 95/95 (quality) → 6-step Clearance (procedural) → Monitor 0-50 (operational); pass all → ship; fail any → return to relevant pipeline step with diagnosis.

L7. Decision flow when continuous crawl detects breakage?
W02: Crawl finding → root-cause diagnosis (which step, which agent) → Agent #3 Self-Renewal authors fix → 95/95 audit on fix → deploy → re-crawl confirm; if fix fails 95/95 or regresses, rollback + human gate.

L8. Decision flow when wiring/integration is broken?
W02: Crawl + integration probe identifies broken wiring → diagnosis (missing config, dead endpoint, expired credential, misconfigured webhook, absent analytics) → Agent #3 patches within authority, escalates otherwise → re-probe → product not cleared until all integrations + GTM stack + monitoring report green.

L9. Marketplace research cycle?
W02: At minimum monthly, Agents #11/#15/#17 scan marketplace + product → produce Self-Renewal Alert ranked by L1-L5 impact + confidence → user selects path (Auto/Guided/Manual) → Agent #3 executes → 95/95 audit → ship → re-probe.

ETHICS (E1–E7)

E1. Self-Protection — what, from whom, lines?
W02: Protects proprietary code, agent logic, accumulated data from scraping/distillation/IP-theft via robots.txt + noai headers + Cloudflare + rate limiting + watermarking + DMCA; does NOT block legitimate users, internal audit, regulators, contracted security research.

E2. 95/95 — quality bar or safety floor?
W02: Both — quality bar (no grandfathering) AND safety floor (failure halts deployment); expresses VEU's commitment that "good enough" means 95%+.

E3. Stance on hallucination / bias / transparency / edge cases?
W02: Mandatory multi-AI triangulation (hallucination mitigation), Five-Layer evidence tagging (bias surfacing), every decision auditable in flowai_audit_log (transparency), authority-based escalation to human gates (edge cases).

E4. Revenue splits?
W02: Default — VEU 15% platform fee (Stripe Connect via Agent #4), providers retain 85% of end-customer revenue; negotiable per contract; floor is platform sustainability.

E5. Replace vs augment — disclosure obligation?
W02: Explicit AI-authorship disclosure on every FlowAI-produced artifact (audit log AND artifact); products built on FlowAI inherit same obligation to end-customers.

E6. Commitment to product integrity + uptime?
W02: Continuous integrity for every product under management; 5 VEU products bound by same SLA as external provider products; any detected breakage triggers Self-Renewal at any hour, not on schedule.

E7. Currency commitment?
W02: No product under management falls >30 days behind marketplace evolution without explicit user acknowledgment; default is alert, not silence.

EPISTEMOLOGY (EP1–EP6)

EP1. Source-of-truth hierarchy — locked or open?
W02: Hierarchy locked in priority order (code > canonical > user-curated > auto-memory); content evolves; hierarchy itself invariant (Locked Rule 1).

EP2. Authority — multi-AI triangulation vs Playwright ground-truth vs L1-L5 tagging?
W02: Playwright ground-truth wins when applicable (steps 3+4 + continuous product crawl); multi-AI triangulation overrides any single AI otherwise; L1-L5 tagging forces every finding to declare evidence layer, making hallucinations detectable by missing/inappropriate tags.

EP3. Confidence calibration?
W02: Every output declares confidence (0-100) + evidence layer (L1-L5) + agent authority; consumers treat confidence as one input alongside authority, not sole determinant.

EP4. Resolution when peer reviewers disagree?
W02: Disagreement triggers synthesis review — factual disagreements re-run against canonical/code; interpretive disagreements escalate to higher-authority agent or human gate per authority levels.

EP5. How does FlowAI know self-renewal works?
W02: Agent #3 measures drift signal (canonical/memory/code deltas), score trajectory (rolling 95/95), regression count, continuous crawl pass-rate per product; works iff drift→0, scores≥95, regressions caught pre-deployment, crawl pass-rate trends to 100%.

EP6. How does FlowAI know what is broken in a product?
W02: Real Playwright crawl + agent execution status via flowai_audit_log + product-side telemetry via /api/health + failing tests via vitest CI; union of signals is the breakage map fed to Agent #3.

META-GOVERNANCE — PANEL ANSWERS FRESH (MG1–MG7)
No W02 draft. Panel provides own one-line answer for each.

MG1. Panel operating mode — always-on, scheduled, on-demand, or hybrid?
MG2. Decision-making threshold — unanimous, supermajority (≥7 of 10), simple majority, or weighted by domain expertise?
MG3. Dissent handling — require resolution, approve with dissent noted, escalate to CEO, or depend on dissent severity?
MG4. CEO escalation triggers — what specifically requires CEO involvement?
MG5. Failed/stale reviewer handling — proceed with available, wait/retry, substitute, or abort + re-dispatch?
MG6. Self-amendment process — how does Panel evolve its own protocol?
MG7. Approval scope — what constitutes "Panel approval" sufficient to advance each build step type?

--- END 39 SSOT QUESTIONS ---
`.trim();

const REVIEWER_TASK = `
You have been given 39 foundational questions spanning Ontology, Logic, Ethics, Epistemology, and Panel Meta-Governance.

For QUESTIONS WITH W02 ANSWERS (32: O1-O10, L1-L9, E1-E7, EP1-EP6):
  (a) VERDICT: ACCEPT | MODIFY | REJECT
  (b) If MODIFY: state improvement in one line.
  (c) If REJECT: state replacement in one line.

For META-GOVERNANCE QUESTIONS (7: MG1-MG7):
  Provide own one-line answer. No W02 draft.

After the 39 reviews/answers, address:
  (1) Which questions were NOT asked that should have been, for a $5B OS infrastructure with REAL production products, continuous wiring + crawl verification, monthly marketplace self-renewal, self-testing through its own pipeline, and eventual self-orchestration of the 10-AI Panel?
  (2) What is doable as drafted? What may be missing (capabilities, capacities, commitments)?
  (3) Give your own 3-sentence elevator pitch of FlowAI grounded in this foundation.

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
  // Slot 5 is small-artifact only (<10K tokens). Full-canonical SSOT
  // bundles (~125 KB) exceed v0 sync-mode limits, so it SKIPs here.
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
      'X-Title': 'FlowAI Layer 1 SSOT Panel',
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
    raw: text,
  };
}

async function callVercelV0({ token, model, system, user, signal }) {
  // v0 API surface: POST /v1/chats with { message, system, responseMode,
  // modelConfiguration.modelId? }. Response is { id, text, messages,
  // latestVersion: { files }, ... } — NOT OpenAI-compatible.
  // modelConfiguration.modelId accepts only v0-auto|v0-mini|v0-pro|v0-max|
  // v0-max-fast. We omit the field when the panel entry uses a legacy
  // marketing id (e.g. v0-1.5-md) so v0 picks its default.
  const V0_NEW_ENUM = new Set(['v0-auto', 'v0-mini', 'v0-pro', 'v0-max', 'v0-max-fast']);
  const body = {
    message: user,
    system,
    responseMode: 'sync',
  };
  if (V0_NEW_ENUM.has(model)) {
    body.modelConfiguration = { modelId: model };
  }
  const t0 = Date.now();
  const res = await fetch('https://api.v0.dev/v1/chats', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
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
      // Take the last assistant message.
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
    raw: text,
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
    raw: text,
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
      // Should not reach here; deferred slots are filtered upstream.
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

  // PHASE C — artifact bundle
  const ref = await readFile(path.join(REPO, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const hist = await readFile(path.join(REPO, 'docs', 'CANONICAL_HISTORY.md'), 'utf8');

  const artifactBundle = [
    '================================================================================',
    '=== FILE: docs/CANONICAL_REFERENCE.md',
    '================================================================================',
    '',
    ref,
    '',
    '================================================================================',
    '=== FILE: docs/CANONICAL_HISTORY.md',
    '================================================================================',
    '',
    hist,
    '',
    '================================================================================',
    '=== FILE: SSOT_QUESTIONS_39',
    '================================================================================',
    '',
    QUESTIONS_BLOCK,
  ].join('\n');

  const baseSystem = CRITICAL_CONTEXT;
  const slot10System = baseSystem + '\n\n' + SLOT_10_WEB_GROUNDING_ADDENDUM;

  const userMessage = `${artifactBundle}\n\n${REVIEWER_TASK}`;

  // PHASE D — parallel panel query
  const liveSlots = SLOTS.filter((s) => s.status === 'LIVE');
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
    idx: s.idx,
    provider: s.provider,
    model: s.model,
    status: s.status,
    ok: false,
    http_status: null,
    latency_ms: 0,
    error: s.reason,
    content: '',
  }));
  const all = [...results, ...nonLive].sort((a, b) => a.idx - b.idx);

  // PHASE E — write report
  if (!existsSync(OUT_DIR)) await mkdir(OUT_DIR, { recursive: true });
  const FINISHED = new Date();
  const lines = [];
  lines.push(`# Layer 1 SSOT — 10-AI Panel Review`);
  lines.push('');
  lines.push(`**Started:** ${STARTED.toISOString()}`);
  lines.push(`**Finished:** ${FINISHED.toISOString()}`);
  lines.push(`**Duration:** ${Math.round((FINISHED - STARTED) / 1000)} s`);
  lines.push(`**Per-reviewer timeout:** ${PER_REVIEWER_TIMEOUT_MS} ms`);
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

  // Summary to stdout
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
    process.stdout.write(`  slot${r.idx} ${r.provider}:${r.model} ok=${r.ok} http=${r.http_status ?? '—'} latency=${r.latency_ms}ms${r.error ? ' err=' + r.error.slice(0, 100) : ''}\n`);
  }
}

main().catch((e) => {
  process.stderr.write(`layer1-ssot-panel FAILED: ${e?.message ?? e}\n`);
  process.exit(1);
});
