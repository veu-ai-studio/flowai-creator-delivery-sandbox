import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Trash2, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function ResearchHistoryPanel({ onLoad }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user) return;
      const rows = await base44.entities.ResearchHistory.filter({ owner_email: user.email }, '-created_date', 20);
      setItems(rows);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.ResearchHistory.delete(id);
    setItems(prev => prev.filter(r => r.id !== id));
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history...
    </div>
  );

  if (items.length === 0) return (
    <p className="text-xs text-muted-foreground py-2">No research history yet.</p>
  );

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {items.map((item) => (
          <motion.div key={item.id}
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-border bg-secondary/20 overflow-hidden"
          >
            {/* Row header */}
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{item.query}</p>
                <p className="text-[10px] text-muted-foreground">
                  {item.industry && <span className="mr-2">{item.industry}</span>}
                  {timeAgo(item.created_date)}
                  {item.competitors?.length > 0 && <span className="ml-2">{item.competitors.length} competitors</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => onLoad(item)}
                  className="h-6 px-2 text-[10px] font-semibold rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
                  <RotateCcw className="h-2.5 w-2.5" /> Load
                </button>
                <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                  className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                  {expanded === item.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                <button onClick={() => handleDelete(item.id)}
                  className="h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {expanded === item.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border/50">
                  <div className="px-3 py-3 space-y-2 text-[10px] text-muted-foreground">
                    {item.summary && <p className="leading-relaxed">{item.summary}</p>}
                    {item.opportunities?.length > 0 && (
                      <div>
                        <span className="font-bold text-emerald-400">Opportunities: </span>
                        {item.opportunities.slice(0, 3).join(' · ')}
                      </div>
                    )}
                    {item.risks?.length > 0 && (
                      <div>
                        <span className="font-bold text-amber-400">Risks: </span>
                        {item.risks.slice(0, 3).join(' · ')}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}