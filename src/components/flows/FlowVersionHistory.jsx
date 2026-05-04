import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, RotateCcw, Clock, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';

export default function FlowVersionHistory({ flowId, onRestore }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [restoring, setRestoring] = useState(null);

  useEffect(() => {
    base44.entities.FlowVersion.filter({ flow_id: flowId }, '-created_date', 20)
      .then(data => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [flowId]);

  const restore = async (version) => {
    setRestoring(version.id);
    await new Promise(r => setTimeout(r, 600));
    if (onRestore) onRestore(version);
    setRestoring(null);
  };

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-2">
      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No version history saved yet.</p>
      ) : (
        versions.map((v, i) => (
          <motion.div key={v.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
            className="rounded-lg border border-border bg-secondary/20 overflow-hidden">
            <div className="flex items-center gap-3 p-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <GitBranch className="h-3 w-3 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {v.label || `Version ${versions.length - i}`}
                </p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {v.created_date ? formatDistanceToNow(new Date(v.created_date), { addSuffix: true }) : 'Unknown'}
                  {v.node_count && ` · ${v.node_count} nodes`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => restore(v)} disabled={!!restoring}
                  className="h-7 gap-1 text-xs">
                  {restoring === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                  Restore
                </Button>
                <button onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors">
                  {expanded === v.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <AnimatePresence>
              {expanded === v.id && (
                <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                  <div className="px-3 pb-3 text-[10px] text-muted-foreground border-t border-border pt-2 space-y-1">
                    {v.description && <p>{v.description}</p>}
                    <p>Snapshot ID: <span className="font-mono text-foreground">{v.id.slice(0, 12)}...</span></p>
                    {v.changes_summary && <p>Changes: {v.changes_summary}</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))
      )}
    </div>
  );
}