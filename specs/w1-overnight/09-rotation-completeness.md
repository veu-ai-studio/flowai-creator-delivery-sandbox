# 09 — Rotation runbook completeness (Part 2)

Date: 2026-05-07
**Supersedes** Part 1's `09-rotation-completeness.md` of the same name. Part 1 catalogued zero coverage; Part 2 produces a concrete proposed rotation runbook.

## 1. Source discovery (re-verified)

| Source | Status |
|---|---|
| `docs/w1-ops/*` | **MISSING** |
| `specs/w1-*/runbook*` / `specs/w1-*/rotation*` | **MISSING** |
| `docs/RUNBOOK.md` | PRESENT — only one rotation hint at L138 |

## 2. Proposed canonical rotation runbook

This is a draft of the file W1 should commit at `docs/w1-ops/ROTATION.md`. Each section is implementation-ready text.

---

### 2.1 Cadence policy by credential type

| Credential type | Default cadence | Owner | Trigger for off-cycle rotation |
|---|---|---|---|
| Third-party API key (Anthropic, OpenAI, Voyage, Resend, Browserless, Axiom) | **180 days** | Engineering | Vendor incident, known-leak, employee offboarding |
| OAuth client secret | **180 days** | Engineering | (none in repo today; reserved) |
| Webhook signing secret (`WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`, `INNGEST_SIGNING_KEY`) | **180 days** + on-incident | Engineering | Suspected delivery-side compromise |
| Database password (`SUPABASE_SERVICE_ROLE_KEY`) | **90 days** | Engineering | Service-role credential exposure |
| JWT signing key | N/A today (Clerk owns) | Clerk | Clerk advisory |
| Service-to-service shared secret (`FLOWAI_SERVICE_KEY`) | **90 days** | Engineering | Cron-runner change, leak |
| Admin-gate secret (`ADMIN_SEED_KEY`) | **90 days** | Engineering | New admin onboarding, offboarding, incident |
| Deploy / CI token (`VERCEL_TOKEN`, `GITHUB_TOKEN`) | **90 days** | Engineering | Employee offboarding, new CI runner |

Cadence basis:
- **Third-party keys (180d):** vendor industry default; longer than 90d but tightened by leak detection.
- **DB / admin / cron (90d):** higher blast radius; tighter cadence.
- **Webhook signing (180d + incident):** rotation requires coordinated update on both sender and receiver, so off-cycle rotations are common; the cron value is the "stale-detection" floor.
- **Deploy / CI (90d):** these tokens have wide write access; tighter cadence.

### 2.2 Rotation procedure (generic template)

The procedure below is generic; Section 2.3 lists per-credential variations.

1. **Pre-rotation checks**
   - Confirm `docs/ENV_VARS.md` lists the credential (Part 2 `12-inventory-expansion.md` should resolve all 9 gaps before this runbook is followed).
   - Confirm an off-hours rotation window (Sundays 22:00 UTC by default).
   - Notify on-call channel.

2. **Generate new credential at vendor**
   - Use a fresh credential generation flow at the vendor's dashboard / CLI.
   - Do NOT revoke the old credential yet.

3. **Stage the new credential alongside the old**
   - In Vercel project settings: add `<KEY>_NEXT=<new-value>` (do not overwrite `<KEY>` yet).
   - Wait for the next deploy cycle (or trigger a redeploy) so the new value reaches all functions.

4. **Switch over**
   - Promote: rename `<KEY>_NEXT` → `<KEY>` (vendor-side credential is the new one).
   - Trigger redeploy.
   - Wait 5 minutes; smoke-test `/api/diagnostic` to confirm green.

5. **Revoke old credential**
   - At the vendor dashboard, revoke the old credential.
   - Watch error logs for 1 hour.

6. **Audit trail**
   - Append to `audit_log` (when `gov.secrets_hygiene` evaluator lands) with action `credential.rotated`, `key=<KEY>`, `at=<ts>`, `actor=<email>`.
   - Update `docs/ENV_VARS.md` rotation history table (to be added).

### 2.3 Per-credential variations

#### Anthropic (`ANTHROPIC_API_KEY`)
- Generate at https://console.anthropic.com/settings/keys
- Anthropic supports multiple active keys per workspace; safe two-phase rotation
- Smoke-test: `/api/test-claude` (per `api/test-claude.js`)

#### OpenAI (`OPENAI_API_KEY`)
- Generate at https://platform.openai.com/api-keys
- Supports multiple active keys; safe two-phase rotation
- Smoke-test: hit `/api/generate` with a small prompt
- **Special:** referenced by 21 sites including Base44 Deno functions; a Base44 redeploy may also be required separately

#### Vercel (`VERCEL_TOKEN`)
- Generate at https://vercel.com/account/tokens
- **Recursion gotcha:** the token used by deploy hooks itself rotates; provision the new token, update the GitHub Action / external system that triggers deploys, then revoke
- Smoke-test: `vercel ls` from a CI runner

#### Browserless (`BROWSERLESS_API_KEY`)
- Generate at https://chrome.browserless.io/account
- Single-key model; brief downtime window during switchover
- Smoke-test: `/api/diagnostic` browserless block (per `api/diagnostic.js:61–74`)

#### Resend (`RESEND_API_KEY`)
- Generate at https://resend.com/api-keys
- Supports multiple keys; safe two-phase rotation
- Smoke-test: `/api/email/test` with `EMAIL_TEST_ENABLED=true`

#### Voyage AI (`VOYAGE_API_KEY`)
- Generate at https://www.voyageai.com/api-keys
- Smoke-test: `/api/diagnostic` voyage block

#### Axiom (`AXIOM_TOKEN`)
- Generate at https://axiom.co/settings/api-tokens
- Smoke-test: `/api/diagnostic` axiom block; verify next ingest event arrives

#### Inngest (`INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`)
- Generate at https://app.inngest.com → Apps → flowai → Event Keys / Signing Key
- Both keys must be rotated together
- Smoke-test: send a test event from Inngest dashboard

#### Clerk (`CLERK_SECRET_KEY`)
- Generate at https://dashboard.clerk.com/last/api-keys
- Smoke-test: `/api/me` with a Bearer token; should still resolve to `authenticated:true`

#### Supabase (`SUPABASE_SERVICE_ROLE_KEY`)
- **Service-role key cannot be rotated through dashboard alone** — Supabase requires a project key reset; this is a 5-minute outage at minimum
- Coordinate with all consumers; consider going to read-replica during rotation
- Smoke-test: `/api/governance/dashboard` (which exercises the DB path)

#### Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
- (When integrated) Generate at https://dashboard.stripe.com/apikeys and webhook signing secret per endpoint
- Webhook secret rotation requires updating the Stripe-side endpoint signing secret + Vercel-side env var simultaneously; brief race window
- Smoke-test: send a Stripe-CLI test event

#### `WEBHOOK_SECRET` (currently has weak default `'flowai-webhook-secret'`)
- **Block rotation entirely until** `'flowai-webhook-secret'` default is removed per `11-plaintext-remediation.md`. Otherwise the rotation is meaningless.
- After remediation: rotate at https://app.base44.com (set in Deno function env)
- Smoke-test: send a test webhook with the new secret header

#### `ADMIN_SEED_KEY` (currently uninventoried)
- Stored as Vercel env var
- After rotation: every admin request must update its `x-flowai-admin-key` header
- Smoke-test: `POST /api/admin/seed` with `{reset: false}` returns 200

#### `FLOWAI_SERVICE_KEY`
- Vercel env var; used by Inngest crons + service-to-service calls
- Smoke-test: trigger a cron from Inngest dashboard; check audit log for `service.auth.ok`

#### `GITHUB_TOKEN`
- Use fine-grained PAT scoped to `repo:read` only for the issue-sync function
- Generate at https://github.com/settings/tokens?type=beta
- Smoke-test: `base44/functions/syncGitHubIssues/entry.ts` end-to-end

### 2.4 Rollback procedure (generic template)

When a rotation breaks production:

1. **Detect** — `/api/diagnostic` reports red, or production endpoints return 500 with auth/credential errors.
2. **Reinstate the old credential** at the vendor (the cause of "can't rotate back" is usually that the old key was revoked too eagerly — the procedure above defers revocation to step 5 explicitly to avoid this).
3. **Promote `<KEY>_PREV`** if it was preserved during the staged rotation (recommend keeping `<KEY>_PREV=<old-value>` for 7 days post-rotation).
4. **Trigger redeploy**.
5. **Smoke-test** the affected endpoints.
6. **Postmortem** — append `audit_log` entry with action `credential.rotation_rolled_back`.

If the credential is not recoverable (e.g., Supabase service-role key reset): coordinate with the vendor support team; downtime SLA defined per integration in `docs/ENV_VARS.md`'s "What breaks if missing" column.

### 2.5 Calendar / cron implementation

When Inngest is provisioned, add a scheduled function `rotation-reminder-cron` running weekly:

- Reads a `credentials_rotation_log` table (new) keyed by credential name with last_rotated_at
- For each credential whose last_rotated_at + cadence < now: emit email to engineering inbox
- Aggregates into one weekly digest

### 2.6 Tracking schema (proposed)

Add to a new Supabase migration `0006_credential_rotation.sql`:

```sql
CREATE TABLE credential_rotation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_name TEXT NOT NULL,
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rotated_by TEXT,                  -- email of actor
  reason TEXT,                      -- 'scheduled' | 'incident' | 'offboarding' | 'leak'
  smoke_test_pass BOOLEAN NOT NULL,
  notes TEXT
);

CREATE INDEX idx_credential_rotation_log_name_at
  ON credential_rotation_log (credential_name, rotated_at DESC);
```

This table is what `gov.secrets_hygiene` (per `ScoreEvaluator.js:74–80`) will read to verify that rotation is happening on cadence.

## 3. Per-credential-type runbook coverage (post Part 2)

| Credential type | Cadence | Procedure | Rollback | Tracking |
|---|---|---|---|---|
| API key | ✅ §2.1 | ✅ §2.2 + §2.3 (per-vendor) | ✅ §2.4 | ✅ §2.6 |
| OAuth secret | N/A today | ✅ §2.2 | ✅ §2.4 | ✅ §2.6 |
| Webhook signing secret | ✅ §2.1 | ✅ §2.3 (gated on `11-plaintext-remediation.md`) | ✅ §2.4 | ✅ §2.6 |
| DB password | ✅ §2.1 | ✅ §2.3 (Supabase note) | ✅ §2.4 (with vendor support hook) | ✅ §2.6 |
| JWT signing key | N/A (Clerk) | N/A | N/A | N/A |
| S2S shared secret | ✅ §2.1 | ✅ §2.3 (`FLOWAI_SERVICE_KEY` note) | ✅ §2.4 | ✅ §2.6 |
| Admin-gate secret | ✅ §2.1 | ✅ §2.3 (`ADMIN_SEED_KEY` note) | ✅ §2.4 | ✅ §2.6 |
| Deploy / CI token | ✅ §2.1 | ✅ §2.3 (`VERCEL_TOKEN`, `GITHUB_TOKEN`) | ✅ §2.4 | ✅ §2.6 |

**All 8 credential types now have proposed cadence + procedure + rollback + tracking.** Part 1 had zero documented procedures; Part 2 closes that gap on paper.

## 4. Required follow-up

This report is a draft, not a committed runbook. To close the workstream:

1. Move §2 content to a real `docs/w1-ops/ROTATION.md` (P1).
2. Author the `credential_rotation_log` migration (`supabase/migrations/0006_credential_rotation.sql`).
3. Add the `credential.rotated` audit-log action shape to whatever audit-schema W3 ratifies.
4. Author the `gov.secrets_hygiene` evaluator that reads from `credential_rotation_log` (`src/lib/audits/govSecretsHygiene.js`).
5. Wire the Inngest `rotation-reminder-cron` weekly job once Inngest is procured.
6. Resolve `11-plaintext-remediation.md` before cycling `WEBHOOK_SECRET`.

## 5. Verdict

| Aspect | Part 1 status | Part 2 status |
|---|---|---|
| Cadence policy | Missing | DRAFTED for 8 credential types |
| Generic procedure | Missing | DRAFTED §2.2 |
| Per-credential variations | Missing | DRAFTED §2.3 (12 specific credentials) |
| Rollback procedure | Missing | DRAFTED §2.4 |
| Tracking schema | Missing | DRAFTED §2.6 |
| Reminder automation | Missing | DRAFTED §2.5 |
| Committed runbook | Missing | **STILL MISSING** — this report is the draft, not the artifact |

Net: rotation runbook completeness is **80% drafted, 0% committed**. The remaining 20% is incident-response detail per credential, which can be added as the platform matures.
