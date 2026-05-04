import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function RunHistoryPanel({ runHistory }) {
  if (!runHistory || runHistory.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-4 text-center"
      >
        <p className="text-xs text-muted-foreground">No runs yet. Start an audit to begin tracking.</p>
      </motion.div>
    );
  }

  const getScoreTrend = (current, previous) => {
    if (!previous) return null;
    const delta = current - previous;
    return {
      value: delta,
      isImprovement: delta > 0,
      color: delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-amber-400' : 'text-muted-foreground',
      icon: delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : null,
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Run History ({runHistory.length})
      </h3>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        <AnimatePresence>
          {runHistory.map((run, idx) => {
            const prevRun = idx > 0 ? runHistory[idx - 1] : null;
            const trend = getScoreTrend(run.scores.overall, prevRun?.scores.overall);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="p-3 rounded-lg border border-border/50 bg-secondary/30 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-mono text-primary">Run #{runHistory.length - idx}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(run.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-sm font-bold ${
                        run.scores.overall >= 7 ? 'text-emerald-400' :
                        run.scores.overall >= 5 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {run.scores.overall}/10
                      </span>
                      {trend && trend.icon && (
                        <trend.icon className={`h-3 w-3 ${trend.color}`} />
                      )}
                    </div>
                    {trend && (
                      <p className={`text-[10px] font-semibold ${trend.color}`}>
                        {trend.value > 0 ? '+' : ''}{trend.value.toFixed(1)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-[10px]">
                  <div className="p-1.5 rounded bg-background/50 text-center">
                    <p className="text-muted-foreground">UI/UX</p>
                    <p className="font-semibold text-foreground">{run.scores.ui_ux}</p>
                  </div>
                  <div className="p-1.5 rounded bg-background/50 text-center">
                    <p className="text-muted-foreground">API</p>
                    <p className="font-semibold text-foreground">{run.scores.api}</p>
                  </div>
                  <div className="p-1.5 rounded bg-background/50 text-center">
                    <p className="text-muted-foreground">Logic</p>
                    <p className="font-semibold text-foreground">{run.scores.logic}</p>
                  </div>
                  <div className="p-1.5 rounded bg-background/50 text-center">
                    <p className="text-muted-foreground">BV</p>
                    <p className="font-semibold text-foreground">{run.scores.business_value}</p>
                  </div>
                </div>

                {/* Issues summary */}
                {run.recommendations && run.recommendations.length > 0 && (
                  <div className="flex items-center gap-2 text-[10px] pt-1 border-t border-border/30">
                    <AlertTriangle className="h-3 w-3 text-amber-400" />
                    <span className="text-muted-foreground">
                      {run.recommendations.filter(r => r.priority === 'critical').length} critical
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}