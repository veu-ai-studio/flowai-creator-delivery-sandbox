import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/forge/ForgeSectionRenderer.jsx', () => ({
  default: () => null,
  getSectionStatus: () => 'pending',
  ScoreDisplay: () => null,
  SectionStatusIcon: () => null,
}));
vi.mock('@/lib/forge/researchTemplate', () => ({ buildResearchTemplate: () => ({ sections: [] }) }));
vi.mock('@/lib/forge/researchRunner', () => ({ runResearch: async () => ({}) }));
vi.mock('@/lib/forge/forgeStepScorer', () => ({ scoreForgeStep: () => ({ score: 0, correctivePrompts: [] }) }));
vi.mock('@/lib/forge/persistForgeArtifactClient', () => ({
  persistForgeStepArtifactClient: async () => ({ state: 'skipped_auth_required' }),
  persistenceDisplayText: () => 'persisted: skipped_auth_required',
}));
vi.mock('@/lib/forge/durableStageClient', () => ({
  loadDurableStageArtifacts: async () => ({}),
}));
vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ getBearerToken: async () => null }),
}));
vi.mock('@/lib/forge/resolveProductContext', () => ({
  resolveProductContext: (input = {}) => ({
    id: 'saigeplatform',
    name: 'Saigeplatform',
    url: input.url,
    description: input.description ?? '',
    platform: 'web',
  }),
}));
vi.mock('@/lib/tools/ToolIntelligenceService', () => ({ createToolIntelligenceService: () => null }));
vi.mock('@/components/ui/button', () => ({ Button: () => null }));

const { resolveForgeResearchRouteContext } = await import(
  '../../src/pages/ForgeResearchForm.jsx'
);

describe('ForgeResearchForm route context', () => {
  it('uses explicit productId when present', () => {
    expect(resolveForgeResearchRouteContext({
      productId: 'registered-product',
      productName: 'Registered Product',
      productUrl: 'https://example.com',
    })).toMatchObject({
      id: 'registered-product',
      name: 'Registered Product',
      url: 'https://example.com',
      derivedFromUrl: false,
    });
  });

  it('derives product context from URL when productId is absent', () => {
    expect(resolveForgeResearchRouteContext({
      productUrl: 'https://saigeplatform.com',
      productDescription: 'Sustainability intelligence platform',
    })).toMatchObject({
      id: 'saigeplatform',
      name: 'Saigeplatform',
      url: 'https://saigeplatform.com',
      derivedFromUrl: true,
    });
  });
});
