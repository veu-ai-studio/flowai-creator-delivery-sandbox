import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/button', () => ({ Button: () => null }));
vi.mock('@/components/ui/input', () => ({ Input: () => null }));
vi.mock('@/components/FindingsReport', () => ({ default: () => null }));

const { resolveRankedToolSelectionPayload } = await import(
  '../../src/components/RunConstructionPanel.jsx'
);

describe('RunConstructionPanel ranked tool selection payloads', () => {
  it('normalizes top-level tool_intelligence_selection SSE payloads', () => {
    const payload = resolveRankedToolSelectionPayload({
      kind: 'tool_intelligence_selection',
      stepKey: 'design',
      mode: 'GUIDED',
      selected: {
        platform_name: 'Claude',
        platform_type: 'llm',
        rank_score: 9.4,
      },
      candidates: [
        {
          rank: 1,
          platform_name: 'Claude',
          platform_type: 'llm',
          rank_score: 9.4,
        },
        {
          rank: 2,
          platform_name: 'Perplexity',
          platform_type: 'research',
          rank_score: 8.7,
        },
      ],
    });

    expect(payload).toMatchObject({
      stepKey: 'design',
      selectedName: 'Claude',
      selectedNames: ['Claude'],
    });
    expect(payload.candidates).toHaveLength(2);
    expect(payload.candidates[0]).toMatchObject({
      displayName: 'Claude',
      rank_score: 9.4,
      scoreField: 'rank_score',
      scoreValue: 9.4,
      scoreLabel: 'rank_score: 9.4',
    });
  });

  it('normalizes nested result.toolSelection envelopes with compositeScore as score', () => {
    const payload = resolveRankedToolSelectionPayload({
      result: { complete: true },
      toolSelection: {
        stepKey: 'build',
        mode: 'AUTOMATIC',
        selection: [
          {
            platform_name: 'Base44',
            platform_type: 'app-builder',
            compositeScore: 9.5,
          },
        ],
        candidates: [
          {
            rank: 1,
            platform_name: 'Base44',
            platform_type: 'app-builder',
            compositeScore: 9.5,
          },
          {
            rank: 2,
            platform_name: 'Replit',
            platform_type: 'ide',
            compositeScore: 8.8,
          },
        ],
      },
    });

    expect(payload).toMatchObject({
      stepKey: 'build',
      selectedName: 'Base44',
      selectedNames: ['Base44'],
    });
    expect(payload.candidates[0]).toMatchObject({
      displayName: 'Base44',
      compositeScore: 9.5,
      scoreField: 'score',
      scoreValue: 9.5,
      scoreLabel: 'score: 9.5',
    });
  });

  it('returns null when no ranked candidates are present', () => {
    expect(resolveRankedToolSelectionPayload({ toolSelection: { candidates: [] } })).toBeNull();
  });
});
