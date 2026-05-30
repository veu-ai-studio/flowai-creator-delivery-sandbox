import { describe, expect, it } from 'vitest';

import { normalizeFlowAIInput } from '../../src/lib/flowai/unifiedRunInput.js';
import { resolveProductContext } from '../../src/lib/forge/resolveProductContext.js';

describe('resolveProductContext', () => {
  it('url-only resolves to clone mode', () => {
    expect(resolveProductContext({ url: 'https://saige.veuaistudio.com' }).inputMode).toBe('clone');
  });

  it('url-only derives id from first domain label', () => {
    expect(resolveProductContext({ url: 'https://saige.veuaistudio.com/app' }).id).toBe('saige');
  });

  it('url with www uses second label as id', () => {
    expect(resolveProductContext({ url: 'https://www.example.com' }).id).toBe('example');
  });

  it('description-only resolves to describe mode', () => {
    expect(resolveProductContext({ description: 'Build a reporting portal' }).inputMode).toBe('describe');
  });

  it('description-only id is deterministic slug', () => {
    const input = { description: 'Build a Mobile Native Product for Schools' };
    expect(resolveProductContext(input).id).toBe(resolveProductContext(input).id);
    expect(resolveProductContext(input).id).toBe('build-a-mobile-native-product-for-schools');
  });

  it('two urls resolve to synthesize mode', () => {
    expect(resolveProductContext({ urls: ['https://alpha.com', 'https://beta.com'] }).inputMode).toBe('synthesize');
  });

  it('attachments-only resolves to paste mode', () => {
    expect(resolveProductContext({ attachments: [{ type: 'notes', content: 'hello' }] }).inputMode).toBe('paste');
  });

  it('url plus description uses clone as dominant signal', () => {
    expect(resolveProductContext({ url: 'https://example.com', description: 'AI agent' }).inputMode).toBe('clone');
  });

  it('url plus attachments uses clone as dominant signal', () => {
    expect(resolveProductContext({ url: 'https://example.com', attachments: [{}] }).inputMode).toBe('clone');
  });

  it('url plus description plus attachments uses clone', () => {
    expect(resolveProductContext({ url: 'https://example.com', description: 'x', attachments: [{}] }).inputMode).toBe('clone');
  });

  it('platform detects app hostname as SaaS', () => {
    expect(resolveProductContext({ url: 'https://app.example.com' }).platform).toBe('SaaS');
  });

  it('platform detects play.google.com as mobile_app before app rule', () => {
    expect(resolveProductContext({ url: 'https://play.google.com/store/apps/details?id=x' }).platform).toBe('mobile_app');
  });

  it('platform detects AI agent description as agentic_ai', () => {
    expect(resolveProductContext({ description: 'AI agent for ESG reporting' }).platform).toBe('agentic_ai');
  });

  it('same url always returns same deterministic id', () => {
    const a = resolveProductContext({ url: 'https://www.example.com/path' });
    const b = resolveProductContext({ url: 'https://www.example.com/path' });
    expect(a.id).toBe(b.id);
  });

  it('outputUrl is null on creation', () => {
    expect(resolveProductContext({ url: 'https://example.com' }).outputUrl).toBeNull();
  });

  it('output is frozen and outputUrl cannot be mutated', () => {
    const ctx = resolveProductContext({ url: 'https://example.com' });
    expect(Object.isFrozen(ctx)).toBe(true);
    try {
      ctx.outputUrl = 'https://changed.example.com';
    } catch {
      // Strict-mode assignment to frozen object may throw; both outcomes are acceptable.
    }
    expect(ctx.outputUrl).toBeNull();
  });

  it('false and empty string are treated as null for url and description', () => {
    const empty = resolveProductContext({ url: '', description: '' });
    const falsey = resolveProductContext({ url: false, description: false });
    expect(empty.inputMode).toBe('describe');
    expect(falsey.inputMode).toBe('describe');
    expect(empty.url).toBeNull();
    expect(falsey.url).toBeNull();
  });

  it('receivedInputs.urls is true when urls array is non-empty', () => {
    const normalized = normalizeFlowAIInput({ urls: ['https://alpha.com', 'https://beta.com'] });
    expect(normalized.urls).toEqual(['https://alpha.com', 'https://beta.com']);
    expect(normalized.receivedInputs.urls).toBe(true);
  });
});
