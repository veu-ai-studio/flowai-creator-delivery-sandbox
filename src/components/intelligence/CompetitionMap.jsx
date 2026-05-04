import { useState } from 'react';
import { motion } from 'framer-motion';
import { Swords, Brain, Globe, Code2, Search, Eye } from 'lucide-react';

const CAP_CONFIG = {
  reasoning:  { label: 'Reasoning',  icon: Brain,  color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  deployment: { label: 'Deployment', icon: Globe,  color: 'text-sky-400',    bg: 'bg-sky-500/10',    border: 'border-sky-500/30' },
  execution:  { label: 'Execution',  icon: Code2,  color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
  auditing:   { label: 'Auditing',   icon: Search, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  crawling:   { label: 'Crawling',   icon: Eye,    color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30' },
};

function ToolChip({ tool, rank }) {
  const pct = Math.round((tool.score || 0) * 100);
  const color = pct >= 75 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-secondary/30 ${rank === 0 ? 'ring-1 ring-primary/30' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono text-muted-foreground w-4">{rank + 1}</span>
        <div>
          <p className="text-xs font-semibold text-foreground">{tool.name}</p>
          <p className="text-[10px] text-muted-foreground">{tool.provider} · ${tool.base_cost_usd}/op</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-xs font-bold font-mono ${color}`}>{pct}</p>
        <p className="text-[10px] text-muted-foreground">{tool.sampleSize > 0 ? `${tool.sampleSize} runs` : 'default'}</p>
      </div>
    </div>
  );
}

export default function CompetitionMap({ competitionMap }) {
  const [expanded, setExpanded] = useState('reasoning');
  if (!competitionMap) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Swords className="h-4 w-4 text-primary" />
        Competition Map — Tools by Capability
      </h3>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1.5">
        {Object.keys(CAP_CONFIG).map(cap => {
          const cfg = CAP_CONFIG[cap];
          const Icon = cfg.icon;
          const count = competitionMap[cap]?.length || 0;
          return (
            <button key={cap} onClick={() => setExpanded(cap)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                expanded === cap ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-border text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-3 w-3" />
              {cfg.label}
              <span className="text-[10px] opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Selected capability competitors */}
      {expanded && competitionMap[expanded] && (
        <motion.div key={expanded} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          {competitionMap[expanded].length === 0
            ? <p className="text-xs text-muted-foreground text-center py-4">No tools tracked for this capability yet.</p>
            : competitionMap[expanded].map((tool, i) => <ToolChip key={tool.id} tool={tool} rank={i} />)
          }
        </motion.div>
      )}
    </div>
  );
}