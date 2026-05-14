-- 0011_rls_policies.sql
-- Production Hardening Phase 1.2 — RLS policies for all 25 public tables.
--
-- Spec: docs/specs/RLS_HARDENING_PLAN.md (committed 00bbd11).
-- Mechanizes the plan verbatim. Order per plan §6:
--   1. Helper functions (plan §2)
--   2. Class B — shared catalog public-read (4 policies)
--   3. Class A — tenant-scoped standard pattern × 13 tables (52 policies)
--   4. Class A — tenant-scoped special cases × 4 tables (10 policies)
--   5. Class C — control-plane explicit-deny × 4 tables (4 policies)
--   6. Verification queries (trailing comments, plan §7)
--
-- Total: 70 policies across 25 tables.
--
-- DROP-IF-EXISTS is used on every policy so the migration is idempotent.
-- Every CREATE POLICY is preceded by DROP POLICY IF EXISTS — re-running
-- this migration is safe.
--
-- ─── Internal consistency note ─────────────────────────────────────────
-- Plan §3.1.1 narrative ("3 policies") vs its SQL block (2 statements):
-- the SQL block emits organizations_self_select + organizations_self_update.
-- The §4 summary table requires 3 policies on `organizations` for the
-- stated 70 total to balance. The third policy here is the belt-and-
-- suspenders `organizations_anon_no_access` (explicit deny for the anon
-- role), mirroring the Class C pattern used by flowai_audit_log /
-- defect / audit_run / disagreement in the same plan. This makes the
-- intent ("orgs are not visible to unauthenticated visitors") legible to
-- anyone reading the SQL and brings the per-table count in line with
-- plan §4.
-- ──────────────────────────────────────────────────────────────────────

-- ════════════════════════════════════════════════════════════════════
-- 1. JWT helper functions (plan §2)
-- ════════════════════════════════════════════════════════════════════

create or replace function public.current_org_id() returns uuid
language sql stable security definer
as $$
  select o.id
  from public.organizations o
  where o.clerk_org_id = (auth.jwt() ->> 'org_id')
  limit 1;
$$;

revoke all on function public.current_org_id() from public;
grant execute on function public.current_org_id() to anon, authenticated;

create or replace function public.current_user_id() returns uuid
language sql stable security definer
as $$
  select u.id
  from public.users u
  where u.clerk_user_id = (auth.jwt() ->> 'sub')
  limit 1;
$$;

revoke all on function public.current_user_id() from public;
grant execute on function public.current_user_id() to anon, authenticated;

comment on function public.current_org_id() is
  'Resolve the JWT org_id claim to organizations.id (uuid). Returns NULL when no authenticated session. Used by RLS policies to scope per-tenant rows.';
comment on function public.current_user_id() is
  'Resolve the JWT sub claim to users.id (uuid). Returns NULL when no authenticated session. Used by RLS policies for self-row scoping.';

-- ════════════════════════════════════════════════════════════════════
-- 2. Class B — Shared catalog public-read (plan §3.2)  [4 policies]
-- ════════════════════════════════════════════════════════════════════
-- Lowest blast radius: only adds visibility, never removes it. Applied
-- first per plan §6.

drop policy if exists "tool_categories_public_select" on public.tool_categories;
create policy "tool_categories_public_select"
  on public.tool_categories
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tools_public_select" on public.tools;
create policy "tools_public_select"
  on public.tools
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tool_capabilities_public_select" on public.tool_capabilities;
create policy "tool_capabilities_public_select"
  on public.tool_capabilities
  for select
  to anon, authenticated
  using (true);

drop policy if exists "tool_rankings_public_select" on public.tool_rankings;
create policy "tool_rankings_public_select"
  on public.tool_rankings
  for select
  to anon, authenticated
  using (true);

-- INSERT/UPDATE/DELETE on the catalog tables are service_role-only by
-- the absence of write policies. No additional SQL needed.

-- ════════════════════════════════════════════════════════════════════
-- 3. Class A — Tenant-scoped standard pattern (plan §3.1)  [52 policies]
-- ════════════════════════════════════════════════════════════════════
-- Pattern: SELECT/INSERT/UPDATE/DELETE filtered by
--   org_id = public.current_org_id()
-- Applied to 13 tables × 4 policies each.

-- ─── products ────────────────────────────────────────────────────────
drop policy if exists "products_org_select" on public.products;
create policy "products_org_select"
  on public.products for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "products_org_insert" on public.products;
create policy "products_org_insert"
  on public.products for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "products_org_update" on public.products;
create policy "products_org_update"
  on public.products for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "products_org_delete" on public.products;
create policy "products_org_delete"
  on public.products for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── workspaces ──────────────────────────────────────────────────────
drop policy if exists "workspaces_org_select" on public.workspaces;
create policy "workspaces_org_select"
  on public.workspaces for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "workspaces_org_insert" on public.workspaces;
create policy "workspaces_org_insert"
  on public.workspaces for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "workspaces_org_update" on public.workspaces;
create policy "workspaces_org_update"
  on public.workspaces for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "workspaces_org_delete" on public.workspaces;
create policy "workspaces_org_delete"
  on public.workspaces for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── workspace_runs ──────────────────────────────────────────────────
drop policy if exists "workspace_runs_org_select" on public.workspace_runs;
create policy "workspace_runs_org_select"
  on public.workspace_runs for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "workspace_runs_org_insert" on public.workspace_runs;
create policy "workspace_runs_org_insert"
  on public.workspace_runs for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "workspace_runs_org_update" on public.workspace_runs;
create policy "workspace_runs_org_update"
  on public.workspace_runs for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "workspace_runs_org_delete" on public.workspace_runs;
create policy "workspace_runs_org_delete"
  on public.workspace_runs for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── run_steps ───────────────────────────────────────────────────────
drop policy if exists "run_steps_org_select" on public.run_steps;
create policy "run_steps_org_select"
  on public.run_steps for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "run_steps_org_insert" on public.run_steps;
create policy "run_steps_org_insert"
  on public.run_steps for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "run_steps_org_update" on public.run_steps;
create policy "run_steps_org_update"
  on public.run_steps for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "run_steps_org_delete" on public.run_steps;
create policy "run_steps_org_delete"
  on public.run_steps for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── cost_events ─────────────────────────────────────────────────────
drop policy if exists "cost_events_org_select" on public.cost_events;
create policy "cost_events_org_select"
  on public.cost_events for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "cost_events_org_insert" on public.cost_events;
create policy "cost_events_org_insert"
  on public.cost_events for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "cost_events_org_update" on public.cost_events;
create policy "cost_events_org_update"
  on public.cost_events for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "cost_events_org_delete" on public.cost_events;
create policy "cost_events_org_delete"
  on public.cost_events for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── clearance_checks ────────────────────────────────────────────────
drop policy if exists "clearance_checks_org_select" on public.clearance_checks;
create policy "clearance_checks_org_select"
  on public.clearance_checks for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "clearance_checks_org_insert" on public.clearance_checks;
create policy "clearance_checks_org_insert"
  on public.clearance_checks for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "clearance_checks_org_update" on public.clearance_checks;
create policy "clearance_checks_org_update"
  on public.clearance_checks for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "clearance_checks_org_delete" on public.clearance_checks;
create policy "clearance_checks_org_delete"
  on public.clearance_checks for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── audit_log ───────────────────────────────────────────────────────
drop policy if exists "audit_log_org_select" on public.audit_log;
create policy "audit_log_org_select"
  on public.audit_log for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "audit_log_org_insert" on public.audit_log;
create policy "audit_log_org_insert"
  on public.audit_log for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "audit_log_org_update" on public.audit_log;
create policy "audit_log_org_update"
  on public.audit_log for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "audit_log_org_delete" on public.audit_log;
create policy "audit_log_org_delete"
  on public.audit_log for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── audit_runs (Super Customer Agent — 0002) ────────────────────────
drop policy if exists "audit_runs_org_select" on public.audit_runs;
create policy "audit_runs_org_select"
  on public.audit_runs for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "audit_runs_org_insert" on public.audit_runs;
create policy "audit_runs_org_insert"
  on public.audit_runs for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "audit_runs_org_update" on public.audit_runs;
create policy "audit_runs_org_update"
  on public.audit_runs for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "audit_runs_org_delete" on public.audit_runs;
create policy "audit_runs_org_delete"
  on public.audit_runs for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── audit_surfaces ──────────────────────────────────────────────────
drop policy if exists "audit_surfaces_org_select" on public.audit_surfaces;
create policy "audit_surfaces_org_select"
  on public.audit_surfaces for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "audit_surfaces_org_insert" on public.audit_surfaces;
create policy "audit_surfaces_org_insert"
  on public.audit_surfaces for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "audit_surfaces_org_update" on public.audit_surfaces;
create policy "audit_surfaces_org_update"
  on public.audit_surfaces for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "audit_surfaces_org_delete" on public.audit_surfaces;
create policy "audit_surfaces_org_delete"
  on public.audit_surfaces for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── audit_issues ────────────────────────────────────────────────────
drop policy if exists "audit_issues_org_select" on public.audit_issues;
create policy "audit_issues_org_select"
  on public.audit_issues for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "audit_issues_org_insert" on public.audit_issues;
create policy "audit_issues_org_insert"
  on public.audit_issues for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "audit_issues_org_update" on public.audit_issues;
create policy "audit_issues_org_update"
  on public.audit_issues for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "audit_issues_org_delete" on public.audit_issues;
create policy "audit_issues_org_delete"
  on public.audit_issues for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── tool_outcomes ───────────────────────────────────────────────────
drop policy if exists "tool_outcomes_org_select" on public.tool_outcomes;
create policy "tool_outcomes_org_select"
  on public.tool_outcomes for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "tool_outcomes_org_insert" on public.tool_outcomes;
create policy "tool_outcomes_org_insert"
  on public.tool_outcomes for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "tool_outcomes_org_update" on public.tool_outcomes;
create policy "tool_outcomes_org_update"
  on public.tool_outcomes for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "tool_outcomes_org_delete" on public.tool_outcomes;
create policy "tool_outcomes_org_delete"
  on public.tool_outcomes for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── tool_recommendations ────────────────────────────────────────────
drop policy if exists "tool_recommendations_org_select" on public.tool_recommendations;
create policy "tool_recommendations_org_select"
  on public.tool_recommendations for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "tool_recommendations_org_insert" on public.tool_recommendations;
create policy "tool_recommendations_org_insert"
  on public.tool_recommendations for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "tool_recommendations_org_update" on public.tool_recommendations;
create policy "tool_recommendations_org_update"
  on public.tool_recommendations for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "tool_recommendations_org_delete" on public.tool_recommendations;
create policy "tool_recommendations_org_delete"
  on public.tool_recommendations for delete to authenticated
  using (org_id = public.current_org_id());

-- ─── marketplace_provider_preferences ────────────────────────────────
drop policy if exists "marketplace_provider_preferences_org_select" on public.marketplace_provider_preferences;
create policy "marketplace_provider_preferences_org_select"
  on public.marketplace_provider_preferences for select to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "marketplace_provider_preferences_org_insert" on public.marketplace_provider_preferences;
create policy "marketplace_provider_preferences_org_insert"
  on public.marketplace_provider_preferences for insert to authenticated
  with check (org_id = public.current_org_id());

drop policy if exists "marketplace_provider_preferences_org_update" on public.marketplace_provider_preferences;
create policy "marketplace_provider_preferences_org_update"
  on public.marketplace_provider_preferences for update to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

drop policy if exists "marketplace_provider_preferences_org_delete" on public.marketplace_provider_preferences;
create policy "marketplace_provider_preferences_org_delete"
  on public.marketplace_provider_preferences for delete to authenticated
  using (org_id = public.current_org_id());

-- ════════════════════════════════════════════════════════════════════
-- 4. Class A — Tenant-scoped special cases (plan §3.1.1 – §3.1.4)
--    [10 policies]
-- ════════════════════════════════════════════════════════════════════

-- ─── 4.1. organizations (3 policies; plan §3.1.1) ────────────────────
-- The org_id on this table IS its own id. Members of the org see their
-- own org row; non-members see nothing. INSERT/DELETE remain service_role
-- only (orgs created via Clerk webhook, deleted via support workflow).

drop policy if exists "organizations_self_select" on public.organizations;
create policy "organizations_self_select"
  on public.organizations
  for select
  to authenticated
  using (id = public.current_org_id());

drop policy if exists "organizations_self_update" on public.organizations;
create policy "organizations_self_update"
  on public.organizations
  for update
  to authenticated
  using (id = public.current_org_id() and exists (
    select 1 from public.organization_members om
    where om.org_id = public.organizations.id
      and om.user_id = public.current_user_id()
      and om.role = 'admin'
  ))
  with check (id = public.current_org_id());

-- Belt-and-suspenders: explicit anon deny. Mirrors the Class C pattern
-- elsewhere in this migration. Makes the "orgs are not visible to
-- anonymous visitors" intent obvious to anyone reading the SQL.
drop policy if exists "organizations_anon_no_access" on public.organizations;
create policy "organizations_anon_no_access"
  on public.organizations
  for all
  to anon
  using (false)
  with check (false);

-- ─── 4.2. users (2 policies; plan §3.1.2) ────────────────────────────
-- A user can read their own record AND other members of their org.
-- A user can update only their own record. INSERT/DELETE managed by
-- the Clerk webhook (service_role).

drop policy if exists "users_self_or_org_select" on public.users;
create policy "users_self_or_org_select"
  on public.users
  for select
  to authenticated
  using (
    id = public.current_user_id()
    or exists (
      select 1
      from public.organization_members om
      where om.user_id = public.users.id
        and om.org_id = public.current_org_id()
    )
  );

drop policy if exists "users_self_update" on public.users;
create policy "users_self_update"
  on public.users
  for update
  to authenticated
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

-- ─── 4.3. organization_members (4 policies; plan §3.1.3) ─────────────
-- All members can read membership. Admin role gates writes.

drop policy if exists "organization_members_org_select" on public.organization_members;
create policy "organization_members_org_select"
  on public.organization_members
  for select
  to authenticated
  using (org_id = public.current_org_id());

drop policy if exists "organization_members_admin_insert" on public.organization_members;
create policy "organization_members_admin_insert"
  on public.organization_members
  for insert
  to authenticated
  with check (
    org_id = public.current_org_id()
    and exists (
      select 1 from public.organization_members om
      where om.org_id = public.current_org_id()
        and om.user_id = public.current_user_id()
        and om.role = 'admin'
    )
  );

drop policy if exists "organization_members_admin_update" on public.organization_members;
create policy "organization_members_admin_update"
  on public.organization_members
  for update
  to authenticated
  using (org_id = public.current_org_id() and exists (
    select 1 from public.organization_members om
    where om.org_id = public.current_org_id()
      and om.user_id = public.current_user_id()
      and om.role = 'admin'
  ))
  with check (org_id = public.current_org_id());

drop policy if exists "organization_members_admin_delete" on public.organization_members;
create policy "organization_members_admin_delete"
  on public.organization_members
  for delete
  to authenticated
  using (org_id = public.current_org_id() and exists (
    select 1 from public.organization_members om
    where om.org_id = public.current_org_id()
      and om.user_id = public.current_user_id()
      and om.role = 'admin'
  ));

-- ─── 4.4. user_sessions (1 policy; plan §3.1.4) ──────────────────────
-- Restrict to the session's own owner. INSERT/UPDATE/DELETE written by
-- the Clerk middleware on the server side (service_role).

drop policy if exists "user_sessions_self_select" on public.user_sessions;
create policy "user_sessions_self_select"
  on public.user_sessions
  for select
  to authenticated
  using (user_id = public.current_user_id());

-- ════════════════════════════════════════════════════════════════════
-- 5. Class C — Control-plane explicit-deny (plan §3.3)  [4 policies]
-- ════════════════════════════════════════════════════════════════════
-- These tables carry control-plane lineage, not tenant business state.
-- service_role bypasses RLS; anon + authenticated are explicitly denied
-- so the intent is legible in the SQL (belt-and-suspenders).

drop policy if exists "flowai_audit_log_no_anon" on public.flowai_audit_log;
create policy "flowai_audit_log_no_anon"
  on public.flowai_audit_log
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "defect_no_anon" on public.defect;
create policy "defect_no_anon"
  on public.defect
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "audit_run_no_anon" on public.audit_run;
create policy "audit_run_no_anon"
  on public.audit_run
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "disagreement_no_anon" on public.disagreement;
create policy "disagreement_no_anon"
  on public.disagreement
  for all
  to anon, authenticated
  using (false)
  with check (false);

-- ════════════════════════════════════════════════════════════════════
-- 6. Verification queries (plan §7, trailing comments — do NOT execute
--    in the migration itself; run interactively post-apply)
-- ════════════════════════════════════════════════════════════════════
--
-- Every table in public schema has RLS enabled:
--
--   select c.relname, c.relrowsecurity
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--   where n.nspname = 'public' and c.relkind = 'r'
--   order by c.relname;
--   -- Expected: relrowsecurity = true for all 25 tables.
--
-- Policy count per table:
--
--   select schemaname, tablename, count(*) as policy_count
--   from pg_policies
--   where schemaname = 'public'
--   group by 1, 2
--   order by 1, 2;
--   -- Expected per-table:
--   --   audit_issues, audit_log, audit_runs, audit_surfaces,
--   --   clearance_checks, cost_events, marketplace_provider_preferences,
--   --   products, run_steps, tool_outcomes, tool_recommendations,
--   --   workspace_runs, workspaces                  → 4 each (52)
--   --   organization_members                        → 4
--   --   organizations                               → 3
--   --   users                                       → 2
--   --   user_sessions                               → 1
--   --   tool_capabilities, tool_categories,
--   --   tool_rankings, tools                        → 1 each (4)
--   --   audit_run, defect, disagreement,
--   --   flowai_audit_log                            → 1 each (4)
--   -- Total: 70 policies across 25 tables.
--
-- Cross-tenant smoke (run as authenticated with org A's JWT, then
-- override the claim to org B and confirm zero visibility):
--
--   set role authenticated;
--   set request.jwt.claim.org_id to '<org-B-clerk-id>';
--   select count(*) from public.products;     -- expected: 0 rows visible
--   select count(*) from public.cost_events;  -- expected: 0
--   reset role;
--
-- Catalog visibility (anon should see all marketplace rows):
--
--   set role anon;
--   select count(*) from public.tools;            -- > 0 (seed rows)
--   select count(*) from public.tool_categories;  -- > 0 (seed rows)
--   reset role;
--
-- Control-plane denial (anon should see zero rows on Class C):
--
--   set role anon;
--   select count(*) from public.flowai_audit_log;  -- expected: 0
--   select count(*) from public.defect;            -- expected: 0
--   select count(*) from public.audit_run;         -- expected: 0
--   select count(*) from public.disagreement;      -- expected: 0
--   reset role;

comment on schema public is
  '0011_rls_policies — 70 RLS policies across 25 tables; helper functions current_org_id / current_user_id installed. See docs/specs/RLS_HARDENING_PLAN.md.';
