import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { getAgent } from '../../src/lib/agents/_registry.ts';
import { MessageBus } from '../../src/lib/agents/MessageBus.ts';
import { Agent22FinanceProcurement } from '../../src/lib/agents/agents/Agent22FinanceProcurement.js';
import { Agent23HrCompensation } from '../../src/lib/agents/agents/Agent23HrCompensation.js';
import { Agent24InformationSecurity } from '../../src/lib/agents/agents/Agent24InformationSecurity.js';
import { Agent25CustomerCare } from '../../src/lib/agents/agents/Agent25CustomerCare.js';
import { Agent26LegalCommunications } from '../../src/lib/agents/agents/Agent26LegalCommunications.js';

const CASES = Object.freeze([
  {
    id: 22,
    label: 'Agent #22 Finance & Procurement',
    Class: Agent22FinanceProcurement,
    input: {
      kind: 'finance.procurement.request',
      runId: 'run-22',
      financeScope: 'launch-budget',
      estimatedCost: 2500,
      vendors: [{ id: 'vendor-a', risk: 'low' }],
    },
    blockedInput: {
      kind: 'finance.procurement.request',
      runId: 'run-22-block',
      requestedAction: 'approve_spend',
      autoPurchase: true,
    },
    blockedKey: 'approvalBlocked',
  },
  {
    id: 23,
    label: 'Agent #23 HR & Compensation',
    Class: Agent23HrCompensation,
    input: {
      kind: 'hr.compensation.request',
      runId: 'run-23',
      teamScope: 'support-team',
      roleFamily: 'operator',
      compensationBands: [{ level: 'L2', min: 1, max: 2 }],
    },
    blockedInput: {
      kind: 'hr.compensation.request',
      runId: 'run-23-block',
      namedIndividuals: ['person-a'],
      autoAdjustPay: true,
    },
    blockedKey: 'compensationDecisionBlocked',
  },
  {
    id: 24,
    label: 'Agent #24 Information Security',
    Class: Agent24InformationSecurity,
    input: {
      kind: 'information.security.request',
      runId: 'run-24',
      assetScope: 'web-surface',
      findings: [{ severity: 'medium', category: 'authz-review' }],
    },
    blockedInput: {
      kind: 'information.security.request',
      runId: 'run-24-block',
      activeScan: true,
      rotateSecrets: true,
      changeAccessControls: true,
    },
    blockedKey: 'gatedSecurityActionBlocked',
  },
  {
    id: 25,
    label: 'Agent #25 Customer Care',
    Class: Agent25CustomerCare,
    input: {
      kind: 'customer.care.request',
      runId: 'run-25',
      supportScope: 'onboarding',
      channel: 'ticket',
      issues: [{ category: 'handoff', count: 2 }],
    },
    blockedInput: {
      kind: 'customer.care.request',
      runId: 'run-25-block',
      contactCustomer: true,
      closeTicket: true,
      issueRefund: true,
    },
    blockedKey: 'directActionBlocked',
  },
  {
    id: 26,
    label: 'Agent #26 Legal & Communications',
    Class: Agent26LegalCommunications,
    input: {
      kind: 'legal.communications.request',
      runId: 'run-26',
      jurisdiction: 'generic-jurisdiction',
      audience: 'public',
      claims: [{ claim: 'capability statement', evidence: 'operator supplied' }],
    },
    blockedInput: {
      kind: 'legal.communications.request',
      runId: 'run-26-block',
      sendCommunication: true,
      fileLegalNotice: true,
      approvePublicStatement: true,
    },
    blockedKey: 'bindingActionBlocked',
  },
]);

function makeDeps(overrides = {}) {
  const clock = { now: () => 1_700_000_000_000 };
  const auditLog = { write: vi.fn(async () => {}) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return {
    deps: {
      logger,
      messageBus: new MessageBus({ clock: clock.now }),
      auditLog,
      clock,
      productScope: 'tenant-a',
      environment: 'demo',
      ...overrides,
    },
  };
}

describe('P11-C Agents #22-#26 - registry conformance', () => {
  for (const entry of CASES) {
    it(`${entry.label} imports and derives recommend-only charter`, () => {
      const charter = entry.Class.charter();
      const registry = getAgent(entry.id);
      expect(entry.Class.charterId).toBe(entry.id);
      expect(charter).toMatchObject({
        id: entry.id,
        name: registry.name,
        flowAiOnly: false,
        authority: registry.authority,
        consumes: registry.consumes,
        produces: registry.produces,
      });
      expect(charter.authority).toEqual(['recommend_only']);
      expect(charter.consumes).toEqual([]);
      expect(charter.produces).toEqual([]);
    });
  }
});

describe('P11-C Agents #22-#26 - recommend-only advisory contracts', () => {
  for (const entry of CASES) {
    describe(entry.label, () => {
      it('accepts product-agnostic tenant scope', () => {
        const { deps } = makeDeps();
        expect(() => new entry.Class(deps)).not.toThrow();
      });

      it('returns a three-rule advisory plan without canonical topics', async () => {
        const { deps } = makeDeps();
        const agent = new entry.Class(deps);
        const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });

        expect(plan.authorityNeeded).toEqual(['recommend_only']);
        expect(plan.sideEffects).toEqual([]);
        expect(plan.signals).toHaveLength(3);
        expect(new Set(plan.signals.map((s) => s.rule)).size).toBe(3);
        expect(plan.proposed.emit).toEqual([]);
        expect(plan.advisoryPayload).toMatchObject({ advisoryOnly: true, runId: entry.input.runId });
      });

      it('blocks requests for authority beyond recommendation', async () => {
        const { deps } = makeDeps();
        const agent = new entry.Class(deps);
        const plan = await agent.plan({ input: entry.blockedInput, runId: entry.blockedInput.runId });

        expect(plan.outcome).toBe('material_alert');
        expect(plan.sideEffects).toEqual([]);
        expect(plan.advisoryPayload[entry.blockedKey]).toBe(true);
        expect(plan.signals.some((s) => s.status === 'urgent')).toBe(true);
      });

      it('act() returns no publish envelopes because no topics are declared', async () => {
        const { deps } = makeDeps();
        const agent = new entry.Class(deps);
        const plan = await agent.plan({ input: entry.input, runId: entry.input.runId });
        const result = await agent.act({ input: entry.input }, plan);

        expect(result.sideEffects).toEqual([]);
        expect(result.published).toEqual([]);
        expect(result.publishEnvelopes).toEqual([]);
      });
    });
  }
});

describe('P11-C Agents #22-#26 - product-agnostic source discipline', () => {
  it('does not hardcode reference product names in new agent source or tests', () => {
    const files = [
      'src/lib/agents/agents/Agent22FinanceProcurement.js',
      'src/lib/agents/agents/Agent23HrCompensation.js',
      'src/lib/agents/agents/Agent24InformationSecurity.js',
      'src/lib/agents/agents/Agent25CustomerCare.js',
      'src/lib/agents/agents/Agent26LegalCommunications.js',
      'tests/agents/p11-c-agents-22-26.test.js',
    ];
    const forbidden = [
      'sai' + 'ge',
      'mypreg' + 'life',
      'press' + 'ai',
      'reach' + 'sms',
      'rel' + 'twin',
      'veu-ai-' + 'studio',
      'flowai-' + 'dun',
    ];
    for (const file of files) {
      const text = fs.readFileSync(path.join(process.cwd(), file), 'utf8').toLowerCase();
      for (const term of forbidden) {
        expect(text.includes(term), `${file} includes ${term}`).toBe(false);
      }
    }
  });
});
