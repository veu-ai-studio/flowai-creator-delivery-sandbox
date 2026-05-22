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

  it('registers SAIGE with source mapping limitation metadata', () => {
    const saige = REGISTERED_PRODUCT_CONFIG.find((product) => product.name === 'SAIGE');
    expect(saige).toMatchObject({
      domain: 'saigeplatform.com',
      repo: 'https://github.com/victor2081new-cloud/saige',
      branch: 'main',
      status: 'registered',
      note: 'repo contains zip only - source mapping limited until codebase extracted',
    });
    expect(saige.systemNote).toContain('SAIGE repo registered');
    expect(saige.systemNote).toContain('github.com/victor2081new-cloud/saige (main)');
    expect(saige.systemNote).toContain('U5 fix generation enabled');
  });

  it('registers the full five-product portfolio without changing SAIGE', () => {
    expect(REGISTERED_PRODUCT_CONFIG).toHaveLength(5);
    expect(REGISTERED_PRODUCT_CONFIG.find((product) => product.name === 'SAIGE')).toMatchObject({
      domain: 'saigeplatform.com',
      repo: 'https://github.com/victor2081new-cloud/saige',
      branch: 'main',
      status: 'registered',
      note: 'repo contains zip only - source mapping limited until codebase extracted',
    });
    for (const product of portfolio) {
      expect(REGISTERED_PRODUCT_CONFIG.find((entry) => entry.name === product.name)).toEqual(product);
    }
  });

  it('matches SAIGE URLs by host only', () => {
    expect(findRegisteredProductConfigForUrl('https://saigeplatform.com')?.name).toBe('SAIGE');
    expect(findRegisteredProductConfigForUrl('www.saigeplatform.com')?.name).toBe('SAIGE');
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
});
