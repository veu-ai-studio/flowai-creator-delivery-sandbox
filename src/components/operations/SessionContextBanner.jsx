// Persistent session context banner — shown on every step so the user
// always knows what objective and inputs FlowAI is working on.
import { Target, Link2, MessageSquare, Zap, Clock, Wrench } from 'lucide-react';

const MODE_ICONS = { auto: Zap, guided: Clock, manual: Wrench };
const MODE_LABELS = { auto: 'Auto', guided: 'Guided', manual: 'Manual' };

export default function SessionContextBanner({ config }) {
  if (!config) return null;

  const { inputs = [], opsMode, multiMode, objective } = config;
  const ModeIcon = MODE_ICONS[opsMode] || Zap;

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex flex-wrap gap-x-5 gap-y-2 items-center text-[11px] mb-1">
      {/* Objective */}
      {objective && (
        <div className="flex items-center gap-1.5 min-w-0">
          <Target className="h-3 w-3 text-primary shrink-0" />
          <span className="text-muted-foreground shrink-0">Objective:</span>
          <span className="font-semibold text-foreground truncate max-w-[220px]" title={objective}>{objective}</span>
        </div>
      )}

      {/* Inputs */}
      {inputs.map((inp, i) => {
        const Icon = inp.type === 'url' ? Link2 : MessageSquare;
        const display = inp.value.length > 45 ? inp.value.slice(0, 45) + '…' : inp.value;
        return (
          <div key={i} className="flex items-center gap-1.5 min-w-0">
            <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground shrink-0">{inp.name}:</span>
            <span className="font-semibold text-foreground truncate max-w-[200px]" title={inp.value}>{display}</span>
          </div>
        );
      })}

      {/* Mode */}
      <div className="flex items-center gap-1.5 ml-auto shrink-0">
        <ModeIcon className="h-3 w-3 text-primary" />
        <span className="font-semibold text-primary">{MODE_LABELS[opsMode] || opsMode}</span>
        {multiMode && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase">{multiMode}</span>
        )}
      </div>
    </div>
  );
}