import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Loader2, Zap, TrendingDown, AlertTriangle } from 'lucide-react';

export default function PredictiveIssueMapping({ url, currentResults }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const handlePredictIssues = async () => {
    setLoading(true);
    try {
      const history = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 10);
      const res = await base44.functions.invoke('predictiveAnalysis', {
        current_results: currentResults,
        historical_data: history,
        url,
      });

      setPredictions(res.data?.predictions || []);
    } catch (error) {
      console.error('Predictive analysis error:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentResults && url) {
      handlePredictIssues();
    }
  }, [currentResults?.scores?.overall, url]);

  const getPriorityColor = (confidence) => {
    if (confidence >= 0.8) return 'bg-red-500/10 border-red-500/20 text-red-400';
    if (confidence >= 0.6) return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Predictive Issue Mapping
        </h2>
        <button
          onClick={handlePredictIssues}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin inline mr-1" /> : <Zap className="h-3 w-3 inline mr-1" />}
          {loading ? 'Predicting...' : 'Analyze Patterns'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        ML-powered predictions based on historical patterns and current metrics.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : predictions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No predictions yet. Click "Analyze Patterns" to start.
        </div>
      ) : (
        <div className="space-y-2">
          {predictions.map((pred, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-lg border p-3 cursor-pointer transition-all ${getPriorityColor(pred.confidence)}`}
              onClick={() => setExpanded(expanded === i ? null : i)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{pred.issue_type || 'Potential Issue'}</p>
                  <p className="text-xs opacity-75 mt-0.5">{pred.layer || 'General'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold">
                    {(pred.confidence * 100).toFixed(0)}% confidence
                  </div>
                  <div className="text-[10px] opacity-75 mt-0.5">
                    {pred.likelihood === 'high' && '⚠️ High Risk'}
                    {pred.likelihood === 'medium' && '⚡ Moderate'}
                    {pred.likelihood === 'low' && '✓ Low Risk'}
                  </div>
                </div>
              </div>

              {expanded === i && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-current/20 space-y-2"
                >
                  {pred.description && (
                    <p className="text-xs leading-relaxed">{pred.description}</p>
                  )}
                  {pred.suggested_fix && (
                    <div className="bg-background/50 rounded p-2 text-xs space-y-1">
                      <p className="font-semibold">Suggested Fix:</p>
                      <p>{pred.suggested_fix}</p>
                    </div>
                  )}
                  {pred.affected_component && (
                    <p className="text-xs">
                      <span className="opacity-75">Affected:</span> {pred.affected_component}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {predictions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-border">
          <div className="text-center p-2 rounded bg-secondary/30">
            <p className="text-muted-foreground">Critical</p>
            <p className="text-lg font-bold text-red-400">
              {predictions.filter((p) => p.confidence >= 0.8).length}
            </p>
          </div>
          <div className="text-center p-2 rounded bg-secondary/30">
            <p className="text-muted-foreground">Moderate</p>
            <p className="text-lg font-bold text-amber-400">
              {predictions.filter((p) => p.confidence >= 0.6 && p.confidence < 0.8).length}
            </p>
          </div>
          <div className="text-center p-2 rounded bg-secondary/30">
            <p className="text-muted-foreground">Low Risk</p>
            <p className="text-lg font-bold text-blue-400">
              {predictions.filter((p) => p.confidence < 0.6).length}
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}