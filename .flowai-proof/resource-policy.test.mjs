import assert from 'node:assert/strict';
import { proofResourceDecision } from './resource-policy.mjs';

const cases = [
  { freePct: 10, phase: 'start', expected: 'continue' },
  { freePct: 9.9, phase: 'start', expected: 'defer' },
  { freePct: 9.9, phase: 'continue', expected: 'continue' },
  { freePct: 8, phase: 'continue', expected: 'continue' },
  { freePct: 7.9, phase: 'continue', expected: 'checkpoint' },
  { freePct: 6, phase: 'continue', expected: 'checkpoint' },
  { freePct: 5.9, phase: 'continue', expected: 'stop' },
  { freePct: 100, phase: 'start', unsafePaging: true, expected: 'stop' },
  { freePct: 100, phase: 'continue', unsafeProcessSpawn: true, expected: 'stop' },
];

for (const testCase of cases) {
  const { expected, ...input } = testCase;
  assert.equal(proofResourceDecision(input), expected, JSON.stringify(input));
}

console.log(JSON.stringify({ assertion: 'flowai_proof_resource_policy_boundaries', cases: cases.length, verdict: 'PASS' }));
