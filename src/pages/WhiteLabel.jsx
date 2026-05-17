import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Tag, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const PRODUCTS = [
  {
    name: 'SAIGE',
    url: 'https://saige.base44.app',
    audience: 'universities, utilities, and government agencies',
    purpose: 'AI-powered sustainability intelligence platform',
    primaryColor: '#22c55e',
  },
  {
    name: 'PressAI',
    url: 'https://pressai.base44.app',
    audience: 'authors, publishers, and content creators',
    purpose: 'AI-powered publishing and content pipeline platform',
    primaryColor: '#3b82f6',
  },
  {
    name: 'ReachSMS',
    url: 'https://reachsms.base44.app',
    audience: 'nonprofits and community organizations',
    purpose: 'SMS-powered community engagement platform',
    primaryColor: '#f59e0b',
  },
  {
    name: 'RelTwin',
    url: 'https://reltwin.com',
    audience: 'coaches and HR professionals',
    purpose: 'Relationship intelligence and coaching platform',
    primaryColor: '#8b5cf6',
  },
  {
    name: 'MyPregLife',
    url: 'https://mypreglife.base44.app',
    audience: 'pregnant women in Nigeria and Africa',
    purpose: 'Personalized maternal health tracking application',
    primaryColor: '#ec4899',
  },
];

export default function WhiteLabel() {
  const [sprints, setSprints] = useState({});
  const [running, setRunning] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState({});
  const [brandSystem, setBrandSystem] = useState(null);

  useEffect(() => {
    base44.entities.BrandSystem.list('-created_date', 1)
      .then(data => { if (data[0]) setBrandSystem(data[0]); })
      .catch(() => {});
  }, []);

  const generateSprint = async (product) => {
    setRunning(product.name);
    const variant = brandSystem?.product_variants?.[product.name] || {};
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete Base44 sprint request that white-labels "${product.name}" as a professional, independent platform.

Product details:
- Name: ${product.name}
- URL: ${product.url}
- Purpose: ${product.purpose}
- Target audience: ${product.audience}
- Product tagline: ${variant.tagline || `The smart ${product.name} platform`}
- Value proposition: ${variant.value_proposition || ''}

VEU AI Studio Brand System:
- Primary color: ${brandSystem?.primary_color || '#3b82f6'}
- Product accent color: ${variant.accent_color || product.primaryColor}
- Heading font: ${brandSystem?.heading_font || 'Inter'}
- Body font: ${brandSystem?.body_font || 'Inter'}
- CSS variables: ${brandSystem?.css_variables?.substring(0, 300) || 'Use standard professional dark theme'}

Sprint requirements — each instruction must be specific and unambiguous:

1. REMOVE BASE44 BRANDING
   - Remove or replace any visible "Base44" text, logos, or references in the UI
   - Update browser tab title to "${product.name} | ${product.purpose.split(' ').slice(0, 4).join(' ')}"

2. APPLY BRAND SYSTEM
   - Update index.css with VEU AI Studio CSS variables and product accent color
   - Add Google Fonts import for ${brandSystem?.heading_font || 'Inter'} and ${brandSystem?.body_font || 'Inter'}

3. PROFESSIONAL FOOTER — add to all pages:
   - Copyright © ${new Date().getFullYear()} ${product.name}. All rights reserved.
   - Links: Privacy Policy | Terms of Service | Contact: support@${product.name.toLowerCase()}.com
   - Subtle attribution: "Powered by VEU AI Studio"

4. SEO META TAGS — update index.html:
   - <title>${product.name} — ${variant.tagline || product.purpose}</title>
   - <meta name="description" content="${variant.value_proposition || product.purpose + ' for ' + product.audience}">
   - <meta property="og:title" content="${product.name}">
   - <meta property="og:description" content="${variant.value_proposition || product.purpose}">
   - <meta property="og:image" content="[placeholder — replace with actual OG image URL]">

5. FAVICON instruction — add <link rel="icon"> pointing to a favicon file

6. PROFESSIONAL COPY — replace any generic placeholder text with product-specific content

GUARDRAIL: Do not modify any existing functionality, data fetching, entity operations, backend functions, or business logic. Visual and metadata changes only.

Format as a numbered, copy-pasteable Base44 sprint request with clear instructions per file to edit.`,
    });
    setSprints(prev => ({ ...prev, [product.name]: result }));
    setExpanded(product.name);
    setRunning(null);
  };

  const copyText = (name, text) => {
    navigator.clipboard.writeText(text);
    setCopied(prev => ({ ...prev, [name]: true }));
    setTimeout(() => setCopied(prev => ({ ...prev, [name]: false })), 2000);
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Tag className="h-7 w-7 text-primary" /> White-Label Generator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate complete white-labeling sprint requests — remove Base44 branding, apply VEU AI Studio identity, add professional metadata.
        </p>
      </motion.div>

      {!brandSystem && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-300">
            No brand system found. Generate a brand system first in the <strong>Brand System</strong> page for best results. You can still generate white-label sprints without it.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {PRODUCTS.map(product => {
          const sprint = sprints[product.name];
          const isExpanded = expanded === product.name;

          return (
            <motion.div key={product.name} layout
              className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="h-10 w-10 rounded-lg border border-border shrink-0 flex items-center justify-center font-bold text-xs"
                  style={{ backgroundColor: product.primaryColor + '20', color: product.primaryColor, borderColor: product.primaryColor + '40' }}>
                  {product.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{product.purpose}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Target: {product.audience}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {sprint && (
                    <button onClick={() => setExpanded(isExpanded ? null : product.name)}
                      className="h-8 px-2 rounded border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-all">
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <Button size="sm" className="gap-1.5 text-xs h-8"
                    disabled={running === product.name}
                    onClick={() => generateSprint(product)}>
                    {running === product.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Tag className="h-3.5 w-3.5" />}
                    {sprint ? 'Regenerate' : `Generate Sprint`}
                  </Button>
                </div>
              </div>

              {isExpanded && sprint && (
                <div className="border-t border-border p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">White-Label Sprint — {product.name}</p>
                    <button onClick={() => copyText(product.name, sprint)}
                      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
                      {copied[product.name] ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Sprint</>}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-y-auto text-foreground">{sprint}</pre>
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> AI-generated sprint — review carefully before implementing. GUARDRAIL: preserves all existing functionality.
                  </p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}