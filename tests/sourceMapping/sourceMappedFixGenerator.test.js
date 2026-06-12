import { describe, expect, it, vi } from 'vitest';
import { generateSourceMappedFixProposals } from '../../src/lib/sourceMapping/sourceMappedFixGenerator.js';
import { classifyFileBoundary } from '../../src/lib/sourceMapping/classifyFileBoundary.js';
import { MIN_SOURCE_MAP_CONFIDENCE } from '../../src/lib/sourceMapping/sourceMappingConstants.js';

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
      selectedFilePath: 'src/pages/Dashboard.jsx',
      lineNumber: 1,
      confidence: 'HIGH',
      authority: 'recommend_only',
      status: 'actionable',
      classification: 'actionable',
      sourceMapComplete: true,
      sourceMapConfidence: 0.91,
    });
    expect(proposals[0].currentSnippet).toContain('return <img');
    expect(proposals[0].proposedFix).toContain('alt text');
  });

  it('does not resolve proposals by id when current URL evidence is non-active-host context', async () => {
    const fileContentProvider = vi.fn(async () => '<main>should not be read</main>');
    const proposals = await generateSourceMappedFixProposals({
      findings: [{
        ...FINDING,
        id: 'stale-settings',
        category: 'network:http_404',
        location: 'https://saigeplatform.com/settings',
      }],
      sourceMapping: {
        mappings: [{
          findingId: 'stale-settings',
          category: 'network:http_404',
          location: 'https://saige-v2.vercel.app/settings',
          mapped: true,
          selectedFilePath: 'src/pages/Settings.jsx',
          confidence: 0.92,
          reason: 'route_token_exact_basename:settings',
        }],
      },
      activeTargetUrl: 'https://saige-v2.vercel.app',
      fileContentProvider,
    });

    expect(fileContentProvider).not.toHaveBeenCalled();
    expect(proposals[0]).toMatchObject({
      findingId: 'stale-settings',
      filePath: null,
      selectedFilePath: null,
      status: 'source_map_incomplete',
      classification: 'source_map_incomplete',
      sourceMapComplete: false,
    });
  });

  it('does not resolve proposals by id when active-host scope has no observed URL evidence', async () => {
    const fileContentProvider = vi.fn(async () => '<main>should not be read</main>');
    const proposals = await generateSourceMappedFixProposals({
      findings: [{
        id: 'missing-location',
        category: 'image-missing-alt',
        severity: 'medium',
      }],
      sourceMapping: {
        mappings: [{
          findingId: 'missing-location',
          category: 'image-missing-alt',
          mapped: true,
          selectedFilePath: 'src/pages/Dashboard.jsx',
          confidence: 0.91,
          reason: 'legacy_id_only_match',
        }],
      },
      activeTargetUrl: 'https://saige-v2.vercel.app',
      fileContentProvider,
    });

    expect(fileContentProvider).not.toHaveBeenCalled();
    expect(proposals[0]).toMatchObject({
      findingId: 'missing-location',
      filePath: null,
      status: 'source_map_incomplete',
      sourceMapComplete: false,
    });
  });

  it('preserves observed saige-v2 source-mapped proposals under active host filtering', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [{
        id: 'saige-v2-settings',
        category: 'network:http_404',
        severity: 'medium',
        location: 'https://saige-v2.vercel.app/settings',
      }],
      sourceMapping: {
        mappings: [{
          findingId: 'saige-v2-settings',
          category: 'network:http_404',
          location: 'https://saige-v2.vercel.app/settings',
          mapped: true,
          selectedFilePath: 'src/pages/Settings.jsx',
          confidence: 0.91,
          lineNumber: 2,
          currentSnippet: '   2 | <main><h1>Settings</h1></main>',
          reason: 'route_token_exact_basename:settings',
        }],
      },
      activeTargetUrl: 'https://saige-v2.vercel.app',
    });

    expect(proposals[0]).toMatchObject({
      findingId: 'saige-v2-settings',
      filePath: 'src/pages/Settings.jsx',
      selectedFilePath: 'src/pages/Settings.jsx',
      status: 'actionable',
      classification: 'actionable',
      sourceMapComplete: true,
      sourceMapConfidence: 0.91,
    });
  });

  it('degrades honestly when U4 source mapping is incomplete', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: { mappings: [] },
    });

    expect(proposals[0]).toMatchObject({
      findingId: 'f1',
      category: 'image-missing-alt',
      severity: 'medium',
      filePath: null,
      selectedFilePath: null,
      lineNumber: null,
      currentSnippet: null,
      proposedFix: 'inspect registered repo/source map before patching',
      confidence: 'LOW',
      authority: 'recommend_only',
      status: 'source_map_incomplete',
      classification: 'source_map_incomplete',
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
      status: 'actionable',
      sourceMapComplete: true,
    });
  });

  it('exports the source map confidence threshold used for actionable proposals', () => {
    expect(MIN_SOURCE_MAP_CONFIDENCE).toBe(0.65);
  });

  it('classifies base44Client.js as a platform boundary before incompleteness', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: {
        mappings: [{
          ...SOURCE_MAPPING.mappings[0],
          selectedFilePath: 'src/api/base44Client.js',
          confidence: 0.95,
        }],
      },
    });

    expect(proposals[0]).toMatchObject({
      filePath: 'src/api/base44Client.js',
      selectedFilePath: 'src/api/base44Client.js',
      status: 'PLATFORM_BOUNDARY_BLOCKED',
      classification: 'PLATFORM_BOUNDARY_BLOCKED',
      sourceMapComplete: true,
      actionable: false,
    });
    expect(proposals[0].reason).not.toBe('source_map_incomplete');
  });

  it('classifies auth files as human-review required instead of incomplete', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: {
        mappings: [{
          ...SOURCE_MAPPING.mappings[0],
          selectedFilePath: 'src/auth/Login.jsx',
          confidence: 0.9,
        }],
      },
    });

    expect(proposals[0]).toMatchObject({
      filePath: 'src/auth/Login.jsx',
      status: 'HUMAN_REVIEW_REQUIRED',
      classification: 'HUMAN_REVIEW_REQUIRED',
      sourceMapComplete: true,
      actionable: false,
    });
    expect(proposals[0].reason).toBe('AUTH_SESSION_PROVIDER_FILE');
  });

  it('keeps source_map_incomplete for genuine mapping failures only', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: {
        mappings: [{
          ...SOURCE_MAPPING.mappings[0],
          mapped: false,
          selectedFilePath: null,
          candidates: [],
        }],
      },
    });

    expect(proposals[0]).toMatchObject({
      filePath: null,
      status: 'source_map_incomplete',
      classification: 'source_map_incomplete',
      sourceMapComplete: false,
    });
  });

  it('uses the top-1 candidate only and does not fall through to candidate-2', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: {
        mappings: [{
          ...SOURCE_MAPPING.mappings[0],
          selectedFilePath: 'src/pages/Dashboard.jsx',
          confidence: 0.92,
          candidates: [
            { filePath: 'src/api/base44Client.js', confidence: 0.94, signals: ['platform'] },
            { filePath: 'src/pages/Dashboard.jsx', confidence: 0.9, signals: ['page'] },
          ],
        }],
      },
      fileContentProvider: vi.fn(async () => '<main>safe page</main>'),
    });

    expect(proposals[0]).toMatchObject({
      filePath: 'src/api/base44Client.js',
      status: 'PLATFORM_BOUNDARY_BLOCKED',
      sourceMapSignals: ['platform'],
    });
  });

  it('marks low-confidence mapped files for human review instead of actionable generation', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: {
        mappings: [{
          ...SOURCE_MAPPING.mappings[0],
          confidence: 0.64,
        }],
      },
      fileContentProvider: vi.fn(async () => '<main>safe page</main>'),
    });

    expect(proposals[0]).toMatchObject({
      filePath: 'src/pages/Dashboard.jsx',
      status: 'HUMAN_REVIEW_REQUIRED',
      reason: 'LOW_SOURCE_MAP_CONFIDENCE',
      sourceMapConfidence: 0.64,
      actionable: false,
    });
  });

  it('classifies top-level Base44 imports as platform boundaries after safe content fetch', async () => {
    const proposals = await generateSourceMappedFixProposals({
      findings: [FINDING],
      sourceMapping: SOURCE_MAPPING,
      fileContentProvider: vi.fn(async () => [
        "import { base44 } from '@base44/sdk';",
        'export default function Dashboard() { return null; }',
      ].join('\n')),
    });

    expect(proposals[0]).toMatchObject({
      filePath: 'src/pages/Dashboard.jsx',
      status: 'PLATFORM_BOUNDARY_BLOCKED',
      reason: 'PLATFORM_SDK_IMPORT',
      actionable: false,
    });
  });

  it('exposes a testable boundary classifier', () => {
    expect(classifyFileBoundary('src/components/Button.jsx')).toMatchObject({
      allowed: true,
      status: 'actionable',
    });
    expect(classifyFileBoundary('package.json')).toMatchObject({
      allowed: false,
      status: 'HUMAN_REVIEW_REQUIRED',
      reason: 'PACKAGE_OR_LOCKFILE',
    });
  });
});
