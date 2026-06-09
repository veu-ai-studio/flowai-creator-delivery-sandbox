import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen, GitBranch, Play, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import MonitoringAlerts from "@/components/dashboard/MonitoringAlerts";
import RealtimeLogs from "@/components/dashboard/RealtimeLogs";
import QuickTemplates from "@/components/dashboard/QuickTemplates";
import { asArray, resolveArray } from "@/lib/uiDataGuards";

export default function Dashboard() {
  const [stats, setStats] = useState({ flows: 0, runsToday: 0, totalBlocks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [flows, runs] = await Promise.all([
        resolveArray(base44.entities.SavedFlow.list("-updated_date", 200)),
        resolveArray(base44.entities.FlowRun.list("-created_date", 200)),
      ]);
      const safeFlows = asArray(flows);
      const safeRuns = asArray(runs);
      const today = new Date().toDateString();
      const runsToday = safeRuns.filter((r) => r.created_date && new Date(r.created_date).toDateString() === today).length;
      const totalBlocks = safeFlows.reduce((s, f) => s + (f.nodes?.length || 0), 0);
      setStats({ flows: safeFlows.length, runsToday, totalBlocks });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const statCards = [
    { label: "Total Flows", value: stats.flows, icon: GitBranch },
    { label: "Runs Today", value: stats.runsToday, icon: Play },
    { label: "Active Blocks", value: stats.totalBlocks, icon: Zap },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">FlowAI Dashboard</h1>
        <p className="mt-2 text-muted-foreground text-sm">Build, run, and manage your AI automation flows.</p>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {statCards.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              {loading
                ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                : <p className="text-2xl font-semibold text-foreground">{value}</p>}
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <MonitoringAlerts />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <RealtimeLogs />
        <QuickTemplates />
      </motion.div>

      <motion.div
        className="flex flex-wrap gap-3"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Link to="/flow-designer">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Create New Flow
          </Button>
        </Link>
        <Link to="/flows">
          <Button variant="secondary" size="lg" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            View Flows
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
