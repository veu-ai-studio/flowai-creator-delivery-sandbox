import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { __internals } from '../../../src/lib/agents/renewal/orchestrator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const orchestratorSource = readFileSync(
  resolve(__dirname, '../../../src/lib/agents/renewal/orchestrator.js'),
  'utf8',
);

describe('pipeline effort profile', () => {
  it('scales small sites to bounded crawl and probe budgets', () => {
    const profile = __internals.buildPipelineEffortProfile({
      crawlSummary: { pagesActuallyCrawled: 5, pagesDiscovered: 5 },
    });

    expect(profile).toMatchObject({
      detectedPages: 5,
      smallSite: true,
      crawlMaxPages: 10,
      crawlDepth: 3,
      structuredCrawlMaxPages: 10,
      structuredCrawlDepth: 3,
      phaseBMaxPages: 5,
      phaseBProbeBudgetMs: 60_000,
      phaseBOverallBudgetMs: 90_000,
      phaseBPerPageBudgetMs: 18_000,
      phaseBMaxInteractives: 8,
      postFixReprobe: false,
    });
  });

  it('threads the effort profile through crawl, Phase B, and post-fix passes', () => {
    expect(orchestratorSource).toContain('let effortProfile = buildPipelineEffortProfile({ args })');
    expect(orchestratorSource).toContain('effortProfile = buildPipelineEffortProfile({ args, crawlSummary: crawlSiteResult })');
    expect(orchestratorSource).toContain('maxPages: effortProfile.structuredCrawlMaxPages');
    expect(orchestratorSource).toContain('const urls = allUrls.slice(0, effortProfile.phaseBMaxPages)');
    expect(orchestratorSource).toContain('effortProfile.phaseBProbeBudgetMs');
    expect(orchestratorSource).toContain('effortProfile.postFixReprobe &&');
  });
});
