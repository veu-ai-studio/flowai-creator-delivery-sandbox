import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Brain, ArrowRight, Loader2, Zap, RefreshCw } from 'lucide-react';
import DecisionPanel from '@/components/intelligence/DecisionPanel';
import CompetitionMap from '@/components/intelligence/CompetitionMap';
import ToolRankingTable from '@/components/intelligence/ToolRankingTable';
import RecommendedStack from '@/components/intelligence/RecommendedStack';
import RecordMetricPanel from '@/components/intelligence/RecordMetricPanel';
import SeedMetricsButton from '@/components/intelligence/SeedMetricsButton';

const CAPABILITIES = ['reasoning', 'deployment', 'execution', 'auditing', 'crawling'];
const PRIORITIES = [
  { key: 'balanced', label: 'Balanced' },
  { key: 'performance', label: 'Performance' },
  { key: 'cost', label: 'Cost' },
];

export default function PlatformIntelligence() {
  const [capability, setCapability] = useState('reasoning');
  const [priority, setPriority] = useState('balanced');
  const [taskDesc, setTaskDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const runDecision = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await base44.functions.invoke('decisionEngine', {
        capability,
        priority,
        task_description: taskDesc,
      });
      setReport(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run on mount + when params change
  useEffect(() => { runDecision(); }, [capability, priority]);

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Brain className="h-7 w-7 text-primary" />
              Platform Intelligence
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Phase 5 — Dynamic tool selection, competition mapping & decision engine</p>
          </div>
          <div className="flex items-center gap-2">
            <SeedMetricsButton onSeeded={runDecision} />
            <Button size="sm" variant="outline" className="gap-1.5" onClick={runDecision} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        {/* Phase breadcrumb */}
        <div className="flex items-center gap-1 mt-4 text-[10px] text-muted-foreground flex-wrap">
          {['Audit', 'Research', 'Design', 'Build', 'Pipeline', 'Intelligence'].map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded ${i === 5 ? 'bg-primary text-primary-foreground font-semibold' : 'bg-secondary/50'}`}>{p}</span>
              {i < 5 && <ArrowRight className="h-2.5 w-2.5" />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Controls */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="rounded-lg border border-border bg-card p-5 space-y-4">
        <div className="flex flex-wrap gap-6">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Capability</p>
            <div className="flex flex-wrap gap-1.5">
              {CAPABILITIES.map(c => (
                <button key={c} onClick={() => setCapability(c)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize border ${
                    capability === c ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Optimize For</p>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p.key} onClick={() => setPriority(p.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    priority === p.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:text-foreground'
                  }`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1.5">Task Description (optional)</p>
            <input
              value={taskDesc}
              onChange={e => setTaskDesc(e.target.value)}
              placeholder="e.g. Generate React component from design spec..."
              className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <Button className="gap-2 shrink-0" onClick={runDecision} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {loading ? 'Analyzing...' : 'Decide'}
          </Button>
        </div>
      </motion.div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-4 text-sm text-red-400">{error}</div>
      )}

      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Decision + Stack side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DecisionPanel report={report} priority={priority} />
              <RecommendedStack stack={report.recommended_stack} />
            </div>

            {/* Tool Rankings */}
            <ToolRankingTable tools={report.all_tool_stats} capability={capability} priority={priority} />

            {/* Competition Map */}
            <CompetitionMap competitionMap={report.competition_map} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Record Metric Panel */}
      <RecordMetricPanel onRecorded={runDecision} />

      {!loading && !report && !error && (
        <div className="text-center py-16">
          <Brain className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Select a capability to run the decision engine</p>
        </div>
      )}
    </div>
  );
}