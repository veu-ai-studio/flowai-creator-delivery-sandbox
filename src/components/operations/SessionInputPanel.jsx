import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X, Zap, Clock, Wrench, Link2, MessageSquare, GitCompare, Layers, BarChart2, Mic, MicOff, Target } from 'lucide-react';

const MODES = [
  { key: 'auto',    label: 'Auto',    icon: Zap,    desc: 'FlowAI runs all 8 steps. You review at the end.', color: 'border-primary/50 bg-primary/5 text-primary' },
  { key: 'guided',  label: 'Guided',  icon: Clock,  desc: 'FlowAI executes each step. You approve and advance.', color: 'border-amber-500/50 bg-amber-500/5 text-amber-400' },
  { key: 'manual',  label: 'Manual',  icon: Wrench, desc: 'You drive. FlowAI assists on demand at each step.', color: 'border-border bg-secondary/20 text-muted-foreground' },
];

const MULTI_MODES = [
  { key: 'compare',   label: 'Compare',   icon: GitCompare, desc: 'Side-by-side analysis. Winner declared per dimension.' },
  { key: 'combine',   label: 'Combine',   icon: Layers,     desc: 'Synthesize the best of all inputs into one unified spec.' },
  { key: 'benchmark', label: 'Benchmark', icon: BarChart2,  desc: 'Score primary input against reference benchmarks.' },
];

const OBJECTIVES = [
  { value: 'audit_demo',      label: 'Audit for prospect demo readiness' },
  { value: 'investor_review', label: 'Prepare for investor review' },
  { value: 'full_governance', label: 'Full governance and clearance cycle' },
  { value: 'compare',         label: 'Compare two or more products' },
  { value: 'combine',         label: 'Combine inputs into a unified specification' },
  { value: 'benchmark',       label: 'Benchmark against competitors' },
  { value: 'launch_readiness',label: 'Launch readiness check' },
  { value: 'custom',          label: 'Custom — I will describe my objective' },
];

// Detect Web Speech API support once at module level
const SPEECH_SUPPORTED = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

function useSpeechInput(onResult) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const toggle = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => onResult(e.results[0][0].transcript);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return { isListening, toggle };
}

export default function SessionInputPanel({ onStart }) {
  const [inputs, setInputs] = useState([{ id: 1, type: 'url', value: '', name: 'Input A' }]);
  const [opsMode, setOpsMode] = useState('auto');
  const [multiMode, setMultiMode] = useState('compare');
  const [objective, setObjective] = useState('audit_demo');
  const [customObjective, setCustomObjective] = useState('');
  // Track which input field is voice-listening (by input id, or 'objective')
  const [listeningId, setListeningId] = useState(null);
  const recognitionRef = useRef(null);

  const isMulti = inputs.length > 1;
  const canStart = inputs.some(i => i.value.trim());
  const effectiveObjective = objective === 'custom'
    ? (customObjective.trim() || null)
    : OBJECTIVES.find(o => o.value === objective)?.label || null;

  const addInput = (type) => {
    const letters = 'ABCDEFGHIJ';
    const nextLabel = letters[inputs.length] || `${inputs.length + 1}`;
    setInputs(prev => [...prev, { id: Date.now(), type, value: '', name: `Input ${nextLabel}` }]);
  };

  const removeInput = (id) => setInputs(prev => prev.filter(i => i.id !== id));

  const updateInput = (id, field, value) =>
    setInputs(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const startVoice = (targetId, onTranscript) => {
    if (!SPEECH_SUPPORTED) return;
    if (listeningId === targetId) {
      recognitionRef.current?.stop();
      setListeningId(null);
      return;
    }
    recognitionRef.current?.stop();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e) => onTranscript(e.results[0][0].transcript);
    recognition.onend = () => setListeningId(null);
    recognition.onerror = () => setListeningId(null);
    recognitionRef.current = recognition;
    recognition.start();
    setListeningId(targetId);
  };

  const handleStart = () => {
    const validInputs = inputs.filter(i => i.value.trim());
    if (!validInputs.length) return;
    onStart({
      inputs: validInputs,
      opsMode,
      multiMode: isMulti ? multiMode : null,
      objective: effectiveObjective,
    });
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Objective selector */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wide">Session Objective</p>
        </div>
        <p className="text-[11px] text-muted-foreground">Select what you are trying to accomplish — FlowAI tailors all findings to this goal.</p>
        <select
          value={objective}
          onChange={e => setObjective(e.target.value)}
          className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {OBJECTIVES.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {objective === 'custom' && (
          <div className="flex gap-2 items-center">
            <Input
              value={customObjective}
              onChange={e => setCustomObjective(e.target.value)}
              onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setCustomObjective(t); }}
              placeholder="Describe your objective…"
              className="h-9 text-sm flex-1"
            />
            {SPEECH_SUPPORTED && (
              <button
                onClick={() => startVoice('objective', (t) => setCustomObjective(prev => prev ? prev + ' ' + t : t))}
                title={listeningId === 'objective' ? 'Stop listening' : 'Speak your objective'}
                className={`h-9 w-9 flex items-center justify-center rounded-md border transition-all shrink-0 ${
                  listeningId === 'objective'
                    ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
                    : 'border-input text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                {listeningId === 'objective' ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Inputs section */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Inputs</p>

        <div className="space-y-3">
          {inputs.map((inp) => (
            <div key={inp.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  value={inp.name}
                  onChange={e => updateInput(inp.id, 'name', e.target.value)}
                  onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); updateInput(inp.id, 'name', t); }}
                  className="h-7 text-xs w-28 font-semibold"
                  placeholder="Label..."
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => updateInput(inp.id, 'type', 'url')}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-all font-semibold ${inp.type === 'url' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    <Link2 className="h-2.5 w-2.5" /> URL
                  </button>
                  <button
                    onClick={() => updateInput(inp.id, 'type', 'description')}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded border transition-all font-semibold ${inp.type === 'description' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    <MessageSquare className="h-2.5 w-2.5" /> Describe
                  </button>
                </div>
                {inputs.length > 1 && (
                  <button onClick={() => removeInput(inp.id)} className="text-muted-foreground hover:text-red-400 transition-colors ml-auto">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Input
                  value={inp.value}
                  onChange={e => updateInput(inp.id, 'value', e.target.value)}
                  onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); updateInput(inp.id, 'value', t); }}
                  placeholder={inp.type === 'url' ? 'https://your-product.com' : 'e.g. "Build a sustainability reporting tool for mid-size companies"'}
                  className="h-9 text-sm flex-1"
                />
                {inp.type === 'description' && SPEECH_SUPPORTED && (
                  <button
                    onClick={() => startVoice(inp.id, (t) => updateInput(inp.id, 'value', (inp.value ? inp.value + ' ' + t : t)))}
                    title={listeningId === inp.id ? 'Stop listening' : 'Speak description'}
                    className={`h-9 w-9 flex items-center justify-center rounded-md border transition-all shrink-0 ${
                      listeningId === inp.id
                        ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse'
                        : 'border-input text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                    }`}
                  >
                    {listeningId === inp.id ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => addInput('url')}>
            <Plus className="h-3 w-3" /><Link2 className="h-3 w-3" /> Add URL
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => addInput('description')}>
            <Plus className="h-3 w-3" /><MessageSquare className="h-3 w-3" /> Add Description
          </Button>
        </div>
      </div>

      {/* Multi-input mode selector */}
      {isMulti && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Multi-Input Mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MULTI_MODES.map(m => {
              const Icon = m.icon;
              const active = multiMode === m.key;
              return (
                <button key={m.key} onClick={() => setMultiMode(m.key)}
                  className={`rounded-lg border p-3 text-left transition-all space-y-1 ${active ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-foreground'}`}>{m.label}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-snug">{m.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Operations mode selector */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Operations Mode</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODES.map(m => {
            const Icon = m.icon;
            const active = opsMode === m.key;
            return (
              <button key={m.key} onClick={() => setOpsMode(m.key)}
                className={`rounded-lg border p-3 text-left transition-all space-y-1 ${active ? m.color + ' border-opacity-100' : 'border-border hover:border-primary/30'}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold">{m.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <Button onClick={handleStart} disabled={!canStart} size="lg" className="w-full gap-2">
        <Zap className="h-4 w-4" /> Start Session
        {isMulti && <span className="text-xs opacity-70">· {inputs.filter(i => i.value.trim()).length} inputs · {multiMode}</span>}
      </Button>
    </div>
  );
}