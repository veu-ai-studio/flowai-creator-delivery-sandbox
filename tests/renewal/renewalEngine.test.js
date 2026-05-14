import { describe, it, expect } from 'vitest';
import { renderRenewedHtml, renew, fetchRenewed, resolveRenewalType, __internals } from '../../api/_lib/renewalEngine.js';

const baseArtifact = (overrides = {}) => ({
  id: 'art-1', inputType: 'url', submittedAt: '2026-05-14T00:00:00Z',
  raw: { url: 'https://x.test' },
  normalized: {
    productConcept: 'A real concept derived from page evidence.',
    targetUsers: 'Specific user audience',
    coreClaims: ['Claim A', 'Claim B', 'Claim C'],
    detectedFeatures: ['Feature 1', 'Feature 2'],
    observedSurfaces: 'crawl',
  },
  ...overrides,
});

describe('renderRenewedHtml — pure renderer', () => {
  it('produces an HTML document with the product concept in the title and h1', () => {
    const { html, patchesApplied } = renderRenewedHtml({
      artifact: baseArtifact(),
      issues: [
        { id: 'ISSUE-001', severity: 'critical', category: 'missing-value-proposition', autoFixable: true, fixSpec: { kind: 'insert', target: 'value-proposition', placement: 'hero' } },
        { id: 'ISSUE-002', severity: 'high',     category: 'missing-cta',               autoFixable: true, fixSpec: { kind: 'insert', target: 'cta-button',          placement: 'hero' } },
      ],
      renewalType: 'fork-static-html',
    });
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/A real concept derived from page evidence\./);
    expect(html).toMatch(/<h1[^>]*>A real concept derived from page evidence\.<\/h1>/);
    expect(patchesApplied.length).toBe(2);
    expect(patchesApplied.find((p) => p.category === 'missing-cta')).toBeTruthy();
  });

  it('escapes user content to prevent XSS injection', () => {
    const a = baseArtifact({ normalized: { ...baseArtifact().normalized, productConcept: '<script>bad()</script>' } });
    const { html } = renderRenewedHtml({ artifact: a, issues: [], renewalType: 'fork-static-html' });
    expect(html).not.toMatch(/<script>bad/);
    expect(html).toMatch(/&lt;script&gt;bad/);
  });

  it('renders pricing section only when missing-pricing-model is patched', () => {
    const noPricing = renderRenewedHtml({ artifact: baseArtifact(), issues: [], renewalType: 'fork-static-html' });
    expect(noPricing.html).not.toMatch(/<h2>Pricing<\/h2>/);
    const withPricing = renderRenewedHtml({
      artifact: baseArtifact(),
      issues: [{ id: 'I-1', severity: 'high', category: 'missing-pricing-model', autoFixable: true, fixSpec: { kind: 'insert', target: 'pricing-section' } }],
      renewalType: 'generated-from-description',
    });
    expect(withPricing.html).toMatch(/<h2>Pricing<\/h2>/);
  });

  it('renders success metric strip only when missing-success-metric is patched', () => {
    const without = renderRenewedHtml({ artifact: baseArtifact(), issues: [], renewalType: 'fork-static-html' });
    expect(without.html).not.toMatch(/Measurable outcomes/);
    const withMetric = renderRenewedHtml({
      artifact: baseArtifact(),
      issues: [{ id: 'I-2', severity: 'medium', category: 'missing-success-metric', autoFixable: true, fixSpec: { kind: 'insert', target: 'success-metric-line' } }],
      renewalType: 'generated-from-description',
    });
    expect(withMetric.html).toMatch(/Measurable outcomes/);
  });
});

describe('resolveRenewalType', () => {
  it('maps inputType to renewalType', () => {
    expect(resolveRenewalType('url')).toBe('fork-static-html');
    expect(resolveRenewalType('description')).toBe('generated-from-description');
    expect(resolveRenewalType('content')).toBe('renewed-content');
    expect(resolveRenewalType('other')).toBe('static-html');
  });
});

describe('renew + fetchRenewed — round-trip via in-memory fallback', () => {
  it('stores the rendered HTML under a hash and serves it back via fetchRenewed', async () => {
    __internals.memoryStore.clear();
    const result = await renew({
      artifact: baseArtifact(),
      issues: [{ id: 'I-1', severity: 'critical', category: 'missing-value-proposition', autoFixable: true, fixSpec: { kind: 'insert', target: 'value-proposition' } }],
      requestOrigin: 'https://flowai.test',
    });
    expect(result.renewedUrl).toMatch(/^https:\/\/flowai\.test\/api\/renewed\/[a-f0-9]{16}$/);
    expect(result.renewedHash).toMatch(/^[a-f0-9]{16}$/);
    expect(result.patchesApplied.length).toBe(1);
    expect(result.sameOrigin).toBe(true);

    const html = await fetchRenewed(result.renewedHash);
    expect(typeof html).toBe('string');
    expect(html).toMatch(/<!doctype html>/i);
    expect(html).toMatch(/A real concept derived from page evidence\./);
  });

  it('returns null from fetchRenewed for an unknown hash', async () => {
    __internals.memoryStore.clear();
    const html = await fetchRenewed('deadbeefdeadbeef');
    expect(html).toBeNull();
  });

  it('content-addresses identical inputs to the same hash', async () => {
    __internals.memoryStore.clear();
    const a = baseArtifact();
    const issues = [{ id: 'I-1', severity: 'high', category: 'missing-cta', autoFixable: true, fixSpec: { kind: 'insert', target: 'cta-button' } }];
    const r1 = await renew({ artifact: a, issues, requestOrigin: 'https://flowai.test' });
    const r2 = await renew({ artifact: a, issues, requestOrigin: 'https://flowai.test' });
    expect(r1.renewedHash).toBe(r2.renewedHash);
  });
});
