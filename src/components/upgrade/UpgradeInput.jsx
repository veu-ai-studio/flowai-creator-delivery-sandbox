import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Globe } from 'lucide-react';

export default function UpgradeInput({
  targetUrl,
  userGoal,
  onUrlChange,
  onGoalChange,
  onSubmit,
  loading,
  currentStep,
  error,
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Product URL</label>
        <input
          type="url"
          value={targetUrl}
          onChange={e => onUrlChange(e.target.value)}
          placeholder="https://example.com"
          className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={loading}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your Goal (optional)</label>
        <textarea
          value={userGoal}
          onChange={e => onGoalChange(e.target.value)}
          placeholder="e.g., improve UX, optimize performance, modern design..."
          className="w-full h-20 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          disabled={loading}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-3 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          onClick={onSubmit}
          disabled={loading || !targetUrl.trim()}
          className="gap-2 flex-1"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {currentStep || 'Processing...'}
            </>
          ) : (
            <>
              <Globe className="h-4 w-4" />
              Upgrade Product
            </>
          )}
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        ℹ FlowAI will audit the original URL, generate an improved version, deploy it, and verify the result.
      </p>
    </motion.div>
  );
}