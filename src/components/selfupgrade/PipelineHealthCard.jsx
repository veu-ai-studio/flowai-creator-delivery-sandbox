import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';

function StatBlock({ label, value, sub, trend, color }) {
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 5 ? 'text-red-400' : trend < -5 ? 'text-emerald-400' : 'text-muted-foreground';
  return (
    <div className="rounded-lg bg-secondary/30 border border-border/50 p-4 space-y-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      {trend !== undefined && (
        <p className={`text-[10px] flex items-center gap-1 ${trendColor}`}>
          <TrendIcon className="h-3 w-3" />
          {trend > 0 ? '+' : ''}{trend}% vs older runs
        </p>
      )}
    </div>
  );
}

export default function PipelineHealthCard({ stats }) {
  if (!stats) return null;
  const srColor = stats.overall_success_rate >= 80 ? 'text-emerald-400' : stats.overall_success_rate >= 60 ? 'text-amber-400' : 'text-red-400';
  const depColor = stats.deployment_success_rate >= 80 ? 'text-emerald-400' : 'text-amber-400';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        Pipeline Health Overview
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBlock label="Overall Success" value={`${stats.overall_success_rate}%`} sub={`${stats.total_metric_records} total ops`} color={srColor} />
        <StatBlock label="Deploy Success" value={`${stats.deployment_success_rate}%`} color={depColor} />
        <StatBlock label="Avg Latency" value={`${(stats.recent_avg_latency_ms / 1000).toFixed(1)}s`} trend={stats.latency_trend_pct} />
        <StatBlock label="Total Ops" value={stats.total_metric_records} sub="tool invocations recorded" />
      </div>
    </motion.div>
  );
}