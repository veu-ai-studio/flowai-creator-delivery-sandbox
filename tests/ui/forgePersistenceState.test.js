import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const researchSrc = readFileSync('src/pages/ForgeResearchForm.jsx', 'utf8');
const buildSrc = readFileSync('src/pages/ForgeBuildForm.jsx', 'utf8');

describe('Forge ProductSSOT persistence state UI', () => {
  it('Research Forge executes and persists through the authenticated independent-stage endpoint', () => {
    expect(researchSrc).toContain("fetch('/api/forge/stage'");
    expect(researchSrc).toContain("stage: 'research'");
    expect(researchSrc).toContain("environment: 'staging'");
    expect(researchSrc).toContain('productionPromotionAuthorized: false');
    expect(researchSrc).toContain('payload.artifact?.output');
    expect(researchSrc).toContain('loadDurableStageArtifacts');
    expect(researchSrc).toContain('artifacts.research?.output');
    expect(researchSrc).toContain('setResearchOutput(artifacts.research.output)');
  });

  it('Build Forge calls the persistence endpoint after runBuild completes', () => {
    expect(buildSrc).toContain('persistForgeStepArtifactClient');
    expect(buildSrc).toContain("stepKey: 'build'");
    expect(buildSrc).toContain("runtime: 'offline'");
    expect(buildSrc).toContain("evidenceTier: 'B'");
  });

  it('shows a distinct persisted: failed state instead of only complete', () => {
    expect(researchSrc).toContain('PERSISTED: FAILED');
    expect(buildSrc).toContain('PERSISTED: FAILED');
    expect(researchSrc).toContain('persistenceDisplayText(persistenceState)');
    expect(buildSrc).toContain('persistenceDisplayText(persistenceState)');
  });
});
