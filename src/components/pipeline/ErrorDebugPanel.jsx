import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Bug, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, Info, XCircle, Loader2 } from 'lucide-react';

const SEVERITY_STYLES = {
  critical: 'border-red-500/40 bg-red-500/5 text-red-400',
  high:     'border-orange-500/40 bg-orange-500/5 text-orange-400',
  medium:   'border-amber-500/40 bg-amber-500/5 text-amber-400',
  low:      'border-blue-500/40 bg-blue-500/5 text-blue-400',
};

const SEVERITY_ICONS = {
  critical: XCircle,
  high:     AlertTriangle,
  medium:   AlertTriangle,
  low:      Info,
};

function ErrorRow({ log }) {
  const [expanded, setExpanded] = useState(false);
  const styles = SEVERITY_STYLES[log.severity] || SEVERITY_STYLES.medium;
  const Icon = SEVERITY_ICONS[log.severity] || Info;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border p-3 space-y-2 ${styles}`}
    >
      <div className="flex items-start gap-2 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <Icon className="h-4 w-4 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide">{log.severity}</span>
            <span className="text-[10px] text-muted-foreground font-mono bg-black/20 px-1.5 py-0.5 rounded">{log.source}</span>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {log.created_date ? new Date(log.created_date).toLocaleTimeString() : ''}
            </span>
          </div>
          <p className="text-xs mt-1 leading-snug">{log.message}</p>
        </div>
        <button className="shrink-0">
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-2 border-t border-white/5">
              {log.stack && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Stack Trace</p>
                  <pre className="text-[10px] font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto text-muted-foreground">{log.stack}</pre>
                </div>
              )}
              {log.context && Object.keys(log.context).length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">Context</p>
                  <pre className="text-[10px] font-mono bg-black/30 rounded p-2 overflow-x-auto whitespace-pre-wrap text-muted-foreground">{JSON.stringify(log.context, null, 2)}</pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ErrorDebugPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchLogs = async () => {
    setLoading(true);
    const data = await base44.entities.ErrorLog.list('-created_date', 50).catch(() => []);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.severity === filter);

  const counts = logs.reduce((acc, l) => {
    acc[l.severity] = (acc[l.severity] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {['critical', 'high', 'medium', 'low'].map(sev => {
          const styles = SEVERITY_STYLES[sev];
          const Icon = SEVERITY_ICONS[sev];
          return (
            <button
              key={sev}
              onClick={() => setFilter(filter === sev ? 'all' : sev)}
              className={`rounded-lg border p-3 text-left transition-all ${styles} ${filter === sev ? 'ring-2 ring-current ring-offset-1 ring-offset-background' : ''}`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="h-3.5 w-3.5" />
                <span className="text-[10px] font-bold uppercase">{sev}</span>
              </div>
              <p className="text-xl font-bold">{counts[sev] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{filtered.length} error{filtered.length !== 1 ? 's' : ''} {filter !== 'all' ? `(${filter})` : ''}</p>
        <div className="flex gap-2">
          {filter !== 'all' && (
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setFilter('all')}>
              Clear filter
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Bug className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No errors logged{filter !== 'all' ? ` for severity "${filter}"` : ''}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => <ErrorRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}