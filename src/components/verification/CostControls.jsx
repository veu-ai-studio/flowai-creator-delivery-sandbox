import { Info, Zap, Gauge, Rocket } from 'lucide-react';

const MODES = [
  {
    id: 'light',
    label: 'Light',
    icon: Zap,
    color: 'emerald',
    model: 'gpt-4o-mini',
    iterations: '1',
    desc: 'Fastest & cheapest. Single attempt, lighter validation.',
    estimatedCost: '~$0.001–0.003 / app',
  },
  {
    id: 'standard',
    label: 'Standard',
    icon: Gauge,
    color: 'blue',
    model: 'gpt-4o-mini',
    iterations: '2',
    desc: 'Balanced. Smart-patch fixes on retry, skip unnecessary redeploys.',
    estimatedCost: '~$0.003–0.008 / app',
  },
  {
    id: 'full',
    label: 'Full Autopilot',
    icon: Rocket,
    color: 'purple',
    model: 'gpt-4o',
    iterations: '3',
    desc: 'Maximum quality. Full regen on each retry with GPT-4o.',
    estimatedCost: '~$0.02–0.05 / app',
  },
];

const colorMap = {
  emerald: {
    ring: 'ring-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300',
  },
  blue: {
    ring: 'ring-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-300',
  },
  purple: {
    ring: 'ring-purple-500',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/40',
    badge: 'bg-purple-500/20 text-purple-300',
  },
};

export default function CostControls({ mode, setMode, maxCostPerRun, setMaxCostPerRun, maxCostPerApp, setMaxCostPerApp }) {
  return (
    <div className="space-y-5">
      {/* Mode Selector */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Execution Mode</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODES.map((m) => {
            const c = colorMap[m.color];
            const Icon = m.icon;
            const selected = mode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selected
                    ? `${c.border} ${c.bg} ring-1 ${c.ring}`
                    : 'border-border bg-secondary/20 hover:bg-secondary/40'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className={`h-3.5 w-3.5 ${selected ? c.text : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-bold ${selected ? c.text : 'text-foreground'}`}>{m.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{m.desc}</p>
                <div className="flex flex-wrap gap-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${selected ? c.badge : 'bg-secondary/60 text-muted-foreground'}`}>
                    {m.model}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${selected ? c.badge : 'bg-secondary/60 text-muted-foreground'}`}>
                    ≤{m.iterations} iter
                  </span>
                </div>
                <p className={`text-[9px] mt-1.5 font-semibold ${selected ? c.text : 'text-muted-foreground/60'}`}>
                  {m.estimatedCost}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cost Guardrails */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Cost Guardrails</p>
          <Info className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Max cost / run ($)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={maxCostPerRun}
                onChange={(e) => setMaxCostPerRun(e.target.value)}
                className="w-full pl-6 pr-3 h-8 text-xs rounded-md bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/40"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Max cost / app ($)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="No limit"
                value={maxCostPerApp}
                onChange={(e) => setMaxCostPerApp(e.target.value)}
                className="w-full pl-6 pr-3 h-8 text-xs rounded-md bg-secondary/30 border border-border focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/40"
              />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground/60">
          Leave blank for no limit. Guardrails abort the run before exceeding budget.
        </p>
      </div>
    </div>
  );
}