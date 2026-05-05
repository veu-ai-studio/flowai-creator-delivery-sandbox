import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layers, Plus, Zap, ShieldCheck, Activity, DollarSign,
  Loader2, ExternalLink, RefreshCw, X, Globe, CheckCircle2,
  AlertTriangle, Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const VEU_PRODUCTS = [
  { name: 'SAIGE',       slug: 'saige',       live_url: 'https://saigeplatform.com',       description: 'Sustainability reporting for universities and utilities', org: 'VEU AI Studio', status: 'active' },
  { name: 'PressAI',     slug: 'pressai',     live_url: 'https://ourpublishingai.com',     description: 'AI publishing platform for authors and publishers', org: 'VEU AI Studio', status: 'active' },
  { name: 'ReachSMS',    slug: 'reachsms',    live_url: 'https://ourcommunitiesai.com',    description: 'SMS community engagement for nonprofits', org: 'VEU AI Studio', status: 'active' },
  { name: 'RelTwin',     slug: 'reltwin',     live_url: 'https://reltwin.com',             description: 'Relationship intelligence for coaches and HR', org: 'VEU AI Studio', status: 'active' },
  { name: 'MyBirthSafe', slug: 'mybirthsafe', live_url: 'https://preglife.com',            description: 'Maternal health platform for Africa', org: 'VEU AI Studio', status: 'active' },
];

function HealthBadge({ score }) {
  if (score == null) return <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">No score</span>;
  if (score >= 7) return <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold">{score}/10 ✓</span>;
  if (score >= 5) return <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold">{score}/10 ⚠</span>;
  return <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/40 bg-red-500/10 text-red-400 font-bold">{score}/10 ✗</span>;
}

function StatCard({ icon: Icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

function AddProductModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', slug: '', live_url: '', description: '', org: 'VEU AI Studio' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
    } catch {}
    // Also create in local registry entity as fallback
    await base44.entities.ProductRegistry.create({
      label: form.name,
      url: form.live_url,
      product_name: form.name,
    }).catch(() => {});
    setSaving(false);
    onAdded(form);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Register New Product</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        {[
          { key: 'name', placeholder: 'Product Name *', label: 'Name' },
          { key: 'slug', placeholder: 'product-slug *', label: 'Slug' },
          { key: 'live_url', placeholder: 'https://...', label: 'Live URL' },
          { key: 'org', placeholder: 'Organization', label: 'Org' },
          { key: 'description', placeholder: 'Short description', label: 'Description' },
        ].map(({ key, placeholder }) => (
          <Input key={key} placeholder={placeholder} value={form[key]}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="h-9 text-sm" />
        ))}
        <div className="flex gap-2 pt-1">
          <Button onClick={submit} disabled={saving || !form.name.trim()} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Register Product
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function PortfolioDashboard() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [clearanceRecords, setClearanceRecords] = useState({});
  const [stats, setStats] = useState({ total: 0, activeRuns: 0, demoReady: 0, cost: null });
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState('VEU AI Studio');
  const [showAddModal, setShowAddModal] = useState(false);
  const [extraProducts, setExtraProducts] = useState([]);

  const load = async () => {
    setLoading(true);
    const [registry, clearance, runs, apiProducts] = await Promise.all([
      base44.entities.ProductRegistry.list('-created_date').catch(() => []),
      base44.entities.ClearanceRecord.list('-created_date').catch(() => []),
      base44.entities.AutoSession.filter({ overall_status: 'running' }, '-started_at', 50).catch(() => []),
      fetch('/api/products').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    // Merge API products with VEU defaults
    const apiMap = {};
    (Array.isArray(apiProducts) ? apiProducts : []).forEach(p => { apiMap[p.slug || p.name] = p; });

    // Build product list: API products take precedence, then VEU defaults, then extras
    const allProducts = [...VEU_PRODUCTS, ...extraProducts].map(p => ({
      ...p,
      ...(apiMap[p.slug] || {}),
    }));

    const clMap = {};
    clearance.forEach(r => { clMap[r.product_name] = r; });
    setClearanceRecords(clMap);

    // Enrich with registry data
    const registryMap = {};
    registry.forEach(r => { registryMap[r.product_name || r.label] = r; });

    const enriched = allProducts.map(p => ({
      ...p,
      last_score: registryMap[p.name]?.last_score ?? null,
      last_run_at: registryMap[p.name]?.last_run_at ?? null,
    }));

    setProducts(enriched);

    const demoReady = clearance.filter(r => r.overall_status === 'cleared').length;
    setStats({
      total: enriched.length,
      activeRuns: runs.length,
      demoReady,
      cost: null,
    });

    // Try to get org from /api/me
    fetch('/api/me').then(r => r.ok ? r.json() : null).then(me => {
      if (me?.org_name) setOrgName(me.org_name);
    }).catch(() => {});

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleProductAdded = (p) => {
    setExtraProducts(prev => [...prev, { ...p, status: 'active' }]);
    load();
  };

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Portfolio Dashboard</h1>
                <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-secondary text-muted-foreground font-semibold">{orgName}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">VEU AI Studio — AI portfolio control center</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={load} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddModal(true)}>
              <Plus className="h-3.5 w-3.5" /> Add Product
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Hero Stats */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Total Products" value={stats.total} sub="Registered in portfolio" />
        <StatCard icon={Activity} label="Active Runs" value={stats.activeRuns} sub="Last 24 hours" color="text-blue-400" bg="bg-blue-400/10" />
        <StatCard icon={ShieldCheck} label="Demo-Ready" value={stats.demoReady} sub="Cleared for launch" color="text-emerald-400" bg="bg-emerald-400/10" />
        <StatCard icon={DollarSign} label="Total Cost (30d)" value={stats.cost != null ? `$${stats.cost}` : '—'} sub="Across all products" color="text-amber-400" bg="bg-amber-400/10" />
      </motion.div>

      {/* Product Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 rounded-xl border border-dashed border-border">
          <Layers className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-semibold text-muted-foreground">No products registered</p>
          <p className="text-xs text-muted-foreground/60">Register your first product to start tracking portfolio health.</p>
          <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Register First Product
          </Button>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const cl = clearanceRecords[product.name];
            const cleared = cl?.overall_status === 'cleared';
            return (
              <div key={product.slug} className="rounded-xl border border-border bg-card p-5 space-y-3 hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">{product.name}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[180px]">{product.live_url}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <HealthBadge score={product.last_score} />
                    {cleared && <span className="text-[9px] text-emerald-400 font-bold">🏆 CLEARED</span>}
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{cl ? `Step ${cl.current_step || 1}/6 clearance` : 'Clearance not started'}</span>
                  {product.last_run_at && (
                    <span>{formatDistanceToNow(new Date(product.last_run_at), { addSuffix: true })}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button onClick={() => navigate('/')}
                    className="text-[9px] py-1.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-all font-bold">
                    Open Workspace
                  </button>
                  <button onClick={() => navigate('/clearance')}
                    className="text-[9px] py-1.5 rounded border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all font-bold">
                    Clearance
                  </button>
                  <button onClick={() => navigate('/runs')}
                    className="text-[9px] py-1.5 rounded border border-border text-muted-foreground hover:bg-secondary/30 transition-all font-bold">
                    Runs
                  </button>
                </div>
              </div>
            );
          })}

          {/* Add Product Card */}
          <button onClick={() => setShowAddModal(true)}
            className="rounded-xl border border-dashed border-border bg-card/50 p-5 flex flex-col items-center justify-center gap-3 hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[180px]">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Add Product</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Register a new product to the portfolio</p>
            </div>
          </button>
        </motion.div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddProductModal onClose={() => setShowAddModal(false)} onAdded={handleProductAdded} />
        )}
      </AnimatePresence>
    </div>
  );
}