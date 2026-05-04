import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  TrendingUp, TrendingDown, Minus, CheckCircle2, AlertCircle,
  RefreshCw, Zap, ArrowRight, RotateCcw
} from 'lucide-react';

function DeltaBadge({ delta, size = 'sm' }) {
  if (delta === 0) return <span className="text-muted-foreground font-bold">—</span>;
  const color = delta > 0 ? 'text-emerald-400' : 'text-amber-400';
  return (
    <span className={`font-bold ${color} ${size === 'lg' ? 'text-xl' : 'text-xs'}`}>
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
    </span>
  );
}

export default function IterationComparisonEngine({
  currentResult,
  previousResult,
  iterationMode,
  iterationCount,
  maxIterations,
  onRerun,
  running,
}) {
  if (!currentResult || !previousResult) return null;

  const overallDelta = currentResult.scores.overall - previousResult.scores.overall;
  const IMPROVEMENT_THRESHOLD = 0.5;

  const layers = ['ui_ux', 'api', 'logic', 'business_value'];
  const layerLabels = { ui_ux: 'UI/UX', api: 'API', logic: 'Logic', business_value: 'Business' };

  // Status
  let statusLabel, StatusIcon, statusColor;
  if (overallDelta > 0) {
    statusLabel = 'System Improved'; StatusIcon = TrendingUp; statusColor = 'text-emerald-400';
  } else if (overallDelta < 0) {
    statusLabel = 'System Degraded'; StatusIcon = TrendingDown; statusColor = 'text-amber-400';
  } else {
    statusLabel = 'No Change'; StatusIcon = Minus; statusColor = 'text-muted-foreground';
  }

  // Issue diff
  const prevRecs = previousResult.recommendations || [];
  const currRecs = currentResult.recommendations || [];

  const resolved = prevRecs.filter(p => !currRecs.some(c => c.action === p.action));
  const newIssues = currRecs.filter(c => !prevRecs.some(p => p.action === c.action));
  const persistent = currRecs.filter(c => prevRecs.some(p => p.action === c.action));

  // Autonomous stop condition
  const shouldAutoStop = iterationMode === 'autonomous' && Math.abs(overallDelta) < IMPROVEMENT_THRESHOLD;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-card p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-primary" />
          Iteration Comparison
          <span className="text-xs text-muted-foreground font-normal">Run #{iterationCount} vs #{iterationCount - 1}</span>
        </h2>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold
          ${overallDelta > 0 ? 'bg-emerald-500/10 border-emerald-500/30' :
            overallDelta < 0 ? 'bg-amber-500/10 border-amber-500/30' :
            'bg-secondary border-border'}`}
        >
          <StatusIcon className={`h-3.5 w-3.5 ${statusColor}`} />
          <span className={statusColor}>{statusLabel}</span>
        </div>
      </div>

      {/* Score comparison row */}
      <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Previous</p>
          <p className="text-3xl font-bold text-muted-foreground">{previousResult.scores.overall}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <DeltaBadge delta={overallDelta} size="lg" />
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Current</p>
          <p className={`text-3xl font-bold ${currentResult.scores.overall >= 7 ? 'text-emerald-400' : currentResult.scores.overall >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
            {currentResult.scores.overall}
          </p>
        </div>
      </div>

      {/* Per-layer deltas */}
      <div className="grid grid-cols-4 gap-2">
        {layers.map((layer) => {
          const delta = currentResult.scores[layer] - previousResult.scores[layer];
          return (
            <div key={layer} className="p-3 rounded-lg bg-secondary/30 border border-border/50 text-center space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{layerLabels[layer]}</p>
              <p className="text-sm font-bold text-foreground">{currentResult.scores[layer]}</p>
              <DeltaBadge delta={delta} />
            </div>
          );
        })}
      </div>

      {/* Issue diff */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issue Changes</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* Resolved */}
          <div className={`p-3 rounded-lg border ${resolved.length > 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-secondary/20 border-border/30'}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">Resolved ({resolved.length})</span>
            </div>
            {resolved.slice(0, 3).map((r, i) => (
              <p key={i} className="text-[10px] text-muted-foreground truncate">✓ {r.action}</p>
            ))}
            {resolved.length === 0 && <p className="text-[10px] text-muted-foreground">None</p>}
          </div>

          {/* New Issues */}
          <div className={`p-3 rounded-lg border ${newIssues.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-secondary/20 border-border/30'}`}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="h-3.5 w-3.5 text-red-400" />
              <span className="text-xs font-semibold text-red-400">New Issues ({newIssues.length})</span>
            </div>
            {newIssues.slice(0, 3).map((r, i) => (
              <p key={i} className="text-[10px] text-muted-foreground truncate">• {r.action}</p>
            ))}
            {newIssues.length === 0 && <p className="text-[10px] text-muted-foreground">None</p>}
          </div>

          {/* Persistent */}
          <div className="p-3 rounded-lg border bg-secondary/20 border-border/30">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Minus className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Persistent ({persistent.length})</span>
            </div>
            {persistent.slice(0, 3).map((r, i) => (
              <p key={i} className="text-[10px] text-muted-foreground truncate">↺ {r.action}</p>
            ))}
            {persistent.length === 0 && <p className="text-[10px] text-muted-foreground">None</p>}
          </div>
        </div>
      </div>

      {/* Iteration trigger */}
      {iterationMode === 'semi_automatic' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Re-run to validate improvements?</p>
            <p className="text-xs text-muted-foreground">Semi-automatic mode — manual trigger required</p>
          </div>
          <Button size="sm" className="gap-2" onClick={onRerun} disabled={running}>
            {running ? <Zap className="h-3.5 w-3.5 animate-pulse" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Re-run
          </Button>
        </motion.div>
      )}

      {iterationMode === 'autonomous' && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-3 rounded-lg border flex items-center justify-between ${
            shouldAutoStop
              ? 'bg-emerald-500/10 border-emerald-500/30'
              : 'bg-amber-500/10 border-amber-500/30'
          }`}
        >
          <div>
            {shouldAutoStop ? (
              <>
                <p className="text-sm font-semibold text-emerald-400">Convergence reached</p>
                <p className="text-xs text-muted-foreground">Improvement below threshold ({IMPROVEMENT_THRESHOLD}pt) — stopping.</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-amber-400">Auto-iterating…</p>
                <p className="text-xs text-muted-foreground">Iteration {iterationCount} of {maxIterations}</p>
              </>
            )}
          </div>
          {running && <Zap className="h-4 w-4 text-primary animate-pulse" />}
        </motion.div>
      )}
    </motion.div>
  );
}