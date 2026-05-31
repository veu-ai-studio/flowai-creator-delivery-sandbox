import { Button } from '@/components/ui/button';
import { Plus, Info } from 'lucide-react';

function ScoreBar({ score }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-xs font-bold w-6 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

const COST_BADGE = {
  free: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  freemium: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  paid: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  proprietary: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
};

const AFRICA_BADGE = {
  yes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  limited: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  no: 'bg-red-500/10 text-red-400 border-red-500/30',
};

export default function ToolCard({ tool, onLearnMore, onAddToStack }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-foreground truncate">{tool.name}</p>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border">
            {tool.category}
          </span>
        </div>
        {tool.base44_compatible === 'native' && (
          <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary font-bold shrink-0">Native</span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">{tool.description}</p>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Performance</span>
        </div>
        <ScoreBar score={tool.performance_score} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border capitalize ${COST_BADGE[tool.cost_tier]}`}>
          {tool.cost_tier}
        </span>
        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${AFRICA_BADGE[tool.underserved_accessible]}`}>
          Africa: {tool.underserved_accessible}
        </span>
        {tool.base44_compatible !== 'none' && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-primary/30 bg-primary/5 text-primary capitalize">
            Base44: {tool.base44_compatible}
          </span>
        )}
      </div>

      <div className="flex gap-2 mt-auto">
        <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => onLearnMore(tool)}>
          <Info className="h-3 w-3" /> Learn More
        </Button>
        <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => onAddToStack(tool)}>
          <Plus className="h-3 w-3" /> Add to Stack
        </Button>
      </div>
    </div>
  );
}