import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const vercelConfig = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));

describe('Vercel dynamic API routing', () => {
  it('maps audited colon routes to bracket API handlers before the SPA fallback', () => {
    const rewrites = vercelConfig.rewrites || [];
    const expected = new Map([
      ['/api/orchestrator/status/:run_id', '/api/orchestrator/status/[run_id]?run_id=:run_id'],
      ['/api/audits/super-customer/status/:run_id', '/api/audits/super-customer/status/[run_id]?run_id=:run_id'],
      ['/api/audits/super-customer/results/:run_id', '/api/audits/super-customer/results/[run_id]?run_id=:run_id'],
      ['/api/audits/super-customer/results/:run_id/pdf', '/api/audits/super-customer/results/[run_id]/pdf?run_id=:run_id'],
      ['/api/products/:id', '/api/products/[id]?id=:id'],
      ['/api/configuration/products/:idOrSlug', '/api/configuration/products/[idOrSlug]?idOrSlug=:idOrSlug'],
      ['/api/renewed/:hash', '/api/renewed/[hash]?hash=:hash'],
      ['/api/marketplace/tool-history/:slug', '/api/marketplace/tool-history/[slug]?slug=:slug'],
      ['/api/marketplace/recommend/:rec_id/pdf', '/api/marketplace/recommend/[rec_id]/pdf?rec_id=:rec_id'],
    ]);

    for (const [source, destination] of expected) {
      expect(rewrites).toContainEqual({ source, destination });
    }

    const firstSpaFallback = rewrites.findIndex((rewrite) => rewrite.destination === '/index.html');
    for (const source of expected.keys()) {
      expect(rewrites.findIndex((rewrite) => rewrite.source === source)).toBeLessThan(firstSpaFallback);
    }
  });
});
