import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Loader2 } from 'lucide-react';

export default function TrendAnalysisReports({ url, currentResults }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('overall');

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const reports = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 15);
        const data = reports.reverse().map((r, i) => ({
          run: `Run ${i + 1}`,
          date: new Date(r.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          overall: r.scores.overall || 0,
          ui_ux: r.scores.ui_ux || 0,
          api: r.scores.api || 0,
          logic: r.scores.logic || 0,
          business_value: r.scores.business_value || 0,
        }));
        setTrends(data);
      } catch (error) {
        console.error('Trend fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (url) fetchTrends();
  }, [url]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-6 flex items-center justify-center min-h-80"
      >
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </motion.div>
    );
  }

  if (trends.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-6 text-center min-h-80 flex items-center justify-center"
      >
        <p className="text-muted-foreground text-sm">Run more audits to see trend analysis.</p>
      </motion.div>
    );
  }

  const firstScore = trends[0]?.[selectedMetric] || 0;
  const lastScore = trends[trends.length - 1]?.[selectedMetric] || 0;
  const trend = lastScore - firstScore;
  const trendPercent = ((trend / firstScore) * 100).toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trend Analysis ({trends.length} runs)
        </h2>
      </div>

      {/* Metric Selector */}
      <div className="flex gap-2 flex-wrap">
        {['overall', 'ui_ux', 'api', 'logic', 'business_value'].map((metric) => (
          <button
            key={metric}
            onClick={() => setSelectedMetric(metric)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedMetric === metric
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {metric.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Trend Summary */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={`rounded-lg border p-4 flex items-center justify-between ${
          trend > 0
            ? 'bg-emerald-500/5 border-emerald-500/20'
            : trend < 0
            ? 'bg-red-500/5 border-red-500/20'
            : 'bg-blue-500/5 border-blue-500/20'
        }`}
      >
        <div>
          <p className="text-sm text-muted-foreground">Overall {selectedMetric.replace(/_/g, ' ')} Trend</p>
          <p className="text-2xl font-bold text-foreground">{lastScore.toFixed(1)}/10</p>
        </div>
        <div className="text-right">
          <div className={`flex items-center gap-1 text-lg font-bold ${
            trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-blue-400'
          }`}>
            {trend > 0 ? <TrendingUp className="h-5 w-5" /> : trend < 0 ? <TrendingDown className="h-5 w-5" /> : <span>→</span>}
            {Math.abs(trendPercent)}%
          </div>
          <p className="text-xs text-muted-foreground">vs first run</p>
        </div>
      </motion.div>

      {/* Area Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={trends}>
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
          />
          <Area
            type="monotone"
            dataKey={selectedMetric}
            stroke="hsl(var(--primary))"
            fill="url(#colorGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 text-center">
          <p className="text-muted-foreground">Highest</p>
          <p className="text-lg font-bold text-foreground">
            {Math.max(...trends.map((t) => t[selectedMetric])).toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 text-center">
          <p className="text-muted-foreground">Lowest</p>
          <p className="text-lg font-bold text-foreground">
            {Math.min(...trends.map((t) => t[selectedMetric])).toFixed(1)}
          </p>
        </div>
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3 text-center">
          <p className="text-muted-foreground">Average</p>
          <p className="text-lg font-bold text-foreground">
            {(trends.reduce((acc, t) => acc + t[selectedMetric], 0) / trends.length).toFixed(1)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}