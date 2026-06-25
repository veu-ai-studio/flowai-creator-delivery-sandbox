import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatAuditEvidence, logAuditEvidence } from '../../src/lib/forge/auditEvidenceLogger.js';
import {
  batchPlanAdvisoryItems,
  codeCompletenessChecks,
  evidenceCompletenessChecks,
  gateValidityChecks,
  isBuildBlocked,
  runAudit,
} from '../../src/lib/forge/auditRunner.js';
import { calculateAuditScore, scoreAuditStep, AUDIT_QUEUED } from '../../src/lib/forge/auditStepScorer.js';
import { buildAuditTemplate } from '../../src/lib/forge/auditTemplate.js';

const baseSections = [
  { id: 'build-entry-path', label: 'Build Entry Path', source: 'auto', evidenceTier: 'B', input: { path: 'BUILD_BLOCKED' } },
  { id: 'code-task-dispatches', label: 'Code Tasks', source: 'orchestrated', evidenceTier: 'A', input: { complete: false, verified: false } },
  { id: 'base44-stub-deletions', label: 'Stub Deletions', source: 'auto', evidenceTier: 'A', input: [{ surfaceId: 'stub-1' }] },
  { id: 'base44-functionalization', label: 'Functionalization', source: 'auto', evidenceTier: 'A', input: [{ surfaceId: 'target-1' }] },
  { id: 'build-risks', label: 'Build Risks', source: 'derived', evidenceTier: 'B', input: [{ risk: 'Known risk' }] },
  { id: 'build-decision-log', label: 'Build Decision Log', source: 'manual', evidenceTier: 'A', input: ['Victor decision'] },
];

const blockedBuildOutput = {
  productId: 'saige',
  stepId: 'step-3-build',
  completedAt: '2026-05-29T00:00:00.000Z',
  matrixArtifactVersion: 'matrix-test',
  buildScore: 67,
  buildComplete: false,
  readyForQualityAudit: false,
  flag: 'BUILD_BLOCKED',
  entryPath: { path: 'BUILD_BLOCKED' },
  evidenceSummary: { codeTaskDispatchesStatus: 'STUB' },
  base44BatchPlan: {
    status: 'BATCH_PLAN_APPROXIMATE',
    stubDeletions: [{ surfaceId: 'stub-1' }],
    functionalizationPlan: [{ surfaceId: 'target-1' }],
  },
  sections: baseSections,
};

const readyBuildOutput = {
  ...blockedBuildOutput,
  buildScore: 100,
  buildComplete: true,
  readyForQualityAudit: true,
  flag: undefined,
  entryPath: { path: 'PATH_A' },
  sections: [
    { ...baseSections[0], input: { path: 'PATH_A' } },
    { ...baseSections[1], input: [{ taskId: 'task-1' }] },
    ...baseSections.slice(2),
  ],
};

const liveReadyBuildOutput = {
  ...readyBuildOutput,
  sections: [
    { ...baseSections[0], input: { path: 'PATH_A' } },
    { ...baseSections[1], input: [{ taskId: 'task-1', complete: true, verified: true }] },
    ...baseSections.slice(2),
  ],
};

const rankedAuditTools = [
  { rank: 1, platform_name: 'Claude Code', performance_score: 9, target_classes: ['generic_url'] },
];

const rankedUnavailableThenAuditTools = [
  { rank: 1, platform_name: 'v0 by Vercel', performance_score: 10, target_classes: ['generic_url'] },
  { rank: 2, platform_name: 'Claude Code', performance_score: 9, target_classes: ['generic_url'] },
];

function serviceReturning(selection) {
  return {
    async getTopTool() {
      return selection;
    },
  };
}

function dispatchReturning(calls = []) {
  return async (action, payload) => {
    calls.push({ action, payload });
    return {
      ok: true,
      action,
      member: 'claude-code',
      data: {
        score: 8,
        justification: `${payload.dimension} is supported by evidence but not production verified.`,
        evidenceRef: `${payload.dimension}-fixture`,
        usage: { input_tokens: 100, output_tokens: 50 },
      },
    };
  };
}

describe('SAIGE forge Step 4 quality audit', () => {
  it('auditTemplate returns correct schema', () => {
    const template = buildAuditTemplate('saige', blockedBuildOutput);
    expect(template).toMatchObject({
      productId: 'saige',
      buildStepId: 'step-3-build',
      templateVersion: '1.0',
    });
    expect(template.sections.map(section => section.id)).toEqual([
      'audit-entry-state',
      'code-completeness',
      'evidence-completeness',
      'gate-validity',
      'batch-plan-advisory',
      'renewal-output-compatibility',
      'audit-findings',
      'audit-decision-log',
      'selected-tool',
    ]);
  });

  it('AUDIT_QUEUED emitted when buildComplete false', async () => {
    const output = await runAudit('saige', blockedBuildOutput, {});
    expect(output.flag).toBe(AUDIT_QUEUED);
  });

  it('AUDIT_QUEUED does not block advisory audit', async () => {
    const output = await runAudit('saige', blockedBuildOutput, {});
    expect(output.batchPlanAdvisoryItems).toHaveLength(2);
    expect(output.auditFindings.advisory).toBe(2);
  });

  it('BUILD_BLOCKED detected via all three paths', () => {
    expect(isBuildBlocked({ flag: 'BUILD_BLOCKED' })).toBe(true);
    expect(isBuildBlocked({ buildBlocked: true })).toBe(true);
    expect(isBuildBlocked({ entryPath: { path: 'BUILD_BLOCKED' } })).toBe(true);
  });

  it('code-completeness checks all required fields', () => {
    const checks = codeCompletenessChecks(blockedBuildOutput);
    expect(checks).toHaveLength(6);
    expect(checks.every(check => check.status === 'PASS')).toBe(true);
  });

  it('forge evidence completeness checks all 11 buildOutput fields', () => {
    const checks = evidenceCompletenessChecks(blockedBuildOutput);
    expect(checks).toHaveLength(11);
    expect(checks.every(check => check.status === 'PASS')).toBe(true);
  });

  it('gate-validity uses existing scorer exports', async () => {
    const checks = await gateValidityChecks(blockedBuildOutput);
    expect(checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'gate-readyForQualityAudit', status: 'PASS' }),
      expect.objectContaining({ id: 'gate-tier-c-excluded', status: 'PASS' }),
      expect.objectContaining({ id: 'gate-design-partial-flag', status: 'PASS' }),
    ]));
  });

  it('BATCH_PLAN_APPROXIMATE flagged ADVISORY_ONLY', () => {
    const advisory = batchPlanAdvisoryItems(blockedBuildOutput);
    expect(advisory).toHaveLength(2);
    expect(advisory.every(item => item.status === 'ADVISORY_ONLY')).toBe(true);
  });

  it('advisory items excluded from audit score', () => {
    const score = calculateAuditScore([
      { id: 'pass', status: 'PASS' },
      { id: 'advisory', status: 'ADVISORY_ONLY' },
    ]);
    expect(score).toBe(100);
  });

  it('NOT_APPLICABLE items excluded from score', () => {
    const score = calculateAuditScore([
      { id: 'pass', status: 'PASS' },
      { id: 'na', status: 'NOT_APPLICABLE' },
    ]);
    expect(score).toBe(100);
  });

  it('audit score calculated from individual check objects not section count', () => {
    const score = calculateAuditScore([
      { id: 'one', status: 'PASS' },
      { id: 'two', status: 'PASS' },
      { id: 'three', status: 'FAIL', reason: 'nope' },
      { id: 'four', status: 'ADVISORY_ONLY' },
    ]);
    expect(score).toBe(66.67);
  });

  it('auditComplete false when decision-log empty', async () => {
    const output = await runAudit('saige', readyBuildOutput, {});
    expect(output.auditComplete).toBe(false);
    expect(output.readyForDeploy).toBe(false);
  });

  it('readyForDeploy remains false when build gate mismatch is detected', async () => {
    const output = await runAudit('saige', readyBuildOutput, {
      'audit-decision-log': 'Victor audit decision: accept findings.',
    });
    expect(output.auditScore).toBe(95);
    expect(output.auditComplete).toBe(false);
    expect(output.readyForDeploy).toBe(false);
    expect(output.gateValidityChecks).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: 'gate-readyForQualityAudit',
        status: 'FAIL',
        reason: 'build gate mismatch',
      }),
    ]));
  });

  it('readyForDeploy false when build is BLOCKED even if auditScore >= 95', () => {
    const score = scoreAuditStep({
      stepId: 'step-4-quality-audit',
      buildComplete: true,
      flag: 'BUILD_BLOCKED',
      entryPath: { path: 'BUILD_BLOCKED' },
      codeCompletenessChecks: [{ id: 'code', status: 'PASS' }],
      evidenceCompletenessChecks: [{ id: 'evidence', status: 'PASS' }],
      gateValidityChecks: [{ id: 'gate', status: 'PASS' }],
      batchPlanAdvisoryItems: [{ id: 'advisory', status: 'ADVISORY_ONLY' }],
      renewalOutputCompatibility: { id: 'na', status: 'NOT_APPLICABLE' },
      sections: [
        { id: 'audit-findings', source: 'derived', input: { summary: 'ok' } },
        { id: 'audit-decision-log', source: 'manual', input: ['Victor audit decision'] },
      ],
    });
    expect(score.auditScore).toBe(100);
    expect(score.auditComplete).toBe(true);
    expect(score.buildBlocked).toBe(true);
    expect(score.readyForDeploy).toBe(false);
  });

  it('RenewalOutput absent returns NOT_APPLICABLE not FAIL and not fabricated data', async () => {
    const output = await runAudit('saige', blockedBuildOutput, {});
    expect(output.renewalOutputCompatibility).toMatchObject({
      status: 'NOT_APPLICABLE',
      reason: 'RenewalOutput not applicable until Self-Renewal / v0.2 loop integration',
    });
  });

  it('Tier-C never contributes to audit score', () => {
    const score = scoreAuditStep({
      stepId: 'step-4-quality-audit',
      codeCompletenessChecks: [{ id: 'tier-c-control', status: 'ADVISORY_ONLY' }],
      evidenceCompletenessChecks: [{ id: 'pass', status: 'PASS' }],
      gateValidityChecks: [],
      batchPlanAdvisoryItems: [],
      renewalOutputCompatibility: { id: 'na', status: 'NOT_APPLICABLE' },
      buildComplete: true,
      sections: [
        { id: 'audit-findings', source: 'derived', input: { summary: 'ok' } },
        { id: 'audit-decision-log', source: 'manual', input: ['Victor audit decision'] },
      ],
    });
    expect(score.auditScore).toBe(100);
    expect(score.readyForDeploy).toBe(true);
  });

  it('auditEvidenceLogger produces correct format', async () => {
    const output = await runAudit('saige', readyBuildOutput, {
      'audit-decision-log': 'Victor audit decision: accept findings.',
    });
    const dir = mkdtempSync(path.join(tmpdir(), 'flowai-audit-forge-'));
    const result = logAuditEvidence(output, {
      cwd: dir,
      evidencePath: 'docs/forge/saige-step4-audit-evidence.md',
    });
    const written = readFileSync(result.absolutePath, 'utf8');

    expect(written).toContain('# saige Step 4 Quality Audit Evidence');
    expect(written).toContain('AuditScore: 95%');
    expect(written).toContain('AuditComplete: false');
    expect(written).toContain('ReadyForDeploy: false');
    expect(written).toContain('ToolSelection: null');
    expect(formatAuditEvidence(output)).toContain('## Auto checks');
  });

  it('runner is already async', () => {
    expect(runAudit('saige', blockedBuildOutput, {})).toBeInstanceOf(Promise);
  });

  it('selected-tool section in template schema', () => {
    const template = buildAuditTemplate('saige', blockedBuildOutput);
    expect(template.sections.find(section => section.id === 'selected-tool')).toMatchObject({
      label: 'Selected Audit Tools',
      selectionMode: 'pipeline',
      undServedFirstEnforced: true,
    });
  });

  it('toolSelection is array in output', async () => {
    const service = {
      async getTopTool() {
        return [
          { rank: 1, platform_name: 'Playwright', performance_score: 10, target_classes: ['generic_url'] },
          { rank: 2, platform_name: 'Vitest', performance_score: 9, target_classes: ['generic_url'] },
        ];
      },
    };
    const output = await runAudit('saige', readyBuildOutput, {}, {
      toolService: service,
      runId: 'audit-test-array',
      toolIntelligenceMode: 'GUIDED',
    });
    expect(output.toolSelection).toMatchObject({
      stepKey: 'qa_audit',
      selectionMode: 'pipeline',
    });
    expect(Array.isArray(output.toolSelection.selection)).toBe(true);
  });

  it('toolSelectionAdvisory true when buildBlocked', async () => {
    const service = {
      async getTopTool() {
        return [
          { rank: 1, platform_name: 'Playwright', performance_score: 10, target_classes: ['generic_url'] },
        ];
      },
    };
    const output = await runAudit('saige', blockedBuildOutput, {}, {
      toolService: service,
      runId: 'audit-test-advisory',
      toolIntelligenceMode: 'GUIDED',
    });
    expect(output.toolSelectionAdvisory).toBe(true);
    expect(output.toolSelection.toolSelectionAdvisory).toBe(true);
  });

  it('undServedFirstApplied true when service mock provided', async () => {
    const service = {
      async getTopTool() {
        return [
          { rank: 1, platform_name: 'Playwright', performance_score: 10, target_classes: ['generic_url'] },
        ];
      },
    };
    const output = await runAudit('saige', readyBuildOutput, {}, {
      toolService: service,
      runId: 'audit-test-underserved',
      toolIntelligenceMode: 'GUIDED',
    });
    expect(output.toolSelection).toMatchObject({
      stepKey: 'qa_audit',
      undServedFirstApplied: true,
    });
  });

  it('AUTOMATIC tool selection adds sibling dimensionScores without feeding deploy gates', async () => {
    const oldKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const dispatchCalls = [];
    try {
      const output = await runAudit('neutral-product', liveReadyBuildOutput, {
        'audit-decision-log': 'Neutral audit decision: accept P2 dimension evidence.',
      }, {
        toolService: serviceReturning(rankedAuditTools),
        dispatch: dispatchReturning(dispatchCalls),
        productGoals: ['prove the main user path'],
        researchOutput: { stepId: 'step-1-research' },
        designOutput: { stepId: 'step-2-design' },
        runId: 'audit-live-test',
      });

      expect(output.toolSelection.mode).toBe('AUTOMATIC');
      expect(dispatchCalls.map(call => call.action)).toEqual(['score', 'score', 'score', 'score', 'score']);
      expect(output.dimensionScores.map(item => item.dimension)).toEqual([
        'UI/UX',
        'API',
        'Logic',
        'Business Value',
        'Security Posture',
      ]);
      expect(dispatchCalls.find(call => call.payload.dimension === 'Business Value').payload.context).toMatchObject({
        productGoals: ['prove the main user path'],
        researchOutput: { stepId: 'step-1-research' },
        designOutput: { stepId: 'step-2-design' },
      });
      expect(output.auditScore).toBe(100);
      expect(output.readyForDeploy).toBe(true);
      expect(output.evidenceSummary.liveDispatches).toBe(5);
    } finally {
      if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = oldKey;
    }
  });

  it('live audit fails over when the top-ranked score tool is unavailable', async () => {
    const oldKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    const dispatchCalls = [];
    try {
      const output = await runAudit('neutral-product', liveReadyBuildOutput, {
        'audit-decision-log': 'Neutral audit decision: accept P2 dimension evidence.',
      }, {
        toolService: serviceReturning(rankedUnavailableThenAuditTools),
        dispatch: dispatchReturning(dispatchCalls),
        productGoals: ['prove the main user path'],
        researchOutput: { stepId: 'step-1-research' },
        designOutput: { stepId: 'step-2-design' },
        runId: 'audit-unavailable-failover-test',
      });

      expect(dispatchCalls).toHaveLength(5);
      expect(dispatchCalls.every(call => call.action === 'score')).toBe(true);
      expect(output.toolSelection.attemptHistory).toEqual(expect.arrayContaining([
        expect.objectContaining({ tool: 'v0 by Vercel', state: 'unavailable' }),
        expect.objectContaining({ tool: 'Claude Code', state: 'succeeded' }),
      ]));
      expect(output.evidenceSummary).toMatchObject({
        liveDispatches: 5,
        timeoutAttempts: 0,
      });
    } finally {
      if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = oldKey;
    }
  });

  it('live audit times out a hanging selected score member and fails fast', async () => {
    const oldKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    try {
      await expect(runAudit('neutral-product', liveReadyBuildOutput, {
        'audit-decision-log': 'Neutral audit decision: accept P2 dimension evidence.',
      }, {
        toolService: serviceReturning(rankedAuditTools),
        dispatch: async () => new Promise(() => {}),
        productGoals: ['prove the main user path'],
        researchOutput: { stepId: 'step-1-research' },
        designOutput: { stepId: 'step-2-design' },
        runId: 'audit-timeout-failfast-test',
        toolDispatchTimeoutMs: 5,
      })).rejects.toMatchObject({
        name: 'RankedToolFailoverError',
        details: {
          attemptHistory: expect.arrayContaining([
            expect.objectContaining({ tool: 'Claude Code', state: 'timeout' }),
            expect.objectContaining({ state: 'final_failed' }),
          ]),
        },
      });
    } finally {
      if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = oldKey;
    }
  });

  it('dimensionScores do not change the existing build gate mismatch behavior', async () => {
    const oldKey = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'test-key';
    try {
      const output = await runAudit('neutral-product', readyBuildOutput, {
        'audit-decision-log': 'Neutral audit decision: accept findings.',
      }, {
        toolService: serviceReturning(rankedAuditTools),
        dispatch: dispatchReturning([]),
        runId: 'audit-gate-mismatch-test',
      });

      expect(output.dimensionScores).toHaveLength(5);
      expect(output.gateValidityChecks).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'gate-readyForQualityAudit',
          status: 'FAIL',
          reason: 'build gate mismatch',
        }),
      ]));
      expect(output.auditScore).toBe(95);
      expect(output.auditComplete).toBe(false);
      expect(output.readyForDeploy).toBe(false);
    } finally {
      if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = oldKey;
    }
  });
});
