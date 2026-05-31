# Job 2 — Marketplace Tool Registry Deep Audit

## Source location

**`src/lib/marketplace/` does not exist.** The only registry-shaped data module is `src/lib/toolRegistry.js`. This audit treats `toolRegistry.js` as the de-facto registry.

## Schema actually present in `TOOL_REGISTRY`

Each entry has these fields:

```
name, category, description, performance_score, cost_tier, cost_details,
africa_available, base44_compatible, production_compatible, official_url, tags
```

## Schema fields the user's prompt assumes (W0 ruling) but that DO NOT exist on any entry

| Required field | Present? | Notes |
|---|---|---|
| `vendor` (separate from name) | ❌ **Missing on all 61 tools** | `name` doubles as vendor identifier; no separate `vendor` slot. |
| `doppler_compat` | ❌ **Missing on all 61 tools** | The `base44_compatible` field exists (`'native' \| 'api' \| 'none'`) but it is not the same axis. |
| `wave` (Wave 1 vs 1.5) | ❌ **Missing on all 61 tools** | No wave assignment on any entry. |
| `agents` / `consumed_by_agents` | ❌ **Missing on all 61 tools** | Cannot trace which agent consumes which tool from the registry side. |

## Per-tool report

Because `vendor`, `doppler_compat`, `wave`, and `agents` are uniformly absent, a per-tool table would repeat "n/a" 61 × 4 times. Instead, here is the inventory grouped by category, with the fields that actually exist:

### Research (5)
| Name | base44_compatible | africa_available | cost_tier |
|---|---|---|---|
| Perplexity AI | api | yes | freemium |
| Tavily | api | yes | paid |
| Exa | api | yes | freemium |
| SerpAPI | api | yes | paid |
| You.com | api | yes | freemium |

### Design (5)
| Name | base44_compatible | africa_available | cost_tier |
|---|---|---|---|
| Figma | none | yes | freemium |
| Framer | none | yes | freemium |
| Canva | none | yes | freemium |
| Lovable | api | yes | freemium |
| v0 by Vercel | api | yes | freemium |

### Build (5)
| Name | base44_compatible | africa_available | cost_tier |
|---|---|---|---|
| Base44 | native | yes | freemium |
| Replit | api | limited | freemium |
| Bolt | api | yes | freemium |
| Cursor | api | yes | freemium |
| Windsurf | api | yes | freemium |

### Database (5)
| Name | base44_compatible | africa_available | cost_tier |
|---|---|---|---|
| Supabase | api | yes | freemium |
| PlanetScale | api | yes | freemium |
| Firebase | api | yes | freemium |
| Neon | api | yes | freemium |
| MongoDB Atlas | api | yes | freemium |

### Authentication (5)
Supabase Auth, Clerk, Auth0, Firebase Auth, NextAuth.

### Deployment (5)
Vercel, Railway, Render, Fly.io, Netlify.

### Payments (5)
Stripe, Paystack, Flutterwave, Paddle, Lemonsqueezy.

### SMS (5)
Twilio, Africa's Talking, Vonage, MessageBird, Termii.

### AI/LLM (5)
Anthropic Claude, OpenAI GPT-4, Google Gemini, Mistral, Groq.

### Testing (5)
Playwright, Cypress, Vitest, Jest, Postman.

### Monitoring (5)
Sentry, LogRocket, Datadog, **PostHog**, Uptime Robot.

### Email (5)
Resend, SendGrid, Mailchimp, Postmark, Brevo.

### Governance (1)
FlowAI.

**Total:** 61 tools across 13 categories (verified by `tests/marketplace_inventory.test.js`, 7/7 passing).

## Charter `marketplaceTools` cross-check

**Status:** ⚠️ NOT POSSIBLE TO PERFORM AT REPO STATE.

- `BaseAgent.js` defines a `charter` schema that includes a `marketplaceTools` array (validated as `Array.isArray` only — `BaseAgent.js:246–247`).
- However, **no concrete agent class implements `static charter()` in `src/lib/agents/`.** A `Glob src/lib/agents/*` returns only `BaseAgent.js` and `MessageSchema.js`. There are no `01-*.js` … `20-*.js` files.
- The `src/docs/w2/v3-defect-register.md` claims D-009 was "RESOLVED IN PACKET 1" with stubs at `/src/lib/agents/06-research.js` and `/src/lib/agents/07-design.js`, and D-015 claims `/src/lib/agents/AgentRegistry.js` was delivered. **Neither file exists in this repo** — the defect-register claims do not match repo reality.
- Therefore the charter-side `marketplaceTools` lists do not yet exist. Cross-check is impossible.

**Action required (W3 input):** Once concrete agent charters land, every `charter.marketplaceTools` entry must resolve to a `TOOL_REGISTRY[i].name`. Today: 0 charters, 0 cross-checks.

## Stack-side cross-check (only possible reverse mapping today)

`VEU_STACKS` (in the same `toolRegistry.js`) names tools by category for each of 5 products. Cross-checking those names against `TOOL_REGISTRY` exposes one **expected-but-missing** entry:

| Stack | Category | Tool referenced | Present in TOOL_REGISTRY? |
|---|---|---|---|
| SAIGE | AI/LLM | **NeuralMax Pro** | ❌ Missing — no registry entry. |

All 18 other stack-side names resolve cleanly. This is the single concrete inconsistency in the data today.

Note: africa_available field renamed to underserved_accessible in W11-cleanup (2026-05-30).
