import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Download, Copy, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

const PRODUCTS = [
  {
    name: 'SAIGE',
    url: 'https://saige.base44.app',
    audience: 'universities, utilities, government agencies',
    specific_exports: [
      'Export sustainability reports as PDF',
      'Export emissions data as Excel',
      'Export AASHE STARS data as structured CSV',
      'Export carbon footprint calculations as JSON',
    ],
  },
  {
    name: 'PressAI',
    url: 'https://pressai.base44.app',
    audience: 'authors, publishers, content creators',
    specific_exports: [
      'Export manuscripts as DOCX',
      'Export publishing pipeline status as PDF',
      'Export article drafts as Markdown',
      'Export editorial calendar as CSV',
    ],
  },
  {
    name: 'ReachSMS',
    url: 'https://reachsms.base44.app',
    audience: 'nonprofits, community organizations',
    specific_exports: [
      'Export message history as CSV',
      'Export community member list as Excel',
      'Export campaign analytics as PDF',
      'Export opt-out list as CSV for compliance',
    ],
  },
  {
    name: 'RelTwin',
    url: 'https://reltwin.com',
    audience: 'coaches, HR professionals',
    specific_exports: [
      'Export relationship maps as JSON',
      'Export coaching notes as PDF',
      'Export progress tracking data as Excel',
      'Export session history as CSV',
    ],
  },
  {
    name: 'MyPregLife',
    url: 'https://mypreglife.base44.app',
    audience: 'pregnant women in Nigeria and Africa',
    specific_exports: [
      'Export pregnancy tracking data as PDF health report',
      'Export appointment history as CSV',
      'Export symptom log as JSON',
      'Export health milestones as PDF for healthcare provider',
    ],
  },
];

const STANDARD_EXPORTS = [
  'Export all user data as JSON (GDPR compliance)',
  'Export all entity records as CSV',
  'Export audit reports as PDF',
  'Export activity logs as CSV',
];

export default function DataExport() {
  const [sprints, setSprints] = useState({});
  const [running, setRunning] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [copied, setCopied] = useState({});

  const generateSprint = async (product) => {
    setRunning(product.name);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate a complete Base44 sprint request that adds data export capabilities to "${product.name}".

Product details:
- Name: ${product.name}
- URL: ${product.url}
- Target audience: ${product.audience}

Standard exports to implement for ALL products:
${STANDARD_EXPORTS.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Product-specific exports for ${product.name}:
${product.specific_exports.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Sprint requirements — each instruction must be specific and unambiguous:

1. Create an "Export Center" page or modal accessible from the main navigation
2. For each export type, implement a button that:
   - Fetches the relevant data from Base44 entities
   - Formats it correctly (JSON.stringify for JSON, CSV with headers for CSV, structured content for PDF/DOCX)
   - Triggers a browser download with the correct filename and mime type
3. Add loading states during export generation
4. Add success/error feedback after download completes
5. For PDF exports: use the existing jsPDF library (already installed) to generate structured documents
6. For CSV exports: build CSV strings with proper header rows and comma-separated values
7. For JSON exports: use JSON.stringify with 2-space indentation
8. For DOCX: generate as plain text with .txt extension or use available markdown export

DATA PORTABILITY PRINCIPLE: Every piece of user data must be exportable. No data locked in Base44.

GUARDRAIL: Do not modify any existing functionality, pages, entities, or business logic. Only add the new export features.

Format as a numbered, copy-pasteable Base44 sprint request with exact file names and implementation steps.`,
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
          <Download className="h-7 w-7 text-primary" /> Data Export Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate data portability sprints for all VEU AI Studio products — no data ever locked in Base44.
        </p>
      </motion.div>

      {/* Standard exports reference */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <p className="text-xs font-bold text-foreground">Standard Exports — Applied to All Products</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {STANDARD_EXPORTS.map((e, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {e}
            </div>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="space-y-3">
        {PRODUCTS.map(product => {
          const sprint = sprints[product.name];
          const isExpanded = expanded === product.name;

          return (
            <motion.div key={product.name} layout
              className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Target: {product.audience}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {product.specific_exports.map((e, i) => (
                      <span key={i} className="text-[9px] px-2 py-0.5 rounded-full border border-border bg-secondary/30 text-muted-foreground">{e}</span>
                    ))}
                  </div>
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
                    {running === product.name ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    {sprint ? 'Regenerate' : 'Generate Sprint'}
                  </Button>
                </div>
              </div>

              {isExpanded && sprint && (
                <div className="border-t border-border p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">Data Export Sprint — {product.name}</p>
                    <button onClick={() => copyText(product.name, sprint)}
                      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
                      {copied[product.name] ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy Sprint</>}
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-y-auto text-foreground">{sprint}</pre>
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> AI-generated sprint — review before implementing. GUARDRAIL: additive only, no existing functionality modified.
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