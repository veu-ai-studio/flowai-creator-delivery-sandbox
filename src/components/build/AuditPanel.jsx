import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function AuditPanel({ auditing, report, error }) {
  if (!auditing && !report && !error) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-6 space-y-4 ${
          report?.scores?.overall >= 80
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-amber-500/40 bg-amber-500/5'
        }`}>
        <div className="flex items-center gap-2">
          {auditing ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : report?.scores?.overall >= 80 ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400" />
          )}
          <h3 className={`font-bold text-sm`}>
            Phase 4 — Audit Engine {auditing ? 'Running...' : 'Complete'}
          </h3>
        </div>

        {auditing && (
          <p className="text-xs text-muted-foreground">Auditing deployed app across all dimensions...</p>
        )}

        {report && !auditing && (
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
                <p className="text-muted-foreground">Overall Score</p>
                <p className="text-lg font-bold text-primary">{report.scores?.overall || 0}</p>
              </div>
              <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
                <p className="text-muted-foreground">Critical Issues</p>
                <p className="text-lg font-bold text-amber-400">{report.summary?.critical || 0}</p>
              </div>
            </div>
            {report.recommendations?.length > 0 && (
              <div>
                <p className="font-semibold text-foreground mb-1">Recommendations:</p>
                {report.recommendations.slice(0, 3).map((rec, i) => (
                  <p key={i} className="text-muted-foreground">• {rec}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400">Error: {error}</p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}