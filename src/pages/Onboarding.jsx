import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Zap, Clock, Wrench, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ONBOARDING_KEY = 'flowai_onboarding_complete';

const STEP_CONFIG = [
  { id: 1, label: 'Welcome' },
  { id: 2, label: 'Your Product' },
  { id: 3, label: 'Choose Mode' },
  { id: 4, label: 'Launch' },
  { id: 5, label: 'Tour' },
];

const MODES = [
  {
    key: 'auto',
    label: 'Auto Operations',
    icon: Zap,
    color: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/5',
    time: 'Seconds to minutes',
    desc: 'FlowAI executes all eight steps automatically. You set the goal and approve the final result.',
  },
  {
    key: 'guided',
    label: 'Guided Operations',
    icon: Clock,
    color: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/5',
    time: 'Minutes to hours',
    desc: 'FlowAI guides you through each step. You review findings and decide when to advance.',
  },
  {
    key: 'manual',
    label: 'Manual Operations',
    icon: Wrench,
    color: 'text-muted-foreground',
    border: 'border-border',
    bg: 'bg-card',
    time: 'Hours to days',
    desc: 'You execute each step at your own pace. FlowAI assists when asked. For experienced operators.',
  },
];

const TOUR_ITEMS = [
  { label: 'Dashboard', desc: 'Your command center — product health, active sessions, and quick actions' },
  { label: 'Auto Operations', desc: 'My Workspace, My Products, and the Auto Runner for automated execution' },
  { label: 'Guided Operations', desc: 'Eight process steps with FlowAI guidance and human approval pauses' },
  { label: 'Manual Operations', desc: 'Eight steps you control at your own pace with AI assistance available' },
  { label: 'Settings', desc: 'Onboarding, users, URL whitelist, cost controls, and release notes' },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [techLevel, setTechLevel] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [productName, setProductName] = useState('');
  const [isComplete, setIsComplete] = useState(() => !!localStorage.getItem(ONBOARDING_KEY));
  const navigate = useNavigate();

  const getRecommendedMode = () => {
    if (techLevel === 'technical') return 'auto';
    return 'guided';
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsComplete(true);
  };

  const launchOperation = () => {
    const mode = selectedMode || getRecommendedMode();
    handleComplete();
    if (mode === 'auto') navigate('/auto-runner');
    else if (mode === 'guided') navigate('/guided/research');
    else navigate('/manual/research');
  };

  return (
    <div className="p-8 lg:p-10 max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-7 w-7 text-primary" /> Onboarding
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Get FlowAI configured for your workflow</p>
          </div>
          {isComplete && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-semibold">Setup Complete</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Step progress */}
      <div className="flex items-center gap-2">
        {STEP_CONFIG.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold shrink-0 transition-all ${
              step > s.id ? 'bg-emerald-500 text-white' :
              step === s.id ? 'bg-primary text-primary-foreground' :
              'bg-secondary text-muted-foreground'
            }`}>
              {step > s.id ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.id}
            </div>
            <span className={`text-[10px] font-semibold hidden sm:block ${step === s.id ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</span>
            {i < STEP_CONFIG.length - 1 && <div className="flex-1 h-px bg-border" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 — Welcome */}
        {step === 1 && (
          <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-xl font-bold text-foreground">Welcome to FlowAI</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              FlowAI is VEU AI Studio's proprietary platform for building, governing, and deploying AI-powered products — faster, better, and more reliably than any alternative.
            </p>
            <div className="space-y-3">
              {[
                { icon: Zap, label: 'Auto Operations', sub: 'Seconds to minutes', desc: 'FlowAI executes everything. You approve the result.' },
                { icon: Clock, label: 'Guided Operations', sub: 'Minutes to hours', desc: 'FlowAI guides you step by step. You stay in control.' },
                { icon: Wrench, label: 'Manual Operations', sub: 'Hours to days', desc: 'You drive every step. FlowAI assists on demand.' },
              ].map(m => (
                <div key={m.label} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-secondary/20">
                  <m.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold text-foreground">{m.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{m.sub}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={() => setStep(2)}>
              Get Started <ChevronRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {/* Step 2 — Product */}
        {step === 2 && (
          <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-xl font-bold text-foreground">Your First Product</h2>
            <p className="text-sm text-muted-foreground">Select a product to work with, or type a new product name to get started.</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">Product Name</label>
              <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. MyPregLife, SAIGE, or a new product name..." className="h-9 text-sm" />
            </div>
            <p className="text-[11px] text-muted-foreground">You can also use one of the existing VEU AI Studio products: SAIGE, PressAI, ReachSMS, RelTwin, MyPregLife</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">Back</Button>
              <Button className="flex-1 gap-2" onClick={() => setStep(3)} disabled={!productName.trim()}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3 — Choose Mode */}
        {step === 3 && (
          <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-xl font-bold text-foreground">Choose Your Mode</h2>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground">How would you describe your technical comfort level?</p>
              <div className="flex gap-2 flex-wrap">
                {['not_technical', 'somewhat_technical', 'technical'].map(level => (
                  <button key={level} onClick={() => { setTechLevel(level); setSelectedMode(level === 'technical' ? 'auto' : 'guided'); }}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-semibold transition-all ${techLevel === level ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    {level === 'not_technical' ? 'Not technical' : level === 'somewhat_technical' ? 'Somewhat technical' : 'Technical'}
                  </button>
                ))}
              </div>
            </div>

            {techLevel && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  {techLevel === 'technical'
                    ? 'Recommended: Auto Operations (with Guided as backup)'
                    : 'Recommended: Guided Operations — FlowAI leads, you approve.'}
                </p>
                <div className="space-y-2">
                  {MODES.filter(m => techLevel !== 'technical' ? m.key !== 'manual' : true).map(m => {
                    const isRec = m.key === (techLevel === 'technical' ? 'auto' : 'guided');
                    return (
                      <button key={m.key} onClick={() => setSelectedMode(m.key)}
                        className={`w-full text-left p-3 rounded-lg border transition-all ${selectedMode === m.key ? `${m.border} ${m.bg}` : 'border-border hover:bg-secondary/20'}`}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <m.icon className={`h-4 w-4 ${selectedMode === m.key ? m.color : 'text-muted-foreground'}`} />
                          <span className="text-sm font-semibold text-foreground">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground">{m.time}</span>
                          {isRec && <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary font-bold">Recommended</span>}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{m.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(2)} className="gap-1">Back</Button>
              <Button className="flex-1 gap-2" onClick={() => setStep(4)} disabled={!selectedMode}>
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4 — Launch */}
        {step === 4 && (
          <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-xl font-bold text-foreground">Ready to Launch</h2>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Your First Operation</p>
              <div className="flex gap-4 text-sm">
                <div><span className="text-muted-foreground">Product:</span> <span className="font-semibold text-foreground">{productName}</span></div>
                <div><span className="text-muted-foreground">Mode:</span> <span className="font-semibold text-foreground capitalize">{selectedMode}</span></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              FlowAI will execute all eight process steps — Research through Monitor — in {selectedMode === 'auto' ? 'seconds to minutes automatically' : selectedMode === 'guided' ? 'minutes to hours with your guidance' : 'hours to days at your pace'}.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(3)} className="gap-1">Back</Button>
              <Button className="flex-1 gap-2" onClick={launchOperation}>
                <Zap className="h-4 w-4" /> Launch My First Operation
              </Button>
            </div>
            <button onClick={() => setStep(5)} className="w-full text-xs text-muted-foreground hover:text-foreground text-center transition-colors">
              Take the platform tour first →
            </button>
          </motion.div>
        )}

        {/* Step 5 — Tour */}
        {step === 5 && (
          <motion.div key="s5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="rounded-xl border border-border bg-card p-6 space-y-5">
            <h2 className="text-xl font-bold text-foreground">Platform Tour</h2>
            <div className="space-y-2">
              {TOUR_ITEMS.map((item, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg border border-border bg-secondary/20">
                  <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full gap-2" onClick={launchOperation}>
              <ArrowRight className="h-4 w-4" /> Continue to Launch
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {isComplete && step === 1 && (
        <div className="text-center py-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>Go to Dashboard</Button>
        </div>
      )}
    </div>
  );
}