import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Activity, Zap, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function StatCard({ label, value, sub, icon: Icon, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function CostUsage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cost-summary');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const sessions = data?.sessions || [];
  const thisMonth = data?.this_month_cost ?? null;
  const activeSessions = data?.active_sessions ?? null;
  const avgCost = data?.avg_cost_per_session ?? null;

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> Cost &amp; Usage Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">FlowAI token usage and cost breakdown by session</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </motion.div>

      {/* Stat Cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="This Month"
          value={thisMonth != null ? `$${Number(thisMonth).toFixed(2)}` : loading ? '…' : '—'}
          sub="Total spend since month start"
          icon={DollarSign}
          color="text-primary"
          bg="bg-primary/10"
        />
        <StatCard
          label="Active Sessions"
          value={activeSessions != null ? activeSessions : loading ? '…' : '—'}
          sub="Currently running or paused"
          icon={Activity}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />
        <StatCard
          label="Avg Cost / Session"
          value={avgCost != null ? `$${Number(avgCost).toFixed(3)}` : loading ? '…' : '—'}
          sub="Across all completed sessions"
          icon={Zap}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Session Log</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Could not load cost data</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-[10px] text-muted-foreground/60">Waiting for backend developer to deploy <code className="font-mono">/api/cost-summary</code></p>
            <Button size="sm" variant="outline" onClick={fetchData} className="mt-2 gap-1.5 text-xs h-8">
              <RefreshCw className="h-3 w-3" /> Retry
            </Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No session records yet</p>
            <p className="text-xs text-muted-foreground/60">Cost data will appear here after your first completed session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Session ID</th>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-right px-4 py-3 font-semibold">Steps Run</th>
                  <th className="text-right px-4 py-3 font-semibold">Tokens Used</th>
                  <th className="text-right px-5 py-3 font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.session_id || i}
                    className="border-b border-border/50 hover:bg-secondary/20 transition-colors last:border-0">
                    <td className="px-5 py-3 text-muted-foreground">
                      {s.date ? format(new Date(s.date), 'MMM d, HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-primary/80 truncate max-w-[120px]">
                      {s.session_id ? s.session_id.slice(0, 12) + '…' : '—'}
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium truncate max-w-[140px]">
                      {s.product || '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">{s.steps_run ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-foreground">
                      {s.tokens_used != null ? Number(s.tokens_used).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-400">
                      {s.cost != null ? `$${Number(s.cost).toFixed(4)}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </div>
  );
}