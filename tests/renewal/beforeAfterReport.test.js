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

describe('buildBeforeAfterReport', () => {
  it('returns a populated report with limitations + side-by-side panels (url input)', () => {
    const issuesBefore = { issues: [
      { id: 'I-1', severity: 'critical', category: 'missing-value-proposition' },
      { id: 'I-2', severity: 'high',     category: 'missing-cta' },
    ]};
    const issuesAfter = { issues: [] };
    const renewalResult = {
      renewedUrl: 'https://flowai.test/api/renewed/abc',
      renewedHash: 'abc',
      renewalType: 'fork-static-html',
      patchesApplied: [{ category: 'missing-value-proposition' }, { category: 'missing-cta' }],
      deployedAt: '2026-05-14T01:00:00Z',
    };
    const report = buildBeforeAfterReport({
      artifact: urlArtifact(), evidence: { pagesCrawled: 1, depth: 0 },
      issueListBefore: issuesBefore, issueListAfter: issuesAfter,
      renewalResult,
    });
    expect(report.inputType).toBe('url');
    expect(report.issuesBefore).toBe(2);
    expect(report.issuesAfter).toBe(0);
    expect(report.issuesResolved.length).toBe(2);
    expect(report.deltaScore.before).toBeLessThan(report.deltaScore.after);
    expect(report.sideBySidePresentation.original.type).toBe('iframe');
    expect(report.sideBySidePresentation.original.content).toBe('https://x.test');
    expect(report.sideBySidePresentation.renewed.type).toBe('iframe');
    expect(report.sideBySidePresentation.renewed.content).toBe('https://flowai.test/api/renewed/abc');
    expect(report.limitations).toContain('STATIC HTML');
  });

  it('renders description-card original for description input', () => {
    const renewalResult = { renewedUrl: 'https://flowai.test/api/renewed/h2', renewedHash: 'h2', renewalType: 'generated-from-description', patchesApplied: [], deployedAt: 't' };
    const report = buildBeforeAfterReport({
      artifact: descArtifact(),
      evidence: {},
      issueListBefore: { issues: [] }, issueListAfter: { issues: [] },
      renewalResult,
    });
    expect(report.sideBySidePresentation.original.type).toBe('description-card');
    expect(report.sideBySidePresentation.original.content.productName).toBe('X');
  });

  it('renders screenshot panel for content input with attachments', () => {
    const renewalResult = { renewedUrl: 'https://flowai.test/api/renewed/h3', renewedHash: 'h3', renewalType: 'renewed-content', patchesApplied: [], deployedAt: 't' };
    const report = buildBeforeAfterReport({
      artifact: contentArtifact(),
      evidence: {},
      issueListBefore: { issues: [] }, issueListAfter: { issues: [] },
      renewalResult,
    });
    expect(report.sideBySidePresentation.original.type).toBe('screenshot');
    expect(report.sideBySidePresentation.original.content.attachments.length).toBe(1);
  });

  it('limitations text discloses static-HTML scope verbatim', () => {
    expect(__internals.LIMITATIONS).toContain('does NOT');
    expect(__internals.LIMITATIONS).toContain('STATIC HTML');
    expect(__internals.LIMITATIONS).toContain('SPA hydration');
    expect(__internals.LIMITATIONS).toContain('API integrations');
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
