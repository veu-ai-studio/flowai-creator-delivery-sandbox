import { describe, it, expect } from 'vitest';
import {
  AGENT_REGISTRY,
  getAgent,
  listAgentsByMode,
} from '../src/lib/agents/_registry.ts';

describe('AGENT_REGISTRY — completeness', () => {
  it('contains exactly 26 agents', () => {
    expect(AGENT_REGISTRY).toHaveLength(26);
  });

  it('agent ids 1..26 are all present, exactly once each', () => {
    const ids = AGENT_REGISTRY.map((a) => a.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 26 }, (_, i) => i + 1));
  });

  it('Agent #26 has the reserved Legal & Communications charter shape', () => {
    const agent = getAgent(26);
    expect(agent).toBeDefined();
    for (const field of ['id', 'name', 'mode', 'authority', 'requiredCredentials', 'consumes', 'produces', 'escalationPolicy']) {
      expect(agent[field]).toBeDefined();
    }
    expect(agent.name).toBe('Legal & Communications');
    expect(agent.mode).toBe('step-owner');
    expect(agent.authority).toEqual(['recommend_only']);
    expect(agent.requiredCredentials).toEqual([]);
    expect(agent.consumes).toEqual([]);
    expect(agent.produces).toEqual([]);
  });

  it('registry validator passes at module load', () => {
    expect(AGENT_REGISTRY.map((agent) => agent.id)).toContain(26);
  });

  it('every agent has a non-empty name', () => {
    for (const a of AGENT_REGISTRY) {
      expect(typeof a.name).toBe('string');
      expect(a.name.length).toBeGreaterThan(0);
    }
  });

  it('every agent has a valid mode', () => {
    const modes = new Set(['always-on', 'step-owner', 'cross-step']);
    for (const a of AGENT_REGISTRY) {
      expect(modes.has(a.mode)).toBe(true);
    }
  });

  it('every agent declares non-empty authority drawn from the canonical level set', () => {
    // Per CANONICAL_REFERENCE §15.1: most agents ship at recommend_only,
    // but Agent #21 (Aggressive Crawl Conductor, ENTRY 006 promotion
    // 2026-05-16) is canonically granted the dual+gate triple
    // [recommend_only, auto_write_internal, requires_human_gate] — the
    // first agents with elevated charter authority. The 5 levels below
    // are the canonical BaseAgent set.
    const VALID_LEVELS = new Set([
      'recommend_only',
      'draft_only',
      'auto_contain_known',
      'auto_write_internal',
      'requires_human_gate',
    ]);
    for (const a of AGENT_REGISTRY) {
      expect(Array.isArray(a.authority)).toBe(true);
      expect(a.authority.length).toBeGreaterThan(0);
      for (const lvl of a.authority) {
        expect(VALID_LEVELS.has(lvl)).toBe(true);
      }
    }
  });

  it('every elevated-authority agent also declares recommend_only as the default-safe level', () => {
    // Defense-in-depth: any agent whose charter grants
    // auto_write_internal or requires_human_gate must ALSO declare
    // recommend_only so the dormant-safe default path remains. This
    // mirrors the Phase 1 graduation rule from Panel ruling 30e5edb
    // (Agent #21).
    for (const a of AGENT_REGISTRY) {
      const hasElevated =
        a.authority.includes('auto_write_internal') ||
        a.authority.includes('requires_human_gate');
      if (hasElevated) {
        expect(a.authority).toContain('recommend_only');
      }
    }
  });

  it('every agent declares array fields (consumes/produces/requiredCredentials) — even if empty', () => {
    for (const a of AGENT_REGISTRY) {
      expect(Array.isArray(a.consumes)).toBe(true);
      expect(Array.isArray(a.produces)).toBe(true);
      expect(Array.isArray(a.requiredCredentials)).toBe(true);
    }
  });

  it('every agent has a non-empty escalationPolicy string', () => {
    for (const a of AGENT_REGISTRY) {
      expect(typeof a.escalationPolicy).toBe('string');
      expect(a.escalationPolicy.length).toBeGreaterThan(0);
    }
  });
});

describe('AGENT_REGISTRY — immutability', () => {
  it('the registry array is frozen', () => {
    expect(Object.isFrozen(AGENT_REGISTRY)).toBe(true);
  });

  it('every agent record is frozen', () => {
    for (const a of AGENT_REGISTRY) {
      expect(Object.isFrozen(a)).toBe(true);
    }
  });

  it('every agent.authority/consumes/produces/requiredCredentials array is frozen', () => {
    for (const a of AGENT_REGISTRY) {
      expect(Object.isFrozen(a.authority)).toBe(true);
      expect(Object.isFrozen(a.consumes)).toBe(true);
      expect(Object.isFrozen(a.produces)).toBe(true);
      expect(Object.isFrozen(a.requiredCredentials)).toBe(true);
    }
  });

  it('attempting to mutate an agent record throws in strict mode', () => {
    const a = AGENT_REGISTRY[0];
    expect(() => {
      // @ts-expect-error — runtime check
      a.name = 'hacker';
    }).toThrow();
  });

  it('attempting to push onto the registry throws in strict mode', () => {
    expect(() => {
      // @ts-expect-error — runtime check
      AGENT_REGISTRY.push({ id: 99 });
    }).toThrow();
  });
});

describe('AGENT_REGISTRY — getAgent', () => {
  it('returns the agent for a valid id', () => {
    const a1 = getAgent(1);
    expect(a1).toBeDefined();
    expect(a1.id).toBe(1);
    expect(a1.name).toBe('Lifecycle Engine');
    expect(a1.mode).toBe('always-on');
  });

  it('returns undefined for an unknown id', () => {
    expect(getAgent(0)).toBeUndefined();
    expect(getAgent(27)).toBeUndefined();
    expect(getAgent(-1)).toBeUndefined();
  });

  it('agent #1 (Lifecycle Engine) is always-on per dispatch', () => {
    const a = getAgent(1);
    expect(a.name).toBe('Lifecycle Engine');
    expect(a.mode).toBe('always-on');
  });
});

describe('AGENT_REGISTRY — listAgentsByMode', () => {
  it('always-on includes #1 Lifecycle Engine', () => {
    const list = listAgentsByMode('always-on');
    const ids = list.map((a) => a.id);
    expect(ids).toContain(1);
  });

  it('step-owner list maps onto Auto Runner step keys', () => {
    const list = listAgentsByMode('step-owner');
    const ids = new Set(list.map((a) => a.id));
    // Per dispatch + Auto Runner: research(6), design(7), build(2),
    // qa_audit(8), govern(3), gtm(9), monitor(10).
    for (const id of [2, 3, 6, 7, 8, 9, 10]) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('the three modes partition the 26 agents', () => {
    const a = listAgentsByMode('always-on').length;
    const s = listAgentsByMode('step-owner').length;
    const c = listAgentsByMode('cross-step').length;
    expect(a + s + c).toBe(26);
  });

  it('returned lists are frozen', () => {
    for (const m of ['always-on', 'step-owner', 'cross-step']) {
      expect(Object.isFrozen(listAgentsByMode(m))).toBe(true);
    }
  });
});
