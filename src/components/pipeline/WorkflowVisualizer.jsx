import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle2, Circle, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STAGE_CONFIGS = {
  full_lifecycle: [
    { id: 'gpt',      label: 'ChatGPT',   color: '#10b981', desc: 'Intent parsing & planning' },
    { id: 'research', label: 'Research',  color: '#60a5fa', desc: 'Market & competitive analysis' },
    { id: 'design',   label: 'Design',    color: '#a78bfa', desc: 'UX flows & architecture' },
    { id: 'build',    label: 'Build',     color: '#fb923c', desc: 'Component & API generation' },
    { id: 'execute',  label: 'Execute',   color: '#f472b6', desc: 'Replit code execution' },
    { id: 'deploy',   label: 'Deploy',    color: '#34d399', desc: 'Vercel deployment' },
    { id: 'audit',    label: 'Audit',     color: '#fbbf24', desc: 'QA & quality scoring' },
    { id: 'optimize', label: 'Optimize',  color: '#38bdf8', desc: 'AI-driven improvements' },
  ],
  qa_audit_only: [
    { id: 'gpt',      label: 'ChatGPT',   color: '#10b981', desc: 'Intent parsing' },
    { id: 'audit',    label: 'Audit',     color: '#fbbf24', desc: 'QA & quality scoring' },
    { id: 'optimize', label: 'Optimize',  color: '#38bdf8', desc: 'AI-driven improvements' },
  ],
  optimization_only: [
    { id: 'gpt',      label: 'ChatGPT',   color: '#10b981', desc: 'Intent parsing' },
    { id: 'optimize', label: 'Optimize',  color: '#38bdf8', desc: 'AI-driven improvements' },
  ],
};

const STATUS_ICON = {
  idle:    (color) => <Circle className="h-5 w-5" style={{ color }} />,
  running: ()      => <Loader2 className="h-5 w-5 text-primary animate-spin" />,
  done:    (color) => <CheckCircle2 className="h-5 w-5" style={{ color }} />,
  error:   ()      => <AlertCircle className="h-5 w-5 text-red-400" />,
};

export default function WorkflowVisualizer() {
  const [flowType, setFlowType] = useState('full_lifecycle');
  const [simulating, setSimulating] = useState(false);
  const [stageStatus, setStageStatus] = useState({});
  const [activeStage, setActiveStage] = useState(null);

  const stages = STAGE_CONFIGS[flowType];

  const runSimulation = async () => {
    setSimulating(true);
    setStageStatus({});
    setActiveStage(null);
    for (const stage of stages) {
      setActiveStage(stage.id);
      setStageStatus(prev => ({ ...prev, [stage.id]: 'running' }));
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
      const outcome = Math.random() > 0.08 ? 'done' : 'error';
      setStageStatus(prev => ({ ...prev, [stage.id]: outcome }));
      if (outcome === 'error') break;
    }
    setActiveStage(null);
    setSimulating(false);
  };

  const reset = () => { setStageStatus({}); setActiveStage(null); };

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border">
          {Object.keys(STAGE_CONFIGS).map(key => (
            <button
              key={key}
              onClick={() => { setFlowType(key); reset(); }}
              disabled={simulating}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                flowType === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {key === 'full_lifecycle' ? 'Full Lifecycle' : key === 'qa_audit_only' ? 'QA Only' : 'Optimize Only'}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1.5" onClick={runSimulation} disabled={simulating}>
          {simulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {simulating ? 'Simulating...' : 'Simulate Run'}
        </Button>
        {Object.keys(stageStatus).length > 0 && !simulating && (
          <Button size="sm" variant="outline" onClick={reset}>Reset</Button>
        )}
      </div>

      {/* Pipeline visual */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap gap-3 items-center justify-center">
          {stages.map((stage, i) => {
            const status = stageStatus[stage.id] || 'idle';
            const isActive = activeStage === stage.id;
            return (
              <div key={stage.id} className="flex items-center gap-3">
                <motion.div
                  animate={isActive ? { scale: [1, 1.08, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className={`flex flex-col items-center gap-2 cursor-default`}
                  onClick={() => setActiveStage(activeStage === stage.id ? null : stage.id)}
                >
                  {/* Node */}
                  <div
                    className={`h-16 w-16 rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all ${
                      status === 'done' ? 'opacity-100' :
                      status === 'running' ? 'opacity-100 shadow-lg' :
                      status === 'error' ? 'border-red-500/60 bg-red-500/5' :
                      'opacity-40'
                    }`}
                    style={{
                      borderColor: status === 'error' ? undefined : stage.color + (status === 'idle' ? '40' : '80'),
                      background: status === 'idle' ? stage.color + '10' : status === 'done' ? stage.color + '18' : status === 'running' ? stage.color + '20' : undefined,
                      boxShadow: isActive ? `0 0 20px ${stage.color}40` : undefined,
                    }}
                  >
                    {STATUS_ICON[status](stage.color)}
                    <span className="text-[10px] font-bold text-foreground">{stage.label}</span>
                  </div>
                  <p className="text-[9px] text-muted-foreground text-center max-w-[72px] leading-tight">{stage.desc}</p>
                </motion.div>
                {i < stages.length - 1 && (
                  <ArrowRight className={`h-4 w-4 shrink-0 mb-4 transition-colors ${
                    stageStatus[stage.id] === 'done' ? 'text-primary' : 'text-muted-foreground/20'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Completed', value: Object.values(stageStatus).filter(s => s === 'done').length, color: 'text-emerald-400' },
          { label: 'Running',   value: Object.values(stageStatus).filter(s => s === 'running').length, color: 'text-primary' },
          { label: 'Errors',    value: Object.values(stageStatus).filter(s => s === 'error').length, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        {[
          { label: 'Idle', icon: <Circle className="h-3 w-3" /> },
          { label: 'Running', icon: <Loader2 className="h-3 w-3 animate-spin text-primary" /> },
          { label: 'Done', icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" /> },
          { label: 'Error', icon: <AlertCircle className="h-3 w-3 text-red-400" /> },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1">{l.icon}{l.label}</span>
        ))}
      </div>
    </div>
  );
}