import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Trash2, Download, CheckCircle2, AlertTriangle, Zap, Upload, Clock, MessageSquare } from 'lucide-react';

const STORAGE_KEY = 'flowai_activity_log';
const MAX_ENTRIES = 100;

const TYPE_CONFIG = {
  audit:    { icon: Zap,           color: 'text-blue-400',    bg: 'bg-blue-500/10' },
  export:   { icon: Download,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  upload:   { icon: Upload,        color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  schedule: { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-500/10' },
  feedback: { icon: MessageSquare, color: 'text-pink-400',    bg: 'bg-pink-500/10' },
  alert:    { icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10' },
  success:  { icon: CheckCircle2,  color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

export function logActivity(type, message, meta = {}) {
  const stored = localStorage.getItem(STORAGE_KEY);
  const log = stored ? JSON.parse(stored) : [];
  const entry = { id: Date.now(), type, message, meta, ts: new Date().toISOString() };
  const updated = [entry, ...log].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const ALL_TYPES = ['audit', 'export', 'upload', 'schedule', 'feedback', 'alert', 'success'];

export default function ActivityHistoryLog() {
  const [log, setLog] = useState([]);
  const [filter, setFilter] = useState('all');

  const reload = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setLog(stored ? JSON.parse(stored) : []);
  };

  useEffect(() => {
    reload();
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, []);

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setLog([]);
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `activity-log-${Date.now()}.json`;
    a.click();
  };

  const filtered = filter === 'all' ? log : log.filter(e => e.type === filter);

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" /> Activity History
          <span className="text-[10px] text-muted-foreground">({log.length})</span>
        </h3>
        <div className="flex gap-1.5">
          <button onClick={exportLog} disabled={log.length === 0}
            className="h-6 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-40">
            <Download className="h-3 w-3" /> Export
          </button>
          <button onClick={clear} disabled={log.length === 0}
            className="h-6 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1 disabled:opacity-40">
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-1 flex-wrap">
        <button onClick={() => setFilter('all')}
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${filter === 'all' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
          All
        </button>
        {ALL_TYPES.map(t => {
          const cfg = TYPE_CONFIG[t];
          return (
            <button key={t} onClick={() => setFilter(t)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${filter === t ? `border-current ${cfg.color}` : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Log list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">No activity recorded yet.</p>
          ) : (
            filtered.map(entry => {
              const cfg = TYPE_CONFIG[entry.type] || TYPE_CONFIG.success;
              const Icon = cfg.icon;
              return (
                <motion.div key={entry.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-2.5 p-2.5 rounded-lg bg-secondary/20 border border-border">
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground">{entry.message}</p>
                    {entry.meta && Object.keys(entry.meta).length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {Object.entries(entry.meta).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                      </p>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0">{timeAgo(entry.ts)}</span>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}