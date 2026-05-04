import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, X, ChevronDown, ChevronUp, Loader2, Wrench, Settings, Brain, Eye } from 'lucide-react';

const CATEGORY_CONFIG = {
  tool_selection: { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  configuration:  { icon: Settings, color: 'text-sky-400', bg: 'bg-sky-500/10' },
  architecture:   { icon: Wrench, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  monitoring:     { icon: Eye, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

const PRIORITY_COLORS = {
  high:   'bg-red-500/10 text-red-400 border-red-500/30',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  low:    'bg-secondary text-muted-foreground border-border',
};

const RISK_COLORS = {
  low:    'text-emerald-400',
  medium: 'text-amber-400',
  high:   'text-red-400',
};

export default function ImprovementCard({ improvement, index, onAction }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(null);
  const [done, setDone] = useState(null); // 'applied' | 'dismissed'

  const cfg = CATEGORY_CONFIG[improvement.category] || CATEGORY_CONFIG.configuration;
  const Icon = cfg.icon;

  const handleAction = async (action) => {
    setLoading(action);
    try {
      await base44.functions.invoke('applyImprovement', {
        improvement_id: improvement.id,
        improvement_title: improvement.title,
        category: improvement.category,
        action,
      });
      setDone(action);
      if (onAction) onAction(improvement.id, action);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  if (done) {
    return (
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${done === 'applied' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-secondary/10 opacity-50'}`}>
        {done === 'applied' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <X className="h-4 w-4 text-muted-foreground" />}
        <p className="text-xs text-muted-foreground">
          {done === 'applied' ? `"${improvement.title}" marked as applied.` : `"${improvement.title}" dismissed.`}
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.07 }}
      className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
            <Icon className={`h-4 w-4 ${cfg.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase tracking-wide ${PRIORITY_COLORS[improvement.priority]}`}>
                {improvement.priority}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">{improvement.category?.replace('_', ' ')}</span>
            </div>
            <p className="text-sm font-semibold text-foreground mt-1">{improvement.title}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{improvement.suggestion}</p>
          </div>
        </div>

        {/* Impact */}
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-muted-foreground">Expected: <span className="text-emerald-400 font-semibold">{improvement.expected_impact}</span></span>
          <span className="text-muted-foreground">Risk: <span className={`font-semibold ${RISK_COLORS[improvement.risk]}`}>{improvement.risk}</span></span>
        </div>

        {/* Expand toggle */}
        <button onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[10px] text-primary hover:underline">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Show'} implementation details
        </button>

        {expanded && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-lg bg-secondary/30 border border-border p-3 space-y-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Weakness Addressed</p>
            <p className="text-xs text-foreground">{improvement.weakness_addressed}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mt-2">How to Apply</p>
            <p className="text-xs text-foreground">{improvement.implementation}</p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button size="sm" className="gap-1.5 h-8 text-xs"
            onClick={() => handleAction('apply')} disabled={!!loading}>
            {loading === 'apply' ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            Apply Improvement
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
            onClick={() => handleAction('dismiss')} disabled={!!loading}>
            {loading === 'dismiss' ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Dismiss
          </Button>
        </div>
      </div>
    </motion.div>
  );
}