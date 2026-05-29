import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Globe, Loader2, RefreshCw, ChevronDown, ChevronUp,
  CheckCircle2, Copy, Check, ClipboardList, AlertCircle
} from 'lucide-react';

const PRODUCTS = [
  { name: 'SAIGE',          url: 'https://saige.base44.app',          desc: 'AI sustainability intelligence — universities, utilities, government' },
  { name: 'PressAI',        url: 'https://pressai.base44.app',        desc: 'AI publishing platform — authors, publishers, content creators' },
  { name: 'ReachSMS',       url: 'https://reachsms.base44.app',       desc: 'SMS community engagement — nonprofits, community organizations' },
  { name: 'RelTwin',        url: 'https://reltwin.com',               desc: 'Relationship intelligence — coaches, HR professionals' },
  { name: 'MyPregLife',    url: 'https://mypreglife.base44.app',    desc: 'Maternal health tracking — pregnant women in Nigeria and Africa' },
  { name: 'Victor Udo Hub', url: 'https://victorudo.base44.app',      desc: 'Personal brand & thought leadership platform' },
];

const STATUS_STYLE = {
  recommended:    { label: 'Recommended',    color: 'text-muted-foreground', border: 'border-border',          bg: 'bg-secondary/20' },
  registered:     { label: 'Registered',     color: 'text-blue-400',         border: 'border-blue-500/30',     bg: 'bg-blue-500/5' },
  dns_configured: { label: 'DNS Configured', color: 'text-amber-400',        border: 'border-amber-500/30',    bg: 'bg-amber-500/5' },
  live:           { label: 'Live',           color: 'text-emerald-400',       border: 'border-emerald-500/30',  bg: 'bg-emerald-500/5' },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

export default function DomainManager() {
  const [strategies, setStrategies] = useState([]);
  const [running, setRunning] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [checklistRunning, setChecklistRunning] = useState(false);
  const [checklist, setChecklist] = useState(null);
  const [copiedChecklist, setCopiedChecklist] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  useEffect(() => {
    base44.entities.DomainStrategy.list('-created_date')
      .then(data => setStrategies(data))
      .catch(() => {});
  }, []);

  const runDomainAnalysis = async () => {
    setRunning(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's domain strategy engine for VEU AI Studio. Analyze the following products and produce a complete domain strategy recommendation.

Products:
- SAIGE — AI-powered sustainability intelligence platform targeting universities, utilities, and government agencies
- PressAI — AI publishing platform targeting authors, publishers, and content creators
- ReachSMS — SMS community engagement platform targeting nonprofits and community organizations
- RelTwin — Relationship intelligence platform targeting coaches and HR professionals
- MyPregLife — Personalized maternal health tracking app targeting pregnant women in Nigeria and Africa
- Victor Udo Hub — Personal brand and thought leadership platform

Current URLs: SAIGE, PressAI, ReachSMS, MyPregLife, Victor Udo Hub are on .base44.app subdomains. RelTwin has reltwin.com.

For each product produce:
1. recommended_domain — the ideal production domain name (string, just the domain e.g. saige.ai)
2. alternatives — two alternative domain options (array of 2 strings)
3. domain_rationale — why this domain works for the target audience (1-2 sentences)
4. dns_records — exact DNS records needed to point the domain to a Base44 app (array of objects with: type, name, value, ttl, notes)
5. professional_emails — recommended email addresses to set up (array of strings e.g. demo@saige.ai)
6. cost_estimate — approximate annual domain registration cost (string)

Also produce:
- studio_domain — VEU AI Studio umbrella domain recommendation
- subdomain_strategy — if using veuaistudio.com as root, what subdomain structure works best (string)
- registration_priority — priority order for domain registration with reason (array of strings)`,
      response_json_schema: {
        type: 'object',
        properties: {
          products: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                recommended_domain: { type: 'string' },
                alternatives: { type: 'array', items: { type: 'string' } },
                domain_rationale: { type: 'string' },
                dns_records: { type: 'array', items: { type: 'object' } },
                professional_emails: { type: 'array', items: { type: 'string' } },
                cost_estimate: { type: 'string' },
              },
            },
          },
          studio_domain: { type: 'string' },
          subdomain_strategy: { type: 'string' },
          registration_priority: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    // Save each product strategy to entity
    const saved = await Promise.all(
      (result.products || []).map(p => {
        const existing = strategies.find(s => s.product_name === p.name);
        const productUrl = PRODUCTS.find(pr => pr.name === p.name)?.url || '';
        const payload = {
          product_name: p.name,
          current_url: productUrl,
          recommended_domain: p.recommended_domain,
          alternatives: p.alternatives || [],
          dns_records: p.dns_records || [],
          professional_emails: p.professional_emails || [],
          domain_rationale: p.domain_rationale,
          cost_estimate: p.cost_estimate,
          status: existing?.status || 'recommended',
        };
        return existing
          ? base44.entities.DomainStrategy.update(existing.id, payload).then(() => ({ ...existing, ...payload }))
          : base44.entities.DomainStrategy.create(payload);
      })
    );
    setStrategies(saved);
    setRunning(false);
  };

  const generateChecklist = async () => {
    setChecklistRunning(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a step-by-step domain registration and configuration checklist for VEU AI Studio. Products: SAIGE, PressAI, ReachSMS, RelTwin, MyPregLife, Victor Udo Hub.

Produce a numbered checklist covering:
1. Domain registrar selection and account setup
2. Priority order for purchasing domains (by revenue potential)
3. DNS configuration steps for each domain pointing to Base44
4. Professional email setup (Google Workspace or similar)
5. SSL certificate verification
6. Custom domain activation in Base44 dashboard
7. Testing and validation steps
8. Post-launch monitoring setup

Format as a clean markdown checklist with checkboxes [ ] and time estimates per step.`,
    });
    setChecklist(result);
    setChecklistRunning(false);
  };

  const updateStatus = async (strategyId, newStatus) => {
    setUpdatingStatus(strategyId);
    await base44.entities.DomainStrategy.update(strategyId, { status: newStatus });
    setStrategies(prev => prev.map(s => s.id === strategyId ? { ...s, status: newStatus } : s));
    setUpdatingStatus(null);
  };

  const hasStrategies = strategies.length > 0;

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" /> Domain Manager
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered domain strategy, DNS configuration, and deployment tracking for all VEU AI Studio products.
        </p>
      </motion.div>

      {/* Panel 1 — Domain Intelligence */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Domain Intelligence Engine</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Generates complete domain strategy for all 6 VEU AI Studio products via AI analysis.</p>
          </div>
          <div className="flex gap-2">
            {hasStrategies && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={runDomainAnalysis} disabled={running}>
                <RefreshCw className="h-3.5 w-3.5" /> Re-analyze
              </Button>
            )}
            <Button size="sm" className="gap-1.5 text-xs" onClick={runDomainAnalysis} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Globe className="h-3.5 w-3.5" />}
              {running ? 'Analyzing...' : hasStrategies ? 'Re-run Analysis' : 'Run Domain Analysis'}
            </Button>
          </div>
        </div>

        {running && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Analyzing all 6 products — generating domain recommendations, DNS records, and email strategy...</p>
          </div>
        )}

        {!hasStrategies && !running && (
          <div className="text-center py-10">
            <Globe className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Click "Run Domain Analysis" to generate a complete domain strategy for all VEU AI Studio products.</p>
          </div>
        )}

        {/* Checklist generator */}
        {hasStrategies && (
          <div className="pt-2 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Generate a step-by-step domain registration checklist</p>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={generateChecklist} disabled={checklistRunning}>
              {checklistRunning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
              Generate Checklist
            </Button>
          </div>
        )}

        {checklist && (
          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Domain Registration Checklist</p>
              <button onClick={() => { navigator.clipboard.writeText(checklist); setCopiedChecklist(true); setTimeout(() => setCopiedChecklist(false), 2000); }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1">
                {copiedChecklist ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
            <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono max-h-64 overflow-y-auto">{checklist}</pre>
            <p className="text-[10px] text-amber-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> AI-generated recommendation — verify before use</p>
          </div>
        )}
      </div>

      {/* Panel 2 — Domain Configuration Tracker */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-bold text-foreground">Domain Configuration Tracker</h2>

        {/* Show all 6 products — with data if analyzed, or placeholder row */}
        <div className="space-y-3">
          {PRODUCTS.map(product => {
            const strategy = strategies.find(s => s.product_name === product.name);
            const status = strategy?.status || 'recommended';
            const statusInfo = STATUS_STYLE[status];
            const isExpanded = expanded === product.name;

            return (
              <motion.div key={product.name} layout
                className={`rounded-xl border p-4 space-y-3 transition-all ${statusInfo.border} ${statusInfo.bg}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{product.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.border} ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{product.desc}</p>
                    <div className="flex flex-wrap gap-3 mt-1.5 text-[11px]">
                      <span className="text-muted-foreground">Current: <span className="font-mono text-foreground">{product.url}</span></span>
                      {strategy?.recommended_domain && (
                        <span className="text-muted-foreground">→ Recommended: <span className="font-mono text-primary font-semibold">{strategy.recommended_domain}</span></span>
                      )}
                      {strategy?.cost_estimate && (
                        <span className="text-muted-foreground">~{strategy.cost_estimate}/yr</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {strategy && (
                      <>
                        {status === 'recommended' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            disabled={updatingStatus === strategy.id}
                            onClick={() => updateStatus(strategy.id, 'registered')}>
                            Mark Registered
                          </Button>
                        )}
                        {status === 'registered' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                            disabled={updatingStatus === strategy.id}
                            onClick={() => updateStatus(strategy.id, 'dns_configured')}>
                            Mark DNS Configured
                          </Button>
                        )}
                        {status === 'dns_configured' && (
                          <Button size="sm" className="h-7 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
                            disabled={updatingStatus === strategy.id}
                            onClick={() => updateStatus(strategy.id, 'live')}>
                            Mark Live
                          </Button>
                        )}
                        {status === 'live' && (
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                        )}
                      </>
                    )}
                    {strategy?.dns_records?.length > 0 && (
                      <button onClick={() => setExpanded(isExpanded ? null : product.name)}
                        className="h-7 px-2 rounded border border-border text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all">
                        DNS {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* DNS records */}
                <AnimatePresence>
                  {isExpanded && strategy?.dns_records?.length > 0 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden">
                      <div className="pt-3 border-t border-border/40 space-y-2">
                        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          DNS Configuration Records
                          <span className="text-[10px] text-amber-400 font-normal flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> AI-generated — verify before use
                          </span>
                        </p>
                        <div className="space-y-1.5">
                          {strategy.dns_records.map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 font-mono text-[10px] bg-background border border-border rounded-lg p-2.5">
                              <span className="text-primary font-bold shrink-0 w-12">{rec.type}</span>
                              <span className="text-muted-foreground shrink-0 w-24 truncate">{rec.name || '@'}</span>
                              <span className="text-foreground flex-1 break-all">{rec.value}</span>
                              <CopyButton text={`${rec.type} ${rec.name || '@'} ${rec.value}`} />
                            </div>
                          ))}
                        </div>
                        {strategy.professional_emails?.length > 0 && (
                          <div className="pt-2">
                            <p className="text-[10px] font-bold text-muted-foreground mb-1">Recommended Email Addresses</p>
                            <div className="flex flex-wrap gap-1.5">
                              {strategy.professional_emails.map((email, i) => (
                                <span key={i} className="flex items-center gap-1 font-mono text-[10px] bg-secondary/40 px-2 py-1 rounded border border-border text-foreground">
                                  {email} <CopyButton text={email} />
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {strategy.domain_rationale && (
                          <p className="text-[10px] text-muted-foreground italic border-t border-border/30 pt-2">{strategy.domain_rationale}</p>
                        )}
                        {strategy.alternatives?.length > 0 && (
                          <p className="text-[10px] text-muted-foreground">Alternatives: {strategy.alternatives.join(', ')}</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}