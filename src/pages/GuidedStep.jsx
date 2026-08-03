import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import ProcessBar from '@/components/operations/ProcessBar';
import SessionInputPanel from '@/components/operations/SessionInputPanel';
import StepResultPanel from '@/components/operations/StepResultPanel';
import FinalReport from '@/components/operations/FinalReport';
import SessionContextBanner from '@/components/operations/SessionContextBanner';
import FetchFailurePrompt from '@/components/operations/FetchFailurePrompt';
import { STEPS, buildStepPrompt, buildProposalPrompt, buildFinalReportPrompt, fetchPageContext, runCrawl, researchViaApi, invokeLlmViaApi } from '@/lib/operationsEngine';
import SelfRenewalEngine from '@/components/operations/SelfRenewalEngine';
import { logAction } from '@/lib/auditLogger';
import {
  ChevronLeft, Zap, Wrench, CheckCircle2,
  Loader2, RotateCcw, AlertCircle, Edit3, Mic, MicOff,
  Play, SkipForward, ThumbsUp, FileEdit
} from 'lucide-react';

const STEP_ORDER = STEPS.map(s => s.key);
const GUIDED_SESSION_LOAD_TIMEOUT_MS = 8000;

function withGuidedSessionTimeout(promise, timeoutMs = GUIDED_SESSION_LOAD_TIMEOUT_MS) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('guided_session_load_timeout')), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ─── SPEECH SUPPORT ───────────────────────────────────────────────────────────
const SPEECH_SUPPORTED = typeof window !== 'undefined' &&
  !!(window.SpeechRecognition || window.webkitSpeechRecognition);

// ─── PROPOSAL DISPLAY ─────────────────────────────────────────────────────────
function ProposalCard({ proposal }) {
  // Parse structured proposal into sections for clean rendering
  const sections = [];
  const lines = proposal.split('\n');
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(TOPIC|QUESTIONS I WILL INVESTIGATE|APPROACH|OUTPUT FORMAT):?$/i.test(trimmed)) {
      if (current) sections.push(current);
      current = { heading: trimmed.replace(/:$/, ''), lines: [] };
    } else if (current) {
      current.lines.push(trimmed);
    } else {
      // pre-header content
      if (!sections.find(s => s.heading === '')) sections.push({ heading: '', lines: [] });
      sections[sections.length - 1]?.lines.push(trimmed);
    }
  }
  if (current) sections.push(current);

  if (sections.length < 2) {
    // Fallback: just render the raw text
    return (
      <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
        {proposal}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.filter(s => s.lines.length > 0).map((s, i) => (
        <div key={i}>
          {s.heading && (
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1.5">{s.heading}</p>
          )}
          <div className="space-y-1">
            {s.lines.map((l, j) => (
              <p key={j} className="text-xs text-foreground leading-relaxed">{l}</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function GuidedStep() {
  const { step: stepSlug } = useParams();
  const navigate = useNavigate();
  const stepIndex = STEP_ORDER.indexOf(stepSlug) >= 0 ? STEP_ORDER.indexOf(stepSlug) : 0;
  const stepMeta = STEPS[stepIndex] || STEPS[0];

  const [session, setSession] = useState(null);
  const [sessionConfig, setSessionConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoadWarning, setSessionLoadWarning] = useState(null);
  const [showInputPanel, setShowInputPanel] = useState(false);

  // ── Phase state ──
  // 'propose' | 'awaiting_approval' | 'modifying' | 'executing' | 'findings' | 'complete'
  const [phase, setPhase] = useState('propose');
  const [proposal, setProposal] = useState(null);
  const [proposalLoading, setProposalLoading] = useState(false);
  const [proposalError, setProposalError] = useState(null);

  const [modifyText, setModifyText] = useState('');
  const [modifyListening, setModifyListening] = useState(false);
  const recognitionRef = useRef(null);

  const [stepResult, setStepResult] = useState(/** @type {any} */ (null));
  const [compareResults, setCompareResults] = useState(null);
  const [stepRunning, setStepRunning] = useState(false);
  const [stepError, setStepError] = useState(null);
  const [fetchFailures, setFetchFailures] = useState([]);

  const [modifyFindingsText, setModifyFindingsText] = useState('');
  const [showModifyFindings, setShowModifyFindings] = useState(false);
  const [modifyFindingsLoading, setModifyFindingsLoading] = useState(false);

  const [allStepResults, setAllStepResults] = useState({});
  const [showFinalReport, setShowFinalReport] = useState(false);
  const [pageContexts, setPageContexts] = useState(null); // cached after first fetch
  const [crawlStatus, setCrawlStatus] = useState(null); // {state, url, pages, issues}

  // Load or create session — check sessionStorage first (set by Workspace / LandingPage)
  useEffect(() => {
    const load = async () => {
      // Check sessionStorage for config from Workspace
      let storedConfig = null;
      try { storedConfig = JSON.parse(sessionStorage.getItem('flowai_session_config') || 'null'); } catch {}

      const sessions = await withGuidedSessionTimeout(base44.entities.GuidedSession.filter(
        { overall_status: 'in_progress' }, '-last_active_at', 1
      ).catch(() => []));
      const candidate = sessions[0];
      const stepAlreadyComplete = candidate?.step_statuses?.[stepSlug] === 'complete';
      const hasConfig = !!candidate?.mode_switches?.sessionConfig;

      if (candidate && !stepAlreadyComplete && hasConfig) {
        setSession(candidate);
        setSessionConfig(candidate.mode_switches.sessionConfig);
        if (candidate.step_notes) {
          const restored = {};
          Object.entries(candidate.step_notes).forEach(([k, v]) => {
            if (v && v.startsWith('__RESULT__')) {
              try { restored[k] = JSON.parse(v.slice(10)); } catch {}
            }
          });
          setAllStepResults(restored);
        }
        setPhase('propose');
        setLoading(false);
      } else if (storedConfig?.inputs?.length > 0 && storedConfig.inputs[0]?.value?.trim()) {
        // Auto-start from Workspace config — skip input panel
        setSessionConfig(storedConfig);
        const now = new Date().toISOString();
        const newSession = await withGuidedSessionTimeout(base44.entities.GuidedSession.create({
          product_name: storedConfig.inputs.map(i => i.name).join(' + '),
          current_step: stepIndex + 1,
          overall_status: 'in_progress',
          step_statuses: {},
          step_notes: {},
          step_started_at: { [stepSlug]: now },
          step_completed_at: {},
          mode_switches: { sessionConfig: storedConfig },
          started_at: now,
          last_active_at: now,
        }));
        setSession(newSession);
        setShowInputPanel(false);
        setPhase('propose');
        setLoading(false);
      } else {
        setShowInputPanel(true);
        setLoading(false);
      }
    };
    load().catch((error) => {
      setSession(null);
      setSessionConfig(null);
      setShowInputPanel(true);
      setPhase('propose');
      setSessionLoadWarning(error?.message === 'guided_session_load_timeout'
        ? 'Guided session service timed out. Start a new session or retry.'
        : 'Guided session service is unavailable. Start a new session or retry.');
      setLoading(false);
    });
  }, [stepSlug]);

  // ── Start session from input panel ──
  const startSession = async (config) => {
    setSessionConfig(config);
    const now = new Date().toISOString();
    const newSession = await base44.entities.GuidedSession.create({
      product_name: config.inputs.map(i => i.name).join(' + '),
      current_step: stepIndex + 1,
      overall_status: 'in_progress',
      step_statuses: {},
      step_notes: {},
      step_started_at: { [stepSlug]: now },
      step_completed_at: {},
      mode_switches: { sessionConfig: config },
      started_at: now,
      last_active_at: now,
    });
    setSession(newSession);
    setShowInputPanel(false);
    setPhase('propose');
  };

  // ── Phase 1: Generate proposal ──
  const generateProposal = async (modification = null) => {
    const cfg = sessionConfig;
    if (!cfg) return;
    setProposalLoading(true);
    setProposalError(null);
    setProposal(null);

    try {
      // Fetch page contexts if not cached
      let contexts = pageContexts;
      if (!contexts) {
        contexts = await Promise.all(cfg.inputs.map(inp => fetchPageContext(inp, base44)));
        setPageContexts(contexts);
      }

      // Check for fetch failure on primary input
      if (contexts[0]?.fetchFailed && cfg.inputs[0].type === 'url') {
        setFetchFailures([{ inputId: cfg.inputs[0].id, url: cfg.inputs[0].value, reason: contexts[0].reason }]);
        setProposalLoading(false);
        return;
      }
      setFetchFailures([]);

      const prompt = buildProposalPrompt(
        stepMeta.key,
        cfg.inputs[0],
        contexts[0],
        cfg.objective,
        modification || null
      );
      // API-first via /api/llm-step; fall back to base44 InvokeLLM on null.
      let text = await invokeLlmViaApi(prompt, { sessionId: session?.id, endpoint: `/api/llm-step:propose:${stepMeta.key}` });
      if (!text) {
        const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
        text = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      }
      setProposal(text);
      setPhase('awaiting_approval');
      logAction({ actionType: modification ? 'proposal_modified' : 'proposal_approved', stepName: stepMeta.label, sessionId: session?.id || '', productUrl: cfg.inputs[0]?.value || '', mode: 'guided' });
    } catch (e) {
      setProposalError(e.message);
    }
    setProposalLoading(false);
  };

  // ── Phase 2: User clicks Modify ──
  const openModify = () => {
    setModifyText('');
    setPhase('modifying');
  };

  const submitModification = async () => {
    if (!modifyText.trim()) return;
    setPhase('propose');
    await generateProposal(modifyText.trim());
    setModifyText('');
  };

  // ── Phase 2: Voice for modification ──
  const toggleModifyVoice = () => {
    if (modifyListening) {
      recognitionRef.current?.stop();
      setModifyListening(false);
      return;
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.continuous = false;
    r.interimResults = false;
    r.lang = 'en-US';
    r.onresult = (e) => setModifyText(prev => prev ? prev + ' ' + e.results[0][0].transcript : e.results[0][0].transcript);
    r.onend = () => setModifyListening(false);
    r.onerror = () => setModifyListening(false);
    recognitionRef.current = r;
    r.start();
    setModifyListening(true);
  };

  // ── Phase 2: User clicks Skip ──
  const skipStep = async () => {
    logAction({ actionType: 'proposal_skipped', stepName: stepMeta.label, sessionId: session?.id || '', productUrl: sessionConfig?.inputs[0]?.value || '', mode: 'guided' });
    if (!session) return;
    const now = new Date().toISOString();
    const nextStep = STEPS[stepIndex + 1];
    const updated = await base44.entities.GuidedSession.update(session.id, {
      step_statuses: { ...(session.step_statuses || {}), [stepMeta.key]: 'skipped' },
      step_completed_at: { ...(session.step_completed_at || {}), [stepMeta.key]: now },
      current_step: stepIndex + 2,
      last_active_at: now,
      overall_status: stepIndex === STEPS.length - 1 ? 'complete' : 'in_progress',
    });
    setSession(updated);
    if (nextStep) navigate(`/guided/${nextStep.key}`);
    else setShowFinalReport(true);
  };

  // ── Phase 3: Execute after Approve ──
  const executeStep = async () => {
    const cfg = sessionConfig;
    if (!cfg) return;
    setStepRunning(true);
    setStepResult(null);
    setCompareResults(null);
    setStepError(null);
    setPhase('executing');

    const { inputs, multiMode, objective } = cfg;
    const isMulti = inputs.length > 1 && multiMode;
    const isLastStep = stepIndex === STEPS.length - 1;

    try {
      let result = null;
      let cResults = null;
      const contexts = pageContexts || await Promise.all(inputs.map(inp => fetchPageContext(inp, base44)));
      if (!pageContexts) setPageContexts(contexts);

      if (isLastStep && isMulti) {
        const allInputStepResults = inputs.map(() => {
          const obj = {};
          STEPS.forEach(s => { obj[s.key] = allStepResults[s.key]; });
          return obj;
        });
        const prompt = buildFinalReportPrompt(multiMode, inputs, allInputStepResults);
        // API-first via /api/llm-step; fall back to base44 InvokeLLM on null.
        let output = await invokeLlmViaApi(prompt, { sessionId: session?.id, endpoint: '/api/llm-step:final' });
        if (!output) {
          const res = await base44.integrations.Core.InvokeLLM({ prompt });
          output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
        }
        result = { full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') };
      } else if (isMulti) {
        const perInputResults = await Promise.all(
          inputs.map(async (inp, idx) => {
            const prompt = buildStepPrompt(stepMeta.key, inp, multiMode, inputs, contexts[idx], objective);
            // API-first via /api/llm-step; fall back to base44 InvokeLLM on null.
            let output = await invokeLlmViaApi(prompt, { sessionId: session?.id, endpoint: `/api/llm-step:${stepMeta.key}` });
            if (!output) {
              const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
              output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
            }
            return { inputName: inp.name, full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') };
          })
        );
        cResults = perInputResults;
        result = { full_output: perInputResults[0]?.full_output || '', summary: `${inputs.length} inputs analyzed`, compareResults: perInputResults };
      } else {
        const inp = inputs[0];

        // ── Research step: prefer Vercel-side /api/research-url when available ──
        // On Vercel, base44.integrations.Core.InvokeLLM has no backend and 404s.
        // /api/research-url runs Browserless + Claude server-side and returns
        // { ok: true, analysis: <brief text>, page: {...}, ... } on success.
        // researchViaApi returns null on any non-success; we then fall through
        // to the existing InvokeLLM path so Base44 deployments keep working.
        let usedResearchApi = false;
        if (stepMeta.key === 'research' && inp.type === 'url') {
          const apiResult = await researchViaApi(inp.value, objective, session?.id);
          if (apiResult && typeof apiResult.analysis === 'string' && apiResult.analysis.length > 0) {
            const output = apiResult.analysis;
            result = {
              full_output: output,
              summary: output.slice(0, 120).replace(/\n/g, ' '),
              _researchSource: 'api',
            };
            usedResearchApi = true;
          }
        }

        if (!usedResearchApi) {
          // ── Playwright crawl for Build (step 3) and QA Audit (step 4) ──
          let crawlCtx = null;
          if ((stepMeta.key === 'build' || stepMeta.key === 'qa_audit') && inp.type === 'url') {
            const captureScreenshots = stepMeta.key === 'qa_audit';
            setCrawlStatus({ state: 'crawling', url: inp.value, pages: 0, issues: 0 });
            const crawlResult = await runCrawl(inp.value, { capture_screenshots: captureScreenshots, credentials: inp.credentials || null });
            if (crawlResult.success) {
              const d = crawlResult.data;
              const pagesCount = d?.summary?.total_pages_crawled ?? 0;
              const issuesCount = (d?.issues_found?.length ?? 0) + (d?.broken_links?.length ?? 0) + (d?.rendering_errors?.length ?? 0);
              setCrawlStatus({ state: 'done', url: inp.value, pages: pagesCount, issues: issuesCount });
              crawlCtx = `\n━━━ REAL PLAYWRIGHT CRAWL DATA — USE AS PRIMARY EVIDENCE ━━━
Pages crawled: ${pagesCount}
Links tested: ${d?.summary?.total_links_tested ?? 'N/A'}
Broken links: ${JSON.stringify(d?.broken_links ?? [])}
Rendering errors: ${JSON.stringify(d?.rendering_errors ?? [])}
Performance metrics: ${JSON.stringify(d?.performance_metrics ?? {})}
Issues detected: ${JSON.stringify(d?.issues_found ?? [])}
Console errors: ${JSON.stringify(d?.console_errors ?? [])}
${captureScreenshots && d?.screenshots?.length ? `Screenshots captured: ${d.screenshots.length} pages` : ''}
━━━ END CRAWL DATA ━━━`;
              if (captureScreenshots && d?.screenshots) {
                result = result || {};
                /** @type {any} */ (result)._screenshots = d.screenshots;
              }
            } else {
              setCrawlStatus({ state: 'failed', url: inp.value });
              crawlCtx = `Crawl unavailable — ${crawlResult.reason}. Proceed with description-based analysis.`;
            }
          }
          const prompt = buildStepPrompt(stepMeta.key, inp, null, null, contexts[0], objective, crawlCtx);
          // API-first via /api/llm-step; fall back to base44 InvokeLLM on null.
          let output = await invokeLlmViaApi(prompt, { sessionId: session?.id, endpoint: `/api/llm-step:${stepMeta.key}` });
          if (!output) {
            const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'claude_sonnet_4_6' });
            output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
          }
          const screenshots = /** @type {any} */ (result)?._screenshots;
          result = /** @type {any} */ ({ full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') });
          if (screenshots) result._screenshots = screenshots;
        }
      }

      setStepResult(result);
      if (cResults) setCompareResults(cResults);
      const updatedResults = { ...allStepResults, [stepMeta.key]: result };
      setAllStepResults(updatedResults);
      setPhase('findings');

      // Persist
      if (session) {
        const updatedNotes = { ...(session.step_notes || {}), [stepMeta.key]: `__RESULT__${JSON.stringify(result)}` };
        await base44.entities.GuidedSession.update(session.id, {
          step_notes: updatedNotes,
          last_active_at: new Date().toISOString(),
        }).catch(() => {});
      }
    } catch (e) {
      setStepError(e.message);
      setPhase('awaiting_approval');
    }
    setStepRunning(false);
  };

  // ── Phase 4: Modify Findings ──
  const submitModifyFindings = async () => {
    if (!modifyFindingsText.trim() || !stepResult) return;
    setModifyFindingsLoading(true);
    const cfg = sessionConfig;
    try {
      const refinementPrompt = `The user has reviewed your findings for ${stepMeta.label} and requests the following refinement or expansion:

"${modifyFindingsText}"

Previous findings:
${stepResult.full_output}

Please revise and expand your findings incorporating the user's request. Maintain the same structured format and objective lens.`;
      // API-first via /api/llm-step; fall back to base44 InvokeLLM on null.
      let output = await invokeLlmViaApi(refinementPrompt, { sessionId: session?.id, endpoint: `/api/llm-step:refine:${stepMeta.key}` });
      if (!output) {
        const res = await base44.integrations.Core.InvokeLLM({ prompt: refinementPrompt, model: 'claude_sonnet_4_6' });
        output = typeof res === 'string' ? res : JSON.stringify(res, null, 2);
      }
      const revised = { full_output: output, summary: output.slice(0, 120).replace(/\n/g, ' ') };
      setStepResult(revised);
      const updatedResults = { ...allStepResults, [stepMeta.key]: revised };
      setAllStepResults(updatedResults);
      setShowModifyFindings(false);
      setModifyFindingsText('');
    } catch (e) {
      // keep existing result
    }
    setModifyFindingsLoading(false);
  };

  // ── Phase 4: Approve and Advance ──
  const approveAndAdvance = async () => {
    logAction({ actionType: 'findings_approved', stepName: stepMeta.label, sessionId: session?.id || '', productUrl: sessionConfig?.inputs?.[0]?.value || '', mode: 'guided' });
    if (!session) return;
    const now = new Date().toISOString();
    const nextStep = STEPS[stepIndex + 1];
    const updated = await base44.entities.GuidedSession.update(session.id, {
      step_statuses: { ...(session.step_statuses || {}), [stepMeta.key]: 'complete' },
      step_completed_at: { ...(session.step_completed_at || {}), [stepMeta.key]: now },
      current_step: stepIndex + 2,
      last_active_at: now,
      overall_status: stepIndex === STEPS.length - 1 ? 'complete' : 'in_progress',
    });
    setSession(updated);
    if (stepIndex === STEPS.length - 1) {
      setShowFinalReport(true);
    } else if (nextStep) {
      navigate(`/guided/${nextStep.key}`);
    }
  };

  const prevStep = STEPS[stepIndex - 1];
  const nextStep = STEPS[stepIndex + 1];

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-5">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <ProcessBar session={session} mode="guided" />

        {/* ── INPUT PANEL ── */}
        {showInputPanel && (
          <div className="space-y-3">
            {sessionLoadWarning && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                <p className="text-sm font-bold text-amber-400 mb-1">Guided session fallback</p>
                <p className="text-xs text-muted-foreground">{sessionLoadWarning}</p>
              </div>
            )}
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
              <p className="text-sm font-bold text-amber-400 mb-1">Start a Guided Session</p>
              <p className="text-xs text-muted-foreground">FlowAI will propose its approach at each step. You approve, modify, or skip before any execution begins.</p>
            </div>
            <SessionInputPanel onStart={startSession} />
          </div>
        )}

        {/* ── ACTIVE GUIDED SESSION ── */}
        {session && !showInputPanel && (
          <>
            <SessionContextBanner config={sessionConfig} />

            {/* Step header */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">Step {stepIndex + 1} of 8</span>
                  <h2 className="text-lg font-bold text-foreground">{stepMeta.label}</h2>
                  {session?.step_statuses?.[stepMeta.key] === 'complete' && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
                  {session?.step_statuses?.[stepMeta.key] === 'skipped' && <span className="text-[10px] text-muted-foreground border border-border rounded-full px-2 py-0.5">Skipped</span>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stepMeta.desc}</p>
              </div>
              <div className="flex gap-2 flex-wrap shrink-0">
                <Button size="sm" variant="ghost" className="gap-1 h-8 text-xs text-muted-foreground"
                  onClick={() => { setSession(null); setSessionConfig(null); setStepResult(null); setAllStepResults({}); setPageContexts(null); setShowInputPanel(true); setPhase('propose'); }}>
                  ↩ New Session
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => navigate('/auto-runner')}>
                  <Zap className="h-3 w-3" /> Switch to Auto
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => navigate(`/manual/${stepMeta.key}`)}>
                  <Wrench className="h-3 w-3" /> Switch to Manual
                </Button>
              </div>
            </div>

            {/* Fetch failure */}
            {fetchFailures.length > 0 && (
              <div className="space-y-3">
                {fetchFailures.map(f => (
                  <FetchFailurePrompt key={f.inputId} url={f.url} reason={f.reason}
                    onRetry={() => { setFetchFailures([]); setShowInputPanel(true); setSession(null); setSessionConfig(null); }}
                    onSwitchToDescription={() => { setFetchFailures([]); setShowInputPanel(true); setSession(null); setSessionConfig(null); }} />
                ))}
              </div>
            )}

            {/* ── PHASE 1 + 2: PROPOSE + AWAITING APPROVAL ── */}
            <AnimatePresence mode="wait">
              {(phase === 'propose' || phase === 'awaiting_approval' || phase === 'modifying') && fetchFailures.length === 0 && (
                <motion.div key="proposal-phase" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="space-y-4">

                  {/* Proposal panel */}
                  <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <p className="text-xs font-bold text-primary uppercase tracking-wide">FlowAI — Proposal for {stepMeta.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      FlowAI will propose its approach before executing. Review and approve, modify, or skip.
                    </p>

                    {/* Generate proposal button — phase 'propose' */}
                    {phase === 'propose' && !proposalLoading && (
                      <Button onClick={() => generateProposal()} className="gap-2">
                        <Play className="h-4 w-4" /> Generate Proposal for {stepMeta.label}
                      </Button>
                    )}

                    {/* Loading */}
                    {proposalLoading && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">FlowAI is preparing its proposal…</span>
                      </div>
                    )}

                    {/* Proposal error */}
                    {proposalError && (
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs text-red-400">{proposalError}</p>
                          <Button size="sm" variant="outline" className="mt-2 gap-1 h-7 text-xs border-red-500/30 text-red-400" onClick={() => generateProposal()}>
                            <RotateCcw className="h-3 w-3" /> Retry
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Proposal content */}
                    {proposal && phase === 'awaiting_approval' && (
                      <div className="rounded-lg border border-border bg-secondary/20 p-4">
                        <ProposalCard proposal={proposal} />
                      </div>
                    )}
                  </div>

                  {/* ── PHASE 2: Decision buttons ── */}
                  {proposal && phase === 'awaiting_approval' && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <p className="text-xs font-semibold text-foreground">Do you approve this plan?</p>
                      <div className="flex gap-2 flex-wrap">
                        <Button onClick={executeStep} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                          <ThumbsUp className="h-4 w-4" /> Approve — Execute Now
                        </Button>
                        <Button variant="outline" onClick={openModify} className="gap-2">
                          <Edit3 className="h-4 w-4" /> Modify Plan
                        </Button>
                        <Button variant="ghost" onClick={skipStep} className="gap-2 text-muted-foreground hover:text-foreground">
                          <SkipForward className="h-4 w-4" /> Skip This Step
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* ── MODIFY INPUT ── */}
                  {phase === 'modifying' && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
                      <p className="text-xs font-semibold text-amber-400">Modify the proposal — describe your changes</p>
                      <div className="flex gap-2 items-start">
                        <textarea
                          value={modifyText}
                          onChange={e => setModifyText(e.target.value)}
                          onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setModifyText(prev => prev + t); }}
                          placeholder="e.g. Also check whether the founder credentials are visible and in the correct order FNSE PhD…"
                          className="flex-1 h-20 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          autoFocus
                        />
                        {SPEECH_SUPPORTED && (
                          <button onClick={toggleModifyVoice}
                            className={`h-9 w-9 flex items-center justify-center rounded-md border shrink-0 transition-all mt-0.5 ${modifyListening ? 'border-red-500/50 bg-red-500/10 text-red-400 animate-pulse' : 'border-input text-muted-foreground hover:text-foreground'}`}>
                            {modifyListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={submitModification} disabled={!modifyText.trim()} className="gap-1.5 text-xs h-8">
                          <RotateCcw className="h-3 w-3" /> Update Proposal
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPhase('awaiting_approval')} className="text-xs h-8 text-muted-foreground">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── PHASE 3: EXECUTING ── */}
              {phase === 'executing' && (
                <motion.div key="executing" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-blue-400 animate-spin shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-blue-400">FlowAI is executing {stepMeta.label}…</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Analyzing {sessionConfig?.inputs.map(i => i.name).join(' and ')}. This takes ~{stepMeta.estimate}.</p>
                    </div>
                  </div>
                  {/* Crawl status indicator */}
                  {(stepMeta.key === 'build' || stepMeta.key === 'qa_audit') && crawlStatus && (
                    <div className={`flex items-center gap-2 text-xs font-semibold rounded-lg border px-3 py-2 ${
                      crawlStatus.state === 'crawling'
                        ? 'border-violet-500/40 bg-violet-500/10 text-violet-400'
                        : crawlStatus.state === 'done'
                        ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                        : 'border-border text-muted-foreground'
                    }`}>
                      {crawlStatus.state === 'crawling' && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />}
                      {crawlStatus.state === 'crawling'
                        ? `Crawling ${crawlStatus.url ? new URL(crawlStatus.url).hostname : 'URL'} — testing pages…`
                        : crawlStatus.state === 'done'
                        ? `Crawl complete — ${crawlStatus.pages} pages tested, ${crawlStatus.issues} issues found`
                        : `Crawl unavailable — proceeding with content analysis`}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── PHASE 3 error ── */}
              {stepError && phase === 'awaiting_approval' && (
                <motion.div key="step-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-400">{stepError}</p>
                    <Button size="sm" variant="outline" className="mt-2 gap-1.5 text-xs h-7 border-red-500/30 text-red-400" onClick={executeStep}>
                      <RotateCcw className="h-3 w-3" /> Retry Execution
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── PHASE 4: FINDINGS ── */}
              {phase === 'findings' && stepResult && (
                <motion.div key="findings" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="space-y-4">
                  {/* Self-Renewal Engine for govern step */}
                  {stepMeta.key === 'govern' && sessionConfig?.inputs?.[0] ? (
                    <SelfRenewalEngine
                      input={sessionConfig.inputs[0]}
                      pageContext={pageContexts?.[0]}
                      objective={sessionConfig.objective}
                      onComplete={approveAndAdvance}
                    />
                  ) : compareResults ? (
                    <StepResultPanel stepLabel={stepMeta.label} result={stepResult} inputName="" isCompare compareResults={compareResults} />
                  ) : (
                    <StepResultPanel stepLabel={stepMeta.label} result={stepResult} inputName="" />
                  )}

                  {/* QA Audit screenshots — visual crawl evidence */}
                  {stepMeta.key === 'qa_audit' && stepResult?._screenshots?.length > 0 && (
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Visual Evidence — Crawl Screenshots ({stepResult._screenshots.length} pages)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {stepResult._screenshots.map((shot, idx) => (
                          <div key={idx} className="rounded-lg border border-border overflow-hidden">
                            <div className="flex items-center justify-between px-2 py-1 bg-secondary/30 border-b border-border">
                              <span className="text-[10px] text-muted-foreground truncate">{shot.url || `Page ${idx + 1}`}</span>
                              <span className={`text-[10px] font-bold ${shot.status === 'pass' ? 'text-emerald-400' : shot.status === 'fail' ? 'text-red-400' : 'text-amber-400'}`}>
                                {shot.status?.toUpperCase() || 'CAPTURED'}
                              </span>
                            </div>
                            {shot.data_url || shot.screenshot ? (
                              <img src={shot.data_url || shot.screenshot} alt={`Screenshot ${idx + 1}`} className="w-full object-cover max-h-48" />
                            ) : (
                              <div className="h-24 flex items-center justify-center text-[10px] text-muted-foreground bg-secondary/20">No image data</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modify Findings */}
                  <div className="space-y-3">
                    <button onClick={() => setShowModifyFindings(v => !v)}
                      className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      <FileEdit className="h-3.5 w-3.5" />
                      {showModifyFindings ? 'Cancel modify' : 'Modify Findings — request refinement or expansion'}
                    </button>

                    <AnimatePresence>
                      {showModifyFindings && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden">
                          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            <p className="text-xs text-muted-foreground">Describe what you'd like FlowAI to refine or expand in these findings:</p>
                            <textarea
                              value={modifyFindingsText}
                              onChange={e => setModifyFindingsText(e.target.value)}
                              onPaste={e => { e.stopPropagation(); const t = e.clipboardData.getData('text/plain'); e.preventDefault(); setModifyFindingsText(prev => prev + t); }}
                              placeholder="e.g. Expand on the credibility signals section and add a comparison to enterprise SaaS standards…"
                              className="w-full h-16 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                            <Button size="sm" onClick={submitModifyFindings} disabled={!modifyFindingsText.trim() || modifyFindingsLoading} className="gap-1.5 text-xs h-8">
                              {modifyFindingsLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                              Refine Findings
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Approve and Advance */}
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      {stepIndex === STEPS.length - 1
                        ? 'Review complete. Approve to finalize the session.'
                        : `Reviewed findings for ${stepMeta.label}. Approve to advance to ${nextStep?.label}.`}
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <Button onClick={approveAndAdvance} className="gap-2">
                        <CheckCircle2 className="h-4 w-4" />
                        {stepIndex === STEPS.length - 1 ? 'Approve & Complete Session' : `Approve & Advance to ${nextStep?.label}`}
                      </Button>
                      {prevStep && (
                        <Button variant="outline" size="sm" className="gap-1 h-9 text-xs" onClick={() => navigate(`/guided/${prevStep.key}`)}>
                          <ChevronLeft className="h-3 w-3" /> Back to {prevStep.label}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── FINAL REPORT ── */}
            <AnimatePresence>
              {showFinalReport && (
                <FinalReport
                  multiMode={sessionConfig?.multiMode}
                  inputs={sessionConfig?.inputs || []}
                  stepResults={STEPS.map(s => ({ step: s.key, result: allStepResults[s.key] }))}
                  allInputStepResults={[]}
                  onAccept={() => { setShowFinalReport(false); navigate('/dashboard'); }}
                />
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}
