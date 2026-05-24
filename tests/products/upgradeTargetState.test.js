import { describe, expect, it } from 'vitest';
import { isUpgradeReady, normalizeUpgradeTargetState } from '../../src/lib/products/upgradeTargetState.js';
import { applyUpgradeTargetsToProduct, resolveProductUpgradeTargets } from '../../src/lib/products/upgradeTargetResolver.js';

describe('upgrade target state model', () => {
  it('normalizes missing repo and deployment states', () => {
    expect(normalizeUpgradeTargetState({ original_url: 'https://example.com' })).toMatchObject({
      original_url: 'https://example.com',
      upgrade_repo_status: 'missing',
      deployment_status: 'missing',
      user_objectives_met: [],
      user_objectives_pending: [],
    });
  });

  it('derives provisioned/deployed from existing upgrade repo and URL', () => {
    const product = {
      original_repo: 'https://github.com/acme/app',
      upgrade_repo: 'https://github.com/acme/app-v2',
      upgrade_url: 'https://app-v2.vercel.app',
    };
    const state = normalizeUpgradeTargetState(product);
    expect(state.upgrade_repo_status).toBe('provisioned');
    expect(state.deployment_status).toBe('deployed');
    expect(isUpgradeReady(product)).toBe(true);
  });

  it('threads state through upgrade target resolution', () => {
    const product = applyUpgradeTargetsToProduct({
      original_repo: 'https://github.com/acme/app',
      upgrade_repo_url: 'https://github.com/acme/app-v2',
      deployment_url: 'https://app-v2.vercel.app',
    });
    expect(resolveProductUpgradeTargets(product).state).toMatchObject({
      upgrade_repo_status: 'provisioned',
      deployment_status: 'deployed',
    });
    expect(product.deployment_url).toBe('https://app-v2.vercel.app');
  });
});
