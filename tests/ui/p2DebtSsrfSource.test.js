import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const appSrc = readFileSync('src/App.jsx', 'utf8');
const buildFormSrc = readFileSync('src/pages/ForgeBuildForm.jsx', 'utf8');
const runConstructionSrc = readFileSync('src/api/run-construction.js', 'utf8');
const orchestratorSrc = readFileSync('src/lib/agents/renewal/orchestrator.js', 'utf8');
const panelSrc = readFileSync('src/components/RunConstructionPanel.jsx', 'utf8');
const crawlerSrc = readFileSync('api/_lib/crawler.js', 'utf8');

describe('P2 debt + SSRF source wiring', () => {
  it('adds /forge/audit as an alias route without removing quality audit', () => {
    expect(appSrc).toContain('path="/forge/audit"');
    expect(appSrc).toContain('path="/forge/quality-audit"');
  });

  it('ForgeBuildForm initializes and passes Tool Intelligence service', () => {
    expect(buildFormSrc).toContain('createToolIntelligenceService');
    expect(buildFormSrc).toContain('toolService');
    expect(buildFormSrc).toMatch(/runBuild\([\s\S]*toolService/);
  });

  it('run-construction passes URL and description into orchestrator input', () => {
    expect(runConstructionSrc).toContain('const description =');
    expect(runConstructionSrc).toContain('input: {');
    expect(runConstructionSrc).toContain('description,');
    expect(runConstructionSrc).toContain('originalProductUrl');
  });

  it('orchestrator emits full ranked tool envelope for SSE display', () => {
    expect(orchestratorSrc).toContain("kind: 'tool_intelligence_selection'");
    expect(orchestratorSrc).toContain('candidates: Object.freeze');
    expect(orchestratorSrc).toContain('rank_score');
    expect(orchestratorSrc).not.toContain('compositeScore');
  });

  it('orchestrator emits ranked candidates before long-running product discovery', () => {
    const visibleEmission = orchestratorSrc.indexOf('writeGovernance: false');
    const productDiscovery = orchestratorSrc.indexOf('Product Discovery (iteration');
    expect(visibleEmission).toBeGreaterThan(0);
    expect(productDiscovery).toBeGreaterThan(0);
    expect(visibleEmission).toBeLessThan(productDiscovery);
    expect(orchestratorSrc).toContain('emitVisible: false');
    expect(orchestratorSrc).toContain('writeGovernance: true');
  });

  it('RunConstructionPanel renders ranked tool envelope without raw JSON', () => {
    expect(panelSrc).toContain('function RankedToolSelection');
    expect(panelSrc).toContain('rank_score:');
    expect(panelSrc).not.toContain('JSON.stringify(selection');
  });

  it('crawler has DNS-based SSRF guard and manual redirect validation', () => {
    expect(crawlerSrc).toContain('dns.lookup');
    expect(crawlerSrc).toContain('redirects > MAX_SAFE_REDIRECTS');
    expect(crawlerSrc).toContain('function createSsrGuardedLookup');
    expect(crawlerSrc).toContain('pinnedAddress = null');
    expect(crawlerSrc).toContain('all: true');
    expect(crawlerSrc).toContain('candidates.find((entry) => isBlockedIp(entry.address))');
    expect(crawlerSrc).toContain('requestOptions.lookup = createSsrGuardedLookup');
    expect(crawlerSrc).toContain('dnsWarning');
    expect(crawlerSrc).toContain('blocked_private_ip');
  });
});
