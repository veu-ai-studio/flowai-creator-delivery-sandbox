import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Activity, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';

export default function SiteMonitoringDashboard({ url }) {
  const [alerts, setAlerts] = useState([]);
  const [lastAudit, setLastAudit] = useState(null);
  const [trend, setTrend] = useState(null);

  useEffect(() => {
    const fetchMonitoring = async () => {
      try {
        // Get alert configs
        const alertConfigs = await base44.entities.AlertConfig.filter({ url });
        setAlerts(alertConfigs);

        // Get last audit
        const reports = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 1);
        if (reports.length > 0) {
          setLastAudit(reports[0]);

          // Get trend
          const history = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 5);
          if (history.length > 1) {
            const trend_val = history[0].scores.overall - history[1].scores.overall;
            setTrend(trend_val);
          }
        }
      } catch (error) {
        console.error('Monitoring fetch error:', error);
      }
    };

    if (url) fetchMonitoring();
  }, [url]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary animate-pulse" />
        <h2 className="text-lg font-semibold text-foreground">Real-time Monitoring</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {lastAudit && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Latest Score</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-primary">{lastAudit.scores.overall}/10</div>
            <p className="text-xs text-muted-foreground">Last updated: {new Date(lastAudit.created_date).toLocaleDateString()}</p>
          </motion.div>
        )}

        {trend !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`rounded-lg border p-4 space-y-2 ${
              trend >= 0
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-amber-500/5 border-amber-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Trend</span>
              {trend >= 0 ? (
                <span className="text-emerald-400 text-sm">↑</span>
              ) : (
                <TrendingDown className="h-4 w-4 text-amber-400" />
              )}
            </div>
            <div className={`text-2xl font-bold ${trend >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">vs. previous audit</p>
          </motion.div>
        )}
      </div>

      {alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Active Alerts ({alerts.length})
          </p>
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="text-xs p-2 rounded bg-amber-500/10 border border-amber-500/30 flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-400">
                {alert.triggers.on_critical_issues && 'Critical Issues'}
                {alert.triggers.on_score_drop && 'Score Drop'}
                {alert.triggers.on_audit_complete && 'Digests Enabled'}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}