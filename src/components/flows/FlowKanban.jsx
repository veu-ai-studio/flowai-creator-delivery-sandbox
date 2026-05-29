import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const COLUMNS = [
  { key: 'draft',   label: 'Draft',    color: 'border-border',           dot: 'bg-muted-foreground' },
  { key: 'active',  label: 'Active',   color: 'border-emerald-500/40',   dot: 'bg-emerald-400' },
  { key: 'paused',  label: 'Paused',   color: 'border-amber-500/40',     dot: 'bg-amber-400' },
  { key: 'archived',label: 'Archived', color: 'border-border/50',        dot: 'bg-muted-foreground/40' },
];

function getStatus(flow) {
  if (flow.status) return flow.status;
  if (!flow.nodes?.length) return 'draft';
  return 'active';
}

export default function FlowKanban({ flows, onRun }) {
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState(() => {
    const s = {};
    flows.forEach(f => { s[f.id] = getStatus(f); });
    return s;
  });

  const moveFlow = (flowId, newStatus) => {
    setStatuses(prev => ({ ...prev, [flowId]: newStatus }));
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map(col => {
        const colFlows = flows.filter(f => (statuses[f.id] || getStatus(f)) === col.key);
        return (
          <div key={col.key} className={`flex-1 min-w-52 rounded-xl border ${col.color} bg-card p-3 space-y-2`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-2 w-2 rounded-full ${col.dot}`} />
              <span className="text-xs font-bold text-foreground">{col.label}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{colFlows.length}</span>
            </div>
            {colFlows.map(flow => (
              <motion.div key={flow.id} layout
                className="rounded-lg border border-border bg-secondary/20 p-3 cursor-pointer hover:border-primary/40 transition-all group"
                onClick={() => navigate('/flow-designer', { state: { loadFlow: flow } })}>
                <p className="text-xs font-semibold text-foreground truncate mb-1">{flow.name}</p>
                <p className="text-[10px] text-muted-foreground">{flow.nodes?.length || 0} blocks</p>
                {flow.updated_date && (
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {formatDistanceToNow(new Date(flow.updated_date), { addSuffix: true })}
                  </p>
                )}
                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); onRun && onRun(flow); }}
                    className="h-5 px-1.5 rounded bg-primary/10 text-primary text-[9px] font-bold flex items-center gap-0.5 hover:bg-primary/20">
                    <Play className="h-2.5 w-2.5" /> Run
                  </button>
                  <select value={statuses[flow.id] || getStatus(flow)}
                    onChange={e => { e.stopPropagation(); moveFlow(flow.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    className="h-5 px-1 rounded bg-secondary text-[9px] text-muted-foreground border border-border">
                    {COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>
                </div>
              </motion.div>
            ))}
            {colFlows.length === 0 && (
              <p className="text-[10px] text-muted-foreground text-center py-4 border border-dashed border-border/40 rounded-lg">Empty</p>
            )}
          </div>
        );
      })}
    </div>
  );
}