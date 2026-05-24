import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Circle, ExternalLink, Loader2, Play, TriangleAlert } from 'lucide-react';
import {
  FLOWAI_MACRO_STEPS,
  listFlowAIRuns,
  subscribeFlowAIRuns,
} from '@/lib/flowaiRunStore';

const STEP_LABELS = {
  research: 'Research',
  design: 'Design',
  build: 'Build',
  qa_audit: 'Quality Audit',
  deploy: 'Deploy',
  self_renewal: 'Self-Renewal',
  gtm: 'GTM',
  monitor: 'Monitor',
};

function href(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function statusForStep({ run, key, index }) {
  const result = run?.stepResults?.[key];
  if (result) {
    if (result.status === 'failed') return 'failed';
    if (result.status === 'skipped' || result.status === 'degraded') return result.status;
    return 'complete';
  }
  if (run?.status === 'running' || run?.status === 'paused') {
    const completed = FLOWAI_MACRO_STEPS.filter((step) => Boolean(run.stepResults?.[step])).length;
    if (index === completed) return 'running';
  }
  return 'pending';
}

function StepCard({ run, step, index }) {
  const result = run?.stepResults?.[step];
  const status = statusForStep({ run, key: step, index });
  const statusStyle = {
    complete: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
    running: 'border-blue-500/40 bg-blue-500/10 text-blue-200',
    failed: 'border-red-500/40 bg-red-500/10 text-red-200',
    skipped: 'border-slate-600 bg-slate-900/70 text-slate-300',
    degraded: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    pending: 'border-border bg-card text-muted-foreground',
  }[status];
  const Icon = status === 'complete'
    ? CheckCircle2
    : status === 'running'
      ? Loader2
      : status === 'failed' || status === 'degraded'
        ? TriangleAlert
        : Circle;

  return (
    <section className={`min-h-36 rounded-lg border p-4 ${statusStyle}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide opacity-75">Step {index + 1}</p>
          <h2 className="mt-1 text-base font-semibold text-foreground">{STEP_LABELS[step]}</h2>
        </div>
        <Icon className={`h-5 w-5 shrink-0 ${status === 'running' ? 'animate-spin' : ''}`} />
      </div>
      <p className="mt-3 text-xs leading-relaxed">
        {result?.summary || (status === 'running' ? 'In progress' : 'Waiting for upstream evidence')}
      </p>
      {result?.tool && (
        <p className="mt-3 truncate text-[10px] text-muted-foreground">{result.tool}</p>
      )}
    </section>
  );
}

export default function Workspace() {
  const [searchParams] = useSearchParams();
  const [runs, setRuns] = useState(() => listFlowAIRuns());

  useEffect(() => subscribeFlowAIRuns(setRuns), []);

  const activeRun = useMemo(() => {
    return runs.find((run) => run.status === 'running' || run.status === 'paused') ?? runs[0] ?? null;
  }, [runs]);

  const originalUrl = searchParams.get('original') ?? activeRun?.originalUrl ?? activeRun?.productUrl ?? null;
  const upgradedUrl = searchParams.get('upgraded') ?? activeRun?.upgradedUrl ?? null;
  const completedSteps = FLOWAI_MACRO_STEPS.filter((step) => Boolean(activeRun?.stepResults?.[step])).length;

  return (
    <main className="p-8 lg:p-10 max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-primary">Workspace</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">8-step upgrade pipeline</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeRun
              ? `${activeRun.product || 'Current product'} - ${completedSteps}/8 steps`
              : 'No active run data yet.'}
          </p>
        </div>
        <Link to="/flowai" className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
          <Play className="h-4 w-4" /> New Run
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Original Product</p>
            {href(originalUrl) ? (
              <a href={href(originalUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-sm text-blue-400 hover:text-blue-300">
                {originalUrl}<ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">No original URL captured.</p>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Upgraded Version</p>
            {href(upgradedUrl) ? (
              <a href={href(upgradedUrl)} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-2 break-all text-sm text-emerald-400 hover:text-emerald-300">
                {upgradedUrl}<ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : (
              <p className="mt-1 text-sm text-amber-500">
                {activeRun?.upgradeDeployReason === 'VERCEL_PREVIEW_TOKEN_REQUIRED'
                  ? 'Upgrade deployed: No - Vercel token required.'
                  : 'Upgrade deployed: No - no upgraded URL is available yet.'}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FLOWAI_MACRO_STEPS.map((step, index) => (
          <StepCard key={step} run={activeRun} step={step} index={index} />
        ))}
      </div>
    </main>
  );
}
