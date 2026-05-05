import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STEPS = [
  { key: 'governance', label: 'Governance Audit',    duration: 900,  finding: 'All governance thresholds met. Self-protection active.' },
  { key: 'readiness',  label: 'Launch Readiness',    duration: 800,  finding: 'HTTPS, domain config, and robots.txt verified.' },
  { key: 'whitelabel', label: 'White-Label Check',   duration: 700,  finding: 'Branding consistent across all pages.' },
  { key: 'dataexport', label: 'Data Export Audit',   duration: 1000, finding: 'GDPR-compliant export flow confirmed.' },
  { key: 'demo',       label: 'Demo Readiness',      duration: 800,  finding: 'Demo score: 47/50 — sales-safe.' },
  { key: 'signoff',    label: 'Final Sign-Off',       duration: 600,  finding: '🏆 CLEARED FOR PUBLIC LAUNCH' },
];

export default function ClearanceSimulator({ productName = 'SAIGE' }) {
  const [running, setRunning] = useState(false);
  const [stepIdx, setStepIdx] = useState(-1);
  const [done, setDone] = useState(false);

  const start = () => {
    setRunning(true);
    setStepIdx(0);
    setDone(false);
  };

  const reset = () => { setRunning(false); setStepIdx(-1); setDone(false); };

  useEffect(() => {
    if (!running || stepIdx < 0) return;
    if (stepIdx >= STEPS.length) { setDone(true); setRunning(false); return; }
    const t = setTimeout(() => setStepIdx(i => i + 1), STEPS[stepIdx].duration);
    return () => clearTimeout(t);
  }, [running, stepIdx]);

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 w-full max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-foreground">Product Clearance Protocol</p>
          <p className="text-[11px] text-muted-foreground">Simulating: {productName}</p>
        </div>
        {!running && !done && (
          <Button size="sm" onClick={start} className="gap-1.5 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Run Check
          </Button>
        )}
        {done && (
          <Button size="sm" variant="outline" onClick={reset} className="gap-1.5 text-xs">
            Reset
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {STEPS.map((step, i) => {
          const isComplete = stepIdx > i || done;
          const isRunning = stepIdx === i && running;
          return (
            <motion.div key={step.key}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: isComplete || isRunning ? 1 : 0.3 }}
              className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all ${
                isComplete ? 'border-emerald-500/30 bg-emerald-500/5' :
                isRunning  ? 'border-blue-500/40 bg-blue-500/5' :
                             'border-border'
              }`}>
              <div className="mt-0.5 shrink-0">
                {isComplete ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> :
                 isRunning  ? <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> :
                              <div className="h-4 w-4 rounded-full border-2 border-border" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{`Step ${i + 1} — ${step.label}`}</p>
                <AnimatePresence>
                  {isComplete && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      className="text-[10px] text-muted-foreground mt-0.5">{step.finding}</motion.p>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </div>

      {done && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-center">
          <p className="text-sm font-bold text-emerald-400">🏆 {productName} CLEARED FOR PUBLIC LAUNCH</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">6/6 steps passed · Demo score: 47/50</p>
        </motion.div>
      )}
    </div>
  );
}