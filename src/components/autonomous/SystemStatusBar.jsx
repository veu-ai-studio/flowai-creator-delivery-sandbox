import { Shield, CheckCircle2, AlertTriangle, Wrench, TrendingUp, ArrowUpCircle, XCircle, Loader2 } from 'lucide-react';

const STATUS_MAP = {
  healthy:         { label: 'Healthy',         color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', Icon: CheckCircle2 },
  issues_detected: { label: 'Issues Detected', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   Icon: AlertTriangle },
  healing:         { label: 'Healing',          color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    Icon: Wrench, spin: true },
  optimizing:      { label: 'Optimizing',       color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/30',  Icon: TrendingUp },
  upgrading:       { label: 'Upgrading',        color: 'text-primary',     bg: 'bg-primary/10',     border: 'border-primary/30',     Icon: ArrowUpCircle },
  failed:          { label: 'Failed',           color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     Icon: XCircle },
  running:         { label: 'Running',          color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    Icon: Loader2, spin: true },
};

export default function SystemStatusBar({ status, healthScore, issueCount, lastScan, costUsd, tokensUsed }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.issues_detected;
  const Icon = cfg.Icon;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 flex flex-wrap items-center gap-4`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-5 w-5 ${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
        <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
      </div>

      <div className="flex flex-wrap gap-4 ml-auto text-[11px] text-muted-foreground">
        {healthScore != null && (
          <span>Health: <strong className={cfg.color}>{healthScore}/100</strong></span>
        )}
        {issueCount != null && (
          <span>Issues: <strong className="text-foreground">{issueCount}</strong></span>
        )}
        {lastScan && (
          <span>Last scan: <strong className="text-foreground">{lastScan}</strong></span>
        )}
        {tokensUsed != null && (
          <span>Tokens: <strong className="text-foreground">{tokensUsed.toLocaleString()}</strong></span>
        )}
        {costUsd != null && (
          <span>Cost: <strong className="text-emerald-400">${costUsd.toFixed(5)}</strong></span>
        )}
      </div>
    </div>
  );
}