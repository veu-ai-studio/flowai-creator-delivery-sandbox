import { motion } from 'framer-motion';
import { Brain, Globe, Code2, Layers } from 'lucide-react';

const CAP_ICONS = {
  reasoning: { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  deployment: { icon: Globe, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
  execution: { icon: Code2, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
};

export default function RecommendedStack({ stack }) {
  if (!stack) return null;

  const items = [
    { key: 'reasoning', label: 'Reasoning', value: stack.reasoning },
    { key: 'deployment', label: 'Deployment', value: stack.deployment },
    { key: 'execution', label: 'Execution', value: stack.execution },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Recommended Full Stack
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          (stack.confidence || 0) >= 70 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          {stack.confidence || 55}% confidence
        </span>
      </div>

      <div className="space-y-3">
        {items.map(({ key, label, value }, i) => {
          const cfg = CAP_ICONS[key] || CAP_ICONS.reasoning;
          const Icon = cfg.icon;
          return (
            <motion.div key={key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
              <div className={`h-8 w-8 rounded-lg bg-card flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-foreground">{value || 'N/A'}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/60 italic">
        Stack selected based on current usage data and priority settings. Improves as more data is collected.
      </p>
    </div>
  );
}