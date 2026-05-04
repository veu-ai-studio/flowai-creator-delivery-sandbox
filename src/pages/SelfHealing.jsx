import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  HeartPulse, Loader2, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Zap, TrendingUp, Activity, RotateCcw, Play
} from 'lucide-react';

const HEALING_MODULES = [
  { key: 'error_detection',    label: 'Runtime Error Detection',    color: 'text-red-400' },
  { key: 'perf_optimization',  label: 'Performance Optimization',   color: 'text-blue-400' },
  { key: 'security_patch',     label: 'Security Vulnerability Patch',color: 'text-amber-400' },
  { key: 'self_optimization',  label: 'Continuous Self-Optimization',color: 'text-emerald-400' },
];

const STATUS_ICON = {
  healed:  { icon: CheckCircle2, cls: 'text-emerald-400' },
  patched: { icon: CheckCircle2, cls: 'text-blue-400' },
  failed:  { icon: XCircle,      cls: 'text-red-400' },
  pending: { icon: AlertTriangle,cls: 'text-amber-400' },
};

export default function SelfHealing() {
  const [url, setUrl] = useState('');
  const [selectedModules, setSelectedModules] = useState(HEALING_MODULES.map(m => m.key));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [autoHeal, setAutoHeal] = useState(false);
  const [activeTab, setActiveTab] = useState('diagnose');

  const toggleModule = key => setSelectedModules(prev =>
    prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
  );

  const handleRun = async (mode = 'diagnose') => {
    if (!url.trim()) return;
    setRunning(true);
    setResult(null);
    setError(null);
    setActiveTab(mode);
    try {
      const res = await base44.functions.invoke('selfHealingEngine', {
        url, modules: selectedModules, mode, auto_heal: autoHeal
      });
      setResult(res?.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const healthScore = result?.health_score ?? null;
  const scoreColor = healthScore >= 80 ? 'text-emerald-400' : healthScore >= 60 ? 'text-amber-400' : 'text-red-400';
  const scoreRing  = healthScore >= 80 ? 'stroke-emerald-400' : healthScore >= 60 ? 'stroke-amber-400' : 'stroke-red-400';

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <HeartPulse className="h-7 w-7 text-primary" />
          Self-Healing Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Autonomously detect errors, patch vulnerabilities, optimize performance, and continuously improve every product FlowAI processes.
        </p>
      </motion.div>

      {/* Module Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {HEALING_MODULES.map(({ key, label, color }) => (
          <button key={key} onClick={() => toggleModule(key)}
            className={`rounded-xl border p-3 text-left transition-all ${selectedModules.includes(key) ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:bg-secondary/20'}`}>
            <HeartPulse className={`h-4 w-4 mb-1.5 ${color}`} />
            <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Target Product URL</Label>
          <Input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://pressai.yourdomain.com" className="h-9 text-sm" disabled={running} />
        </div>

        {/* Auto-Heal Toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setAutoHeal(v => !v)}
            className={`h-5 w-9 rounded-full relative transition-colors ${autoHeal ? 'bg-primary' : 'bg-secondary'}`}>
            <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${autoHeal ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-sm text-foreground">Auto-Heal Mode</span>
          <span className="text-[10px] text-muted-foreground">Apply fixes automatically without confirmation</span>
        </label>

        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => handleRun('diagnose')} variant="outline" disabled={running || !url.trim()} className="gap-2">
            {running && activeTab === 'diagnose' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            Diagnose
          </Button>
          <Button onClick={() => handleRun('heal')} disabled={running || !url.trim()} className="gap-2">
            {running && activeTab === 'heal' ? <Loader2 className="h-4 w-4 animate-spin" /> : <HeartPulse className="h-4 w-4" />}
            Heal Now
          </Button>
          <Button onClick={() => handleRun('optimize')} variant="outline" disabled={running || !url.trim()} className="gap-2">
            {running && activeTab === 'optimize' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
            Optimize
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-3">{error}</p>}

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Health Score */}
            {healthScore !== null && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-border bg-card p-4 flex flex-col items-center justify-center">
                  <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--secondary))" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9" fill="none" className={scoreRing} strokeWidth="3"
                      strokeDasharray={`${healthScore} ${100 - healthScore}`} strokeLinecap="round" />
                  </svg>
                  <p className={`text-lg font-bold mt-1 ${scoreColor}`}>{healthScore}</p>
                  <p className="text-[10px] text-muted-foreground">Health Score</p>
                </div>
                {[
                  { label: 'Issues Found',  val: result.issues_found  ?? 0 },
                  { label: 'Fixed',         val: result.issues_fixed  ?? 0 },
                  { label: 'Optimizations', val: result.optimizations ?? 0 },
                ].map(({ label, val }) => (
                  <div key={label} className="rounded-xl border border-border bg-card p-4 flex flex-col justify-center">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{val}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Issues */}
            {result.issues?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-400" /> Detected Issues
                </h3>
                {result.issues.map((issue, i) => {
                  const cfg = STATUS_ICON[issue.status] || STATUS_ICON.pending;
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                      className="rounded-lg border border-border bg-secondary/20 p-3 flex gap-3">
                      <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.cls}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground">{issue.title}</p>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${cfg.cls} bg-current/10`}>{issue.status}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{issue.description}</p>
                        {issue.fix_applied && <p className="text-[10px] text-emerald-400 mt-1">✓ Fix applied: {issue.fix_applied}</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Optimizations Applied */}
            {result.optimization_log?.length > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Optimizations Applied
                </h3>
                {result.optimization_log.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-foreground">
                    <Zap className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" /> {item}
                  </div>
                ))}
              </div>
            )}

            {/* Summary */}
            {result.summary && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{result.summary}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}