import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSrc = readFileSync('src/App.jsx', 'utf8');
const renewalSrc = readFileSync('src/pages/ForgeRenewalForm.jsx', 'utf8');
const runnerSrc = readFileSync('src/lib/forge/renewalRunner.js', 'utf8');

describe('Forge Self-Renewal route and UI contract', () => {
  it('wires /forge/self-renewal to the Self-Renewal Forge page', () => {
    expect(appSrc).toContain("import ForgeRenewalForm from './pages/ForgeRenewalForm'");
    expect(appSrc).toContain('<Route path="/forge/self-renewal" element={<RequireAuth><ForgeRenewalForm /></RequireAuth>} />');
  });

  it('wraps Agent #3 recommend-only behavior without silent mutation', () => {
    expect(runnerSrc).toContain('new Agent3SelfRenewal');
    expect(runnerSrc).toContain("authority: 'recommend_only'");
    expect(runnerSrc).toContain('operator approval required before applying renewal fix');
    expect(runnerSrc).toContain('no safe renewal adapter configured');
  });

  it('persists the Self-Renewal artifact with honest proof labels', () => {
    expect(renewalSrc).toContain('persistForgeStepArtifactClient');
    expect(renewalSrc).toContain("stepKey: 'self-renewal'");
    expect(renewalSrc).toContain("runtime: output.deployOutput?.outputUrl ? 'live_deploy_context' : 'offline'");
    expect(renewalSrc).toContain("proofLabel: output.deployOutput?.outputUrl ? 'LIVE_PREVIEW' : 'UNIT'");
    expect(renewalSrc).toContain('PERSISTED: FAILED');
  });
});
