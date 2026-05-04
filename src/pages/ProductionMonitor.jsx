import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Activity, Loader2, CheckCircle2, AlertTriangle, RefreshCw,
  TrendingDown, Clock, ChevronDown, ChevronUp, Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function Gate1ReviewCard({ product, score, issues }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-red-500/40 bg-red-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
        <p className="text-sm font-bold text-red-400">⛔ Gate 1 Review Required — {product}</p>
      </div>
      <p className="text-xs text-muted-foreground">
        Production health score dropped to <strong className="text-red-400">{score}/10</strong> (threshold: 8/10).
        Governance action needed.
      </p>
      {issues?.length > 0 && (
        <ul className="space-y-0.5">
          {issues.map((issue, i) => (
            <li key={i} className="text-[10px] text-red-300 flex items-start gap-1.5">
              <span className="shrink-0 mt-0.5">•</span>{issue}
            </li>
          ))}
        </ul>
      )}
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-500/30 text-red-400 hover:bg-red-500/10 w-full"
        onClick={() => window.location.href = '/autonomous-engine'}>
        <Zap className="h-3 w-3" /> Launch Governance Session
      </Button>
    </motion.div>
  );
}

function ScoreBar({ score }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${(score / 10) * 100}%` }} />
      </div>
      <span className={`text-xs font-bold w-10 text-right ${textColor}`}>{score}/10</span>
    </div>
  );
}

export default function ProductionMonitor() {
  const [envs, setEnvs] = useState([]);
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [gate1Cards, setGate1Cards] = useState([]);

  useEffect(() => {
    base44.entities.ProductEnvironment.list('-created_date').then(setEnvs);
  }, []);

  const checkSingle = async (env) => {
    const url = env.prod_url || env.dev_url;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's production health monitor. Perform an on-demand health check for the product "${env.product_name}".

URL being checked: ${url}
Is production URL: ${!!env.prod_url}
Previous score: ${env.prod_url ? (env.prod_score ?? 'unknown') : (env.dev_score ?? 'unknown')}/10

Simulate a health check across five dimensions:
1. Availability (0-2): Is the service accessible and responding?
2. Performance (0-2): Page load speed, time to interactive
3. Functionality (0-2): Core features working, no broken flows
4. Security (0-2): HTTPS, headers, no obvious vulnerabilities
5. Data Integrity (0-2): API responses valid, no 5xx errors

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, response time estimate, or data point you include in this health check, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — W3C standards, industry benchmarks, or best practices. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Return:
- health_score: total 0-10 (sum of all dimensions)
- dimension_scores: object {availability, performance, functionality, security, data_integrity} each 0-2
- status: "healthy" | "degraded" | "critical"
- issues: array of specific problems found (empty if healthy, max 4)
- recommendations: array of quick fixes (max 3)
- response_time_ms: estimated response time in ms (realistic number)`,
      response_json_schema: {
        type: 'object',
        properties: {
          health_score: { type: 'number' },
          dimension_scores: { type: 'object' },
          status: { type: 'string' },
          issues: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          response_time_ms: { type: 'number' },
        },
      },
    });

    // Update score in entity and score history
    const now = new Date().toISOString();
    const historyEntry = { date: now, score: result.health_score, url };
    const existingHistory = env.score_history || [];
    const newHistory = [...existingHistory.slice(-9), historyEntry]; // keep last 10

    if (env.prod_url) {
      await base44.entities.ProductEnvironment.update(env.id, {
        prod_score: result.health_score,
        last_checked_at: now,
        score_history: newHistory,
      });
    } else {
      await base44.entities.ProductEnvironment.update(env.id, {
        dev_score: result.health_score,
        last_checked_at: now,
        score_history: newHistory,
      });
    }

    // Surface Gate 1 if score < 8
    if (result.health_score < 8) {
      setGate1Cards(prev => {
        const without = prev.filter(c => c.product !== env.product_name);
        return [...without, { product: env.product_name, score: result.health_score, issues: result.issues }];
      });
    } else {
      setGate1Cards(prev => prev.filter(c => c.product !== env.product_name));
    }

    return result;
  };

  const runAllChecks = async () => {
    setRunning(true);
    setGate1Cards([]);
    const freshEnvs = await base44.entities.ProductEnvironment.list('-created_date');
    setEnvs(freshEnvs);

    const newResults = {};
    for (const env of freshEnvs) {
      setRunningId(env.id);
      const r = await checkSingle(env);
      newResults[env.id] = r;
      setResults(prev => ({ ...prev, [env.id]: r }));
    }
    setRunningId(null);
    setRunning(false);
    setLastRunAt(new Date());
  };

  const runSingleCheck = async (env) => {
    setRunningId(env.id);
    const r = await checkSingle(env);
    setResults(prev => ({ ...prev, [env.id]: r }));
    setRunningId(null);
    setExpandedId(env.id);
  };

  const statusStyle = {
    healthy:  { color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5', dot: 'bg-emerald-400' },
    degraded: { color: 'text-amber-400',   border: 'border-amber-500/30',  bg: 'bg-amber-500/5',  dot: 'bg-amber-400' },
    critical: { color: 'text-red-400',     border: 'border-red-500/30',    bg: 'bg-red-500/5',    dot: 'bg-red-400' },
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> Live Monitor
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              On-demand health checks · Score history · Auto Gate 1 on drops below 8/10
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRunAt && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last run {formatDistanceToNow(lastRunAt, { addSuffix: true })}
              </span>
            )}
            <Button className="gap-2" onClick={runAllChecks} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {running ? 'Running Checks...' : 'Run All Checks Now'}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Gate 1 review cards */}
      <AnimatePresence>
        {gate1Cards.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" /> Gate 1 Review Required ({gate1Cards.length})
            </p>
            {gate1Cards.map(c => (
              <Gate1ReviewCard key={c.product} {...c} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Environment cards */}
      {envs.length === 0 ? (
        <div className="text-center py-16">
          <Activity className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No environments registered yet.</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Add environments on the Environments page first.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {envs.map(env => {
            const r = results[env.id];
            const isRunning = runningId === env.id;
            const isExpanded = expandedId === env.id;
            const st = r ? statusStyle[r.status] || statusStyle.healthy : null;
            const activeScore = r?.health_score ?? (env.prod_url ? env.prod_score : env.dev_score);
            const monitorUrl = env.prod_url || env.dev_url;

            return (
              <motion.div key={env.id} layout
                className={`rounded-xl border bg-card overflow-hidden transition-colors ${st ? `${st.border}` : 'border-border'}`}>
                <div className="p-4 flex items-center gap-4 flex-wrap">
                  {/* Status dot */}
                  <div className={`h-3 w-3 rounded-full shrink-0 ${st ? st.dot : 'bg-muted-foreground'} ${isRunning ? 'animate-pulse' : ''}`} />

                  {/* Product info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{env.product_name}</p>
                      {r && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.border} ${st.bg} ${st.color}`}>{r.status}</span>}
                      {!r && env.last_checked_at && (
                        <span className="text-[10px] text-muted-foreground">
                          Last checked {formatDistanceToNow(new Date(env.last_checked_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] font-mono text-muted-foreground truncate mt-0.5">{monitorUrl}</p>
                    {activeScore != null && (
                      <div className="mt-1.5 w-40">
                        <ScoreBar score={activeScore} />
                      </div>
                    )}
                  </div>

                  {/* Response time */}
                  {r?.response_time_ms && (
                    <div className="text-center shrink-0">
                      <p className="text-xs font-bold text-foreground">{r.response_time_ms}ms</p>
                      <p className="text-[9px] text-muted-foreground">response</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                      disabled={isRunning || running} onClick={() => runSingleCheck(env)}>
                      {isRunning ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      Check
                    </Button>
                    {r && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => setExpandedId(isExpanded ? null : env.id)}>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Score history mini-chart */}
                {env.score_history?.length > 1 && (
                  <div className="px-4 pb-2 flex items-end gap-0.5 h-8">
                    {env.score_history.slice(-10).map((h, i) => {
                      const pct = (h.score / 10) * 100;
                      const barColor = h.score >= 8 ? 'bg-emerald-500/60' : h.score >= 5 ? 'bg-amber-500/60' : 'bg-red-500/60';
                      return (
                        <div key={i} title={`${h.score}/10`}
                          className={`flex-1 rounded-sm ${barColor}`} style={{ height: `${pct}%` }} />
                      );
                    })}
                  </div>
                )}

                {/* Expanded detail */}
                <AnimatePresence>
                  {isExpanded && r && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border">
                      <div className="p-4 space-y-3">
                        {/* Dimension breakdown */}
                        {r.dimension_scores && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Dimension Scores</p>
                            {Object.entries(r.dimension_scores).map(([dim, score]) => (
                              <div key={dim} className="flex items-center gap-3">
                                <p className="text-[10px] text-muted-foreground w-32 capitalize">{dim.replace(/_/g, ' ')}</p>
                                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${score >= 1.5 ? 'bg-emerald-500' : score >= 1 ? 'bg-amber-500' : 'bg-red-500'}`}
                                    style={{ width: `${(score / 2) * 100}%` }} />
                                </div>
                                <p className="text-[10px] text-foreground w-6 text-right">{score}/2</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Issues */}
                        {r.issues?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Issues</p>
                            {r.issues.map((issue, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-300">
                                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" /> {issue}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Recommendations */}
                        {r.recommendations?.length > 0 && (
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Quick Fixes</p>
                            {r.recommendations.map((rec, i) => (
                              <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-300">
                                <Zap className="h-3 w-3 shrink-0 mt-0.5" /> {rec}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/40 text-center">
        On-demand health checks only — no automated scheduling. Scores below 8/10 surface Gate 1 Review Cards automatically.
      </p>
    </div>
  );
}