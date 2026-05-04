import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Database, Plus, Trash2, Play, TrendingUp, TrendingDown,
  Minus, ExternalLink, RefreshCw, Loader2
} from 'lucide-react';

function ScoreBadge({ score }) {
  if (score == null) return <span className="text-xs text-muted-foreground">—</span>;
  const color = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-sm font-bold ${color}`}>{Math.round(score)}</span>;
}

function DeltaBadge({ delta }) {
  if (delta == null) return null;
  if (delta > 0) return <span className="flex items-center gap-0.5 text-[10px] text-emerald-400"><TrendingUp className="h-2.5 w-2.5" />+{delta.toFixed(1)}</span>;
  if (delta < 0) return <span className="flex items-center gap-0.5 text-[10px] text-red-400"><TrendingDown className="h-2.5 w-2.5" />{delta.toFixed(1)}</span>;
  return <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground"><Minus className="h-2.5 w-2.5" />0</span>;
}

export default function ProductRegistryPanel({ onLoadIntoPortfolio }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); loadProducts(u); });
  }, []);

  const loadProducts = async (u) => {
    setLoading(true);
    const me = u || user;
    if (!me) return;
    const rows = await base44.entities.ProductRegistry.filter({ owner_email: me.email }, '-updated_date', 50);
    setProducts(rows);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newUrl.trim() || !user) return;
    setAdding(true);
    await base44.entities.ProductRegistry.create({
      owner_email: user.email,
      url: newUrl.trim(),
      label: newLabel.trim() || newUrl.trim(),
      run_count: 0,
    });
    setNewUrl('');
    setNewLabel('');
    await loadProducts();
    setAdding(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.ProductRegistry.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleLoad = () => {
    const appList = products.map(p => ({ url: p.url, label: p.label || p.url }));
    onLoadIntoPortfolio(appList);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" /> Product Registry
          <span className="text-[10px] text-muted-foreground font-normal">({products.length} saved)</span>
        </h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => loadProducts()} className="h-7 px-2 gap-1 text-xs">
            <RefreshCw className="h-3 w-3" />
          </Button>
          {products.length > 0 && (
            <Button size="sm" onClick={handleLoad} className="h-7 px-3 gap-1 text-xs">
              <Play className="h-3 w-3" /> Load All into Portfolio
            </Button>
          )}
        </div>
      </div>

      {/* Add form */}
      <div className="flex gap-2">
        <Input value={newUrl} onChange={e => setNewUrl(e.target.value)}
          placeholder="https://myapp.com" className="h-8 text-xs flex-1" />
        <Input value={newLabel} onChange={e => setNewLabel(e.target.value)}
          placeholder="Label (optional)" className="h-8 text-xs w-36" />
        <Button size="sm" onClick={handleAdd} disabled={adding || !newUrl.trim()} className="h-8 px-3 gap-1 text-xs shrink-0">
          {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          Add
        </Button>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading registry...
        </div>
      ) : products.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No products yet — add a URL above.</p>
      ) : (
        <div className="space-y-1.5">
          <AnimatePresence>
            {products.map(p => (
              <motion.div key={p.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{p.label || p.url}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.url}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {p.last_score != null && (
                    <div className="text-center">
                      <ScoreBadge score={p.last_score} />
                      <DeltaBadge delta={p.last_improvement} />
                    </div>
                  )}
                  {p.run_count > 0 && (
                    <span className="text-[9px] text-muted-foreground">{p.run_count} run{p.run_count !== 1 ? 's' : ''}</span>
                  )}
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}