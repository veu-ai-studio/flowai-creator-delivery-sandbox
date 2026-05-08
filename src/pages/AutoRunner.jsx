import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Zap, CheckCircle2, Loader2, Clock, AlertCircle, ChevronDown, ChevronUp, Pause, Play, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SessionInputPanel from '@/components/operations/SessionInputPanel';
import StepResultPanel from '@/components/operations/StepResultPanel';
import FinalReport from '@/components/operations/FinalReport';
import SessionContextBanner from '@/components/operations/SessionContextBanner';
import FetchFailurePrompt from '@/components/operations/FetchFailurePrompt';
import ClearanceProtocolPrompt from '@/components/operations/ClearanceProtocolPrompt';
import SessionResumePrompt from '@/components/operations/SessionResumePrompt';
import { STEPS, buildStepPrompt, buildFinalReportPrompt, fetchPageContext, runCrawl, researchViaApi } from '@/lib/operationsEngine';
import SelfRenewalEngine from '@/components/operations/SelfRenewalEngine';
import { logAction } from '@/lib/auditLogger';

function StepCard({ step, index, status, result, elapsed, onExpand, isExpanded, inputName, isCompare, compareResults, sessionInput, sessionObjective, crawlStatus }) {
  const cfg = {
    waiting: { icon: <Clock className="h-4 w-4 text-muted-foreground" />, badge: <span className="text-[10px] text-muted-foreground">Waiting — {step.estimate}</span>, border: 'border-border', bg: 'bg-card' },
    running: { icon: <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />, badge: <span className="text-[10px] text-blue-400 font-semibold animate-pulse">● Running — {elapsed}s</span>, border: 'border-blue-500/40', bg: 'bg-blue-500/5' },
    complete: { icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />, badge: <span className="text-[10px] text-emerald-400 font-semibold">Done — {elapsed}s</span>, border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
    failed: { icon: <AlertCircle className="h-4 w-4 text-red-400" />, badge: <span className="text-[10px] text-red-400 font-semibold">Failed</span>, border: 'border-red-500/30', bg: 'bg-red-500/5' },
  }[status] || { icon: <Clock className="h-4 w-4 text-muted-foreground" />, badge: null, border: 'border-border', bg: 'bg-card' };

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all`}>
      <div className="p-4 flex items-center gap-3">
        <span className="text-[10px] font-bold text-muted-foreground/50 w-4 shrink-0">{index + 1}</span>
        {cfg.icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground">{step.label}</span>
            {cfg.badge}
            {/* Crawl status indicator — shown during Steps 3 (build) and 4 (qa_audit) */}
            {crawlStatus && (step.key === 'build' || step.key === 'qa_audit') && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                crawlStatus.state === 'crawling'
                  ? 'border-violet-500/40 bg-violet-500/10 text-violet-400 animate-pulse'
                  : crawlStatus.state === 'done'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : 'border-border text-muted-foreground'
              }`}>
                {crawlStatus.state === 'crawling'
                  ? `🕷 Crawling ${crawlStatus.url ? new URL(crawlStatus.url).hostname : ''}…`
                  : crawlStatus.state === 'done'
                  ? `✓ Crawl complete — ${crawlStatus.pages} pages, ${crawlStatus.issues} issues`
                  : crawlStatus.state === 'failed'
                  ? `⚠ Crawl unavailable`
                  : null}
              </span>
            )}
          </div>
          {status === 'running' && (
            <div className="mt-1.5 h-1 w-full bg-blue-500/20 rounded-full overflow-hidden">
              <div className="h-full bg-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
          )}
          {status === 'waiting' && <p className="text-[10px] text-muted-foreground/50 mt-0.5">{step.desc}</p>}
          {status === 'complete' && result && (
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {(result.full_output || '').slice(0, 600).replace(/\n/g, ' ')}{(result.full_output || '').length > 600 ? '...' : ''}
            </p>
          )}
        </div>
        {status === 'complete' && result && (
          <button onClick={onExpand} className="text-muted-foreground hover:text-foreground shrink-0">
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && status === 'complete' && result && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/30">
            <div className="p-4">
              {step.key === 'govern' && sessionInput ? (
                <SelfRenewalEngine
                  input={sessionInput}
                  pageContext={null}
                  objective={sessionObjective}
                  onComplete={null}
                />
              ) : (
                <StepResultPanel
                  stepLabel={step.label}
                  result={result}
                  inputName={inputName}
                  isCompare={isCompare}
                  compareResults={compareResults}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Load session config from sessionStorage (set by Workspace / LandingPage)
function loadStoredConfig() {
  try { return JSON.parse(sessionStorage.getItem('flowai_session_config') || 'null'); } catch { return null; }
}

export default function AutoRunner() {
  const navigate = useNavigate();
  const [sessionConfig, setSessionConfig] = useState(null);
  const [sessionState, setSessionState] = useState('idle'); // idle | running | paused | complete
  const [resumeSession, setResumeSession] = useState(null); // existing in-progress session for resume prompt
  const [showClearancePrompt, setShowClearancePrompt] = useState(false);
  const [stepStatuses, setStepStatuses] = useState(STEPS.map(() => 'waiting'));
  // stepResults[stepIdx] = for single: {full_output,summary} | for multi: [{inputName, full_output}]
  const [stepResults, setStepResults] = useState(STEPS.map(() => null));
  const [stepElapsed, setStepElapsed] = useState(STEPS.map(() => 0));
  const [currentStep, setCurrentStep] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [expandedStep, setExpandedStep] = useState(null);
  const [showFinalReport, setShowFinalReport] = useState(false);
  const [fetchFailures, setFetchFailures] = useState([]); // FIX E
  const [crawlStatus, setCrawlStatus] = useState(null); // {state, url, pages, issues}
  const timerRef = useRef(null);
  const isPausedRef = useRef(false);
  const pausedAtStepRef = useRef(0);
  const savedStateRef = useRef(null);
  const sessionDbIdRef = useRef(null);

  const formatTime = (s) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  // On mount: (1) check for explicit resume request from Dashboard click,
  // (2) check sessionStorage for new config, (3) check DB for any running session
  useEffect(() => {
    const init = async () => {
      // Check for a specific session to resume (set by Dashboard session card click)
      const resumeId = sessionStorage.getItem('flowai_resume_session_id');
      if (resumeId) {
        try { sessionStorage.removeItem('flowai_resume_session_id'); } catch {}
        try {
          const sessions = await base44.entities.AutoSession.filter({ overall_status: 'running' }, '-started_at', 10);
          const match = sessions.find(s => s.id === resumeId) || sessions[0];
          if (match) { setResumeSession(match); return; }
        } catch {}
      }

      // Check sessionStorage for new session config from Workspace / LandingPage
      const stored = loadStoredConfig();
      if (stored?.inputs?.length > 0 && stored.inputs[0]?.value?.trim()) {
        startSession(stored);
        return;
      }

      // Always check DB for any running session — never show blank input panel if one exists
      try {
        const sessions = await base44.entities.AutoSession.filter({ overall_status: 'running' }, '-started_at', 1);
        if (sessions[0]) {
          setResumeSession(sessions[0]);
          return;
        }
      } catch {}
      // No active session — idle, show input panel
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runStepsFrom = async (startIdx, statuses, results, elapseds, allInputResults, config) => {
    const { inputs, multiMode, objective } = config;

    // Pre-fetch page context for all URL inputs once before stepping through
    const pageContexts = await Promise.all(inputs.map(inp => fetchPageContext(inp, base44)));

    for (let i = startIdx; i < STEPS.length; i++) {
      if (isPausedRef.current) {
        savedStateRef.current = { statuses: [...statuses], results: [...results], elapseds: [...elapseds], allInputResults, config };
        pausedAtStepRef.current = i;
        return;
      }

      statuses[i] = 'running';
      setStepStatuses([...statuses]);
      setCurrentStep(i);

      const stepStart = Date.now();
      const stepTimer = setInterval(() => {
        setStepElapsed(prev => {
          const next = [...prev];
          next[i] = Math.floor((Date.now() - stepStart) / 1000);
          return next;
        });
      }, 500);

      const isLastStep = i === STEPS.length - 1;
      const isMulti = inputs.length > 1 && multiMode;
      let stepResult = null;

      try {
        if (isLastStep && isMulti) {
          const prompt = buildFinalReportPrompt(multiMode, inputs, allInputResults.map(ir => {
            const obj = {};
            STEPS.forEach((s, si) => { obj[s.key] = ir[si]; });
            return obj;
          }));
          const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
          const output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
          stepResult = { full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') };
          results[i] = stepResult;
          inputs.forEach((_, idx) => { allInputResults[idx][i] = stepResult; });
        } else if (isMulti) {
          const perInputResults = await Promise.all(
            inputs.map(async (inp, idx) => {
              const prompt = buildStepPrompt(STEPS[i].key, inp, multiMode, inputs, pageContexts[idx], objective);
              const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
              const output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
              return { inputName: inp.name, full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') };
            })
          );
          perInputResults.forEach((r, idx) => { allInputResults[idx][i] = r; });
          stepResult = {
            full_output: perInputResults[0]?.full_output || '',
            summary: `${inputs.length} inputs analyzed`,
            compareResults: perInputResults,
          };
          results[i] = stepResult;
        } else {
          const inp = inputs[0];
          // FIX E: surface fetch failure, halt session
          if (pageContexts[0]?.fetchFailed && i === 0) {
            setFetchFailures([{ inputId: inp.id, url: inp.value, reason: pageContexts[0].reason }]);
            clearInterval(stepTimer);
            clearInterval(timerRef.current);
            setSessionState('paused');
            return;
          }

          // ── Research step: prefer Vercel-side /api/research-url when available ──
          // On Vercel, base44.integrations.Core.InvokeLLM has no backend and 404s.
          // /api/research-url runs Browserless + Claude server-side and returns
          // { ok: true, analysis: <brief text>, page: {...}, ... } on success.
          // researchViaApi returns null on any non-success; we then fall through
          // to the existing InvokeLLM path so Base44 deployments keep working.
          if (STEPS[i].key === 'research' && inp.type === 'url') {
            const apiResult = await researchViaApi(inp.value, objective, sessionDbIdRef.current);
            if (apiResult && typeof apiResult.analysis === 'string' && apiResult.analysis.length > 0) {
              const output = apiResult.analysis;
              stepResult = {
                full_output: output,
                summary: output.slice(0, 120).replace(/\n/g, ' '),
                _researchSource: 'api',
              };
              results[i] = stepResult;
              allInputResults[0][i] = stepResult;
              statuses[i] = 'complete';
              if (sessionDbIdRef.current) {
                base44.entities.AutoSession.update(sessionDbIdRef.current, {
                  current_step: i + 1,
                  step_results: Object.fromEntries(STEPS.map((s, si) => [s.key, results[si] ? { summary: results[si].summary, full_output: (results[si].full_output || '').slice(0, 2000) } : null])),
                  overall_status: 'running',
                }).catch(() => {});
              }
              logAction({ actionType: 'step_completed', stepName: STEPS[i].label, sessionId: sessionDbIdRef.current || '', productUrl: config.inputs[0]?.value || '', outcome: 'complete', mode: 'auto' });
              clearInterval(stepTimer);
              elapseds[i] = Math.floor((Date.now() - stepStart) / 1000);
              setStepStatuses([...statuses]);
              setStepResults([...results]);
              setStepElapsed([...elapseds]);
              continue;
            }
          }

          // ── Playwright crawl for Build (step 3) and QA Audit (step 4) ──
          let crawlCtx = null;
          if ((STEPS[i].key === 'build' || STEPS[i].key === 'qa_audit') && inp.type === 'url') {
            const captureScreenshots = STEPS[i].key === 'qa_audit';
            const credentials = inp.credentials || null;
            setCrawlStatus({ state: 'crawling', url: inp.value, pages: 0, issues: 0 });
            const crawlResult = await runCrawl(inp.value, { capture_screenshots: captureScreenshots, credentials });
            if (crawlResult.success) {
              const d = crawlResult.data;
              const pagesCount = d?.summary?.total_pages_crawled ?? 0;
              const issuesCount = (d?.issues_found?.length ?? 0) + (d?.broken_links?.length ?? 0) + (d?.rendering_errors?.length ?? 0);
              setCrawlStatus({ state: 'done', url: inp.value, pages: pagesCount, issues: issuesCount });
              crawlCtx = `\n━━━ REAL PLAYWRIGHT CRAWL DATA — USE AS PRIMARY EVIDENCE ━━━
Pages crawled: ${pagesCount}
Links tested: ${d?.summary?.total_links_tested ?? 'N/A'}
Broken links: ${JSON.stringify(d?.broken_links ?? [])}
Rendering errors: ${JSON.stringify(d?.rendering_errors ?? [])}
Performance metrics: ${JSON.stringify(d?.performance_metrics ?? {})}
Issues detected: ${JSON.stringify(d?.issues_found ?? [])}
Console errors: ${JSON.stringify(d?.console_errors ?? [])}
${captureScreenshots && d?.screenshots?.length ? `Screenshots captured: ${d.screenshots.length} pages` : ''}
━━━ END CRAWL DATA ━━━`;
              // Store screenshots on result for QA step
              if (captureScreenshots && d?.screenshots) {
                results[i] = results[i] || {};
                results[i]._screenshots = d.screenshots;
              }
            } else {
              setCrawlStatus({ state: 'failed', url: inp.value });
              crawlCtx = `Crawl unavailable — ${crawlResult.reason}. Proceed with description-based analysis.`;
            }
          }

          const prompt = buildStepPrompt(STEPS[i].key, inp, null, null, pageContexts[0], objective, crawlCtx);
          const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
          const output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
          stepResult = { full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') };
          // Carry screenshots forward for QA display
          if (results[i]?._screenshots) stepResult._screenshots = results[i]._screenshots;
          results[i] = stepResult;
          allInputResults[0][i] = stepResult;
        }
        statuses[i] = 'complete';
      // Persist step result to DB
      if (sessionDbIdRef.current) {
        base44.entities.AutoSession.update(sessionDbIdRef.current, {
          current_step: i + 1,
          step_results: Object.fromEntries(STEPS.map((s, si) => [s.key, results[si] ? { summary: results[si].summary, full_output: (results[si].full_output || '').slice(0, 2000) } : null])),
          overall_status: 'running',
        }).catch(() => {});
      }
      logAction({ actionType: 'step_completed', stepName: STEPS[i].label, sessionId: sessionDbIdRef.current || '', productUrl: config.inputs[0]?.value || '', outcome: 'complete', mode: 'auto' });
      } catch (e) {
        const errOutput = `Error running ${STEPS[i].label}: ${e.message}`;
        stepResult = { full_output: errOutput, summary: `Failed: ${e.message}` };
        results[i] = stepResult;
        statuses[i] = 'failed';
      }

      clearInterval(stepTimer);
      elapseds[i] = Math.floor((Date.now() - stepStart) / 1000);
      setStepStatuses([...statuses]);
      setStepResults([...results]);
      setStepElapsed([...elapseds]);

      if (statuses[i] === 'failed') break;
    }

    clearInterval(timerRef.current);
    const allComplete = statuses.every(s => s === 'complete');
    setSessionState(allComplete ? 'complete' : 'paused');
    if (allComplete) {
      setShowFinalReport(true);
      if (sessionDbIdRef.current) {
        base44.entities.AutoSession.update(sessionDbIdRef.current, { overall_status: 'completed', completed_at: new Date().toISOString() }).catch(() => {});
      }
    }
    savedStateRef.current = null;
  };

  const startSession = async (config) => {
    setSessionConfig(config);
    setSessionState('running');
    setTotalElapsed(0);
    setCurrentStep(0);
    isPausedRef.current = false;
    savedStateRef.current = null;
    const statuses = STEPS.map(() => 'waiting');
    const results = STEPS.map(() => null);
    const elapseds = STEPS.map(() => 0);
    setStepStatuses([...statuses]);
    setStepResults([...results]);
    setStepElapsed([...elapseds]);
    setShowFinalReport(false);

    const { inputs } = config;
    timerRef.current = setInterval(() => setTotalElapsed(t => t + 1), 1000);

    const dbSession = await base44.entities.AutoSession.create({
      product_name: inputs.map(i => i.name).join(' + '),
      product_url: inputs.filter(i => i.type === 'url').map(i => i.value).join(', '),
      overall_status: 'running',
      current_step: 1,
      started_at: new Date().toISOString(),
      step_results: {},
    }).catch(() => null);
    sessionDbIdRef.current = dbSession?.id || null;
    setResumeSession(null);
    logAction({ actionType: 'session_started', sessionId: dbSession?.id || '', productUrl: inputs[0]?.value || '', mode: 'auto' });

    const allInputResults = inputs.map(() => STEPS.map(() => null));
    savedStateRef.current = { statuses, results, elapseds, allInputResults, config };
    await runStepsFrom(0, statuses, results, elapseds, allInputResults, config);
  };

  const handlePause = () => {
    isPausedRef.current = true;
    clearInterval(timerRef.current);
    pausedAtStepRef.current = currentStep;
    setSessionState('paused');
  };

  const handleResume = () => {
    if (!savedStateRef.current) return;
    const { statuses, results, elapseds, allInputResults, config } = savedStateRef.current;
    isPausedRef.current = false;
    setSessionState('running');
    timerRef.current = setInterval(() => setTotalElapsed(t => t + 1), 1000);
    // Resume the loop from the paused step
    runStepsFrom(pausedAtStepRef.current, statuses, results, elapseds, allInputResults, config);
  };

  const handleAbort = () => {
    isPausedRef.current = true;
    clearInterval(timerRef.current);
    setSessionState('idle');
    setSessionConfig(null);
    setShowFinalReport(false);
    setShowClearancePrompt(false);
    setFetchFailures([]);
    setCrawlStatus(null);
    savedStateRef.current = null;
    sessionDbIdRef.current = null;
    // Clear sessionStorage so returning to Workspace starts fresh
    try { sessionStorage.removeItem('flowai_session_config'); } catch {}
  };

  const handleReset = handleAbort;

  const completedCount = stepStatuses.filter(s => s === 'complete').length;

  // Build step results array for FinalReport
  const finalStepResults = STEPS.map((s, i) => ({ step: s.key, result: stepResults[i] }));

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Zap className="h-7 w-7 text-primary" /> Auto Runner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          FlowAI executes all 8 steps automatically — Research through Monitor — then delivers a final report
        </p>
      </motion.div>

      {/* Resume prompt */}
      {sessionState === 'idle' && resumeSession && (
        <SessionResumePrompt
          session={resumeSession}
          lastStepName={STEPS[Object.keys(resumeSession.step_results || {}).length - 1]?.label}
          onResume={() => setResumeSession(null)}
          onStartNew={() => setResumeSession(null)}
        />
      )}

      {/* Input screen — only shown if no sessionStorage config */}
      {sessionState === 'idle' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 mb-4">
            <p className="text-sm font-bold text-amber-400 mb-1">No session configured</p>
            <p className="text-xs text-muted-foreground mb-3">Start a new session from Workspace to launch Auto Runner automatically.</p>
            <Button size="sm" onClick={() => navigate('/')} className="gap-2">
              <Zap className="h-3.5 w-3.5" /> Go to Workspace
            </Button>
          </div>
          <SessionInputPanel onStart={startSession} />
        </motion.div>
      )}

      {/* Session running / complete */}
      {sessionState !== 'idle' && (
        <>
          {/* FIX D: Persistent session context banner */}
          <SessionContextBanner config={sessionConfig} />

          {/* FIX E: Fetch failure block */}
          {fetchFailures.length > 0 && (
            <div className="space-y-3">
              {fetchFailures.map(f => (
                <FetchFailurePrompt
                  key={f.inputId}
                  url={f.url}
                  reason={f.reason}
                  onRetry={handleAbort}
                  onSwitchToDescription={handleAbort}
                />
              ))}
            </div>
          )}

          {/* Status bar */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3 text-xs flex-wrap">
              <span className="font-bold text-foreground">
                {sessionConfig?.inputs.map(i => i.name).join(' · ')}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className={`font-semibold ${sessionState === 'running' ? 'text-blue-400' : sessionState === 'complete' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {sessionState === 'running' ? '● Running' : sessionState === 'complete' ? '✓ Complete' : '⏸ Paused'}
              </span>
              {sessionConfig?.multiMode && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-bold uppercase">{sessionConfig.multiMode}</span>
              )}
              <span className="text-foreground font-mono">{formatTime(totalElapsed)}</span>
            </div>
            <div className="flex gap-2">
              {sessionState === 'running' && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handlePause}>
                  <Pause className="h-3 w-3" /> Pause
                </Button>
              )}
              {sessionState === 'paused' && (
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10" onClick={handleResume}>
                  <Play className="h-3 w-3" /> Resume
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-400 hover:text-red-300" onClick={handleAbort} title="Abort session">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedCount}/{STEPS.length} steps
            </span>
          </div>

          {/* Step cards */}
          <div className="space-y-2">
            {STEPS.map((step, i) => (
              <StepCard
                key={step.key}
                step={step}
                index={i}
                status={stepStatuses[i]}
                result={stepResults[i]}
                elapsed={stepElapsed[i]}
                onExpand={() => setExpandedStep(expandedStep === i ? null : i)}
                isExpanded={expandedStep === i}
                inputName={sessionConfig?.inputs.length === 1 ? sessionConfig.inputs[0].name : null}
                isCompare={!!sessionConfig?.multiMode && (stepResults[i]?.compareResults?.length > 1)}
                compareResults={stepResults[i]?.compareResults}
                sessionInput={sessionConfig?.inputs?.[0] || null}
                sessionObjective={sessionConfig?.objective || null}
                crawlStatus={stepStatuses[i] === 'running' || stepStatuses[i] === 'complete' ? crawlStatus : null}
              />
            ))}
          </div>

          {/* Final report */}
          <AnimatePresence>
            {showFinalReport && (
              <FinalReport
                multiMode={sessionConfig?.multiMode}
                inputs={sessionConfig?.inputs || []}
                stepResults={finalStepResults}
                onAccept={() => { setShowFinalReport(false); setShowClearancePrompt(true); handleReset(); }}
              />
            )}
          </AnimatePresence>

          {/* Clearance Protocol prompt — shown after Accept and Lock */}
          <AnimatePresence>
            {showClearancePrompt && (
              <ClearanceProtocolPrompt sessionConfig={sessionConfig} />
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}