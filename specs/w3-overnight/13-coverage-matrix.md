# Job 13 — Marketplace 8-Step Coverage Matrix

## Source of truth for the 8 steps

`src/lib/operationsEngine.js` lines 3–12, exported as `STEPS`:

| # | Key | Label | Description (abridged) |
|---|---|---|---|
| 1 | `research` | Research | Market analysis, product brief, audience and competitive intelligence |
| 2 | `design` | Design | Visual design, UX, layout, mobile responsiveness |
| 3 | `build` | Build | Route coverage, navigation, broken links, form functionality |
| 4 | `qa_audit` | Quality Audit | Four-dimension quality scoring — content, technical, UX, compliance |
| 5 | `deploy` | Deploy | HTTPS, load time, domain config, robots.txt, public accessibility |
| 6 | `govern` | Self-Renewal | Autonomous governance cycle (FlowAI self-tests/heals/optimizes/upgrades) |
| 7 | `gtm` | Go To Market | Demo readiness, GTM risks, top fix before any prospect demo |
| 8 | `monitor` | Monitor | Final report — all findings compiled into a clearance decision |

Also confirmed by:
- `supabase/migrations/0001_initial.sql:128` — `step_key text not null, -- research|design|build|qa_audit|deploy|govern|gtm|monitor`
- `supabase/migrations/0004_tool_marketplace.sql:120` — `step_number int check (step_number between 1 and 8)`.

## Source of truth for agents

`src/lib/agents/BaseAgent.js` lines 17–38 — `AGENT_IDS` constant. Note: **all 20 agent IDs are declared, but no concrete agent class exists** (only `BaseAgent` abstract + `MessageSchema`). The mapping below is therefore a **logical mapping by role, not by code**.

## Step × Agent × Marketplace category × W0-locked vendors matrix

| # | Step | Logical agent (per `AGENT_IDS`) | Agent built? | Registry category that fits | Tool count | W0-locked vendors expected here | Locks present? |
|---|---|---|---|---|---|---|---|
| 1 | research | `RESEARCH = 6` | ❌ Not built | Research (Perplexity, Tavily, Exa, SerpAPI, You.com) | 5 | Crunchbase Enterprise, USPTO/EPO/WIPO direct feeds | ❌ 0/4 present |
| 2 | design | `DESIGN = 7` | ❌ Not built | Design (Figma, Framer, Canva, Lovable, v0) | 5 | (none specified by W0) | n/a |
| 3 | build | `CODE_BUILDER = 2` | ❌ Not built | Build (Base44, Replit, Bolt, Cursor, Windsurf) | 5 | (none specified by W0) | n/a |
| 4 | qa_audit | `QUALITY_AUDIT = 8` (FlowAI-only) | ❌ Not built | Testing (Playwright, Cypress, Vitest, Jest, Postman) | 5 | (none specified by W0) | n/a |
| 5 | deploy | **No matching agent in `AGENT_IDS`** | ❌ N/A | Deployment (Vercel, Railway, Render, Fly.io, Netlify) | 5 | Cloudflare Bot Management | ❌ 0/1 present |
| 6 | govern | `SELF_RENEWAL = 3` (label "Self-Renewal" matches) | ❌ Not built | Governance (FlowAI only) | 1 | Bloomberg Law, GrowthBook, Markify | ❌ 0/3 present |
| 7 | gtm | `GO_TO_MARKET = 9` | ❌ Not built | **No dedicated category**; spans Email + Payments + Monitoring (multi-category step) | varies | Productboard, Cube | ❌ 0/2 present |
| 8 | monitor | `MONITOR = 10` | ❌ Not built | Monitoring (Sentry, LogRocket, Datadog, **PostHog ✅**, Uptime Robot) | 5 | PostHog ✅, Electricity Maps, WattTime | ✅ 1/3 present (PostHog) |

## Gaps surfaced by the matrix

### Gap 1 — Step 5 (`deploy`) has no owning agent
`AGENT_IDS` runs `1 LIFECYCLE_ENGINE, 2 CODE_BUILDER, 3 SELF_RENEWAL, 4 PROVIDER_ONBOARDING, 5 END_CUSTOMER_INTAKE, 6 RESEARCH, 7 DESIGN, 8 QUALITY_AUDIT, 9 GO_TO_MARKET, 10 MONITOR, ...`. **There is no Deploy agent.** The `deploy` step in the Auto Runner has registry tools to recommend (5 of them) but no agent owner per the canonical roster. This is either:
- a missing 21st agent (would violate the "20 agent" partition validated at `BaseAgent.js:43–47`), **or**
- the lifecycle engine (Agent #1) is implicitly responsible, **or**
- step 5 is operator-driven only (no agent), with the marketplace recommending tools and the operator picking.

**Action:** W3 must clarify with W0 which is correct.

### Gap 2 — Step 7 (`gtm`) has no dedicated registry category
The Auto Runner's `gtm` step is described as "Demo readiness score, GTM risks, top fix before any prospect demo" — this conceptually consumes Email tools (Resend, SendGrid), Payments tools (Stripe, Paystack), and Monitoring (PostHog) for funnel-readiness. But the registry has no `GTM` or `Marketing` or `Sales` category. **A consumer asking "what do I use at the GTM step?" gets a multi-category fan-out and no canonical mapping.**

**Action:** W3 needs either a `GTM` category or a `recommended_steps: int[]` field on each tool.

### Gap 3 — Step 6 (`govern`) is single-vendor
Governance category contains exactly one tool: **FlowAI**. By construction, this step is FlowAI-proprietary. The W0 vendor locks for this step (Bloomberg Law for legal/regulatory, GrowthBook for feature flags, Markify for trademark watch) are **not** in the registry — they would belong to new categories (Legal & Regulatory, Feature Flags, Brand Watch).

### Gap 4 — Step 8 (`monitor`) has the strongest W0-lock match
Of the 13 W0-locked vendors, only **PostHog** is in the registry, and it sits in the Monitoring category — exactly where it should be for the `monitor` step. So step 8 is the most "ready" for clearance against W0 locks. Steps 1, 5, 6 lock vendors that are entirely missing.

### Gap 5 — `tool_categories.step_numbers` table is unpopulated
`supabase/migrations/0004_tool_marketplace.sql` defines `tool_categories.step_numbers int[]` (line 14 of 0004) — designed to encode exactly this matrix in the database. **However, no SQL inserts populate this column anywhere in the migration set.** Once W3 lands, this column must be backfilled so the marketplace recommender can answer "what categories serve step N?" without a hardcoded mapping in JS.

## Coverage by category × step (intended)

The table below is what the matrix **should** look like once `tool_categories.step_numbers` is populated. Today it is empty.

| Category | Step(s) it serves (recommended) |
|---|---|
| Research | 1 |
| Design | 2 |
| Build | 3 |
| Database | 3 (build), 5 (deploy infra) |
| Authentication | 3 (build) |
| Deployment | 5 |
| Payments | 7 (gtm) |
| SMS | 7 (gtm) |
| AI/LLM | 1 (research synthesis), 3 (build copilots), 4 (audit reasoning), 6 (self-renewal), 7 (gtm copy) — fan-out across 5 steps |
| Testing | 4 (qa_audit) |
| Monitoring | 8 |
| Email | 7 (gtm) |
| Governance | 6 |

## Conclusion

- 8 steps × ~13 categories = the matrix is **structurally defined** (Auto Runner steps exist, registry categories exist, the join column exists in 0004) but **operationally empty**: no agents are concrete, no `step_numbers` are populated.
- Step 5 (`deploy`) has no canonical agent owner — drift between Auto Runner step list and `AGENT_IDS` roster.
- Step 7 (`gtm`) has no dedicated category — multi-category fan-out only.
- 1 of 13 W0-locked vendors (PostHog → step 8) is in place.
