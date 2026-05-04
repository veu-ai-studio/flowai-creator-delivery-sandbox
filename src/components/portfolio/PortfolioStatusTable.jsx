import { Loader2, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

const STATUS_CFG = {
  pending:   { Icon: Clock,        color: 'text-muted-foreground', bg: 'bg-secondary/20',     label: 'Pending' },
  running:   { Icon: Loader2,      color: 'text-blue-400',         bg: 'bg-blue-500/10',      label: 'Running', spin: true },
  completed: { Icon: CheckCircle2, color: 'text-emerald-400',      bg: 'bg-emerald-500/10',   label: 'Done' },
  failed:    { Icon: XCircle,      color: 'text-red-400',          bg: 'bg-red-500/10',       label: 'Failed' },
};

function ImprovementBadge({ value }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const color = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-red-400' : 'text-muted-foreground';
  return <span className={`font-bold ${color}`}>{value > 0 ? '+' : ''}{value}</span>;
}

function AppRow({ app }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[app.status] || STATUS_CFG.pending;
  const Icon = cfg.Icon;
  const hasResult = app.status === 'completed' || app.status === 'failed';

  return (
    <>
      <tr className={`border-b border-border/40 transition-colors ${app.status === 'running' ? 'bg-blue-500/5' : ''}`}>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate max-w-[140px]">{app.label}</p>
              <p className="text-[9px] text-muted-foreground truncate max-w-[140px]">{app.url}</p>
            </div>
          </div>
        </td>
        <td className="px-3 py-2.5">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
        </td>
        <td className="px-3 py-2.5 text-xs text-center text-muted-foreground">
          {app.initialScore != null ? (
            <span>{app.initialScore} → <strong className="text-foreground">{app.finalScore}</strong></span>
          ) : '—'}
        </td>
        <td className="px-3 py-2.5 text-xs text-center">
          <ImprovementBadge value={app.improvement} />
        </td>
        <td className="px-3 py-2.5 text-xs text-center text-emerald-400">
          {app.userValueGained != null ? `+${app.userValueGained}` : '—'}
        </td>
        <td className="px-3 py-2.5 text-xs text-center text-blue-400">
          {app.businessValueGained != null ? `+${app.businessValueGained}` : '—'}
        </td>
        <td className="px-3 py-2.5 text-right">
          {hasResult && (
            <button onClick={() => setExpanded(e => !e)}
              className="p-1 text-muted-foreground hover:text-foreground transition">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          )}
          {app.error && <span className="text-[9px] text-red-400 truncate max-w-[80px] block">{app.error}</span>}
        </td>
      </tr>
      {expanded && hasResult && (
        <tr className="bg-secondary/10">
          <td colSpan={7} className="px-4 py-3">
            <div className="space-y-1.5 text-[10px]">
              {app.summary && <p className="text-muted-foreground italic">{app.summary}</p>}
              {app.healResults?.map((h, i) => (
                <div key={i} className={`flex items-center gap-2 ${h.accepted ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {h.accepted ? '✓' : '✗'} {h.issue}
                  {h.accepted && <span className="text-emerald-400">+{h.delta}</span>}
                  {!h.accepted && <span className="text-muted-foreground/60">({h.reason})</span>}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function PortfolioStatusTable({ apps }) {
  if (!apps.length) return null;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border">
        <p className="text-xs font-semibold text-foreground">Live Portfolio Status</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40 text-muted-foreground text-[10px] uppercase">
              <th className="px-3 py-2 text-left">App</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-center">Score</th>
              <th className="px-3 py-2 text-center">Δ</th>
              <th className="px-3 py-2 text-center">User ↑</th>
              <th className="px-3 py-2 text-center">Biz ↑</th>
              <th className="px-3 py-2 text-right">Details</th>
            </tr>
          </thead>
          <tbody>
            {apps.map((app, i) => <AppRow key={i} app={app} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}