/**
 * BaseAgentTest — Packet 1.5 smoke tests for BaseAgent environment validation.
 * Route: /base-agent-test  (dev/internal only — not in sidebar nav)
 */
import { useEffect, useState } from 'react';
import { BaseAgent, AUTHORITY } from '@/lib/agents/BaseAgent';

class TestAgent extends BaseAgent {
  static charter() {
    return {
      id: 11, name: 'Strategic Intelligence', flowAiOnly: true,
      authority: [AUTHORITY.RECOMMEND_ONLY],
      requiredCredentials: [], marketplaceTools: [],
      consumes: [], produces: [], escalationPolicy: 'test',
    };
  }
  async plan() { return { summary: 'noop', authorityNeeded: [], sideEffects: [] }; }
  async act()  { return { outcome: 'noop', sideEffects: [] }; }
}

const STUB = {
  logger: console,
  messageBus: { publish: async () => {}, subscribe: async () => {} },
  auditLog:   { write: async () => {} },
  clock:      { now: () => Date.now() },
  productScope: 'flowai',
};

function runTests() {
  const results = [];

  // TEST 1 — missing environment throws
  try {
    new TestAgent(STUB);
    results.push({ id: 1, pass: false, msg: 'Expected throw — did not throw' });
  } catch (e) {
    results.push({ id: 1, pass: true, msg: `missing env throws — ${e.message}` });
  }

  // TEST 2 — flowai + prod → valid
  try {
    const a = new TestAgent({ ...STUB, environment: 'prod' });
    results.push({ id: 2, pass: true, msg: `constructed agent #${a.charter.id} (flowai + prod)` });
  } catch (e) {
    results.push({ id: 2, pass: false, msg: e.message });
  }

  // TEST 3 — flowai + demo → invalid (flowai only accepts prod|staging)
  try {
    new TestAgent({ ...STUB, environment: 'demo' });
    results.push({ id: 3, pass: false, msg: 'Expected throw — did not throw' });
  } catch (e) {
    results.push({ id: 3, pass: true, msg: `flowai+demo throws — ${e.message}` });
  }

  // TEST 4 — flowai + staging → valid
  try {
    const a = new TestAgent({ ...STUB, environment: 'staging' });
    results.push({ id: 4, pass: true, msg: `constructed agent #${a.charter.id} (flowai + staging)` });
  } catch (e) {
    results.push({ id: 4, pass: false, msg: e.message });
  }

  return results;
}

export default function BaseAgentTest() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    setResults(runTests());
  }, []);

  const passed = results.filter(r => r.pass).length;
  const total  = results.length;

  return (
    <div className="p-8 max-w-2xl space-y-4 font-mono text-sm">
      <h1 className="text-xl font-bold text-foreground">
        BaseAgent Packet 1.5 — Smoke Tests
      </h1>
      <p className={`text-xs font-bold ${passed === total ? 'text-emerald-400' : 'text-red-400'}`}>
        {passed}/{total} PASSED
      </p>
      <div className="space-y-2">
        {results.map(r => (
          <div key={r.id}
            className={`rounded-lg border px-4 py-2.5 ${r.pass
              ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300'
              : 'border-red-500/30 bg-red-500/5 text-red-300'}`}>
            <span className="font-bold mr-2">{r.pass ? '✓' : '✗'} TEST {r.id}</span>
            {r.msg}
          </div>
        ))}
      </div>
    </div>
  );
}