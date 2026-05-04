import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, TrendingUp } from 'lucide-react';

export default function IssuePrioritization({ analysis, url }) {
  const [prioritized, setPrioritized] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePrioritize = async () => {
    setLoading(true);
    try {
      // Fetch historical data for this URL
      const history = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 10);
      const res = await base44.functions.invoke('prioritizeIssues', {
        analysis,
        historical_data: history,
      });
      setPrioritized(res.data?.prioritized_issues || []);
    } catch (error) {
      console.error('Prioritization error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Smart Issue Prioritization
        </h2>
        <button
          onClick={handlePrioritize}
          disabled={loading || !analysis}
          className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-medium transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : <Zap className="h-3 w-3 inline mr-1" />}
          {loading ? 'Analyzing...' : 'Auto-Prioritize'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        ML-powered ranking based on layer impact, severity, and historical recurrence.
      </p>

      <AnimatePresence>
        {prioritized && prioritized.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {prioritized.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-3 space-y-1 ${
                  issue.urgent
                    ? 'bg-destructive/10 border-destructive/30'
                    : 'bg-secondary/30 border-border/50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{issue.action}</p>
                    <p className="text-xs text-muted-foreground">{issue.layer}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                      issue.urgent ? 'bg-destructive/20 text-destructive' : 'bg-primary/20 text-primary'
                    }`}>
                      Score: {issue.auto_priority_score}
                    </span>
                    {issue.urgent && (
                      <p className="text-[10px] text-destructive mt-1">URGENT</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}