import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from '@/lib/SessionContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Tooltip from '@/components/ui/Tooltip';
import PortfolioQuickSelect from '@/components/governance/PortfolioQuickSelect';
import {
  Zap, Plus, X, ChevronDown, ChevronUp, Info, Loader2, Check,
  AlertCircle
} from 'lucide-react';

const ACTIVITIES = [
  { key: 'self_test',           label: 'Self-Test',           locked: true,  desc: 'Always runs first to establish a functional baseline.' },
  { key: 'self_audit',          label: 'Self-Audit',          locked: true,  desc: 'Always runs after Self-Test to score findings.' },
  { key: 'self_protect',        label: 'Self-Protect',        locked: false, desc: 'Required before any Heal or Upgrade to enable rollback.' },
  { key: 'self_heal',           label: 'Self-Heal',           locked: false, desc: 'Fixes broken functionality detected in Self-Test.' },
  { key: 'self_optimize',       label: 'Self-Optimize',       locked: false, desc: 'Improves scoring dimensions that are below 8/10.' },
  { key: 'self_upgrade',        label: 'Self-Upgrade',        locked: false, desc: 'Locks improvements as a new version baseline.' },
  { key: 'capability_transfer', label: 'Capability Transfer', locked: false, desc: 'Generates sprint to add governance to target product.' },
];

const QUICK_SELECTS = [
  { label: 'Test + Audit Only', activities: ['self_test', 'self_audit'] },
  { label: 'Fix Issues',        activities: ['self_test', 'self_audit', 'self_protect', 'self_heal'] },
  { label: 'Improve',          activities: ['self_test', 'self_audit', 'self_protect', 'self_optimize'] },
  { label: 'Full Cycle',       activities: ['self_test', 'self_audit', 'self_protect', 'self_heal', 'self_optimize', 'self_upgrade'] },
];

const EVAL_GOALS = [
  'University Sustainability Director',
  'SMS Community Manager',
  'Publishing Professional',
  'Maternal Health Patient',
  'Relationship Coach',
  'General Visitor',
  'Custom',
];

function estimateDuration(urlCount, activityCount) {
  const avgMinPerActivity = 1.5;
  const min = Math.round(urlCount * activityCount * avgMinPerActivity * 0.7);
  const max = Math.round(urlCount * activityCount * avgMinPerActivity * 1.3);
  return `${min}–${max} min`;
}

function estimateTokens(urlCount, activityCount) {
  return (urlCount * activityCount * 4000).toLocaleString();
}

export default function MasterControlCard({ onLaunched, resumeMode = false, initialSettings = null }) {
  const { launchSession } = useSession();

  // Step 1 — URLs
  const [urlInput, setUrlInput] = useState('');
  const [chips, setChips] = useState(
    resumeMode && initialSettings?.urls
      ? initialSettings.urls.map(u => ({ id: u.id || Date.now().toString() + Math.random(), url: u.url, is_spa: u.is_spa ?? true, context: u.context || '' }))
      : []
  );
  const [expandedCtx, setExpandedCtx] = useState(new Set());
  const [showPortfolio, setShowPortfolio] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioSelected, setPortfolioSelected] = useState(new Set());

  // Step 1b — Environment scope (additive — does not affect existing session logic)
  const [envScope, setEnvScope] = useState('development'); // development | production | both

  // Step 2 — Activities
  const [activities, setActivities] = useState(
    resumeMode && initialSettings?.selected_activities
      ? new Set(initialSettings.selected_activities)
      : new Set(['self_test', 'self_audit'])
  );

  // Step 3 — Settings (smart defaults: manual iteration, per_url timing)
  const ss = initialSettings?.session_settings || {};
  const [iterationMode, setIterationMode] = useState(ss.iteration_mode || 'manual');
  const [urlProcessing, setUrlProcessing] = useState(ss.url_processing || 'sequential');
  const [gateTiming, setGateTiming] = useState(ss.gate_timing || 'per_url');
  const [evalGoal, setEvalGoal] = useState(ss.evaluation_goal || 'General Visitor');
  const [customGoal, setCustomGoal] = useState('');
  const [sameGoalAll, setSameGoalAll] = useState(ss.same_goal_all ?? true);

  // Launch
  const [validationError, setValidationError] = useState(null);
  const [launching, setLaunching] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl+Enter → launch
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!launching && chips.length > 0) handleLaunch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [launching, chips]);

  // Auto-enforce: protect required when heal/upgrade selected
  useEffect(() => {
    const needs = activities.has('self_heal') || activities.has('self_upgrade') || activities.has('self_optimize');
    if (needs && !activities.has('self_protect')) {
      setActivities(prev => new Set([...prev, 'self_protect']));
    }
  }, [activities]);

  const addChip = (rawUrl) => {
    const url = rawUrl.trim();
    if (!url) return;
    const isSpa = url.includes('.base44.app');
    const id = Date.now().toString();
    setChips(prev => [...prev, { id, url, is_spa: isSpa, context: '' }]);
    setUrlInput('');
  };

  const removeChip = (id) => setChips(prev => prev.filter(c => c.id !== id));

  const updateChip = (id, patch) => setChips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));

  const toggleCtx = (id) => setExpandedCtx(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const loadPortfolio = async () => {
    setPortfolioLoading(true);
    const prods = await base44.entities.ProductRegistry.list('-created_date');
    setPortfolio(prods);
    setPortfolioLoading(false);
  };

  const openPortfolio = () => {
    setShowPortfolio(true);
    loadPortfolio();
  };

  const addPortfolioSelected = () => {
    const toAdd = portfolio.filter(p => portfolioSelected.has(p.id));
    toAdd.forEach(p => {
      const id = Date.now().toString() + p.id;
      setChips(prev => [...prev, { id, url: p.url, is_spa: true, context: p.notes || '' }]);
    });
    setPortfolioSelected(new Set());
    setShowPortfolio(false);
  };

  const toggleActivity = (key) => {
    if (key === 'self_test' || key === 'self_audit') return;
    setActivities(prev => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const applyQuickSelect = (preset) => {
    setActivities(new Set(preset.activities));
  };

  const validate = () => {
    if (chips.length === 0) return 'Please add at least one URL to process.';
    for (const c of chips) {
      if (!c.url.startsWith('https://')) return `All URLs must begin with https:// — fix: ${c.url}`;
    }
    return null;
  };

  const handleLaunch = async () => {
    const err = validate();
    if (err) { setValidationError(err); return; }
    setValidationError(null);
    setLaunching(true);
    try {
      await launchSession({
        urls: chips,
        selectedActivities: [...activities],
        sessionSettings: { iteration_mode: iterationMode, url_processing: urlProcessing, gate_timing: gateTiming, evaluation_goal: evalGoal === 'Custom' ? customGoal : evalGoal, same_goal_all: sameGoalAll },
        capabilityTransfer: {},
      });
      if (onLaunched) onLaunched();
    } catch (e) {
      setValidationError(e.message);
    }
    setLaunching(false);
  };

  const activityCount = activities.size;
  const urlCount = chips.length;

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Master Control Card</h2>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-border bg-secondary/30 text-muted-foreground ml-1">Governance Session</span>
      </div>

      {/* STEP 1 — URLs */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Step 1 — Target URLs</Label>

        {/* Environment scope — additive optional field */}
        <div className="flex gap-1.5 p-1 rounded-lg bg-secondary/30 border border-border w-fit">
          {[
            { key: 'development', label: 'Development' },
            { key: 'production',  label: 'Production'  },
            { key: 'both',        label: 'Both'        },
          ].map(opt => (
            <button key={opt.key} onClick={() => setEnvScope(opt.key)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${envScope === opt.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {opt.label}
            </button>
          ))}
        </div>
        {envScope === 'both' && (
          <p className="text-[10px] text-amber-400 flex items-center gap-1">
            <Info className="h-3 w-3" /> Both selected — add Dev URL first, then Production URL. Comparative report will be generated after session.
          </p>
        )}

        {/* Portfolio Quick Select — primary URL entry */}
        <PortfolioQuickSelect
          onAdd={(chip) => {
            const id = Date.now().toString();
            setChips(prev => [...prev, { id, ...chip }]);
          }}
          onEvalGoalSuggestion={(goal) => { setEvalGoal('Custom'); setCustomGoal(goal); }}
        />

        {/* Manual URL entry — secondary option */}
        <div className="flex gap-2 mt-2">
          <Input value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addChip(urlInput)}
            placeholder="Or paste a custom URL manually…"
            className="h-8 text-xs flex-1 opacity-70 focus:opacity-100 transition-opacity" />
          <Tooltip content="Add this URL to the session">
            <Button size="sm" variant="outline" className="h-8 px-3 shrink-0" onClick={() => addChip(urlInput)}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </Tooltip>
        </div>

        {/* URL chips */}
        <div className="space-y-2">
          <AnimatePresence>
            {chips.map(chip => (
              <motion.div key={chip.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-foreground truncate flex-1" title={chip.url}>{chip.url}</span>
                  <button onClick={() => updateChip(chip.id, { is_spa: !chip.is_spa })}
                    className={`text-[10px] px-2 py-0.5 rounded border font-semibold transition-all shrink-0 ${chip.is_spa ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                    Base44 SPA
                  </button>
                  <button onClick={() => toggleCtx(chip.id)} className="text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-0.5 shrink-0">
                    {expandedCtx.has(chip.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Context
                  </button>
                  <button onClick={() => removeChip(chip.id)} className="text-muted-foreground hover:text-red-400 shrink-0">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {expandedCtx.has(chip.id) && (
                  <textarea value={chip.context} onChange={e => updateChip(chip.id, { context: e.target.value })}
                    placeholder="Add context about this app (purpose, pages, known issues, target users)..."
                    className="w-full h-16 text-[11px] bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {chips.length === 0 && <p className="text-[11px] text-muted-foreground text-center py-2">No URLs added yet</p>}
        </div>
      </div>

      {/* STEP 2 — Activities */}
      <div className="space-y-3">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Step 2 — Governance Activities</Label>

        {/* Quick select */}
        <div className="flex flex-wrap gap-1.5">
          {QUICK_SELECTS.map(qs => (
            <Tooltip key={qs.label} content={`Select: ${qs.activities.map(a => ACTIVITIES.find(x => x.key === a)?.label).join(', ')}`}>
              <button onClick={() => applyQuickSelect(qs)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded border border-border bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all">
                {qs.label}
              </button>
            </Tooltip>
          ))}
        </div>

        {/* Select All / Clear All */}
        <div className="flex gap-2">
          <Tooltip content="Check all optional activities. Self-Test and Self-Audit are always included.">
            <button onClick={() => setActivities(new Set(ACTIVITIES.map(a => a.key)))}
              className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Select All
            </button>
          </Tooltip>
          <span className="text-[10px] text-muted-foreground/40">·</span>
          <Tooltip content="Uncheck all optional activities. Self-Test and Self-Audit remain.">
            <button onClick={() => setActivities(new Set(['self_test', 'self_audit']))}
              className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors">
              Clear All
            </button>
          </Tooltip>
        </div>

        <div className="space-y-1.5">
          {ACTIVITIES.map(({ key, label, locked, desc }) => {
            const checked = activities.has(key);
            return (
              <label key={key} onClick={() => toggleActivity(key)} className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${checked ? 'border-primary/40 bg-primary/5' : 'border-border hover:bg-secondary/20'} ${locked ? 'opacity-75' : ''}`}>
                <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${checked ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
                  {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">{label}</span>
                    {locked && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">always on</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* STEP 3 — Settings */}
      <div className="space-y-4">
        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Step 3 — Session Settings</Label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Iteration Mode */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Iteration Mode</p>
            {[
              { key: 'manual',    label: 'Manual',    desc: 'Gates before every activity' },
              { key: 'semi_auto', label: 'Semi-Auto', desc: 'Auto Test/Audit, gates for rest' },
              { key: 'supervised',label: 'Supervised',desc: 'All auto, one final approval' },
            ].map(m => (
              <label key={m.key} className="flex items-start gap-2 cursor-pointer" onClick={() => setIterationMode(m.key)}>
                <div className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${iterationMode === m.key ? 'border-primary' : 'border-border'}`}>
                  {iterationMode === m.key && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{m.label}</p>
                  <p className="text-[9px] text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* URL Processing */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">URL Processing</p>
            {[
              { key: 'sequential',     label: 'Sequential',     desc: 'One URL fully, then next' },
              { key: 'parallel',       label: 'Parallel',       desc: 'All URLs simultaneously' },
              { key: 'priority_order', label: 'Priority Order', desc: 'User-defined drag order' },
            ].map(m => (
              <label key={m.key} className="flex items-start gap-2 cursor-pointer" onClick={() => setUrlProcessing(m.key)}>
                <div className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${urlProcessing === m.key ? 'border-primary' : 'border-border'}`}>
                  {urlProcessing === m.key && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{m.label}</p>
                  <p className="text-[9px] text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Gate Timing */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Human Gate Timing</p>
            {[
              { key: 'per_url',      label: 'Per URL',       desc: '4 gates per URL — most control' },
              { key: 'per_activity', label: 'Per Activity',  desc: 'One gate per activity across URLs' },
              { key: 'session_end',  label: 'Session End',   desc: 'All gates at end — one review' },
            ].map(m => (
              <label key={m.key} className="flex items-start gap-2 cursor-pointer" onClick={() => setGateTiming(m.key)}>
                <div className={`mt-0.5 h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${gateTiming === m.key ? 'border-primary' : 'border-border'}`}>
                  {gateTiming === m.key && <div className="h-2 w-2 rounded-full bg-primary" />}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-foreground">{m.label}</p>
                  <p className="text-[9px] text-muted-foreground">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Evaluation Goal */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground">Evaluation Goal</p>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={evalGoal} onChange={e => setEvalGoal(e.target.value)}
              className="h-8 rounded-md border border-input bg-transparent px-2 text-sm text-foreground">
              {EVAL_GOALS.map(g => <option key={g}>{g}</option>)}
            </select>
            {evalGoal === 'Custom' && (
              <Input value={customGoal} onChange={e => setCustomGoal(e.target.value)}
                placeholder="Describe your evaluation persona..." className="h-8 text-xs flex-1" />
            )}
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={sameGoalAll} onChange={e => setSameGoalAll(e.target.checked)} className="h-3.5 w-3.5" />
              Apply same goal to all URLs
            </label>
          </div>
        </div>
      </div>

      {/* Session Summary */}
      <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Session Summary</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          {[
            { label: 'URLs', value: urlCount || '—' },
            { label: 'Activities', value: activityCount },
            { label: 'Est. Duration', value: urlCount > 0 ? estimateDuration(urlCount, activityCount) : '—' },
            { label: 'Est. Tokens', value: urlCount > 0 ? estimateTokens(urlCount, activityCount) : '—' },
            { label: 'Processing', value: { sequential: 'Sequential', parallel: 'Parallel', priority_order: 'Priority Order' }[urlProcessing] },
            { label: 'Gate Timing', value: { per_url: 'Per URL', per_activity: 'Per Activity', session_end: 'Session End' }[gateTiming] },
          ].map(s => (
            <div key={s.label} className="flex justify-between border-b border-border/30 pb-1">
              <span className="text-muted-foreground">{s.label}:</span>
              <span className="text-foreground font-semibold">{s.value}</span>
            </div>
          ))}
        </div>
        <div className="pt-1">
          <p className="text-[10px] text-muted-foreground">
            Activities: <span className="text-foreground">{[...activities].map(a => ACTIVITIES.find(x => x.key === a)?.label).join(', ')}</span>
          </p>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-start gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {validationError}
        </div>
      )}

      {/* Launch */}
      <Tooltip content="Start the governance session with your current configuration (Cmd+Enter)">
        <Button onClick={handleLaunch} disabled={launching || chips.length === 0} className="w-full gap-2" size="lg">
          {launching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {launching ? 'Launching Session...' : resumeMode ? '⚡ Resume with New Settings' : '⚡ Launch Session'}
        </Button>
      </Tooltip>

      {/* Portfolio modal */}
      <AnimatePresence>
        {showPortfolio && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Select from Portfolio</h3>
                <button onClick={() => setShowPortfolio(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
              </div>
              {portfolioLoading ? <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div> : (
                portfolio.length === 0 ? <p className="text-sm text-muted-foreground text-center py-4">No products in Portfolio Engine yet.</p> : (
                  <div className="space-y-2">
                    {portfolio.map(p => (
                      <label key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${portfolioSelected.has(p.id) ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-secondary/20'}`}>
                        <input type="checkbox" checked={portfolioSelected.has(p.id)}
                          onChange={e => setPortfolioSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(p.id) : n.delete(p.id); return n; })}
                          className="h-4 w-4" />
                        <div>
                          <p className="text-sm font-semibold text-foreground">{p.label || p.url}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{p.url}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )
              )}
              <Button onClick={addPortfolioSelected} disabled={portfolioSelected.size === 0} className="w-full gap-2">
                Add Selected ({portfolioSelected.size})
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}