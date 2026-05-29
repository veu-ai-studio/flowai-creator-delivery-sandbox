# RLS Hardening Plan — Production Hardening Phase 1.1

Owner: W2
Date: 2026-05-14
Status: PLAN (not yet applied — to be landed as `supabase/migrations/0011_rls_policies.sql`)

---

## 1. Audit summary

`grep "enable row level security" supabase/migrations/*.sql` reports every public-schema table currently in the codebase has RLS **enabled at the table level** but **zero policies defined**. Every migration ends with a `TODO(tomorrow): add policies that filter by org_id from auth.jwt() ->> 'org_id'` comment that was never executed.

With RLS enabled and no policy:
- `service_role` (used by every `/api/*` Vercel function) bypasses RLS → the app works today.
- `anon` and `authenticated` see zero rows and can perform no writes → end-users can never read or write directly through the Supabase JS client.

This plan adds the missing policies. Tables fall into three classes:

| Class | Read | Write |
|---|---|---|
| **A. Tenant-scoped** | `authenticated` users whose JWT `org_id` matches the row's `org_id` | same, plus `service_role` for system writes |
| **B. Shared catalog** | `anon` + `authenticated` (everyone reads the canonical marketplace) | `service_role` only |
| **C. Control-plane** | `service_role` only (no end-user access of any kind) | `service_role` only |

| Migration | Tables | Class |
|---|---|---|
| 0001_initial.sql | `organizations`, `users`, `organization_members`, `products`, `workspaces`, `workspace_runs`, `run_steps`, `cost_events`, `clearance_checks`, `user_sessions`, `audit_log` | A (×11) |
| 0002_super_customer.sql | `audit_runs`, `audit_surfaces`, `audit_issues` | A (×3) |
| 0003_flowai_audit_log.sql | `flowai_audit_log` | C (×1) |
| 0004_tool_marketplace.sql | `tool_categories`, `tools`, `tool_capabilities`, `tool_rankings` | B (×4) |
| 0004_tool_marketplace.sql | `tool_outcomes`, `tool_recommendations`, `marketplace_provider_preferences` | A (×3) |
| 0010_w3_audit_infra.sql | `defect`, `audit_run` (singular), `disagreement` | C (×3) |

**Total: 25 tables.**
- Class A (tenant-scoped, need org_id policies): **17 tables**
- Class B (shared catalog, public-read + service_role-write): **4 tables**
- Class C (control-plane, service_role only): **4 tables**

Tables with RLS *disabled* (the literal question from Step 2): **0**.
Tables with RLS enabled but **zero policies**: **25** (all of them).
Tables to be left without policies *intentionally* (service_role-only hardening): **4** (Class C — `flowai_audit_log`, `defect`, `audit_run`, `disagreement`). These are control-plane lineage tables, not tenant business state; end-users have no business reading them.

---

## 2. JWT integration prerequisite

Clerk emits JWTs that Supabase can verify when the project's `auth.jwt_secret` is set to the Clerk JWKS or HS256 shared secret (Vercel env: `SUPABASE_JWT_SECRET`). Once that is configured, the following claims are available in policy expressions:

- `(auth.jwt() ->> 'sub')::text` — Clerk user id (e.g. `user_2abc...`)
- `(auth.jwt() ->> 'org_id')::text` — Clerk org id (e.g. `org_2xyz...`)
- `(auth.jwt() ->> 'org_role')::text` — `admin` | `basic_member` | etc.

A helper function makes the policies readable and consistent:

```sql
-- 0011_rls_policies.sql (header)
-- Helper: resolve the user's tenant from the JWT.  Returns the
-- organizations.id (UUID) whose clerk_org_id matches the JWT claim,
-- or NULL when there is no authenticated session.

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
```

Notes:
- `security definer` is required because `auth.jwt()` reads session state that anon's role cannot touch directly.
- Both helpers return NULL for unauthenticated requests; tenant-scoped policies use `org_id = public.current_org_id()` which evaluates to FALSE for NULL → zero rows visible.
- `service_role` bypasses RLS unconditionally; no special handling needed.

---

## 3. Per-table policy SQL

### 3.1. Class A — Tenant-scoped (17 tables)

Pattern (where the table has an `org_id uuid` column):

```sql
create policy "<table>_org_select"
  on public.<table>
  for select
  to authenticated
  using (org_id = public.current_org_id());

create policy "<table>_org_insert"
  on public.<table>
  for insert
  to authenticated
  with check (org_id = public.current_org_id());

create policy "<table>_org_update"
  on public.<table>
  for update
  to authenticated
  using (org_id = public.current_org_id())
  with check (org_id = public.current_org_id());

create policy "<table>_org_delete"
  on public.<table>
  for delete
  to authenticated
  using (org_id = public.current_org_id());
```

Applied verbatim to: `products`, `workspaces`, `workspace_runs`, `run_steps`, `cost_events`, `clearance_checks`, `audit_log`, `audit_runs`, `audit_surfaces`, `audit_issues`, `tool_outcomes`, `tool_recommendations`, `marketplace_provider_preferences` (13 tables).

**Per-table policy count: 4 (SELECT/INSERT/UPDATE/DELETE). Subtotal: 52 policies.**

#### 3.1.1. `organizations` — self-row only

The `org_id` on this table IS its own `id`. Members of the org see their own org row; non-members see nothing.

```sql
create policy "organizations_self_select"
  on public.organizations
  for select
  to authenticated
  using (id = public.current_org_id());

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

-- INSERT + DELETE remain service_role only — orgs are created via Clerk
-- webhook on /api/orgs/sync, deletion via support workflow.
```

**3 policies** (INSERT/DELETE intentionally omitted → only `service_role` may insert/delete orgs).

#### 3.1.2. `users` — self + org-mates

A user can read their own record AND other members of their org (so member lists render). A user can update only their own record.

```sql
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

create policy "users_self_update"
  on public.users
  for update
  to authenticated
  using (id = public.current_user_id())
  with check (id = public.current_user_id());

-- INSERT + DELETE remain service_role only — managed by Clerk webhook.
```

**2 policies.**

#### 3.1.3. `organization_members` — org-scoped

```sql
create policy "organization_members_org_select"
  on public.organization_members
  for select
  to authenticated
  using (org_id = public.current_org_id());

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
```

**4 policies.** Admin role gates writes; all members can read membership.

#### 3.1.4. `user_sessions` — user-scoped

This table carries both `org_id` and `user_id`. Restrict to the session's own owner:

```sql
create policy "user_sessions_self_select"
  on public.user_sessions
  for select
  to authenticated
  using (user_id = public.current_user_id());

-- INSERT/UPDATE/DELETE are written by the Clerk middleware on the
-- server side (service_role); no end-user-direct writes needed.
```

**1 policy.**

### 3.2. Class B — Shared catalog (4 tables)

Everyone — including unauthenticated visitors browsing the marketplace — can read `tool_categories`, `tools`, `tool_capabilities`, `tool_rankings`. Writes happen via `/api/marketplace/admin/*` which uses `service_role`.

```sql
create policy "tool_categories_public_select"
  on public.tool_categories
  for select
  to anon, authenticated
  using (true);

create policy "tools_public_select"
  on public.tools
  for select
  to anon, authenticated
  using (true);

create policy "tool_capabilities_public_select"
  on public.tool_capabilities
  for select
  to anon, authenticated
  using (true);

create policy "tool_rankings_public_select"
  on public.tool_rankings
  for select
  to anon, authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated → those
-- operations are service_role-only by exclusion.
```

**4 policies.** No writes from anon/authenticated; the absence of write policies IS the write restriction.

### 3.3. Class C — Control-plane (4 tables, intentionally NO policies)

`flowai_audit_log`, `defect`, `audit_run` (singular), `disagreement` carry control-plane lineage — they are not tenant business state. End-users have no read or write surface for them.

```sql
-- No policies are added for these tables.
-- RLS is already enabled.  service_role bypasses RLS.
-- anon + authenticated receive zero rows and zero write capability
-- (this is the desired behavior).
--
-- Optional belt-and-suspenders: explicit deny policies that make the
-- intent obvious to anyone reading the SQL.

create policy "flowai_audit_log_no_anon"
  on public.flowai_audit_log
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "defect_no_anon"
  on public.defect
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "audit_run_no_anon"
  on public.audit_run
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "disagreement_no_anon"
  on public.disagreement
  for all
  to anon, authenticated
  using (false)
  with check (false);
```

**4 policies** (explicit deny; functionally redundant but documentation-grade).

---

## 4. Policy count summary

| Class | Tables | Policies |
|---|---:|---:|
| A — Tenant-scoped (`products`, `workspaces`, `workspace_runs`, `run_steps`, `cost_events`, `clearance_checks`, `audit_log`, `audit_runs`, `audit_surfaces`, `audit_issues`, `tool_outcomes`, `tool_recommendations`, `marketplace_provider_preferences`) | 13 | 52 |
| A — Tenant-scoped, special cases (`organizations`, `users`, `organization_members`, `user_sessions`) | 4 | 10 |
| B — Shared catalog (`tool_categories`, `tools`, `tool_capabilities`, `tool_rankings`) | 4 | 4 |
| C — Control-plane explicit-deny (`flowai_audit_log`, `defect`, `audit_run`, `disagreement`) | 4 | 4 |
| **Total** | **25** | **70** |

---

## 5. Tables that cannot have RLS applied (with reasons)

**None.** All 25 tables can — and should — have RLS active.

Two classes warrant the explicit "no end-user policies" treatment rather than tenant-filtered policies:

1. **Class C control-plane tables (`flowai_audit_log`, `defect`, `audit_run`, `disagreement`)** — no `org_id` column by design (per the comment in `0003_flowai_audit_log.sql:21-25`: "This table intentionally does NOT carry org_id / product_id. The audit lineage is a global control-plane record of governance decisions, not tenant business state."). They CANNOT have a tenant-filtered policy because there is no tenant attribute to filter on. The correct posture is service_role-only + explicit deny for anon/authenticated. This is hardening, not a missing policy.

2. **`audit_runs_with_open_issues` view (in `0002_super_customer.sql:187-193`)** — views do not have RLS directly; they inherit it from their underlying tables. With `audit_runs` + `audit_issues` policies in place, the view's row visibility is correctly governed transitively. No action needed.

There are also four tables in Class A (`organizations`, `users`, `organization_members`, `user_sessions`) whose INSERT/UPDATE/DELETE semantics are server-side-only (handled by the Clerk sync webhook and middleware). Those operations are CORRECTLY restricted to `service_role` by the absence of write policies — that is not a "can't apply RLS" case; that is RLS doing its job by exclusion.

---

## 6. Application order

To land this safely (Phase 1.1 of Production Hardening):

1. **Sanity check** — confirm `service_role` key in Vercel env is currently used by every `/api/*` route. If any route uses anon key, that route would break on rollout.
2. **Apply helper functions first** — `public.current_org_id()` and `public.current_user_id()`. They must exist before any policy references them.
3. **Apply Class B (shared catalog) policies** — lowest blast radius; only adds visibility, never removes it.
4. **Apply Class A (tenant-scoped) policies** — coordinate with API team: any browser-direct Supabase JS client calls (none today per audit) need a valid Clerk JWT.
5. **Apply Class C explicit-deny policies** — purely documentary; no functional change.
6. **Smoke** — anon + authenticated probes confirming zero-row visibility on Class C, single-org visibility on Class A, public visibility on Class B.
7. **Wire SUPABASE_JWT_SECRET to the Clerk JWKS** — only after the policies are in place.

---

## 7. Verification checklist (post-apply)

```sql
-- Every table in public schema has RLS enabled:
select c.relname, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
-- Expected: relrowsecurity = true for all 25 tables.

-- Policy count per table:
select schemaname, tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by 1, 2
order by 1, 2;
-- Expected: matches the per-table tally in section 4.

-- Cross-tenant smoke (run as authenticated with org A's JWT):
set role authenticated;
set request.jwt.claim.org_id to '<org-B-clerk-id>';
select count(*) from public.products;  -- expected: 0 rows visible
select count(*) from public.cost_events; -- expected: 0
reset role;
```

---

## 8. Out of scope for this dispatch

- Actual migration `0011_rls_policies.sql` — to land in Phase 1.2 once this plan is approved.
- Clerk → Supabase JWKS wire-up — a separate operation, must happen before Class A policies become reachable for end-users.
- `auth.jwt_secret` rotation runbook — addressed alongside the JWKS wire-up.
- Realtime / replication concerns — none of these tables are published to Supabase Realtime today.
- Storage bucket RLS — no storage buckets in use yet (screenshots referenced in `audit_surfaces.screenshot_url` are currently TODO).
