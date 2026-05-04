import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, ChevronRight, TrendingUp, DollarSign, Zap, Shield } from 'lucide-react';

function ConfidenceBar({ value }) {
  const color = value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Confidence</span><span className="font-bold text-foreground">{value}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`} />
      </div>
    </div>
  );
}

export default function DecisionPanel({ report, priority }) {
  if (!report) return null;
  const { selected_tool, selected_name, alternatives, reason, confidence, capability } = report;

  const priorityIcons = { performance: TrendingUp, cost: DollarSign, balanced: Zap };
  const PIcon = priorityIcons[priority] || Zap;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Decision Engine Result
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize border border-primary/20">
          {capability}
        </span>
      </div>

      {/* Selected Tool */}
      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-4 space-y-2">
        <p className="text-[10px] text-emerald-400 uppercase tracking-wide font-semibold">Selected Tool</p>
        <p className="text-2xl font-bold text-foreground">{selected_name || selected_tool}</p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <PIcon className="h-3 w-3" />
          <span>Optimized for <span className="text-foreground font-medium capitalize">{priority}</span></span>
        </div>
      </div>

      {/* Reason */}
      <div className="rounded-lg bg-secondary/40 border border-border p-3 space-y-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Why this tool?</p>
        <p className="text-xs text-foreground leading-relaxed">{reason}</p>
      </div>

      <ConfidenceBar value={confidence} />

      {/* Alternatives */}
      {alternatives?.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Alternatives</p>
          {alternatives.map((alt, i) => (
            <div key={alt.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-secondary/20">
              <span className="h-5 w-5 rounded-full bg-secondary text-[10px] font-bold flex items-center justify-center text-muted-foreground shrink-0">
                {i + 2}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{alt.name}</p>
                <p className="text-[10px] text-muted-foreground">{alt.reason}</p>
              </div>
              <span className="text-[10px] font-mono text-primary shrink-0">{Math.round(alt.score * 100)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}