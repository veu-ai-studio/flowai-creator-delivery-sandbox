import { motion } from 'framer-motion';
import { Zap, User, Gauge, Brain } from 'lucide-react';

const MODES = {
  manual: { label: 'Manual', icon: User, description: 'Click to re-test' },
  semi_automatic: { label: 'Semi-Auto', icon: Gauge, description: 'Suggest re-runs' },
  autonomous: { label: 'Autonomous', icon: Brain, description: 'Auto iterate (3x)' },
};

export default function IterationModeSelector({ mode, onChange }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <label className="text-sm font-semibold text-foreground">Iteration Mode</label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(MODES).map(([key, { label, icon: Icon, description }]) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`p-3 rounded-lg border transition-all space-y-1.5 ${
              mode === key
                ? 'border-primary bg-primary/10'
                : 'border-border bg-secondary/30 hover:border-primary/50'
            }`}
          >
            <Icon className={`h-4 w-4 ${mode === key ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className={`text-xs font-semibold ${mode === key ? 'text-primary' : 'text-foreground'}`}>
              {label}
            </p>
            <p className="text-[10px] text-muted-foreground">{description}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}