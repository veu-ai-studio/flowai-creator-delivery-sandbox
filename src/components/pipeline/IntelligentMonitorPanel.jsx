import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Loader2, TrendingUp, Zap } from 'lucide-react';

const SEV_STYLES = {
  critical: 'border-red-500/40 bg-red-500/5 text-red-400',
  high:     'border-orange-500/40 bg-orange-500/5 text-orange-400',
  medium:   'border-amber-500/40 bg-amber-500/5 text-amber-400',
  low:      'border-border bg-secondary/20 text-muted-foreground',
};

const PRIORITY_DOT = {
  critical: 'bg-red-400',
  high:     'bg-orange-400',
  medium:   'bg-amber-400',
  low:      'bg-muted-foreground',
};

export default function IntelligentMonitorPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchMonitoring(); }, []);

  const fetchMonitoring = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('intelligentMonitor', {});
      setData(res?.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const score = data?.health_score ?? null;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreRing  = score >= 80 ? 'stroke-emerald-400' : score >= 60 ? 'stroke-amber-400' : 'stroke-red-400';

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Intelligent Monitoring
        </h2>
        <Button size="sm" variant="outline" onClick={fetchMonitoring} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {loading && !data && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing system health...
        </div>
      )}

      {data && (
        <>
          {/* Health Score + Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Score circle */}
            <div className="rounded-lg border border-border bg-secondary/20 p-4 flex flex-col items-center justify-center col-span-2 sm:col-span-1">
              <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" className={scoreRing} strokeWidth="3"
                  strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
              </svg>
              <p className={`text-xl font-bold mt-1 ${scoreColor}`}>{score}</p>
              <p className="text-[10px] text-muted-foreground">Health Score</p>
            </div>

            {[
              { label: 'Success Rate', val: `${data.summary.success_rate}%`, ok: data.summary.success_rate >= 70 },
              { label: 'Active Jobs',  val: data.summary.active_jobs,        ok: true },
              { label: 'Live Deploys', val: data.summary.live_deployments,   ok: true },
            ].map(({ label, val, ok }) => (
              <div key={label} className="rounded-lg border border-border bg-secondary/20 p-4 flex flex-col justify-center">
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className={`text-2xl font-bold ${ok ? 'text-foreground' : 'text-amber-400'}`}>{val}</p>
              </div>
            ))}
          </div>

          {/* Alerts */}
          {data.alerts?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Anomalies Detected ({data.alerts.length})
              </p>
              {data.alerts.map((alert, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className={`rounded-lg border p-3 flex items-start gap-2 text-xs ${SEV_STYLES[alert.severity] || SEV_STYLES.low}`}>
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold uppercase tracking-wide text-[10px]">{alert.severity}</span>
                    <p className="mt-0.5">{alert.message}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {data.alerts?.length === 0 && (
            <div className="flex items-center gap-2 text-emerald-400 text-xs p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4" /> No anomalies detected — system operating normally
            </div>
          )}

          {/* 7-Day Trend Chart */}
          {data.trends?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> 7-Day Run Trends
              </p>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.trends} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
                    <Line type="monotone" dataKey="success" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Success" />
                    <Line type="monotone" dataKey="failed"  stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} name="Failed" />
                    <Line type="monotone" dataKey="runs"    stroke="hsl(var(--chart-1))" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Total" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Insights */}
          {data.insights?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5" /> AI Insights
              </p>
              {data.insights.map((ins, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="rounded-lg border border-border bg-secondary/20 p-3 flex gap-3">
                  <span className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${PRIORITY_DOT[ins.priority] || 'bg-muted-foreground'}`} />
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{ins.title}</p>
                    <p className="text-[11px] text-muted-foreground">{ins.description}</p>
                    {ins.action && <p className="text-[11px] text-primary">→ {ins.action}</p>}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}