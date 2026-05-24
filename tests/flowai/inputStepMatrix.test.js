import { describe, expect, it } from 'vitest';
import { buildFlowAIInputStepMatrix, FLOWAI_MODE_BEHAVIOR } from '../../src/lib/flowai/inputStepMatrix.js';
import { normalizeFlowAIInput } from '../../src/lib/flowai/unifiedRunInput.js';
import { FLOWAI_MACRO_STEPS } from '../../src/lib/flowaiRunStore.js';

describe('FlowAI input step matrix', () => {
  it('accounts for all three inputs across all eight macro steps', () => {
    const context = normalizeFlowAIInput({
      url: 'https://example.com',
      description: 'Fix navigation',
      attachments: [{ type: 'screenshot', content: 'base64' }],
    });
    const matrix = buildFlowAIInputStepMatrix({ inputContext: context, mode: 'guided' });

    expect(Object.keys(matrix)).toEqual(FLOWAI_MACRO_STEPS);
    for (const step of FLOWAI_MACRO_STEPS) {
      expect(Object.keys(matrix[step].inputs)).toEqual(['url', 'description', 'attachments']);
      expect(matrix[step].modeBehavior).toBe(FLOWAI_MODE_BEHAVIOR[step].guided);
      for (const usage of Object.values(matrix[step].inputs)) {
        expect(['used', 'preserved', 'unused_with_reason']).toContain(usage.state);
      }
    }
  });

  it('marks missing inputs honestly instead of silently ignoring them', () => {
    const matrix = buildFlowAIInputStepMatrix({
      inputContext: normalizeFlowAIInput({ description: 'Design a new product' }),
      mode: 'manual',
    });

    expect(matrix.research.inputs.url).toMatchObject({
      state: 'unused_with_reason',
      reason: 'url input not provided',
    });
    expect(matrix.research.inputs.description.state).toBe('used');
    expect(matrix.deploy.modeBehavior).toContain('User deploys manually');
  });
});
