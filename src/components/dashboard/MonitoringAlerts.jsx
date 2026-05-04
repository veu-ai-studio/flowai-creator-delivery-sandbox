import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertTriangle, CheckCircle2, TrendingDown, Bell, X, Loader2, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

function deriveAlerts(runs) {
  const alerts = [];
  if (!runs.length) return alerts;

  // Last 10 runs error rate
  const recent = runs.slice(0, 10);
  const recentErrors = recent.filter((r) => r.status === "error").length;
  if (recentErrors >= 3) {
    alerts.push({
      id: "high-error-rate",
      severity: "error",
      title: "High Error Rate",
      message: `${recentErrors} of last 10 runs failed. Check your flow configurations.`,
      time: runs[0]?.created_date,
    });
  }

  // Consecutive failures per flow
  const byFlow = runs.reduce((acc, r) => {
    if (!acc[r.flow_name]) acc[r.flow_name] = [];
    acc[r.flow_name].push(r);
    return acc;
  }, {});
  Object.entries(byFlow).forEach(([flowName, flowRuns]) => {
    const last3 = flowRuns.slice(0, 3);
    if (last3.length === 3 && last3.every((r) => r.status === "error")) {
      alerts.push({
        id: `consec-fail-${flowName}`,
        severity: "error",
        title: "Consecutive Failures",
        message: `"${flowName}" has failed 3 runs in a row.`,
        time: last3[0]?.created_date,
      });
    }
  });

  // Slow runs (>10s)
  const slowRuns = runs.filter((r) => r.duration_ms > 10000);
  if (slowRuns.length > 0) {
    alerts.push({
      id: "slow-runs",
      severity: "warning",
      title: "Slow Executions",
      message: `${slowRuns.length} run${slowRuns.length > 1 ? "s" : ""} exceeded 10 seconds. Consider optimising AI prompts.`,
      time: slowRuns[0]?.created_date,
    });
  }

  // All good
  if (alerts.length === 0 && runs.length > 0) {
    alerts.push({
      id: "all-good",
      severity: "success",
      title: "All Systems Healthy",
      message: "No issues detected in recent runs.",
      time: runs[0]?.created_date,
    });
  }

  return alerts;
}

export default function MonitoringAlerts() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchRuns = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    const data = await base44.entities.FlowRun.list("-created_date", 50).catch(() => []);
    setRuns(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(() => fetchRuns(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  const allAlerts = deriveAlerts(runs).filter((a) => !dismissed.has(a.id));
  const errorCount = allAlerts.filter((a) => a.severity === "error").length;

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading alerts…</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-4 w-4 text-primary" />
            {errorCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-destructive rounded-full text-[8px] text-white flex items-center justify-center font-bold">
                {errorCount}
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground">Monitoring Alerts</h3>
        </div>
        <button
          onClick={() => fetchRuns(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          disabled={refreshing}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {runs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No run data yet. Run a flow to start monitoring.</p>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {allAlerts.map((alert) => {
              const isError = alert.severity === "error";
              const isWarn = alert.severity === "warning";
              const isOk = alert.severity === "success";
              return (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className={`flex items-start gap-3 rounded-lg border p-3 ${
                    isError ? "bg-destructive/8 border-destructive/25" :
                    isWarn ? "bg-amber-500/8 border-amber-500/25" :
                    "bg-emerald-500/8 border-emerald-500/25"
                  }`}
                >
                  {isError ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> :
                   isWarn ? <TrendingDown className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> :
                   <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${isError ? "text-destructive" : isWarn ? "text-amber-400" : "text-emerald-400"}`}>
                      {alert.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.message}</p>
                    {alert.time && (
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {formatDistanceToNow(new Date(alert.time), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  {alert.severity !== "success" && (
                    <button
                      onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
                      className="text-muted-foreground/50 hover:text-muted-foreground shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Recent run summary */}
      {runs.length > 0 && (
        <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{runs.length} total runs tracked</span>
          <span>{runs.filter((r) => r.status === "success").length} successful · {runs.filter((r) => r.status === "error").length} failed</span>
        </div>
      )}
    </div>
  );
}