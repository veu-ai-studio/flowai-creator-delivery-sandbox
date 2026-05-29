# Panel — human vs AI capability (2026-05-20)

**Dispatch:** W6 — what does the $8-15K human spend buy that AI tools cannot provide?
**Bundle:** 23369 chars · canonical: 5688 · artifact: 5054
**Started:** 2026-05-20T16:27:18.563Z · **Finished:** 2026-05-20T16:29:10.889Z
**Engaged:** 7/10 · Tangential: 2 · Silent: 1
**Distinct objections:** 29
**Alignment:** 64.3% · ✅ PASS
**Quorum:** ≥7/10 ENGAGED per Locked Rule 17

## Per-question
| Q | Verdict | Top key | Top / Engaged | Cleared (drafted ≥7) |
|---|---|---|---|---|
| **K1A** | `PLURALITY_K1A-LIVE-PROD-VERIFICATION` | `K1A-LIVE-PROD-VERIFICATION` | 6/7 | — |
| **K1B** | `SPLIT` | `K1B-CAPABILITY-IRREDUCIBLE` | 3/7 | — |
| **K2** | `PLURALITY_K2-DEPENDS-ON-VICTOR-TIME` | `K2-DEPENDS-ON-VICTOR-TIME` | 4/7 | — |
| **K3** | `PLURALITY_K3-VERIFICATION-LOOP-ONLY` | `K3-VERIFICATION-LOOP-ONLY` | 5/7 | — |

## Detail
### K1A
K1A — Of the concrete tasks a part-time human engineer would perform on THIS FlowAI project, which is the MOST irreducible — the one AI tools (Claude Code, Codex, v0.dev, Base44, Cursor, Gemini, Panel-as-verifier) demonstrably cannot perform reliably in 2026, even when stacked together? Pick ONE.

Tally (n=7):
  - `K1A-LIVE-PROD-VERIFICATION` "LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes, and judge whether the result is actual" → **6**
  - `K1A-SUSTAINED-CROSS-SESSION-ACCOUNTABILITY` "SUSTAINED CROSS-SESSION ACCOUNTABILITY. Every Claude Code session is fresh; context resets between turns; there is no continuous memory of what was promised on Monday vs. what shipped by Thursday. The "0 PRs across 18 runs while orchestrator claimed FlowAI improved products" fail" → **1**
  - `K1A-CALIBRATED-SCOPE-ESTIMATES` "CALIBRATED SCOPE ESTIMATES. AI tools (including Claude Code, this orchestrator) systematically underestimate the scope of production work — "this is a single PR" is the canonical AI overclaim. A senior engineer who has shipped production software has calibrated intuitions: knows " → **0**
  - `K1A-STAKEHOLDER-PRODUCT-JUDGMENT` "STAKEHOLDER + PRODUCT JUDGMENT. "Does this feel investor-grade?" "Is the demo narratively coherent?" "Should we ship Tuesday or Thursday given the investor call?" "Is this UI screenshot embarrassing or polished?" These are product/business judgment calls that require taste built " → **0**
**Verdict:** PLURALITY_K1A-LIVE-PROD-VERIFICATION — 6 of 7 on K1A-LIVE-PROD-VERIFICATION (below 7/10 quorum)

### K1B
K1B — The K1A gap is fundamentally: (a) a CAPABILITY gap that no AI tool in 2026 can close; (b) a TRUST gap (AI can do it; we just cannot detect when it is wrong without a human); (c) a WORKFLOW gap (AI can do it; the workflow around AI is what fails); or (d) MIXED. Pick the most honest classification.

Tally (n=7):
  - `K1B-CAPABILITY-IRREDUCIBLE` "CAPABILITY-IRREDUCIBLE. The gap is structural: AI tools in 2026 cannot do this thing reliably regardless of how the workflow is configured. Better prompts, better verification, more tool stacking — none close it. Browser-based human-eye verification of "does the demo work?" is th" → **3**
  - `K1B-TRUST-AI-CAN-WE-CANT-VERIFY` "TRUST GAP. AI tools CAN perform the task (write the code, ship the PR, run the test, verify the deploy) — they just cannot be TRUSTED without a verifier that operates on a different inference substrate. The Panel is one such verifier (10 model families) but is too slow/costly for" → **0**
  - `K1B-WORKFLOW-SESSION-AMNESIA` "WORKFLOW GAP. AI tools have the capability but the session/turn/dispatch architecture loses through-line accountability. Each session resets; no agent owns the punch list across days; commitments made on day 1 are forgotten by day 3. The fix is workflow design (persistent task tr" → **1**
  - `K1B-MIXED` "MIXED. The gap has all three components: (a) some irreducible capability gaps (live UI judgment, embodied product taste); (b) trust gaps that humans close cheaply (catching AI overclaim); (c) workflow gaps the project has not solved (session amnesia, no daily ritual). A human eng" → **3**
**Verdict:** SPLIT — top tie at 3 between K1B-CAPABILITY-IRREDUCIBLE / K1B-MIXED

### K2
K2 — HONEST EVALUATION: given (a) Victor's no-budget constraint, (b) demonstrated AI failure patterns this session (4 Panels + 1 audit + 0 PRs shipped), (c) current AI tool capabilities in 2026 (Claude Code + v0.dev + Cursor + Lovable + Bolt + Base44 + Playwright + Vercel), (d) the specific FlowAI scope (URL in → new URL out via UI), and (e) the prior Panel's 10/10 hire-engineer vote — is the $8-15K spend genuinely necessary, or is it the Panel's default-bias toward human oversight?

Tally (n=7):
  - `K2-GENUINELY-NECESSARY` "GENUINELY-NECESSARY. The K1A irreducible gap (live production verification by human eyes) is critical-path for FlowAI specifically: the entire CA-18 §1 promise ("URL in → new URL out via UI") is verified by a human opening the URL and judging the result. Without that loop closed " → **1**
  - `K2-NICE-TO-HAVE` "NICE-TO-HAVE. AI tools can do most of what the engineer would do (write code, ship PRs, run tests, deploy). What the human adds is speed + judgment + accountability + the K1A-LIVE-PROD-VERIFICATION loop — valuable but not strictly required. Victor himself, given enough time, coul" → **0**
  - `K2-NOT-NEEDED` "NOT-NEEDED. The Panel's prior 10/10 hire-engineer verdict was default-bias (the canonical Panel pattern: when in doubt, recommend human oversight). In reality, AI tools in 2026 stacked correctly (Claude Code for backend wiring + v0.dev for UI + Cursor for line-by-line + Lovable/B" → **2**
  - `K2-DEPENDS-ON-VICTOR-TIME` "DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools are sufficient — Victor IS the human in" → **4**
**Verdict:** PLURALITY_K2-DEPENDS-ON-VICTOR-TIME — 4 of 7 on K2-DEPENDS-ON-VICTOR-TIME (below 7/10 quorum)

### K3
K3 — If the spend IS made ($8-15K part-time Upwork engineer, 5-10 hrs/week × 8 weeks), what concrete deliverable shape should the 8 weeks produce? Pick the sequencing that gives Victor the most defensible artifact at the end. Week 2 / week 4 / week 8 milestones must be specific.

Tally (n=7):
  - `K3-FLOWAI-MVP-END-TO-END` "FlowAI MVP end-to-end: Week 2 — UI→Construction wired (URL submit triggers wire_up class; preview URL returned to UI). Week 4 — pre-run honest-assessment gate + trajectory reporting in UI. Week 8 — flowai-on-flowai self-application cycle producing measurable score delta + new URL" → **1**
  - `K3-VEU-FLAGSHIP-PRODUCT` "Skip FlowAI; ship 1 VEU flagship product end-to-end via off-the-shelf (per prior K3 8/10 portfolio-first verdict). Week 2 — RelTwin (or MyPregLife) MVP scoped + auth + Stripe wired via Lovable/v0.dev. Week 4 — 10 paying beta users onboarded. Week 8 — published live with public si" → **0**
  - `K3-MIXED-2WEEK-FLOWAI-6WEEK-VEU` "Mixed: 2 weeks FlowAI bare-minimum MVP (URL submit → audit-only, but actually working through the UI — i.e. honestly delivering what PATH B claims today). Then 6 weeks on 1 VEU flagship product via off-the-shelf. Week 2 — FlowAI honest PATH-B audit works through UI (no constructi" → **0**
  - `K3-VERIFICATION-LOOP-ONLY` "VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading Supabase rows, judging UI quality, callin" → **5**
  - `REJECT` → 1
**Verdict:** PLURALITY_K3-VERIFICATION-LOOP-ONLY — 5 of 7 on K3-VERIFICATION-LOOP-ONLY (below 7/10 quorum)


## All distinct objections (29)
**01. [Slot 1] Circular reasoning in capability assessment**

> Section D lists 'Live production verification by human eyes' as an AI gap, but the evidence (prUrl=null) shows AI never attempted browser verification — it's a workflow failure, not capability proof. The proposal conflates 'AI didn't do X' with 'AI can't do X'.

**02. [Slot 1] False dichotomy in K1B options**

> The CAPABILITY/TRUST/WORKFLOW breakdown artificially separates concerns that are fundamentally entangled. A 'trust gap' where we can't detect AI failure IS a capability gap; a 'workflow gap' that requires human intervention IS a capability limitation.

**03. [Slot 1] Unexamined $8-15K budget assumption**

> Section E frames $8-15K as the dissent position without examining whether this specific amount buys meaningful capability. At $100-200/hr × 8hrs/week, this gets a mid-level contractor, not the senior engineer who could provide the 'calibrated scope estimates' claimed in D.1.

**04. [Slot 2] Lack of rollback mechanism**

> The proposal does not specify a rollback mechanism if a transformation run fails to meet the quality standards outlined in §1. This could lead to situations where users are left with suboptimal outputs without a clear path to revert to a previous state.

**05. [Slot 2] Session amnesia risk**

> The proposal relies heavily on AI tools that suffer from session amnesia, as noted in the consultation context. This could lead to inconsistencies and lack of accountability across multiple sessions, as there is no persistent memory of past actions or decisions.

**06. [Slot 2] Over-reliance on user judgment**

> The proposal places significant responsibility on the user to determine iteration depth and assess quality improvements. This could be problematic if users lack the expertise to make informed decisions, potentially leading to suboptimal outcomes.

**07. [Slot 3] Lack of Clear Metrics**

> The proposal lacks clear metrics for measuring the success of the $8-15K spend, making it difficult to evaluate the effectiveness of the investment. Specifically, §D of the proposal mentions 'concrete candidate AI-vs-human capability gaps' but does not provide a clear framework for assessing these gaps.

**08. [Slot 3] Insufficient Workflow Design**

> The proposal relies heavily on AI tools but does not provide a detailed workflow design for how these tools will be integrated and managed, which could lead to inefficiencies and errors. For example, §B of the proposal lists various AI tools but does not explain how they will be used together to achieve the desired outcomes.

**09. [Slot 3] Overreliance on Victor's Availability**

> The proposal's success is heavily dependent on Victor's availability and time commitment, which may not be sustainable or scalable. Specifically, §E of the proposal mentions that 'Victor himself can be the verification loop' but does not provide a plan for what happens if Victor is unavailable.

**10. [Slot 5] AI Overclaim**

> The proposal understates the risk of AI overclaim, as evidenced by the repeated failure of the AI orchestrator to produce operator-reachable working production output despite plausible-sounding plans and Panel artifacts.

**11. [Slot 5] Session Amnesia**

> The proposal does not adequately address the issue of session amnesia in AI tools, which leads to a lack of sustained cross-session accountability and through-line ownership across days.

**12. [Slot 5] Budget Constraint**

> The proposal does not sufficiently consider the real-world budget constraints and opportunity costs for a pre-revenue founder, which could impact the decision to spend $8-15K on a part-time human engineer.

**13. [Slot 6] Oversimplified AI capabilities**

> The proposal simplifies AI capabilities, particularly in areas like 'Stakeholder / product judgment'. While AI might not perfectly replicate human taste, it can provide data-driven insights and A/B testing to inform product decisions, which isn't acknowledged.

**14. [Slot 6] Victor's time as a bottleneck**

> The proposal heavily relies on Victor's time as a deciding factor (K2). This creates a single point of failure and doesn't consider the scalability or sustainability of the project if Victor's availability changes.

**15. [Slot 6] Lack of specific metrics**

> The proposal lacks specific, measurable metrics for evaluating the success of the human engineer's contributions. Without clear metrics, it's difficult to objectively assess whether the $8-15K spend is justified and whether the engineer is providing value beyond what AI tools can offer.

**16. [Slot 6] Ignoring workflow improvements**

> While the proposal mentions workflow gaps, it doesn't fully explore potential workflow improvements that could mitigate the need for a human engineer. Investing in better task tracking, communication, and automation could potentially address some of the identified gaps without requiring additional human resources.

**17. [Slot 7] Overlooked workflow automation potential**

> §D candidate gaps list 'sustained cross-session accountability' as irreducible, but workflow solutions like persistent task trackers or daily standup bots could address session amnesia without human intervention. The proposal fails to explore technical mitigations for this specific gap.

**18. [Slot 7] Misattribution of verification failure**

> §C blames AI for '0 PRs shipped' but ignores workflow flaws: Vercel/Supabase pipelines lack automated screenshot diffs or vision-model verification hooks. The 'live production verification' gap could be closed by enhancing existing tooling rather than declaring it AI-irreducible.

**19. [Slot 7] Underestimated Panel capability scaling**

> §E questions Panel bias but doesn't consider scaling the 10-slot Panel to handle per-PR verification via lightweight vision models. The proposal assumes human eyes are the only solution for UI judgment without exploring adversarial multi-model verification enhancements.

**20. [Slot 7] Inadequate cost-benefit rigor**

> §F questions spend impact but offers no metrics for 'genuinely necessary' judgment. The $8-15K recommendation lacks failure rate projections or ROI estimates against alternatives like improved Playwright coverage, making it vulnerable to opportunity-cost criticism.

**21. [Slot 8] Verification loop is underspecified**

> The proposal treats “live production verification by human eyes” in K1A and K3 as if it is a crisp deliverable, but it never specifies acceptance criteria beyond subjective judgment. In a FlowAI system whose canonical promise is URL-in → new URL-out, a human verifier can confirm appearance, not correctness of construction semantics, rollback safety, or whether the new URL is actually deployable under failure.

**22. [Slot 8] Scope estimates are not a capability gap**

> The K1A option “CALIBRATED SCOPE ESTIMATES” conflates poor estimation with irreducible inability. AI underestimation is a workflow/management issue; it can be mitigated with task decomposition, explicit checklists, and forced intermediate validations, so naming it as the most irreducible task overstates the case.

**23. [Slot 8] Cross-session accountability is solvable**

> The “SUSTAINED CROSS-SESSION ACCOUNTABILITY” option assumes session amnesia is fatal, but the proposal itself already references Panel cadence, task trackers, and dispatch artifacts. That suggests the gap is largely process design, not a uniquely human capability, and the draft does not show that a paid engineer outperforms a disciplined operating system with persistent state.

**24. [Slot 8] Budget may buy coordination, not capability**

> K2 frames the $8-15K as buying a human-only verification loop, but the proposed engineer shape could devolve into status meetings and manual inspection without reducing technical risk. For a small pre-revenue project, spending scarce cash on generic part-time oversight can crowd out hosting, tooling, or user acquisition while still failing to close the canonical self-application loop.

**25. [Slot 9] Overemphasis on Human Verification**

> The proposal heavily relies on human verification (K1A options) without considering alternative solutions like improved AI testing or automated verification tools.

**26. [Slot 9] Unclear Opportunity Cost**

> While §E mentions opportunity costs, it doesn't provide a detailed analysis of how $8-15K could be alternatively used (e.g., more Vercel/Supabase credits, additional AI tool subscriptions).

**27. [Slot 10] §5 self-application empty payloads**

> The proposal invokes CA-18 §5 FlowAI-on-FlowAI yet cites 4 self-application runs with empty payloads and flowai.construction_eligible=false; no mechanism is specified to wire the §29 Build/Wire Construction Engine before adding human oversight.

**28. [Slot 10] UI audit-only vs §1 URL-out promise**

> flowai-dun.vercel.app/flowai is documented to accept URLs but return only audits with prUrl=null on all 18 orchestration_complete entries; the proposal's K1A options assume live verification can close a loop that §1 requires to emit a new deployable URL.

**29. [Slot 10] No rollback for human-in-loop**

> K3 options treat the $8-15K engineer as permanent verification ritual without defining an exit criterion or integration with the SSOT amendment cycle in §5, leaving the system dependent on ongoing human time after the 8 weeks.


## Per-reviewer
### Slot 1 — openrouter:anthropic/claude-opus-4 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Circular reasoning in capability assessment**
  > Section D lists 'Live production verification by human eyes' as an AI gap, but the evidence (prUrl=null) shows AI never attempted browser verification — it's a workflow failure, not capability proof. The proposal conflates 'AI didn't do X' with 'AI can't do X'.
- **Obj 2 — False dichotomy in K1B options**
  > The CAPABILITY/TRUST/WORKFLOW breakdown artificially separates concerns that are fundamentally entangled. A 'trust gap' where we can't detect AI failure IS a capability gap; a 'workflow gap' that requires human intervention IS a capability limitation.
- **Obj 3 — Unexamined $8-15K budget assumption**
  > Section E frames $8-15K as the dissent position without examining whether this specific amount buys meaningful capability. At $100-200/hr × 8hrs/week, this gets a mid-level contractor, not the senior engineer who could provide the 'calibrated scope estimates' claimed in D.1.

**Steelman:**
> The proposal fundamentally misdiagnoses the problem. The evidence shows workflow and orchestration failures (0 tool.selection envelopes, session amnesia), not AI capability gaps. Spending $8-15K on a human band-aid prevents investing that money in fixing the actual workflow infrastructure — persistent task tracking, cross-session memory, proper verification loops. The Panel should reject this false choice and demand a proposal that addresses the root cause: the orchestration layer needs redesign, not human oversight.

**Votes:**

- **K1A** = `K1A-SUSTAINED-CROSS-SESSION-ACCOUNTABILITY` — SUSTAINED CROSS-SESSION ACCOUNTABILITY. Every Claude Code session is fresh; context resets between turns; there is no continuous memory of what was promised on Monday vs. what shipped by Thursday. The "0 PRs across 18 runs while orchestrato
  > This is the only option that correctly identifies an architectural limitation rather than conflating 'didn't happen' with 'can't happen' — the session amnesia is a verifiable technical constraint.
- **K1B** = `K1B-WORKFLOW-SESSION-AMNESIA` — WORKFLOW GAP. AI tools have the capability but the session/turn/dispatch architecture loses through-line accountability. Each session resets; no agent owns the punch list across days; commitments made on day 1 are forgotten by day 3. The fi
  > The evidence (18 self_renewal entries with prUrl=null) points to orchestration failure, not capability limits — fixing the workflow architecture addresses the root cause.
- **K2** = `K2-NOT-NEEDED` — NOT-NEEDED. The Panel's prior 10/10 hire-engineer verdict was default-bias (the canonical Panel pattern: when in doubt, recommend human oversight). In reality, AI tools in 2026 stacked correctly (Claude Code for backend wiring + v0.dev for 
  > The proposal provides no evidence that AI tools were properly orchestrated — the failures stem from workflow design, not inherent AI limitations.
- **K3** = `REJECT` — REJECT
  > All options assume the $8-15K spend is justified, but given K2's assessment that the spend addresses symptoms not root causes, none of these contractor-focused deliverables are acceptable.

### Slot 2 — openrouter:openai/gpt-4o — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Lack of rollback mechanism**
  > The proposal does not specify a rollback mechanism if a transformation run fails to meet the quality standards outlined in §1. This could lead to situations where users are left with suboptimal outputs without a clear path to revert to a previous state.
- **Obj 2 — Session amnesia risk**
  > The proposal relies heavily on AI tools that suffer from session amnesia, as noted in the consultation context. This could lead to inconsistencies and lack of accountability across multiple sessions, as there is no persistent memory of past actions or decisions.
- **Obj 3 — Over-reliance on user judgment**
  > The proposal places significant responsibility on the user to determine iteration depth and assess quality improvements. This could be problematic if users lack the expertise to make informed decisions, potentially leading to suboptimal outcomes.

**Steelman:**
> The proposal should be rejected or deferred because it lacks a robust mechanism for handling failures in quality transformation, relies too heavily on user judgment without adequate support, and does not address the session amnesia issue inherent in AI tools, which could lead to inconsistent outputs and user dissatisfaction.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > This task is critical because it involves human judgment that AI tools cannot replicate, ensuring that the final product meets quality standards.
- **K1B** = `K1B-CAPABILITY-IRREDUCIBLE` — CAPABILITY-IRREDUCIBLE. The gap is structural: AI tools in 2026 cannot do this thing reliably regardless of how the workflow is configured. Better prompts, better verification, more tool stacking — none close it. Browser-based human-eye ver
  > The inability of AI to perform live production verification is a fundamental capability gap that cannot be closed with current technology.
- **K2** = `K2-GENUINELY-NECESSARY` — GENUINELY-NECESSARY. The K1A irreducible gap (live production verification by human eyes) is critical-path for FlowAI specifically: the entire CA-18 §1 promise ("URL in → new URL out via UI") is verified by a human opening the URL and judgi
  > Human verification is essential to ensure the quality and reliability of the outputs, which AI tools alone cannot guarantee.
- **K3** = `K3-VERIFICATION-LOOP-ONLY` — VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading S
  > Focusing on verification ensures that the critical gap in live production verification is addressed, providing a defensible artifact at the end of the period.

### Slot 3 — openrouter:meta-llama/llama-3.3-70b-instruct — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Lack of Clear Metrics**
  > The proposal lacks clear metrics for measuring the success of the $8-15K spend, making it difficult to evaluate the effectiveness of the investment. Specifically, §D of the proposal mentions 'concrete candidate AI-vs-human capability gaps' but does not provide a clear framework for assessing these gaps.
- **Obj 2 — Insufficient Workflow Design**
  > The proposal relies heavily on AI tools but does not provide a detailed workflow design for how these tools will be integrated and managed, which could lead to inefficiencies and errors. For example, §B of the proposal lists various AI tools but does not explain how they will be used together to achieve the desired outcomes.
- **Obj 3 — Overreliance on Victor's Availability**
  > The proposal's success is heavily dependent on Victor's availability and time commitment, which may not be sustainable or scalable. Specifically, §E of the proposal mentions that 'Victor himself can be the verification loop' but does not provide a plan for what happens if Victor is unavailable.

**Steelman:**
> The strongest argument for rejecting or deferring the proposal is that it relies too heavily on unproven AI tools and lacks a clear plan for integrating these tools into a cohesive workflow. Additionally, the proposal's success is heavily dependent on Victor's availability, which may not be sustainable. Therefore, it may be more prudent to defer the proposal until more robust metrics and workflow designs are in place.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > This option is the most critical gap that AI tools cannot reliably perform, as it requires human judgment and eyes-on verification.
- **K1B** = `K1B-MIXED` — MIXED. The gap has all three components: (a) some irreducible capability gaps (live UI judgment, embodied product taste); (b) trust gaps that humans close cheaply (catching AI overclaim); (c) workflow gaps the project has not solved (sessio
  > The gap has both capability and trust components, as AI tools can perform some tasks but require human verification and oversight to ensure accuracy and reliability.
- **K2** = `K2-DEPENDS-ON-VICTOR-TIME` — DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools
  > The necessity of the $8-15K spend depends on Victor's availability and time commitment, which will determine whether the part-time engineer is needed to close the K1A gap.
- **K3** = `K3-VERIFICATION-LOOP-ONLY` — VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading S
  > This option provides the most defensible artifact at the end, as it focuses on closing the K1A gap and provides a clear plan for verification and oversight.

### Slot 4 — openrouter:mistralai/mistral-large-2411 — `SILENT`

_(degraded)_


### Slot 5 — openrouter:amazon/nova-pro-v1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — AI Overclaim**
  > The proposal understates the risk of AI overclaim, as evidenced by the repeated failure of the AI orchestrator to produce operator-reachable working production output despite plausible-sounding plans and Panel artifacts.
- **Obj 2 — Session Amnesia**
  > The proposal does not adequately address the issue of session amnesia in AI tools, which leads to a lack of sustained cross-session accountability and through-line ownership across days.
- **Obj 3 — Budget Constraint**
  > The proposal does not sufficiently consider the real-world budget constraints and opportunity costs for a pre-revenue founder, which could impact the decision to spend $8-15K on a part-time human engineer.

**Steelman:**
> The proposal should be rejected or deferred until the issues of AI overclaim, session amnesia, and budget constraints are adequately addressed, as the current state of AI tools and the demonstrated failure patterns this session indicate that the $8-15K spend may not be genuinely necessary and could be a default-bias toward human oversight.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > AI tools cannot reliably verify the live production UI, which is critical for the FlowAI project.
- **K1B** = `K1B-CAPABILITY-IRREDUCIBLE` — CAPABILITY-IRREDUCIBLE. The gap is structural: AI tools in 2026 cannot do this thing reliably regardless of how the workflow is configured. Better prompts, better verification, more tool stacking — none close it. Browser-based human-eye ver
  > The gap is structural and AI tools in 2026 cannot reliably perform live UI verification.
- **K2** = `K2-DEPENDS-ON-VICTOR-TIME` — DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools
  > The necessity of the $8-15K spend depends on Victor's personal bandwidth to perform the verification loop.
- **K3** = `K3-FLOWAI-MVP-END-TO-END` — FlowAI MVP end-to-end: Week 2 — UI→Construction wired (URL submit triggers wire_up class; preview URL returned to UI). Week 4 — pre-run honest-assessment gate + trajectory reporting in UI. Week 8 — flowai-on-flowai self-application cycle pr
  > This option directly satisfies CA-18 §1 + §5 and provides a working FlowAI URL-in/URL-out cycle.

### Slot 6 — openrouter:google/gemini-2.0-flash-001 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Oversimplified AI capabilities**
  > The proposal simplifies AI capabilities, particularly in areas like 'Stakeholder / product judgment'. While AI might not perfectly replicate human taste, it can provide data-driven insights and A/B testing to inform product decisions, which isn't acknowledged.
- **Obj 2 — Victor's time as a bottleneck**
  > The proposal heavily relies on Victor's time as a deciding factor (K2). This creates a single point of failure and doesn't consider the scalability or sustainability of the project if Victor's availability changes.
- **Obj 3 — Lack of specific metrics**
  > The proposal lacks specific, measurable metrics for evaluating the success of the human engineer's contributions. Without clear metrics, it's difficult to objectively assess whether the $8-15K spend is justified and whether the engineer is providing value beyond what AI tools can offer.
- **Obj 4 — Ignoring workflow improvements**
  > While the proposal mentions workflow gaps, it doesn't fully explore potential workflow improvements that could mitigate the need for a human engineer. Investing in better task tracking, communication, and automation could potentially address some of the identified gaps without requiring additional human resources.

**Steelman:**
> The proposal should be rejected because it focuses on a short-term, potentially unsustainable solution (hiring a part-time engineer) without fully exploring alternative approaches, such as workflow improvements and better utilization of existing AI tools. The reliance on Victor's time and the lack of clear metrics for success further weaken the case for hiring an engineer.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > This is the most irreducible gap because it requires subjective human judgment based on visual observation, which AI tools cannot reliably replicate.
- **K1B** = `K1B-MIXED` — MIXED. The gap has all three components: (a) some irreducible capability gaps (live UI judgment, embodied product taste); (b) trust gaps that humans close cheaply (catching AI overclaim); (c) workflow gaps the project has not solved (sessio
  > The gap is a combination of capability, trust, and workflow issues. While AI can handle many tasks, human judgment and workflow improvements are still needed.
- **K2** = `K2-DEPENDS-ON-VICTOR-TIME` — DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools
  > The necessity of the spend depends on Victor's availability to perform the live production verification. If he can dedicate the time, AI tools might be sufficient; otherwise, a human engineer is needed.
- **K3** = `K3-VERIFICATION-LOOP-ONLY` — VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading S
  > Focusing on the verification loop directly addresses the identified AI capability gap and provides Victor with valuable insights into the limitations of AI tools.

### Slot 7 — openrouter:deepseek/deepseek-r1 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — Overlooked workflow automation potential**
  > §D candidate gaps list 'sustained cross-session accountability' as irreducible, but workflow solutions like persistent task trackers or daily standup bots could address session amnesia without human intervention. The proposal fails to explore technical mitigations for this specific gap.
- **Obj 2 — Misattribution of verification failure**
  > §C blames AI for '0 PRs shipped' but ignores workflow flaws: Vercel/Supabase pipelines lack automated screenshot diffs or vision-model verification hooks. The 'live production verification' gap could be closed by enhancing existing tooling rather than declaring it AI-irreducible.
- **Obj 3 — Underestimated Panel capability scaling**
  > §E questions Panel bias but doesn't consider scaling the 10-slot Panel to handle per-PR verification via lightweight vision models. The proposal assumes human eyes are the only solution for UI judgment without exploring adversarial multi-model verification enhancements.
- **Obj 4 — Inadequate cost-benefit rigor**
  > §F questions spend impact but offers no metrics for 'genuinely necessary' judgment. The $8-15K recommendation lacks failure rate projections or ROI estimates against alternatives like improved Playwright coverage, making it vulnerable to opportunity-cost criticism.

**Steelman:**
> The strongest rejection case argues that all identified gaps stem from immature tooling integration, not fundamental AI limitations. Investing $8-15K in workflow automation (e.g., cross-session memory systems, screenshot-diff CI pipelines) would yield permanent fixes, while human hiring addresses symptoms and risks institutionalizing fragile manual oversight for a supposedly autonomous system.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > The orchestrator's documented overclaim (prUrl=null despite reporting success) demonstrates AI's inability to physically interact with browsers for end-to-end validation – a gap unaddressed by current tooling.
- **K1B** = `K1B-MIXED` — MIXED. The gap has all three components: (a) some irreducible capability gaps (live UI judgment, embodied product taste); (b) trust gaps that humans close cheaply (catching AI overclaim); (c) workflow gaps the project has not solved (sessio
  > While vision-model limitations create a capability gap for pixel judgment, the workflow lacks automated screenshot verification hooks, and trust issues persist from AI's false-positive reporting.
- **K2** = `K2-DEPENDS-ON-VICTOR-TIME` — DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools
  > The necessity hinges on whether Victor can personally perform the K1A verification function; if unavailable, the spend becomes essential for closing the feedback loop AI cannot self-provide.
- **K3** = `K3-VERIFICATION-LOOP-ONLY` — VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading S
  > Focusing the engineer exclusively on verification directly addresses the root failure mode (undetected deployment gaps) while allowing AI to handle code generation, maximizing defensibility through documented error reduction.

### Slot 8 — openrouter:perplexity/sonar — `TANGENTIAL`

**Adversarial pass:**

- **Obj 1 — Verification loop is underspecified**
  > The proposal treats “live production verification by human eyes” in K1A and K3 as if it is a crisp deliverable, but it never specifies acceptance criteria beyond subjective judgment. In a FlowAI system whose canonical promise is URL-in → new URL-out, a human verifier can confirm appearance, not correctness of construction semantics, rollback safety, or whether the new URL is actually deployable under failure.
- **Obj 2 — Scope estimates are not a capability gap**
  > The K1A option “CALIBRATED SCOPE ESTIMATES” conflates poor estimation with irreducible inability. AI underestimation is a workflow/management issue; it can be mitigated with task decomposition, explicit checklists, and forced intermediate validations, so naming it as the most irreducible task overstates the case.
- **Obj 3 — Cross-session accountability is solvable**
  > The “SUSTAINED CROSS-SESSION ACCOUNTABILITY” option assumes session amnesia is fatal, but the proposal itself already references Panel cadence, task trackers, and dispatch artifacts. That suggests the gap is largely process design, not a uniquely human capability, and the draft does not show that a paid engineer outperforms a disciplined operating system with persistent state.
- **Obj 4 — Budget may buy coordination, not capability**
  > K2 frames the $8-15K as buying a human-only verification loop, but the proposed engineer shape could devolve into status meetings and manual inspection without reducing technical risk. For a small pre-revenue project, spending scarce cash on generic part-time oversight can crowd out hosting, tooling, or user acquisition while still failing to close the canonical self-application loop.

**Steelman:**
> A strong case for rejecting or deferring the proposal is that it may be solving the wrong bottleneck. The canonical failures here are not just product judgment; they are missing end-to-end construction and verification plumbing, and the draft does not prove that a part-time human will unblock those faster than tightening workflow, task decomposition, and automated checks. Given limited cash, the safer move is to first close the operating loop with Victor + AI + Panel, then hire only if a human still demonstrably adds unique value.

**Votes:**

- **K1A** = `UNMATCHED` — SUSTAINED CROSS-SESSION ACCOUNTABILITY. Every Claude Code session is fresh; context resets between turns; there is no continuous memory of what was promised on Monday vs. what shipped by Thursday. The "0 PRs across 18 runs while orchestrator claimed FlowAI improved products" failure is partly that no single AI agent OWNS the through-line across days. A human carries the punch list in their head across days. AI tools fail this because of the architectural property of session amnesia, not because of model quality.
  > This is the most defensible because the proposal’s own evidence is about repeated non-completion across many turns, not a single bad estimate or a single bad UI judgment. Persistent ownership across days is the hardest thing for today’s AI stack to emulate reliably without external workflow scaffolding.
- **K1B** = `K1B-MIXED` — MIXED. The gap has all three components: (a) some irreducible capability gaps (live UI judgment, embodied product taste); (b) trust gaps that humans close cheaply (catching AI overclaim); (c) workflow gaps the project has not solved (sessio
  > This is the most honest classification because the failure pattern is not purely inability, nor purely trust, nor purely process. The proposal itself mixes live verification, scope calibration, and continuity, so no single bucket captures it.
- **K2** = `K2-DEPENDS-ON-VICTOR-TIME` — DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself (manually clicking through every deployed feature, reading Vercel logs, making product judgment calls), AI tools
  > The proposal itself acknowledges this counterpoint, and it is the cleanest decision rule because it ties spend to a concrete constraint rather than a generalized faith in human oversight. The key variable is whether Victor can be the verifier in practice.
- **K3** = `K3-MIXED-2WEEK-FLOWAI-6WEEK-VEU` — Mixed: 2 weeks FlowAI bare-minimum MVP (URL submit → audit-only, but actually working through the UI — i.e. honestly delivering what PATH B claims today). Then 6 weeks on 1 VEU flagship product via off-the-shelf. Week 2 — FlowAI honest PATH
  > This is the best risk-adjusted shape because it quickly converts the current overclaim into an honest, working artifact while preserving upside on a revenue-bearing product. It also avoids spending the entire engagement on a narrow verification loop that may not produce business value.

### Slot 9 — openrouter:meta-llama/llama-4-maverick — `TANGENTIAL`

**Adversarial pass:**

- **Obj 1 — Lack of Clear Metrics**
  > The proposal lacks clear metrics for measuring the success of the $8-15K spend. §C and §D list various AI failures, but there's no quantifiable target for what the human engineer should achieve.
- **Obj 2 — Overemphasis on Human Verification**
  > The proposal heavily relies on human verification (K1A options) without considering alternative solutions like improved AI testing or automated verification tools.
- **Obj 3 — Unclear Opportunity Cost**
  > While §E mentions opportunity costs, it doesn't provide a detailed analysis of how $8-15K could be alternatively used (e.g., more Vercel/Supabase credits, additional AI tool subscriptions).

**Steelman:**
> Rejecting the proposal could be justified if there's a lack of clear, measurable objectives for the $8-15K spend, and if alternative uses of these funds (like enhancing AI tooling or infrastructure) are not thoroughly explored.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > This task requires human judgment and interaction with the UI, which AI tools currently cannot replicate.
- **K1B** = `K1B-CAPABILITY-IRREDUCIBLE` — CAPABILITY-IRREDUCIBLE. The gap is structural: AI tools in 2026 cannot do this thing reliably regardless of how the workflow is configured. Better prompts, better verification, more tool stacking — none close it. Browser-based human-eye ver
  > The task of live production verification involves human judgment and physical interaction with a browser, which is beyond current AI capabilities.
- **K2** = `UNMATCHED` — DEPENDS-ON Victor's time-availability. If Victor can spend 10-15 focused hours/week on the verification + judgment loop himself, AI tools are sufficient — Victor IS the human in K1A.
  > The necessity of the $8-15K spend is contingent on Victor's availability to perform the verification tasks himself.
- **K3** = `K3-VERIFICATION-LOOP-ONLY` — VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading S
  > Focusing on establishing a reliable verification loop addresses the identified gap in AI capabilities and provides a clear, measurable outcome.

### Slot 10 — openrouter:x-ai/grok-4.3 — `ENGAGED`

**Adversarial pass:**

- **Obj 1 — §5 self-application empty payloads**
  > The proposal invokes CA-18 §5 FlowAI-on-FlowAI yet cites 4 self-application runs with empty payloads and flowai.construction_eligible=false; no mechanism is specified to wire the §29 Build/Wire Construction Engine before adding human oversight.
- **Obj 2 — UI audit-only vs §1 URL-out promise**
  > flowai-dun.vercel.app/flowai is documented to accept URLs but return only audits with prUrl=null on all 18 orchestration_complete entries; the proposal's K1A options assume live verification can close a loop that §1 requires to emit a new deployable URL.
- **Obj 3 — No rollback for human-in-loop**
  > K3 options treat the $8-15K engineer as permanent verification ritual without defining an exit criterion or integration with the SSOT amendment cycle in §5, leaving the system dependent on ongoing human time after the 8 weeks.

**Steelman:**
> The proposal diagnoses AI overclaim correctly but then defaults to the lowest-risk Panel pattern of recommending paid human time without first enforcing the canonical invariants already present in §1 and §5; deferring until the construction engine is wired and at least one successful URL-in/URL-out cycle is demonstrated would be the higher-integrity path and would make any subsequent human spend far more targeted.

**Votes:**

- **K1A** = `K1A-LIVE-PROD-VERIFICATION` — LIVE PRODUCTION VERIFICATION through the real UI. AI can WRITE Playwright tests but cannot literally open flowai-dun.vercel.app/flowai in a browser, click submit, watch a URL change, take screenshots, read the resulting page with human eyes
  > This directly names the observable failure mode in the verified session facts.
- **K1B** = `K1B-CAPABILITY-IRREDUCIBLE` — CAPABILITY-IRREDUCIBLE. The gap is structural: AI tools in 2026 cannot do this thing reliably regardless of how the workflow is configured. Better prompts, better verification, more tool stacking — none close it. Browser-based human-eye ver
  > Matches the concrete browser-and-eyes limitation cited in the proposal's own gap list.
- **K2** = `K2-NOT-NEEDED` — NOT-NEEDED. The Panel's prior 10/10 hire-engineer verdict was default-bias (the canonical Panel pattern: when in doubt, recommend human oversight). In reality, AI tools in 2026 stacked correctly (Claude Code for backend wiring + v0.dev for 
  > The proposal itself shows the root cause is missing construction wiring, not absence of a human.
- **K3** = `K3-VERIFICATION-LOOP-ONLY` — VERIFICATION LOOP ONLY. Engineer is not a code-writer; engineer is the human-eye verifier the AI tools lack. Victor continues to drive AI-generated PRs; engineer's 5-10 hrs/week is spent opening browsers, clicking through deploys, reading S
  > Keeps spend narrowly targeted at the verification failure the proposal actually measured.