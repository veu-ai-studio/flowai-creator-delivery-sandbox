# Job 8 — MessageSchema Topic Flow Analysis

## Method

For every topic in `MessageSchema.TOPICS`, walk every charter `produces`/`consumes` array in `src/lib/agents/` and tag the topic as `produced`, `consumed`, both, or neither.

## Available data

| Source | Charters present |
|---|---|
| `src/lib/agents/*.js` (excluding `BaseAgent.js`, `MessageSchema.js`) | None |

## Topics defined in MessageSchema (44 total)

```
1.product.lifecycle_event.v1     1.product.gate_request.v1
2.build.completed.v1              2.build.failed.v1
3.renewal.candidate.v1            3.renewal.applied.v1
4.provider.onboarded.v1           4.provider.suspended.v1
5.endcustomer.intake.completed.v1
6.research.brief.v1
7.design.spec.v1
8.audit.requested.v1              8.audit.completed.v1
9.gtm.asset.v1
10.metric.v1                       10.health.v1                 10.anomaly.v1
11.brief.weekly.v1                 11.alert.material.v1         11.trajectory.report.v1
12.fire.p0.v1                      12.fire.p1.v1                12.fire.p2.v1
12.health.daily.v1
13.threat.detected.v1              13.signature.update.v1       13.dmca.filed.v1
14.regulation.new.v1               14.regulation.update.v1      14.compliance.brief.weekly.v1
15.benchmark.report.v1
16.productivity.report.v1
17.evolution.proposal.v1
18.plan.update.v1
19.tech.signal.v1
20.impact.assessment.v1
portfolio.fire.v1                  portfolio.health.v1
system.governance.score.v1         system.readiness.score.v1    system.clearance.decision.v1
```

## Producer / consumer matrix

Every topic has **0 producers** and **0 consumers** declared anywhere in `src/lib/agents/` because no per-agent file exists.

## Dead-topic / orphan-dependency report

Strictly speaking, all 44 topics are simultaneously **dead** (never produced) and **orphaned** (never consumed) — but the cause is "no agents written yet," not a real wiring defect.

## Topics with payload validators (the smaller, enforcement-level subset)

Of the 44 topics, only these have a payload schema in `PAYLOAD_VALIDATORS`:

| Topic | Required fields |
|---|---|
| `10.metric.v1` | surface, metric, value (finite number), unit |
| `10.anomaly.v1` | surface, metric, observed, expected, severity ∈ {low, medium, high} |
| `12.fire.p0.v1` | title, affectedSurfaces (non-empty array), detectedAt, evidence |
| `12.fire.p1.v1` | title, affectedSurfaces, detectedAt, evidence |
| `12.fire.p2.v1` | title, pattern, window |
| `13.threat.detected.v1` | signatureId, surface, evidence |
| `13.signature.update.v1` | signatureId, pattern, severity |
| `14.regulation.new.v1` | jurisdiction, citation, summary, effectiveDate |
| `system.governance.score.v1` | targetType, targetId, score (0–100), rubricVersion |
| `system.readiness.score.v1` | targetType, targetId, score (0–100), rubricVersion |
| `system.clearance.decision.v1` | targetType, targetId, governanceScore, readinessScore, decision ∈ {CLEAR, DO_NOT_ACCEPT} |

The other 33 topics (~75%) have no payload validator. These would pass envelope validation with any payload object. That is a latent gap once agents start emitting.

## Recommendations

- Add payload validators for the lifecycle, build, renewal, provider, intake, design, GTM, weekly briefs, regulation update, benchmark, productivity, evolution, plan, tech-signal, impact, and portfolio rollup topics before any agent goes live.
- Re-run this analysis once `src/lib/agents/NN-*.js` files exist.
