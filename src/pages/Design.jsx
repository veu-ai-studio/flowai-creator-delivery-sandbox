import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Layers, Loader2, AlertCircle, CheckCircle2, ArrowRight,
  Layout, List, Plug, Cpu
} from 'lucide-react';
import { useOrchestration } from '@/lib/OrchestrationContext';

const PHASE = 'Phase 3 — Design Engine';

function DesignSection({ icon: Icon, title, items, color }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />{title}
      </p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="text-xs text-foreground p-2 rounded bg-secondary/30 border border-border/30"
          >
            {typeof item === 'object'
              ? <div className="space-y-0.5">
                  <p className="font-semibold">{item.name || item.component || item.endpoint || item.block}</p>
                  {item.description && <p className="text-muted-foreground">{item.description}</p>}
                  {item.method && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono">{item.method}</span>}
                </div>
              : item}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default function Design() {
  const { getRunConfig } = useOrchestration();
  const [researchContext, setResearchContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState(null);
  const [phaseStatus, setPhaseStatus] = useState(null);
  const [phaseReport, setPhaseReport] = useState(null);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('flowai_research');
    if (stored) {
      try {
        const r = JSON.parse(stored);
        setResearchContext(r.inputQuery || r.summary || '');
      } catch {}
    }
  }, []);

  const handleDesign = async () => {
    if (!researchContext.trim()) return;
    setLoading(true);
    setDesign(null);
    setPhaseStatus('running');
    setPhaseReport(null);

    try {
      setCurrentStep('Generating UX flows...');
      const orchConfig = getRunConfig();
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior product architect and UX designer. Generate a complete product design based on:
Context/Input: ${researchContext}
Orchestration: mode=${orchConfig.agenticMode}, iteration=${orchConfig.iterationMode}, flow=${orchConfig.flowType}

Produce detailed, actionable design artifacts for building a modern SaaS product.`,
        response_json_schema: {
          type: 'object',
          properties: {
            product_name: { type: 'string' },
            tagline: { type: 'string' },
            ux_flows: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, steps: { type: 'array', items: { type: 'string' } } } }
            },
            features: {
              type: 'array',
              items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string' } } }
            },
            architecture_blocks: {
              type: 'array',
              items: { type: 'object', properties: { block: { type: 'string' }, description: { type: 'string' } } }
            },
            api_endpoints: {
              type: 'array',
              items: { type: 'object', properties: { endpoint: { type: 'string' }, method: { type: 'string' }, description: { type: 'string' } } }
            },
          },
        },
      });

      setCurrentStep('Validating design output...');
      const checks = [];
      let failed = false;
      let failStep = '';
      let failError = '';

      if (!res?.ux_flows?.length) { failed = true; failStep = 'UX Flows'; failError = 'No UX flows generated'; }
      else checks.push('UX flows present');
      if (!res?.features?.length) { failed = true; failStep = 'Features'; failError = 'Feature list is empty'; }
      else checks.push('features present');
      if (!res?.architecture_blocks?.length) { failed = true; failStep = 'Architecture'; failError = 'No architecture blocks'; }
      else checks.push('architecture present');
      if (!res?.api_endpoints?.length) { failed = true; failStep = 'API Endpoints'; failError = 'No API endpoints generated'; }
      else checks.push('API endpoints present');

      if (failed) {
        setPhaseStatus('failed');
        setPhaseReport({ status: 'FAILED', phase: PHASE, step: failStep, error: failError, root_cause: 'LLM returned incomplete design', fix_recommendation: 'Provide richer research context', next_action: `Fix ${failStep} → re-run Phase 3` });
      } else {
        setDesign(res);
        sessionStorage.setItem('flowai_design', JSON.stringify(res));
        setPhaseStatus('passed');
        setPhaseReport({ status: 'SUCCESS', phase: PHASE, validated: true, checks_passed: checks, next_phase: 'Phase 4 — Build Engine' });
      }
    } catch (error) {
      const errorMsg = error?.message || String(error);
      setPhaseStatus('failed');
      setPhaseReport({ status: 'FAILED', phase: PHASE, step: 'Design Generation', error: errorMsg, root_cause: 'API failure', fix_recommendation: 'Check API and retry', next_action: 'Fix error → re-run Phase 3' });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Layers className="h-7 w-7 text-primary" />
              Design Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Phase 3 — UX, Features, Architecture & API design</p>
          </div>
          {phaseStatus && (
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              phaseStatus === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
              phaseStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400 animate-pulse'
            }`}>
              {phaseStatus === 'running' ? '⚙ Running...' : phaseStatus === 'passed' ? '✓ Phase 3 Complete' : '✗ Phase 3 Failed'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-4 text-[10px] text-muted-foreground">
          {['Audit', 'Research', 'Design', 'Build', 'Pipeline'].map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded ${i === 2 ? 'bg-primary text-primary-foreground font-semibold' : 'bg-secondary/50'}`}>{p}</span>
              {i < 4 && <ArrowRight className="h-2.5 w-2.5" />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Input */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-6 space-y-4"
      >
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Research Context / Product Description</Label>
          <textarea
            value={researchContext}
            onChange={e => setResearchContext(e.target.value)}
            placeholder="Paste research output or describe your product idea..."
            className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
        <div className="flex gap-3 items-center">
          <Button className="gap-2" onClick={handleDesign} disabled={loading || !researchContext.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
            {loading ? currentStep || 'Designing...' : 'Generate Design'}
          </Button>
          {design && (
            <Button variant="outline" className="gap-2" onClick={() => { sessionStorage.setItem('flowai_design', JSON.stringify(design)); window.location.href = '/build'; }}>
              Send to Build <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Results — 4 sections required */}
      <AnimatePresence>
        {design && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {design.product_name && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                <p className="text-xl font-bold text-foreground">{design.product_name}</p>
                {design.tagline && <p className="text-sm text-muted-foreground mt-1">{design.tagline}</p>}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DesignSection icon={Layout} title="UX Flows" items={design.ux_flows} color="text-blue-400" />
              <DesignSection icon={List} title="Features" items={design.features} color="text-emerald-400" />
              <DesignSection icon={Cpu} title="Architecture Blocks" items={design.architecture_blocks} color="text-purple-400" />
              <DesignSection icon={Plug} title="API Endpoints" items={design.api_endpoints} color="text-amber-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Phase Report */}
      <AnimatePresence>
        {phaseReport && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg border p-4 text-xs font-mono space-y-2 ${
              phaseReport.status === 'SUCCESS' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {phaseReport.status === 'SUCCESS'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : <AlertCircle className="h-4 w-4 text-red-400" />}
              <span className={`font-bold ${phaseReport.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
                {phaseReport.status === 'SUCCESS' ? 'PHASE 3 COMPLETE — Design Engine Active' : 'PHASE 3 FAILED — Auto-Stop'}
              </span>
            </div>
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(phaseReport, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !design && !phaseReport && (
        <div className="text-center py-16">
          <Layers className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Enter product context to generate design artifacts</p>
        </div>
      )}
    </div>
  );
}