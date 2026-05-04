import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { VEU_PRODUCTS } from '@/lib/veuProducts';
import { Button } from '@/components/ui/button';
import CopyButton from '@/components/gtm/CopyButton';
import AiDisclaimer from '@/components/gtm/AiDisclaimer';
import { Megaphone, Loader2, ChevronDown, ChevronUp, Play } from 'lucide-react';

const ASSET_TYPES = [
  {
    key: 'email_sequence',
    label: 'Outreach Email Sequence',
    icon: '✉️',
    desc: '3 cold outreach emails (awareness → value → pilot offer)',
    prompt: (p) => `Write a three-email cold outreach sequence for ${p.name} (${p.tagline}) targeting ${p.audience_short} at organizations similar to ${p.demo_org}.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, or government databases. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Email 1 — Awareness (subject line + body, max 150 words): Focus on the specific pain point ${p.audience_short} face. No product pitch yet. End with a soft curiosity hook.

Email 2 — Value Demonstration (subject line + body, max 150 words): Reference Email 1. Share one specific, compelling result or use case using ${p.demo_org} as an example. Demonstrate ${p.name}'s unique AI-powered value.

Email 3 — Pilot Offer (subject line + body, max 150 words): Direct pilot invitation. Specific offer: 90-day pilot, no cost, implementation support included. Clear single CTA.

Tone: Victor Udo's voice — credible, data-driven, mission-oriented (FNSE, PhD, 35+ years sector experience). Not salesy.

Return as JSON with key "emails" containing array of 3 objects each with: email_number, subject, body, cta.`,
  },
  {
    key: 'linkedin_posts',
    label: 'LinkedIn Post Series',
    icon: '💼',
    desc: '3 LinkedIn posts optimized for Victor Udo\'s voice',
    prompt: (p) => `Write three LinkedIn posts announcing ${p.name}'s pilot availability. Written in Victor Udo's voice: FNSE, PhD, 35+ years experience, former Bucknell University Director of Sustainability, thought leader in AI and sustainability/development.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, or government databases. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Post 1 — Problem Statement: Open with a compelling statistic or observation about the challenge ${p.audience_short} face. Position ${p.name}'s market opportunity without pitching the product directly. Personal tone, thought leadership. Max 200 words.

Post 2 — Solution Demonstration: Introduce ${p.name} concretely. Share what ${p.demo_org} (fictional demo client) achieved. Use specific data points from the demo scenario. Include one compelling insight that only someone with deep domain expertise would know. Max 200 words.

Post 3 — Pilot Invitation: Direct announcement of pilot availability. Who it's for, what they get, how to apply. Professional CTA. Max 150 words. Include relevant hashtags.

Return JSON with key "posts" containing array of 3 objects each with: post_number, hook, body, cta, hashtags.`,
  },
  {
    key: 'executive_summary',
    label: 'One-Page Executive Summary',
    icon: '📄',
    desc: 'C-suite leave-behind document for post-meeting follow-up',
    prompt: (p) => `Write a one-page executive summary for ${p.name} designed to be left behind after a meeting with a ${p.audience_short} at a major organization like a university president, utility VP, or nonprofit CEO.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, or government databases. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Structure:
1. HEADLINE — Product name and one-sentence value proposition
2. THE PROBLEM — One paragraph: specific pain points ${p.audience_short} face, with 2-3 data points
3. THE SOLUTION — One paragraph: how ${p.name}'s AI capabilities address the problem specifically
4. PROOF POINTS — Three bullet points: key capability or metric that demonstrates value
5. PRICING — "Pilot pricing available: [realistic price range]. Full deployment: contact us."
6. NEXT STEP — One clear action: "Schedule a 30-minute demo: [contact info]"
7. CREDENTIALS — "Developed by VEU AI Studio. Victor Udo FNSE PhD, 35+ years domain experience."

Tone: Professional, credible, concise. No fluff. Every sentence earns its place.
Format: Structured text formatted for PDF layout. Use section headers and clean bullet points.

Return JSON with key "content" containing the formatted text.`,
  },
  {
    key: 'pilot_proposal',
    label: 'Pilot Proposal Template',
    icon: '📋',
    desc: 'Professional pilot agreement — ready for C-suite without modification',
    prompt: (p) => `Write a complete, professional pilot proposal template for ${p.name} that can be sent to a ${p.audience_short} (e.g., university president, nonprofit director, hospital administrator) without modification.

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, or data point you include, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — EPA, AASHE, WHO, McKinsey, Gartner, IDC, Nielsen, industry associations, or government databases. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Structure:
1. COVER — Pilot Proposal: ${p.name} for [Organization Name]. Prepared by: Victor Udo FNSE PhD, VEU AI Studio. Date: [Date].

2. EXECUTIVE SUMMARY — 2 sentences: what this pilot will achieve and why it matters to the organization.

3. PILOT OBJECTIVES — Three specific, measurable objectives for the 90-day pilot period.

4. SCOPE OF WORK — What VEU AI Studio will provide: platform access, onboarding, support, data setup.

5. SUCCESS METRICS — Five specific KPIs with baseline and target values. Based on ${p.demo_org} benchmarks.

6. TIMELINE — 90-day pilot schedule: Week 1-2 (onboarding), Week 3-8 (active use), Week 9-12 (evaluation).

7. INVESTMENT — Pilot pricing structure. Make it specific: [Realistic price for 90-day pilot]. Full platform pricing post-pilot.

8. MUTUAL COMMITMENTS — What VEU AI Studio commits. What the organization commits (access, participation, feedback).

9. NEXT STEPS — Three numbered actions to begin the pilot within 2 weeks.

10. SIGNATURES — Signature blocks for both parties.

Professional legal-adjacent tone. Clean, structured. Specific enough to be credible but with [brackets] for customization.

Return JSON with key "content" containing the formatted proposal text.`,
  },
];

// Normalize LLM-returned hashtags to always be an array of strings
function toHashtagArray(hashtags) {
  if (!hashtags) return [];
  if (Array.isArray(hashtags)) return hashtags;
  if (typeof hashtags === 'string') return hashtags.split(/\s+/).filter(Boolean);
  if (typeof hashtags === 'object') return Object.values(hashtags).map(String);
  return [];
}

export default function GTMAssets() {
  const [assets, setAssets] = useState({});         // `${product_name}::${asset_type}` → record
  const [generating, setGenerating] = useState({}); // same key → boolean
  const [expanded, setExpanded] = useState({});     // same key → boolean
  const [activeProduct, setActiveProduct] = useState(VEU_PRODUCTS[0].name);

  useEffect(() => {
    base44.entities.GTMAsset.list('-created_date').then(records => {
      const map = {};
      records.forEach(r => { map[`${r.product_name}::${r.asset_type}`] = r; });
      setAssets(map);
    });
  }, []);

  const generate = async (product, assetType) => {
    const key = `${product.name}::${assetType.key}`;
    setGenerating(prev => ({ ...prev, [key]: true }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: assetType.prompt(product),
      response_json_schema: { type: 'object', additionalProperties: true },
    });

    const contentStr = JSON.stringify(result, null, 2);
    const existing = assets[key];
    let saved;
    if (existing) {
      await base44.entities.GTMAsset.update(existing.id, { content: contentStr });
      saved = { ...existing, content: contentStr };
    } else {
      saved = await base44.entities.GTMAsset.create({ product_name: product.name, asset_type: assetType.key, content: contentStr });
    }

    setAssets(prev => ({ ...prev, [key]: saved }));
    setGenerating(prev => ({ ...prev, [key]: false }));
    setExpanded(prev => ({ ...prev, [key]: true }));
  };

  const generateAll = async (product) => {
    for (const assetType of ASSET_TYPES) {
      await generate(product, assetType);
    }
  };

  const activeProductObj = VEU_PRODUCTS.find(p => p.name === activeProduct);

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Megaphone className="h-7 w-7 text-primary" /> GTM Assets
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Marketing copy, outreach sequences, and launch materials for each product
        </p>
      </motion.div>

      {/* Product selector tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {VEU_PRODUCTS.map(p => (
          <button key={p.name} onClick={() => setActiveProduct(p.name)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${activeProduct === p.name ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            <span className={`h-2 w-2 rounded-full ${p.dot}`} />
            {p.name}
          </button>
        ))}
      </div>

      {activeProductObj && (
        <motion.div key={activeProduct} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Product header */}
          <div className={`rounded-xl border p-4 ${activeProductObj.border} ${activeProductObj.bg}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{activeProductObj.name}</p>
                <p className="text-xs text-muted-foreground">{activeProductObj.tagline}</p>
                <p className="text-[10px] text-muted-foreground">Buyer persona: <span className={`font-semibold ${activeProductObj.color}`}>{activeProductObj.audience_short}</span> · Demo org: {activeProductObj.demo_org}</p>
              </div>
              <Button size="sm" className="gap-1.5 text-xs"
                onClick={() => generateAll(activeProductObj)}
                disabled={Object.values(generating).some(Boolean)}>
                {Object.values(generating).some(Boolean) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                Generate All Assets
              </Button>
            </div>
          </div>

          {/* Asset cards */}
          {ASSET_TYPES.map(assetType => {
            const key = `${activeProductObj.name}::${assetType.key}`;
            const asset = assets[key];
            const isGenerating = generating[key];
            const isExpanded = expanded[key];

            // Parse content for display
            const parsed = (() => { try { return JSON.parse(asset?.content || '{}'); } catch { return {}; } })();
            const displayItems = parsed.emails || parsed.posts || (parsed.content ? [{ body: parsed.content }] : []);

            return (
              <motion.div key={assetType.key} layout className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 flex items-center gap-3 flex-wrap">
                  <span className="text-lg shrink-0">{assetType.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{assetType.label}</p>
                    <p className="text-[10px] text-muted-foreground">{assetType.desc}</p>
                    {asset && <p className="text-[10px] text-emerald-400 mt-0.5">Generated ✓</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" className="gap-1 text-xs h-8" onClick={() => generate(activeProductObj, assetType)}
                      disabled={isGenerating || Object.values(generating).some(Boolean)}>
                      {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      {isGenerating ? 'Generating…' : asset ? 'Regenerate' : 'Generate'}
                    </Button>
                    {asset && (
                      <>
                        <CopyButton text={asset.content} label="Copy" size="sm" />
                        <Button size="sm" variant="ghost" className="h-8"
                          onClick={() => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))}>
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && asset && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border">
                      <div className="p-5 space-y-4">
                        {/* Email sequence */}
                        {assetType.key === 'email_sequence' && parsed.emails?.map((email, i) => (
                          <div key={i} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-foreground">Email {email.email_number || i + 1}</p>
                              <CopyButton text={`Subject: ${email.subject}\n\n${email.body}`} label="Copy" size="sm" />
                            </div>
                            <p className="text-[10px] text-primary font-semibold">Subject: {email.subject}</p>
                            <p className="text-xs text-foreground whitespace-pre-wrap">{email.body}</p>
                            {email.cta && <p className="text-[10px] text-emerald-400">CTA: {email.cta}</p>}
                          </div>
                        ))}

                        {/* LinkedIn posts */}
                        {assetType.key === 'linkedin_posts' && parsed.posts?.map((post, i) => (
                          <div key={i} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-foreground">Post {post.post_number || i + 1}</p>
                              <CopyButton text={`${post.hook}\n\n${post.body}\n\n${post.cta}\n\n${toHashtagArray(post.hashtags).join(' ')}`} label="Copy" size="sm" />
                            </div>
                            {post.hook && <p className="text-xs font-semibold text-foreground">{post.hook}</p>}
                            <p className="text-xs text-foreground whitespace-pre-wrap">{post.body}</p>
                            {post.cta && <p className="text-[10px] text-primary">{post.cta}</p>}
                            {toHashtagArray(post.hashtags).length > 0 && <p className="text-[10px] text-muted-foreground">{toHashtagArray(post.hashtags).join(' ')}</p>}
                          </div>
                        ))}

                        {/* Executive summary or pilot proposal */}
                        {(assetType.key === 'executive_summary' || assetType.key === 'pilot_proposal') && parsed.content && (
                          <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-foreground">{assetType.label}</p>
                              <CopyButton text={parsed.content} label="Copy" size="sm" />
                            </div>
                            <p className="text-xs text-foreground whitespace-pre-wrap">{parsed.content}</p>
                          </div>
                        )}

                        {/* Fallback: raw JSON */}
                        {displayItems.length === 0 && (
                          <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-3 max-h-64 overflow-y-auto whitespace-pre-wrap text-foreground">
                            {asset.content}
                          </pre>
                        )}

                        <AiDisclaimer />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}