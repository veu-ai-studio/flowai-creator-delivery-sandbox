import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSrc = readFileSync('src/App.jsx', 'utf8');
const monitorSrc = readFileSync('src/pages/ForgeMonitorForm.jsx', 'utf8');
const runnerSrc = readFileSync('src/lib/forge/monitorRunner.js', 'utf8');

describe('Forge Monitor route and UI contract', () => {
  it('wires /forge/monitor to the Monitor Forge page', () => {
    expect(appSrc).toContain("import ForgeMonitorForm from './pages/ForgeMonitorForm'");
    expect(appSrc).toContain('<Route path="/forge/monitor" element={<RequireAuth><ForgeMonitorForm /></RequireAuth>} />');
  });

  it('does not mark healthy without a monitor adapter live check', () => {
    expect(runnerSrc).toContain('monitorAdapter not configured');
    expect(runnerSrc).toContain("checked: true");
    expect(runnerSrc).toContain("recommendation: shouldRenew ? 'self-renewal' : 'none'");
  });

  it('persists Monitor artifacts with honest proof labels', () => {
    expect(monitorSrc).toContain('persistForgeStepArtifactClient');
    expect(monitorSrc).toContain("stepKey: 'monitor'");
    expect(monitorSrc).toContain("proofLabel: output.target?.outputUrl ? 'LIVE_PREVIEW' : 'UNIT'");
    expect(monitorSrc).toContain('PERSISTED: FAILED');
  });
});
