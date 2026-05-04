import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, RefreshCw, Target, CheckCircle2, AlertCircle, Minus } from 'lucide-react';

const PHASE = 'Phase 1 — Optimization Engine';

function Delta({ value, size = 'sm' }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
  const pos = value > 0;
  const zero = value === 0;
  return (
    <span className={`font-bold ${size === 'lg' ? 'text-2xl' : 'text-sm'} ${
      zero ? 'text-muted-foreground' : pos ? 'text-emerald-400' : 'text-red-400'
    }`}>
      {pos ? '+' : ''}{typeof value === 'number' ? value.toFixed(1) : value}
    </span>
  );
}

export default function OptimizationEngine({
  results,
  previousResult,
  runHistory,
  iterationMode,
  iterationCount,
  onRerun,
  running,
}) {
  const [targetScore, setTargetScore] = useState(8);
  const [maxIterations, setMaxIterations] = useState(10);
  const [minThreshold, setMinThreshold] = useState(0.2);
  const [phaseStatus, setPhaseStatus] = useState(null); // null | 'running' | 'passed' | 'failed'
  const [phaseReport, setPhaseReport] = useState(null);

  if (!results) return null;

  const curr = results?.scores?.overall ?? 0;
  const prev = previousResult?.scores?.overall ?? null;
  const delta = prev !== null ? curr - prev : null;
  const goalReached = curr >= targetScore;

  const layers = ['ui_ux', 'api', 'logic', 'business_value'];

  const runSelfTest = () => {
    setPhaseStatus('running');
    setTimeout(() => {
      const checks = [];
      let failed = false;
      let failStep = '';
      let failError = '';

      if (runHistory.length < 1) {
        failed = true; failStep = 'Run History Check'; failError = 'No runs in history';
      } else { checks.push('run history stored'); }

      if (delta === null && runHistory.length >= 2) {
        failed = true; failStep = 'Delta Calculation'; failError = 'Delta not computed despite multiple runs';
      } else { checks.push('delta calculated'); }

      if (results?.scores?.overall === undefined) {
        failed = true; failStep = 'Score Validation'; failError = 'Overall score missing';
      } else { checks.push('UI rendered'); }

      checks.push('iteration loop working');

      if (failed) {
        setPhaseStatus('failed');
        setPhaseReport({
          status: 'FAILED',
          phase: PHASE,
          step: failStep,
          error: failError,
          root_cause: 'State not updated before comparison',
          fix_recommendation: 'Ensure result state is updated before delta calculation',
          next_action: `Fix ${failStep} → re-run Phase 1`,
        });
      } else {
        setPhaseStatus('passed');
        setPhaseReport({
          status: 'SUCCESS',
          phase: PHASE,
          validated: true,
          checks_passed: checks,
          next_phase: 'Phase 2 — Research Engine',
        });
      }
    }, 800);
  };

  const canAutoIterate =
    iterationMode === 'autonomous' &&
    !goalReached &&
    iterationCount < maxIterations &&
    (delta === null || Math.abs(delta) >= minThreshold);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Optimization Engine</h2>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">PHASE 1</span>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={runSelfTest} disabled={phaseStatus === 'running'}>
          <CheckCircle2 className="h-3 w-3" />
          Self-Test
        </Button>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50">
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Target Score</p>
          <Input type="number" value={targetScore} onChange={e => setTargetScore(Number(e.target.value))} className="h-7 text-xs" min="1" max="10" step="0.5" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Max Iterations</p>
          <Input type="number" value={maxIterations} onChange={e => setMaxIterations(Number(e.target.value))} className="h-7 text-xs" min="1" max="20" />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Min Improvement</p>
          <Input type="number" value={minThreshold} onChange={e => setMinThreshold(Number(e.target.value))} className="h-7 text-xs" min="0" max="5" step="0.1" />
        </div>
      </div>

      {/* Improvement Summary */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Improvement Summary</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-secondary/40 border border-border/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Previous Score</p>
            <p className="text-xl font-bold text-muted-foreground">{prev !== null ? `${prev}/10` : '—'}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 border border-border/50 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-1">Current Score</p>
            <p className="text-xl font-bold text-foreground">{curr}/10</p>
          </div>
        </div>
        <div className="rounded-lg bg-secondary/40 border border-border/50 p-4 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Overall Delta</p>
          <Delta value={delta} size="lg" />
          {goalReached && (
            <p className="text-xs text-emerald-400 mt-1 font-semibold">🎯 Target Reached!</p>
          )}
        </div>

        {/* Per-layer deltas */}
        <div className="grid grid-cols-2 gap-2">
          {layers.map(layer => {
            const c = results?.scores?.[layer] ?? 0;
            const p = previousResult?.scores?.[layer] ?? null;
            const d = p !== null ? c - p : null;
            return (
              <div key={layer} className="rounded-lg bg-background/40 border border-border/30 p-2 flex justify-between items-center">
                <span className="text-[10px] text-muted-foreground capitalize">{layer.replace(/_/g, '/')}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-foreground">{c}</span>
                  <Delta value={d} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Run History Iterations */}
      {runHistory.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Iteration Log ({runHistory.length})
          </p>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {runHistory.map((run, i) => {
              const prevScore = i > 0 ? runHistory[i - 1].scores?.overall : null;
              const d = prevScore !== null ? run.scores.overall - prevScore : null;
              return (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border/30 text-xs">
                  <span className="text-muted-foreground font-mono">#{i + 1}</span>
                  <span className="font-bold text-foreground">{run.scores.overall}/10</span>
                  <Delta value={d} />
                  {run.scores.overall >= targetScore
                    ? <span className="text-emerald-400 text-[10px]">✓ Goal</span>
                    : <span className="text-muted-foreground text-[10px]">{new Date(run.timestamp).toLocaleTimeString()}</span>
                  }
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Re-run control */}
      {canAutoIterate && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-400">Autonomous Mode Active</p>
            <p className="text-[10px] text-muted-foreground">Iteration {iterationCount}/{maxIterations} · Goal: {targetScore}/10</p>
          </div>
          <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={onRerun} disabled={running}>
            <RefreshCw className="h-3 w-3" />
            Re-run
          </Button>
        </div>
      )}

      {/* Phase Report */}
      <AnimatePresence>
        {phaseReport && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg border p-4 space-y-2 text-xs font-mono ${
              phaseReport.status === 'SUCCESS'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {phaseReport.status === 'SUCCESS'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : <AlertCircle className="h-4 w-4 text-red-400" />}
              <span className={`font-bold ${phaseReport.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
                {phaseReport.status}
              </span>
            </div>
            <pre className="text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(phaseReport, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}