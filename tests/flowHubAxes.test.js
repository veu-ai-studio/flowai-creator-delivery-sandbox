import { describe, expect, it } from 'vitest';
import {
  analysisDepthLabel,
  effortOverridesForAnalysisDepth,
  flowHubPathFromPathname,
  normalizeFlowHubAxes,
  orchestratorModeForAxes,
  runConstructionModeForAxes,
} from '../src/lib/flowHubAxes.js';

describe('Flow Hub axis contract', () => {
  it('normalizes path aliases and legacy mode values into independent axes', () => {
    expect(flowHubPathFromPathname('/flow-hub/fresh-build')).toBe('fresh_build');
    expect(normalizeFlowHubAxes({ mode: 'migration', operationalMode: 'guided' })).toMatchObject({
      flowHubPath: 'migration',
      operationalMode: 'guided',
      structuralLayer: 'autonomous',
      analysisDepth: 'standard',
    });
  });

  it('maps structural layer and operation mode into run-construction transport modes', () => {
    expect(runConstructionModeForAxes({ structuralLayer: 'autonomous', operationalMode: 'auto', flowHubPath: 'production', inngestReady: true })).toBe('BACKGROUND');
    expect(runConstructionModeForAxes({ structuralLayer: 'supervised', operationalMode: 'auto', flowHubPath: 'production', inngestReady: true })).toBe('GUIDED');
    expect(runConstructionModeForAxes({ structuralLayer: 'controlled', operationalMode: 'auto', flowHubPath: 'production', inngestReady: true })).toBe('MANUAL');
    expect(runConstructionModeForAxes({ structuralLayer: 'autonomous', operationalMode: 'auto', flowHubPath: 'migration', inngestReady: true })).toBe('MIGRATION');
    expect(runConstructionModeForAxes({ structuralLayer: 'autonomous', operationalMode: 'auto', flowHubPath: 'fresh_build', inngestReady: true })).toBe('FRESH_BUILD');
  });

  it('maps the same axes into orchestrator checkpoint behavior', () => {
    expect(orchestratorModeForAxes({ transportMode: 'BACKGROUND', structuralLayer: 'autonomous', operationalMode: 'auto', flowHubPath: 'production' })).toBe('auto');
    expect(orchestratorModeForAxes({ transportMode: 'FOREGROUND', structuralLayer: 'supervised', operationalMode: 'auto', flowHubPath: 'production' })).toBe('guided');
    expect(orchestratorModeForAxes({ transportMode: 'FOREGROUND', structuralLayer: 'controlled', operationalMode: 'auto', flowHubPath: 'production' })).toBe('manual');
  });

  it('turns analysis depth into crawl and scoring effort overrides', () => {
    expect(analysisDepthLabel('deep')).toBe('Deep');
    expect(effortOverridesForAnalysisDepth('quick')).toMatchObject({
      crawlMaxPages: 10,
      structuredCrawlMaxPages: 10,
      phaseBMaxPages: 5,
      postFixReprobe: false,
    });
    expect(effortOverridesForAnalysisDepth('deep')).toMatchObject({
      crawlMaxPages: 80,
      structuredCrawlMaxPages: 80,
      phaseBMaxPages: 40,
      postFixReprobe: true,
    });
    expect(effortOverridesForAnalysisDepth('standard')).toEqual({});
  });
});