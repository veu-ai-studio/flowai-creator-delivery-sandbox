# Stage 4 — Product Registry Verification + Gap Report

**Status:** PREP doc — engineering- + CEO-ready. Doc-only.
**Author:** W3, 2026-05-19.
**Source of truth:** live `public.product_registry` rows in Supabase `prd` (queried via doppler-credentialed service-role read, this dispatch) + the migration files at `supabase/migrations/0014..0024`.

---

## §1 — Query outcome (live prod, 2026-05-19)

Executed:

```
doppler run --project flowai --config prd --preserve-env -- node -e "
  const {createClient}=require('@supabase/supabase-js');
  const s=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
  s.from('product_registry').select('product_id,product_url,github_repo_url,vercel_project_id,self_renewal_branch,self_renewal_enabled,environment,org_id').order('product_id').then(r=>console.log(JSON.stringify(r.data,null,2)));"
```

**First-pass query** (including `construction_eligible` + `construction_s6_auto_approve_in_test_mode`) **failed** with:

```
ERR {"code":"42703","message":"column product_registry.construction_eligible does not exist"}
```

→ Migration **`0024_product_registry_construction_eligible.sql`** (which adds both columns + backfills `reltwin` to `construction_eligible=true` + `construction_s6_auto_approve_in_test_mode=true`) is **present in the migrations directory but NOT YET APPLIED to prod**. This is the **#1 Stage-4 blocking gap** — no product can be construction-eligible until 0024 ships to prod.

**Second-pass query** (without the two new columns) returned 6 rows (1 flowai infra + 5 VEU products). See §2 for the per-product break-down.

---

## §2 — Per-product table (current state | gaps | recommended values)

> Legend: ✅ = matches recommended; ⚠️ = gap; ❓ = `[CONFIRM_WITH_CEO]` needed.

### 2.1 — flowai (infra row, not a VEU product but lives in the same table)

| Field | Current (prod) | Recommended | Status |
|---|---|---|---|
| `product_id` | `flowai` | `flowai` | ✅ |
| `product_url` | `https://flowai-dun.vercel.app` | `https://flowai-dun.vercel.app` (no canonical custom domain — internal infra) | ✅ |
| `github_repo_url` | `https://github.com/victor2081new-cloud/flowai` | `https://github.com/victor2081new-cloud/flowai` | ✅ |
| `vercel_project_id` | `prj_qtqajKmblq1cZILD66jVbTVC4Uo5` | `prj_qtqajKmblq1cZILD66jVbTVC4Uo5` | ✅ |
| `self_renewal_branch` | `flowai-v0.1` | `flowai-v0.1` (per 0019 explicit; FlowAI's working branch) | ✅ |
| `self_renewal_enabled` | `true` | `true` | ✅ |
| `construction_eligible` (post-0024) | `false` (default) | **❓ `[CONFIRM_WITH_CEO]`** — should FlowAI self-construct under §5 Symbiotic Meta-Principle (CA-18 ENTRY 018) once Phase 1 proves on RelTwin? | ❓ |
| `construction_s6_auto_approve_in_test_mode` (post-0024) | `false` (default) | `false` (FlowAI's own construction is admin-gated per §11.7 / §29 binding spec — no auto-bypass on self-target) | ✅ |

### 2.2 — SAIGE

| Field | Current (prod) | Recommended | Status |
|---|---|---|---|
| `product_id` | `saige` | `saige` | ✅ |
| `product_url` | `https://saige-platform.vercel.app` | **❓ `https://saigeplatform.com` `[CONFIRM_WITH_CEO]`** — dispatch cites `saigeplatform.com` as canonical operator-facing domain; need CEO confirmation that DNS is provisioned + Vercel domain alias added | ⚠️ |
| `github_repo_url` | `https://github.com/veu-ai-studio/saige` | `https://github.com/veu-ai-studio/saige` | ✅ |
| `vercel_project_id` | `prj_wlxXwuG6WqUkdrB4ASUUT9pb9tsF` | `prj_wlxXwuG6WqUkdrB4ASUUT9pb9tsF` (per 0022 backfill) | ✅ |
| `self_renewal_branch` | `main` | `main` | ✅ |
| `self_renewal_enabled` | `false` | **❓ `[CONFIRM_WITH_CEO]`** — flip to `true` for Stage 4 broadening, or hold? | ❓ |
| `construction_eligible` (post-0024) | `false` (default) | **❓ `[CONFIRM_WITH_CEO]`** — flip to `true` after RelTwin Phase 1 proves out? | ❓ |
| `construction_s6_auto_approve_in_test_mode` (post-0024) | `false` (default) | `false` (production-posture; bypass is RelTwin-only proof window) | ✅ |

### 2.3 — RelTwin (Phase 1 proof target — first construction-eligible VEU product)

| Field | Current (prod) | Recommended | Status |
|---|---|---|---|
| `product_id` | `reltwin` | `reltwin` | ✅ |
| `product_url` | `https://reltwin-platform.vercel.app` | **❓ `https://reltwin.com` `[CONFIRM_WITH_CEO]`** — dispatch cites `reltwin.com` as canonical operator-facing domain; need CEO confirmation that DNS is provisioned + Vercel domain alias added | ⚠️ |
| `github_repo_url` | `https://github.com/veu-ai-studio/rel-twin` | `https://github.com/veu-ai-studio/rel-twin` (note: kebab-case `rel-twin`, not `reltwin`) | ✅ |
| `vercel_project_id` | `prj_ymNpPi2X6kjiA5uyRRgmfI1sa2JL` | `prj_ymNpPi2X6kjiA5uyRRgmfI1sa2JL` (per 0022 backfill) | ✅ |
| `self_renewal_branch` | `main` | `main` | ✅ |
| `self_renewal_enabled` | `true` | `true` (enabled per W5a dispatch) | ✅ |
| `construction_eligible` (post-0024) | (column missing in prod) | **`true`** (set by 0024 backfill — RelTwin is the Phase 1 proof target per W5a `d394739`) | ⚠️ blocked on 0024 |
| `construction_s6_auto_approve_in_test_mode` (post-0024) | (column missing in prod) | **`true`** (Phase 1 proof-of-concept bypass set by 0024 backfill; reversible by setting to `false` post-proof) | ⚠️ blocked on 0024 |

### 2.4 — ReachSMS

| Field | Current (prod) | Recommended | Status |
|---|---|---|---|
| `product_id` | `reachsms` | `reachsms` | ✅ |
| `product_url` | `https://reachsms-platform.vercel.app` | **❓ `https://ourcommunitiesai.com` `[CONFIRM_WITH_CEO]`** — dispatch cites `ourcommunitiesai.com` as canonical operator-facing domain; need CEO confirmation that DNS is provisioned + Vercel domain alias added | ⚠️ |
| `github_repo_url` | `https://github.com/veu-ai-studio/reachsms` | `https://github.com/veu-ai-studio/reachsms` | ✅ |
| `vercel_project_id` | `prj_Amp5H4f2isCvERzFrxMLIVrlHARI` | `prj_Amp5H4f2isCvERzFrxMLIVrlHARI` (per 0022 backfill) | ✅ |
| `self_renewal_branch` | `main` | `main` | ✅ |
| `self_renewal_enabled` | `false` | **❓ `[CONFIRM_WITH_CEO]`** — flip to `true` for Stage 4 broadening, or hold? | ❓ |
| `construction_eligible` (post-0024) | `false` (default) | **❓ `[CONFIRM_WITH_CEO]`** — flip to `true` after RelTwin Phase 1 proves out? | ❓ |
| `construction_s6_auto_approve_in_test_mode` (post-0024) | `false` (default) | `false` (production posture) | ✅ |

### 2.5 — PressAI

| Field | Current (prod) | Recommended | Status |
|---|---|---|---|
| `product_id` | `pressai` | `pressai` | ✅ |
| `product_url` | `https://pressai-platform.vercel.app` | **❓ `https://ourpublishingai.com` `[CONFIRM_WITH_CEO]`** — dispatch cites `ourpublishingai.com` as canonical operator-facing domain; need CEO confirmation that DNS is provisioned + Vercel domain alias added | ⚠️ |
| `github_repo_url` | `https://github.com/veu-ai-studio/press-ai` | `https://github.com/veu-ai-studio/press-ai` (note: kebab-case `press-ai`, not `pressai`) | ✅ |
| `vercel_project_id` | `prj_RhCu7cW7Q0SQ6D7rtPrXLyWqud9W` | `prj_RhCu7cW7Q0SQ6D7rtPrXLyWqud9W` (per 0022 backfill) | ✅ |
| `self_renewal_branch` | `main` | `main` | ✅ |
| `self_renewal_enabled` | `false` | **❓ `[CONFIRM_WITH_CEO]`** — flip to `true` for Stage 4 broadening, or hold? | ❓ |
| `construction_eligible` (post-0024) | `false` (default) | **❓ `[CONFIRM_WITH_CEO]`** — flip to `true` after RelTwin Phase 1 proves out? | ❓ |
| `construction_s6_auto_approve_in_test_mode` (post-0024) | `false` (default) | `false` (production posture) | ✅ |

### 2.6 — MyPregLife (SPECIAL FLAG — Base44 → custom-domain migration required before any clinical pilot)

| Field | Current (prod) | Recommended | Status |
|---|---|---|---|
| `product_id` | `mypreglife` | `mypreglife` | ✅ |
| `product_url` | `https://mypreglife-platform.vercel.app` | **❓ `https://preglife.com` `[CONFIRM_WITH_CEO]`** — dispatch cites `preglife.com` (canonical) AND `safe-path.base44.app` (current Base44 dev URL per audit `docs/audits/mypreglife-2026-05-17/`). MyPregLife is **currently hosted on Base44** at `safe-path.base44.app` — **MUST migrate to preglife.com BEFORE any clinical pilot launches**, regardless of customer count, per the IP-hygiene constraint (`docs/ip-hygiene-audit-2026-05-09.md` #13: "REMOVE `.base44.app` URLs from `src/lib/veuProducts.js` and `/docs/*` once products migrate to custom domains") + the clinical-claims audit T2 finding (`docs/audits/mypreglife-2026-05-17/FINDINGS.md` T2: clinical claims without clinical/regulatory validation evidence). See §3 below for the constraint statement. | ⚠️ + 🚨 |
| `github_repo_url` | `https://github.com/veu-ai-studio/my-preg-life` | `https://github.com/veu-ai-studio/my-preg-life` (note: kebab-case `my-preg-life`) | ✅ |
| `vercel_project_id` | `prj_P46D1HB1DmjY48PS4kgTYxzsKqhb` | `prj_P46D1HB1DmjY48PS4kgTYxzsKqhb` (per 0022 backfill) | ✅ |
| `self_renewal_branch` | `main` | `main` | ✅ |
| `self_renewal_enabled` | `true` | `true` (Phase A test target per 0014 seed) | ✅ |
| `construction_eligible` (post-0024) | `false` (default) | **❌ HOLD at `false`** until the Base44→preglife.com migration completes AND clinical-validation copy lands (audit T2 mitigation M2). Construction-class operations on MyPregLife while content is still on Base44 dev URL + missing clinical disclosures would violate the IP-hygiene canonical constraint AND introduce undisclosed clinical liability. | 🚨 |
| `construction_s6_auto_approve_in_test_mode` (post-0024) | `false` (default) | `false` (production posture; MyPregLife is NOT a proof window candidate) | ✅ |

---

## §3 — MyPregLife SPECIAL FLAG (canonical constraint summary)

**Constraint (load-bearing):** MyPregLife requires **migration from Base44 dev URL (`safe-path.base44.app`) to the canonical custom domain (`preglife.com`) BEFORE any clinical pilot launches**, regardless of customer count or rollout scope. This constraint is **pre-existing** (not introduced by this dispatch) and sourced from the following canonical artifacts:

1. **`docs/ip-hygiene-audit-2026-05-09.md` #13 + #10 + #5** — `.base44.app` URLs in `src/lib/veuProducts.js` and `/docs/*` MUST be removed once products migrate to custom domains. MyPregLife's `safe-path.base44.app` reference is in scope. Phase B priority #10 + peer top-priority #2.
2. **`docs/audits/mypreglife-2026-05-17/FINDINGS.md` T2** — *"clinical claims without clinical/regulatory validation: surfaces `\"Doctor Access\"`, `\"AI Health Coach\"`, multilingual clinical guidance in 5+ African languages, but zero clinical-validation, regulatory-status, or healthcare-partnership evidence anywhere on the page. Claude flagged: critical gap for a product making clinical guidance claims in multiple African jurisdictions."* Severity: **high**. Mitigation M2 requires the `"Regulatory & Clinical"` paragraph to land in product copy before any clinical pilot.
3. **Project memory `project_base44_origin.md`** — repo was scaffolded by Base44; user is moving off it; Base44 leftovers are cleanup candidates. MyPregLife's Base44 hosting is a leftover that must close out before clinical-scope launches.
4. **CA-18 §2 (jurisdiction-aware privacy + legal compliance dimensions per ENTRY 018)** — privacy/legal scoring is jurisdiction-aware; MyPregLife's clinical claims in 5+ jurisdictions require the operator to declare applicable jurisdictions AND ship the regulatory disclosures before §11 Clearance Step 5 can pass.

**Operational consequence for Stage 4:**
- Stage 4 broadening (flipping `construction_eligible=true` for additional products) **MUST NOT include MyPregLife** until: (a) DNS cutover to `preglife.com` completes; (b) `.base44.app` references purged from code + docs; (c) the audit T2 M2 mitigation (regulatory & clinical paragraph) lands in product copy.
- MyPregLife may continue running Self-Renewal (current `self_renewal_enabled=true` stays) under the existing surface-improvement scope, but **no construction-class operations** until the migration completes.

---

## §4 — Cross-cutting gap summary (Stage-4-blocking vs. operationally-blocking)

| # | Gap | Severity | Blocker for | Resolution |
|---|---|---|---|---|
| **G1** | Migration `0024_product_registry_construction_eligible.sql` NOT APPLIED to prod (column `construction_eligible` missing) | 🚨 Stage-4-blocking | All construction-engine operations across all products | Apply 0024 to prod via the standard migration path; verify by re-querying `product_registry` for the two new columns. |
| **G2** | All 5 VEU `product_url` rows point at internal `*.vercel.app` hostnames, not canonical operator-facing domains | ⚠️ Stage-4-soft | GTM scoring against the canonical domain; operator-facing dashboards; demo-readiness; IP hygiene | Per-product DNS cutover + Vercel domain alias + UPSERT statements in §5 below. **MyPregLife specifically blocks clinical pilot per §3.** |
| **G3** | `self_renewal_enabled = false` for SAIGE / PressAI / ReachSMS | ❓ CEO-disposition | Stage 4 broadening | CEO confirms which to enable, then per-product UPDATEs in §5. |
| **G4** | `construction_eligible = false` (default) for all products except RelTwin (post-0024) | ❓ CEO-disposition | Stage 4 broadening beyond RelTwin Phase 1 | After RelTwin Phase 1 proof window closes, CEO confirms which products to broaden; per-product UPDATEs in §5. **MyPregLife specifically NOT eligible per §3.** |
| **G5** | `[CONFIRM_WITH_CEO]` on canonical domain names — specifically: SAIGE = `saigeplatform.com` vs `saige.com`? RelTwin = `reltwin.com`? ReachSMS = `ourcommunitiesai.com`? PressAI = `ourpublishingai.com`? MyPregLife = `preglife.com`? | ❓ CEO-confirm | G2 resolution | CEO confirms exact domain strings before the UPDATEs in §5.2 execute. |

---

## §5 — SQL ready-to-run (post-CEO-confirmation)

### 5.1 — REQUIRED: apply migration 0024 to prod first

Migration file is already at `supabase/migrations/0024_product_registry_construction_eligible.sql` (present in the repo since W5a). Apply via the standard Supabase migration path (e.g., `supabase db push --project-ref <prd_ref>` or the equivalent CI deploy). After application, the columns `construction_eligible` and `construction_s6_auto_approve_in_test_mode` will exist; the backfill in 0024 will set both to `true` for `product_id = 'reltwin'`.

Verification query (run after 0024 deploys):

```sql
select product_id, construction_eligible, construction_s6_auto_approve_in_test_mode
  from public.product_registry
 order by product_id;
```

Expected:
- `reltwin` → both `true` (per 0024 backfill)
- all others → both `false` (default)

### 5.2 — product_url canonical-domain UPSERTs (run after CEO confirms domain strings per G5)

```sql
-- ⚠️ DO NOT EXECUTE until CEO confirms each domain string is provisioned in DNS
-- + Vercel domain alias is added for the corresponding vercel_project_id.

update public.product_registry
   set product_url = 'https://saigeplatform.com'      -- [CONFIRM_WITH_CEO]: saigeplatform.com vs saige.com?
 where product_id = 'saige';

update public.product_registry
   set product_url = 'https://reltwin.com'            -- [CONFIRM_WITH_CEO]
 where product_id = 'reltwin';

update public.product_registry
   set product_url = 'https://ourcommunitiesai.com'   -- [CONFIRM_WITH_CEO]
 where product_id = 'reachsms';

update public.product_registry
   set product_url = 'https://ourpublishingai.com'    -- [CONFIRM_WITH_CEO]
 where product_id = 'pressai';

-- ❌ MYPREGLIFE: DO NOT execute until §3 Base44→preglife.com migration + audit T2 M2 complete.
-- update public.product_registry
--    set product_url = 'https://preglife.com'           -- [CONFIRM_WITH_CEO] + BLOCKED ON §3
--  where product_id = 'mypreglife';
```

### 5.3 — Stage 4 broadening UPDATEs (per-product `self_renewal_enabled` + `construction_eligible` flips)

```sql
-- ⚠️ DO NOT EXECUTE until: (a) 0024 is applied per §5.1; (b) RelTwin Phase 1 proof window
-- closes successfully; (c) CEO confirms which products to broaden per G3 + G4.

-- Example pattern (substitute per CEO disposition):
-- update public.product_registry
--    set self_renewal_enabled = true,         -- per G3 CEO disposition
--        construction_eligible = true         -- per G4 CEO disposition
--  where product_id in ('saige','reachsms','pressai');  -- omit 'mypreglife' per §3

-- ❌ MYPREGLIFE construction_eligible flip: BLOCKED by §3 constraint.
-- Even when broader Stage 4 lands, mypreglife stays construction_eligible=false until:
--   (i) DNS cutover to preglife.com completes;
--   (ii) .base44.app references purged from src/lib/veuProducts.js + docs;
--   (iii) audit T2 M2 regulatory & clinical paragraph lands in product copy;
--   (iv) CEO explicit ratification post-(i)+(ii)+(iii).
```

### 5.4 — Reversibility (rollback safety)

All UPDATEs in §5.2 + §5.3 are reversible via the prior values captured in §2 above. Snapshot the current `product_registry` rows before executing §5.2/§5.3 (engineering dispatch will use the standard pre-migration backup path). A pre-Stage-4 snapshot archive should land at `docs/archive/product_registry-pre-stage4-promotion-<YYYY-MM-DD>.sql` per `§18.3` archive discipline (extended from canonical-doc snapshots to data snapshots for Stage 4).

---

## §6 — Stage 4 readiness checklist (for CEO + engineering)

- [ ] G1 — Migration 0024 applied to prod (verification query in §5.1 passes).
- [ ] G2 — All 5 VEU canonical domains CEO-confirmed (per G5) AND DNS provisioned AND Vercel domain aliases added.
- [ ] G2 (UPSERT) — `product_url` UPDATEs executed per §5.2 (excluding MyPregLife).
- [ ] G3 — CEO disposes `self_renewal_enabled` for SAIGE / PressAI / ReachSMS.
- [ ] G4 — RelTwin Phase 1 proof window closes successfully (per W5a `d394739` + `4689f53` env-gated bypass results).
- [ ] G4 (UPSERT) — Per-product `construction_eligible` flips executed per §5.3 (excluding MyPregLife per §3).
- [ ] §3 (MyPregLife migration prerequisite) — DNS cutover to `preglife.com` + `.base44.app` purge from `src/lib/veuProducts.js` + `/docs/*` + audit T2 M2 regulatory copy landed.
- [ ] Pre-promotion snapshot per §5.4.
- [ ] Stage 4 broadening dispatch authored + Panel-reviewed per Locked Rule 17 (if Panel review applies) OR CEO-disposition per Locked Rule 13.

---

## §7 — Cross-CA dependencies

- **CA-17 (Build/Wire Construction Engine, ENTRY 016):** the binding spec at `docs/specs/BUILD_WIRE_ENGINE_SPEC_V3_FINAL_DRAFT.md` governs construction-class operations. Stage 4 broadening invokes the engine on additional products — CA-17 S1–S8 invariants apply to every construction-class operation on every product.
- **CA-18 ENTRY 018 (Mission/Purpose):** §4 Global platform + uniform ≥95 dignity guarantee applies — Stage 4 broadening must preserve the uniform standard across the broadened set; no per-product quality tiering.
- **CA-18 §6 ENTRY 019 (Tool Intelligence + global mode-name lock):** Stage 4 broadening uses AUTOMATIC / GUIDED / MANUAL labels in dispatches + audit-log payloads.
- **ENTRY 015 cleared-8 (CA-14-A/B/D + CA-16-B-Q3 + CA-16-C-Q4):** atomic-audit-write invariant + LIMITATIONS disclosure + Phase B + admin-only Redesign approval + §7.6 formula-generalization invariant all apply to Stage 4 operations.
- **ENTRY 017 (CA-13 sliver + CA-15 lean-down + CA-16-A zero-canonical):** §15.5 EXECUTOR_REGISTRY population (3 executors: self-renewal-executor + crawl-write-executor + orchestra-membership-executor) is what the construction engine + Phase B + Orchestra-admission pipelines depend on; §19.1 SSOT-Conformance Gate HYBRID applies to Stage 4 Clearance Step 6.

---

*End of STAGE4_PRODUCT_REGISTRY_PREP. Doc-only. Engineering applies migration 0024 + the §5 UPDATEs once CEO confirms the per-product gaps in §2 + §4. MyPregLife operates under the §3 constraint set indefinitely until the migration prerequisites complete.*
