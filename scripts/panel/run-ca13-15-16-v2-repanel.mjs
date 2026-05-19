// scripts/panel/run-ca13-15-16-v2-repanel.mjs
//
// W6 v2 re-Panel — CA-13 v2 / CA-15 v2 / CA-16 v2. Three focused per-amendment
// adversarial Panels run sequentially in foreground. Per-CA bundle ≤35K to
// match the proven 31–34K engagement recipe. Quorum ≥7/10 ENGAGED per
// Locked Rule 17.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { runAdversarialPanelConsultation, PANEL } from './run-panel-consultation.mjs';
import { auditDiversity } from './slot-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(repoRoot, 'docs', 'panel-consultations');
const CONS_PATH = path.join(OUTPUT_DIR, 'ca13-15-16-v2-repanel-2026-05-19.md');
const CONS_SIDECAR = path.join(OUTPUT_DIR, 'ca13-15-16-v2-repanel-2026-05-19.sidecar.json');
const QUORUM = 7;

// =========================================================================
// CA-13 v2 — 5 questions
// =========================================================================
const CA13_QUESTIONS = [
  {
    id: 'CA-13-A-v2-Q1', topic: 'CA-13-A v2 Q1 — Does Panel ratify the v2 approach: §7.6 bands UNCHANGED from ENTRY 006; `product_registry.gtm_ready_bar_override` knob added (default 75, bounds [75,100]); ≥95 re-promotes via successor CA after ≥1 VEU product sustains ≥95 end-to-end?',
    options: [
      { key: 'CA13AV2Q1-RATIFY',   text: 'Ratify v2 as drafted — bands UNCHANGED + knob default 75 bounds [75,100]; ≥95 re-promotes via successor CA after ≥1 VEU product proves it.' },
      { key: 'CA13AV2Q1-ADMIN',    text: 'Ratify with tighter knob — operator override admin-only (not operator role).' },
      { key: 'CA13AV2Q1-FLOOR80',  text: 'Ratify with stricter bound — knob bounds [80,100] instead of [75,100].' },
      { key: 'CA13AV2Q1-REJECT',   text: 'Reject v2 — canonical §7.6 bands SHOULD update to ≥95 immediately per CEO directive regardless of single-product-evidence prerequisite.' },
    ],
    draftedKey: 'CA13AV2Q1-RATIFY',
  },
  {
    id: 'CA-13-A-v2-Q2', topic: 'CA-13-A v2 Q2 — Does Panel ratify the v2 elimination of the 90–94 Near-GTM conditional-clearance band (§11 Step 5 is HARD)?',
    options: [
      { key: 'CA13AV2Q2-RATIFY',     text: 'Ratify v2 as drafted: 90–94 Near-GTM band ELIMINATED; §11 Step 5 HARD.' },
      { key: 'CA13AV2Q2-RESERVE',    text: 'Ratify with reservation — fallback clause mandatory if Panel ever re-introduces a conditional path (ALL `high` findings Resolved).' },
      { key: 'CA13AV2Q2-OPTIN_CONDITIONAL', text: 'Re-introduce a conditional path but only for products with gtm_ready_bar_override ≥ 90.' },
      { key: 'CA13AV2Q2-REJECT',     text: 'Reject v2 elimination — restore v1 Near-GTM conditional path with admin-only signoff.' },
    ],
    draftedKey: 'CA13AV2Q2-RATIFY',
  },
  {
    id: 'CA-13-A-v2-Q3', topic: 'CA-13-A v2 Q3 — Does Panel ratify the §19.0 reconciliation paragraph distinguishing Self-Audit 95/95 from GTM Readiness bar (carry-forward from v1, no change)?',
    options: [
      { key: 'CA13AV2Q3-RATIFY',   text: 'Ratify v2 §19.0 as drafted.' },
      { key: 'CA13AV2Q3-STRONGER', text: 'Ratify with stronger language — append "These are NEVER conflated in any operator-facing surface".' },
      { key: 'CA13AV2Q3-REJECT',   text: 'Reject — §10 governance-mechanisms table already covers it; §19.0 redundant.' },
      { key: 'CA13AV2Q3-MOVE',     text: 'Move §19.0 to §10 (Self-Governance) instead of §19.' },
    ],
    draftedKey: 'CA13AV2Q3-RATIFY',
  },
  {
    id: 'CA-13-B-v2-Q1', topic: 'CA-13-B v2 Q1 — Does Panel ratify the v2 §15-intro + §15.1 rows 21/26 wording that strikes legacy (b) dual-authority in favor of Option-(a) sibling-pattern per ENTRY 009 LOCKED (carry-forward from v1)?',
    options: [
      { key: 'CA13BV2Q1-RATIFY',  text: 'Ratify v2 as drafted (same as v1).' },
      { key: 'CA13BV2Q1-SHORTER', text: 'Ratify with revised phrasing — keep strike but shorten ENTRY 009 citation.' },
      { key: 'CA13BV2Q1-REJECT',  text: 'Reject — leave §15/§15.1 at (b) phrasing; ENTRY 009 stays code-level only.' },
      { key: 'CA13BV2Q1-DEFER',   text: 'Defer to joint disposition with §15.5 sibling row-table populate.' },
    ],
    draftedKey: 'CA13BV2Q1-RATIFY',
  },
  {
    id: 'CA-13-B-v2-Q2', topic: 'CA-13-B v2 Q2 — Does Panel ratify the v2 switch to capability-keyed sibling charter naming (`crawl-write-executor` for Agent #21 sibling; `orchestra-admission-executor` for Agent #26 sibling)?',
    options: [
      { key: 'CA13BV2Q2-RATIFY',     text: 'Ratify v2 capability-keyed naming as drafted.' },
      { key: 'CA13BV2Q2-MEMBERSHIP', text: 'Ratify capability-keyed BUT rename — `orchestra-membership-executor` not `orchestra-admission-executor`.' },
      { key: 'CA13BV2Q2-REJECT',     text: 'Reject — restore v1 agent-short-name-keyed naming.' },
      { key: 'CA13BV2Q2-AGENTID',    text: 'Adopt agentId-keyed (`agent-21-executor`, `agent-26-executor`).' },
    ],
    draftedKey: 'CA13BV2Q2-RATIFY',
  },
];

// =========================================================================
// CA-15 v2 — 11 questions (structural rewrite)
// =========================================================================
const CA15_QUESTIONS = [
  {
    id: 'CA-15-A-v2-Q1', topic: 'CA-15-A v2 Q1 — Does Panel ratify the v2 structural rewrite: extend §10.1 from 5 to ≤7 dims; admin-opt-in for dims 6 & 7; NO parallel §10.1.1 rubric?',
    options: [
      { key: 'CA15AV2Q1-RATIFY',  text: 'Ratify v2 as drafted: §10.1 ONE engine; dims 6 + 7 admin-opt-in.' },
      { key: 'CA15AV2Q1-TIGHTER', text: 'Ratify with tighter scope — only dim 6 (Content Quality) added; dim 7 (Accessibility) deferred.' },
      { key: 'CA15AV2Q1-BROADER', text: 'Ratify with broader scope — all 7 dims always-on; admin-opt-in eliminated.' },
      { key: 'CA15AV2Q1-REJECT',  text: 'Reject — leave §10.1 at 5 dims; content quality + accessibility live in tooling only.' },
    ],
    draftedKey: 'CA15AV2Q1-RATIFY',
  },
  {
    id: 'CA-15-A-v2-Q2', topic: 'CA-15-A v2 Q2 — Does Panel ratify that content_quality + accessibility findings do NOT feed §7.6 score (telemetry-only)?',
    options: [
      { key: 'CA15AV2Q2-RATIFY',  text: 'Ratify v2 as drafted: telemetry only; §7.6 formula UNCHANGED.' },
      { key: 'CA15AV2Q2-STRICTER', text: 'Ratify with stricter wording — explicit invariant: "§7.6 formula NEVER absorbs content_quality_finding / accessibility_finding counts."' },
      { key: 'CA15AV2Q2-PARTIAL', text: 'Ratify partial-feed — accessibility critical/high feed §7.6; content_quality stays telemetry only.' },
      { key: 'CA15AV2Q2-REJECT',  text: 'Reject — both should feed §7.6 with same coefficients as Phase A/B findings.' },
    ],
    draftedKey: 'CA15AV2Q2-RATIFY',
  },
  {
    id: 'CA-15-A-v2-Q3', topic: 'CA-15-A v2 Q3 — Does Panel ratify dims 6 + 7 admin-only opt-in (default OFF)?',
    options: [
      { key: 'CA15AV2Q3-RATIFY',  text: 'Ratify v2 as drafted: expanded_quality_dims_enabled admin-only, default false.' },
      { key: 'CA15AV2Q3-OPERATOR', text: 'Ratify with operator-role allowed (not admin-only).' },
      { key: 'CA15AV2Q3-REJECT',  text: 'Reject — always-on; no opt-in.' },
      { key: 'CA15AV2Q3-DEFER',   text: 'Defer — opt-in semantics belong in operator-config doc, not canonical §10.1.' },
    ],
    draftedKey: 'CA15AV2Q3-RATIFY',
  },
  {
    id: 'CA-15-B-v2-Q1', topic: 'CA-15-B v2 Q1 — Does Panel ratify that `purpose_record` is NOT added as a 7th canonical block; an optional free-form `product_purpose` field on `product_registry` replaces it?',
    options: [
      { key: 'CA15BV2Q1-RATIFY',   text: 'Ratify v2 as drafted (optional `product_purpose` field).' },
      { key: 'CA15BV2Q1-REQUIRED', text: 'Ratify but `product_purpose` REQUIRED on every product_registry row.' },
      { key: 'CA15BV2Q1-7THBLOCK', text: 'Re-introduce `purpose_record` as 7th block with strict schema validation + atomic-write invariant from CA-14-D-Q1.' },
      { key: 'CA15BV2Q1-REJECT',   text: 'Reject the optional field too — no purpose information lives in ProductSSOT.' },
    ],
    draftedKey: 'CA15BV2Q1-RATIFY',
  },
  {
    id: 'CA-15-B-v2-Q2', topic: 'CA-15-B v2 Q2 — Does Panel ratify dropping `inferred` + `synthesized` purpose-capture modes (only `described` mode accepted)?',
    options: [
      { key: 'CA15BV2Q2-RATIFY',     text: 'Ratify v2 as drafted (only `described` mode).' },
      { key: 'CA15BV2Q2-INFERRED_HINT', text: 'Ratify but allow `inferred` mode as a SUGGESTION surface (admin-reviewable; never auto-applied).' },
      { key: 'CA15BV2Q2-REJECT',     text: 'Reject — `inferred` mode is the primary value-add and should remain.' },
      { key: 'CA15BV2Q2-TOOLING',    text: 'Defer to tooling — operator may run an inference helper script manually.' },
    ],
    draftedKey: 'CA15BV2Q2-RATIFY',
  },
  {
    id: 'CA-15-B-v2-Q3', topic: 'CA-15-B v2 Q3 — Does Panel ratify moving placeholder detection (lorem-ipsum, "TBD", etc.) to `scripts/lint-product-purpose.mjs` (NOT canonical SSOT)?',
    options: [
      { key: 'CA15BV2Q3-RATIFY',   text: 'Ratify v2 as drafted (placeholder detection in tooling, not canonical).' },
      { key: 'CA15BV2Q3-DIM6',     text: 'Ratify with §10.1 dim 6 overlap — runs both in tooling AND in dim 6 when admin opts in.' },
      { key: 'CA15BV2Q3-REJECT',   text: 'Reject — placeholder detection MUST be canonical to prevent placeholder text reaching production.' },
      { key: 'CA15BV2Q3-DEFER',    text: 'Defer entirely — placeholder detection is not a FlowAI concern.' },
    ],
    draftedKey: 'CA15BV2Q3-RATIFY',
  },
  {
    id: 'CA-15-C-v2-Q1', topic: 'CA-15-C v2 Q1 — Does Panel ratify Purpose-Driven Optimization loop exits on numeric §7.6 floor + zero critical + Self-Renewal terminal + LIMITATIONS + Phase B pass — NO LLM-judged purpose-alignment check?',
    options: [
      { key: 'CA15CV2Q1-RATIFY',    text: 'Ratify v2 as drafted (5 numeric exits; no LLM check).' },
      { key: 'CA15CV2Q1-PURPOSENN', text: 'Ratify + add 6th condition — `product_purpose` field non-null.' },
      { key: 'CA15CV2Q1-LLM_SOFT',  text: 'Re-introduce LLM-judged check as 6th condition defaulting to satisfied when no `product_purpose` exists.' },
      { key: 'CA15CV2Q1-REJECT',    text: 'Reject — LLM-judged check is the heart of "Purpose-Driven" Optimization.' },
    ],
    draftedKey: 'CA15CV2Q1-RATIFY',
  },
  {
    id: 'CA-15-C-v2-Q2', topic: 'CA-15-C v2 Q2 — Does Panel ratify that the hardcoded `purpose_fulfillment_score ≥ 0.7` threshold from v1 is eliminated entirely?',
    options: [
      { key: 'CA15CV2Q2-RATIFY',     text: 'Ratify v2 as drafted (threshold gone).' },
      { key: 'CA15CV2Q2-PARAMETER',  text: 'Ratify but parameterize — operator-config knob replaces hardcoded 0.7; default still 0.7.' },
      { key: 'CA15CV2Q2-KEEP07',     text: 'Reject — keep hardcoded 0.7.' },
      { key: 'CA15CV2Q2-LLM_VERIFY', text: 'Reject — replace with operator-supplied target string + LLM verifier.' },
    ],
    draftedKey: 'CA15CV2Q2-RATIFY',
  },
  {
    id: 'CA-15-C-v2-Q3', topic: 'CA-15-C v2 Q3 — Does Panel ratify drift as a tiered annotation (minor/major/critical) that never deadlocks the loop?',
    options: [
      { key: 'CA15CV2Q3-RATIFY',   text: 'Ratify v2 as drafted (minor: log; major: operator dispose; critical: freeze fixes + Panel notify).' },
      { key: 'CA15CV2Q3-STRICTER', text: 'Ratify with stricter critical tier — critical drift ALSO blocks loop exit.' },
      { key: 'CA15CV2Q3-LOOSER',   text: 'Ratify with looser tier thresholds — 30%/60% token-change (not 20%/50%).' },
      { key: 'CA15CV2Q3-REJECT',   text: 'Reject — drift should never block; reduce to single advisory annotation.' },
    ],
    draftedKey: 'CA15CV2Q3-RATIFY',
  },
  {
    id: 'CA-15-D-v2-Q1', topic: 'CA-15-D v2 Q1 — Does Panel ratify that the §27 SSOT-Conformance Gate becomes advisory only (no blocking)?',
    options: [
      { key: 'CA15DV2Q1-RATIFY',     text: 'Ratify v2 as drafted (advisory only).' },
      { key: 'CA15DV2Q1-CRITESC',    text: 'Ratify with critical-finding escalation — advisory critical findings DO block deployment until admin acks.' },
      { key: 'CA15DV2Q1-DASHBOARD',  text: 'Ratify advisory framing BUT with admin dashboard prominence requirement.' },
      { key: 'CA15DV2Q1-REJECT',     text: 'Reject — §27 should stay a hard blocking gate as v1 proposed.' },
    ],
    draftedKey: 'CA15DV2Q1-RATIFY',
  },
  {
    id: 'CA-15-D-v2-Q2', topic: 'CA-15-D v2 Q2 — Does Panel ratify that CEO re-sign is required ONLY for CAs amending files in `docs/governance/CONFORMANCE_SCOPE.md` (not every CA)?',
    options: [
      { key: 'CA15DV2Q2-RATIFY',     text: 'Ratify v2 as drafted (scoped to CONFORMANCE_SCOPE.md).' },
      { key: 'CA15DV2Q2-BROADER',    text: 'Ratify with broader scope — any CA editing src/lib/governance/ also triggers.' },
      { key: 'CA15DV2Q2-NARROWER',   text: 'Ratify with narrower scope — only CAs amending §7.6 + §10.1 + §11 trigger.' },
      { key: 'CA15DV2Q2-REJECT',     text: 'Reject — every CA promotion should invalidate prior sign-offs as v1 proposed.' },
    ],
    draftedKey: 'CA15DV2Q2-RATIFY',
  },
];

// =========================================================================
// CA-16 v2 — 9 questions (B-Q3 + C-Q4 already promoted, NOT re-questioned)
// =========================================================================
const CA16_QUESTIONS = [
  {
    id: 'CA-16-A-v2-Q1', topic: 'CA-16-A v2 Q1 — Does Panel ratify the minimal §7 item #8 envelope (purpose-link optional, new cost object, new rollback object) with full schema deferred to engineering dispatch?',
    options: [
      { key: 'CA16AV2Q1-RATIFY',     text: 'Ratify v2 as drafted (minimal envelope + 2 new fields; full schema deferred).' },
      { key: 'CA16AV2Q1-CONDITIONAL', text: 'Ratify but require purpose_record_link mandatory IF `product_purpose` non-null (conditional mandatory).' },
      { key: 'CA16AV2Q1-FULLSCHEMA', text: 'Ratify with broader scope — full schema invariants (PA-1..PA-N) should be drafted in v2 itself.' },
      { key: 'CA16AV2Q1-REJECT',     text: 'Reject — proactive recs envelope should be canonical complete OR not canonical at all.' },
    ],
    draftedKey: 'CA16AV2Q1-RATIFY',
  },
  {
    id: 'CA-16-A-v2-Q2', topic: 'CA-16-A v2 Q2 — Does Panel ratify that proactive recommendations DO NOT participate in §11 Six-Step Clearance (Step 1.5 eliminated)?',
    options: [
      { key: 'CA16AV2Q2-RATIFY',     text: 'Ratify v2 as drafted (recs OUTSIDE §11).' },
      { key: 'CA16AV2Q2-STEP65',     text: 'Ratify but with Step 6.5 — recs surface AFTER Step 6 (Deploy/Promote) as post-deploy candidates.' },
      { key: 'CA16AV2Q2-DASHONLY',   text: 'Ratify with admin-dashboard-only requirement — recs live ONLY on dashboard.' },
      { key: 'CA16AV2Q2-REJECT',     text: 'Reject — restore §11.5 Step 1.5 per v1.' },
    ],
    draftedKey: 'CA16AV2Q2-RATIFY',
  },
  {
    id: 'CA-16-A-v2-Q3', topic: 'CA-16-A v2 Q3 — Does Panel ratify the disposition lifecycle (open / accepted / rejected / deferred / implemented; carry-forward from v1)?',
    options: [
      { key: 'CA16AV2Q3-RATIFY',  text: 'Ratify v2 as drafted (same lifecycle as v1).' },
      { key: 'CA16AV2Q3-REOPEN',  text: 'Ratify with reopen state added — rejected recs may be reopened by admin with rationale.' },
      { key: 'CA16AV2Q3-SIMPLER', text: 'Reject — lifecycle should be simpler: open / decided (no sub-states).' },
      { key: 'CA16AV2Q3-DEFER',   text: 'Defer entirely — lifecycle state machine belongs in engineering dispatch.' },
    ],
    draftedKey: 'CA16AV2Q3-RATIFY',
  },
  {
    id: 'CA-16-A-v2-Q4', topic: 'CA-16-A v2 Q4 — Does Panel ratify the per-product defer-window config (default 14 days; bounds [1,365]; admin-configurable)?',
    options: [
      { key: 'CA16AV2Q4-RATIFY',   text: 'Ratify v2 as drafted.' },
      { key: 'CA16AV2Q4-TIGHTER',  text: 'Ratify with stricter bounds — [7,90] instead of [1,365].' },
      { key: 'CA16AV2Q4-ADMIN30',  text: 'Ratify with admin role required for any value > 30 days; operator may set up to 30.' },
      { key: 'CA16AV2Q4-FIXED14',  text: 'Reject — global fixed 14-day window simpler and sufficient.' },
    ],
    draftedKey: 'CA16AV2Q4-RATIFY',
  },
  {
    id: 'CA-16-B-v2-Q1', topic: 'CA-16-B v2 Q1 — Does Panel ratify deferring the Redesign/Build Environment section number to engineering dispatch?',
    options: [
      { key: 'CA16BV2Q1-RATIFY',     text: 'Ratify v2 as drafted (section number = engineering decision).' },
      { key: 'CA16BV2Q1-PLACEHOLDER', text: 'Ratify with placeholder §29-DRAFT in v2; engineering finalizes at promotion.' },
      { key: 'CA16BV2Q1-COMMIT29',   text: 'Reject — commit to §29 in v2; renumbering is cosmetic non-issue.' },
      { key: 'CA16BV2Q1-DEFERALL',   text: 'Reject — RB-Env should not be canonical yet; defer whole surface to later CA-N.' },
    ],
    draftedKey: 'CA16BV2Q1-RATIFY',
  },
  {
    id: 'CA-16-B-v2-Q2', topic: 'CA-16-B v2 Q2 — Does Panel ratify the v2 "operator-steerable rebuild" wording (same as v1)?',
    options: [
      { key: 'CA16BV2Q2-RATIFY',   text: 'Ratify v2 as drafted (carry-forward).' },
      { key: 'CA16BV2Q2-STRONGER', text: 'Ratify with stronger admin-gating wording — "operator initiates; admin approves".' },
      { key: 'CA16BV2Q2-REJECT',   text: 'Reject — wording is too vague; needs concrete operator workflow spec in canonical.' },
      { key: 'CA16BV2Q2-DEFER',    text: 'Defer to engineering dispatch entirely.' },
    ],
    draftedKey: 'CA16BV2Q2-RATIFY',
  },
  {
    id: 'CA-16-C-v2-Q1', topic: 'CA-16-C v2 Q1 — Does Panel ratify the 6-class Multi-Format taxonomy (web / mobile_app / native_app / saas / agentic_ai / generic_url)?',
    options: [
      { key: 'CA16CV2Q1-RATIFY', text: 'Ratify v2 as drafted (6 classes).' },
      { key: 'CA16CV2Q1-MERGE5', text: 'Ratify with one merge — web + mobile_app merge into web_or_pwa (5-class).' },
      { key: 'CA16CV2Q1-SPLIT7', text: 'Ratify with one split — agentic_ai splits into agentic_ai_chat + agentic_ai_api (7-class).' },
      { key: 'CA16CV2Q1-DEFER',  text: 'Reject — defer canonical taxonomy until ≥1 product per class is in ProductSSOT.' },
    ],
    draftedKey: 'CA16CV2Q1-RATIFY',
  },
  {
    id: 'CA-16-C-v2-Q2', topic: 'CA-16-C v2 Q2 — Does Panel ratify the stricter classifier (confidence floor 0.85; sub-floor ambiguity emits `target_class_ambiguous.v1` at `high`)?',
    options: [
      { key: 'CA16CV2Q2-RATIFY',   text: 'Ratify v2 as drafted (0.85 floor; ambiguity emits `high`).' },
      { key: 'CA16CV2Q2-FLOOR090', text: 'Ratify with stricter floor — 0.90 (not 0.85).' },
      { key: 'CA16CV2Q2-LOOSER',   text: 'Ratify with looser floor — 0.75; ambiguity emits at `medium`.' },
      { key: 'CA16CV2Q2-REJECT',   text: 'Reject — restore v1 silent fallback to `generic_url`.' },
    ],
    draftedKey: 'CA16CV2Q2-RATIFY',
  },
  {
    id: 'CA-16-C-v2-Q3', topic: 'CA-16-C v2 Q3 — Does Panel ratify Agent #21 ACE Conductor as owner of Multi-Format target classification?',
    options: [
      { key: 'CA16CV2Q3-RATIFY',  text: 'Ratify v2 as drafted (Agent #21 owns).' },
      { key: 'CA16CV2Q3-CO_OWN',  text: 'Ratify with co-ownership — Agent #21 + Agent #26 jointly own.' },
      { key: 'CA16CV2Q3-NEW27',   text: 'Reject — a separate new Agent #27 should own classification.' },
      { key: 'CA16CV2Q3-DEFER',   text: 'Defer — ownership belongs in agent registry, not canonical SSOT spec.' },
    ],
    draftedKey: 'CA16CV2Q3-RATIFY',
  },
];

const AMENDMENTS = [
  {
    code: 'CA-13-v2', file: 'SSOT_AMENDMENT_CA13_V2_DRAFT.md', commit: '8b38156',
    title: 'GTM bar DEFERRED + Near-GTM ELIMINATED + capability-keyed sibling naming',
    questions: CA13_QUESTIONS,
    canonicalSections: [['## 7. ', '## 8. ', 4500], ['## 11. ', '## 12. ', 3500], ['## 15. ', '## 16. ', 3500], ['## 19. ', '## 20. ', 2500]],
    amendmentMaxChars: 16000,
  },
  {
    code: 'CA-15-v2', file: 'SSOT_AMENDMENT_CA15_V2_DRAFT.md', commit: '746bb7e',
    title: 'STRUCTURAL REWRITE (Multi-Dim merged + purpose_record removed + numeric-floor exit + §27 advisory)',
    questions: CA15_QUESTIONS,
    canonicalSections: [['## 7. ', '## 8. ', 4000], ['## 10. ', '## 11. ', 3500], ['## 25. ', '## 26. ', 2500]],
    amendmentMaxChars: 14000,
  },
  {
    code: 'CA-16-v2', file: 'SSOT_AMENDMENT_CA16_V2_DRAFT.md', commit: 'd366acf',
    title: 'Proactive Recs scoped + §29 numbering deferred + Multi-Format detection tightened',
    questions: CA16_QUESTIONS,
    canonicalSections: [['## 6. ', '## 7. ', 3000], ['## 7. ', '## 8. ', 4000], ['## 11. ', '## 12. ', 3000]],
    amendmentMaxChars: 14000,
  },
];

function stripAnchor(s) {
  return s
    .replace(/\(\s*drafted\s*\)/gi, '(authored)')
    .replace(/"\s*\(\s*W3 recommendation\s*\)\s*"/gi, '"author-preference tags"')
    .replace(/"\s*\(\s*as drafted\s*\)\s*"/gi, '"author-preference labels"')
    .replace(/\(\s*W3 recommendation\s*\)/gi, '(W3-author-preference)')
    .replace(/\(\s*as drafted\s*\)/gi, '(prior-version)')
    .replace(/\(\s*recommended\s*\)/gi, '(suggested)');
}

async function buildCompactCanonical(canonicalSections) {
  const raw = await readFile(path.join(repoRoot, 'docs', 'CANONICAL_REFERENCE.md'), 'utf8');
  const lines = raw.split(/\r?\n/);
  function slice(s, e, max) {
    const a = lines.findIndex((l) => l.startsWith(s));
    if (a === -1) return '';
    const b = lines.findIndex((l, i) => i > a && l.startsWith(e));
    const text = lines.slice(a, b === -1 ? undefined : b).join('\n');
    if (!max || text.length <= max) return text;
    return text.slice(0, max) + '\n\n_[…truncated]_';
  }
  return ['# FlowAI SSOT COMPACT EXCERPT (focused per-amendment v2 bundle)', '', '---', '',
    ...canonicalSections.map(([s, e, max]) => slice(s, e, max)).filter(Boolean).map((t) => t + '\n')].join('\n');
}

async function loadAmendmentText(file, maxChars) {
  const raw = await readFile(path.join(repoRoot, 'docs', 'specs', file), 'utf8');
  const lines = raw.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^## (v2 Panel Questions|Acceptance criteria|Cleared-8 carryover)/.test(l));
  const trimmedLines = cut === -1 ? lines : lines.slice(0, cut);
  let text = stripAnchor(trimmedLines.join('\n'));
  if (text.length > maxChars) text = text.slice(0, maxChars) + '\n\n_[…amendment truncated for bundle-cap]_';
  return text;
}

async function runOneAmendment(amend) {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[${amend.code}] starting · ${startedAt}\n`);
  const draftText = await loadAmendmentText(amend.file, amend.amendmentMaxChars);
  const canonical = await buildCompactCanonical(amend.canonicalSections);
  process.stdout.write(`[${amend.code}] amendment: ${draftText.length} chars · canonical: ${canonical.length} chars\n`);
  const result = await runAdversarialPanelConsultation({
    topic: `${amend.code} (${amend.title}) — v2 re-Panel`,
    draftText,
    questions: amend.questions,
    seed: `${amend.code.toLowerCase().replace(/-/g, '')}-repanel-2026-05-19`,
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();
  return { amend, startedAt, finishedAt, result };
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[ca13-15-16-v2-repanel] started ${startedAt}\n`);
  const audit = auditDiversity();
  if (audit.auditPass !== true || audit.slots !== 10) throw new Error('Panel audit failed');

  const RESULTS = [];
  for (const amend of AMENDMENTS) {
    const out = await runOneAmendment(amend);
    RESULTS.push(out);
    const engaged = out.result.tally.engagedTotal;
    process.stdout.write(`[${amend.code}] complete · bundle=${out.result.bundle_chars} · engaged=${engaged}/10 · objections=${out.result.tally.distinctObjections}\n`);
    for (const q of amend.questions) {
      const v = out.result.perVerdicts[q.id];
      const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
      process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${engaged}) cleared=${cleared}\n`);
    }
    const t = out.result.tally;
    const md = [`# Panel — ${amend.code} (${amend.title}) — v2 re-Panel (2026-05-19)`, ``,
      `**Bundle:** ${out.result.bundle_chars} chars (target ≤35K to match proven recipe)`,
      `**Started:** ${out.startedAt} · **Finished:** ${out.finishedAt}`,
      `**Engaged:** ${t.engagedTotal}/10 · **Tangential:** ${t.tangential} · **Silent:** ${t.silent}`,
      `**Distinct objections:** ${t.distinctObjections}`,
      `**Alignment:** ${(out.result.dissentFloor.alignedPct*100).toFixed(1)}% · ${out.result.dissentFloor.triggered?'🚨 INVALID':'✅ PASS'}`,
      ``, `## Per-question`,
      `| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥${QUORUM}) |`,
      `|---|---|---|---|---|`,
      ...amend.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
        return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
      }),
      ``, `## Detail`,
      ...amend.questions.map((q) => {
        const v = out.result.perVerdicts[q.id]; const c = out.result.tally.perQuestion[q.id];
        const tally = q.options.map((o) => `  - \`${o.key}\` "${o.text.slice(0, 140)}" → **${c[o.key] || 0}**`);
        for (const k of Object.keys(c)) if (!q.options.find((o) => o.key === k) && k !== 'unmatched' && c[k] > 0) tally.push(`  - \`${k}\` → ${c[k]}`);
        if (c.unmatched) tally.push(`  - _(unmatched)_ → ${c.unmatched}`);
        return `### ${q.id}\n${q.topic}\n\nTally (n=${t.engagedTotal}):\n${tally.join('\n')}\n**Verdict:** ${v.verdict} — ${v.detail}\n`;
      }),
      ``, `## All distinct objections (${t.distinctObjections})`,
      (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n'),
      ``, `## Per-reviewer`,
      out.result.perReviewer.map((r) => {
        const lines = [`### Slot ${r.slot} — ${r.modelTag} — \`${r.state}\``, ''];
        if (r.state === 'SILENT') return lines.concat(['_(degraded)_', '']).join('\n');
        if (r.adversarial?.valid) {
          lines.push('**Adversarial pass:**', '');
          for (const [i, o] of r.adversarial.objections.entries()) lines.push(`- **Obj ${i+1} — ${o.title}**`, `  > ${(o.detail||'').replace(/\n/g,'\n  > ')}`);
          lines.push('');
        }
        if (r.rejection_steelman) lines.push('**Steelman:**', `> ${r.rejection_steelman.replace(/\n/g,'\n> ')}`, '');
        lines.push('**Votes:**', '');
        for (const q of amend.questions) {
          const vt = r.votes?.[q.id] || {};
          const ot = vt.key ? (q.options.find((o) => o.key === vt.key)?.text.slice(0, 110) || vt.key) : (vt.pick_text || '—');
          lines.push(`- **${q.id}** = \`${vt.key ?? 'UNMATCHED'}\` — ${ot}`);
          if (vt.rationale) lines.push(`  > ${vt.rationale}`);
        }
        return lines.join('\n');
      }).join('\n\n')];
    await writeFile(path.join(OUTPUT_DIR, `${amend.code.toLowerCase()}-repanel-2026-05-19.md`), md.join('\n'), 'utf8');
    await writeFile(path.join(OUTPUT_DIR, `${amend.code.toLowerCase()}-repanel-2026-05-19.sidecar.json`), JSON.stringify({ schema: 'v2-repanel.sidecar.v1', code: amend.code, commit: amend.commit, bundle_size: out.result.bundle_chars, startedAt: out.startedAt, finishedAt: out.finishedAt, w6_metadata: out.result.w6_metadata, tally: out.result.tally, per_question_verdicts: out.result.perVerdicts, dissent_floor: out.result.dissentFloor, perReviewer: out.result.perReviewer, questions: amend.questions }, null, 2), 'utf8');
  }
  const finishedAt = new Date().toISOString();

  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const consolidated = [`# W6 v2 re-Panel · CA-13/15/16 (2026-05-19)`, ``,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Strategy:** three focused per-amendment v2 runs, each bundle ≤35K.`,
    `**Quorum:** ≥${QUORUM}/10 engaged per Locked Rule 17 + drafted-(a) ≥${QUORUM}/engaged for plain ratification.`,
    ``, `## CROSS-AMENDMENT SUMMARY`,
    `| Amendment | Bundle | Engaged | Objs | Cleared / Total |`,
    `|---|--:|--:|--:|--:|`,
    ...RESULTS.map((r) => {
      const t = r.result.tally;
      const cleared = r.amend.questions.filter((q) => { const v = r.result.perVerdicts[q.id]; return v.topCount >= QUORUM && v.topKey === q.draftedKey; }).length;
      return `| **${r.amend.code}** | ${r.result.bundle_chars} | ${t.engagedTotal}/10 | ${t.distinctObjections} | ${cleared}/${r.amend.questions.length} |`;
    }),
    ``, ...RESULTS.map((r) => {
      const t = r.result.tally;
      return [`## ${r.amend.code} — ${r.amend.title}`, '',
        `Bundle: ${r.result.bundle_chars} chars · Engaged: ${t.engagedTotal}/10 · Objections: ${t.distinctObjections}`, '',
        `| Q | Verdict | Top key | Top / Engaged | Cleared |`, `|---|---|---|---|---|`,
        ...r.amend.questions.map((q) => {
          const v = r.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
          return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
        }),
        ''].join('\n');
    })];
  await writeFile(CONS_PATH, consolidated.join('\n'), 'utf8');
  await writeFile(CONS_SIDECAR, JSON.stringify({ schema: 'v2-repanel-consolidated.sidecar.v1', startedAt, finishedAt, audit, results: RESULTS.map((r) => ({ code: r.amend.code, commit: r.amend.commit, bundle_size: r.result.bundle_chars, tally: r.result.tally, per_question_verdicts: r.result.perVerdicts, dissent_floor: r.result.dissentFloor, questions: r.amend.questions })) }, null, 2), 'utf8');
  process.stdout.write(`[ca13-15-16-v2-repanel] DONE · consolidated → ${CONS_PATH}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[ca13-15-16-v2-repanel] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
