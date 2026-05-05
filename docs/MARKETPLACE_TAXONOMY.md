# Marketplace Taxonomy — Categories & Tools

Auto-generated from `api/_lib/marketplaceSeed.js` — the single source of truth for the marketplace's static data. To add or update a tool, edit the seed and re-run `node scripts/generate-marketplace-taxonomy.mjs`.

## Lifecycle steps

| # | Name | Categories that serve this step |
|---|---|---|
| 1 | Research | ai_llm, ai_embeddings, ai_specialized |
| 2 | Design | ai_llm, ai_specialized |
| 3 | Build | hosting, databases, auth, payments, email, ai_llm, ai_specialized, jobs, storage |
| 4 | Quality Audit | ai_llm, ai_embeddings, ai_specialized, observability |
| 5 | Deploy | hosting, databases, storage |
| 6 | Self-Renewal | email, ai_llm, jobs, observability |
| 7 | Go To Market | payments, email, analytics, gtm |
| 8 | Monitor | jobs, observability, analytics |

## Region scoring (0-100)

Each tool carries a 5-region score capturing latency, data residency, payment-rail availability, language support, and support-hours overlap. Higher = stronger fit. The `region` query param on /recommend uses this score directly in the `data_residency` dimension.

Examples of region-sensitive scoring from the seed:
- Paystack: 98/30/30/25/30 — built for African card rails
- Cloudflare R2: 85/92/92/90/82 — global edge, near-uniform
- Vercel: 60/88/95/80/70 — US-strong, weaker in Africa/LatAm

## Categories

### Hosting & Deployment (`hosting`)
Lifecycle steps: S3 Build, S5 Deploy  
Where the application runs in production. Includes serverless platforms, edge networks, and PaaS.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| vercel | Vercel Inc. | $20 per seat + usage | Yes | 60/88/95/80/70 | 1/5 |
| netlify | Netlify | $19/mo | Yes | 55/82/90/78/65 | 1/5 |
| cloudflare-pages | Cloudflare | $5/mo | Yes | 85/95/95/90/85 | 2/5 |
| railway | Railway | $5 usage credits | Yes | 50/80/92/75/60 | 2/5 |
| render | Render | $7/mo | Yes | 50/80/90/75/60 | 2/5 |
| fly-io | Fly.io | $5/mo | No | 70/88/90/82/70 | 3/5 |
| aws-amplify | AWS | $0/mo | Yes | 75/90/95/90/75 | 4/5 |

### Databases (`databases`)
Lifecycle steps: S3 Build, S5 Deploy  
Persistent data storage. Relational (Postgres-flavoured), document, and edge-resident options.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| supabase | Supabase | $25 per project + usage | Yes | 70/88/92/80/75 | 1/5 |
| planetscale | PlanetScale | $39/mo | No | 60/85/92/82/70 | 2/5 |
| neon | Neon | $19 per project + usage | Yes | 60/85/90/80/70 | 1/5 |
| mongodb-atlas | MongoDB | $9/mo | Yes | 70/88/92/88/75 | 2/5 |
| firebase | Google | $0/mo | Yes | 70/90/95/90/78 | 2/5 |
| turso | Turso | $29/mo | Yes | 80/90/92/88/80 | 2/5 |
| pocketbase | PocketBase | $0/mo | Yes | 75/80/80/80/75 | 2/5 |

### Authentication (`auth`)
Lifecycle steps: S3 Build  
User identity, session management, SSO, and organisation handling.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| clerk | Clerk | $25 per MAU above free tier | Yes | 60/85/92/80/70 | 1/5 |
| auth0 | Okta | $35/mo | Yes | 70/92/95/90/75 | 3/5 |
| supabase-auth | Supabase | $25/mo | Yes | 70/88/92/80/75 | 1/5 |
| firebase-auth | Google | $0/mo | Yes | 72/88/95/90/78 | 2/5 |
| nextauth | Auth.js | $0/mo | Yes | 75/80/80/80/75 | 3/5 |
| workos | WorkOS | $0 per SSO connection | Yes | 60/88/95/80/70 | 2/5 |
| stytch | Stytch | $0/mo | Yes | 60/85/92/80/70 | 2/5 |

### Payments (`payments`)
Lifecycle steps: S3 Build, S7 Go To Market  
Card processing, subscriptions, billing, payouts. Region-sensitive.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| stripe | Stripe | $0 2.9% + 30¢ per successful transaction | Yes | 45/92/98/85/80 | 2/5 |
| lemon-squeezy | Lemon Squeezy | $0 5% + 50¢ per sale | No | 70/90/92/85/80 | 1/5 |
| paddle | Paddle | $0 5% + 50¢ per transaction | Yes | 60/92/88/80/75 | 2/5 |
| paystack | Paystack (Stripe) | $0 1.5-3.9% per transaction | Yes | 98/30/30/25/30 | 2/5 |
| flutterwave | Flutterwave | $0 1.4-3.8% per transaction | Yes | 95/35/40/35/35 | 3/5 |
| paypal | PayPal | $0/mo | Yes | 70/88/92/80/80 | 3/5 |
| square | Block (Square) | $0/mo | Yes | 35/70/92/75/50 | 3/5 |

### Email & Notifications (`email`)
Lifecycle steps: S3 Build, S6 Self-Renewal, S7 Go To Market  
Transactional + marketing email, SMS, push notifications.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| resend | Resend | $20/mo | Yes | 60/88/92/80/70 | 1/5 |
| postmark | ActiveCampaign | $15/mo | Yes | 60/88/92/78/70 | 1/5 |
| sendgrid | Twilio | $19.95/mo | Yes | 70/90/95/85/75 | 2/5 |
| mailgun | Sinch | $35/mo | Yes | 60/88/92/80/75 | 2/5 |
| loops | Loops | $49/mo | Yes | 55/85/92/78/65 | 1/5 |
| customer-io | Customer.io | $100/mo | Yes | 60/88/92/80/75 | 3/5 |
| twilio | Twilio | $0/mo | Yes | 75/90/95/88/80 | 3/5 |

### AI Models — LLMs (`ai_llm`)
Lifecycle steps: S1 Research, S2 Design, S3 Build, S4 Quality Audit, S6 Self-Renewal  
Frontier text generation models for research, drafting, summarisation, agent workflows.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| anthropic-claude | Anthropic | $0 Sonnet $3 in / $15 out per M tokens; Opus $15 / $75 | No | 70/88/92/80/75 | 1/5 |
| openai-gpt | OpenAI | $0/mo | No | 70/88/95/85/75 | 1/5 |
| google-gemini | Google | $0/mo | Yes | 72/88/95/92/78 | 2/5 |
| xai-grok | xAI | $0/mo | No | 60/80/92/75/65 | 1/5 |
| deepseek | DeepSeek | $0/mo | No | 70/75/75/95/70 | 1/5 |
| mistral | Mistral AI | $0/mo | No | 65/95/80/75/70 | 1/5 |
| cohere | Cohere | $0/mo | Yes | 65/88/88/80/70 | 2/5 |
| meta-llama | Meta | $0/mo | Yes | 75/80/85/80/75 | 3/5 |

### AI Models — Embeddings (`ai_embeddings`)
Lifecycle steps: S1 Research, S4 Quality Audit  
Vector embedding APIs for semantic search and clustering.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| voyage-ai | Voyage AI | $0 $0.02-0.18 per M tokens | Yes | 60/85/92/80/70 | 1/5 |
| openai-embeddings | OpenAI | $0/mo | No | 70/88/95/85/75 | 1/5 |
| cohere-embeddings | Cohere | $0/mo | Yes | 65/88/88/80/70 | 2/5 |
| jina | Jina AI | $0/mo | Yes | 65/88/85/88/70 | 1/5 |
| bge | BAAI | $0/mo | Yes | 70/75/78/92/70 | 3/5 |

### AI Models — Specialized (`ai_specialized`)
Lifecycle steps: S1 Research, S2 Design, S3 Build, S4 Quality Audit  
Purpose-built APIs: web search/research (Perplexity), voice (ElevenLabs), image/video (Replicate), browser automation (Browserless).

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| perplexity | Perplexity | $0/mo | Yes | 65/85/92/80/70 | 1/5 |
| elevenlabs | ElevenLabs | $5/mo | Yes | 70/90/92/85/78 | 1/5 |
| replicate | Replicate | $0/mo | Yes | 60/85/92/78/70 | 1/5 |
| browserless | Browserless | $50/mo | Yes | 60/88/92/78/70 | 2/5 |

### Background Jobs & Queues (`jobs`)
Lifecycle steps: S3 Build, S6 Self-Renewal, S8 Monitor  
Async job execution, cron, durable workflows, queues.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| inngest | Inngest | $50/mo | Yes | 60/85/92/78/70 | 1/5 |
| trigger-dev | Trigger.dev | $20/mo | Yes | 60/88/90/78/70 | 1/5 |
| temporal | Temporal Technologies | $0/mo | Yes | 60/88/92/80/70 | 5/5 |
| bullmq | Taskforce.sh | $0/mo | Yes | 80/80/80/80/80 | 3/5 |
| cloudflare-queues | Cloudflare | $5/mo | Yes | 85/92/92/90/82 | 2/5 |

### Observability & Logging (`observability`)
Lifecycle steps: S4 Quality Audit, S6 Self-Renewal, S8 Monitor  
Structured logs, traces, error tracking, uptime monitoring.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| axiom | Axiom | $25/mo | Yes | 60/88/92/80/72 | 1/5 |
| datadog | Datadog | $15/mo | Yes | 70/92/95/88/78 | 3/5 |
| sentry | Sentry | $26/mo | Yes | 65/90/92/82/75 | 1/5 |
| better-stack | Better Stack | $25/mo | Yes | 65/90/92/80/72 | 2/5 |
| highlight | Highlight | $50/mo | Yes | 60/85/90/78/70 | 2/5 |

### Analytics & Product Intel (`analytics`)
Lifecycle steps: S7 Go To Market, S8 Monitor  
Usage analytics, funnel tracking, session replay, customer behavior analysis.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| posthog | PostHog | $0/mo | Yes | 70/90/92/80/75 | 2/5 |
| mixpanel | Mixpanel | $25/mo | Yes | 65/88/92/80/75 | 2/5 |
| amplitude | Amplitude | $49/mo | Yes | 65/88/95/82/75 | 3/5 |
| plausible | Plausible | $9/mo | No | 70/95/88/80/75 | 1/5 |
| vercel-analytics | Vercel | $10/mo | Yes | 65/88/95/80/72 | 1/5 |
| june | June | $149/mo | Yes | 60/85/90/75/70 | 1/5 |

### Storage & CDN (`storage`)
Lifecycle steps: S3 Build, S5 Deploy  
Object storage, asset CDN, image optimization.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| cloudflare-r2 | Cloudflare | $0/mo | Yes | 85/92/92/90/82 | 2/5 |
| aws-s3 | AWS | $0/mo | Yes | 75/92/95/92/78 | 2/5 |
| vercel-blob | Vercel | $0/mo | Yes | 60/88/92/80/70 | 1/5 |
| bunny-net | Bunny.net | $1/mo | No | 80/92/90/88/80 | 2/5 |
| cloudinary | Cloudinary | $99/mo | Yes | 65/88/95/82/75 | 1/5 |

### GTM & Marketing Tools (`gtm`)
Lifecycle steps: S7 Go To Market  
Scheduling, lifecycle marketing, roadmap management, no-code landing pages.

| Slug | Vendor | Pricing | Free tier | Region (Africa/EU/US/Asia/LatAm) | Integration |
|---|---|---|---|---|---|
| cal-com | Cal.com | $12/mo | Yes | 75/90/90/80/75 | 1/5 |
| calendly | Calendly | $12/mo | Yes | 65/88/95/82/75 | 1/5 |
| linear | Linear | $8/mo | Yes | 60/90/95/80/70 | 1/5 |
| notion | Notion Labs | $10/mo | Yes | 60/88/95/88/72 | 1/5 |

---

## Adding a new tool

1. Append an entry to `TOOLS` in `api/_lib/marketplaceSeed.js`. Required fields:
   `slug`, `category_id`, `name`, `vendor`, `description`, `homepage_url`, `pricing_model`,
   `has_free_tier`, `starting_paid_tier_usd`, `region_strengths`, `data_residency_options`,
   `compliance_certs`, `integration_complexity` (1-5), `last_funding_round`,
   `public_incident_frequency`, `open_source`, `self_hostable`, `data_export_ease`.
2. Run `node scripts/generate-marketplace-taxonomy.mjs` to refresh this doc.
3. When V2 lands, run `/api/admin/seed-marketplace` to push to Postgres.

## Adding a new category

1. Append an entry to `TOOL_CATEGORIES` with `id`, `name`, `step_numbers`, `display_order`, `description`.
2. Update `STEP_CATEGORY_PRIORITY` in `lifecycleToolSlots.js` if any lifecycle step should consider the new category.
3. Add tools that belong in the category.
