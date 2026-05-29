import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Pencil, Link2, Layers, Loader2, Copy, Check, Plus, X, Zap } from 'lucide-react';
import AiDisclaimer from '@/components/gtm/AiDisclaimer';
import RegisterProductModal from '@/components/creator/RegisterProductModal';

const MARKETS = ['Nigeria/Africa', 'United States', 'Global', 'Custom'];
const INDUSTRIES = ['Sustainability', 'Publishing', 'Community', 'Health', 'Finance', 'Education', 'Real Estate', 'Other'];
const BUDGETS = ['Free tools only', 'Under $100/month', 'Under $500/month', 'Enterprise'];

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

function OutputTabs({ tabs, activeTab, onTab, outputs }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-border">
        {tabs.map(t => (
          <button key={t.key} onClick={() => outputs[t.key] && onTab(t.key)}
            disabled={!outputs[t.key]}
            className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === t.key && outputs[t.key] ? 'border-primary text-primary' : outputs[t.key] ? 'border-transparent text-muted-foreground hover:text-foreground' : 'border-transparent text-muted-foreground/30 cursor-not-allowed'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map(t => {
        if (activeTab !== t.key || !outputs[t.key]) return null;
        const text = typeof outputs[t.key] === 'string' ? outputs[t.key] : JSON.stringify(outputs[t.key], null, 2);
        return (
          <div key={t.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">{t.label}</p>
              <CopyBtn text={text} />
            </div>
            <pre className="text-[11px] font-sans bg-secondary/30 border border-border rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-y-auto text-foreground leading-relaxed">{text}</pre>
            <AiDisclaimer />
          </div>
        );
      })}
    </div>
  );
}

// ── MODE 1 ──────────────────────────────────────────────────────────────────
function Mode1({ onCreated }) {
  const [form, setForm] = useState({ product_name: '', client_name: '', description: '', target_audience: '', target_market: 'Global', industry: 'Other', budget: 'Under $100/month' });
  const [phase, setPhase] = useState(0); // 0=idle 1=strategy 2=arch 3=sprint
  const [outputs, setOutputs] = useState({ strategy: null, architecture: null, sprint: null });
  const [activeTab, setActiveTab] = useState('strategy');
  const [showRegister, setShowRegister] = useState(false);

  const CITATION_NOTE = '\n\nCRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, market size figure, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics.';

  const generate = async () => {
    setPhase(1);
    setOutputs({ strategy: null, architecture: null, sprint: null });

    const strategyResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's product creation engine. Generate a complete product strategy.

Product name: ${form.product_name}
Description: ${form.description}
Target audience: ${form.target_audience}
Target market: ${form.target_market}
Industry: ${form.industry}
Budget: ${form.budget}

Generate:
1. Product vision statement — one compelling sentence
2. Core value proposition — what specific problem this solves and for whom
3. Five core features — name, description, and user benefit for each
4. Target user persona — detailed description of the primary user
5. Competitive positioning — how this is different from existing solutions
6. Revenue model recommendation — how this product should make money
7. Go-to-market recommendation — first customer strategy
${CITATION_NOTE}`,
    });
    const strategyText = typeof strategyResult === 'string' ? strategyResult : JSON.stringify(strategyResult, null, 2);
    setOutputs(prev => ({ ...prev, strategy: strategyText }));
    setActiveTab('strategy');
    setPhase(2);

    const archResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Based on this product strategy, generate the complete technical architecture for a Base44 application.

Product strategy: ${strategyText}

Generate:
1. Data model — all entities needed with fields and relationships
2. Page structure — all pages needed with purpose and key components
3. User flows — the three most important user journeys step by step
4. AI integration points — where Core.InvokeLLM should be used and what prompts
5. External integrations needed — payment, SMS, email, storage etc.
6. Recommended stack from these options: Base44 + Vercel + Supabase OR Base44 + Railway + Supabase
7. Estimated build complexity: Low (1-2 weeks) / Medium (2-4 weeks) / High (4-8 weeks)
${CITATION_NOTE}`,
    });
    const archText = typeof archResult === 'string' ? archResult : JSON.stringify(archResult, null, 2);
    setOutputs(prev => ({ ...prev, architecture: archText }));
    setPhase(3);

    const sprintResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete Base44 build sprint request.

Strategy: ${strategyText.slice(0, 1200)}
Architecture: ${archText.slice(0, 1200)}
Client name: ${form.client_name}

Generate a complete, copy-pasteable Base44 sprint request that instructs Base44 to build this product from scratch. Include:
1. All entities with complete field definitions
2. All pages with layout and functionality descriptions
3. All Core.InvokeLLM integrations with complete prompts
4. Navigation structure
5. Authentication requirements
6. Footer attribution: "Built for ${form.client_name} by VEU AI Studio"
7. Acceptance criteria — one measurable statement per major feature
8. Guardrail: preserve all existing functionality, additive only

This sprint must be precise enough for Base44 to build the complete product without further clarification.
${CITATION_NOTE}`,
    });
    const sprintText = typeof sprintResult === 'string' ? sprintResult : JSON.stringify(sprintResult, null, 2);
    setOutputs(prev => ({ ...prev, sprint: sprintText }));
    setActiveTab('sprint');
    setPhase(4);
  };

  const isRunning = phase > 0 && phase < 4;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Product Name *</label>
          <Input value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} placeholder="e.g. ClimateTrack" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Client / IP Owner Name *</label>
          <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="e.g. Acme Corp" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
          <Input value={form.target_audience} onChange={e => setForm(p => ({ ...p, target_audience: e.target.value }))} placeholder="e.g. University sustainability directors" className="h-9 text-sm" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Market</label>
            <select value={form.target_market} onChange={e => setForm(p => ({ ...p, target_market: e.target.value }))} className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-2 text-foreground">
              {MARKETS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Industry</label>
            <select value={form.industry} onChange={e => setForm(p => ({ ...p, industry: e.target.value }))} className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-2 text-foreground">
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Budget</label>
            <select value={form.budget} onChange={e => setForm(p => ({ ...p, budget: e.target.value }))} className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-2 text-foreground">
              {BUDGETS.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Product Description *</label>
        <Textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Describe your product in as much detail as you want. What does it do? Who is it for? What problem does it solve? What are the key features?" className="h-28 text-sm resize-none" />
      </div>

      {isRunning && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {phase === 1 && 'Generating product strategy...'}
            {phase === 2 && 'Generating technical architecture...'}
            {phase === 3 && 'Generating Base44 build sprint...'}
          </p>
        </div>
      )}

      <Button onClick={generate} disabled={isRunning || !form.product_name.trim() || !form.description.trim()} className="w-full gap-2">
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isRunning ? 'Generating...' : 'Generate Product Plan'}
      </Button>

      {(outputs.strategy || outputs.architecture || outputs.sprint) && (
        <>
          <OutputTabs
            tabs={[{ key: 'strategy', label: '1. Product Strategy' }, { key: 'architecture', label: '2. Technical Architecture' }, { key: 'sprint', label: '3. Base44 Build Sprint' }]}
            activeTab={activeTab} onTab={setActiveTab} outputs={outputs}
          />
          {phase === 4 && (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowRegister(true)}>
              <Plus className="h-4 w-4" /> Register This Product
            </Button>
          )}
        </>
      )}

      {showRegister && (
        <RegisterProductModal
          productName={form.product_name} clientName={form.client_name}
          mode="describe" targetAudience={form.target_audience}
          strategy={outputs.strategy} architecture={outputs.architecture} sprint={outputs.sprint}
          onClose={() => setShowRegister(false)}
          onRegistered={(rec) => { onCreated(rec); setShowRegister(false); }}
        />
      )}
    </div>
  );
}

// ── MODE 2 ──────────────────────────────────────────────────────────────────
function Mode2({ onCreated }) {
  const [form, setForm] = useState({ source_url: '', is_spa: true, product_name: '', client_name: '', improvement_goals: '', target_market: 'Global' });
  const [phase, setPhase] = useState(0);
  const [outputs, setOutputs] = useState({ audit: null, plan: null, sprint: null });
  const [activeTab, setActiveTab] = useState('audit');
  const [showRegister, setShowRegister] = useState(false);

  const generate = async () => {
    setPhase(1);
    setOutputs({ audit: null, plan: null, sprint: null });

    const auditResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's product auditor. Perform a thorough audit of this product URL.

URL: ${form.source_url}
Is SPA: ${form.is_spa}

Score and analyze across four dimensions:
1. UI/UX (0-25): Navigation, visual design, mobile responsiveness, user experience
2. API/Performance (0-25): Load speed, data handling, error states, reliability
3. Business Logic (0-25): Core feature completeness, user flows, edge case handling
4. Business Value (0-25): Value proposition clarity, target audience alignment, monetization

For each dimension provide: score (0-25), strengths (array), weaknesses (array), specific findings.
Also provide: total_score (0-100), overall_verdict (one paragraph), top_3_improvements.

CRITICAL — CITATIONS FOR ALL DATA: For every benchmark or industry standard cited, provide source in parentheses. Format: [statistic] (Source: [Organization], [Year]).`,
      response_json_schema: {
        type: 'object', properties: {
          total_score: { type: 'number' }, overall_verdict: { type: 'string' },
          ui_ux: { type: 'object' }, api_performance: { type: 'object' },
          business_logic: { type: 'object' }, business_value: { type: 'object' },
          top_3_improvements: { type: 'array', items: { type: 'string' } },
        }
      }
    });
    const auditText = JSON.stringify(auditResult, null, 2);
    setOutputs(prev => ({ ...prev, audit: auditText }));
    setActiveTab('audit');
    setPhase(2);

    const planResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You have audited a product. Generate an improvement plan for a superior version.

Audit results: ${auditText}
Improvement goals: ${form.improvement_goals}
Target market: ${form.target_market}
New product name: ${form.product_name}

Generate:
1. What this product does well — preserve these strengths
2. Critical weaknesses — these must be fixed in the new version
3. Missing features — what the target audience needs that this product lacks
4. UX improvements — specific interface changes that would improve usability
5. Technical improvements — architecture or performance improvements
6. Differentiation strategy — how the new version stands apart

CRITICAL — CITATIONS FOR ALL DATA: Cite real sources for all data points.`,
    });
    const planText = typeof planResult === 'string' ? planResult : JSON.stringify(planResult, null, 2);
    setOutputs(prev => ({ ...prev, plan: planText }));
    setPhase(3);

    const sprintResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete Base44 build sprint for an improved version of this product.

Original URL: ${form.source_url}
Improvement plan: ${planText.slice(0, 1500)}
New product name: ${form.product_name}
Client name: ${form.client_name}

Generate a complete, copy-pasteable Base44 sprint that builds the improved product. Include:
1. All entities with complete field definitions
2. All pages with layout and functionality (incorporating improvements)
3. Core.InvokeLLM integrations with prompts
4. Navigation structure
5. Footer attribution: "Built for ${form.client_name} by VEU AI Studio"
6. Acceptance criteria
7. Guardrail: preserve all existing functionality, additive only`,
    });
    const sprintText = typeof sprintResult === 'string' ? sprintResult : JSON.stringify(sprintResult, null, 2);
    setOutputs(prev => ({ ...prev, sprint: sprintText }));
    setActiveTab('sprint');
    setPhase(4);
  };

  const isRunning = phase > 0 && phase < 4;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Source Product URL *</label>
          <div className="flex gap-2">
            <Input value={form.source_url} onChange={e => setForm(p => ({ ...p, source_url: e.target.value }))} placeholder="https://existing-product.com" className="h-9 text-sm" />
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={form.is_spa} onChange={e => setForm(p => ({ ...p, is_spa: e.target.checked }))} className="rounded" />
              SPA
            </label>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Your New Product Name *</label>
          <Input value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} placeholder="e.g. SuperTrack Pro" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Client / IP Owner Name *</label>
          <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="e.g. Acme Corp" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Target Market</label>
          <select value={form.target_market} onChange={e => setForm(p => ({ ...p, target_market: e.target.value }))} className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-2 text-foreground">
            {MARKETS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Improvement Goals</label>
        <Textarea value={form.improvement_goals} onChange={e => setForm(p => ({ ...p, improvement_goals: e.target.value }))} placeholder="What specifically do you want to improve? Better UX? More features? Different target audience?" className="h-20 text-sm resize-none" />
      </div>

      {isRunning && (
        <div className="flex items-center gap-3 py-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {phase === 1 && 'Auditing source product...'}
            {phase === 2 && 'Generating improvement plan...'}
            {phase === 3 && 'Generating Base44 build sprint...'}
          </p>
        </div>
      )}

      <Button onClick={generate} disabled={isRunning || !form.source_url.trim() || !form.product_name.trim()} className="w-full gap-2">
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isRunning ? 'Analyzing...' : 'Analyze and Generate'}
      </Button>

      {(outputs.audit || outputs.plan || outputs.sprint) && (
        <>
          <OutputTabs
            tabs={[{ key: 'audit', label: '1. Audit Results' }, { key: 'plan', label: '2. Improvement Plan' }, { key: 'sprint', label: '3. Base44 Build Sprint' }]}
            activeTab={activeTab} onTab={setActiveTab} outputs={outputs}
          />
          {phase === 4 && (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowRegister(true)}>
              <Plus className="h-4 w-4" /> Register This Product
            </Button>
          )}
        </>
      )}

      {showRegister && (
        <RegisterProductModal
          productName={form.product_name} clientName={form.client_name}
          mode="clone" targetAudience="" sourceUrls={[form.source_url]}
          strategy={outputs.audit} architecture={outputs.plan} sprint={outputs.sprint}
          onClose={() => setShowRegister(false)}
          onRegistered={(rec) => { onCreated(rec); setShowRegister(false); }}
        />
      )}
    </div>
  );
}

// ── MODE 3 ──────────────────────────────────────────────────────────────────
function Mode3({ onCreated }) {
  const [urls, setUrls] = useState([{ url: '', is_spa: true, context: '' }]);
  const [form, setForm] = useState({ product_name: '', client_name: '', synthesis_goal: '', target_market: 'Global' });
  const [phase, setPhase] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [outputs, setOutputs] = useState({ comparative: null, elements: null, synthesis: null, sprint: null });
  const [activeTab, setActiveTab] = useState('comparative');
  const [showRegister, setShowRegister] = useState(false);

  const addUrl = () => urls.length < 5 && setUrls(prev => [...prev, { url: '', is_spa: true, context: '' }]);
  const removeUrl = (i) => setUrls(prev => prev.filter((_, j) => j !== i));
  const updateUrl = (i, field, val) => setUrls(prev => prev.map((u, j) => j === i ? { ...u, [field]: val } : u));

  const generate = async () => {
    setPhase(1);
    setOutputs({ comparative: null, elements: null, synthesis: null, sprint: null });

    setPhaseLabel('Auditing reference products...');
    const urlList = urls.filter(u => u.url.trim());
    const auditResults = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's multi-product auditor. Score and analyze each of these products across four dimensions.

Products to audit:
${urlList.map((u, i) => `${i + 1}. URL: ${u.url}${u.context ? ` — Context: ${u.context}` : ''} (SPA: ${u.is_spa})`).join('\n')}

For each product, score these dimensions 0-25 each:
- UI/UX: Navigation, visual design, mobile responsiveness
- API/Performance: Load speed, data handling, reliability
- Business Logic: Feature completeness, user flows
- Business Value: Value proposition, monetization, audience alignment

Return an array of audit objects, one per product, each with: url, total_score, ui_ux_score, api_score, logic_score, value_score, top_strengths (array), top_weaknesses (array).

CRITICAL — CITATIONS: Cite real sources for all benchmarks.`,
      response_json_schema: {
        type: 'object', properties: {
          audits: { type: 'array', items: { type: 'object' } }
        }
      }
    });
    const comparativeText = JSON.stringify(auditResults, null, 2);
    setOutputs(prev => ({ ...prev, comparative: comparativeText }));
    setActiveTab('comparative');
    setPhase(2);

    setPhaseLabel('Comparing strengths...');
    const elementsResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You have audited multiple reference products. Produce a comparative analysis identifying the best elements.

Audit results: ${comparativeText}

For each of the four dimensions — UI/UX, API/Performance, Business Logic, Business Value — identify:
1. Which product scored highest in this dimension
2. What specifically it does better than the others
3. The single best pattern from that product that should be preserved in the synthesized version

Also identify any unique strengths from lower-scoring products that are worth including.

Structure your analysis clearly by dimension, naming the source product for each best practice.

CRITICAL — CITATIONS: Cite real industry sources for all claims.`,
    });
    const elementsText = typeof elementsResult === 'string' ? elementsResult : JSON.stringify(elementsResult, null, 2);
    setOutputs(prev => ({ ...prev, elements: elementsText }));
    setPhase(3);

    setPhaseLabel('Synthesizing design...');
    const synthesisResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Design a synthesized superior product combining the best elements from all reference products.

Comparative analysis: ${elementsText.slice(0, 1500)}
Synthesis goal: ${form.synthesis_goal}
New product name: ${form.product_name}

Generate the complete product design. For each major design decision:
1. State the decision
2. Cite which reference product it comes from
3. Explain why it was selected over the alternatives

Produce: vision statement, core features (5), UX design approach, technical approach, differentiation statement.

CRITICAL — CITATIONS: Cite real sources for all data.`,
    });
    const synthesisText = typeof synthesisResult === 'string' ? synthesisResult : JSON.stringify(synthesisResult, null, 2);
    setOutputs(prev => ({ ...prev, synthesis: synthesisText }));
    setPhase(4);

    setPhaseLabel('Generating build sprint...');
    const sprintResult = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete Base44 build sprint for this synthesized product.

Synthesis plan: ${synthesisText.slice(0, 1500)}
Product name: ${form.product_name}
Client name: ${form.client_name}

Complete, copy-pasteable Base44 sprint including:
1. All entities with field definitions
2. All pages with layout and functionality
3. Core.InvokeLLM integrations with prompts
4. Navigation structure
5. Footer attribution: "Built for ${form.client_name} by VEU AI Studio"
6. Acceptance criteria
7. Guardrail: preserve all existing functionality, additive only`,
    });
    const sprintText = typeof sprintResult === 'string' ? sprintResult : JSON.stringify(sprintResult, null, 2);
    setOutputs(prev => ({ ...prev, sprint: sprintText }));
    setActiveTab('sprint');
    setPhase(5);
    setPhaseLabel('');
  };

  const isRunning = phase > 0 && phase < 5;

  return (
    <div className="space-y-4">
      {/* URL inputs */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">Reference URLs (2–5)</label>
          {urls.length < 5 && <button onClick={addUrl} className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"><Plus className="h-3 w-3" /> Add URL</button>}
        </div>
        {urls.map((u, i) => (
          <div key={i} className="flex gap-2 items-center">
            <span className="text-[10px] text-muted-foreground w-4 shrink-0">{i + 1}.</span>
            <Input value={u.url} onChange={e => updateUrl(i, 'url', e.target.value)} placeholder="https://reference-product.com" className="h-8 text-xs flex-1" />
            <Input value={u.context} onChange={e => updateUrl(i, 'context', e.target.value)} placeholder="Context (optional)" className="h-8 text-xs w-32" />
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={u.is_spa} onChange={e => updateUrl(i, 'is_spa', e.target.checked)} className="rounded" />
              SPA
            </label>
            {urls.length > 1 && <button onClick={() => removeUrl(i)} className="text-muted-foreground hover:text-red-400"><X className="h-3.5 w-3.5" /></button>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">New Product Name *</label>
          <Input value={form.product_name} onChange={e => setForm(p => ({ ...p, product_name: e.target.value }))} placeholder="e.g. SuperPlatform" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Client / IP Owner Name *</label>
          <Input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} placeholder="e.g. Acme Corp" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground">Target Market</label>
          <select value={form.target_market} onChange={e => setForm(p => ({ ...p, target_market: e.target.value }))} className="w-full h-9 text-xs rounded-md border border-input bg-transparent px-2 text-foreground">
            {MARKETS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground">Synthesis Goal</label>
        <Textarea value={form.synthesis_goal} onChange={e => setForm(p => ({ ...p, synthesis_goal: e.target.value }))} placeholder="What is the ideal product that combines the best of all these? Who is it for?" className="h-20 text-sm resize-none" />
      </div>

      {isRunning && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{phaseLabel}</p>
          </div>
          <div className="flex gap-1">
            {['Auditing…', 'Comparing…', 'Synthesizing…', 'Generating sprint…'].map((l, i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < phase - 1 ? 'bg-primary' : i === phase - 1 ? 'bg-primary/40 animate-pulse' : 'bg-border'}`} />
            ))}
          </div>
        </div>
      )}

      <Button onClick={generate} disabled={isRunning || urls.filter(u => u.url.trim()).length < 2 || !form.product_name.trim()} className="w-full gap-2">
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {isRunning ? 'Analyzing...' : 'Analyze and Synthesize'}
      </Button>

      {(outputs.comparative || outputs.elements || outputs.synthesis || outputs.sprint) && (
        <>
          <OutputTabs
            tabs={[{ key: 'comparative', label: '1. Comparative Audit' }, { key: 'elements', label: '2. Best Elements' }, { key: 'synthesis', label: '3. Synthesis Plan' }, { key: 'sprint', label: '4. Base44 Build Sprint' }]}
            activeTab={activeTab} onTab={setActiveTab} outputs={outputs}
          />
          {phase === 5 && (
            <Button variant="outline" className="w-full gap-2" onClick={() => setShowRegister(true)}>
              <Plus className="h-4 w-4" /> Register This Product
            </Button>
          )}
        </>
      )}

      {showRegister && (
        <RegisterProductModal
          productName={form.product_name} clientName={form.client_name}
          mode="synthesize" targetAudience="" sourceUrls={urls.filter(u => u.url.trim()).map(u => u.url)}
          strategy={outputs.synthesis} architecture={outputs.elements} sprint={outputs.sprint}
          onClose={() => setShowRegister(false)}
          onRegistered={(rec) => { onCreated(rec); setShowRegister(false); }}
        />
      )}
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
const MODES = [
  { key: 'describe',   label: 'Describe & Build',    icon: Pencil, desc: 'Describe your product idea in plain English. FlowAI generates the complete architecture and Base44 build sprint.' },
  { key: 'clone',      label: 'Clone & Improve',      icon: Link2,  desc: 'Provide an existing product URL. FlowAI audits it and generates an improved version.' },
  { key: 'synthesize', label: 'Synthesize & Build',   icon: Layers, desc: 'Provide 2-5 competing product URLs. FlowAI extracts the best from each and synthesizes a superior product.' },
];

export default function CreatorStudio() {
  const [activeMode, setActiveMode] = useState(null);
  const [createdCount, setCreatedCount] = useState(0);

  const handleCreated = () => setCreatedCount(c => c + 1);

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Pencil className="h-7 w-7 text-primary" /> My Workspace
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Build any product from natural language, an existing URL, or multiple URL synthesis
        </p>
        {createdCount > 0 && (
          <p className="text-xs text-emerald-400 mt-1">{createdCount} product{createdCount > 1 ? 's' : ''} registered — view in <a href="/my-products" className="underline">My Products</a></p>
        )}
      </motion.div>

      {/* Mode cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {MODES.map(mode => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.key;
          return (
            <button key={mode.key} onClick={() => setActiveMode(isActive ? null : mode.key)}
              className={`rounded-xl border p-5 text-left transition-all space-y-2 ${isActive ? 'border-primary/50 bg-primary/5' : 'border-border bg-card hover:border-primary/30 hover:bg-primary/5'}`}>
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isActive ? 'bg-primary/20' : 'bg-secondary/50'}`}>
                <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
              <p className={`text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>{mode.label}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{mode.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Active mode panel */}
      <AnimatePresence mode="wait">
        {activeMode && (
          <motion.div key={activeMode} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-foreground">
                {MODES.find(m => m.key === activeMode)?.label}
              </p>
              <button onClick={() => setActiveMode(null)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            {activeMode === 'describe'   && <Mode1 onCreated={handleCreated} />}
            {activeMode === 'clone'      && <Mode2 onCreated={handleCreated} />}
            {activeMode === 'synthesize' && <Mode3 onCreated={handleCreated} />}
          </motion.div>
        )}
      </AnimatePresence>

      {!activeMode && (
        <div className="text-center py-14">
          <Pencil className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Select a creation mode above to get started</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Every product created gets "Built for [Client] by VEU AI Studio" attribution</p>
        </div>
      )}
    </div>
  );
}