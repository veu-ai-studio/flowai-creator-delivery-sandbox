import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Globe, ExternalLink, Clock } from 'lucide-react';
import { safeStr } from '@/lib/safeStr';

const SYSTEM_COLORS = {
  'ChatGPT':           'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  'ChatGPT (skipped)': 'text-muted-foreground bg-secondary/30 border-border',
  'Claude':            'text-blue-400 bg-blue-500/10 border-blue-500/30',
  'Base44/Claude':     'text-purple-400 bg-purple-500/10 border-purple-500/30',
  'Replit':            'text-orange-400 bg-orange-500/10 border-orange-500/30',
  'Replit (simulated)':'text-orange-300 bg-orange-500/10 border-orange-500/20',
  'Vercel':            'text-sky-400 bg-sky-500/10 border-sky-500/30',
  'Vercel (simulated)':'text-sky-300 bg-sky-500/10 border-sky-500/20',
};

function SystemBadge({ system }) {
  const cls = SYSTEM_COLORS[system] || 'text-muted-foreground bg-secondary/30 border-border';
  return <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${cls}`}>{system}</span>;
}

export default function ExecutionLogPanel({ log, liveUrl }) {
  if (!log || log.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-5 space-y-4"
    >
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        Execution Log — {log.length} steps
      </h3>

      <div className="space-y-2">
        <AnimatePresence>
          {log.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`rounded-lg border p-3 space-y-2 ${entry.status === 'failed' ? 'border-red-500/30 bg-red-500/5' : 'border-border/50 bg-secondary/20'}`}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-muted-foreground w-4">#{entry.step}</span>
                  {entry.status === 'done'    && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                  {entry.status === 'failed'  && <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                  {entry.status === 'running' && <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />}
                  <span className="text-xs font-semibold text-foreground">{entry.name}</span>
                  {entry.simulated && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">simulated</span>}
                </div>
                <div className="flex items-center gap-2">
                  {entry.system && <SystemBadge system={entry.system} />}
                  {entry.duration_ms != null && <span className="text-[10px] text-muted-foreground font-mono">{entry.duration_ms}ms</span>}
                  {entry.ts && <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">{new Date(entry.ts).toLocaleTimeString()}</span>}
                </div>
              </div>

              {entry.error && (
                <p className="text-[10px] text-red-400 font-mono pl-6">✗ {entry.error}</p>
              )}

              {entry.result && !entry.error && (
                <div className="pl-6 text-[10px] text-muted-foreground font-mono space-y-0.5">
                  {entry.result.url && (
                    <a href={entry.result.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline">
                      <Globe className="h-3 w-3" />{entry.result.url}<ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                  {entry.result.summary && <p>→ {entry.result.summary}</p>}
                  {entry.result.intent && <p>→ Intent: {entry.result.intent}</p>}
                  {entry.result.score != null && <p>→ Score: {entry.result.score}/10</p>}
                  {Array.isArray(entry.result.steps) && entry.result.steps.slice(0, 3).map((s, j) => <p key={j}>• {safeStr(s)}</p>)}
                  {Array.isArray(entry.result.findings) && entry.result.findings.slice(0, 2).map((f, j) => <p key={j}>• {safeStr(f)}</p>)}
                  {Array.isArray(entry.result.components) && entry.result.components.slice(0, 3).map((c, j) => <p key={j}>• {safeStr(c)}</p>)}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {liveUrl && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-4 flex items-center gap-3"
        >
          <Globe className="h-5 w-5 text-emerald-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-400 mb-1">Live Product URL</p>
            <a href={liveUrl} target="_blank" rel="noopener noreferrer"
              className="text-sm font-mono text-primary hover:underline flex items-center gap-1 break-all">
              {liveUrl}<ExternalLink className="h-3 w-3 shrink-0" />
            </a>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}