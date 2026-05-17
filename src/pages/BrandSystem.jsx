import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Palette, Copy, Check, AlertCircle, Zap } from 'lucide-react';

const PRODUCTS = ['SAIGE', 'PressAI', 'ReachSMS', 'RelTwin', 'MyPregLife'];

function ColorSwatch({ color, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(color); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="flex flex-col items-center gap-1.5 group">
      <div className="h-10 w-16 rounded-lg border border-border shadow-sm" style={{ backgroundColor: color }} />
      <p className="text-[9px] font-mono text-muted-foreground group-hover:text-foreground transition-colors">{color}</p>
      <p className="text-[9px] text-muted-foreground">{copied ? '✓ copied' : label}</p>
    </button>
  );
}

function CopyBlock({ content, label }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground">{label}</p>
        <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 transition-all">
          {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
        </button>
      </div>
      <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48 text-foreground">{content}</pre>
      <p className="text-[10px] text-amber-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> AI-generated recommendation — verify before use</p>
    </div>
  );
}

export default function BrandSystem() {
  const [brand, setBrand] = useState(null);
  const [running, setRunning] = useState(false);
  const [sprintProduct, setSprintProduct] = useState(null);
  const [sprintOutput, setSprintOutput] = useState({});
  const [activeTab, setActiveTab] = useState('colors');

  useEffect(() => {
    base44.entities.BrandSystem.list('-created_date', 1)
      .then(data => { if (data[0]) setBrand(data[0]); })
      .catch(() => {});
  }, []);

  const generateBrandSystem = async () => {
    setRunning(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's brand system generator for VEU AI Studio. Create a complete, professional brand identity system for VEU AI Studio and its five products.

VEU AI Studio context:
- Founded by Victor Udo, FNSE, PhD — Nigerian-American engineer, sustainability executive, AI platform builder
- 35+ years experience spanning US and Nigerian power sectors, sustainability leadership, academic publishing
- Five products: SAIGE (sustainability), PressAI (publishing), ReachSMS (community SMS), RelTwin (relationships), MyPregLife (maternal health)
- Target markets: universities, utilities, government agencies, nonprofits, publishers, African healthcare
- Brand positioning: expert, trustworthy, innovative, purpose-driven, globally minded

Generate a complete brand system with these exact fields:

primary_color: hex color conveying trust, innovation, and expertise
secondary_color: complementary professional hex color
accent_color: hex for calls to action and highlights
background_primary: dark background hex
background_secondary: slightly lighter dark background hex
heading_font: Google Fonts font name for headings
body_font: Google Fonts font name for body text
brand_voice: array of 5 adjectives describing communication style
tagline_options: array of 3 tagline options for VEU AI Studio

product_variants: object with keys SAIGE, PressAI, ReachSMS, RelTwin, MyPregLife — each with:
  accent_color (hex), tagline (string), value_proposition (one sentence)

css_variables: complete CSS custom properties string implementing the brand system, ready to paste into any Base44 product index.css — include --background, --foreground, --primary, --secondary, --accent, --card, --border, --muted and all their -foreground variants

component_standards: object with keys buttons, cards, headers, forms — each describing Tailwind CSS class recommendations

logo_brief: detailed description of a logo concept for VEU AI Studio that a designer could execute, plus simplified icon mark descriptions for each of the 5 products

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, market positioning claim, or data point you include in any positioning or analysis sections, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — market research firms, industry reports, or brand studies. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.`,
      response_json_schema: {
        type: 'object',
        properties: {
          primary_color: { type: 'string' },
          secondary_color: { type: 'string' },
          accent_color: { type: 'string' },
          background_primary: { type: 'string' },
          background_secondary: { type: 'string' },
          heading_font: { type: 'string' },
          body_font: { type: 'string' },
          brand_voice: { type: 'array', items: { type: 'string' } },
          tagline_options: { type: 'array', items: { type: 'string' } },
          product_variants: { type: 'object' },
          css_variables: { type: 'string' },
          component_standards: { type: 'object' },
          logo_brief: { type: 'string' },
        },
      },
    });

    const saved = await base44.entities.BrandSystem.create({ ...result, version: '1.0', raw_output: result });
    setBrand(saved);
    setRunning(false);
  };

  const generateApplySprint = async (productName) => {
    setSprintProduct(productName);
    const variant = brand?.product_variants?.[productName] || {};
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete Base44 sprint request that applies the VEU AI Studio brand system to ${productName}.

Brand system to apply:
- Primary color: ${brand?.primary_color}
- Secondary color: ${brand?.secondary_color}
- Accent color for ${productName}: ${variant.accent_color || brand?.accent_color}
- Heading font: ${brand?.heading_font}
- Body font: ${brand?.body_font}
- CSS variables: ${brand?.css_variables?.substring(0, 500)}...

Sprint requirements:
1. Update index.css with the CSS variables above
2. Update tailwind.config.js fontFamily to use the brand fonts
3. Apply consistent button, card, and header styles per component standards
4. Ensure all existing functionality is completely preserved
5. Add the product tagline "${variant.tagline || ''}" to the main dashboard header

GUARDRAIL: Do not modify any existing business logic, data fetching, or entity operations. Only visual/CSS changes.

CRITICAL — CITATIONS FOR ALL DATA: Any statistic or data point in the sprint should cite real sources. Format as: [statistic] (Source: [Organization], [Year]). Never invent data.

Make every instruction specific, actionable, and safe to implement.`,
    });
    setSprintOutput(prev => ({ ...prev, [productName]: result }));
    setSprintProduct(null);
  };

  const TABS = [
    { key: 'colors',    label: 'Colors & Fonts' },
    { key: 'products',  label: 'Product Variants' },
    { key: 'css',       label: 'CSS Variables' },
    { key: 'standards', label: 'Component Standards' },
    { key: 'logo',      label: 'Logo Brief' },
    { key: 'sprint',    label: 'Apply Sprint' },
  ];

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Palette className="h-7 w-7 text-primary" /> Brand System
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-generated unified brand identity for VEU AI Studio — colors, typography, CSS variables, and product variants.
        </p>
      </motion.div>

      {!brand && (
        <div className="rounded-xl border border-border bg-card p-10 text-center space-y-4">
          <Palette className="h-12 w-12 text-muted-foreground/20 mx-auto" />
          <p className="text-sm text-muted-foreground">No brand system generated yet. Generate one to create a complete identity system for all VEU AI Studio products.</p>
          <Button onClick={generateBrandSystem} disabled={running} className="gap-2 mx-auto">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Palette className="h-4 w-4" />}
            {running ? 'Generating Brand System...' : 'Generate Brand System'}
          </Button>
          {running && <p className="text-xs text-muted-foreground">This may take 20–30 seconds — generating complete brand identity...</p>}
        </div>
      )}

      {brand && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Version {brand.version} · Generated {brand.created_date ? new Date(brand.created_date).toLocaleDateString() : 'recently'}</p>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={generateBrandSystem} disabled={running}>
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Regenerate
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-border pb-0">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'colors' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Studio Color Palette</p>
                <div className="flex flex-wrap gap-6">
                  {[
                    { color: brand.primary_color, label: 'Primary' },
                    { color: brand.secondary_color, label: 'Secondary' },
                    { color: brand.accent_color, label: 'Accent' },
                    { color: brand.background_primary, label: 'BG Primary' },
                    { color: brand.background_secondary, label: 'BG Secondary' },
                  ].filter(c => c.color).map(c => <ColorSwatch key={c.label} {...c} />)}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Typography</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="text-[10px] text-muted-foreground">Heading Font</p>
                    <p className="text-lg font-bold text-foreground mt-1">{brand.heading_font}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-secondary/20 p-3">
                    <p className="text-[10px] text-muted-foreground">Body Font</p>
                    <p className="text-sm text-foreground mt-1">{brand.body_font}</p>
                  </div>
                </div>
              </div>
              {brand.brand_voice?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Brand Voice</p>
                  <div className="flex flex-wrap gap-2">
                    {brand.brand_voice.map(v => (
                      <span key={v} className="text-xs px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary font-medium">{v}</span>
                    ))}
                  </div>
                </div>
              )}
              {brand.tagline_options?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Tagline Options</p>
                  {brand.tagline_options.map((t, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-secondary/20">
                      <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
                      <p className="text-sm text-foreground flex-1 italic">"{t}"</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-3">
              {PRODUCTS.map(name => {
                const variant = brand.product_variants?.[name] || {};
                return (
                  <div key={name} className="rounded-xl border border-border bg-card p-4 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg border border-border shrink-0" style={{ backgroundColor: variant.accent_color || brand.accent_color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{name}</p>
                      <p className="text-[11px] text-primary font-medium mt-0.5">{variant.tagline}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{variant.value_proposition}</p>
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground shrink-0">{variant.accent_color}</p>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'css' && brand.css_variables && (
            <CopyBlock content={brand.css_variables} label="CSS Variables — paste into index.css" />
          )}

          {activeTab === 'standards' && brand.component_standards && (
            <div className="space-y-4">
              {Object.entries(brand.component_standards).map(([key, val]) => (
                <div key={key} className="rounded-lg border border-border bg-secondary/20 p-4">
                  <p className="text-xs font-bold text-foreground capitalize mb-2">{key}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{typeof val === 'string' ? val : JSON.stringify(val, null, 2)}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'logo' && brand.logo_brief && (
            <CopyBlock content={brand.logo_brief} label="Logo Brief — share with designer" />
          )}

          {activeTab === 'sprint' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Generate a Base44 sprint request that applies the brand system to a specific product.</p>
              {PRODUCTS.map(name => {
                const sprint = sprintOutput[name];
                return (
                  <div key={name} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">{name}</p>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5"
                        disabled={sprintProduct === name}
                        onClick={() => generateApplySprint(name)}>
                        {sprintProduct === name ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                        Apply Brand to {name}
                      </Button>
                    </div>
                    {sprint && (
                      <div className="space-y-1.5">
                        <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 whitespace-pre-wrap max-h-48 overflow-y-auto text-foreground">{sprint}</pre>
                        <p className="text-[10px] text-amber-400 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> AI-generated — verify before applying to production</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}