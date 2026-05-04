import { DollarSign, Cpu, Send, AlertTriangle } from 'lucide-react';

export default function CostSummary({ costs, summary, mode }) {
  if (!costs) return null;

  const guardrailHit = summary?.abortedByGuardrail;

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${guardrailHit ? 'border-amber-500/40 bg-amber-500/5' : 'border-border bg-card'}`}>
      <div className="flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">Cost Summary</p>
        {guardrailHit && (
          <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-400 font-semibold">
            <AlertTriangle className="h-3 w-3" /> Guardrail triggered
          </span>
        )}
      </div>

      {/* Run-level stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total Cost</p>
          <p className="text-lg font-bold text-primary">${costs.totalCostUsd?.toFixed(5)}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Tokens Used</p>
          <p className="text-lg font-bold text-foreground">{costs.totalTokens?.toLocaleString()}</p>
        </div>
        <div className="p-2.5 rounded-lg bg-secondary/20 border border-border/30 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Deployments</p>
          <p className="text-lg font-bold text-foreground">{costs.deployments}</p>
        </div>
      </div>

      {/* Per-app breakdown */}
      {costs.appCosts && Object.keys(costs.appCosts).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Per-App Breakdown</p>
          <div className="space-y-1">
            {Object.entries(costs.appCosts).map(([name, data]) => (
              <div key={name} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-secondary/20 border border-border/20">
                <span className="text-xs text-foreground font-medium truncate flex-1">{name}</span>
                <div className="flex items-center gap-3 ml-2 shrink-0">
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Cpu className="h-3 w-3" />{data.tokens?.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Send className="h-3 w-3" />{data.deployments}×
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-primary w-16 text-right">
                    ${data.costUsd?.toFixed(5)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/50 text-center">
        LLM costs estimated. Vercel deployments are free-tier (no cost tracked).
      </p>
    </div>
  );
}