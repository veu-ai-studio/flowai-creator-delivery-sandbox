import { motion } from 'framer-motion';
import { TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ImprovementSummary({ currentRun, previousRun }) {
  if (!previousRun) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-4 text-center"
      >
        <p className="text-xs text-muted-foreground">First run - no comparison available.</p>
      </motion.div>
    );
  }

  const overallDelta = currentRun.scores.overall - previousRun.scores.overall;
  const isImprovement = overallDelta > 0;

  const getLayerDelta = (layer) => {
    const curr = currentRun.scores[layer];
    const prev = previousRun.scores[layer];
    return curr - prev;
  };

  const criticalNow = currentRun.recommendations?.filter(r => r.priority === 'critical') || [];
  const criticalPrev = previousRun.recommendations?.filter(r => r.priority === 'critical') || [];
  const criticalDelta = criticalNow.length - criticalPrev.length;

  const resolvedIssues = criticalPrev.filter(
    prev => !criticalNow.some(curr => curr.action === prev.action)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-4 space-y-4 ${
        isImprovement
          ? 'bg-emerald-500/5 border-emerald-500/30'
          : 'bg-amber-500/5 border-amber-500/30'
      }`}
    >
      {/* Overall Trend */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            {isImprovement ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <AlertCircle className="h-4 w-4 text-amber-400" />
            )}
            Overall Trend
          </h3>
          <p className="text-[10px] text-muted-foreground">
            vs. {new Date(previousRun.timestamp).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${
            isImprovement ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            {overallDelta > 0 ? '+' : ''}{overallDelta.toFixed(1)}
          </div>
          <p className="text-xs text-muted-foreground">
            {previousRun.scores.overall} → {currentRun.scores.overall}
          </p>
        </div>
      </div>

      {/* Layer Changes */}
      <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border/50">
        {['ui_ux', 'api', 'logic', 'business_value'].map((layer) => {
          const delta = getLayerDelta(layer);
          return (
            <div key={layer} className="p-2 rounded-lg bg-background/50 border border-border/30 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                {layer.replace('_', '/')}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-foreground">
                  {currentRun.scores[layer]}
                </span>
                <span className={`text-[10px] font-bold ${
                  delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-amber-400' : 'text-muted-foreground'
                }`}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Issues Summary */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        {resolvedIssues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[10px] space-y-0.5">
              <p className="font-semibold text-emerald-400">
                {resolvedIssues.length} issue{resolvedIssues.length !== 1 ? 's' : ''} resolved
              </p>
              {resolvedIssues.slice(0, 2).map((issue, i) => (
                <p key={i} className="text-muted-foreground">✓ {issue.action}</p>
              ))}
            </div>
          </motion.div>
        )}

        {criticalDelta > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30"
          >
            <AlertCircle className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[10px] space-y-0.5">
              <p className="font-semibold text-amber-400">
                +{criticalDelta} new critical issue{criticalDelta !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        )}

        {criticalDelta < 0 && resolvedIssues.length === 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[10px] font-semibold text-emerald-400">
              {Math.abs(criticalDelta)} critical issue{Math.abs(criticalDelta) !== 1 ? 's' : ''} resolved
            </p>
          </motion.div>
        )}

        {overallDelta === 0 && resolvedIssues.length === 0 && criticalDelta >= 0 && (
          <p className="text-[10px] text-muted-foreground py-1">No changes detected.</p>
        )}
      </div>
    </motion.div>
  );
}