import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { TOOL_REGISTRY, CATEGORIES } from '@/lib/toolRegistry';
import { Button } from '@/components/ui/button';
import { GitCompare, Loader2, Plus, X, AlertCircle, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const COST_COLOR = { free: 'text-emerald-400', freemium: 'text-blue-400', paid: 'text-amber-400', proprietary: 'text-purple-400' };
const AFRICA_COLOR = { yes: 'text-emerald-400', limited: 'text-amber-400', no: 'text-red-400' };
const SCORE_COLOR = (s) => s >= 8 ? 'text-emerald-400' : s >= 5 ? 'text-amber-400' : 'text-red-400';

function ScoreBar({ score }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 5 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-xs font-bold ${SCORE_COLOR(score)}`}>{score}</span>
    </div>
  );
}

export default function CompareTools() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTools, setSelectedTools] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [runningAI, setRunningAI] = useState(false);
  const [copied, setCopied] = useState(false);

  const searchResults = useMemo(() => {
    let list = TOOL_REGISTRY;
    if (selectedCategory !== 'All') list = list.filter(t => t.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q));
    }
    return list.slice(0, 20);
  }, [searchQuery, selectedCategory]);

  const addTool = (tool) => {
    if (selectedTools.find(t => t.name === tool.name)) { toast.error('Already added'); return; }
    if (selectedTools.length >= 4) { toast.error('Max 4 tools'); return; }
    // Warn if mixing categories
    if (selectedTools.length > 0 && selectedTools[0].category !== tool.category) {
      toast.warning('Comparing tools from different categories — results may be less meaningful.');
    }
    setSelectedTools(prev => [...prev, tool]);
  };

  const removeTool = (name) => setSelectedTools(prev => prev.filter(t => t.name !== name));

  const runAIAnalysis = async () => {
    if (selectedTools.length < 2) return;
    setRunningAI(true);
    setAiAnalysis('');
    const toolDetails = selectedTools.map(t =>
      `${t.name}: Score ${t.performance_score}/10, ${t.cost_tier} (${t.cost_details}), Africa: ${t.africa_available}, Base44: ${t.base44_compatible}. ${t.description}`
    ).join('\n');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Compare the following tools for a VEU AI Studio product building for the African market.

Tools being compared:
${toolDetails}

For each tool provide:
1. Strongest advantage (one clear sentence)
2. Most significant limitation (one clear sentence)
3. Best use case for VEU AI Studio products

Then provide a clear winner recommendation with the specific reason why, considering:
- Africa/Nigeria availability
- Cost-effectiveness for a startup
- Base44 integration capability
- Developer experience

CRITICAL — CITATIONS FOR ALL DATA: For every performance claim, pricing estimate, or market data point, provide a source citation in parentheses. Format as: [data point] (Source: [provider], [Year]). Never invent data.

End with a clear "RECOMMENDATION:" line stating the winner and why.`,
    });
    setAiAnalysis(result || '');
    setRunningAI(false);
  };

  const copyAnalysis = () => {
    navigator.clipboard.writeText(aiAnalysis);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ROW_DEFS = [
    { label: 'Performance', render: (t) => <ScoreBar score={t.performance_score} /> },
    { label: 'Cost Tier', render: (t) => <span className={`text-xs font-semibold capitalize ${COST_COLOR[t.cost_tier]}`}>{t.cost_tier}</span> },
    { label: 'Pricing', render: (t) => <span className="text-[10px] text-muted-foreground">{t.cost_details}</span> },
    { label: 'Africa Available', render: (t) => <span className={`text-xs font-semibold capitalize ${AFRICA_COLOR[t.africa_available]}`}>{t.africa_available}</span> },
    { label: 'Base44 Compatible', render: (t) => <span className={`text-xs font-semibold capitalize ${t.base44_compatible === 'native' ? 'text-primary' : t.base44_compatible === 'api' ? 'text-emerald-400' : 'text-muted-foreground'}`}>{t.base44_compatible}</span> },
    { label: 'Production Ready', render: (t) => <span className={`text-xs font-semibold ${t.production_compatible ? 'text-emerald-400' : 'text-red-400'}`}>{t.production_compatible ? 'Yes' : 'No'}</span> },
    { label: 'Category', render: (t) => <span className="text-xs text-muted-foreground">{t.category}</span> },
    { label: 'Description', render: (t) => <span className="text-[10px] text-muted-foreground">{t.description}</span> },
  ];

  return (
    <div className="p-8 lg:p-10 max-w-6xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GitCompare className="h-7 w-7 text-primary" /> Compare Tools
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Side-by-side comparison of any tools in the same category</p>
      </motion.div>

      {/* Tool search and selector */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Select 2–4 Tools to Compare</p>
        <div className="flex gap-2">
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tools…" className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-3 text-foreground placeholder:text-muted-foreground" />
        </div>

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {searchResults.map(tool => {
              const isSelected = selectedTools.find(t => t.name === tool.name);
              return (
                <button key={tool.name} onClick={() => !isSelected && addTool(tool)}
                  disabled={!!isSelected}
                  className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${isSelected ? 'border-primary/50 bg-primary/10 text-primary cursor-default' : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
                  <span className="font-semibold">{tool.name}</span>
                  <span className="opacity-60">{tool.category}</span>
                  {!isSelected && <Plus className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        )}

        {/* Selected tools pills */}
        {selectedTools.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <span className="text-[10px] text-muted-foreground self-center">Comparing:</span>
            {selectedTools.map(t => (
              <span key={t.name} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary">
                {t.name}
                <button onClick={() => removeTool(t.name)} className="hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Comparison table */}
      {selectedTools.length >= 2 && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-[10px] font-bold text-muted-foreground uppercase tracking-wide p-4 w-32">Attribute</th>
                {selectedTools.map(t => (
                  <th key={t.name} className="text-left p-4">
                    <div>
                      <p className="text-sm font-bold text-foreground">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.category}</p>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROW_DEFS.map((row, i) => (
                <tr key={row.label} className={`border-b border-border/50 ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                  <td className="p-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{row.label}</td>
                  {selectedTools.map(t => (
                    <td key={t.name} className="p-4">{row.render(t)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 border-t border-border">
            <Button onClick={runAIAnalysis} disabled={runningAI || selectedTools.length < 2} className="gap-2">
              {runningAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
              {runningAI ? 'Analyzing…' : 'Get AI Analysis'}
            </Button>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <AnimatePresence>
        {aiAnalysis && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-primary/30 bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">AI Analysis</p>
              <button onClick={copyAnalysis}
                className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
                {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
            <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">{aiAnalysis}</pre>
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> AI-generated analysis — verify claims and pricing before making decisions
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTools.length === 0 && (
        <div className="text-center py-16">
          <GitCompare className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Select 2–4 tools above to start comparing</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Filter by category for the most meaningful comparisons</p>
        </div>
      )}
    </div>
  );
}