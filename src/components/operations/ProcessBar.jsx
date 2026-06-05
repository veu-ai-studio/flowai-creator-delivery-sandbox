import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import StepToolStatusList from './StepToolStatusList';

const STEPS = [
  { key: 'research',  label: 'Research',      path: '/guided/research' },
  { key: 'design',    label: 'Design',        path: '/guided/design' },
  { key: 'build',     label: 'Build',         path: '/guided/build' },
  { key: 'qa_audit',  label: 'Quality Audit', path: '/guided/qa-audit' },
  { key: 'deploy',    label: 'Deploy',        path: '/guided/deploy' },
  { key: 'govern',    label: 'Self-Renewal',  path: '/guided/govern' },
  { key: 'gtm',       label: 'Go To Market',  path: '/guided/gtm' },
  { key: 'monitor',   label: 'Monitor',       path: '/guided/monitor' },
];

export default function ProcessBar({ session, mode = 'guided' }) {
  const location = useLocation();
  const stepStatuses = session?.step_statuses || {};

  return (
    <div className="rounded-xl border border-border bg-card p-3 mb-6">
      <div className="grid gap-2 md:grid-cols-4">
        {STEPS.map((step, i) => {
          const status = stepStatuses[step.key] || 'waiting';
          const isActive = location.pathname.includes(step.key.replace('_', '-'));
          const isComplete = status === 'complete';
          const basePath = mode === 'guided' ? '/guided' : '/manual';
          const stepPath = `${basePath}/${step.key.replace('_', '-')}`;

          return (
            <div key={step.key} className="min-w-0">
              <Link to={stepPath}
                className={`flex min-h-[6.25rem] flex-col gap-1.5 px-2.5 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : isComplete
                    ? 'text-emerald-400 hover:bg-emerald-500/5'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}>
                {isComplete
                  ? <CheckCircle2 className="h-3 w-3 shrink-0" />
                  : <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[8px] shrink-0">{i + 1}</span>
                }
                <span>{step.label}</span>
                <StepToolStatusList stepKey={step.key} compact />
              </Link>
              {i < STEPS.length - 1 && <ChevronRight className="hidden" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
