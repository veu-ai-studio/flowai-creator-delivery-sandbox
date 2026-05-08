# 06 — SAIGE P0 audit

**Generated:** 2026-05-07.

## Spec sources

There is **no `specs/w4-saige/` directory** in this repo. The user-supplied
IDs `SG-P0-01` and `SG-P0-02` do not appear anywhere in the codebase or
docs. The closest authoritative material is:

- `docs/audits/saigeplatform-2026-05-05/` — audit on the **target** domain
  `saigeplatform.com` (4 P0s + 5+ P1s, score 47/100).
- `docs/audits/saige-2026-05-05/` — audit on the **legacy** domain
  `saigedemo.com` (4 P0s + 5+ P1s, score 58/100).
- `docs/audits/saige-cutover-plan.md` — migration plan from saigedemo →
  saigeplatform.

Each audit's P0s are listed here with a status verdict.

## P0 register — `saigeplatform.com` audit

### `saigeplatform-2026-05-05` P0-001 — `/investor` and `/app` soft-404

**Mapping to user-referenced ID:** Closest match for "homepage rendering gap
on saigeplatform.com" — though strictly this is a routing gap, not a homepage
rendering gap. No exact `SG-P0-01` exists.

**Status:** **UNFIXED in this repo's territory.**
Reason: SAIGE's product code lives in a **separate repo** (Base44 app at
`saigeplatform.com`). From this repo (`flowai`) we cannot edit
`next.config.js` / `vercel.json` / route components in SAIGE's app.
`docs/audits/saigeplatform-2026-05-05/CLAUDE_CODE_BACKLOG.md:50-52` calls
this out explicitly: "This routing fix lives in **SAIGE's** repo, not
FlowAI's."

The acceptance criterion (`/investor` and `/app` no longer soft-404, or no
links to them) cannot be verified from this repo.

### `saigeplatform-2026-05-05` P0-001 (BASE44 queue) — `[PENDING]` placeholder strings on home

(Same numeric ID, different file — `BASE44_FIX_QUEUE.md` repurposes P0
numbering per fix queue.)

**Status:** **UNFIXED, in Base44/UI territory.** The home page renders
literal `[ENTERPRISE PARTNER LOGO PENDING]` and `[ENTERPRISE TESTIMONIAL
PENDING]` strings. Fix is in SAIGE's Base44 app, not in `src/pages/` here
(no SAIGE home component lives in this repo).

### `saigeplatform-2026-05-05` P0-002 (BASE44 queue) — Hero `Request Demo` has no inline form

**Mapping to user ID:** no clean match. The user-supplied "/get-access demo
disclaimer" string `SG-P0-02` does not appear in any audit doc — the closest
SAIGE-side P0 about a demo CTA is the "no inline form under hero".

**Status:** **UNFIXED in SAIGE's repo.** Backend half is shipped:
`/api/leads/capture` exists in this repo (`api/leads/capture.js`,
3919 b) and is documented to receive `product_id: 'saige'` plus
`source_page: '/'`. UI half (the form) lives in SAIGE's repo.

### `saigeplatform-2026-05-05` P0-003 (BASE44 queue) — Sandbox warning banner risk-language framing

**Status:** **UNFIXED in SAIGE's repo.** The audit recommends reframing
"do not enter real data" as a positive sandbox assurance. UI work; no
backend involvement.

### `saigeplatform-2026-05-05` P0-004 — (no P0-004 in saigeplatform queue; the saigedemo audit has more P0s)

## P0 register — `saigedemo.com` (legacy) audit

`docs/audits/saige-2026-05-05/CLAUDE_CODE_BACKLOG.md` had originally been
written before the `saige-cutover-plan.md` reframe; its P0s align with the
PressAI audit numbering (sign-up / sign-in / hero capture / privacy
timestamp / trust block).

| ID | Surface | Status (in this repo) |
|---|---|---|
| `saige-2026-05-05` P0-001 | `/sign-up` route | **Backend ✅** (`api/auth/sign-up.js`); UI in SAIGE repo: TBD. |
| `saige-2026-05-05` P0-002 | `/sign-in` route | **Backend ✅** (`api/auth/sign-in.js`); UI in SAIGE repo: TBD. |
| `saige-2026-05-05` P0-003 | Hero email capture | **Backend ✅** (`api/leads/capture.js`); UI in SAIGE repo: TBD. |
| `saige-2026-05-05` P0-004 | Privacy policy timestamp | UI only — TBD in SAIGE repo. |
| `saige-2026-05-05` P0-005 | Trust block (logos / testimonials / sourced stats) | UI + Victor decisions — TBD. |

The `saige-cutover-plan.md` document is the authoritative reconciliation:
once `saigedemo.com` 301-redirects to `saigeplatform.com`, the legacy
audit's P0s are subsumed into the saigeplatform audit's P0 set.

## Verdict matrix

| User-supplied ID | Closest existing audit ID | Addressed? | Where |
|---|---|---|---|
| `SG-P0-01` (homepage rendering gap on saigeplatform.com) | `saigeplatform-2026-05-05` P0-001 (BASE44_FIX_QUEUE — `[PENDING]` strings) **OR** `saigeplatform-2026-05-05` P0-001 (CLAUDE_CODE_BACKLOG — `/investor` + `/app` soft-404) | **No** — both are SAIGE-repo work, not FlowAI repo. | SAIGE's Base44 app (not this repo). |
| `SG-P0-02` (`/get-access` demo disclaimer) | **Not found.** The SAIGE platform has no `/get-access` route in any audited capture. The closest match is the saigeplatform-2026-05-05 BASE44 queue P0-003 (sandbox warning banner risk-language framing) on `/live-demo`. | Ambiguous — no codebase evidence either way; nothing in this repo touches a `/get-access` URL or any demo-disclaimer string under that name. | n/a |

### Codebase grep evidence

- `git grep -i 'get-access'` — zero matches.
- `git grep '\[PENDING\]' src/` — zero matches in this repo (the
  `[ENTERPRISE PARTNER LOGO PENDING]` / `[ENTERPRISE TESTIMONIAL PENDING]`
  strings live in SAIGE's repo, not here).
- `git grep '/investor' api/ src/` — only references in audit docs and
  `src/pages/InvestorStudio.jsx` (FlowAI's own internal page, not SAIGE's).
- `git grep '/app' api/` — only generic API path references, no SAIGE
  routing.

## Categorization

| Category | Count | Items |
|---|---|---|
| **Addressed** in this repo (backend ready) | 3 | sign-up backend, sign-in backend, leads-capture backend (per `b176518`) |
| **Unfixed** (in SAIGE's separate repo / Base44) | 6+ | `/investor` + `/app` routing, `[PENDING]` placeholder strings, hero inline form, sandbox banner reframe, privacy timestamp, trust block, EIP methodology link |
| **Ambiguous** (user-supplied ID has no match) | 1 | `SG-P0-02 /get-access demo disclaimer` — no codebase evidence; surface unverified |

### Recommendation

When the user clarifies what `SG-P0-01` and `SG-P0-02` denote (point to a
specific spec file or audit row), this report can be tightened. Right now the
inferred mapping is to `saigeplatform-2026-05-05` P0-001 and a possibly
non-existent ticket.

The actionable items remaining for the FlowAI repo are:
1. Confirm `/api/leads/capture` is reachable from SAIGE's hero form once
   that form ships (verification only — backend is ready).
2. Reconcile `productDomains.js` `live_url: 'https://saigedemo.com'` with the
   audit recommendation that this domain be retired in favor of
   `saigeplatform.com`. (Right now `productDomains.js` keeps `saigedemo.com`
   as live and lists `saigeplatform.com` as the migration target.)
