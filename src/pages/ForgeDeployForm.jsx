import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, PenLine, Rocket } from 'lucide-react';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  SectionStatusIcon,
} from '@/components/forge/ForgeSectionRenderer.jsx';
import { Button } from '@/components/ui/button';
import { runAudit } from '@/lib/forge/auditRunner';
import { runBuild } from '@/lib/forge/buildRunner';
import { runDeploy } from '@/lib/forge/deployRunner';
import { scoreDeployStep } from '@/lib/forge/deployStepScorer';
import { runDesign } from '@/lib/forge/designRunner';
import { persistForgeStepArtifactClient, persistenceDisplayText } from '@/lib/forge/persistForgeArtifactClient';
import { runResearch } from '@/lib/forge/researchRunner';

function existingDeploymentFromInputs({ outputUrl, deploymentId, commitSha, environment }) {
  if (!outputUrl.trim()) return null;
  return {
    outputUrl: outputUrl.trim(),
    deploymentId: deploymentId.trim() || null,
    commitSha: commitSha.trim() || null,
    environment: environment.trim() || 'preview',
  };
}

export default function ForgeDeployForm() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? null;
  const productName = searchParams.get('productName') ?? productId ?? 'Unknown Product';
  const [approvalText, setApprovalText] = useState('');
  const [outputUrl, setOutputUrl] = useState('');
  const [deploymentId, setDeploymentId] = useState('');
  const [commitSha, setCommitSha] = useState('');
  const [environment, setEnvironment] = useState('preview');
  const [browserProof, setBrowserProof] = useState('');
  const [auditOutput, setAuditOutput] = useState(null);
  const [deployOutput, setDeployOutput] = useState(null);
  const [score, setScore] = useState(null);
  const [persistenceState, setPersistenceState] = useState(null);
  const hasApproval = approvalText.trim().length > 0;

  useEffect(() => {
    let active = true;
    if (!productId) {
      setAuditOutput(null);
      setDeployOutput(null);
      setScore(null);
      setPersistenceState(null);
      return () => {
        active = false;
      };
    }

    (async () => {
      const research = await runResearch(productId, {}, { productId, productName });
      const design = await runDesign(productId, research, {}, { productId, productName });
      const build = await runBuild(productId, design, {}, { productId, productName });
      const audit = await runAudit(productId, build, {}, { productId, productName });
      const deploy = await runDeploy(productId, audit, {}, { productId, productName });
      if (!active) return;
      setAuditOutput(audit);
      setDeployOutput(deploy);
      setScore(scoreDeployStep(deploy));
      setPersistenceState(null);
    })();

    return () => {
      active = false;
    };
  }, [productId, productName]);

  const submitDeploy = async () => {
    if (!productId || !auditOutput) return;
    const output = await runDeploy(productId, auditOutput, {
      'operator-approval': approvalText,
      'browser-proof': browserProof,
    }, {
      productId,
      productName,
      existingDeployment: existingDeploymentFromInputs({
        outputUrl,
        deploymentId,
        commitSha,
        environment,
      }),
    });
    setDeployOutput(output);
    setScore(scoreDeployStep(output));
    setPersistenceState({ state: 'pending' });
    const persisted = await persistForgeStepArtifactClient({
      productId,
      runId: /** @type {any} */ (output).runId ?? `deploy-${Date.now()}`,
      stepKey: 'deploy',
      stepLabel: 'Deploy Forge',
      artifact: output,
      mode: 'GUIDED',
      runtime: output.outputUrl ? 'live_deploy_handoff' : 'offline',
      evidenceTier: 'B',
      proofLabel: output.outputUrl ? 'LIVE_PREVIEW' : 'UNIT',
    });
    setPersistenceState(persisted);
  };

  const autoSections = deployOutput?.sections?.filter(section => section.source === 'auto') ?? [];
  const manualSections = deployOutput?.sections?.filter(section => section.source === 'manual') ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Rocket className="h-7 w-7 text-primary" />
            Deploy Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {productId ? `Processing: ${productName}` : 'No product selected'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {persistenceState?.state === 'failed'
            ? 'PERSISTED: FAILED'
            : deployOutput?.readyForSelfRenewal
              ? 'READY FOR SELF-RENEWAL'
              : 'DEPLOY EVIDENCE PARTIAL'}
        </div>
      </div>

      {!productId && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= to the URL to continue.
        </section>
      )}

      {productId && !deployOutput && (
        <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Preparing deploy gate...
        </section>
      )}

      {deployOutput?.flag && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">{deployOutput.flag}</p>
          <p className="mt-1">{deployOutput.correctivePrompts?.[0]}</p>
        </section>
      )}

      {persistenceState && (
        <section className={`rounded-lg border p-4 text-sm ${
          persistenceState.state === 'persisted'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : persistenceState.state === 'failed'
              ? 'border-red-500/30 bg-red-500/10 text-red-200'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
        }`}>
          <span className="font-semibold">{persistenceDisplayText(persistenceState)}</span>
          {persistenceState.reason && <span className="ml-2 text-xs opacity-80">{persistenceState.reason}</span>}
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Deploy readiness
        </div>
        <div className="grid gap-3">
          {autoSections.map(section => (
            <div key={section.id} className="rounded-lg border border-border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <SectionStatusIcon status={getSectionStatus(section.input)} />
                {section.label}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
              <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                <ForgeSectionRenderer value={section.input} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PenLine className="h-4 w-4 text-primary" />
          Operator-gated delivery artifact
        </div>
        {manualSections.map(section => (
          <div key={section.id} className="grid gap-3 rounded-lg border border-border bg-card p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <SectionStatusIcon status={getSectionStatus(section.input)} />
              {section.label}
            </span>
            <span className="text-xs text-muted-foreground">{section.prompt}</span>
            {section.id === 'operator-approval' && (
              <textarea
                value={approvalText}
                onChange={event => setApprovalText(event.target.value)}
                rows={4}
                className="min-h-28 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Authorized operator approval rationale"
              />
            )}
            {section.id === 'delivery-artifact' && (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 md:col-span-2">
                  <span className="text-xs text-muted-foreground">Existing deploy URL or adapter-produced URL</span>
                  <input
                    value={outputUrl}
                    onChange={event => setOutputUrl(event.target.value)}
                    className="rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                    placeholder="https://preview-or-production.example.com"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs text-muted-foreground">Deployment ID</span>
                  <input
                    value={deploymentId}
                    onChange={event => setDeploymentId(event.target.value)}
                    className="rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs text-muted-foreground">Commit SHA</span>
                  <input
                    value={commitSha}
                    onChange={event => setCommitSha(event.target.value)}
                    className="rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
                <label className="grid gap-2">
                  <span className="text-xs text-muted-foreground">Environment</span>
                  <input
                    value={environment}
                    onChange={event => setEnvironment(event.target.value)}
                    className="rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                  />
                </label>
              </div>
            )}
            {section.id === 'browser-proof' && (
              <textarea
                value={browserProof}
                onChange={event => setBrowserProof(event.target.value)}
                rows={3}
                className="min-h-24 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Browser/runtime proof after deploy handoff"
              />
            )}
          </div>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitDeploy} disabled={!productId || !hasApproval}>
          Submit Deploy Handoff
        </Button>
        {!hasApproval && <span className="text-xs text-muted-foreground">Authorized operator approval is required before deploy/submission.</span>}
      </div>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Deploy Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Step 5 completes only after audit gate, operator approval, delivery artifact, and distribution handoff.</p>
            </div>
            <ScoreDisplay percent={deployOutput?.deployScore ?? score.deployScore} />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>deployComplete: {String(score.deployComplete)}</div>
            <div>readyForSelfRenewal: {String(score.readyForSelfRenewal)}</div>
            <div>outputUrl: {score.outputUrl ?? 'NONE'}</div>
            <div>deploymentId: {score.deploymentId ?? 'NONE'}</div>
          </div>
          {score.correctivePrompts.length > 0 && (
            <div className="mt-4 space-y-2">
              {score.correctivePrompts.map(prompt => (
                <div key={prompt} className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  {prompt}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
