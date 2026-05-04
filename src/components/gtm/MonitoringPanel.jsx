import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { BarChart2, CheckCircle2, XCircle, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';

const SEV_COLORS = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low: 'text-muted-foreground bg-secondary/30 border-border',
};

export default function MonitoringPanel({ user, onStatus, status }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checks, setChecks] = useState([]);

  useEffect(() => { if (user) fetchHealth(); }, [user]);

  const fetchHealth = async () => {
    setLoading(true);
    const results = [];
    try {
      const res = await base44.functions.invoke('systemHealth', {});
      const h = res?.data;
      setHealth(h);
      results.push({ label: 'Health endpoint responds', pass: !!h });
      results.push({ label: 'Run stats tracked', pass: typeof h?.run_stats?.total === 'number' });
      results.push({ label: 'Job stats tracked', pass: typeof h?.job_stats?.total === 'number' });
      results.push({ label: 'Error logs visible', pass: Array.isArray(h?.recent_errors) });
      results.push({ label: 'Deployment log visible', pass: Array.isArray(h?.recent_deployments) });
      setChecks(results);
      onStatus(results.every(r => r.pass) ? 'active' : 'failed');
    } catch (e) {
      results.push({ label: 'Monitoring error: ' + e.message, pass: false });
      setChecks(results);
      onStatus('failed');
    } finally { setLoading(false); }
  };

  const systemOk = health?.status === 'healthy';

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-emerald-400" />
          Phase F — Monitoring
        </h2>
        {status === 'active' && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">MONITORING ACTIVE</span>}
      </div>

      {/* System Health Status */}
      {health && (
        <div className={`rounded-lg border p-4 flex items-center gap-3 ${systemOk ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
          {systemOk ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 text-red-400" />}
          <div>
            <p className={`text-sm font-bold ${systemOk ? 'text-emerald-400' : 'text-red-400'}`}>System {health.status?.toUpperCase()}</p>
            <p className="text-xs text-muted-foreground">
              Runs: {health.run_stats?.success}/{health.run_stats?.total} success · Jobs: {health.job_stats?.done} done · Errors: {health.error_stats?.critical} critical
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {health && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Runs', val: health.run_stats?.total ?? '–' },
            { label: 'Failed Runs', val: health.run_stats?.failed ?? '–' },
            { label: 'Jobs Done', val: health.job_stats?.done ?? '–' },
            { label: 'Critical Errors', val: health.error_stats?.critical ?? '–' },
          ].map(({ label, val }) => (
            <div key={label} className="rounded-lg bg-secondary/30 border border-border p-3 text-center">
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-xl font-bold text-foreground">{val}</p>
            </div>
          ))}
        </div>
      )}

      <Button size="sm" onClick={fetchHealth} disabled={loading || !user} className="gap-1.5">
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        Refresh Health
      </Button>

      {checks.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/30 border border-border/30">
          {c.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
          <span className={c.pass ? 'text-foreground' : 'text-red-400'}>{c.label}</span>
        </motion.div>
      ))}

      {/* Recent Errors */}
      {health?.recent_errors?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Errors</p>
          {health.recent_errors.map((e, i) => (
            <div key={i} className={`rounded border p-2 text-xs ${SEV_COLORS[e.severity] || SEV_COLORS.low}`}>
              <span className="font-semibold">[{e.severity?.toUpperCase()}]</span> <span className="font-mono">{e.source}</span>: {e.message}
            </div>
          ))}
        </div>
      )}

      <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 pt-2 border-t border-border">
        <p>• Errors tracked with severity: critical · high · medium · low</p>
        <p>• Execution time, pipeline failures, deployment logs visible</p>
      </div>
    </div>
  );
}