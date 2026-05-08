# 08 — Vendor procurement readiness (Part 2)

Date: 2026-05-07
**Supersedes** Part 1's `07-vendor-readiness.md`. Part 1 catalogued status; Part 2 attaches concrete next-step actions per vendor and a procurement queue.

## 1. Vendor master list

Aggregating from Part 1 plus Part 2's later jobs (DMCA, Stripe, tax, rotation):

| # | Vendor | Status | Spec dependency | Next concrete step |
|---|---|---|---|---|
| 1 | Anthropic | LIVE | None | Set rotation cadence per `09-rotation-completeness.md` |
| 2 | Browserless | LIVE | None | Same |
| 3 | Vercel | LIVE | Resolve split `vercel.json` (`14-cross-reference.md`) | Same |
| 4 | OpenAI | LIVE but uninventoried | `12-inventory-expansion.md` | Add to `docs/ENV_VARS.md` (P0) |
| 5 | Base44 SDK (browser) | LIVE | None | Same as #1 |
| 6 | Base44 server proxy | PARTIAL — agent code wired, vendor not active | None | Decide whether to keep `BASE44_API_*` server-side proxy or remove |
| 7 | Supabase | READY TO PROCURE | None | Provision project, set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, redeploy |
| 8 | Inngest | READY TO PROCURE | None | Provision app, set `INNGEST_EVENT_KEY` + `INNGEST_SIGNING_KEY` |
| 9 | Clerk | READY TO PROCURE | None | Provision dashboard, set `CLERK_SECRET_KEY` |
| 10 | Resend | READY TO PROCURE | DNS records per `06-dns-checklist.md §3.3` for `veuaistudio.com` | Verify domain in Resend, then set `RESEND_API_KEY` + `EMAIL_FROM` |
| 11 | Voyage AI | READY TO PROCURE | None | Provision, set `VOYAGE_API_KEY` |
| 12 | Axiom | READY TO PROCURE | None | Provision dataset, set `AXIOM_TOKEN` + `AXIOM_DATASET` |
| 13 | Playwright (self-hosted endpoint) | OPTIONAL FALLBACK | None | Defer until Browserless reaches usage cap |
| 14 | GitHub | PARTIAL — used in 1 base44 function | `12-inventory-expansion.md` | Inventory `GITHUB_TOKEN`; rotate to fine-grained PAT |
| 15 | **Stripe** | **PARTIAL SCAFFOLDED** — packages installed, never imported | `10-stripe-status.md` (Part 2 below) | Provision Stripe account (CEO confirmed); implement webhook + Connect surface per `10-stripe-status.md §6` |
| 16 | **Doppler** | NO INTEGRATION EVIDENCE on producer side | `08-doppler-readiness.md` (Part 1) | Stay in Mode B; defer Mode A to follow-on sprint |
| 17 | Cloudflare (Bot Management) | NO INTEGRATION EVIDENCE | `05-cloudflare-checklist.md` (Part 2) + `07-dmca-inventory.md` | Add domains to a single Cloudflare account; provision per Part 2 §3 |
| 18 | **Markify** (W0-locked) | NO INTEGRATION EVIDENCE | `07-dmca-inventory.md` Part 2 | Procure once Agent #13 charter is authored; add `MARKIFY_API_KEY` to inventory |
| 19 | Crunchbase Enterprise (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer — used by Agent #15 (Benchmarking) which is unbuilt per W2 roster |
| 20 | Bloomberg Law (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer — used by Agent #14 (Public Policy) which is unbuilt |
| 21 | PostHog (W0-locked) | NO INTEGRATION EVIDENCE (catalog entry only) | None | Decide product-analytics need; if yes, add `POSTHOG_API_KEY` to inventory |
| 22 | Productboard (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer — internal tool, not user-facing |
| 23 | GrowthBook (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer until feature-flag use case lands |
| 24 | Cube (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer — needs warehousing layer first |
| 25 | Electricity Maps (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer — used by Agent #20 (Environmental Impacts) which is unbuilt |
| 26 | WattTime (W0-locked) | NO INTEGRATION EVIDENCE | None | Same |
| 27 | USPTO direct feed (W0-locked) | NO INTEGRATION EVIDENCE | None | Defer — used by IP-protection cross-check |
| 28 | EPO direct feed (W0-locked) | NO INTEGRATION EVIDENCE | None | Same |
| 29 | WIPO direct feed (W0-locked) | NO INTEGRATION EVIDENCE | None | Same |
| 30 | Recorded Future | NOT YET SPECCED | None | Decision: skip for early-stage VEU |
| 31 | Flashpoint | NOT YET SPECCED | None | Same |
| 32 | ZeroFox | NOT YET SPECCED | None | Same |

## 2. Procurement queue (priority-ordered)

### Tier 1 — Procure this week

| Vendor | Why now | Code-side prerequisite | Cost (per docs) |
|---|---|---|---|
| Supabase | Persistence, replaces in-memory ring buffers per `docs/ENV_VARS.md:25–40` | None — code wired | Free tier, then $25/mo |
| Inngest | Background jobs (Auto Runner, scheduled clearance) | None — code wired | Free tier |
| Clerk | Multi-tenant auth | None — code wired | Free up to 10k MAU |
| Resend | Transactional email | DNS records per `06-dns-checklist.md §3.3` | Free 3k emails/mo, then $20/mo |
| Stripe (CEO acquired) | Billing + Connect | Implement webhook + Connect per `10-stripe-status.md §6` | 2.9% + $0.30/txn |
| Cloudflare | All 8 zones — see `05-cloudflare-checklist.md` | None | Free tier covers all controls except Super Bot Fight Mode |

### Tier 2 — Procure next 2–4 weeks

| Vendor | Why | Prerequisite |
|---|---|---|
| Voyage AI | Embeddings, semantic search | None — code wired |
| Axiom | Structured logging | None — code wired |
| Markify | DMCA workstream | Agent #13 charter authored |

### Tier 3 — Defer until specific agent built

| Vendor | Triggering agent (per `BaseAgent.AGENT_IDS`) |
|---|---|
| Crunchbase Enterprise | Agent #15 Benchmarking |
| Bloomberg Law | Agent #14 Public Policy |
| PostHog | Decision pending — analytics layer |
| GrowthBook | Decision pending — flagging layer |
| Cube | Decision pending — warehousing layer |
| Productboard | Internal product mgmt — defer |
| Electricity Maps + WattTime | Agent #20 Environmental Impacts |
| USPTO/EPO/WIPO direct feeds | Agent #13 cross-check (post-MVP) |

### Tier 4 — Decline / out-of-scope for early-stage

| Vendor | Reason |
|---|---|
| Recorded Future | Threat intel — overkill until product attracts active threat actors |
| Flashpoint | Same |
| ZeroFox | Same; Markify covers brand-watch needs at lower cost |

## 3. Procurement-side dependencies (chain of provisioning)

1. **`veuaistudio.com` DNS** (Resend domain verification) → unblocks **Resend** procurement
2. **Cloudflare account + zones** → unblocks **DMCA** workstream + bot management
3. **Stripe account** (CEO acquired) → unblocks **Stripe Connect** implementation per `10-stripe-status.md`
4. **Markify procurement** + **Agent #13 implementation** → unblocks `gov.ip_protection` evaluator + DMCA flow

## 4. Vendor cost summary (annualised, conservative)

Based on prices in `docs/ENV_VARS.md` and `src/lib/toolRegistry.js` cost_details fields.

| Tier | Vendors | Annual estimate (USD) |
|---|---|---|
| 1 (procure now) | Supabase + Inngest + Clerk + Resend + Stripe + Cloudflare Pro | $25×12 + $0 + $25×12 + $20×12 + ~2.9% × revenue + $20×12 ≈ $1,080 + revenue% |
| 2 (next month) | Voyage + Axiom + Markify | (Voyage usage-based) + ~$25×12 + (Markify quote) ≈ $300 + Markify |
| 3 (later) | Crunchbase Enterprise alone is **>$10k/yr**; Bloomberg Law similar | $20k+ if/when activated |
| 4 (decline) | $0 |

For MVP-through-first-revenue, Tier 1 + Tier 2 keeps total recurring vendor spend under ~$2k/year before usage scales.

## 5. Procurement-side risks

1. **Domain verification timing** — Resend verification of `veuaistudio.com` requires DNS propagation. Plan 24h between DNS publish and Resend activation.
2. **Stripe account activation** — Stripe Connect Express/Custom platform onboarding requires platform approval; can take 3–7 business days. Start before code is ready.
3. **Markify pricing** — not in `toolRegistry.js`; quote needed. Budget unclear.
4. **Cloudflare plan tier** — Super Bot Fight Mode requires Pro plan ($20/mo per zone). 8 zones × $20 = $160/mo if all Pro. Recommend Pro on the 5 product/corporate zones, Free on the 3 personal/marketing/reserved.

## 6. Verdict

| Status | Vendor count | Note |
|---|---|---|
| LIVE in production | 5 | Anthropic, Browserless, Vercel, OpenAI (uninventoried), Base44 SDK |
| READY TO PROCURE this week | 6 | Supabase, Inngest, Clerk, Resend, Stripe, Cloudflare |
| Tier 2 (procure 2–4 weeks) | 3 | Voyage, Axiom, Markify |
| Tier 3 (deferred) | 8 | Crunchbase, Bloomberg, PostHog, GrowthBook, Cube, Productboard, Electricity Maps, WattTime, USPTO/EPO/WIPO |
| Tier 4 (decline / out-of-scope) | 3 | Recorded Future, Flashpoint, ZeroFox |
| Total procurement decisions made | 25 | Up from 0 in Part 1 |

The procurement bottleneck is no longer "we don't know what to buy" — it's now (a) DNS for Resend, (b) Stripe approval timeline, (c) Cloudflare zone consolidation. All three can run in parallel.
