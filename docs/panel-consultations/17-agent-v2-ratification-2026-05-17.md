# Panel — 17 Agent Specs v2 ADVERSARIAL CLUSTER-INTEGRATION RATIFICATION (2026-05-17)

**Started:** 2026-05-17T17:08:22.311Z · **Finished:** 2026-05-17T17:16:05.831Z
**Audit:** {"providerCounts":{"anthropic":1,"openai":1,"meta-llama":2,"mistralai":1,"amazon":1,"google":1,"deepseek":1,"perplexity":1,"x-ai":1},"maxPerProvider":2,"slots":10,"documentedDuplicates":{"meta-llama":"Slot 3 (llama-3.3-70b-instruct, post-Gemini-demote 2026-05-16) + Slot 9 (llama-4-maverick). Different generations, different serving paths on OpenRouter, independent in practice. Documented per W5b dispatch #2 (2026-05-16, commit 556a751 triggering evidence)."},"undocumentedDuplicates":[],"modelPrimaryDuplicates":[],"undocumentedModelDuplicates":[],"auditPass":true}

**Sub-batch sizes:** sub-batch-1=6, sub-batch-2=6, sub-batch-3=5
**Bundles:** sub-batch-1=103737, sub-batch-2=95167, sub-batch-3=77851

## SUMMARY

| Top-line | Count |
|---|---:|
| Plain PROMOTE (top key wins) | 0 |
| PROMOTE-WITH-CONDITIONS | 3 |
| REVISE | 14 |
| REJECT | 0 |
| Other / unresolved | 0 |

## Per-agent verdicts
| Q | Agent | Top key | Top / Engaged | Verdict |
|---|---|---|---|---|
| **A-6** | Research | `A6-REVISE` | 5/9 | `PLURALITY_A6-REVISE` |
| **A-8** | Quality Audit | `A8-REVISE` | 7/9 | `QUORUM_PLURALITY_A8-REVISE` |
| **A-7** | Design | `A7-CONDITIONS` | 5/9 | `PLURALITY_A7-CONDITIONS` |
| **A-10** | Monitor | `A10-REVISE` | 5/9 | `PLURALITY_A10-REVISE` |
| **A-9** | Go-To-Market | `A9-REVISE` | 5/9 | `PLURALITY_A9-REVISE` |
| **A-11** | Strategic Intelligence | `A11-REVISE` | 6/9 | `PLURALITY_A11-REVISE` |
| **A-12** | Portfolio Risk | `A12-REVISE` | 5/10 | `PLURALITY_A12-REVISE` |
| **A-13** | Self-Protection | `A13-REVISE` | 5/10 | `PLURALITY_A13-REVISE` |
| **A-14** | Public Policy | `A14-REVISE` | 7/10 | `QUORUM_PLURALITY_A14-REVISE` |
| **A-15** | Benchmarking | `A15-CONDITIONS` | 4/10 | `PLURALITY_A15-CONDITIONS` |
| **A-16** | Productivity & HR | `A16-REVISE` | 5/10 | `PLURALITY_A16-REVISE` |
| **A-17** | Product Evolution | `A17-REVISE` | 7/10 | `QUORUM_PLURALITY_A17-REVISE` |
| **A-18** | Business Planning | `A18-REVISE` | 7/10 | `QUORUM_PLURALITY_A18-REVISE` |
| **A-19** | Technological Evolution | `A19-CONDITIONS` | 6/10 | `PLURALITY_A19-CONDITIONS` |
| **A-20** | Environmental Impacts | `A20-REVISE` | 6/10 | `PLURALITY_A20-REVISE` |
| **A-23** | Ops-Runner Gamma (Cost Governor | `A23-REVISE` | 6/10 | `PLURALITY_A23-REVISE` |
| **A-26** | Orchestra Research Agent | `A26-REVISE` | 5/10 | `PLURALITY_A26-REVISE` |

## Per-sub-batch detail
### sub-batch-1

**Bundle:** 103737 chars
**Engaged:** 9 · **Tangential:** 0 · **Silent:** 1
**Distinct objections:** 31
**Alignment:** 3.7% · ✅ PASS

Per-question tallies:
**A-6** verdict=`PLURALITY_A6-REVISE` (top=A6-REVISE 5/9)
  - `A6-PROMOTE` → **0**
  - `A6-CONDITIONS` → **4**
  - `A6-REVISE` → **5**
  - `A6-REJECT` → **0**
**A-8** verdict=`QUORUM_PLURALITY_A8-REVISE` (top=A8-REVISE 7/9)
  - `A8-PROMOTE` → **0**
  - `A8-CONDITIONS` → **2**
  - `A8-REVISE` → **7**
  - `A8-REJECT` → **0**
**A-7** verdict=`PLURALITY_A7-CONDITIONS` (top=A7-CONDITIONS 5/9)
  - `A7-PROMOTE` → **0**
  - `A7-CONDITIONS` → **5**
  - `A7-REVISE` → **4**
  - `A7-REJECT` → **0**
**A-10** verdict=`PLURALITY_A10-REVISE` (top=A10-REVISE 5/9)
  - `A10-PROMOTE` → **0**
  - `A10-CONDITIONS` → **3**
  - `A10-REVISE` → **5**
  - `A10-REJECT` → **0**
  - `REJECT` → 1
**A-9** verdict=`PLURALITY_A9-REVISE` (top=A9-REVISE 5/9)
  - `A9-PROMOTE` → **1**
  - `A9-CONDITIONS` → **2**
  - `A9-REVISE` → **5**
  - `A9-REJECT` → **0**
  - `REJECT` → 1
**A-11** verdict=`PLURALITY_A11-REVISE` (top=A11-REVISE 6/9)
  - `A11-PROMOTE` → **1**
  - `A11-CONDITIONS` → **2**
  - `A11-REVISE` → **6**
  - `A11-REJECT` → **0**

### sub-batch-2

**Bundle:** 95167 chars
**Engaged:** 10 · **Tangential:** 0 · **Silent:** 0
**Distinct objections:** 34
**Alignment:** 6.7% · ✅ PASS

Per-question tallies:
**A-12** verdict=`PLURALITY_A12-REVISE` (top=A12-REVISE 5/10)
  - `A12-PROMOTE` → **0**
  - `A12-CONDITIONS` → **3**
  - `A12-REVISE` → **5**
  - `A12-REJECT` → **0**
  - `REJECT` → 2
**A-13** verdict=`PLURALITY_A13-REVISE` (top=A13-REVISE 5/10)
  - `A13-PROMOTE` → **0**
  - `A13-CONDITIONS` → **2**
  - `A13-REVISE` → **5**
  - `A13-REJECT` → **0**
  - `REJECT` → 3
**A-14** verdict=`QUORUM_PLURALITY_A14-REVISE` (top=A14-REVISE 7/10)
  - `A14-PROMOTE` → **0**
  - `A14-CONDITIONS` → **1**
  - `A14-REVISE` → **7**
  - `A14-REJECT` → **0**
  - `REJECT` → 2
**A-15** verdict=`PLURALITY_A15-CONDITIONS` (top=A15-CONDITIONS 4/10)
  - `A15-PROMOTE` → **1**
  - `A15-CONDITIONS` → **4**
  - `A15-REVISE` → **3**
  - `A15-REJECT` → **0**
  - `REJECT` → 2
**A-16** verdict=`PLURALITY_A16-REVISE` (top=A16-REVISE 5/10)
  - `A16-PROMOTE` → **2**
  - `A16-CONDITIONS` → **1**
  - `A16-REVISE` → **5**
  - `A16-REJECT` → **0**
  - `REJECT` → 2
**A-17** verdict=`QUORUM_PLURALITY_A17-REVISE` (top=A17-REVISE 7/10)
  - `A17-PROMOTE` → **1**
  - `A17-CONDITIONS` → **0**
  - `A17-REVISE` → **7**
  - `A17-REJECT` → **0**
  - `REJECT` → 2

### sub-batch-3

**Bundle:** 77851 chars
**Engaged:** 10 · **Tangential:** 0 · **Silent:** 0
**Distinct objections:** 35
**Alignment:** 4.0% · ✅ PASS

Per-question tallies:
**A-18** verdict=`QUORUM_PLURALITY_A18-REVISE` (top=A18-REVISE 7/10)
  - `A18-PROMOTE` → **0**
  - `A18-CONDITIONS` → **3**
  - `A18-REVISE` → **7**
  - `A18-REJECT` → **0**
**A-19** verdict=`PLURALITY_A19-CONDITIONS` (top=A19-CONDITIONS 6/10)
  - `A19-PROMOTE` → **0**
  - `A19-CONDITIONS` → **6**
  - `A19-REVISE` → **4**
  - `A19-REJECT` → **0**
**A-20** verdict=`PLURALITY_A20-REVISE` (top=A20-REVISE 6/10)
  - `A20-PROMOTE` → **1**
  - `A20-CONDITIONS` → **3**
  - `A20-REVISE` → **6**
  - `A20-REJECT` → **0**
**A-23** verdict=`PLURALITY_A23-REVISE` (top=A23-REVISE 6/10)
  - `A23-PROMOTE` → **1**
  - `A23-CONDITIONS` → **2**
  - `A23-REVISE` → **6**
  - `A23-REJECT` → **0**
  - `REJECT` → 1
**A-26** verdict=`PLURALITY_A26-REVISE` (top=A26-REVISE 5/10)
  - `A26-PROMOTE` → **0**
  - `A26-CONDITIONS` → **4**
  - `A26-REVISE` → **5**
  - `A26-REJECT` → **0**
  - `REJECT` → 1


## All distinct objections (100 across all 3 sub-batches)
**01. [sub-batch-1 · Slot 1] Inconsistent topic naming across agents**

> Agent #9 §6.5 flags unresolved conflict between _registry.ts declaring '9.gtm.asset.v1' while spec uses '9.gtm.assessment.v1'. Agent #11 §4.1 shows _registry.ts missing 3 topics the implementation will emit. These SSOT violations create runtime MessageBus subscription failures.

**02. [sub-batch-1 · Slot 1] Phase 2 Executor authority escalation**

> Agent #7 §1 and Agent #10 §1 both plan Phase 2 Executors with 'auto_write_internal' + 'requires_human_gate' authority. But §7.4 for Agent #7 only mentions PR-and-preview pattern, not the dual-authority enforcement mechanism that CA-7 §15.5 requires for such elevated permissions.

**03. [sub-batch-1 · Slot 1] Rubric files not yet written**

> Agent #8 §6.4 admits the 5 scoring rubric files (uiUxRubric.js, apiRubric.js, etc.) don't exist and 'MUST be Panel-reviewed before Agent #8 ships'. The spec declares these as preconditions in §3.3 but provides no rubric content, making the agent unbuildable.

**04. [sub-batch-1 · Slot 1] Customer PII scrubbing incomplete**

> Agent #10 §6.4 risk #1 mentions extending scrubCredentials() per CA-10-E.2 to catch PII, but the spec doesn't specify WHERE this scrubbing happens - at ingestion endpoints, before MessageBus emission, or only at ProductSSOT write. This leaves PII exposure windows.

**05. [sub-batch-1 · Slot 1] Cross-agent dependency cycles**

> Agent #11 §5.3 shows it feeds Agent #26, which per CA-9-B feeds back to Agent #11 via '11.platform.discovery.v1' consumption. The specs don't define cycle-breaking logic or specify which agent initializes first.

**06. [sub-batch-1 · Slot 3] Lack of Clear Metrics**

> The proposal does not clearly define metrics for measuring the success of the agents, making it difficult to evaluate their effectiveness. For example, Agent #6 (Research) lacks specific metrics for evaluating the quality of the research brief.

**07. [sub-batch-1 · Slot 3] Insufficient Error Handling**

> The proposal does not provide sufficient details on error handling mechanisms for the agents. For instance, Agent #8 (Quality Audit) does not specify how it handles errors during the audit process.

**08. [sub-batch-1 · Slot 3] Overreliance on LLMs**

> The proposal relies heavily on Large Language Models (LLMs) for various tasks, which may lead to biases and inaccuracies. Agent #9 (Go-To-Market) uses LLMs for GTM readiness analysis, which may not always produce accurate results.

**09. [sub-batch-1 · Slot 4] Ambiguous Authority Elevation**

> The proposal for Agent #6 (Research) mentions that it has 'autonomous' operational-authority for ToolMenu adapter invocation. However, it is unclear how this authority is managed and whether there are sufficient safeguards to prevent misuse. The spec should explicitly detail the mechanisms for authority management and safeguards.

**10. [sub-batch-1 · Slot 4] Incomplete Security Controls**

> The security controls for Agent #8 (Quality Audit) are not fully detailed. Specifically, the spec does not describe how credentials are handled and secured, which is critical for ensuring the security of the agent's operations. The spec should include a comprehensive section on credential handling and security controls.

**11. [sub-batch-1 · Slot 4] Lack of Failure Handling**

> The proposal for Agent #10 (Monitor) does not adequately address failure scenarios. For example, what happens if the agent fails to ingest customer signals or if there is a disruption in the monitoring process? The spec should include detailed failure handling mechanisms and contingency plans.

**12. [sub-batch-1 · Slot 5] Insufficient Testing**

> The proposal lacks detailed information on the testing strategy and coverage for the new agents, which is critical for ensuring reliability and robustness.

**13. [sub-batch-1 · Slot 5] Complex Dependency Management**

> The proposal introduces multiple new agents with complex dependencies on existing agents and external services, which could lead to integration challenges and increased maintenance overhead.

**14. [sub-batch-1 · Slot 5] Potential for Data Leakage**

> The proposal mentions handling sensitive customer feedback and PII data, but the security measures to prevent data leakage are not thoroughly detailed, raising concerns about data privacy and compliance.

**15. [sub-batch-1 · Slot 6] Inconsistent topic naming**

> Agent #9's spec has a conflict between the `_registry.ts` topic name and the blueprint topic name, requiring reconciliation at engineering dispatch. This inconsistency could lead to confusion and errors during implementation and integration with other agents.

**16. [sub-batch-1 · Slot 6] Over-reliance on LLMs**

> Several agents (e.g., #6, #7, #8, #9, #10, #11) heavily rely on LLMs for core functionality. This introduces risks related to cost, latency, and the potential for inconsistent or inaccurate results due to prompt injection or model drift. The reliance on LLMs also makes the system vulnerable to API outages or changes from the LLM providers.

**17. [sub-batch-1 · Slot 6] Phase 2 deferral complexity**

> Many agents have deferred Phase 2 functionality (e.g., Agent #7, #9, #10), adding complexity to the implementation and testing process. The conditional logic and separate Executor registries introduce potential for errors and make it harder to reason about the system's behavior.

**18. [sub-batch-1 · Slot 6] Data quality gate thresholds**

> The data quality gate thresholds in Cluster B rely on `ProductRegistry.minimumDataQuality` or per-agent defaults. The clamping of these values (e.g., `bodyContentCharsMin` in Agent #6) could lead to unexpected behavior if the configured values fall outside the allowed range.

**19. [sub-batch-1 · Slot 7] Unvalidated rubric content**

> Agent #8's rubric files (uiUxRubric.js etc.) are not yet Panel-ratified per §6.4 risk 1. Shipping without validated scoring criteria risks inconsistent governance decisions and audit failures.

**20. [sub-batch-1 · Slot 7] Prompt injection in crawl**

> Agent #6's mitigation for adversarial crawl content (§6.4 risk 1) relies on system-quoted blocks, which may not prevent all instruction hijacking in modern LLMs. No adversarial testing evidence provided.

**21. [sub-batch-1 · Slot 7] PII scrub gaps**

> Agent #10's customer feedback scrubbing (CA-10-E.2) lacks validation for non-Western government IDs and novel PII patterns. Real-world precedent shows scrubbers often miss 5-15% of PII variants.

**22. [sub-batch-1 · Slot 8] Mode logic conflicts recur**

> Agent #6, #8, #9, and #10 all claim mode-agnostic behavior in one subsection, then later specify mode-specific Cluster C behavior and fallback semantics. In A-6/A-8/A-10 this matters because the same spec simultaneously says outputs are identical across modes and also changes block/degraded behavior by mode, which leaves implementers unclear on the actual control flow boundary.

**23. [sub-batch-1 · Slot 8] Topic naming is unresolved**

> Several specs admit `_registry.ts` topic names do not match the proposed emitted envelopes, especially Agent #9 (`9.gtm.asset.v1` vs `9.gtm.assessment.v1`) and Agent #11 (`11.brief.weekly.v1` plus charter-expansion topics). That is not a cosmetic mismatch: producers, consumers, and audit-log schema all need exact topic names, or the bus wiring will drift from the charter source of truth.

**24. [sub-batch-1 · Slot 8] Data-quality gates can deadlock**

> Agent #6 and Agent #8 both define Cluster B halts that depend on upstream content thresholds, but they also treat missing enrichment as either hard-halt or degrade-on-any depending on mode and source. Because step-1 Research is the entrypoint and step-4 Audit depends on Research + Design + Build, an overly strict gate can block the entire pipeline on partial-but-sufficient real-world content, with no clear recovery path besides manual re-run.

**25. [sub-batch-1 · Slot 8] Audit/SSOT write scope is too broad**

> Agent #10’s spec adds ProductSSOT `architecture_snapshot` and `delta_log` writes, while Agent #8 writes governance records and Agent #9 writes GTM assessments, but the exact field ownership is not consistently partitioned. Without a tighter schema contract, these agents can overwrite or semantically collide on the same SSOT record family, creating invisible state corruption that a later audit will treat as authoritative.

**26. [sub-batch-1 · Slot 9] Insufficient input validation**

> §3.3 Preconditions for Agent #6 Research do not explicitly validate the `targetUrl` for potential SSRF risks. The HTTPS check is mentioned, but it doesn't cover all potential risks.

**27. [sub-batch-1 · Slot 9] Lack of detailed error handling**

> §4.3 Postconditions for Agent #6 Research do not specify how errors are handled when emitting `6.research.brief.v1`. The spec should clarify the error handling mechanism.

**28. [sub-batch-1 · Slot 9] Unclear budget enforcement**

> §5.5 Cluster A integration for Agent #6 Research states that it emits `agent.cost.signal.v1` but does not self-enforce budget caps. The spec should clarify how budget enforcement is handled across agents.

**29. [sub-batch-1 · Slot 10] executorKey field addition lacks migration**

> §14.1 describes `executorKey` as a backwards-compatible addition to every audit-log row (including canonical `fix_applied` topic) but provides no migration, schema evolution, or query-update path for the existing 365-day hot Supabase rows or cold snapshots.

**30. [sub-batch-1 · Slot 10] Cluster C mode field inconsistency**

> Agent #8 §5.5 Cluster C mandates `pipelineMode` field per Cluster C §2.4 v2 R2 while Agent #6 §5.5 and Agent #7 §5.5 explicitly omit the field for P1 agents; no reconciliation rule exists in the cluster template or §22 Product-Agnostic Rule.

**31. [sub-batch-1 · Slot 10] Unresolved topic naming conflicts**

> Agent #9 §6.5 flags `_registry.ts` `9.gtm.asset.v1` vs implementation `9.gtm.assessment.v1` and defers to engineering dispatch; identical unresolved naming notes appear for Agent #11 G11-Q4 and Agent #10 produces list without matching `_registry.ts`.

**32. [sub-batch-2 · Slot 1] Cross-tenant scope ambiguity**

> Agent #12 §6.4 risk #1 and Agent #16 §6.4 risk #2 both flag 'flowai-only scope ambiguity' as unresolved. Multiple agents operating with unclear tenant boundaries creates systemic data leakage risk when the §22 Product-Agnostic Rule permits multi-tenant deployments.

**33. [sub-batch-2 · Slot 1] Watermark spec dependency blocks Phase 2**

> Agent #13 §6.4 risk #1 identifies 'Watermark spec missing' as blocking Phase 2 implementation. The spec declares watermark rotation as a core capability but has no canonical specification for generation, embedding, or rotation cadence, making the 24 W-hour Phase 2 estimate unreliable.

**34. [sub-batch-2 · Slot 1] Legal liability without counsel review**

> Agent #14 §6.4 risk #1 flags that LLM-generated compliance assessments could be treated as legal opinions. While §10 G14-Q1 proposes review options, the spec ships with 'advisory-only' default and no mandatory counsel review gate, exposing operators to regulatory liability.

**35. [sub-batch-2 · Slot 1] Benchmark cost spiral uncapped**

> Agent #15 §6.4 risk #2 estimates $1,125/month baseline cost for benchmarking. With no hard cost cap mechanism beyond Agent #23's enforcement, a growing candidate pool could exponentially increase costs as the 30-invocation × capabilities × candidates formula scales.

**36. [sub-batch-2 · Slot 2] Lack of Clear Goals**

> The proposal lacks clear goals and objectives for each agent, making it difficult to evaluate their effectiveness and prioritize development.

**37. [sub-batch-2 · Slot 2] Insufficient Testing**

> The proposal does not provide sufficient information on testing and validation procedures for each agent, which could lead to errors and inconsistencies in the system.

**38. [sub-batch-2 · Slot 2] Overreliance on LLMs**

> The proposal relies heavily on Large Language Models (LLMs) for various tasks, which could lead to biases, errors, and dependencies on external services.

**39. [sub-batch-2 · Slot 3] Lack of Clear Metrics**

> The proposal lacks clear metrics for measuring the success of the agents, making it difficult to evaluate their effectiveness. For example, Agent #12's success is measured by the number of products assessed, but there is no clear definition of what constitutes a 'product' in this context.

**40. [sub-batch-2 · Slot 3] Insufficient Error Handling**

> The proposal does not provide sufficient information on how errors will be handled, particularly in cases where the agents encounter unexpected input or system failures. This could lead to unintended consequences, such as data corruption or system crashes.

**41. [sub-batch-2 · Slot 4] Incomplete Mode Behavior Definition**

> The proposal for Agent #12 does not clearly define how the agent behaves in different modes (e.g., Mode 1, Mode 2, Mode 3). The 'Mode behavior' section is vague and does not specify the exact differences in behavior across modes.

**42. [sub-batch-2 · Slot 4] Lack of Detailed Security Controls**

> The security controls section is too general. It does not specify how credentials are handled in different scenarios or how data exfiltration is controlled in detail. There is also no mention of how the agent handles potential security threats.

**43. [sub-batch-2 · Slot 4] Insufficient Cost Analysis**

> The cost analysis for running the agent is not detailed enough. It mentions a weekly cost but does not break down the costs associated with each component or the potential cost implications of scaling the agent's operations.

**44. [sub-batch-2 · Slot 5] Insufficient Testing**

> The proposal lacks detailed testing plans and acceptance criteria for the new agents, which could lead to undetected issues in production.

**45. [sub-batch-2 · Slot 5] Complex Dependencies**

> The agents have complex dependencies on other agents and external services, which could introduce integration challenges and increase the risk of failures.

**46. [sub-batch-2 · Slot 5] Security Risks**

> The proposal does not adequately address potential security risks, such as data exfiltration and unauthorized access, which could compromise sensitive information.

**47. [sub-batch-2 · Slot 6] Inconsistent Mode Classification**

> Agent #17 has conflicting mode classifications between `_registry.ts` (cross-step) and the blueprint (always-on), as noted in G17-Q1. This inconsistency could lead to confusion during implementation and potentially incorrect scheduling of the agent's tasks.

**48. [sub-batch-2 · Slot 6] Ambiguous `flowai-only` Scope**

> Agents #12 and #16 both rely on the `flowai-only` scope, but the exact meaning of this scope is ambiguous, especially in multi-tenant FlowAI deployments, as highlighted in G12-Q1 and G16-Q1. This ambiguity could lead to unintended cross-tenant data access or incorrect data aggregation.

**49. [sub-batch-2 · Slot 6] Cost Overruns**

> Agent #15's benchmarking cycle has a potentially high cost ($1,125/month baseline), as noted in G15-Q2. Without careful cost management, this could lead to budget overruns and potentially limit the agent's functionality.

**50. [sub-batch-2 · Slot 6] Legal Liability (DMCA)**

> Agent #13's DMCA filing capability introduces legal liability risks, as mentioned in §6.4 risk #2. Auto-generated DMCA letters are legal artifacts, and legal counsel involvement is required to mitigate potential legal issues.

**51. [sub-batch-2 · Slot 6] Data Quality Gate Exception**

> Agent #13 makes an exception to the canonical halt semantic in Cluster B, where an empty edge-log batch should not halt the agent. This exception could lead to inconsistencies in the overall data quality gate behavior and make it harder to reason about the system's behavior.

**52. [sub-batch-2 · Slot 7] Unresolved Legal Liability (Agent #13)**

> Agent #13 §6.4 Risk #2 identifies DMCA auto-generation as a legal liability without concrete mitigation. The spec lacks mandatory legal counsel review gates before filing, creating exposure to erroneous takedown notices that could trigger lawsuits.

**53. [sub-batch-2 · Slot 7] Cost Governance Gap (Agent #15)**

> Agent #15 §6.4 Risk #2 estimates $1,125/month baseline costs without hard enforcement in Cluster A integration. The cost-signaling mechanism lacks automatic budget halts, risking unbounded spending during benchmark cycles.

**54. [sub-batch-2 · Slot 7] Scope Enforcement Weakness (Agent #16)**

> Agent #16 §10 G16-Q1 leaves 'flowai-only' scope ambiguity unresolved. Without explicit RLS or schema guards, cross-tenant data leakage could occur via productivity reports if deployed in multi-tenant configurations.

**55. [sub-batch-2 · Slot 7] Watermark Spec Absence (Agent #13)**

> Agent #13 §8.2 defers watermark rotation to Phase 2 but provides no spec for generation/embedding. This blocks core IP protection functionality and creates a single point of failure for Phase 2 deployment.

**56. [sub-batch-2 · Slot 8] Cross-tenant scope ambiguity**

> §3.1–§3.3 and §7.3 say `flowAiOnly: true`, but the agent also consumes portfolio-wide signals, vendor maps, and “all step agents across all in-scope products.” The spec never cleanly defines whether a single FlowAI deployment may aggregate across multiple tenants, or whether `flowAI-only` means one tenant’s internal portfolio only. That ambiguity is not cosmetic: it affects RLS, data retention, and whether the agent can legally observe cross-product relationships at all.

**57. [sub-batch-2 · Slot 8] Vendor allowlist is underspecified**

> §6.4 and G12-Q2 acknowledge that “all 5 on Vercel” may be canonical yet risk-flagged, but the spec only says a per-vendor allowlist is “ratified by Panel” without a concrete default policy. Because the same mechanism is supposed to detect real concentration risk, an allowlist can easily erase legitimate alerts or become a permanent exception list that operators stop maintaining. This is especially dangerous for the core use case of shared-vendor outage detection.

**58. [sub-batch-2 · Slot 8] LLM classification on noisy aggregates**

> §2 and §5.5 Cluster B make the agent partly rule-based and partly LLM-classified, but the output contract in §4.2 is a hard canonical alert envelope with P0/P1/P2 severity. The spec does not define a deterministic tie-breaker when the LLM and rules disagree, nor does it require confidence thresholds for emitting `12.fire.p0.v1`. That creates a route for spurious P0 alerts from weak evidence, or for suppressed fires if the LLM is budget-downgraded or degraded.

**59. [sub-batch-2 · Slot 8] Synchronous P0 SLA is brittle**

> §4.3 and §7.4 require synchronous P0 emission plus admin notification within 60 seconds. For a cross-step weekly job pulling from ColdStore, ProductSSOT, MessageBus, and optional Anthropic analysis, the spec offers no fallback if one feeder is delayed or the notification adapter is down. In practice, a 60-second hard SLA without a retry/queue contract will translate into dropped or duplicated critical alerts.

**60. [sub-batch-2 · Slot 9] Lack of explicit error handling**

> §6 Implementation Plan lacks explicit error handling strategies for critical components like Agent #12's cross-tenant aggregation and Agent #13's threat classification.

**61. [sub-batch-2 · Slot 9] Insufficient security controls**

> §7 Security Controls for Agent #14 and Agent #17 rely heavily on Anthropic API without discussing potential risks or mitigations for LLM-generated content.

**62. [sub-batch-2 · Slot 9] Ambiguity in mode classification**

> Agent #17's mode is classified differently in `_registry.ts` (cross-step) and the blueprint (always-on), creating ambiguity that needs resolution.

**63. [sub-batch-2 · Slot 10] Agent12 Cluster B threshold too low**

> §5.5 Cluster B sets pageCountMin:1 (clamped [1,50]) for portfolio signals despite explicit precondition of ≥3 products in §3.3; this allows degraded 'portfolio.fire.v1' emission on single-product data violating the cross-product aggregation charter in §2.

**64. [sub-batch-2 · Slot 10] Agent13 missing watermark spec blocks Phase2**

> §6.4 risk #1 and §8.2 explicitly defer watermark generation/rotation to Phase2 with no canonical spec, yet §4.1 and §7.1 already declare Phase2 DMCA + Cloudflare actions; this creates an unresolvable dependency before any EXECUTOR_REGISTRY entry can be wired.

**65. [sub-batch-2 · Slot 10] Agent15 cost cap absent from Cluster A**

> §6.4 states ~$1,125/month baseline with 30 invocations × 5 capabilities × 5 candidates, yet Cluster A §5.5 only emits agent.cost.signal.v1 without any reserve() enforcement or hard cap, leaving the Locked Rule 18 rolling minimum unprotected.

**66. [sub-batch-3 · Slot 1] Agent #26 authority contradiction**

> Agent #26 spec §5.5 Cluster E declares that per v2 R3, the agent's primary charter REVERTS to recommend_only with authority moved to a sibling executor. But §1 and §2 still claim the agent itself holds dual-authority [auto_write_internal, requires_human_gate], creating a direct contradiction about where admission-write authority lives.

**67. [sub-batch-3 · Slot 1] Cost Governor circular dependency**

> Agent #23 (Cost Governor) §5.5 Cluster A states it OWNS the cost-governor template and implements costGovernor.reserve/settle/heartbeat. But the spec also says Agent #23's own LLM dispatches emit agent.cost.signal.v1 to be governed by... itself. This creates a circular dependency where the governor must govern its own governance operations.

**68. [sub-batch-3 · Slot 1] Environmental carbon factors undefined**

> Agent #20 §6.4 identifies 'Carbon-emission factor data source' as a key engineering risk with no resolution. The spec defers to G20-Q1 but provides no fallback if third-party APIs are unavailable. Without emission factors, the agent cannot compute CO₂e estimates, making its core function impossible.

**69. [sub-batch-3 · Slot 1] Business Planning drift baseline missing**

> Agent #18 escalation policy triggers alerts when plans deviate ±15% from 'prior baseline' but never defines what constitutes the baseline. §6.4 mentions 'rolling 3-month baseline' as mitigation but this isn't specified in the output contract or implementation plan, making drift detection non-deterministic.

**70. [sub-batch-3 · Slot 2] Lack of Clear Metrics**

> The proposal lacks clear metrics for measuring the success of the agents, making it difficult to evaluate their effectiveness. For example, Agent #18's output shape does not include any metrics for measuring the impact of its recommendations.

**71. [sub-batch-3 · Slot 2] Insufficient Error Handling**

> The proposal does not provide sufficient details on error handling mechanisms for the agents. For instance, Agent #19's escalation policy does not specify how errors will be handled in case of a critical CVE alert.

**72. [sub-batch-3 · Slot 2] Overly Complex Architecture**

> The proposal's architecture is overly complex, with multiple agents and clusters interacting with each other. This complexity may lead to difficulties in maintenance, debugging, and scalability. For example, Agent #23's cost governor functionality is tightly coupled with the Orchestra cost-ledger, making it challenging to modify or replace either component without affecting the other.

**73. [sub-batch-3 · Slot 3] Lack of Clear Metrics**

> The proposal does not provide clear metrics for measuring the success of the agents, making it difficult to evaluate their effectiveness. For example, Agent #18's output shape does not include any metrics for measuring the impact of its recommendations.

**74. [sub-batch-3 · Slot 3] Overreliance on External Services**

> The proposal relies heavily on external services such as Anthropic and OpenRouter, which may introduce additional risks and dependencies. For example, Agent #20's carbon-emission factor data source is not clearly specified, which could lead to inconsistencies in its output.

**75. [sub-batch-3 · Slot 4] Unclear escalation policy**

> The escalation policy in §7.4 for Agent #18 is ambiguous. The phrase 'Material plan drift triggers admin alerts' lacks specific criteria for what constitutes 'material plan drift.' This could lead to inconsistent alerting and potential oversight of critical issues.

**76. [sub-batch-3 · Slot 4] Potential data leakage**

> In §7.2, the recommendations contain `productId` references but no operator-product user PII. However, there is no explicit mechanism to ensure that these `productId` references do not inadvertently expose sensitive information. This could lead to data leakage if not properly managed.

**77. [sub-batch-3 · Slot 4] Inadequate cost control**

> The cost estimation in §6.4 mentions a monthly cross-product LLM analysis cost of ~$2–$5/month. However, there is no mechanism to monitor and control these costs if they exceed the estimated range. This could lead to unexpected financial burdens.

**78. [sub-batch-3 · Slot 5] Incomplete Cluster Integration**

> The spec for Agent #18 has incomplete integration with Cluster A, specifically the cost-governor template, which needs to be fixed before Wave 1 build.

**79. [sub-batch-3 · Slot 5] Data Quality Gate Threshold**

> The data quality gate threshold for Agent #19 is set to a default of 1, which may not be sufficient for meaningful strategic planning and could lead to false positives.

**80. [sub-batch-3 · Slot 5] Carbon Emission Factor Data Source**

> The choice of carbon emission factor data source for Agent #20 is not clearly defined, which could lead to inaccuracies in carbon footprint estimations.

**81. [sub-batch-3 · Slot 6] Audit Log Granularity**

> The audit log topics in §14 are too granular.  For example, `proposal_approved`, `proposal_modified`, and `proposal_skipped` could be consolidated into a single `proposal_event` topic with a `type` field, reducing complexity and improving maintainability.

**82. [sub-batch-3 · Slot 6] Agent #26 Authority Reversion**

> Cluster E for Agent #26 reverts the dual-authority charter to `recommend_only`, delegating the auto-admission write path to a new `orchestra-research-executor`. This change requires CEO re-disposition of CA-9-Q4=(b), which is not guaranteed and introduces uncertainty.

**83. [sub-batch-3 · Slot 6] Cost Governor Mode Ambiguity**

> For Agent #23, the `_registry.ts` declares step-owner mode, while W3 recommends cross-step. This discrepancy needs resolution, as it affects the detector accuracy and overall functionality of the Cost Governor.

**84. [sub-batch-3 · Slot 6] Agent #18 Drift Threshold Subjectivity**

> The ±15% drift threshold for Agent #18's business plans is subjective and depends on baseline accuracy.  The mitigation of a rolling 3-month baseline and `baselineConfidence` flag may not be sufficient to prevent false positives or missed alerts.

**85. [sub-batch-3 · Slot 7] Agent #26 registry mismatch**

> Agent #26 spec depends on _registry.ts expansion to 26 agents (§6.2), but validateRoster() enforces 25-agent limit. This creates deployment-time failure risk if not resolved before Wave 1 build.

**86. [sub-batch-3 · Slot 7] Agent #23 mode conflict**

> Agent #23 spec recommends cross-step mode (§5.1) but _registry.ts declares step-owner. This creates integration inconsistency affecting anomaly detection accuracy across pipeline phases.

**87. [sub-batch-3 · Slot 7] Agent #19 deduplication risk**

> CVE deduplication window (§6.4 risk #2) uses 24h fixed period without version-stamp validation. Could suppress critical CVE updates if same CVE ID is reused for severity upgrades within window.

**88. [sub-batch-3 · Slot 7] Agent #18 drift subjectivity**

> ±15% drift threshold (§2, §7.4) lacks industry-standard justification. Rolling baseline mitigation doesn't account for black swan events, potentially delaying critical CEO alerts during market disruptions.

**89. [sub-batch-3 · Slot 7] Agent #20 data source gap**

> Carbon-emission factors (§3.2) lack specified source (G20-Q1). Static fallback risks outdated estimates, while API dependency creates cost/availability uncertainty for sustainability reporting.

**90. [sub-batch-3 · Slot 8] Topic/schema split unresolved**

> Agent #18’s §4.1 says `_registry.ts` produces only `18.plan.update.v1`, while §5.5 declares a canonical migration to `18.business_plan.v1` plus `18.strategic_recommendation.v1` and a dual-emit window. That is not a harmless naming preference: downstream consumers, audit schemas, and tests will diverge unless the registry, MessageBus schema, and migration plan are made singular and explicit.

**91. [sub-batch-3 · Slot 8] Cross-cluster inputs are underdefined**

> §5.2 hard-depends on Agents #11, #12, #17 and also pulls in Agent #9 and #10 by convention, but §3.1 consumes only `10.health.v1` and `portfolio.health.v1`. The spec never reconciles which upstream signals are authoritative, what happens when some are absent, or whether a partial corpus is acceptable versus silently biasing recommendations.

**92. [sub-batch-3 · Slot 8] Drift threshold is operationally brittle**

> §2 and §7.4 use a flat ±15% prior-baseline drift alert rule, but §6.4 admits baseline accuracy is subjective and only suggests a rolling 3-month baseline. Without category-specific thresholds or confidence gating, small pricing/allocation swings can trigger noisy W0 alerts, while genuinely dangerous changes in one category may be masked by stability in another.

**93. [sub-batch-3 · Slot 8] Authority model is unclear**

> The spec says build-authority is recommend_only, operational-authority is autonomous for corpus assembly, but §5.4 says mode-agnostic internal planning regardless of operator mode and downstream consumers include the CEO dashboard and admin UI. That combination leaves open who can approve, who can override, and whether ‘advisory only’ is actually enforced or merely asserted.

**94. [sub-batch-3 · Slot 8] Cost-governor integration is self-referential**

> §5.5 Cluster A makes Agent #23 the canonical enforcement owner of `agent.cost.signal.v1`, while §5.5 Cluster F gives Agent #18 its own LLM model-tier selection. The proposal does not define a hard precedence for cost signaling versus model-budget fallback when the budget governor itself is the consumer and producer of budget-adjacent events, so feedback-loop failures are plausible.

**95. [sub-batch-3 · Slot 9] Inconsistent Topic Naming**

> Agent #18, #19, #20, and #23 have inconsistent topic naming conventions. For example, Agent #18 emits `18.plan.update.v1`, `18.business_plan.v1`, and `18.strategic_recommendation.v1`. The spec should reconcile these differences before promotion.

**96. [sub-batch-3 · Slot 9] Lack of Clear Escalation Policy**

> Agent #23's escalation policy is marked as 'Reserved Step-Owner charter — escalate to #1 on any side effect attempt.' This needs to be updated post-disposition. A clear escalation policy should be defined for all agents.

**97. [sub-batch-3 · Slot 9] Authority Handling in Agent #26**

> Agent #26's authority handling is complex, with a dual-authority charter and a new Executor sibling. The spec should clarify how authority will be handled and ensure that the `BaseAgent.guard()` correctness is verified.

**98. [sub-batch-3 · Slot 10] Topic naming mismatch §4.1**

> Agent #18 §4.1 and §5.5 Cluster D declare _registry.ts emits only 18.plan.update.v1 yet implementation adds 18.business_plan.v1 + 18.strategic_recommendation.v1 with 30-day dual-emit window; no migration test or rollback specified in §6.4.

**99. [sub-batch-3 · Slot 10] Registry mutation risk §6.1**

> Agent #26 §6.1 requires editing validateRoster() and id-range checks in _registry.ts (currently enforces exactly 25 entries at line 550); change can break the 25 SHIPPED-GREEN agents if any expectation test hard-codes roster length.

**100. [sub-batch-3 · Slot 10] Dual-authority guard bypass §5.5**

> Agent #26 Cluster E v2 R3 moves auto_write_internal to sibling Executor but primary spec still references CA-9-Q4=(b) dual-authority; BaseAgent.guard() membership check is new at primary layer with no adversarial test case in §9 AC-26.
