// Polls /api/health every 30s and displays a status badge in the top bar.
import { useState, useEffect, useRef } from 'react';

const POLL_INTERVAL = 30_000;

export default function FlowAIHealthBadge() {
  // status: 'ok' | 'slow' | 'error' | 'loading'
  const [status, setStatus] = useState('loading');
  const timerRef = useRef(null);

  const check = async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(8000) });
      const latency = Date.now() - start;
      if (!res.ok) { setStatus('error'); return; }
      setStatus(latency > 3000 ? 'slow' : 'ok');
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
    ok:      { dot: 'bg-emerald-400 animate-pulse', text: 'text-emerald-400',  label: 'All Systems Operational' },
    slow:    { dot: 'bg-amber-400',                 text: 'text-amber-400',    label: 'Degraded Performance'     },
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