import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ManualTracker from '@/components/operations/ManualTracker';
import SessionInputPanel from '@/components/operations/SessionInputPanel';
import StepResultPanel from '@/components/operations/StepResultPanel';
import SessionContextBanner from '@/components/operations/SessionContextBanner';
import { STEPS, buildStepPrompt, fetchPageContext, researchViaApi, invokeLlmViaApi } from '@/lib/operationsEngine';
import SelfRenewalEngine from '@/components/operations/SelfRenewalEngine';
import { logAction } from '@/lib/auditLogger';
import {
  CheckCircle2, Loader2, MessageCircle, Zap, ChevronRight,
  Play, RotateCcw, AlertCircle, ChevronLeft, ChevronDown, ChevronUp
} from 'lucide-react';

const STEP_ORDER = STEPS.map(s => s.key);

// Manual step tools list
const STEP_TOOLS = {
  research:  ['Market Intelligence', 'Tool Intelligence', 'Competitive Analysis', 'FlowAI Research'],
  design:    ['Flow Designer', 'Templates', 'Project Templates', 'Variables'],
  build:     ['Build Engine', 'Pipeline', 'Run Flow', 'AI Feedback'],
  qa_audit:  ['QA Audit page', 'Manual URL entry and audit controls', 'AI Scoring'],
  deploy:    ['Domain Manager', 'Architecture', 'Environments', 'Clearance Protocol'],
  govern:    ['Self-Renewal Engine', 'Governance Center', 'Self-Test', 'Self-Heal'],
  gtm:       ['Demo Builder', 'Investor Hub', 'GTM Assets', 'Brand Identity', 'Clearance Protocol', 'App Store Distribution'],
  monitor:   ['Live Monitor', 'Analytics', 'Activity Log', 'Run History'],
};

export default function ManualStep() {
  const { step: stepSlug } = useParams();
  const navigate = useNavigate();
  const stepIndex = STEP_ORDER.indexOf(stepSlug) >= 0 ? STEP_ORDER.indexOf(stepSlug) : 0;
  const stepMeta = STEPS[stepIndex] || STEPS[0];

  const [session, setSession] = useState(null);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [showInputPanel, setShowInputPanel] = useState(false);

  // AI assist state
  const [aiRunning, setAiRunning] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [showAiPanel, setShowAiPanel] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Check sessionStorage for config from Workspace
      let storedConfig = null;
      try { storedConfig = JSON.parse(sessionStorage.getItem('flowai_session_config') || 'null'); } catch {}

      const sessions = await base44.entities.ManualSession.filter({ overall_status: 'in_progress' }, '-last_active_at', 1).catch(() => []);
      if (sessions[0]) {
        setSession(sessions[0]);
        setNotes(sessions[0].step_notes?.[stepSlug] || '');
        if (sessions[0].step_notes?.sessionConfig) {
          try { setSessionConfig(JSON.parse(sessions[0].step_notes.sessionConfig || '{}')); } catch {}
        }
        setLoading(false);
      } else if (storedConfig?.inputs?.length > 0 && storedConfig.inputs[0]?.value?.trim()) {
        // Auto-start from Workspace config — skip input panel
        setSessionConfig(storedConfig);
        const now = new Date().toISOString();
        const newSession = await base44.entities.ManualSession.create({
          product_name: storedConfig.inputs.map(i => i.name).join(' + '),
          current_step: stepIndex + 1,
          overall_status: 'in_progress',
          step_statuses: { [stepSlug]: 'in_progress' },
          step_notes: { sessionConfig: JSON.stringify(storedConfig) },
          step_started_at: { [stepSlug]: now },
          step_completed_at: {},
          started_at: now,
          last_active_at: now,
        });
        setSession(newSession);
        setShowInputPanel(false);
        setLoading(false);
      } else {
        setShowInputPanel(true);
        setLoading(false);
      }
    };
    load();
  }, [stepSlug]);

  const startSession = async (config) => {
    setSessionConfig(config);
    const now = new Date().toISOString();
    const newSession = await base44.entities.ManualSession.create({
      product_name: config.inputs.map(i => i.name).join(' + '),
      current_step: stepIndex + 1,
      overall_status: 'in_progress',
      step_statuses: { [stepSlug]: 'in_progress' },
      step_notes: { sessionConfig: JSON.stringify(config) },
      step_started_at: { [stepSlug]: now },
      step_completed_at: {},
      started_at: now,
      last_active_at: now,
    });
    setSession(newSession);
    setShowInputPanel(false);
  };

  const requestAiAssist = async () => {
    const cfg = sessionConfig;
    if (!cfg) return;
    setAiRunning(true);
    setAiResult(null);
    setAiError(null);
    setShowAiPanel(true);
    try {
      const inp = cfg.inputs[0];

      // ── Research step: prefer Vercel-side /api/research-url when available ──
      // On Vercel, base44.integrations.Core.InvokeLLM has no backend and 404s.
      // /api/research-url runs Browserless + Claude server-side and returns
      // { ok: true, analysis: <brief text>, page: {...}, ... } on success.
      // researchViaApi returns null on any non-success; we then fall through
      // to the existing InvokeLLM path so Base44 deployments keep working.
      let usedResearchApi = false;
      if (stepMeta.key === 'research' && inp?.type === 'url') {
        const apiResult = await researchViaApi(inp.value, cfg.objective, session?.id);
        if (apiResult && typeof apiResult.analysis === 'string' && apiResult.analysis.length > 0) {
          const output = apiResult.analysis;
          setAiResult({
            full_output: output,
            summary: output.slice(0, 120).replace(/\n/g, ' '),
            _researchSource: 'api',
          });
          usedResearchApi = true;
        }
      }

      if (!usedResearchApi) {
        const pageContext = await fetchPageContext(inp, base44);
        const prompt = buildStepPrompt(stepMeta.key, inp, cfg.multiMode, cfg.inputs, pageContext, cfg.objective);
        // API-first via /api/llm-step; fall back to base44 InvokeLLM on null.
        let output = await invokeLlmViaApi(prompt, { sessionId: session?.id, endpoint: `/api/llm-step:${stepMeta.key}` });
        if (!output) {
          const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
          output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
        }
        setAiResult({ full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') });
      }
    } catch (e) {
      setAiError(e.message);
    }
    setAiRunning(false);
  };

  const markComplete = async () => {
    if (!session) return;
    setMarking(true);
    const now = new Date().toISOString();
    const updatedStatuses = { ...(session.step_statuses || {}), [stepSlug]: 'complete' };
    const updatedCompleted = { ...(session.step_completed_at || {}), [stepSlug]: now };
    const updatedNotes = { ...(session.step_notes || {}), [stepSlug]: notes };
    const updated = await base44.entities.ManualSession.update(session.id, {
      step_statuses: updatedStatuses,
      step_completed_at: updatedCompleted,
      step_notes: updatedNotes,
      last_active_at: now,
      overall_status: stepIndex === STEPS.length - 1 ? 'complete' : 'in_progress',
    });
    setSession(updated);
    setMarking(false);
    logAction({ actionType: 'step_completed', stepName: stepMeta.label, sessionId: updated?.id || session?.id || '', productUrl: sessionConfig?.inputs?.[0]?.value || '', outcome: 'complete', mode: 'manual' });
  };

  const currentStatus = session?.step_statuses?.[stepSlug];
  const isComplete = currentStatus === 'complete';
  const prevStep = STEPS[stepIndex - 1];
  const nextStep = STEPS[stepIndex + 1];
  const tools = STEP_TOOLS[stepMeta.key] || [];

  if (loading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        {session && <SessionContextBanner config={sessionConfig} />}
        {session && <ManualTracker session={session} currentStepKey={stepSlug} onMarkComplete={markComplete} onMarkInProgress={() => {}} />}

        {/* Input panel */}
        {showInputPanel && (
          <div className="space-y-3">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-bold text-amber-400 mb-1">Start a Manual Session</p>
              <p className="text-xs text-muted-foreground">You drive execution. FlowAI provides AI analysis on demand at each step.</p>
            </div>
            <SessionInputPanel onStart={startSession} />
          </div>
        )}

        {session && !showInputPanel && (
          <>
            {/* Step header */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">Step {stepIndex + 1} of 8</span>
                    <h2 className="text-lg font-bold text-foreground">{stepMeta.label}</h2>
                    {isComplete && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  </div>
                  {sessionConfig && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {sessionConfig.inputs.map(i => `${i.name}: ${i.value.slice(0, 40)}`).join(' · ')}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">{stepMeta.desc}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => navigate(`/guided/${stepMeta.key}`)}>
                  <Zap className="h-3 w-3" /> Switch to Guided
                </Button>
              </div>

              {/* Available tools */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Tools available for this step:</p>
                <div className="flex flex-wrap gap-1.5">
                  {tools.map(tool => (
                    <span key={tool} className="text-[10px] px-2 py-0.5 rounded border border-border bg-secondary/30 text-muted-foreground">{tool}</span>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Your notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setNotes(prev => prev + t); }}
                  placeholder={`Notes on your ${stepMeta.label} work…`}
                  className="w-full h-16 text-[11px] bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
              </div>
            </div>

            {/* AI Assist panel */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">FlowAI Analysis — {stepMeta.label}</p>
                </div>
                <div className="flex gap-2">
                  {!aiRunning && (
                    <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={requestAiAssist}>
                      <Play className="h-3 w-3" /> Get AI Analysis
                    </Button>
                  )}
                  {aiResult && (
                    <button onClick={() => setShowAiPanel(v => !v)} className="text-muted-foreground hover:text-foreground">
                      {showAiPanel ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Ask FlowAI to analyze your input for this step. Results appear inline — no redirect required.
              </p>

              {aiRunning && (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground">Analyzing…</span>
                </div>
              )}

              {aiError && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <div>
                    <p className="text-xs text-red-400">{aiError}</p>
                    <button onClick={requestAiAssist} className="text-[10px] text-primary flex items-center gap-1 mt-1">
                      <RotateCcw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence>
                {showAiPanel && aiResult && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    {stepMeta.key === 'govern' && sessionConfig?.inputs?.[0] ? (
                      <SelfRenewalEngine
                        input={sessionConfig.inputs[0]}
                        pageContext={null}
                        objective={sessionConfig?.objective}
                        onComplete={markComplete}
                      />
                    ) : (
                      <StepResultPanel stepLabel={stepMeta.label} result={aiResult} />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                {prevStep && (
                  <Button variant="outline" size="sm" className="gap-1 h-8 text-xs" onClick={() => navigate(`/manual/${prevStep.key}`)}>
                    <ChevronLeft className="h-3 w-3" /> {prevStep.label}
                  </Button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {!isComplete && (
                  <Button size="sm" className="gap-1.5 h-9 text-xs" onClick={markComplete} disabled={marking}>
                    {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Mark Complete
                  </Button>
                )}
                {isComplete && nextStep && (
                  <Button size="sm" className="gap-1.5 h-9 text-xs" onClick={() => navigate(`/manual/${nextStep.key}`)}>
                    {nextStep.label} <ChevronRight className="h-3 w-3" />
                  </Button>
                )}
                {isComplete && !nextStep && (
                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="h-4 w-4" /> All steps complete
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}