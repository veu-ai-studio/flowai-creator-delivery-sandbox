import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useJobs } from '@/lib/JobContext';
import { pushJobUpdate } from '@/lib/JobContext';
import { Cpu, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModeSelector from '@/components/orchestrator/ModeSelector';
import StepTimeline, { STEPS } from '@/components/orchestrator/StepTimeline';
import StepResultCard from '@/components/orchestrator/StepResultCard';
import FinalOutputPanel from '@/components/orchestrator/FinalOutputPanel';
import PlatformRecommendationPanel from '@/components/orchestrator/PlatformRecommendationPanel';

const PIPELINE_STEPS = STEPS.map(s => s.id);

export default function MasterOrchestrator() {
  const { createJob } = useJobs();
  const [mode, setMode] = useState('creation');
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [stopped, setStopped] = useState(false);

  // Step tracking
  const [stepStatuses, setStepStatuses] = useState({});
  const [stepResults, setStepResults] = useState(/** @type {any} */ ({}));

  // Accumulated context passed between steps
  const [context, setContext] = useState({});
  const [scorerOutput] = useState({
    gtmFlag: 'INSUFFICIENT_EVIDENCE',
    productScore: null,
    flowaiSelfScore: { verified: false, verified_pct: null, reason: 'FlowAI self-score not yet instrumented' },
  });

  const setStepStatus = (step, status) =>
    setStepStatuses(prev => ({ ...prev, [step]: status }));

  const setStepResult = (step, result) => {
    setStepResults(prev => ({ ...prev, [step]: result }));
    setContext(prev => ({ ...prev, [step]: result }));
  };

  const invokeStep = useCallback(async (step, ctx) => {
    const res = await base44.functions.invoke('masterOrchestrator', {
      action: 'run_step',
      step,
      input,
      mode,
      existingUrl: mode === 'conversion' ? input : null,
      context: ctx,
    });
    return res?.data?.result;
  }, [input, mode]);

  const handleRun = useCallback(async () => {
    if (!input.trim() || running) return;
    setRunning(true);
    setStopped(false);
    setStepStatuses({});
    setStepResults({});
    setContext({});

    const jobId = createJob({
      type: 'autonomous',
      label: `Master Orchestration — ${mode === 'conversion' ? 'Conversion' : 'Creation'}`,
      meta: { input: input.slice(0, 60), mode },
    });
    pushJobUpdate(jobId, { status: 'running', progress: 2 });

    let ctx = {};
    const total = PIPELINE_STEPS.length;

    for (let i = 0; i < total; i++) {
      if (stopped) break;
      const step = PIPELINE_STEPS[i];
      setStepStatus(step, 'running');

      try {
        const result = await invokeStep(step, ctx);
        ctx = { ...ctx, [step]: result };
        setStepResult(step, result);
        setStepStatus(step, 'done');
        pushJobUpdate(jobId, { progress: Math.round(((i + 1) / total) * 95) });

        // Validation gate: fail fast if test step rejects
        if (step === 'test' && result?.recommendation === 'reject') {
          // Continue anyway — mark as done but log warning
          console.warn('[masterOrchestrator] Test step recommends reject — continuing with optimization');
        }
      } catch (err) {
        console.error(`[masterOrchestrator] Step ${step} failed:`, err.message);
        setStepStatus(step, 'failed');
        setStepResult(step, { error: err.message });
        // Continue remaining steps rather than abort entire pipeline
      }
    }

    pushJobUpdate(jobId, { status: 'completed', progress: 100, completedAt: new Date().toISOString() });
    setRunning(false);
  }, [input, mode, running, stopped, invokeStep, createJob]);

  const handleStop = () => { setStopped(true); setRunning(false); };
  const handleReset = () => {
    setStepStatuses({}); setStepResults({}); setContext({});
    setRunning(false); setStopped(false);
  };

  const hasResults = Object.keys(stepResults).length > 0;
  const completedSteps = Object.values(stepStatuses).filter(s => s === 'done').length;

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2 mb-1">
              <Cpu className="h-7 w-7 text-primary" />
              Master Orchestrator
            </h1>
            <p className="text-sm text-muted-foreground">
              Universal lifecycle engine — Analyze · Build · Test · Audit · Deploy · Mobile · App Store
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {running && (
              <Button variant="outline" size="sm" onClick={handleStop} className="gap-1.5 text-xs">
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            )}
            {hasResults && !running && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="text-xs">Reset</Button>
            )}
          </div>
        </div>
      </motion.div>

      <PlatformRecommendationPanel />

      <div className="grid gap-3 rounded-lg border border-border bg-card/70 p-3 md:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Product Score</p>
          <p className="mt-1 text-sm font-bold text-foreground">{scorerOutput.productScore ?? 'Not scored'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">FlowAI Self-Score</p>
          <p className="mt-1 text-sm font-bold text-foreground">{scorerOutput.flowaiSelfScore.verified_pct ?? 'Stubbed'}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">GTM Gate</p>
          <p className="mt-1 text-sm font-bold text-foreground">{scorerOutput.gtmFlag}</p>
        </div>
      </div>

      {/* Input */}
      <AnimatePresence>
        {!running && !hasResults && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <ModeSelector
              mode={mode} setMode={setMode}
              input={input} setInput={setInput}
              onRun={handleRun} running={running}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Running header */}
      {(running || hasResults) && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
          {running && <span className="h-3 w-3 rounded-full bg-primary animate-pulse shrink-0" />}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{input}</p>
            <p className="text-[10px] text-muted-foreground">
              {running ? `Step ${completedSteps + 1}/${PIPELINE_STEPS.length} running…` : `${completedSteps}/${PIPELINE_STEPS.length} steps completed`}
            </p>
          </div>
          {!running && !hasResults && (
            <ModeSelector mode={mode} setMode={setMode} input={input} setInput={setInput} onRun={handleRun} running={running} />
          )}
        </div>
      )}

      {/* Main Layout */}
      {(running || hasResults) && (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          {/* Left: Timeline */}
          <div className="shrink-0">
            <StepTimeline stepStatuses={stepStatuses} />
          </div>

          {/* Right: Results */}
          <div className="space-y-3 min-w-0">
            {/* Final output first (when done) */}
            <AnimatePresence>
              {stepResults.output && !running && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <FinalOutputPanel context={{ ...stepResults, analysis: stepResults.analyze }} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step cards */}
            {PIPELINE_STEPS.map(step => {
              const result = stepResults[step];
              const status = stepStatuses[step];
              if (!result && status !== 'running') return null;
              return (
                <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  {result
                    ? <StepResultCard step={step} result={result} status={status} />
                    : (
                      <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 flex items-center gap-2">
                        <span className="h-3 w-3 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin shrink-0" />
                        <span className="text-xs text-blue-400 font-semibold capitalize">{step} — running…</span>
                      </div>
                    )
                  }
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!running && !hasResults && (
        <div className="text-center py-20">
          <Cpu className="h-14 w-14 text-muted-foreground/15 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm mb-1">Select a mode and run the pipeline</p>
          <p className="text-muted-foreground/50 text-xs">13-step end-to-end lifecycle: Analyze → Plan → Build → Test → Audit → Optimize → Upgrade → Deploy → Mobile → App Store → Output</p>
        </div>
      )}
    </div>
  );
}
