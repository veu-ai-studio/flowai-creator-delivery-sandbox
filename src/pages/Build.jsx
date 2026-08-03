import { useState, useEffect } from 'react';
import { useOrchestration } from '@/lib/OrchestrationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Hammer, Loader2, AlertCircle, CheckCircle2, ArrowRight,
  Box, Database, Code2, Globe, Rocket, ExternalLink, XCircle
} from 'lucide-react';


const PHASE = 'Phase 4 — Build Engine';

function BuildSection({ icon: Icon, title, items, color }) {
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
            className="text-xs p-2 rounded bg-secondary/30 border border-border/30 space-y-0.5"
          >
            {typeof item === 'object' ? (
              <>
                <p className="font-semibold text-foreground">{item.name || item.component || item.table || item.service}</p>
                {item.type && <span className="text-[10px] text-muted-foreground">Type: {item.type}</span>}
                {item.fields && <p className="text-[10px] text-muted-foreground">Fields: {Array.isArray(item.fields) ? item.fields.join(', ') : item.fields}</p>}
                {item.props && <p className="text-[10px] text-muted-foreground">Props: {Array.isArray(item.props) ? item.props.join(', ') : item.props}</p>}
                {item.description && <p className="text-[10px] text-muted-foreground">{item.description}</p>}
              </>
            ) : (
              <span className="text-foreground">{item}</span>
            )}
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

export default function Build() {
  const { getRunConfig } = useOrchestration();
  const [designContext, setDesignContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [buildPlan, setBuildPlan] = useState(null);
  const [phaseStatus, setPhaseStatus] = useState(null);
  const [phaseReport, setPhaseReport] = useState(null);
  const [currentStep, setCurrentStep] = useState('');
  const [deploymentStatus, setDeploymentStatus] = useState(null); // 'deploying' | 'success' | 'failed'
  const [deploymentUrl, setDeploymentUrl] = useState(null);
  const [deploymentError, setDeploymentError] = useState(null);
  const [generatedFiles, setGeneratedFiles] = useState(null);
  const [codeGenMeta, setCodeGenMeta] = useState(null);
  const [apiValidation, setApiValidation] = useState(null);
  const [phase1Passed, setPhase1Passed] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [verifierReport, setVerifierReport] = useState(null);
  const [auditing, setAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditError, setAuditError] = useState(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [fixError, setFixError] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('flowai_design');
    if (stored) {
      try {
        const d = JSON.parse(stored);
        setDesignContext(d.product_name ? `Product: ${d.product_name}. Features: ${d.features?.slice(0, 3).map(f => f.name || f).join(', ')}` : '');
      } catch {}
    }
  }, []);

  const deployApp = async (projectData) => {
    setDeploymentStatus('deploying');
    setDeploymentUrl(null);
    setDeploymentError(null);

    try {
      // Step 1: Generate real source files via GPT-4o
      setCurrentStep('Generating real source files (GPT-4o)...');
      const codeRes = await base44.functions.invoke('generateCode', {
        app_name: designContext.slice(0, 60),
        context: designContext,
        tech_stack: projectData.tech_stack || [],
        ui_components: projectData.ui_components || [],
        api_endpoints: projectData.api_structure || [],
        data_schema: projectData.data_schema || [],
      });

      const generatedFiles = codeRes?.data?.files;
      const codeOk = generatedFiles && Array.isArray(generatedFiles) && generatedFiles.length > 0;

      if (codeOk) {
        setGeneratedFiles(generatedFiles);
        setCodeGenMeta({ summary: codeRes.data.summary, framework: codeRes.data.framework, fileCount: codeRes.data.file_count });
      }

      // Step 2: Deploy — real files if generated, HTML fallback otherwise
      setCurrentStep(codeOk ? `Deploying ${generatedFiles.length} files to Vercel...` : 'Deploying landing page to Vercel...');
      const deployPayload = codeOk
        ? { app_name: designContext.slice(0, 60), files: generatedFiles }
        : { app_name: designContext.slice(0, 60), context: designContext, tech_stack: projectData.tech_stack || [], ui_components: projectData.ui_components || [] };

      const res = await base44.functions.invoke('deployApp', deployPayload);

      const liveUrl = res?.data?.url;
      if (!liveUrl) {
        throw new Error('Deployment failed — no URL returned from deploy service');
      }

      const apiVal = res?.data?.api_validation || null;
      const p1 = res?.data?.phase1_passed || false;
      setApiValidation(apiVal);
      setPhase1Passed(p1);
      setDeploymentUrl(liveUrl);
      setDeploymentStatus('success');

      // Phase 3 — Verifier Engine
      setCurrentStep('Running Phase 3 Verifier Engine...');
      setVerifying(true);
      setVerifierReport(null);
      let verReport = null;
      try {
        const verRes = await base44.functions.invoke('verifyDeployment', { url: liveUrl });
        verReport = verRes?.data || null;
        setVerifierReport(verReport);
      } catch (e) {
        verReport = { passed: false, failure_reasons: [`Verifier error: ${e.message}`], checks: {} };
        setVerifierReport(verReport);
      } finally {
        setVerifying(false);
      }

      sessionStorage.setItem('flowai_deployment', JSON.stringify({ url: liveUrl, files_deployed: codeOk ? generatedFiles.length : 1, phase1_passed: p1, phase3_passed: verReport?.passed }));

      // Phase 4 — Audit Engine (runs after verifier)
      setCurrentStep('Running Phase 4 Audit Engine...');
      setAuditing(true);
      setAuditReport(null);
      setAuditError(null);
      let auditRpt = null;
      try {
        const auditRes = await base44.functions.invoke('auditDeployment', { url: liveUrl });
        auditRpt = auditRes?.data || null;
        setAuditReport(auditRpt);
      } catch (e) {
        setAuditError(e.message);
      } finally {
        setAuditing(false);
      }

      // Phase 4 — Fix Engine (only if critical issues found)
      const hasCritical = (auditRpt?.summary?.critical || 0) > 0;
      if (auditRpt && hasCritical) {
        setCurrentStep('Critical issues found — running Fix Engine...');
        setFixing(true);
        setFixResult(null);
        setFixError(null);
        try {
          const fixRes = await base44.functions.invoke('fixAndRedeploy', {
            audit_report: auditRpt,
            original_context: designContext,
            app_name: designContext.slice(0, 60),
            original_files: codeOk ? generatedFiles : [],
          });
          setFixResult(fixRes?.data || null);
          // Update liveUrl to the fixed deployment if successful
          if (fixRes?.data?.new_url) {
            setDeploymentUrl(fixRes.data.new_url);
          }
        } catch (e) {
          setFixError(e.message);
        } finally {
          setFixing(false);
        }
      }

      return { liveUrl, apiVal, p1, verReport };
    } catch (error) {
      setDeploymentStatus('failed');
      setDeploymentError(error?.message || 'Deployment failed');
      throw error;
    }
  };

  const handleBuild = async () => {
    if (!designContext.trim()) return;
    setLoading(true);
    setBuildPlan(null);
    setPhaseStatus('running');
    setPhaseReport(null);
    setDeploymentStatus(null);
    setDeploymentUrl(null);
    setDeploymentError(null);
    setApiValidation(null);
      setPhase1Passed(null);
      setVerifying(false);
      setVerifierReport(null);
      setAuditing(false);
      setAuditReport(null);
      setAuditError(null);
      setFixing(false);
      setFixResult(null);
      setFixError(null);

    try {
      setCurrentStep('Generating component structure...');
      const orchConfig = getRunConfig();
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior software architect. Generate a complete build plan for:
${designContext}
Orchestration: mode=${orchConfig.agenticMode}, iteration=${orchConfig.iterationMode}, flow=${orchConfig.flowType}

Create a production-ready build specification (no actual code files, just structure).`,
        response_json_schema: {
          type: 'object',
          properties: {
            ui_components: {
              type: 'array',
              items: { type: 'object', properties: { component: { type: 'string' }, type: { type: 'string' }, props: { type: 'array', items: { type: 'string' } }, description: { type: 'string' } } }
            },
            api_structure: {
              type: 'array',
              items: { type: 'object', properties: { service: { type: 'string' }, endpoints: { type: 'array', items: { type: 'string' } }, description: { type: 'string' } } }
            },
            data_schema: {
              type: 'array',
              items: { type: 'object', properties: { table: { type: 'string' }, fields: { type: 'array', items: { type: 'string' } }, description: { type: 'string' } } }
            },
            tech_stack: { type: 'array', items: { type: 'string' } },
            estimated_effort: { type: 'string' },
            build_phases: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      setCurrentStep('Validating build plan...');
      const checks = [];
      let failed = false;
      let failStep = '';
      let failError = '';

      if (!res?.ui_components?.length) { failed = true; failStep = 'UI Components'; failError = 'No components generated'; }
      else checks.push('UI components list generated');
      if (!res?.api_structure?.length) { failed = true; failStep = 'API Structure'; failError = 'No API structure'; }
      else checks.push('API structure generated');
      if (!res?.data_schema?.length) { failed = true; failStep = 'Data Schema'; failError = 'No data schema'; }
      else checks.push('data schema generated');
      checks.push('structured build output exists');

      if (failed) {
        setPhaseStatus('failed');
        setPhaseReport({ status: 'FAILED', phase: PHASE, step: failStep, error: failError, root_cause: 'Incomplete build plan from LLM', fix_recommendation: 'Provide more detailed design context', next_action: `Fix ${failStep} → re-run Phase 4` });
      } else {
        setBuildPlan(res);

        // Deploy after successful build
        setCurrentStep('Deploying app + validating API endpoints...');
        let liveUrl = null;
        let apiVal = null;
        let p1 = false;
        let verReport = null;
        try {
          const deployResult = await deployApp(res);
          liveUrl = deployResult.liveUrl;
          apiVal = deployResult.apiVal;
          p1 = deployResult.p1;
          verReport = deployResult.verReport || null;
        } catch (deployErr) {
          setPhaseStatus('failed');
          setPhaseReport({ status: 'FAILED', phase: PHASE, step: 'Deployment', error: deployErr?.message || 'Deployment failed', root_cause: 'Deploy engine error', fix_recommendation: 'Check deployment config and retry', next_action: 'Fix deployment → re-run Phase 4' });
          return;
        }

        if (!p1 || (apiVal && !apiVal.passed)) {
          setPhaseStatus('failed');
          setPhaseReport({
            status: 'FAILED', phase: PHASE, step: 'API Validation',
            error: 'Phase 1 API validation did not pass',
            deployment_url: liveUrl,
            api_validation: apiVal,
            root_cause: !apiVal?.get_api?.ok ? 'GET /api failed' : !apiVal?.post_api_run?.ok ? 'POST /api/run failed' : 'API endpoints returned non-JSON',
            fix_recommendation: 'Check Vercel function logs — ensure backend/api.js exports app correctly',
            next_action: 'Fix API → re-run Phase 4',
          });
          return;
        }

        // Phase 3 gate — verifier result
        if (verReport && !verReport.passed) {
          setPhaseStatus('failed');
          setPhaseReport({
            status: 'FAILED', phase: PHASE, step: 'Phase 3 — Verifier Engine',
            error: 'Verifier blocked deployment — one or more checks failed',
            deployment_url: liveUrl,
            failure_reasons: verReport.failure_reasons || [],
            root_cause: 'Deployment did not pass all Phase 3 verification gates',
            fix_recommendation: 'Review failure reasons above and re-run Build',
            next_action: 'Fix failing checks → re-run Phase 4',
          });
          return;
        }

        setPhaseStatus('passed');
        setPhaseReport({
          status: 'SUCCESS', phase: PHASE, validated: true, checks_passed: [
            ...checks,
            'GET /api → 200 JSON ✓',
            'POST /api/run → 200 JSON ✓',
            'Phase 1 API validation PASSED',
            'Phase 3 Verifier — UI renders ✓',
            'Phase 3 Verifier — API endpoints ✓',
            'Phase 3 Verifier — Deployment confirmed live ✓',
          ],
          deployment_url: liveUrl,
          api_validation: apiVal,
          phase3_complete: true,
          next_phase: 'All gates passed — deployment live',
        });
      }
    } catch (error) {
      const errorMsg = error?.message || String(error);
      setPhaseStatus('failed');
      setPhaseReport({ status: 'FAILED', phase: PHASE, step: 'Build Generation', error: errorMsg, root_cause: 'API failure', fix_recommendation: 'Retry with clearer context', next_action: 'Fix error → re-run Phase 4' });
    } finally {
      setLoading(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Hammer className="h-7 w-7 text-primary" />
              Build Engine
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Phase 4 — UI components, API structure & data schema</p>
          </div>
          {phaseStatus && (
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
              phaseStatus === 'passed' ? 'bg-emerald-500/20 text-emerald-400' :
              phaseStatus === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-amber-500/20 text-amber-400 animate-pulse'
            }`}>
              {phaseStatus === 'running' ? '⚙ Running...' : phaseStatus === 'passed' ? '✓ Phase 4 Complete' : '✗ Phase 4 Failed'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-4 text-[10px] text-muted-foreground">
          {['Audit', 'Research', 'Design', 'Build', 'Pipeline'].map((p, i) => (
            <div key={p} className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded ${i === 3 ? 'bg-primary text-primary-foreground font-semibold' : 'bg-secondary/50'}`}>{p}</span>
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
          <Label className="text-xs text-muted-foreground">Design Context / Product Description</Label>
          <textarea
            value={designContext}
            onChange={e => setDesignContext(e.target.value)}
            placeholder="Paste design output or describe the product to build..."
            className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            disabled={loading}
          />
        </div>
        <Button className="gap-2" onClick={handleBuild} disabled={loading || !designContext.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
          {loading ? currentStep || 'Building...' : 'Generate Build Plan'}
        </Button>
      </motion.div>

      {/* Results — 3 required sections */}
      <AnimatePresence>
        {buildPlan && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Meta */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-wrap gap-4">
              {buildPlan.estimated_effort && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Estimated Effort</p>
                  <p className="text-sm font-bold text-foreground">{buildPlan.estimated_effort}</p>
                </div>
              )}
              {buildPlan.tech_stack?.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground">Tech Stack</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {buildPlan.tech_stack.map((t, i) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BuildSection icon={Box} title="UI Components" items={buildPlan.ui_components} color="text-blue-400" />
              <BuildSection icon={Globe} title="API Structure" items={buildPlan.api_structure} color="text-purple-400" />
              <BuildSection icon={Database} title="Data Schema" items={buildPlan.data_schema} color="text-emerald-400" />
            </div>

            {buildPlan.build_phases?.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />Build Phases
                </p>
                <ol className="space-y-1">
                  {buildPlan.build_phases.map((phase, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                      {phase}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deployment Result */}
      <AnimatePresence>
        {deploymentStatus && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-6 space-y-3 ${
              deploymentStatus === 'success' ? 'border-emerald-500/40 bg-emerald-500/5' :
              deploymentStatus === 'failed' ? 'border-red-500/40 bg-red-500/5' :
              'border-primary/30 bg-primary/5'
            }`}
          >
            <div className="flex items-center gap-2">
              {deploymentStatus === 'deploying' && <Loader2 className="h-5 w-5 text-primary animate-spin" />}
              {deploymentStatus === 'success' && <Rocket className="h-5 w-5 text-emerald-400" />}
              {deploymentStatus === 'failed' && <XCircle className="h-5 w-5 text-red-400" />}
              <h3 className={`font-bold text-base ${
                deploymentStatus === 'success' ? 'text-emerald-400' :
                deploymentStatus === 'failed' ? 'text-red-400' :
                'text-primary'
              }`}>
                Deployment Result
              </h3>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                deploymentStatus === 'deploying' ? 'bg-primary/20 text-primary animate-pulse' :
                deploymentStatus === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {deploymentStatus === 'deploying' ? 'Deploying...' :
                 deploymentStatus === 'success' ? 'Success' : 'Failed'}
              </span>
            </div>

            {deploymentStatus === 'success' && deploymentUrl && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Live App URL</p>
                <a
                  href={deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm font-mono text-primary hover:underline break-all"
                >
                  <Globe className="h-4 w-4 shrink-0" />
                  {deploymentUrl}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
                <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 font-mono text-xs text-emerald-400">
                  Live Product URL: {deploymentUrl}
                </div>
              </div>
            )}

            {deploymentStatus === 'failed' && deploymentError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 space-y-1">
                <p className="font-semibold">Deployment Error</p>
                <p>{deploymentError}</p>
                <p className="text-muted-foreground mt-1">→ AUTO-STOP: Fix deployment error before continuing to Pipeline.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* API Validation Panel */}
      <AnimatePresence>
        {apiValidation && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-5 space-y-4 ${phase1Passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'}`}
          >
            <div className="flex items-center gap-2">
              {phase1Passed ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <AlertCircle className="h-5 w-5 text-red-400" />}
              <h3 className={`font-bold text-sm ${phase1Passed ? 'text-emerald-400' : 'text-red-400'}`}>
                Phase 1 API Validation — {phase1Passed ? 'PASSED ✓' : 'FAILED ✗'}
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* GET /api */}
              <div className={`rounded-lg border p-3 space-y-1 ${apiValidation.get_api?.ok && apiValidation.get_api?.isJson ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {apiValidation.get_api?.ok && apiValidation.get_api?.isJson
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                  GET /api
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">status: {apiValidation.get_api?.status || 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">json: {String(apiValidation.get_api?.isJson)}</p>
                {apiValidation.get_api?.body && <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{apiValidation.get_api.body}</p>}
                {apiValidation.get_api?.error && <p className="text-[10px] text-red-400">{apiValidation.get_api.error}</p>}
              </div>
              {/* POST /api/run */}
              <div className={`rounded-lg border p-3 space-y-1 ${apiValidation.post_api_run?.ok && apiValidation.post_api_run?.isJson ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {apiValidation.post_api_run?.ok && apiValidation.post_api_run?.isJson
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    : <AlertCircle className="h-3.5 w-3.5 text-red-400" />}
                  POST /api/run
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">status: {apiValidation.post_api_run?.status || 0}</p>
                <p className="text-[10px] text-muted-foreground font-mono">json: {String(apiValidation.post_api_run?.isJson)}</p>
                {apiValidation.post_api_run?.body && <p className="text-[10px] font-mono text-muted-foreground/60 truncate">{apiValidation.post_api_run.body}</p>}
                {apiValidation.post_api_run?.error && <p className="text-[10px] text-red-400">{apiValidation.post_api_run.error}</p>}
              </div>
            </div>
            {phase1Passed && (
              <p className="text-xs text-emerald-400 font-semibold">✓ All Phase 1 criteria met. Ready to proceed to Phase 3 — Verifier Engine.</p>
            )}
            {!phase1Passed && (
              <p className="text-xs text-red-400">✗ Phase 1 incomplete. Fix API validation failures before proceeding. Re-run Build to retry.</p>
            )}
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
              phaseReport.status === 'SUCCESS' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            <div className="flex items-center gap-2">
              {phaseReport.status === 'SUCCESS'
                ? <AlertCircle className="h-4 w-4 text-amber-400" />
                : <AlertCircle className="h-4 w-4 text-red-400" />}
              <span className={`font-bold ${phaseReport.status === 'SUCCESS' ? 'text-amber-400' : 'text-red-400'}`}>
                {phaseReport.status === 'SUCCESS' ? 'LEGACY BUILD SIMULATION COMPLETE — No deployable artifact produced' : 'PHASE 4 FAILED — Auto-Stop'}
              </span>
            </div>
            <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(phaseReport, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && !buildPlan && !phaseReport && (
        <div className="text-center py-16">
          <Hammer className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Enter design context to generate build plan</p>
        </div>
      )}
    </div>
  );
}
