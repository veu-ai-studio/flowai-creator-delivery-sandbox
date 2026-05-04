import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';

export default function HistoricalTrendDashboard({ url }) {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const reports = await base44.entities.QAAuditReport.filter({ url }, '-created_date', 20);
        const data = reports.reverse().map((r) => ({
          date: new Date(r.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          overall: r.scores.overall,
          ui_ux: r.scores.ui_ux,
          api: r.scores.api,
          logic: r.scores.logic,
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
        className="rounded-lg border border-border bg-card p-6 flex items-center justify-center min-h-96"
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
        className="rounded-lg border border-border bg-card p-6 text-center min-h-96 flex items-center justify-center"
      >
        <p className="text-muted-foreground text-sm">No historical data yet. Run more audits to see trends.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        Historical Trends ({trends.length} audits)
      </h2>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={trends} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
          <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Legend />
          <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} name="Overall" />
          <Line type="monotone" dataKey="ui_ux" stroke="hsl(var(--chart-1))" strokeWidth={1.5} name="UI/UX" />
          <Line type="monotone" dataKey="api" stroke="hsl(var(--chart-2))" strokeWidth={1.5} name="API" />
          <Line type="monotone" dataKey="logic" stroke="hsl(var(--chart-3))" strokeWidth={1.5} name="Logic" />
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}