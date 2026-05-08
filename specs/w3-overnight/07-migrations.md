# Job 7 — Supabase Migration Audit

## Migration files present

`Glob supabase/**/*.sql` returns three files:

| Number | File | Purpose | Tables / objects created |
|---|---|---|---|
| 0001 | `supabase/migrations/0001_initial.sql` | FlowAI / VEUaaS multi-tenant baseline schema. | `organizations`, `users`, `organization_members`, `products`, `workspaces`, `workspace_runs`, `run_steps`, `cost_events`, `clearance_checks`, `user_sessions`, **`audit_log`**; RPC `increment_product_cost`; trigger `_touch_updated_at`. RLS scaffolding on all tables. |
| 0002 | `supabase/migrations/0002_super_customer.sql` | Super Customer Agent persistence (the V2 surface-crawler audit, **not** W3 governance). | **`audit_runs`**, **`audit_surfaces`**, **`audit_issues`**; view `audit_runs_with_open_issues`; RLS scaffolding. |
| 0004 | `supabase/migrations/0004_tool_marketplace.sql` | Tool Intelligence Marketplace. | `tool_categories`, `tools`, `tool_capabilities`, `tool_rankings`, `tool_outcomes`, `tool_recommendations`, `marketplace_provider_preferences`; RLS scaffolding. |

## Gaps

- **`0003_*.sql`** — ❌ MISSING. Migration numbering jumps from 0002 → 0004. Either it was never authored, or it was renumbered and the pointer was not updated. Worth confirming with whoever wrote 0004 before W3 picks the next number.
- **`0005_*.sql` … `0009_*.sql`** — none present.
- **`0010_*.sql`** — ❌ NOT PRESENT. The user prompt cites a W0 ruling that **0010 is reserved for W3 audit infrastructure tables (`defect`, `audit_run`, `disagreement`)**. No such file exists.

## Conflict / collision risk for the reserved 0010

A naive 0010 implementation would collide with names already in use:

| Proposed W3 table (per W0) | Collision risk | Reason |
|---|---|---|
| `defect` | ⚠️ Soft collision with `audit_issues` (0002). | Same conceptual role — bug/severity rows. Different schema, different producer (Super Customer Agent vs. ScoreEvaluator). W3 must pick a non-overloaded name (e.g., `governance_defects` or `clearance_defects`) **or** explicitly reuse `audit_issues`. |
| **`audit_run`** | ❌ **Hard collision** with **`audit_runs`** (0002). | Plural already taken. Singular form (`audit_run`) is technically a different table name in Postgres but is confusing as hell. **Strongly recommended:** rename the W3 table (e.g., `governance_audit_runs` or `clearance_runs`) **before** 0010 is authored. |
| `disagreement` | ✅ No collision. | Brand-new concept (auditor-of-auditor disagreement records, T = 5 / T2 = 10 thresholds). |

Additional table-namespace overlaps to be aware of:
- `audit_log` (0001) is a different concept (per-action governance trail). The W3 `audit_run` is a per-evaluation summary. Naming should keep this distinction obvious.
- `audit_surfaces` and `audit_issues` (0002) are owned by the **Super Customer Agent**; W3 governance audits are a different workstream entirely. Avoid reusing the `audit_*` prefix unless the W3 contributor explicitly wants the conceptual link.

## Recommended action items for W3

1. **Decide whether `0003_*` was a renumber.** If yes, document it. If no, leave the number free.
2. **Pick non-conflicting names** for the W3 tables. Suggested:
   - `governance_evaluations` (replaces "audit_run")
   - `governance_defects` (replaces "defect", or alternatively reuse `audit_issues` with a `source` column)
   - `auditor_disagreements` (replaces "disagreement") — should include `t1_score`, `t2_score`, `disagreement_delta`, `triggered_third_run`, `triggered_w0_escalation` columns.
3. **Author `0010_w3_audit_infra.sql`** under `supabase/migrations/`, gated on the table-name decision above.

## Conclusion

- 3 migrations present (0001, 0002, 0004); 0003 is a numbering gap; 0010 is reserved-but-unwritten.
- W3 reserved migration not yet authored.
- Two real collision risks (`audit_runs` plural vs. proposed `audit_run` singular; `defect` vs. existing `audit_issues`) need resolution before 0010 is written.
