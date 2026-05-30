import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { scoreForgeStep } from '../../src/lib/forge/forgeStepScorer.js';
import { formatResearchEvidence, logResearchEvidence } from '../../src/lib/forge/researchEvidenceLogger.js';
import { runResearch, selectResearchTool } from '../../src/lib/forge/researchRunner.js';
import { buildResearchTemplate, TARGET_CUSTOMER_PROFILE } from '../../src/lib/forge/researchTemplate.js';

const matrixArtifact = {
  version: 'matrix-test',
  layer1: [
    { surfaceId: 'verified-one', status: 'VERIFIED', tier: 'A' },
    { surfaceId: 'partial-one', status: 'PARTIAL', tier: 'B' },
    { surfaceId: 'unknown-one', status: 'NOT_IMPLEMENTED', tier: 'B' },
  ],
  layer2: [],
};

const configuredTools = [
  { toolId: 'cheap-low', toolName: 'Cheap Low', performanceScore: 0.55, costPerQuery: 0.01, available: true },
  { toolId: 'best-tool', toolName: 'Best Tool', performanceScore: 0.95, costPerQuery: 0.02, available: true },
  { toolId: 'offline-tool', toolName: 'Offline Tool', performanceScore: 1, costPerQuery: 0, available: false },
];

const completeOrchestratedInputs = {
  'market-gaps': 'SAIGE must close the gap between ESG simulations and persisted workflow evidence.',
  'regulatory-requirements': 'GRI, CDP, TCFD, SEC climate rule, CSRD, and customer-specific audit evidence apply.',
  'regulatory-jurisdiction': 'Research must map national and local ESG requirements for the target customer jurisdiction.',
  'competitive-landscape': 'Competitors include ESG reporting suites; SAIGE fills the orchestration and functionalization gap.',
  'next-priorities': 'Functionalize P0 persisted workflows, then verify reload-persistence evidence before design expansion.',
};

describe('SAIGE forge Step 1 research', () => {
  it('buildResearchTemplate returns correct schema', () => {
    const template = buildResearchTemplate('saige');
    expect(template).toMatchObject({
      productId: 'saige',
      templateVersion: '1.0',
    });
    expect(template.sections.map(section => section.id)).toEqual([
      'current-state',
      'research-tool-selection',
      'target-customer',
      'market-gaps',
      'regulatory-requirements',
      'regulatory-jurisdiction',
      'competitive-landscape',
      'next-priorities',
      'selected-tool',
    ]);
    expect(template.sections.filter(section => section.source === 'orchestrated')).toHaveLength(5);
  });

  it('auto sections populated from matrix artifact', async () => {
    const output = await runResearch('saige', completeOrchestratedInputs, {
      matrixArtifact,
      availableTools: configuredTools,
    });
    const currentState = output.sections.find(section => section.id === 'current-state').input;
    expect(currentState).toMatchObject({
      productFilter: 'none-applied',
      strengths: ['verified-one'],
      gapCandidates: ['partial-one'],
      unknownOrUnverified: ['unknown-one'],
    });
  });

  it('orchestrated sections return honest stub when no research tool configured', async () => {
    const output = await runResearch('saige', {}, { matrixArtifact });
    const marketGaps = output.sections.find(section => section.id === 'market-gaps');
    expect(marketGaps.input).toEqual({
      complete: false,
      verified: false,
      reason: 'No AI research tools configured; manual input required for orchestrated sections',
      sectionId: 'market-gaps',
    });
  });

  it('selectResearchTool ranks correctly', () => {
    const selected = selectResearchTool(configuredTools);
    expect(selected).toMatchObject({
      toolId: 'best-tool',
      toolName: 'Best Tool',
      costPerQuery: 0.02,
    });
    expect(selected.rankScore).toBeGreaterThan(90);
    expect(selected.selectionReason).toContain('performance');
  });

  it('target-customer pre-populated correctly', () => {
    const template = buildResearchTemplate('saige');
    const targetCustomer = template.sections.find(section => section.id === 'target-customer');
    expect(targetCustomer).toMatchObject({
      source: 'manual',
      status: 'complete',
      input: TARGET_CUSTOMER_PROFILE,
    });
  });

  it('competitive-landscape prompt uses product name from runner config', async () => {
    const output = await runResearch('saige', {}, {
      matrixArtifact,
      productName: 'SAIGE Platform',
    });
    const competitiveLandscape = output.sections.find(section => section.id === 'competitive-landscape');
    expect(competitiveLandscape.prompt).toBe('What gaps does SAIGE Platform fill?');
  });

  it("source:'orchestrated' sections excluded from manual completion check", async () => {
    const output = await runResearch('saige', {}, { matrixArtifact });
    expect(output.evidenceSummary.manualSections).toBe(1);
    expect(output.evidenceSummary.orchestratedSections).toBe(5);
    expect(output.sections.find(section => section.id === 'target-customer').input).toBe(TARGET_CUSTOMER_PROFILE);
  });

  it('completionPct calculates correctly', async () => {
    const output = await runResearch('saige', {}, { matrixArtifact });
    expect(output.completionPct).toBe(25);
  });

  it('readyForDesign false when orchestrated sections are incomplete', async () => {
    const output = await runResearch('saige', {}, { matrixArtifact });
    expect(output.readyForDesign).toBe(false);
  });

  it('readyForDesign true when all sections complete', async () => {
    const output = await runResearch('saige', completeOrchestratedInputs, {
      matrixArtifact,
      availableTools: configuredTools,
    });
    expect(output.completionPct).toBe(100);
    expect(output.readyForDesign).toBe(true);
  });

  it('forgeStepScorer returns corrective prompts when score < 95%', async () => {
    const output = await runResearch('saige', {}, { matrixArtifact });
    const score = scoreForgeStep(output);
    expect(score.readyForNextStep).toBe(false);
    expect(score.correctivePrompts).toEqual(expect.arrayContaining([
      expect.stringContaining('Section market-gaps requires valid input'),
    ]));
  });

  it('researchEvidenceLogger produces correct evidence file format', async () => {
    const output = await runResearch('saige', completeOrchestratedInputs, {
      matrixArtifact,
      availableTools: configuredTools,
    });
    const dir = mkdtempSync(path.join(tmpdir(), 'flowai-forge-'));
    const result = logResearchEvidence(output, {
      cwd: dir,
      evidencePath: 'docs/forge/saige-step1-research-evidence.md',
    });
    const written = readFileSync(result.absolutePath, 'utf8');

    expect(written).toContain('# saige Step 1 Research Evidence');
    expect(written).toContain('MatrixArtifactVersion: matrix-test');
    expect(written).toContain('CompletionPct: 100%');
    expect(written).toContain('ReadyForDesign: true');
    expect(formatResearchEvidence(output)).toContain('## Orchestrated research');
  });

  it('Tier-C input never accepted as evidence', () => {
    const score = scoreForgeStep({
      stepId: 'step-1-research',
      sections: [{ id: 'ephemeral', prompt: 'Nope', source: 'manual', evidenceTier: 'C', input: 'filled' }],
    });
    expect(score.score).toBe(0);
    expect(score.readyForNextStep).toBe(false);
  });

  it('orchestrated next-priorities can be supplied as completed research output', async () => {
    const output = await runResearch('saige', completeOrchestratedInputs, {
      matrixArtifact,
      availableTools: configuredTools,
    });
    const nextPriorities = output.sections.find(section => section.id === 'next-priorities');
    expect(nextPriorities.source).toBe('orchestrated');
    expect(nextPriorities.input).toContain('Functionalize P0');
  });

  it('runner function is async', () => {
    expect(runResearch('saige', {}, { matrixArtifact })).toBeInstanceOf(Promise);
  });

  it('selected-tool section present in template', () => {
    const template = buildResearchTemplate('saige');
    expect(template.sections.find(section => section.id === 'selected-tool')).toMatchObject({
      label: 'Selected Research Tool',
      undServedFirstEnforced: true,
    });
  });

  it('toolSelection field present in runner output and null when no service provided', async () => {
    const output = await runResearch('saige', {}, { matrixArtifact });
    expect(Object.hasOwn(output, 'toolSelection')).toBe(true);
    expect(output.toolSelection).toBeNull();
  });

  it('undServedFirstApplied true in output when service mock provided', async () => {
    const service = {
      async getTopTool() {
        return [{ rank: 1, platform_name: 'Perplexity AI', performance_score: 9, target_classes: ['generic_url'] }];
      },
    };
    const output = await runResearch('saige', {}, { matrixArtifact, toolService: service, runId: 'research-test' });
    expect(output.toolSelection).toMatchObject({
      stepKey: 'research',
      undServedFirstApplied: true,
    });
  });
});
