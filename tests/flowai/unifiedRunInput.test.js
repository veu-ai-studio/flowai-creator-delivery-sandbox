import { describe, expect, it } from 'vitest';
import {
  normalizeFlowAIInput,
  parseUserObjectives,
  summarizeFlowAIInputContext,
} from '../../src/lib/flowai/unifiedRunInput.js';

describe('unified FlowAI run input', () => {
  it('normalizes URL, description, and attachments from the launcher payload', () => {
    const context = normalizeFlowAIInput({
      url: ' https://example.com ',
      productDescription: 'Fix navigation, add pricing page',
      pastedContent: 'Console error on mobile',
      attachments: [{ type: 'screenshot', content: 'base64', name: 'mobile.png' }],
    }, { mode: 'guided' });

    expect(context.url).toBe('https://example.com');
    expect(context.description).toBe('Fix navigation, add pricing page');
    expect(context.attachments).toHaveLength(2);
    expect(context.receivedInputs).toEqual({ url: true, description: true, attachments: true });
    expect(context.conceptMode).toBe(false);
  });

  it('supports concept/design mode when no URL is supplied', () => {
    const context = normalizeFlowAIInput({ description: 'Create a pricing page' });
    expect(context.url).toBeNull();
    expect(context.conceptMode).toBe(true);
    expect(summarizeFlowAIInputContext(context)).toMatchObject({
      urlPresent: false,
      descriptionPresent: true,
      attachmentCount: 0,
      conceptMode: true,
    });
  });

  it('turns user descriptions into priority objectives', () => {
    expect(parseUserObjectives('Fix navigation, add pricing page and improve mobile layout')).toEqual([
      expect.objectContaining({ text: 'Fix navigation', priority: 'user_requested' }),
      expect.objectContaining({ text: 'add pricing page and improve mobile layout' }),
    ]);
  });
});
