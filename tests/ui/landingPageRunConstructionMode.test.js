import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const landingSource = readFileSync(new URL('../../src/pages/LandingPage.jsx', import.meta.url), 'utf8');
const helperSource = landingSource.slice(
  landingSource.indexOf('export function resolveRunConstructionMode'),
  landingSource.indexOf('function detectMigrationPlatformHint'),
);
const resolveRunConstructionMode = new Function(`
  ${helperSource.replace('export ', '')}
  return resolveRunConstructionMode;
`)();

describe('LandingPage RunConstruction mode selection', () => {
  it('passes BACKGROUND for Auto when Inngest is ready', () => {
    expect(resolveRunConstructionMode({
      mode: 'auto',
      inngestReady: true,
    })).toBe('BACKGROUND');
  });

  it('falls back to FOREGROUND for Auto when Inngest is not ready', () => {
    expect(resolveRunConstructionMode({
      mode: 'auto',
      inngestReady: false,
    })).toBe('FOREGROUND');
  });

  it('falls back to FOREGROUND for Auto when readiness fetch fails or is missing', () => {
    expect(resolveRunConstructionMode({
      mode: 'auto',
    })).toBe('FOREGROUND');
  });

  it('preserves explicit migration and fresh-build modes over async Auto', () => {
    expect(resolveRunConstructionMode({
      mode: 'auto',
      isMigrationMode: true,
      inngestReady: true,
    })).toBe('MIGRATION');
    expect(resolveRunConstructionMode({
      mode: 'auto',
      isFreshBuildMode: true,
      inngestReady: true,
    })).toBe('FRESH_BUILD');
  });

  it('applies structural layer ceilings before background Auto', () => {
    expect(resolveRunConstructionMode({
      mode: 'auto',
      structuralLayer: 'supervised',
      inngestReady: true,
    })).toBe('GUIDED');
    expect(resolveRunConstructionMode({
      mode: 'auto',
      structuralLayer: 'controlled',
      inngestReady: true,
    })).toBe('MANUAL');
  });

  it('respects explicit guided and manual operational modes', () => {
    expect(resolveRunConstructionMode({
      operationalMode: 'guided',
      structuralLayer: 'autonomous',
      inngestReady: true,
    })).toBe('GUIDED');
    expect(resolveRunConstructionMode({
      operationalMode: 'manual',
      structuralLayer: 'autonomous',
      inngestReady: true,
    })).toBe('MANUAL');
  });
});
