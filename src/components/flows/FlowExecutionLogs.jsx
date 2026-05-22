import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, Loader2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

const STATUS_STYLE = {
  success: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5',
  error:   'text-red-400 border-red-500/30 bg-red-500/5',
  partial: 'text-amber-400 border-amber-500/30 bg-amber-500/5',
};

export default function FlowExecutionLogs({ flowId }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.FlowRun.filter({ flow_id: flowId }, '-created_date', 30);
    setRuns(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [flowId]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-primary" /> Execution Logs
          <span className="text-muted-foreground font-normal">({runs.length} runs)</span>
        </p>
        <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : runs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No execution logs yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {runs.map((run, i) => {
            const style = STATUS_STYLE[run.status] || STATUS_STYLE.partial;
            return (
              <motion.div key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                className={`rounded-lg border p-2.5 ${style}`}>
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(expanded === run.id ? null : run.id)}>
                  {run.status === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate">{run.flow_name || 'Flow Run'}</p>
                    <p className="text-[10px] opacity-70 flex items-center gap-2 mt-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {run.created_date ? formatDistanceToNow(new Date(run.created_date), { addSuffix: true }) : '—'}
                      {run.duration_ms && ` · ${(run.duration_ms / 1000).toFixed(1)}s`}
                      {run.node_count && ` · ${run.node_count} nodes`}
                    </p>
                  </div>
                  {expanded === run.id ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                </div>
                <AnimatePresence>
                  {expanded === run.id && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="mt-2 pt-2 border-t border-current/20 space-y-1 text-[10px] opacity-80">
                        {run.input_preview && <p><span className="font-bold">Input:</span> {run.input_preview}</p>}
                        {run.output_preview && <p><span className="font-bold">Output:</span> {run.output_preview}</p>}
                        {run.error_message && <p className="text-red-300"><span className="font-bold">Error:</span> {run.error_message}</p>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}