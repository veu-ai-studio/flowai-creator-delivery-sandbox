import { useState } from 'react';
import { CheckCircle2, XCircle, ChevronDown, Wrench } from 'lucide-react';

function HealEntry({ entry }) {
  const [open, setOpen] = useState(false);
  const passed = entry.healed || entry.retest?.passed;

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${passed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
      <div className="flex items-center gap-2">
        {passed ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-foreground">{entry.fix?.title || entry.issue?.title || 'Fix'}</p>
          <p className="text-[10px] text-muted-foreground">{entry.issue?.module} · {new Date(entry.timestamp).toLocaleTimeString()}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {passed ? 'HEALED' : 'FAILED'}
          </span>
          {entry.retest?.confidence != null && (
            <span className="text-[9px] text-muted-foreground">{entry.retest.confidence}% conf.</span>
          )}
          <button onClick={() => setOpen(o => !o)} className="text-muted-foreground hover:text-foreground p-1">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div className="pt-2 border-t border-border/40 space-y-2 text-[10px]">
          {/* Before / After */}
          {(entry.fix?.before_state || entry.fix?.after_state) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="font-semibold text-red-400 mb-0.5">Before</p>
                <p className="text-muted-foreground">{entry.fix.before_state}</p>
              </div>
              <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                <p className="font-semibold text-emerald-400 mb-0.5">After</p>
                <p className="text-muted-foreground">{entry.fix.after_state}</p>
              </div>
            </div>
          )}
          {/* Fix description */}
          {entry.fix?.description && <p className="text-muted-foreground">{entry.fix.description}</p>}
          {/* Code changes */}
          {entry.fix?.code_changes?.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Code Changes</p>
              {entry.fix.code_changes.map((c, i) => (
                <div key={i} className="p-2 rounded bg-secondary/30 border border-border/20">
                  <p className="font-mono text-muted-foreground">{c.file}</p>
                  <p className="text-foreground mt-0.5">{c.description}</p>
                  {c.after && <pre className="mt-1 text-[9px] text-primary font-mono whitespace-pre-wrap max-h-20 overflow-y-auto">{c.after}</pre>}
                </div>
              ))}
            </div>
          )}
          {/* Retest results */}
          {entry.retest?.test_results?.length > 0 && (
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Retest Results</p>
              {entry.retest.test_results.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  {t.passed ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" /> : <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                  <span className="text-muted-foreground">{t.check}: <span className="text-foreground">{t.details}</span></span>
                </div>
              ))}
            </div>
          )}
          {/* Rollback plan */}
          {entry.fix?.rollback_plan && (
            <p className="text-amber-400">↩ Rollback: {entry.fix.rollback_plan}</p>
          )}
          {entry.fix?.estimated_improvement && (
            <p className="text-emerald-400 font-semibold">↑ {entry.fix.estimated_improvement}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function HealLog({ entries }) {
  if (!entries?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Wrench className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
        No healing actions yet
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {entries.map((e, i) => <HealEntry key={i} entry={e} />)}
    </div>
  );
}