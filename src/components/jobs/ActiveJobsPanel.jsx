import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJobs } from '@/lib/JobContext';
import {
  Loader2, ChevronDown, ChevronUp,
  X, Trash2, Zap, Sparkles, Shield
} from 'lucide-react';

const TYPE_ICON = {
  autopilot:        Zap,
  external_upgrade: Sparkles,
  autonomous:       Shield,
};

const STATUS_CFG = {
  pending:   { color: 'text-muted-foreground', bg: 'bg-muted/30',         label: 'Pending' },
  running:   { color: 'text-blue-400',         bg: 'bg-blue-500/10',      label: 'Running', spin: true },
  completed: { color: 'text-emerald-400',      bg: 'bg-emerald-500/10',   label: 'Done' },
  failed:    { color: 'text-red-400',          bg: 'bg-red-500/10',       label: 'Failed' },
};

function JobRow({ job, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CFG[job.status] || STATUS_CFG.pending;
  const Icon = TYPE_ICON[job.type] || Zap;
  const hasResult = job.status === 'completed' && job.result;
  const resultApps = Array.isArray(job.result?.apps) ? job.result.apps : [];
  const elapsed = job.completedAt
    ? `${Math.round((new Date(job.completedAt) - new Date(job.startedAt)) / 1000)}s`
    : job.status === 'running' ? 'Running…' : '';

  return (
    <div className={`rounded-lg border border-border p-3 space-y-2 ${cfg.bg}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-3.5 w-3.5 shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{job.label}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[9px] font-bold uppercase ${cfg.color}`}>
              {cfg.spin && <Loader2 className="inline h-2.5 w-2.5 animate-spin mr-0.5" />}
              {cfg.label}
            </span>
            {job.meta?.currentApp && (
              <span className="text-[9px] text-muted-foreground truncate">— {job.meta.currentApp}</span>
            )}
            {elapsed && <span className="text-[9px] text-muted-foreground ml-auto">{elapsed}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {hasResult && (
            <button onClick={() => setExpanded(e => !e)} className="p-1 text-muted-foreground hover:text-foreground transition">
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
          {(job.status === 'completed' || job.status === 'failed') && (
            <button onClick={() => onRemove(job.id)} className="p-1 text-muted-foreground hover:text-red-400 transition">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {(job.status === 'running' || job.status === 'pending') && (
        <div className="w-full h-1 rounded-full bg-secondary/50 overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${job.progress || 0}%` }}
          />
        </div>
      )}

      {/* Error */}
      {job.status === 'failed' && job.error && (
        <p className="text-[10px] text-red-400 font-mono">{job.error}</p>
      )}

      {/* Result preview */}
      {expanded && hasResult && (
        <div className="pt-2 border-t border-border/50 space-y-1 text-[10px]">
          {job.type === 'autopilot' && job.result?.summary && (
            <div className="space-y-1">
              <p className="text-emerald-400 font-bold">
                {job.result.summary.passed}/{job.result.summary.total} Apps Passed
              </p>
              {resultApps.map((a, i) => (
                <p key={i} className={a.passed ? 'text-emerald-400' : 'text-red-400'}>
                  {a.passed ? '✓' : '✗'} {a.appName} {a.passed && a.finalUrl ? `— ${a.finalUrl}` : a.error || ''}
                </p>
              ))}
              <p className="text-muted-foreground mt-1">
                Total cost: ${job.result.costs?.totalCostUsd?.toFixed(5)} · {job.result.costs?.totalTokens?.toLocaleString()} tokens
              </p>
            </div>
          )}
          {job.type === 'autonomous' && job.result && (
            <div className="space-y-1">
              <p className="text-foreground font-bold">Health Score: {job.result.health_score}/100</p>
              <p className="text-muted-foreground">{job.result.summary}</p>
              <p className="text-muted-foreground">{job.result.all_issues?.length || 0} issues · {job.result.fixes_generated?.length || 0} fixes</p>
            </div>
          )}
          {job.type === 'external_upgrade' && job.result && (
            <div className="space-y-1">
              <p className="text-foreground font-bold">
                Score: {job.result.originalAudit?.overall_score} → {job.result.improvedAudit?.overall_score}
              </p>
              {job.result.improvedUrl && (
                <a href={job.result.improvedUrl} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline break-all font-mono">
                  {job.result.improvedUrl}
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ActiveJobsPanel() {
  const { jobs, removeJob, clearCompleted } = useJobs();
  const [open, setOpen] = useState(true);
  const safeJobs = Array.isArray(jobs) ? jobs.filter((job) => job && typeof job === 'object') : [];

  const runningJobs = safeJobs.filter(j => j.status === 'running' || j.status === 'pending');
  const doneJobs = safeJobs.filter(j => j.status === 'completed' || j.status === 'failed');
  const total = safeJobs.length;

  if (total === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 w-80 shadow-2xl"
    >
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 bg-secondary/30 hover:bg-secondary/50 transition"
        >
          <div className="flex items-center gap-2">
            {runningJobs.length > 0 && (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            )}
            <span className="text-xs font-bold text-foreground">
              Active Jobs
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
              {total}
            </span>
            {runningJobs.length > 0 && (
              <span className="text-[9px] text-blue-400">{runningJobs.length} running</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {doneJobs.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); clearCompleted(); }}
                onKeyDown={(e) => e.key === 'Enter' && clearCompleted()}
                className="text-[9px] text-muted-foreground hover:text-red-400 transition flex items-center gap-0.5 cursor-pointer"
              >
                <Trash2 className="h-3 w-3" /> Clear done
              </span>
            )}
            {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
          </div>
        </button>

        {/* Job list */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                {safeJobs.map(job => (
                  <JobRow key={job.id} job={job} onRemove={removeJob} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
