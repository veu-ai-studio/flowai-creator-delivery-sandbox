# CR Step 5 Review Prompt - Clerk Auth Completion

FROM: CTO
TO: CR
ACTION: STEP 5 ADVERSARIAL REVIEW - Clerk auth completion
Branch: `fix/clerk-auth-completion`
Runtime commit under review: `0aafb3bce302b2384b9d7645facd76c2ca13692b`
Dispatch: `docs/cto/cb-clerk-auth-completion-dispatch-20260613.md`
CB evidence: `docs/cto/cb-clerk-auth-completion-evidence-20260613.md`

Read first:

- `docs/CANONICAL_REFERENCE.md`
- `docs/BUILD_PROTOCOL.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/cto/current-directive.md`
- `docs/cto/clerk-auth-diagnostic-20260613.md`
- `docs/cto/cb-clerk-auth-completion-dispatch-20260613.md`
- `docs/cto/cb-clerk-auth-completion-evidence-20260613.md`

## Review Scope

Review adversarially for evidence, security, deployment-proof, auth, and claim inflation risks.

Changed runtime files:

- `api/health.js`
- `src/lib/observability/health.js`
- `src/lib/AuthContext.jsx`
- `src/App.jsx`
- `src/pages/ClerkAuthPage.jsx`
- `package.json`
- `package-lock.json`

Changed tests/docs:

- `tests/api-health-handler.test.js`
- `tests/clerk-auth-routes.test.js`
- `docs/cto/cb-clerk-auth-completion-evidence-20260613.md`

## CR Questions

1. Does `/api/health` leak any secret, token, key, or sensitive Clerk configuration?
2. Does `clerkReady:true` overclaim real user auth before CT2 live proof?
3. Does the branch accidentally turn on `AUTH_REQUIRED`, break anonymous proof workflows, or create a public auth bypass beyond existing behavior?
4. Does replacing `AuthContext` introduce route/auth regressions for existing FlowAI pages?
5. Are `/sign-up` and `/sign-in` genuinely Clerk-routed in code, or could they still be fallback/marketing/internal auth surfaces?
6. Does adding `@clerk/clerk-react` introduce a package/security/deploy risk that should block?
7. Is the evidence correctly labeled as UNIT/Tier B/WIRED only, with no VERIFIED movement?
8. Are CT2 browser instructions sufficient to catch Clerk dashboard/domain/session failures?

## Required Output

Return PASS / PASS-WITH-FINDINGS / BLOCK.

Include:

- evidence-tied findings only;
- file/line references;
- claim impact check;
- tests or commands you ran/inspected;
- exact patch requirements if BLOCK.

Do not edit files.
