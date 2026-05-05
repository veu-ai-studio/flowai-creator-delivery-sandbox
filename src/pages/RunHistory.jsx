import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp,
  Loader2, History, Trash2, RefreshCw, Search, Play,
  BarChart2, Zap, TrendingUp, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow, format } from "date-fns";

const STATUS_STYLES = {
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  error: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  partial: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
};

function RunRow({ run, onDelete, onRerun }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUS_STYLES[run.status] || STATUS_STYLES.partial;
  const Icon = s.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="rounded-xl border border-border bg-card overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-accent/30 transition-colors"
      >
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium shrink-0 ${s.bg} ${s.color}`}>
          <Icon className="h-3 w-3" />
          {run.status}
        </span>
        <span className="text-sm font-medium text-foreground flex-1 truncate">{run.flow_name}</span>
        {run.duration_ms != null && (
          <span className="text-xs text-muted-foreground shrink-0">{(run.duration_ms / 1000).toFixed(2)}s</span>
        )}
        <span className="text-xs text-muted-foreground/60 shrink-0 hidden sm:block">
          {run.created_date ? format(new Date(run.created_date), "MMM d, HH:mm") : ""}
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-border pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground mb-1">Flow ID</p>
              <p className="font-mono text-foreground truncate">{run.flow_id || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Nodes Executed</p>
              <p className="text-foreground">{run.node_count ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">Duration</p>
              <p className="text-foreground">{run.duration_ms != null ? `${(run.duration_ms / 1000).toFixed(2)}s` : "—"}</p>
            </div>
          </div>

          {run.input_preview && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Input Preview</p>
              <pre className="text-xs bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap text-foreground/80 max-h-24 overflow-y-auto">{run.input_preview}</pre>
            </div>
          )}
          {run.output_preview && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Output Preview</p>
              <pre className="text-xs bg-secondary/50 rounded-lg p-3 whitespace-pre-wrap text-foreground/80 max-h-24 overflow-y-auto">{run.output_preview}</pre>
            </div>
          )}
          {run.error_message && (
            <div>
              <p className="text-xs text-red-400 mb-1">Error</p>
              <pre className="text-xs bg-destructive/10 rounded-lg p-3 whitespace-pre-wrap text-red-400 max-h-24 overflow-y-auto">{run.error_message}</pre>
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            {run.flow_id && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary" onClick={() => onRerun(run)}>
                <Play className="h-3 w-3" />
                Re-run Flow
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-destructive gap-1.5 ml-auto"
              onClick={() => onDelete(run.id)}
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFlow, setFilterFlow] = useState("all");
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    const [runsData, flowsData] = await Promise.all([
      base44.entities.FlowRun.list("-created_date", 500).catch(() => []),
      base44.entities.SavedFlow.list("-updated_date", 200).catch(() => []),
    ]);
    setRuns(runsData);
    setFlows(flowsData);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    await base44.entities.FlowRun.delete(id);
    setRuns((prev) => prev.filter((r) => r.id !== id));
  };

  const handleRerun = async (run) => {
    // Find the saved flow and navigate to run it
    const flow = flows.find((f) => f.id === run.flow_id);
    if (flow) {
      navigate("/run-flow", {
        state: { nodes: flow.nodes, edges: flow.edges, variables: flow.variables || [], flowName: flow.name, flowId: flow.id },
      });
    }
  };

  // Stats
  const stats = useMemo(() => {
    const total = runs.length;
    const successes = runs.filter((r) => r.status === "success").length;
    const errors = runs.filter((r) => r.status === "error").length;
    const durations = runs.filter((r) => r.duration_ms != null).map((r) => r.duration_ms);
    const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const successRate = total ? Math.round((successes / total) * 100) : 0;
    return { total, successes, errors, avgDuration, successRate };
  }, [runs]);

  // Unique flow names for filter
  const uniqueFlows = useMemo(() => {
    const map = {};
    runs.forEach((r) => { if (r.flow_id && r.flow_name) map[r.flow_id] = r.flow_name; });
    return Object.entries(map).map(([id, name]) => ({ id, name }));
  }, [runs]);

  // Filtering
  const filtered = useMemo(() => {
    return runs.filter((r) => {
      if (filterStatus !== "all" && r.status !== filterStatus) return false;
      if (filterFlow !== "all" && r.flow_id !== filterFlow) return false;
      if (search && !r.flow_name?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [runs, filterStatus, filterFlow, search]);

  const statuses = ["all", "success", "error", "partial"];

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Flow History</h1>
          </div>
          <p className="mt-1 text-muted-foreground text-sm">
            {runs.length} run{runs.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Stats cards */}
      {!loading && runs.length > 0 && (
        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { label: "Total Runs", value: stats.total, icon: BarChart2, color: "text-primary", bg: "bg-primary/10" },
            { label: "Success Rate", value: `${stats.successRate}%`, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Errors", value: stats.errors, icon: XCircle, color: "text-red-400", bg: "bg-red-400/10" },
            { label: "Avg Duration", value: `${(stats.avgDuration / 1000).toFixed(1)}s`, icon: Zap, color: "text-amber-400", bg: "bg-amber-400/10" },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div>
                <p className={`text-lg font-semibold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                filterStatus === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {s}
              {s !== "all" && (
                <span className="ml-1.5 opacity-60">({runs.filter((r) => r.status === s).length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Flow filter */}
        {uniqueFlows.length > 1 && (
          <select
            value={filterFlow}
            onChange={(e) => setFilterFlow(e.target.value)}
            className="h-8 text-xs bg-card border border-border rounded-lg px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Flows</option>
            {uniqueFlows.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        )}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search flows…"
            className="h-8 pl-8 text-xs w-44 bg-card"
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 min-h-[240px] flex flex-col items-center justify-center gap-3 py-12">
            <History className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">
              {search || filterStatus !== 'all' ? 'No runs match your filters' : 'No runs recorded yet'}
            </p>
            <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
              {search || filterStatus !== 'all'
                ? 'Try clearing the search or changing the status filter.'
                : 'Run a flow from the Auto Runner or Workspace to see execution history here.'}
            </p>
            {(search || filterStatus !== 'all') && (
              <button onClick={() => { setSearch(''); setFilterStatus('all'); }}
                className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors">
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((run) => (
              <RunRow key={run.id} run={run} onDelete={handleDelete} onRerun={handleRerun} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}