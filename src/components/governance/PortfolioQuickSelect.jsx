import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { ChevronDown, Plus, Clock, Search, Loader2, Star } from 'lucide-react';

// Pre-loaded VEU AI Studio products — shown even before DB loads
const PRESET_PRODUCTS = [
  { id: 'saige',       label: 'SAIGE',       url: 'https://saige.base44.app',                      is_spa: true,  last_score: null },
  { id: 'pressai',     label: 'PressAI',     url: 'https://pressai1.base44.app',                   is_spa: true,  last_score: null },
  { id: 'reachsms',    label: 'ReachSMS',    url: 'https://reachsms.base44.app',                   is_spa: true,  last_score: null },
  { id: 'reltwin',     label: 'RelTwin',     url: 'https://reltwin.com',                           is_spa: false, last_score: null },
  { id: 'mybirthsafe', label: 'MyBirthSafe', url: 'https://mybirthsafe.base44.app',                is_spa: true,  last_score: null },
  { id: 'victorudo',   label: 'Victor Udo Hub', url: 'https://victorudo.com',                      is_spa: false, last_score: null },
  { id: 'flowai',      label: 'FlowAI Internal', url: 'https://truthful-flow-logic-lab.base44.app', is_spa: true, last_score: null },
];

const EVAL_GOAL_MAP = {
  saige:       'University Sustainability Director evaluating SAIGE for carbon tracking and AASHE STARS reporting',
  pressai:     'Publishing Professional evaluating PressAI for automated book editing and publishing workflows',
  reachsms:    'SMS Community Manager evaluating ReachSMS for nonprofit outreach campaigns',
  reltwin:     'Relationship Coach evaluating RelTwin for client relationship intelligence',
  mybirthsafe: 'Maternal Health Patient evaluating MyBirthSafe for pregnancy tracking in Nigeria',
  victorudo:   'General Visitor exploring Victor Udo\'s professional portfolio and services',
  flowai:      'Platform Operator evaluating FlowAI Internal for governance session performance',
};

export default function PortfolioQuickSelect({ onAdd, onEvalGoalSuggestion }) {
  const [tab, setTab] = useState('portfolio'); // portfolio | recent | custom
  const [open, setOpen] = useState(false);
  const [portfolioItems, setPortfolioItems] = useState(PRESET_PRODUCTS);
  const [recentUrls, setRecentUrls] = useState([]);
  const [customUrl, setCustomUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [registry, sessions] = await Promise.all([
        base44.entities.ProductRegistry.list('-created_date').catch(() => []),
        base44.entities.GovernanceSession.list('-created_date', 20).catch(() => []),
      ]);

      // Merge registry into presets (update scores)
      const merged = PRESET_PRODUCTS.map(p => {
        const found = registry.find(r => r.url === p.url);
        return found ? { ...p, last_score: found.last_score } : p;
      });
      // Add any extra registry items not in presets
      registry.forEach(r => {
        if (!merged.find(m => m.url === r.url)) {
          merged.push({ id: r.id, label: r.label || r.url, url: r.url, is_spa: r.url.includes('base44.app'), last_score: r.last_score });
        }
      });
      setPortfolioItems(merged);

      // Collect recent URLs from sessions
      const seen = new Set();
      const recent = [];
      sessions.forEach(s => {
        (s.urls || []).forEach(u => {
          if (!seen.has(u.url)) { seen.add(u.url); recent.push(u.url); }
        });
      });
      setRecentUrls(recent.slice(0, 10));
    } catch {}
    setLoading(false);
  };

  const handleOpen = () => {
    setOpen(v => !v);
    if (!open) loadData();
  };

  const addProduct = (item) => {
    onAdd({ url: item.url, is_spa: item.is_spa, context: '' });
    // Suggest eval goal
    const goalKey = Object.keys(EVAL_GOAL_MAP).find(k => item.id === k || item.label?.toLowerCase().includes(k));
    if (goalKey && onEvalGoalSuggestion) onEvalGoalSuggestion(EVAL_GOAL_MAP[goalKey]);
    setOpen(false);
  };

  const addCustom = () => {
    if (!customUrl.trim()) return;
    const url = customUrl.trim().startsWith('https://') ? customUrl.trim() : `https://${customUrl.trim()}`;
    onAdd({ url, is_spa: url.includes('base44.app'), context: '' });
    setCustomUrl('');
    setOpen(false);
  };

  const filtered = portfolioItems.filter(p =>
    !search || p.label.toLowerCase().includes(search.toLowerCase()) || p.url.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border bg-secondary/30 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm text-muted-foreground group"
      >
        <div className="flex items-center gap-2">
          <Star className="h-3.5 w-3.5 text-primary/60" />
          <span className="text-foreground font-medium">Select from Portfolio</span>
          <span className="text-[10px] text-muted-foreground">or enter custom URL below</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Tabs */}
            <div className="flex border-b border-border">
              {[
                { key: 'portfolio', label: '★ Portfolio', icon: Star },
                { key: 'recent',    label: '⏱ Recent',   icon: Clock },
                { key: 'custom',    label: '+ Custom',   icon: Plus },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === t.key ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="max-h-64 overflow-y-auto">
              {loading && tab !== 'custom' && (
                <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              )}

              {/* Portfolio tab */}
              {tab === 'portfolio' && !loading && (
                <div className="p-2 space-y-1">
                  {/* search */}
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <input value={search} onChange={e => setSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-full pl-7 pr-3 py-1.5 text-xs bg-secondary/30 border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  {filtered.map(item => (
                    <button key={item.id} onClick={() => addProduct(item)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all group text-left">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{item.url}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.last_score != null && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.last_score >= 7 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                            {item.last_score}/10
                          </span>
                        )}
                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Add →</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent tab */}
              {tab === 'recent' && !loading && (
                <div className="p-2 space-y-1">
                  {recentUrls.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No recent URLs yet. Start a governance session to build history.</p>
                  ) : (
                    recentUrls.map((url, i) => (
                      <button key={i} onClick={() => { onAdd({ url, is_spa: url.includes('base44.app'), context: '' }); setOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group text-left">
                        <p className="text-xs text-foreground truncate flex-1">{url}</p>
                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity font-semibold ml-2 shrink-0">Add →</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Custom tab */}
              {tab === 'custom' && (
                <div className="p-3 space-y-2">
                  <p className="text-[10px] text-muted-foreground">Enter any URL not in your portfolio or recent history.</p>
                  <div className="flex gap-2">
                    <input value={customUrl} onChange={e => setCustomUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustom()}
                      placeholder="https://yourapp.base44.app"
                      className="flex-1 h-8 px-3 text-xs bg-background border border-input rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
                    <button onClick={addCustom} disabled={!customUrl.trim()}
                      className="h-8 px-3 rounded-md bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}