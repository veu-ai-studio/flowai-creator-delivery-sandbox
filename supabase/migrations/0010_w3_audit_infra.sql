-- 0010_w3_audit_infra.sql
-- W3 audit infrastructure tables. Owner: W3 territory.
--
-- Three tables:
--   * defect       — per-failure rows from ScoreEvaluator.toDefectRegister()
--   * audit_run    — primary + meta + third-run governance/readiness pairs
--   * disagreement — links two audit_runs whose delta triggered the protocol
--
-- Naming note (W0 ruling, 2026-05-11): the brief's literal names
-- `defect` / `audit_run` (singular) / `disagreement` are used here. These do
-- NOT collide with the Super Customer Agent's plural `audit_runs` table from
-- `0002_super_customer.sql`, nor with `audit_issues` (also from 0002). Postgres
-- treats `audit_run` and `audit_runs` as distinct identifiers. If a reader is
-- looking for the Super Customer Agent's run records, see 0002.
--
-- These are FlowAI control-plane tables, not tenant data, so they do not
-- carry org_id (consistent with `flowai_audit_log` in 0003). RLS scaffolding
-- is deferred to a later migration once Clerk JWTs are wired (same pattern as
-- 0001/0002/0004/0005).

-- ─── defect ────────────────────────────────────────────────────────────
create table if not exists defect (
  id text primary key,                                  -- ${targetType}_${targetId}_${criterionId}_${evaluatedAt}
  subject_id text not null,                             -- e.g. 'agent:8' or 'product:saige'
  severity text not null check (severity in ('P0','P1','P2','P3')),
  status text not null default 'open' check (status in ('open','resolved','wontfix')),
  opened_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolution_note text
);

create index if not exists idx_defect_subject  on defect(subject_id, status);
create index if not exists idx_defect_status   on defect(status, opened_at desc);
create index if not exists idx_defect_severity on defect(severity, status);

-- ─── audit_run ─────────────────────────────────────────────────────────
create table if not exists audit_run (
  id uuid primary key default gen_random_uuid(),
  target_agent_id int not null check (target_agent_id between 1 and 25),
  governance_score numeric not null check (governance_score between 0 and 100),
  readiness_score numeric not null check (readiness_score between 0 and 100),
  passed boolean not null,                              -- both scores >= 95
  run_at timestamptz not null default now(),
  run_number int not null check (run_number between 1 and 3) -- 1=primary, 2=meta, 3=third-run
);

create index if not exists idx_audit_run_target on audit_run(target_agent_id, run_at desc);
create index if not exists idx_audit_run_passed on audit_run(passed, run_at desc);

-- ─── disagreement ──────────────────────────────────────────────────────
create table if not exists disagreement (
  id uuid primary key default gen_random_uuid(),
  audit_run_id_1 uuid not null references audit_run(id) on delete cascade,
  audit_run_id_2 uuid not null references audit_run(id) on delete cascade,
  delta numeric not null check (delta >= 0),
  resolved_by text check (resolved_by is null or resolved_by in ('third_run','w0_escalation')),
  resolved_at timestamptz
);

create index if not exists idx_disagreement_run1 on disagreement(audit_run_id_1);
create index if not exists idx_disagreement_run2 on disagreement(audit_run_id_2);
create index if not exists idx_disagreement_open on disagreement(resolved_at)
  where resolved_at is null;

-- ─── RLS scaffolding (off; policies added when Clerk JWT lands) ────────
alter table defect enable row level security;
alter table audit_run enable row level security;
alter table disagreement enable row level security;

-- ─── Trailing comments ─────────────────────────────────────────────────
comment on table defect is
  'W3 defect register. One row per ScoreEvaluator failure entry. id is the deterministic key ${targetType}_${targetId}_${criterionId}_${evaluatedAt}.';
comment on table audit_run is
  'W3 governance/readiness audit run record. Distinct from Super Customer Agent audit_runs (plural, 0002).';
comment on table disagreement is
  'W3 auditor-of-auditor disagreement record. Created when |score_run1 - score_run2| >= T (5). delta echoes the gap that triggered the row.';
