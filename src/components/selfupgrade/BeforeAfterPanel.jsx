import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, GitCompare, CheckCircle2, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function DeltaBadge({ value, unit = '%', higherIsBetter = true }) {
  const improved = higherIsBetter ? value > 0 : value < 0;
  const neutral = value === 0;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = neutral ? 'text-muted-foreground' : improved ? 'text-emerald-400' : 'text-red-400';
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {value > 0 ? '+' : ''}{value}{unit}
    </span>
  );
}

function MetricCompare({ label, before, after, unit = '%', higherIsBetter = true }) {
  const delta = after - before;
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 space-y-2">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">{label}</p>
      <div className="flex items-end gap-3">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Before</p>
          <p className="text-xl font-bold text-muted-foreground font-mono">{before}{unit}</p>
        </div>
        <div className="text-muted-foreground/40 text-lg pb-0.5">→</div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground mb-1">After</p>
          <p className="text-xl font-bold text-foreground font-mono">{after}{unit}</p>
        </div>
        <div className="ml-auto pb-0.5">
          <DeltaBadge value={delta} unit={unit} higherIsBetter={higherIsBetter} />
        </div>
      </div>
    </div>
  );
}

export default function BeforeAfterPanel({ beforeAfter }) {
  if (!beforeAfter) return null;

  const { before, after, delta, applied_improvements, improvement_applied_at } = beforeAfter;
  const overallImproved = delta.improved;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-5 space-y-4 ${overallImproved ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-primary" />
          Before vs After Improvement
        </h3>
        <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${
          overallImproved
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        }`}>
          {overallImproved ? <CheckCircle2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {overallImproved ? 'Measurable Improvement' : 'Monitoring Impact'}
        </div>
      </div>

      {/* Applied improvements list */}
      {applied_improvements?.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Applied Changes</p>
          {applied_improvements.map((imp, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-foreground">{imp.title}</span>
              <span className="text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                {imp.applied_at ? formatDistanceToNow(new Date(imp.applied_at), { addSuffix: true }) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Metric comparison grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCompare
          label="Pipeline Success Rate"
          before={before.success_rate}
          after={after.success_rate}
          unit="%"
          higherIsBetter={true}
        />
        <MetricCompare
          label="Avg Latency"
          before={Math.round(before.avg_latency_ms / 1000)}
          after={Math.round(after.avg_latency_ms / 1000)}
          unit="s"
          higherIsBetter={false}
        />
      </div>

      {/* Sample size note */}
      <p className="text-[10px] text-muted-foreground">
        Based on {before.total_ops} pre-improvement ops vs {after.total_ops} post-improvement ops.
        {after.total_ops < 5 && ' Limited post-improvement data — run more pipelines to confirm trend.'}
      </p>
    </motion.div>
  );
}