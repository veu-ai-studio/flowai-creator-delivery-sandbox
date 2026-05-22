import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const INTERVALS = [
  { label: 'Every 5 min',  value: '5m' },
  { label: 'Every 15 min', value: '15m' },
  { label: 'Every hour',   value: '1h' },
  { label: 'Every 6 hrs',  value: '6h' },
  { label: 'Daily',        value: '24h' },
];

export default function FlowScheduler({ flowId, flowName }) {
  const [schedules, setSchedules] = useState(() => {
    try {
      const raw = localStorage.getItem(`flow_schedules_${flowId}`);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [interval, setInterval] = useState('1h');
  const [label, setLabel] = useState('');
  const [saved, setSaved] = useState(false);

  const persist = (next) => {
    setSchedules(next);
    localStorage.setItem(`flow_schedules_${flowId}`, JSON.stringify(next));
  };

  const addSchedule = () => {
    const entry = {
      id: Date.now().toString(),
      interval,
      label: label || `${INTERVALS.find(i => i.value === interval)?.label} run`,
      enabled: true,
      created_at: new Date().toISOString(),
      last_run: null,
    };
    persist([...schedules, entry]);
    setLabel('');
    setAdding(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleSchedule = (id) => {
    persist(schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  };

  const removeSchedule = (id) => {
    persist(schedules.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary" /> Automated Schedules
          <span className="text-muted-foreground font-normal">({schedules.length})</span>
        </p>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-all">
          <Plus className="h-3 w-3" /> Add
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
          <input
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder="Schedule name (optional)"
            className="w-full h-7 rounded border border-input bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex gap-2">
            <select value={interval} onChange={e => setInterval(e.target.value)}
              className="flex-1 h-7 rounded border border-input bg-transparent px-2 text-xs text-foreground">
              {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            <Button size="sm" onClick={addSchedule} className="h-7 text-xs px-3 gap-1">
              <CheckCircle2 className="h-3 w-3" /> Save
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Schedules are stored locally and trigger reminders — connect a backend automation for live execution.</p>
        </motion.div>
      )}

      {saved && (
        <p className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Schedule saved
        </p>
      )}

      {/* Schedule list */}
      {schedules.length === 0 && !adding ? (
        <p className="text-xs text-muted-foreground text-center py-4">No schedules configured. Click Add to create one.</p>
      ) : (
        <div className="space-y-1.5">
          {schedules.map(s => (
            <div key={s.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all ${s.enabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-secondary/10 opacity-60'}`}>
              <button onClick={() => toggleSchedule(s.id)}
                className={`h-4 w-7 rounded-full border flex items-center transition-all shrink-0 ${s.enabled ? 'border-emerald-500 bg-emerald-500 justify-end' : 'border-border bg-secondary justify-start'}`}>
                <div className="h-3 w-3 rounded-full bg-white mx-0.5" />
              </button>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-foreground truncate">{s.label}</p>
                <p className="text-[9px] text-muted-foreground">
                  {INTERVALS.find(i => i.value === s.interval)?.label}
                  {s.last_run ? ` · Last: ${new Date(s.last_run).toLocaleTimeString()}` : ' · Not yet run'}
                </p>
              </div>
              <button onClick={() => removeSchedule(s.id)}
                className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}