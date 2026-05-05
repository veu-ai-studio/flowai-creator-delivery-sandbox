import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import products from '@/data/demo/products.json';

const MODES = [
  { value: 'describe', label: 'Describe & Build', desc: 'Describe a product in plain English' },
  { value: 'clone',    label: 'Clone & Improve',  desc: 'Clone an existing URL and improve it' },
  { value: 'synthesize', label: 'Synthesize',     desc: 'Combine 2-5 inputs into one product' },
];

const PLANS = {
  describe: (p) => `ORCHESTRATOR PLAN — Describe & Build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Product: ${p.name}
Mode: Describe & Build

PHASE 1 — Research (est. ~15s)
  Analyze product description for ICP, value prop, competitive positioning.
  Extract: audience signals, pain points, differentiators.

PHASE 2 — Design (est. ~20s)
  Evaluate visual design quality, UX clarity, mobile responsiveness.
  Score: 0-25. Identify top 3 design gaps.

PHASE 3 — Build Audit (est. ~25s)
  Check route coverage, navigation, form functionality.
  Interactive test simulation: 12 user flows.

PHASE 4 — Quality Audit (est. ~30s)
  Score across 4 dimensions: Content, Technical, UX, Compliance.
  Total: /100. Security posture check.

PHASE 5 — Deploy (est. ~20s)
  HTTPS verification, domain config, SEO readiness.

PHASE 6 — Self-Renewal (est. ~25s)
  Self-test → self-heal → optimize → upgrade candidates.
  Human gates: 2 required.

PHASE 7 — Go To Market (est. ~20s)
  Demo readiness score: /50. Top GTM risks. Prospect objection map.

PHASE 8 — Final Report (est. ~15s)
  Clearance decision: CLEARED / CONDITIONAL / NOT CLEARED.

TOTAL ESTIMATED TIME: 8-10 minutes (Standard depth)
CONFIDENCE THRESHOLD: 80%`,

  clone: (p) => `ORCHESTRATOR PLAN — Clone & Improve
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Source URL: ${p.live_url}
Mode: Clone & Improve

STEP 1 — Playwright Crawl
  Full browser crawl of ${p.live_url}
  Capture: 8 pages, 47 links, 3 forms, 0 broken links detected.

STEP 2 — Content Extraction
  Title: "${p.name} — ${p.description.split('.')[0]}"
  Key features: 6 detected. CTAs: 3 detected.

STEP 3 — Gap Analysis
  Missing: pricing page, case studies, social proof section.
  Weak: mobile responsiveness (score: 6/10), CTA clarity (7/10).

STEP 4 — Improvement Plan
  Priority 1: Add visible pricing tier table.
  Priority 2: Hero CTA A/B variant (benefit-led vs. feature-led).
  Priority 3: Testimonial section with 3 proof points.

STEP 5 — Synthesized Specification
  Full product brief generated. 1,847 words.
  Ready to hand to developer or deploy to staging.

TOTAL ESTIMATED TIME: 8-10 minutes (Standard depth)`,

  synthesize: (p) => `ORCHESTRATOR PLAN — Synthesize & Build
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Input A: ${p.live_url} (weight: 60%)
Input B: Competitor URL (weight: 40%)
Mode: Synthesize — Best-of-breed combination

PHASE 1 — Parallel Crawl
  Crawling both inputs simultaneously.
  Input A: ${p.live_url} — 8 pages, 47 links.
  Input B: Competitor — 6 pages, 31 links.

PHASE 2 — Head-to-Head Analysis
  Research: Input A leads (8.4 vs 6.1)
  Design: Input B leads (7.2 vs 6.8)
  Build quality: Input A leads (9.1 vs 7.4)

PHASE 3 — Best-of-Breed Selection
  From Input A: Product positioning, feature set, technical quality.
  From Input B: Visual design system, onboarding flow, pricing clarity.

PHASE 4 — Unified Specification
  Synthesized product brief: 2,341 words.
  Feature attribution map included.
  Ready for development or handoff.

TOTAL ESTIMATED TIME: 12-15 minutes (2 inputs, Standard depth)`,
};

export default function OrchestratorDemo() {
  const [mode, setMode] = useState('describe');
  const [productIdx, setProductIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [plan, setPlan] = useState(null);

  const run = () => {
    setRunning(true);
    setPlan(null);
    setTimeout(() => {
      setPlan(PLANS[mode](products[productIdx]));
      setRunning(false);
    }, 1400);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 w-full max-w-lg mx-auto">
      <p className="text-sm font-bold text-foreground">Try the Orchestrator</p>

      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map(m => (
          <button key={m.value} onClick={() => { setMode(m.value); setPlan(null); }}
            className={`rounded-lg border p-2 text-left transition-all ${mode === m.value ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/30'}`}>
            <p className="text-[10px] font-bold text-foreground">{m.label}</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">{m.desc}</p>
          </button>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <select value={productIdx} onChange={e => { setProductIdx(Number(e.target.value)); setPlan(null); }}
          className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
          {products.map((p, i) => <option key={p.id} value={i}>{p.name} — {p.description.slice(0, 40)}…</option>)}
        </select>
        <Button size="sm" onClick={run} disabled={running} className="gap-1.5 text-xs shrink-0">
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {running ? 'Planning…' : 'Generate Plan'}
        </Button>
      </div>

      <AnimatePresence>
        {plan && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <pre className="text-[10px] font-mono text-foreground bg-secondary/30 rounded-lg border border-border p-3 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed whitespace-pre-wrap">
              {plan}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}