// scripts/panel/run-ca13-14-15-16-quorum-fix-rerun.mjs
//
// W6 ENGAGEMENT-QUORUM FIX — Re-Panel CA-13, CA-14, CA-15, CA-16 as FOUR
// SEPARATE focused runs. Each bundle ≤~30K to match the proven recipe
// (roadmap consult hit 10/10 at 27,778 chars). Target ≥7/10 ENGAGED per
// Locked Rule 17. Run all 4 sub-Panels back-to-back; one consolidated report.

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
const CONSOLIDATED_PATH = path.join(OUTPUT_DIR, 'ca13-14-15-16-quorum-fix-rerun-2026-05-19.md');
const CONSOLIDATED_SIDECAR = path.join(OUTPUT_DIR, 'ca13-14-15-16-quorum-fix-rerun-2026-05-19.sidecar.json');
const QUORUM = 7;

// =========================================================================
// CA-13 — GTM bar 75→95 + CA-9-Q4 Option (a) reconciliation (5 questions)
// =========================================================================
const CA13_QUESTIONS = [
  {
    id: 'CA-13-A-Q1', topic: 'CA-13-A-Q1 — Should §7.6 GTM Readiness Report adopt the CEO directive of ≥95 as the GTM-ready band (per CA-13-A), superseding the ENTRY 006 ≥75 Demo-ready band?',
    options: [
      { key: 'CA13AQ1-RATIFY', text: 'Ratify — adopt CA-13-A §7.6 bands verbatim. GTM-ready 95–100; Near-GTM 90–94; Internal-only 75–89; Pre-internal 60–74; Not-demo-ready 0–59.' },
      { key: 'CA13AQ1-REVISE', text: 'Ratify with revision — adopt the bar change but adjust band labels or thresholds.' },
      { key: 'CA13AQ1-REJECT', text: 'Reject — keep ENTRY 006 ≥75 Demo-ready bar; surface CEO directive as operator-product GTM bar.' },
      { key: 'CA13AQ1-DEFER',  text: 'Defer — surface the CEO directive but do not amend §7.6 until at least one VEU product demonstrates ≥95 sustained end-to-end.' },
    ],
    draftedKey: 'CA13AQ1-RATIFY',
  },
  {
    id: 'CA-13-A-Q2', topic: 'CA-13-A-Q2 — Near-GTM band (90–94) MAY pass §11 Step 5 as "conditional clearance" with admin signoff. Right balance, or should the 95-bar be hard?',
    options: [
      { key: 'CA13AQ2-RATIFY',  text: 'Ratify as drafted — Near-GTM passes Step 5 with admin signoff + LIMITATIONS published verbatim.' },
      { key: 'CA13AQ2-HARD',    text: 'Eliminate conditional path — ≥95 is hard; below 95 → blocked; admin cannot signoff Near-GTM.' },
      { key: 'CA13AQ2-TIGHTEN', text: 'Tighten — Near-GTM passes Step 5 ONLY when ALL `high` findings are Resolved.' },
      { key: 'CA13AQ2-LOOSEN',  text: 'Loosen — Near-GTM passes Step 5 with operator signoff (not just admin).' },
    ],
    draftedKey: 'CA13AQ2-RATIFY',
  },
  {
    id: 'CA-13-A-Q3', topic: 'CA-13-A-Q3 — Should canonical §19 carry an explicit "two-distinct-95 bars" reconciliation paragraph (§19.0) to prevent conflation between Self-Audit 95/95 and GTM Readiness ≥95?',
    options: [
      { key: 'CA13AQ3-RATIFY', text: 'Ratify — adopt §19.0 verbatim. Load-bearing per Locked Rule 3.' },
      { key: 'CA13AQ3-REVISE', text: 'Ratify with revision — adjust §19.0 wording.' },
      { key: 'CA13AQ3-REJECT', text: 'Reject — the §10 table already lists the three mechanisms; §19.0 is redundant.' },
      { key: 'CA13AQ3-MOVE',   text: 'Move reconciliation to §10 (Self-Governance) instead of §19.' },
    ],
    draftedKey: 'CA13AQ3-RATIFY',
  },
  {
    id: 'CA-13-B-Q1', topic: 'CA-13-B-Q1 — ENTRY 009 records CEO re-disposition of CA-9-Q4 to Option (a) — EXECUTOR_REGISTRY sibling pattern — but §15 intro + §15.1 rows 21/26 still carry old (b) phrasing. Amend canonical to match ENTRY 009?',
    options: [
      { key: 'CA13BQ1-RATIFY', text: 'Ratify — strike "(b) dual-authority" from §15 intro + §15.1 rows 21/26; replace with Option (a) sibling-pattern language citing ENTRY 009.' },
      { key: 'CA13BQ1-REVISE', text: 'Ratify with revision — adjust replacement wording.' },
      { key: 'CA13BQ1-REJECT', text: 'Reject — leave canonical text at (b) phrasing; ENTRY 009 stays code-level only.' },
      { key: 'CA13BQ1-DEFER',  text: 'Defer — amend §15 at the same commit that populates §15.5 sibling-row table.' },
    ],
    draftedKey: 'CA13BQ1-RATIFY',
  },
  {
    id: 'CA-13-B-Q2', topic: 'CA-13-B-Q2 — Sibling charter keys `aggressive-crawl-conductor-executor` and `orchestra-research-agent-executor`. Right naming?',
    options: [
      { key: 'CA13BQ2-RATIFY',     text: 'Adopt as drafted — `<agent-short-name>-executor` pattern.' },
      { key: 'CA13BQ2-AGENTID',    text: 'Adopt agentId-keyed naming — e.g. `agent-21-executor`, `agent-26-executor`.' },
      { key: 'CA13BQ2-CAPABILITY', text: 'Adopt capability-keyed naming — e.g. `crawl-write-executor`, `orchestra-admission-executor`.' },
      { key: 'CA13BQ2-DEFER',      text: 'Defer naming to engineering dispatch.' },
    ],
    draftedKey: 'CA13BQ2-RATIFY',
  },
];

// =========================================================================
// CA-14 — Phase B HARD gate + Self-Renewal invariants + findings-driven + per-product branch + atomic-audit-write (11 questions)
// =========================================================================
const CA14_QUESTIONS = [
  {
    id: 'CA-14-A-Q1', topic: 'CA-14-A-Q1 — §11 Clearance Step 5 require Phase B Adversarial Surface Testing as HARD prerequisite?',
    options: [
      { key: 'CA14AQ1-RATIFY',   text: 'Ratify as drafted — Phase B is a hard gate; failure blocks Step 5.' },
      { key: 'CA14AQ1-REDUCED',  text: 'Ratify with reduced scope — Phase B mandatory only for `prd` environment.' },
      { key: 'CA14AQ1-OPTIN',    text: 'Ratify with admin-role opt-in — Phase B defaults mandatory but operator may opt out with audit-logged justification.' },
      { key: 'CA14AQ1-REJECT',   text: 'Reject — Phase A sufficient; Phase B as advisory signal without blocking.' },
    ],
    draftedKey: 'CA14AQ1-RATIFY',
  },
  {
    id: 'CA-14-A-Q2', topic: 'CA-14-A-Q2 — Verbatim LIMITATIONS disclosure phrase for Phase-A-only deliveries. Right wording?',
    options: [
      { key: 'CA14AQ2-RATIFY',     text: 'Ratify as drafted (verbatim canonical wording).' },
      { key: 'CA14AQ2-PARAPHRASE', text: 'Operator paraphrase permission — same intent, operator may rewrite.' },
      { key: 'CA14AQ2-SHORTER',    text: 'Adopt shorter form — "§7.6 score reflects surface verification only; NOT a functional certification."' },
      { key: 'CA14AQ2-FREEFORM',   text: 'No verbatim wording — require disclosure but let operator phrase.' },
    ],
    draftedKey: 'CA14AQ2-RATIFY',
  },
  {
    id: 'CA-14-A-Q3', topic: 'CA-14-A-Q3 — Phase B implementation owner.',
    options: [
      { key: 'CA14AQ3-AGENT21',   text: 'Agent #21 ACE Conductor expand to own Phase B.' },
      { key: 'CA14AQ3-AGENT8',    text: 'Agent #8 Quality Audit owns Phase B (closer to QA).' },
      { key: 'CA14AQ3-OPSRUNNER', text: 'New Ops Runner role (#22/#24/#25) owns Phase B.' },
      { key: 'CA14AQ3-DEFER',     text: 'Defer ownership — engineering dispatch picks owner.' },
    ],
    draftedKey: 'CA14AQ3-AGENT21',
  },
  {
    id: 'CA-14-A-Q4', topic: 'CA-14-A-Q4 — Should CA-14-A add Locked Rule 19 ("Phase A vs Phase B — DO NOT CONFLATE") to §25?',
    options: [
      { key: 'CA14AQ4-RATIFY', text: 'Ratify Locked Rule 19 as drafted.' },
      { key: 'CA14AQ4-DEFER',  text: 'Ratify but defer Rule 19 numbering — consolidate at end of CA cycle.' },
      { key: 'CA14AQ4-REJECT', text: 'Reject Locked Rule 19 — §6.10 + §7.6 + §7 LIMITATIONS amendments sufficient.' },
      { key: 'CA14AQ4-MODIFY', text: 'Modify Rule 19 wording.' },
    ],
    draftedKey: 'CA14AQ4-RATIFY',
  },
  {
    id: 'CA-14-B-Q1', topic: 'CA-14-B-Q1 — §7 Output Contract item #6 (5 fix-safety invariants: diff-only/preserve/parse/regression-guard/attribution) ratified as drafted?',
    options: [
      { key: 'CA14BQ1-RATIFY', text: 'Ratify all 5 invariants as drafted.' },
      { key: 'CA14BQ1-DROP',   text: 'Ratify 4 invariants; drop one (specify).' },
      { key: 'CA14BQ1-EXPAND', text: 'Ratify with expansion — add a 6th invariant.' },
      { key: 'CA14BQ1-REJECT', text: 'Reject — invariants belong in SELF_RENEWAL_SPEC.md not canonical SSOT.' },
    ],
    draftedKey: 'CA14BQ1-RATIFY',
  },
  {
    id: 'CA-14-B-Q2', topic: 'CA-14-B-Q2 — Canonical "NEVER ships" guarantee wording. Right wording?',
    options: [
      { key: 'CA14BQ2-RATIFY',   text: 'Ratify as drafted (verbatim canonical guarantee).' },
      { key: 'CA14BQ2-SOFTEN',   text: 'Soften to "rarely ships" — acknowledges edge cases.' },
      { key: 'CA14BQ2-OVERRIDE', text: 'Strengthen with operator-override clause — admin role may override with audit-logged justification.' },
      { key: 'CA14BQ2-MODIFY',   text: 'Modify wording.' },
    ],
    draftedKey: 'CA14BQ2-RATIFY',
  },
  {
    id: 'CA-14-B-Q3', topic: 'CA-14-B-Q3 — §10.4 "Fix-Safety invariants" placement. Where should it live?',
    options: [
      { key: 'CA14BQ3-RATIFY',    text: 'Ratify §10.4 placement.' },
      { key: 'CA14BQ3-S12',       text: 'Move to §12 Remediation Modes.' },
      { key: 'CA14BQ3-S19',       text: 'Move to §19 Governance.' },
      { key: 'CA14BQ3-CROSSLIST', text: 'Cross-list (§10.4 + §12 + §19).' },
    ],
    draftedKey: 'CA14BQ3-RATIFY',
  },
  {
    id: 'CA-14-C-Q1', topic: 'CA-14-C-Q1 — Five-Layer Framework is telemetry-only, not remediation prioritizer. Right framing?',
    options: [
      { key: 'CA14CQ1-RATIFY',   text: 'Ratify as drafted — §6.10 + §7.6 paragraphs canonical.' },
      { key: 'CA14CQ1-STRONGER', text: 'Stronger language — "Five-Layer tags MUST NOT influence remediation ordering" (explicit prohibition).' },
      { key: 'CA14CQ1-REJECT',   text: 'Reject — clarification is redundant; Locked Rule 6 already says "tagging".' },
      { key: 'CA14CQ1-MODIFY',   text: 'Modify framing.' },
    ],
    draftedKey: 'CA14CQ1-RATIFY',
  },
  {
    id: 'CA-14-C-Q2', topic: 'CA-14-C-Q2 — §9 Step 6 row note referencing §7.6 findings as prio source.',
    options: [
      { key: 'CA14CQ2-ADD',         text: 'Add a §9 Step 6 row note referencing §7.6 findings.' },
      { key: 'CA14CQ2-CONDITIONAL', text: 'Add note only if §9 step-row table format permits.' },
      { key: 'CA14CQ2-SKIP',        text: "Don't touch §9 — §6.10 + §7.6 amendments sufficient." },
      { key: 'CA14CQ2-MODIFY',      text: 'Modify approach.' },
    ],
    draftedKey: 'CA14CQ2-ADD',
  },
  {
    id: 'CA-14-D-Q1', topic: 'CA-14-D-Q1 — §7.5.1 three operational invariants (branch-of-record + ProductSSOT seeding + atomic-audit-write) ratified?',
    options: [
      { key: 'CA14DQ1-RATIFY', text: 'Ratify all 3 invariants as drafted.' },
      { key: 'CA14DQ1-DROP',   text: 'Ratify 2; drop one (specify).' },
      { key: 'CA14DQ1-EXPAND', text: 'Ratify with expansion — add 4th invariant.' },
      { key: 'CA14DQ1-REJECT', text: 'Reject — operational invariants belong in engineering spec not canonical.' },
    ],
    draftedKey: 'CA14DQ1-RATIFY',
  },
  {
    id: 'CA-14-D-Q2', topic: 'CA-14-D-Q2 — Per-product seed migration: FlowAI + MyPregLife seeded; remaining 4 VEU products pending. Block or proceed?',
    options: [
      { key: 'CA14DQ2-BLOCK',     text: 'Block CA-14 ratification until all 5 VEU products seeded.' },
      { key: 'CA14DQ2-NDAYS',     text: 'Ratify with acceptance criterion: remaining 4 products seeded within N days post-ratification.' },
      { key: 'CA14DQ2-IMMEDIATE', text: 'Ratify immediately; remaining 4 products seeded per operator-driven order.' },
      { key: 'CA14DQ2-MODIFY',    text: 'Modify approach.' },
    ],
    draftedKey: 'CA14DQ2-NDAYS',
  },
];

// =========================================================================
// CA-15 — Multi-Dim Quality Audit + Purpose Capture + Purpose-Driven Optimization + SSOT-Conformance Gate (11 questions)
// =========================================================================
const CA15_QUESTIONS = [
  {
    id: 'CA-15-A-Q1', topic: 'CA-15-A-Q1 — 7-axis canonical Quality Audit rubric (UX, API, Data, Auth, Perf, Accessibility, Observability) ratification.',
    options: [
      { key: 'CA15AQ1-RATIFY',  text: 'Ratify 7-axis rubric as drafted.' },
      { key: 'CA15AQ1-FEWER',   text: 'Reduce to 5 axes — drop Observability and Accessibility (specify reasoning).' },
      { key: 'CA15AQ1-MORE',    text: 'Expand to 9+ axes — add SecurityPosture and Internationalization.' },
      { key: 'CA15AQ1-DIFF',    text: 'Adopt different axis set entirely (specify in rationale).' },
    ],
    draftedKey: 'CA15AQ1-RATIFY',
  },
  {
    id: 'CA-15-A-Q2', topic: 'CA-15-A-Q2 — Fold 7-axis rubric into §7.6 (equal footing with Five-Layer)?',
    options: [
      { key: 'CA15AQ2-RATIFY',  text: 'Ratify — fold into §7.6 with equal footing; 7-axis is canonical alongside Five-Layer.' },
      { key: 'CA15AQ2-SUBORD',  text: 'Subordinate to Five-Layer — Multi-Dim rubric becomes telemetry feeding §7.6 score, not equal footing.' },
      { key: 'CA15AQ2-SEPARATE', text: 'Keep separate from §7.6 — Multi-Dim Quality Audit lives in its own §27 section.' },
      { key: 'CA15AQ2-MODIFY',  text: 'Modify folding approach.' },
    ],
    draftedKey: 'CA15AQ2-RATIFY',
  },
  {
    id: 'CA-15-A-Q3', topic: 'CA-15-A-Q3 — Per-axis enable/disable knob per product?',
    options: [
      { key: 'CA15AQ3-RATIFY', text: 'Ratify — operators may enable/disable axes per product via ProductRegistry.qualityAxes.' },
      { key: 'CA15AQ3-FIXED',  text: 'Reject knob — all 7 axes always-on; no per-product disable.' },
      { key: 'CA15AQ3-ADMIN',  text: 'Knob exists but admin-role only (operator cannot disable axes).' },
      { key: 'CA15AQ3-MODIFY', text: 'Modify knob shape.' },
    ],
    draftedKey: 'CA15AQ3-RATIFY',
  },
  {
    id: 'CA-15-B-Q1', topic: 'CA-15-B-Q1 — `purpose_record` as 7th canonical block in ProductSSOT (§7.5).',
    options: [
      { key: 'CA15BQ1-RATIFY', text: 'Ratify — `purpose_record` is the 7th canonical block; required for every product.' },
      { key: 'CA15BQ1-OPTIONAL', text: 'Ratify but optional — `purpose_record` exists but is not required.' },
      { key: 'CA15BQ1-REJECT', text: 'Reject — purpose lives in operator-stated spec, not in ProductSSOT canonical schema.' },
      { key: 'CA15BQ1-MODIFY', text: 'Modify block placement / shape.' },
    ],
    draftedKey: 'CA15BQ1-RATIFY',
  },
  {
    id: 'CA-15-B-Q2', topic: 'CA-15-B-Q2 — Three canonical purpose-capture modes (operator-stated / reverse-engineered / attested) ratified?',
    options: [
      { key: 'CA15BQ2-RATIFY', text: 'Ratify all 3 modes as drafted.' },
      { key: 'CA15BQ2-DROP_RE', text: 'Ratify 2 — drop reverse-engineered (risk of poisoning SSOT with wrong inferred intent).' },
      { key: 'CA15BQ2-DROP_ATT', text: 'Ratify 2 — drop attested (low signal vs operator-stated).' },
      { key: 'CA15BQ2-EXPAND', text: 'Expand — add 4th mode (e.g. CEO-decreed).' },
    ],
    draftedKey: 'CA15BQ2-RATIFY',
  },
  {
    id: 'CA-15-B-Q3', topic: 'CA-15-B-Q3 — Placeholder rejection regex (reject Lorem Ipsum / TODO / FIXME in purpose_record).',
    options: [
      { key: 'CA15BQ3-RATIFY', text: 'Ratify regex as drafted.' },
      { key: 'CA15BQ3-EXPAND', text: 'Expand regex — add more placeholder patterns (e.g. "PLACEHOLDER", "XXX", "TBD").' },
      { key: 'CA15BQ3-REJECT', text: 'Reject regex — placeholder detection belongs in linter, not canonical.' },
      { key: 'CA15BQ3-MODIFY', text: 'Modify regex.' },
    ],
    draftedKey: 'CA15BQ3-RATIFY',
  },
  {
    id: 'CA-15-C-Q1', topic: 'CA-15-C-Q1 — Floor + north-star two-step exit (purpose-fulfillment is north-star, not numeric threshold).',
    options: [
      { key: 'CA15CQ1-RATIFY', text: 'Ratify two-step exit as drafted.' },
      { key: 'CA15CQ1-FLOOR_ONLY', text: 'Floor only — keep numeric threshold, drop purpose-fulfillment exit.' },
      { key: 'CA15CQ1-NORTH_ONLY', text: 'North-star only — drop numeric floor, purpose-fulfillment is sole gate.' },
      { key: 'CA15CQ1-MODIFY', text: 'Modify exit semantics.' },
    ],
    draftedKey: 'CA15CQ1-RATIFY',
  },
  {
    id: 'CA-15-C-Q2', topic: 'CA-15-C-Q2 — `purpose_fulfillment_score` default threshold 0.7?',
    options: [
      { key: 'CA15CQ2-RATIFY', text: 'Ratify 0.7 default.' },
      { key: 'CA15CQ2-HIGHER', text: '0.7 too low — raise to 0.8 or 0.85.' },
      { key: 'CA15CQ2-LOWER',  text: '0.7 too high — lower to 0.6.' },
      { key: 'CA15CQ2-CONFIG', text: 'Make per-product configurable; 0.7 is default.' },
    ],
    draftedKey: 'CA15CQ2-RATIFY',
  },
  {
    id: 'CA-15-C-Q3', topic: 'CA-15-C-Q3 — `PURPOSE_DRIFT` exit semantics (when purpose changes from prior capture).',
    options: [
      { key: 'CA15CQ3-RATIFY', text: 'Ratify PURPOSE_DRIFT as drafted — exits NO_IMPROVEMENT with explicit drift annotation.' },
      { key: 'CA15CQ3-BLOCK',  text: 'Block instead — PURPOSE_DRIFT halts the run, requires operator re-capture.' },
      { key: 'CA15CQ3-AUTO_RECAPTURE', text: 'Auto-recapture — engine re-runs purpose capture and continues.' },
      { key: 'CA15CQ3-MODIFY', text: 'Modify drift semantics.' },
    ],
    draftedKey: 'CA15CQ3-RATIFY',
  },
  {
    id: 'CA-15-D-Q1', topic: 'CA-15-D-Q1 — §27 SSOT-Conformance Gate ratification (end-stage conformance test).',
    options: [
      { key: 'CA15DQ1-RATIFY', text: 'Ratify §27 as drafted — end-stage SSOT-conformance test is a hard gate.' },
      { key: 'CA15DQ1-CONTINUOUS', text: 'Promote §27 to continuous gate (runs at every §11 step, not just end-stage).' },
      { key: 'CA15DQ1-ADVISORY', text: 'Downgrade §27 to advisory — surfaces conformance issues but does not block.' },
      { key: 'CA15DQ1-MODIFY', text: 'Modify gate semantics.' },
    ],
    draftedKey: 'CA15DQ1-RATIFY',
  },
  {
    id: 'CA-15-D-Q2', topic: 'CA-15-D-Q2 — CEO sign-off invalidation on every CA promotion (CA-15-D requires CEO re-sign every CA cycle).',
    options: [
      { key: 'CA15DQ2-RATIFY', text: 'Ratify — CEO sign-off invalidates on every CA promotion; must re-sign.' },
      { key: 'CA15DQ2-PARTIAL', text: 'Partial — CEO sign-off invalidates only on CA promotions affecting §27.' },
      { key: 'CA15DQ2-REJECT', text: 'Reject — CEO sign-off is per-product, not per-CA-promotion.' },
      { key: 'CA15DQ2-MODIFY', text: 'Modify invalidation scope.' },
    ],
    draftedKey: 'CA15DQ2-RATIFY',
  },
];

// =========================================================================
// CA-16 — Proactive Recommendations + Redesign Environment + Multi-Format Targets (11 questions)
// =========================================================================
const CA16_QUESTIONS = [
  {
    id: 'CA-16-A-Q1', topic: 'CA-16-A-Q1 — `agent.proactive_recommendation.v1` envelope schema ratification.',
    options: [
      { key: 'CA16AQ1-RATIFY', text: 'Ratify envelope schema as drafted.' },
      { key: 'CA16AQ1-REVISE', text: 'Ratify with revision — adjust schema fields (specify).' },
      { key: 'CA16AQ1-REJECT', text: 'Reject — schema not yet ready for canonicalization.' },
      { key: 'CA16AQ1-DEFER',  text: 'Defer schema to engineering dispatch.' },
    ],
    draftedKey: 'CA16AQ1-RATIFY',
  },
  {
    id: 'CA-16-A-Q2', topic: 'CA-16-A-Q2 — Step 1.5 placement in §11 Six-Step Clearance for proactive recommendations.',
    options: [
      { key: 'CA16AQ2-RATIFY', text: 'Ratify Step 1.5 placement as drafted.' },
      { key: 'CA16AQ2-LATER',  text: 'Place after Step 2 (recommendations gated by initial audit).' },
      { key: 'CA16AQ2-PARALLEL', text: 'Parallel to Step 1 (not sequential).' },
      { key: 'CA16AQ2-REJECT', text: 'Reject — proactive recommendations should not be a clearance-protocol step.' },
    ],
    draftedKey: 'CA16AQ2-RATIFY',
  },
  {
    id: 'CA-16-A-Q3', topic: 'CA-16-A-Q3 — Recommendation categories enum + extensibility.',
    options: [
      { key: 'CA16AQ3-RATIFY', text: 'Ratify enum as drafted; extensibility via Panel-ratified additions.' },
      { key: 'CA16AQ3-OPEN',   text: 'Make enum open-ended — operators may declare new categories.' },
      { key: 'CA16AQ3-NARROWER', text: 'Tighten enum — fewer categories than drafted.' },
      { key: 'CA16AQ3-MODIFY', text: 'Modify enum.' },
    ],
    draftedKey: 'CA16AQ3-RATIFY',
  },
  {
    id: 'CA-16-A-Q4', topic: 'CA-16-A-Q4 — Defer-window default for non-acted recommendations.',
    options: [
      { key: 'CA16AQ4-RATIFY', text: 'Ratify default defer-window as drafted.' },
      { key: 'CA16AQ4-SHORTER', text: 'Shorter default defer-window.' },
      { key: 'CA16AQ4-LONGER', text: 'Longer default defer-window.' },
      { key: 'CA16AQ4-CONFIG', text: 'Per-product configurable; drafted value is default.' },
    ],
    draftedKey: 'CA16AQ4-RATIFY',
  },
  {
    id: 'CA-16-B-Q1', topic: 'CA-16-B-Q1 — §29 Redesign/Build Environment section numbering.',
    options: [
      { key: 'CA16BQ1-RATIFY', text: 'Ratify §29 numbering as drafted.' },
      { key: 'CA16BQ1-RENUMBER', text: 'Renumber to fit existing section sequence (specify).' },
      { key: 'CA16BQ1-MERGE',  text: 'Merge §29 with an existing section.' },
      { key: 'CA16BQ1-DEFER',  text: 'Defer numbering to canonicalization commit.' },
    ],
    draftedKey: 'CA16BQ1-RATIFY',
  },
  {
    id: 'CA-16-B-Q2', topic: 'CA-16-B-Q2 — Multi-option proposal floor (minimum N options per redesign proposal).',
    options: [
      { key: 'CA16BQ2-RATIFY', text: 'Ratify floor as drafted (e.g. ≥3 options).' },
      { key: 'CA16BQ2-HIGHER', text: 'Raise floor (e.g. ≥5 options).' },
      { key: 'CA16BQ2-LOWER',  text: 'Lower floor (e.g. ≥2 options).' },
      { key: 'CA16BQ2-NONE',   text: 'No floor — operator-judged.' },
    ],
    draftedKey: 'CA16BQ2-RATIFY',
  },
  {
    id: 'CA-16-B-Q3', topic: 'CA-16-B-Q3 — Admin-gated approval scope for Redesign/Build Environment.',
    options: [
      { key: 'CA16BQ3-RATIFY', text: 'Ratify scope as drafted — admin-role required for redesign approval.' },
      { key: 'CA16BQ3-WIDER',  text: 'Widen scope — operator-role may approve some redesigns.' },
      { key: 'CA16BQ3-NARROWER', text: 'Narrow scope — CEO-only for redesign approval.' },
      { key: 'CA16BQ3-MODIFY', text: 'Modify gate semantics.' },
    ],
    draftedKey: 'CA16BQ3-RATIFY',
  },
  {
    id: 'CA-16-C-Q1', topic: 'CA-16-C-Q1 — 6 canonical target classes for Multi-Format Targets ratification.',
    options: [
      { key: 'CA16CQ1-RATIFY', text: 'Ratify 6 target classes as drafted.' },
      { key: 'CA16CQ1-FEWER',  text: 'Reduce target classes — keep only highest-value (specify).' },
      { key: 'CA16CQ1-MORE',   text: 'Expand target classes — add missing categories.' },
      { key: 'CA16CQ1-DIFF',   text: 'Adopt different target-class taxonomy.' },
    ],
    draftedKey: 'CA16CQ1-RATIFY',
  },
  {
    id: 'CA-16-C-Q2', topic: 'CA-16-C-Q2 — Detection determinism (how engine identifies a target class).',
    options: [
      { key: 'CA16CQ2-RATIFY', text: 'Ratify detection rules as drafted.' },
      { key: 'CA16CQ2-STRICTER', text: 'Stricter detection — fewer false positives.' },
      { key: 'CA16CQ2-LOOSER', text: 'Looser detection — broader coverage.' },
      { key: 'CA16CQ2-LLM',    text: 'LLM-classified detection instead of deterministic.' },
    ],
    draftedKey: 'CA16CQ2-RATIFY',
  },
  {
    id: 'CA-16-C-Q3', topic: 'CA-16-C-Q3 — Multi-Format ownership (which agent owns multi-format target detection + scoring).',
    options: [
      { key: 'CA16CQ3-AGENT8',  text: 'Agent #8 Quality Audit owns Multi-Format.' },
      { key: 'CA16CQ3-AGENT21', text: 'Agent #21 ACE owns Multi-Format.' },
      { key: 'CA16CQ3-NEW',     text: 'New agent owns Multi-Format.' },
      { key: 'CA16CQ3-DEFER',   text: 'Defer ownership to engineering dispatch.' },
    ],
    draftedKey: 'CA16CQ3-AGENT8',
  },
  {
    id: 'CA-16-C-Q4', topic: 'CA-16-C-Q4 — §7.6 score-formula generalization invariant (score formula remains product-agnostic across target classes).',
    options: [
      { key: 'CA16CQ4-RATIFY', text: 'Ratify generalization invariant as drafted.' },
      { key: 'CA16CQ4-PER_CLASS', text: 'Allow per-target-class score-formula tuning (operator-configurable).' },
      { key: 'CA16CQ4-REJECT', text: 'Reject — score formula is already product-agnostic; invariant is redundant.' },
      { key: 'CA16CQ4-MODIFY', text: 'Modify invariant.' },
    ],
    draftedKey: 'CA16CQ4-RATIFY',
  },
];

const AMENDMENTS = [
  {
    code: 'CA-13', file: 'SSOT_AMENDMENT_CA13_DRAFT.md', commit: '81cf144',
    title: 'GTM bar 75→95 + CA-9-Q4 Option (a) reconciliation',
    questions: CA13_QUESTIONS,
    canonicalSections: [['## 7. ', '## 8. ', 4500], ['## 15. ', '## 16. ', 3500], ['## 19. ', '## 20. ', 3000]],
    amendmentMaxChars: 17000,
  },
  {
    code: 'CA-14', file: 'SSOT_AMENDMENT_CA14_DRAFT.md', commit: 'fae9ff3',
    title: 'Phase B HARD gate + Self-Renewal invariants + findings-driven + per-product branch + atomic-audit-write',
    questions: CA14_QUESTIONS,
    canonicalSections: [['## 6. ', '## 7. ', 3500], ['## 7. ', '## 8. ', 4500], ['## 10. ', '## 11. ', 3000], ['## 25. ', '## 26. ', 3000]],
    amendmentMaxChars: 13000,
  },
  {
    code: 'CA-15', file: 'SSOT_AMENDMENT_CA15_DRAFT.md', commit: 'b953388',
    title: 'Multi-Dim Quality Audit + Purpose Capture + Purpose-Driven Optimization + SSOT-Conformance Gate',
    questions: CA15_QUESTIONS,
    canonicalSections: [['## 6. ', '## 7. ', 3000], ['## 7. ', '## 8. ', 4500], ['## 10. ', '## 11. ', 3000]],
    amendmentMaxChars: 14000,
  },
  {
    code: 'CA-16', file: 'SSOT_AMENDMENT_CA16_DRAFT.md', commit: '908f340',
    title: 'Proactive Recommendations + Redesign/Build Environment + Multi-Format Targets',
    questions: CA16_QUESTIONS,
    canonicalSections: [['## 6. ', '## 7. ', 3000], ['## 7. ', '## 8. ', 4500], ['## 11. ', '## 12. ', 3000]],
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
  return ['# FlowAI SSOT COMPACT EXCERPT (focused per-amendment bundle)', '', '---', '',
    ...canonicalSections.map(([s, e, max]) => slice(s, e, max)).filter(Boolean).map((t) => t + '\n')].join('\n');
}

async function loadAmendmentText(file, maxChars) {
  const raw = await readFile(path.join(repoRoot, 'docs', 'specs', file), 'utf8');
  const lines = raw.split(/\r?\n/);
  const cut = lines.findIndex((l) => /^## (Panel Questions|Acceptance criteria)/.test(l));
  const trimmedLines = cut === -1 ? lines : lines.slice(0, cut);
  let text = stripAnchor(trimmedLines.join('\n'));
  if (text.length > maxChars) text = text.slice(0, maxChars) + '\n\n_[…amendment text truncated for bundle-cap]_';
  return text;
}

async function runOneAmendment(amend) {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[${amend.code}] starting · ${startedAt}\n`);
  const draftText = await loadAmendmentText(amend.file, amend.amendmentMaxChars);
  const canonical = await buildCompactCanonical(amend.canonicalSections);
  process.stdout.write(`[${amend.code}] amendment: ${draftText.length} chars · canonical: ${canonical.length} chars\n`);
  const result = await runAdversarialPanelConsultation({
    topic: `${amend.code} (${amend.title}) — focused re-Panel for engagement-quorum fix`,
    draftText,
    questions: amend.questions,
    seed: `${amend.code.toLowerCase().replace(/-/g, '')}-quorum-fix-2026-05-19`,
    panel: PANEL,
    canonical,
  });
  const finishedAt = new Date().toISOString();
  return { amend, startedAt, finishedAt, result };
}

function classifyPerQ(verdict, topKey, draftedKey, topCount) {
  const isQuorum = topCount >= QUORUM;
  if (topKey === draftedKey && isQuorum) return 'QUORUM_RATIFY';
  if (topKey === draftedKey) return 'PLURALITY_RATIFY';
  if (topKey?.endsWith('-REJECT')) return 'PLURALITY_REJECT';
  return 'REVISE_DIRECTION';  // any non-drafted winner is treated as a revise direction
}

async function main() {
  const startedAt = new Date().toISOString();
  process.stdout.write(`[quorum-fix-rerun] started ${startedAt}\n`);
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
      const cls = classifyPerQ(v.verdict, v.topKey, q.draftedKey, v.topCount);
      process.stdout.write(`    ${q.id}: ${v.verdict} (top=${v.topKey} ${v.topCount}/${engaged}) class=${cls}\n`);
    }
    // write per-amendment transcript
    const t = out.result.tally;
    const md = [`# Panel — ${amend.code} (${amend.title}) — quorum-fix rerun (2026-05-19)`, ``,
      `**Bundle:** ${out.result.bundle_chars} chars (target ≤~30K to match proven 27,778-char recipe)`,
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
      ``, `## All distinct objections (${t.distinctObjections})`,
      (t.allObjections || []).map((o, i) => `**${String(i + 1).padStart(2, '0')}. [Slot ${o.slot}] ${o.title}**\n\n> ${(o.detail || '').replace(/\n/g, '\n> ')}\n`).join('\n')];
    await writeFile(path.join(OUTPUT_DIR, `${amend.code.toLowerCase()}-quorum-fix-rerun-2026-05-19.md`), md.join('\n'), 'utf8');
    await writeFile(path.join(OUTPUT_DIR, `${amend.code.toLowerCase()}-quorum-fix-rerun-2026-05-19.sidecar.json`), JSON.stringify({ schema: 'quorum-fix.sidecar.v1', code: amend.code, commit: amend.commit, bundle_size: out.result.bundle_chars, startedAt: out.startedAt, finishedAt: out.finishedAt, w6_metadata: out.result.w6_metadata, tally: out.result.tally, per_question_verdicts: out.result.perVerdicts, dissent_floor: out.result.dissentFloor, perReviewer: out.result.perReviewer, questions: amend.questions }, null, 2), 'utf8');
  }
  const finishedAt = new Date().toISOString();

  // Consolidated cross-amendment report
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });
  const consolidated = [`# W6 — Quorum-Fix Rerun · CA-13 + CA-14 + CA-15 + CA-16 (2026-05-19)`, ``,
    `**Started:** ${startedAt} · **Finished:** ${finishedAt}`,
    `**Strategy:** four focused per-amendment runs, each bundle ≤~30K to match the proven 27,778-char engagement recipe.`,
    `**Quorum:** ≥${QUORUM}/10 engaged per Locked Rule 17 + drafted-(a) ≥${QUORUM}/engaged for plain ratification.`,
    ``, `## CROSS-AMENDMENT SUMMARY`,
    `| Amendment | Bundle | Engaged | Objs | Cleared / Total | Plurality-RATIFY | REVISE-direction | REJECT |`,
    `|---|--:|--:|--:|--:|--:|--:|--:|`,
    ...RESULTS.map((r) => {
      const t = r.result.tally;
      const cleared = r.amend.questions.filter((q) => { const v = r.result.perVerdicts[q.id]; return v.topCount >= QUORUM && v.topKey === q.draftedKey; }).length;
      const plurality = r.amend.questions.filter((q) => { const v = r.result.perVerdicts[q.id]; return v.topKey === q.draftedKey && v.topCount < QUORUM; }).length;
      const revise = r.amend.questions.filter((q) => { const v = r.result.perVerdicts[q.id]; return v.topKey && v.topKey !== q.draftedKey && !v.topKey?.endsWith('-REJECT'); }).length;
      const reject = r.amend.questions.filter((q) => { const v = r.result.perVerdicts[q.id]; return v.topKey?.endsWith('-REJECT'); }).length;
      return `| **${r.amend.code}** | ${r.result.bundle_chars} | ${t.engagedTotal}/10 | ${t.distinctObjections} | ${cleared}/${r.amend.questions.length} | ${plurality} | ${revise} | ${reject} |`;
    }),
    ``, ...RESULTS.map((r) => {
      const t = r.result.tally;
      return [`## ${r.amend.code} — ${r.amend.title}`, ``,
        `Bundle: ${r.result.bundle_chars} chars · Engaged: ${t.engagedTotal}/10 · Objections: ${t.distinctObjections}`,
        ``,
        `| Q | Verdict | Top key | Top / Engaged | Cleared |`,
        `|---|---|---|---|---|`,
        ...r.amend.questions.map((q) => {
          const v = r.result.perVerdicts[q.id]; const cleared = v.topCount >= QUORUM && v.topKey === q.draftedKey;
          return `| **${q.id}** | \`${v.verdict}\` | \`${v.topKey || '—'}\` | ${v.topCount}/${t.engagedTotal} | ${cleared ? '✅' : '—'} |`;
        }),
        ''].join('\n');
    })];
  await writeFile(CONSOLIDATED_PATH, consolidated.join('\n'), 'utf8');
  await writeFile(CONSOLIDATED_SIDECAR, JSON.stringify({ schema: 'consolidated-quorum-fix.sidecar.v1', startedAt, finishedAt, audit, results: RESULTS.map((r) => ({ code: r.amend.code, commit: r.amend.commit, bundle_size: r.result.bundle_chars, tally: r.result.tally, per_question_verdicts: r.result.perVerdicts, dissent_floor: r.result.dissentFloor, questions: r.amend.questions })) }, null, 2), 'utf8');

  process.stdout.write(`[quorum-fix-rerun] DONE. consolidated → ${CONSOLIDATED_PATH}\n`);
  process.exit(0);
}
main().catch((e) => { process.stderr.write(`[quorum-fix-rerun] CRASH: ${e?.stack ?? e}\n`); process.exit(2); });
