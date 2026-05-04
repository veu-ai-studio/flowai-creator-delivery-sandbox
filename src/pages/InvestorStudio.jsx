import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { VEU_PRODUCTS } from '@/lib/veuProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import CopyButton from '@/components/gtm/CopyButton';
import AiDisclaimer from '@/components/gtm/AiDisclaimer';
import {
  TrendingUp, Loader2, Eye, ChevronDown, ChevronUp,
  Globe, LayoutGrid, Star, Play, Plus, X
} from 'lucide-react';

// Shared slide schema for all LLM calls
const SLIDE_SCHEMA = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slide_number: { type: 'integer' },
          title: { type: 'string' },
          key_message: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          speaker_notes: { type: 'string' },
          visual_recommendation: { type: 'string' },
        },
      },
    },
  },
};

function slideGroupPrompt(product, groupLabel, slideNums, slideDefs) {
  return `You are FlowAI's investor pitch deck generator for VEU AI Studio.
Generate ONLY slides ${slideNums} for the pitch deck for ${product.name} (${product.tagline}).
Target audience: investors and strategic partners. Target buyers/users: ${product.audience || 'enterprise buyers'}.
Demo reference org: ${product.demo_org || product.name}.

Generate exactly these ${slideDefs.length} slides:
${slideDefs.map((s, i) => `${slideNums.split('-')[0].trim().split(',')[i] || (i + 1)}. ${s}`).join('\n')}

CRITICAL — CITATIONS FOR ALL DATA:
For every statistic, percentage, benchmark, market size figure, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, government databases, or peer-reviewed research. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source for a figure, do not include that figure.

For each slide return:
- slide_number (integer, exact number listed above)
- title (string)
- key_message (one compelling sentence)
- bullets (array of exactly 4 strings, data-driven and specific)
- speaker_notes (2-3 sentences the presenter says aloud)
- visual_recommendation (one sentence describing the ideal visual)

Be specific and credible — this will be shown to real investors.
Return JSON with key "slides" containing array of exactly ${slideDefs.length} slide objects.`;
}

const SLIDE_GROUPS = [
  {
    label: 'Generating slides 1–4…',
    nums: '1, 2, 3, 4',
    defs: [
      'Cover — product name, tagline, Victor Udo FNSE PhD — VEU AI Studio',
      'Problem — the specific market problem with real statistics',
      'Solution — how this product solves it with AI',
      'Market Size — TAM, SAM, SOM with sources',
    ],
  },
  {
    label: 'Generating slides 5–8…',
    nums: '5, 6, 7, 8',
    defs: [
      'Product Demo — three key features demonstrated with demo org data highlights',
      'Business Model — pricing tiers, revenue model, unit economics',
      'Traction — current status, pilot pipeline, key milestones achieved',
      'Competition — competitive landscape with clear differentiation',
    ],
  },
  {
    label: 'Generating slides 9–12…',
    nums: '9, 10, 11, 12',
    defs: [
      'Go-to-Market — first customer strategy, channel approach, partnership model',
      'Team — Victor Udo FNSE PhD credentials, advisory structure, hiring plan',
      'Financial Projections — 3-year revenue model, key assumptions',
      'The Ask — what VEU AI Studio is seeking, use of funds, timeline',
    ],
  },
];

export default function InvestorStudio() {
  const [decks, setDecks] = useState({});
  const [portfolio, setPortfolio] = useState(null);
  const [deckProgress, setDeckProgress] = useState({}); // name → { step: 0-3, label }
  const [generatingPortfolio, setGeneratingPortfolio] = useState(null); // null | string (progress text)
  const [expandedDeck, setExpandedDeck] = useState(null);
  const [portfolioPreview, setPortfolioPreview] = useState(false);

  // Custom product state
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customTagline, setCustomTagline] = useState('');
  const [customAudience, setCustomAudience] = useState('');
  const [customProducts, setCustomProducts] = useState([]);

  useEffect(() => {
    base44.entities.InvestorAsset.list('-created_date').then(records => {
      const deckMap = {};
      records.forEach(r => {
        if (r.asset_type === 'pitch_deck') deckMap[r.product_name] = r;
        if (r.asset_type === 'portfolio_page') setPortfolio(r);
      });
      setDecks(deckMap);
    });
  }, []);

  const generateDeck = async (product) => {
    setDeckProgress(prev => ({ ...prev, [product.name]: { step: 0, label: SLIDE_GROUPS[0].label } }));

    let allSlides = [];

    for (let i = 0; i < SLIDE_GROUPS.length; i++) {
      const group = SLIDE_GROUPS[i];
      setDeckProgress(prev => ({ ...prev, [product.name]: { step: i, label: group.label } }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: slideGroupPrompt(product, group.label, group.nums, group.defs),
        response_json_schema: SLIDE_SCHEMA,
      });

      const groupSlides = result?.slides || [];
      allSlides = [...allSlides, ...groupSlides];
    }

    setDeckProgress(prev => ({ ...prev, [product.name]: { step: 3, label: 'Pitch deck complete' } }));

    const finalContent = { slides: allSlides };
    const existing = decks[product.name];
    let saved;
    if (existing) {
      await base44.entities.InvestorAsset.update(existing.id, { content: finalContent });
      saved = { ...existing, content: finalContent };
    } else {
      saved = await base44.entities.InvestorAsset.create({
        product_name: product.name,
        asset_type: 'pitch_deck',
        content: finalContent,
      });
    }
    setDecks(prev => ({ ...prev, [product.name]: saved }));

    // Clear progress after short delay
    setTimeout(() => setDeckProgress(prev => { const n = { ...prev }; delete n[product.name]; return n; }), 2000);
    setExpandedDeck(product.name);
  };

  const generatePortfolio = async () => {
    setGeneratingPortfolio('Generating studio overview...');

    // ── CALL 1: Studio Hero, Studio Thesis, Product Showcase ────────────
    const section1 = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's portfolio page generator. Generate ONLY sections 1-3 for the VEU AI Studio portfolio page.

1. STUDIO HERO — VEU AI Studio headline, mission statement, and Victor Udo's credentials (FNSE, PhD, 35+ years experience, former Bucknell University Director of Sustainability, Pepco Holdings, Ibom Power Company, author of 3 books, 687+ citations)

2. STUDIO THESIS — Why AI-powered platforms for sustainability, publishing, community engagement, relationships, and maternal health represent a coherent portfolio targeting underserved markets

3. PRODUCT SHOWCASE — Each of the five products presented as a card with product name, tagline, target market, problem solved, key capability, current status (pilot-ready), and demo access CTA:
   - SAIGE: sustainability intelligence for universities
   - PressAI: AI publishing for authors and publishers
   - ReachSMS: SMS community engagement for nonprofits
   - RelTwin: relationship intelligence for coaches and HR
   - MyBirthSafe: maternal health tracking for Africa

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, market size figure, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, government databases, or peer-reviewed research. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Return JSON with keys: hero_html, thesis_html, products_html (each containing plain HTML+CSS snippet, no <html> or <body> tags).`,
      response_json_schema: { type: 'object', properties: { hero_html: { type: 'string' }, thesis_html: { type: 'string' }, products_html: { type: 'string' } } },
    });

    setGeneratingPortfolio('Generating market opportunity...');

    // ── CALL 2: Market Opportunity, Competitive Advantage, Traction ────────────
    const section2 = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's portfolio page generator. Generate ONLY sections 4-6 for the VEU AI Studio portfolio page.

4. MARKET OPPORTUNITY — Combined TAM across all five markets (SAIGE, PressAI, ReachSMS, RelTwin, MyBirthSafe) with specific, sourced data

5. COMPETITIVE ADVANTAGE — Why VEU AI Studio's domain expertise, African market knowledge, and FlowAI infrastructure create an insurmountable moat

6. TRACTION AND PIPELINE — Current status, pilot conversations, partnership MOUs (ADC forest and agriculture MOUs in Cross River State), community reach through Abasi People Foundation

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, market size figure, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, government databases, or peer-reviewed research. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Return JSON with keys: market_html, advantage_html, traction_html (each containing plain HTML+CSS snippet, no <html> or <body> tags).`,
      response_json_schema: { type: 'object', properties: { market_html: { type: 'string' }, advantage_html: { type: 'string' }, traction_html: { type: 'string' } } },
    });

    setGeneratingPortfolio('Generating partnership section...');

    // ── CALL 3: Studio Model, Partnerships, Contact ────────────
    const section3 = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's portfolio page generator. Generate ONLY sections 7-9 for the VEU AI Studio portfolio page.

7. THE STUDIO MODEL — How VEU AI Studio builds, governs, and deploys products faster and better than any competitor using proprietary FlowAI infrastructure

8. PARTNERSHIP OPPORTUNITIES — Equity partnerships, GTM partnerships, pilot customers, strategic investors

9. CONTACT — Victor Udo direct contact, calendar link for investor conversations

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, industry claim, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — industry research, best practices, or peer-reviewed studies. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Return JSON with keys: model_html, partnerships_html, contact_html (each containing plain HTML+CSS snippet, no <html> or <body> tags).`,
      response_json_schema: { type: 'object', properties: { model_html: { type: 'string' }, partnerships_html: { type: 'string' }, contact_html: { type: 'string' } } },
    });

    setGeneratingPortfolio('Assembling portfolio page...');

    // ── CALL 4: Assemble complete HTML page ────────────
    const finalHtml = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's HTML assembler. Combine the following nine sections into a complete, single-file HTML+CSS portfolio page for VEU AI Studio.

SECTIONS TO ASSEMBLE:
- Hero: ${section1?.hero_html || ''}
- Thesis: ${section1?.thesis_html || ''}
- Products: ${section1?.products_html || ''}
- Market: ${section2?.market_html || ''}
- Advantage: ${section2?.advantage_html || ''}
- Traction: ${section2?.traction_html || ''}
- Model: ${section3?.model_html || ''}
- Partnerships: ${section3?.partnerships_html || ''}
- Contact: ${section3?.contact_html || ''}

REQUIREMENTS:
1. Create a complete single-file HTML document with <html>, <head>, <body> tags
2. Import Roboto and Open Sans from Google Fonts
3. Use VEU AI Studio brand colors: Primary #005EB8, Accent #F9A800
4. Dark professional theme with proper spacing and typography
5. Fully mobile responsive
6. Footer: "Built for VEU AI Studio by VEU AI Studio" with all five product names
7. Smooth animations and hover effects
8. Professional, investor-grade design worthy of Goldman Sachs, sovereign wealth funds, university presidents

Return JSON with single key "html" containing the complete single-file HTML+CSS document.`,
      response_json_schema: { type: 'object', properties: { html: { type: 'string' } } },
      model: 'claude_sonnet_4_6',
    });

    const htmlContent = finalHtml?.html || '';
    const existing = portfolio;
    let saved;
    if (existing) {
      await base44.entities.InvestorAsset.update(existing.id, { content: { html: htmlContent } });
      saved = { ...existing, content: { html: htmlContent } };
    } else {
      saved = await base44.entities.InvestorAsset.create({ product_name: 'VEU AI Studio', asset_type: 'portfolio_page', content: { html: htmlContent } });
    }
    setPortfolio(saved);
    setGeneratingPortfolio(false);
    setPortfolioPreview(true);
  };

  const addCustomProduct = () => {
    if (!customName.trim()) return;
    const custom = {
      name: customName.trim(),
      tagline: customTagline.trim() || `${customName.trim()} — AI-powered solution`,
      audience: customAudience.trim() || 'enterprise buyers',
      audience_short: customAudience.trim() || 'Buyers',
      demo_org: `${customName.trim()} Demo Client`,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/5',
      dot: 'bg-cyan-400',
    };
    setCustomProducts(prev => [...prev, custom]);
    setCustomName('');
    setCustomTagline('');
    setCustomAudience('');
    setShowAddCustom(false);
  };

  const removeCustomProduct = (name) => {
    setCustomProducts(prev => prev.filter(p => p.name !== name));
  };

  const allProducts = [...VEU_PRODUCTS, ...customProducts];
  const anyGenerating = Object.values(deckProgress).some(p => p.step < 3);

  const getSlides = (productName) => decks[productName]?.content?.slides || [];

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-primary" /> Investor Hub
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pitch decks and interactive portfolio — for investor and partner conversations
        </p>
      </motion.div>

      {/* Portfolio preview overlay */}
      <AnimatePresence>
        {portfolioPreview && portfolio?.content?.html && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex flex-col">
            <div className="flex items-center justify-between p-3 bg-card border-b border-border">
              <p className="text-sm font-bold text-foreground">VEU AI Studio Portfolio Page</p>
              <div className="flex gap-2">
                <CopyButton text={typeof portfolio.content.html === 'string' ? portfolio.content.html : JSON.stringify(portfolio.content.html)} label="Copy Portfolio HTML" />
                <Button size="sm" variant="outline" onClick={() => setPortfolioPreview(false)}>Close</Button>
              </div>
            </div>
            <iframe srcDoc={portfolio.content.html} className="flex-1 w-full bg-white" title="Portfolio Preview" sandbox="allow-scripts allow-same-origin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portfolio panel */}
      <div className="rounded-xl border border-primary/30 bg-card p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm font-bold text-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" /> VEU AI Studio Portfolio Page
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Full interactive investor portfolio — all five products, studio credentials, market opportunity
            </p>
            <p className="text-[10px] text-amber-400 mt-1">Uses Claude Sonnet — uses more integration credits</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {portfolio && (
              <>
                <Button size="sm" variant="outline" className="gap-1 text-xs h-8" onClick={() => setPortfolioPreview(true)}>
                  <Eye className="h-3 w-3" /> View Portfolio Page
                </Button>
                <CopyButton text={portfolio.content?.html || ''} label="Copy HTML" size="sm" />
              </>
            )}
            <Button size="sm" className="gap-1.5 text-xs h-8" onClick={generatePortfolio} disabled={!!generatingPortfolio}>
              {generatingPortfolio ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {generatingPortfolio || (portfolio ? 'Regenerate' : 'Generate Portfolio Page')}
            </Button>
          </div>
        </div>
        {portfolio && <p className="text-xs text-emerald-400 flex items-center gap-1"><Star className="h-3 w-3" /> Portfolio page generated and saved</p>}
        <AiDisclaimer />
      </div>

      {/* Pitch decks panel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <LayoutGrid className="h-3.5 w-3.5" /> Per-Product Pitch Decks
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Split into 3 sequential calls (4 slides each) to prevent timeouts</p>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => setShowAddCustom(v => !v)}>
            <Plus className="h-3.5 w-3.5" /> Add Custom Product
          </Button>
        </div>

        {/* Add custom product form */}
        <AnimatePresence>
          {showAddCustom && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden">
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
                <p className="text-xs font-bold text-cyan-400">Add Custom Product</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input value={customName} onChange={e => setCustomName(e.target.value)}
                    placeholder="Product name *" className="h-8 text-xs" />
                  <Input value={customTagline} onChange={e => setCustomTagline(e.target.value)}
                    placeholder="Tagline (optional)" className="h-8 text-xs" />
                  <Input value={customAudience} onChange={e => setCustomAudience(e.target.value)}
                    placeholder="Target audience (optional)" className="h-8 text-xs" />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1 text-xs h-7" onClick={addCustomProduct} disabled={!customName.trim()}>
                    <Plus className="h-3 w-3" /> Add Product
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowAddCustom(false)}>Cancel</Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {allProducts.map(product => {
          const deck = decks[product.name];
          const progress = deckProgress[product.name];
          const isGenerating = !!progress && progress.step < 3;
          const justDone = !!progress && progress.step === 3;
          const isExpanded = expandedDeck === product.name;
          const deckSlides = getSlides(product.name);
          const isCustom = !VEU_PRODUCTS.find(p => p.name === product.name);

          return (
            <motion.div key={product.name} layout className={`rounded-xl border bg-card overflow-hidden ${product.border}`}>
              <div className="p-4 flex items-center gap-4 flex-wrap">
                <div className={`h-3 w-3 rounded-full shrink-0 ${product.dot} ${isGenerating ? 'animate-pulse' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{product.name}</p>
                    {isCustom && <span className="text-[9px] px-1.5 py-0.5 rounded border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">Custom</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{product.tagline}</p>
                  {/* Progress label */}
                  {isGenerating && (
                    <div className="mt-1.5 space-y-1">
                      <p className="text-[10px] text-blue-400 font-semibold">{progress.label}</p>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < progress.step ? 'bg-primary' : i === progress.step ? 'bg-primary/40 animate-pulse' : 'bg-border'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {justDone && <p className="text-[10px] text-emerald-400 font-semibold mt-0.5">✓ Pitch deck complete</p>}
                  {!isGenerating && !justDone && deck && (
                    <p className="text-[10px] text-emerald-400 mt-0.5">{deckSlides.length} slides generated</p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap">
                  {isCustom && (
                    <button onClick={() => removeCustomProduct(product.name)}
                      className="text-muted-foreground hover:text-red-400 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => generateDeck(product)}
                    disabled={isGenerating || anyGenerating}>
                    {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                    {isGenerating ? 'Generating…' : deck ? 'Regenerate' : 'Generate Pitch Deck'}
                  </Button>
                  {deck && deckSlides.length > 0 && !isGenerating && (
                    <>
                      <CopyButton text={JSON.stringify(deck.content, null, 2)} label="Copy All" size="sm" />
                      <Button size="sm" variant="ghost" className="h-8" onClick={() => setExpandedDeck(isExpanded ? null : product.name)}>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && deck && deckSlides.length > 0 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border">
                    <div className="p-5 space-y-3 max-h-[600px] overflow-y-auto">
                      {deckSlides.map((slide, i) => (
                        <div key={i} className={`rounded-lg border p-4 space-y-2 ${product.border} ${product.bg}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                {slide.slide_number || i + 1}
                              </span>
                              <p className="text-sm font-bold text-foreground">{slide.title}</p>
                            </div>
                            <CopyButton
                              text={`${slide.title}\n\n${slide.key_message}\n\n${(slide.bullets || []).join('\n')}\n\nSpeaker Notes: ${slide.speaker_notes}`}
                              label="Copy" size="sm" />
                          </div>
                          {slide.key_message && <p className={`text-xs font-semibold ${product.color}`}>{slide.key_message}</p>}
                          {slide.bullets?.length > 0 && (
                            <ul className="space-y-0.5">
                              {slide.bullets.map((b, j) => (
                                <li key={j} className="text-[11px] text-foreground flex items-start gap-1.5">
                                  <span className="text-primary shrink-0 mt-0.5">•</span>{b}
                                </li>
                              ))}
                            </ul>
                          )}
                          {slide.speaker_notes && (
                            <div className="text-[10px] text-muted-foreground bg-secondary/30 rounded p-2 border border-border">
                              <span className="font-bold text-foreground">Speaker: </span>{slide.speaker_notes}
                            </div>
                          )}
                          {slide.visual_recommendation && (
                            <p className="text-[10px] text-primary/70 italic">Visual: {slide.visual_recommendation}</p>
                          )}
                        </div>
                      ))}
                      <AiDisclaimer />
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