import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export default function CrossRunComparison({ runHistory }) {
  const [comparisonMode, setComparisonMode] = useState('scores');

  if (!runHistory || runHistory.length < 2) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-border bg-card p-6 text-center text-muted-foreground"
      >
        <p className="text-sm">Run at least 2 audits to see cross-run comparisons.</p>
      </motion.div>
    );
  }

  const chartData = runHistory.map((run, i) => ({
    run: `Run ${i + 1}`,
    overall: run.scores.overall || 0,
    ui_ux: run.scores.ui_ux || 0,
    api: run.scores.api || 0,
    logic: run.scores.logic || 0,
  }));

  const comparisonData = runHistory.slice(-2).map((run) => ({
    overall: run.scores.overall || 0,
    ui_ux: run.scores.ui_ux || 0,
    api: run.scores.api || 0,
    logic: run.scores.logic || 0,
  }));

  const deltaScores = {
    overall: (comparisonData[1]?.overall || 0) - (comparisonData[0]?.overall || 0),
    ui_ux: (comparisonData[1]?.ui_ux || 0) - (comparisonData[0]?.ui_ux || 0),
    api: (comparisonData[1]?.api || 0) - (comparisonData[0]?.api || 0),
    logic: (comparisonData[1]?.logic || 0) - (comparisonData[0]?.logic || 0),
  };

  const getDeltaColor = (delta) => {
    if (delta > 0) return 'text-emerald-400';
    if (delta < 0) return 'text-red-400';
    return 'text-blue-400';
  };

  const getDeltaIcon = (delta) => {
    if (delta > 0) return <ArrowUp className="h-3.5 w-3.5" />;
    if (delta < 0) return <ArrowDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Cross-Run Comparison</h2>
        <div className="flex gap-2">
          {['scores', 'timeline'].map((mode) => (
            <button
              key={mode}
              onClick={() => setComparisonMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                comparisonMode === mode
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {comparisonMode === 'scores' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Delta Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(deltaScores).map(([layer, delta]) => (
              <motion.div
                key={layer}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`rounded-lg border p-3 space-y-1 ${
                  delta > 0
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : delta < 0
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-blue-500/5 border-blue-500/20'
                }`}
              >
                <p className="text-xs text-muted-foreground capitalize">{layer.replace(/_/g, ' ')}</p>
                <div className="flex items-center gap-1.5">
                  <span className={`text-lg font-bold ${getDeltaColor(delta)}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                  <span className={getDeltaColor(delta)}>{getDeltaIcon(delta)}</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {delta > 0 ? '✓ Improved' : delta < 0 ? '⚠ Declined' : '→ No change'}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Comparison Bar Chart */}
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                {
                  name: `Run ${runHistory.length - 1}`,
                  ...comparisonData[0],
                },
                {
                  name: `Run ${runHistory.length}`,
                  ...comparisonData[1],
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Bar dataKey="overall" fill="hsl(var(--primary))" name="Overall" />
              <Bar dataKey="ui_ux" fill="hsl(var(--chart-1))" name="UI/UX" />
              <Bar dataKey="api" fill="hsl(var(--chart-2))" name="API" />
              <Bar dataKey="logic" fill="hsl(var(--chart-3))" name="Logic" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {comparisonMode === 'timeline' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="run" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="overall" stroke="hsl(var(--primary))" strokeWidth={2} name="Overall" />
              <Line type="monotone" dataKey="ui_ux" stroke="hsl(var(--chart-1))" strokeWidth={1.5} name="UI/UX" />
              <Line type="monotone" dataKey="api" stroke="hsl(var(--chart-2))" strokeWidth={1.5} name="API" />
              <Line type="monotone" dataKey="logic" stroke="hsl(var(--chart-3))" strokeWidth={1.5} name="Logic" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </motion.div>
  );
}