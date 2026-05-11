import { describe, it, expect } from 'vitest';
import {
  AGENT_REGISTRY,
  getAgent,
  listAgentsByMode,
} from '../src/lib/agents/_registry.ts';

describe('AGENT_REGISTRY — completeness', () => {
  it('contains exactly 25 agents', () => {
    expect(AGENT_REGISTRY).toHaveLength(25);
  });

  it('agent ids 1..25 are all present, exactly once each', () => {
    const ids = AGENT_REGISTRY.map((a) => a.id).sort((a, b) => a - b);
    expect(ids).toEqual(Array.from({ length: 25 }, (_, i) => i + 1));
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

  it('every agent declares non-empty authority and recommend_only is the only level granted today', () => {
    for (const a of AGENT_REGISTRY) {
      expect(Array.isArray(a.authority)).toBe(true);
      expect(a.authority.length).toBeGreaterThan(0);
      for (const lvl of a.authority) {
        expect(lvl).toBe('recommend_only');
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
    expect(getAgent(26)).toBeUndefined();
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

  it('the three modes partition the 25 agents', () => {
    const a = listAgentsByMode('always-on').length;
    const s = listAgentsByMode('step-owner').length;
    const c = listAgentsByMode('cross-step').length;
    expect(a + s + c).toBe(25);
  });

  it('returned lists are frozen', () => {
    for (const m of ['always-on', 'step-owner', 'cross-step']) {
      expect(Object.isFrozen(listAgentsByMode(m))).toBe(true);
    }
  });
});
