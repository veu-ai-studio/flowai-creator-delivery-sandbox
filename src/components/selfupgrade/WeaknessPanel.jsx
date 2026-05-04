import { motion } from 'framer-motion';
import { AlertTriangle, XCircle, Info } from 'lucide-react';

const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', label: 'Critical' },
  warning:  { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'Warning' },
  info:     { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', label: 'Info' },
};

export default function WeaknessPanel({ weaknesses }) {
  if (!weaknesses) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          Detected Weaknesses
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
          weaknesses.length === 0 ? 'bg-emerald-500/10 text-emerald-400' :
          weaknesses.some(w => w.severity === 'critical') ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'
        }`}>
          {weaknesses.length === 0 ? 'No issues' : `${weaknesses.length} found`}
        </span>
      </div>

      {weaknesses.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-sm text-emerald-400 font-semibold">✓ No weaknesses detected</p>
          <p className="text-xs text-muted-foreground mt-1">All tools are performing within expected ranges</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weaknesses.map((w, i) => {
            const cfg = SEVERITY_CONFIG[w.severity] || SEVERITY_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className={`rounded-lg border p-4 space-y-2 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{w.capability} · {w.tool_name}</span>
                    </div>
                    <p className="text-xs text-foreground mt-1">{w.detail}</p>
                    {w.errors?.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {w.errors.map((e, j) => (
                          <p key={j} className="text-[10px] font-mono text-muted-foreground/70 truncate">↳ {e}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}