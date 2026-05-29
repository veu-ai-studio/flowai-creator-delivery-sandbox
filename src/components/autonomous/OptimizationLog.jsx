import { TrendingUp } from 'lucide-react';

const CAT_COLOR = {
  cost: 'text-emerald-400', performance: 'text-blue-400',
  ux: 'text-purple-400', reliability: 'text-amber-400',
};
const PRI_BG = {
  high: 'bg-red-500/20 text-red-400',
  medium: 'bg-amber-500/20 text-amber-400',
  low: 'bg-blue-500/20 text-blue-400',
};

function OptRow({ opt }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <TrendingUp className={`h-4 w-4 shrink-0 mt-0.5 ${CAT_COLOR[opt.category] || 'text-primary'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{opt.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${PRI_BG[opt.priority] || 'bg-secondary/60 text-muted-foreground'}`}>{opt.priority}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground capitalize">{opt.category}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{opt.description}</p>
        </div>
      </div>

      {(opt.before_metric || opt.after_metric) && (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="p-2 rounded bg-secondary/40 border border-border/30">
            <p className="text-muted-foreground font-semibold mb-0.5">Before</p>
            <p className="text-foreground">{opt.before_metric}</p>
          </div>
          <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-emerald-400 font-semibold mb-0.5">After</p>
            <p className="text-foreground">{opt.after_metric}</p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 text-[10px]">
        {opt.improvement_pct != null && (
          <span className={`font-bold ${opt.improvement_pct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {opt.improvement_pct >= 0 ? '↑' : '↓'} {Math.abs(opt.improvement_pct)}%
          </span>
        )}
        {opt.estimated_savings && (
          <span className="text-emerald-400 font-semibold">{opt.estimated_savings}</span>
        )}
        {opt.implementation && (
          <span className="text-muted-foreground/70 italic truncate">{opt.implementation}</span>
        )}
      </div>
    </div>
  );
}

export default function OptimizationLog({ optimizations, currentMetrics, projectedMetrics, totalSavings, timestamp }) {
  if (!optimizations?.length) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No optimizations yet — run Optimize or Full Cycle</div>;
  }

  return (
    <div className="space-y-4">
      {/* Metrics summary */}
      {currentMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px]">
          {Object.entries(currentMetrics).map(([k, v]) => (
            <div key={k} className="p-2 rounded border border-border bg-secondary/20">
              <p className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</p>
              <p className="font-bold text-foreground">{typeof v === 'number' && k.includes('cost') ? `$${v.toFixed(5)}` : String(v)}</p>
            </div>
          ))}
        </div>
      )}
      {totalSavings && (
        <p className="text-xs text-emerald-400 font-bold">Total estimated savings: {totalSavings}</p>
      )}
      <div className="space-y-2">
        {optimizations.map((opt, i) => <OptRow key={opt.id || i} opt={opt} />)}
      </div>
      {timestamp && <p className="text-[9px] text-muted-foreground/50">Generated: {new Date(timestamp).toLocaleString()}</p>}
    </div>
  );
}