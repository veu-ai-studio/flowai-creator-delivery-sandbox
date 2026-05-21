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

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  ExternalLink, ChevronRight, RotateCcw,
} from 'lucide-react';

const KNOWN_GAP_DIMENSIONS = new Set([
  'bugs_errors_detector', 'performance', 'accessibility',
  'security', 'privacy_jurisdiction', 'legal_jurisdiction',
]);

function StepRow({ event }) {
  const log = event.log || {};
  const statusIcon = {
    complete: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    failed:   <XCircle className="h-3.5 w-3.5 text-red-400" />,
    degraded: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
    skipped:  <span className="h-3.5 w-3.5 inline-block rounded-full bg-muted-foreground/30" />,
  }[log.status] || <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />;

  const score = log.scores?.current;
  const scoreDelta = typeof score === 'number' && typeof log.scores?.original === 'number'
    ? score - log.scores.original : null;

  return (
    <div className="flex items-start gap-2 py-1.5 text-[11px] border-b border-border/30 last:border-0">
      <span className="mt-0.5 shrink-0">{statusIcon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground">
            [I{log.iteration ?? '?'}][S{log.step ?? '?'}] {log.stepName || log.kind || 'step'}
          </span>
          <span className="text-muted-foreground">— {log.status || 'running'}</span>
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

function ResultCard({ final, runId, inputUrl }) {
  const ready = final.gtmReady === true;
  const score = typeof final.finalScore === 'number' ? final.finalScore : 0;
  const recordId = final.governanceRecordId || runId;
  const isHonestGate = final.exitReason === 'HONEST_GATE_REFUSAL_ALREADY_PASSING';

  return (
    <div className="space-y-3">
      <KnownGapBanner dimensions={final.dimensions_contributing} />
      <div className={`rounded-xl border p-5 space-y-3 ${
        isHonestGate ? 'border-amber-500/40 bg-amber-500/5'
        : ready ? 'border-emerald-500/40 bg-emerald-500/5'
        : 'border-border bg-card'
      }`}>
        <div className="flex items-center gap-2 flex-wrap">
          {isHonestGate
            ? <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">HONEST GATE — ALREADY PASSING</span>
            : ready
              ? <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">GTM-READY</span>
              : <span className="text-[10px] font-bold text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">NOT GTM-READY</span>
          }
          <span className="text-[10px] text-muted-foreground">exitReason: <span className="font-mono text-foreground">{final.exitReason || 'UNKNOWN'}</span></span>
          <span className="ml-auto text-xl font-bold text-foreground">{score.toFixed(1)}<span className="text-muted-foreground text-sm">/100</span></span>
        </div>
        <ResultUrlSection previewUrl={final.previewUrl} inputUrl={inputUrl} exitReason={final.exitReason} />
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

export default function RunConstructionPanel({ url, mode = 'FOREGROUND', onClose }) {
  const [status, setStatus] = useState('idle');         // idle | running | done | error
  const [steps, setSteps] = useState([]);
  const [final, setFinal] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [runId, setRunId] = useState(null);
  const [knownGapSeen, setKnownGapSeen] = useState(false);
  const abortRef = useRef(null);

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
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
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
            setErrorMsg(event.error || event.code || 'unknown_error');
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

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground">Run FlowAI on this URL</p>
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
        <div className="rounded-lg border border-border bg-card max-h-96 overflow-y-auto p-3 space-y-0">
          {steps.length === 0 && status === 'running' && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground py-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Connecting to /api/run-construction…
            </div>
          )}
          {steps.map((ev, i) => <StepRow key={i} event={ev} />)}
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3">
          <div className="flex items-center gap-2 text-red-400 font-semibold text-xs mb-1">
            <XCircle className="h-4 w-4" /> Run failed
          </div>
          <p className="text-[11px] text-foreground/90 font-mono break-all">{errorMsg || 'Unknown error'}</p>
        </div>
      )}

      {final && status === 'done' && <ResultCard final={final} runId={runId} inputUrl={url} />}
    </div>
  );
}
