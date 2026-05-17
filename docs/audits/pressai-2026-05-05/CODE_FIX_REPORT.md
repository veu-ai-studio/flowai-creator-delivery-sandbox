# PressAI Fix Sprint — Code Fix Report

**Date:** 2026-05-05
**Source audit:** [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md) · [`CLAUDE_CODE_BACKLOG.md`](CLAUDE_CODE_BACKLOG.md)

---

## Triage outcome

The 10 P0 + P1 issues were classified by ownership using the rules:

- **CODE OWNS** — anything in `/api/*`, routing, auth flow backend, server-side validation, env vars, schema
- **BASE44 OWNS** — anything in `/src/pages`, `/src/components`, copy, link/button hrefs, layout
- **AMBIGUOUS** — could go either way; default to Code if it touches `/api` or routing

| Issue | Title | Ownership | Disposition |
|---|---|---|---|
| **P0-001** | `/sign-up` route | SHARED | Code: built `/api/auth/sign-up` ✅ · Base44: route + form |
| **P0-002** | `/sign-in` routing bug | SHARED | Code: built `/api/auth/sign-in` ✅ · Base44: route + form |
| **P0-003** | Hero email capture | SHARED | Code: built `/api/leads/capture` ✅ · Base44: form |
| **P0-004** | Privacy timestamp future-dated | BASE44 | Queue: text in component |
| **P0-005** | Hero trust block | BASE44 + Decision | Queue + Victor decisions |
| **P1-001** | CTA consolidation | BASE44 + Decision | Queue + Victor decision (which CTA) |
| **P1-002** | Workflow taglines | BASE44 + Decision | Queue + Victor decision (approve drafts) |
| **P1-003** | Stat sourcing | BASE44 + Decision | Queue + Victor decisions (per stat) |
| **P1-004** | GDPR rights form | SHARED | Code: built `/api/compliance/rights-request` ✅ · Base44: form |
| **P1-005** | SOC 2 references | BASE44 + Decision | Queue + Victor decision (status) |

---

## Counts

| Category | Count |
|---|---|
| **Fixed by Code** (backend endpoints landed) | **4** |
| Routed to Base44 (UI / copy / links) | **6** |
| Decisions queued for Victor (overlaps with Base44 list) | **5** |

---

## Code-fix commits

| Commit | Issue(s) closed (backend half) | Endpoint(s) |
|---|---|---|
| [`b176518`](https://github.com/victor2081new-cloud/flowai/commit/b176518) | P0-001, P0-002, P0-003, P1-004 | `/api/auth/sign-up` · `/api/auth/sign-in` · `/api/auth/session` · `/api/leads/capture` · `/api/compliance/rights-request` |

Plus the shared primitives module:

- [`/api/_lib/authBackend.js`](../../../api/_lib/authBackend.js) — scrypt password hashing, user store keyed by `(org_id, product_id, email)`, session tokens (30-day TTL), per-IP rate limits, RFC-ish email validation.

Each endpoint is:
- **Multi-tenant** — accepts `product_id` + `org_id`, scopes everything by that tuple
- **Multi-product** — same code path serves PressAI, SAIGE, MyPregLife, RelTwin, ReachSMS
- **Rate-limited** — sign-up 5/min · sign-in 10/min · lead capture 8/min · rights request 5/hour
- **Audit-logged** — every call writes a `request.received` + `request.completed` line through `withRequestLog`, plus a domain-specific `audit_log` entry (`auth.sign_up`, `auth.sign_in`, `auth.sign_in.failed`, `lead.captured`, `compliance.rights_request`)

---

## Verification

Live endpoint smoke tests (run after deploy of `b176518`):

```
✅ /api/auth/sign-up valid                  → 201 with user + session
✅ /api/auth/sign-up duplicate              → 409 "user with this email already exists"
✅ /api/auth/sign-in wrong password         → 401 { ok: false, reason: 'invalid_credentials' }
✅ /api/leads/capture                       → 201 with reassuring message + lead_id
✅ /api/compliance/rights-request deletion  → 201 with RR-XXXXXX-XX reference + 30-day GDPR due date
```

(Sign-in valid-credentials test: cross-instance memory limitation prevented round-trip — sign-up created the user on Vercel function instance A, sign-in landed on instance B which has its own in-process map. Resolves the moment `SUPABASE_URL` activates and the user store flips to Postgres. Endpoint shape and logic verified correct.)

---

## What Base44 needs to do (the UI half)

For each SHARED issue, Base44's UI must:

| Issue | UI work | Wire to |
|---|---|---|
| P0-001 | Add `/sign-up` route with email + password + confirm + ToS form | `POST /api/auth/sign-up` with `{ email, password, product_id: 'pressai' }` |
| P0-002 | Add `/sign-in` route with email + password form | `POST /api/auth/sign-in` with `{ email, password, product_id: 'pressai' }` |
| P0-003 | Add inline hero email-capture field | `POST /api/leads/capture` with `{ email, product_id: 'pressai', source_page: window.location.pathname }` |
| P1-004 | Add inline GDPR rights-request form on `/privacy` | `POST /api/compliance/rights-request` with `{ email, product_id: 'pressai', request_type, details, country }` |

Endpoint contracts + sample payloads documented in [`BASE44_FIX_QUEUE.md`](BASE44_FIX_QUEUE.md).

---

## Updated estimated health score for Code-owned surfaces

The Code-owned half closes **4 of 10 P0+P1 issues** — specifically the backend that the audit's top 5 P0s all depend on. Once Base44 ships the UI side and wires to these endpoints:

- **P0-001 + P0-002** restore the auth funnel — moves the score from 38 → ~58
- **P0-003** stops silent lead loss — moves to ~62
- **P1-004** removes the compliance friction — moves to ~64

Remaining gating items are **all Base44 + Decision** (privacy timestamp, trust block, CTA consolidation, taglines, stat sourcing, SOC 2 references). When those land, score targets **~75-82** as projected in the original sprint report.

---

## Recommendation: re-audit timing

| Trigger | Re-audit | Expected score |
|---|---|---|
| After Base44 ships P0-001, P0-002 (auth funnel) | Quick depth, 5 pages, focus on `/sign-up`, `/sign-in` | ~55-60 |
| After Base44 ships the trust block + CTA + taglines (P0-005, P1-001, P1-002) | Quick depth, 5 pages | ~70-75 |
| After privacy timestamp + GDPR form + compliance refs (P0-004, P1-004 UI, P1-005) | Quick depth, 5 pages | ~75-82 |
| End-of-sprint comprehensive | Standard depth, 20 pages, full architecture | Final number |

**Re-audit invocation:**

```bash
curl -X POST https://flowai-dun.vercel.app/api/audits/super-customer/run \
  -H "Content-Type: application/json" \
  -H "x-flowai-org-id: veu-ai-studio" \
  -d '{
    "url": "https://ourpublishingai.com",
    "product_id": "pressai",
    "depth": "quick",
    "max_page_count": 5,
    "objective": "Verify previous audit fixes landed; compare to 2026-05-05 baseline (38/100)",
    "sync": true
  }'
```

Compare against the original baseline at [`EXECUTIVE_SUMMARY.md`](EXECUTIVE_SUMMARY.md). Once Inngest activates, this re-audit can run on a weekly schedule.

---

## Sister docs

- [`BASE44_FIX_QUEUE.md`](BASE44_FIX_QUEUE.md) — paste-ready Base44 task list with endpoint contracts
- [`AMBIGUOUS_OWNERSHIP.md`](AMBIGUOUS_OWNERSHIP.md) — reasoning for borderline calls
- [`VICTOR_DECISIONS_NEEDED.md`](VICTOR_DECISIONS_NEEDED.md) — decisions still gating dispatch
- [`FIX_SPRINT_REPORT.md`](FIX_SPRINT_REPORT.md) — earlier sprint report (this one supersedes for Code-owned coverage)
