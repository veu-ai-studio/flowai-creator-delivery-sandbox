import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Play, Search, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { FLOWAI_MACRO_STEPS } from '@/lib/flowaiRunStore';
import { asArray } from '@/lib/uiDataGuards';

const STATUS_CFG = {
  queued:    { label: 'Queued',       color: 'text-slate-400',    bg: 'bg-slate-400/10',    icon: Loader2 },
  running:   { label: 'Running',      color: 'text-blue-400',     bg: 'bg-blue-400/10',     icon: Loader2 },
  completed: { label: 'Completed',    color: 'text-emerald-400',  bg: 'bg-emerald-400/10',  icon: CheckCircle2 },
  failed:    { label: 'Failed',       color: 'text-red-400',      bg: 'bg-red-400/10',      icon: XCircle },
  timed_out: { label: 'Timed out',     color: 'text-amber-400',    bg: 'bg-amber-400/10',    icon: AlertTriangle },
  stopped:   { label: 'Stopped',       color: 'text-slate-400',    bg: 'bg-slate-400/10',    icon: XCircle },
  paused:    { label: 'Paused',       color: 'text-amber-400',    bg: 'bg-amber-400/10',    icon: AlertTriangle },
  cancelling:{ label: 'Cancelling',   color: 'text-amber-400',    bg: 'bg-amber-400/10',    icon: Loader2 },
  cancelled: { label: 'Cancelled',    color: 'text-slate-400',    bg: 'bg-slate-400/10',    icon: XCircle },
  control_failed:{ label: 'Control failed', color: 'text-red-400', bg: 'bg-red-400/10', icon: AlertTriangle },
};

const VERDICT_CFG = {
  CLEARED:     { label: 'CLEARED',     color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30' },
  'NOT CLEARED':{ label: 'NOT CLEARED',color: 'text-red-400',     bg: 'bg-red-400/10',     border: 'border-red-500/30' },
  CONDITIONAL: { label: 'CONDITIONAL', color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/30' },
};

function extractVerdict(session) {
  if (session.verdict) return session.verdict;
  const stepResults = session.step_results || {};
  const monitorResult = stepResults.monitor?.full_output || '';
  const upper = monitorResult.toUpperCase();
  if (upper.includes('NOT CLEARED')) return 'NOT CLEARED';
  if (upper.includes('CONDITIONAL')) return 'CONDITIONAL';
  if (upper.includes('CLEARED')) return 'CLEARED';
  return null;
}

function mapFlowAIRun(run) {
  return {
    id: run.id,
    _type: 'flowai',
    product_name: run.product,
    product_url: run.productUrl,
    started_at: run.startTime,
    ended_at: run.endTime,
    overall_status: run.status,
    score: run.score,
    verdict: run.verdict,
    run_id: run.runId,
    branch_created: run.branchCreated,
    progress_label: run.progressLabel,
    step_results: run.stepResults || {},
    step_count: run.stepCount,
  };
}

function RunRow({ session, onClick, isExpanded, onStop, stopping }) {
  const status = session.overall_status || 'completed';
  const cfg = STATUS_CFG[status] || STATUS_CFG.completed;
  const StatusIcon = cfg.icon;
  const verdict = extractVerdict(session);
  const verdictCfg = verdict ? VERDICT_CFG[verdict] : null;
  const stepCount = Number.isFinite(session.step_count)
    ? session.step_count
    : Object.values(session.step_results || {}).filter(Boolean).length;
  const scoreLabel = typeof session.score === 'number' ? `${session.score}/100` : '-';
  const endedLabel = session.ended_at ? format(new Date(session.ended_at), 'MMM d, HH:mm') : '-';

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="border-b border-border/50 last:border-0">
      <div
        className="flex items-center gap-3 px-5 py-3.5 hover:bg-secondary/20 transition-colors cursor-pointer"
        onClick={onClick}
      >
        <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${cfg.color} ${status === 'running' ? 'animate-spin' : ''}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{session.product_name || 'Unknown'}</p>
          <p className="text-[10px] text-muted-foreground truncate max-w-[240px]">
            {session.product_url || '-'}{typeof session.score === 'number' ? ` - ${scoreLabel}` : ''}
          </p>
        </div>
        <div className="hidden sm:block text-[10px] text-muted-foreground w-28 shrink-0">
          {session.started_at ? format(new Date(session.started_at), 'MMM d, HH:mm') : '—'}
        </div>
        <div className="hidden sm:block text-[10px] text-muted-foreground w-16 text-right shrink-0">
          {stepCount}/8 steps
        </div>
        <div className="hidden md:flex items-center justify-center w-20 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${cfg.color} ${cfg.bg}`}>{cfg.label}</span>
        </div>
        <div className="w-24 text-right shrink-0">
          {verdictCfg
            ? <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold ${verdictCfg.color} ${verdictCfg.bg} ${verdictCfg.border}`}>{verdictCfg.label}</span>
            : <span className="text-[10px] text-muted-foreground">—</span>}
        </div>
        <div className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-secondary/10 border-t border-border/30">
            <div className="px-5 py-4 space-y-3">
              {session._type === 'flowai' && (
                <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {[
                    { label: 'Run ID', value: session.run_id || session.id },
                    { label: 'Ended', value: endedLabel },
                    { label: 'Score', value: scoreLabel },
                    { label: 'Branch Created', value: session.branch_created || '-' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border border-border bg-card p-2">
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.label}</p>
                      <p className="mt-0.5 truncate text-[10px] text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>
                {['queued', 'running', 'paused', 'cancelling', 'control_failed'].includes(status) && (
                  <button
                    type="button"
                    disabled={stopping || status === 'cancelling'}
                    onClick={(event) => { event.stopPropagation(); onStop(session); }}
                    className="mt-3 rounded-md border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-300 disabled:opacity-50"
                  >
                    {stopping || status === 'cancelling' ? 'Stopping…' : 'Stop run'}
                  </button>
                )}
                </>
              )}
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Step Results</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FLOWAI_MACRO_STEPS.map(key => {
                  const result = session.step_results?.[key];
                  return (
                    <div key={key} className={`rounded-lg border p-2 ${result ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-card'}`}>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{key.replace('_', ' ')}</p>
                      {result
                        ? <p className="text-[10px] text-foreground mt-0.5 line-clamp-2">{result.summary || '—'}</p>
                        : <p className="text-[10px] text-muted-foreground/50 mt-0.5">Not run</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function RunsHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [stoppingId, setStoppingId] = useState(null);

  const stopRun = async (session) => {
    const runId = session?.run_id || session?.id;
    if (!runId || stoppingId) return;
    setStoppingId(runId);
    setHistoryError('');
    try {
      const response = await fetch('/api/agent/3/control', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, command: 'stop' }),
      });
      if (!response.ok) throw new Error(`Stop unavailable (${response.status})`);
    } catch (error) {
      setHistoryError(error?.message || 'Unable to stop run.');
    } finally {
      setStoppingId(null);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/runs', { credentials: 'same-origin' });
        if (!response.ok) throw new Error(`History unavailable (${response.status})`);
        const payload = await response.json();
        const flowai = asArray(payload.runs).map(run => mapFlowAIRun({
          id: run.id, runId: run.id, product: run.product, productUrl: run.url,
          startTime: run.startedAt || run.createdAt, endTime: run.completedAt,
          status: run.status, progressLabel: run.progressLabel,
        }));
        if (cancelled) return;
        setSessions(flowai);
        setHistoryError('');
      } catch (error) {
        if (!cancelled) setHistoryError(error?.message || 'Run history is unavailable.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const refresh = window.setInterval(load, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(refresh);
    };
  }, []);

  const safeSessions = asArray(sessions);
  const filtered = safeSessions.filter(s => {
    const matchSearch = !search.trim() ||
      (s.product_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.product_url || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.overall_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: safeSessions.length,
    running: safeSessions.filter(s => ['queued', 'running', 'paused', 'cancelling'].includes(s.overall_status)).length,
    completed: safeSessions.filter(s => s.overall_status === 'completed').length,
    failed: safeSessions.filter(s => s.overall_status === 'failed').length,
    timedOut: safeSessions.filter(s => s.overall_status === 'timed_out').length,
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Play className="h-7 w-7 text-primary" /> Pipeline Run History
        </h1>
        <p className="text-sm text-muted-foreground mt-1">All 8-step pipeline runs across all products</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Runs', value: stats.total, color: 'text-foreground' },
          { label: 'Running', value: stats.running, color: 'text-blue-400' },
          { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
          { label: 'Failed', value: stats.failed, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by product or URL…"
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Statuses</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="timed_out">Timed out</option>
          <option value="stopped">Stopped</option>
          <option value="paused">Paused</option>
          <option value="cancelling">Cancelling</option>
          <option value="cancelled">Cancelled</option>
          <option value="control_failed">Control failed</option>
        </select>
      </div>

      {historyError && <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{historyError}</div>}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border bg-secondary/20 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
          <div className="w-3.5 shrink-0" />
          <div className="flex-1">Product</div>
          <div className="hidden sm:block w-28 shrink-0">Started</div>
          <div className="hidden sm:block w-16 text-right shrink-0">Progress</div>
          <div className="hidden md:block w-20 text-center shrink-0">Status</div>
          <div className="w-24 text-right shrink-0">Verdict</div>
          <div className="w-8 shrink-0" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Play className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No runs found</p>
            <p className="text-xs text-muted-foreground/60">Start a FlowAI run from New Run.</p>
            <Button size="sm" onClick={() => navigate('/flowai')} className="gap-1.5 mt-1">
              <Zap className="h-3.5 w-3.5" /> Start New Run
            </Button>
          </div>
        ) : (
          filtered.map(s => (
            <RunRow
              key={s.id}
              session={s}
              isExpanded={expandedId === s.id}
              stopping={stoppingId === (s.run_id || s.id)}
              onStop={stopRun}
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
