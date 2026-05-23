// src/pages/FlowAIDashboard.jsx
//
// FlowAI Dashboard — live orchestration UI for the DISPATCH 24 product-
// agnostic Self-Renewal pipeline. Consumes the SSE endpoint added in
// DISPATCH 13 PART A (api/agent/3/execute.js, Accept: text/event-stream)
// and renders:
//
//   - Header with session info (runId, mode, started-at)
//   - Input panel (URL, mode selector, GTM target slider, max-iter slider,
//                  LAUNCH button)
//   - Live progress (iteration counter, score progress bar, step-by-step
//                    log with expandable rows, STOP / SWITCH MODE / CONTINUE
//                    controls)
//   - Five-Layer radar (pure SVG, no chart libs)
//   - Iteration history (expandable per-iteration orchestration log)
//   - Completion panel (GTM_READY / BEST_EFFORT badge, journey,
//                       preview-URL + PR buttons, Run-Again)
//
// Tailwind CSS only — no shadcn/ui, no lucide-react, no recharts, no
// framer-motion. Icons are inline SVG. No browser-storage APIs (no
// localStorage / sessionStorage / IndexedDB writes).
//
// GUIDED-mode resume note: SSE is one-way, so the CONTINUE button can't
// directly resume a paused orchestration over the same stream. Until a
// /api/agent/3/control endpoint ships for back-channel commands, GUIDED
// mode renders the CONTINUE button but the actual pause/resume of the
// orchestrator is not bridged across the SSE wire. AUTO mode (the
// default) is fully functional end-to-end.

import { useState, useRef, useEffect, useMemo } from 'react';
import FindingsReport from '@/components/FindingsReport';
import { findRegisteredProductConfigForUrl } from '@/lib/products/registeredProductConfig';
import { extractBranchPrVisibility } from '@/lib/ui/branchVisibility';
import { normalizeIterationHistoryRow } from '@/lib/ui/iterationHistory';
import {
  replaceFlowAIRunId,
  runVerdictFromResult,
  updateFlowAIRun,
  upsertFlowAIRun,
} from '@/lib/flowaiRunStore';

// ── Tiny inline-SVG icon set ───────────────────────────────────────────────

const Icon = {
  Rocket: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  ),
  Stop: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  ),
  Play: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M21 12a9 9 0 1 1-3-6.7L21 8" /><polyline points="21 3 21 8 16 8" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  Warning: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  External: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

// ── Five-Layer radar (pure SVG, no chart libs) ─────────────────────────────

function FiveLayerRadar({ scores, max = 20 }) {
  const labels = ['L1 Func', 'L2 Op', 'L3 Fin', 'L4 Biz', 'L5 GTM'];
  const values = [scores?.l1 ?? 0, scores?.l2 ?? 0, scores?.l3 ?? 0, scores?.l4 ?? 0, scores?.l5 ?? 0];
  const cx = 130, cy = 130, R = 100;
  const angle = (i) => (-Math.PI / 2) + (i * 2 * Math.PI) / 5;
  const point = (i, r) => [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r];
  const polyPoints = values.map((v, i) => {
    const r = (Math.max(0, Math.min(max, v)) / max) * R;
    const [x, y] = point(i, r);
    return `${x},${y}`;
  }).join(' ');
  const axisPoints = (rPct) =>
    Array.from({ length: 5 }, (_, i) => point(i, R * rPct).join(',')).join(' ');
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[260px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((p) => (
        <polygon key={p} points={axisPoints(p)} fill="none" stroke="rgb(100 116 139 / 0.3)" strokeWidth="1" />
      ))}
      {Array.from({ length: 5 }, (_, i) => {
        const [x, y] = point(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgb(100 116 139 / 0.2)" />;
      })}
      <polygon points={polyPoints} fill="rgb(16 185 129 / 0.25)" stroke="rgb(16 185 129)" strokeWidth="2" />
      {values.map((v, i) => {
        const r = (Math.max(0, Math.min(max, v)) / max) * R;
        const [x, y] = point(i, r);
        return <circle key={i} cx={x} cy={y} r="4" fill="rgb(16 185 129)" />;
      })}
      {labels.map((lbl, i) => {
        const [x, y] = point(i, R + 20);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
                className="text-[11px] fill-slate-300 font-medium">{lbl}</text>
        );
      })}
    </svg>
  );
}

// ── Step / iteration log helpers ───────────────────────────────────────────

const STATUS_STYLE = {
  complete: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  failed:   'bg-red-500/10 text-red-400 border-red-500/30',
  skipped:  'bg-slate-500/10 text-slate-400 border-slate-500/30',
  running:  'bg-blue-500/10 text-blue-400 border-blue-500/30 animate-pulse',
};

function StepRow({ log, expanded, onToggle }) {
  const cls = STATUS_STYLE[log.status] || STATUS_STYLE.complete;
  return (
    <>
      <tr className="border-b border-slate-800 hover:bg-slate-800/30 cursor-pointer" onClick={onToggle}>
        <td className="px-3 py-2 text-xs text-slate-400">
          <Icon.Chevron className={`w-3 h-3 inline transition-transform ${expanded ? 'rotate-90' : ''}`} />
          {' '}{log.iteration > 0 ? `iter${log.iteration} · ` : ''}step {log.step}
        </td>
        <td className="px-3 py-2 text-xs text-slate-200 font-medium">{log.stepName ?? log.tool ?? '—'}</td>
        <td className="px-3 py-2 text-xs text-slate-400 max-w-md truncate" title={log.why ?? ''}>{log.why ?? '—'}</td>
        <td className="px-3 py-2 text-xs">
          <span className={`px-2 py-0.5 rounded border text-[10px] uppercase font-bold ${cls}`}>{log.status}</span>
        </td>
        <td className="px-3 py-2 text-xs text-slate-300 max-w-sm truncate">
          {log.result ? (typeof log.result === 'string' ? log.result : JSON.stringify(log.result).slice(0, 80)) : '—'}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-slate-900/60">
          <td colSpan={5} className="px-3 py-3">
            <pre className="text-[10px] text-slate-300 whitespace-pre-wrap break-words font-mono">{JSON.stringify(log, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function FlowAIDashboard() {
  // ── Form inputs ──────────────────────────────────────────────────────────
  const [inputMethod, setInputMethod] = useState('url');
  const [url, setUrl] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [pastedContent, setPastedContent] = useState('');
  const [mode, setMode] = useState('auto');
  const [gtmTarget, setGtmTarget] = useState(95);
  const [maxIterations, setMaxIterations] = useState(100);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const selectedUrl = params.get('url');
    if (selectedUrl) {
      setInputMethod('url');
      setUrl(selectedUrl);
    }
  }, []);

  // ── Run state ────────────────────────────────────────────────────────────
  const [isRunning, setIsRunning] = useState(false);
  const [runId, setRunId] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [stepLogs, setStepLogs] = useState([]);   // every emitted step log
  const [iterations, setIterations] = useState([]); // completed iterations
  const [finalResult, setFinalResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState({});
  const [expandedIters, setExpandedIters] = useState({});
  // Control back-channel state — true when the orchestrator is parked at a
  // checkpoint; reflects the latest `control_applied` event from the SSE
  // stream so the UI swaps PAUSE ↔ RESUME without needing client-side guesses.
  const [isPaused, setIsPaused] = useState(false);
  const [controlApplied, setControlApplied] = useState(null);
  const abortRef = useRef(null);

  // Latest score envelope derived from the most recent scoring log.
  // DISPATCH (production runtime fixes) — the orchestrator emits
  // `gtmScore` (canonical §7.6) + `layers` (Five-Layer telemetry) on
  // STEP 5 / STEP 11 result objects; an earlier rev of this UI was
  // reading the legacy `preScore` / `postScore` field names which the
  // orchestrator stopped emitting after DISPATCH 28. The radar was
  // showing 0/100 with all layers 0/20 because the match check
  // dropped through to the zero default. We now read the existing
  // fields directly — no fabrication.
  const latestScore = useMemo(() => {
    for (let i = stepLogs.length - 1; i >= 0; i -= 1) {
      const l = stepLogs[i];
      if (l && (l.step === 5 || l.step === 11) && l.result && typeof l.result === 'object') {
        const r = l.result;
        const hasScore = typeof r.gtmScore === 'number'
          || typeof r.ceo95Criteria?.verifiedScore === 'number'
          || typeof r.fiveLayerInternal === 'number'
          || typeof r.preScore === 'number'
          || typeof r.postScore === 'number';
        if (hasScore) {
          const ceo95Layers = r.ceo95Criteria?.layerScores && typeof r.ceo95Criteria.layerScores === 'object'
            ? r.ceo95Criteria.layerScores
            : null;
          return {
            // §7.6 canonical score is the headline number; Five-Layer
            // internal total is the fallback for runs that only carry
            // telemetry data.
            total: r.ceo95Criteria?.verifiedScore ?? r.gtmScore ?? r.postScore ?? r.preScore ?? r.fiveLayerInternal ?? 0,
            ...(ceo95Layers ?? (r.layers && typeof r.layers === 'object' ? r.layers : {})),
          };
        }
      }
    }
    return { total: 0, l1: 0, l2: 0, l3: 0, l4: 0, l5: 0 };
  }, [stepLogs]);

  const latestLayerTotal = useMemo(() => (
    ['l1', 'l2', 'l3', 'l4', 'l5'].reduce((sum, key) => {
      const value = Number(latestScore[key] ?? 0);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0)
  ), [latestScore]);

  const currentIterationNumber = useMemo(() => {
    const last = stepLogs[stepLogs.length - 1];
    return last?.iteration > 0 ? last.iteration : iterations.length || 0;
  }, [stepLogs, iterations.length]);

  const progressPct = useMemo(() => {
    if (!latestScore.total) return 0;
    return Math.min(100, Math.round((latestScore.total / gtmTarget) * 100));
  }, [latestScore.total, gtmTarget]);

  const finalRawScore = typeof finalResult?.rawScore === 'number'
    ? finalResult.rawScore
    : (typeof finalResult?.finalScore === 'number' ? finalResult.finalScore : 0);
  const finalTrustScore = typeof finalResult?.effectiveTrustScore === 'number'
    ? finalResult.effectiveTrustScore
    : finalRawScore;
  const inputPayload = useMemo(() => ({
    method: inputMethod,
    url: url.trim() || null,
    productDescription: productDescription.trim() || null,
    pastedContent: pastedContent.trim() || null,
  }), [inputMethod, url, productDescription, pastedContent]);
  const registeredProductNote = useMemo(() => (
    findRegisteredProductConfigForUrl(inputPayload.url)?.systemNote ?? null
  ), [inputPayload.url]);
  const branchPrVisibility = useMemo(() => (
    extractBranchPrVisibility({
      finalResult,
      repoConfig: findRegisteredProductConfigForUrl(inputPayload.url),
    })
  ), [finalResult, inputPayload.url]);
  const canLaunch = inputMethod === 'url'
    ? true
    : inputMethod === 'describe'
      ? Boolean(inputPayload.productDescription)
      : Boolean(inputPayload.pastedContent);

  function productLabelForRun() {
    const registered = findRegisteredProductConfigForUrl(inputPayload.url);
    if (registered?.name) return registered.name;
    if (inputPayload.url) return inputPayload.url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    if (inputPayload.productDescription) return 'Described product';
    return 'Pasted content';
  }

  // ── SSE consumer ─────────────────────────────────────────────────────────
  async function launch() {
    if (!canLaunch) {
      setErrorMsg('Add a product description or pasted content before launching this run.');
      return;
    }
    const localRunId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let trackedRunId = localRunId;
    upsertFlowAIRun({
      id: localRunId,
      runId: localRunId,
      product: productLabelForRun(),
      productUrl: inputPayload.url,
      startTime: new Date().toISOString(),
      status: 'running',
      progressLabel: 'Starting FlowAI run',
    });
    setIsRunning(true);
    setIsPaused(false); setControlApplied(null);
    setStepLogs([]); setIterations([]); setFinalResult(null);
    setErrorMsg(null); setExpandedSteps({}); setExpandedIters({});
    setStartedAt(new Date().toISOString());
    const ac = new AbortController();
    abortRef.current = ac;

    let response;
    try {
      response = await fetch('/api/agent/3/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
          // SSE branch in execute.js requires SOME auth context. The
          // dashboard claims its own scope; the SSE handler skips the
          // productScope-match enforcement that the JSON path does.
          'x-product-scope': 'flowai-dashboard',
        },
        body: JSON.stringify({
          url: inputPayload.url,
          mode,
          maxIterations,
          gtmTarget,
          input: inputPayload,
        }),
        signal: ac.signal,
      });
    } catch (e) {
      setErrorMsg(`Network error: ${e?.message ?? String(e)}`);
      updateFlowAIRun(trackedRunId, {
        status: 'failed',
        endTime: new Date().toISOString(),
        verdict: 'NETWORK_ERROR',
        progressLabel: `Network error: ${e?.message ?? String(e)}`,
      });
      setIsRunning(false);
      return;
    }

    if (!response.ok || !response.body) {
      setErrorMsg(`Server error: HTTP ${response.status}`);
      updateFlowAIRun(trackedRunId, {
        status: 'failed',
        endTime: new Date().toISOString(),
        verdict: `HTTP_${response.status}`,
        progressLabel: `Server error: HTTP ${response.status}`,
      });
      setIsRunning(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data:'));
          if (!line) continue;
          const data = line.slice(5).trim();
          if (data === '[DONE]') continue;
          let payload;
          try { payload = JSON.parse(data); } catch { continue; }
          if (payload?.type === 'start') {
            setRunId(payload.runId || null);
            if (payload.runId) {
              replaceFlowAIRunId(trackedRunId, payload.runId);
              trackedRunId = payload.runId;
            }
          } else if (payload?.type === 'step') {
            setStepLogs((prev) => [...prev, payload.log]);
            updateFlowAIRun(trackedRunId, {
              status: 'running',
              progressLabel: payload.log?.stepName ?? payload.log?.tool ?? `Step ${payload.log?.step ?? ''}`,
              stepCount: payload.log?.step ?? undefined,
            });
          } else if (payload?.type === 'iteration') {
            setIterations((prev) => [...prev, normalizeIterationHistoryRow(payload.iteration)]);
          } else if (payload?.type === 'final') {
            setFinalResult(payload.result);
            if (payload.result?.runId && !runId) setRunId(payload.result.runId);
            const branchStep = [...(payload.result?.orchestrationLog ?? [])].reverse()
              .find((log) => log?.step === 9 && log?.result?.branchName);
            updateFlowAIRun(trackedRunId, {
              status: payload.result?.ok === false ? 'failed' : 'completed',
              endTime: new Date().toISOString(),
              score: payload.result?.ceo95Criteria?.verifiedScore ?? payload.result?.effectiveTrustScore ?? payload.result?.finalScore ?? null,
              verdict: runVerdictFromResult(payload.result),
              branchCreated: branchStep?.result?.branchName ?? null,
              progressLabel: payload.result?.exitReason ?? 'Completed',
            });
          } else if (payload?.type === 'control_applied') {
            // Server acknowledged our control command applied to the running
            // state. Reflect mode changes locally so the UI stays in sync.
            setControlApplied({
              command: payload.command, mode: payload.mode ?? null,
              envelopeId: payload.envelopeId, at: payload.at,
            });
            if (payload.command === 'switchMode' && payload.mode) setMode(payload.mode);
            if (payload.command === 'pause') setMode('guided');
            setIsPaused(payload.command === 'pause');
            if (payload.command === 'resume') setIsPaused(false);
          } else if (payload?.type === 'error') {
            setErrorMsg(`${payload.error}${payload.code ? ` (${payload.code})` : ''}`);
            updateFlowAIRun(trackedRunId, {
              status: 'failed',
              endTime: new Date().toISOString(),
              verdict: payload.code ?? 'ERROR',
              progressLabel: payload.error ?? 'Run failed',
            });
          }
        }
      }
    } catch (e) {
      if (e?.name !== 'AbortError') {
        setErrorMsg(`Stream error: ${e?.message ?? String(e)}`);
        updateFlowAIRun(trackedRunId, {
          status: 'failed',
          endTime: new Date().toISOString(),
          verdict: 'STREAM_ERROR',
          progressLabel: e?.message ?? 'Stream error',
        });
      }
    } finally {
      setIsRunning(false);
      setIsPaused(false);
      abortRef.current = null;
    }
  }

  // POST to /api/agent/3/control to bridge a command into the SSE handler's
  // OrchestrationState. Pre-condition: runId must be present (issued by
  // the server's `start` SSE event). The server's poller picks the command
  // up at the next 500ms boundary and emits a `control_applied` event back
  // over the same SSE stream.
  async function sendControl(command, modeArg = null) {
    if (!runId) return { ok: false, reason: 'no_run_id' };
    try {
      const resp = await fetch('/api/agent/3/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-product-scope': 'flowai-dashboard' },
        body: JSON.stringify({ runId, command, mode: modeArg }),
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        setErrorMsg(`Control failed (HTTP ${resp.status}): ${text.slice(0, 120)}`);
        return { ok: false, status: resp.status };
      }
      return await resp.json();
    } catch (e) {
      setErrorMsg(`Control network error: ${e?.message ?? String(e)}`);
      return { ok: false, reason: 'network' };
    }
  }

  // STOP: client-side abort of the SSE stream PLUS server-side stop
  // command so the orchestrator releases compute budget. Without the
  // server stop, aborting the stream client-side would leave the
  // orchestrator running to completion in the background.
  async function stop() {
    if (runId) await sendControl('stop');
    if (abortRef.current) abortRef.current.abort();
  }

  // PAUSE / RESUME wired through the back-channel.
  async function pauseRun() { await sendControl('pause'); }
  async function resumeRun() { await sendControl('resume'); }

  // SWITCH MODE: when running, this propagates to the live orchestrator
  // via the back-channel; when idle, it just updates the form selector
  // for the next run.
  async function switchMode(next) {
    setMode(next);
    if (isRunning && runId) await sendControl('switchMode', next);
  }

  // Cleanup the in-flight stream if the page unmounts.
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  const gtmReady = finalResult?.gtmReady === true;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-emerald-400">Flow</span>AI Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">Product-Agnostic AI Operating System</p>
          </div>
          {runId && (
            <div className="text-right text-xs font-mono text-slate-400 space-y-0.5">
              <div><span className="text-slate-500">runId:</span> {runId}</div>
              <div><span className="text-slate-500">mode:</span> {mode}</div>
              {startedAt && <div><span className="text-slate-500">started:</span> {new Date(startedAt).toLocaleTimeString()}</div>}
            </div>
          )}
        </div>

        {/* ── Input panel ──────────────────────────────────────────────── */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-5">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">New Run</p>
            <p className="text-lg font-semibold mt-0.5">Analyze any product from one operating surface</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {[
              { key: 'url', label: 'Enter URL', desc: 'Live product analysis' },
              { key: 'describe', label: 'Describe Product', desc: 'Text brief or concept' },
              { key: 'paste', label: 'Paste Content', desc: 'Copy, notes, screenshots' },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setInputMethod(item.key)}
                className={`rounded-md border px-3 py-2 text-left transition disabled:opacity-50 ${
                  inputMethod === item.key
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <span className="block text-sm font-semibold">{item.label}</span>
                <span className="block text-[11px] text-slate-400 mt-0.5">{item.desc}</span>
              </button>
            ))}
          </div>

          {inputMethod === 'url' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Product URL</label>
              <input
                type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                placeholder="https://saigeplatform.com"
                className="w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-500 mt-1">Leave blank to let FlowAI use the default registered product.</p>
            </div>
          )}

          {registeredProductNote && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {registeredProductNote}
            </div>
          )}

          {inputMethod === 'describe' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Product Description</label>
              <textarea
                value={productDescription}
                onChange={(e) => setProductDescription(e.target.value)}
                placeholder="Describe the product, target user, main workflow, known issues, and what you want FlowAI to evaluate."
                className="w-full min-h-28 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 resize-y"
              />
            </div>
          )}

          {inputMethod === 'paste' && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Pasted Content Or Screenshot Context</label>
              <textarea
                value={pastedContent}
                onChange={(e) => setPastedContent(e.target.value)}
                placeholder="Paste page copy, console output, bug notes, screenshot observations, or exported content for FlowAI to include in the run context."
                className="w-full min-h-28 rounded-md bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 disabled:opacity-50 resize-y"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { v: 'auto',   t: 'Auto',   d: 'Run end-to-end without pauses' },
                { v: 'guided', t: 'Guided', d: 'Pause at each checkpoint; continue to advance' },
                { v: 'manual', t: 'Manual', d: 'Pause at every step; user drives' },
              ].map(({ v, t, d }) => (
                <label key={v}
                       className={`rounded-md border px-3 py-2 cursor-pointer ${mode === v ? 'border-emerald-500 bg-emerald-500/5' : 'border-slate-700 hover:border-slate-600'}`}>
                  <input type="radio" name="mode" value={v} checked={mode === v}
                         onChange={() => setMode(v)} className="sr-only" />
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{d}</div>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                GTM Target: <span className="text-emerald-400">{gtmTarget}/100</span>
              </label>
              <input type="range" min="50" max="100" value={gtmTarget}
                     onChange={(e) => setGtmTarget(Number(e.target.value))}
                     className="w-full accent-emerald-500" />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>50</span><span>100</span></div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Iteration Budget: <span className="text-emerald-400">{maxIterations}</span>
              </label>
              <input type="range" min="10" max="1000" step="10" value={maxIterations}
                     onChange={(e) => setMaxIterations(Number(e.target.value))}
                     className="w-full accent-emerald-500" />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5"><span>10</span><span>1000</span></div>
            </div>
          </div>

          <button
            type="button" onClick={launch} disabled={!canLaunch}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition">
            <Icon.Rocket className="w-5 h-5" />
            {isRunning ? 'START ANOTHER RUN' : 'START NEW RUN'}
          </button>

          {errorMsg && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300 flex items-start gap-2">
              <Icon.Warning className="w-4 h-4 mt-0.5 shrink-0" />
              <div>{errorMsg}</div>
            </div>
          )}
        </div>

        {/* ── Live progress panel ──────────────────────────────────────── */}
        {(isRunning || stepLogs.length > 0) && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Live Progress</p>
                <p className="text-lg font-semibold mt-0.5">
                  Iteration {currentIterationNumber} of up to {maxIterations}
                  <span className="text-slate-400 font-normal text-sm ml-2">— Score: {latestScore.total ?? 0} → {gtmTarget} target</span>
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {isRunning && (
                  <button type="button" onClick={stop}
                          className="bg-red-600/80 hover:bg-red-500 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5"
                          title="Abort the SSE stream AND send a server-side stop command via /api/agent/3/control">
                    <Icon.Stop className="w-3.5 h-3.5" />STOP
                  </button>
                )}
                {/* PAUSE / RESUME — only meaningful while running with a runId.
                    Bridged through /api/agent/3/control → runControlBus →
                    SSE handler's poller → OrchestrationState.{switchMode,resume}. */}
                {isRunning && runId && !isPaused && (
                  <button type="button" onClick={pauseRun}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5"
                          title="Flip to guided mode so the orchestrator pauses at the next checkpoint">
                    PAUSE
                  </button>
                )}
                {isRunning && runId && isPaused && (
                  <button type="button" onClick={resumeRun}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-1.5 rounded text-sm font-bold flex items-center gap-1.5">
                    <Icon.Play className="w-3.5 h-3.5" />CONTINUE
                  </button>
                )}
                <button type="button"
                        onClick={() => switchMode(mode === 'auto' ? 'guided' : mode === 'guided' ? 'manual' : 'auto')}
                        className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-semibold"
                        title={isRunning && runId
                          ? 'Bridges to the live orchestrator via /api/agent/3/control'
                          : 'Updates the form selector for the next run'}>
                  Switch mode → {mode === 'auto' ? 'guided' : mode === 'guided' ? 'manual' : 'auto'}
                </button>
              </div>
            </div>

            {/* Control-applied notice — confirms back-channel landed */}
            {controlApplied && (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-300 flex items-center gap-2">
                <Icon.Check className="w-3.5 h-3.5" />
                Control applied: <span className="font-mono">{controlApplied.command}</span>
                {controlApplied.mode && <span className="font-mono">(mode={controlApplied.mode})</span>}
                <span className="text-slate-500 ml-auto">{new Date(controlApplied.at).toLocaleTimeString()}</span>
              </div>
            )}

            {/* Score progress bar */}
            <div>
              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                <span>0</span><span className="text-emerald-400">{latestScore.total ?? 0}</span><span>{gtmTarget}</span>
              </div>
              <div className="h-2 rounded bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>

            {/* Step log */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-3 py-2 text-left">Step</th>
                    <th className="px-3 py-2 text-left">Tool</th>
                    <th className="px-3 py-2 text-left">Why</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {stepLogs.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500 text-xs">awaiting first event…</td></tr>
                  )}
                  {stepLogs.map((log, i) => (
                    <StepRow
                      key={i} log={log}
                      expanded={Boolean(expandedSteps[i])}
                      onToggle={() => setExpandedSteps((s) => ({ ...s, [i]: !s[i] }))}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Five-Layer radar + Iteration history ───────────────────────── */}
        {(stepLogs.length > 0 || iterations.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Five-Layer Score</p>
              <FiveLayerRadar scores={latestScore} />
              <div className="grid grid-cols-5 gap-1 text-center mt-3">
                {['l1', 'l2', 'l3', 'l4', 'l5'].map((k) => (
                  <div key={k}>
                    <p className="text-[10px] text-slate-500 uppercase">{k}</p>
                    <p className="text-sm font-bold text-emerald-400">{latestScore[k] ?? 0}/20</p>
                  </div>
                ))}
              </div>
              <p className="text-center text-2xl font-bold mt-3">{latestLayerTotal}<span className="text-sm text-slate-500">/100</span></p>
              <p className="text-center text-[10px] text-slate-500 uppercase">Five-Layer total</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3">Iteration History</p>
              {iterations.length === 0 && (
                <p className="text-xs text-slate-500 py-6 text-center">no completed iterations yet</p>
              )}
              {iterations.length > 0 && (
                <>
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase text-slate-500 border-b border-slate-800">
                    <tr>
                      <th className="px-2 py-2 text-left">#</th>
                      <th className="px-2 py-2 text-right">Pre</th>
                      <th className="px-2 py-2 text-right">Post</th>
                      <th className="px-2 py-2 text-right">Δ</th>
                      <th className="px-2 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {iterations.map((it, i) => (
                      <>
                        <tr key={i} className="border-b border-slate-800/50 cursor-pointer hover:bg-slate-800/30"
                            onClick={() => setExpandedIters((s) => ({ ...s, [i]: !s[i] }))}>
                          <td className="px-2 py-2 text-xs">
                            <Icon.Chevron className={`w-3 h-3 inline transition-transform ${expandedIters[i] ? 'rotate-90' : ''}`} />
                            {' '}{it.number ?? i + 1}
                          </td>
                          <td className="px-2 py-2 text-right text-xs">{it.preScore ?? '—'}</td>
                          <td className="px-2 py-2 text-right text-xs" title={it.scoreReuseNote ?? ''}>
                            {it.postScore ?? '—'}
                            {it.noPreviewScoreReuse && <span className="ml-1 text-[9px] text-slate-500">*</span>}
                          </td>
                          <td className={`px-2 py-2 text-right text-xs font-bold ${it.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {it.delta >= 0 ? '+' : ''}{it.delta ?? '—'}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] border ${it.gtmReady ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-slate-600 text-slate-400'}`}>
                              {it.gtmReady ? 'GTM_READY' : (it.decision || 'in-progress')}
                            </span>
                          </td>
                        </tr>
                        {expandedIters[i] && (
                          <tr className="bg-slate-900/60">
                            <td colSpan={5} className="px-3 py-3">
                              <pre className="text-[10px] text-slate-300 whitespace-pre-wrap break-words font-mono">{JSON.stringify(it, null, 2)}</pre>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
                {iterations.some((it) => it.noPreviewScoreReuse) && (
                  <p className="mt-2 text-[10px] text-slate-500">
                    * No preview available; post score reused from baseline.
                  </p>
                )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Completion panel ─────────────────────────────────────────── */}
        {finalResult && (
          <div className={`rounded-xl border-2 p-6 space-y-4 ${gtmReady ? 'border-emerald-500/60 bg-emerald-500/5' : 'border-amber-500/60 bg-amber-500/5'}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                {gtmReady ? (
                  <span className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-md font-bold flex items-center gap-2">
                    <Icon.Check className="w-5 h-5" />GTM READY
                  </span>
                ) : (
                  <span className="bg-amber-500 text-slate-950 px-4 py-2 rounded-md font-bold flex items-center gap-2">
                    <Icon.Warning className="w-5 h-5" />BEST EFFORT
                  </span>
                )}
                <span className="text-sm text-slate-300">
                  Exit: <span className="font-mono">{finalResult.exitReason}</span> · {finalResult.iterationsCompleted} iterations
                </span>
              </div>
              <button type="button" onClick={launch} disabled={isRunning}
                      className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5">
                <Icon.Refresh className="w-3.5 h-3.5" />Run Again
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-md bg-slate-900/60 px-3 py-2">
                <p className="text-[10px] text-slate-500 uppercase">Raw score</p>
                <p className="text-2xl font-bold">{finalRawScore}<span className="text-xs text-slate-500">/100</span></p>
                <p className="text-[10px] text-slate-500">raw evaluator output - see Trust Score</p>
              </div>
              <div className="rounded-md bg-slate-900/60 px-3 py-2">
                <p className="text-[10px] text-slate-500 uppercase">Trust Score</p>
                <p className="text-2xl font-bold text-emerald-400">{finalTrustScore.toFixed(1)}<span className="text-xs text-slate-500">/100</span></p>
                <p className="text-[10px] text-slate-500">raw {finalRawScore.toFixed(1)}</p>
              </div>
              <div className="rounded-md bg-slate-900/60 px-3 py-2">
                <p className="text-[10px] text-slate-500 uppercase">Total improvement</p>
                <p className={`text-2xl font-bold ${(finalResult.totalDelta ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(finalResult.totalDelta ?? 0) >= 0 ? '+' : ''}{finalResult.totalDelta ?? 0}
                </p>
              </div>
            </div>

            {finalResult.ceo95Criteria && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="rounded-md bg-slate-900/60 px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase">Verified CEO-95 score</p>
                  <p className="text-2xl font-bold text-emerald-400">{finalResult.ceo95Criteria.verifiedScore}<span className="text-xs text-slate-500">/100</span></p>
                  <p className="text-[10px] text-slate-500">measured criteria only</p>
                </div>
                <div className="rounded-md bg-slate-900/60 px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase">Potential score</p>
                  <p className="text-2xl font-bold text-blue-300">{finalResult.ceo95Criteria.potentialScore}<span className="text-xs text-slate-500">/100</span></p>
                  <p className="text-[10px] text-slate-500">measured + inferred confidence</p>
                </div>
                <div className="rounded-md bg-slate-900/60 px-3 py-2">
                  <p className="text-[10px] text-slate-500 uppercase">Blocked verification</p>
                  <p className="text-2xl font-bold text-amber-300">{finalResult.ceo95Criteria.blockedScore}<span className="text-xs text-slate-500"> pts</span></p>
                  <p className="text-[10px] text-slate-500">human/repo/payment proof required</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {finalResult.previewUrl && (
                <a href={finalResult.previewUrl.startsWith('http') ? finalResult.previewUrl : `https://${finalResult.previewUrl}`}
                   target="_blank" rel="noreferrer"
                   className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5">
                  <Icon.External className="w-3.5 h-3.5" />Open preview URL
                </a>
              )}
              {finalResult.prUrl && (
                <a href={finalResult.prUrl} target="_blank" rel="noreferrer"
                   className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5">
                  <Icon.External className="w-3.5 h-3.5" />Open GitHub PR
                </a>
              )}
              {branchPrVisibility?.branchUrl && (
                <a href={branchPrVisibility.branchUrl} target="_blank" rel="noreferrer"
                   className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5">
                  <Icon.External className="w-3.5 h-3.5" />Open branch
                </a>
              )}
              {branchPrVisibility?.compareUrl && !branchPrVisibility.prUrl && (
                <a href={branchPrVisibility.compareUrl} target="_blank" rel="noreferrer"
                   className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-sm font-semibold flex items-center gap-1.5">
                  <Icon.External className="w-3.5 h-3.5" />Open compare
                </a>
              )}
            </div>

            {branchPrVisibility && (
              <div className="rounded-md border border-slate-700 bg-slate-950/50 px-3 py-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-slate-500">Registered repair branch</p>
                    <p className="font-mono text-slate-200 break-all">{branchPrVisibility.branchName}</p>
                  </div>
                  <span className="rounded border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-[10px] font-bold uppercase text-blue-300">
                    {branchPrVisibility.statusLabel}
                  </span>
                </div>
                {branchPrVisibility.approvalRequired && (
                  <p className="mt-2 text-slate-400">
                    GitHub branch was created. Operator approval is required before FlowAI opens a PR; no auto-merge will occur.
                  </p>
                )}
              </div>
            )}

            <FindingsReport
              deepBrowserAnalysis={finalResult.deepBrowserAnalysis}
              fixProposals={finalResult.fixProposals}
              sourceMappedFixProposals={finalResult.sourceMappedFixProposals}
              findingsCount={finalResult.findingsCount}
              findingsSeverity={finalResult.findingsSeverity}
            />

            <details className="bg-slate-900/60 rounded-md">
              <summary className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-900">Full orchestration log ({stepLogs.length} entries)</summary>
              <div className="px-3 py-2 max-h-96 overflow-auto">
                <pre className="text-[10px] text-slate-300 whitespace-pre-wrap break-words font-mono">{JSON.stringify(finalResult.orchestrationLog ?? stepLogs, null, 2)}</pre>
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
