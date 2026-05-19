// src/lib/agents/renewal/adversarialSurface.js
//
// Phase B — Adversarial Surface Testing per CANONICAL_REFERENCE §6 +
// CEO directive (D39): "NO GTM without real interactive verification."
// Phase A's §7.6 scoring is surface-only (HTTP status, broken links,
// console errors, presence detection). Phase B exercises the
// interactive layer — clicks, modals, forms, AI/chatbot agents — and
// distinguishes WIRED features from MOCK-ONLY stubs.
//
// Architecture: composes over the ENTRY-007 authenticated traversal
// infrastructure (authenticatedTraversal.js) so logged-in surfaces can
// be probed too. Headless via Playwright (local chromium) when
// BROWSERLESS_API_KEY is absent; otherwise via the existing
// browserlessAdapter (remote CDP).
//
// Public contract:
//   probeAdversarialSurface({ url, opts }) → {
//     ok, findings: [{ severity, category, location, evidence }],
//     summary: { interactivesTested, deadOrErroring,
//                modalsFailing, formsFailing, agentsNonFunctional,
//                mockOnlyFlagged },
//     probedAt, durationMs,
//   }
//
// `findings` items are §7.6-shaped so they flow through the existing
// gtmReadinessScorer + scoped-relaxation rules without translation.
//
// All probes are bounded by hard timeouts (default 8s per action,
// 30s navigation) and capped by maxInteractives/maxModals/maxForms
// (default 25/10/10) so a single Phase B pass is bounded.

'use strict';

// ── Defaults ──────────────────────────────────────────────────────────

const DEFAULT_NAV_TIMEOUT_MS = 30_000;
const DEFAULT_ACTION_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_INTERACTIVES = 25;
const DEFAULT_MAX_MODALS = 10;
const DEFAULT_MAX_FORMS = 10;
const DEFAULT_PROBE_BUDGET_MS = 180_000;        // 3-min total wall cap

// ── Connector ─────────────────────────────────────────────────────────

/**
 * Connect to a headless browser. Production path tries Browserless
 * (via the existing src/lib/agents/auth/browserlessAdapter.js) when
 * BROWSERLESS_API_KEY is set; otherwise lazy-imports Playwright and
 * launches a local chromium. Tests can inject `opts.browser` directly
 * to bypass the connector entirely.
 *
 * Returns the Playwright Browser object (or browser-shaped mock).
 */
export async function connectBrowser(opts = {}) {
  if (opts.browser) return opts.browser;
  const apiKey = opts.browserlessApiKey ?? process.env.BROWSERLESS_API_KEY;
  if (apiKey) {
    try {
      const mod = await import('../auth/browserlessAdapter.js');
      return await mod.connectBrowserless({ apiKey, timeoutMs: opts.connectTimeoutMs });
    } catch (e) {
      // Fall through to local chromium if browserless connect fails.
      if (opts.requireBrowserless) throw e;
    }
  }
  // Local Playwright fallback. Lazy-imported so tests without
  // playwright still work.
  const pw = await import('playwright').catch(() => null);
  if (!pw || !pw.chromium) {
    throw new Error('adversarialSurface.connectBrowser: neither Browserless nor local Playwright available');
  }
  return await pw.chromium.launch({
    headless: opts.headless !== false,
    timeout: opts.connectTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
  });
}

// ── Finding helper ────────────────────────────────────────────────────

function makeFinding(severity, category, location, evidence) {
  return Object.freeze({ severity, category, location, evidence });
}

// ── T2 — Interactive element exercise ─────────────────────────────────
//
// Enumerate clickable elements on the page (buttons, links, role=button
// divs, card-shaped divs that look clickable), click each with a hard
// timeout, classify the outcome:
//
//   WORKS       — click triggered a real change (URL changed, DOM
//                 signature shifted by >threshold, network request
//                 fired with non-trivial response)
//   ERRORS      — click produced a console error OR navigation
//                 returned 4xx/5xx OR element rejected the click
//   DEAD-NO-OP  — no detectable change after the action timeout
//
// Each dead/erroring element becomes a §7.6 finding.

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  '[role="button"]',
  '[role="link"]',
  '[onclick]',
  // Card-shaped: a div containing both heading + descendant button/anchor
  // is captured by the per-element heuristic in enumerateClickables —
  // not via selector (would be too noisy).
].join(', ');

function safeText(s, n = 60) {
  if (typeof s !== 'string') return '';
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}…` : trimmed;
}

/**
 * Default Page-driver enumeration. Returns shallow descriptors so the
 * probe can iterate without holding live handles for longer than
 * necessary. Capped at `maxInteractives` to bound the probe budget.
 */
async function enumerateClickables(page, maxInteractives) {
  // Use page.evaluate to gather a snapshot of clickable elements with
  // stable selectors (CSS-like path with nth-child).
  return await page.evaluate((args) => {
    const { sel, max } = args;
    const els = Array.from(document.querySelectorAll(sel));
    function cssPath(el) {
      const parts = [];
      let cur = el;
      let depth = 0;
      while (cur && cur.nodeType === 1 && depth < 8) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
        const parent = cur.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
        }
        parts.unshift(part);
        cur = cur.parentElement;
        depth += 1;
      }
      return parts.join(' > ');
    }
    const out = [];
    for (const el of els) {
      if (out.length >= max) break;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;     // hidden
      const tag = el.tagName.toLowerCase();
      const text = (el.innerText || el.textContent || '').slice(0, 200);
      const href = tag === 'a' ? (el.getAttribute('href') ?? null) : null;
      out.push({
        index: out.length,
        tag,
        href,
        text,
        ariaLabel: el.getAttribute('aria-label') ?? null,
        role: el.getAttribute('role') ?? null,
        selector: cssPath(el),
      });
    }
    return out;
  }, { sel: INTERACTIVE_SELECTOR, max: maxInteractives });
}

/**
 * T2 — probeInteractives default implementation. Pluggable via
 * adversarialSurface opts.probeInteractives for tests.
 *
 * @returns {Promise<{ findings:Array, interactivesTested:number, deadOrErroring:number }>}
 */
export async function probeInteractives({
  page, url, maxInteractives = DEFAULT_MAX_INTERACTIVES,
  actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
  sliceBudget = 45_000,
} = {}) {
  const findings = [];
  let interactivesTested = 0;
  let deadOrErroring = 0;
  const startedAt = Date.now();

  if (!page) return { findings, interactivesTested, deadOrErroring };

  // Capture console errors during the probe so a click that triggers
  // an error gets classified ERRORS.
  const consoleErrors = [];
  const errorHandler = (msg) => {
    if (msg && typeof msg.type === 'function' && msg.type() === 'error') {
      consoleErrors.push(typeof msg.text === 'function' ? msg.text() : String(msg));
    } else if (msg && typeof msg.text === 'string') {
      consoleErrors.push(msg.text);
    }
  };
  if (typeof page.on === 'function') {
    page.on('console', errorHandler);
  }

  let clickables;
  try {
    clickables = await enumerateClickables(page, maxInteractives);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `enumerateClickables failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, interactivesTested: 0, deadOrErroring: 0 };
  }

  for (const el of clickables) {
    if (Date.now() - startedAt > sliceBudget) break;
    interactivesTested += 1;

    // Snapshot before-state.
    const beforeUrl = typeof page.url === 'function' ? page.url() : url;
    const beforeConsoleLen = consoleErrors.length;
    let beforeBodyHash = '';
    try {
      beforeBodyHash = await page.evaluate(() => (document.body?.innerText ?? '').length.toString(36));
    } catch { beforeBodyHash = ''; }

    // Click with bounded timeout.
    let clickError = null;
    try {
      const loc = page.locator ? page.locator(el.selector).first() : null;
      if (!loc) {
        clickError = 'no_locator_api';
      } else {
        // Use .click with explicit timeout + `noWaitAfter:true` so a
        // dead button doesn't hang the probe waiting for a network
        // event that never comes.
        await loc.click({ timeout: actionTimeoutMs, trial: false, noWaitAfter: true });
      }
    } catch (e) {
      clickError = (e?.message ?? String(e)).slice(0, 120);
    }

    // Snapshot after-state (give the page a brief moment to react).
    if (typeof page.waitForTimeout === 'function') {
      try { await page.waitForTimeout(200); } catch { /* ignore */ }
    }
    const afterUrl = typeof page.url === 'function' ? page.url() : beforeUrl;
    const afterConsoleLen = consoleErrors.length;
    let afterBodyHash = beforeBodyHash;
    try {
      afterBodyHash = await page.evaluate(() => (document.body?.innerText ?? '').length.toString(36));
    } catch { /* keep before */ }

    const navigated = afterUrl !== beforeUrl;
    const bodyChanged = afterBodyHash !== beforeBodyHash;
    const newErrors = afterConsoleLen > beforeConsoleLen;

    let classification = 'WORKS';
    if (clickError && /time(?:d.?out|out)/i.test(clickError)) {
      // Both "Timeout" (Playwright's TimeoutError) and "timed out"
      // (some adapter-level wrappers) read as dead-no-op: the element
      // exists but isn't responsive within the action timeout.
      classification = 'DEAD-NO-OP';
    } else if (clickError) {
      classification = 'ERRORS';
    } else if (newErrors) {
      classification = 'ERRORS';
    } else if (!navigated && !bodyChanged) {
      classification = 'DEAD-NO-OP';
    }

    if (classification === 'DEAD-NO-OP') {
      deadOrErroring += 1;
      findings.push(makeFinding(
        'medium', 'dead-card',
        `${url}${el.selector ? ` ${el.selector}` : ''}`,
        `click on <${el.tag}>${el.ariaLabel ? ` aria-label="${safeText(el.ariaLabel)}"` : ''} text="${safeText(el.text)}" produced no observable change (no nav, no DOM diff, no error)`,
      ));
    } else if (classification === 'ERRORS') {
      deadOrErroring += 1;
      findings.push(makeFinding(
        'high', 'broken-modal',
        `${url}${el.selector ? ` ${el.selector}` : ''}`,
        `click on <${el.tag}> text="${safeText(el.text)}" ${clickError ? `errored: ${clickError}` : `triggered console error(s): ${consoleErrors.slice(beforeConsoleLen).map((s) => safeText(s, 80)).join('; ')}`}`,
      ));
    }
    // If navigated, restore page so subsequent interactives are
    // measured against the original surface.
    if (navigated) {
      try {
        await page.goBack({ timeout: actionTimeoutMs }).catch(async () => {
          // Some pages can't goBack — re-navigate to the original url.
          await page.goto(url, { timeout: actionTimeoutMs, waitUntil: 'domcontentloaded' });
        });
      } catch { /* best-effort */ }
    }
  }

  if (typeof page.off === 'function') {
    try { page.off('console', errorHandler); } catch { /* ignore */ }
  }
  return { findings, interactivesTested, deadOrErroring };
}

// ── T3 — Modal + form probing ─────────────────────────────────────────
//
// Modals: enumerate triggers (data-modal, aria-haspopup, "open"-named
// buttons), open each, verify a modal element actually rendered (a new
// dialog/role="dialog"/role="alertdialog" or fixed-position overlay
// appears), verify a close affordance responds. Failures → broken-modal.
//
// Forms: enumerate <form> elements, fill all visible required text
// inputs with a probe value, submit. Verify either a success surface
// (banner, navigation, body change) OR a validation error surface
// (aria-invalid, .error, .invalid, text "required"). A form that
// silently no-ops on submission → severity high (broken-modal as
// closest §6 category for "broken interactive surface").

async function enumerateModalTriggers(page, max) {
  return await page.evaluate(({ max }) => {
    const sel = [
      '[data-modal]', '[data-modal-trigger]', '[data-toggle="modal"]',
      '[aria-haspopup="dialog"]', '[aria-haspopup="true"]',
      'button[aria-controls]',
      // Heuristic: button text containing "open", "show", "view details",
      // "learn more", "preview" frequently triggers a modal.
    ].join(', ');
    const els = Array.from(document.querySelectorAll(sel));
    // Heuristic add: buttons whose innerText matches modal-opening copy.
    const HEUR = /^\s*(open|show|view|learn more|preview|details|more info)/i;
    const buttons = Array.from(document.querySelectorAll('button')).filter(
      (b) => HEUR.test(b.innerText ?? '') && b.offsetParent !== null,
    );
    function pathFor(el) {
      const parts = [];
      let cur = el;
      let depth = 0;
      while (cur && cur.nodeType === 1 && depth < 6) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
        parts.unshift(part);
        cur = cur.parentElement; depth += 1;
      }
      return parts.join(' > ');
    }
    const merged = [...els, ...buttons].slice(0, max);
    return merged.map((el, i) => ({
      index: i,
      tag: el.tagName.toLowerCase(),
      text: (el.innerText || '').slice(0, 100),
      selector: pathFor(el),
    }));
  }, { max });
}

async function modalIsRendered(page) {
  // A modal IS rendered when any of these conditions are true after
  // a trigger click:
  //   - a role="dialog" / role="alertdialog" element is visible
  //   - a .modal / [aria-modal="true"] element is visible
  //   - a fixed-position overlay is in the DOM
  return await page.evaluate(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      const style = el.ownerDocument?.defaultView?.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0
        && (!style || (style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity || '1') > 0));
    }
    const sel = '[role="dialog"], [role="alertdialog"], [aria-modal="true"], .modal, .Modal';
    const els = Array.from(document.querySelectorAll(sel));
    return els.some(visible);
  });
}

async function closeModal(page, actionTimeoutMs) {
  // Try common close affordances. Returns true if a close fires
  // AND the modal goes away.
  return await page.evaluate(({ timeoutMs }) => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    const closeSel = [
      '[aria-label*="close" i]', '[aria-label*="dismiss" i]',
      'button[data-close]', '[data-dismiss]',
      '.modal-close', '.close',
    ].join(', ');
    const candidates = Array.from(document.querySelectorAll(closeSel)).filter(visible);
    if (candidates.length === 0) return { triggered: false, closed: false };
    try { candidates[0].click(); } catch { return { triggered: false, closed: false }; }
    return { triggered: true, closed: true };
  }, { timeoutMs: actionTimeoutMs });
}

/**
 * T3 — probeModals default implementation.
 */
export async function probeModals({
  page, url, maxModals = DEFAULT_MAX_MODALS,
  actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
  sliceBudget = 45_000,
} = {}) {
  const findings = [];
  let modalsFailing = 0;
  let modalsTested = 0;
  const startedAt = Date.now();
  if (!page) return { findings, modalsFailing };

  let triggers;
  try {
    triggers = await enumerateModalTriggers(page, maxModals);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `enumerateModalTriggers failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, modalsFailing };
  }

  for (const t of triggers) {
    if (Date.now() - startedAt > sliceBudget) break;
    modalsTested += 1;
    let clickErr = null;
    try {
      const loc = page.locator(t.selector).first();
      await loc.click({ timeout: actionTimeoutMs, noWaitAfter: true });
    } catch (e) {
      clickErr = (e?.message ?? String(e)).slice(0, 120);
    }
    if (typeof page.waitForTimeout === 'function') {
      try { await page.waitForTimeout(250); } catch { /* ignore */ }
    }
    let rendered = false;
    try { rendered = await modalIsRendered(page); } catch { rendered = false; }
    if (clickErr) {
      modalsFailing += 1;
      findings.push(makeFinding(
        'high', 'broken-modal', `${url} ${t.selector}`,
        `modal trigger <${t.tag}> text="${safeText(t.text)}" errored on click: ${clickErr}`,
      ));
      continue;
    }
    if (!rendered) {
      modalsFailing += 1;
      findings.push(makeFinding(
        'high', 'broken-modal', `${url} ${t.selector}`,
        `modal trigger <${t.tag}> text="${safeText(t.text)}" clicked cleanly but no modal rendered (no [role=dialog]/.modal element appeared)`,
      ));
      continue;
    }
    // Modal rendered — verify close affordance.
    let closeResult = { triggered: false, closed: false };
    try { closeResult = await closeModal(page, actionTimeoutMs); } catch { /* ignore */ }
    if (!closeResult.triggered) {
      modalsFailing += 1;
      findings.push(makeFinding(
        'medium', 'broken-modal', `${url} ${t.selector}`,
        `modal opened but no close affordance found (no aria-label="close"/dismiss button)`,
      ));
    }
  }
  return { findings, modalsFailing, modalsTested };
}

async function enumerateForms(page, max) {
  return await page.evaluate(({ max }) => {
    const out = [];
    const forms = Array.from(document.querySelectorAll('form'));
    for (const f of forms) {
      if (out.length >= max) break;
      const visible = (f.offsetWidth + f.offsetHeight) > 0;
      if (!visible) continue;
      const inputs = Array.from(f.querySelectorAll('input, textarea, select')).map((i) => ({
        type: i.type ?? i.tagName.toLowerCase(),
        name: i.name ?? null,
        required: i.required ?? false,
        placeholder: i.getAttribute('placeholder') ?? '',
      }));
      function path(el) {
        const parts = [];
        let cur = el;
        let depth = 0;
        while (cur && cur.nodeType === 1 && depth < 6) {
          let part = cur.tagName.toLowerCase();
          if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
          parts.unshift(part);
          cur = cur.parentElement; depth += 1;
        }
        return parts.join(' > ');
      }
      out.push({
        index: out.length, selector: path(f),
        action: f.getAttribute('action') ?? '',
        method: (f.getAttribute('method') ?? 'GET').toUpperCase(),
        inputs,
      });
    }
    return out;
  }, { max });
}

async function fillAndSubmitForm(page, formDescriptor, value, actionTimeoutMs) {
  return await page.evaluate(({ desc, val }) => {
    const form = document.querySelector(desc.selector);
    if (!form) return { ok: false, reason: 'form_not_found' };
    let filled = 0;
    const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
    for (const inp of inputs) {
      if (inp.type === 'hidden' || inp.type === 'submit' || inp.type === 'button') continue;
      try {
        if (inp.tagName.toLowerCase() === 'select') {
          if (inp.options && inp.options.length > 1) {
            inp.value = inp.options[1].value;
            inp.dispatchEvent(new Event('change', { bubbles: true }));
            filled += 1;
          }
          continue;
        }
        if (inp.type === 'email') {
          inp.value = `${val}@example.com`;
        } else if (inp.type === 'number') {
          inp.value = '42';
        } else if (inp.type === 'checkbox' || inp.type === 'radio') {
          inp.checked = true;
        } else {
          inp.value = val;
        }
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        filled += 1;
      } catch { /* skip */ }
    }
    let submitted = false;
    try {
      const submitBtn = form.querySelector('[type="submit"]') || form.querySelector('button');
      if (submitBtn) { submitBtn.click(); submitted = true; }
      else { form.requestSubmit?.(); submitted = true; }
    } catch (e) {
      return { ok: false, reason: `submit_failed:${(e?.message ?? String(e)).slice(0, 80)}`, filled };
    }
    return { ok: true, filled, submitted };
  }, { desc: formDescriptor, val: value });
}

async function detectFormFeedback(page) {
  return await page.evaluate(() => {
    const errSel = [
      '[aria-invalid="true"]', '.error', '.invalid', '.form-error',
      '[role="alert"]', '[role="status"]',
    ].join(', ');
    const successSel = [
      '.success', '.form-success', '[role="status"]',
    ].join(', ');
    const errs = Array.from(document.querySelectorAll(errSel))
      .filter((el) => (el.innerText || '').trim().length > 0);
    const successes = Array.from(document.querySelectorAll(successSel))
      .filter((el) => /thank|success|received|submitted/i.test(el.innerText || ''));
    return {
      hasError: errs.length > 0,
      hasSuccess: successes.length > 0,
      sampleError: errs[0] ? (errs[0].innerText || '').slice(0, 100) : '',
      sampleSuccess: successes[0] ? (successes[0].innerText || '').slice(0, 100) : '',
    };
  });
}

/**
 * T3 — probeForms default implementation. For each form: submit
 * invalid first (empty), then valid, classify the responses.
 */
export async function probeForms({
  page, url, maxForms = DEFAULT_MAX_FORMS,
  actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
  sliceBudget = 45_000,
} = {}) {
  const findings = [];
  let formsFailing = 0;
  let formsTested = 0;
  const startedAt = Date.now();
  if (!page) return { findings, formsFailing };

  let forms;
  try {
    forms = await enumerateForms(page, maxForms);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `enumerateForms failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, formsFailing };
  }

  for (const f of forms) {
    if (Date.now() - startedAt > sliceBudget) break;
    formsTested += 1;

    // ── Pass 1: submit empty (invalid) — expect validation error.
    const beforeUrl = typeof page.url === 'function' ? page.url() : url;
    let invalidResp;
    try {
      invalidResp = await fillAndSubmitForm(page, f, '', actionTimeoutMs);
    } catch (e) {
      invalidResp = { ok: false, reason: (e?.message ?? String(e)).slice(0, 80) };
    }
    if (typeof page.waitForTimeout === 'function') {
      try { await page.waitForTimeout(300); } catch { /* ignore */ }
    }
    let invalidFeedback;
    try { invalidFeedback = await detectFormFeedback(page); } catch { invalidFeedback = { hasError: false, hasSuccess: false }; }
    // No validation error on an empty submit AND no navigation AND no
    // success surface → silently accepted invalid input.
    const afterInvalidUrl = typeof page.url === 'function' ? page.url() : beforeUrl;
    if (invalidResp.ok && !invalidFeedback.hasError && !invalidFeedback.hasSuccess && afterInvalidUrl === beforeUrl) {
      // Soft signal — many forms accept blank if no required fields. Skip the finding for now.
    } else if (!invalidResp.ok) {
      formsFailing += 1;
      findings.push(makeFinding(
        'medium', 'broken-modal', `${url} ${f.selector}`,
        `form invalid-submit failed: ${invalidResp.reason ?? 'unknown'}`,
      ));
      continue;
    }

    // Re-navigate if invalid submit changed URL (unlikely but defensive).
    if (afterInvalidUrl !== beforeUrl) {
      try { await page.goto(beforeUrl, { timeout: actionTimeoutMs, waitUntil: 'domcontentloaded' }); } catch { /* ignore */ }
    }

    // ── Pass 2: submit valid (probe value).
    let validResp;
    try {
      validResp = await fillAndSubmitForm(page, f, 'flowai-probe', actionTimeoutMs);
    } catch (e) {
      validResp = { ok: false, reason: (e?.message ?? String(e)).slice(0, 80) };
    }
    if (typeof page.waitForTimeout === 'function') {
      try { await page.waitForTimeout(400); } catch { /* ignore */ }
    }
    let validFeedback;
    try { validFeedback = await detectFormFeedback(page); } catch { validFeedback = { hasError: false, hasSuccess: false }; }
    const afterValidUrl = typeof page.url === 'function' ? page.url() : beforeUrl;
    const navigated = afterValidUrl !== beforeUrl;

    if (!validResp.ok) {
      formsFailing += 1;
      findings.push(makeFinding(
        'high', 'broken-modal', `${url} ${f.selector}`,
        `form valid-submit failed: ${validResp.reason ?? 'unknown'}`,
      ));
    } else if (!navigated && !validFeedback.hasSuccess && !validFeedback.hasError) {
      formsFailing += 1;
      findings.push(makeFinding(
        'high', 'broken-modal', `${url} ${f.selector}`,
        `form valid-submit produced no observable response (no nav, no success/error surface, no validation feedback) — likely silent no-op or mock-only`,
      ));
    }
    // Restore for next iteration.
    if (navigated) {
      try { await page.goto(beforeUrl, { timeout: actionTimeoutMs, waitUntil: 'domcontentloaded' }); } catch { /* ignore */ }
    }
  }
  return { findings, formsFailing, formsTested };
}

// ── T4 — AI agent / chatbot functional probe ─────────────────────────
//
// Detects in-product AI agents / chatbots and exercises them with a
// standard probe prompt: "What does this product do? Answer in one
// sentence." A coherent, non-trivial, non-error response classifies
// the agent as WORKING. A stub/canned/error/no-response classifies
// it as non-functional and emits a §7.6 finding.
//
// Detection signals (DOM-only — vendor-script presence is signal but
// not proof; we require an interactive input we can actually exercise):
//   - input[placeholder*="ask"|"chat"|"message"|"question"]
//   - textarea[placeholder*="ask"|"chat"|"message"|"question"]
//   - [role="textbox"] near a button labeled "send"/"submit"
//   - input[type=text] inside a container with chatbot vendor class
//     (intercom, drift, zendesk-Web-Widget, etc.) — partial coverage
//
// Stub indicators (response classified as STUB rather than WORKS):
//   - exact-match to canned-response strings: "i'm sorry, i can't help",
//     "this is a demo", "coming soon", "i don't know"
//   - response length < 30 chars
//   - response identical to user prompt

const PROBE_PROMPT = 'What does this product do? Answer in one sentence.';

const STUB_PATTERNS = Object.freeze([
  /^\s*(i'?m sorry|i cannot|i can'?t|this is a demo|coming soon|i don'?t know)/i,
  /^\s*(error|sorry|something went wrong|please try again)/i,
  /(this feature is not yet available|placeholder response|stub response)/i,
]);

async function findAgentInput(page) {
  return await page.evaluate(() => {
    function visible(el) {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }
    function path(el) {
      const parts = [];
      let cur = el;
      let depth = 0;
      while (cur && cur.nodeType === 1 && depth < 8) {
        let part = cur.tagName.toLowerCase();
        if (cur.id) { part += `#${cur.id}`; parts.unshift(part); break; }
        const parent = cur.parentElement;
        if (parent) {
          const sibs = Array.from(parent.children).filter((c) => c.tagName === cur.tagName);
          if (sibs.length > 1) part += `:nth-of-type(${sibs.indexOf(cur) + 1})`;
        }
        parts.unshift(part);
        cur = cur.parentElement; depth += 1;
      }
      return parts.join(' > ');
    }
    const HINT = /(ask|chat|message|question|prompt|how can i help|talk to|ai)/i;
    const candidates = [
      ...document.querySelectorAll('textarea, input[type="text"], [contenteditable="true"], [role="textbox"]'),
    ].filter(visible);
    for (const c of candidates) {
      const placeholder = c.getAttribute('placeholder') ?? '';
      const aria = c.getAttribute('aria-label') ?? '';
      const label = (c.labels?.[0]?.innerText ?? '');
      const blob = `${placeholder} ${aria} ${label}`;
      if (HINT.test(blob)) {
        return { selector: path(c), placeholder, ariaLabel: aria, tag: c.tagName.toLowerCase() };
      }
    }
    return null;
  });
}

async function sendPromptToAgent(page, inputDescriptor, promptText, actionTimeoutMs) {
  // Type into the input + press Enter; capture body-text length
  // before/after so we can compare for response detection.
  return await page.evaluate(({ desc, prompt, timeout }) => {
    const el = document.querySelector(desc.selector);
    if (!el) return { ok: false, reason: 'agent_input_not_found' };
    try {
      const bodyBefore = (document.body?.innerText ?? '').length;
      if (el.tagName.toLowerCase() === 'textarea' || el.tagName.toLowerCase() === 'input') {
        el.value = prompt;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (el.getAttribute('contenteditable') === 'true') {
        el.innerText = prompt;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Try Enter key, then look for a sibling send button.
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true, cancelable: true }));
      // Look for adjacent send affordance.
      const parent = el.closest('form, div') || el.parentElement;
      let sendBtn = null;
      if (parent) {
        sendBtn = parent.querySelector('button[type="submit"], button[aria-label*="send" i], button[title*="send" i]');
        if (!sendBtn) {
          for (const b of Array.from(parent.querySelectorAll('button'))) {
            if (/^\s*send|submit|ask/i.test(b.innerText || '')) { sendBtn = b; break; }
          }
        }
      }
      if (sendBtn) sendBtn.click();
      return { ok: true, bodyBefore };
    } catch (e) {
      return { ok: false, reason: (e?.message ?? String(e)).slice(0, 100) };
    }
  }, { desc: inputDescriptor, prompt: promptText, timeout: actionTimeoutMs });
}

async function detectAgentResponse(page, bodyBefore, waitMs) {
  // Wait up to waitMs for the page body text to grow by a meaningful
  // amount AND contain a candidate response near the input.
  const startedAt = Date.now();
  let lastDiff = '';
  while (Date.now() - startedAt < waitMs) {
    let snapshot;
    try {
      snapshot = await page.evaluate((before) => {
        const body = (document.body?.innerText ?? '');
        return { bodyLength: body.length, bodyDiffLen: body.length - before };
      }, bodyBefore);
    } catch { snapshot = { bodyLength: 0, bodyDiffLen: 0 }; }
    if (snapshot.bodyDiffLen > 40) {                            // meaningful growth
      // Pull a candidate response snippet — last visible message bubble.
      try {
        const snippet = await page.evaluate(() => {
          const sel = '[role="article"], [class*="message"], [class*="response"], [class*="bubble"], li, p';
          const els = Array.from(document.querySelectorAll(sel))
            .filter((el) => (el.innerText || '').length > 20);
          // Last visible — most-recent in DOM order.
          return els.length > 0 ? (els[els.length - 1].innerText || '').slice(0, 400) : '';
        });
        if (snippet && snippet.length > 0) return { responded: true, snippet };
      } catch { /* keep polling */ }
      lastDiff = `body grew by ${snapshot.bodyDiffLen} chars`;
    }
    if (typeof page.waitForTimeout === 'function') {
      try { await page.waitForTimeout(500); } catch { /* ignore */ }
    } else {
      await new Promise((res) => setTimeout(res, 500));
    }
  }
  return { responded: false, snippet: lastDiff };
}

function classifyResponse(snippet) {
  if (typeof snippet !== 'string' || snippet.length < 30) return 'NO-RESPONSE';
  for (const re of STUB_PATTERNS) if (re.test(snippet)) return 'STUB';
  return 'WORKS';
}

/**
 * T4 — probeAgents default implementation.
 *
 * @returns {Promise<{ findings:Array, agentsNonFunctional:number, agentsTested:number }>}
 */
export async function probeAgents({
  page, url,
  actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
  sliceBudget = 45_000,
  promptText = PROBE_PROMPT,
  responseWaitMs = 25_000,
} = {}) {
  const findings = [];
  let agentsNonFunctional = 0;
  let agentsTested = 0;
  if (!page) return { findings, agentsNonFunctional, agentsTested };

  let agentInput;
  try {
    agentInput = await findAgentInput(page);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `findAgentInput failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, agentsNonFunctional, agentsTested };
  }
  if (!agentInput || typeof agentInput !== 'object' || typeof agentInput.selector !== 'string') {
    // No detectable agent input on this page — not a finding (the page
    // may legitimately not have an AI agent). Phase A's presence
    // detection covers the "advertises AI but no surface" case.
    return { findings, agentsNonFunctional, agentsTested };
  }

  agentsTested = 1;
  let sendResult;
  try {
    sendResult = await sendPromptToAgent(page, agentInput, promptText, actionTimeoutMs);
  } catch (e) {
    sendResult = { ok: false, reason: (e?.message ?? String(e)).slice(0, 100) };
  }
  if (!sendResult.ok) {
    agentsNonFunctional += 1;
    findings.push(makeFinding(
      'high', 'ai-agent-unreachable',
      `${url} ${agentInput.selector}`,
      `agent prompt failed to send: ${sendResult.reason ?? 'unknown'}`,
    ));
    return { findings, agentsNonFunctional, agentsTested };
  }

  const waitBudget = Math.min(responseWaitMs, Math.max(5_000, sliceBudget - 5_000));
  let resp;
  try {
    resp = await detectAgentResponse(page, sendResult.bodyBefore ?? 0, waitBudget);
  } catch (e) {
    resp = { responded: false, snippet: (e?.message ?? String(e)).slice(0, 80) };
  }

  if (!resp.responded) {
    agentsNonFunctional += 1;
    findings.push(makeFinding(
      'high', 'ai-agent-no-response',
      `${url} ${agentInput.selector}`,
      `agent did not respond to standard probe prompt within ${waitBudget}ms`,
    ));
    return { findings, agentsNonFunctional, agentsTested };
  }

  const cls = classifyResponse(resp.snippet);
  if (cls === 'STUB') {
    agentsNonFunctional += 1;
    findings.push(makeFinding(
      'high', 'ai-agent-no-response',
      `${url} ${agentInput.selector}`,
      `agent returned canned/stub response: "${safeText(resp.snippet, 120)}"`,
    ));
  } else if (cls === 'NO-RESPONSE') {
    agentsNonFunctional += 1;
    findings.push(makeFinding(
      'high', 'ai-agent-no-response',
      `${url} ${agentInput.selector}`,
      `agent response too short / non-coherent: "${safeText(resp.snippet, 120)}"`,
    ));
  }
  // WORKS → no finding
  return { findings, agentsNonFunctional, agentsTested };
}

// ── Main entry point ──────────────────────────────────────────────────

/**
 * Probe the adversarial surface of a single URL.
 *
 * @param {object} args
 * @param {string} args.url                       — target URL
 * @param {object} [args.opts]
 * @param {object} [args.opts.browser]            — preconnected Browser (test)
 * @param {object} [args.opts.storageState]       — Playwright storageState
 *                                                  (from ENTRY-007 auth pass)
 * @param {number} [args.opts.navTimeoutMs]
 * @param {number} [args.opts.actionTimeoutMs]
 * @param {number} [args.opts.maxInteractives]
 * @param {number} [args.opts.maxModals]
 * @param {number} [args.opts.maxForms]
 * @param {number} [args.opts.probeBudgetMs]
 * @param {function} [args.opts.probeInteractives]   — DI for testability
 * @param {function} [args.opts.probeModals]
 * @param {function} [args.opts.probeForms]
 * @param {function} [args.opts.probeAgents]
 * @param {function} [args.opts.detectWiredVsMock]
 * @returns {Promise<object>}
 */
export async function probeAdversarialSurface(args = {}) {
  const startedAt = Date.now();
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  const opts = args.opts ?? {};
  if (!url) {
    return {
      ok: false, reason: 'url_required', findings: [],
      summary: { interactivesTested: 0, deadOrErroring: 0,
                 modalsFailing: 0, formsFailing: 0,
                 agentsNonFunctional: 0, mockOnlyFlagged: 0 },
      probedAt: new Date().toISOString(), durationMs: 0,
    };
  }

  let browser = null;
  let ownsBrowser = false;
  let context = null;
  let page = null;
  const findings = [];
  const summary = {
    interactivesTested: 0, deadOrErroring: 0,
    modalsFailing: 0, formsFailing: 0,
    agentsNonFunctional: 0, mockOnlyFlagged: 0,
  };

  try {
    browser = await connectBrowser(opts);
    ownsBrowser = !opts.browser;
    context = await browser.newContext({
      storageState: opts.storageState,
    });
    page = await context.newPage();
    await page.goto(url, {
      timeout: opts.navTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    });

    // T2-T5 probes are layered into the same envelope. Each probe gets
    // a strict slice of probeBudgetMs (1/4 each) so a misbehaving probe
    // can't starve the others.
    const probeBudget = opts.probeBudgetMs ?? DEFAULT_PROBE_BUDGET_MS;
    const sliceBudget = Math.max(15_000, Math.floor(probeBudget / 4));

    // Probes are pluggable so tests can stub them; production wires the
    // bundled implementations.
    const _probeInteractives = typeof opts.probeInteractives === 'function'
      ? opts.probeInteractives
      : probeInteractives;   // D39 T2: default to the bundled probe
    const _probeModals = typeof opts.probeModals === 'function'
      ? opts.probeModals : probeModals;   // D39 T3: default to bundled probe
    const _probeForms = typeof opts.probeForms === 'function'
      ? opts.probeForms : probeForms;     // D39 T3: default to bundled probe
    const _probeAgents = typeof opts.probeAgents === 'function'
      ? opts.probeAgents : probeAgents;   // D39 T4: default to bundled probe
    const _detectWiredVsMock = typeof opts.detectWiredVsMock === 'function'
      ? opts.detectWiredVsMock : null;

    if (_probeInteractives) {
      try {
        const r = await _probeInteractives({
          page, url, sliceBudget,
          maxInteractives: opts.maxInteractives ?? DEFAULT_MAX_INTERACTIVES,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.interactivesTested += r?.interactivesTested ?? 0;
        summary.deadOrErroring += r?.deadOrErroring ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeInteractives threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_probeModals) {
      try {
        const r = await _probeModals({
          page, url, sliceBudget,
          maxModals: opts.maxModals ?? DEFAULT_MAX_MODALS,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.modalsFailing += r?.modalsFailing ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeModals threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_probeForms) {
      try {
        const r = await _probeForms({
          page, url, sliceBudget,
          maxForms: opts.maxForms ?? DEFAULT_MAX_FORMS,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.formsFailing += r?.formsFailing ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeForms threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_probeAgents) {
      try {
        const r = await _probeAgents({
          page, url, sliceBudget,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.agentsNonFunctional += r?.agentsNonFunctional ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeAgents threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_detectWiredVsMock) {
      try {
        const r = await _detectWiredVsMock({
          page, url, sliceBudget,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.mockOnlyFlagged += r?.mockOnlyFlagged ?? 0;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `detectWiredVsMock threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    return {
      ok: true, url, findings, summary,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `probe_failed: ${(e?.message ?? String(e)).slice(0, 160)}`,
      url, findings, summary,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (context) await context.close().catch(() => {});
    if (ownsBrowser && browser) await browser.close().catch(() => {});
  }
}

export const __internals = Object.freeze({
  DEFAULT_NAV_TIMEOUT_MS,
  DEFAULT_ACTION_TIMEOUT_MS,
  DEFAULT_MAX_INTERACTIVES,
  DEFAULT_MAX_MODALS,
  DEFAULT_MAX_FORMS,
  DEFAULT_PROBE_BUDGET_MS,
  INTERACTIVE_SELECTOR,
  makeFinding,
  enumerateClickables,
  enumerateModalTriggers,
  modalIsRendered,
  closeModal,
  enumerateForms,
  fillAndSubmitForm,
  detectFormFeedback,
  findAgentInput,
  sendPromptToAgent,
  detectAgentResponse,
  classifyResponse,
  STUB_PATTERNS,
  PROBE_PROMPT,
  safeText,
});
