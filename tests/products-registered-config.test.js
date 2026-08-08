import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  REGISTERED_PRODUCT_CONFIG,
  findRegisteredProductConfigForUrl,
} from '../src/lib/products/registeredProductConfig.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORTFOLIO_MIGRATION = resolve(__dirname, '../supabase/migrations/0026_product_registry_veu_portfolio.sql');
const REPO_WRITE_URL_MIGRATION = resolve(__dirname, '../supabase/migrations/0027_product_registry_repo_write_urls.sql');
const SAIGE_UPGRADE_URL_MIGRATION = resolve(__dirname, '../supabase/migrations/0030_product_registry_saige_upgrade_url.sql');

describe('registered product config', () => {
  const portfolio = [
    {
      name: 'RelTwin',
      domain: 'reltwin.com',
      repo: 'https://github.com/veu-ai-studio/rel-twin',
      branch: 'main',
      status: 'registered',
    },
    {
      name: 'ReachSMS',
      domain: 'ourcommunitiesai.com',
      repo: 'https://github.com/veu-ai-studio/reachsms',
      branch: 'main',
      status: 'registered',
    },
    {
      name: 'PressAI',
      domain: 'ourpublishingai.com',
      repo: 'https://github.com/veu-ai-studio/press-ai',
      branch: 'main',
      status: 'registered',
    },
    {
      name: 'MyPregLife',
      domain: 'preglife.com',
      repo: 'https://github.com/veu-ai-studio/my-preg-life',
      branch: 'main',
      status: 'registered',
    },
  ];

  it('registers SAIGE with VEU repo write metadata', () => {
    const saige = REGISTERED_PRODUCT_CONFIG.find((product) => product.name === 'SAIGE');
    expect(saige).toMatchObject({
      domain: 'saigeplatform.com',
      aliases: ['saige-v2.vercel.app'],
      repo: 'https://github.com/veu-ai-studio/saige-v2',
      original_repo: 'https://github.com/veu-ai-studio/saige',
      original_url: 'https://saigeplatform.com',
      original_status: 'frozen_read_only',
      upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      upgrade_url: 'https://saige-v2.vercel.app',
      upgrade_status: 'active_upgrade_target',
      upgrade_repo_status: 'provisioned',
      deployment_url: 'https://saige-v2.vercel.app',
      deployment_status: 'deployed',
      upgrade_architecture: 'fork_based_upgrade',
      self_renewal_max_per_day: 1000,
      branch: 'main',
      status: 'registered',
    });
    expect(saige.systemNote).toContain('SAIGE upgrade architecture active');
    expect(saige.systemNote).toContain('github.com/veu-ai-studio/saige is read-only');
    expect(saige.systemNote).toContain('github.com/veu-ai-studio/saige-v2 is the FlowAI upgrade target');
  });

  it('registers FlowAI plus the full five-product portfolio without changing SAIGE', () => {
    expect(REGISTERED_PRODUCT_CONFIG).toHaveLength(6);
    expect(REGISTERED_PRODUCT_CONFIG.find((product) => product.name === 'SAIGE')).toMatchObject({
      domain: 'saigeplatform.com',
      repo: 'https://github.com/veu-ai-studio/saige-v2',
      original_repo: 'https://github.com/veu-ai-studio/saige',
      upgrade_repo: 'https://github.com/veu-ai-studio/saige-v2',
      branch: 'main',
      status: 'registered',
    });
    for (const product of portfolio) {
      expect(REGISTERED_PRODUCT_CONFIG.find((entry) => entry.name === product.name)).toEqual(product);
    }
  });

  it('resolves FlowAI production to its isolated-branch preview target', () => {
    expect(findRegisteredProductConfigForUrl('https://flowai.flowaiplatform.com/landing')).toMatchObject({
      name: 'FlowAI',
      repo: 'https://github.com/victor2081new-cloud/flowai',
      repository_owned_and_allowlisted: true,
      branch: 'codex/p0-external-mvp-recovery',
      branch_policy: 'isolated_nonproduction',
      vercel_project_id: 'prj_GmyoYJ96Xni9Eyz9a0IF8dLjKMEX',
      status: 'registered',
      environment: 'staging',
      supabase_project_ref: 'rsulqkfweaxrhuzjhjrs',
      supabase_url: 'https://rsulqkfweaxrhuzjhjrs.supabase.co',
      deployment_environment: 'preview',
      production_promotion_authorized: false,
      productionPromotionAuthorized: false,
      upgrade_url: null,
      deployment_url: null,
      deployment_status: 'preview_pending',
    });
  });

  it('matches SAIGE URLs by host only', () => {
    expect(findRegisteredProductConfigForUrl('https://saigeplatform.com')?.name).toBe('SAIGE');
    expect(findRegisteredProductConfigForUrl('www.saigeplatform.com')?.name).toBe('SAIGE');
    expect(findRegisteredProductConfigForUrl('https://saige-v2.vercel.app')?.name).toBe('SAIGE');
    expect(findRegisteredProductConfigForUrl('https://example.com')).toBeNull();
  });

  it('resolves all VEU product domains to their repo, branch, and status', () => {
    for (const product of portfolio) {
      expect(findRegisteredProductConfigForUrl(`https://${product.domain}/dashboard`)).toMatchObject({
        repo: product.repo,
        branch: product.branch,
        status: product.status,
      });
      expect(findRegisteredProductConfigForUrl(`www.${product.domain}`)?.name).toBe(product.name);
    }
  });

  it('adds a combined registry migration for the four new products', () => {
    const sql = readFileSync(PORTFOLIO_MIGRATION, 'utf8');
    for (const product of portfolio) {
      expect(sql).toContain(product.repo);
      expect(sql).toContain(`https://${product.domain}`);
      expect(sql).toContain("'main'");
    }
    expect(sql).not.toContain('SAIGE repo registered');
  });

  it('confirms repo write URLs for the full five-product portfolio', () => {
    const sql = readFileSync(REPO_WRITE_URL_MIGRATION, 'utf8');
    const expectedRepos = [
      'https://github.com/veu-ai-studio/saige',
      ...portfolio.map((product) => product.repo),
    ];
    for (const repo of expectedRepos) {
      expect(sql).toContain(repo);
    }
    for (const productId of ['saige', 'reltwin', 'reachsms', 'pressai', 'mypreglife']) {
      expect(sql).toContain(`'${productId}'`);
    }
  });

  it('adds fork-based upgrade target metadata for SAIGE', () => {
    const sql = readFileSync(resolve(__dirname, '../supabase/migrations/0028_product_registry_fork_upgrade_targets.sql'), 'utf8');
    expect(sql).toContain('original_repo');
    expect(sql).toContain('upgrade_repo');
    expect(sql).toContain('https://github.com/veu-ai-studio/saige');
    expect(sql).toContain('https://github.com/veu-ai-studio/saige-v2');
    expect(sql).toContain('frozen_read_only');
    expect(sql).toContain('active_upgrade_target');
  });

  it('backfills the verified SAIGE v2 deployment URL', () => {
    const sql = readFileSync(SAIGE_UPGRADE_URL_MIGRATION, 'utf8');
    expect(sql).toContain('https://saige-v2.vercel.app');
    expect(sql).toContain("deployment_status = 'deployed'");
    expect(sql).toContain("upgrade_repo_status = 'provisioned'");
  });

  it('raises registered product daily run caps for development testing', () => {
    const sql = readFileSync(resolve(__dirname, '../supabase/migrations/0031_product_registry_daily_cap_1000.sql'), 'utf8');
    expect(sql).toContain('set default 1000');
    expect(sql).toContain('self_renewal_max_per_day = 1000');
    expect(sql).toContain('self_renewal_max_per_day < 1000');
  });
});
