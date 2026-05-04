import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifierPanel({ verifying, report }) {
  if (!verifying && !report) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-6 space-y-4 ${
          report?.passed
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-amber-500/40 bg-amber-500/5'
        }`}>
        <div className="flex items-center gap-2">
          {verifying ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : report?.passed ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-amber-400" />
          )}
          <h3 className={`font-bold text-sm ${
            report?.passed ? 'text-emerald-400' : 'text-amber-400'
          }`}>
            Phase 3 — Verifier Engine {verifying ? 'Running...' : report?.passed ? 'PASSED ✓' : 'FAILED ✗'}
          </h3>
        </div>

        {verifying && (
          <p className="text-xs text-muted-foreground">Verifying deployment status and health checks...</p>
        )}

        {report && !verifying && (
          <div className="space-y-2 text-xs">
            {report.failure_reasons?.map((reason, i) => (
              <p key={i} className="text-amber-400">• {reason}</p>
            ))}
            {report.passed && (
              <p className="text-emerald-400">✓ All verification checks passed</p>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}