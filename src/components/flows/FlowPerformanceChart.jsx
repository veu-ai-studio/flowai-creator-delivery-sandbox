import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart2, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { base44 } from '@/api/base44Client';

export default function FlowPerformanceChart({ flowId, flowName }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('duration');

  useEffect(() => {
    base44.entities.FlowRun.filter({ flow_id: flowId }, '-created_date', 20)
      .then(data => { setRuns(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [flowId]);

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  if (runs.length === 0) return <p className="text-xs text-muted-foreground text-center py-4">No run history yet for this flow.</p>;

  const chartData = [...runs].reverse().map((r, i) => ({
    name: `#${i + 1}`,
    duration: Math.round((r.duration_ms || 0) / 1000),
    status: r.status === 'success' ? 1 : 0,
    nodes: r.node_count || 0,
  }));

  const successRate = Math.round((runs.filter(r => r.status === 'success').length / runs.length) * 100);
  const avgDuration = Math.round(runs.reduce((a, r) => a + (r.duration_ms || 0), 0) / runs.length / 1000);
  const lastTwo = runs.slice(0, 2);
  const trend = lastTwo.length === 2 ? (lastTwo[0].duration_ms || 0) - (lastTwo[1].duration_ms || 0) : 0;

  const VIEWS = [
    { key: 'duration', label: 'Duration (s)', dataKey: 'duration', color: 'hsl(var(--primary))' },
    { key: 'nodes', label: 'Nodes Run', dataKey: 'nodes', color: 'hsl(var(--chart-2))' },
  ];
  const activeView = VIEWS.find(v => v.key === view);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Success Rate', value: `${successRate}%`, color: successRate >= 80 ? 'text-emerald-400' : successRate >= 60 ? 'text-amber-400' : 'text-red-400' },
          { label: 'Avg Duration', value: `${avgDuration}s`, color: 'text-foreground' },
          { label: 'Total Runs', value: runs.length, color: 'text-foreground' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-secondary/20 p-2.5 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex gap-1">
        {VIEWS.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={`text-[10px] font-semibold px-2.5 py-1 rounded border transition-all ${view === v.key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="h-32">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
            <Bar dataKey={activeView.dataKey} fill={activeView.color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}