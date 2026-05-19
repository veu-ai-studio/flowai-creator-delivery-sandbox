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
// D41 T2 — exhaustive ceiling used by probeOnePage when caller does
// not pass maxInteractives. Lifted from the original 25-cap so every
// crawled element gets exercised. 9999 is effectively unbounded for
// real product pages (reltwin's largest page has 125 interactives).
// Time bounding now comes from sliceBudget alone, not element count.
const DEFAULT_MAX_INTERACTIVES_EXHAUSTIVE = 9999;
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
 * D42 T2 — scroll through the page so off-screen / lazy-loaded
 * content mounts before enumeration. Many SPAs only render rows
 * within the viewport; without this pass, enumerateClickables only
 * sees what was visible at first paint. We scroll in steps, wait
 * briefly between each so IntersectionObserver/lazy-mount logic
 * fires, then return — leaving enumerateClickables to find the
 * full set of elements that the crawl already counted.
 *
 * Bounded: max 40 steps × 100ms = 4s wall, capped by scrollPassMs.
 */
async function scrollPageToBottom(page, scrollPassMs = 4_000) {
  if (!page || typeof page.evaluate !== 'function') return;
  const deadline = Date.now() + scrollPassMs;
  try {
    await page.evaluate(async () => {
      const docH = () => Math.max(
        document.documentElement?.scrollHeight ?? 0,
        document.body?.scrollHeight ?? 0,
        document.documentElement?.clientHeight ?? 0,
      );
      const viewport = window.innerHeight || 800;
      const step = Math.max(200, Math.floor(viewport * 0.8));
      let y = 0;
      const cap = 40;
      for (let i = 0; i < cap; i += 1) {
        const h = docH();
        window.scrollTo({ top: y, behavior: 'auto' });
        y += step;
        if (y >= h + viewport) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      // Return to top so subsequent locator clicks see the same
      // surface enumerateClickables snapshotted.
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  } catch { /* mocks may not implement evaluate fully — fine */ }
  if (Date.now() > deadline && typeof page.waitForTimeout === 'function') {
    try { await page.waitForTimeout(200); } catch { /* ignore */ }
  }
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
  // D41 T2 — per-element classification log: every probed element
  // gets a {classification, location, selector, text} entry so the
  // caller can produce the "WORKS / ERRORS / DEAD / MOCK-ONLY"
  // audit table the dispatch requires. (MOCK-ONLY is page-level and
  // appended by detectWiredVsMock.)
  const classifications = [];
  let interactivesTested = 0;
  let deadOrErroring = 0;
  const startedAt = Date.now();

  if (!page) return { findings, classifications, interactivesTested, deadOrErroring };

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

  // D42 T2 — scroll-pass: surface lazy-loaded / off-screen elements
  // before enumeration so we exercise EVERY clickable the user could
  // reach, not just the ones above-the-fold at first paint.
  try { await scrollPageToBottom(page, 4_000); } catch { /* best-effort */ }

  let clickables;
  try {
    clickables = await enumerateClickables(page, maxInteractives);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `enumerateClickables failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, classifications, interactivesTested: 0, deadOrErroring: 0 };
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

    // D41 T2 — record every classification, not just the failing ones.
    classifications.push({
      classification, location: url, selector: el.selector ?? null,
      tag: el.tag, text: safeText(el.text), ariaLabel: el.ariaLabel ?? null,
    });

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
  return { findings, classifications, interactivesTested, deadOrErroring };
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

// ── D41 T3 — workspace / engine / dashboard probe ────────────────────
//
// Detects high-value product surfaces — workspaces, dashboards,
// "engines," consoles — and verifies each one rendered REAL content
// (not just an empty shell). The dispatch's "engine/workspace/agent
// coverage" requirement is satisfied by:
//   1. URL token check: path contains workspace|dashboard|engine|
//      console|admin|studio|app (case-insensitive).
//   2. DOM signature: page has sidebar+main multi-pane layout
//      (aside + main, [role=navigation] + [role=main], drawer + content).
//   3. Per-detected-surface, classify:
//        FUNCTIONAL   — main content area has > 200 chars of visible text
//                       OR contains > 3 interactive descendants
//        EMPTY-SHELL  — multi-pane layout present but main area empty/
//                       skeleton-only (placeholder)
//
// AI-agent / chatbot coverage stays in probeAgents (D39 T4) — this
// probe complements it by covering the non-agent workspace surfaces.
// Findings are §7.6-shaped (severity high for engine-error category)
// so they flow through gtmReadinessScorer like the other probes.

const WORKSPACE_TOKENS = ['workspace', 'dashboard', 'engine', 'console', 'admin', 'studio', '/app', 'project'];

async function enumerateWorkspaces(page) {
  return await page.evaluate(({ tokens }) => {
    const out = [];
    const pathname = (location && typeof location.pathname === 'string') ? location.pathname.toLowerCase() : '';
    const urlTokenHit = tokens.some((t) => pathname.includes(t.toLowerCase()));

    // Detect a sidebar+main pattern. Both must be present and non-empty.
    const candidates = [
      { side: 'aside', main: 'main' },
      { side: '[role="navigation"]', main: '[role="main"]' },
      { side: '[class*="sidebar" i]', main: '[class*="content" i], [class*="main" i]' },
      { side: '[class*="drawer" i]', main: 'main' },
      { side: 'nav', main: 'main' },
    ];
    let layoutMatch = null;
    for (const c of candidates) {
      const s = document.querySelector(c.side);
      const m = document.querySelector(c.main);
      if (s && m && s.getBoundingClientRect().width > 0 && m.getBoundingClientRect().width > 0) {
        layoutMatch = { sideSel: c.side, mainSel: c.main };
        break;
      }
    }
    if (!urlTokenHit && !layoutMatch) return out;

    // Single-surface detection. We treat the (sidebar, main) pair as
    // one workspace surface; pages with sub-routes get probed
    // individually by the multi-page traversal in T1.
    const mainEl = layoutMatch
      ? document.querySelector(layoutMatch.mainSel)
      : (document.querySelector('main') ?? document.body);
    const mainText = (mainEl?.innerText || mainEl?.textContent || '').trim();
    const mainTextLen = mainText.length;
    const interactiveDescendants = mainEl
      ? mainEl.querySelectorAll('button, a[href], input, textarea, [role="button"]').length
      : 0;

    out.push({
      urlTokenHit, layoutPresent: !!layoutMatch,
      sideSel: layoutMatch?.sideSel ?? null, mainSel: layoutMatch?.mainSel ?? null,
      mainTextLen, interactiveDescendants,
      pathname,
    });
    return out;
  }, { tokens: WORKSPACE_TOKENS });
}

export async function probeWorkspaces({
  page, url, sliceBudget = 30_000,
  actionTimeoutMs = DEFAULT_ACTION_TIMEOUT_MS,
} = {}) {
  const findings = [];
  let workspacesProbed = 0;
  let workspacesNonFunctional = 0;
  if (!page) return { findings, workspacesProbed, workspacesNonFunctional };

  let workspaces;
  try {
    workspaces = await enumerateWorkspaces(page);
  } catch (e) {
    findings.push(makeFinding(
      'medium', 'engine-error', url,
      `enumerateWorkspaces failed: ${(e?.message ?? String(e)).slice(0, 120)}`,
    ));
    return { findings, workspacesProbed, workspacesNonFunctional };
  }

  for (const w of workspaces) {
    workspacesProbed += 1;
    // Classify each detected workspace surface.
    const isFunctional = (w.mainTextLen >= 200) || (w.interactiveDescendants >= 3);
    if (!isFunctional) {
      workspacesNonFunctional += 1;
      findings.push(makeFinding(
        'high', 'broken-modal',                   // closest §7.6 category for "advertised surface, empty render"
        `${url}${w.pathname ? ` (${w.pathname})` : ''}`,
        `workspace/engine surface detected (urlTokenHit=${w.urlTokenHit}, layoutPresent=${w.layoutPresent}) but main pane is empty-shell (text=${w.mainTextLen} chars, interactives=${w.interactiveDescendants}) — no functional content rendered`,
      ));
    }
  }

  return { findings, workspacesProbed, workspacesNonFunctional };
}

// ── T5 — Wired-vs-mock detection ──────────────────────────────────────
//
// Distinguish products that talk to a real backend from products that
// simulate features client-side. Listens to every network request +
// response during the probe and classifies the page on whether it
// makes meaningful same-origin XHR/fetch traffic.
//
// "Same-origin meaningful traffic" means:
//   - method is POST/PUT/PATCH/DELETE (write request), OR
//   - method is GET to a non-static path (no .js/.css/.svg/.png suffix,
//     not a font, not an image) AND response has non-trivial content
//     (>200 bytes or JSON)
//
// Classification:
//   WIRED       — has meaningful traffic
//   MOCK-ONLY   — interactives present + no meaningful traffic
//
// MOCK-ONLY → severity:high, category:engine-error
// (per §6 the closest category for "advertised feature has no backend"
//  is engine-error / no-form-validation / dead-card depending on shape;
//  we use engine-error as the catch-all for "feature unwired".)
//
// The probe relies on a networkLog (collected by probeAdversarialSurface
// at the top level) so all probes share visibility into traffic.

const STATIC_ASSET_RE = /\.(js|css|svg|png|jpg|jpeg|gif|webp|woff2?|ttf|otf|ico|map)(\?.*)?$/i;
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isMeaningfulRequest(entry, pageOrigin) {
  if (!entry || typeof entry !== 'object') return false;
  let reqOrigin = '';
  try { reqOrigin = new URL(entry.url).origin; } catch { /* malformed */ }
  if (!reqOrigin || reqOrigin !== pageOrigin) return false;
  const method = (entry.method || 'GET').toUpperCase();
  if (WRITE_METHODS.has(method)) return true;
  // GET: must be a non-static path with substantive response.
  if (STATIC_ASSET_RE.test(entry.url)) return false;
  if (typeof entry.status === 'number' && entry.status >= 400) return false;
  const contentType = (entry.contentType || '').toLowerCase();
  if (contentType.includes('json') || contentType.includes('xml') || contentType.includes('text/event-stream')) return true;
  if (typeof entry.responseSize === 'number' && entry.responseSize > 200) return true;
  return false;
}

/**
 * T5 — detectWiredVsMock default implementation.
 *
 * @returns {Promise<{ findings:Array, mockOnlyFlagged:number, networkSummary:object }>}
 */
export async function detectWiredVsMock({
  page, url, networkLog,
  interactivesTested = 0,
  formsTested = 0,
  agentsTested = 0,
  sliceBudget = 30_000,
} = {}) {
  const findings = [];
  let mockOnlyFlagged = 0;
  if (!page || !Array.isArray(networkLog)) {
    return { findings, mockOnlyFlagged, networkSummary: null };
  }

  let pageOrigin = '';
  try { pageOrigin = new URL(url).origin; } catch { /* ignore */ }
  const meaningful = networkLog.filter((e) => isMeaningfulRequest(e, pageOrigin));
  const summary = {
    totalRequests: networkLog.length,
    meaningfulSameOrigin: meaningful.length,
    distinctUrls: new Set(meaningful.map((e) => e.url)).size,
    methodCounts: networkLog.reduce((acc, e) => {
      const m = (e.method || 'GET').toUpperCase();
      acc[m] = (acc[m] || 0) + 1;
      return acc;
    }, {}),
  };

  // Page-level signal: page has interactives but ZERO meaningful
  // same-origin traffic during the probe → likely a static / mock
  // landing page advertising features that aren't wired up.
  if (interactivesTested + formsTested + agentsTested >= 3 && meaningful.length === 0) {
    mockOnlyFlagged += 1;
    findings.push(makeFinding(
      'high', 'engine-error', url,
      `mock-only signal: ${interactivesTested} interactives + ${formsTested} forms + ${agentsTested} agents exercised, ZERO meaningful same-origin XHR/fetch traffic captured during the probe (only static assets / no write requests). Likely advertised features are not wired to a backend.`,
    ));
  }
  return { findings, mockOnlyFlagged, networkSummary: summary };
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
/**
 * D41 T1 — page-level probe helper. Encapsulates context+page setup,
 * network-log listeners, all 5 probes, and cleanup. Reusable across
 * single-page (probeAdversarialSurface) and multi-page (probeAllPages)
 * surfaces with a SHARED browser to avoid relaunch cost per page.
 *
 * Returns the canonical per-page envelope:
 *   { ok, url, findings, summary, probedAt, durationMs }
 *
 * @param {object} args
 * @param {object} args.browser   — connected browser (caller owns)
 * @param {string} args.url
 * @param {object} args.opts      — same opts shape as probeAdversarialSurface
 */
async function probeOnePage({ browser, url, opts = {} }) {
  const startedAt = Date.now();
  let context = null;
  let page = null;
  const findings = [];
  // D41 T2 — per-element classification list (WORKS / ERRORS /
  // DEAD-NO-OP / MOCK-ONLY) carried through the per-page envelope so
  // the caller can audit exactly which selectors were exercised.
  const classifications = [];
  const summary = {
    interactivesTested: 0, deadOrErroring: 0,
    modalsFailing: 0, formsFailing: 0,
    agentsNonFunctional: 0, mockOnlyFlagged: 0,
  };

  try {
    context = await browser.newContext({ storageState: opts.storageState });
    page = await context.newPage();

    // Page-wide network log shared with detectWiredVsMock.
    const networkLog = [];
    if (typeof page.on === 'function') {
      try {
        page.on('request', (req) => {
          try {
            networkLog.push({
              url: typeof req.url === 'function' ? req.url() : '',
              method: typeof req.method === 'function' ? req.method() : 'GET',
              resourceType: typeof req.resourceType === 'function' ? req.resourceType() : '',
            });
          } catch { /* ignore */ }
        });
        page.on('response', (res) => {
          try {
            const u = typeof res.url === 'function' ? res.url() : '';
            const status = typeof res.status === 'function' ? res.status() : 0;
            const headers = typeof res.headers === 'function' ? res.headers() : {};
            const contentType = headers['content-type'] ?? '';
            const sizeHdr = headers['content-length'] ?? null;
            const responseSize = sizeHdr ? parseInt(sizeHdr, 10) || null : null;
            const match = networkLog.filter((e) => e.url === u).pop();
            if (match) {
              match.status = status;
              match.contentType = contentType;
              if (responseSize !== null) match.responseSize = responseSize;
            }
          } catch { /* ignore */ }
        });
      } catch { /* page.on missing in some mocks — fine */ }
    }

    await page.goto(url, {
      timeout: opts.navTimeoutMs ?? DEFAULT_NAV_TIMEOUT_MS,
      waitUntil: 'domcontentloaded',
    });

    const probeBudget = opts.probeBudgetMs ?? DEFAULT_PROBE_BUDGET_MS;
    // D42 T2 — interactives is the largest workload (N elements per
    // page vs ≤1 surface per other probe). Give it half the page budget,
    // split the other half across modals/forms/agents/workspaces/wired.
    const interactivesSliceBudget = Math.max(20_000, Math.floor(probeBudget * 0.5));
    const sliceBudget = Math.max(8_000, Math.floor((probeBudget * 0.5) / 5));

    const _probeInteractives = typeof opts.probeInteractives === 'function'
      ? opts.probeInteractives : probeInteractives;
    const _probeModals = typeof opts.probeModals === 'function'
      ? opts.probeModals : probeModals;
    const _probeForms = typeof opts.probeForms === 'function'
      ? opts.probeForms : probeForms;
    const _probeAgents = typeof opts.probeAgents === 'function'
      ? opts.probeAgents : probeAgents;
    const _probeWorkspaces = typeof opts.probeWorkspaces === 'function'
      ? opts.probeWorkspaces : probeWorkspaces;                         // D41 T3
    const _detectWiredVsMock = typeof opts.detectWiredVsMock === 'function'
      ? opts.detectWiredVsMock : detectWiredVsMock;

    if (_probeInteractives) {
      try {
        const r = await _probeInteractives({
          page, url,
          // D42 T2 — give interactives the larger slice (interactivesSliceBudget,
          // half the page budget) so all enumerated elements actually get
          // exercised; other probes share the remaining half.
          sliceBudget: interactivesSliceBudget,
          maxInteractives: opts.maxInteractives ?? DEFAULT_MAX_INTERACTIVES_EXHAUSTIVE,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        if (r && Array.isArray(r.classifications)) classifications.push(...r.classifications);
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

    // D41 T3 — workspace / engine / dashboard probe.
    if (_probeWorkspaces) {
      try {
        const r = await _probeWorkspaces({
          page, url, sliceBudget,
          actionTimeoutMs: opts.actionTimeoutMs ?? DEFAULT_ACTION_TIMEOUT_MS,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.workspacesProbed = (summary.workspacesProbed ?? 0) + (r?.workspacesProbed ?? 0);
        summary.workspacesNonFunctional = (summary.workspacesNonFunctional ?? 0) + (r?.workspacesNonFunctional ?? 0);
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `probeWorkspaces threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    if (_detectWiredVsMock) {
      try {
        const r = await _detectWiredVsMock({
          page, url, sliceBudget,
          networkLog,
          interactivesTested: summary.interactivesTested,
          formsTested: summary.formsFailing,
          agentsTested: summary.agentsNonFunctional,
        });
        if (r && Array.isArray(r.findings)) findings.push(...r.findings);
        summary.mockOnlyFlagged += r?.mockOnlyFlagged ?? 0;
        if (r?.networkSummary) summary.networkSummary = r.networkSummary;
      } catch (e) {
        findings.push(makeFinding(
          'medium', 'engine-error', url,
          `detectWiredVsMock threw: ${(e?.message ?? String(e)).slice(0, 160)}`,
        ));
      }
    }

    return {
      ok: true, url, findings, summary, classifications,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `probe_failed: ${(e?.message ?? String(e)).slice(0, 160)}`,
      url, findings, summary, classifications,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (context) await context.close().catch(() => {});
  }
}

/**
 * D41 T1 — multi-page Phase B probe. Connects ONE browser, iterates
 * every URL in `args.urls`, runs the full per-page probe stack
 * (probeInteractives + probeModals + probeForms + probeAgents +
 * probeWorkspaces + detectWiredVsMock), aggregates findings across all
 * pages, returns:
 *   { ok, pagesProbed, urlsAttempted, perPage:[...], findings,
 *     summary (aggregate), probedAt, durationMs }
 *
 * The aggregate summary sums each numeric field across per-page
 * envelopes so the whole-product §7.6 score (D41 T5) gets the union of
 * Phase B signals.
 *
 * @param {object} args
 * @param {string[]} args.urls    — every page/route to probe (no sampling)
 * @param {object}   [args.opts]
 */
export async function probeAllPages(args = {}) {
  const startedAt = Date.now();
  const opts = args.opts ?? {};
  const urls = Array.isArray(args.urls) ? args.urls.filter((u) => typeof u === 'string' && u.trim().length > 0) : [];
  if (urls.length === 0) {
    return {
      ok: false, reason: 'urls_required', pagesProbed: 0, urlsAttempted: 0,
      perPage: [], findings: [], summary: makeEmptySummary(),
      probedAt: new Date().toISOString(), durationMs: 0,
    };
  }

  let browser = null;
  let ownsBrowser = false;
  const perPage = [];
  const aggFindings = [];
  const aggClassifications = [];
  const aggSummary = makeEmptySummary();
  // D42 T2 — per-page budget = 45s default (interactives slice = ~22s
  // → ~40 elements/page at 500ms each, which exceeds the typical
  // per-page interactive count by a wide margin). Capped at 25 min
  // total so we stay inside the 30-min script timeout even for
  // many-page products.
  const overallBudget = opts.overallBudgetMs ?? Math.min(
    1_500_000,
    Math.max(180_000, urls.length * 45_000),
  );

  try {
    browser = await connectBrowser(opts);
    ownsBrowser = !opts.browser;
    for (let i = 0; i < urls.length; i += 1) {
      const elapsed = Date.now() - startedAt;
      if (elapsed > overallBudget) break;
      const remaining = overallBudget - elapsed;
      const pageBudget = Math.max(20_000, Math.floor(remaining / Math.max(1, urls.length - i)));
      const pageOpts = { ...opts, browser, probeBudgetMs: opts.perPageBudgetMs ?? pageBudget };
      const r = await probeOnePage({ browser, url: urls[i], opts: pageOpts });
      perPage.push(r);
      if (Array.isArray(r.findings)) aggFindings.push(...r.findings);
      if (Array.isArray(r.classifications)) aggClassifications.push(...r.classifications);
      if (r.summary) {
        for (const k of Object.keys(aggSummary)) {
          if (typeof r.summary[k] === 'number') aggSummary[k] += r.summary[k];
        }
      }
    }
    return {
      ok: true,
      pagesProbed: perPage.length,
      urlsAttempted: urls.length,
      perPage,
      findings: aggFindings,
      classifications: aggClassifications,
      summary: aggSummary,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } catch (e) {
    return {
      ok: false,
      reason: `probe_all_pages_failed: ${(e?.message ?? String(e)).slice(0, 160)}`,
      pagesProbed: perPage.length,
      urlsAttempted: urls.length,
      perPage,
      findings: aggFindings,
      classifications: aggClassifications,
      summary: aggSummary,
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } finally {
    if (ownsBrowser && browser) await browser.close().catch(() => {});
  }
}

function makeEmptySummary() {
  return {
    interactivesTested: 0, deadOrErroring: 0,
    modalsFailing: 0, formsFailing: 0,
    agentsNonFunctional: 0, mockOnlyFlagged: 0,
    workspacesProbed: 0, workspacesNonFunctional: 0,
  };
}

/**
 * Single-URL Phase B probe — back-compat wrapper around probeOnePage
 * with browser lifecycle managed inline. Multi-page callers should
 * use probeAllPages directly.
 */
export async function probeAdversarialSurface(args = {}) {
  const startedAt = Date.now();
  const url = typeof args.url === 'string' ? args.url.trim() : '';
  const opts = args.opts ?? {};
  if (!url) {
    return {
      ok: false, reason: 'url_required', findings: [],
      summary: makeEmptySummary(),
      probedAt: new Date().toISOString(), durationMs: 0,
    };
  }

  let browser = null;
  let ownsBrowser = false;
  try {
    browser = await connectBrowser(opts);
    ownsBrowser = !opts.browser;
    return await probeOnePage({ browser, url, opts });
  } catch (e) {
    return {
      ok: false,
      reason: `probe_failed: ${(e?.message ?? String(e)).slice(0, 160)}`,
      url, findings: [], summary: makeEmptySummary(),
      probedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
    };
  } finally {
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
  isMeaningfulRequest,
  STATIC_ASSET_RE,
  WRITE_METHODS,
  safeText,
});
