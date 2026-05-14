# FlowAI SSOT — Layer 1 Philosophical Foundation (CANONICAL)

**Status:** **CANONICAL** as of 2026-05-11. CEO-approved; supersedes `docs/FLOWAI_SSOT_DRAFT_v1.md` (deleted on promotion). All 4 prior factual flags resolved (see Synthesis Metadata at end of file).
**Source:** Synthesis of 5-reviewer Layer 1 panel from `docs/philosophy-review/layer1-ssot-panel-review-2026-05-11.md`, with CEO dispositions on the 4 flagged items.
**Reviewers:** Slot 1 = Claude Opus 4.7 · Slot 2 = GPT-5.5 · Slot 3 = Gemini 2.5 Pro · Slot 4 = Perplexity Sonar Pro Search · Slot 10 = GPT-4o (web-grounded).
**Consensus rule:** ≥3 of 5 reviewers in agreement = consensus. Split decisions are surfaced verbatim for CEO disposition.

A **VERDICT** of `ACCEPT` against a W02-drafted answer means the panel converged on the W02 answer as canonical. `MODIFY` means consensus called for a refinement (the consensus refinement is recorded). `REJECT` would mean ≥3 reviewers proposed an outright replacement — no question reached this state in the v1 panel.

---

## ONTOLOGY (O1–O10)

### O1. Primary identity of FlowAI?

**CONSENSUS — ACCEPT (5/5).**
FlowAI is primarily an orchestration engine; agents, pipeline, and tools are its apparatus; the platform layer is what makes orchestration multi-tenant.

**Dissent:** none.

### O2. Ontological status of agents?

**CONSENSUS — ACCEPT (3/5: Slot 3, 4, 10).**
Agents are specialized faculties of FlowAI — domain-bounded reasoners that FlowAI invokes, supervises, and recombines per session.

**Dissent (Slot 1, Slot 2 — MODIFY):** strengthen to "*Agents are bounded, contractually-governed faculties (BaseAgent.js authority + scope) that FlowAI orchestrates; specialized reasoners understates the contract layer.*" Worth folding into the canonical entry as a clarifying note.

### O3. Are the 5 products consumers or instances?

**CONSENSUS — ACCEPT (5/5).**
The 5 products are real, production-grade consumers of FlowAI (separate sub-orgs, isolated state) — not instances of FlowAI itself.

**Dissent:** none.

### O4. Relationship FlowAI ↔ VEU ↔ Marketplace ↔ providers ↔ end-customers?

**CONSENSUS — MODIFY (3/5: Slot 1, Slot 2, Slot 4).**
Adopt the W02 answer **plus** the 4-way distinction: *VEU = legal/economic principal · FlowAI = governance principal · Provider = consumer · End-customer = end party.* Additionally, "Marketplace" is FlowAI's curated tool knowledge graph (65 tools, 13 categories, ranked by performance + cost + Africa availability per CANONICAL_HISTORY) — *not* a separate entity.

**Dissent (Slot 3, Slot 10 — ACCEPT W02 as-drafted):** baseline answer is sufficient without the explicit 4-way distinction.

### O5. Singular or plural?

**CONSENSUS — ACCEPT (4/5).**
Singular as code/canonical (one G3-ratified spec); plural at runtime (one isolated instance per provider org via Supabase RLS + Vercel project boundaries).

**Dissent (Slot 2 — MODIFY):** add anti-fork clause — "*runtime pluralization must not imply uncontrolled forks.*"

### O6. "First, not exclusive" — meaning?

**CONSENSUS — ACCEPT (5/5).**
VEU's 5 products are real production consumers that exercise FlowAI's full lifecycle; architecture is built to onboard arbitrary additional consumers without code changes once Agent #4 is live.

**Dissent:** none.

### O7. Boundary with non-FlowAI?

**CONSENSUS — ACCEPT (3/5: Slot 3, Slot 4, Slot 10).**
The set of resources subject to FlowAI's governance contract (BaseAgent.js validators, 95/95, 6-step Clearance, audit log) — anything inside is FlowAI; products at runtime, external services, end-user data are not.

**Dissent (Slot 1, Slot 2 — MODIFY):** widen the boundary to include the *orchestration substrate* (MessageBus, ScoreEvaluator, CredentialAdapter) — without the substrate, the contract is unenforceable. Worth folding in.

### O8. Ongoing role for products under management?

**CONSENSUS — ACCEPT (4/5).**
Continuous lifecycle + maintenance engine — crawls every product, detects breakage via Playwright execution, triggers Agent #3 Self-Renewal to fix at any time, no maintenance windows.

**Dissent (Slot 3 — MODIFY):** strengthen mandate language — *"FlowAI is **mandated to** maintain continuous integrity for every managed product, autonomously dispatching Agent #3 …"*

### O9. FlowAI as wiring + integration auditor?

**CONSENSUS — ACCEPT (4/5).**
FlowAI does not assume any product is "done" upon handoff — actively probes every navigation path, integration endpoint, auth flow, payment rail, third-party service, GTM tracker, marketplace listing for functional connectivity.

**Dissent (Slot 3 — MODIFY):** add the escalation ladder — *"escalating from automated fix to human gate until every tracked element reports green."*

### O10. FlowAI as marketplace intelligence engine?

**CONSENSUS — ACCEPT (4/5).**
Continuous marketplace intelligence; produces monthly Self-Renewal Alerts per product framing each opportunity in Auto/Guided/Manual execution paths.

**Dissent (Slot 2 — MODIFY):** "*monthly-minimum and event-triggered when major vendor, regulatory, competitor, pricing, or integration changes occur.*" Worth folding in.

---

## LOGIC (L1–L9)

### L1. Composition of 5 decision frameworks under conflict?

**CONSENSUS — ACCEPT (3/5).**
Strict priority — anti-drift > governance gates > active Objective Lens > Five-Layer evidence tagging > Mode autonomy bounds; higher-priority frameworks veto lower-priority outputs.

**Dissent (Slot 1, Slot 2 — MODIFY):** add deadlock handling — *"ties within a priority level resolve via highest-authority agent in jurisdiction; deadlocks escalate to human gate (no silent tiebreakers)"* and *"explicit safety/legal/security vetoes above optimization/Lens preferences."*

### L2. Consensus across 25 agents with different authorities?

**CANONICAL — ACCEPT (CEO-RESOLVED).**
Role-based deference, not unanimous voting — orchestrator routes to agents with jurisdiction; in-jurisdiction disagreement escalates per authority level. The operating roster is **25 agents (G3-ratified; #21–#25 Ops Runner charters active)**.

**Slot 4 factual flag — OVERRULED BY CEO (2026-05-11).** The 20-agent reading reflected the lagging BaseAgent.js partition validator; the G3 ratification is canonical. The validator update from 20 → 25 is queued for Phase 1.0 as an implementation task and does not change the canonical roster count.

### L3. Multi-input mode aggregation?

**CONSENSUS — ACCEPT (5/5).**
Parallel execution per step (Promise.all); compare → head-to-head scorecard; combine → synthesized unified spec with provenance map; benchmark → gap analysis vs reference.

**Dissent:** none.

### L4. Anti-drift priority when canonical / memory / code disagree?

**CONSENSUS — ACCEPT (5/5).**
Code > canonical > user-curated memory > auto-memory; no exceptions; conflicts surfaced for resolution, never silently resolved.

**Dissent:** none.

### L5. 95/95 passes but 6-step Clearance fails (or inverse)?

**CONSENSUS — ACCEPT (5/5).**
All three governance mechanisms (95/95 + 6-step Clearance + Monitor 0-50) must pass independently — none subsumes another — any single failure halts deployment until remediated.

**Dissent:** none.

### L6. Decision flow when gates cascade?

**CONSENSUS — ACCEPT (3/5).**
Pipeline artifacts → 95/95 (quality) → 6-step Clearance (procedural) → Monitor 0-50 (operational); pass all → ship; fail any → return to relevant pipeline step with diagnosis.

**Dissent (Slot 1, Slot 2 — MODIFY):**
- Slot 1: *"add a pre-step: continuous-crawl/integration-probe must be green before 95/95 is even evaluated; otherwise quality scoring on broken wiring produces false-positives."*
- Slot 2: *"add rollback/canary handling and human escalation when cascading gate failures affect production products, credentials, payments, legal status, or customer-facing availability."*

Both refinements are operationally valuable — recommend folding both into a canonical L6 elaboration.

### L7. Decision flow when continuous crawl detects breakage?

**CONSENSUS — ACCEPT (5/5).**
Crawl finding → root-cause diagnosis → Agent #3 Self-Renewal authors fix → 95/95 audit on fix → deploy → re-crawl confirm; if fix fails 95/95 or regresses, rollback + human gate.

**Dissent:** none.

### L8. Decision flow when wiring/integration is broken?

**CONSENSUS — ACCEPT (4/5).**
Crawl + integration probe identifies broken wiring → diagnosis → Agent #3 patches within authority, escalates otherwise → re-probe → product not cleared until all integrations + GTM stack + monitoring report green.

**Dissent (Slot 3 — MODIFY):** strengthen — *"a product is considered broken if its full GTM stack is not live."* Worth folding in as elaboration.

### L9. Marketplace research cycle?

**CONSENSUS — MODIFY (3/5: Slot 1, Slot 2, Slot 3).**
Adopt W02 baseline **plus** event-driven triggers in addition to monthly minimum: new regulation, competitor launch, integration deprecation, security CVE, vendor change, pricing shift, model release, integration incident. Slot 3 adds: "*default path is Auto* so inaction results in proactive evolution rather than stagnation."

**Dissent (Slot 4, Slot 10 — ACCEPT W02):** monthly cadence is sufficient.

---

## ETHICS (E1–E7)

### E1. Self-Protection — what, from whom, lines?

**CONSENSUS — ACCEPT (4/5).**
Protects proprietary code, agent logic, accumulated data via robots.txt + noai headers + Cloudflare + rate limiting + watermarking + DMCA; does NOT block legitimate users, internal audit, regulators, contracted security research.

**Dissent (Slot 2 — MODIFY):** explicit non-obstruction clause — *"without obstructing accessibility, legitimate users, regulators, contracted security research, interoperability, or required audit rights."* (largely redundant with W02 but explicit-affirmative phrasing worth folding in.)

### E2. 95/95 — quality bar or safety floor?

**CONSENSUS — ACCEPT (5/5).**
Both — quality bar AND safety floor; failure halts deployment; expresses VEU's commitment that "good enough" means 95%+.

**Dissent:** none.

### E3. Stance on hallucination / bias / transparency / edge cases?

**CONSENSUS — ACCEPT (3/5).**
Mandatory multi-AI triangulation (hallucination), Five-Layer evidence tagging (bias surfacing), every decision auditable (transparency), authority-based escalation (edge cases).

**Dissent (Slot 1, Slot 2 — MODIFY):**
- Slot 1: *"hallucination-mitigation requires ≥2 independent AI sources OR Playwright ground-truth for any L1/L2 claim; single-source claims are tagged 'unverified' and cannot pass 95/95."*
- Slot 2: *"add Playwright/test ground truth, bias and safety evals, provenance tags, model disagreement capture, and human escalation for high-impact uncertainty."*

Recommend folding the "≥2 independent sources OR Playwright" rule into the canonical answer — it's a concrete enforcement mechanism, not just a principle.

### E4. Revenue splits?

**CANONICAL (CEO-RESOLVED 2026-05-11).**
VEU platform fee is a **ceiling of 15%** (not a fixed split); sustainability floor is defined separately per contract and is **non-negotiable**; providers retain **at minimum 85%** of end-customer revenue; the exact split is **negotiable between the ceiling and the floor** on a per-contract basis. Implementation rail: Stripe Connect via Agent #4.

**Prior W02 draft + Slot 1 dissent UNIFIED under this resolution.** The original 4/5 consensus reading 15% as a fixed default + Slot 1's reading of 15% as a ceiling have been replaced by the CEO-canonical ceiling-with-separate-floor model.

### E5. Replace vs augment — disclosure obligation?

**CONSENSUS — ACCEPT (4/5).**
Explicit AI-authorship disclosure on every FlowAI-produced artifact (audit log AND artifact); products built on FlowAI inherit same obligation to end-customers.

**Dissent (Slot 2 — MODIFY):** *"calibrated to actual contribution and customer-facing obligations"* — i.e. proportional disclosure, not boilerplate. Worth folding in.

### E6. Commitment to product integrity + uptime?

**CONSENSUS — ACCEPT (3/5).**
Continuous integrity for every product under management; 5 VEU products bound by same SLA as external provider products; any detected breakage triggers Self-Renewal at any hour.

**Dissent (Slot 1, Slot 3 — MODIFY):**
- Slot 1: **quantify** the SLA — *"MTTD < 15 min for crawl-detectable breakage, MTTR target by severity tier — 'continuous integrity' without numbers is unenforceable."*
- Slot 3: contractual obligation language — *"FlowAI is contractually obligated to trigger Self-Renewal upon detecting critical breakage at any hour."*

Strongly recommend folding in the quantitative SLA requirement.

### E7. Currency commitment?

**CONSENSUS — ACCEPT (5/5).**
No product under management falls >30 days behind marketplace evolution without explicit user acknowledgment; default is alert, not silence.

**Dissent:** none.

---

## EPISTEMOLOGY (EP1–EP6)

### EP1. Source-of-truth hierarchy — locked or open?

**CONSENSUS — ACCEPT (5/5).**
Hierarchy locked in priority order (code > canonical > user-curated > auto-memory); content evolves; hierarchy itself invariant (Locked Rule 1).

**Dissent:** none.

### EP2. Authority — multi-AI triangulation vs Playwright ground-truth vs L1-L5 tagging?

**CONSENSUS — ACCEPT (5/5).**
Playwright ground-truth wins when applicable; multi-AI triangulation overrides any single AI otherwise; L1-L5 tagging forces every finding to declare evidence layer.

**Dissent:** none.

### EP3. Confidence calibration?

**CONSENSUS — ACCEPT (4/5).**
Every output declares confidence (0-100) + evidence layer (L1-L5) + agent authority; consumers treat confidence as one input alongside authority, not sole determinant.

**Dissent (Slot 1 — MODIFY):** add back-testing — *"confidence scores must be back-tested quarterly against outcomes; agents whose confidence is mis-calibrated >10% lose authority tier until re-validated."* Strongly recommend folding in.

### EP4. Resolution when peer reviewers disagree?

**CONSENSUS — ACCEPT (5/5).**
Disagreement triggers synthesis review — factual disagreements re-run against canonical/code; interpretive disagreements escalate per authority levels.

**Dissent:** none.

### EP5. How does FlowAI know self-renewal works?

**CONSENSUS — ACCEPT (4/5).**
Agent #3 measures drift signal, score trajectory (rolling 95/95), regression count, continuous crawl pass-rate per product; works iff drift→0, scores≥95, regressions caught pre-deployment, crawl pass-rate→100%.

**Dissent (Slot 2 — MODIFY):** add operational signals — *"canary deploy success, rollback success rate, mean time to detect/repair, business KPI non-regression, and user-impact measurements."* Worth folding in.

### EP6. How does FlowAI know what is broken in a product?

**CONSENSUS — ACCEPT (4/5).**
Real Playwright crawl + agent execution status via flowai_audit_log + product-side telemetry via /api/health + failing tests via vitest CI; union of signals is the breakage map.

**Dissent (Slot 1 — MODIFY):** add a fifth signal — *"end-customer/end-user feedback channels (support tickets, in-product error reports, NPS deltas) — telemetry alone misses semantic breakage (works but wrong)."* Strongly recommend folding in.

---

## META-GOVERNANCE (MG1–MG7) — Panel-authored consensus

(No W02 draft. Synthesized from the 5 fresh reviewer answers.)

### MG1. Panel operating mode?

**CONSENSUS — HYBRID (5/5).**
Always-on for telemetry / audit-log / crawl-stream monitoring; **scheduled** for periodic Panel review (monthly cadence is the consensus floor); **on-demand** for high-priority gates (security, Locked Rule amendments, 95/95 exceptions, Self-Renewal proposals at L3+ impact, human-gate escalations). Eventually native-FlowAI orchestrated post-bootstrap.

**Dissent:** none on the hybrid shape; minor variance on whether scheduled cadence is weekly (Slot 3) vs monthly (Slot 1, Slot 4).

### MG2. Decision-making threshold?

**CANONICAL (CEO-RESOLVED 2026-05-11).**
**Simple supermajority ≥7 of 10 reviewers for all Panel decisions, regardless of decision type or domain. No graduated veto structure.** The earlier domain-weighting and unanimity-for-charter-amendments refinements are not adopted — a single threshold governs Panel decisioning.

**Slot 4 dissent (graduated FLOWAI-ONLY / EMBEDDED authority veto) — OVERRULED.**

### MG3. Dissent handling?

**CONSENSUS — SEVERITY-BASED (4/5).**
Approve-with-dissent-noted by default (recorded in audit log); **require resolution** if dissent invokes a Locked Rule, safety, legal, IP, or 95/95-affecting concern; escalate to CEO only on unresolvable Locked-Rule dissent or material exposure.

**Dissent (Slot 3):** simpler model — approve with dissent formally logged and routed to the relevant agent's feedback loop, no severity gating.

### MG4. CEO escalation triggers?

**CANONICAL (CEO-RESOLVED 2026-05-11) — the broad 12-item consensus list is retained:**
1. Locked Rule amendments.
2. Revenue split deviations >5pp from default, OR any negotiation outside the ceiling-and-floor range defined in E4.
3. Authority-tier changes for any agent.
4. Cross-product breakage affecting >1 production tenant.
5. Legal / IP / regulatory exposure events.
6. 95/95 exception requests OR sub-95 releases.
7. Clearance gate override requests.
8. Irreversible data/financial/legal/IP actions.
9. Major customer commitments OR product integrity SLA breaches.
10. Unresolved blocking dissent on Locked Rules.
11. Panel protocol changes (MG6 amendments).
12. Marketplace intelligence cycle >30 days behind.

**Slot 3 narrow dissent — OVERRULED.** The narrow alternative (deadlock + 7-figure spend only) is not adopted; the broad 12-item trigger set is canonical.

### MG5. Failed / stale reviewer handling?

**CONSENSUS — SUBSTITUTE FROM ALTERNATES; ABORT IF QUORUM UNREACHABLE (3/5).**
Retry once → substitute from a pre-designated alternate pool within 24h → proceed only if quorum (≥7) and domain coverage remain intact → otherwise abort + re-dispatch with explicit timeout flag in audit log. Never silent-proceed below quorum.

**Dissent:**
- Slot 3: simpler — *"proceed with available quorum (≥7) after a 48-hour response window; stale reviewer's vote is forfeit."*
- Slot 4: gate-type-dependent — different rules for 95/95 audit vs Clearance vs continuous crawl.

### MG6. Self-amendment process?

**CONSENSUS — STRUCTURED RFC + SUPERMAJORITY + CEO COUNTERSIGN (3/5).**
Versioned RFC → impact/risk analysis → ≥7/10 Panel vote → CEO countersign → audit-log entry tagged `panel_self_amendment` → canary application before full adoption. **Amendments to MG4 (CEO triggers) require unanimity.** Slot 1 adds a 7-day stakeholder comment window; Slot 4 adds a 30-day re-audit of prior decisions against the new rule.

**Dissent (Slot 3):** unanimous (10/10) Panel vote required for any self-charter change, no CEO countersign step.

### MG7. Approval scope?

**CONSENSUS — QUORUM-MET VOTE LOGGED IN AUDIT WITH FULL EVIDENCE (4/5).**
Panel approval = quorum-met vote recorded in `flowai_audit_log` with topic `panel_decision_{stepType}`, evidence pack hash, dissent record, model identities, prompts, and **explicit authorization scope** (which step, which product, which environment, expiry). Approval is **non-transferable** across steps/products/environments.

**Dissent (Slot 4):** per-build-step granularity — different approval requirements for Research/Design/Build (≥2 domain experts), Quality Audit (Agent #8 + re-audit), Deploy (Monitor + zero active threats), Self-Renewal (Agent #3 + 95/95), Clearance (all 6 steps + CEO sign-off). This is complementary, not contradictory — recommend folding Slot 4's per-step elaboration into the canonical MG7 as the operational decomposition.

---

## MISSING QUESTIONS (Union of reviewer proposals, deduplicated, ranked by mention frequency)

Questions raised by ≥3 reviewers (high-priority gaps):

1. **Multi-tenant isolation failure modes & cross-tenant contamination prevention.** (Slot 1, Slot 2, Slot 4) — RLS is referenced but failure modes are not specified; detection latency, blast radius, and remediation contract are missing.
2. **Data governance: residency, sovereignty, retention, deletion, portability.** (Slot 1, Slot 2, Slot 4) — Especially under GDPR/POPIA (MyBirthSafe Africa-first), HIPAA-adjacent maternal health data, and provider offboarding.
3. **Disaster recovery & RTO/RPO.** (Slot 1, Slot 2, Slot 4, Slot 10) — If FlowAI itself goes down, what is the recovery contract to the 5 products + external providers? Backup strategy for Supabase?
4. **Cost governance & runaway protection / per-tenant token budget.** (Slot 1, Slot 2, Slot 3) — LLM spend is unbounded; kill-switch contract per agent / per tenant / per session is missing. Cost of governance (continuous crawl + Panel review + marketplace scan) needs ceilings.
5. **Versioning & backward compatibility.** (Slot 1, Slot 4) — When BaseAgent.js evolves G2→G3→G4, what is the contract for in-flight agents, existing audit-log entries, and products mid-pipeline?
6. **Adversarial robustness.** (Slot 1, Slot 2, Slot 4) — Prompt injection during crawl (hostile content on probed pages), model poisoning, supply-chain attacks on tool marketplace, malicious provider apps, rogue agents.
7. **Self-test-of-self-tester / meta-self-audit / dead-man's switch.** (Slot 1, Slot 3) — Who audits Agent #8? How is meta-self-test bootstrapped without infinite regress? External kill-switch to halt all autonomous action and revert to last-known-good G3 state.
8. **Self-modification boundary.** (Slot 1, Slot 2, Slot 4) — May FlowAI modify its own governance kernel (BaseAgent, ScoreEvaluator, audit log, clearance logic, Panel protocol)? Constitutional boundary needed.
9. **Compliance regimes per product.** (Slot 1, Slot 2, Slot 4, Slot 10) — SOC 2, ISO 27001, GDPR, CCPA, HIPAA (MyBirthSafe maternal health), PCI (Stripe Connect), communications compliance (ReachSMS), IP/content rights (PressAI), ESG disclosure (SAIGE).
10. **Conflict-of-interest / ranking neutrality.** (Slot 1, Slot 2) — VEU's 5 products compete with future Marketplace providers; how is ranking neutrality guaranteed AND proven?
11. **Quantified SLAs (MTTD/MTTR/RTO/RPO).** (Slot 1, Slot 2) — "Continuous" without numbers is aspirational. Need severity-tiered targets.
12. **Continuous crawl contract per product.** (Slot 1, Slot 2) — Crawl depth, frequency, side-effect prevention, synthetic accounts, payment sandboxing, no-destructive-action rules.
13. **Human-in-the-loop SLA + on-call model.** (Slot 1, Slot 2) — Max-wait before auto-escalation; who is the human; what authority; after-hours coverage.

Questions raised by 1–2 reviewers (worth folding in):

14. End-user right of recourse when AI-authored output harms an end-customer. (Slot 1)
15. Locked Rules Registry as canonical numbered artifact with amendment history. (Slot 1)
16. Agent liveness / dormancy activation contract — 23/25 agents currently DORMANT. (Slot 1, Slot 3)
17. Production responsibility & liability boundaries between FlowAI, VEU, providers, customers, third-party vendors, human approvers. (Slot 2)
18. Emergency stop / kill-switch authority — pause crawls, freeze deployments, disable agents, isolate tenants. (Slot 2)
19. Centralized LLM/provider routing engine — policy-based routing by task, risk, cost, latency, jurisdiction. (Slot 2)
20. Agent #21–#25 explicit charters (names, scope, authority, interactions with #1–#20). (Slot 2)
21. Agent performance measurement over time (accuracy, regression rate, repair success, false positives/negatives, cost, latency, human-override rate). (Slot 2)
22. Panel jurisdiction vs FlowAI's own agents — anti-circularity safeguards when FlowAI eventually orchestrates the Panel. (Slot 2)
23. Independence criteria for Panel (model diversity, prompt independence, evidence packets). (Slot 2)
24. Threat model documentation. (Slot 2)
25. Continuous-crawl false-positive rate tolerance. (Slot 4)
26. 95/95 score-inflation prevention. (Slot 4)
27. Credential rotation & expiry handling in CredentialAdapter. (Slot 4)
28. Git race-condition resolution for multiple concurrent Claude Code sessions. (Slot 4)
29. "Great Pivot" — what fundamental limitation in the flow-builder paradigm forced the 8-step pipeline pivot? (Slot 3)
30. Agent phylogeny — how new agents/versions are trained, validated against 95/95, and promoted. (Slot 3)
31. Observability/alerting stack for FlowAI itself (not just managed products). (Slot 4, Slot 10)
32. Capacity planning — concurrent sessions, Playwright endpoint scaling, LLM token budget. (Slot 4)
33. Vendor outage / model degradation fallback. (Slot 4)
34. Scalability mechanism for multi-tenant growth. (Slot 10)
35. Self-Renewal Alert evidence-package contract (source, confidence, impact, cost, risk, urgency, mode, rollback). (Slot 2)
36. Who pays for marketplace-driven changes? Subscription? Usage? Approval gate? (Slot 2)

---

## DOABILITY ASSESSMENT

### Doable as drafted (≥3 reviewer agreement)

- The **orchestration spine** (BaseAgent + MessageBus + ScoreEvaluator + CredentialAdapter) is architecturally sufficient for Phase 1 — the contract files are coherent and the G2/G3 ratification model is sound. (Slot 1, Slot 2, Slot 4)
- **8-step pipeline + 3-mode execution (Auto/Guided/Manual) + 6-step Clearance + 95/95 threshold** are well-specified and implementable; UI surface confirms most of this is built. (Slot 1, Slot 2, Slot 3, Slot 4)
- **Capability Transfer (Self-Renewal + Self-Protection packages)** is a defensible mechanism for shipping FlowAI's faculties into consumer products. (Slot 1, Slot 4)
- **The 5 VEU products as first consumers** provide dogfooding rigor that will surface gaps before external providers onboard. (Slot 1, Slot 4)
- **Anti-drift hierarchy** (code > canonical > user-curated > auto-memory) is locked and implementable. (Slot 1, Slot 2, Slot 3, Slot 4)
- **Tool & provider ranking** as a product-native intelligence function is doable. (Slot 2)
- **GTM Demo Stack Tier 1–4** UI complete, mock data seeded. (Slot 4)

### Missing capabilities (≥3 reviewer agreement)

- **Agent #4 (Provider Onboarding) is DORMANT** — the entire multi-tenant revenue model is paper-only until this ships. *This is the single largest gap to the "$5B OS" claim.* (Slot 1, Slot 3, Slot 4)
- **23 of 25 agents are DORMANT** (Agents #3 + #4–#20 + #21–#25) — orchestration substrate exists but the orchestra is silent; current FlowAI is a governance shell, not yet a working OS. (Slot 1, Slot 2, Slot 3, Slot 4)
- **Doppler integration is designed, not wired** — credential security is currently Base44 Secrets, which is insufficient for multi-tenant production. (Slot 1, Slot 3, Slot 4)
- **Supabase RLS is designed, not provisioned** — tenant isolation is a contract without an enforcer. (Slot 1, Slot 3, Slot 4)
- **Backend endpoints for Tier 3/4 demos are stubs** — GTM stack cannot convert without /api/leads, /api/configuration/clone, real /api/health, /api/cost-summary, /api/products, /api/admin/seed-demo. (Slot 1, Slot 4)
- **Centralized LLM/provider routing engine** — per-call model selection is insufficient for production OS infrastructure. (Slot 2)
- **Production crawl architecture at scale** — queueing, rate limits, auth-state management, sandbox accounts, side-effect prevention, screenshot/trace retention. *Massive unproven assumption.* (Slot 2, Slot 3)
- **Integration verification adapters** — auth, payment rails, analytics, GTM, marketplaces, email/SMS, webhooks, deployment, monitoring each need explicit probe contracts. (Slot 2, Slot 4)
- **Panel orchestration protocol** — eventual self-orchestration needs independence controls, quorum rules, model diversity, dissent handling, anti-circularity safeguards. (Slot 1, Slot 2)
- **Evaluation harness** — regression suites for agent accuracy, crawl reliability, false positives/negatives, repair success, hallucination rate, latency, product impact. (Slot 2)

### Missing capacities

- **Crawl capacity:** browser concurrency, crawl depth, retry budget, product coverage. (Slot 2)
- **Repair capacity:** simultaneous fixes, rollback readiness, canary environments. (Slot 2)
- **Panel capacity:** review turnaround, reviewer substitution, stale-review handling. (Slot 2)
- **Agent capacity:** queue management, dead-letter handling, agent failure recovery. (Slot 2)
- **Infrastructure capacity:** logging, traces, screenshots, artifacts, audit storage. (Slot 2)
- **Cost capacity:** AI calls, browser sessions, external APIs, monitoring, alerts. (Slot 1, Slot 2, Slot 3)
- **Human capacity:** on-call coverage, CEO escalation load, product-owner availability. (Slot 1, Slot 2)
- **Vendor resilience:** model fallback, payment-provider outage, auth outage, crawl-provider failure. (Slot 2, Slot 4)
- **Calibration capacity:** confidence scores emitted but not back-tested against outcomes. (Slot 1)
- **Adversarial test capacity:** Self-Test runs the happy-path pipeline only; no red-team contract. (Slot 1, Slot 2)

### Missing commitments

- **Quantified SLAs** (MTTD < 15 min, MTTR by severity tier, RTO/RPO targets). (Slot 1, Slot 2)
- **Locked Rules Registry** — referenced as authority; no canonical artifact cited. (Slot 1)
- **Conflict-of-interest neutrality proof** for Marketplace ranking. (Slot 1)
- **End-customer recourse path** for AI-caused harm. (Slot 1, Slot 4)
- **Panel-to-FlowAI handover protocol** with a verification gate, not just a roadmap. (Slot 1, Slot 2)
- **Customer notification triggers** — when does product breakage become customer-facing? (Slot 2)
- **Required CEO escalation triggers** as a numbered registry (see MG4 list above). (Slot 2)
- **Roster-truth alignment (CEO-RESOLVED 2026-05-11):** Canonical roster is **25 agents (G3-ratified; #21–#25 Ops Runner charters active)**. BaseAgent.js validator update from 20 → 25 is queued as a Phase 1.0 *implementation* task — the canonical count does not depend on the validator catching up.

---

## ELEVATOR PITCH — synthesized (3 sentences)

FlowAI is the governance-grade operating system that takes any AI product from idea to production and keeps it there — through a contract layer of 25 specialized agents, an 8-step pipeline gated by 95/95 quality scoring, a 6-step Clearance Protocol, and continuous Playwright-verified crawling that detects and self-heals breakage at any hour without maintenance windows. It treats VEU AI Studio's five flagship products (SAIGE, RelTwin, ReachSMS, PressAI, MyBirthSafe) as real production consumers and is architected to onboard arbitrary external providers via Stripe Connect at a 15% platform fee, with monthly marketplace intelligence ensuring no product falls more than thirty days behind competitive evolution. Singular as canonical code and plural at runtime via tenant-isolated instances, FlowAI is engineered to eventually orchestrate its own 10-AI governance Panel — making it the first AI infrastructure whose governance is as productized, auditable, and self-renewing as the products it ships.

---

## SYNTHESIS METADATA

- **Reviewers used:** 5 of 7 LIVE slots; 3 deferred (Vercel v0, Base44, Replit) and 2 failed (GitHub Models — free-tier 8K-token cap exceeded).
- **Consensus rate (39 questions):** ACCEPT-as-W02-drafted = 27/32 (84%); MODIFY consensus = 2/32 (6%); ACCEPT-with-substantial-dissent worth folding in = 11/32 (per the dissent notes above); 7 META-GOVERNANCE questions synthesized fresh.
- **Factual flags — ALL FOUR RESOLVED BY CEO (2026-05-11):**
  - **L2 / roster size:** Canonical roster is **25 agents (G3-ratified; #21–#25 Ops Runner charters active)**. BaseAgent.js validator update from 20 → 25 is queued as a Phase 1.0 implementation task; the canonical count does not depend on the validator catching up.
  - **E4 / revenue split:** VEU platform fee is a **ceiling of 15%** (not a fixed split); a sustainability **floor** is defined separately per contract and is **non-negotiable**; providers retain **at minimum 85%** of end-customer revenue; the exact split is negotiable between the ceiling and the floor.
  - **MG2 / decision threshold:** **Simple supermajority ≥7 of 10 reviewers for all Panel decisions**, regardless of decision type or domain; no graduated veto structure. Slot 4 dissent overruled.
  - **MG4 / CEO triggers:** **Broad 12-item list retained as canonical.** Slot 3 narrow alternative (deadlock + 7-figure spend) overruled.
- **Generated:** 2026-05-11, layer1-ssot-panel-review-2026-05-11.md as input.
- **Status:** **CANONICAL.** Promoted from `docs/FLOWAI_SSOT_DRAFT_v1.md` to `docs/FLOWAI_SSOT.md` after CEO disposition of the 4 flagged items.
