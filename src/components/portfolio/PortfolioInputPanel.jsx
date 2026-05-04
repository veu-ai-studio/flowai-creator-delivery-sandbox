import { useState } from 'react';
import { Plus, Trash2, Play, Zap, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CONCURRENCY_OPTIONS = [
  { value: 'sequential', label: 'Sequential (safe)' },
  { value: 'parallel', label: 'Parallel (max 3)' },
];

export default function PortfolioInputPanel({ onStart, running }) {
  const [apps, setApps] = useState([{ url: '', label: '' }]);
  const [mode, setMode] = useState('sequential');

  const addApp = () => setApps(prev => [...prev, { url: '', label: '' }]);
  const removeApp = (i) => setApps(prev => prev.filter((_, idx) => idx !== i));
  const updateApp = (i, field, val) =>
    setApps(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: val } : a));

  const validApps = apps.filter(a => a.url.trim().length > 0);

  const handleStart = () => {
    if (!validApps.length) return;
    onStart(validApps.map(a => ({
      url: a.url.trim(),
      label: a.label.trim() || a.url.trim(),
      status: 'pending',
    })), mode);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Portfolio Configuration</p>
      </div>

      {/* App list */}
      <div className="space-y-2">
        {apps.map((app, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="url"
              placeholder="https://your-app.vercel.app"
              value={app.url}
              onChange={e => updateApp(i, 'url', e.target.value)}
              className="flex-1 h-8 px-3 text-xs rounded-md bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/40"
            />
            <input
              type="text"
              placeholder="Label (optional)"
              value={app.label}
              onChange={e => updateApp(i, 'label', e.target.value)}
              className="w-32 h-8 px-3 text-xs rounded-md bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/40"
            />
            {apps.length > 1 && (
              <button onClick={() => removeApp(i)}
                className="p-1.5 text-muted-foreground hover:text-destructive transition rounded">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={addApp} className="gap-1.5 text-xs h-7">
        <Plus className="h-3.5 w-3.5" /> Add App
      </Button>

      {/* Run mode */}
      <div className="flex items-center gap-3">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase">Run Mode</p>
        <div className="flex gap-2">
          {CONCURRENCY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setMode(opt.value)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition ${
                mode === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button onClick={handleStart} disabled={running || !validApps.length} className="w-full gap-2">
        {running
          ? <><Zap className="h-4 w-4 animate-pulse" />Running Portfolio…</>
          : <><Play className="h-4 w-4" />Start Portfolio Run ({validApps.length} app{validApps.length !== 1 ? 's' : ''})</>}
      </Button>
    </div>
  );
}