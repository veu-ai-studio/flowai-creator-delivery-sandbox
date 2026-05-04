import { CheckCircle2, Loader2, XCircle, Wrench, TrendingUp, ArrowUpCircle, Search } from 'lucide-react';

const STEP_ICON = { scan: Search, heal: Wrench, optimize: TrendingUp, upgrade: ArrowUpCircle };
const STATUS_CFG = {
  running:   { color: 'text-blue-400',    Icon: Loader2,      spin: true },
  done:      { color: 'text-emerald-400', Icon: CheckCircle2, spin: false },
  healed:    { color: 'text-emerald-400', Icon: CheckCircle2, spin: false },
  accepted:  { color: 'text-emerald-400', Icon: CheckCircle2, spin: false },
  rejected:  { color: 'text-amber-400',  Icon: XCircle,      spin: false },
  rollback:  { color: 'text-amber-400',  Icon: XCircle,      spin: false },
  triggered: { color: 'text-amber-400',  Icon: XCircle,      spin: false },
  complete:  { color: 'text-emerald-400', Icon: CheckCircle2, spin: false },
  stopped_early: { color: 'text-amber-400', Icon: XCircle,   spin: false },
  failed:    { color: 'text-red-400',    Icon: XCircle,      spin: false },
};

// Maps improvementReason to a human label
const REASON_LABEL = {
  score_increase:      { text: 'Score +', color: 'text-emerald-400' },
  insufficient_gain:   { text: 'Insufficient gain', color: 'text-amber-400' },
  rollback_triggered:  { text: 'Rollback', color: 'text-red-400' },
  oversized_patch_rejected: { text: 'Oversized patch', color: 'text-red-400' },
  early_stop_due_to_low_value_iterations: { text: 'Early stop', color: 'text-amber-400' },
};

export default function CycleLog({ log, rejectedPatches, issuesConsidered, issuesSelected, minThreshold, totalUserImpactGained, totalBusinessImpactGained, valueSummary }) {
  if (!log?.length) return null;

  return (
    <div className="space-y-3">
      {/* Rule 21: value summary card */}
      {(totalUserImpactGained != null || totalBusinessImpactGained != null) && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-primary uppercase">Value Delivered This Cycle</p>
          <div className="flex flex-wrap gap-4 text-[11px]">
            <span>User Value Gained: <strong className="text-emerald-400">+{totalUserImpactGained ?? 0}</strong></span>
            <span>Business Value Gained: <strong className="text-blue-400">+{totalBusinessImpactGained ?? 0}</strong></span>
          </div>
          {valueSummary && <p className="text-[10px] text-muted-foreground italic">{valueSummary}</p>}
        </div>
      )}

      {/* Rule 14: summary stats */}
      {(issuesConsidered != null || rejectedPatches?.length > 0) && (
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
          {issuesConsidered != null && <span>Considered: <strong className="text-foreground">{issuesConsidered}</strong></span>}
          {issuesSelected != null && <span>Selected: <strong className="text-emerald-400">{issuesSelected}</strong></span>}
          {rejectedPatches?.length > 0 && <span>Rejected patches: <strong className="text-amber-400">{rejectedPatches.length}</strong></span>}
          {minThreshold != null && <span>Min improvement: <strong className="text-primary">+{minThreshold}</strong></span>}
        </div>
      )}

      <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-1.5">
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Cycle Log</p>
        {log.map((entry, i) => {
          const StepIcon = STEP_ICON[entry.step] || Search;
          const sCfg = STATUS_CFG[entry.status] || { color: 'text-muted-foreground', Icon: Loader2, spin: false };
          const SIcon = sCfg.Icon;
          const reasonCfg = entry.improvementReason ? REASON_LABEL[entry.improvementReason] : null;
          return (
            <div key={i} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
              <StepIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground capitalize font-medium">{entry.step}</span>
              <SIcon className={`h-3.5 w-3.5 ${sCfg.color} shrink-0 ${sCfg.spin ? 'animate-spin' : ''}`} />
              <span className={`font-semibold ${sCfg.color}`}>{entry.status}</span>
              {/* Rule 14: reason label */}
              {reasonCfg && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold bg-secondary/50 ${reasonCfg.color}`}>
                  {reasonCfg.text}{entry.improvement != null ? ` +${entry.improvement}` : ''}
                </span>
              )}
              {entry.issuesConsidered != null && <span className="text-muted-foreground">— {entry.issuesConsidered} considered, {entry.issuesSelected} selected</span>}
              {entry.issues != null && <span className="text-muted-foreground">— {entry.issues} issues</span>}
              {entry.issue && <span className="text-muted-foreground truncate max-w-[140px]">— {entry.issue}</span>}
              {entry.userImpact != null && entry.businessImpact != null && (
                <span className="text-[9px] text-muted-foreground/70">u:{entry.userImpact} b:{entry.businessImpact}</span>
              )}
              {entry.userValueGained != null && (
                <span className="text-[9px] text-emerald-400">+{entry.userValueGained}u +{entry.businessValueGained}b</span>
              )}
              {entry.minRequired != null && entry.delta != null && (
                <span className="text-amber-400/80 text-[9px]">(+{entry.delta} &lt; min {entry.minRequired})</span>
              )}
              {entry.count != null && <span className="text-muted-foreground">— {entry.count} items</span>}
              {entry.version && <span className="text-primary font-mono">{entry.version}</span>}
              <span className="ml-auto text-muted-foreground/50 shrink-0">{new Date(entry.ts).toLocaleTimeString()}</span>
            </div>
          );
        })}
      </div>

      {/* Rejected patches list */}
      {rejectedPatches?.length > 0 && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 space-y-1">
          <p className="text-[10px] font-semibold text-amber-400 uppercase">Rejected Patches ({rejectedPatches.length})</p>
          {rejectedPatches.map((p, i) => (
            <div key={i} className="text-[10px] flex items-center gap-2">
              <span className="text-muted-foreground truncate">{p.issue}</span>
              <span className="text-amber-400/80">— {p.reason?.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}