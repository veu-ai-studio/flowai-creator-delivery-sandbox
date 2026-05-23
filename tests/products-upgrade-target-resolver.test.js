import { describe, expect, it } from 'vitest';

import { applyUpgradeTargetsToProduct, resolveProductUpgradeTargets } from '../src/lib/products/upgradeTargetResolver.js';

describe('upgrade target resolver', () => {
  it('routes writes to the upgrade repo while preserving original rollback target', () => {
    const targets = resolveProductUpgradeTargets({
      original_repo: 'https://github.com/veu-ai-studio/saige',
      original_url: 'https://saige-platform.vercel.app',
      upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      upgrade_url: 'https://saigeplatform.com',
      upgrade_branch: 'main',
    });

    expect(targets).toMatchObject({
      architecture: 'fork_based_upgrade',
      originalRepo: 'https://github.com/veu-ai-studio/saige',
      originalUrl: 'https://saige-platform.vercel.app',
      upgradeRepo: 'https://github.com/veu-ai-studio/saige-v2',
      upgradeUrl: 'https://saigeplatform.com',
      upgradeBranch: 'main',
      writesOriginalRepo: false,
      originalReadOnly: true,
      rollbackTarget: 'https://github.com/veu-ai-studio/saige',
    });
  });

  it('rewrites product github_repo_url to the active upgrade repo', () => {
    const product = applyUpgradeTargetsToProduct({
      github_repo_url: 'https://github.com/veu-ai-studio/saige',
      self_renewal_branch: 'main',
      upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      original_repo: 'https://github.com/veu-ai-studio/saige',
    });

    expect(product.github_repo_url).toBe('https://github.com/veu-ai-studio/saige-v2');
    expect(product.original_repo).toBe('https://github.com/veu-ai-studio/saige');
    expect(product.rollback_repo).toBe('https://github.com/veu-ai-studio/saige');
    expect(product.original_read_only).toBe(true);
    expect(product.__upgradeTargets.writesOriginalRepo).toBe(false);
  });

  it('falls back to main when branch fields are empty strings', () => {
    const product = applyUpgradeTargetsToProduct({
      github_repo_url: 'https://github.com/veu-ai-studio/saige',
      self_renewal_branch: '',
      upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      upgrade_branch: '',
    });

    expect(product.self_renewal_branch).toBe('main');
    expect(product.__upgradeTargets.upgradeBranch).toBe('main');
  });
});
