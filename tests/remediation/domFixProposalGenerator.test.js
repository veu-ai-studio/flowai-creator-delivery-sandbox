import { describe, expect, it } from 'vitest';
import {
  generateDomFixProposal,
  generateDomFixProposals,
} from '../../src/lib/remediation/domFixProposalGenerator.js';

describe('domFixProposalGenerator', () => {
  it('generates a DOM-level proposal for missing alt text without fake file paths', () => {
    const proposal = generateDomFixProposal({
      finding: {
        id: 'img-1',
        category: 'missing-alt',
        location: 'https://example.com img.logo',
        evidenceLevel: 'DOM_OBSERVED',
      },
      frameworkDetection: { framework: 'React', confidence: 'HIGH' },
    });
    expect(proposal.fixLevel).toBe('DOM_LEVEL_PROPOSAL');
    expect(proposal.after).toContain('alt=');
    expect(proposal.sourceFile).toBeNull();
    expect(proposal.patch).toBeNull();
  });

  it('marks failed network requests as source-required or manual investigation', () => {
    const proposal = generateDomFixProposal({
      finding: {
        id: 'net-1',
        category: 'failed-network-request',
        location: 'https://example.com/api/data',
        detail: 'HTTP 404',
        evidenceLevel: 'RUNTIME_OBSERVED',
      },
    });
    expect(['SOURCE_REQUIRED', 'MANUAL_INVESTIGATION']).toContain(proposal.fixLevel);
    expect(proposal.riskAssessment.regressionRisk).toBe('high');
    expect(proposal.sourceFile).toBeNull();
  });

  it('never fabricates source ownership for unknown categories', () => {
    const [proposal] = generateDomFixProposals({
      findings: [{ id: 'x', category: 'unknown-category', location: 'https://example.com' }],
      deepBrowserAnalysis: null,
    });
    expect(proposal.fixLevel).toBe('MANUAL_INVESTIGATION');
    expect(proposal.sourceFile).toBeNull();
    expect(proposal.patch).toBeNull();
  });
});
