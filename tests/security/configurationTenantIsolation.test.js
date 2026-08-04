import { afterEach, describe, expect, it } from 'vitest';
import {
  deleteObjective,
  getObjective,
  upsertObjective,
} from '../../api/_lib/configRegistry.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const created = [];

afterEach(() => {
  for (const [id, orgId] of created.splice(0)) deleteObjective(id, { orgId });
});

describe('configuration tenant isolation', () => {
  it('does not reveal or mutate an objective owned by another tenant', () => {
    const ownerOrg = 'org_owner_isolation';
    const attackerOrg = 'org_attacker_isolation';
    const original = upsertObjective({
      product_id: 'prod_owner',
      type: 'goal',
      value: 'owner-only value',
    }, { orgId: ownerOrg });
    created.push([original.id, ownerOrg]);

    expect(getObjective(original.id, { orgId: attackerOrg })).toBeNull();
    expect(deleteObjective(original.id, { orgId: attackerOrg })).toBe(false);
    expect(upsertObjective({
      id: original.id,
      product_id: 'prod_attacker',
      type: 'goal',
      value: 'attempted takeover',
      org_id: attackerOrg,
    }, { orgId: attackerOrg })).toBeNull();

    expect(getObjective(original.id, { orgId: ownerOrg })).toMatchObject({
      org_id: ownerOrg,
      product_id: 'prod_owner',
      value: 'owner-only value',
    });
  });

  it('preserves objective ownership when an owner update includes a forged org_id', () => {
    const ownerOrg = 'org_owner_override';
    const original = upsertObjective({
      product_id: 'prod_owner',
      type: 'goal',
      value: 'before',
    }, { orgId: ownerOrg });
    created.push([original.id, ownerOrg]);

    const updated = upsertObjective({
      id: original.id,
      product_id: 'prod_owner',
      type: 'goal',
      value: 'after',
      org_id: 'org_forged',
    }, { orgId: ownerOrg });

    expect(updated).toMatchObject({ org_id: ownerOrg, value: 'after' });
  });

  it('binds orchestrator dispatch, polling, and agent context to authCtx.orgId', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(resolve(here, '..', '..', 'api/orchestrator/run.js'), 'utf8');
    expect(source).toContain('const authCtx = await requireAuthHard(req, res)');
    expect(source).toContain('const orgId = authCtx.orgId');
    expect(source).not.toContain('resolveOrgId(req)');
    expect(source).not.toMatch(/payload\.org_id\s*\|\|/);
    expect(source).toContain('ctx: { ...(payload.ctx || {}), orgId, productId }');
  });
});
