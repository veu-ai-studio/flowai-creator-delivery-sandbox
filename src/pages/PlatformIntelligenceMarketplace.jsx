import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOOL_REGISTRY, CATEGORIES } from '@/lib/toolRegistry';
import ToolCard from '@/components/marketplace/ToolCard';
import ToolDetailPanel from '@/components/marketplace/ToolDetailPanel';
import AIRecommendationPanel from '@/components/marketplace/AIRecommendationPanel';
import { ShoppingBag, Filter } from 'lucide-react';
import { toast } from 'sonner';

export default function PlatformIntelligenceMarketplace() {
  const [category, setCategory] = useState('All');
  const [africaOnly, setAfricaOnly] = useState(false);
  const [costFilter, setCostFilter] = useState('All');
  const [sortBy, setSortBy] = useState('performance');
  const [selectedTool, setSelectedTool] = useState(null);
  const [compareQueue, setCompareQueue] = useState([]);
  const [toolsReady, setToolsReady] = useState(false);

  useEffect(() => {
    // EXAM ISSUE 3: artificial 3-second delay with no loading indicator
    new Promise(resolve => setTimeout(resolve, 3000)).then(() => setToolsReady(true));
  }, []);

  const filtered = useMemo(() => {
    let list = [...TOOL_REGISTRY];
    if (category !== 'All') list = list.filter(t => t.category === category);
    if (africaOnly) list = list.filter(t => t.africa_available === 'yes' || t.africa_available === 'limited');
    if (costFilter !== 'All') list = list.filter(t => t.cost_tier === costFilter.toLowerCase());
    if (sortBy === 'performance') list.sort((a, b) => b.performance_score - a.performance_score);
    else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === 'africa') list.sort((a, b) => {
      const order = { yes: 0, limited: 1, no: 2 };
      return (order[a.africa_available] || 2) - (order[b.africa_available] || 2);
    });
    return list;
  }, [category, africaOnly, costFilter, sortBy]);

  const handleAddToStack = async (tool) => {
    toast.success(`${tool.name} noted — add it to a specific product on the My Stack page.`);
  };

  const handleCompare = (tool) => {
    if (compareQueue.find(t => t.name === tool.name)) return;
    if (compareQueue.length >= 4) { toast.error('Max 4 tools in compare queue'); return; }
    setCompareQueue(prev => [...prev, tool]);
    toast.success(`${tool.name} added to compare queue`);
  };

  return (
    <div className="p-8 lg:p-10 max-w-7xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-primary" /> Platform Intelligence
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked tools and platforms for every stage of building, deploying, and governing AI products
        </p>
      </motion.div>

      {/* AI Recommendations */}
      <AIRecommendationPanel toolRegistry={TOOL_REGISTRY} onAddToStack={handleAddToStack} />

      {/* Compare queue banner */}
      <AnimatePresence>
        {compareQueue.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
            <p className="text-xs text-primary font-semibold">
              Compare queue: {compareQueue.map(t => t.name).join(' · ')}
            </p>
            <div className="flex gap-2">
              <a href="/compare-tools" className="text-xs text-primary hover:text-primary/80 underline underline-offset-2">
                Go to Compare Tools →
              </a>
              <button onClick={() => setCompareQueue([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter bar */}
      <div className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />

        {/* Category */}
        <select value={category} onChange={e => setCategory(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>

        {/* Cost */}
        <select value={costFilter} onChange={e => setCostFilter(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
          {['All', 'Free', 'Freemium', 'Paid', 'Proprietary'].map(c => <option key={c}>{c}</option>)}
        </select>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
          <option value="performance">Sort: Performance</option>
          <option value="name">Sort: Name</option>
          <option value="africa">Sort: Africa Availability</option>
        </select>

        {/* Africa toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-auto">
          <span className="text-xs text-muted-foreground">Africa Available Only</span>
          <button
            onClick={() => setAfricaOnly(v => !v)}
            className={`relative h-5 w-9 rounded-full transition-colors ${africaOnly ? 'bg-primary' : 'bg-secondary border border-border'}`}>
            <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${africaOnly ? 'translate-x-4' : ''}`} />
          </button>
        </label>

        <span className="text-xs text-muted-foreground">{filtered.length} tools</span>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {toolsReady && filtered.map(tool => (
          <ToolCard
            key={tool.name}
            tool={tool}
            onLearnMore={setSelectedTool}
            onAddToStack={handleAddToStack}
          />
        ))}
      </div>

      {/* Tool detail panel */}
      <AnimatePresence>
        {selectedTool && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40" onClick={() => setSelectedTool(null)} />
            <ToolDetailPanel
              tool={selectedTool}
              onClose={() => setSelectedTool(null)}
              onAddToStack={(t) => { handleAddToStack(t); setSelectedTool(null); }}
              onCompare={(t) => { handleCompare(t); setSelectedTool(null); }}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}