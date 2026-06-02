import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { generateBase44BatchPlan } from '../../src/lib/forge/base44BatchPlanGenerator.js';
import { formatBuildEvidence, logBuildEvidence } from '../../src/lib/forge/buildEvidenceLogger.js';
import { detectBuildEntryPath, generateCodeTaskDispatches, runBuild } from '../../src/lib/forge/buildRunner.js';
import { scoreBuildStep, BUILD_BLOCKED, BUILD_OUTPUT_REQUIRED, __test as buildScorerTest } from '../../src/lib/forge/buildStepScorer.js';
import { buildBuildTemplate } from '../../src/lib/forge/buildTemplate.js';

const blockedDesignOutput = {
  productId: 'saige',
  stepId: 'step-2-design',
  readyForBuild: false,
  matrixArtifactVersion: 'matrix-test',
  sections: [
    {
      id: 'design-gaps',
      label: 'Design Gaps',
      source: 'derived',
      input: [{ sectionId: 'market-gaps', downstreamRisk: 'Market gaps unresolved.' }],
    },
    {
      id: 'design-decision-log',
      label: 'Design Decision Log',
      source: 'manual',
      input: ['Victor decision: partial only.'],
    },
  ],
};

const directiveDesignOutput = {
  ...blockedDesignOutput,
  sections: [
    blockedDesignOutput.sections[0],
    {
      id: 'design-decision-log',
      label: 'Design Decision Log',
      source: 'manual',
      input: ['MINIMUM BUILD DIRECTIVE: scaffold Base44 functionalization plan while design tools remain pending.'],
    },
  ],
};

const completeDesignOutput = {
  ...blockedDesignOutput,
  readyForBuild: true,
  sections: [
    {
      id: 'feature-priorities',
      label: 'Feature Priorities',
      source: 'orchestrated',
      input: 'Functionalize P0 SAIGE surfaces.',
    },
    {
      id: 'technical-requirements',
      label: 'Technical Requirements',
      source: 'orchestrated',
      input: 'Use Base44 entities and browser reload verification.',
    },
    blockedDesignOutput.sections[0],
    {
      id: 'design-decision-log',
      label: 'Design Decision Log',
      source: 'manual',
      input: ['Victor decision: complete design accepted.'],
    },
  ],
};

describe('SAIGE forge Step 3 build', () => {
  it('buildTemplate returns correct schema', () => {
    const template = buildBuildTemplate('saige', blockedDesignOutput);
    expect(template).toMatchObject({
      productId: 'saige',
      designStepId: 'step-2-design',
      templateVersion: '1.0',
    });
    expect(template.sections.map(section => section.id)).toEqual([
      'build-entry-path',
      'code-task-dispatches',
      'base44-stub-deletions',
      'base44-functionalization',
      'build-risks',
      'build-decision-log',
      'selected-tool',
    ]);
  });

  it('PATH_A detected from MINIMUM BUILD DIRECTIVE', () => {
    expect(detectBuildEntryPath(directiveDesignOutput)).toMatchObject({
      path: 'PATH_A',
      label: 'Build authorized via Victor directive',
    });
  });

  it('PATH_B detected from readyForBuild true', () => {
    expect(detectBuildEntryPath(completeDesignOutput)).toMatchObject({
      path: 'PATH_B',
      label: 'Build authorized via complete design',
    });
  });

  it('BUILD_BLOCKED emitted when neither path met', async () => {
    const output = await runBuild('saige', blockedDesignOutput, {});
    expect(output.flag).toBe(BUILD_BLOCKED);
    expect(output.entryPath.action).toBe('Visit /forge/design to unlock');
  });

  it('code-task-dispatches returns honest stub when no build tool configured', () => {
    const tasks = generateCodeTaskDispatches(directiveDesignOutput, detectBuildEntryPath(directiveDesignOutput));
    expect(tasks[0]).toMatchObject({
      taskId: 'path_a-build-task-001',
      buildToolStatus: 'HONEST_STUB_NO_BUILD_TOOL',
    });
    expect(tasks[0].buildTool).toMatchObject({
      verified: false,
      reason: 'No AI build tool configured; manual input required',
    });
  });

  it('base44BatchPlan returns honest stub when no audit data available', () => {
    const plan = generateBase44BatchPlan();
    expect(plan).toMatchObject({
      status: 'BATCH_PLAN_APPROXIMATE',
      verified: false,
      currentReachableSurface: '18-22%',
      targetReachableSurface: '60%+',
    });
    expect(plan.stubDeletions).toHaveLength(120);
    expect(plan.functionalizationPlan).toHaveLength(25);
  });

  it('buildComplete false when both outputs empty', () => {
    const score = scoreBuildStep({
      stepId: 'step-3-build',
      sections: [
        { id: 'build-entry-path', source: 'auto', evidenceTier: 'B', input: { path: 'PATH_A' } },
        { id: 'code-task-dispatches', source: 'orchestrated', evidenceTier: 'A', input: { complete: false, verified: false } },
        { id: 'base44-stub-deletions', source: 'auto', evidenceTier: 'A', input: [] },
        { id: 'base44-functionalization', source: 'auto', evidenceTier: 'A', input: [] },
        { id: 'build-risks', source: 'derived', evidenceTier: 'B', input: [{ risk: 'Known risk' }] },
        { id: 'build-decision-log', source: 'manual', evidenceTier: 'A', input: ['Victor build decision.'] },
      ],
    });
    expect(score.flag).toBe(BUILD_OUTPUT_REQUIRED);
    expect(score.buildComplete).toBe(false);
  });

  it('outputPopulated rejects placeholder code task entries', () => {
    expect(buildScorerTest.outputPopulated([
      { id: 'code-task-dispatches', input: [{ complete: false }] },
      { id: 'base44-stub-deletions', input: [] },
      { id: 'base44-functionalization', input: [] },
    ])).toBe(false);
  });

  it('outputPopulated accepts at least one real code task entry', () => {
    expect(buildScorerTest.outputPopulated([
      { id: 'code-task-dispatches', input: [{ complete: true, verified: true, task: 'x' }] },
      { id: 'base44-stub-deletions', input: [] },
      { id: 'base44-functionalization', input: [] },
    ])).toBe(true);
  });

  it('outputPopulated requires code tasks before additive evidence can count', () => {
    expect(buildScorerTest.outputPopulated([
      { id: 'code-task-dispatches', input: [] },
      { id: 'base44-stub-deletions', input: ['file.js'] },
      { id: 'base44-functionalization', input: [] },
    ])).toBe(false);
  });

  it('buildComplete false when no real code task is populated', async () => {
    const output = await runBuild('saige', directiveDesignOutput, {
      'build-decision-log': 'Victor build decision: accept approximate batch plan for audit scaffold.',
    });
    expect(output.buildComplete).toBe(false);
    expect(output.readyForQualityAudit).toBe(false);
    expect(output.flag).toBe(BUILD_OUTPUT_REQUIRED);
  });

  it('readyForQualityAudit = buildScore >= 95 && buildComplete === true', async () => {
    const blocked = await runBuild('saige', blockedDesignOutput, {
      'build-decision-log': 'Victor build decision: blocked state acknowledged.',
    });
    const ready = await runBuild('saige', directiveDesignOutput, {
      'build-decision-log': 'Victor build decision: proceed via directive.',
    });
    expect(blocked.buildScore).toBeLessThan(95);
    expect(blocked.buildComplete).toBe(false);
    expect(blocked.readyForQualityAudit).toBe(false);
    expect(ready.buildScore).toBe(100);
    expect(ready.buildComplete).toBe(false);
    expect(ready.readyForQualityAudit).toBe(false);
  });

  it('buildEvidenceLogger produces correct format including both output types', async () => {
    const output = await runBuild('saige', directiveDesignOutput, {
      'build-decision-log': 'Victor build decision: proceed via directive.',
    });
    const dir = mkdtempSync(path.join(tmpdir(), 'flowai-build-forge-'));
    const result = logBuildEvidence(output, {
      cwd: dir,
      evidencePath: 'docs/forge/saige-step3-build-evidence.md',
    });
    const written = readFileSync(result.absolutePath, 'utf8');

    expect(written).toContain('# saige Step 3 Build Evidence');
    expect(written).toContain('Base44BatchPlanStatus: BATCH_PLAN_APPROXIMATE');
    expect(written).toContain('## Code task dispatches');
    expect(formatBuildEvidence(output)).toContain('## Auto-populated');
  });

  it('BUILD_OUTPUT_REQUIRED emitted when neither output is populated', () => {
    const score = scoreBuildStep({
      stepId: 'step-3-build',
      sections: [
        { id: 'build-entry-path', source: 'auto', evidenceTier: 'B', input: { path: 'PATH_B' } },
        { id: 'code-task-dispatches', source: 'orchestrated', evidenceTier: 'A', input: [] },
        { id: 'base44-stub-deletions', source: 'auto', evidenceTier: 'A', input: [] },
        { id: 'base44-functionalization', source: 'auto', evidenceTier: 'A', input: [] },
        { id: 'build-risks', source: 'derived', evidenceTier: 'B', input: [{ risk: 'Known risk' }] },
        { id: 'build-decision-log', source: 'manual', evidenceTier: 'A', input: ['Victor build decision.'] },
      ],
    });
    expect(score.flag).toBe(BUILD_OUTPUT_REQUIRED);
  });

  it('Tier-C never accepted as evidence', () => {
    const score = scoreBuildStep({
      stepId: 'step-3-build',
      sections: [{ id: 'ephemeral', prompt: 'Nope', source: 'manual', evidenceTier: 'C', input: 'filled' }],
    });
    expect(score.buildScore).toBe(0);
    expect(score.readyForQualityAudit).toBe(false);
  });

  it('runner is async', () => {
    expect(runBuild('saige', blockedDesignOutput, {})).toBeInstanceOf(Promise);
  });

  it('selected-tool section in template schema', () => {
    const template = buildBuildTemplate('saige', blockedDesignOutput);
    expect(template.sections.find(section => section.id === 'selected-tool')).toMatchObject({
      label: 'Selected Build Tools',
      selectionMode: 'pipeline',
      undServedFirstEnforced: true,
    });
  });

  it('toolSelection is array in output', async () => {
    const service = {
      async getTopTool() {
        return [
          { rank: 1, platform_name: 'Base44', performance_score: 9, target_classes: ['generic_url'] },
          { rank: 2, platform_name: 'Replit', performance_score: 8, target_classes: ['generic_url'] },
        ];
      },
    };
    const output = await runBuild('saige', directiveDesignOutput, {}, {
      toolService: service,
      runId: 'build-test-array',
    });
    expect(output.toolSelection).toMatchObject({
      stepKey: 'build',
      selectionMode: 'pipeline',
    });
    expect(Array.isArray(output.toolSelection.selection)).toBe(true);
  });

  it('pipelineNullAt emitted when sub-step null', async () => {
    const service = {
      async getTopTool() {
        return [
          { rank: 1, platform_name: 'Base44', performance_score: 9, target_classes: ['generic_url'] },
          null,
          { rank: 3, platform_name: 'Replit', performance_score: 8, target_classes: ['generic_url'] },
        ];
      },
    };
    const output = await runBuild('saige', directiveDesignOutput, {}, {
      toolService: service,
      runId: 'build-test-null',
    });
    expect(output.pipelineNullAt).toEqual([1]);
    expect(output.toolSelection.selection.every(Boolean)).toBe(true);
  });

  it('undServedFirstApplied true when service mock provided', async () => {
    const service = {
      async getTopTool() {
        return [
          { rank: 1, platform_name: 'Base44', performance_score: 9, target_classes: ['generic_url'] },
        ];
      },
    };
    const output = await runBuild('saige', directiveDesignOutput, {}, {
      toolService: service,
      runId: 'build-test-underserved',
    });
    expect(output.toolSelection).toMatchObject({
      stepKey: 'build',
      undServedFirstApplied: true,
    });
  });
});
