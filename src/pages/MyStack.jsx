import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { TOOL_REGISTRY, VEU_STACKS } from '@/lib/toolRegistry';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Layers, Download, Loader2, Plus, X, Copy, Check, Zap,
  AlertCircle, ChevronDown, ChevronUp, Pencil
} from 'lucide-react';
import { toast } from 'sonner';

const VEU_PRODUCT_LIST = ['SAIGE', 'PressAI', 'ReachSMS', 'RelTwin', 'MyBirthSafe'];

function getToolData(name) {
  return TOOL_REGISTRY.find(t => t.name === name);
}

function estimateCost(tools) {
  const costMap = {
    'Base44': 0, 'Supabase': 25, 'Vercel': 0, 'Railway': 5,
    'Supabase Auth': 0, 'Clerk': 0, 'Stripe': 0, 'Paystack': 0, 'Flutterwave': 0,
    'Anthropic Claude': 20, 'Sentry': 0, 'PostHog': 0, 'Resend': 0,
    "Africa's Talking": 10, 'Twilio': 15, 'Termii': 5, 'Brevo': 0, 'FlowAI': 0,
  };
  let total = 0;
  Object.values(tools).flat().forEach(name => { total += costMap[name] || 0; });
  return total;
}

function getAfricaStatus(tools) {
  const allNames = Object.values(tools).flat();
  const toolData = allNames.map(n => getToolData(n)).filter(Boolean);
  const hasNo = toolData.some(t => t.africa_available === 'no');
  const hasLimited = toolData.some(t => t.africa_available === 'limited');
  if (hasNo) return 'issues_flagged';
  if (hasLimited) return 'some_limited';
  return 'all_green';
}

const AFRICA_STATUS_STYLE = {
  all_green: { label: 'All Africa Ready', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  some_limited: { label: 'Some Limited', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  issues_flagged: { label: 'Issues Flagged', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
};

function StackCard({ productName, tools, isVeu, onExport, onSetupGuide, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const cost = estimateCost(tools);
  const africaStatus = getAfricaStatus(tools);
  const st = AFRICA_STATUS_STYLE[africaStatus];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-5 flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-bold text-foreground">{productName}</h3>
            {isVeu && <span className="text-[9px] px-1.5 py-0.5 rounded border border-primary/30 bg-primary/10 text-primary">VEU Product</span>}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.border} ${st.bg} ${st.color}`}>
              {st.label}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {Object.keys(tools).length} categories · ~${cost}/month
          </p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onEdit(productName, tools)}>
            <Pencil className="h-3 w-3" /> Edit
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onExport(productName, tools)}>
            <Download className="h-3 w-3" /> Export
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => onSetupGuide(productName, tools)}>
            <Zap className="h-3 w-3" /> Setup Guide
          </Button>
          <button onClick={() => setExpanded(v => !v)}
            className="h-7 px-2 rounded border border-border text-muted-foreground hover:text-foreground transition-all flex items-center">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Quick chip row */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {Object.entries(tools).map(([cat, names]) => (
          <div key={cat} className="flex items-center gap-1">
            <span className="text-[9px] text-muted-foreground">{cat}:</span>
            {names.map(n => {
              const td = getToolData(n);
              const scoreColor = td ? (td.performance_score >= 8 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20') : 'bg-secondary text-muted-foreground border-border';
              return (
                <span key={n} className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${scoreColor}`}>{n}</span>
              );
            })}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border">
            <div className="p-5 space-y-3">
              {Object.entries(tools).map(([cat, names]) => (
                <div key={cat}>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">{cat}</p>
                  <div className="space-y-1.5">
                    {names.map(n => {
                      const td = getToolData(n);
                      if (!td) return <p key={n} className="text-xs text-foreground">{n}</p>;
                      return (
                        <div key={n} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{td.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{td.description}</p>
                          </div>
                          <div className="flex gap-2 items-center shrink-0">
                            <span className={`text-[10px] font-bold ${td.performance_score >= 8 ? 'text-emerald-400' : 'text-amber-400'}`}>{td.performance_score}/10</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border capitalize ${td.africa_available === 'yes' ? 'border-emerald-500/30 text-emerald-400' : td.africa_available === 'limited' ? 'border-amber-500/30 text-amber-400' : 'border-red-500/30 text-red-400'}`}>
                              {td.africa_available}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Estimated monthly cost</p>
                <p className="text-sm font-bold text-foreground">~${cost}/month</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MyStack() {
  const [stacks, setStacks] = useState(() =>
    Object.fromEntries(VEU_PRODUCT_LIST.map(p => [p, { ...VEU_STACKS[p] }]))
  );
  const [setupGuideProduct, setSetupGuideProduct] = useState(null);
  const [setupGuide, setSetupGuide] = useState('');
  const [runningGuide, setRunningGuide] = useState(false);
  const [exportContent, setExportContent] = useState(null);
  const [copiedExport, setCopiedExport] = useState(false);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);

  const handleExport = (productName, tools) => {
    const md = [`# ${productName} — Technology Stack\n`,
      `**Generated by FlowAI Platform Intelligence**\n`,
      `**Date:** ${new Date().toLocaleDateString()}\n`,
      `## Tools by Category\n`,
      ...Object.entries(tools).map(([cat, names]) => {
        const lines = names.map(n => {
          const td = getToolData(n);
          return td ? `- **${td.name}** — ${td.description} (${td.cost_details})` : `- ${n}`;
        });
        return `### ${cat}\n${lines.join('\n')}\n`;
      }),
      `## Cost Estimate\n~$${estimateCost(tools)}/month (base services, usage-based costs not included)\n`,
      `## Africa Availability\n${getAfricaStatus(tools).replace(/_/g, ' ')}\n`,
      `\n*Verified by VEU AI Studio FlowAI Platform Intelligence*`,
    ].join('\n');
    setExportContent({ productName, md });
  };

  const handleSetupGuide = async (productName, tools) => {
    setSetupGuideProduct(productName);
    setSetupGuide('');
    setRunningGuide(true);
    const toolList = Object.entries(tools).map(([cat, names]) => `${cat}: ${names.join(', ')}`).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete step-by-step setup guide for the following technology stack for the ${productName} product.

Stack:
${toolList}

This product is built by VEU AI Studio and targets African markets. Many users may be in Nigeria.

For each tool in the stack, provide:
1. Account creation steps
2. Configuration steps for this specific product
3. Integration steps with the other tools in the stack
4. Africa/Nigeria specific notes (payment setup, SMS routing, compliance)
5. Cost optimization tips

Start with the database (Supabase) and auth, then build the stack layer by layer so each step depends on what was set up before.

Finish with a testing checklist and a "Go Live" verification checklist.

CRITICAL — CITATIONS FOR ALL DATA: For every cost estimate, API rate, or performance claim, provide a source citation in parentheses. Format as: [data point] (Source: [provider documentation], [Year]).`,
    });
    setSetupGuide(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
    setRunningGuide(false);
  };

  const addCustomProduct = () => {
    if (!customName.trim()) return;
    setStacks(prev => ({
      ...prev,
      [customName.trim()]: { Build: ['Base44'], Database: ['Supabase'], Deployment: ['Vercel'], Governance: ['FlowAI'] }
    }));
    setCustomName('');
    setShowAddCustom(false);
    toast.success(`${customName.trim()} added to My Stack`);
  };

  const copyExport = () => {
    if (exportContent) navigator.clipboard.writeText(exportContent.md);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" /> My Tech Stack
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your selected tools for each VEU AI Studio product
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddCustom(v => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add Custom Product
          </Button>
        </div>
      </motion.div>

      {/* Add custom product form */}
      <AnimatePresence>
        {showAddCustom && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 flex items-center gap-3">
              <Input value={customName} onChange={e => setCustomName(e.target.value)}
                placeholder="Product name…" className="h-8 text-xs max-w-64" />
              <Button size="sm" className="gap-1 text-xs h-8" onClick={addCustomProduct} disabled={!customName.trim()}>
                <Plus className="h-3 w-3" /> Add Product
              </Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddCustom(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stack cards */}
      <div className="space-y-4">
        {Object.entries(stacks).map(([productName, tools]) => (
          <StackCard
            key={productName}
            productName={productName}
            tools={tools}
            isVeu={VEU_PRODUCT_LIST.includes(productName)}
            onExport={handleExport}
            onSetupGuide={handleSetupGuide}
            onEdit={(name) => setEditingProduct(name)}
          />
        ))}
      </div>

      {/* Export modal */}
      <AnimatePresence>
        {exportContent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
            <div className="bg-card rounded-xl border border-border w-full max-w-2xl flex flex-col max-h-[80vh]">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <p className="font-bold text-foreground">{exportContent.productName} — Stack Export</p>
                <div className="flex gap-2">
                  <button onClick={copyExport}
                    className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground">
                    {copiedExport ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Markdown</>}
                  </button>
                  <button onClick={() => setExportContent(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <pre className="p-4 text-[11px] font-mono text-foreground whitespace-pre-wrap overflow-y-auto flex-1">{exportContent.md}</pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Setup guide modal */}
      <AnimatePresence>
        {(runningGuide || setupGuide) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
            <div className="bg-card rounded-xl border border-border w-full max-w-3xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <p className="font-bold text-foreground">Setup Guide — {setupGuideProduct}</p>
                <div className="flex gap-2">
                  {setupGuide && (
                    <button onClick={() => { navigator.clipboard.writeText(setupGuide); toast.success('Copied'); }}
                      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground">
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                  )}
                  {!runningGuide && (
                    <button onClick={() => { setSetupGuide(''); setSetupGuideProduct(null); }} className="text-muted-foreground hover:text-foreground">
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
              </div>
              {runningGuide ? (
                <div className="flex items-center justify-center p-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating setup guide…</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 p-5 space-y-2">
                  <pre className="text-[11px] text-foreground whitespace-pre-wrap font-sans leading-relaxed">{setupGuide}</pre>
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> AI-generated guide — verify all steps against official documentation before use
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}