import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireAuthHard: vi.fn(),
}));

vi.mock('../../api/_lib/auth.js', () => ({
  requireAuthHard: mocks.requireAuthHard,
}));

import runsHandler from '../../api/configuration/runs.js';
import objectivesHandler from '../../api/configuration/objectives.js';
import productsHandler from '../../api/configuration/products.js';
import productHandler from '../../api/configuration/products/[idOrSlug].js';
import cloneHandler from '../../api/configuration/clone.js';
import describeHandler from '../../api/configuration/describe.js';
import synthesizeHandler from '../../api/configuration/synthesize.js';

function makeRes() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

const routes = [
  ['runs read', runsHandler, { method: 'GET', query: {}, headers: {} }],
  ['objectives read', objectivesHandler, { method: 'GET', query: {}, headers: {} }],
  ['objectives write', objectivesHandler, { method: 'POST', query: {}, body: {}, headers: {} }],
  ['objectives delete', objectivesHandler, { method: 'DELETE', query: {}, body: {}, headers: {} }],
  ['products read', productsHandler, { method: 'GET', query: {}, headers: {} }],
  ['products write', productsHandler, { method: 'POST', query: {}, body: {}, headers: {} }],
  ['product read', productHandler, { method: 'GET', query: { idOrSlug: 'prod_test' }, headers: {} }],
  ['product update', productHandler, { method: 'PATCH', query: { idOrSlug: 'prod_test' }, body: {}, headers: {} }],
  ['product delete', productHandler, { method: 'DELETE', query: { idOrSlug: 'prod_test' }, headers: {} }],
  ['product audit', productHandler, { method: 'POST', query: { idOrSlug: 'prod_test', action: 'audit' }, body: {}, headers: {} }],
  ['clone execute', cloneHandler, { method: 'POST', query: {}, body: {}, headers: {} }],
  ['describe execute', describeHandler, { method: 'POST', query: {}, body: {}, headers: {} }],
  ['synthesize execute', synthesizeHandler, { method: 'POST', query: {}, body: {}, headers: {} }],
];

describe('anonymous configuration routes fail closed', () => {
  beforeEach(() => {
    mocks.requireAuthHard.mockReset();
    mocks.requireAuthHard.mockImplementation(async (_req, res) => {
      res.status(401).json({ error: 'Authentication required', authMode: 'anonymous' });
      return null;
    });
  });

  it.each(routes)('%s returns 401 before validation, reads, or mutation', async (_name, handler, req) => {
    const res = makeRes();
    await handler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Authentication required', authMode: 'anonymous' });
    expect(mocks.requireAuthHard).toHaveBeenCalledOnce();
  });
});
