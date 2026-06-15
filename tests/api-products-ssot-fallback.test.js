import { describe, expect, it } from 'vitest';
import { __internals } from '../api/_lib/db.js';

const {
  isUuidString,
  latestScoreFromProductSsot,
  mapProductRegistryRowToProduct,
  nameFromProductId,
} = __internals;

describe('ProductSSOT-backed product registry fallback', () => {
  it('treats text org ids as registry ids, not products.org_id UUID filters', () => {
    expect(isUuidString('veu-ai-studio')).toBe(false);
    expect(isUuidString('c2e4f66a-3a96-4d2a-9c58-2a8b513d82e7')).toBe(true);
  });

  it('derives a readable product name without hardcoding portfolio products', () => {
    expect(nameFromProductId('saige')).toBe('Saige');
    expect(nameFromProductId('new-global-tool')).toBe('New Global Tool');
  });

  it('uses the newest score-bearing ProductSSOT governance record only', () => {
    const result = latestScoreFromProductSsot({
      governance_record: [
        { recordedAt: '2026-06-01T00:00:00Z', finalScore: 71 },
        { recordedAt: '2026-06-02T00:00:00Z', artifact: { result: { currentScore: 78 } } },
        { recordedAt: '2026-06-03T00:00:00Z', artifact: { status: 'no-score' } },
      ],
    });

    expect(result).toEqual({
      score: 78,
      recordedAt: '2026-06-02T00:00:00Z',
    });
  });

  it('maps product_registry plus ProductSSOT into product card fields', () => {
    const mapped = mapProductRegistryRowToProduct(
      {
        product_id: 'saige',
        org_id: 'veu-ai-studio',
        product_url: 'https://saigeplatform.com',
        original_repo: 'https://github.com/veu-ai-studio/saige',
        upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
        deployment_url: 'https://saige-v2.vercel.app',
        self_renewal_enabled: true,
        updated_at: '2026-06-14T10:00:00Z',
      },
      {
        identity_block: { productName: 'SAIGE', productUrl: 'https://saigeplatform.com' },
        build_brief: { normalizedConcept: 'Sustainability reporting for institutions' },
        governance_record: [{ completedAt: '2026-06-14T11:00:00Z', finalScore: 78 }],
        updated_at: '2026-06-14T11:05:00Z',
      },
    );

    expect(mapped).toMatchObject({
      id: 'saige',
      org_id: 'veu-ai-studio',
      name: 'SAIGE',
      slug: 'saige',
      live_url: 'https://saigeplatform.com',
      description: 'Sustainability reporting for institutions',
      last_audit_score: 78,
      upgrade_repo_url: 'https://github.com/veu-ai-studio/saige-v2',
      deployment_url: 'https://saige-v2.vercel.app',
      source: 'product_registry',
    });
  });

  it('does not fabricate score evidence when ProductSSOT has no score', () => {
    const mapped = mapProductRegistryRowToProduct(
      { product_id: 'unknown-product', product_url: 'https://example.com' },
      { governance_record: [{ artifact: { status: 'complete' } }] },
    );

    expect(mapped.last_audit_score).toBeNull();
    expect(mapped.name).toBe('Unknown Product');
  });
});
