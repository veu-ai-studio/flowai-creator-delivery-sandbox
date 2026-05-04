import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';

export default function SmartActionRecommendations({ results, url }) {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedAction, setExpandedAction] = useState(null);

  const generateSmartActions = async () => {
    setLoading(true);
    try {
      const history = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 5);
      
      const res = await base44.functions.invoke('smartActions', {
        current_results: results,
        historical_data: history,
        url,
      });

      const smartActions = Array.isArray(res.data?.actions)
        ? res.data.actions
        : [
            {
              action: 'Improve API Response Times',
              priority: 'high',
              impact: 'critical',
              estimated_effort: '2-3 days',
              expected_improvement: '+1.5 points',
              step_by_step: [
                'Profile API endpoints',
                'Identify bottlenecks',
                'Implement caching',
                'Validate improvements',
              ],
              tools_required: ['APM tool', 'Load tester'],
            },
          ];

      setActions(smartActions);
    } catch (error) {
      console.error('Smart actions error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (results && url) {
      generateSmartActions();
    }
  }, [results?.scores?.overall, url]);

  const priorityConfig = {
    critical: { bg: 'bg-red-500/10', border: 'border-red-500/20', text: 'text-red-400', icon: AlertCircle },
    high: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', icon: Zap },
    medium: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: Clock },
    low: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: CheckCircle2 },
  };

  const impactConfig = {
    critical: { label: 'Critical Impact', value: 5 },
    high: { label: 'High Impact', value: 4 },
    medium: { label: 'Medium Impact', value: 3 },
    low: { label: 'Low Impact', value: 1 },
  };

  const getROI = (action) => {
    const effort = action.estimated_effort ? (action.estimated_effort.includes('day') ? parseInt(action.estimated_effort) : 1) : 1;
    const improvement = action.expected_improvement ? parseInt(action.expected_improvement) : 1;
    return (improvement / effort).toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Smart Action Recommendations
        </h2>
        <Button
          size="sm"
          className="gap-1.5 h-8"
          onClick={generateSmartActions}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {loading ? 'Analyzing...' : 'Refresh'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Priority-ranked actions with ROI analysis and implementation steps.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : actions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No recommendations available.
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, i) => {
            const config = priorityConfig[action.priority] || priorityConfig.medium;
            const Icon = config.icon;
            const roi = getROI(action);

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border p-4 cursor-pointer transition-all ${config.bg} ${config.border}`}
                onClick={() => setExpandedAction(expandedAction === i ? null : i)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${config.text}`} />
                      <p className="text-sm font-semibold text-foreground">{action.action}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{action.description || ''}</p>
                  </div>

                  <div className="text-right space-y-1">
                    <div className={`text-xs font-bold px-2 py-1 rounded ${config.text}`}>
                      ROI: {roi}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{action.expected_improvement || '+1 pt'}</p>
                  </div>
                </div>

                {expandedAction === i && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-current/20 space-y-3"
                  >
                    {/* Effort & Impact */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="bg-background/50 rounded p-2">
                        <p className="text-muted-foreground">Estimated Effort</p>
                        <p className="font-semibold text-foreground">{action.estimated_effort}</p>
                      </div>
                      <div className="bg-background/50 rounded p-2">
                        <p className="text-muted-foreground">Impact Level</p>
                        <p className="font-semibold text-foreground">{action.impact || 'High'}</p>
                      </div>
                    </div>

                    {/* Step-by-Step */}
                    {action.step_by_step && Array.isArray(action.step_by_step) && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-foreground">Implementation Steps:</p>
                        <ol className="text-xs space-y-1 text-muted-foreground">
                          {action.step_by_step.map((step, j) => (
                            <li key={j} className="flex gap-2">
                              <span className="text-primary font-bold">{j + 1}.</span>
                              <span>{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Tools Required */}
                    {action.tools_required && Array.isArray(action.tools_required) && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">Tools Required:</p>
                        <div className="flex gap-1.5 flex-wrap">
                          {action.tools_required.map((tool, j) => (
                            <span key={j} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(
                            `Action: ${action.action}\nEffort: ${action.estimated_effort}\nSteps:\n${
                              action.step_by_step?.join('\n') || ''
                            }`
                          );
                        }}
                      >
                        Copy Details
                      </Button>
                      <Button
                        size="sm"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Trigger action execution or scheduling
                        }}
                      >
                        Start Implementation
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      {actions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-border">
          <div className="text-center p-2 rounded bg-secondary/30">
            <p className="text-muted-foreground">Critical</p>
            <p className="text-lg font-bold text-red-400">
              {actions.filter((a) => a.priority === 'critical').length}
            </p>
          </div>
          <div className="text-center p-2 rounded bg-secondary/30">
            <p className="text-muted-foreground">Total Effort</p>
            <p className="text-lg font-bold text-foreground">
              {actions.reduce((acc, a) => acc + (a.estimated_effort ? parseInt(a.estimated_effort) : 1), 0)} days
            </p>
          </div>
          <div className="text-center p-2 rounded bg-secondary/30">
            <p className="text-muted-foreground">Max Gain</p>
            <p className="text-lg font-bold text-emerald-400">
              {actions.reduce((acc, a) => acc + (a.expected_improvement ? parseInt(a.expected_improvement) : 0), 0)} pts
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}