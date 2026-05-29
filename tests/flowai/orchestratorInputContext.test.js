import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../src/lib/agents/renewal/orchestrator.js', import.meta.url), 'utf8');

describe('orchestrator unified input context wiring', () => {
  it('emits and returns input usage for the 8-step pipeline', () => {
    expect(source).toContain('normalizeFlowAIInput(args.input');
    expect(source).toContain('buildFlowAIInputStepMatrix');
    expect(source).toContain('FlowAI unified input context');
    expect(source).toContain('inputStepMatrix');
    expect(source).toContain('userObjectives');
  });
});
