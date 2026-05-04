import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, GitCompare } from 'lucide-react';

function DeltaBadge({ value, higherIsBetter = true }) {
  const improved = higherIsBetter ? value > 0 : value < 0;
  const neutral = value === 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = neutral ? 'text-muted-foreground' : improved ? 'text-emerald-400' : 'text-amber-400';

  return (
    <span className={`flex items-center gap-0.5 text-xs font-bold ${color}`}>
      <Icon className="h-3 w-3" />
      {value > 0 ? '+' : ''}{value}
    </span>
  );
}

export default function BeforeAfterComparison({ original, improved }) {
  const scoreDelta = improved.overall_score - original.overall_score;
  const originalIssueCount = Object.values(original.issues || {}).flat().length;
  const improvedIssueCount = Object.values(improved.issues || {}).flat().length;
  const issueDelta = improvedIssueCount - originalIssueCount;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <GitCompare className="h-4 w-4 text-primary" />
        Before vs After Comparison
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Audit Score */}
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Audit Score</p>
          <div className="flex items-end gap-3">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Before</p>
              <p className="text-2xl font-bold text-amber-400">{original.overall_score}</p>
            </div>
            <div className="text-muted-foreground/40">→</div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">After</p>
              <p className="text-2xl font-bold text-emerald-400">{improved.overall_score}</p>
            </div>
            <div className="ml-auto">
              <DeltaBadge value={scoreDelta} higherIsBetter={true} />
            </div>
          </div>
        </div>

        {/* Issues Found */}
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 space-y-2">
          <p className="text-xs font-semibold text-foreground">Issues Found</p>
          <div className="flex items-end gap-3">
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">Before</p>
              <p className="text-2xl font-bold text-red-400">{originalIssueCount}</p>
            </div>
            <div className="text-muted-foreground/40">→</div>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground mb-1">After</p>
              <p className={`text-2xl font-bold ${improvedIssueCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {improvedIssueCount}
              </p>
            </div>
            <div className="ml-auto">
              <DeltaBadge value={-issueDelta} higherIsBetter={true} />
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      {scoreDelta >= 0 ? (
        <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
          <p className="text-xs text-emerald-400 font-semibold">
            ✓ Improvement Confirmed
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Score improved by <span className="text-emerald-400 font-bold">{scoreDelta} points</span>.
            {originalIssueCount - improvedIssueCount > 0
              ? ` Resolved ${originalIssueCount - improvedIssueCount} issue${originalIssueCount - improvedIssueCount === 1 ? '' : 's'}.`
              : ` ${improvedIssueCount} issue${improvedIssueCount === 1 ? '' : 's'} remain.`}
          </p>
        </div>
      ) : (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
          <p className="text-xs text-amber-400 font-semibold">
            ⚠ Fix Cycle Triggered
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">
            Score decreased by <span className="text-amber-400 font-bold">{Math.abs(scoreDelta)} points</span>.
            System will automatically regenerate and retry until improvement is achieved.
          </p>
        </div>
      )}
    </motion.div>
  );
}