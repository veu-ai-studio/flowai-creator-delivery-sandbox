import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');

const routes = [
  ['runs', 'api/configuration/runs.js'],
  ['objectives', 'api/configuration/objectives.js'],
  ['products collection', 'api/configuration/products.js'],
  ['product detail', 'api/configuration/products/[idOrSlug].js'],
  ['clone', 'api/configuration/clone.js'],
  ['describe', 'api/configuration/describe.js'],
  ['synthesize', 'api/configuration/synthesize.js'],
];

describe('configuration route family hard authentication', () => {
  it.each(routes)('%s hard-gates before tenant data or execution', (_name, path) => {
    const source = readFileSync(resolve(root, path), 'utf8');
    const gate = source.indexOf('await requireAuthHard(req, res)');
    expect(source).toContain("requireAuthHard");
    expect(gate).toBeGreaterThan(-1);

    const guardedReturn = source.indexOf('if (!authCtx) return', gate);
    const tenantBinding = source.indexOf('const orgId = authCtx.orgId', gate);
    expect(guardedReturn).toBeGreaterThan(gate);
    expect(tenantBinding).toBeGreaterThan(guardedReturn);
  });

  it.each(routes)('%s handler binds tenant only from verified auth context', (_name, path) => {
    const source = readFileSync(resolve(root, path), 'utf8');
    const handlerStart = source.lastIndexOf('Handler(req, res)');
    const handler = source.slice(handlerStart > -1 ? handlerStart : source.indexOf('handler(req, res)'));
    expect(handler).toContain('const orgId = authCtx.orgId');
    expect(handler).not.toMatch(/resolveOrgId\(req\)\s*\|\|\s*DEFAULT_ORG/);
  });

  it('product collection cannot let a caller-controlled org override membership', () => {
    const source = readFileSync(resolve(root, 'api/configuration/products.js'), 'utf8');
    expect(source).not.toContain('resolveOrgId(req) || authCtx.orgId');
    expect(source).toContain('const orgId = authCtx.orgId');
  });
});
