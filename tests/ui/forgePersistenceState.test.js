import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const researchSrc = readFileSync('src/pages/ForgeResearchForm.jsx', 'utf8');
const buildSrc = readFileSync('src/pages/ForgeBuildForm.jsx', 'utf8');

describe('Forge ProductSSOT persistence state UI', () => {
  it('Research Forge calls the persistence endpoint after runResearch completes', () => {
    expect(researchSrc).toContain('persistForgeStepArtifactClient');
    expect(researchSrc).toContain("stepKey: 'research'");
    expect(researchSrc).toContain("runtime: 'offline'");
    expect(researchSrc).toContain("evidenceTier: 'B'");
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
