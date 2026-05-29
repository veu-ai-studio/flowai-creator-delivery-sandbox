import { describe, it, expect } from 'vitest';
import { buildBeforeAfterReport, detectIssuesOnRenewal, __internals } from '../../api/_lib/beforeAfterReport.js';

const urlArtifact = () => ({
  id: 'a-1', inputType: 'url', submittedAt: '2026-05-14T00:00:00Z',
  raw: { url: 'https://x.test' },
  normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'crawl' },
});
const descArtifact = () => ({
  id: 'a-2', inputType: 'description', submittedAt: '2026-05-14T00:00:00Z',
  raw: { description: { productName: 'X', whatItDoes: 'does Y', targetAudience: 'Z' } },
  normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'description-only' },
});
const contentArtifact = () => ({
  id: 'a-3', inputType: 'content', submittedAt: '2026-05-14T00:00:00Z',
  raw: { content: { text: 'pasted copy', attachments: [{ filename: 'x.png', mimeType: 'image/png', extractedText: 'OCR' }] } },
  normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'vision' },
});
const multiArtifact = () => ({
  id: 'a-4', inputType: 'multi-url-synthesis', submittedAt: '2026-05-14T00:00:00Z',
  raw: { urls: ['https://a.test', 'https://b.test'] },
  normalized: { productConcept: 'Synthesized', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'crawl' },
});

const renewalResult = (overrides = {}) => ({
  renewedUrl: 'https://flowai-renewed-test.vercel.app',
  renewalType: 'fork-static-html',
  remediationPath: 'generate-from-scratch',
  sourceDisclosure: 'Source unreachable; new product generated from spec.',
  patchesApplied: [{ category: 'missing-value-proposition' }, { category: 'missing-cta' }],
  deployedAt: '2026-05-14T01:00:00Z',
  ...overrides,
});

describe('buildBeforeAfterReport', () => {
  it('emits renewedUrl pointing at a real Vercel preview (not inline HTML)', () => {
    const report = buildBeforeAfterReport({
      artifact: urlArtifact(),
      evidence: { pagesCrawled: 1, depth: 0 },
      issueListBefore: { issues: [{ id: 'I-1', severity: 'critical', category: 'missing-value-proposition' }, { id: 'I-2', severity: 'high', category: 'missing-cta' }] },
      issueListAfter: { issues: [] },
      renewalResult: renewalResult(),
    });
    expect(report.renewedUrl).toMatch(/^https:\/\//);
    expect(report.renewedUrl).not.toMatch(/\/api\/renewed\//);
    expect(report.renewedHtml).toBeUndefined();
    expect(report.sideBySidePresentation.renewed.type).toBe('iframe');
    expect(report.sideBySidePresentation.renewed.content).toBe(report.renewedUrl);
  });

  it('LIMITATIONS block is removed; SOURCE DISCLOSURE prefix is present instead', () => {
    expect(__internals.HONEST_DISCLOSURE_PREFIX).toBe('Source disclosure: ');
    expect(__internals.LIMITATIONS).toBeUndefined();
    const report = buildBeforeAfterReport({
      artifact: descArtifact(),
      evidence: {},
      issueListBefore: { issues: [] },
      issueListAfter: { issues: [] },
      renewalResult: renewalResult({ renewalType: 'generated-from-description' }),
    });
    expect(report.limitations).toBeUndefined();
    expect(report.sourceDisclosure).toMatch(/^Source disclosure: /);
  });

  it('renders description-card original for description input', () => {
    const report = buildBeforeAfterReport({
      artifact: descArtifact(), evidence: {},
      issueListBefore: { issues: [] }, issueListAfter: { issues: [] },
      renewalResult: renewalResult({ renewalType: 'generated-from-description' }),
    });
    expect(report.sideBySidePresentation.original.type).toBe('description-card');
    expect(report.sideBySidePresentation.original.content.productName).toBe('X');
  });

  it('renders screenshot panel for content input with attachments', () => {
    const report = buildBeforeAfterReport({
      artifact: contentArtifact(), evidence: {},
      issueListBefore: { issues: [] }, issueListAfter: { issues: [] },
      renewalResult: renewalResult({ renewalType: 'renewed-content' }),
    });
    expect(report.sideBySidePresentation.original.type).toBe('screenshot');
    expect(report.sideBySidePresentation.original.content.attachments.length).toBe(1);
  });

  it('renders multi-url-grid original for multi-url-synthesis input', () => {
    const report = buildBeforeAfterReport({
      artifact: multiArtifact(), evidence: {},
      issueListBefore: { issues: [] }, issueListAfter: { issues: [] },
      renewalResult: renewalResult({
        renewalType: 'multi-url-synthesis', remediationPath: 'multi-url-synthesis',
        sourceContributions: [{ url: 'https://a.test', contributedFeatures: ['cta', 'valueProp'] }],
      }),
    });
    expect(report.sideBySidePresentation.original.type).toBe('multi-url-grid');
    expect(report.sideBySidePresentation.original.content.urls).toEqual(['https://a.test', 'https://b.test']);
    expect(report.sourceContributions[0].contributedFeatures).toContain('cta');
  });

  it('emits delta score, resolved + remaining issue lists', () => {
    const before = { issues: [
      { id: 'I-1', severity: 'critical', category: 'missing-value-proposition' },
      { id: 'I-2', severity: 'high',     category: 'missing-cta' },
      { id: 'I-3', severity: 'medium',   category: 'missing-trust-signals' },
    ]};
    const after = { issues: [{ id: 'I-3b', severity: 'medium', category: 'missing-trust-signals' }] };
    const report = buildBeforeAfterReport({
      artifact: descArtifact(), evidence: {},
      issueListBefore: before, issueListAfter: after, renewalResult: renewalResult(),
    });
    expect(report.issuesBefore).toBe(3);
    expect(report.issuesAfter).toBe(1);
    expect(report.issuesResolved).toHaveLength(2);
    expect(report.issuesRemaining).toHaveLength(1);
    expect(report.deltaScore.before).toBeLessThan(report.deltaScore.after);
  });
});

describe('detectIssuesOnRenewal', () => {
  it('removes auto-fixable common categories from the post-renewal artifact', () => {
    const a = urlArtifact();
    const patches = [
      { category: 'missing-value-proposition' },
      { category: 'unclear-target-users' },
      { category: 'missing-cta' },
      { category: 'missing-trust-signals' },
      { category: 'missing-legal' },
    ];
    const after = detectIssuesOnRenewal(a, patches);
    const cats = after.issues.map((i) => i.category);
    expect(cats).not.toContain('missing-value-proposition');
    expect(cats).not.toContain('unclear-target-users');
    expect(cats).not.toContain('missing-cta');
    expect(cats).not.toContain('missing-trust-signals');
    expect(cats).not.toContain('missing-legal');
  });
});
