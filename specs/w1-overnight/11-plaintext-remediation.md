# 11 — Plaintext webhook secret remediation plan

Date: 2026-05-07

## 1. The problem

Part 1 found that the literal string `'flowai-webhook-secret'` is committed to source as a fallback default. This means any external system that posts to the webhook handler with that header value succeeds **even if the env var is unset** — i.e., the secret has zero security value until both files are fixed.

Re-verified file:line evidence below.

## 2. Exact file:line evidence (re-verified 2026-05-07)

### Site 1 — `base44/functions/webhookHandler/entry.ts`

Function entry point at line 8:

```ts
// base44/functions/webhookHandler/entry.ts:8
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'flowai-webhook-secret';
```

Used at line 22 to validate incoming requests:

```ts
// base44/functions/webhookHandler/entry.ts:21–24
const secret = req.headers.get('x-webhook-secret') || req.headers.get('x-flowai-secret');
if (secret !== WEBHOOK_SECRET) {
  return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
}
```

**Effect:** when `WEBHOOK_SECRET` env var is unset on Base44, **any caller sending `x-webhook-secret: flowai-webhook-secret` is admitted**. Since this string is committed to a public-able codebase, this is a hardcoded backdoor.

### Site 2 — `src/components/pipeline/WebhookPanel.jsx`

UI component declares the same literal at line 8:

```jsx
// src/components/pipeline/WebhookPanel.jsx:8
const WEBHOOK_SECRET = 'flowai-webhook-secret';
```

Displayed verbatim in the UI at line 91 via a copy-to-clipboard widget:

```jsx
// src/components/pipeline/WebhookPanel.jsx:91
<CopyBox label="Secret Header — x-webhook-secret" value={WEBHOOK_SECRET} />
```

**Effect:** Anyone who opens the pipeline panel sees the literal string and can copy it into an external system. The UI is presenting the **fallback** as if it were the real secret.

## 3. What "plaintext default" means in practice

The pair of literals work together as a **paired default**:

1. `WebhookPanel.jsx` displays `'flowai-webhook-secret'` to the user
2. The user pastes that into GitHub / Vercel / custom webhook configuration
3. The webhook arrives at `webhookHandler/entry.ts`, where `WEBHOOK_SECRET` env var is unset
4. The fallback `'flowai-webhook-secret'` matches the displayed value
5. The webhook is admitted

This means the system **works as if it were secure** when the env var is unset, masking the misconfiguration. No alert fires. No log warning. The default is silently accepted.

## 4. Remediation requirements

Any fix must:

R1. **Remove the hardcoded fallback** in `webhookHandler/entry.ts:8`.
R2. **Remove the literal from the UI** in `WebhookPanel.jsx:8`.
R3. **Keep webhook deliveries working** during the transition (zero-downtime).
R4. **Surface a clear error** when the env var is unset — fail-closed, not fail-silent.
R5. **Avoid leaking the new secret** in source, build artifacts, or browser bundles.
R6. **Allow secret rotation** per `09-rotation-completeness.md §2.3`.

## 5. Two-phase migration plan

### Phase 0 — Pre-conditions

- Provision a real `WEBHOOK_SECRET` value in the Base44 function environment (32+ random characters, no English words). Suggested generation: `openssl rand -base64 32` — store in a password manager and the Base44 dashboard.
- Add `WEBHOOK_SECRET` to `docs/ENV_VARS.md` per `12-inventory-expansion.md` so the inventory cross-check stops flagging it.

### Phase 1 — Fail-closed deployment (single-tenant breakage acceptable)

If you are confident no external webhook source has the literal `'flowai-webhook-secret'` baked in (or you can update those sources synchronously), apply the simplest fix.

**`base44/functions/webhookHandler/entry.ts:8` becomes:**

```ts
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET');
if (!WEBHOOK_SECRET) {
  // Fail-closed at module init. Logged once per cold start.
  console.error('[webhookHandler] WEBHOOK_SECRET env var is not set; all webhook requests will be rejected with 503');
}
```

**`base44/functions/webhookHandler/entry.ts:22` becomes:**

```ts
if (!WEBHOOK_SECRET) {
  return Response.json({ error: 'Webhook handler is not configured' }, { status: 503 });
}
const provided = req.headers.get('x-webhook-secret') || req.headers.get('x-flowai-secret');
if (!provided || provided !== WEBHOOK_SECRET) {
  return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
}
```

**`src/components/pipeline/WebhookPanel.jsx:8` becomes:**

```jsx
// Removed the hardcoded WEBHOOK_SECRET literal. The actual secret is provisioned
// in Base44's function environment as WEBHOOK_SECRET and is never exposed to the
// browser bundle. The UI shows a placeholder + instructions for the operator to
// retrieve it from the Base44 dashboard.
```

**`src/components/pipeline/WebhookPanel.jsx:91` becomes:**

```jsx
<div className="space-y-1.5">
  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Secret Header — x-webhook-secret</p>
  <p className="text-xs text-muted-foreground bg-secondary/50 border border-border rounded px-3 py-2">
    The webhook secret is configured in Base44 → Code → Functions → webhookHandler → Environment Variables.
    The value is not exposed in the browser. Retrieve it from the Base44 dashboard, or rotate it via the
    rotation runbook (<code>docs/w1-ops/ROTATION.md</code>).
  </p>
</div>
```

### Phase 2 — Zero-downtime variant (if external webhook sources cannot be synchronously updated)

If GitHub / Vercel / custom systems still send the literal `'flowai-webhook-secret'`, accept BOTH the new secret AND the deprecated literal during a deprecation window.

**`base44/functions/webhookHandler/entry.ts` becomes:**

```ts
const PRIMARY_SECRET = Deno.env.get('WEBHOOK_SECRET');
const DEPRECATED_LITERAL = 'flowai-webhook-secret';
const ACCEPT_DEPRECATED_UNTIL = new Date('2026-06-15T00:00:00Z'); // hard-coded sunset

function isSecretValid(provided, now = new Date()) {
  if (!PRIMARY_SECRET) return false;
  if (provided === PRIMARY_SECRET) return true;
  if (now < ACCEPT_DEPRECATED_UNTIL && provided === DEPRECATED_LITERAL) {
    console.warn('[webhookHandler] DEPRECATED legacy webhook secret used; migrate caller before sunset');
    return true;
  }
  return false;
}

// In handler:
if (!isSecretValid(req.headers.get('x-webhook-secret') || req.headers.get('x-flowai-secret'))) {
  return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
}
```

The sunset constant ensures the deprecated literal is automatically refused after the date. UI in this phase shows the new secret retrieval path (same as Phase 1).

After 2026-06-15 (or whenever sunset arrives), apply Phase 1 to remove the `DEPRECATED_LITERAL` block entirely.

## 6. Migration order

1. **Day 0:** Add `WEBHOOK_SECRET` to `docs/ENV_VARS.md`.
2. **Day 0:** Generate the new secret. Store it in Base44 function env. Verify it's set via the Base44 dashboard.
3. **Day 0:** Catalog every external webhook source: GitHub repos with webhook URLs to `/webhookHandler`, Vercel deployment hooks, custom systems. List in `specs/w1-billing/webhook-migration-tracker.md` (new file).
4. **Day 1:** If catalog is short and you can update synchronously → apply Phase 1.
5. **Day 1–14:** If catalog is long → apply Phase 2 with deprecation window. Update each external source to send the new secret.
6. **Day 14 (or sunset):** Apply Phase 1 to remove the deprecated-literal allowance entirely.
7. **Day 14:** Add a CI grep test to prevent regression — see §7.

## 7. Regression-prevention test

After remediation, add a test (under `tests/`) that fails the build if `'flowai-webhook-secret'` reappears anywhere in source.

Proposed `tests/no-plaintext-webhook-secret.test.js` shape (not authored as part of this read-only Part 2 report; sketched here):

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { execSync } from 'child_process';

describe('webhook secret is not plaintext-committed', () => {
  it('the literal "flowai-webhook-secret" does not appear in any source file', () => {
    // ripgrep, exclude tests dir + node_modules + dist + this file itself
    const out = execSync(
      'rg --no-heading --line-number --glob "!node_modules" --glob "!dist" --glob "!tests/no-plaintext-webhook-secret.test.js" "flowai-webhook-secret" .',
      { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    expect(out).toBe('');
  });
});
```

When this file is authored, it locks in the remediation. If anyone re-introduces the literal (copy-paste from history, AI suggestion, etc.), CI fails.

## 8. Verdict

| Item | Status |
|---|---|
| Plaintext literal still committed | YES — both files present, lines unchanged from Part 1 |
| Phase 1 fix sketch | DRAFTED §5 |
| Phase 2 zero-downtime fix sketch | DRAFTED §5 |
| Migration order | DRAFTED §6 |
| Regression-prevention test | DRAFTED §7 (not yet committed) |
| Inventory addition | Tracked in `12-inventory-expansion.md` |
| Rotation gating | Tracked in `09-rotation-completeness.md §2.3` |

The remediation is straightforward (5 lines of code in 2 files) but requires coordination with whoever configured external webhook sources. Phase 2's deprecation-window pattern handles the case where that coordination is asynchronous.

**Severity:** HIGH — the literal is a permanent hardcoded backdoor for as long as it remains. Recommend Phase 1 within the week and Phase 2 only if external webhook sources can't be updated in lockstep.
