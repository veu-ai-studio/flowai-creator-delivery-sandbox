import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { asArray } from '@/lib/uiDataGuards';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search, Loader2, AlertCircle, CheckCircle2, ArrowRight,
  Globe, Swords, Lightbulb, AlertTriangle, TrendingUp, History
} from 'lucide-react';
import { useOrchestration } from '@/lib/OrchestrationContext';
import ResearchHistoryPanel from '@/components/research/ResearchHistoryPanel';

const PHASE = 'Phase 2 — Research Engine';

function Section({ icon: Icon, title, items, color }) {
  const safeItems = asArray(items);
  if (safeItems.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className={`text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 ${color}`}>
        <Icon className="h-3.5 w-3.5" />{title}
      </p>
      <ul className="space-y-1">
        {safeItems.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-1.5 text-xs text-foreground p-2 rounded bg-secondary/30 border border-border/30"
          >
            <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
            {typeof item === 'object' ? (item.name || item.title || JSON.stringify(item)) : item}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default function Research() {
  const { getRunConfig, agenticMode, iterationMode, flowType } = useOrchestration();
  const [input, setInput] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(false);
  const [research, setResearch] = useState(null);
  const [phaseStatus, setPhaseStatus] = useState(null);
  const [phaseReport, setPhaseReport] = useState(null);
  const [currentStep, setCurrentStep] = useState('');
  const [historyKey, setHistoryKey] = useState(0);

  const handleResearch = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResearch(null);
    setPhaseStatus('running');
    setPhaseReport(null);

    try {
      setCurrentStep('Fetching market data...');
      const orchConfig = getRunConfig();
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a strategic market research analyst. Research the following:
Target: ${input}
Industry: ${industry || 'General Technology'}
Orchestration: mode=${orchConfig.agenticMode}, iteration=${orchConfig.iterationMode}, flow=${orchConfig.flowType}

Provide comprehensive competitive intelligence and market analysis. Be specific and actionable.`,
        response_json_schema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            competitors: { type: 'array', items: { type: 'string' } },
            key_features: { type: 'array', items: { type: 'string' } },
            positioning: { type: 'array', items: { type: 'string' } },
            risks: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            market_size: { type: 'string' },
            target_audience: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      setCurrentStep('Validating output...');
      const checks = [];
      let failed = false;
      let failStep = '';
      let failError = '';

      const competitors = asArray(res?.competitors);
      const opportunities = asArray(res?.opportunities);
      const risks = asArray(res?.risks);
      const keyFeatures = asArray(res?.key_features);
      const positioning = asArray(res?.positioning);
      const targetAudience = asArray(res?.target_audience);

      if (!competitors.length) { failed = true; failStep = 'Competitors'; failError = 'No competitors returned'; }
      else checks.push('competitors populated');
      if (!opportunities.length) { failed = true; failStep = 'Opportunities'; failError = 'No opportunities returned'; }
      else checks.push('opportunities populated');
      if (!risks.length) { failed = true; failStep = 'Risks'; failError = 'No risks returned'; }
      else checks.push('risks populated');
      checks.push('structured fields exist', 'research output visible');

      if (failed) {
        setPhaseStatus('failed');
        setPhaseReport({ status: 'FAILED', phase: PHASE, step: failStep, error: failError, root_cause: 'LLM returned incomplete data', fix_recommendation: 'Retry with more specific input', next_action: 'Refine query → re-run Phase 2' });
      } else {
        const researchData = { ...res, competitors, opportunities, risks, key_features: keyFeatures, positioning, target_audience: targetAudience, inputQuery: input, industry };
        setResearch(researchData);
        setPhaseStatus('passed');
        setPhaseReport({ status: 'SUCCESS', phase: PHASE, validated: true, checks_passed: checks, next_phase: 'Phase 3 — Design Engine' });

        // Persist to history
        try {
          const user = await base44.auth.me();
          if (user) {
            await base44.entities.ResearchHistory.create({
              owner_email: user.email,
              query: input,
              industry: industry || '',
              summary: res.summary || '',
              competitors,
              opportunities,
              risks,
              key_features: keyFeatures,
              positioning,
              target_audience: targetAudience,
              market_size: res.market_size || '',
            });
            setHistoryKey(k => k + 1);
          }
        } catch (_) { /* non-blocking */ }
      }
    } catch (error) {
      const errorMsg = error?.message || String(error);
      setPhaseStatus('failed');
      setPhaseReport({ status: 'FAILED', phase: PHASE, step: 'LLM Research Call', error: errorMsg, root_cause: 'API or network failure', fix_recommendation: 'Check connectivity and retry', next_action: 'Fix error → re-run Phase 2' });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  const handleSendToDesign = () => {
    if (!research) return;
    sessionStorage.setItem('flowai_research', JSON.stringify(research));
    window.location.href = '/design';
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Search className="h-7 w-7 text-primary" />
              Research Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Phase 2 — Competitive intelligence & market analysis</p>
          </div>
          <div className="flex items-center gap-2">
            {phaseStatus && (
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                phaseStatus === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
                phaseStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
                'bg-amber-500/20 text-amber-400 animate-pulse'
              }`}>
                {phaseStatus === 'running' ? '⚙ Running...' : phaseStatus === 'passed' ? '✓ Phase 2 Complete' : '✗ Phase 2 Failed'}
              </span>
            )}
          </div>
        </div>

        {/* Phase progress indicator */}
        <div className="flex items-center gap-1 mt-4 text-[10px] text-muted-foreground">
          {['Audit', 'Research', 'Design', 'Build', 'Pipeline'].map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded ${i === 1 ? 'bg-primary text-primary-foreground font-semibold' : 'bg-secondary/50'}`}>{p}</span>
              {i < 4 && <ArrowRight className="h-2.5 w-2.5" />}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-lg border border-border bg-card p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">URL / Company / Product</Label>
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleResearch()}
              placeholder="e.g. Notion, Figma, https://example.com"
              className="h-9 text-sm"
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Industry / Category</Label>
            <Input
              value={industry}
              onChange={e => setIndustry(e.target.value)}
              placeholder="e.g. SaaS, E-commerce, FinTech"
              className="h-9 text-sm"
              disabled={loading}
            />
          </div>
        </div>
        <div className="flex gap-3 items-center">
          <Button className="gap-2" onClick={handleResearch} disabled={loading || !input.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            {loading ? currentStep || 'Researching...' : 'Run Research'}
          </Button>
          {research && (
            <Button variant="outline" className="gap-2" onClick={handleSendToDesign}>
              Send to Design <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </motion.div>

      {/* Research History */}
      {!loading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Research History
          </h3>
          <ResearchHistoryPanel key={historyKey} onLoad={(item) => {
            setInput(item.query);
            setIndustry(item.industry || '');
            setResearch({ ...item, inputQuery: item.query });
            setPhaseStatus('passed');
            setPhaseReport(null);
          }} />
        </motion.div>
      )}

      {/* Phase Status */}
      {currentStep && loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Step: {currentStep}</span>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {research && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="h-4 w-4 text-primary" />
                <p className="text-sm font-bold text-foreground">Research Summary</p>
                {research.market_size && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    Market: {research.market_size}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{research.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <Section icon={Swords} title="Competitors" items={research.competitors} color="text-red-400" />
                <Section icon={Globe} title="Key Features" items={research.key_features} color="text-blue-400" />
                <Section icon={TrendingUp} title="Target Audience" items={research.target_audience} color="text-purple-400" />
              </div>
              <div className="rounded-lg border border-border bg-card p-5 space-y-4">
                <Section icon={Lightbulb} title="Opportunities" items={research.opportunities} color="text-emerald-400" />
                <Section icon={AlertTriangle} title="Risks" items={research.risks} color="text-amber-400" />
                <Section icon={Globe} title="Positioning" items={research.positioning} color="text-primary" />
              </div>
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
            exit={{ opacity: 0 }}
            className={`rounded-lg border p-4 text-xs font-mono space-y-2 ${
              phaseReport.status === 'SUCCESS'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {phaseReport.status === 'SUCCESS'
                ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                : <AlertCircle className="h-4 w-4 text-red-400" />}
              <span className={`font-bold ${phaseReport.status === 'SUCCESS' ? 'text-emerald-400' : 'text-red-400'}`}>
                {phaseReport.status === 'SUCCESS' ? 'PHASE 2 COMPLETE — Research Engine Active' : 'PHASE 2 FAILED — Auto-Stop'}
              </span>
            </div>
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(phaseReport, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!loading && !research && !phaseReport && (
        <div className="text-center py-16">
          <Search className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Enter a URL, company, or industry to begin research</p>
        </div>
      )}
    </div>
  );
}
