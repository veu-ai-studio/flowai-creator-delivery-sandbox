import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSrc = readFileSync('src/App.jsx', 'utf8');
const gtmSrc = readFileSync('src/pages/ForgeGTMForm.jsx', 'utf8');
const runnerSrc = readFileSync('src/lib/forge/gtmRunner.js', 'utf8');

describe('Forge GTM route and UI contract', () => {
  it('wires /forge/gtm to the GTM Forge page', () => {
    expect(appSrc).toContain("import ForgeGTMForm from './pages/ForgeGTMForm'");
    expect(appSrc).toContain('<Route path="/forge/gtm" element={<ForgeGTMForm />} />');
  });

  it('uses the canonical readiness scorer and requires a human decision', () => {
    expect(runnerSrc).toContain('computeGtmReadiness');
    expect(runnerSrc).toContain('human decision log required before GTM readiness');
    expect(gtmSrc).toContain('Human decision log required before GTM readiness.');
  });

  it('persists GTM artifacts with honest proof labels', () => {
    expect(gtmSrc).toContain('persistForgeStepArtifactClient');
    expect(gtmSrc).toContain("stepKey: 'gtm'");
    expect(gtmSrc).toContain("proofLabel: output.context?.deployOutput?.outputUrl ? 'LIVE_PREVIEW' : 'UNIT'");
    expect(gtmSrc).toContain('PERSISTED: FAILED');
  });
});
