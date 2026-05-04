import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, Plus, X, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

const ENV_PRESETS = [
  { label: 'Production', placeholder: 'https://app.example.com' },
  { label: 'Staging', placeholder: 'https://staging.example.com' },
  { label: 'Dev', placeholder: 'https://dev.example.com' },
];

const SCORE_COLOR = (s) => s >= 7 ? 'text-emerald-400' : s >= 5 ? 'text-amber-400' : 'text-red-400';

export default function CrossEnvironmentDashboard() {
  const [environments, setEnvironments] = useState([
    { id: 1, label: 'Production', url: '', result: null, loading: false, error: null },
    { id: 2, label: 'Staging', url: '', result: null, loading: false, error: null },
  ]);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [runningAll, setRunningAll] = useState(false);

  const updateEnv = (id, patch) =>
    setEnvironments(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  const auditEnv = async (env) => {
    if (!env.url.trim()) return;
    updateEnv(env.id, { loading: true, error: null, result: null });
    try {
      const crawlRes = await base44.functions.invoke('claudeCrawl', { url: env.url });
      const analysisRes = await base44.functions.invoke('analyzeQA', { crawlData: crawlRes.data });
      updateEnv(env.id, { result: analysisRes.data, loading: false });
    } catch (err) {
      updateEnv(env.id, { error: err.message || 'Audit failed', loading: false });
    }
  };

  const auditAll = async () => {
    setRunningAll(true);
    await Promise.all(environments.filter(e => e.url.trim()).map(auditEnv));
    setRunningAll(false);
  };

  const addEnvironment = () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    setEnvironments(prev => [
      ...prev,
      { id: Date.now(), label: newLabel, url: newUrl, result: null, loading: false, error: null },
    ]);
    setNewLabel('');
    setNewUrl('');
  };

  const removeEnv = (id) => setEnvironments(prev => prev.filter(e => e.id !== id));

  const scored = environments.filter(e => e.result);
  const layers = ['overall', 'ui_ux', 'api', 'logic', 'business_value'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Cross-Environment Dashboard
        </h2>
        <Button size="sm" className="gap-2" onClick={auditAll} disabled={runningAll || environments.every(e => !e.url.trim())}>
          {runningAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Audit All
        </Button>
      </div>

      {/* Environment rows */}
      <div className="space-y-3">
        {environments.map((env) => (
          <motion.div
            key={env.id}
            layout
            className="rounded-lg border border-border/50 bg-secondary/30 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-primary w-20 shrink-0">{env.label}</span>
              <Input
                value={env.url}
                onChange={(e) => updateEnv(env.id, { url: e.target.value })}
                placeholder="https://..."
                className="h-8 text-xs flex-1"
                disabled={env.loading}
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 gap-1.5 shrink-0"
                onClick={() => auditEnv(env)}
                disabled={env.loading || !env.url.trim()}
              >
                {env.loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Audit
              </Button>
              <button onClick={() => removeEnv(env.id)} className="p-1 hover:bg-destructive/20 rounded transition-colors shrink-0">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>

            {env.error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {env.error}
              </p>
            )}

            {env.result && (
              <div className="grid grid-cols-5 gap-2">
                {layers.map(l => (
                  <div key={l} className="p-2 rounded bg-background/50 border border-border/30 text-center">
                    <p className="text-[10px] text-muted-foreground capitalize">{l.replace('_', ' ')}</p>
                    <p className={`text-sm font-bold ${SCORE_COLOR(env.result.scores[l])}`}>
                      {env.result.scores[l]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Add environment */}
      <div className="flex gap-2 items-end p-3 rounded-lg bg-secondary/20 border border-border/30">
        <div className="space-y-1 flex-1">
          <p className="text-[10px] text-muted-foreground">Label</p>
          <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="QA" className="h-8 text-xs" />
        </div>
        <div className="space-y-1 flex-[3]">
          <p className="text-[10px] text-muted-foreground">URL</p>
          <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..." className="h-8 text-xs" />
        </div>
        <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={addEnvironment} disabled={!newLabel.trim() || !newUrl.trim()}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>

      {/* Comparison matrix */}
      <AnimatePresence>
        {scored.length >= 2 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Score Matrix</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground">Environment</th>
                    {layers.map(l => (
                      <th key={l} className="text-center py-2 text-muted-foreground capitalize">{l.replace('_', ' ')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {scored.map((env) => (
                    <tr key={env.id}>
                      <td className="py-2 font-semibold text-foreground">{env.label}</td>
                      {layers.map(l => {
                        const scores = scored.map(e => e.result.scores[l]);
                        const max = Math.max(...scores);
                        const isMax = env.result.scores[l] === max;
                        return (
                          <td key={l} className="py-2 text-center">
                            <span className={`font-bold ${SCORE_COLOR(env.result.scores[l])} ${isMax ? 'underline underline-offset-2' : ''}`}>
                              {env.result.scores[l]}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground">Underlined = highest score per category.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}