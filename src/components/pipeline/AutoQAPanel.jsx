import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2, FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';

const TEST_TYPES = ['unit', 'integration', 'e2e', 'accessibility', 'performance'];

const TYPE_COLORS = {
  unit: 'text-blue-400',
  integration: 'text-purple-400',
  e2e: 'text-emerald-400',
  accessibility: 'text-amber-400',
  performance: 'text-orange-400',
};

function SuiteCard({ suite }) {
  const [expanded, setExpanded] = useState(false);
  const pct = suite.total > 0 ? Math.round((suite.passed / suite.total) * 100) : 0;
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="rounded-lg border border-border bg-secondary/20 overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <span className={`text-[10px] font-bold uppercase w-20 shrink-0 ${TYPE_COLORS[suite.type] || ''}`}>{suite.type}</span>
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
          </div>
          <span className={`text-xs font-bold ${pct >= 80 ? 'text-emerald-400' : pct >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{pct}%</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">{suite.passed}/{suite.total}</span>
        <span className="text-[10px] text-muted-foreground font-mono">{suite.duration_ms}ms</span>
        {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border px-3 py-3 space-y-1.5"
          >
            {suite.summary && <p className="text-[11px] text-muted-foreground mb-2">{suite.summary}</p>}
            {suite.tests?.map((test, i) => (
              <div key={i} className="flex items-start gap-2 text-[11px]">
                {test.passed
                  ? <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                  : <XCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <span className={test.passed ? 'text-foreground' : 'text-red-300'}>{test.name}</span>
                  {test.assertion && <span className="text-muted-foreground ml-1">— {test.assertion}</span>}
                  {test.error && <p className="text-red-400 text-[10px] mt-0.5 font-mono">{test.error}</p>}
                </div>
                <span className="text-muted-foreground font-mono shrink-0">{test.duration_ms}ms</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AutoQAPanel() {
  const [url, setUrl] = useState('https://example.com');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(['unit', 'integration', 'e2e']);
  const [error, setError] = useState(null);

  const toggleType = (t) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('automatedQA', { url, test_types: selectedTypes });
      setResult(res?.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const statusColor = result?.status === 'passed' ? 'border-emerald-500/40 bg-emerald-500/5' :
    result?.status === 'partial' ? 'border-amber-500/40 bg-amber-500/5' : 'border-red-500/40 bg-red-500/5';

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <FlaskConical className="h-5 w-5 text-primary" />
        Automated QA Testing
      </h2>

      {/* Test type selector */}
      <div className="flex flex-wrap gap-2">
        {TEST_TYPES.map(t => (
          <button
            key={t}
            onClick={() => toggleType(t)}
            className={`text-[10px] font-bold uppercase px-2.5 py-1.5 rounded border transition-all ${
              selectedTypes.includes(t)
                ? `${TYPE_COLORS[t]} bg-current/10 border-current/30`
                : 'text-muted-foreground border-border bg-secondary/30 hover:opacity-80'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="https://your-app.com"
          className="h-9 text-sm flex-1"
          disabled={running}
        />
        <Button size="sm" onClick={handleRun} disabled={running || !url.trim() || selectedTypes.length === 0} className="gap-1.5 shrink-0">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
          {running ? 'Testing...' : 'Run Tests'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score card */}
            <div className={`rounded-lg border p-4 flex items-center justify-between ${statusColor}`}>
              <div>
                <p className="text-sm font-bold text-foreground">{result.total_passed}/{result.total_tests} tests passed</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{result.total_failed} failed · {result.suites?.length} suites</p>
              </div>
              <div className={`text-3xl font-bold ${result.overall_score >= 80 ? 'text-emerald-400' : result.overall_score >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {result.overall_score}%
              </div>
            </div>

            {/* Suite cards */}
            <div className="space-y-2">
              {result.suites?.map((suite, i) => <SuiteCard key={i} suite={suite} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}