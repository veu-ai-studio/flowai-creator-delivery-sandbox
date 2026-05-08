import { describe, it, expect } from 'vitest';
import { BaseAgent, AUTHORITY, FLOWAI_ONLY_AGENTS } from '../src/lib/agents/BaseAgent.js';

const stubDeps = {
  logger: { info() {}, warn() {}, error() {} },
  messageBus: { publish: async () => {}, subscribe: async () => {} },
  auditLog: { write: async () => {} },
  clock: { now: () => 1700000000000 },
  productScope: 'flowai',
  environment: 'prod',
};

function makeAgentClass({ id, authority }) {
  return class extends BaseAgent {
    static charter() {
      return {
        id,
        name: `Agent${id}`,
        flowAiOnly: FLOWAI_ONLY_AGENTS.has(id),
        authority,
        requiredCredentials: [],
        marketplaceTools: [],
        consumes: [],
        produces: [],
        escalationPolicy: 'test',
      };
    }
    async plan() { return { summary: 'noop', authorityNeeded: [], sideEffects: [] }; }
    async act() { return { outcome: 'ok' }; }
  };
}

describe('BaseAgent.guard authority enforcement', () => {
  describe('RECOMMEND_ONLY', () => {
    it('rejects any plan with sideEffects', () => {
      const Cls = makeAgentClass({ id: 11, authority: [AUTHORITY.RECOMMEND_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [], sideEffects: [{ kind: 'write' }] }))
        .toThrow(/RECOMMEND_ONLY; plan declared sideEffects=1/);
    });

    it('accepts a plan with zero sideEffects', () => {
      const Cls = makeAgentClass({ id: 11, authority: [AUTHORITY.RECOMMEND_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [], sideEffects: [] })).not.toThrow();
    });

    it('rejects a plan that requests escalated authority', () => {
      const Cls = makeAgentClass({ id: 11, authority: [AUTHORITY.RECOMMEND_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.AUTO_WRITE_INTERNAL], sideEffects: [] }))
        .toThrow(/charter only grants/);
    });
  });

  describe('DRAFT_ONLY', () => {
    it('accepts plans needing DRAFT_ONLY', () => {
      const Cls = makeAgentClass({ id: 9, authority: [AUTHORITY.DRAFT_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.DRAFT_ONLY], sideEffects: [] })).not.toThrow();
    });

    it('rejects plans needing AUTO_WRITE_INTERNAL', () => {
      const Cls = makeAgentClass({ id: 9, authority: [AUTHORITY.DRAFT_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.AUTO_WRITE_INTERNAL], sideEffects: [] }))
        .toThrow(/auto_write_internal/);
    });
  });

  describe('AUTO_CONTAIN_KNOWN', () => {
    it('accepts plans within scope', () => {
      const Cls = makeAgentClass({ id: 13, authority: [AUTHORITY.AUTO_CONTAIN_KNOWN] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.AUTO_CONTAIN_KNOWN], sideEffects: [{ kind: 'block' }] }))
        .not.toThrow();
    });

    it('rejects request for REQUIRES_HUMAN_GATE', () => {
      const Cls = makeAgentClass({ id: 13, authority: [AUTHORITY.AUTO_CONTAIN_KNOWN] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.REQUIRES_HUMAN_GATE], sideEffects: [] }))
        .toThrow(/requires_human_gate/);
    });
  });

  describe('AUTO_WRITE_INTERNAL', () => {
    it('accepts plans needing AUTO_WRITE_INTERNAL', () => {
      const Cls = makeAgentClass({ id: 3, authority: [AUTHORITY.AUTO_WRITE_INTERNAL] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.AUTO_WRITE_INTERNAL], sideEffects: [{ kind: 'patch' }] }))
        .not.toThrow();
    });

    it('rejects unknown authority strings', () => {
      const Cls = makeAgentClass({ id: 3, authority: [AUTHORITY.AUTO_WRITE_INTERNAL] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: ['become_root'], sideEffects: [] }))
        .toThrow(/become_root/);
    });
  });

  describe('REQUIRES_HUMAN_GATE', () => {
    it('accepts plans needing REQUIRES_HUMAN_GATE', () => {
      const Cls = makeAgentClass({ id: 1, authority: [AUTHORITY.REQUIRES_HUMAN_GATE] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.REQUIRES_HUMAN_GATE], sideEffects: [{ kind: 'gate' }] }))
        .not.toThrow();
    });
  });

  describe('multi-authority charters', () => {
    it('accepts any subset of declared authority', () => {
      const Cls = makeAgentClass({
        id: 2,
        authority: [AUTHORITY.AUTO_WRITE_INTERNAL, AUTHORITY.DRAFT_ONLY],
      });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.DRAFT_ONLY], sideEffects: [] })).not.toThrow();
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.AUTO_WRITE_INTERNAL], sideEffects: [{ kind: 'patch' }] }))
        .not.toThrow();
    });

    it('rejects authority outside the declared set even if multiple are declared', () => {
      const Cls = makeAgentClass({
        id: 2,
        authority: [AUTHORITY.AUTO_WRITE_INTERNAL, AUTHORITY.DRAFT_ONLY],
      });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [AUTHORITY.REQUIRES_HUMAN_GATE], sideEffects: [] }))
        .toThrow(/requires_human_gate/);
    });

    it('RECOMMEND_ONLY-only sideEffect rule does not fire when other authority is declared', () => {
      const Cls = makeAgentClass({
        id: 11,
        authority: [AUTHORITY.RECOMMEND_ONLY, AUTHORITY.DRAFT_ONLY],
      });
      const a = new Cls(stubDeps);
      expect(() => a.guard({
        authorityNeeded: [AUTHORITY.DRAFT_ONLY],
        sideEffects: [{ kind: 'draft' }],
      })).not.toThrow();
    });
  });

  describe('plan defaults', () => {
    it('treats missing authorityNeeded as empty array', () => {
      const Cls = makeAgentClass({ id: 11, authority: [AUTHORITY.RECOMMEND_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ sideEffects: [] })).not.toThrow();
    });

    it('treats missing sideEffects as empty for RECOMMEND_ONLY', () => {
      const Cls = makeAgentClass({ id: 11, authority: [AUTHORITY.RECOMMEND_ONLY] });
      const a = new Cls(stubDeps);
      expect(() => a.guard({ authorityNeeded: [] })).not.toThrow();
    });
  });
});
