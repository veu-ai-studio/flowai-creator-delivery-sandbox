import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { asArray, resolveArray } from '@/lib/uiDataGuards';
import { Activity, CheckCircle2, XCircle, Clock, Zap, RefreshCw, Globe, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const STATUS_STYLE = {
  success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  failed:  'text-red-400 bg-red-500/10 border-red-500/30',
  running: 'text-primary bg-primary/10 border-primary/30 animate-pulse',
  queued:  'text-muted-foreground bg-secondary/30 border-border',
};

const STATUS_ICON = {
  success: CheckCircle2,
  failed:  XCircle,
  running: Activity,
  queued:  Clock,
};

function RunCard({ run }) {
  const Icon = STATUS_ICON[run.status] || Clock;
  const style = STATUS_STYLE[run.status] || STATUS_STYLE.queued;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className={`rounded-lg border p-3 flex items-center gap-3 ${style}`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold capitalize truncate">{run.type} run</p>
        <p className="text-[10px] opacity-70 truncate">{run.input?.slice(0, 50) || 'No input'}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[9px] font-mono opacity-60">{new Date(run.created_date).toLocaleTimeString()}</p>
        {run.duration_ms && <p className="text-[9px] opacity-50">{(run.duration_ms / 1000).toFixed(1)}s</p>}
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, sub, color = 'text-foreground' }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function RealtimeDashboard() {
  const [runs, setRuns] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [deployments, setDeployments] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [live, setLive] = useState(true);
  const intervalRef = useRef(null);

  const fetchAll = async () => {
    try {
      const [r, j, e, d] = await Promise.all([
        resolveArray(base44.entities.Run.list('-created_date', 50)),
        resolveArray(base44.entities.Job.list('-created_date', 20)),
        resolveArray(base44.entities.ErrorLog.list('-created_date', 10)),
        resolveArray(base44.entities.Deployment.list('-created_date', 10)),
      ]);
      const safeRuns = asArray(r);
      setRuns(safeRuns);
      setJobs(asArray(j));
      setErrors(asArray(e));
      setDeployments(asArray(d));
      setLastUpdated(new Date());

      // Build hourly trend for last 12 hours
      const now = Date.now();
      const trend = Array.from({ length: 12 }, (_, i) => {
        const hourStart = now - (11 - i) * 3600000;
        const hourEnd = hourStart + 3600000;
        const hourRuns = safeRuns.filter(run => {
          const t = new Date(run.created_date).getTime();
          return t >= hourStart && t < hourEnd;
        });
        return {
          hour: new Date(hourStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          runs: hourRuns.length,
          success: hourRuns.filter(x => x.status === 'success').length,
          failed: hourRuns.filter(x => x.status === 'failed').length,
        };
      });
      setTrendData(trend);
    } catch {}
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    if (live) {
      intervalRef.current = setInterval(fetchAll, 8000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [live]);

  // Real-time subscription to Run entity
  useEffect(() => {
    const unsub = base44.entities.Run.subscribe((event) => {
      if (event.type === 'create') {
        setRuns(prev => event.data ? [event.data, ...asArray(prev)].slice(0, 50) : asArray(prev));
      } else if (event.type === 'update') {
        setRuns(prev => event.data ? asArray(prev).map(r => r.id === event.id ? event.data : r) : asArray(prev));
      }
    });
    return unsub;
  }, []);

  const safeRuns = asArray(runs);
  const safeErrors = asArray(errors);
  const safeDeployments = asArray(deployments);
  const activeRuns = safeRuns.filter(r => r.status === 'running');
  const successRate = safeRuns.length > 0 ? Math.round((safeRuns.filter(r => r.status === 'success').length / safeRuns.length) * 100) : 0;
  const criticalErrors = safeErrors.filter(e => e.severity === 'critical').length;
  const liveDeployments = safeDeployments.filter(d => d.status === 'live').length;

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="h-7 w-7 text-primary" />
            Realtime Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live pipeline activity · auto-refreshes every 8s
            {lastUpdated && <span className="ml-2 opacity-50">· updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLive(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${live ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-secondary/30 border-border text-muted-foreground'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground'}`} />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
          <Button size="sm" variant="outline" onClick={fetchAll} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Active Runs"  value={activeRuns.length}  color="text-primary"      sub="currently running" />
        <StatCard label="Success Rate" value={`${successRate}%`}  color={successRate >= 70 ? 'text-emerald-400' : 'text-amber-400'} sub={`${safeRuns.length} total runs`} />
        <StatCard label="Live Deploys" value={liveDeployments}    color="text-sky-400"      sub="apps deployed" />
        <StatCard label="Crit. Errors" value={criticalErrors}     color={criticalErrors > 0 ? 'text-red-400' : 'text-emerald-400'} sub="last 10 errors" />
      </div>

      {/* 12h Trend Chart */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border bg-card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> 12-Hour Run Activity
        </h2>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', fontSize: 11 }} />
              <Line type="monotone" dataKey="runs"    stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="success" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="Success" />
              <Line type="monotone" dataKey="failed"  stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} name="Failed" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Main Content: Active Runs + Recent Activity side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active/Recent Runs */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Recent Runs
            {activeRuns.length > 0 && (
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{activeRuns.length} ACTIVE</span>
            )}
          </h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            <AnimatePresence>
              {safeRuns.slice(0, 15).map(run => <RunCard key={run.id} run={run} />)}
            </AnimatePresence>
            {safeRuns.length === 0 && <p className="text-xs text-muted-foreground py-8 text-center">No runs yet</p>}
          </div>
        </div>

        {/* Right column: Live Deployments + Recent Errors */}
        <div className="space-y-4">
          {/* Live Deployments */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-sky-400" /> Live Deployments ({liveDeployments})
            </h2>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {safeDeployments.filter(d => d.status === 'live').slice(0, 5).map((d, i) => (
                <a key={i} href={d.live_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs p-2 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="text-primary hover:underline truncate font-mono">{d.live_url || d.slug}</span>
                </a>
              ))}
              {liveDeployments === 0 && <p className="text-xs text-muted-foreground">No live deployments</p>}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" /> Recent Errors ({errors.length})
            </h2>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {safeErrors.slice(0, 5).map((e, i) => (
                <div key={i} className={`rounded-lg border p-2 text-xs ${e.severity === 'critical' ? 'border-red-500/30 bg-red-500/5 text-red-400' : 'border-border bg-secondary/20 text-muted-foreground'}`}>
                  <span className="font-bold uppercase text-[9px]">{e.severity}</span>
                  <p className="truncate">{e.message}</p>
                  <p className="text-[9px] opacity-60">{e.source}</p>
                </div>
              ))}
              {errors.length === 0 && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> No recent errors</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
