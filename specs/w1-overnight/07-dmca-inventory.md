# 07 — DMCA infrastructure inventory (Part 2)

Date: 2026-05-07
**Supersedes** Part 1's `06-dmca-inventory.md`. Part 1 catalogued zero implementation; Part 2 turns that into a concrete provisioning + implementation plan.

## 1. Spec discovery

| Source | Status |
|---|---|
| `specs/w1-dmca/*` | **MISSING** (re-verified) |
| `docs/w1-dmca*` | **MISSING** |
| `src/lib/agents/13-self-protection.js` | **MISSING** — `Glob src/lib/agents/*` returns only `BaseAgent.js` and `MessageSchema.js` |
| Topic for #13 events | DEFINED — `MessageSchema.js:69–71` registers `'13.threat.detected.v1'`, `'13.signature.update.v1'`, `'13.dmca.filed.v1'` |
| `gov.ip_protection` rubric criterion | DEFINED — `ScoreEvaluator.js:58–65` |
| `gov.ip_protection` evaluator implementation | MISSING per `specs/w3-overnight/06-score-eval-integration.md:29` |

## 2. Agent #13 charter — proposed minimum

When `src/lib/agents/13-self-protection.js` is authored, its `static charter()` should at minimum return:

```js
{
  id: 13,
  name: 'Self-Protection',
  flowAiOnly: false, // EMBEDDED_AGENTS per BaseAgent.js:41
  authority: ['recommend_only', 'auto_contain_known'],
  requiredCredentials: [
    'CLOUDFLARE_API_TOKEN',     // bot management + WAF rule updates
    'MARKIFY_API_KEY',          // trademark watch (W0-locked)
    'BROWSERLESS_API_KEY',      // verifying alleged copies (already live)
    'RESEND_API_KEY',           // sending DMCA notices via email
    'ANTHROPIC_API_KEY',        // drafting takedown letter copy
  ],
  marketplaceTools: ['Cloudflare Bot Management', 'Markify'],
  consumes: [
    '10.metric.v1',             // anomaly signals from Monitor
    '12.fire.p1.v1',            // P1 fires that may be IP-violation related
    'system.governance.score.v1',
  ],
  produces: [
    '13.threat.detected.v1',
    '13.signature.update.v1',
    '13.dmca.filed.v1',
  ],
  escalationPolicy: 'human-gate-on-takedown',
}
```

## 3. DMCA component inventory (concrete plan per item)

### 3.1 Designated Agent registration (US Copyright Office)

| Item | Status | Action |
|---|---|---|
| Designated Agent name | NOT IN REPO | Add `DESIGNATED_AGENT = { name: 'VEU AI Studio LLC', contact: 'Victor Udo, CEO', email: 'dmca@veuaistudio.com', phone: '<TBD>', address: '<TBD>' }` to a new `api/_lib/legalEntity.js` (also referenced in `11-tax-readiness.md` Part 1) |
| US Copyright Office DMCA Agent registration | NOT FILED | File at https://dmca.copyright.gov/ — $6/yr fee. Out-of-repo step. |
| Per-domain `/dmca` page | MISSING | Add `src/pages/DMCAPolicy.jsx` rendering the legal text + Designated Agent contact. Wire into router. |
| `dmca@veuaistudio.com` mailbox | NOT PROVISIONED | Provision once `veuaistudio.com` MX is decided per `06-dns-checklist.md §3.1` |

### 3.2 Takedown notice templates

Add a new directory `src/lib/dmca/templates/` (when implementation starts; not authored in this spec-only report). Required files:

| File | Purpose |
|---|---|
| `outbound-takedown.md` | Notice we send to a hosting provider (Cloudflare, AWS, GitHub, etc.) when our IP is found mirrored. Must include 17 USC §512(c)(3) elements. |
| `counter-notice.md` | Template a recipient sends back if they dispute the takedown. We log + escalate. |
| `repeat-infringer-policy.md` | Static policy text published at `/dmca` |
| `acknowledgement.md` | Auto-reply when we receive an inbound notice |

Required §512(c)(3) elements in `outbound-takedown.md`:
1. Physical or electronic signature of authorized person
2. Identification of the copyrighted work
3. Identification of the infringing material with sufficient location info
4. Contact information of complainant
5. Statement of good faith belief
6. Statement of accuracy under penalty of perjury

### 3.3 Vendor matrix

| Vendor | Role | W0-locked? | Procurement status (per `07-vendor-readiness.md`) |
|---|---|---|---|
| Markify | Trademark / brand watch | YES | NO INTEGRATION EVIDENCE |
| Cloudflare Bot Management | Anti-scraping, edge enforcement | YES | NO INTEGRATION EVIDENCE |
| Browserless | Verify alleged-copy URLs | NOT W0-locked but already live | READY (LIVE) |
| Resend | Send takedown notices via email | NOT W0-locked | READY TO PROCURE |
| Anthropic | Draft takedown letter copy from observed evidence | NOT W0-locked but live | READY (LIVE) |
| Recorded Future / Flashpoint / ZeroFox | Optional: deep web infringement signals | NOT YET SPECCED | Decision deferred — overkill for early-stage VEU |

### 3.4 Detection / signal sources

| Source | Status | Build plan |
|---|---|---|
| Markify trademark alerts (inbound webhook → `/api/dmca/inbound`) | MISSING | Author endpoint; verify webhook signature; emit `13.threat.detected.v1` |
| Crawler-driven mirror detection | PARTIAL | `api/_lib/crawler.js` already exists outbound. Author `api/_lib/dmca/mirrorScan.js` that periodically crawls top-N suspect URLs (signals from Markify) and fingerprints content against known VEU pages. |
| Hash / watermark detection | NOT IMPLEMENTED | Phase 2. Watermark VEU-generated content with a deterministic invisible token; mirrorScan checks for it. Aspirational. |
| User-submitted reports | MISSING | Add `POST /api/dmca/report` endpoint accepting `{infringing_url, original_url, complainant_email, description}`; rate-limit per `05-cloudflare-checklist.md §3.6`. Persist to a new `dmca_reports` table (migration TBA). |

### 3.5 Response procedures

| Procedure | Status | Build plan |
|---|---|---|
| Triage flow on inbound notice | MISSING | New `api/dmca/inbound.js` route; idempotent on `(complainant_email, infringing_url)`; emits `13.threat.detected.v1`; auto-acknowledges within 24h via Resend |
| 24-hour acknowledgement SLA | MISSING | Inngest scheduled function `dmca-ack-cron` that runs every 6h; finds unacknowledged reports older than 18h; sends reminder via Resend |
| 48-hour content removal SLA | MISSING | Inngest function `dmca-action-cron` runs every 12h; for confirmed valid takedowns affecting VEU-controlled surfaces, removes content + emits `13.dmca.filed.v1` |
| Repeat-infringer counter | MISSING | Track per-`complainant_email` infringement count in `dmca_reports`; auto-block account when count ≥ 3 (configurable) |
| Audit trail of received notices | MISSING | Use `api/_lib/db.js:appendAuditEntry` with action `dmca.received` / `dmca.ack` / `dmca.acted` / `dmca.declined` |
| `13.dmca.filed.v1` event consumer | MISSING | Score Evaluator's `gov.ip_protection` evaluator subscribes; rolls into `system.governance.score.v1` |

### 3.6 Outbound takedown (us → infringer)

| Item | Build plan |
|---|---|
| Auto-generated notice with URL list | `api/_lib/dmca/composeNotice.js` reads `dmca_reports.outgoing` rows + a `outbound-takedown.md` template; injects evidence list; renders Markdown email body |
| Notarisation / timestamp | Ship with the existing audit-log `prevHash` chain (W5 territory per `specs/w1-overnight/02-vault-spec-compliance.md §8`); the chain itself is the timestamp authority |
| Submission portal integration | Phase 2. Initially, send via email; phase 2 hits Cloudflare abuse, AWS abuse@aws.amazon.com, GitHub DMCA, etc. |
| Status tracker | `dmca_reports.outbound` field with status enum: `drafted` → `sent` → `acknowledged` → `removed` → `escalated` |

### 3.7 Cross-check: `gov.ip_protection` rubric

`ScoreEvaluator.js:58–65` says:
> Standard stack present: robots.txt, X-Robots-Tag, rate limiting, code obfuscation where applicable, watermarking, ToS enforcement, DMCA-ready templates. Verified by Agent #13 cross-check.

| Requirement | Path to compliance |
|---|---|
| robots.txt | `05-cloudflare-checklist.md §3.7` (concrete content) |
| X-Robots-Tag | `05-cloudflare-checklist.md §3.8` |
| Rate limiting | `05-cloudflare-checklist.md §3.6` (zone-level) + `api/leads/capture.js` (app-level, already in code) |
| Code obfuscation | OUT OF SCOPE for this report — Vite default minify continues |
| Watermarking | Phase 2 (per §3.4 detection sources above) |
| ToS enforcement | `src/pages/TermsOfUse.jsx` exists statically; enforcement logic deferred |
| DMCA-ready templates | §3.2 above |
| Agent #13 cross-checker | §2 charter sketch above |

## 4. Sequenced build plan (when DMCA workstream begins)

1. **Day 1** — Author `specs/w1-dmca/playbook.md` containing the charter, response SLAs, and template index.
2. **Day 2** — Provision `dmca@veuaistudio.com` mailbox; author `src/pages/DMCAPolicy.jsx`; file Designated Agent at copyright.gov.
3. **Day 3–4** — Author `src/lib/agents/13-self-protection.js` with the charter from §2; tests under `tests/agent-13-self-protection.test.js`.
4. **Day 5** — Author `api/dmca/{inbound,report}.js` + `api/_lib/dmca/{composeNotice,mirrorScan}.js`. Add `dmca_reports` migration.
5. **Day 6** — Author `gov.ip_protection` evaluator under `src/lib/audits/govIpProtection.js` (W3 territory, but this is the consumer side of #13 events).
6. **Day 7** — Wire Inngest crons (`dmca-ack-cron`, `dmca-action-cron`); end-to-end test via the test mailbox.

Out-of-repo:
- Procure Markify; provision `MARKIFY_API_KEY` per inventory expansion (`12-inventory-expansion.md`).
- Procure Cloudflare Bot Management.

## 5. Verdict

| Item | Status |
|---|---|
| Spec authored | NO — this report is the closest available draft |
| Designated Agent registered | NO |
| Templates committed | NO |
| Agent #13 implemented | NO (charter sketched here) |
| `dmca_reports` table / migration | NO |
| `/api/dmca/*` endpoints | NO |
| `gov.ip_protection` evaluator | NO |
| Markify procured | NO |

DMCA infrastructure remains at **0% implementation**, but Part 2 now provides a concrete 7-day build plan covering every component the charter implies. The only true blockers are (1) the Designated Agent filing (out-of-repo, $6/yr) and (2) Markify procurement.
