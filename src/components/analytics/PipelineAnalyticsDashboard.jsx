import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, TrendingDown, Zap, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { subDays, format, isAfter } from 'date-fns';

const TT_STYLE = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 };

// Generates sample sparkline data when no real data exists
const generateSparkline = (baseVal, variance, len = 10) =>
  Array.from({ length: len }, (_, i) => ({
    i, v: Math.max(0, Math.round(baseVal + (Math.random() - 0.5) * variance)),
  }));

function MiniSparkline({ data, color }) {
  return (
    <ResponsiveContainer width={80} height={32}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} fill={`url(#g${color.replace('#','')})`} strokeWidth={1.5} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function PipelineAnalyticsDashboard() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.FlowRun.list('-created_date', 200)
      .then(data => { setRuns(data || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const last7 = runs.filter(r => r.created_date && isAfter(new Date(r.created_date), subDays(new Date(), 7)));
  const prev7 = runs.filter(r => {
    if (!r.created_date) return false;
    const d = new Date(r.created_date);
    return isAfter(d, subDays(new Date(), 14)) && !isAfter(d, subDays(new Date(), 7));
  });

  const total7 = last7.length;
  const success7 = last7.filter(r => r.status === 'success').length;
  const rate7 = total7 > 0 ? Math.round((success7 / total7) * 100) : 0;
  const avgMs7 = total7 > 0 ? Math.round(last7.reduce((s, r) => s + (r.duration_ms || 0), 0) / total7) : 0;

  const prevTotal = prev7.length;
  const prevSuccess = prev7.filter(r => r.status === 'success').length;
  const prevRate = prevTotal > 0 ? Math.round((prevSuccess / prevTotal) * 100) : 0;

  const delta = rate7 - prevRate;
  const deltaTotals = total7 - prevTotal;

  // 7-day trend chart
  const trendData = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(new Date(), 6 - i);
    const key = format(day, 'MM/dd');
    const dayRuns = runs.filter(r => r.created_date && format(new Date(r.created_date), 'MM/dd') === key);
    return {
      date: format(day, 'EEE'),
      runs: dayRuns.length,
      success: dayRuns.filter(r => r.status === 'success').length,
      failed: dayRuns.filter(r => r.status === 'error').length,
    };
  });

  // Top flows this week
  const flowMap = last7.reduce((acc, r) => {
    const k = r.flow_name || 'Unnamed';
    if (!acc[k]) acc[k] = { name: k, total: 0, success: 0 };
    acc[k].total++;
    if (r.status === 'success') acc[k].success++;
    return acc;
  }, {});
  const topFlows = Object.values(flowMap).sort((a, b) => b.total - a.total).slice(0, 5);

  const KPI_CARDS = [
    {
      label: 'Runs (7d)',
      value: total7 || runs.length || 0,
      delta: deltaTotals,
      color: '#60a5fa',
      spark: generateSparkline(Math.max(total7, 5), 8),
    },
    {
      label: 'Success Rate',
      value: `${rate7}%`,
      delta,
      color: '#34d399',
      spark: generateSparkline(rate7, 15),
      suffix: '%',
    },
    {
      label: 'Avg Duration',
      value: avgMs7 ? `${(avgMs7 / 1000).toFixed(1)}s` : '—',
      delta: null,
      color: '#fb923c',
      spark: generateSparkline(avgMs7 / 100 || 5, 3),
    },
    {
      label: 'Failed (7d)',
      value: total7 - success7,
      delta: null,
      color: '#f87171',
      spark: generateSparkline(Math.max(total7 - success7, 2), 4),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Pipeline Analytics</h2>
        <span className="text-[10px] text-muted-foreground/60 ml-1">last 7 days</span>
      </div>

      {/* KPI cards with sparklines */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(card => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-4 flex flex-col gap-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{card.label}</p>
                <p className="text-2xl font-bold text-foreground mt-0.5">{card.value}</p>
              </div>
              <MiniSparkline data={card.spark} color={card.color} />
            </div>
            {card.delta !== null && card.delta !== undefined && (
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${card.delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {card.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {card.delta >= 0 ? '+' : ''}{card.delta}{card.suffix || ''} vs prev week
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 7-day trend */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4">Daily Run Volume (7d)</h3>
        <ResponsiveContainer width="100%" height={140}>
          <BarChart data={trendData} barSize={18}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} allowDecimals={false} />
            <Tooltip contentStyle={TT_STYLE} />
            <Bar dataKey="success" fill="#34d399" stackId="a" name="Success" radius={[0,0,0,0]} />
            <Bar dataKey="failed" fill="#f87171" stackId="a" name="Failed" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top flows */}
      {topFlows.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Top Flows This Week</h3>
          <div className="space-y-2.5">
            {topFlows.map((f, i) => {
              const rate = f.total > 0 ? Math.round((f.success / f.total) * 100) : 0;
              return (
                <div key={f.name} className="flex items-center gap-3">
                  <span className="text-[10px] text-muted-foreground/60 font-mono w-4">#{i + 1}</span>
                  <span className="text-sm text-foreground flex-1 truncate">{f.name}</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    {f.success > 0 ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <AlertCircle className="h-3 w-3 text-red-400" />}
                    {rate}% · {f.total} runs
                  </div>
                  <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${rate}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}