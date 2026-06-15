import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, Plus, Search, MoreHorizontal, ExternalLink,
  History, ShieldCheck, Archive, Loader2, X, CheckCircle2, Play
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { productUpgradeReadiness } from '@/lib/products/portfolioReadiness';
import { deriveSlug, normalizeScore } from '@/lib/products/registry';
import { asArray, resolveArray } from '@/lib/uiDataGuards';

const STATUS_STYLES = {
  active:   { label: 'Active',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30' },
  beta:     { label: 'Beta',      color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/30' },
  archived: { label: 'Archived',  color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
};

const textValue = (value) => (typeof value === 'string' && value.trim() ? value.trim() : '');

function productFromApiRow(product = {}) {
  const name = textValue(product.name)
    || textValue(product.label)
    || textValue(product.product_name)
    || textValue(product.slug)
    || textValue(product.id)
    || 'Product';
  const slug = textValue(product.slug) || deriveSlug(name) || textValue(product.id);
  const liveUrl = textValue(product.live_url)
    || textValue(product.url)
    || textValue(product.canonical_url)
    || textValue(product.deployment_url)
    || textValue(product.upgrade_url)
    || textValue(product.base44_url);

  return {
    ...product,
    id: textValue(product.id) || slug,
    name,
    slug,
    org: textValue(product.org)
      || textValue(product.org_name)
      || textValue(product.organization)
      || textValue(product.org_id),
    live_url: liveUrl,
    url: liveUrl || textValue(product.url),
    description: textValue(product.description),
    status: textValue(product.status) || 'active',
  };
}

function AddProductModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', slug: '', live_url: '', description: '', org: 'VEU AI Studio', org_id: 'veu-ai-studio', status: 'active' });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim() || !form.slug.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { const data = await res.json(); onAdded(data); }
      else { onAdded(form); }
    } catch { onAdded(form); }
    setSaving(false);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-3 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-foreground">New Product</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-muted-foreground hover:text-foreground" /></button>
        </div>
        {[
          { key: 'name', placeholder: 'Product Name *' },
          { key: 'slug', placeholder: 'product-slug *' },
          { key: 'live_url', placeholder: 'https://live-url.com' },
          { key: 'org', placeholder: 'Organization' },
          { key: 'description', placeholder: 'Short description' },
        ].map(({ key, placeholder }) => (
          <Input key={key} placeholder={placeholder} value={form[key]}
            onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
            className="h-9 text-sm" />
        ))}
        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
          className="w-full h-9 text-sm rounded-md border border-input bg-background px-3 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="active">Active</option>
          <option value="beta">Beta</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex gap-2 pt-1">
          <Button onClick={submit} disabled={saving || !form.name.trim()} className="flex-1 gap-2">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Register
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ProductRegistry() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [clearanceMap, setClearanceMap] = useState({});
  const [registryMap, setRegistryMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);

  const load = async () => {
    setLoading(true);
    const [apiProducts, clearance, registry] = await Promise.all([
      fetch('/api/products').then(r => r.ok ? r.json() : []).catch(() => []),
      resolveArray(base44.entities.ClearanceRecord.list('-created_date')),
      resolveArray(base44.entities.ProductRegistry.list('-created_date')),
    ]);

    const cl = {};
    asArray(clearance).forEach(r => { cl[r.product_name] = r; });
    setClearanceMap(cl);

    const rm = {};
    asArray(registry).forEach(r => { rm[r.product_name || r.label] = r; });
    setRegistryMap(rm);

    const apiProductRows = Array.isArray(apiProducts?.items) ? apiProducts.items : asArray(apiProducts);
    setProducts(apiProductRows.map(productFromApiRow));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdded = (p) => {
    setProducts(prev => [...prev, productFromApiRow(p?.item || p)]);
  };

  const productUrl = (product) => product?.live_url || product?.url || product?.base44_url || '';
  const productScore = (product) => {
    const score = product?.last_score ?? product?.last_audit_score;
    if (typeof score === 'number' && score <= 10) return score;
    return normalizeScore(score);
  };

  const runProduct = (product) => {
    const params = new URLSearchParams();
    const targetUrl = productUrl(product);
    if (targetUrl) params.set('url', targetUrl);
    if (product?.name) params.set('product', product.name);
    if (product?.slug) params.set('productId', product.slug);
    navigate(`/flowai${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const stopAction = (event, action) => {
    event.stopPropagation();
    action();
  };

  const archiveProduct = async (slug) => {
    setProducts(prev => prev.map(p => p.slug === slug ? { ...p, status: 'archived' } : p));
    setOpenMenu(null);
    try {
      await fetch(`/api/products/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) });
    } catch {}
  };

  const safeProducts = asArray(products);
  const filtered = safeProducts.filter(p => {
    const matchSearch = !search.trim() ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.slug?.toLowerCase().includes(search.toLowerCase()) ||
      p.org?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="h-7 w-7 text-primary" /> Product Registry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">All registered products across VEU AI Studio</p>
        </div>
        <Button size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddModal(true)}>
          <Plus className="h-3.5 w-3.5" /> New Product
        </Button>
      </motion.div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="beta">Beta</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground bg-secondary/20">
                  <th className="text-left px-5 py-3 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Slug</th>
                  <th className="text-left px-4 py-3 font-semibold">Org</th>
                  <th className="text-left px-4 py-3 font-semibold">Status</th>
                  <th className="text-left px-4 py-3 font-semibold">Upgrade Repo</th>
                  <th className="text-left px-4 py-3 font-semibold">Deployment</th>
                  <th className="text-left px-4 py-3 font-semibold">Ready</th>
                  <th className="text-left px-4 py-3 font-semibold">Last Run</th>
                  <th className="text-right px-4 py-3 font-semibold">Demo Score</th>
                  <th className="text-right px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const st = STATUS_STYLES[p.status] || STATUS_STYLES.active;
                  const cl = clearanceMap[p.name];
                  const reg = registryMap[p.name];
                  const cleared = cl?.overall_status === 'cleared';
                  const readiness = productUpgradeReadiness(p, reg);
                  const score = productScore(p);
                  return (
                    <tr
                      key={p.slug}
                      onClick={() => runProduct(p)}
                      className="border-b border-border/50 hover:bg-secondary/20 transition-colors last:border-0 cursor-pointer"
                      title={`Run ${p.name} in FlowAI`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{p.name}</span>
                          {cleared && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{productUrl(p)}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{p.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.org || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.color} ${st.bg} ${st.border}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                          readiness.state.upgrade_repo_status === 'provisioned'
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30'
                            : readiness.state.upgrade_repo_status === 'access_blocked'
                              ? 'text-red-400 bg-red-500/10 border-red-500/30'
                              : 'text-muted-foreground bg-secondary border-border'
                        }`}>
                          {readiness.upgradeRepoLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                          readiness.state.deployment_status === 'deployed'
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30'
                            : readiness.state.deployment_status === 'access_blocked'
                              ? 'text-red-400 bg-red-500/10 border-red-500/30'
                              : 'text-muted-foreground bg-secondary border-border'
                        }`}>
                          {readiness.deploymentLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${
                          readiness.ready
                            ? 'text-emerald-400 bg-emerald-400/10 border-emerald-500/30'
                            : 'text-muted-foreground bg-secondary border-border'
                        }`}>
                          {readiness.readyLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {reg?.last_run_at ? formatDistanceToNow(new Date(reg.last_run_at), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {score != null
                          ? <span className={`font-bold ${score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{score}/10</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 relative">
                          <button
                            onClick={(event) => stopAction(event, () => runProduct(p))}
                            title={`Run ${p.name}`}
                            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1.5 text-[11px] font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
                          >
                            <Play className="h-3 w-3 fill-current" /> Run
                          </button>
                          <button onClick={(event) => stopAction(event, () => navigate('/'))} title="Open Workspace"
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(event) => stopAction(event, () => navigate('/runs'))} title="View History"
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(event) => stopAction(event, () => navigate('/clearance'))} title="Run Clearance"
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-emerald-400 transition-colors">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={(event) => stopAction(event, () => setOpenMenu(openMenu === p.slug ? null : p.slug))}
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {openMenu === p.slug && (
                            <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                              <button onClick={(event) => stopAction(event, () => archiveProduct(p.slug))}
                                className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 flex items-center gap-2">
                                <Archive className="h-3.5 w-3.5" /> Archive
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAddModal && <AddProductModal onClose={() => setShowAddModal(false)} onAdded={handleAdded} />}
      </AnimatePresence>
    </div>
  );
}
