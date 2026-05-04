import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SlidersHorizontal, ListChecks, Pencil, Link2, Layers, Target,
  Zap, Clock, Wrench, Loader2, ChevronRight, Mic, MicOff, Plus, Check, X
} from 'lucide-react';
import { listProducts as listLocalProducts, createProduct as createLocalProduct } from '@/lib/flowaiClient';

const SPEECH_SUPPORTED = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

const OBJECTIVES = [
  { value: 'audit_demo',       label: 'Audit for prospect demo readiness' },
  { value: 'investor_review',  label: 'Prepare for investor review' },
  { value: 'full_governance',  label: 'Full governance and clearance cycle' },
  { value: 'compare',          label: 'Compare two or more products' },
  { value: 'combine',          label: 'Combine inputs into a unified specification' },
  { value: 'benchmark',        label: 'Benchmark against competitors' },
  { value: 'launch_readiness', label: 'Launch readiness check' },
  { value: 'custom',           label: 'Custom — I will describe my objective' },
];

const INPUT_METHODS = [
  { key: 'describe',    label: 'Describe & Build',    icon: Pencil, desc: 'Type a natural language description of the product.' },
  { key: 'clone',       label: 'Clone & Improve',      icon: Link2,  desc: 'Provide an existing product URL to audit and improve.' },
  { key: 'synthesize',  label: 'Synthesize & Build',   icon: Layers, desc: 'Provide 2–5 URLs. FlowAI extracts the best from each.' },
];

const DEPTHS = ['Quick (3–5 min)', 'Standard (8–10 min)', 'Deep (15–20 min)'];
const THRESHOLDS = ['70%', '80%', '90%'];
const RERUNS = ['1', '2', '3'];
const FORMATS = ['Summary', 'Full', 'Executive Brief'];

// Session config stored in sessionStorage so all modes can read it
export const CONFIG_KEY = 'flowai_session_config';

export function getSessionConfig() {
  try { return JSON.parse(sessionStorage.getItem(CONFIG_KEY) || 'null'); } catch { return null; }
}

export function saveSessionConfig(config) {
  sessionStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export default function Configuration() {
  const navigate = useNavigate();

  // Read ?mode= query param to pre-select input method
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get('mode'); // 'describe' | 'clone' | 'synthesize'

  // Card 1 — Product
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductUrl, setNewProductUrl] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Card 2 — Input method — default from URL param or 'describe'
  const [inputMethod, setInputMethod] = useState(
    ['describe', 'clone', 'synthesize'].includes(modeParam) ? modeParam : 'describe'
  );
  const [inputValue, setInputValue] = useState('');
  const [extraUrls, setExtraUrls] = useState(['', '']);

  // Card 3 — Objective
  const [objective, setObjective] = useState('audit_demo');
  const [customObjective, setCustomObjective] = useState('');
  const [objListening, setObjListening] = useState(false);
  const objRecRef = useRef(null);

  // Card 4 — Auto params
  const [depth, setDepth] = useState('Standard (8–10 min)');
  const [benchmark, setBenchmark] = useState(false);
  const [threshold, setThreshold] = useState('80%');
  const [maxReruns, setMaxReruns] = useState('2');
  const [format, setFormat] = useState('Summary');

  // If URL param changes (user navigates between sidebar items), update inputMethod
  useEffect(() => {
    if (['describe', 'clone', 'synthesize'].includes(modeParam)) {
      setInputMethod(modeParam);
    }
  }, [modeParam]);

  useEffect(() => {
    let resolved = false;
    base44.entities.CreatedProduct.list('-created_date').then(data => {
      resolved = true;
      const local = listLocalProducts();
      const merged = [...data, ...local.filter(l => !data.some(b => b.product_name === l.product_name))];
      setProducts(merged);
      if (merged[0]) setSelectedProductId(merged[0].id);
      setLoadingProducts(false);
    }).catch(() => {
      resolved = true;
      const local = listLocalProducts();
      setProducts(local);
      if (local[0]) setSelectedProductId(local[0].id);
      setLoadingProducts(false);
    });
    setTimeout(() => {
      if (!resolved) {
        const local = listLocalProducts();
        setProducts(local);
        if (local[0]) setSelectedProductId(local[0].id);
        setLoadingProducts(false);
      }
    }, 1500);
  }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  // Inline product creation — try Base44, fall back to localStorage so it
  // always succeeds and immediately appears in the list.
  const saveNewProduct = async () => {
    if (!newProductName.trim()) return;
    setSavingProduct(true);
    let created = null;
    try {
      created = await base44.entities.CreatedProduct.create({
        product_name: newProductName.trim(),
        base44_url: newProductUrl.trim() || undefined,
        client_name: 'VEU AI Studio',
        creation_mode: 'describe',
        created_at: new Date().toISOString(),
      });
    } catch {
      created = createLocalProduct({
        product_name: newProductName.trim(),
        base44_url: newProductUrl.trim(),
      });
    }
    if (!created) {
      created = createLocalProduct({
        product_name: newProductName.trim(),
        base44_url: newProductUrl.trim(),
      });
    }
    const updated = [...products, created];
    setProducts(updated);
    setSelectedProductId(created.id);
    setNewProductName('');
    setNewProductUrl('');
    setShowCreateForm(false);
    setSavingProduct(false);
  };

  const toggleObjVoice = () => {
    if (objListening) { objRecRef.current?.stop(); setObjListening(false); return; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false; r.interimResults = false; r.lang = 'en-US';
    r.onresult = (e) => setCustomObjective(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript);
    r.onend = () => setObjListening(false);
    r.onerror = () => setObjListening(false);
    objRecRef.current = r;
    r.start();
    setObjListening(true);
  };

  const buildConfig = () => {
    const effectiveObjective = objective === 'custom'
      ? (customObjective.trim() || 'Custom objective')
      : OBJECTIVES.find(o => o.value === objective)?.label || objective;

    const inputs = [];
    if (inputMethod === 'synthesize') {
      const validUrls = [inputValue, ...extraUrls].filter(u => u.trim());
      validUrls.forEach((url, i) => {
        inputs.push({ id: i + 1, type: 'url', value: url, name: `Input ${String.fromCharCode(65 + i)}` });
      });
    } else if (inputMethod === 'describe') {
      inputs.push({ id: 1, type: 'description', value: inputValue, name: 'Input A' });
    } else {
      inputs.push({ id: 1, type: 'url', value: inputValue, name: 'Input A' });
    }

    return {
      product: selectedProduct ? { id: selectedProduct.id, name: selectedProduct.product_name, url: selectedProduct.base44_url || '' } : null,
      inputs,
      inputMethod,
      objective: effectiveObjective,
      opsMode: null,
      autoParams: { depth, benchmark, threshold, maxReruns: parseInt(maxReruns), format },
      multiMode: inputMethod === 'synthesize' ? 'combine' : (objective === 'compare' ? 'compare' : null),
    };
  };

  const launch = (mode) => {
    const config = buildConfig();
    config.opsMode = mode;
    saveSessionConfig(config);
    if (mode === 'auto') navigate('/auto-runner');
    else if (mode === 'guided') navigate('/guided/research');
    else navigate('/manual/research');
  };

  const canLaunch = inputValue.trim() || selectedProduct;

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <SlidersHorizontal className="h-7 w-7 text-primary" /> Session Configuration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your session once — then launch into Auto, Guided, or Manual operations. No re-entry required.
        </p>
      </motion.div>

      {/* ── CARD 1 — MY PRODUCTS ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            <p className="text-sm font-bold text-foreground">Card 1 — My Products</p>
          </div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 font-semibold transition-colors"
            >
              <Plus className="h-3 w-3" /> Create New Product
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Select which product this session is for. The product name and URL carry forward automatically.</p>

        {/* Inline create form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-primary">New Product</p>
                  <button onClick={() => { setShowCreateForm(false); setNewProductName(''); setNewProductUrl(''); }}
                    className="text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Input
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                  placeholder="Product name"
                  className="h-9 text-sm"
                  autoFocus
                />
                <Input
                  value={newProductUrl}
                  onChange={e => setNewProductUrl(e.target.value)}
                  placeholder="Product URL (optional)"
                  className="h-9 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveNewProduct} disabled={!newProductName.trim() || savingProduct} className="gap-1.5 text-xs h-8">
                    {savingProduct ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Save Product
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowCreateForm(false); setNewProductName(''); setNewProductUrl(''); }} className="text-xs h-8 text-muted-foreground">
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loadingProducts ? (
          <div className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Loading products…</span></div>
        ) : products.length === 0 && !showCreateForm ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">No products yet. Click <span className="text-primary font-semibold">Create New Product</span> above to add one.</p>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {products.map(p => (
              <button key={p.id} onClick={() => setSelectedProductId(p.id)}
                className={`rounded-lg border p-3 text-left transition-all ${selectedProductId === p.id ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <div className="flex items-center gap-2">
                  {selectedProductId === p.id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <p className="text-xs font-semibold text-foreground truncate">{p.product_name}</p>
                </div>
                {p.base44_url && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{p.base44_url}</p>}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── CARD 2 — INPUT METHOD ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Card 2 — Input Method</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {INPUT_METHODS.map(m => {
            const Icon = m.icon;
            const active = inputMethod === m.key;
            return (
              <button key={m.key} onClick={() => setInputMethod(m.key)}
                className={`rounded-lg border p-3 text-left transition-all space-y-1.5 ${active ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                <div className="flex items-center gap-1.5">
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-xs font-bold ${active ? 'text-primary' : 'text-foreground'}`}>{m.label}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{m.desc}</p>
              </button>
            );
          })}
        </div>

        {/* Inline input fields — expand based on selection */}
        <AnimatePresence mode="wait">
          {inputMethod === 'describe' && (
            <motion.div key="describe" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <textarea
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setInputValue(prev => prev + t); }}
                placeholder="Describe your product — what it does, who it's for, key features…"
                className="w-full h-24 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </motion.div>
          )}
          {inputMethod === 'clone' && (
            <motion.div key="clone" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Input
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                placeholder="https://existing-product.com"
                className="h-9 text-sm"
                autoFocus
              />
            </motion.div>
          )}
          {inputMethod === 'synthesize' && (
            <motion.div key="synthesize" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              <p className="text-[11px] text-muted-foreground">Enter 2–5 URLs to synthesize from:</p>
              {[inputValue, ...extraUrls].map((url, i) => (
                <Input
                  key={i}
                  value={i === 0 ? inputValue : extraUrls[i - 1]}
                  onChange={e => {
                    if (i === 0) setInputValue(e.target.value);
                    else setExtraUrls(prev => prev.map((u, j) => j === i - 1 ? e.target.value : u));
                  }}
                  placeholder={`URL ${i + 1}${i < 2 ? ' (required)' : ' (optional)'}`}
                  className="h-9 text-sm"
                  autoFocus={i === 0}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CARD 3 — OBJECTIVE ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Card 3 — Objective</p>
        </div>
        <p className="text-[11px] text-muted-foreground">FlowAI tailors every step's findings to this goal.</p>
        <select value={objective} onChange={e => setObjective(e.target.value)}
          className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          {OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {objective === 'custom' && (
          <div className="flex gap-2 items-center">
            <Input value={customObjective} onChange={e => setCustomObjective(e.target.value)}
              placeholder="Describe your objective…" className="h-9 text-sm flex-1" />
            {SPEECH_SUPPORTED && (
              <button onClick={toggleObjVoice}
                className={`h-9 w-9 flex items-center justify-center rounded-md border shrink-0 transition-all ${objListening ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse' : 'border-input text-muted-foreground hover:text-foreground'}`}>
                {objListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── CARD 4 — AUTO PARAMETERS ── */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Card 4 — Auto Operations Parameters</p>
        </div>
        <p className="text-[11px] text-muted-foreground">These settings apply when you launch via Run Auto.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Analysis Depth</label>
            <div className="flex gap-1.5 flex-wrap">
              {DEPTHS.map(d => (
                <button key={d} onClick={() => setDepth(d)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-semibold ${depth === d ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Confidence Threshold Before Auto-Advancing</label>
            <div className="flex gap-1.5">
              {THRESHOLDS.map(t => (
                <button key={t} onClick={() => setThreshold(t)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-semibold ${threshold === t ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Max Reruns Per Step if Threshold Not Met</label>
            <div className="flex gap-1.5">
              {RERUNS.map(r => (
                <button key={r} onClick={() => setMaxReruns(r)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-semibold ${maxReruns === r ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground">Final Report Format</label>
            <div className="flex gap-1.5 flex-wrap">
              {FORMATS.map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-semibold ${format === f ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-semibold text-muted-foreground">Include Competitor Benchmarking</label>
            <div className="flex gap-1.5">
              {['Yes', 'No'].map(v => (
                <button key={v} onClick={() => setBenchmark(v === 'Yes')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all font-semibold ${benchmark === (v === 'Yes') ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 5 — LAUNCH ── */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ChevronRight className="h-4 w-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Card 5 — Launch</p>
        </div>

        {selectedProduct && (
          <div className="text-[11px] text-muted-foreground">
            Product: <span className="font-semibold text-foreground">{selectedProduct.product_name}</span>
            {selectedProduct.base44_url && <> · <span className="text-primary">{selectedProduct.base44_url}</span></>}
          </div>
        )}

        <div className="flex gap-3 flex-wrap">
          <Button onClick={() => launch('auto')} disabled={!canLaunch} className="gap-2 flex-1 min-w-[120px]">
            <Zap className="h-4 w-4" /> Run Auto
          </Button>
          <Button onClick={() => launch('guided')} disabled={!canLaunch} variant="outline" className="gap-2 flex-1 min-w-[120px] border-amber-500/40 text-amber-400 hover:bg-amber-500/10">
            <Clock className="h-4 w-4" /> Start Guided
          </Button>
          <Button onClick={() => launch('manual')} disabled={!canLaunch} variant="outline" className="gap-2 flex-1 min-w-[120px]">
            <Wrench className="h-4 w-4" /> Start Manual
          </Button>
        </div>

        {!canLaunch && (
          <p className="text-[11px] text-muted-foreground">Enter a product description or URL, or select a product above to enable launch.</p>
        )}
      </div>
    </div>
  );
}