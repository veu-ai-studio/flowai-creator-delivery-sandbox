import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { extractBranchPrVisibility } from '../../src/lib/ui/branchVisibility.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardSource = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');

describe('branch and PR visibility', () => {
  it('builds branch and compare links when PR creation is approval-gated', () => {
    const visibility = extractBranchPrVisibility({
      finalResult: {
        prUrl: null,
        upgradeTargets: {
          upgradeRepo: 'https://github.com/veu-ai-studio/saige-v2',
          upgradeBranch: 'main',
        },
        product: {
          repo: 'https://github.com/veu-ai-studio/saige',
          branch: 'main',
        },
        iterations: [
          {
            branchName: 'flowai/renewal-run123-iter2',
          },
        ],
        orchestrationLog: [
          {
            step: 13,
            result: { skipped: 'operator_approval_required' },
          },
        ],
      },
    });

    expect(visibility).toMatchObject({
      branchName: 'flowai/renewal-run123-iter2',
      branchUrl: 'https://github.com/veu-ai-studio/saige-v2/tree/flowai/renewal-run123-iter2',
      compareUrl: 'https://github.com/veu-ai-studio/saige-v2/compare/main...flowai/renewal-run123-iter2?expand=1',
      prUrl: null,
      approvalRequired: true,
      statusLabel: 'Branch ready - approval required',
    });
  });

  it('prefers the actual PR URL once one exists', () => {
    const visibility = extractBranchPrVisibility({
      repoConfig: {
        repo: 'https://github.com/veu-ai-studio/saige.git',
        branch: 'main',
      },
      finalResult: {
        prUrl: 'https://github.com/veu-ai-studio/saige/pull/17',
        iterations: [
          {
            steps: [
              {
                step: 9,
                status: 'complete',
                result: {
                  branchName: 'flowai/renewal-run123-iter2',
                  filesCommitted: 3,
                },
              },
            ],
          },
        ],
      },
    });

    expect(visibility).toMatchObject({
      prUrl: 'https://github.com/veu-ai-studio/saige/pull/17',
      filesCommitted: 3,
      approvalRequired: false,
      statusLabel: 'PR open',
    });
  });

  it('renders branch and compare actions in the result card', () => {
    expect(dashboardSource).toContain('Registered repair branch');
    expect(dashboardSource).toContain('Open branch');
    expect(dashboardSource).toContain('Open compare');
    expect(dashboardSource).toContain('Operator approval is required before FlowAI opens a PR');
  });
});
