import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  Server, Loader2, CheckCircle2, AlertCircle, Copy, Check,
  Zap, ShieldAlert, BarChart3, FileText
} from 'lucide-react';

const PRODUCTS = [
  { name: 'SAIGE',       url: 'https://saige.base44.app',       recommended_stack: 'Vercel + Supabase',   audience: 'universities, utilities, government' },
  { name: 'PressAI',     url: 'https://pressai.base44.app',     recommended_stack: 'Railway + Supabase',  audience: 'authors, publishers, content creators' },
  { name: 'ReachSMS',    url: 'https://reachsms.base44.app',    recommended_stack: 'Vercel + Supabase',   audience: 'nonprofits, community organizations' },
  { name: 'RelTwin',     url: 'https://reltwin.com',            recommended_stack: 'Vercel + Supabase',   audience: 'coaches, HR professionals' },
  { name: 'MyPregLife', url: 'https://mypreglife.base44.app', recommended_stack: 'Railway + Supabase',  audience: 'pregnant women in Nigeria and Africa' },
];

const SCAFFOLD_TABS = [
  { key: 'readme',     label: 'README.md',            field: 'readme' },
  { key: 'schema',     label: 'schema.sql',           field: 'schema_sql' },
  { key: 'deploy',     label: 'vercel.json / railway.toml', field: 'vercel_config' },
  { key: 'env',        label: '.env.example',         field: 'env_example' },
  { key: 'migration',  label: 'migration-checklist.md', field: 'migration_checklist' },
  { key: 'api',        label: 'api-routes.md',        field: 'api_routes' },
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all shrink-0">
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

function ReadinessGauge({ score }) {
  const color = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
  const ring  = score >= 70 ? 'stroke-emerald-400' : score >= 50 ? 'stroke-amber-400' : 'stroke-red-400';
  const r = 28, circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="flex items-center gap-3">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
        <circle cx="36" cy="36" r={r} fill="none" className={ring} strokeWidth="6"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 36 36)" />
        <text x="36" y="41" textAnchor="middle" className={`text-sm font-bold fill-current ${color}`} fontSize="14" fontWeight="bold" fill="currentColor">
          {score}
        </text>
      </svg>
      <div>
        <p className={`text-lg font-bold ${color}`}>{score}/100</p>
        <p className="text-[10px] text-muted-foreground">Readiness Score</p>
        <p className={`text-[10px] font-semibold ${color}`}>
          {score >= 70 ? '✅ Go' : score >= 50 ? '⚠️ Needs Work' : '🔴 Not Ready'}
        </p>
      </div>
    </div>
  );
}

export default function Architecture() {
  const [selectedProduct, setSelectedProduct] = useState(PRODUCTS[0]);
  const [phase, setPhase] = useState(/** @type {string} */ ('idle')); // idle | checking | checked | analyzing | analyzed | generating | generated
  const [readiness, setReadiness] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [scaffold, setScaffold] = useState(null);
  const [activeTab, setActiveTab] = useState('readme');
  const [expandSection, setExpandSection] = useState('readiness');

  const runReadinessCheck = async () => {
    setPhase('checking');
    setReadiness(null);
    setAnalysis(null);
    setScaffold(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's production readiness checker. Score this Base44 product for production deployment readiness.

Product: ${selectedProduct.name}
URL: ${selectedProduct.url}
Target audience: ${selectedProduct.audience}
Recommended stack: ${selectedProduct.recommended_stack}

CRITICAL — CITATIONS FOR ALL DATA: For every statistic, percentage, benchmark, industry standard, or data point you include in the assessment, provide a source citation in parentheses immediately after the figure. Use real, verifiable sources — TechCrunch, AWS, Azure documentation, industry whitepapers, or peer-reviewed research. Format as: [statistic] (Source: [Organization], [Year]). Never invent statistics. If you cannot cite a real source, do not include that figure.

Score 0–100 across these dimensions:
1. Feature completeness (0–25): Are core features fully implemented for the target audience?
2. Data model maturity (0–20): Are entities well-designed with proper fields, relationships, and validations?
3. Error handling (0–15): Does the app handle edge cases, loading states, and errors gracefully?
4. Performance & mobile (0–15): Is the UI responsive and performant on mobile devices?
5. Security posture (0–15): Are there proper auth guards, no exposed secrets, input validation?
6. Content readiness (0–10): Is copy professional, no placeholder text, no "TODO" items?

Return:
- score: total 0–100
- dimension_scores: object with each dimension name and score
- blocking_issues: array of critical issues that MUST be fixed before production (max 5)
- recommended_fixes: array of important improvements (max 5)
- nice_to_haves: array of optional enhancements (max 3)
- go_no_go: "go" or "no_go"
- go_no_go_reason: one clear sentence explaining the decision
- migration_complexity: "low" | "medium" | "high"
- estimated_developer_hours: number (realistic estimate for full migration)`,
      response_json_schema: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          dimension_scores: { type: 'object' },
          blocking_issues: { type: 'array', items: { type: 'string' } },
          recommended_fixes: { type: 'array', items: { type: 'string' } },
          nice_to_haves: { type: 'array', items: { type: 'string' } },
          go_no_go: { type: 'string' },
          go_no_go_reason: { type: 'string' },
          migration_complexity: { type: 'string' },
          estimated_developer_hours: { type: 'number' },
        },
      },
    });

    setReadiness(result);
    setPhase('checked');
    setExpandSection('readiness');
  };

  const runArchitectureAnalysis = async () => {
    setPhase('analyzing');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's architecture analyzer. Produce a complete production architecture plan for migrating "${selectedProduct.name}" from Base44 to a standalone production deployment.

Product: ${selectedProduct.name}
URL: ${selectedProduct.url}
Target audience: ${selectedProduct.audience}
Recommended stack: ${selectedProduct.recommended_stack}
Readiness score: ${readiness?.score}/100
Migration complexity: ${readiness?.migration_complexity}

Produce:

1. stack_recommendation: Detailed recommendation for ${selectedProduct.recommended_stack} — why this stack for this product and audience (2-3 sentences)

2. entity_translation_map: Array of objects mapping Base44 entities to Supabase tables. Each object: { base44_entity, supabase_table, columns (array of {name, type, constraints}), rls_policy, notes }

3. api_routes_summary: Array of API routes needed. Each: { method, path, description, auth_required, rate_limit }

4. environment_variables: Array of env vars needed. Each: { key, description, example_value, required }

5. infrastructure_notes: Key infrastructure considerations for this product (auth, file storage, real-time, background jobs) — 3-5 bullet points as array of strings

6. third_party_services: Array of recommended third-party services. Each: { service, purpose, free_tier_available }`,
      response_json_schema: {
        type: 'object',
        properties: {
          stack_recommendation: { type: 'string' },
          entity_translation_map: { type: 'array', items: { type: 'object' } },
          api_routes_summary: { type: 'array', items: { type: 'object' } },
          environment_variables: { type: 'array', items: { type: 'object' } },
          infrastructure_notes: { type: 'array', items: { type: 'string' } },
          third_party_services: { type: 'array', items: { type: 'object' } },
        },
      },
    });

    setAnalysis(result);
    setPhase('analyzed');
    setExpandSection('analysis');
  };

  const generateScaffold = async () => {
    setPhase('generating');
    const isRailway = selectedProduct.recommended_stack.includes('Railway');

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's scaffold generator. Produce six complete production deployment files for "${selectedProduct.name}".

Product: ${selectedProduct.name}
Stack: ${selectedProduct.recommended_stack}
Audience: ${selectedProduct.audience}
Entity map: ${JSON.stringify(analysis?.entity_translation_map?.slice(0, 5) || [])}
API routes: ${JSON.stringify(analysis?.api_routes_summary?.slice(0, 8) || [])}
Env vars: ${JSON.stringify(analysis?.environment_variables?.slice(0, 10) || [])}
Infra notes: ${(analysis?.infrastructure_notes || []).join('; ')}

Generate these exact files:

readme: A complete README.md with: project title, description, tech stack badges, installation instructions, environment setup, development workflow, deployment steps to ${selectedProduct.recommended_stack}, contributing guidelines

schema_sql: Complete Supabase PostgreSQL schema with: CREATE TABLE statements for all entities, primary keys, foreign keys, timestamps (created_at, updated_at), Row Level Security ENABLE statements, CREATE POLICY for user data isolation, CREATE INDEX for common queries

${isRailway ? 'deploy_config: Complete railway.toml with service configuration, build commands, start commands, health checks, environment variable references' : 'deploy_config: Complete vercel.json with framework preset, build output, rewrites for SPA routing, headers for security and caching, environment variable references'}

env_example: Complete .env.example with all required and optional environment variables, grouped by service (Database, Auth, Storage, APIs), with descriptive comments for each

migration_checklist: Complete migration-checklist.md with numbered steps covering: data export from Base44, schema setup in Supabase, data import, auth migration, DNS cutover, smoke testing, rollback plan

api_routes: Complete api-routes.md documenting all API endpoints with method, path, request body, response format, auth requirements, and example curl commands

Return exactly: { readme, schema_sql, deploy_config, env_example, migration_checklist, api_routes }`,
      response_json_schema: {
        type: 'object',
        properties: {
          readme: { type: 'string' },
          schema_sql: { type: 'string' },
          deploy_config: { type: 'string' },
          env_example: { type: 'string' },
          migration_checklist: { type: 'string' },
          api_routes: { type: 'string' },
        },
      },
    });

    // Save to DeploymentScaffold entity
    await base44.entities.DeploymentScaffold.create({
      product_name: selectedProduct.name,
      target_url: selectedProduct.url,
      recommended_stack: selectedProduct.recommended_stack,
      readme: result.readme,
      schema_sql: result.schema_sql,
      vercel_config: result.deploy_config,
      env_example: result.env_example,
      migration_checklist: result.migration_checklist,
      api_routes: result.api_routes,
      readiness_score: readiness?.score,
      readiness_report: readiness,
      status: 'generated',
    });

    setScaffold(result);
    setPhase('generated');
    setActiveTab('readme');
    setExpandSection('scaffold');
  };

  const handleProductChange = (product) => {
    setSelectedProduct(product);
    setPhase('idle');
    setReadiness(null);
    setAnalysis(null);
    setScaffold(null);
  };

  const isBlocked = readiness && readiness.score < 70;
  const canAnalyze = phase === 'checked' && !isBlocked;
  const canGenerate = phase === 'analyzed';

  const SECTION_TABS = [
    { key: 'readiness', label: '1 — Readiness',  available: !!readiness },
    { key: 'analysis',  label: '2 — Architecture', available: !!analysis },
    { key: 'scaffold',  label: '3 — Scaffold',    available: !!scaffold },
  ];

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Server className="h-7 w-7 text-primary" /> Architecture & Scaffold
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Production readiness check → architecture analysis → scaffold generation. Three-phase deployment bridge.
        </p>
      </motion.div>

      {/* Product Selector */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Select Product</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {PRODUCTS.map(p => (
            <button key={p.name} onClick={() => handleProductChange(p)}
              className={`rounded-lg border p-3 text-left transition-all ${selectedProduct.name === p.name ? 'border-primary/50 bg-primary/5 text-primary' : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
              <p className="text-xs font-bold">{p.name}</p>
              <p className="text-[9px] mt-0.5 opacity-70">{p.recommended_stack}</p>
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border">
          <div className="flex-1 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedProduct.name}</span>
            {' · '}{selectedProduct.url}
            {' · '}<span className="text-primary font-semibold">{selectedProduct.recommended_stack}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="gap-1.5 text-xs h-8"
              disabled={phase === 'checking'}
              onClick={runReadinessCheck}>
              {phase === 'checking' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart3 className="h-3.5 w-3.5" />}
              {phase === 'checking' ? 'Checking...' : 'Run Readiness Check'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
              disabled={!canAnalyze || String(phase) === 'analyzing'}
              onClick={runArchitectureAnalysis}>
              {phase === 'analyzing' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
              {phase === 'analyzing' ? 'Analyzing...' : 'Analyze Architecture'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
              disabled={!canGenerate || String(phase) === 'generating'}
              onClick={generateScaffold}>
              {phase === 'generating' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              {phase === 'generating' ? 'Generating...' : 'Generate Scaffold'}
            </Button>
          </div>
        </div>
      </div>

      {/* Phase progress */}
      {(readiness || analysis || scaffold) && (
        <div className="flex gap-1 border-b border-border">
          {SECTION_TABS.map(t => (
            <button key={t.key} onClick={() => t.available && setExpandSection(t.key)}
              disabled={!t.available}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${expandSection === t.key && t.available ? 'border-primary text-primary' : t.available ? 'border-transparent text-muted-foreground hover:text-foreground' : 'border-transparent text-muted-foreground/30 cursor-not-allowed'}`}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── SECTION 1: READINESS ── */}
        {expandSection === 'readiness' && readiness && (
          <motion.div key="readiness" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Score + go/no-go */}
            <div className={`rounded-xl border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5 ${isBlocked ? 'border-red-500/30 bg-red-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <ReadinessGauge score={readiness.score} />
              <div className="flex-1 space-y-1">
                <p className={`text-sm font-bold ${isBlocked ? 'text-red-400' : 'text-emerald-400'}`}>
                  {readiness.go_no_go === 'go' ? '✅ Go for Production Deployment' : '🔴 Not Ready for Production'}
                </p>
                <p className="text-xs text-muted-foreground">{readiness.go_no_go_reason}</p>
                <div className="flex gap-4 text-[10px] text-muted-foreground pt-1">
                  <span>Complexity: <strong className="text-foreground capitalize">{readiness.migration_complexity}</strong></span>
                  <span>Est. dev hours: <strong className="text-foreground">{readiness.estimated_developer_hours}h</strong></span>
                </div>
              </div>
            </div>

            {/* Blocked message */}
            {isBlocked && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-400">Scaffold Generation Blocked</p>
                  <p className="text-xs text-muted-foreground mt-0.5">This product needs governance work before production deployment. Run a Full Cycle session first.</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Score must reach 70+ to unlock Architecture Analysis and Scaffold Generation.</p>
                </div>
              </div>
            )}

            {/* Dimension scores */}
            {readiness.dimension_scores && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-xs font-bold text-foreground">Dimension Breakdown</p>
                <div className="space-y-1.5">
                  {Object.entries(readiness.dimension_scores).map(([dim, score]) => {
                    const pct = typeof score === 'number' ? score : 0;
                    const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';
                    return (
                      <div key={dim} className="flex items-center gap-3">
                        <p className="text-[10px] text-muted-foreground w-40 truncate capitalize">{dim.replace(/_/g, ' ')}</p>
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-foreground w-8 text-right">{pct}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Issues / fixes / nice-to-haves */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {readiness.blocking_issues?.length > 0 && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">Blocking Issues</p>
                  {readiness.blocking_issues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-red-300">
                      <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" /> {issue}
                    </div>
                  ))}
                </div>
              )}
              {readiness.recommended_fixes?.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Recommended Fixes</p>
                  {readiness.recommended_fixes.map((fix, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-300">
                      <Zap className="h-3 w-3 shrink-0 mt-0.5" /> {fix}
                    </div>
                  ))}
                </div>
              )}
              {readiness.nice_to_haves?.length > 0 && (
                <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-1.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Nice-to-Haves</p>
                  {readiness.nice_to_haves.map((item, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" /> {item}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {canAnalyze && (
              <Button className="gap-2 w-full" onClick={runArchitectureAnalysis} disabled={String(phase) === 'analyzing'}>
                {String(phase) === 'analyzing' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Server className="h-4 w-4" />}
                {String(phase) === 'analyzing' ? 'Analyzing Architecture...' : 'Proceed to Architecture Analysis →'}
              </Button>
            )}
          </motion.div>
        )}

        {/* ── SECTION 2: ARCHITECTURE ANALYSIS ── */}
        {expandSection === 'analysis' && analysis && (
          <motion.div key="analysis" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            {/* Stack recommendation */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-bold text-primary mb-1">Stack Recommendation — {selectedProduct.recommended_stack}</p>
              <p className="text-sm text-foreground">{analysis.stack_recommendation}</p>
              <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-2"><AlertCircle className="h-3 w-3" /> AI-generated recommendation — verify before use</p>
            </div>

            {/* Entity translation map */}
            {analysis.entity_translation_map?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-xs font-bold text-foreground">Entity → Supabase Table Map</p>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {analysis.entity_translation_map.map((e, i) => (
                    <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-primary font-bold">{e.base44_entity || e.base44_entity_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-mono text-foreground font-bold">{e.supabase_table}</span>
                      </div>
                      {e.columns?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {e.columns.slice(0, 6).map((col, j) => (
                            <span key={j} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                              {col.name}: {col.type}
                            </span>
                          ))}
                          {e.columns.length > 6 && <span className="text-[9px] text-muted-foreground">+{e.columns.length - 6} more</span>}
                        </div>
                      )}
                      {e.rls_policy && <p className="text-[9px] text-emerald-400">RLS: {e.rls_policy}</p>}
                      {e.notes && <p className="text-[9px] text-muted-foreground">{e.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Two-column: API routes + Env vars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {analysis.api_routes_summary?.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs font-bold text-foreground">API Route Map</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {analysis.api_routes_summary.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px]">
                        <span className={`font-mono font-bold shrink-0 ${r.method === 'GET' ? 'text-emerald-400' : r.method === 'POST' ? 'text-blue-400' : r.method === 'DELETE' ? 'text-red-400' : 'text-amber-400'}`}>{r.method}</span>
                        <span className="font-mono text-foreground truncate">{r.path}</span>
                        {r.auth_required && <span className="text-[8px] px-1 rounded bg-primary/10 text-primary shrink-0">auth</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {analysis.environment_variables?.length > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <p className="text-xs font-bold text-foreground">Environment Variables</p>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {analysis.environment_variables.map((v, i) => (
                      <div key={i} className="text-[10px]">
                        <span className="font-mono text-primary font-bold">{v.key}</span>
                        {v.required && <span className="text-[8px] ml-1 px-1 rounded bg-red-500/10 text-red-400">required</span>}
                        {v.description && <p className="text-muted-foreground">{v.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Infrastructure notes */}
            {analysis.infrastructure_notes?.length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/20 p-4 space-y-1.5">
                <p className="text-xs font-bold text-foreground">Infrastructure Considerations</p>
                {analysis.infrastructure_notes.map((note, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <span className="text-primary shrink-0 mt-0.5">•</span>{note}
                  </div>
                ))}
              </div>
            )}

            <Button className="gap-2 w-full" onClick={generateScaffold} disabled={phase === 'generating'}>
              {phase === 'generating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {phase === 'generating' ? 'Generating 6 Scaffold Files...' : 'Generate Deployment Scaffold (6 files) →'}
            </Button>
          </motion.div>
        )}

        {/* ── SECTION 3: SCAFFOLD FILES ── */}
        {expandSection === 'scaffold' && scaffold && (
          <motion.div key="scaffold" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-4">

            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <p className="text-sm text-emerald-400 font-semibold">6 scaffold files generated for {selectedProduct.name} — saved to DeploymentScaffold entity</p>
            </div>

            {/* File tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-border">
              {SCAFFOLD_TABS.map(t => {
                const content = t.field === 'vercel_config' ? scaffold.deploy_config : scaffold[t.field];
                if (!content) return null;
                return (
                  <button key={t.key} onClick={() => setActiveTab(t.key)}
                    className={`px-3 py-2 text-[10px] font-mono font-semibold border-b-2 transition-all whitespace-nowrap ${activeTab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t.label}
                  </button>
                );
              })}
            </div>

            {SCAFFOLD_TABS.map(t => {
              const content = t.field === 'vercel_config' ? scaffold.deploy_config : scaffold[t.field];
              if (!content || activeTab !== t.key) return null;
              return (
                <div key={t.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground font-mono">{t.label}</p>
                    <CopyButton text={content} />
                  </div>
                  <pre className="text-[10px] font-mono bg-secondary/30 border border-border rounded-lg p-4 whitespace-pre-wrap max-h-96 overflow-y-auto text-foreground">{content}</pre>
                  <p className="text-[10px] text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> AI-generated — verify before use in production
                  </p>
                </div>
              );
            })}
          </motion.div>
        )}

      </AnimatePresence>

      {/* Idle empty state */}
      {phase === 'idle' && (
        <div className="text-center py-14">
          <Server className="h-12 w-12 text-muted-foreground/15 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Select a product above and run the Readiness Check to begin.</p>
          <p className="text-muted-foreground/50 text-xs mt-1">Readiness → Architecture Analysis → Scaffold Generation</p>
        </div>
      )}
    </div>
  );
}
