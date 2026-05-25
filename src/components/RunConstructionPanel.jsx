// src/components/RunConstructionPanel.jsx — W6 INTEGRATION (Track C)
//
// Live SSE consumer for /api/run-construction. Renders a streaming
// progress panel (one row per orchestrator 'step' event) and, on
// the terminal 'final' event, a result card with previewUrl,
// finalScore, gtmReady badge, exitReason, governance-record link,
// and the CA-18 §2 dimensions_contributing[] honest-disclosure banner.
//
// Why we don't use native EventSource: the SSE contract is POST + JSON
// body (URL + mode), and EventSource is GET-only. We stream the
// response body with fetch + ReadableStream + a small SSE line parser.
//
// Contract this component is built against (src/api/run-construction.js):
//   start     | runId, url, mode, gtmTarget, at
//   registry  | action, productId
//   step      | log {iteration, step, stepName, status, result, ...}
//   iteration | iteration {number, preScore, postScore, gtmReady, ...}
//   final     | previewUrl, finalScore, governanceRecordId, gtmReady,
//               exitReason, iterationsCompleted, dimensions_contributing?
//   error     | error, code     (terminal)
//   [DONE]    | terminator

import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import FindingsReport from '@/components/FindingsReport';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, ChevronRight, RotateCcw,
} from 'lucide-react';

const KNOWN_GAP_DIMENSIONS = new Set([
  'bugs_errors_detector', 'performance', 'accessibility',
  'security', 'privacy_jurisdiction', 'legal_jurisdiction',
]);

const MACRO_STEPS = Object.freeze([
  { key: 'research', label: 'Research' },
  { key: 'design', label: 'Design' },
  { key: 'build', label: 'Build' },
  { key: 'qa_audit', label: 'Quality Audit' },
  { key: 'deploy', label: 'Deploy' },
  { key: 'self_renewal', label: 'Self-Renewal' },
  { key: 'gtm', label: 'GTM' },
  { key: 'monitor', label: 'Monitor' },
]);

const ORCHESTRATOR_STEP_TO_MACRO = Object.freeze({
  1: 'research',
  2: 'research',
  3: 'research',
  4: 'qa_audit',
  5: 'qa_audit',
  6: 'design',
  7: 'build',
  8: 'self_renewal',
  9: 'self_renewal',
  10: 'deploy',
  11: 'qa_audit',
  12: 'gtm',
  13: 'self_renewal',
  14: 'monitor',
});

const ORCHESTRATOR_STEP_LABELS = Object.freeze({
  0: 'Run Setup',
  1: 'Product Discovery',
  2: 'Policy Checks',
  3: 'Deep Crawl',
  4: 'Quality Audit',
  5: 'Five-Layer Scoring',
  6: 'Issue Prioritization',
  7: 'Fix Generation',
  8: 'Credential Acquisition',
  9: 'Branch Creation',
  10: 'Preview Deploy',
  11: 'Post-Fix Scoring',
  12: 'GTM Decision',
  13: 'PR Creation',
  14: 'Audit Record',
});

function macroStepForLog(log = {}) {
  const n = Number(log.step);
  if (!Number.isFinite(n)) return null;
  return ORCHESTRATOR_STEP_TO_MACRO[Math.floor(n)] ?? null;
}

function internalStepLabel(log = {}) {
  if (typeof log.stepName === 'string' && log.stepName.trim()) return log.stepName;
  const n = Number(log.step);
  if (Number.isFinite(n) && ORCHESTRATOR_STEP_LABELS[Math.floor(n)]) {
    return ORCHESTRATOR_STEP_LABELS[Math.floor(n)];
  }
  if (typeof log.tool === 'string' && log.tool.trim()) return log.tool;
  return 'Pipeline Step';
}

function buildMacroProgress({ events = [], status, final, errorMsg }) {
  const states = Object.fromEntries(MACRO_STEPS.map((step) => [step.key, 'pending']));
  let lastMacro = null;
  let lastLogStatus = null;

  for (const event of events) {
    const log = event?.log ?? {};
    const macro = macroStepForLog(log);
    if (!macro) continue;
    lastMacro = macro;
    lastLogStatus = log.status;
    if (log.status === 'failed') {
      states[macro] = 'failed';
    } else if (states[macro] !== 'failed') {
      states[macro] = 'complete';
    }
  }

  const failed = status === 'error' || Boolean(errorMsg) || final?.ok === false;
  if (failed && lastMacro) states[lastMacro] = 'failed';

  let active = null;
  if (status === 'running') {
    if (!lastMacro) {
      active = MACRO_STEPS[0].key;
    } else if (lastLogStatus === 'failed') {
      active = lastMacro;
    } else {
      const currentIndex = MACRO_STEPS.findIndex((step) => step.key === lastMacro);
      active = MACRO_STEPS[Math.min(MACRO_STEPS.length - 1, currentIndex + 1)]?.key ?? lastMacro;
    }
    if (states[active] !== 'failed') states[active] = 'running';
  }

  return { states, active };
}

function PipelineProgressTracker({ events, status, final, errorMsg }) {
  const { states, active } = buildMacroProgress({ events, status, final, errorMsg });
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">8-step progress</p>
          <p className="text-[11px] text-foreground">
            {status === 'running' && active
              ? `Active: ${MACRO_STEPS.find((step) => step.key === active)?.label}`
              : status === 'done'
                ? 'Complete'
                : status === 'error'
                  ? 'Failed'
                  : 'Ready'}
          </p>
        </div>
        {status === 'running' && (
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running...
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-2">
        {MACRO_STEPS.map((step, index) => {
          const stepStatus = states[step.key];
          const activeStep = step.key === active;
          const classes = stepStatus === 'failed'
            ? 'border-red-500/50 bg-red-500/10 text-red-400'
            : activeStep || stepStatus === 'running'
              ? 'border-primary/60 bg-primary/10 text-primary ring-1 ring-primary/30'
              : stepStatus === 'complete'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                : 'border-border bg-muted/20 text-muted-foreground';
          const icon = stepStatus === 'failed'
            ? <XCircle className="h-3.5 w-3.5" />
            : activeStep || stepStatus === 'running'
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : stepStatus === 'complete'
                ? <CheckCircle2 className="h-3.5 w-3.5" />
                : <span className="h-3.5 w-3.5 rounded-full border border-current/30" />;
          return (
            <div key={step.key} className={`rounded-md border px-2.5 py-2 min-h-[64px] ${classes}`}>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wide opacity-70">{index + 1}</span>
                {icon}
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-tight">{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatGithubErrors(errors) {
  if (!Array.isArray(errors) || errors.length === 0) return '';
  return errors.slice(0, 3).map((error) => (
    typeof error === 'string' ? error : JSON.stringify(error)
  )).join(' | ');
}

function formatRunError(event = {}) {
  const parts = [event.error || event.code || 'unknown_error'];
  const status = [event.status, event.statusText].filter(Boolean).join(' ');
  if (status) parts.push(`GitHub status: ${status}`);
  if (event.githubMessage) parts.push(`GitHub: ${event.githubMessage}`);
  const githubErrors = formatGithubErrors(event.githubErrors);
  if (githubErrors) parts.push(`GitHub errors: ${githubErrors}`);
  return parts.filter(Boolean).join(' | ');
}

function StepRow({ event }) {
  const log = event.log || {};
  // DISPATCH U1 ITEM 3 — universal-mode deployment steps are honest in
  // governance but visually muted in the UI to keep the active step
  // list focused on evaluation. Governance still has the verbatim row;
  // this is presentation only.
  const isUniversalSkip = log.result?.autoFixSkippedReason === 'UNIVERSAL_NO_REPO_ACCESS';
  const statusIcon = {
    complete: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    failed:   <XCircle className="h-3.5 w-3.5 text-red-400" />,
    degraded: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    skipped:  <span className="h-3.5 w-3.5 inline-block rounded-full bg-muted-foreground/30" />,
  }[log.status] || <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;

  const score = log.scores?.current;
  const scoreDelta = typeof score === 'number' && typeof log.scores?.original === 'number'
    ? score - log.scores.original : null;
  const readableStep = internalStepLabel(log);
  const macroLabel = MACRO_STEPS.find((step) => step.key === macroStepForLog(log))?.label;

  if (isUniversalSkip) {
    return (
      <div className="grid grid-cols-[auto_minmax(72px,0.7fr)_minmax(0,1fr)] items-center gap-2 py-1 text-[10px] text-muted-foreground/70 border-b border-border/20 last:border-0">
        <span className="h-2 w-2 rounded-full bg-muted-foreground/30 shrink-0" />
        <span className="font-mono truncate">[r{log.iteration ?? '?'}][S{log.step ?? '?'}]</span>
        <span className="font-mono truncate">
          [S{log.step ?? '?'}] {log.stepName || log.tool || 'step'} — deployment skipped (universal mode)
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_minmax(70px,0.55fr)_minmax(150px,0.9fr)_minmax(0,1.5fr)] items-start gap-2 py-1.5 text-[11px] border-b border-border/30 last:border-0">
      <span className="mt-0.5 shrink-0">{statusIcon}</span>
      <span className="font-mono text-muted-foreground">
        [r{log.iteration ?? '?'}][S{log.step ?? '?'}]
      </span>
      <div className="min-w-0">
        <div className="font-semibold text-foreground truncate">{readableStep}</div>
        {macroLabel && <div className="text-[10px] text-muted-foreground truncate">{macroLabel}</div>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-muted-foreground">— {log.status || 'running'}</span>
          {(log.tool || log.kind) && (
            <span className="text-muted-foreground truncate max-w-[260px]">{log.tool || log.kind}</span>
          )}
          {typeof score === 'number' && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {score.toFixed(1)}/100
              {scoreDelta !== null && scoreDelta !== 0 && (
                <span className={scoreDelta > 0 ? 'text-emerald-400 ml-1' : 'text-red-400 ml-1'}>
                  ({scoreDelta > 0 ? '+' : ''}{scoreDelta.toFixed(1)})
                </span>
              )}
            </span>
          )}
          {log.known_gap === true && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
              KNOWN GAP
            </span>
          )}
        </div>
        {log.why && (
          <div className="text-muted-foreground text-[10px] mt-0.5 truncate">{log.why}</div>
        )}
        {log.result?.error && (
          <div className="text-red-400 text-[10px] mt-0.5 truncate">{String(log.result.error).slice(0, 160)}</div>
        )}
      </div>
    </div>
  );
}

function KnownGapBanner({ dimensions }) {
  if (!Array.isArray(dimensions)) return null;
  const gaps = dimensions.filter((d) => d && d.scored === false);
  if (gaps.length === 0) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          KNOWN GAP — Honest Disclosure (CA-18 §2)
        </span>
      </div>
      <p className="text-[11px] text-foreground/90">
        This score reflects {dimensions.length - gaps.length} of {dimensions.length} CA-18 §2 dimensions.
        The following {gaps.length} dimensions are <span className="font-semibold">not yet implemented</span>{' '}
        and were excluded from scoring:
      </p>
      <ul className="text-[10px] text-muted-foreground space-y-0.5 pl-4">
        {gaps.map((d, i) => (
          <li key={i} className="list-disc">
            <span className="font-semibold text-foreground">{d.dimension}</span>
            {d.evidence && <span> — {d.evidence}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeltaTable({ transformationDelta }) {
  if (!transformationDelta || !Array.isArray(transformationDelta.deltas) || transformationDelta.deltas.length === 0) {
    return null;
  }
  const aggregate = transformationDelta.aggregate || {};
  const regressionDetected = (aggregate.totalRegressed ?? 0) > 0 || transformationDelta.regressionGatePassed === false;
  const rows = transformationDelta.deltas.slice(0, 8);
  const colorFor = (direction) => direction === 'improved'
    ? 'text-emerald-400'
    : direction === 'regressed'
      ? 'text-red-400'
      : 'text-muted-foreground';
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold ${regressionDetected ? 'text-red-400' : 'text-emerald-400'}`}>
          {regressionDetected
            ? `REGRESSION DETECTED: ${aggregate.totalRegressed ?? 0} metrics worsened`
            : `Net improvement: +${aggregate.netDelta ?? 0}`}
        </span>
        <span className="text-[10px] text-muted-foreground">Transformation delta</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="py-1 text-left font-medium">Metric</th>
              <th className="py-1 text-right font-medium">Before</th>
              <th className="py-1 text-right font-medium">After</th>
              <th className="py-1 text-right font-medium">Delta</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.metric} className="border-b border-border/50 last:border-0">
                <td className="py-1.5 pr-2 text-foreground">{d.label || d.metric}</td>
                <td className="py-1.5 text-right text-muted-foreground">{d.before}</td>
                <td className="py-1.5 text-right text-muted-foreground">{d.after}</td>
                <td className={`py-1.5 text-right font-semibold ${colorFor(d.direction)}`}>
                  {d.delta > 0 ? '+' : ''}{d.delta}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SourceMappingSummary({ sourceMapping }) {
  if (!sourceMapping || !Array.isArray(sourceMapping.mappings)) return null;
  const rows = sourceMapping.mappings.filter((m) => m.mapped).slice(0, 6);
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold text-primary">
          Source mapped: {sourceMapping.mapped ?? 0}/{sourceMapping.totalFindings ?? 0}
        </span>
        <span className="text-[10px] text-muted-foreground">Registered repo analysis</span>
      </div>
      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-1 text-left font-medium">Finding</th>
                <th className="py-1 text-left font-medium">Source file</th>
                <th className="py-1 text-right font-medium">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => (
                <tr key={`${m.findingId || m.category || 'finding'}-${i}`} className="border-b border-border/50 last:border-0">
                  <td className="py-1.5 pr-2 text-muted-foreground">{m.category || m.findingId || 'finding'}</td>
                  <td className="py-1.5 pr-2 text-foreground font-mono">{m.selectedFilePath}</td>
                  <td className="py-1.5 text-right text-primary font-semibold">{Math.round((m.confidence ?? 0) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Repository file inventory was available, but no finding cleared source-mapping confidence.
        </p>
      )}
    </div>
  );
}

function normalizeUrlForCompare(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return '';
  try {
    const u = new URL(value);
    u.hash = '';
    const path = u.pathname.replace(/\/+$/, '') || '/';
    return `${u.protocol}//${u.host}${path}${u.search}`;
  } catch {
    return value.trim().replace(/\/+$/, '');
  }
}

function ResultUrlSection({ previewUrl, inputUrl, exitReason }) {
  const hasPreview = typeof previewUrl === 'string' && previewUrl.length > 0;
  const originalUrl = typeof inputUrl === 'string' ? inputUrl : '';
  const sameAsInput = hasPreview && normalizeUrlForCompare(previewUrl) === normalizeUrlForCompare(originalUrl);

  if (!hasPreview) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
        <p className="font-semibold text-amber-400">No preview URL generated</p>
        <p className="text-muted-foreground">Reason: <span className="font-mono text-foreground">{exitReason || 'UNKNOWN'}</span></p>
        {originalUrl && (
          <p className="break-all">
            <span className="text-muted-foreground">Original URL (unchanged): </span>
            <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
              {originalUrl}
            </a>
          </p>
        )}
      </div>
    );
  }

  if (sameAsInput) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs space-y-1">
        <p className="font-semibold text-amber-400">No new URL produced - no fixes were applied this run.</p>
        <p className="text-muted-foreground">Reason: <span className="font-mono text-foreground">{exitReason || 'UNKNOWN'}</span></p>
        <p className="break-all">
          <span className="text-muted-foreground">Original URL (unchanged): </span>
          <a href={originalUrl || previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
            {originalUrl || previewUrl}
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 text-xs">
      <a href={previewUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-primary-foreground font-semibold hover:bg-primary/90">
        Open improved URL <ExternalLink className="h-3 w-3" />
      </a>
      {originalUrl && (
        <p className="break-all">
          <span className="text-muted-foreground">Original URL (preserved): </span>
          <a href={originalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-mono">
            {originalUrl}
          </a>
        </p>
      )}
    </div>
  );
}

function UniversalModePanel({ findingsCount, findingsSeverity, inputUrl }) {
  const sev = findingsSeverity || { critical: 0, high: 0, medium: 0, low: 0 };
  const total = typeof findingsCount === 'number' ? findingsCount : (sev.critical + sev.high + sev.medium + sev.low);
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
          Universal mode — evaluation complete
        </span>
      </div>
      <p className="text-[11px] text-foreground/90">
        FlowAI evaluated <span className="font-mono">{inputUrl || 'this URL'}</span> without requiring
        registration, GitHub access, or deployment configuration.
      </p>
      <div className="grid grid-cols-5 gap-1 text-[10px]">
        <div className="rounded bg-muted/40 p-1.5 text-center">
          <div className="font-bold text-foreground">{total}</div>
          <div className="text-muted-foreground">findings</div>
        </div>
        <div className="rounded bg-red-500/15 p-1.5 text-center">
          <div className="font-bold text-red-400">{sev.critical ?? 0}</div>
          <div className="text-muted-foreground">critical</div>
        </div>
        <div className="rounded bg-orange-500/15 p-1.5 text-center">
          <div className="font-bold text-orange-400">{sev.high ?? 0}</div>
          <div className="text-muted-foreground">high</div>
        </div>
        <div className="rounded bg-amber-500/15 p-1.5 text-center">
          <div className="font-bold text-amber-400">{sev.medium ?? 0}</div>
          <div className="text-muted-foreground">medium</div>
        </div>
        <div className="rounded bg-muted/30 p-1.5 text-center">
          <div className="font-bold text-muted-foreground">{sev.low ?? 0}</div>
          <div className="text-muted-foreground">low</div>
        </div>
      </div>
      <a
        href="/products"
        className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-primary-foreground font-semibold text-xs hover:bg-primary/90"
      >
        Register this product for auto-fix and deployment <ChevronRight className="h-3 w-3" />
      </a>
      <p className="text-[10px] text-muted-foreground">
        Universal mode produces DOM/HTML-level findings only. Auto-fix, PR creation, and preview
        deployment require a registered product with GitHub access.
      </p>
    </div>
  );
}

function InsufficientCoverageBanner({ scored, total, minimum }) {
  if (typeof scored !== 'number' || typeof total !== 'number' || typeof minimum !== 'number') return null;
  if (scored >= minimum) return null;
  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-1">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
          Insufficient dimension coverage for GTM readiness
        </span>
      </div>
      <p className="text-[11px] text-foreground/90">
        {scored}/{total} dimensions scored, minimum {minimum} required. The trust score below
        reflects this coverage gap — additional evaluators must be wired before GTM-ready can be claimed.
      </p>
    </div>
  );
}

function ResultCard({ final, runId, inputUrl }) {
  const ready = final.gtmReady === true;
  const rawScore = typeof final.rawScore === 'number' ? final.rawScore
    : (typeof final.finalScore === 'number' ? final.finalScore : 0);
  const trustScore = typeof final.effectiveTrustScore === 'number'
    ? final.effectiveTrustScore
    : rawScore;
  const scoredDims = typeof final.scoredDimensions === 'number' ? final.scoredDimensions : null;
  const totalDims = typeof final.totalDimensions === 'number' ? final.totalDimensions : null;
  const minDimsForGTM = typeof final.minimumScoredDimensionsForGTM === 'number'
    ? final.minimumScoredDimensionsForGTM : 7;
  const hasCoverageData = scoredDims !== null && totalDims !== null;
  const recordId = final.governanceRecordId || runId;
  const isHonestGate = final.exitReason === 'HONEST_GATE_REFUSAL_ALREADY_PASSING';
  const isInsufficientCoverage = final.exitReason === 'INSUFFICIENT_DIMENSION_COVERAGE';
  const isUniversalMode = final.universalMode === true || final.runMode === 'UNIVERSAL';

  return (
    <div className="space-y-3">
      <KnownGapBanner dimensions={final.dimensions_contributing} />
      {hasCoverageData && (
        <InsufficientCoverageBanner scored={scoredDims} total={totalDims} minimum={minDimsForGTM} />
      )}
      <div className={`rounded-xl border p-5 space-y-3 ${
        isHonestGate ? 'border-amber-500/40 bg-amber-500/5'
        : isInsufficientCoverage ? 'border-amber-500/40 bg-amber-500/5'
        : ready ? 'border-emerald-500/40 bg-emerald-500/5'
        : 'border-border bg-card'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          {isHonestGate
            ? <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">HONEST GATE — ALREADY PASSING</span>
            : isInsufficientCoverage
              ? <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">INSUFFICIENT COVERAGE</span>
              : ready
                ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">GTM-READY</span>
                : <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">NOT GTM-READY</span>
          }
          <span className="text-[10px] text-muted-foreground">exitReason: <span className="font-mono text-foreground">{final.exitReason || 'UNKNOWN'}</span></span>
          <div className="ml-auto text-right">
            <div className="text-xl font-bold text-foreground leading-none">
              Trust Score: {trustScore.toFixed(1)}<span className="text-muted-foreground text-sm">/100</span>
            </div>
            {hasCoverageData && (
              <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                raw {rawScore.toFixed(1)} · coverage {scoredDims}/{totalDims}
              </div>
            )}
          </div>
        </div>
        {isUniversalMode
          ? <UniversalModePanel
              findingsCount={final.findingsCount}
              findingsSeverity={final.findingsSeverity}
              inputUrl={inputUrl}
            />
          : <ResultUrlSection previewUrl={final.previewUrl} inputUrl={inputUrl} exitReason={final.exitReason} />
        }
        <FindingsReport
          deepBrowserAnalysis={final.deepBrowserAnalysis}
          fixProposals={final.fixProposals}
          sourceMappedFixProposals={final.sourceMappedFixProposals}
          findingsCount={final.findingsCount}
          findingsSeverity={final.findingsSeverity}
        />
        {final.prUrl && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">PR:</span>
            <a href={final.prUrl} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline font-mono inline-flex items-center gap-1">
              {final.prUrl} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
        <DeltaTable transformationDelta={final.transformationDelta} />
        <SourceMappingSummary sourceMapping={final.sourceMapping} />
        <MigrationSummary migration={final.migration} message={final.migrationMessage} />
        <div className="flex items-center gap-2 text-xs pt-1">
          <span className="text-muted-foreground">Iterations: {final.iterationsCompleted ?? 0}</span>
          <a href={`/governance/${recordId}`}
            className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">
            View governance record <ChevronRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function MigrationSummary({ migration, message }) {
  if (!migration && !message) return null;
  const dependenciesRemoved = Array.isArray(migration?.dependenciesRemoved)
    ? migration.dependenciesRemoved : [];
  const blockers = Array.isArray(migration?.blockers) ? migration.blockers : [];
  const renderGithubErrors = (errors) => {
    if (!Array.isArray(errors) || errors.length === 0) return null;
    return (
      <ul className="mt-1 space-y-0.5">
        {errors.slice(0, 3).map((error, index) => (
          <li key={`github-error-${index}`} className="break-words">
            {typeof error === 'string' ? error : JSON.stringify(error)}
          </li>
        ))}
      </ul>
    );
  };
  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/5 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-bold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded">
          MIGRATION MODE
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">
          {migration?.status || 'MIGRATION_MODE_DISABLED'}
        </span>
      </div>
      {message && <p className="text-[11px] text-amber-300">{message}</p>}
      {migration && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
          <div>
            <p className="text-muted-foreground">Files migrated</p>
            <p className="text-foreground font-semibold">{migration.filesMigrated ?? migration.migrated ?? 0}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dependencies removed</p>
            <p className="text-foreground font-semibold">{dependenciesRemoved.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Upgrade URL</p>
            {migration.upgradeUrl
              ? <a href={migration.upgradeUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Open <ExternalLink className="h-3 w-3" />
                </a>
              : <p className="text-muted-foreground">Not created yet</p>
            }
          </div>
        </div>
      )}
      {blockers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Blockers</p>
          {blockers.slice(0, 4).map((blocker, index) => (
            <div key={`${blocker.file || blocker.field || index}-${index}`} className="text-[11px] text-muted-foreground font-mono rounded border border-border/60 bg-background/40 p-2">
              <p>
                {blocker.file || blocker.field || 'migration'}: {blocker.reason}
              </p>
              {blocker.githubMessage && (
                <p className="mt-1 text-amber-200 break-words">
                  GitHub: {blocker.githubMessage}
                </p>
              )}
              {(blocker.status || blocker.statusText) && (
                <p className="mt-1 text-muted-foreground">
                  Status: {[blocker.status, blocker.statusText].filter(Boolean).join(' ')}
                </p>
              )}
              {renderGithubErrors(blocker.githubErrors)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RunConstructionPanel({
  url,
  mode = 'FOREGROUND',
  onClose,
  operatorSecret = '',
  setOperatorSecret,
  autoStart = false,
}) {
  const [status, setStatus] = useState('idle');         // idle | running | done | error
  const [steps, setSteps] = useState([]);
  const [final, setFinal] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [runId, setRunId] = useState(null);
  const [knownGapSeen, setKnownGapSeen] = useState(false);
  const abortRef = useRef(null);
  const autoStartRef = useRef(false);

  const start = async () => {
    setStatus('running');
    setSteps([]);
    setFinal(null);
    setErrorMsg(null);
    setKnownGapSeen(false);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch('/api/run-construction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(operatorSecret.trim() ? { 'x-flowai-operator-secret': operatorSecret.trim() } : {}),
        },
        body: JSON.stringify({ url, mode }),
        signal: ac.signal,
      });
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        try { const j = await res.json(); detail = j?.detail || j?.error || detail; } catch { /* ignore */ }
        setErrorMsg(detail);
        setStatus('error');
        return;
      }
      if (!res.body) {
        setErrorMsg('no_response_body');
        setStatus('error');
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE events are delimited by double-newline. Each event is
        // one-or-more "data: " lines.
        let idx;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const frame = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const dataLines = frame.split('\n').filter((l) => l.startsWith('data: '));
          if (dataLines.length === 0) continue;
          const data = dataLines.map((l) => l.slice(6)).join('\n');
          if (data === '[DONE]') {
            setStatus((s) => s === 'running' ? 'done' : s);
            continue;
          }
          let event;
          try { event = JSON.parse(data); } catch { continue; }
          if (event.type === 'start') {
            setRunId(event.runId);
          } else if (event.type === 'step') {
            if (event.log?.known_gap === true) setKnownGapSeen(true);
            setSteps((prev) => [...prev, event]);
          } else if (event.type === 'iteration') {
            setSteps((prev) => [...prev, { type: 'step', log: { ...event.iteration, stepName: `Iteration ${event.iteration?.number} complete`, status: 'complete', kind: 'iteration_complete' } }]);
          } else if (event.type === 'final') {
            setFinal(event);
            setStatus('done');
          } else if (event.type === 'error') {
            setErrorMsg(formatRunError(event));
            setStatus('error');
          } else if (event.type === 'registry') {
            // Surface as informational step.
            setSteps((prev) => [...prev, { type: 'step', log: { stepName: `Registry ${event.action}`, status: 'complete', result: { productId: event.productId } } }]);
          }
        }
      }
      // Stream closed without [DONE]: treat as done if we got a final, else error.
      setStatus((s) => s === 'running' ? (final ? 'done' : 'error') : s);
    } catch (e) {
      if (e?.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setErrorMsg(e?.message || String(e));
      setStatus('error');
    } finally {
      abortRef.current = null;
    }
  };

  const retry = () => start();
  const cancel = () => { abortRef.current?.abort(); };
  const authRequired = status === 'error' && /auth(entication)? required/i.test(String(errorMsg || ''));

  useEffect(() => {
    if (!autoStart || autoStartRef.current || status !== 'idle') return;
    autoStartRef.current = true;
    start();
  }, [autoStart, status]);

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground flex items-center gap-2">
            Run FlowAI on this URL
            {status === 'running' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                <Loader2 className="h-3 w-3 animate-spin" />
                Running...
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground truncate font-mono">{url}</p>
        </div>
        {status === 'idle' && (
          <Button onClick={start} size="lg" className="gap-2 min-h-[44px] font-bold">
            <ChevronRight className="h-4 w-4" /> Run FlowAI
          </Button>
        )}
        {status === 'running' && (
          <Button onClick={cancel} size="lg" variant="outline" className="gap-2 min-h-[44px]">
            <Loader2 className="h-4 w-4 animate-spin" /> Cancel
          </Button>
        )}
        {(status === 'done' || status === 'error') && (
          <Button onClick={retry} size="lg" variant="outline" className="gap-2 min-h-[44px]">
            <RotateCcw className="h-4 w-4" /> Retry
          </Button>
        )}
        {onClose && (
          <Button onClick={onClose} size="lg" variant="ghost" className="gap-1 min-h-[44px]">
            Close
          </Button>
        )}
      </div>

      {knownGapSeen && !final?.dimensions_contributing && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-[11px] text-foreground/90">
            A pipeline step reported <span className="font-semibold">known_gap=true</span> during this run.
            See per-step rows below.
          </span>
        </div>
      )}

      {status !== 'idle' && (
        <div className="space-y-3">
          <PipelineProgressTracker events={steps} status={status} final={final} errorMsg={errorMsg} />
          <div className="rounded-lg border border-border bg-card max-h-96 overflow-y-auto p-3 space-y-0">
            <div className="grid grid-cols-[auto_minmax(70px,0.55fr)_minmax(150px,0.9fr)_minmax(0,1.5fr)] gap-2 border-b border-border/50 pb-2 mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              <span>Status</span>
              <span>Code</span>
              <span>Named Step</span>
              <span>Details</span>
            </div>
          {steps.length === 0 && status === 'running' && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting to /api/run-construction…
            </div>
          )}
          {steps.map((ev, i) => <StepRow key={i} event={ev} />)}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-xs mb-1">
            <XCircle className="h-4 w-4" /> Run failed
          </div>
          <p className="text-[11px] text-foreground/90 font-mono break-all">{errorMsg || 'SSE_STREAM_ENDED_BEFORE_FINAL - run may have timed out'}</p>
          {authRequired && mode === 'MIGRATION' && typeof setOperatorSecret === 'function' && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
              <label className="block text-xs font-semibold text-amber-100" htmlFor="migration-operator-secret">
                Operator secret
              </label>
              <Input
                id="migration-operator-secret"
                type="password"
                value={operatorSecret}
                onChange={(event) => setOperatorSecret(event.target.value)}
                placeholder="Enter operator secret to continue"
                autoComplete="off"
                className="h-9 text-sm bg-background/80"
              />
              <p className="text-[11px] text-amber-100/85">
                Enter the operator secret, then click Retry to start Migration Mode with authorization.
              </p>
            </div>
          )}
        </div>
      )}

      {final && status === 'done' && <ResultCard final={final} runId={runId} inputUrl={url} />}
    </div>
  );
}
