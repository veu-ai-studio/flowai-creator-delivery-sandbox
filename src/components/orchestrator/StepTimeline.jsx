import { CheckCircle2, Loader2, Circle, XCircle } from 'lucide-react';

const STEPS = [
  { id: 'analyze',  label: 'Analyze',   desc: 'Extract structure & gaps' },
  { id: 'plan',     label: 'Plan',       desc: 'System blueprint' },
  { id: 'build',    label: 'Build',      desc: 'Replit + Base44' },
  { id: 'test',     label: 'Test',       desc: 'Functional validation' },
  { id: 'audit',    label: 'Audit',      desc: 'Readiness classification' },
  { id: 'optimize', label: 'Optimize',   desc: 'Fix critical issues' },
  { id: 'upgrade',  label: 'Upgrade',    desc: 'Enhance capabilities' },
  { id: 'deploy',   label: 'Deploy',     desc: 'Vercel production' },
  { id: 'mobile',   label: 'Mobile',     desc: 'PWA + native strategy' },
  { id: 'appstore', label: 'App Store',  desc: 'Store submission prep' },
  { id: 'output',   label: 'Output',     desc: 'Final report' },
];

const STATUS_CFG = {
  idle:    { Icon: Circle,       color: 'text-muted-foreground/30', dot: 'bg-muted-foreground/20' },
  running: { Icon: Loader2,      color: 'text-blue-400',            dot: 'bg-blue-400', spin: true },
  done:    { Icon: CheckCircle2, color: 'text-emerald-400',         dot: 'bg-emerald-400' },
  failed:  { Icon: XCircle,      color: 'text-red-400',             dot: 'bg-red-400' },
  skipped: { Icon: Circle,       color: 'text-muted-foreground/40', dot: 'bg-muted-foreground/20' },
};

export default function StepTimeline({ stepStatuses }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-3">Pipeline Progress</p>
      <div className="space-y-2">
        {STEPS.map(({ id, label, desc }, i) => {
          const status = stepStatuses?.[id] || 'idle';
          const cfg = STATUS_CFG[status] || STATUS_CFG.idle;
          const Icon = cfg.Icon;
          return (
            <div key={id} className="flex items-center gap-3">
              {/* Connector line */}
              <div className="flex flex-col items-center">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${status !== 'idle' ? cfg.dot + '/20' : ''}`}>
                  <Icon className={`h-3.5 w-3.5 ${cfg.color} ${cfg.spin ? 'animate-spin' : ''}`} />
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-px h-3 mt-0.5 ${status === 'done' ? 'bg-emerald-400/40' : 'bg-border'}`} />
                )}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${status === 'running' ? 'text-blue-400' : status === 'done' ? 'text-emerald-400' : status === 'failed' ? 'text-red-400' : 'text-muted-foreground'}`}>
                    {label}
                  </span>
                  {status === 'running' && (
                    <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-bold animate-pulse">RUNNING</span>
                  )}
                  {status === 'done' && (
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">DONE</span>
                  )}
                  {status === 'failed' && (
                    <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold">FAILED</span>
                  )}
                </div>
                <p className="text-[9px] text-muted-foreground/60">{desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { STEPS };