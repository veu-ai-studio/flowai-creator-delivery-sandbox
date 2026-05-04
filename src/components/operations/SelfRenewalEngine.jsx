import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  RefreshCw, CheckCircle2, AlertCircle, Loader2, Clipboard,
  SkipForward, ChevronDown, ChevronUp, Zap, FileText, Settings,
  Shield, Activity, BookOpen, BarChart3, Lock
} from 'lucide-react';

// ─── DIMENSION CONFIG ─────────────────────────────────────────────────────────
const DIMENSIONS = [
  { key: 'functionality', label: 'Functionality',  icon: Activity,   desc: 'Routes, navigation, interactions' },
  { key: 'content',       label: 'Content',        icon: FileText,   desc: 'Completeness, accuracy, substance' },
  { key: 'compliance',    label: 'Compliance',     icon: Shield,     desc: 'Legal pages, disclaimers, IP notices' },
  { key: 'performance',   label: 'Performance',    icon: BarChart3,  desc: 'Load time, responsiveness' },
  { key: 'brand',         label: 'Brand',          icon: BookOpen,   desc: 'Messaging consistency, professionalism' },
];

const FIX_FORMAT_LABELS = {
  sprint:      { label: 'Base44 Sprint', color: 'text-primary',      border: 'border-primary/30',      bg: 'bg-primary/5',      icon: Zap },
  base44_sprint:{ label: 'Base44 Sprint', color: 'text-primary',     border: 'border-primary/30',      bg: 'bg-primary/5',      icon: Zap },
  content:     { label: 'Content Fix',   color: 'text-amber-400',    border: 'border-amber-500/30',    bg: 'bg-amber-500/5',    icon: FileText },
  content_fix: { label: 'Content Fix',   color: 'text-amber-400',    border: 'border-amber-500/30',    bg: 'bg-amber-500/5',    icon: FileText },
  config:      { label: 'Config Fix',    color: 'text-emerald-400',  border: 'border-emerald-500/30',  bg: 'bg-emerald-500/5',  icon: Settings },
  config_fix:  { label: 'Config Fix',    color: 'text-emerald-400',  border: 'border-emerald-500/30',  bg: 'bg-emerald-500/5',  icon: Settings },
};

// Safely parse JSON from LLM — strips markdown fences, graceful fallback
function safeParseLLM(raw, fallback = {}) {
  if (typeof raw === 'object' && raw !== null) return raw;
  try {
    // Strip markdown code fences
    const cleaned = String(raw)
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

// ─── SCORE BAR ────────────────────────────────────────────────────────────────
function ScoreBar({ score }) {
  const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${score * 10}%` }} />
      </div>
      <span className={`text-sm font-bold w-6 text-right ${textColor}`}>{score}</span>
    </div>
  );
}

// ─── FIX CARD ────────────────────────────────────────────────────────────────
function FixCard({ fix, onApply, onSkip, applied, skipped }) {
  const [expanded, setExpanded] = useState(false); // collapsed by default on mobile
  const formatKey = fix.fix_type || fix.format || 'sprint';
  const fmt = FIX_FORMAT_LABELS[formatKey] || FIX_FORMAT_LABELS.sprint;
  const FmtIcon = fmt.icon;

  // Build the display instruction — prefer structured fields, fall back to instruction string
  const structuredInstruction = fix.title ? `Sprint Title: ${fix.title}
File: ${fix.file || 'N/A'}
Location: ${fix.location || 'N/A'}
Current code: ${fix.current_code || 'N/A'}
Replace with: ${fix.corrected_code || 'N/A'}
Why: ${fix.why || 'N/A'}
Test: ${fix.verification_instruction || fix.test || 'N/A'}` : null;

  const displayInstruction = structuredInstruction || fix.instruction || '';

  return (
    <div className={`rounded-xl border ${fmt.border} ${fmt.bg} overflow-hidden transition-all ${skipped ? 'opacity-40' : ''}`}>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FmtIcon className={`h-3.5 w-3.5 ${fmt.color} shrink-0`} />
            <span className={`text-[10px] font-bold uppercase tracking-wide ${fmt.color}`}>{fmt.label}</span>
            <span className="text-xs font-bold text-foreground">{fix.dimension}</span>
            {fix.isOptimization && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">OPTIMIZE</span>}
            {fix.title && <span className="text-[10px] text-muted-foreground italic truncate max-w-[180px]">{fix.title}</span>}
          </div>
          <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">{fix.issue}</p>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="mt-2 space-y-3">
                {/* Structured sprint fields if present */}
                {fix.file && (
                  <div className="rounded-lg bg-secondary/30 border border-border px-3 py-2 space-y-1 text-[11px]">
                    {fix.file && <div><span className="text-muted-foreground">File:</span> <span className="text-primary font-mono">{fix.file}</span></div>}
                    {fix.location && <div><span className="text-muted-foreground">Location:</span> <span className="text-foreground">{fix.location}</span></div>}
                    {fix.why && <div><span className="text-muted-foreground">Why:</span> <span className="text-foreground">{fix.why}</span></div>}
                    {(fix.verification_instruction || fix.test) && (
                      <div><span className="text-amber-400 font-semibold">Verify:</span> <span className="text-foreground">{fix.verification_instruction || fix.test}</span></div>
                    )}
                  </div>
                )}

                {(fix.current_code || fix.corrected_code) && (
                  <div className="space-y-1">
                    {fix.current_code && (
                      <div className="rounded bg-red-500/10 border border-red-500/20 p-2">
                        <p className="text-[10px] text-red-400 font-bold mb-1">Current code:</p>
                        <pre className="text-[10px] text-foreground whitespace-pre-wrap font-mono overflow-x-auto">{fix.current_code}</pre>
                      </div>
                    )}
                    {fix.corrected_code && (
                      <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-2">
                        <p className="text-[10px] text-emerald-400 font-bold mb-1">Replace with:</p>
                        <pre className="text-[10px] text-foreground whitespace-pre-wrap font-mono overflow-x-auto">{fix.corrected_code}</pre>
                      </div>
                    )}
                  </div>
                )}

                {!fix.file && (
                  <div className="rounded-lg bg-background border border-border p-3">
                    <pre className="text-[11px] text-foreground whitespace-pre-wrap leading-relaxed font-mono overflow-x-auto max-h-48 overflow-y-auto">
                      {displayInstruction}
                    </pre>
                  </div>
                )}

                {!applied && !skipped && (
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="gap-1.5 h-10 text-xs flex-1 sm:flex-none" onClick={() => onApply(fix)}>
                      <Clipboard className="h-3 w-3" /> Apply Fix
                    </Button>
                    <Button size="sm" variant="ghost" className="h-10 text-xs text-muted-foreground gap-1.5 flex-1 sm:flex-none" onClick={() => onSkip(fix.id)}>
                      <SkipForward className="h-3 w-3" /> Skip
                    </Button>
                  </div>
                )}

                {applied && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {formatKey === 'sprint' || formatKey === 'base44_sprint'
                      ? 'Sprint instruction copied — paste into your product\'s Base44 project to apply this fix.'
                      : formatKey === 'content' || formatKey === 'content_fix'
                      ? 'Content copied to clipboard — paste where needed.'
                      : 'Configuration instruction copied to clipboard.'}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── AUTHENTICATED CONTENT PROMPT ────────────────────────────────────────────
function AuthWallPrompt({ onSubmitExtra }) {
  const [extraContent, setExtraContent] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!extraContent.trim()) return;
    onSubmitExtra(extraContent.trim());
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
        <CheckCircle2 className="h-3.5 w-3.5" /> Content received — running Phases 2 and 3 on combined input…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-amber-400" />
        <p className="text-sm font-bold text-amber-400">Authenticated Interior Detected</p>
      </div>
      <p className="text-xs text-muted-foreground">
        FlowAI can see the public layer of this product. To heal the authenticated interior, share screenshots or paste content from inside the platform.
      </p>
      <textarea
        value={extraContent}
        onChange={e => setExtraContent(e.target.value)}
        placeholder="Paste content, feature descriptions, or notes from inside the authenticated product…"
        className="w-full h-24 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <Button size="sm" onClick={submit} disabled={!extraContent.trim()} className="gap-1.5 text-xs h-10 w-full sm:w-auto">
        <RefreshCw className="h-3 w-3" /> Submit Interior Content
      </Button>
    </div>
  );
}

// ─── MAIN SELF-RENEWAL ENGINE ─────────────────────────────────────────────────
export default function SelfRenewalEngine({ input, pageContext, objective, onComplete }) {
  const [phase, setPhase] = useState('idle');
  const [scores, setScores] = useState(null);
  const [previousScores, setPreviousScores] = useState(null);
  const [fixes, setFixes] = useState([]);
  const [optimizations, setOptimizations] = useState([]);
  const [appliedIds, setAppliedIds] = useState(new Set());
  const [skippedIds, setSkippedIds] = useState(new Set());
  const [error, setError] = useState(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('');
  const [isRerun, setIsRerun] = useState(false);

  const productName = input?.name || input?.value?.slice(0, 40) || 'this product';
  const productUrl = input?.type === 'url' ? input.value : '';

  // ── PHASE 1: Self-Test ──────────────────────────────────────────────────────
  const runPhase1 = async (supplemental = null) => {
    setError(null);
    setPhase('scoring');
    setPhaseLabel('Phase 1 — Self-Test: Scoring five dimensions…');

    const isAuthWall = pageContext?.authWall;

    const inputDesc = input.type === 'url'
      ? `URL: ${input.value}\n\n${pageContext?.content ? `Page content:\n${pageContext.content}` : isAuthWall ? '(Authenticated wall — only public signals available)' : '(No page content fetched)'}`
      : `Product description:\n${input.value}`;

    const supplementalBlock = supplemental
      ? `\n\nUSER-PROVIDED INTERIOR CONTENT:\n${supplemental}`
      : '';

    const objectiveBlock = objective ? `\nSession objective: ${objective}` : '';

    // Phase 1 prompt — strict JSON schema, no prose
    const prompt = `You are FlowAI's Self-Renewal engine running Phase 1 — Self-Test for product: ${productName}.

Evaluate the following product across exactly five dimensions. Score each dimension from 0 to 10.

PRODUCT INPUT:
${inputDesc}${supplementalBlock}${objectiveBlock}

Score each dimension strictly based on evidence in the content above. Do not inflate scores.

DIMENSIONS TO SCORE:
1. Functionality (0-10): Do all routes load? Are key interactions present and working? Are there broken links or missing pages?
2. Content (0-10): Is the content complete, accurate, and substantive? Is there thin copy, placeholder text, or missing descriptions?
3. Compliance (0-10): Are legal pages present? Privacy policy, terms of service, disclaimers, IP notices, GDPR indicators?
4. Performance (0-10): Does the page show signs of fast loading? Are there large unoptimized assets, render-blocking indicators?
5. Brand (0-10): Is messaging consistent and professional? Are there typos, inconsistent tone, or unprofessional elements?

Return ONLY a strict JSON object in this exact format — no markdown, no prose, no explanation:
{"functionality": <number>, "content": <number>, "compliance": <number>, "performance": <number>, "brand": <number>, "reasoning": {"functionality": "<one sentence>", "content": "<one sentence>", "compliance": "<one sentence>", "performance": "<one sentence>", "brand": "<one sentence>"}, "is_auth_wall": <true|false>}`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          functionality: { type: 'number' },
          content: { type: 'number' },
          compliance: { type: 'number' },
          performance: { type: 'number' },
          brand: { type: 'number' },
          reasoning: {
            type: 'object',
            properties: {
              functionality: { type: 'string' },
              content: { type: 'string' },
              compliance: { type: 'string' },
              performance: { type: 'string' },
              brand: { type: 'string' },
            },
          },
          // legacy compat
          functionality_reason: { type: 'string' },
          content_reason: { type: 'string' },
          compliance_reason: { type: 'string' },
          performance_reason: { type: 'string' },
          brand_reason: { type: 'string' },
          is_auth_wall: { type: 'boolean' },
        },
      },
    });

    const parsed = safeParseLLM(res, {});
    // Normalize reasoning field — support both {reasoning: {}} and {functionality_reason: ''} formats
    const normalized = {
      ...parsed,
      functionality_reason: parsed.reasoning?.functionality || parsed.functionality_reason || '',
      content_reason: parsed.reasoning?.content || parsed.content_reason || '',
      compliance_reason: parsed.reasoning?.compliance || parsed.compliance_reason || '',
      performance_reason: parsed.reasoning?.performance || parsed.performance_reason || '',
      brand_reason: parsed.reasoning?.brand || parsed.brand_reason || '',
    };
    setScores(normalized);
    setPhase('scored');

    if (normalized.is_auth_wall && !supplemental) {
      setShowAuthPrompt(true);
    } else {
      await runPhase2(normalized, supplemental);
    }
  };

  const handleExtraContent = async (content) => {
    setShowAuthPrompt(false);
    await runPhase1(content);
  };

  // ── PHASE 2: Self-Heal ──────────────────────────────────────────────────────
  const runPhase2 = async (scoreData, supplemental = null) => {
    const failingDimensions = DIMENSIONS.filter(d => (scoreData[d.key] ?? 10) < 6);
    if (failingDimensions.length === 0) {
      setFixes([]);
      await runPhase3(scoreData, [], supplemental);
      return;
    }

    setPhase('healing');
    setPhaseLabel(`Phase 2 — Self-Heal: Generating precise Base44 fixes for ${failingDimensions.length} failing dimension${failingDimensions.length > 1 ? 's' : ''}…`);

    const inputDesc = input.type === 'url'
      ? `URL: ${input.value}\n${pageContext?.content ? pageContext.content.slice(0, 1500) : ''}`
      : input.value.slice(0, 1500);

    const supplementalBlock = supplemental ? `\n\nInterior content:\n${supplemental}` : '';

    // Phase 2 prompt — exact-precision Base44 sprint format
    const prompt = `You are FlowAI's Self-Renewal engine running Phase 2 — Self-Heal for PRODUCT: ${productName}${productUrl ? ` (${productUrl})` : ''}.

PRODUCT CONTEXT:
${inputDesc}${supplementalBlock}

Session objective: ${objective || 'full governance'}

FAILING DIMENSIONS (scored below 6/10):
${failingDimensions.map(d => `- ${d.label} (scored ${scoreData[d.key]}/10): ${scoreData[d.key + '_reason']}`).join('\n')}

For EACH failing dimension, generate ONE precise fix instruction for ${productName} specifically.

Every fix MUST:
1. Reference ${productName} by name in the issue description
2. Describe the specific symptom observed in ${productName}'s analysis
3. Use one of these fix types: base44_sprint (for code changes), content_fix (for copy/text), config_fix (for settings)
4. For base44_sprint type: include exact file, location, current code, and corrected code

Return ONLY a strict JSON array — no markdown, no prose:
[
  {
    "dimension": "<dimension label>",
    "issue": "<one sentence describing the specific problem in ${productName}>",
    "fix_type": "base44_sprint" | "content_fix" | "config_fix",
    "title": "<short action title>",
    "file": "<exact filename or 'N/A'>",
    "location": "<line number or function name or 'N/A'>",
    "current_code": "<exact current code snippet or 'N/A'>",
    "corrected_code": "<exact corrected code snippet or 'N/A'>",
    "why": "<one sentence explaining why this fixes the issue in ${productName}>",
    "verification_instruction": "<specific action to confirm fix worked in ${productName}>"
  }
]`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          fixes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string' },
                issue: { type: 'string' },
                fix_type: { type: 'string' },
                format: { type: 'string' },
                title: { type: 'string' },
                file: { type: 'string' },
                location: { type: 'string' },
                current_code: { type: 'string' },
                corrected_code: { type: 'string' },
                why: { type: 'string' },
                verification_instruction: { type: 'string' },
                instruction: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const parsed = safeParseLLM(res, { fixes: [] });
    // Handle both array response and {fixes: []} wrapper
    const fixArray = Array.isArray(parsed) ? parsed : (parsed.fixes || []);
    const fixesWithIds = fixArray.map((f, i) => ({
      ...f,
      id: `fix-${i}`,
      isOptimization: false,
      // normalize fix_type to format for FIX_FORMAT_LABELS lookup
      format: f.fix_type || f.format || 'sprint',
    }));
    setFixes(fixesWithIds);
    await runPhase3(scoreData, fixesWithIds, supplemental);
  };

  // ── PHASE 3: Self-Optimize ─────────────────────────────────────────────────
  const runPhase3 = async (scoreData, existingFixes, supplemental = null) => {
    const passingDimensions = DIMENSIONS.filter(d => (scoreData[d.key] ?? 0) >= 6);

    setPhase('optimizing');
    setPhaseLabel('Phase 3 — Self-Optimize: Generating 3 optimization instructions…');

    const inputDesc = input.type === 'url'
      ? `URL: ${input.value}\n${pageContext?.content ? pageContext.content.slice(0, 1200) : ''}`
      : input.value.slice(0, 1200);

    const supplementalBlock = supplemental ? `\n\nInterior content:\n${supplemental}` : '';

    const prompt = `You are FlowAI's Self-Renewal engine running Phase 3 — Self-Optimize for PRODUCT: ${productName}.

PRODUCT CONTEXT:
${inputDesc}${supplementalBlock}

PASSING DIMENSIONS (scored 6+/10, candidates for optimization):
${passingDimensions.map(d => `- ${d.label} (scored ${scoreData[d.key]}/10): ${scoreData[d.key + '_reason']}`).join('\n')}

Identify the THREE highest-impact optimizations specific to ${productName}. Each optimization must:
1. Reference ${productName} by name
2. Describe a specific improvement opportunity found in ${productName}'s actual content
3. Use the same precise format as Phase 2 fixes

Return ONLY a strict JSON array — no markdown, no prose:
[
  {
    "dimension": "<dimension label>",
    "issue": "<what could be stronger in ${productName}>",
    "fix_type": "base44_sprint" | "content_fix" | "config_fix",
    "title": "<short action title>",
    "file": "<exact filename or 'N/A'>",
    "location": "<line number or function name or 'N/A'>",
    "current_code": "<current code or 'N/A'>",
    "corrected_code": "<improved code or 'N/A'>",
    "why": "<one sentence — specific improvement for ${productName}>",
    "verification_instruction": "<specific action to confirm improvement in ${productName}>"
  }
]`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          optimizations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dimension: { type: 'string' },
                issue: { type: 'string' },
                fix_type: { type: 'string' },
                format: { type: 'string' },
                title: { type: 'string' },
                file: { type: 'string' },
                location: { type: 'string' },
                current_code: { type: 'string' },
                corrected_code: { type: 'string' },
                why: { type: 'string' },
                verification_instruction: { type: 'string' },
                instruction: { type: 'string' },
              },
            },
          },
        },
      },
    });

    const parsed = safeParseLLM(res, { optimizations: [] });
    const optArray = Array.isArray(parsed) ? parsed : (parsed.optimizations || []);
    const optsWithIds = optArray.slice(0, 3).map((o, i) => ({
      ...o,
      id: `opt-${i}`,
      isOptimization: true,
      format: o.fix_type || o.format || 'sprint',
    }));
    setOptimizations(optsWithIds);
    setPhase('gate');
    setPhaseLabel('');
  };

  // ── APPLY FIX ──────────────────────────────────────────────────────────────
  const applyFix = (fix) => {
    const textToCopy = fix.title
      ? `Sprint Title: ${fix.title}\nFile: ${fix.file}\nLocation: ${fix.location}\nCurrent code: ${fix.current_code}\nReplace with: ${fix.corrected_code}\nWhy: ${fix.why}\nTest: ${fix.verification_instruction}`
      : (fix.instruction || '');
    navigator.clipboard.writeText(textToCopy).catch(() => {});
    setAppliedIds(prev => new Set([...prev, fix.id]));
  };

  const skipFix = (id) => {
    setSkippedIds(prev => new Set([...prev, id]));
  };

  const allFixes = [...fixes, ...optimizations];
  const reviewedCount = appliedIds.size + skippedIds.size;
  const totalCount = allFixes.length;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <RefreshCw className={`h-5 w-5 text-primary ${phase === 'scoring' || phase === 'healing' || phase === 'optimizing' ? 'animate-spin' : ''}`} />
          <div>
            <p className="text-sm font-bold text-foreground">Self-Renewal Engine</p>
            <p className="text-[11px] text-muted-foreground">4-phase autonomous governance cycle</p>
          </div>
        </div>
        {phase === 'idle' && (
          <Button onClick={() => runPhase1()} className="gap-2 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" /> Run Self-Renewal
          </Button>
        )}
        {(phase === 'scoring' || phase === 'healing' || phase === 'optimizing') && (
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {phaseLabel}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* ── PHASE 1 RESULTS: Score card ── */}
      <AnimatePresence>
        {scores && (
          <motion.div key="scores" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <p className="text-xs font-bold text-foreground uppercase tracking-wide">Phase 1 — Self-Test Results</p>
            </div>

            {isRerun && previousScores && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Score Delta — Previous vs Current Run</p>
                {DIMENSIONS.map(d => {
                  const prev = previousScores[d.key] ?? 0;
                  const curr = scores?.[d.key] ?? 0;
                  const delta = curr - prev;
                  return (
                    <div key={d.key} className="flex items-center gap-2 text-[11px]">
                      <span className="text-foreground w-24">{d.label}</span>
                      <span className="text-muted-foreground">{prev} → {curr}</span>
                      {delta > 0 && <span className="text-emerald-400 font-bold">(+{delta}) ✅</span>}
                      {delta < 0 && <span className="text-red-400 font-bold">({delta}) ⚠️</span>}
                      {delta === 0 && <span className="text-muted-foreground">(no change)</span>}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Score cards — stack on mobile */}
            <div className="grid grid-cols-1 sm:grid-cols-1 gap-2">
              {DIMENSIONS.map(d => {
                const score = scores[d.key] ?? 0;
                const reason = scores[d.key + '_reason'] || scores.reasoning?.[d.key] || '';
                const DimIcon = d.icon;
                const failing = score < 6;
                return (
                  <div key={d.key} className={`rounded-lg border p-3 space-y-1.5 ${failing ? 'border-red-500/20 bg-red-500/5' : 'border-border bg-card/50'}`}>
                    <div className="flex items-center gap-2">
                      <DimIcon className={`h-3.5 w-3.5 shrink-0 ${failing ? 'text-red-400' : 'text-emerald-400'}`} />
                      <span className="text-xs font-semibold text-foreground flex-1">{d.label}</span>
                      {failing && <span className="text-[10px] text-red-400 font-bold hidden sm:inline">BELOW THRESHOLD — FIX TRIGGERED</span>}
                      {failing && <span className="text-[10px] text-red-400 font-bold sm:hidden">FIX TRIGGERED</span>}
                      <ScoreBar score={score} />
                    </div>
                    <p className="text-[11px] text-muted-foreground pl-5">{reason}</p>
                  </div>
                );
              })}
            </div>

            {/* Overall score summary */}
            <div className="rounded-lg bg-secondary/30 p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Overall score</p>
              <p className={`text-xl font-bold ${
                DIMENSIONS.every(d => scores[d.key] >= 6) ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {Math.round(DIMENSIONS.reduce((sum, d) => sum + (scores[d.key] ?? 0), 0) / DIMENSIONS.length * 10) / 10}/10
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auth wall prompt */}
      {showAuthPrompt && (
        <AuthWallPrompt onSubmitExtra={handleExtraContent} />
      )}

      {/* ── PHASES 2 + 3 running indicator ── */}
      {(phase === 'healing' || phase === 'optimizing') && (
        <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 text-blue-400 animate-spin shrink-0" />
          <p className="text-xs text-blue-400 font-semibold">{phaseLabel}</p>
        </div>
      )}

      {/* ── PHASE 4: HUMAN GATE ── */}
      <AnimatePresence>
        {phase === 'gate' && allFixes.length > 0 && (
          <motion.div key="gate" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-bold text-amber-400">Phase 4 — Human Gate</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Review all generated fixes and optimizations. Apply or skip each one.
                    {fixes.length > 0 && ` ${fixes.length} fix${fixes.length > 1 ? 'es' : ''} generated.`}
                    {optimizations.length > 0 && ` ${optimizations.length} optimization${optimizations.length > 1 ? 's' : ''} ready.`}
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">
                  {reviewedCount}/{totalCount} reviewed
                </span>
              </div>
            </div>

            {/* Heal fixes */}
            {fixes.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Phase 2 — Heal Fixes ({fixes.length})</p>
                {fixes.map(fix => (
                  <FixCard
                    key={fix.id}
                    fix={fix}
                    onApply={applyFix}
                    onSkip={skipFix}
                    applied={appliedIds.has(fix.id)}
                    skipped={skippedIds.has(fix.id)}
                  />
                ))}
              </div>
            )}

            {/* Optimization fixes */}
            {optimizations.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Phase 3 — Optimizations ({optimizations.length})</p>
                {optimizations.map(opt => (
                  <FixCard
                    key={opt.id}
                    fix={opt}
                    onApply={applyFix}
                    onSkip={skipFix}
                    applied={appliedIds.has(opt.id)}
                    skipped={skippedIds.has(opt.id)}
                  />
                ))}
              </div>
            )}

            {/* Complete gate */}
            {reviewedCount === totalCount && totalCount > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-400">All items reviewed. Self-Renewal cycle complete.</p>
                  </div>
                  {onComplete && (
                    <Button size="sm" onClick={onComplete} className="gap-1.5 text-xs h-10 w-full sm:w-auto">
                      Continue →
                    </Button>
                  )}
                </div>
                {/* Re-run Self-Test */}
                <div className="border-t border-emerald-500/20 pt-3">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-10 w-full sm:w-auto border-primary/30 text-primary"
                    onClick={() => {
                      setPreviousScores(scores);
                      setIsRerun(true);
                      setPhase('idle');
                      setScores(null);
                      setFixes([]);
                      setOptimizations([]);
                      setAppliedIds(new Set());
                      setSkippedIds(new Set());
                    }}>
                    <RefreshCw className="h-3 w-3" /> Re-run Self-Test to Verify Fixes
                  </Button>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Scores the same 5 dimensions again. Shows improvement delta vs previous run.</p>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* No fixes needed */}
        {phase === 'gate' && allFixes.length === 0 && (
          <motion.div key="no-fixes" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <p className="text-sm font-semibold text-emerald-400">All dimensions passed. No fixes required. Self-Renewal cycle complete.</p>
            </div>
            {onComplete && (
              <Button size="sm" onClick={onComplete} className="gap-1.5 text-xs h-10 w-full sm:w-auto">
                Continue →
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}