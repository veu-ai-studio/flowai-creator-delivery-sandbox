import { useEffect, useState, useMemo } from "react";
import BlockUsageDashboard from "@/components/analytics/BlockUsageDashboard";
import PipelineAnalyticsDashboard from "@/components/analytics/PipelineAnalyticsDashboard";
import { base44 } from "@/api/base44Client";
import { asArray, resolveArray } from "@/lib/uiDataGuards";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, Legend, AreaChart, Area,
} from "recharts";
import { motion } from "framer-motion";
import {
  BarChart2, CheckCircle2, AlertCircle, Clock, TrendingUp, Loader2,
  RefreshCw, Zap, Award, GitBranch, Activity, Layers
} from "lucide-react";
import { formatDistanceToNow, format, subDays, isAfter } from "date-fns";
import { Button } from "@/components/ui/button";

const STATUS_COLORS = { success: "#34d399", error: "#f87171", partial: "#fbbf24" };
const DATE_RANGES = [
  { label: "7d",  days: 7 },
  { label: "14d", days: 14 },
  { label: "30d", days: 30 },
  { label: "All", days: null },
];

const Tooltip_STYLE = { background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 };

export default function Analytics() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState(14);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRuns = async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    const data = await resolveArray(base44.entities.FlowRun.list("-created_date", 500));
    setRuns(data);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { fetchRuns(); }, []);

  const filtered = useMemo(() => {
    const safeRuns = asArray(runs);
    if (!rangeDays) return safeRuns;
    const cutoff = subDays(new Date(), rangeDays);
    return safeRuns.filter((r) => r.created_date && isAfter(new Date(r.created_date), cutoff));
  }, [runs, rangeDays]);

  const total = filtered.length;
  const successes = filtered.filter((r) => r.status === "success").length;
  const errors = filtered.filter((r) => r.status === "error").length;
  const successRate = total > 0 ? Math.round((successes / total) * 100) : 0;
  const avgDuration = total > 0 ? Math.round(filtered.reduce((s, r) => s + (r.duration_ms || 0), 0) / total) : 0;

  // Runs over time
  const days = rangeDays || 30;
  const timeData = Array.from({ length: Math.min(days, 30) }, (_, i) => {
    const d = subDays(new Date(), days - 1 - Math.floor(i * (days / Math.min(days, 30))));
    const key = format(d, "MM/dd");
    const dayRuns = filtered.filter((r) => r.created_date && format(new Date(r.created_date), "MM/dd") === key);
    return {
      date: key,
      success: dayRuns.filter((r) => r.status === "success").length,
      error: dayRuns.filter((r) => r.status === "error").length,
    };
  });

  // Runs per flow
  const flowMap = filtered.reduce((acc, r) => {
    if (!acc[r.flow_name]) acc[r.flow_name] = { name: r.flow_name, total: 0, success: 0, error: 0, totalMs: 0, count: 0 };
    acc[r.flow_name].total++;
    if (r.status === "success") acc[r.flow_name].success++;
    if (r.status === "error") acc[r.flow_name].error++;
    if (r.duration_ms) { acc[r.flow_name].totalMs += r.duration_ms; acc[r.flow_name].count++; }
    return acc;
  }, {});
  const flowData = Object.values(flowMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8)
    .map((f) => ({ ...f, name: f.name.length > 14 ? f.name.slice(0, 13) + "…" : f.name, avgMs: f.count ? Math.round(f.totalMs / f.count) : 0 }));

  // Status pie
  const statusData = [
    { name: "Success", value: successes, color: STATUS_COLORS.success },
    { name: "Error", value: errors, color: STATUS_COLORS.error },
    { name: "Partial", value: filtered.filter((r) => r.status === "partial").length, color: STATUS_COLORS.partial },
  ].filter((d) => d.value > 0);

  // Top errors
  const errorRuns = filtered.filter((r) => r.status === "error" && r.error_message);
  const errorCounts = Object.entries(
    errorRuns.reduce((acc, r) => { const k = r.error_message.slice(0, 60); acc[k] = (acc[k] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const statCards = [
    { label: "Total Runs", value: total, icon: TrendingUp, color: "text-primary", sub: `in ${rangeDays ? `last ${rangeDays}d` : "all time"}` },
    { label: "Success Rate", value: `${successRate}%`, icon: Award, color: successRate >= 80 ? "text-emerald-400" : successRate >= 50 ? "text-amber-400" : "text-red-400", sub: `${successes} of ${total}` },
    { label: "Failed Runs", value: errors, icon: AlertCircle, color: "text-red-400", sub: errors > 0 ? "needs attention" : "all good" },
    { label: "Avg Duration", value: avgDuration ? `${(avgDuration / 1000).toFixed(1)}s` : "—", icon: Clock, color: "text-amber-400", sub: "per execution" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Date range */}
            <div className="flex items-center gap-1 bg-secondary/50 rounded-lg p-0.5">
              {DATE_RANGES.map(({ label, days }) => (
                <button
                  key={label}
                  onClick={() => setRangeDays(days)}
                  className={`px-3 py-1 text-xs rounded-md font-medium transition-colors ${
                    rangeDays === days ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => fetchRuns(true)} disabled={refreshing}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">Flow execution history and performance metrics.</p>
      </motion.div>

      {/* Stat cards */}
      <motion.div className="grid grid-cols-2 lg:grid-cols-4 gap-4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        {statCards.map(({ label, value, icon: StatIcon, color, sub }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <StatIcon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
              {sub && <p className="text-[10px] text-muted-foreground/60 mt-0.5">{sub}</p>}
            </div>
          </div>
        ))}
      </motion.div>

      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 min-h-[200px] flex items-center justify-center">
          <div className="text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No run data for this period.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Run a flow or expand the date range.</p>
          </div>
        </div>
      ) : (
        <motion.div className="grid grid-cols-1 lg:grid-cols-2 gap-6" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>

          {/* Stacked area chart — success vs error over time */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">Execution Volume Over Time</h3>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={timeData}>
                <defs>
                  <linearGradient id="aGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="eGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <Tooltip contentStyle={Tooltip_STYLE} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="success" stroke="#34d399" fill="url(#aGrad)" strokeWidth={2} dot={false} name="Success" />
                <Area type="monotone" dataKey="error" stroke="#f87171" fill="url(#eGrad)" strokeWidth={2} dot={false} name="Error" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Runs by flow */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Runs by Flow</h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={flowData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={80} />
                <Tooltip contentStyle={Tooltip_STYLE} />
                <Bar dataKey="success" fill="#34d399" stackId="a" radius={[0, 0, 0, 0]} name="Success" />
                <Bar dataKey="error" fill="#f87171" stackId="a" radius={[0, 4, 4, 0]} name="Error" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status pie */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Status Distribution</h3>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={62} paddingAngle={2}>
                    {statusData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={Tooltip_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {statusData.map((d) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
                      <span className="text-muted-foreground flex-1">{d.name}</span>
                      <span className="font-semibold text-foreground">{d.value}</span>
                      <span className="text-muted-foreground/60">{total > 0 ? Math.round((d.value / total) * 100) : 0}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Avg duration per flow */}
          {flowData.some((f) => f.avgMs > 0) && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4">Avg Duration by Flow</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={flowData.filter((f) => f.avgMs > 0)}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="ms" />
                  <Tooltip contentStyle={Tooltip_STYLE} formatter={(v) => [`${(Number(v) / 1000).toFixed(2)}s`, "Avg Duration"]} />
                  <Bar dataKey="avgMs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Avg ms" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top errors */}
          {errorCounts.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-red-400" /> Top Errors
              </h3>
              <div className="space-y-2">
                {errorCounts.map(([msg, count]) => (
                  <div key={msg} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 bg-red-500/10 text-red-400 border border-red-500/20 rounded px-1.5 py-0.5 font-mono font-semibold min-w-[28px] text-center">
                      {count}×
                    </span>
                    <span className="text-muted-foreground truncate">{msg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Per-flow drilldown */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Flow Performance Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left pb-2 font-medium">Flow</th>
                    <th className="text-right pb-2 font-medium">Runs</th>
                    <th className="text-right pb-2 font-medium">Success</th>
                    <th className="text-right pb-2 font-medium">Errors</th>
                    <th className="text-right pb-2 font-medium">Rate</th>
                    <th className="text-right pb-2 font-medium">Avg Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {Object.values(flowMap).sort((a, b) => b.total - a.total).map((f) => {
                    const rate = f.total > 0 ? Math.round((f.success / f.total) * 100) : 0;
                    return (
                      <tr key={f.name} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-2 pr-4 font-medium text-foreground max-w-[160px] truncate">{f.name}</td>
                        <td className="py-2 text-right text-muted-foreground">{f.total}</td>
                        <td className="py-2 text-right text-emerald-400">{f.success}</td>
                        <td className="py-2 text-right text-red-400">{f.error}</td>
                        <td className="py-2 text-right">
                          <span className={`font-semibold ${rate >= 80 ? "text-emerald-400" : rate >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="py-2 text-right text-muted-foreground">
                          {f.count > 0 ? `${(f.totalMs / f.count / 1000).toFixed(1)}s` : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent runs */}
          <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Recent Runs</h3>
            </div>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
              {filtered.slice(0, 30).map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-xs py-1 border-b border-border/30 last:border-0">
                  {r.status === "success"
                    ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                    : r.status === "partial"
                    ? <Zap className="h-3 w-3 text-amber-400 shrink-0" />
                    : <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />}
                  <span className="text-foreground font-medium truncate flex-1">{r.flow_name}</span>
                  {r.input_preview && <span className="text-muted-foreground/50 truncate max-w-[200px] hidden lg:block">{r.input_preview}</span>}
                  {r.duration_ms && <span className="text-muted-foreground shrink-0">{(r.duration_ms / 1000).toFixed(1)}s</span>}
                  <span className="text-muted-foreground/50 shrink-0">
                    {r.created_date ? formatDistanceToNow(new Date(r.created_date), { addSuffix: true }) : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {/* Pipeline Analytics Dashboard */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <PipelineAnalyticsDashboard />
      </motion.div>

      {/* Block Usage Dashboard */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Block Usage</h2>
        </div>
        <BlockUsageDashboard />
      </motion.div>
    </div>
  );
}
