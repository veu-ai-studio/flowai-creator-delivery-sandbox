// tests/crawl/crawlCountLabels.test.js
//
// DISPATCH (production runtime fixes) ITEM 3 — the orchestrator emits
// TWO different page-count metrics from TWO different crawl entry
// points; the dispatch guardrail says labels must explain what each
// count measures, never contradictory unlabeled counts.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ORCHESTRATOR_PATH = resolve(__dirname, '../../src/lib/agents/renewal/orchestrator.js');
const orchestratorSrc = readFileSync(ORCHESTRATOR_PATH, 'utf8');

describe('crawl count labels (DISPATCH production runtime ITEM 3)', () => {
  it('W6 STEP 5 multiPageCrawler emits pagesActuallyCrawledLabel explaining the metric', () => {
    expect(orchestratorSrc).toMatch(/pagesActuallyCrawledLabel:\s*['"]BFS pages fetched/);
  });

  it('W6 STEP 5 multiPageCrawler emits pagesDiscoveredLabel explaining the metric', () => {
    expect(orchestratorSrc).toMatch(/pagesDiscoveredLabel:\s*['"]URLs seen in the link graph/);
  });

  it('W6 STEP 3 deep crawl emits pagesCrawledLabel distinguishing it from W6 STEP 5', () => {
    expect(orchestratorSrc).toMatch(/pagesCrawledLabel:\s*['"]Deep-crawl pages fetched/);
  });
});
