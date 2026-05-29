import { describe, it, expect } from 'vitest';
import { detectIssues, scoreFromIssues } from '../../api/_lib/issueDetector.js';

function urlArtifact(normalized = {}) {
  return {
    id: 'a-1', inputType: 'url', submittedAt: '2026-05-14T00:00:00Z',
    raw: { url: 'https://x.test' },
    normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'crawl', ...normalized },
  };
}
function descArtifact(d, normalized = {}) {
  return {
    id: 'a-2', inputType: 'description', submittedAt: '2026-05-14T00:00:00Z',
    raw: { description: d },
    normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'description-only', ...normalized },
  };
}
function contentArtifact(content, normalized = {}) {
  return {
    id: 'a-3', inputType: 'content', submittedAt: '2026-05-14T00:00:00Z',
    raw: { content },
    normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'description-only', ...normalized },
  };
}

describe('issueDetector — common detectors', () => {
  it('flags missing-value-proposition when productConcept is empty', () => {
    const a = urlArtifact({ productConcept: '' });
    const { issues } = detectIssues(a, { pages: [{ ok: true, bodyText: 'x', headings: [{ tag: 'h1', text: 'Hi' }], metaDescription: 'm' }] });
    const cats = issues.map((i) => i.category);
    expect(cats).toContain('missing-value-proposition');
  });

  it('flags unclear-target-users when normalized.targetUsers is empty', () => {
    const a = urlArtifact({ productConcept: 'A clear concept that is long enough.', targetUsers: '' });
    const { issues } = detectIssues(a, { pages: [{ ok: true, bodyText: 'x', headings: [{ tag: 'h1', text: 'Hi' }], metaDescription: 'm' }] });
    expect(issues.map((i) => i.category)).toContain('unclear-target-users');
  });

  it('flags missing-cta / trust-signals / legal when corpus lacks keywords', () => {
    const a = urlArtifact({ productConcept: 'Concept', targetUsers: 'Users' });
    const { issues } = detectIssues(a, { pages: [{ ok: true, bodyText: 'just some content with no calls or trust', headings: [{ tag: 'h1', text: 'Hi' }], metaDescription: 'm' }] });
    const cats = issues.map((i) => i.category);
    expect(cats).toContain('missing-cta');
    expect(cats).toContain('missing-trust-signals');
    expect(cats).toContain('missing-legal');
  });

  it('does NOT flag CTA when body contains a CTA verb', () => {
    const a = urlArtifact({ productConcept: 'Concept that is long enough', targetUsers: 'Users' });
    const { issues } = detectIssues(a, {
      pages: [{ ok: true, bodyText: 'Sign up free today. Trusted by teams. Privacy policy.', headings: [{ tag: 'h1', text: 'Hi' }], metaDescription: 'm' }],
    });
    expect(issues.map((i) => i.category)).not.toContain('missing-cta');
    expect(issues.map((i) => i.category)).not.toContain('missing-trust-signals');
    expect(issues.map((i) => i.category)).not.toContain('missing-legal');
  });
});

describe('issueDetector — URL-only detectors', () => {
  it('flags no-content-on-page when no page is reachable', () => {
    const a = urlArtifact({ productConcept: 'X', targetUsers: 'Y' });
    const { issues } = detectIssues(a, { pages: [{ ok: false, url: 'https://x', reason: 'timeout' }] });
    expect(issues[0].category).toBe('missing-value-proposition'); // common still fires
    expect(issues.map((i) => i.category)).toContain('no-content-on-page');
  });

  it('flags missing-h1 when page has no h1 heading', () => {
    const a = urlArtifact({ productConcept: 'X', targetUsers: 'Y' });
    const { issues } = detectIssues(a, {
      pages: [{ ok: true, url: 'https://x', bodyText: 'sign up', headings: [{ tag: 'h2', text: 'Sub' }], metaDescription: 'm' }],
    });
    expect(issues.map((i) => i.category)).toContain('missing-h1');
  });

  it('flags broken-link when an internal page failed to fetch', () => {
    const a = urlArtifact({ productConcept: 'X', targetUsers: 'Y' });
    const { issues } = detectIssues(a, {
      pages: [
        { ok: true, url: 'https://x', bodyText: 'sign up trust privacy', headings: [{ tag: 'h1', text: 'A' }], metaDescription: 'm' },
        { ok: false, url: 'https://x/broken', reason: 'HTTP 404' },
      ],
    });
    expect(issues.map((i) => i.category)).toContain('broken-link');
  });

  it('flags seo-gap when meta description is empty', () => {
    const a = urlArtifact({ productConcept: 'X', targetUsers: 'Y' });
    const { issues } = detectIssues(a, {
      pages: [{ ok: true, url: 'https://x', bodyText: 'sign up trust privacy', headings: [{ tag: 'h1', text: 'A' }], metaDescription: '' }],
    });
    expect(issues.map((i) => i.category)).toContain('seo-gap');
  });
});

describe('issueDetector — description-only detectors', () => {
  it('flags vague-feature-list when buzzwords dominate', () => {
    const a = descArtifact({ productName: 'X', whatItDoes: 'concept x', keyFeatures: 'amazing world-class powerful seamless innovative cutting edge', currentIssues: '' }, { productConcept: 'a concept that is long enough', targetUsers: 'users' });
    const { issues } = detectIssues(a, null);
    expect(issues.map((i) => i.category)).toContain('vague-feature-list');
  });

  it('flags missing-pricing-model when no pricing keyword present', () => {
    const a = descArtifact({ productName: 'X', whatItDoes: 'no money words', keyFeatures: 'feature one, feature two' }, { productConcept: 'a concept that is long enough', targetUsers: 'users' });
    const { issues } = detectIssues(a, null);
    expect(issues.map((i) => i.category)).toContain('missing-pricing-model');
  });

  it('does NOT flag missing-pricing-model when "$29 per user" appears', () => {
    const a = descArtifact({ productName: 'X', whatItDoes: 'costs $29 per user per month', keyFeatures: 'feature one' }, { productConcept: 'a concept that is long enough', targetUsers: 'users' });
    const { issues } = detectIssues(a, null);
    expect(issues.map((i) => i.category)).not.toContain('missing-pricing-model');
  });
});

describe('issueDetector — content-only detectors', () => {
  it('flags poor-readability for long-word-heavy text', () => {
    const longwords = 'optimisation organisational synchronisation administration regularisation '
      .repeat(20);
    const a = contentArtifact({ text: longwords });
    const { issues } = detectIssues(a, null);
    expect(issues.map((i) => i.category)).toContain('poor-readability');
  });

  it('flags copy-too-long-for-format above 1500 chars', () => {
    const text = 'word '.repeat(400); // 2000 chars
    const a = contentArtifact({ text });
    const { issues } = detectIssues(a, null);
    expect(issues.map((i) => i.category)).toContain('copy-too-long-for-format');
  });

  it('flags missing-headline-hierarchy when no leading short line', () => {
    const text = 'this is a long sentence. and another one. and a third one all in one paragraph.';
    const a = contentArtifact({ text });
    const { issues } = detectIssues(a, null);
    expect(issues.map((i) => i.category)).toContain('missing-headline-hierarchy');
  });
});

describe('issueDetector — scoreFromIssues', () => {
  it('returns 50 for an empty issue list', () => {
    expect(scoreFromIssues({ issues: [] })).toBe(50);
  });

  it('weighs critical=5, high=3, medium=1', () => {
    const issues = [
      { severity: 'critical' }, { severity: 'critical' },   // -10
      { severity: 'high' }, { severity: 'high' },           // -6
      { severity: 'medium' }, { severity: 'medium' }, { severity: 'medium' }, // -3
    ];
    // total penalty 19, score 31
    expect(scoreFromIssues({ issues })).toBe(31);
  });

  it('clamps at 0 for very large penalties', () => {
    const issues = Array.from({ length: 30 }, () => ({ severity: 'critical' }));
    expect(scoreFromIssues({ issues })).toBe(0);
  });

  it('ids are monotonically numbered per detect run', () => {
    const a = urlArtifact({ productConcept: 'X', targetUsers: 'Y' });
    const r1 = detectIssues(a, { pages: [{ ok: true, bodyText: '', headings: [], metaDescription: '' }] });
    const r2 = detectIssues(a, { pages: [{ ok: true, bodyText: '', headings: [], metaDescription: '' }] });
    // Each run resets the counter; both runs start at ISSUE-001.
    expect(r1.issues[0].id).toBe('ISSUE-001');
    expect(r2.issues[0].id).toBe('ISSUE-001');
  });
});
