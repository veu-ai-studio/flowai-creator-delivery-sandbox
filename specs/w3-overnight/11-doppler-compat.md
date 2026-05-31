# Job 11 — Tool Inventory Doppler Compatibility

## Required field

Per the audit prompt, every tool in the marketplace registry must carry a `doppler_compat` field whose value is one of:

- `"supported"`
- `"env-var only"`
- `"incompatible"`

## Verification result

**❌ NO TOOL IN `TOOL_REGISTRY` HAS A `doppler_compat` FIELD.**

- The schema actually shipped (verified by reading `src/lib/toolRegistry.js`) is:
  `name, category, description, performance_score, cost_tier, cost_details, africa_available, base44_compatible, production_compatible, official_url, tags`.
- No `doppler_compat`. No `doppler_*` field of any kind.
- The closest semantically related field is `base44_compatible` (`'native' | 'api' | 'none'`) — but that describes integration with Base44, not the Doppler vault.

## Cross-evidence

- `Grep doppler` over `src/` returns 3 files: `src/docs/w2/v3-defect-register.md` (mentions Doppler as the W1 vault), `src/pages/BaseAgentTest.jsx` (test page), and `src/lib/shared/CredentialAdapter.js` (the Doppler-aware adapter).
- **None of those files set or read a `doppler_compat` field on registry entries.**
- The W1 vault architecture (`src/lib/shared/CredentialAdapter.js`) cares about credential *path resolution* — it has no per-tool compatibility annotation.

## Per-tool flag table

Because the field is uniformly missing, every tool in the registry is flagged. Showing all 61:

| Tool | Category | doppler_compat |
|---|---|---|
| Perplexity AI | Research | ❌ missing |
| Tavily | Research | ❌ missing |
| Exa | Research | ❌ missing |
| SerpAPI | Research | ❌ missing |
| You.com | Research | ❌ missing |
| Figma | Design | ❌ missing |
| Framer | Design | ❌ missing |
| Canva | Design | ❌ missing |
| Lovable | Design | ❌ missing |
| v0 by Vercel | Design | ❌ missing |
| Base44 | Build | ❌ missing |
| Replit | Build | ❌ missing |
| Bolt | Build | ❌ missing |
| Cursor | Build | ❌ missing |
| Windsurf | Build | ❌ missing |
| Supabase | Database | ❌ missing |
| PlanetScale | Database | ❌ missing |
| Firebase | Database | ❌ missing |
| Neon | Database | ❌ missing |
| MongoDB Atlas | Database | ❌ missing |
| Supabase Auth | Authentication | ❌ missing |
| Clerk | Authentication | ❌ missing |
| Auth0 | Authentication | ❌ missing |
| Firebase Auth | Authentication | ❌ missing |
| NextAuth | Authentication | ❌ missing |
| Vercel | Deployment | ❌ missing |
| Railway | Deployment | ❌ missing |
| Render | Deployment | ❌ missing |
| Fly.io | Deployment | ❌ missing |
| Netlify | Deployment | ❌ missing |
| Stripe | Payments | ❌ missing |
| Paystack | Payments | ❌ missing |
| Flutterwave | Payments | ❌ missing |
| Paddle | Payments | ❌ missing |
| Lemonsqueezy | Payments | ❌ missing |
| Twilio | SMS | ❌ missing |
| Africa's Talking | SMS | ❌ missing |
| Vonage | SMS | ❌ missing |
| MessageBird | SMS | ❌ missing |
| Termii | SMS | ❌ missing |
| Anthropic Claude | AI/LLM | ❌ missing |
| OpenAI GPT-4 | AI/LLM | ❌ missing |
| Google Gemini | AI/LLM | ❌ missing |
| Mistral | AI/LLM | ❌ missing |
| Groq | AI/LLM | ❌ missing |
| Playwright | Testing | ❌ missing |
| Cypress | Testing | ❌ missing |
| Vitest | Testing | ❌ missing |
| Jest | Testing | ❌ missing |
| Postman | Testing | ❌ missing |
| Sentry | Monitoring | ❌ missing |
| LogRocket | Monitoring | ❌ missing |
| Datadog | Monitoring | ❌ missing |
| PostHog | Monitoring | ❌ missing |
| Uptime Robot | Monitoring | ❌ missing |
| Resend | Email | ❌ missing |
| SendGrid | Email | ❌ missing |
| Mailchimp | Email | ❌ missing |
| Postmark | Email | ❌ missing |
| Brevo | Email | ❌ missing |
| FlowAI | Governance | ❌ missing |

**61 / 61 tools missing `doppler_compat`.**

## Recommended action

1. Add `doppler_compat` to the registry schema. Possible values per W0:
   - `"supported"` — vendor publishes a Doppler integration or first-class env-var path.
   - `"env-var only"` — vendor accepts API keys via env vars; Doppler can sync but no native integration.
   - `"incompatible"` — vendor requires non-env-var auth (e.g., OAuth flows, file-system credentials) that Doppler cannot manage.
2. Backfill all 61 entries. As a starting heuristic:
   - Most LLM, DB, Email, SMS, Payments, Monitoring, Auth tools → `"env-var only"` or `"supported"`.
   - Design tools (Figma, Canva, Framer) → likely `"incompatible"` or `"env-var only"` depending on their API auth model.
   - Build IDE tools (Cursor, Windsurf, Replit) where Doppler is irrelevant → `"incompatible"`.
3. Pair the schema change with a runtime validator in (the not-yet-existing) `src/lib/marketplace/` so future entries cannot land without a value.

## Conclusion

**100% of tools fail the `doppler_compat` check** because the field is unspecified in the registry schema. This is a categorical schema gap, not a per-tool issue.

Note: africa_available field renamed to underserved_accessible in W11-cleanup (2026-05-30).
