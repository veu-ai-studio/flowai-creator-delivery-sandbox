import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Package, Plus, Search, MoreHorizontal, ExternalLink,
  History, ShieldCheck, Archive, Loader2, X, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const VEU_SEED = [
  { name: 'SAIGE',       slug: 'saige',       live_url: 'https://saigeplatform.com',       description: 'Sustainability reporting for universities', org: 'VEU AI Studio', status: 'active' },
  { name: 'PressAI',     slug: 'pressai',     live_url: 'https://ourpublishingai.com',     description: 'AI publishing for authors and publishers', org: 'VEU AI Studio', status: 'active' },
  { name: 'ReachSMS',    slug: 'reachsms',    live_url: 'https://ourcommunitiesai.com',    description: 'SMS community engagement for nonprofits', org: 'VEU AI Studio', status: 'active' },
  { name: 'RelTwin',     slug: 'reltwin',     live_url: 'https://reltwin.com',             description: 'Relationship intelligence for coaches and HR', org: 'VEU AI Studio', status: 'active' },
  { name: 'MyBirthSafe', slug: 'mybirthsafe', live_url: 'https://preglife.com',            description: 'Maternal health platform for Africa', org: 'VEU AI Studio', status: 'active' },
];

const STATUS_STYLES = {
  active:   { label: 'Active',    color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-500/30' },
  beta:     { label: 'Beta',      color: 'text-amber-400',   bg: 'bg-amber-400/10',   border: 'border-amber-500/30' },
  archived: { label: 'Archived',  color: 'text-muted-foreground', bg: 'bg-secondary', border: 'border-border' },
};

function AddProductModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', slug: '', live_url: '', description: '', org: 'VEU AI Studio', status: 'active' });
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
      base44.entities.ClearanceRecord.list('-created_date').catch(() => []),
      base44.entities.ProductRegistry.list('-created_date').catch(() => []),
    ]);

    const cl = {};
    clearance.forEach(r => { cl[r.product_name] = r; });
    setClearanceMap(cl);

    const rm = {};
    registry.forEach(r => { rm[r.product_name || r.label] = r; });
    setRegistryMap(rm);

    // Use API products if any, otherwise seed with VEU defaults
    const list = Array.isArray(apiProducts) && apiProducts.length > 0 ? apiProducts : VEU_SEED;
    setProducts(list);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdded = (p) => {
    setProducts(prev => [...prev, p]);
  };

  const archiveProduct = async (slug) => {
    setProducts(prev => prev.map(p => p.slug === slug ? { ...p, status: 'archived' } : p));
    setOpenMenu(null);
    try {
      await fetch(`/api/products/${slug}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'archived' }) });
    } catch {}
  };

  const filtered = products.filter(p => {
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
                  return (
                    <tr key={p.slug} className="border-b border-border/50 hover:bg-secondary/20 transition-colors last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{p.name}</span>
                          {cleared && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{p.live_url}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">{p.slug}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.org || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${st.color} ${st.bg} ${st.border}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {reg?.last_run_at ? formatDistanceToNow(new Date(reg.last_run_at), { addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {reg?.last_score != null
                          ? <span className={`font-bold ${reg.last_score >= 7 ? 'text-emerald-400' : reg.last_score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>{reg.last_score}/10</span>
                          : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 relative">
                          <button onClick={() => navigate('/')} title="Open Workspace"
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-primary transition-colors">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => navigate('/runs')} title="View History"
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                            <History className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => navigate('/clearance')} title="Run Clearance"
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-emerald-400 transition-colors">
                            <ShieldCheck className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setOpenMenu(openMenu === p.slug ? null : p.slug)}
                            className="p-1.5 rounded hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                          {openMenu === p.slug && (
                            <div className="absolute right-0 top-8 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[120px]">
                              <button onClick={() => archiveProduct(p.slug)}
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