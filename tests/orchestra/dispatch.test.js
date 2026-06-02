import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../api/_lib/claude.js', () => ({
  callClaude: vi.fn(),
}));

const { callClaude } = await import('../../api/_lib/claude.js');
const { dispatch, listMembers } = await import('../../src/lib/orchestra/index.js');

const usage = Object.freeze({
  input_tokens: 100,
  output_tokens: 50,
});

function mockClaudeJson(value) {
  callClaude.mockResolvedValueOnce({
    text: JSON.stringify(value),
    model: 'claude-sonnet-4-6',
    usage,
  });
}

describe('Orchestra live capability dispatch', () => {
  beforeEach(() => {
    callClaude.mockReset();
  });

  it('routes analyze to claude-code without memberId and returns structured output', async () => {
    mockClaudeJson({
      summary: 'A grounded research summary.',
      findings: ['Finding one'],
      evidenceRef: 'analysis-fixture',
    });

    const result = await dispatch('analyze', {
      prompt: 'Analyze this product.',
      context: { url: 'https://example.com' },
    });

    expect(result).toMatchObject({
      ok: true,
      action: 'analyze',
      member: 'claude-code',
      data: {
        summary: 'A grounded research summary.',
        evidenceRef: 'analysis-fixture',
        usage,
      },
    });
    expect(callClaude).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 30000 }));
  });

  it('routes design to claude-code and rejects empty design artifacts', async () => {
    mockClaudeJson({
      principles: ['Fast first interaction'],
      featurePriorities: ['Prioritize onboarding'],
      userFlows: ['User opens dashboard and completes setup'],
      technicalRequirements: ['Persist setup state'],
      evidenceRef: 'design-fixture',
    });

    const result = await dispatch('design', {
      spec: { productName: 'Neutral fixture' },
      context: { research: 'grounded' },
    });

    expect(result.ok).toBe(true);
    expect(result.member).toBe('claude-code');
    expect(result.data.featurePriorities).toEqual(['Prioritize onboarding']);
    expect(callClaude).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 30000 }));

    mockClaudeJson({
      principles: [],
      featurePriorities: [],
      userFlows: [],
      technicalRequirements: [],
      evidenceRef: '',
    });

    const emptyResult = await dispatch('design', {
      spec: { productName: 'Neutral fixture' },
      context: {},
    });

    expect(emptyResult.ok).toBe(false);
    expect(emptyResult.error).toMatch(/non-empty design schema/);
  });

  it('routes score to claude-code and returns the required score schema', async () => {
    mockClaudeJson({
      score: 8.5,
      justification: 'Evidence supports a strong but incomplete result.',
      evidenceRef: 'score-fixture',
    });

    const result = await dispatch('score', {
      dimension: 'Logic',
      prompt: 'Score this build.',
      context: { build: 'evidence' },
    });

    expect(result).toMatchObject({
      ok: true,
      action: 'score',
      member: 'claude-code',
      data: {
        score: 8.5,
        justification: 'Evidence supports a strong but incomplete result.',
        evidenceRef: 'score-fixture',
      },
    });
    expect(callClaude).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 30000 }));
  });

  it('does not select wired:false members for unsupported actions', async () => {
    const wiredFalseIds = listMembers().filter(member => member.wired === false).map(member => member.id);
    const result = await dispatch('nonexistent-stub-only-action', {});

    expect(result.ok).toBe(false);
    expect(wiredFalseIds).not.toContain(result.member);
    expect(result.deferred).not.toBe(true);
  });
});
