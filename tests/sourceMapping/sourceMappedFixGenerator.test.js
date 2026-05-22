import { describe, expect, it, vi } from 'vitest';
import { generateSourceMappedFixProposals } from '../../src/lib/sourceMapping/sourceMappedFixGenerator.js';

const FINDING = Object.freeze({
  id: 'f1',
  category: 'image-missing-alt',
  severity: 'medium',
  location: 'https://saigeplatform.com/dashboard',
});

const SOURCE_MAPPING = Object.freeze({
  kind: 'registered_repo_source_mapping',
  mappings: [
    Object.freeze({
      findingId: 'f1',
      category: 'image-missing-alt',
      location: 'https://saigeplatform.com/dashboard',
      mapped: true,
      selectedFilePath: 'src/pages/Dashboard.jsx',
      confidence: 0.91,
      reason: 'route_token_exact_basename:dashboard',
    }),
  ],
});

describe('sourceMappedFixGenerator (U5)', () => {
  it('emits recommend_only source-mapped proposals when content is available', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: SOURCE_MAPPING,
      fileContentProvider: vi.fn(async () => [
        'export default function Dashboard() {',
        '  return <img src="/logo.png" />;',
        '}',
      ].join('\n')),
    });

    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      findingId: 'f1',
      category: 'image-missing-alt',
      severity: 'medium',
      filePath: 'src/pages/Dashboard.jsx',
      lineNumber: 1,
      confidence: 'HIGH',
      authority: 'recommend_only',
      sourceMapComplete: true,
    });
    expect(proposals[0].currentSnippet).toContain('return <img');
    expect(proposals[0].proposedFix).toContain('alt text');
  });

  it('degrades honestly when U4 source mapping is incomplete', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: { mappings: [] },
    });

    expect(proposals[0]).toEqual({
      findingId: 'f1',
      category: 'image-missing-alt',
      severity: 'medium',
      filePath: null,
      lineNumber: null,
      currentSnippet: null,
      proposedFix: 'inspect registered repo/source map before patching',
      confidence: 'LOW',
      authority: 'recommend_only',
      reason: 'source_map_incomplete',
      sourceMapComplete: false,
    });
  });

  it('degrades instead of throwing when fileContentProvider is missing or fails', async () => {
    const missingProvider = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: SOURCE_MAPPING,
    });
    const failingProvider = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: SOURCE_MAPPING,
      fileContentProvider: async () => { throw new Error('nope'); },
    });

    expect(missingProvider[0].reason).toBe('source_map_incomplete');
    expect(missingProvider[0].authority).toBe('recommend_only');
    expect(failingProvider[0].reason).toBe('source_map_incomplete');
    expect(failingProvider[0].confidence).toBe('LOW');
  });

  it('uses snippets already present on U4 mapping without a provider', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: {
        mappings: [{
          ...SOURCE_MAPPING.mappings[0],
          lineNumber: 12,
          currentSnippet: '  12 | <img src="/logo.png" />',
        }],
      },
    });

    expect(proposals[0]).toMatchObject({
      filePath: 'src/pages/Dashboard.jsx',
      lineNumber: 12,
      currentSnippet: '  12 | <img src="/logo.png" />',
      authority: 'recommend_only',
      sourceMapComplete: true,
    });
  });
});
