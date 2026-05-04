import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Layers, Loader2, Eye, Copy, Check, ExternalLink, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AiDisclaimer from '@/components/gtm/AiDisclaimer';

const MODE_LABEL = { describe: '📝 Describe & Build', clone: '🔗 Clone & Improve', synthesize: '🔀 Synthesize & Build' };
const CLEARANCE_STYLE = {
  not_started: { label: 'Not Started', color: 'text-muted-foreground', border: 'border-border' },
  in_progress:  { label: 'In Progress', color: 'text-blue-400',        border: 'border-blue-500/30' },
  cleared:      { label: 'Cleared',     color: 'text-emerald-400',     border: 'border-emerald-500/30' },
  blocked:      { label: 'Blocked',     color: 'text-red-400',         border: 'border-red-500/30' },
};

function CopyBtn({ text, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> {label}</>}
    </button>
  );
}

function ProductCard({ product }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null); // null | 'strategy' | 'architecture' | 'sprint'
  const cs = CLEARANCE_STYLE[product.clearance_status || 'not_started'];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-foreground">{product.product_name}</h3>
              <span className="text-[10px] text-muted-foreground">{MODE_LABEL[product.creation_mode] || product.creation_mode}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cs.border} ${cs.color}`}>{cs.label}</span>
            </div>
            {/* Attribution */}
            <p className="text-xs font-semibold text-primary mt-1">
              Built for {product} by VEU AI Studio
            </p>
            {product.target_audience && <p className="text-[11px] text-muted-foreground">{product.target_audience}</p>}
          </div>
          <p className="text-[10px] text-muted-foreground shrink-0">
            {product.created_date ? new Date(product.created_date).toLocaleDateString() : ''}
          </p>
        </div>

        {/* Source URLs for clone/synthesize */}
        {product.source_urls?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.source_urls.map((u, i) => (
              <a key={i} href={u} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded border border-border text-muted-foreground hover:text-primary transition-colors">
                <ExternalLink className="h-2.5 w-2.5" /> {u.replace(/^https?:\/\//, '').slice(0, 30)}
              </a>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          {product.product_strategy && (
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
              onClick={() => setExpanded(expanded === 'strategy' ? null : 'strategy')}>
              <Eye className="h-3 w-3" /> Strategy
            </Button>
          )}
          {product.technical_architecture && (
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
              onClick={() => setExpanded(expanded === 'architecture' ? null : 'architecture')}>
              <Eye className="h-3 w-3" /> Architecture
            </Button>
          )}
          {product.build_sprint && (
            <Button size="sm" variant="outline" className="gap-1 text-xs h-7"
              onClick={() => setExpanded(expanded === 'sprint' ? null : 'sprint')}>
              <Eye className="h-3 w-3" /> Build Sprint
            </Button>
          )}
          <Button size="sm" className="gap-1 text-xs h-7" onClick={() => navigate('/clearance')}>
            <ShieldCheck className="h-3 w-3" /> Start Clearance
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border">
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground capitalize">{expanded.replace('_', ' ')}</p>
                <CopyBtn text={product[expanded === 'sprint' ? 'build_sprint' : expanded === 'strategy' ? 'product_strategy' : 'technical_architecture'] || ''} label="Copy" />
              </div>
              <pre className="text-[10px] font-sans bg-secondary/30 border border-border rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-y-auto text-foreground leading-relaxed">
                {(expanded === 'strategy' ? product.product_strategy : expanded === 'architecture' ? product.technical_architecture : product.build_sprint) || ''}
              </pre>
              <AiDisclaimer />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MyCreations() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.CreatedProduct.list('-created_date').then(data => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" /> My Products
            </h1>
            <p className="text-sm text-muted-foreground mt-1">All products created through FlowAI My Workspace</p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/workspace')}>
            + New Product
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20">
          <Layers className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No creations yet</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Use My Workspace to build your first product</p>
          <Button size="sm" className="mt-4 gap-1.5 text-xs" onClick={() => navigate('/workspace')}>Open My Workspace</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}