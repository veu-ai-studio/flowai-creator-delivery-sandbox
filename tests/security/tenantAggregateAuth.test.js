import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/_lib/auth.js', () => ({
  requireAuthHard: vi.fn(),
}));
vi.mock('../../api/_lib/db.js', () => ({
  appendAuditEntry: vi.fn(),
  listAuditEntries: vi.fn(async () => []),
  listCostEvents: vi.fn(async () => []),
  costSummary: vi.fn(async () => ({})),
}));
vi.mock('../../api/_lib/products.js', () => ({ stats: vi.fn(() => ({})) }));
vi.mock('../../api/_lib/configRegistry.js', () => ({ listRuns: vi.fn(() => []) }));
vi.mock('../../api/_lib/requestLog.js', () => ({
  withRequestLog: (handler) => handler,
}));

import auditLogHandler from '../../api/audit-log.js';
import costSummaryHandler from '../../api/cost-summary.js';
import governanceHandler from '../../api/governance/dashboard.js';
import superCustomerRunsHandler from '../../api/audits/super-customer/runs.js';
import { requireAuthHard } from '../../api/_lib/auth.js';

function makeRes() {
  let statusCode = 200;
  let body = null;
  return {
    setHeader: vi.fn(),
    status: vi.fn(function status(code) { statusCode = code; return this; }),
    json: vi.fn(function json(data) { body = data; return this; }),
    end: vi.fn(function end() { return this; }),
    get statusCode() { return statusCode; },
    get body() { return body; },
  };
}

const endpoints = [
  ['audit log', auditLogHandler],
  ['cost summary', costSummaryHandler],
  ['governance dashboard', governanceHandler],
  ['super-customer run history', superCustomerRunsHandler],
];

describe('tenant aggregate endpoints enforce verified membership', () => {
  beforeEach(() => vi.clearAllMocks());

  for (const [name, handler] of endpoints) {
    it(`rejects anonymous access to ${name} before reading request scope`, async () => {
      requireAuthHard.mockImplementationOnce(async (_req, res) => {
        res.status(401).json({ error: 'Authentication required', authMode: 'anonymous' });
        return null;
      });
      const res = makeRes();
      await handler({
        method: 'GET',
        headers: {},
        query: { orgId: 'attacker-selected-org', org_id: 'attacker-selected-org' },
      }, res);
      expect(res.statusCode).toBe(401);
      expect(res.body).toEqual({ error: 'Authentication required', authMode: 'anonymous' });
      expect(requireAuthHard).toHaveBeenCalledOnce();
    });
  }
});
