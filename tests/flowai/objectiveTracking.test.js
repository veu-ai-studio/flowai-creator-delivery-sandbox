import { describe, expect, it } from 'vitest';
import { summarizeAttachmentCounts, summarizeObjectiveTracking } from '../../src/lib/flowai/objectiveTracking.js';

describe('objectiveTracking', () => {
  it('marks objectives with matching generated fixes as met', () => {
    const objectives = summarizeObjectiveTracking({
      userObjectives: [
        { id: 'obj-1', text: 'Fix navigation' },
        { id: 'obj-2', text: 'Add pricing page' },
      ],
      sourceMappedFixProposals: [
        { title: 'Navigation cleanup', description: 'Fix broken menu links' },
      ],
    });

    expect(objectives).toEqual([
      {
        id: 'obj-1',
        text: 'Fix navigation',
        status: 'met',
        evidence: 'matched to generated fix proposal',
      },
      {
        id: 'obj-2',
        text: 'Add pricing page',
        status: 'pending',
        evidence: 'needs implementation evidence',
      },
    ]);
  });

  it('summarizes attachment counts by type', () => {
    expect(summarizeAttachmentCounts({
      attachmentTypes: {
        screenshot: 2,
        note: 1,
      },
    })).toBe('2 screenshots, 1 note');
  });
});
