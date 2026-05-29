import { runOrchestration } from '../src/lib/agents/renewal/orchestrator.js';
import { randomUUID } from 'node:crypto';

// Test 2 — Crawl output improves score against mypreglife.
// Previous baseline (DISPATCH 22): 18/100 without crawl piped to scorer.
// Expected: higher score now that scoring uses all 5 crawled pages.
let pagesCrawled = 0;
let scoreWithCrawl = null;

const result = await runOrchestration({
  url: 'https://mypreglife-platform.vercel.app',
  mode: 'auto',
  runId: randomUUID(),
  supabase: null,
  environment: 'prd',
  gtmTarget: 95,
  maxIterations: 1,
  onStep: (log) => {
    if (log.step === 3 && log.status === 'complete') {
      pagesCrawled = log.result?.pagesCrawled ?? 0;
      console.log(`STEP 3 Deep Crawl: ${pagesCrawled} pages`);
    }
    if (log.step === 5 && log.status === 'complete') {
      scoreWithCrawl = log.scores?.current ?? null;
      console.log(`STEP 5 Score WITH crawl data: ${scoreWithCrawl}/100`);
      console.log(`        layers: l1=${log.result?.layers?.l1} l2=${log.result?.layers?.l2} l3=${log.result?.layers?.l3} l4=${log.result?.layers?.l4} l5=${log.result?.layers?.l5}`);
    }
  },
}).catch((e) => ({ ok: false, exception: e?.message ?? String(e) }));

console.log('');
console.log('--- COMPARISON ---');
console.log(`Pages crawled: ${pagesCrawled}`);
console.log(`Score with crawl data: ${scoreWithCrawl}/100`);
console.log('Was: 18/100 (DISPATCH 22 baseline, before crawl piped to scorer)');
console.log(`Delta: ${scoreWithCrawl !== null ? (scoreWithCrawl - 18) : '?'} points`);
