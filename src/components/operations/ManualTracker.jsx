import { CheckCircle2, Clock, Circle, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STEPS = [
  { key: 'research',  label: 'Research' },
  { key: 'design',    label: 'Design' },
  { key: 'build',     label: 'Build' },
  { key: 'qa_audit',  label: 'Quality Audit' },
  { key: 'deploy',    label: 'Deploy' },
  { key: 'govern',    label: 'Govern' },
  { key: 'gtm',       label: 'Go To Market' },
  { key: 'monitor',   label: 'Monitor' },
];

export default function ManualTracker({ session, currentStepKey, onMarkComplete, onMarkInProgress }) {
  const stepStatuses = session?.step_statuses || {};
  const stepStartedAt = session?.step_started_at || {};
  const stepCompletedAt = session?.step_completed_at || {};

  const completedCount = STEPS.filter(s => stepStatuses[s.key] === 'complete').length;
  const startedAt = session?.started_at ? new Date(session.started_at) : null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 mb-6 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Progress — Manual Operations</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{completedCount}/{STEPS.length} complete</span>
          {startedAt && (
            <span className="text-[10px] text-muted-foreground/60">Started {formatDistanceToNow(startedAt, { addSuffix: true })}</span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-border overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
      </div>

      {/* Step pills */}
      <div className="flex flex-wrap gap-1.5">
        {STEPS.map((step, i) => {
          const status = stepStatuses[step.key] || 'not_started';
          const isCurrent = step.key === currentStepKey;
          const completedAt = stepCompletedAt[step.key];
          const startedAtStep = stepStartedAt[step.key];

          return (
            <div key={step.key}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all ${
                status === 'complete'
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                  : isCurrent || status === 'in_progress'
                  ? 'border-primary/40 bg-primary/5 text-primary'
                  : 'border-border text-muted-foreground'
              }`}>
              {status === 'complete'
                ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                : isCurrent || status === 'in_progress'
                ? <Play className="h-2.5 w-2.5 shrink-0" />
                : <Circle className="h-2.5 w-2.5 shrink-0" />
              }
              {step.label}
              {completedAt && (
                <span className="text-[9px] opacity-60">{new Date(completedAt).toLocaleDateString('en-US', { weekday: 'short' })}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}