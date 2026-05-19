# FlowAI Mission/Purpose Amendment — CEO-ratification track (Locked Rule 13)

**Status:** DRAFT — CEO-ratification track per Locked Rule 13. **No Panel** consulted (per dispatch). The CEO has explicitly stated the full mission vision across multiple sessions; this draft captures it canonically. Pending CEO ratification at promotion commit + entry into `docs/CANONICAL_HISTORY.md` as ENTRY 018.
**Author:** W3, 2026-05-19.
**Provisional CA number:** CA-18 (next free after CA-17 per §18.4 ENTRY 016).
**Lineage:** prior mission text per §2 of `docs/CANONICAL_REFERENCE.md` (CA-1 + CA-2 canonical 2026-05-14) → this amendment supersedes the prior framing globally. Adjacent context: ENTRY 017 CA-13 disposition (CEO Decision B, this dispatch's predecessor) explicitly deferred the uniform-≥95 directive AND the question of whether any operational sub-95 exception path exists to the forthcoming mission/Purpose amendment — **this draft is that amendment**.

**CEO citation (Locked Rule 13, this dispatch verbatim):** *"This is a CEO-ratification track per Locked Rule 13 — no Panel. Victor has explicitly stated the full mission vision across multiple sessions; this captures it canonically."*

---

## §1 — Core Definition (what FlowAI IS — the promise, not the mechanism)

**Input:** any URL, specification, or pasting (existing site, natural-language description, document, code).

**Output:** ALWAYS a **new, separate, deployable URL** — perfected across all quality dimensions per §2 below. The input is **never destructively modified**. The new URL supersedes or complements the input; **both are preserved**.

**Quality guarantee — substantial transformation per run.** Each run produces a substantially and perceptibly transformed output. **A run producing only marginal improvement is a QUALITY FAILURE, not a success.** The acceptance criterion for any given run is not "did the score increment" but "is the output substantially better than the input on the §2 dimensions". FlowAI MUST recognize and report when a run did not meet the substantial-transformation bar.

**Honest assessment — refusing to manufacture work.** FlowAI proactively communicates when a product already meets or exceeds the quality standard and a further run would not yield substantial improvement. **Artificially generating work when none is needed is a violation of the platform's integrity.** This honesty obligation supersedes any incentive to run additional iterations for billing, telemetry, or any other reason. Iteration is for the user's benefit, not the platform's.

**User agency — iteration depth is the user's call.** The user controls how many runs occur. FlowAI does NOT dictate iteration count. After each run, FlowAI transparently reports:

- The §2-dimension scores for this run (per dimension + composite).
- The delta from the prior run (per dimension + composite).
- The score trajectory across all runs so far (per dimension + composite).
- An explicit diminishing-returns signal when the trajectory is flattening (e.g. "last 3 runs averaged +0.4 composite-score-points per run vs. first 3 runs at +12.5; further iteration is unlikely to yield substantial transformation").

The user then decides whether to continue. FlowAI's role is to provide complete, honest information; the user's role is to choose iteration depth informed by that information.

---

## §2 — Quality Dimensions (what "perfect" means; FlowAI optimizes ALL of these in every run)

FlowAI optimizes the following dimensions in every run. The list is closed at this canonical entry; future amendments may extend it but cannot narrow it without CEO ratification under Locked Rule 13.

1. **Syntax and grammar.** Code AND human-readable content. Code must compile / lint / type-check clean; copy and documentation must be grammatically correct in the audience's language.
2. **Duplication and repetition removal.** Code duplication (DRY violations) AND content duplication (repeated copy, redundant sections, restated assertions without new substance).
3. **UI/UX effectiveness.** Hierarchy, affordance, feedback, task-flow clarity, visual rhythm, responsiveness to interaction. Measured against the user task the surface is intended to enable.
4. **Bug and error resolution.** Runtime errors, console errors, network failures, broken handlers, dead controls, exception paths, missing error states.
5. **Functional completeness.** No dead controls. No mock or stub data in production. No "TBD" placeholders. No half-wired features. Every surface the user can reach does what the surface implies it should do.
6. **Performance.** Page-load latency, time-to-interactive, perceived responsiveness, network efficiency, render cost, payload sizes.
7. **Accessibility.** WCAG-aligned semantics, keyboard navigation, screen-reader compatibility, color-contrast adequacy, alt-text completeness, focus-state visibility, motion-reduction respect.
8. **Security.** OWASP top-ten coverage, secrets handling, authentication correctness, authorization integrity, input validation, output encoding, dependency CVE hygiene.
9. **Privacy compliance** — *jurisdiction-aware*. Assessed relative to the product's applicable jurisdiction(s) (which the operator declares on the product registry). Includes consent flows, data-minimization, lawful-basis disclosure, data-subject-rights surfaces, cross-border-transfer handling, retention enforcement.
10. **Legal compliance** — *jurisdiction-aware*. Assessed relative to the product's applicable jurisdiction(s). Includes regulatory disclosures, marketing-claim integrity, accessibility-mandate compliance where regulatory, sector-specific obligations (health, finance, child-directed services, etc.).

**Jurisdiction-awareness invariant.** Privacy and legal compliance dimensions are evaluated **against the product's declared applicable jurisdiction(s)**, not against any single jurisdiction's standard. A product declared for EU + US jurisdictions is evaluated against both GDPR and the relevant US frameworks; a product declared for a single jurisdiction is evaluated against that jurisdiction only. The operator declares applicable jurisdictions at product registration; the declaration is auditable and can be amended via the standard product-registry update path. FlowAI does NOT impose a default jurisdiction; an undeclared product surfaces a finding asking the operator to declare jurisdictional scope before privacy / legal dimensions can be scored.

**No silent omission.** A run that cannot score a §2 dimension (e.g. no accessibility tooling available, no jurisdiction declared) MUST surface that as a finding, not silently skip the dimension. The composite score MUST disclose which dimensions contributed.

---

## §3 — Iteration Model (how users and FlowAI work together)

**Three modes.** FlowAI offers three operating modes that map to the user's preferred level of control:

| Mode | User involvement | FlowAI behavior |
|---|---|---|
| **Manual** | User-controlled, step-by-step | User initiates each run, each step within a run, and each acceptance decision. FlowAI proposes; user disposes. |
| **Guided** | User-directed with AI assistance + suggestions | User sets direction (preset mode + free-form instruction); FlowAI suggests next runs, surfaces options, recommends focus areas. User decides when to stop. |
| **Automatic** | Fully autonomous iteration | FlowAI iterates until ≥95 composite OR the diminishing-returns threshold is reached, whichever comes first. User is notified at each stop point; user can resume or terminate. |

These three modes are the **only** canonical operating modes. They are orthogonal to the §8 Orchestra Selection axis (Auto / Recommended / User-Choice — about which external tool to use per step) and the §8a System Operation axis (Hands-On / Reviewed / Hands-Off — about within-step approval cadence). All three axes are independently composable.

**User input surfaces.** Each run accepts two user-input surfaces:

1. **Preset modes.** A finite set of canonical preset modes (e.g. audit, investor-demo, accessibility-pass, performance-pass, security-pass, content-pass). The preset modes are canonicalized at engineering-dispatch time; this amendment does not enumerate them in canonical SSOT.

2. **Free-form instruction field.** A natural-language input where the user directs FlowAI's focus. Example: *"focus on the checkout flow"* or *"prioritize accessibility for the new dashboard"* or *"the investor deck is tomorrow — buff the landing page".*

**Instructions function as PRIORITY WEIGHTS, not feature toggles.** This is a binding invariant. FlowAI MUST maintain full quality coverage across all §2 dimensions regardless of user instruction. User instructions weight where the engine focuses **improvement energy** — they DO NOT permit the engine to silently skip a §2 dimension. A user who says "only do security" still gets a run that addresses all 10 dimensions; security simply receives more engine attention + more aggressive remediation than the other dimensions in that run.

**Why this invariant:** the §2 dimensions are co-load-bearing. Allowing instructions to silently disable a dimension would let the platform ship products that fail in undisclosed ways, violating the §1 honest-assessment promise. Operators who genuinely need a single-dimension pass can run a single-dimension pre-set mode that still RUNS the other dimensions but reports them as "untouched this run" rather than skipping evaluation.

**Diminishing-returns reporting.** After every run, FlowAI emits a structured trajectory report:

- Run-by-run composite-score deltas: `run 1: +Δ1 → run 2: +Δ2 → ... → run N: +ΔN`.
- Per-dimension trajectory equivalents for each of the 10 §2 dimensions.
- An explicit diminishing-returns signal: *"the curve is flattening"* or *"continued iteration likely yields substantial transformation"* — with the heuristic threshold disclosed.
- An honest recommendation: *continue / consider stopping / stop now — substantial transformation no longer likely*.

The user always decides. FlowAI's job is to provide complete information; the user's job is to choose.

---

## §4 — Platform Scope and Mission

**FlowAI is a GLOBAL platform.** This is canonical and binding. There is no geographic restriction on FlowAI itself or on any of the products built or operated by VEU AI Studio under FlowAI's orchestration.

**Underserved is a global condition, not a geography.** The democratization mission targets individuals and small organizations **worldwide** who lack access to world-class software-building capability. Underservedness manifests as resource scarcity, technical-expertise scarcity, market-access scarcity, or any combination thereof — and it occurs in every jurisdiction on the planet. Geographic listing of underserved regions in canonical text is REPLACED by this global framing.

**All 5 VEU AI Studio products are global platforms with no geographic restriction.** Per the canonical product market definitions at §1.1 (CEO instruction 2026-05-18, PERMANENT) and reinforced by this amendment:

- **SAIGE** — EHS / ESG / CSR / Sustainability / SDGs practitioners and organizations **globally**.
- **RelTwin** — anyone for whom relationship intelligence drives outcomes, **globally**.
- **ReachSMS** — community-building and value-exchange surface, anywhere people gather **globally**.
- **PressAI** — writers, publishers, content creators of all kinds, **globally**.
- **MyPregLife** — any person or family navigating pregnancy, **globally**. No "Africa-first as launch market" caveat. No geographic launch-priority text. The market definition is global at canonical and stays global.

The earlier framing of MyPregLife as "Africa-first as a launch market only" is REMOVED at this amendment. Any future launch sequencing is an operational / go-to-market decision (engineering or commercial dispatch), NOT a canonical scope narrowing. Canonical scope = global, full market, from day one.

**Democratization mission (canonical):** enabling individuals and small organizations worldwide to build world-class software without deep technical expertise, regardless of location or resource level.

**Target classes.** FlowAI accepts and operates on the following output-target classes:

- `web` — websites, web applications, browser-rendered surfaces.
- `native_app` — desktop applications (macOS, Windows, Linux).
- `mobile_app` — mobile applications (iOS, Android).
- `SaaS` — multi-tenant software-as-a-service platforms.
- `agentic_ai` — agentic AI systems (LLM-orchestrated workflows, AI agents, autonomous-task systems).
- `generic_url` — any addressable URL surface not covered by the above (e.g. embedded widgets, microsites, generated documents-as-URL).

Per CA-16-C-Q4 ENTRY 015 formula-generalization invariant: the §7.6 GTM Readiness scoring formula is **unchanged across all target classes** — what varies per class is the finding-source set (per-class detector sets), NOT the formula itself, the band boundaries, or the prerequisite gate.

**Quality standard — uniform ≥95 for everyone, globally.** The same standard everywhere, for everyone — **as a dignity and belonging guarantee**. There is NO tiered quality by context, geography, or resource level. The mission is **to lift every submission to ≥95**, not to lower the bar for some. A small-org product in a low-resource jurisdiction is held to the same ≥95 standard as a large-enterprise product in a high-resource jurisdiction; the difference between them is what FlowAI must do to get there, not what "there" means.

**Sub-95 exception — NO canonical exception path exists.** The CA-13 95-bar override / expiry / migration machinery was explicitly DROPPED from canonical per ENTRY 017 (CEO Decision B, Locked Rule 13). **No canonical sub-95 admin override, no canonical exception envelope, no canonical sub-95 deferral mechanism exists in FlowAI's SSOT.** Whether any operational admin exception is provided at runtime is an **engineering-level configuration decision**, NOT a canonical policy commitment. Engineering may, at its discretion, expose an operator-config knob for sub-95 deployment for a specific operational need; doing so does NOT create a canonical exception path and does NOT amend the uniform-≥95 standard. The standard is the standard; engineering configuration is engineering configuration; the two MUST NOT be conflated.

---

## §5 — Symbiotic Meta-Principle

**FlowAI and its canonical specification (SSOT) exist in a symbiotic relationship.** Neither is master of the other; each improves the other in a continuous loop:

1. **The SSOT governs FlowAI.** Every behavior, every invariant, every decision-rendering path is anchored in canonical SSOT text. FlowAI does not invent governance at runtime; it consults canonical and acts within canonical bounds.

2. **FlowAI's real-world operation continuously improves the SSOT.** Through telemetry (run outcomes, score trajectories, finding distributions), through findings (gaps in canonical that operations surface), through amendments (the CA-N cycle per §18, the CEO-ratification track per Locked Rule 13), the SSOT is continuously refined by what FlowAI learns operating in the world.

3. **An improved SSOT produces better FlowAI behavior.** Each canonical amendment that ratifies refines the next generation of FlowAI's operation — narrower invariants where evidence accumulated, clearer dispositions where Panel converged, better governance where decisions were settled.

4. **The cycle compounds indefinitely.** No version of either is ever final. **Both always improve.** "Final" is not a state either FlowAI or its SSOT ever reaches; the bar simply rises as the system matures.

**FlowAI applies to its own development process.** VEU AI Studio's own development workflow — including the development of FlowAI itself — is a valid target for FlowAI's construction and improvement capabilities. FlowAI is not exempt from its own quality standards. The §29 Build/Wire Construction Engine (per CA-17 ENTRY 016) explicitly applies to construction-class operations against FlowAI's own source tree, subject to the same S1–S8 invariants. The §10 Self-Audit Quality Audit engine is FlowAI auditing FlowAI. The §11 Six-Step Clearance Protocol applies when FlowAI itself is treated as a deployable product. This self-application is not a special case; it is the canonical operating mode of a tool that improves things and is itself a thing.

**Implication for canonical content:** when canonical text describes a behavior or guarantee, that text binds FlowAI's operation against FlowAI as much as against any external product. The dignity-and-belonging guarantee of §4 (uniform ≥95 for everyone, globally) applies to FlowAI's own surfaces, dashboards, documentation, and operator-facing artifacts. The §2 quality-dimension coverage applies to FlowAI's own codebase. The §3 honest-assessment + iteration-depth-user-controlled model applies when FlowAI is iterating on its own self-renewal cycles.

---

## §6 — Acceptance criteria for CA-18 ratification

This amendment is a **CEO-ratification track per Locked Rule 13 — no Panel consulted.** Ratification proceeds directly:

- CEO dispatch (this dispatch) authorizes the draft + the canonical promotion in a single CEO-disposition event.
- Pre-promotion archive: `docs/archive/FLOWAI_SSOT-pre-CA18-promotion-2026-05-19.md` per §18.3.
- Promotion commit amends `docs/CANONICAL_REFERENCE.md` at §1.1 (MyPregLife row geographic correction) + §2 MISSION (geographic-list bullet replaced with global framing) + appends a §18.4 row recording CA-18 + appends ENTRY 018 in `docs/CANONICAL_HISTORY.md`.
- The §1-§5 contents of this amendment file become canonical authority for FlowAI mission/purpose; the canonical-reference document references this file as the binding statement and incorporates the disposition-relevant headlines at the appropriate canonical surfaces (MyPregLife row, §2 MISSION).
- No re-Panel; no v2; no further open question block. The CEO has stated the mission; this amendment captures it.

---

## §7 — Cross-CA reconciliation

This amendment intentionally consolidates and supersedes prior partial mission statements:

- **CA-1 + CA-2** (ENTRY 001, canonical 2026-05-14): the original geographic broadening + democratization reframe. Preserved as historical context in §18.4 ENTRY 001 row; superseded by §4 above where the two diverge (CA-1's geographic listing of "Sub-Saharan Africa, parts of Latin America, parts of South/Southeast Asia" is REMOVED; the underservedness-is-a-global-condition framing replaces it).
- **CEO instruction 2026-05-18 (§1.1 PERMANENT product market definitions):** reinforced. MyPregLife's "Africa-first as launch market" caveat — internally inconsistent with the "Globally" framing and with the project memory `project_veu_product_markets.md` — is REMOVED at this amendment.
- **CA-13 ENTRY 017 (Decision B, sibling commit `6c3c1f4`):** explicit deferral of the uniform-≥95 directive and the sub-95 exception question to "the forthcoming mission/Purpose amendment". **This amendment is that forthcoming amendment.** §4 above resolves the deferred questions: uniform ≥95 is canonical; NO canonical sub-95 exception path exists.
- **CA-17 ENTRY 016 (Decision A, sibling commit `ee7e85f`):** Build/Wire Construction Engine binding contract. §5 above explicitly extends FlowAI's quality discipline to FlowAI's own development workflow — including construction-class operations under CA-17's S1–S8 invariants applied to FlowAI's own source tree.

No other CA cycle is amended by this entry. The §18.4 ratified-amendments table at ENTRY 018 records the promotion; existing rows remain untouched.

---

*End of FlowAI Mission/Purpose Amendment DRAFT. CEO-ratification track per Locked Rule 13; no Panel. Pending CEO ratification at promotion commit. Doc-only; canonical files amended at promotion commit per CA-n cycle discipline (§18). When ratified, this draft becomes the binding canonical statement of FlowAI's mission and purpose, with §4 supplanting prior geographic-scoped framing and §2 + §5 defining the quality-and-symbiosis canon going forward.*
