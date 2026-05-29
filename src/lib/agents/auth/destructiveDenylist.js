/**
 * Non-destructive action gate — Invariant 5 (v3 spec).
 *
 * Hybrid: explicit `data-crawl-safe="true"` allowlist (highest priority)
 * + form-submit denylist (always-on guard) + 9-language i18n destructive
 * denylist (en/es/fr/pt/de/zh-CN/ja/ko/ar — the v3 floor; partial coverage
 * is non-conformant per spec §11 #6).
 *
 * Defense-in-depth, not perfection — Invariant 4 (same-origin) + Invariant 8
 * (one-shot credentials) are the backstops when a destructive button slips
 * past detection.
 *
 * Per docs/specs/AUTH_TRAVERSAL_SECURITY_SPEC.md v3 Invariant 5 line 137:
 *
 *   /\b(<en>|<es>|<fr>|<pt>|<de>|<zh-CN>|<ja>|<ko>|<ar>)\b/iu
 *
 * Pure functions: take a pre-extracted element snapshot (tag, attrs, text,
 * ancestor-form-method) and return a Boolean + reason. The caller (the
 * Executor) is responsible for invoking Playwright APIs to populate the
 * snapshot.
 */

'use strict';

// v3 spec line 137 verbatim, expanded with v4-withdrawn-back-to-v3 keeping
// 9-language floor (per the freeze: 9 stays, expansion process withdrawn).
//
// Spec-text divergence (discovered by CHUNK 5 tests): the v3 spec literal
// uses `\b(...)\b` outer boundaries, but JavaScript's `\b` is ASCII-word-
// character based even with the `u` flag — it does NOT match the boundary
// between non-word characters and CJK/Hangul/Arabic codepoints. With the
// spec-verbatim `\b` regex, Arabic / Japanese / Korean / Chinese terms
// failed to match (verified by CHUNK 5 test runs). The 9-language floor
// is a spec acceptance criterion (§11 #6 — "partial coverage is non-
// conformant"), so this implementation drops the outer `\b` boundaries
// to make all 9 families actually match. The spec's false-positives-
// acceptable stance (§5 Honest false-negative acknowledgment + §6a.4
// v2's "false-positives accepted" comment carried forward) covers the
// trade-off: terms like "delete" inside "deleted"/"deletion" now match,
// which is the safer failure mode (extra blocking, not under-blocking).
// Unicode `u` flag is retained so CJK ideographs match correctly.
export const DESTRUCTIVE_TERM_RE = new RegExp(
  '(' +
    // English
    'delete|remove|cancel|sign\\s*out|log\\s*out|terminate|destroy|wipe|reset|purge|deactivate|disable|unsubscribe' +
    '|' +
    // Spanish
    'eliminar|borrar|cancelar|cerrar\\s*sesi[óo]n|terminar|destruir|restablecer|desactivar' +
    '|' +
    // French
    'supprimer|effacer|annuler|d[ée]connecter|terminer|d[ée]truire|r[ée]initialiser|d[ée]sactiver' +
    '|' +
    // Portuguese
    'excluir|apagar|cancelar|sair|encerrar|terminar|destruir|redefinir|desativar' +
    '|' +
    // German
    'l[öo]schen|entfernen|abbrechen|abmelden|beenden|zerst[öo]ren|zur[üu]cksetzen|deaktivieren' +
    '|' +
    // Chinese (Simplified)
    '删除|移除|取消|退出|登出|终止|重置|禁用|注销' +
    '|' +
    // Japanese (v3 expansion — Panel Q6-v3)
    '削除|消去|キャンセル|サインアウト|ログアウト|終了|無効化|解除' +
    '|' +
    // Korean (v3 expansion — Panel Q6-v3)
    '삭제|제거|취소|로그아웃|사인아웃|종료|비활성화|해지' +
    '|' +
    // Arabic (v3 expansion — Panel Q6-v3)
    'حذف|إزالة|إلغاء|تسجيل\\s*الخروج|إنهاء|تعطيل|إلغاء\\s*الاشتراك' +
  ')',
  'iu',
);

// CSS class fragments that signal destructive intent regardless of text.
// Per v3 spec Invariant 5 hybrid gate item 3 sub-bullet.
const DESTRUCTIVE_CLASS_FRAGMENTS = Object.freeze([
  'btn-danger',
  'destructive',
  'delete-btn',
  'cancel-btn',
  'logout-btn',
  'signout-btn',
  'remove-btn',
  'terminate-btn',
]);

// HTTP methods on the ancestor form that trigger the always-on form-submit
// denylist guard (item 2 of the hybrid gate decision flow). Per spec line 131.
const DESTRUCTIVE_FORM_METHODS = Object.freeze(['post', 'put', 'patch', 'delete']);

/**
 * Apply the hybrid gate to a click candidate.
 *
 * Decision flow (per v3 spec Invariant 5):
 *   1. Explicit allowlist (highest priority): `data-crawl-safe="true"` → ALLOW
 *      regardless of any denylist match.
 *   2. Form-submit denylist (always-on guard): `type="submit"` on a <form> → BLOCK.
 *   3. Destructive denylist (i18n-aware): BLOCK if ANY of:
 *      - aria-label or text content matches DESTRUCTIVE_TERM_RE (9 languages)
 *      - data-action="destructive" or data-destructive="true"
 *      - class contains any DESTRUCTIVE_CLASS_FRAGMENTS entry
 *      - inside a <form method="post|put|patch|delete">
 *   4. Otherwise → ALLOW.
 *
 * @param {object} el
 * @param {string} [el.tagName]            — 'BUTTON' | 'A' | 'INPUT' | etc.
 * @param {string} [el.type]               — 'submit' | 'button' | etc.
 * @param {string} [el.textContent]
 * @param {string} [el.ariaLabel]
 * @param {string} [el.className]
 * @param {Record<string,string>} [el.dataset]         — data-* attributes (camelCase keys: dataCrawlSafe, dataAction, dataDestructive)
 * @param {object} [el.ancestorForm]
 * @param {string} [el.ancestorForm.method]            — 'post' | 'get' | etc. (lowercased)
 *
 * @returns {{ allow: boolean, reason: string, rule: string }}
 *   - allow: true iff the click should be permitted under the gate
 *   - reason: human-readable explanation
 *   - rule: rule key for audit logging (one of:
 *     'allowlist_data_crawl_safe', 'denylist_form_submit_type',
 *     'denylist_form_method', 'denylist_destructive_text',
 *     'denylist_destructive_class', 'denylist_destructive_dataset',
 *     'denylist_aria_label', 'allow_default')
 */
export function applyHybridGate(el) {
  if (!el || typeof el !== 'object') {
    return { allow: false, reason: 'element_missing_or_invalid', rule: 'denylist_default_deny_on_invalid' };
  }
  const dataset = el.dataset && typeof el.dataset === 'object' ? el.dataset : {};

  // 1. Explicit allowlist — highest priority. The product author has audited
  //    this button as safe for crawler interaction.
  if (String(dataset.crawlSafe ?? '').toLowerCase() === 'true') {
    return {
      allow: true,
      reason: 'element carries data-crawl-safe="true" — product-author allowlist',
      rule: 'allowlist_data_crawl_safe',
    };
  }

  // 2. Form-submit denylist — always-on guard. Submitting a form while
  //    authenticated is potentially mutating; block by default. The XSS
  //    opt-in (spec §6 line 104) is dev/staging only, never prd, never
  //    under authenticated session.
  if (String(el.type ?? '').toLowerCase() === 'submit') {
    return {
      allow: false,
      reason: 'type="submit" — form-submit denylist guard',
      rule: 'denylist_form_submit_type',
    };
  }

  // 3a. Ancestor form with destructive HTTP method.
  const formMethod = el.ancestorForm && typeof el.ancestorForm.method === 'string'
    ? el.ancestorForm.method.toLowerCase()
    : null;
  if (formMethod && DESTRUCTIVE_FORM_METHODS.includes(formMethod)) {
    return {
      allow: false,
      reason: `ancestor <form method="${formMethod}"> — destructive form-method denylist`,
      rule: 'denylist_form_method',
    };
  }

  // 3b. data-action="destructive" or data-destructive="true".
  const dataAction = String(dataset.action ?? '').toLowerCase();
  const dataDestructive = String(dataset.destructive ?? '').toLowerCase();
  if (dataAction === 'destructive' || dataDestructive === 'true') {
    return {
      allow: false,
      reason: `data-action="${dataAction}" / data-destructive="${dataDestructive}" — destructive dataset marker`,
      rule: 'denylist_destructive_dataset',
    };
  }

  // 3c. Class-name contains a destructive fragment.
  const className = typeof el.className === 'string' ? el.className.toLowerCase() : '';
  if (className) {
    for (const frag of DESTRUCTIVE_CLASS_FRAGMENTS) {
      if (className.includes(frag)) {
        return {
          allow: false,
          reason: `class contains "${frag}" — destructive class-name denylist`,
          rule: 'denylist_destructive_class',
        };
      }
    }
  }

  // 3d. aria-label matches the 9-language destructive regex.
  const ariaLabel = typeof el.ariaLabel === 'string' ? el.ariaLabel : '';
  if (ariaLabel && DESTRUCTIVE_TERM_RE.test(ariaLabel)) {
    return {
      allow: false,
      reason: 'aria-label matches 9-language destructive regex',
      rule: 'denylist_aria_label',
    };
  }

  // 3e. text content matches the 9-language destructive regex.
  const text = typeof el.textContent === 'string' ? el.textContent : '';
  if (text && DESTRUCTIVE_TERM_RE.test(text)) {
    return {
      allow: false,
      reason: 'text content matches 9-language destructive regex',
      rule: 'denylist_destructive_text',
    };
  }

  // 4. Default — allow. The §10 acknowledged-residual list documents the
  //    false-negative classes this gate does NOT catch (custom CSS, glyph
  //    buttons, JS-only handlers, languages outside the 9-family floor).
  return {
    allow: true,
    reason: 'element passed all denylist checks',
    rule: 'allow_default',
  };
}

/**
 * Named-family check for the 9-language test surface (per spec §11 #6).
 * Returns which family's terms match the input string, or null. Used by
 * the test harness to assert per-family coverage; not part of the gate
 * decision path.
 *
 * @param {string} text
 * @returns {'en' | 'es' | 'fr' | 'pt' | 'de' | 'zh-CN' | 'ja' | 'ko' | 'ar' | null}
 */
export function detectLanguageFamily(text) {
  if (typeof text !== 'string' || !text) return null;
  // Family-specific tests — each regex matches a subset known to be unique
  // enough to disambiguate. False-positives across families are OK because
  // the test is one-direction (assert "at least one family hits").
  if (/[一-鿿]/.test(text) && /(删除|移除|取消|退出|登出|终止|重置|禁用|注销)/.test(text)) return 'zh-CN';
  if (/[぀-ヿ一-鿿]/.test(text) && /(削除|消去|キャンセル|サインアウト|ログアウト|終了|無効化|解除)/.test(text)) return 'ja';
  if (/[가-힯]/.test(text)) return 'ko';
  if (/[؀-ۿ]/.test(text)) return 'ar';
  if (/(eliminar|borrar|cancelar|cerrar\s*sesión|destruir|restablecer|desactivar)/i.test(text)) return 'es';
  if (/(supprimer|effacer|annuler|déconnecter|détruire|réinitialiser|désactiver)/i.test(text)) return 'fr';
  if (/(excluir|apagar|sair|encerrar|redefinir|desativar)/i.test(text)) return 'pt';
  if (/(löschen|entfernen|abbrechen|abmelden|beenden|zerstören|zurücksetzen|deaktivieren)/i.test(text)) return 'de';
  if (/(delete|remove|cancel|sign\s*out|log\s*out|terminate|destroy|wipe|reset|purge|deactivate|disable|unsubscribe)/i.test(text)) return 'en';
  return null;
}

export const __internals = Object.freeze({
  DESTRUCTIVE_TERM_RE,
  DESTRUCTIVE_CLASS_FRAGMENTS,
  DESTRUCTIVE_FORM_METHODS,
});
