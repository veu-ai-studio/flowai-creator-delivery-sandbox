import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { Loader2, Sparkles, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VEU_PRODUCTS = ['SAIGE', 'PressAI', 'ReachSMS', 'RelTwin', 'MyBirthSafe'];
const STAGES = ['Research', 'Design', 'Build', 'Deploy', 'Scale'];
const MARKETS = ['Nigeria/Africa', 'US', 'Global'];
const BUDGETS = ['Free only', 'Under $100/month', 'Under $500/month', 'Enterprise'];
const REQUIREMENTS = [
  { key: 'africa', label: 'Must work in Africa' },
  { key: 'base44', label: 'Must integrate with Base44' },
  { key: 'sms', label: 'Must support SMS' },
  { key: 'payments', label: 'Must support payments' },
];

export default function AIRecommendationPanel({ toolRegistry, onAddToStack }) {
  const [productName, setProductName] = useState('');
  const [stage, setStage] = useState('Build');
  const [market, setMarket] = useState('Nigeria/Africa');
  const [budget, setBudget] = useState('Under $100/month');
  const [requirements, setRequirements] = useState({ africa: true });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const toggleReq = (key) => setRequirements(prev => ({ ...prev, [key]: !prev[key] }));

  const getRecs = async () => {
    if (!productName.trim()) return;
    setRunning(true);
    setResult(null);

    const reqList = Object.entries(requirements).filter(([,v]) => v).map(([k]) =>
      REQUIREMENTS.find(r => r.key === k)?.label
    ).join(', ') || 'None';

    const toolSummary = toolRegistry.map(t =>
      `${t.name} (${t.category}) — Score: ${t.performance_score}/10, Cost: ${t.cost_tier}, Africa: ${t.africa_available}, Base44: ${t.base44_compatible}`
    ).join('\n');

    const raw = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's platform intelligence engine. Based on the following product profile, recommend the best tools for each relevant development stage.

Product: ${productName}
Stage: ${stage}
Target market: ${market}
Budget: ${budget}
Special requirements: ${reqList}

From the following tool registry, select the top 2-3 tools per relevant category that best match this product profile:

${toolSummary}

For each recommended tool provide:
1. Tool name and category
2. Why it is the best fit for this specific product and market — be specific
3. Any limitations or watch-outs for this product's context
4. Estimated monthly cost for this product's expected usage
5. Africa/Nigeria specific considerations if target market includes Africa

Prioritize tools available in Africa when target market includes Nigeria or Africa. Flag any tool with Limited Africa availability and suggest alternatives.

CRITICAL — CITATIONS FOR ALL DATA: For every cost estimate or performance claim, provide a source citation in parentheses. Format as: [data point] (Source: [provider pricing page], [Year]). Never invent pricing.

Return JSON with key "recommendations" containing an array of objects, each with: tool_name, category, reason, limitations, estimated_monthly_cost, africa_note.`,
      response_json_schema: {
        type: 'object',
        properties: {
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                tool_name: { type: 'string' },
                category: { type: 'string' },
                reason: { type: 'string' },
                limitations: { type: 'string' },
                estimated_monthly_cost: { type: 'string' },
                africa_note: { type: 'string' },
              }
            }
          }
        }
      }
    });

    setResult(raw);

    // Save to entity
    await base44.entities.ToolRecommendation.create({
      product_name: productName,
      stage,
      target_market: market,
      budget,
      requirements,
      recommendations: raw,
      created_at: new Date().toISOString(),
    });

    setRunning(false);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Get AI Recommendations</h2>
        <span className="text-[10px] text-muted-foreground">— personalized tool selection for your product</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Product Name</label>
          <div className="flex gap-1.5">
            <Input value={productName} onChange={e => setProductName(e.target.value)}
              placeholder="e.g. SAIGE" className="h-8 text-xs flex-1" />
          </div>
          <div className="flex flex-wrap gap-1">
            {VEU_PRODUCTS.map(p => (
              <button key={p} onClick={() => setProductName(p)}
                className={`text-[9px] px-1.5 py-0.5 rounded border transition-all ${productName === p ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Stage</label>
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
            {STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mt-2 block">Target Market</label>
          <select value={market} onChange={e => setMarket(e.target.value)}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
            {MARKETS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Budget</label>
          <select value={budget} onChange={e => setBudget(e.target.value)}
            className="w-full h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground">
            {BUDGETS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Requirements</label>
          <div className="space-y-1">
            {REQUIREMENTS.map(r => (
              <label key={r.key} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!requirements[r.key]} onChange={() => toggleReq(r.key)}
                  className="h-3 w-3 rounded" />
                <span className="text-[10px] text-muted-foreground">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <Button onClick={getRecs} disabled={running || !productName.trim()} className="gap-2">
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {running ? 'Generating Recommendations…' : 'Get Recommendations'}
      </Button>

      <AnimatePresence>
        {result?.recommendations?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2 border-t border-border">
            <p className="text-xs font-bold text-foreground">{result.recommendations.length} recommendations for {productName}</p>
            {result.recommendations.map((rec, i) => {
              const tool = toolRegistry.find(t => t.name === rec.tool_name);
              return (
                <div key={i} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{rec.tool_name}</p>
                      <span className="text-[10px] text-muted-foreground">{rec.category}</span>
                    </div>
                    {tool && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onAddToStack(tool)}>
                        <Plus className="h-3 w-3" /> Add to Stack
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-foreground">{rec.reason}</p>
                  {rec.limitations && (
                    <p className="text-[10px] text-amber-400 flex items-start gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /> {rec.limitations}
                    </p>
                  )}
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    {rec.estimated_monthly_cost && <span>Cost: <strong className="text-foreground">{rec.estimated_monthly_cost}</strong></span>}
                    {rec.africa_note && <span className="text-emerald-400">{rec.africa_note}</span>}
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> AI-generated recommendations — verify pricing and availability before use
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}