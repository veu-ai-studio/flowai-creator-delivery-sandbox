import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity } from 'lucide-react';

export default function InteractiveAuditDashboard({ results, url }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!results) return null;

  const issuesByLayer = Object.entries(results.issues || {}).map(([layer, issues]) => ({
    layer: layer.replace(/_/g, ' '),
    count: Array.isArray(issues) ? issues.length : 0,
  }));

  const scoreDistribution = [
    { name: 'UI/UX', value: results.scores.ui_ux || 0, fill: '#3b82f6' },
    { name: 'API', value: results.scores.api || 0, fill: '#8b5cf6' },
    { name: 'Logic', value: results.scores.logic || 0, fill: '#10b981' },
    { name: 'Business Value', value: results.scores.business_value || 0, fill: '#f59e0b' },
  ];

  const overallHealthColor = results.scores.overall >= 7 ? '#10b981' : results.scores.overall >= 5 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center gap-2 mb-6">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold text-foreground">Interactive Audit Dashboard</h2>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1"
        >
          <p className="text-xs text-muted-foreground">Overall Score</p>
          <p className="text-2xl font-bold text-primary">{results.scores.overall}/10</p>
          <p className={`text-xs font-semibold ${overallHealthColor === '#10b981' ? 'text-emerald-400' : overallHealthColor === '#f59e0b' ? 'text-amber-400' : 'text-red-400'}`}>
            {results.scores.overall >= 7 ? '✓ Healthy' : results.scores.overall >= 5 ? '⚠ Fair' : '✗ Critical'}
          </p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3 space-y-1"
        >
          <p className="text-xs text-muted-foreground">Total Issues</p>
          <p className="text-2xl font-bold text-amber-400">
            {Object.values(results.issues || {}).reduce((acc, issues) => acc + (Array.isArray(issues) ? issues.length : 0), 0)}
          </p>
          <p className="text-xs text-amber-400/70">Across all layers</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-1"
        >
          <p className="text-xs text-muted-foreground">Recommendations</p>
          <p className="text-2xl font-bold text-emerald-400">{results.recommendations?.length || 0}</p>
          <p className="text-xs text-emerald-400/70">Action items</p>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15 }}
          className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3 space-y-1"
        >
          <p className="text-xs text-muted-foreground">Top Layer</p>
          <p className="text-lg font-bold text-blue-400">
            {Object.entries(results.scores)
              .filter(([k]) => k !== 'overall')
              .sort((a, b) => b[1] - a[1])[0]?.[0]
              .replace(/_/g, ' ') || 'N/A'}
          </p>
          <p className="text-xs text-blue-400/70">
            {Object.entries(results.scores)
              .filter(([k]) => k !== 'overall')
              .sort((a, b) => b[1] - a[1])[0]?.[1]}/10
          </p>
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border pt-4">
        {['overview', 'comparison', 'issues'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Layer Scores Bar Chart */}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Layer Performance</p>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart
                  data={Object.entries(results.scores)
                    .filter(([k]) => k !== 'overall')
                    .map(([layer, score]) => ({
                      layer: layer.replace(/_/g, ' '),
                      score,
                    }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="layer" stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                  <YAxis domain={[0, 10]} stroke="hsl(var(--muted-foreground))" style={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution Pie */}
            <div className="rounded-lg border border-border bg-secondary/30 p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Score Distribution</p>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={scoreDistribution} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} dataKey="value">
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        )}

        {activeTab === 'comparison' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <p className="text-sm text-muted-foreground">Layer Performance Comparison</p>
            {issuesByLayer.map((layer, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-medium">{layer.layer}</span>
                  <span className="text-muted-foreground">{layer.count} issue{layer.count !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((layer.count / 10) * 100, 100)}%` }}
                    transition={{ delay: i * 0.1 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-red-500"
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'issues' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
            {Object.entries(results.issues || {}).map(([layer, issues]) =>
              Array.isArray(issues) && issues.length > 0 ? (
                <div key={layer} className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-1">
                  <p className="text-xs font-semibold text-foreground capitalize">{layer.replace(/_/g, ' ')}</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {issues.slice(0, 3).map((issue, i) => (
                      <li key={i}>• {typeof issue === 'string' ? issue : issue.description || JSON.stringify(issue).slice(0, 50)}</li>
                    ))}
                    {issues.length > 3 && <li className="text-primary/70">+{issues.length - 3} more</li>}
                  </ul>
                </div>
              ) : null
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}