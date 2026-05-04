// Per-product step progress timeline
import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

const STEP_LABELS = ['Governance', 'Readiness', 'White-Label', 'Data Export', 'Demo', 'Sign-Off'];

function StepNode({ label, status, isLast }) {
  const cfg = {
    passed:      { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', lineColor: 'bg-emerald-500' },
    in_progress: { icon: Loader2,      color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    lineColor: 'bg-blue-500/40' },
    failed:      { icon: AlertCircle,  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/40',     lineColor: 'bg-border' },
    pending:     { icon: Clock,        color: 'text-muted-foreground', bg: 'bg-secondary/30', border: 'border-border',       lineColor: 'bg-border' },
  }[status] || { icon: Clock, color: 'text-muted-foreground', bg: 'bg-secondary/30', border: 'border-border', lineColor: 'bg-border' };

  const Icon = cfg.icon;

  return (
    <div className="flex items-center gap-0">
      <div className="flex flex-col items-center">
        <div className={`h-6 w-6 rounded-full border ${cfg.border} ${cfg.bg} flex items-center justify-center shrink-0`}>
          <Icon className={`h-3 w-3 ${cfg.color} ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        </div>
        <span className="text-[9px] text-muted-foreground mt-1 text-center w-14 leading-tight">{label}</span>
      </div>
      {!isLast && <div className={`h-0.5 w-6 ${cfg.lineColor} mb-4 shrink-0`} />}
    </div>
  );
}

export default function ClearanceProgressTimeline({ record }) {
  if (!record) {
    return (
      <div className="flex items-center gap-0 mt-2 mb-1">
        {STEP_LABELS.map((label, i) => (
          <StepNode key={i} label={label} status="pending" isLast={i === STEP_LABELS.length - 1} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0 mt-2 mb-1">
      {STEP_LABELS.map((label, i) => {
        const status = record[`step${i + 1}_status`] || 'pending';
        return (
          <StepNode key={i} label={label} status={status} isLast={i === STEP_LABELS.length - 1} />
        );
      })}
    </div>
  );
}