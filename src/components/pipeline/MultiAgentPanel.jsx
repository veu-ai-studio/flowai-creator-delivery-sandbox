import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Brain, Loader2, Play, CheckCircle2, ChevronDown, ChevronRight, Zap
} from 'lucide-react';

const AGENT_CONFIGS = [
  { key: 'planner',  label: 'Planner',  color: 'text-primary',    desc: 'Breaks down goal into agent tasks' },
  { key: 'research', label: 'Research', color: 'text-blue-400',   desc: 'Market & competitor analysis' },
  { key: 'design',   label: 'Design',   color: 'text-purple-400', desc: 'UX/UI architecture & flows' },
  { key: 'build',    label: 'Build',    color: 'text-orange-400', desc: 'Technical specs & schema' },
  { key: 'qa',       label: 'QA',       color: 'text-red-400',    desc: 'Test cases & quality scoring' },
  { key: 'deploy',   label: 'Deploy',   color: 'text-emerald-400',desc: 'Deployment & release config' },
];

function AgentCard({ result, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = AGENT_CONFIGS.find(a => a.key === result.agentKey) || { color: '', desc: '' };

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className="rounded-lg border border-border bg-secondary/20 overflow-hidden"
    >
      <button
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <CheckCircle2 className={`h-4 w-4 shrink-0 ${result.status === 'done' ? 'text-emerald-400' : 'text-red-400'}`} />
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-bold ${cfg.color}`}>{result.agent}</span>
          <span className="text-[10px] text-muted-foreground ml-2">{cfg.desc}</span>
        </div>
        <div className="flex items-center gap-2">
          {result.simulated && <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">sim</span>}
          {result.duration_ms > 0 && <span className="text-[10px] text-muted-foreground font-mono">{result.duration_ms}ms</span>}
          {expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && result.result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border px-3 py-3 space-y-2"
          >
            {result.result.summary && <p className="text-xs text-foreground">{result.result.summary}</p>}
            {result.result.output && <p className="text-[11px] text-muted-foreground">{result.result.output}</p>}
            {Array.isArray(result.result.items) && result.result.items.length > 0 && (
              <ul className="text-[11px] text-muted-foreground space-y-0.5">
                {result.result.items.slice(0, 5).map((item, i) => <li key={i}>• {item}</li>)}
              </ul>
            )}
            {Array.isArray(result.result.next_steps) && result.result.next_steps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Next Steps</p>
                <ul className="text-[11px] text-primary space-y-0.5">
                  {result.result.next_steps.slice(0, 3).map((s, i) => <li key={i}>→ {s}</li>)}
                </ul>
              </div>
            )}
            {result.result.confidence != null && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Confidence:</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary/50 overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(result.result.confidence || 0) * 100}%` }} />
                </div>
                <span className="text-[10px] text-foreground">{Math.round((result.result.confidence || 0) * 100)}%</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function MultiAgentPanel() {
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [agentLog, setAgentLog] = useState([]);
  const [parallel, setParallel] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState(['planner', 'research', 'design', 'build', 'qa', 'deploy']);
  const [error, setError] = useState(null);

  const toggleAgent = (key) => {
    if (key === 'planner') return; // always required
    setSelectedAgents(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  };

  const handleRun = async () => {
    if (!input.trim()) return;
    setRunning(true);
    setAgentLog([]);
    setError(null);
    try {
      const res = await base44.functions.invoke('multiAgent', { input, agents: selectedAgents, parallel });
      setAgentLog(res?.data?.agentLog || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const totalDuration = agentLog.reduce((a, r) => a + (r.duration_ms || 0), 0);

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Multi-Agent Orchestration
        </h2>
        {agentLog.length > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono">{agentLog.length} agents · {totalDuration}ms total</span>
        )}
      </div>

      {/* Agent selector */}
      <div className="flex flex-wrap gap-2">
        {AGENT_CONFIGS.map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => toggleAgent(key)}
            disabled={key === 'planner'}
            className={`text-[10px] font-bold px-2.5 py-1.5 rounded border transition-all ${
              selectedAgents.includes(key)
                ? `${color} bg-current/10 border-current/30`
                : 'text-muted-foreground border-border bg-secondary/30'
            } ${key === 'planner' ? 'opacity-60 cursor-default' : 'hover:opacity-80'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">Execution:</span>
        <button
          onClick={() => setParallel(true)}
          className={`text-xs px-2.5 py-1 rounded border transition-all ${parallel ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
        >
          Parallel
        </button>
        <button
          onClick={() => setParallel(false)}
          className={`text-xs px-2.5 py-1 rounded border transition-all ${!parallel ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground'}`}
        >
          Sequential
        </button>
        <span className="text-[10px] text-muted-foreground">{parallel ? '→ Research + Design run simultaneously' : '→ Each agent waits for previous'}</span>
      </div>

      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !running && handleRun()}
          placeholder='e.g. "Build a SaaS invoicing tool for freelancers"'
          className="h-9 text-sm flex-1"
          disabled={running}
        />
        <Button size="sm" onClick={handleRun} disabled={running || !input.trim()} className="gap-1.5 shrink-0">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? 'Running...' : 'Run Agents'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">{error}</p>}

      {/* Agent Results */}
      {agentLog.length > 0 && (
        <div className="space-y-2">
          {agentLog.map((result, i) => (
            <AgentCard key={i} result={result} index={i} />
          ))}
        </div>
      )}

      {!running && agentLog.length === 0 && !error && (
        <div className="text-center py-8">
          <Zap className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Select agents and run to see multi-agent coordination</p>
        </div>
      )}
    </div>
  );
}
