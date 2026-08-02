// Polls /api/health every 30s and displays a status badge in the top bar.
import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL = 30_000;

export function classifyHealthResponse({ responseOk, body, latency }) {
  if (!responseOk || !body || body.ok !== true) return 'error';
  const reportedStatuses = [];
  const visit = (value) => {
    if (!value || typeof value !== 'object') return;
    if (typeof value.status === 'string') reportedStatuses.push(value.status);
    for (const nested of Object.values(value)) visit(nested);
  };
  visit(body.checks || {});
  const hasLimitedSubsystem = reportedStatuses.some((status) => status !== 'PASS');
  if (body.status !== 'ready' || hasLimitedSubsystem || latency > 3000) return 'slow';
  return 'ok';
}

export default function FlowAIHealthBadge() {
  // status: 'ok' | 'slow' | 'error' | 'loading'
  const [status, setStatus] = useState('loading');
  const timerRef = useRef(null);

  const check = async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
      const latency = Date.now() - start;
      const body = await res.json().catch(() => null);
      setStatus(classifyHealthResponse({ responseOk: res.ok, body, latency }));
    } catch {
      setStatus('error');
    }
  };

  useEffect(() => {
    check();
    timerRef.current = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, []);

  const cfg = {
    ok:      { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400',  label: 'All Reported Systems Operational' },
    slow:    { dot: 'bg-amber-400',                 text: 'text-amber-400',    label: 'Limited or Degraded Systems'       },
    error:   { dot: 'bg-red-400',                   text: 'text-red-400',      label: 'Service Error'            },
    loading: { dot: 'bg-muted-foreground/40',       text: 'text-muted-foreground', label: 'Checking…'           },
  }[status];

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-semibold shrink-0" title="FlowAI Health">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      <span className={`hidden sm:inline ${cfg.text}`}>{cfg.label}</span>
    </div>
  );
}
