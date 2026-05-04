import { useState } from 'react';
import { AlertTriangle, Wrench, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SEV = {
  critical: { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/30' },
  high:     { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/30' },
  low:      { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/30' },
};
const TYPE_LABEL = {
  ui_bug: 'UI Bug', backend_failure: 'Backend', data_formatting: 'Data',
  performance: 'Perf', cost_inefficiency: 'Cost', ux_problem: 'UX',
};

function IssueRow({ issue, onHeal, healing, healed }) {
  const [open, setOpen] = useState(false);
  const s = SEV[issue.severity] || SEV.low;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${s.border} ${s.bg}`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${s.text}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{issue.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${s.text} ${s.bg}`}>{issue.severity}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 text-muted-foreground">{TYPE_LABEL[issue.type] || issue.type}</span>
            {issue.auto_fix_eligible && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold">Auto-fix ✓</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">{issue.module}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {healed && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          {!healed && (
            <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1"
              onClick={() => onHeal(issue)} disabled={healing}>
              {healing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wrench className="h-3 w-3" />}
              Heal
            </Button>
          )}
          <button onClick={() => setOpen(o => !o)} className="p-1 text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      {open && (
        <div className="pt-2 border-t border-border/40 space-y-1.5 text-[10px]">
          <p className="text-muted-foreground">{issue.description}</p>
          {issue.suggested_fix && (
            <div className="p-2 rounded bg-secondary/30 border border-border/30">
              <span className="font-semibold text-foreground">Suggested fix: </span>
              <span className="text-muted-foreground">{issue.suggested_fix}</span>
            </div>
          )}
          <p className="text-muted-foreground">Risk: <span className="text-foreground">{issue.risk_level || 'unknown'}</span></p>
        </div>
      )}
    </div>
  );
}

export default function IssueQueue({ issues, onHeal, healingId, healedIds }) {
  if (!issues?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mx-auto mb-2" />
        No issues detected
      </div>
    );
  }

  const sorted = [...issues].sort((a, b) => {
    const s = { critical: 4, high: 3, medium: 2, low: 1 };
    return (s[b.severity] || 0) - (s[a.severity] || 0);
  });

  return (
    <div className="space-y-2">
      {sorted.map((issue, i) => (
        <IssueRow
          key={issue.id || i}
          issue={issue}
          onHeal={onHeal}
          healing={healingId === (issue.id || issue.title)}
          healed={healedIds?.has(issue.id || issue.title)}
        />
      ))}
    </div>
  );
}