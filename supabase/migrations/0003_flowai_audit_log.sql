-- 0003_flowai_audit_log.sql
-- FlowAI Agent #1 Lifecycle Engine — permanent governance lineage trail.
--
-- Authorship:    schema authored by W2 (per W1 Q2/D ruling); applied by W1.
-- Consumer:      createSupabaseColdStore at
--                src/lib/agents/orchestrator/adapters/supabaseColdStore.ts
--                (write-only, server-side, service_role).
-- First writer:  Agent #1 Lifecycle Engine (commit d712993). Every run through
--                plan() → act(), every attachBusSubscriptions() handler firing,
--                and every direct recordLineage() call appends one row here.
--                Future agents (2–20) will write under their own agent_id.
-- Slot 0003:     was the unfilled gap between 0001_initial, 0002_super_customer,
--                0004_tool_marketplace.
--
-- Schema source-of-truth:
--   - AuditEntry interface at src/lib/agents/orchestrator/OrchestratorHub.ts:54-65
--   - Row shape produced by supabaseColdStore.append() at lines 90-103
--   DO NOT rename columns without updating the adapter; the adapter does the
--   JS-camelCase → SQL-snake_case mapping explicitly.
--
-- Multi-tenancy:
--   This table intentionally does NOT carry org_id / product_id. The audit
--   lineage is a global control-plane record of governance decisions, not
--   tenant business state. Tenant-scoped audit data lives in audit_log
--   (0001) and audit_runs (0002).

-- ─── flowai_audit_log ──────────────────────────────────────────────────
create table if not exists flowai_audit_log (
  id              uuid primary key default gen_random_uuid(),
  run_id          text not null,
  step_key        text not null,
  phase           text not null,                                       -- AuditPhase enum, TS-enforced (no DB check — avoids coupling on enum churn)
  at              timestamptz not null,                                -- when the governance decision occurred
  attempt         integer,                                             -- nullable — only step.attempt.* phases set this
  error_message   text,                                                -- nullable — only failure phases set this
  agent_id        integer check (agent_id is null or agent_id between 1 and 20),  -- locked roster
  authority       text,                                                -- recommend_only | draft_only | auto_contain_known | auto_write_internal | requires_human_gate
  idempotency_key text,                                                -- nullable — set on step.idempotent_hit
  meta            jsonb,                                               -- free-form per-phase metadata (Object.freeze'd in JS before insert)
  created_at      timestamptz not null default now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────
-- Query patterns served (from supabaseColdStore.ts header + W02 dispatch):
--   1. "all lineage for a run, time-ordered"        → (run_id, at desc)
--   2. "all rows of a given phase, time-ordered"    → (phase, at desc)
--   3. "what has agent N done in the last 24h"      → (agent_id, at desc)
--   4. "lookup by idempotency_key for replay-safety"→ (idempotency_key) partial
create index if not exists idx_flowai_audit_log_run_id
  on flowai_audit_log(run_id, at desc);
create index if not exists idx_flowai_audit_log_phase
  on flowai_audit_log(phase, at desc);
create index if not exists idx_flowai_audit_log_agent_id
  on flowai_audit_log(agent_id, at desc)
  where agent_id is not null;
create index if not exists idx_flowai_audit_log_idempotency
  on flowai_audit_log(idempotency_key)
  where idempotency_key is not null;

-- ─── RLS scaffolding ──────────────────────────────────────────────────
-- service_role (used by the API server and the ColdStore adapter) bypasses
-- RLS — that is how Agent #1 writes here. anon and authenticated roles
-- receive zero rows / no inserts because no policies exist for them.
-- This matches the pattern established in 0001_initial.sql (audit_log) and
-- 0002_super_customer.sql (audit_runs / audit_surfaces / audit_issues).
-- TODO(later): explicit anon-deny policies once Clerk JWT verification lands
-- and a per-tenant audit-trail view is added on top of this table.
alter table flowai_audit_log enable row level security;

-- New Supabase projects no longer expose newly-created public tables to the
-- Data API automatically. The server-side run store uses the service role and
-- needs only append/read access; browser roles intentionally receive nothing.
grant select, insert on table flowai_audit_log to service_role;

comment on table flowai_audit_log is
  'FlowAI control-plane lineage trail. One row per governance decision by Agent #1 (today) and #2-#20 (future). Server-only, write-via-service_role.';
