import { Button } from '@/components/ui/button';
import { X, ExternalLink, Plus, GitCompare } from 'lucide-react';
import { motion } from 'framer-motion';

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

function ScoreBar({ score }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-sm font-bold ${textColor}`}>{score}/10</span>
    </div>
  );
}

export default function ToolDetailPanel({ tool, onClose, onAddToStack, onCompare }) {
  if (!tool) return null;
  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-card border-l border-border z-50 flex flex-col overflow-y-auto shadow-2xl"
    >
      <div className="sticky top-0 bg-card border-b border-border p-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-foreground">{tool.name}</p>
          <span className="text-[10px] text-muted-foreground">{tool.category}</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-5 space-y-5 flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{tool.description}</p>

        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Performance Score</p>
          <ScoreBar score={tool.performance_score} />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Pricing</p>
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border capitalize ${COST_BADGE[tool.cost_tier]}`}>
            {tool.cost_tier}
          </span>
          <p className="text-sm text-foreground">{tool.cost_details}</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Africa / Nigeria Availability</p>
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border capitalize ${AFRICA_BADGE[tool.africa_available]}`}>
            {tool.africa_available === 'yes' ? '✅ Available' : tool.africa_available === 'limited' ? '⚠️ Limited' : '❌ Not Available'}
          </span>
          {tool.africa_available === 'limited' && (
            <p className="text-xs text-amber-400">Limited availability in Africa — verify current coverage before deployment.</p>
          )}
          {tool.africa_available === 'no' && (
            <p className="text-xs text-red-400">Not available in Africa. Consider an African alternative for Nigeria/Africa market.</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground uppercase tracking-wide">Integration Notes</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-28">Base44:</span>
              <span className={`capitalize font-semibold ${tool.base44_compatible === 'native' ? 'text-primary' : tool.base44_compatible === 'api' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {tool.base44_compatible}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground w-28">Vercel/Railway:</span>
              <span className="text-emerald-400 font-semibold">{tool.production_compatible ? 'Compatible' : 'Not Compatible'}</span>
            </div>
          </div>
        </div>

        {tool.tags?.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-foreground uppercase tracking-wide">Tags</p>
            <div className="flex flex-wrap gap-1.5">
              {tool.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-card border-t border-border p-4 space-y-2">
        <div className="flex gap-2">
          <Button className="flex-1 gap-1.5 text-sm" onClick={() => onAddToStack(tool)}>
            <Plus className="h-4 w-4" /> Add to My Stack
          </Button>
          <Button variant="outline" className="gap-1.5 text-sm" onClick={() => onCompare(tool)}>
            <GitCompare className="h-4 w-4" /> Compare
          </Button>
        </div>
        <a href={tool.official_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors py-1">
          <ExternalLink className="h-3.5 w-3.5" /> Visit Official Website
        </a>
      </div>
    </motion.div>
  );
}