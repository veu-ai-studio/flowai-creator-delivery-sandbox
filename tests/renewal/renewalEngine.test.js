// W2 dispatch 6-of-N — Orchestra-powered renewal engine tests.
//
// The prior static-HTML renderRenewedHtml / fetchRenewed / renew tests
// no longer apply (that engine is deleted).  Tests now cover:
//   - resolveRenewalType mapping
//   - renewalEngine.renew routing (mocked remediation + synthesis)
//   - patchesApplied passthrough

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Stub the heavy-side modules so renewalEngine.renew can be exercised
// in isolation without spinning up real Vercel deployments.
vi.mock('../../api/_lib/remediationEngine.js', () => ({
  remediate: vi.fn(async ({ artifact, sourceHints }) => {
    const path = sourceHints?.gitUrl ? 'patch-existing-source' : 'generate-from-scratch';
    return {
      ok: true,
      path,
      renewedUrl: 'https://flowai-renewed-test.vercel.app',
      sourceDisclosure: path === 'patch-existing-source' ? 'Source acquired via git-tarball' : 'Source unreachable; new product generated from spec',
      patchedFiles: path === 'patch-existing-source' ? ['src/App.jsx'] : null,
      generatedFiles: path === 'generate-from-scratch' ? ['package.json', 'src/App.jsx'] : null,
      deploymentId: 'dpl_test',
      deployedAt: '2026-05-14T00:00:00Z',
    };
  }),
}));
vi.mock('../../api/_lib/synthesisEngine.js', () => ({
  synthesize: vi.fn(async () => ({
    ok: true,
    renewedUrl: 'https://flowai-renewed-synth.vercel.app',
    sourceContributions: [{ url: 'https://a.test', contributedFeatures: ['cta'] }],
    synthesisLog: ['Crawled 2 sources', 'Generated synthesis'],
    remediation: { deploymentId: 'dpl_synth', deployedAt: '2026-05-14T00:00:00Z' },
  })),
}));

import { renew, resolveRenewalType } from '../../api/_lib/renewalEngine.js';
import { remediate } from '../../api/_lib/remediationEngine.js';
import { synthesize } from '../../api/_lib/synthesisEngine.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveRenewalType', () => {
  it('maps each inputType to its canonical renewalType', () => {
    expect(resolveRenewalType('url')).toBe('fork-static-html');
    expect(resolveRenewalType('description')).toBe('generated-from-description');
    expect(resolveRenewalType('content')).toBe('renewed-content');
    expect(resolveRenewalType('multi-url-synthesis')).toBe('multi-url-synthesis');
    expect(resolveRenewalType('other')).toBe('generated-from-description');
  });
});

describe('renew routing', () => {
  const baseArtifact = (type) => ({
    id: 'a-1', inputType: type, submittedAt: '2026-05-14T00:00:00Z',
    raw: type === 'url' ? { url: 'https://x.test' }
      : type === 'description' ? { description: { productName: 'X', whatItDoes: 'Y' } }
      : type === 'content' ? { content: { text: 'Z' } }
      : { urls: ['https://a.test', 'https://b.test'] },
    normalized: { productConcept: 'X', targetUsers: 'Y', coreClaims: [], detectedFeatures: [], observedSurfaces: 'crawl' },
  });

  it('routes url input to remediate', async () => {
    const r = await renew({ artifact: baseArtifact('url'), issues: [] });
    expect(remediate).toHaveBeenCalledOnce();
    expect(r.ok).toBe(true);
    expect(r.renewalType).toBe('fork-static-html');
    expect(r.remediationPath).toBe('generate-from-scratch');
    expect(r.renewedUrl).toBe('https://flowai-renewed-test.vercel.app');
  });

  it('routes url + gitUrl source hint to patch-existing-source', async () => {
    const r = await renew({ artifact: baseArtifact('url'), issues: [], sourceHints: { gitUrl: 'owner/repo' } });
    expect(r.remediationPath).toBe('patch-existing-source');
    expect(r.patchedFiles).toEqual(['src/App.jsx']);
  });

  it('routes description input to remediate (generate-from-scratch)', async () => {
    const r = await renew({ artifact: baseArtifact('description'), issues: [] });
    expect(remediate).toHaveBeenCalledOnce();
    expect(r.renewalType).toBe('generated-from-description');
    expect(r.generatedFiles).toContain('package.json');
  });

  it('routes content input to remediate (generate-from-scratch)', async () => {
    const r = await renew({ artifact: baseArtifact('content'), issues: [] });
    expect(remediate).toHaveBeenCalledOnce();
    expect(r.renewalType).toBe('renewed-content');
  });

  it('routes multi-url input to synthesize', async () => {
    const r = await renew({ artifact: baseArtifact('multi-url-synthesis'), issues: [], urls: ['https://a.test', 'https://b.test'] });
    expect(synthesize).toHaveBeenCalledOnce();
    expect(r.renewalType).toBe('multi-url-synthesis');
    expect(r.remediationPath).toBe('multi-url-synthesis');
    expect(r.sourceContributions).toEqual([{ url: 'https://a.test', contributedFeatures: ['cta'] }]);
    expect(r.renewedUrl).toBe('https://flowai-renewed-synth.vercel.app');
  });

  it('propagates remediation failure with buildLog', async () => {
    remediate.mockResolvedValueOnce({
      ok: false, path: 'generate-from-scratch',
      reason: 'Vercel build ERROR', buildLog: '[stderr] Module not found',
      deploymentId: 'dpl_fail', deployedAt: '2026-05-14T00:00:00Z',
      sourceDisclosure: 'Source unreachable; new product generated from spec',
    });
    const r = await renew({ artifact: baseArtifact('description'), issues: [] });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('Vercel build ERROR');
    expect(r.buildLog).toContain('Module not found');
    expect(r.renewedUrl).toBeUndefined();
  });

  it('passes patchesApplied through from autoFixable issues', async () => {
    const issues = [
      { id: 'I-1', category: 'missing-cta', severity: 'high', autoFixable: true, fixSpec: { kind: 'insert', target: 'cta-button' } },
      { id: 'I-2', category: 'broken-link', severity: 'high', autoFixable: false },
    ];
    const r = await renew({ artifact: baseArtifact('description'), issues });
    expect(r.patchesApplied).toHaveLength(1);
    expect(r.patchesApplied[0].category).toBe('missing-cta');
  });
});
