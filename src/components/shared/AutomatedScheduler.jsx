import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Plus, Trash2, Play, CheckCircle2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const STORAGE_KEY = 'flowai_schedules';
const INTERVALS = ['Every 1h', 'Every 6h', 'Every 12h', 'Daily', 'Weekly'];
const INTERVAL_MS = { 'Every 1h': 3600000, 'Every 6h': 21600000, 'Every 12h': 43200000, 'Daily': 86400000, 'Weekly': 604800000 };

function nextRun(interval, lastRun) {
  if (!lastRun) return 'Now';
  const next = new Date(new Date(lastRun).getTime() + INTERVAL_MS[interval]);
  const diff = next - Date.now();
  if (diff <= 0) return 'Due now';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `in ${h}h ${m}m` : `in ${m}m`;
}

export default function AutomatedScheduler({ onScheduledRun }) {
  const [schedules, setSchedules] = useState(() => {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : [];
  });
  const [adding, setAdding] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newInterval, setNewInterval] = useState('Daily');

  const save = (updated) => {
    setSchedules(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const add = () => {
    if (!newUrl.trim()) return;
    save([...schedules, { id: Date.now(), url: newUrl.trim(), interval: newInterval, enabled: true, lastRun: null, runCount: 0 }]);
    setNewUrl('');
    setAdding(false);
  };

  const toggle = (id) => save(schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
  const remove = (id) => save(schedules.filter(s => s.id !== id));

  const runNow = (id) => {
    const schedule = schedules.find(s => s.id === id);
    if (!schedule) return;
    save(schedules.map(s => s.id === id ? { ...s, lastRun: new Date().toISOString(), runCount: (s.runCount || 0) + 1 } : s));
    if (onScheduledRun) onScheduledRun(schedule.url);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Automated Scheduling
          {schedules.filter(s => s.enabled).length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
              {schedules.filter(s => s.enabled).length} active
            </span>
          )}
        </h3>
        <Button size="sm" variant="outline" onClick={() => setAdding(v => !v)} className="h-7 gap-1 text-xs">
          <Plus className="h-3 w-3" /> Add Schedule
        </Button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="flex gap-2 flex-wrap p-3 rounded-lg border border-border bg-secondary/20">
              <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
                placeholder="https://yoursite.com" className="h-8 text-xs flex-1 min-w-48" />
              <div className="flex gap-1 flex-wrap">
                {INTERVALS.map(i => (
                  <button key={i} onClick={() => setNewInterval(i)}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${newInterval === i ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full">
                <Button size="sm" onClick={add} disabled={!newUrl.trim()} className="h-7 text-xs gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setAdding(false)} className="h-7 text-xs">Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {schedules.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No schedules yet — add one to automate audits.</p>
        ) : (
          schedules.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
              className={`rounded-lg border p-3 flex items-center gap-3 transition-all ${s.enabled ? 'border-border bg-secondary/20' : 'border-border/50 bg-secondary/10 opacity-60'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{s.url}</p>
                <div className="flex gap-3 mt-0.5 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><Calendar className="h-2.5 w-2.5" /> {s.interval}</span>
                  <span>Next: {nextRun(s.interval, s.lastRun)}</span>
                  {s.runCount > 0 && <span>{s.runCount} runs</span>}
                </div>
              </div>
              <button onClick={() => runNow(s.id)}
                className="h-6 w-6 flex items-center justify-center rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors" title="Run now">
                <Play className="h-3 w-3" />
              </button>
              <button onClick={() => toggle(s.id)}
                className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${s.enabled ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-border text-muted-foreground'}`}>
                {s.enabled ? 'ON' : 'OFF'}
              </button>
              <button onClick={() => remove(s.id)} className="text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}