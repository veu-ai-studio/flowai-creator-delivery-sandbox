import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listActiveFlowAIRuns, subscribeFlowAIRuns } from '@/lib/flowaiRunStore';

export default function ActiveRunIndicator() {
  const [runs, setRuns] = useState(() => listActiveFlowAIRuns());
  const [open, setOpen] = useState(false);
  const safeRuns = Array.isArray(runs) ? runs.filter((run) => run && typeof run === 'object') : [];

  useEffect(() => subscribeFlowAIRuns(() => setRuns(listActiveFlowAIRuns())), []);

  const label = useMemo(() => `${safeRuns.length} Running`, [safeRuns.length]);
  if (safeRuns.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/15"
        title="Show active FlowAI runs"
      >
        <span aria-hidden="true">🟢</span>
        {label}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-md border border-border bg-popover p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground">Active FlowAI Runs</p>
            <Link to="/runs" className="text-[10px] font-semibold text-primary hover:underline" onClick={() => setOpen(false)}>
              View history
            </Link>
          </div>
          <div className="space-y-2">
            {safeRuns.map((run) => (
              <div key={run.id} className="rounded border border-border bg-background/80 px-2 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-foreground">{run.product}</p>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-300">
                    {run.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{run.productUrl ?? run.runId ?? run.id}</p>
                <p className="mt-1 truncate text-[10px] text-muted-foreground">{run.progressLabel}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
