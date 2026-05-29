# FlowAI Self-Adversarial Test Results — 2026-05-14 (run w4-2026-05-14-r05)

**Environment:** http://localhost:5173
**Suite commit:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Runner:** Playwright + Vitest

## Summary

| Severity | Count |
|---|---:|
| critical | 3 |
| high | 14 |
| medium | 97 |
| low | 227 |
| **Total findings** | 341 |

| Status | Count |
|---|---:|
| Tests run (target) | 446 |
| Tests recorded | 341 |
| Passed | 227 |
| Failed | 26 |
| Errored | 0 |
| Skipped | 88 |
| Duration (ms) | 386551 |

## Findings (severity-grouped, descending)

### Critical (3)

### FND-0145 — [critical] /dashboard · SURF-AUTH-1

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /dashboard with no session
2. observe redirect

**Expected:** redirect to landing/login when anon
**Actual:** final url=http://localhost:5173/dashboard
**Latency (recorded only — no threshold):** 22226 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0147 — [critical] /users · SURF-AUTH-3

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /users as anon/operator
2. observe block

**Expected:** admin-only route denies operator
**Actual:** final url=http://localhost:5173/users
**Latency (recorded only — no threshold):** 3084 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0148 — [critical] /url-whitelist · SURF-AUTH-4

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /url-whitelist as anon/operator
2. observe block

**Expected:** admin-only route denies operator
**Actual:** final url=http://localhost:5173/url-whitelist
**Latency (recorded only — no threshold):** 2926 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN


### High (14)

### FND-0017 — [high] /api/auth/sign-in · APIAUTH-api_auth_sign-in-anon

**Category:** api
**Status:** FAIL
**Reproducer:**
1. POST /api/auth/sign-in
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon POST /api/auth/sign-in → 404
**Latency (recorded only — no threshold):** 563 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0020 — [high] /api/auth/sign-up · APIAUTH-api_auth_sign-up-anon

**Category:** api
**Status:** FAIL
**Reproducer:**
1. POST /api/auth/sign-up
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon POST /api/auth/sign-up → 404
**Latency (recorded only — no threshold):** 246 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0038 — [high] /api/diagnostic · APIAUTH-api_diagnostic-anon

**Category:** api
**Status:** FAIL
**Reproducer:**
1. GET /api/diagnostic
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon GET /api/diagnostic → 404
**Latency (recorded only — no threshold):** 293 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0047 — [high] /api/health · APIAUTH-api_health-anon

**Category:** api
**Status:** FAIL
**Reproducer:**
1. GET /api/health
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon GET /api/health → 404
**Latency (recorded only — no threshold):** 447 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0056 — [high] /api/me · APIAUTH-api_me-anon

**Category:** api
**Status:** FAIL
**Reproducer:**
1. GET /api/me
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon GET /api/me → 404
**Latency (recorded only — no threshold):** 298 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0059 — [high] /api/orchestrator/health · APIAUTH-api_orchestrator_health-anon

**Category:** api
**Status:** FAIL
**Reproducer:**
1. GET /api/orchestrator/health
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon GET /api/orchestrator/health → 404
**Latency (recorded only — no threshold):** 218 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0095 — [high] agent1.direct-api · A1-N1

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","topic":"2.build.completed.v1","productId":"prod_test_1"}

**Expected:** envelope ok=true with lifecycle_event emit
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 277 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0102 — [high] agent2.direct-api · A2-N1

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"design.spec","framework":"vite-react","spec":{"coreClaims":["build a landing page"]}}

**Expected:** build_completed event; deterministic SHA-256 build hash
**Actual:** status=404
**Latency (recorded only — no threshold):** 321 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0103 — [high] agent2.direct-api · A2-N2

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"renewal.candidate","issues":[{"id":"i1","autoFixable":true}]}

**Expected:** recommendation contains patch_targets[]
**Actual:** status=404
**Latency (recorded only — no threshold):** 235 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0111 — [high] agent3.direct-api · A3-N1

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","runId":"run_test_1","run_summary":{"build_failure_count":2,"audit_issues_count":3}}

**Expected:** flags.length===2; confidence===0.9
**Actual:** status=404
**Latency (recorded only — no threshold):** 490 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0112 — [high] agent3.direct-api · A3-N2

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","runId":"run_test_2","run_summary":{}}

**Expected:** flags.length===0; confidence 0.0
**Actual:** status=404
**Latency (recorded only — no threshold):** 223 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0133 — [high] agent5.direct-api · A5-N1

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"prov_1","email":"cust@test.invalid"}

**Expected:** provider link confirmed in envelope
**Actual:** status=404
**Latency (recorded only — no threshold):** 289 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0134 — [high] agent5.direct-api · A5-N2

**Category:** nominal
**Status:** FAIL
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"prov_1","email":"cust2@test.invalid"}

**Expected:** persists to _test tenant; RLS isolates
**Actual:** status=404
**Latency (recorded only — no threshold):** 246 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0143 — [high] _registry.ts · INV-5

**Category:** invariant
**Status:** FAIL
**Reproducer:**
1. grep _registry.ts for agentId declarations
2. count unique values

**Expected:** validator passes at module load (25 unique IDs)
**Actual:** agentId declarations: 1 (unique=1)
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team cross-agent
**Recommended fix:** —
**Status:** OPEN


### Medium (97)

### FND-0001 — [medium] /api/admin/seed · APIAUTH-api_admin_seed-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/admin/seed
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0003 — [medium] /api/admin/seed · APIAUTH-api_admin_seed-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/admin/seed
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0004 — [medium] /api/audit-log · APIAUTH-api_audit-log-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/audit-log
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0006 — [medium] /api/audit-log · APIAUTH-api_audit-log-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/audit-log
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0007 — [medium] /api/audit-product · APIAUTH-api_audit-product-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/audit-product
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0009 — [medium] /api/audit-product · APIAUTH-api_audit-product-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/audit-product
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0010 — [medium] /api/audits/list · APIAUTH-api_audits-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/audits/list
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0012 — [medium] /api/audits/list · APIAUTH-api_audits-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/audits/list
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0013 — [medium] /api/auth/session · APIAUTH-api_auth_session-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/auth/session
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0015 — [medium] /api/auth/session · APIAUTH-api_auth_session-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/auth/session
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0016 — [medium] /api/auth/sign-in · APIAUTH-api_auth_sign-in-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/auth/sign-in
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0018 — [medium] /api/auth/sign-in · APIAUTH-api_auth_sign-in-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/auth/sign-in
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0019 — [medium] /api/auth/sign-up · APIAUTH-api_auth_sign-up-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/auth/sign-up
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0021 — [medium] /api/auth/sign-up · APIAUTH-api_auth_sign-up-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/auth/sign-up
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0022 — [medium] /api/clearance/run · APIAUTH-api_clearance_run-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/clearance/run
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0024 — [medium] /api/clearance/run · APIAUTH-api_clearance_run-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/clearance/run
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0025 — [medium] /api/compliance/check · APIAUTH-api_compliance-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/compliance/check
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0027 — [medium] /api/compliance/check · APIAUTH-api_compliance-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/compliance/check
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0028 — [medium] /api/configuration/products · APIAUTH-api_configuration-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/configuration/products
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0030 — [medium] /api/configuration/products · APIAUTH-api_configuration-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/configuration/products
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0031 — [medium] /api/cost-summary · APIAUTH-api_cost-summary-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/cost-summary
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0033 — [medium] /api/cost-summary · APIAUTH-api_cost-summary-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/cost-summary
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0034 — [medium] /api/describe-product · APIAUTH-api_describe-product-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/describe-product
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0036 — [medium] /api/describe-product · APIAUTH-api_describe-product-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/describe-product
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0037 — [medium] /api/diagnostic · APIAUTH-api_diagnostic-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/diagnostic
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0039 — [medium] /api/diagnostic · APIAUTH-api_diagnostic-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/diagnostic
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0040 — [medium] /api/fetch-url · APIAUTH-api_fetch-url-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/fetch-url
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0042 — [medium] /api/fetch-url · APIAUTH-api_fetch-url-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/fetch-url
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0043 — [medium] /api/governance/dashboard · APIAUTH-api_governance_dashboard-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/governance/dashboard
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0045 — [medium] /api/governance/dashboard · APIAUTH-api_governance_dashboard-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/governance/dashboard
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0046 — [medium] /api/health · APIAUTH-api_health-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/health
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0048 — [medium] /api/health · APIAUTH-api_health-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/health
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0049 — [medium] /api/llm-step · APIAUTH-api_llm-step-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/llm-step
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0051 — [medium] /api/llm-step · APIAUTH-api_llm-step-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/llm-step
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0052 — [medium] /api/marketplace/inventory · APIAUTH-api_marketplace-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/marketplace/inventory
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0054 — [medium] /api/marketplace/inventory · APIAUTH-api_marketplace-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/marketplace/inventory
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0055 — [medium] /api/me · APIAUTH-api_me-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/me
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0057 — [medium] /api/me · APIAUTH-api_me-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/me
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0058 — [medium] /api/orchestrator/health · APIAUTH-api_orchestrator_health-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/orchestrator/health
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0060 — [medium] /api/orchestrator/health · APIAUTH-api_orchestrator_health-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/orchestrator/health
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0061 — [medium] /api/orchestrator/run · APIAUTH-api_orchestrator_run-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/orchestrator/run
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0063 — [medium] /api/orchestrator/run · APIAUTH-api_orchestrator_run-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/orchestrator/run
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0064 — [medium] /api/orchestrator/status/x · APIAUTH-api_orchestrator_status_id-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/orchestrator/status/x
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0066 — [medium] /api/orchestrator/status/x · APIAUTH-api_orchestrator_status_id-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/orchestrator/status/x
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0067 — [medium] /api/products · APIAUTH-api_products-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/products
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0069 — [medium] /api/products · APIAUTH-api_products-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/products
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0070 — [medium] /api/products/00000000-0000-0000-0000-000000000000 · APIAUTH-api_products_id-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/products/00000000-0000-0000-0000-000000000000
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0072 — [medium] /api/products/00000000-0000-0000-0000-000000000000 · APIAUTH-api_products_id-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/products/00000000-0000-0000-0000-000000000000
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0073 — [medium] /api/propose-step · APIAUTH-api_propose-step-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/propose-step
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0075 — [medium] /api/propose-step · APIAUTH-api_propose-step-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/propose-step
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0076 — [medium] /api/renew · APIAUTH-api_renew-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/renew
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0078 — [medium] /api/renew · APIAUTH-api_renew-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/renew
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0079 — [medium] /api/renewed/aaaaaaaa · APIAUTH-api_renewed_hash-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/renewed/aaaaaaaa
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0081 — [medium] /api/renewed/aaaaaaaa · APIAUTH-api_renewed_hash-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. GET /api/renewed/aaaaaaaa
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0082 — [medium] /api/research-url · APIAUTH-api_research-url-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/research-url
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0084 — [medium] /api/research-url · APIAUTH-api_research-url-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/research-url
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0085 — [medium] /api/run-step · APIAUTH-api_run-step-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/run-step
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0087 — [medium] /api/run-step · APIAUTH-api_run-step-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/run-step
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0088 — [medium] /api/self-renewal/check · APIAUTH-api_self-renewal_check-admin

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/self-renewal/check
2. role=admin
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_ADMIN_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0090 — [medium] /api/self-renewal/check · APIAUTH-api_self-renewal_check-operator

**Category:** api
**Status:** SKIP
**Reproducer:**
1. POST /api/self-renewal/check
2. role=operator
3. token missing

**Expected:** role-specific token grants/denies as charter dictates
**Actual:** PLAYWRIGHT_OPERATOR_TOKEN not provided; cannot exercise role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0104 — [medium] agent2.direct-api · A2-X1

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. attempt real Claude call
2. no API key in env

**Expected:** no instruction takeover in output
**Actual:** ANTHROPIC_API_KEY not provided; LD-6 requires real Claude for prompt-injection
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0116 — [medium] agent4.direct-api · A4-E1

**Category:** edge
**Status:** SKIP
**Reproducer:**
1. Stripe sandbox call required
2. sandbox key missing

**Expected:** unicode round-trips through UTF-8
**Actual:** STRIPE_SANDBOX_SECRET_KEY not provided; LD-3 sandbox path unavailable
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0117 — [medium] agent4.direct-api · A4-E2

**Category:** edge
**Status:** SKIP
**Reproducer:**
1. Stripe sandbox call required
2. sandbox key missing

**Expected:** truncated or rejected; no overflow
**Actual:** STRIPE_SANDBOX_SECRET_KEY not provided; LD-3 sandbox path unavailable
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0122 — [medium] agent4.direct-api · A4-N1

**Category:** nominal
**Status:** SKIP
**Reproducer:**
1. Stripe sandbox call required
2. sandbox key missing

**Expected:** stripe_connect_link_recommendation in envelope
**Actual:** STRIPE_SANDBOX_SECRET_KEY not provided; LD-3 sandbox path unavailable
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0123 — [medium] agent4.direct-api · A4-N2

**Category:** nominal
**Status:** SKIP
**Reproducer:**
1. Stripe sandbox call required
2. sandbox key missing

**Expected:** idempotent; lookup not create
**Actual:** STRIPE_SANDBOX_SECRET_KEY not provided; LD-3 sandbox path unavailable
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0149 — [medium] /audit-trail · SURF-AUTH-5

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. attempt /audit-trail with client role
2. no client token

**Expected:** client sees redacted view per §13
**Actual:** PLAYWRIGHT_CLIENT_TOKEN not set — cannot simulate client role
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0254 — [medium] /architecture · SURF-ERR-architecture-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/architecture", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15077 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0261 — [medium] /audit-trail · SURF-ERR-audit-trail-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/audit-trail", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15157 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0268 — [medium] /auto-runner · SURF-ERR-auto-runner-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/auto-runner", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15072 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0275 — [medium] /clearance · SURF-ERR-clearance-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/clearance", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15140 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0282 — [medium] /cost-usage · SURF-ERR-cost-usage-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/cost-usage", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15025 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0289 — [medium] /environments · SURF-ERR-environments-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/environments", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15112 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0296 — [medium] /marketplace · SURF-ERR-marketplace-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/marketplace", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15053 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0303 — [medium] /my-stack · SURF-ERR-my-stack-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/my-stack", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15040 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0310 — [medium] /production-monitor · SURF-ERR-production-monitor-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/production-monitor", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15028 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0317 — [medium] /renewal · SURF-ERR-renewal-api-timeout

**Category:** ui
**Status:** SKIP
**Reproducer:**
1. intercept **/api/**
2. simulate api-timeout
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** setup failed: page.goto: Timeout 15000ms exceeded.
Call log:
[2m  - navigating to "http://localhost:5173/renewal", waiting until "load"[22m

**Latency (recorded only — no threshold):** 15102 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0321 — [medium] /auto-runner · SURF-ADV-1

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /auto-runner
2. inject adversarial payload
3. assert reject/redirect

**Expected:** URL validation rejects; no XSS
**Actual:** skipped: no URL input visible (unauthenticated)
**Latency (recorded only — no threshold):** 4846 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0322 — [medium] /configuration · SURF-ADV-10

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /configuration
2. inject adversarial payload
3. assert reject/redirect

**Expected:** UI rejects multi-URL in single-URL mode
**Actual:** skipped: requires authed configuration form
**Latency (recorded only — no threshold):** 5242 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0323 — [medium] /users · SURF-ADV-11

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /users
2. inject adversarial payload
3. assert reject/redirect

**Expected:** RLS + role check rejects
**Actual:** skipped: requires authed operator fixture
**Latency (recorded only — no threshold):** 5742 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0324 — [medium] /url-whitelist · SURF-ADV-12

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /url-whitelist
2. inject adversarial payload
3. assert reject/redirect

**Expected:** reject — wildcard is a security regression
**Actual:** skipped: requires authed admin fixture
**Latency (recorded only — no threshold):** 4642 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0325 — [medium] /auto-runner · SURF-ADV-2

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /auto-runner
2. inject adversarial payload
3. assert reject/redirect

**Expected:** crawler refuses RFC1918 + link-local
**Actual:** skipped: no URL input visible
**Latency (recorded only — no threshold):** 3382 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0326 — [medium] /auto-runner · SURF-ADV-3

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /auto-runner
2. inject adversarial payload
3. assert reject/redirect

**Expected:** RLS rejects; 403
**Actual:** skipped: requires authed cross-tenant fixture
**Latency (recorded only — no threshold):** 9521 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0327 — [medium] /renewal · SURF-ADV-4

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /renewal
2. inject adversarial payload
3. assert reject/redirect

**Expected:** reject at body-size limit
**Actual:** skipped: large-file upload requires authed fixture + body-size config
**Latency (recorded only — no threshold):** 3068 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0328 — [medium] /renewal · SURF-ADV-5

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /renewal
2. inject adversarial payload
3. assert reject/redirect

**Expected:** OCR returns literal text; agent ignores
**Actual:** skipped: requires real Anthropic key + image upload pipeline
**Latency (recorded only — no threshold):** 2973 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0329 — [medium] /clearance · SURF-ADV-6

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /clearance
2. inject adversarial payload
3. assert reject/redirect

**Expected:** API rejects; server-side enforcement
**Actual:** skipped: requires authed direct API call with crafted state
**Latency (recorded only — no threshold):** 3143 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0330 — [medium] /audit-trail · SURF-ADV-7

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /audit-trail
2. inject adversarial payload
3. assert reject/redirect

**Expected:** RLS rejects; empty result
**Actual:** skipped: requires authed cross-tenant fixture
**Latency (recorded only — no threshold):** 3097 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0331 — [medium] /audit-trail · SURF-ADV-8

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /audit-trail
2. inject adversarial payload
3. assert reject/redirect

**Expected:** hash chain fails verification; broken-chain banner
**Actual:** skipped: requires authed view + tampered seed row
**Latency (recorded only — no threshold):** 4364 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0332 — [medium] /capability-transfer · SURF-ADV-9

**Category:** adversarial
**Status:** SKIP
**Reproducer:**
1. goto /capability-transfer
2. inject adversarial payload
3. assert reject/redirect

**Expected:** RLS rejects; 403 (no live install per LD-7)
**Actual:** skipped: requires authed cross-tenant fixture
**Latency (recorded only — no threshold):** 2926 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team security
**Recommended fix:** —
**Status:** OPEN

### FND-0333 — [medium] /flows · SURF-REDIRECT-1

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /flows
2. assert final URL = /dashboard

**Expected:** /flows redirects to /dashboard
**Actual:** goto /flows → status=200 finalUrl=http://localhost:5173/flows
**Latency (recorded only — no threshold):** 4479 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0334 — [medium] /flow-designer · SURF-REDIRECT-2

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /flow-designer
2. assert final URL = /dashboard

**Expected:** /flow-designer redirects to /dashboard
**Actual:** goto /flow-designer → status=200 finalUrl=http://localhost:5173/flow-designer
**Latency (recorded only — no threshold):** 4995 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0335 — [medium] /run-flow · SURF-REDIRECT-3

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /run-flow
2. assert final URL = /dashboard

**Expected:** /run-flow redirects to /dashboard
**Actual:** goto /run-flow → status=200 finalUrl=http://localhost:5173/run-flow
**Latency (recorded only — no threshold):** 4106 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0336 — [medium] /run-history · SURF-REDIRECT-4

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /run-history
2. assert final URL = /dashboard

**Expected:** /run-history redirects to /dashboard
**Actual:** goto /run-history → status=200 finalUrl=http://localhost:5173/run-history
**Latency (recorded only — no threshold):** 2639 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0337 — [medium] /variables · SURF-REDIRECT-5

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /variables
2. assert final URL = /dashboard

**Expected:** /variables redirects to /dashboard
**Actual:** goto /variables → status=200 finalUrl=http://localhost:5173/variables
**Latency (recorded only — no threshold):** 3159 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0338 — [medium] /old-dashboard · SURF-REDIRECT-6

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /old-dashboard
2. assert final URL = /dashboard

**Expected:** /old-dashboard redirects to /dashboard
**Actual:** goto /old-dashboard → status=200 finalUrl=http://localhost:5173/old-dashboard
**Latency (recorded only — no threshold):** 4236 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0339 — [medium] /autonomous-engine · SURF-REDIRECT-7

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /autonomous-engine
2. assert final URL = /auto-runner

**Expected:** /autonomous-engine redirects to /auto-runner
**Actual:** goto /autonomous-engine → status=200 finalUrl=http://localhost:5173/autonomous-engine
**Latency (recorded only — no threshold):** 4325 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0340 — [medium] /creator-studio · SURF-REDIRECT-8

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /creator-studio
2. assert final URL = /configuration

**Expected:** /creator-studio redirects to /configuration
**Actual:** goto /creator-studio → status=200 finalUrl=http://localhost:5173/creator-studio
**Latency (recorded only — no threshold):** 4808 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0341 — [medium] /workspace · SURF-REDIRECT-9

**Category:** ui
**Status:** FAIL
**Reproducer:**
1. goto /workspace
2. assert final URL = /configuration

**Expected:** /workspace redirects to /configuration
**Actual:** goto /workspace → status=200 finalUrl=http://localhost:5173/workspace
**Latency (recorded only — no threshold):** 5220 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN


### Low (227)

### FND-0002 — [low] /api/admin/seed · APIAUTH-api_admin_seed-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/admin/seed
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/admin/seed → 404
**Latency (recorded only — no threshold):** 316 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0005 — [low] /api/audit-log · APIAUTH-api_audit-log-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/audit-log
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/audit-log → 404
**Latency (recorded only — no threshold):** 213 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0008 — [low] /api/audit-product · APIAUTH-api_audit-product-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/audit-product
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/audit-product → 404
**Latency (recorded only — no threshold):** 490 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0011 — [low] /api/audits/list · APIAUTH-api_audits-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/audits/list
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/audits/list → 404
**Latency (recorded only — no threshold):** 221 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0014 — [low] /api/auth/session · APIAUTH-api_auth_session-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/auth/session
2. role=anon
3. Authorization header attached

**Expected:** public OK; anon may pass
**Actual:** anon GET /api/auth/session → 401
**Latency (recorded only — no threshold):** 379 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0023 — [low] /api/clearance/run · APIAUTH-api_clearance_run-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/clearance/run
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/clearance/run → 404
**Latency (recorded only — no threshold):** 236 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0026 — [low] /api/compliance/check · APIAUTH-api_compliance-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/compliance/check
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/compliance/check → 404
**Latency (recorded only — no threshold):** 264 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0029 — [low] /api/configuration/products · APIAUTH-api_configuration-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/configuration/products
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/configuration/products → 404
**Latency (recorded only — no threshold):** 245 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0032 — [low] /api/cost-summary · APIAUTH-api_cost-summary-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/cost-summary
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/cost-summary → 404
**Latency (recorded only — no threshold):** 266 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0035 — [low] /api/describe-product · APIAUTH-api_describe-product-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/describe-product
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/describe-product → 404
**Latency (recorded only — no threshold):** 209 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0041 — [low] /api/fetch-url · APIAUTH-api_fetch-url-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/fetch-url
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/fetch-url → 404
**Latency (recorded only — no threshold):** 236 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0044 — [low] /api/governance/dashboard · APIAUTH-api_governance_dashboard-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/governance/dashboard
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/governance/dashboard → 404
**Latency (recorded only — no threshold):** 223 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0050 — [low] /api/llm-step · APIAUTH-api_llm-step-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/llm-step
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/llm-step → 404
**Latency (recorded only — no threshold):** 230 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0053 — [low] /api/marketplace/inventory · APIAUTH-api_marketplace-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/marketplace/inventory
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/marketplace/inventory → 404
**Latency (recorded only — no threshold):** 226 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0062 — [low] /api/orchestrator/run · APIAUTH-api_orchestrator_run-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/orchestrator/run → 404
**Latency (recorded only — no threshold):** 258 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0065 — [low] /api/orchestrator/status/x · APIAUTH-api_orchestrator_status_id-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/orchestrator/status/x
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/orchestrator/status/x → 404
**Latency (recorded only — no threshold):** 212 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0068 — [low] /api/products · APIAUTH-api_products-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/products
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/products → 404
**Latency (recorded only — no threshold):** 742 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0071 — [low] /api/products/00000000-0000-0000-0000-000000000000 · APIAUTH-api_products_id-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/products/00000000-0000-0000-0000-000000000000
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/products/00000000-0000-0000-0000-000000000000 → 404
**Latency (recorded only — no threshold):** 227 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0074 — [low] /api/propose-step · APIAUTH-api_propose-step-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/propose-step
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/propose-step → 404
**Latency (recorded only — no threshold):** 223 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0077 — [low] /api/renew · APIAUTH-api_renew-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/renew
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/renew → 404
**Latency (recorded only — no threshold):** 208 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0080 — [low] /api/renewed/aaaaaaaa · APIAUTH-api_renewed_hash-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. GET /api/renewed/aaaaaaaa
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon GET /api/renewed/aaaaaaaa → 404
**Latency (recorded only — no threshold):** 229 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0083 — [low] /api/research-url · APIAUTH-api_research-url-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/research-url
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/research-url → 404
**Latency (recorded only — no threshold):** 207 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0086 — [low] /api/run-step · APIAUTH-api_run-step-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/run-step
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/run-step → 404
**Latency (recorded only — no threshold):** 665 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0089 — [low] /api/self-renewal/check · APIAUTH-api_self-renewal_check-anon

**Category:** api
**Status:** PASS
**Reproducer:**
1. POST /api/self-renewal/check
2. role=anon
3. Authorization header attached

**Expected:** auth required; anon must receive 401/403
**Actual:** anon POST /api/self-renewal/check → 404
**Latency (recorded only — no threshold):** 236 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0091 — [low] agent1.direct-api · A1-E1

**Category:** edge
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","topic":"system.clearance.decision.v1","productId":"p","concurrent":true}

**Expected:** both runs reach terminal; no orphaned hot keys
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 239 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0092 — [low] agent1.direct-api · A1-E2

**Category:** edge
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","topic":"2.build.completed.v1","productId":"p","detachImmediately":true}

**Expected:** _busHandles.length === 0 post-detach
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 284 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0093 — [low] agent1.direct-api · A1-M1

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event"}

**Expected:** schema rejection; bus does not propagate
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 233 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0094 — [low] agent1.direct-api · A1-M2

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","productId":"p","payload":"XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

**Expected:** oversized payload rejected before bus publish
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 1062 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0096 — [low] agent1.direct-api · A1-X1

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","topic":"2.build.completed.v1","productId":"'; DROP TABLE flowai_runs; --"}

**Expected:** opaque string; no SQL exception; RLS isolates
**Actual:** status=403 body={"_raw":"<!DOCTYPE html>\n<html lang=\"en\">\n  <head>\n    <meta charset=\"utf-8\" />\n    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n    <title>Blocked</title>\n    <style>@font-face {\n  font-family: \"Roobert\";\n  font-weight: 500;\n  font-style: normal;\n  font
**Latency (recorded only — no threshold):** 281 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0097 — [low] agent1.direct-api · A1-X2

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","topic":"2.build.completed.v1","_hostileGetter":true}

**Expected:** caught in recommend() try/catch; ok:false envelope; no propagation
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 238 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0098 — [low] agent1.direct-api · A1-X3

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. ctx={"kind":"lifecycle.event","topic":"2.build.completed.v1","productId":"p"}

**Expected:** BaseAgent constructor throws; 500; no agent exec
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 266 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #1
**Recommended fix:** —
**Status:** OPEN

### FND-0099 — [low] agent2.direct-api · A2-E1

**Category:** edge
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"design.spec","framework":"vite-react","spec":{"coreClaims":["feature0","feature1","feature2","feature3","feature4","feature5","feature6","feature7","feature8","feature9","feature10","feature1

**Expected:** truncated/summarized; no 429 from Claude
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 278 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0100 — [low] agent2.direct-api · A2-M1

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"design.spec","framework":"vite-react","spec":{}}

**Expected:** low confidence envelope with reason
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 269 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0101 — [low] agent2.direct-api · A2-M2

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"design.spec","framework":"vite-react","spec":{"coreClaims":"should-be-array"}}

**Expected:** schema rejection; run.error in audit log
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 259 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0105 — [low] agent2.direct-api · A2-X2

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"design.spec","framework":"django","spec":{"coreClaims":["hi"]}}

**Expected:** ok=false with error="framework not supported"
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 281 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0106 — [low] agent2.direct-api · A2-X3

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=2
3. ctx={"kind":"design.spec","framework":"vite-react","_browserAttempt":true,"spec":{"coreClaims":["hi"]}}

**Expected:** browser-side import attempt fails fast
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 233 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #2
**Recommended fix:** —
**Status:** OPEN

### FND-0107 — [low] agent3.direct-api · A3-E1

**Category:** edge
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","runId":"r","step_results":[]}

**Expected:** outcome === 'no_renewal_needed'; confidence 0.2
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 261 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0108 — [low] agent3.direct-api · A3-E2

**Category:** edge
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","runId":"r","step_results":{"foo":"bar"}}

**Expected:** mergeSignals folds object props
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 228 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0109 — [low] agent3.direct-api · A3-M1

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"unknown.request","runId":"r"}

**Expected:** plan() throws; BaseAgent returns ok:false
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 211 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0110 — [low] agent3.direct-api · A3-M2

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request"}

**Expected:** plan() throws "input.runId required"
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 232 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0113 — [low] agent3.direct-api · A3-X1

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","_hostileGetter":true,"runId":"r"}

**Expected:** caught in recommend() try/catch; ok:false envelope
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 214 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0114 — [low] agent3.direct-api · A3-X2

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","runId":"r","run_summary":{"self":"[Circular]"}}

**Expected:** heuristic skipped; analysis continues; partial flags
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 247 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0115 — [low] agent3.direct-api · A3-X3

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=3
3. ctx={"kind":"renewal.request","runId":"r","mode":"fork_and_fix"}

**Expected:** rejected — charter is RECOMMEND_ONLY pre-graduation
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 243 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #3
**Recommended fix:** —
**Status:** OPEN

### FND-0118 — [low] agent4.direct-api · A4-M1

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=4
3. ctx={"kind":"provider.onboarding","name":"A","email":"not-an-email"}

**Expected:** validation rejection at plan()
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 281 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0119 — [low] agent4.direct-api · A4-M1-MOCK

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. MockStripe accounts.create
2. email=not-an-email

**Expected:** MockStripe validates email or rejects deterministically
**Actual:** mock-reject: parameter_invalid_string_empty: email
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0120 — [low] agent4.direct-api · A4-M2

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=4
3. ctx={"kind":"provider.onboarding","email":"a@b.test"}

**Expected:** schema rejection
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 263 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0121 — [low] agent4.direct-api · A4-M2-MOCK

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. MockStripe accounts.create
2. email=a@b.test

**Expected:** MockStripe validates email or rejects deterministically
**Actual:** mock-ok
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0124 — [low] agent4.direct-api · A4-X1

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=4
3. ctx={"kind":"provider.onboarding","name":"A","email":"a@b.test\nBcc: attacker@evil.test"}

**Expected:** CRLF stripped; opaque
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 263 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0125 — [low] agent4.direct-api · A4-X1-MOCK

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. MockStripe accounts.create
2. email=a@b.test
Bcc: attacker@evil.test

**Expected:** MockStripe validates email or rejects deterministically
**Actual:** mock-reject: parameter_invalid_string: email contains CRLF
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0126 — [low] agent4.direct-api · A4-X2

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=4
3. ctx={"kind":"provider.onboarding","target_provider_id":"someone_elses_id"}

**Expected:** 403 RLS unless admin
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 249 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0127 — [low] agent4.direct-api · A4-X2-MOCK

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. MockStripe accounts.create
2. email=undefined

**Expected:** MockStripe validates email or rejects deterministically
**Actual:** mock-ok
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0128 — [low] agent4.direct-api · A4-X3

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=4
3. ctx={"kind":"provider.onboarding","name":"A","email":"a@b.test","_flowAiOnly":true}

**Expected:** BaseAgent rejects charter-flowAiOnly violation
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 258 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0129 — [low] agent4.direct-api · A4-X3-MOCK

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. MockStripe accounts.create
2. email=a@b.test

**Expected:** MockStripe validates email or rejects deterministically
**Actual:** mock-ok
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #4
**Recommended fix:** —
**Status:** OPEN

### FND-0130 — [low] agent5.direct-api · A5-E1

**Category:** edge
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"p","_batchOf100":true}

**Expected:** rate-limited; audit log shows rate-limit event
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 232 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0131 — [low] agent5.direct-api · A5-M1

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","email":"cust@test.invalid"}

**Expected:** FK error caught at plan()
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 219 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0132 — [low] agent5.direct-api · A5-M2

**Category:** malformed
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"p","intake_at":"9999-12-31T00:00:00Z"}

**Expected:** reject or clamp future timestamp
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 332 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0135 — [low] agent5.direct-api · A5-X1

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"p","notes":"javascript:alert(1)"}

**Expected:** stored opaque; no XSS in admin UI
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 236 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0136 — [low] agent5.direct-api · A5-X2

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"p","target_tenant":"tenant_B"}

**Expected:** 403 RLS; cross-tenant rejected
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 256 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0137 — [low] agent5.direct-api · A5-X3

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"p"}

**Expected:** semantic rejection — flowai is platform, not end-customer tenant
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 217 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0138 — [low] agent5.direct-api · A5-X3b

**Category:** adversarial
**Status:** PASS
**Reproducer:**
1. POST /api/orchestrator/run
2. agentId=5
3. ctx={"kind":"end_customer.intake","provider_id":"p","email":"cust3@test.invalid"}

**Expected:** _test tenant write allowed; cleanup removes after run
**Actual:** status=404 body={"error_type":"HTTPException","message":"Not Found","detail":"Not Found","traceback":"","request_id":null}
**Latency (recorded only — no threshold):** 274 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** Agent #5
**Recommended fix:** —
**Status:** OPEN

### FND-0139 — [low] BaseAgent.run · INV-1

**Category:** invariant
**Status:** PASS
**Reproducer:**
1. read src/lib/agents/BaseAgent.js
2. check for run.start phase emission

**Expected:** auditLog.write({phase:"run.start"}) before any side effect
**Actual:** run.start phase present in BaseAgent.run(); act.ok=true; run.error=true
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team cross-agent
**Recommended fix:** —
**Status:** OPEN

### FND-0140 — [low] BaseAgent.run · INV-2

**Category:** invariant
**Status:** PASS
**Reproducer:**
1. grep BaseAgent.js for run.start / act.ok / run.error

**Expected:** every run emits start + (ok | error)
**Actual:** run.start=true; act.ok=true; run.error=true
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team cross-agent
**Recommended fix:** —
**Status:** OPEN

### FND-0141 — [low] BaseAgent.guard · INV-3

**Category:** invariant
**Status:** PASS
**Reproducer:**
1. inspect BaseAgent.guard() for sideEffects+authority enforcement

**Expected:** BaseAgent.guard() throws when sideEffects under RECOMMEND_ONLY
**Actual:** guard reference present in BaseAgent
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team cross-agent
**Recommended fix:** —
**Status:** OPEN

### FND-0142 — [low] BaseAgent.ctor · INV-4

**Category:** invariant
**Status:** PASS
**Reproducer:**
1. inspect BaseAgent constructor for scope/charter enforcement

**Expected:** ctor rejects mismatched productScope ↔ charter (per BaseAgent.js L111-115)
**Actual:** productScope enforcement present in BaseAgent
**Latency (recorded only — no threshold):** 0 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team cross-agent
**Recommended fix:** —
**Status:** OPEN

### FND-0144 — [low] /api/orchestrator/* · INV-6

**Category:** invariant
**Status:** PASS
**Reproducer:**
1. anonymous GET to each /api/orchestrator/* endpoint

**Expected:** anon GET → 401/403/405 on /api/orchestrator/{run,status/*}
**Actual:** /api/orchestrator/run=404; /api/orchestrator/status/x=404
**Latency (recorded only — no threshold):** 1143 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team cross-agent
**Recommended fix:** —
**Status:** OPEN

### FND-0146 — [low] /dashboard · SURF-AUTH-2

**Category:** ui
**Status:** PASS
**Reproducer:**
1. inject expired cookie
2. goto /dashboard

**Expected:** expired session purged; redirected to login
**Actual:** sessionPurged=true
**Latency (recorded only — no threshold):** 5065 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0150 — [low] /dashboard · SURF-AUTH-6

**Category:** ui
**Status:** PASS
**Reproducer:**
1. inject malformed session cookie
2. goto /dashboard

**Expected:** tampered cipher invalid; redirect; audit-log entry
**Actual:** final url=http://localhost:5173/dashboard
**Latency (recorded only — no threshold):** 6698 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0151 — [low] /analytics · SURF-DISC-analytics

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /analytics
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/analytics
**Latency (recorded only — no threshold):** 2442 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0152 — [low] /architecture · SURF-DISC-architecture

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /architecture
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/architecture
**Latency (recorded only — no threshold):** 2556 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0153 — [low] /audit-trail · SURF-DISC-audit-trail

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /audit-trail
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/audit-trail
**Latency (recorded only — no threshold):** 2642 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0154 — [low] /auto-runner · SURF-DISC-auto-runner

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /auto-runner
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/auto-runner
**Latency (recorded only — no threshold):** 3831 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0155 — [low] /build · SURF-DISC-build

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /build
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/build
**Latency (recorded only — no threshold):** 5063 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0156 — [low] /capability-packages/self-protection · SURF-DISC-capability-packages_self-protection

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-protection
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/capability-packages/self-protection
**Latency (recorded only — no threshold):** 3440 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0157 — [low] /capability-packages/self-protection/install · SURF-DISC-capability-packages_self-protection_install

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-protection/install
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/capability-packages/self-protection/install
**Latency (recorded only — no threshold):** 2897 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0158 — [low] /capability-packages/self-renewal · SURF-DISC-capability-packages_self-renewal

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-renewal
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/capability-packages/self-renewal
**Latency (recorded only — no threshold):** 3663 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0159 — [low] /capability-packages/self-renewal/install · SURF-DISC-capability-packages_self-renewal_install

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-renewal/install
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/capability-packages/self-renewal/install
**Latency (recorded only — no threshold):** 4095 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0160 — [low] /capability-transfer · SURF-DISC-capability-transfer

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-transfer
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/capability-transfer
**Latency (recorded only — no threshold):** 2733 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0161 — [low] /clearance · SURF-DISC-clearance

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /clearance
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/clearance
**Latency (recorded only — no threshold):** 4222 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0162 — [low] /compare-tools · SURF-DISC-compare-tools

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /compare-tools
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/compare-tools
**Latency (recorded only — no threshold):** 2300 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0163 — [low] /configuration · SURF-DISC-configuration

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /configuration
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/configuration
**Latency (recorded only — no threshold):** 3535 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0164 — [low] /dashboard · SURF-DISC-dashboard

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /dashboard
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=14 url=http://localhost:5173/dashboard
**Latency (recorded only — no threshold):** 8547 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0165 — [low] /design · SURF-DISC-design

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /design
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/design
**Latency (recorded only — no threshold):** 6325 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0166 — [low] /domain-manager · SURF-DISC-domain-manager

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /domain-manager
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/domain-manager
**Latency (recorded only — no threshold):** 1611 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0167 — [low] /governance · SURF-DISC-governance

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /governance
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/governance
**Latency (recorded only — no threshold):** 2400 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0168 — [low] /gtm · SURF-DISC-gtm

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /gtm
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/gtm
**Latency (recorded only — no threshold):** 2506 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0169 — [low] /guided/build · SURF-DISC-guided_build

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/build
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/build
**Latency (recorded only — no threshold):** 4978 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0170 — [low] /guided/deploy · SURF-DISC-guided_deploy

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/deploy
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/deploy
**Latency (recorded only — no threshold):** 3069 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0171 — [low] /guided/design · SURF-DISC-guided_design

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/design
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/design
**Latency (recorded only — no threshold):** 5998 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0172 — [low] /guided/govern · SURF-DISC-guided_govern

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/govern
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/govern
**Latency (recorded only — no threshold):** 3212 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0173 — [low] /guided/gtm · SURF-DISC-guided_gtm

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/gtm
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/gtm
**Latency (recorded only — no threshold):** 2683 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0174 — [low] /guided/monitor · SURF-DISC-guided_monitor

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/monitor
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/monitor
**Latency (recorded only — no threshold):** 3964 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0175 — [low] /guided/qa-audit · SURF-DISC-guided_qa-audit

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/qa-audit
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/qa-audit
**Latency (recorded only — no threshold):** 2866 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0176 — [low] /guided/research · SURF-DISC-guided_research

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/research
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/guided/research
**Latency (recorded only — no threshold):** 4860 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0177 — [low] /manual/build · SURF-DISC-manual_build

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/build
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/build
**Latency (recorded only — no threshold):** 3670 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0178 — [low] /manual/deploy · SURF-DISC-manual_deploy

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/deploy
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=13 url=http://localhost:5173/manual/deploy
**Latency (recorded only — no threshold):** 5060 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0179 — [low] /manual/design · SURF-DISC-manual_design

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/design
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/design
**Latency (recorded only — no threshold):** 6313 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0180 — [low] /manual/govern · SURF-DISC-manual_govern

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/govern
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/govern
**Latency (recorded only — no threshold):** 6270 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0181 — [low] /manual/gtm · SURF-DISC-manual_gtm

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/gtm
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/gtm
**Latency (recorded only — no threshold):** 6130 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0182 — [low] /manual/monitor · SURF-DISC-manual_monitor

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/monitor
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/monitor
**Latency (recorded only — no threshold):** 6470 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0183 — [low] /manual/qa-audit · SURF-DISC-manual_qa-audit

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/qa-audit
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/qa-audit
**Latency (recorded only — no threshold):** 3648 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0184 — [low] /manual/research · SURF-DISC-manual_research

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/research
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/manual/research
**Latency (recorded only — no threshold):** 5621 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0185 — [low] /marketplace · SURF-DISC-marketplace

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /marketplace
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/marketplace
**Latency (recorded only — no threshold):** 1817 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0186 — [low] /my-stack · SURF-DISC-my-stack

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /my-stack
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/my-stack
**Latency (recorded only — no threshold):** 1956 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0187 — [low] /onboarding · SURF-DISC-onboarding

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /onboarding
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/onboarding
**Latency (recorded only — no threshold):** 2963 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0188 — [low] /pipeline · SURF-DISC-pipeline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /pipeline
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/pipeline
**Latency (recorded only — no threshold):** 3074 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0189 — [low] /portfolio · SURF-DISC-portfolio

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /portfolio
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/portfolio
**Latency (recorded only — no threshold):** 7330 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0190 — [low] /products · SURF-DISC-products

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /products
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/products
**Latency (recorded only — no threshold):** 3336 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0191 — [low] /qa-audit · SURF-DISC-qa-audit

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /qa-audit
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/qa-audit
**Latency (recorded only — no threshold):** 2529 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0192 — [low] /realtime · SURF-DISC-realtime

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /realtime
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/realtime
**Latency (recorded only — no threshold):** 2452 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0193 — [low] /release-notes · SURF-DISC-release-notes

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /release-notes
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/release-notes
**Latency (recorded only — no threshold):** 2822 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0194 — [low] /renewal · SURF-DISC-renewal

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /renewal
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/renewal
**Latency (recorded only — no threshold):** 4969 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0195 — [low] /research · SURF-DISC-research

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /research
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/research
**Latency (recorded only — no threshold):** 3823 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0196 — [low] /runs · SURF-DISC-runs

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /runs
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/runs
**Latency (recorded only — no threshold):** 3797 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0197 — [low] /self-healing · SURF-DISC-self-healing

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /self-healing
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/self-healing
**Latency (recorded only — no threshold):** 1820 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0198 — [low] /self-protection · SURF-DISC-self-protection

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /self-protection
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/self-protection
**Latency (recorded only — no threshold):** 2654 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0199 — [low] /settings · SURF-DISC-settings

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /settings
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/settings
**Latency (recorded only — no threshold):** 2230 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0200 — [low] /templates · SURF-DISC-templates

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /templates
2. count links + buttons

**Expected:** non-404 navigation; element enumeration succeeds
**Actual:** status=200 links=0 buttons=0 url=http://localhost:5173/templates
**Latency (recorded only — no threshold):** 2932 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0201 — [low] /analytics · SURF-VP-analytics-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /analytics at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3968 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0202 — [low] /architecture · SURF-VP-architecture-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /architecture at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1969 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0203 — [low] /audit-trail · SURF-VP-audit-trail-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /audit-trail at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4433 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0204 — [low] /auto-runner · SURF-VP-auto-runner-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /auto-runner at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3023 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0205 — [low] /build · SURF-VP-build-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /build at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1970 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0206 — [low] /capability-packages/self-protection · SURF-VP-capability-packages_self-protection-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-protection at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4466 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0207 — [low] /capability-packages/self-protection/install · SURF-VP-capability-packages_self-protection_install-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-protection/install at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3910 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0208 — [low] /capability-packages/self-renewal · SURF-VP-capability-packages_self-renewal-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-renewal at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4418 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0209 — [low] /capability-packages/self-renewal/install · SURF-VP-capability-packages_self-renewal_install-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-packages/self-renewal/install at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4524 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0210 — [low] /capability-transfer · SURF-VP-capability-transfer-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /capability-transfer at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4282 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0211 — [low] /clearance · SURF-VP-clearance-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /clearance at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2473 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0212 — [low] /compare-tools · SURF-VP-compare-tools-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /compare-tools at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2551 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0213 — [low] /configuration · SURF-VP-configuration-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /configuration at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2548 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0214 — [low] /dashboard · SURF-VP-dashboard-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /dashboard at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 6544 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0215 — [low] /design · SURF-VP-design-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /design at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1973 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0216 — [low] /domain-manager · SURF-VP-domain-manager-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /domain-manager at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2083 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0217 — [low] /governance · SURF-VP-governance-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /governance at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2940 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0218 — [low] /gtm · SURF-VP-gtm-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /gtm at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2562 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0219 — [low] /guided/build · SURF-VP-guided_build-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/build at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2973 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0220 — [low] /guided/deploy · SURF-VP-guided_deploy-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/deploy at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3625 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0221 — [low] /guided/design · SURF-VP-guided_design-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/design at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4291 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0222 — [low] /guided/govern · SURF-VP-guided_govern-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/govern at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4948 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0223 — [low] /guided/gtm · SURF-VP-guided_gtm-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/gtm at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2137 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0224 — [low] /guided/monitor · SURF-VP-guided_monitor-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/monitor at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2391 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0225 — [low] /guided/qa-audit · SURF-VP-guided_qa-audit-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/qa-audit at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3245 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0226 — [low] /guided/research · SURF-VP-guided_research-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /guided/research at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2295 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0227 — [low] /manual/build · SURF-VP-manual_build-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/build at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2474 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0228 — [low] /manual/deploy · SURF-VP-manual_deploy-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/deploy at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3003 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0229 — [low] /manual/design · SURF-VP-manual_design-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/design at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2161 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0230 — [low] /manual/govern · SURF-VP-manual_govern-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/govern at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3158 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0231 — [low] /manual/gtm · SURF-VP-manual_gtm-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/gtm at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4777 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0232 — [low] /manual/monitor · SURF-VP-manual_monitor-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/monitor at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 5250 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0233 — [low] /manual/qa-audit · SURF-VP-manual_qa-audit-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/qa-audit at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2008 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0234 — [low] /manual/research · SURF-VP-manual_research-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /manual/research at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2169 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0235 — [low] /marketplace · SURF-VP-marketplace-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /marketplace at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2233 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0236 — [low] /my-stack · SURF-VP-my-stack-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /my-stack at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2476 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0237 — [low] /onboarding · SURF-VP-onboarding-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /onboarding at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2362 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0238 — [low] /pipeline · SURF-VP-pipeline-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /pipeline at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1924 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0239 — [low] /portfolio · SURF-VP-portfolio-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /portfolio at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 5950 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0240 — [low] /products · SURF-VP-products-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /products at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4706 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0241 — [low] /qa-audit · SURF-VP-qa-audit-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /qa-audit at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1801 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0242 — [low] /realtime · SURF-VP-realtime-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /realtime at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2917 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0243 — [low] /release-notes · SURF-VP-release-notes-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /release-notes at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2339 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0244 — [low] /renewal · SURF-VP-renewal-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /renewal at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2353 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0245 — [low] /research · SURF-VP-research-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /research at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1908 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0246 — [low] /runs · SURF-VP-runs-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /runs at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 2746 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0247 — [low] /self-healing · SURF-VP-self-healing-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /self-healing at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1832 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0248 — [low] /self-protection · SURF-VP-self-protection-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /self-protection at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 3302 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0249 — [low] /settings · SURF-VP-settings-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /settings at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 1745 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0250 — [low] /templates · SURF-VP-templates-desktop

**Category:** ui
**Status:** PASS
**Reproducer:**
1. goto /templates at viewport 1440x900
2. measure scrollWidth vs innerWidth

**Expected:** no horizontal clipping at any viewport
**Actual:** vp=1440x900 status=200 scrollWidth=1440 innerWidth=1440 overflow=false
**Latency (recorded only — no threshold):** 4012 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0251 — [low] /architecture · SURF-ERR-architecture-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1483 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0252 — [low] /architecture · SURF-ERR-architecture-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1164 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0253 — [low] /architecture · SURF-ERR-architecture-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1714 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0255 — [low] /architecture · SURF-ERR-architecture-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1029 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0256 — [low] /architecture · SURF-ERR-architecture-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 435 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0257 — [low] /architecture · SURF-ERR-architecture-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /architecture

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 3342 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0258 — [low] /audit-trail · SURF-ERR-audit-trail-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1153 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0259 — [low] /audit-trail · SURF-ERR-audit-trail-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1830 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0260 — [low] /audit-trail · SURF-ERR-audit-trail-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 3349 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0262 — [low] /audit-trail · SURF-ERR-audit-trail-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2513 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0263 — [low] /audit-trail · SURF-ERR-audit-trail-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 3426 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0264 — [low] /audit-trail · SURF-ERR-audit-trail-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /audit-trail

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 832 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0265 — [low] /auto-runner · SURF-ERR-auto-runner-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2304 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0266 — [low] /auto-runner · SURF-ERR-auto-runner-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1508 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0267 — [low] /auto-runner · SURF-ERR-auto-runner-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1489 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0269 — [low] /auto-runner · SURF-ERR-auto-runner-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2612 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0270 — [low] /auto-runner · SURF-ERR-auto-runner-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1860 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0271 — [low] /auto-runner · SURF-ERR-auto-runner-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /auto-runner

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 6456 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0272 — [low] /clearance · SURF-ERR-clearance-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2838 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0273 — [low] /clearance · SURF-ERR-clearance-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2483 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0274 — [low] /clearance · SURF-ERR-clearance-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2658 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0276 — [low] /clearance · SURF-ERR-clearance-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1282 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0277 — [low] /clearance · SURF-ERR-clearance-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1845 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0278 — [low] /clearance · SURF-ERR-clearance-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /clearance

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2683 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0279 — [low] /cost-usage · SURF-ERR-cost-usage-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1307 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0280 — [low] /cost-usage · SURF-ERR-cost-usage-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1044 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0281 — [low] /cost-usage · SURF-ERR-cost-usage-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1218 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0283 — [low] /cost-usage · SURF-ERR-cost-usage-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 885 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0284 — [low] /cost-usage · SURF-ERR-cost-usage-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 948 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0285 — [low] /cost-usage · SURF-ERR-cost-usage-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /cost-usage

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1434 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0286 — [low] /environments · SURF-ERR-environments-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 944 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0287 — [low] /environments · SURF-ERR-environments-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 903 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0288 — [low] /environments · SURF-ERR-environments-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1747 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0290 — [low] /environments · SURF-ERR-environments-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 3165 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0291 — [low] /environments · SURF-ERR-environments-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 850 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0292 — [low] /environments · SURF-ERR-environments-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /environments

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 538 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0293 — [low] /marketplace · SURF-ERR-marketplace-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 841 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0294 — [low] /marketplace · SURF-ERR-marketplace-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 682 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0295 — [low] /marketplace · SURF-ERR-marketplace-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 765 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0297 — [low] /marketplace · SURF-ERR-marketplace-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 376 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0298 — [low] /marketplace · SURF-ERR-marketplace-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 903 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0299 — [low] /marketplace · SURF-ERR-marketplace-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /marketplace

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 559 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0300 — [low] /my-stack · SURF-ERR-my-stack-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1056 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0301 — [low] /my-stack · SURF-ERR-my-stack-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 748 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0302 — [low] /my-stack · SURF-ERR-my-stack-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1008 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0304 — [low] /my-stack · SURF-ERR-my-stack-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 437 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0305 — [low] /my-stack · SURF-ERR-my-stack-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 519 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0306 — [low] /my-stack · SURF-ERR-my-stack-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /my-stack

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1043 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0307 — [low] /production-monitor · SURF-ERR-production-monitor-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1728 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0308 — [low] /production-monitor · SURF-ERR-production-monitor-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1111 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0309 — [low] /production-monitor · SURF-ERR-production-monitor-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2244 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0311 — [low] /production-monitor · SURF-ERR-production-monitor-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 910 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0312 — [low] /production-monitor · SURF-ERR-production-monitor-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1294 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0313 — [low] /production-monitor · SURF-ERR-production-monitor-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /production-monitor

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1568 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0314 — [low] /renewal · SURF-ERR-renewal-api-401

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-401
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-401 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2818 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0315 — [low] /renewal · SURF-ERR-renewal-api-429

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-429
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-429 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1311 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0316 — [low] /renewal · SURF-ERR-renewal-api-500

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate api-500
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=api-500 status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 4467 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0318 — [low] /renewal · SURF-ERR-renewal-empty-data

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate empty-data
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=empty-data status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 2538 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0319 — [low] /renewal · SURF-ERR-renewal-malformed-json

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate malformed-json
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=malformed-json status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1860 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN

### FND-0320 — [low] /renewal · SURF-ERR-renewal-network-offline

**Category:** ui
**Status:** PASS
**Reproducer:**
1. intercept **/api/**
2. simulate network-offline
3. goto /renewal

**Expected:** error UI renders per §4.4 trigger table
**Actual:** trigger=network-offline status=200 rootLen=473 errors=0
**Latency (recorded only — no threshold):** 1767 ms
**Evidence:** —
**First seen:** 0bd26b9fee51e4a59328efaf32f463d6f0145ab7
**Owner:** team platform
**Recommended fix:** —
**Status:** OPEN


## Trend (last 7 nightly runs)

_First execution — no historical trend to graph yet._

## Final summary

```
runId:        w4-2026-05-14-r05
environment:  http://localhost:5173
testsRun:     341
testsTarget:  446
passed:       227
failed:       26
errored:      0
skipped:      88
durationMs:   386551
startedAt:    2026-05-14T23:22:14.647Z
completedAt:  2026-05-14T23:28:41.199Z
```
