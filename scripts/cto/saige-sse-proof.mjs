#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../..');

const DEFAULT_BASE_URL = 'https://flowai-dun.vercel.app';
const DEFAULT_PRODUCT_SCOPE = 'saige';
const DEFAULT_TARGET_URL = 'https://saigeplatform.com';
const DEFAULT_GTM_TARGET = 95;
const DEFAULT_MAX_ITERATIONS = 1;
const DEFAULT_MODE = 'auto';
const DEFAULT_OUTPUT_DIR = path.join(repoRoot, '.flowai-proof');

function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    args[key] = next && !next.startsWith('--') ? argv[++i] : true;
  }
  return args;
}

function usage() {
  return [
    'Usage:',
    '  node scripts/cto/saige-sse-proof.mjs --input <transcript.sse> [--url <source-url>] [--summary-out <summary.json>]',
    '  node scripts/cto/saige-sse-proof.mjs --run-live [--base-url https://flowai-dun.vercel.app] [--output-dir <dir>]',
    '',
    'Safe default: parses an existing transcript. Live production calls require --run-live.',
  ].join('\n');
}

function nowStamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return [
    d.getUTCFullYear(),
    pad(d.getUTCMonth() + 1),
    pad(d.getUTCDate()),
    pad(d.getUTCHours()),
    pad(d.getUTCMinutes()),
    pad(d.getUTCSeconds()),
  ].join('');
}

function tryParseJson(raw) {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (e) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export function parseSseTranscript(text) {
  const events = [];
  const lines = String(text || '').split(/\r?\n/);
  for (const line of lines) {
    if (!line.startsWith('data:')) continue;
    const raw = line.slice('data:'.length).trim();
    if (!raw) continue;
    if (raw === '[DONE]') {
      events.push({ raw, type: 'done', payload: null, parseError: null });
      continue;
    }
    const parsed = tryParseJson(raw);
    if (parsed.ok) {
      const payload = parsed.value;
      events.push({
        raw,
        type: typeof payload?.type === 'string' ? payload.type : '<none>',
        payload,
        parseError: null,
      });
    } else {
      events.push({ raw, type: '<parse_error>', payload: null, parseError: parsed.error });
    }
  }
  return events;
}

function inc(map, key) {
  const k = key || '<none>';
  map[k] = (map[k] || 0) + 1;
}

function firstStep(events, predicate) {
  for (const event of events) {
    const log = event.payload?.log;
    if (!log || event.type !== 'step') continue;
    if (predicate(log)) return log;
  }
  return null;
}

function hasStep(events, predicate) {
  return Boolean(firstStep(events, predicate));
}

function textOf(value) {
  return [
    value?.stepName,
    value?.tool,
    value?.status,
    value?.result?.kind,
    value?.result?.exitReason,
    value?.result?.code,
  ].filter(Boolean).join(' ').toLowerCase();
}

function latestAt(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i];
    const at = event.payload?.at || event.payload?.log?.at || event.payload?.iteration?.at;
    if (at) return at;
  }
  return null;
}

function finalPayload(events) {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].type === 'final') return events[i].payload?.result ?? events[i].payload;
  }
  return null;
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    url.hash = '';
    const normalized = url.toString().replace(/\/$/, '');
    return normalized.toLowerCase();
  } catch {
    return null;
  }
}

function isDistinctObservedUrl(candidate, sourceUrl) {
  const normalizedCandidate = normalizeUrl(candidate);
  if (!normalizedCandidate) return false;
  const normalizedSource = normalizeUrl(sourceUrl);
  return !normalizedSource || normalizedCandidate !== normalizedSource;
}

function observedDeliveryUrl(value, sourceUrl) {
  if (value?.upgradeDeployed === false) return null;
  const candidates = [
    value?.deliveryArtifactUrl,
    value?.upgradedUrl,
    value?.previewUrl,
  ];
  return candidates.find((candidate) => isDistinctObservedUrl(candidate, sourceUrl)) || null;
}

export function summarizeSseProof(events, options = {}) {
  const typeCounts = {};
  for (const event of events) inc(typeCounts, event.type);

  const finalResult = finalPayload(events);
  const finalLogs = Array.isArray(finalResult?.orchestrationLog) ? finalResult.orchestrationLog : [];
  const branchFromFinalLog = [...(finalResult?.orchestrationLog || [])].reverse()
    .find((log) => log?.result?.branchName);
  const sourceUrl = options.sourceUrl || options.request?.url || finalResult?.url || finalResult?.sourceUrl || finalResult?.originalUrl || null;
  const deliveryUrlFromFinal = observedDeliveryUrl(finalResult, sourceUrl);
  const finalLogHas = (predicate) => finalLogs.some((log) => predicate(log));

  const milestones = {
    credentialMode: hasStep(events, (log) => textOf(log).includes('operator credential mode')),
    productDiscovery: hasStep(events, (log) => textOf(log).includes('product_registry lookup')),
    operatorReadiness: hasStep(events, (log) => textOf(log).includes('operator credential readiness')),
    upgradeTargetResolved: hasStep(events, (log) => textOf(log).includes('upgradetargetresolver')),
    upgradeTargetProvisioned: hasStep(events, (log) => textOf(log).includes('upgradetargetprovisioner')),
    repoProbe: hasStep(events, (log) => textOf(log).includes('githuboperatorrepoprobe')),
    rateCap: hasStep(events, (log) => textOf(log).includes('ratecap')),
    crawlComplete: events.some((event) => event.type === 'iteration' && event.payload?.iteration?.kind === 'crawl_complete')
      || hasStep(events, (log) => log?.result?.kind === 'crawl_complete'),
    branchCreation: Boolean(branchFromFinalLog)
      || hasStep(events, (log) => Boolean(log?.result?.branchName)),
    previewDeployment: Boolean(deliveryUrlFromFinal)
      || hasStep(events, (log) => Boolean(observedDeliveryUrl(log?.result, sourceUrl))),
    postFixScoring: Boolean(finalResult?.finalScore || finalResult?.postScore)
      || finalLogHas((log) => /post[-_ ]?fix|post score|postscore/i.test(`${log?.stepName || ''} ${log?.tool || ''}`))
      || hasStep(events, (log) => /post[-_ ]?fix|post score|postscore/i.test(`${log?.stepName || ''} ${log?.tool || ''}`)),
    finalGovernanceWrite: finalLogHas((log) => /governance|audit/i.test(textOf(log)) && Number(log?.step ?? 0) >= 8)
      || hasStep(events, (log) => /governance|audit/i.test(textOf(log)) && Number(log?.step ?? 0) >= 8),
    productSsotPersistence: events.some((event) => event.type === 'symbiotic_write')
      || finalLogHas((log) => /productssot|product_ssot|symbiotic/i.test(textOf(log)))
      || hasStep(events, (log) => /productssot|product_ssot|symbiotic/i.test(textOf(log))),
  };

  const hasDone = typeCounts.done > 0;
  const hasFinal = typeCounts.final > 0;
  const hasTimeout = typeCounts.timeout > 0;
  const hasError = typeCounts.error > 0;
  const acceptedTerminal = hasDone && (hasFinal || hasTimeout);
  const endToEndComplete = hasDone
    && hasFinal
    && milestones.branchCreation
    && milestones.previewDeployment
    && milestones.postFixScoring
    && milestones.finalGovernanceWrite
    && milestones.productSsotPersistence;

  let verdict = 'INCOMPLETE_STREAM';
  if (endToEndComplete) verdict = 'END_TO_END_COMPLETE';
  else if (acceptedTerminal && hasFinal) verdict = 'TERMINAL_FINAL_INCOMPLETE_MILESTONES';
  else if (acceptedTerminal && hasTimeout) verdict = 'HONEST_TIMEOUT_TERMINAL';
  else if (hasDone && hasError) verdict = 'TERMINAL_ERROR';
  else if (hasDone) verdict = 'DONE_WITHOUT_TERMINAL_EVENT';

  const lastEvent = events.at(-1) || null;
  return {
    verdict,
    acceptedTerminal,
    endToEndComplete,
    eventCount: events.length,
    typeCounts,
    hasDone,
    hasFinal,
    hasTimeout,
    hasError,
    lastAt: latestAt(events),
    lastEventType: lastEvent?.type ?? null,
    lastEventPreview: lastEvent?.raw ? lastEvent.raw.slice(0, 500) : null,
    runId: options.runId || finalResult?.runId || events[0]?.payload?.runId || null,
    baseUrl: options.baseUrl || null,
    request: options.request || null,
    milestones,
    observed: {
      branchName: branchFromFinalLog?.result?.branchName || null,
      previewUrl: deliveryUrlFromFinal,
      finalScore: finalResult?.finalScore ?? finalResult?.effectiveTrustScore ?? null,
      exitReason: finalResult?.exitReason ?? null,
      productSsotPersisted: milestones.productSsotPersistence,
    },
    note: 'No VERIFIED movement is justified by this summary alone; use live production evidence and SSOT gates.',
  };
}

function renderMarkdown(summary) {
  const milestoneLines = Object.entries(summary.milestones)
    .map(([key, value]) => `- ${key}: ${value ? 'observed' : 'not_observed'}`)
    .join('\n');
  return [
    '# SAIGE SSE Proof Summary',
    '',
    `- Verdict: ${summary.verdict}`,
    `- Accepted terminal: ${summary.acceptedTerminal}`,
    `- End-to-end complete: ${summary.endToEndComplete}`,
    `- Run ID: ${summary.runId || '(unknown)'}`,
    `- Events: ${summary.eventCount}`,
    `- Has [DONE]: ${summary.hasDone}`,
    `- Has final: ${summary.hasFinal}`,
    `- Has timeout: ${summary.hasTimeout}`,
    `- Has error: ${summary.hasError}`,
    `- Last event type: ${summary.lastEventType || '(none)'}`,
    `- Last event at: ${summary.lastAt || '(unknown)'}`,
    '',
    '## Milestones',
    '',
    milestoneLines,
    '',
    '## Observed Delivery Fields',
    '',
    `- Branch: ${summary.observed.branchName || '(none)'}`,
    `- Delivery URL: ${summary.observed.previewUrl || '(none)'}`,
    `- Final score: ${summary.observed.finalScore ?? '(none)'}`,
    `- Exit reason: ${summary.observed.exitReason || '(none)'}`,
    '',
    summary.note,
    '',
  ].join('\n');
}

function writeSummary(summary, summaryOut) {
  if (!summaryOut) return;
  mkdirSync(path.dirname(summaryOut), { recursive: true });
  writeFileSync(summaryOut, `${JSON.stringify(summary, null, 2)}\n`);
  const markdownOut = summaryOut.replace(/\.json$/i, '.md');
  writeFileSync(markdownOut, renderMarkdown(summary));
}

async function runLive(args) {
  const baseUrl = String(args['base-url'] || DEFAULT_BASE_URL).replace(/\/$/, '');
  const outputDir = path.resolve(String(args['output-dir'] || DEFAULT_OUTPUT_DIR));
  const runId = String(args['run-id'] || `cto-saige-sse-proof-${nowStamp()}`);
  const request = {
    gtmTarget: Number(args['gtm-target'] || DEFAULT_GTM_TARGET),
    url: String(args.url || DEFAULT_TARGET_URL),
    maxIterations: Number(args['max-iterations'] || DEFAULT_MAX_ITERATIONS),
    runId,
    mode: String(args.mode || DEFAULT_MODE),
  };
  const productScope = String(args['product-scope'] || DEFAULT_PRODUCT_SCOPE);
  const endpoint = `${baseUrl}/api/agent/3/execute`;

  mkdirSync(outputDir, { recursive: true });
  const requestPath = path.join(outputDir, `${runId}.request.json`);
  const transcriptPath = path.join(outputDir, `${runId}.sse`);
  const summaryPath = path.join(outputDir, `${runId}.summary.json`);
  writeFileSync(requestPath, `${JSON.stringify({ endpoint, productScope, request }, null, 2)}\n`);

  const controller = new AbortController();
  const timeoutMs = Number(args['timeout-ms'] || 900_000);
  const timer = setTimeout(() => controller.abort(new Error(`live proof timeout after ${timeoutMs}ms`)), timeoutMs);
  let text = '';
  let status = 0;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
        'x-product-scope': productScope,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });
    status = response.status;
    text = await response.text();
  } finally {
    clearTimeout(timer);
  }

  writeFileSync(transcriptPath, text);
  const summary = summarizeSseProof(parseSseTranscript(text), {
    runId,
    baseUrl,
    request: { endpoint, productScope, httpStatus: status, ...request },
  });
  summary.files = { requestPath, transcriptPath, summaryPath, markdownPath: summaryPath.replace(/\.json$/i, '.md') };
  writeSummary(summary, summaryPath);
  return summary;
}

async function main() {
  const args = parseArgs();
  if (args.help || args.h) {
    console.log(usage());
    return;
  }

  let summary;
  if (args['run-live']) {
    summary = await runLive(args);
  } else {
    if (!args.input) {
      console.error(usage());
      process.exitCode = 1;
      return;
    }
    const inputPath = path.resolve(String(args.input));
    const text = readFileSync(inputPath, 'utf8');
    summary = summarizeSseProof(parseSseTranscript(text), {
      inputPath,
      sourceUrl: String(args.url || DEFAULT_TARGET_URL),
    });
    writeSummary(summary, args['summary-out'] ? path.resolve(String(args['summary-out'])) : null);
  }

  console.log(JSON.stringify(summary, null, 2));
  if (args['fail-on-incomplete'] && !summary.acceptedTerminal) {
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e?.stack || e?.message || String(e));
    process.exitCode = 1;
  });
}
