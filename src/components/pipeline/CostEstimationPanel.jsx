import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Zap, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SERVICES = [
  { id: 'gpt4',      name: 'GPT-4o',         unit: 'per 1K tokens',   base: 0.005,  icon: '🤖', color: '#10b981' },
  { id: 'claude',    name: 'Claude 3.5',      unit: 'per 1K tokens',   base: 0.003,  icon: '🧠', color: '#60a5fa' },
  { id: 'replit',    name: 'Replit Compute',  unit: 'per hour',        base: 0.40,   icon: '⚡', color: '#fb923c' },
  { id: 'vercel',    name: 'Vercel Deploy',   unit: 'per deployment',  base: 0.02,   icon: '🚀', color: '#a78bfa' },
  { id: 'storage',   name: 'Storage / DB',    unit: 'per GB/month',    base: 0.023,  icon: '💾', color: '#fbbf24' },
  { id: 'bandwidth', name: 'Bandwidth',       unit: 'per GB',          base: 0.09,   icon: '🌐', color: '#38bdf8' },
];

const PRESETS = {
  small:      { label: 'Small Project',    runs: 10,  tokens: 50,  hours: 1,  deploys: 5,  storage: 1,  bandwidth: 5  },
  medium:     { label: 'Medium SaaS',      runs: 100, tokens: 200, hours: 5,  deploys: 20, storage: 10, bandwidth: 50 },
  large:      { label: 'Enterprise Scale', runs: 500, tokens: 800, hours: 20, deploys: 60, storage: 50, bandwidth: 200 },
};

const Tooltip_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 };

export default function CostEstimationPanel() {
  const [preset, setPreset] = useState('medium');
  const [volumes, setVolumes] = useState(PRESETS.medium);
  const [multiplier, setMultiplier] = useState(1);

  const applyPreset = (key) => {
    setPreset(key);
    setVolumes(PRESETS[key]);
  };

  const costs = useMemo(() => {
    const { tokens, hours, deploys, storage, bandwidth } = volumes;
    return {
      gpt4:      tokens * SERVICES[0].base * multiplier,
      claude:    tokens * SERVICES[1].base * multiplier,
      replit:    hours  * SERVICES[2].base * multiplier,
      vercel:    deploys * SERVICES[3].base * multiplier,
      storage:   storage * SERVICES[4].base * multiplier,
      bandwidth: bandwidth * SERVICES[5].base * multiplier,
    };
  }, [volumes, multiplier]);

  const total = Object.values(costs).reduce((s, v) => s + v, 0);
  const monthly = total * 30;

  const chartData = SERVICES.map(s => ({
    name: s.name,
    cost: +costs[s.id].toFixed(4),
    color: s.color,
  }));

  const setVol = (key, val) => setVolumes(prev => ({ ...prev, [key]: Math.max(0, Number(val)) }));

  return (
    <div className="space-y-5">
      {/* Presets */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Preset:</span>
        {Object.entries(PRESETS).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => applyPreset(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              preset === key ? 'bg-primary/10 border-primary/40 text-primary' : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Scale:</span>
          {[1, 5, 10].map(m => (
            <button
              key={m}
              onClick={() => setMultiplier(m)}
              className={`px-2 py-1 rounded text-xs font-bold border transition-all ${multiplier === m ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
            >
              {m}×
            </button>
          ))}
        </div>
      </div>

      {/* Cost summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 col-span-2 sm:col-span-1 text-center">
          <p className="text-xs text-muted-foreground mb-1">Est. Daily Cost</p>
          <p className="text-3xl font-extrabold text-primary">${total.toFixed(3)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Monthly (30d)</p>
          <p className="text-2xl font-bold text-foreground">${monthly.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Annual (365d)</p>
          <p className="text-2xl font-bold text-foreground">${(total * 365).toFixed(0)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Volume inputs */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usage Volumes (daily)</p>
          {[
            { key: 'tokens',    label: 'LLM Tokens (K)',   step: 10 },
            { key: 'hours',     label: 'Compute Hours',    step: 0.5 },
            { key: 'deploys',   label: 'Deployments',      step: 1 },
            { key: 'storage',   label: 'Storage (GB)',     step: 1 },
            { key: 'bandwidth', label: 'Bandwidth (GB)',   step: 5 },
          ].map(({ key, label, step }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-xs text-muted-foreground w-36 shrink-0">{label}</label>
              <input
                type="number"
                min={0}
                step={step}
                value={volumes[key]}
                onChange={e => setVol(key, e.target.value)}
                className="w-24 bg-secondary/40 border border-border rounded-md px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary text-right"
              />
              <div className="flex-1 bg-secondary/30 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${Math.min(100, (volumes[key] / (PRESETS.large[key] * 1.5)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Cost Breakdown</p>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={v => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} width={80} />
              <Tooltip contentStyle={Tooltip_STYLE} formatter={v => [`$${v}`, 'Cost']} />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Per-service breakdown */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service Breakdown</p>
        <div className="space-y-2">
          {SERVICES.map(s => {
            const cost = costs[s.id];
            const pct = total > 0 ? (cost / total) * 100 : 0;
            return (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-base w-6 shrink-0">{s.icon}</span>
                <span className="text-xs text-foreground w-28 shrink-0">{s.name}</span>
                <div className="flex-1 bg-secondary/30 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <span className="text-xs font-mono text-foreground w-16 text-right">${cost.toFixed(4)}</span>
                <span className="text-[10px] text-muted-foreground w-10 text-right">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-border pt-2 flex justify-between items-center">
          <span className="text-xs font-semibold text-foreground">Total (daily)</span>
          <span className="text-sm font-bold text-primary">${total.toFixed(4)}</span>
        </div>
      </div>
    </div>
  );
}