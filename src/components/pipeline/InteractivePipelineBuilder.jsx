import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, ArrowRight, Play, GripVertical, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STAGE_OPTIONS = [
  { id: 'input',    label: 'User Input',     color: 'bg-slate-500/10 border-slate-500/30 text-slate-300',   dot: 'bg-slate-400' },
  { id: 'llm',      label: 'LLM Call',       color: 'bg-blue-500/10 border-blue-500/30 text-blue-300',       dot: 'bg-blue-400' },
  { id: 'research', label: 'Research',       color: 'bg-purple-500/10 border-purple-500/30 text-purple-300', dot: 'bg-purple-400' },
  { id: 'qa',       label: 'QA Audit',       color: 'bg-amber-500/10 border-amber-500/30 text-amber-300',    dot: 'bg-amber-400' },
  { id: 'build',    label: 'Build',          color: 'bg-orange-500/10 border-orange-500/30 text-orange-300', dot: 'bg-orange-400' },
  { id: 'deploy',   label: 'Deploy',         color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300', dot: 'bg-emerald-400' },
  { id: 'notify',   label: 'Notify',         color: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',       dot: 'bg-cyan-400' },
  { id: 'condition','label': 'Condition',    color: 'bg-rose-500/10 border-rose-500/30 text-rose-300',       dot: 'bg-rose-400' },
];

let _id = 1;
const uid = () => `stage_${_id++}`;

function StageCard({ stage, index, total, onRemove, onMoveUp, onMoveDown, onConfigChange }) {
  const [open, setOpen] = useState(false);
  const meta = STAGE_OPTIONS.find(s => s.id === stage.type) || STAGE_OPTIONS[0];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`rounded-xl border p-4 ${meta.color} space-y-3`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 opacity-30 shrink-0" />
        <div className={`h-2 w-2 rounded-full shrink-0 ${meta.dot}`} />
        <span className="text-sm font-semibold flex-1">{stage.name || meta.label}</span>
        <div className="flex items-center gap-1">
          <button disabled={index === 0} onClick={onMoveUp} className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors">
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button disabled={index === total - 1} onClick={onMoveDown} className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/10 disabled:opacity-20 transition-colors">
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setOpen(v => !v)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-white/10 transition-colors text-xs font-mono">
            {open ? '▲' : '▼'}
          </button>
          <button onClick={onRemove} className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-500/20 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden space-y-2">
            <div>
              <label className="text-[10px] uppercase tracking-wide opacity-60 block mb-1">Stage Name</label>
              <input
                value={stage.name || ''}
                onChange={e => onConfigChange('name', e.target.value)}
                placeholder={meta.label}
                className="w-full h-8 rounded-lg bg-black/20 border border-white/10 px-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wide opacity-60 block mb-1">Prompt / Config</label>
              <textarea
                value={stage.prompt || ''}
                onChange={e => onConfigChange('prompt', e.target.value)}
                rows={2}
                placeholder="Enter instructions or config for this stage..."
                className="w-full rounded-lg bg-black/20 border border-white/10 px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 resize-none"
              />
            </div>
            {stage.type === 'condition' && (
              <div>
                <label className="text-[10px] uppercase tracking-wide opacity-60 block mb-1">Condition Expression</label>
                <input
                  value={stage.condition || ''}
                  onChange={e => onConfigChange('condition', e.target.value)}
                  placeholder='e.g. score > 7'
                  className="w-full h-8 rounded-lg bg-black/20 border border-white/10 px-2.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
                />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function InteractivePipelineBuilder() {
  const [stages, setStages] = useState([
    { id: uid(), type: 'input', name: 'User Input', prompt: '' },
    { id: uid(), type: 'llm', name: 'LLM Analysis', prompt: '' },
    { id: uid(), type: 'deploy', name: 'Deploy', prompt: '' },
  ]);
  const [pipelineName, setPipelineName] = useState('My Pipeline');
  const [saved, setSaved] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simLog, setSimLog] = useState([]);

  const addStage = (type) => {
    const meta = STAGE_OPTIONS.find(s => s.id === type);
    setStages(prev => [...prev, { id: uid(), type, name: meta?.label || type, prompt: '' }]);
  };

  const removeStage = (id) => setStages(prev => prev.filter(s => s.id !== id));

  const moveStage = (id, dir) => {
    setStages(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if ((dir === -1 && idx === 0) || (dir === 1 && idx === prev.length - 1)) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next;
    });
  };

  const updateStage = (id, key, val) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, [key]: val } : s));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setSimLog([]);
    for (let i = 0; i < stages.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setSimLog(prev => [...prev, { stage: stages[i].name || stages[i].type, status: 'done', ms: Math.floor(Math.random() * 900) + 200 }]);
    }
    setSimulating(false);
  };

  return (
    <div className="space-y-6">
      {/* Pipeline name */}
      <div className="flex items-center gap-3">
        <input
          value={pipelineName}
          onChange={e => setPipelineName(e.target.value)}
          className="flex-1 h-9 rounded-lg border border-border bg-secondary/30 px-3 text-sm font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button size="sm" variant="outline" onClick={handleSave} className="gap-1.5 shrink-0">
          {saved ? '✓ Saved' : 'Save Pipeline'}
        </Button>
        <Button size="sm" className="gap-1.5 shrink-0" onClick={handleSimulate} disabled={simulating || stages.length === 0}>
          {simulating ? <><Zap className="h-3.5 w-3.5 animate-pulse" /> Simulating…</> : <><Play className="h-3.5 w-3.5" /> Simulate</>}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stage palette */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Stage</p>
          <div className="grid grid-cols-2 gap-2">
            {STAGE_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => addStage(s.id)}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-semibold transition-all hover:scale-[1.02] ${s.color}`}
              >
                <Plus className="h-3 w-3 shrink-0" />
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-2 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pipeline Stages ({stages.length})</p>
          {stages.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              Add stages from the palette →
            </div>
          )}
          <div className="space-y-2">
            <AnimatePresence>
              {stages.map((stage, i) => (
                <div key={stage.id}>
                  <StageCard
                    stage={stage}
                    index={i}
                    total={stages.length}
                    onRemove={() => removeStage(stage.id)}
                    onMoveUp={() => moveStage(stage.id, -1)}
                    onMoveDown={() => moveStage(stage.id, 1)}
                    onConfigChange={(key, val) => updateStage(stage.id, key, val)}
                  />
                  {i < stages.length - 1 && (
                    <div className="flex justify-center my-1">
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 rotate-90" />
                    </div>
                  )}
                </div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Simulation log */}
      <AnimatePresence>
        {simLog.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-primary" /> Simulation Log
              {simulating && <span className="text-primary animate-pulse">running…</span>}
            </p>
            <div className="space-y-1">
              {simLog.map((entry, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-400">✓</span>
                  <span className="text-foreground font-medium">{entry.stage}</span>
                  <span className="text-muted-foreground ml-auto">{entry.ms}ms</span>
                </motion.div>
              ))}
            </div>
            {!simulating && simLog.length === stages.length && (
              <p className="text-xs text-emerald-400 font-semibold pt-1 border-t border-border">Pipeline simulation complete ✓</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}