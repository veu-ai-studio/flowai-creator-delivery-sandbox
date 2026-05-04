import { useState } from 'react';
import { ArrowUpCircle, ChevronDown, CheckCircle2, RotateCcw } from 'lucide-react';

const CAT_COLOR = {
  prompt: 'text-blue-400', validation: 'text-amber-400', ui: 'text-purple-400',
  backend: 'text-emerald-400', orchestration: 'text-primary', cost_control: 'text-orange-400',
};
const RISK_BG = {
  low: 'bg-emerald-500/20 text-emerald-400',
  medium: 'bg-amber-500/20 text-amber-400',
  high: 'bg-red-500/20 text-red-400',
};

function UpgradeEntry({ upgrade, version }) {
  const [open, setOpen] = useState(false);
  const isApplied = upgrade.status === 'applied' || upgrade.status === 'validated';

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${isApplied ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/20'}`}>
      <div className="flex items-start gap-2">
        <ArrowUpCircle className={`h-4 w-4 shrink-0 mt-0.5 ${CAT_COLOR[upgrade.category] || 'text-primary'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {version && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-bold">{version}</span>}
            <span className="text-xs font-bold text-foreground">{upgrade.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${RISK_BG[upgrade.risk_level] || 'bg-secondary text-muted-foreground'}`}>
              {upgrade.risk_level} risk
            </span>
            {upgrade.auto_applicable && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">Auto</span>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{upgrade.category?.replace(/_/g, ' ')}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[9px] font-bold ${isApplied ? 'text-emerald-400' : 'text-muted-foreground'}`}>
            {upgrade.status || 'proposed'}
          </span>
          <button onClick={() => setOpen(o => !o)} className="p-1 text-muted-foreground hover:text-foreground">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="pt-2 border-t border-border/40 space-y-2 text-[10px]">
          <p className="text-muted-foreground">{upgrade.description}</p>
          {upgrade.changes?.length > 0 && (
            <div>
              <p className="font-semibold text-foreground mb-1">Changes</p>
              {upgrade.changes.map((c, i) => <p key={i} className="text-muted-foreground">• {c}</p>)}
            </div>
          )}
          {upgrade.validation_criteria?.length > 0 && (
            <div>
              <p className="font-semibold text-foreground mb-1">Validation Criteria</p>
              {upgrade.validation_criteria.map((c, i) => (
                <div key={i} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                  <span className="text-muted-foreground">{c}</span>
                </div>
              ))}
            </div>
          )}
          {upgrade.rollback_steps?.length > 0 && (
            <div>
              <p className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                <RotateCcw className="h-3 w-3" /> Rollback Steps
              </p>
              {upgrade.rollback_steps.map((s, i) => <p key={i} className="text-muted-foreground">• {s}</p>)}
            </div>
          )}
          {upgrade.estimated_impact && (
            <p className="text-primary font-semibold">Impact: {upgrade.estimated_impact}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function UpgradeHistory({ upgrades, versionTag, summary, timestamp }) {
  if (!upgrades?.length) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No upgrades yet — run Self-Upgrade or Full Cycle</div>;
  }

  return (
    <div className="space-y-4">
      {(versionTag || summary) && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
          {versionTag && <p className="text-xs font-mono text-primary font-bold mb-1">Version: {versionTag}</p>}
          {summary && <p className="text-[11px] text-muted-foreground">{summary}</p>}
          {timestamp && <p className="text-[9px] text-muted-foreground/50 mt-1">{new Date(timestamp).toLocaleString()}</p>}
        </div>
      )}
      <div className="space-y-2">
        {upgrades.map((u, i) => (
          <UpgradeEntry key={u.id || i} upgrade={u} version={versionTag} />
        ))}
      </div>
    </div>
  );
}