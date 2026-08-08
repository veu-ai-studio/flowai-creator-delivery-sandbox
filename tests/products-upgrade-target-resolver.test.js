import { describe, expect, it } from 'vitest';

import { applyUpgradeTargetsToProduct, resolveProductUpgradeTargets } from '../src/lib/products/upgradeTargetResolver.js';

describe('upgrade target resolver', () => {
  it('routes writes to the upgrade repo while preserving original rollback target', () => {
    const targets = resolveProductUpgradeTargets({
      original_repo: 'https://github.com/veu-ai-studio/saige',
      original_url: 'https://saige-platform.vercel.app',
      upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      upgrade_url: 'https://saige-v2.vercel.app',
      deployment_status: 'deployed',
      upgrade_branch: 'main',
    });

    expect(targets).toMatchObject({
      architecture: 'fork_based_upgrade',
      originalRepo: 'https://github.com/veu-ai-studio/saige',
      originalUrl: 'https://saige-platform.vercel.app',
      upgradeRepo: 'https://github.com/veu-ai-studio/saige-v2',
      upgradeUrl: 'https://saige-v2.vercel.app',
      upgradeBranch: 'main',
      upgradeRepoExplicit: true,
      upgradeRepoRequired: true,
      writesOriginalRepo: false,
      originalReadOnly: true,
      rollbackTarget: 'https://github.com/veu-ai-studio/saige',
      writeSafety: {
        ok: true,
        code: null,
        reason: null,
      },
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

  it('flags explicit read-only products with no separate upgrade repo before writes', () => {
    const targets = resolveProductUpgradeTargets({
      product_id: 'reltwin',
      original_repo: 'https://github.com/veu-ai-studio/rel-twin',
      upgrade_repo: 'https://github.com/veu-ai-studio/rel-twin',
      original_status: 'read_only_baseline',
      upgrade_architecture: 'fork_based_upgrade',
    });

    expect(targets).toMatchObject({
      upgradeRepoExplicit: true,
      upgradeRepoRequired: true,
      writesOriginalRepo: true,
      writeSafety: {
        ok: false,
        code: 'UPGRADE_TARGET_UNSAFE',
        reason: 'upgrade_repo_matches_original_repo',
      },
    });
  });

  it('allows legacy single-repo products to keep existing behavior until explicitly fork-marked', () => {
    const targets = resolveProductUpgradeTargets({
      product_id: 'legacy',
      github_repo_url: 'https://github.com/veu-ai-studio/legacy-product',
    });

    expect(targets).toMatchObject({
      upgradeRepo: 'https://github.com/veu-ai-studio/legacy-product',
      upgradeRepoExplicit: false,
      upgradeRepoRequired: false,
      writesOriginalRepo: true,
      writeSafety: {
        ok: true,
        code: null,
        reason: null,
      },
    });
  });

  it('allows an explicitly owned same-repo target only on an isolated non-production branch with promotion denied', () => {
    const repo = 'https://github.com/victor2081new-cloud/flowai';
    const targets = resolveProductUpgradeTargets({
      product_id: 'flowai', original_repo: repo, upgrade_repo: repo,
      repository_owned_and_allowlisted: true,
      branch_policy: 'isolated_nonproduction',
      productionPromotionAuthorized: false,
    });
    expect(targets).toMatchObject({
      writesOriginalRepo: true,
      authorizedIsolatedSameRepo: true,
      writeSafety: { ok: true, code: null, reason: null },
    });
  });

  it.each([
    ['not allowlisted', { repository_owned_and_allowlisted: false, branch_policy: 'isolated_nonproduction', productionPromotionAuthorized: false }],
    ['not isolated', { repository_owned_and_allowlisted: true, branch_policy: 'main', productionPromotionAuthorized: false }],
    ['promotion authorized', { repository_owned_and_allowlisted: true, branch_policy: 'isolated_nonproduction', productionPromotionAuthorized: true }],
  ])('keeps the same-repo safety block when %s', (_label, flags) => {
    const repo = 'https://github.com/example/product';
    const targets = resolveProductUpgradeTargets({ original_repo: repo, upgrade_repo: repo, ...flags });
    expect(targets).toMatchObject({
      authorizedIsolatedSameRepo: false,
      writeSafety: { ok: false, code: 'UPGRADE_TARGET_UNSAFE' },
    });
  });
});
