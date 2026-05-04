import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function FixEnginePanel({ fixing, result, error }) {
  if (!fixing && !result && !error) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-6 space-y-4 ${
          result?.success || !error
            ? 'border-emerald-500/40 bg-emerald-500/5'
            : 'border-red-500/40 bg-red-500/5'
        }`}>
        <div className="flex items-center gap-2">
          {fixing ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : error ? (
            <AlertCircle className="h-5 w-5 text-red-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          )}
          <h3 className={`font-bold text-sm`}>
            Phase 4 — Fix Engine {fixing ? 'Running...' : error ? 'Failed' : 'Complete'}
          </h3>
        </div>

        {fixing && (
          <p className="text-xs text-muted-foreground">Auto-fixing critical issues and redeploying...</p>
        )}

        {result && !fixing && (
          <div className="space-y-2 text-xs">
            <p className="text-emerald-400 font-semibold">✓ Fixes applied and redeployed</p>
            {result.new_url && (
              <p className="text-muted-foreground">New URL: <span className="text-primary font-mono">{result.new_url}</span></p>
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