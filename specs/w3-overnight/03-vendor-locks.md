# Job 3 — Vendor Lock Verification

## W0-locked vendor picks (per audit prompt)

The user-supplied W0 ruling locks these vendors:

1. Crunchbase Enterprise
2. Bloomberg Law
3. PostHog
4. Productboard
5. GrowthBook
6. Cube
7. Markify
8. Cloudflare Bot Management
9. Electricity Maps
10. WattTime
11. USPTO direct feed
12. EPO direct feed
13. WIPO direct feed

## Registry cross-check

| Locked vendor | Present in `TOOL_REGISTRY`? | Category in registry | Drift / alternative? |
|---|---|---|---|
| Crunchbase Enterprise | ❌ Missing | — | No vendor in any registry category covers Crunchbase's role. |
| Bloomberg Law | ❌ Missing | — | No legal-research vendor present. |
| **PostHog** | ✅ **Present** (line 77 of `toolRegistry.js`) | Monitoring | ✅ Matches W0 lock. |
| Productboard | ❌ Missing | — | No product-management category exists. |
| GrowthBook | ❌ Missing | — | No feature-flag / experimentation tool present. |
| Cube | ❌ Missing | — | No semantic-layer / metrics-API vendor present. |
| Markify | ❌ Missing | — | No trademark-watch vendor present. |
| Cloudflare Bot Management | ❌ Missing | — | No edge / WAF / bot-management vendor present (the registry has no Security or Edge category). |
| Electricity Maps | ❌ Missing | — | No carbon-intensity / sustainability vendor. |
| WattTime | ❌ Missing | — | Same gap as Electricity Maps. |
| USPTO direct feed | ❌ Missing | — | No IP / patent-feed vendor present. |
| EPO direct feed | ❌ Missing | — | Same. |
| WIPO direct feed | ❌ Missing | — | Same. |

## Score

**1 of 13 W0-locked vendors are present in the registry.** That is **PostHog only**.

## Drift / alternative-vendor flags

The registry does **not** carry an alternate vendor for any of the 12 missing locks (e.g., it does not list LaunchDarkly in place of GrowthBook, or Sentry in place of PostHog). So there is no "wrong vendor picked" drift — there is **vendor absence** drift across all 12 missing locks.

## Categories the registry would need to add to support the locks

To accommodate the W0 lock list, the marketplace would need at minimum these new categories (none of which exist today):

- **Market Intelligence** (Crunchbase Enterprise)
- **Legal & Regulatory** (Bloomberg Law)
- **Product Management** (Productboard)
- **Feature Flags / Experimentation** (GrowthBook)
- **Semantic Layer / Metrics** (Cube)
- **Brand & Trademark Watch** (Markify)
- **Security / Edge / Bot Management** (Cloudflare Bot Management)
- **Sustainability / Carbon Intelligence** (Electricity Maps, WattTime)
- **IP / Patent Feeds** (USPTO, EPO, WIPO direct feeds)

The current 13 categories (`Research, Design, Build, Database, Authentication, Deployment, Payments, SMS, AI/LLM, Testing, Monitoring, Email, Governance`) cover none of these.

## Conclusion

**12 / 13 W0 vendor locks are missing from the registry.** No registry entry contradicts a W0 lock (i.e., no "wrong vendor" picks today) — the registry is simply silent on these picks. W3 onboarding work is required to register them.
