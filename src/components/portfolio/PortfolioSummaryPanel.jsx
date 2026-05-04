import { TrendingUp, Users, Briefcase, BarChart3, Trophy, AlertTriangle } from 'lucide-react';

export default function PortfolioSummaryPanel({ apps }) {
  const completed = apps.filter(a => a.status === 'completed');
  const failed = apps.filter(a => a.status === 'failed');

  if (!completed.length && !failed.length) return null;

  const avgImprovement = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.improvement || 0), 0) / completed.length)
    : 0;
  const totalUserValue = completed.reduce((s, a) => s + (a.userValueGained || 0), 0);
  const totalBizValue = completed.reduce((s, a) => s + (a.businessValueGained || 0), 0);
  const topApp = completed.sort((a, b) => (b.improvement || 0) - (a.improvement || 0))[0];
  const underperforming = completed.filter(a => (a.improvement || 0) <= 0);

  const metrics = [
    { label: 'Total Apps', value: apps.length, Icon: BarChart3, color: 'text-primary' },
    { label: 'Completed', value: completed.length, Icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Avg Improvement', value: avgImprovement > 0 ? `+${avgImprovement}` : avgImprovement, Icon: TrendingUp, color: avgImprovement > 0 ? 'text-emerald-400' : 'text-muted-foreground' },
    { label: 'Total User Value', value: `+${totalUserValue}`, Icon: Users, color: 'text-emerald-400' },
    { label: 'Total Biz Value', value: `+${totalBizValue}`, Icon: Briefcase, color: 'text-blue-400' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <p className="text-xs font-semibold text-foreground">Portfolio Summary</p>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {metrics.map(({ label, value, Icon, color }) => (
          <div key={label} className="p-3 rounded-lg bg-secondary/20 border border-border/30 text-center space-y-1">
            <Icon className={`h-4 w-4 mx-auto ${color}`} />
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {topApp && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2">
            <Trophy className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-emerald-400">Top Performing</p>
              <p className="text-xs text-foreground font-semibold">{topApp.label}</p>
              <p className="text-[10px] text-muted-foreground">+{topApp.improvement} score improvement</p>
            </div>
          </div>
        )}
        {underperforming.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-amber-400">Underperforming ({underperforming.length})</p>
              {underperforming.slice(0, 2).map((a, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">{a.label}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}