import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Globe, RefreshCw, Loader2, CheckCircle2, AlertCircle,
  Copy, Check, GitCompare, Plus, Pencil, Save, X
} from 'lucide-react';

const PILOT_PRODUCTS = [
  { product_name: 'SAIGE',       dev_url: 'https://saige.base44.app',    prod_url: '' },
  { product_name: 'PressAI',     dev_url: 'https://pressai1.base44.app', prod_url: '' },
  { product_name: 'ReachSMS',    dev_url: 'https://reachsms.base44.app', prod_url: '' },
  { product_name: 'RelTwin',     dev_url: 'https://reltwin.com',         prod_url: '' },
  { product_name: 'MyPregLife', dev_url: 'https://mypreglife.base44.app', prod_url: '' },
];

const SYNC_COLORS = {
  in_sync:    { label: 'In Sync',      color: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  minor_drift:{ label: 'Minor Drift',  color: 'text-amber-400',   border: 'border-amber-500/30',  bg: 'bg-amber-500/5' },
  major_drift:{ label: 'Major Drift',  color: 'text-orange-400',  border: 'border-orange-500/30', bg: 'bg-orange-500/5' },
  out_of_sync:{ label: 'Out of Sync',  color: 'text-red-400',     border: 'border-red-500/30',    bg: 'bg-red-500/5' },
  unknown:    { label: 'Unknown',      color: 'text-muted-foreground', border: 'border-border',  bg: 'bg-secondary/20' },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all shrink-0">
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

function ScorePill({ score }) {
  if (score == null) return <span className="text-[10px] text-muted-foreground">No score</span>;
  const color = score >= 8 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400';
  return <span className={`text-sm font-bold ${color}`}>{score}/10</span>;
}

export default function Environments() {
  const [envs, setEnvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editProdUrl, setEditProdUrl] = useState('');
  const [savingId, setSavingId] = useState(null);

  const load = async () => {
    setLoading(true);
    const existing = await base44.entities.ProductEnvironment.list('-created_date');
    if (existing.length === 0) {
      // Seed pilot products
      const created = await Promise.all(
        PILOT_PRODUCTS.map(p => base44.entities.ProductEnvironment.create(p))
      );
      setEnvs(created);
    } else {
      setEnvs(existing);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const analyzeSync = async (env) => {
    setSyncingId(env.id);
    const devLabel = env.dev_url;
    const prodLabel = env.prod_url || 'pending (no production domain yet)';

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's sync intelligence engine. Compare two environments for the product "${env.product_name}".

Development environment: ${devLabel}
Production environment: ${prodLabel}

Assess the sync status between these two environments for a Base44 SaaS product.
Consider: feature parity, data model alignment, configuration drift, dependency versions, UI consistency, API compatibility.

If production is "pending", all categories should reflect that no production environment exists yet.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include in the sync assessment, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — industry best practices, framework documentation, or research. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Return:
- sync_status: exactly one of "in_sync", "minor_drift", "major_drift", "out_of_sync"
- summary: 1-2 sentence plain-English sync summary
- change_list: array of specific differences or concerns (max 6 strings)
- sync_sprint: a copy-pasteable sprint instruction to bring environments back in sync (or to set up production if pending)
- risk_level: "low" | "medium" | "high"`,
      response_json_schema: {
        type: 'object',
        properties: {
          sync_status: { type: 'string' },
          summary: { type: 'string' },
          change_list: { type: 'array', items: { type: 'string' } },
          sync_sprint: { type: 'string' },
          risk_level: { type: 'string' },
        },
      },
    });

    const updated = await base44.entities.ProductEnvironment.update(env.id, {
      sync_status: result.sync_status,
      sync_report: result,
      last_checked_at: new Date().toISOString(),
    });

    setEnvs(prev => prev.map(e => e.id === env.id ? { ...e, ...updated, sync_status: result.sync_status, sync_report: result, last_checked_at: new Date().toISOString() } : e));
    setSyncingId(null);
    setExpandedId(env.id);
  };

  const saveProdUrl = async (env) => {
    setSavingId(env.id);
    const updated = await base44.entities.ProductEnvironment.update(env.id, { prod_url: editProdUrl });
    setEnvs(prev => prev.map(e => e.id === env.id ? { ...e, prod_url: editProdUrl } : e));
    setEditingId(null);
    setSavingId(null);
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Globe className="h-7 w-7 text-primary" /> Environments
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Development vs production side-by-side · Sync intelligence · Drift detection
            </p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={load}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-4">
          {envs.map(env => {
            const sync = SYNC_COLORS[env.sync_status || 'unknown'];
            const isSyncing = syncingId === env.id;
            const isExpanded = expandedId === env.id;
            const isEditing = editingId === env.id;
            const report = env.sync_report;

            return (
              <motion.div key={env.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-border bg-card overflow-hidden">

                {/* Header row */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-foreground">{env.product_name}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sync.border} ${sync.bg} ${sync.color}`}>
                        {sync.label}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs"
                        disabled={isSyncing} onClick={() => analyzeSync(env)}>
                        {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <GitCompare className="h-3 w-3" />}
                        {isSyncing ? 'Analyzing...' : 'Analyze Sync'}
                      </Button>
                      {report && (
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"
                          onClick={() => setExpandedId(isExpanded ? null : env.id)}>
                          {isExpanded ? 'Hide Report' : 'View Report'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Side-by-side environments */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Development */}
                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 space-y-1">
                      <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Development</p>
                      <p className="text-xs font-mono text-foreground truncate">{env.dev_url}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">Score:</span>
                        <ScorePill score={env.dev_score} />
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Base44 SPA</span>
                      </div>
                    </div>

                    {/* Production */}
                    <div className={`rounded-lg border p-3 space-y-1 ${env.prod_url ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-border bg-secondary/20'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wide ${env.prod_url ? 'text-emerald-400' : 'text-muted-foreground'}`}>Production</p>
                      {isEditing ? (
                        <div className="flex gap-1.5">
                          <Input value={editProdUrl} onChange={e => setEditProdUrl(e.target.value)}
                            placeholder="https://your-domain.com" className="h-6 text-[11px] flex-1" />
                          <button onClick={() => saveProdUrl(env)} disabled={savingId === env.id}
                            className="text-emerald-400 hover:text-emerald-300"><Save className="h-3.5 w-3.5" /></button>
                          <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-mono text-foreground truncate flex-1">
                            {env.prod_url || <span className="text-muted-foreground italic">pending custom domain</span>}
                          </p>
                          <button onClick={() => { setEditingId(env.id); setEditProdUrl(env.prod_url || ''); }}
                            className="text-muted-foreground hover:text-foreground shrink-0">
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground">Score:</span>
                        <ScorePill score={env.prod_score} />
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${env.prod_url ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-secondary text-muted-foreground border-border'}`}>
                          {env.prod_url ? 'Custom Domain' : 'Not Deployed'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded sync report */}
                <AnimatePresence>
                  {isExpanded && report && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border">
                      <div className="p-5 space-y-4">
                        <p className="text-xs text-muted-foreground">{report.summary}</p>

                        {report.change_list?.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Change List</p>
                            {report.change_list.map((item, i) => (
                              <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                                <span className="text-primary shrink-0 mt-0.5">•</span> {item}
                              </div>
                            ))}
                          </div>
                        )}

                        {report.sync_sprint && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-bold text-foreground uppercase tracking-wide">Sync Sprint</p>
                              <CopyButton text={report.sync_sprint} />
                            </div>
                            <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 whitespace-pre-wrap text-foreground max-h-48 overflow-y-auto">
                              {report.sync_sprint}
                            </pre>
                            <p className="text-[10px] text-amber-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" /> AI-generated recommendation — verify before use
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}