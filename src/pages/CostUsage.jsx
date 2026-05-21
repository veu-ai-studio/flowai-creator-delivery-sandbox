import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, Activity, Zap, Loader2, RefreshCw, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell } from 'recharts';

const VEU_PRODUCTS = ['SAIGE', 'PressAI', 'ReachSMS', 'RelTwin', 'MyPregLife'];
const PROVIDERS = ['Anthropic', 'OpenAI', 'Voyage AI', 'Vercel', 'Replit'];

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
  const [productFilter, setProductFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('flowai_budgets') || '{}'); } catch { return {}; }
  });

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

  const sessions = (data?.sessions || []).filter(s => {
    const matchProduct = productFilter === 'all' || (s.product || '').toLowerCase().includes(productFilter.toLowerCase());
    const matchProvider = providerFilter === 'all' || (s.provider || '').toLowerCase().includes(providerFilter.toLowerCase());
    return matchProduct && matchProvider;
  });

  const thisMonth = data?.this_month_cost ?? null;
  const activeSessions = data?.active_sessions ?? null;
  const avgCost = data?.avg_cost_per_session ?? null;

  // Build chart data from sessions
  const costByProduct = VEU_PRODUCTS.map(name => ({
    name,
    cost: sessions.filter(s => (s.product || '').toLowerCase().includes(name.toLowerCase()))
      .reduce((sum, s) => sum + (s.cost || 0), 0),
  }));

  const saveBudget = (product, value) => {
    const next = { ...budgets, [product]: value };
    setBudgets(next);
    localStorage.setItem('flowai_budgets', JSON.stringify(next));
  };

  const exportCSV = async () => {
    try {
      const res = await fetch('/api/cost/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'flowai-cost-export.csv'; a.click();
        URL.revokeObjectURL(url);
      }
    } catch {}
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <DollarSign className="h-7 w-7 text-primary" /> Cost &amp; Usage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Token usage and cost breakdown across all products and providers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={exportCSV}>
            <Download className="h-3 w-3" /> Export CSV
          </Button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="This Month" value={thisMonth != null ? `$${Number(thisMonth).toFixed(2)}` : loading ? '…' : '—'} sub="Total spend since month start" icon={DollarSign} />
        <StatCard label="Active Sessions" value={activeSessions != null ? activeSessions : loading ? '…' : '—'} sub="Currently running or paused" icon={Activity} color="text-emerald-400" bg="bg-emerald-400/10" />
        <StatCard label="Avg Cost / Session" value={avgCost != null ? `$${Number(avgCost).toFixed(3)}` : loading ? '…' : '—'} sub="Across all completed sessions" icon={Zap} color="text-amber-400" bg="bg-amber-400/10" />
      </motion.div>

      {/* Cost by Product Chart */}
      {!loading && !error && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Cost by Product (this month)</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={costByProduct} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <ReTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }}
                formatter={(v) => [`$${v.toFixed(4)}`, 'Cost']} />
              <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                {costByProduct.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" opacity={0.7 + i * 0.06} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select value={productFilter} onChange={e => setProductFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Products</option>
          {VEU_PRODUCTS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Providers</option>
          {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {(productFilter !== 'all' || providerFilter !== 'all') && (
          <button onClick={() => { setProductFilter('all'); setProviderFilter('all'); }}
            className="text-xs text-primary hover:text-primary/80 px-2 font-semibold">Clear Filters</button>
        )}
      </div>

      {/* Session Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
        className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Session Log</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm font-semibold text-red-400">Could not load cost data</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-[10px] text-muted-foreground/60">Waiting for backend to deploy <code className="font-mono">/api/cost-summary</code></p>
            <Button size="sm" variant="outline" onClick={fetchData} className="mt-1 gap-1.5 text-xs h-8"><RefreshCw className="h-3 w-3" /> Retry</Button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <DollarSign className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm font-semibold text-muted-foreground">No session records yet</p>
            <p className="text-xs text-muted-foreground/60">Cost data will appear here after your first completed session.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-secondary/20">
                  <th className="text-left px-5 py-3 font-semibold">Date</th>
                  <th className="text-left px-4 py-3 font-semibold">Session</th>
                  <th className="text-left px-4 py-3 font-semibold">Product</th>
                  <th className="text-left px-4 py-3 font-semibold">Provider</th>
                  <th className="text-right px-4 py-3 font-semibold">Steps</th>
                  <th className="text-right px-4 py-3 font-semibold">Tokens</th>
                  <th className="text-right px-5 py-3 font-semibold">Cost</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s, i) => (
                  <tr key={s.session_id || i} className="border-b border-border/50 hover:bg-secondary/20 transition-colors last:border-0">
                    <td className="px-5 py-3 text-muted-foreground">{s.date ? format(new Date(s.date), 'MMM d, HH:mm') : '—'}</td>
                    <td className="px-4 py-3 font-mono text-primary/80 truncate max-w-[100px]">{s.session_id ? s.session_id.slice(0, 10) + '…' : '—'}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{s.product || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.provider || '—'}</td>
                    <td className="px-4 py-3 text-right text-foreground">{s.steps_run ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-foreground">{s.tokens_used != null ? Number(s.tokens_used).toLocaleString() : '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-emerald-400">{s.cost != null ? `$${Number(s.cost).toFixed(4)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Budget Alerts Panel */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Budget Alerts (per product / month)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {VEU_PRODUCTS.map(product => {
            const budget = budgets[product] || '';
            const spent = sessions.filter(s => (s.product || '').toLowerCase().includes(product.toLowerCase())).reduce((sum, s) => sum + (s.cost || 0), 0);
            const over = budget && spent > Number(budget);
            return (
              <div key={product} className={`rounded-lg border p-3 space-y-2 ${over ? 'border-red-500/30 bg-red-500/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-foreground">{product}</p>
                  {over && <span className="text-[9px] text-red-400 font-bold">OVER BUDGET</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">Budget $</span>
                  <input type="number" value={budget} onChange={e => saveBudget(product, e.target.value)}
                    placeholder="—"
                    className="flex-1 h-6 text-xs rounded border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                </div>
                <p className="text-[10px] text-muted-foreground">Spent: <span className={`font-semibold ${over ? 'text-red-400' : 'text-foreground'}`}>${spent.toFixed(4)}</span></p>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}