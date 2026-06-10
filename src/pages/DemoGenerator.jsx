import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { asArray, resolveArray } from '@/lib/uiDataGuards';
import { VEU_PRODUCTS } from '@/lib/veuProducts';
import { loadSyntheticPrompt } from '@/lib/syntheticPromptLoader';
import { Button } from '@/components/ui/button';
import Tooltip from '@/components/ui/Tooltip';
import CopyButton from '@/components/gtm/CopyButton';
import AiDisclaimer from '@/components/gtm/AiDisclaimer';
import {
  Play, Loader2, CheckCircle2, RefreshCw, Eye, Globe,
  FileCode, MapPin, ChevronDown, ChevronUp, Database, Plus, X, LayoutGrid
} from 'lucide-react';
import CustomProductModal from '@/components/demo/CustomProductModal';
import DemoProductPreviewCards from '@/components/demo/DemoProductPreviewCards';
import DemoBatchExport from '@/components/demo/DemoBatchExport';
import TourStepEditor from '@/components/demo/TourStepEditor';
import DemoDataSources from '@/components/demo/DemoDataSources';
import DemoVersionHistory from '@/components/demo/DemoVersionHistory';

const STATUS_STYLE = {
  not_generated: { label: 'Not Generated', color: 'text-muted-foreground', border: 'border-border',           bg: 'bg-secondary/20' },
  generating:    { label: 'Generating…',   color: 'text-blue-400',         border: 'border-blue-500/30',     bg: 'bg-blue-500/5' },
  ready:         { label: 'Demo Ready',    color: 'text-emerald-400',      border: 'border-emerald-500/30',  bg: 'bg-emerald-500/5' },
  needs_update:  { label: 'Needs Update',  color: 'text-amber-400',        border: 'border-amber-500/30',    bg: 'bg-amber-500/5' },
};

const STEPS = ['Synthetic Data', 'Microsite', 'Tour Script'];

function ProgressBar({ step }) {
  return (
    <div className="flex items-center gap-1 mt-2">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-1 flex-1">
          <div className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-primary' : i === step ? 'bg-primary/40 animate-pulse' : 'bg-border'}`} />
          {i < STEPS.length - 1 && <div className="h-1.5 w-1 rounded-full bg-border" />}
        </div>
      ))}
    </div>
  );
}

function buildCustomSyntheticPrompt(product) {
  return `Generate complete synthetic demo data for ${product.name}, a ${product.industry} product targeting ${product.audience || 'enterprise buyers'}.
Product description: ${product.description || product.tagline}
Create a fictional ${product.industry} organization called '${product.demo_org}' to serve as the demo customer.

Generate realistic, detailed demo data including:
1. Organization profile — realistic details for a ${product.industry} organization of moderate size
2. Key metrics dashboard — 6-8 KPIs relevant to ${product.industry} that demonstrate the product's value
3. Active use cases — 5 specific scenarios showing ${product.name} solving real problems for ${product.audience || 'users'}
4. Sample AI-generated outputs — 4 examples of what the product produces or recommends for ${product.demo_org}
5. User activity feed — recent actions and results from the past 30 days
6. ROI indicators — specific data points showing time saved, cost reduced, or outcomes improved

All data must be realistic, internally consistent, and specific enough to convince a real ${product.audience || 'buyer'} that ${product.name} solves their problem.

Return as JSON with keys: org_profile, key_metrics, use_cases, ai_outputs, activity_feed, roi_indicators.`;
}

export default function DemoGenerator() {
  const [demos, setDemos] = useState({});
  const [generating, setGenerating] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [micrositePreview, setMicrositePreview] = useState(null);
  const [customProducts, setCustomProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPreviewCards, setShowPreviewCards] = useState(true);
  const [detailTab, setDetailTab] = useState({}); // productName → active tab key

  // Load existing demos on mount — also restore any saved custom products
  useEffect(() => {
    resolveArray(base44.entities.DemoEnvironment.list('-created_date')).then(records => {
      const map = {};
      const restoredCustom = [];
      records.forEach(r => {
        map[r.product_name] = r;
        // Restore custom products from saved entity records
        if (r.synthetic_data?.is_custom && !restoredCustom.find(p => p.name === r.product_name)) {
          restoredCustom.push(r.synthetic_data.product_meta);
        }
      });
      setDemos(map);
      if (restoredCustom.length > 0) setCustomProducts(restoredCustom);
    });
  }, []);

  const addCustomProduct = (product) => {
    setCustomProducts(prev => [...prev, product]);
  };

  const removeCustomProduct = (name) => {
    setCustomProducts(prev => prev.filter(p => p.name !== name));
  };

  const generate = async (product) => {
    setGenerating(prev => ({ ...prev, [product.name]: 0 }));
    const now = new Date().toISOString();

    // Upsert with generating status
    const existing = demos[product.name];
    let record;
    if (existing) {
      record = await base44.entities.DemoEnvironment.update(existing.id, { demo_status: 'generating', updated_at: now });
      record = { ...existing, demo_status: 'generating' };
    } else {
      record = await base44.entities.DemoEnvironment.create({ product_name: product.name, demo_status: 'generating', updated_at: now });
    }
    setDemos(prev => ({ ...prev, [product.name]: record }));

    // Use custom prompt for custom products; load from non-public source for VEU products
    // (synthetic prompts intentionally not stored in the public repo per W0 IP-hygiene).
    const syntheticPrompt = product.is_custom
      ? buildCustomSyntheticPrompt(product)
      : loadSyntheticPrompt(product.slug || product.name?.toLowerCase());

    // Fail closed when the synthetic prompt isn't available (env var not set
    // on this deploy). Avoids passing null to the LLM call.
    if (!syntheticPrompt) {
      const failedAt = new Date().toISOString();
      try {
        await base44.entities.DemoEnvironment.update(record.id, {
          demo_status: 'failed', updated_at: failedAt,
        });
      } catch { /* swallow — best-effort status update */ }
      setDemos(prev => ({ ...prev, [product.name]: { ...record, demo_status: 'failed', updated_at: failedAt } }));
      setGenerating(prev => ({ ...prev, [product.name]: 0 }));
      return;
    }

    // ── STEP 1: Synthetic data ────────────────────────────
    const syntheticRawBase = await base44.integrations.Core.InvokeLLM({
      prompt: syntheticPrompt,
      response_json_schema: { type: 'object', additionalProperties: true },
    });
    // For custom products, embed metadata so we can restore on reload
    const syntheticRaw = product.is_custom
      ? { ...syntheticRawBase, is_custom: true, product_meta: product }
      : syntheticRawBase;
    setGenerating(prev => ({ ...prev, [product.name]: 1 }));

    // ── STEP 2: Microsite HTML ────────────────────────────
    const micrositeRaw = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's demo microsite generator. Using the synthetic demo data generated for ${product.name} (${product.tagline}), create a complete, compelling standalone demo microsite.

The microsite must include:
1. Hero section — compelling headline, value proposition, and primary CTA button "Request Access"
2. Problem statement — the specific pain point this product solves for ${product.audience}
3. Solution showcase — three key features demonstrated with the synthetic data
4. Live demo preview — data highlights from the synthetic dataset presented as callout boxes
5. Social proof section — three fictional but realistic testimonials from ${product.audience} personas
6. Pricing teaser — "Pilot pricing available — contact us" with a contact form placeholder
7. Footer — "Built for VEU AI Studio by VEU AI Studio" and legal links

Use VEU AI Studio brand colors: Primary #005EB8, Accent #F9A800. Fonts: Roboto and Open Sans (Google Fonts). Mobile responsive. Professional enough that a real ${product.audience_short} would take it seriously.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, or government databases. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Synthetic data context: ${JSON.stringify(syntheticRaw).slice(0, 800)}

Return a JSON object with one key "html" containing the complete single-file HTML+CSS microsite as a string.`,
      response_json_schema: { type: 'object', properties: { html: { type: 'string' } } },
    });
    const micrositeHtml = micrositeRaw?.html || '';
    setGenerating(prev => ({ ...prev, [product.name]: 2 }));

    // ── STEP 3: Tour script ───────────────────────────────
    const tourRaw = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's product tour generator. Create a complete guided tour script for ${product.name} that walks a ${product.audience_short} prospect through the most compelling features using the synthetic demo data for ${product.demo_org}.

The tour must include:
1. Welcome message — personalized to the prospect's role as ${product.audience_short}
2. Five tour stops — each highlighting one key feature with the synthetic data pre-loaded
3. For each stop: id, title, text (tooltip, max 50 words), attachTo (CSS selector stub), highlight description, action to demonstrate
4. Transition messages — natural language bridges between stops
5. Closing CTA — "You have seen what ${product.name} can do for ${product.audience_short} — ready to start your pilot?"

Format as a valid Shepherd.js-compatible JSON tour script.
Reference ${product.demo_org} by name in each stop. Make each stop specific and compelling.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, or government databases. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Return JSON with keys: welcome_message, steps (array of Shepherd step objects with id, title, text, attachTo, arrow), closing_cta.`,
      response_json_schema: {
        type: 'object',
        properties: {
          welcome_message: { type: 'string' },
          steps: { type: 'array', items: { type: 'object' } },
          closing_cta: { type: 'string' },
        },
      },
    });

    // ── Save final record ─────────────────────────────────
    const updated = await base44.entities.DemoEnvironment.update(record.id, {
      synthetic_data: syntheticRaw,
      microsite_content: micrositeHtml,
      tour_script: JSON.stringify(tourRaw, null, 2),
      demo_status: 'ready',
      updated_at: new Date().toISOString(),
    });

    setDemos(prev => ({ ...prev, [product.name]: { ...record, ...updated, synthetic_data: syntheticRaw, microsite_content: micrositeHtml, tour_script: JSON.stringify(tourRaw, null, 2), demo_status: 'ready' } }));
    setGenerating(prev => ({ ...prev, [product.name]: null }));
    setExpanded(product.name);
  };

  const markDeployed = async (product) => {
    const d = demos[product.name];
    if (!d) return;
    await base44.entities.DemoEnvironment.update(d.id, { microsite_deployed: true, updated_at: new Date().toISOString() });
    setDemos(prev => ({ ...prev, [product.name]: { ...d, microsite_deployed: true } }));
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Globe className="h-7 w-7 text-primary" /> Demo Builder
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          User-facing demo environments with synthetic data and guided product tours — for all VEU AI Studio products
        </p>
      </motion.div>

      {/* Full-screen microsite preview */}
      <AnimatePresence>
        {micrositePreview && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="flex items-center justify-between p-3 bg-card border-b border-border">
              <p className="text-sm font-bold text-foreground">Microsite Preview — {micrositePreview.name}</p>
              <div className="flex gap-2">
                <CopyButton text={micrositePreview.html} label="Copy HTML" />
                <Button size="sm" variant="outline" onClick={() => setMicrositePreview(null)}>Close</Button>
              </div>
            </div>
            <iframe
              srcDoc={micrositePreview.html}
              className="flex-1 w-full bg-white"
              title="Microsite Preview"
              sandbox="allow-scripts allow-same-origin"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button onClick={() => setShowPreviewCards(v => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <LayoutGrid className="h-3.5 w-3.5" />
          {showPreviewCards ? 'Hide' : 'Show'} Preview Cards
        </button>
        <Tooltip content="Add a product not in the standard VEU AI Studio list to generate a custom demo environment for it">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setShowModal(true)}>
            <Plus className="h-3.5 w-3.5" /> Add Custom Product
          </Button>
        </Tooltip>
      </div>

      {/* Product preview cards */}
      {showPreviewCards && (
        <DemoProductPreviewCards
          products={[...VEU_PRODUCTS, ...customProducts]}
          demos={demos}
          onSelect={(name) => setExpanded(name)}
        />
      )}

      {/* Batch export */}
      <DemoBatchExport products={[...VEU_PRODUCTS, ...customProducts]} demos={demos} />

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <CustomProductModal onAdd={addCustomProduct} onClose={() => setShowModal(false)} />
        )}
      </AnimatePresence>

      <div className="space-y-4">
        {[...VEU_PRODUCTS, ...customProducts].map(product => {
          const isCustom = !!product.is_custom;
          const demo = demos[product.name];
          const genStep = generating[product.name];
          const isGenerating = genStep != null;
          const status = isGenerating ? 'generating' : (demo?.demo_status || 'not_generated');
          const st = STATUS_STYLE[status];
          const isExpanded = expanded === product.name;
          const tourStops = (() => { try { const t = JSON.parse(demo?.tour_script || '{}'); return asArray(t.steps).length; } catch { return 0; } })();

          return (
            <motion.div key={product.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border bg-card overflow-hidden ${product.border}`}>

              {/* Header */}
              <div className="p-5 flex items-start gap-4 flex-wrap">
                <div className={`h-3 w-3 rounded-full shrink-0 mt-1 ${product.dot} ${isGenerating ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{product.name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${st.border || product.border} ${st.bg || product.bg} ${st.color}`}>
                      {st.label}
                    </span>
                    {isCustom && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">Custom</span>
                    )}
                    {demo?.microsite_deployed && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">Deployed</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{product.tagline}</p>
                  <p className="text-[10px] text-muted-foreground">Demo org: <span className="text-foreground">{product.demo_org}</span></p>

                  {/* Progress bar while generating */}
                  {isGenerating && (
                    <div className="mt-2 space-y-1">
                      <p className="text-[10px] text-blue-400 font-semibold">
                        Step {genStep + 1}/3: {STEPS[genStep]}…
                      </p>
                      <ProgressBar step={genStep} />
                    </div>
                  )}

                  {/* Summary when ready */}
                  {status === 'ready' && demo && (
                    <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Database className="h-3 w-3" /> Synthetic data ✓</span>
                      <span className="flex items-center gap-1"><FileCode className="h-3 w-3" /> Microsite ✓</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {tourStops} tour stops ✓</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0 flex-wrap items-center">
                  {isCustom && status === 'not_generated' && (
                    <button onClick={() => removeCustomProduct(product.name)}
                      className="text-muted-foreground hover:text-red-400 transition-colors" title="Remove">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {status === 'not_generated' && (
                    <Tooltip content="Run a three-step AI generation process: synthetic data → microsite HTML → guided tour script">
                      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => generate(product)} disabled={isGenerating}>
                        <Play className="h-3.5 w-3.5" /> Generate Demo
                      </Button>
                    </Tooltip>
                  )}
                  {status === 'generating' && (
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" disabled>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                    </Button>
                  )}
                  {status === 'ready' && (
                    <>
                      <Tooltip content="Open the generated demo microsite in a full-screen preview — shows the complete standalone HTML page">
                        <Button size="sm" variant="outline" className="gap-1 text-xs h-8"
                          onClick={() => setMicrositePreview({ name: product.name, html: demo?.microsite_content || '' })}>
                          <Eye className="h-3 w-3" /> View Microsite
                        </Button>
                      </Tooltip>
                      <Tooltip content="Re-run the full three-step generation to produce a fresh demo environment — overwrites the current version">
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-8"
                          onClick={() => generate(product)} disabled={isGenerating}>
                          <RefreshCw className="h-3 w-3" /> Regenerate
                        </Button>
                      </Tooltip>
                      <Tooltip content="Expand to see synthetic data, microsite HTML, and tour script details">
                        <Button size="sm" variant="ghost" className="gap-1 text-xs h-8"
                          onClick={() => setExpanded(isExpanded ? null : product.name)}>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </Tooltip>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded detail panel */}
              <AnimatePresence>
                {isExpanded && demo && status === 'ready' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border">
                    <div className="p-5 space-y-5">

                      {/* Synthetic data summary */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <Database className="h-3.5 w-3.5 text-primary" /> Synthetic Data Summary
                        </p>
                        <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-foreground">
                          {JSON.stringify(demo.synthetic_data, null, 2).slice(0, 1200)}…
                        </pre>
                        <CopyButton text={JSON.stringify(demo.synthetic_data, null, 2)} label="Copy Synthetic Data" />
                        <AiDisclaimer />
                      </div>

                      {/* Microsite */}
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <FileCode className="h-3.5 w-3.5 text-blue-400" /> Demo Microsite HTML
                        </p>
                        <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-foreground">
                          {(demo.microsite_content || '').slice(0, 400)}…
                        </pre>
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" className="gap-1 text-xs h-8"
                            onClick={() => setMicrositePreview({ name: product.name, html: demo.microsite_content || '' })}>
                            <Eye className="h-3 w-3" /> Preview Full Screen
                          </Button>
                          <CopyButton text={demo.microsite_content || ''} label="Copy Microsite HTML" />
                          {!demo.microsite_deployed && (
                            <Tooltip content="Mark this microsite as deployed — records that the demo is live for this product">
                              <Button size="sm" variant="outline" className="gap-1 text-xs h-8 border-emerald-500/30 text-emerald-400"
                                onClick={() => markDeployed(product)}>
                                <CheckCircle2 className="h-3 w-3" /> Mark as Deployed
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                        <AiDisclaimer />
                      </div>

                      {/* ── Advanced tabs: Tour Editor / Data Sources / Version History ── */}
                      <div className="space-y-3 pt-2 border-t border-border">
                        <div className="flex gap-1 overflow-x-auto">
                          {[
                            { key: 'tour_view',    label: 'Tour Preview' },
                            { key: 'tour_edit',    label: 'Tour Editor' },
                            { key: 'data_sources', label: 'Data Sources' },
                            { key: 'versions',     label: 'Version History' },
                          ].map(tab => {
                            const active = (detailTab[product.name] || 'tour_view') === tab.key;
                            return (
                              <button key={tab.key}
                                onClick={() => setDetailTab(prev => ({ ...prev, [product.name]: tab.key }))}
                                className={`px-3 py-1.5 text-[10px] font-semibold rounded-md border transition-all whitespace-nowrap ${active ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Tour Editor */}
                        {(detailTab[product.name] || 'tour_view') === 'tour_edit' && (
                          <TourStepEditor demo={demo} productName={product.name}
                            onSaved={(updated) => setDemos(prev => ({ ...prev, [product.name]: { ...prev[product.name], tour_script: updated } }))} />
                        )}

                        {/* Data Sources */}
                        {detailTab[product.name] === 'data_sources' && (
                          <DemoDataSources demo={demo}
                            onSaved={(updatedSynthetic) => setDemos(prev => ({ ...prev, [product.name]: { ...prev[product.name], synthetic_data: updatedSynthetic } }))} />
                        )}

                        {/* Version History */}
                        {detailTab[product.name] === 'versions' && (
                          <DemoVersionHistory demo={demo} productName={product.name}
                            onRestored={(updated) => setDemos(prev => ({ ...prev, [product.name]: updated }))} />
                        )}
                      </div>

                      {/* Tour script (preview tab — default) */}
                      {(detailTab[product.name] || 'tour_view') === 'tour_view' && <div className="space-y-2">
                        <p className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-amber-400" /> Guided Tour Script ({tourStops} stops)
                        </p>
                        {/* Human-readable preview */}
                        {(() => {
                          try {
                            const t = JSON.parse(demo.tour_script || '{}');
                            return (
                              <div className="space-y-1.5">
                                {t.welcome_message && (
                                  <div className="text-[10px] text-muted-foreground bg-secondary/20 rounded p-2">
                                    <span className="font-bold text-foreground">Welcome: </span>{t.welcome_message}
                                  </div>
                                )}
                                {asArray(t.steps).map((step, i) => (
                                  <div key={i} className="flex items-start gap-2 text-[10px]">
                                    <span className="h-4 w-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                                    <div>
                                      <span className="font-semibold text-foreground">{step.title || step.id}</span>
                                      {step.text && <p className="text-muted-foreground">{typeof step.text === 'string' ? step.text.slice(0, 80) : ''}</p>}
                                    </div>
                                  </div>
                                ))}
                                {t.closing_cta && (
                                  <div className="text-[10px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded p-2 font-semibold">
                                    CTA: {t.closing_cta}
                                  </div>
                                )}
                              </div>
                            );
                          } catch { return null; }
                        })()}
                        <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap text-foreground">
                          {(demo.tour_script || '').slice(0, 400)}…
                        </pre>
                        <CopyButton text={demo.tour_script || ''} label="Copy Tour Script JSON" />
                        <AiDisclaimer />
                      </div>}

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
