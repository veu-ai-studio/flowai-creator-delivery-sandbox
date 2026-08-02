import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSrc = readFileSync('src/App.jsx', 'utf8');
const deploySrc = readFileSync('src/pages/ForgeDeployForm.jsx', 'utf8');
const runnerSrc = readFileSync('src/lib/forge/deployRunner.js', 'utf8');

describe('Forge Deploy route and UI contract', () => {
  it('wires /forge/deploy to the Deploy Forge page', () => {
    expect(appSrc).toContain("import ForgeDeployForm from './pages/ForgeDeployForm'");
    expect(appSrc).toContain('<Route path="/forge/deploy" element={<RequireAuth><ForgeDeployForm /></RequireAuth>} />');
  });

  it('requires operator approval before deploy handoff', () => {
    expect(deploySrc).toContain('Authorized operator approval is required before deploy/submission.');
    expect(deploySrc).toContain('Submit Deploy Handoff');
    expect(runnerSrc).toContain('operator approval required before deploy adapter invocation');
  });

  it('persists deploy artifacts with honest runtime and proof labels', () => {
    expect(deploySrc).toContain('persistForgeStepArtifactClient');
    expect(deploySrc).toContain("stepKey: 'deploy'");
    expect(deploySrc).toContain("runtime: output.outputUrl ? 'live_deploy_handoff' : 'offline'");
    expect(deploySrc).toContain("proofLabel: output.outputUrl ? 'LIVE_PREVIEW' : 'UNIT'");
    expect(deploySrc).toContain('PERSISTED: FAILED');
  });

  it('does not call a mock deploy endpoint or fabricate a URL', () => {
    expect(deploySrc).not.toContain('/api/deploy');
    expect(runnerSrc).not.toContain('vercel.app');
    expect(runnerSrc).toContain('no deploy adapter or existing deployment evidence configured');
  });
});
