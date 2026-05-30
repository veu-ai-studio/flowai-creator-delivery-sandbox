import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { formatDesignEvidence, logDesignEvidence } from '../../src/lib/forge/designEvidenceLogger.js';
import { runDesign, selectDesignTool } from '../../src/lib/forge/designRunner.js';
import { scoreDesignStep, DESIGN_PARTIAL_TOOL_REQUIRED } from '../../src/lib/forge/designStepScorer.js';
import { buildDesignTemplate } from '../../src/lib/forge/designTemplate.js';

const researchOutput = {
  productId: 'saige',
  stepId: 'step-1-research',
  matrixArtifactVersion: 'matrix-test',
  sections: [
    {
      id: 'current-state',
      label: 'Current Product State',
      source: 'auto',
      evidenceTier: 'A',
      input: {
        strengths: ['verified-one'],
        gapCandidates: ['partial-one'],
      },
    },
    {
      id: 'target-customer',
      label: 'Target Customer Profile',
      source: 'manual',
      evidenceTier: 'B',
      input: 'All ESG, EHS, CSR, SDGs and Sustainability practitioners in school districts, colleges and universities, local and national government, businesses and NGOs',
    },
    {
      id: 'market-gaps',
      label: 'Market and User Gaps',
      source: 'orchestrated',
      evidenceTier: 'B',
      input: {
        complete: false,
        verified: false,
        reason: 'No AI research tools configured; manual input required for orchestrated sections',
      },
    },
  ],
};

const designTools = [
  { toolId: 'low', toolName: 'Low Tool', performanceScore: 0.5, costPerQuery: 0.01, available: true },
  { toolId: 'design-best', toolName: 'Design Best', performanceScore: 0.9, costPerQuery: 0.02, available: true },
];

const completeDesignInputs = {
  'feature-priorities': 'P0: functionalize supplier risk, EIP score, and reporting obligations.',
  'user-flows': 'Practitioner opens dashboard, completes org setup, creates evidence, and verifies persistence.',
  'technical-requirements': 'Persist records through Base44 entities, enforce org scope, and collect reload evidence.',
  'design-decision-log': 'Victor decision: prioritize P0 persisted workflows.',
};

describe('SAIGE forge Step 2 design', () => {
  it('buildDesignTemplate returns correct schema', () => {
    const template = buildDesignTemplate('saige', researchOutput);
    expect(template).toMatchObject({
      productId: 'saige',
      researchStepId: 'step-1-research',
      templateVersion: '1.0',
    });
    expect(template.sections.map(section => section.id)).toEqual([
      'design-principles',
      'feature-priorities',
      'user-flows',
      'technical-requirements',
      'design-gaps',
      'design-decision-log',
      'selected-tool',
    ]);
  });

  it('auto sections derived from research output', async () => {
    const output = await runDesign('saige', researchOutput, {});
    const principles = output.sections.find(section => section.id === 'design-principles').input;
    expect(principles.targetCustomer).toContain('All ESG');
    expect(principles.currentStrengths).toEqual(['verified-one']);
    expect(principles.verifiedGaps).toEqual(['partial-one']);
  });

  it('orchestrated sections return honest stub when no design tool configured', async () => {
    const output = await runDesign('saige', researchOutput, {});
    const priorities = output.sections.find(section => section.id === 'feature-priorities');
    expect(priorities.input).toEqual({
      complete: false,
      verified: false,
      reason: 'No AI design tool configured; manual input required',
      sectionId: 'feature-priorities',
    });
  });

  it('selectDesignTool ranks correctly', () => {
    const selected = selectDesignTool(designTools);
    expect(selected).toMatchObject({
      toolId: 'design-best',
      toolName: 'Design Best',
      costPerQuery: 0.02,
    });
    expect(selected.rankScore).toBeGreaterThan(89);
  });

  it('design-gaps populated from research stubs', async () => {
    const output = await runDesign('saige', researchOutput, {});
    const gaps = output.sections.find(section => section.id === 'design-gaps').input;
    expect(gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sectionId: 'market-gaps',
      }),
    ]));
  });

  it('DESIGN_PARTIAL_TOOL_REQUIRED emitted when orchestrated sections are stubs', async () => {
    const output = await runDesign('saige', researchOutput, {
      'design-decision-log': 'Victor decision: capture partial design.',
    });
    expect(output.flag).toBe(DESIGN_PARTIAL_TOOL_REQUIRED);
    expect(output.partialFlag.incompleteSections).toEqual([
      'feature-priorities',
      'user-flows',
      'technical-requirements',
    ]);
  });

  it('readyForBuild blocked when stubs present without MINIMUM BUILD DIRECTIVE', async () => {
    const output = await runDesign('saige', researchOutput, {
      'design-decision-log': 'Victor decision: capture partial design.',
    });
    expect(output.designComplete).toBe(false);
    expect(output.readyForBuild).toBe(false);
  });

  it('Victor minimum build directive unlocks readyForBuild', async () => {
    const output = await runDesign('saige', researchOutput, {
      'design-decision-log': 'MINIMUM BUILD DIRECTIVE: scaffold Step 3 while design tools remain pending.',
    });
    expect(output.minimumBuildDirectivePresent).toBe(true);
    expect(output.designScore).toBe(100);
    expect(output.designComplete).toBe(true);
    expect(output.readyForBuild).toBe(true);
  });

  it('readyForBuild true only when designScore >= 95 and designComplete === true', async () => {
    const complete = await runDesign('saige', researchOutput, completeDesignInputs, {
      availableTools: designTools,
    });
    const partial = await runDesign('saige', researchOutput, {
      'design-decision-log': 'Victor decision: partial only.',
    });

    expect(complete.designScore).toBe(100);
    expect(complete.designComplete).toBe(true);
    expect(complete.readyForBuild).toBe(true);
    expect(partial.designScore).toBeLessThan(95);
    expect(partial.designComplete).toBe(false);
    expect(partial.readyForBuild).toBe(false);
  });

  it('designStepScorer returns corrective prompts when score < 95', async () => {
    const output = await runDesign('saige', researchOutput, {});
    const score = scoreDesignStep(output);
    expect(score.readyForBuild).toBe(false);
    expect(score.correctivePrompts).toEqual(expect.arrayContaining([
      expect.stringContaining('MINIMUM BUILD DIRECTIVE'),
    ]));
  });

  it('designEvidenceLogger produces correct format', async () => {
    const output = await runDesign('saige', researchOutput, completeDesignInputs, {
      availableTools: designTools,
    });
    const dir = mkdtempSync(path.join(tmpdir(), 'flowai-design-forge-'));
    const result = logDesignEvidence(output, {
      cwd: dir,
      evidencePath: 'docs/forge/saige-step2-design-evidence.md',
    });
    const written = readFileSync(result.absolutePath, 'utf8');

    expect(written).toContain('# SAIGE Step 2 Design Evidence');
    expect(written).toContain('DesignScore: 100%');
    expect(written).toContain('ReadyForBuild: true');
    expect(formatDesignEvidence(output)).toContain('## Derived gaps');
  });

  it('NEXT STEP SHELL labeled correctly when design evidence is partial', async () => {
    const output = await runDesign('saige', researchOutput, {
      'design-decision-log': 'Victor decision: partial only.',
    });
    const label = output.readyForBuild
      ? 'Build scaffold queued'
      : 'Build scaffold queued - design evidence partial, not build-ready';
    expect(label).toBe('Build scaffold queued - design evidence partial, not build-ready');
  });

  it('Tier-C never accepted as evidence', () => {
    const score = scoreDesignStep({
      stepId: 'step-2-design',
      sections: [{ id: 'ephemeral', prompt: 'Nope', source: 'manual', evidenceTier: 'C', input: 'filled' }],
    });
    expect(score.designScore).toBe(0);
    expect(score.readyForBuild).toBe(false);
  });

  it('runner function is async', () => {
    expect(runDesign('saige', researchOutput, {})).toBeInstanceOf(Promise);
  });

  it('selected-tool section present in template', () => {
    const template = buildDesignTemplate('saige', researchOutput);
    expect(template.sections.find(section => section.id === 'selected-tool')).toMatchObject({
      label: 'Selected Design Tool',
      undServedFirstEnforced: true,
    });
  });

  it('toolSelection field present in runner output and null when no service provided', async () => {
    const output = await runDesign('saige', researchOutput, {});
    expect(Object.hasOwn(output, 'toolSelection')).toBe(true);
    expect(output.toolSelection).toBeNull();
  });

  it('undServedFirstApplied true in output when service mock provided', async () => {
    const service = {
      async getTopTool() {
        return [{ rank: 1, platform_name: 'Figma', performance_score: 10, target_classes: ['generic_url'] }];
      },
    };
    const output = await runDesign('saige', researchOutput, {}, { toolService: service, runId: 'design-test' });
    expect(output.toolSelection).toMatchObject({
      stepKey: 'design',
      undServedFirstApplied: true,
    });
  });
});
