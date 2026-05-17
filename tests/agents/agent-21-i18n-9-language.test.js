// tests/agents/agent-21-i18n-9-language.test.js
//
// Phase 3 — Invariant 5 9-language i18n destructive denylist coverage.
//
// Per AUTH_TRAVERSAL_SECURITY_SPEC v3 §11 #6 (frozen baseline at be594e3):
//   "Destructive-action denylist i18n coverage — 9 languages": tests assert
//   blocking on each of the 9 floor language families:
//     (a) English, (b) Spanish, (c) French, (d) Portuguese,
//     (e) German, (f) Chinese Simplified, (g) Japanese,
//     (h) Korean, (i) Arabic.
//   Plus a test asserts the data-crawl-safe="true" allowlist overrides
//   a denylist match. Partial coverage (less than 9) is non-conformant.
//
// Each family below gets ≥1 named test. The 10th test asserts the
// allowlist override regardless of language family.

import { describe, it, expect } from 'vitest';
import {
  applyHybridGate,
  detectLanguageFamily,
  __internals,
} from '../../src/lib/agents/auth/destructiveDenylist.js';

describe('Invariant 5 — i18n 9-language destructive denylist (Q6-v3 carry-forward)', () => {
  // ── (a) English ────────────────────────────────────────────────────────────
  describe('(a) English', () => {
    it('blocks button with text "Delete Account"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Delete Account' });
      expect(r.allow).toBe(false);
      expect(r.rule).toMatch(/denylist_destructive_text/);
    });
    it('blocks button with class "btn-danger"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Confirm', className: 'btn-danger' });
      expect(r.allow).toBe(false);
      expect(r.rule).toBe('denylist_destructive_class');
    });
    it('detectLanguageFamily identifies English destructive terms', () => {
      expect(detectLanguageFamily('Delete forever')).toBe('en');
    });
  });

  // ── (b) Spanish ────────────────────────────────────────────────────────────
  describe('(b) Spanish', () => {
    it('blocks button with text "Eliminar"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Eliminar' });
      expect(r.allow).toBe(false);
      expect(r.rule).toBe('denylist_destructive_text');
    });
    it('blocks button with text "Cerrar sesión"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Cerrar sesión' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies Spanish destructive terms', () => {
      expect(detectLanguageFamily('Eliminar cuenta')).toBe('es');
    });
  });

  // ── (c) French ─────────────────────────────────────────────────────────────
  describe('(c) French', () => {
    it('blocks button with text "Supprimer"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Supprimer' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "Déconnecter"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Déconnecter' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies French destructive terms', () => {
      expect(detectLanguageFamily('Supprimer le compte')).toBe('fr');
    });
  });

  // ── (d) Portuguese ─────────────────────────────────────────────────────────
  describe('(d) Portuguese', () => {
    it('blocks button with text "Excluir"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Excluir' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "Apagar"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Apagar' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies Portuguese destructive terms', () => {
      expect(detectLanguageFamily('Excluir conta permanentemente')).toBe('pt');
    });
  });

  // ── (e) German ─────────────────────────────────────────────────────────────
  describe('(e) German', () => {
    it('blocks button with text "Löschen"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Löschen' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "Abmelden"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'Abmelden' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies German destructive terms', () => {
      expect(detectLanguageFamily('Konto löschen')).toBe('de');
    });
  });

  // ── (f) Chinese Simplified ─────────────────────────────────────────────────
  describe('(f) Chinese (Simplified)', () => {
    it('blocks button with text "删除"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: '删除' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "退出"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: '退出' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies Chinese Simplified destructive terms', () => {
      expect(detectLanguageFamily('删除账户')).toBe('zh-CN');
    });
  });

  // ── (g) Japanese ───────────────────────────────────────────────────────────
  describe('(g) Japanese (v3 expansion)', () => {
    it('blocks button with text "削除"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: '削除' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "ログアウト"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'ログアウト' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies Japanese destructive terms', () => {
      expect(detectLanguageFamily('削除する')).toBe('ja');
    });
  });

  // ── (h) Korean ─────────────────────────────────────────────────────────────
  describe('(h) Korean (v3 expansion)', () => {
    it('blocks button with text "삭제"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: '삭제' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "로그아웃"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: '로그아웃' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies Korean Hangul', () => {
      expect(detectLanguageFamily('삭제')).toBe('ko');
    });
  });

  // ── (i) Arabic ─────────────────────────────────────────────────────────────
  describe('(i) Arabic (v3 expansion)', () => {
    it('blocks button with text "حذف"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'حذف' });
      expect(r.allow).toBe(false);
    });
    it('blocks button with text "إلغاء"', () => {
      const r = applyHybridGate({ tagName: 'BUTTON', textContent: 'إلغاء' });
      expect(r.allow).toBe(false);
    });
    it('detectLanguageFamily identifies Arabic script', () => {
      expect(detectLanguageFamily('حذف الحساب')).toBe('ar');
    });
  });

  // ── Allowlist override across families ─────────────────────────────────────
  describe('Allowlist override (data-crawl-safe="true")', () => {
    it.each([
      ['English', 'Delete Account'],
      ['Spanish', 'Eliminar'],
      ['French', 'Supprimer'],
      ['Portuguese', 'Excluir'],
      ['German', 'Löschen'],
      ['Chinese', '删除'],
      ['Japanese', '削除'],
      ['Korean', '삭제'],
      ['Arabic', 'حذف'],
    ])('allowlist override beats %s denylist match (text="%s")', (_lang, text) => {
      const r = applyHybridGate({
        tagName: 'BUTTON', textContent: text, dataset: { crawlSafe: 'true' },
      });
      expect(r.allow).toBe(true);
      expect(r.rule).toBe('allowlist_data_crawl_safe');
    });
  });

  // ── Floor completeness ─────────────────────────────────────────────────────
  describe('Floor completeness (per spec §11 #6)', () => {
    it('all 9 named families have at least one identifying token', () => {
      const families = ['en', 'es', 'fr', 'pt', 'de', 'zh-CN', 'ja', 'ko', 'ar'];
      const samples = {
        en: 'delete', es: 'eliminar', fr: 'supprimer', pt: 'excluir',
        de: 'löschen', 'zh-CN': '删除', ja: '削除', ko: '삭제', ar: 'حذف',
      };
      for (const f of families) {
        expect(__internals.DESTRUCTIVE_TERM_RE.test(samples[f])).toBe(true);
      }
    });
  });
});
