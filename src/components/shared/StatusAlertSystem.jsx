import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, CheckCircle2, AlertTriangle, Info, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'flowai_status_alerts';

const ALERT_TYPES = [
  { key: 'score_drop',    label: 'Score Drop',      icon: AlertTriangle, color: 'text-red-400',     desc: 'Alert when score drops below threshold' },
  { key: 'audit_done',    label: 'Audit Complete',   icon: CheckCircle2,  color: 'text-emerald-400', desc: 'Notify when audit finishes' },
  { key: 'critical_issue',label: 'Critical Issues',  icon: Zap,           color: 'text-amber-400',   desc: 'Alert on critical or high severity findings' },
  { key: 'improvement',   label: 'Score Improved',   icon: Info,          color: 'text-blue-400',    desc: 'Celebrate when scores improve' },
];

export default function StatusAlertSystem({ currentScore, hasNewResults }) {
  const [config, setConfig] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { email: '', enabled: [], threshold: 5 };
  });
  const [toasts, setToasts] = useState([]);
  const [saved, setSaved] = useState(false);

  // Fire toasts based on new results
  useEffect(() => {
    if (!hasNewResults) return;
    const active = config.enabled || [];
    const newToasts = [];
    if (active.includes('audit_done')) {
      newToasts.push({ id: Date.now(), type: 'success', msg: 'Audit complete — results ready.' });
    }
    if (active.includes('critical_issue') && currentScore < 6) {
      newToasts.push({ id: Date.now() + 1, type: 'warning', msg: `Score ${currentScore}/10 — critical issues found.` });
    }
    if (newToasts.length > 0) {
      setToasts(prev => [...prev, ...newToasts]);
      newToasts.forEach(t => setTimeout(() => dismissToast(t.id), 5000));
    }
  }, [hasNewResults]);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const toggleType = (key) => {
    const updated = config.enabled.includes(key)
      ? config.enabled.filter(k => k !== key)
      : [...config.enabled, key];
    setConfig(prev => ({ ...prev, enabled: updated }));
  };

  const saveConfig = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toastStyle = { success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400', warning: 'border-amber-500/40 bg-amber-500/10 text-amber-400', info: 'border-blue-500/40 bg-blue-500/10 text-blue-400' };

  return (
    <>
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={`rounded-lg border px-4 py-2.5 text-xs font-semibold flex items-center gap-2 pointer-events-auto shadow-lg ${toastStyle[toast.type]}`}>
              <BellRing className="h-3.5 w-3.5 shrink-0" />
              {toast.msg}
              <button onClick={() => dismissToast(toast.id)} className="ml-2 opacity-70 hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Config panel */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" /> Status Alert System
        </h3>

        <div className="grid grid-cols-2 gap-2">
          {ALERT_TYPES.map(({ key, label, icon: Icon, color, desc }) => {
            const on = config.enabled.includes(key);
            return (
              <button key={key} onClick={() => toggleType(key)}
                className={`rounded-lg border p-2.5 text-left transition-all ${on ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/20 hover:bg-secondary/40'}`}>
                <Icon className={`h-3.5 w-3.5 mb-1 ${color}`} />
                <p className="text-[11px] font-semibold text-foreground">{label}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">{desc}</p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 items-center">
          <Input value={config.email} onChange={e => setConfig(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Notify email (optional)" className="h-8 text-xs flex-1" />
          <Button size="sm" onClick={saveConfig} className="h-8 gap-1 text-xs shrink-0">
            {saved ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Bell className="h-3 w-3" />}
            {saved ? 'Saved' : 'Save'}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {config.enabled.length === 0 ? 'No alert types selected.' : `${config.enabled.length} alert type${config.enabled.length > 1 ? 's' : ''} active.`}
        </p>
      </div>
    </>
  );
}