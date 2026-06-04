import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, PenLine, RefreshCw } from 'lucide-react';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  SectionStatusIcon,
} from '@/components/forge/ForgeSectionRenderer.jsx';
import { Button } from '@/components/ui/button';
import { persistForgeStepArtifactClient, persistenceDisplayText } from '@/lib/forge/persistForgeArtifactClient';
import { runRenewal } from '@/lib/forge/renewalRunner';
import { scoreRenewalStep } from '@/lib/forge/renewalStepScorer';

function deployOutputFromQuery(searchParams) {
  const outputUrl = searchParams.get('outputUrl') ?? searchParams.get('url') ?? null;
  if (!outputUrl) return {};
  return {
    productId: searchParams.get('productId') ?? null,
    outputUrl,
    deploymentId: searchParams.get('deploymentId') ?? null,
    commitSha: searchParams.get('commitSha') ?? null,
    environment: searchParams.get('environment') ?? 'preview',
    readyForSelfRenewal: true,
  };
}

export default function ForgeRenewalForm() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? null;
  const productName = searchParams.get('productName') ?? productId ?? 'Unknown Product';
  const [approvalText, setApprovalText] = useState('');
  const [verificationText, setVerificationText] = useState('');
  const [auditIssuesCount, setAuditIssuesCount] = useState(searchParams.get('auditIssuesCount') ?? '0');
  const [renewalOutput, setRenewalOutput] = useState(null);
  const [score, setScore] = useState(null);
  const [persistenceState, setPersistenceState] = useState(null);
  const hasApproval = approvalText.trim().length > 0;

  useEffect(() => {
    let active = true;
    if (!productId) {
      setRenewalOutput(null);
      setScore(null);
      setPersistenceState(null);
      return () => {
        active = false;
      };
    }
    (async () => {
      const output = await runRenewal(productId, deployOutputFromQuery(searchParams), {
        auditIssuesCount,
      }, { productId, productName });
      if (!active) return;
      setRenewalOutput(output);
      setScore(scoreRenewalStep(output));
      setPersistenceState(null);
    })();
    return () => {
      active = false;
    };
  }, [productId, productName, searchParams, auditIssuesCount]);

  const submitRenewal = async () => {
    if (!productId) return;
    const output = await runRenewal(productId, deployOutputFromQuery(searchParams), {
      auditIssuesCount,
      'renewal-operator-approval': approvalText,
      'renewal-verification': verificationText,
    }, { productId, productName });
    setRenewalOutput(output);
    setScore(scoreRenewalStep(output));
    setPersistenceState({ state: 'pending' });
    const persisted = await persistForgeStepArtifactClient({
      productId,
      runId: output.runId ?? `renewal-${Date.now()}`,
      stepKey: 'self-renewal',
      stepLabel: 'Self-Renewal Forge',
      artifact: output,
      mode: 'GUIDED',
      runtime: output.deployOutput?.outputUrl ? 'live_deploy_context' : 'offline',
      evidenceTier: 'B',
      proofLabel: output.deployOutput?.outputUrl ? 'LIVE_PREVIEW' : 'UNIT',
    });
    setPersistenceState(persisted);
  };

  const autoSections = renewalOutput?.sections?.filter(section => section.source === 'auto') ?? [];
  const manualSections = renewalOutput?.sections?.filter(section => section.source === 'manual') ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <RefreshCw className="h-7 w-7 text-primary" />
            Self-Renewal Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {productId ? `Processing: ${productName}` : 'No product selected'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {persistenceState?.state === 'failed'
            ? 'PERSISTED: FAILED'
            : renewalOutput?.readyForGtm
              ? 'READY FOR GTM'
              : 'RENEWAL EVIDENCE PARTIAL'}
        </div>
      </div>

      {!productId && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= and ?outputUrl= to the URL to continue.
        </section>
      )}

      {productId && !renewalOutput && (
        <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Preparing Self-Renewal recommendation...
        </section>
      )}

      {renewalOutput?.flag && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">{renewalOutput.flag}</p>
          <p className="mt-1">{renewalOutput.correctivePrompts?.[0]}</p>
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
          Self-Renewal analysis
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
          Operator gate and verification
        </div>
        {manualSections.map(section => (
          <div key={section.id} className="grid gap-3 rounded-lg border border-border bg-card p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <SectionStatusIcon status={getSectionStatus(section.input)} />
              {section.label}
            </span>
            <span className="text-xs text-muted-foreground">{section.prompt}</span>
            {section.id === 'renewal-operator-approval' && (
              <textarea
                value={approvalText}
                onChange={event => setApprovalText(event.target.value)}
                rows={4}
                className="min-h-28 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Authorized operator approval rationale"
              />
            )}
            {section.id === 'renewal-verification' && (
              <textarea
                value={verificationText}
                onChange={event => setVerificationText(event.target.value)}
                rows={4}
                className="min-h-28 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
                placeholder="Before/after test or browser proof"
              />
            )}
          </div>
        ))}
        <label className="grid gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground">Audit issues count for Agent #3 recommendation input</span>
          <input
            value={auditIssuesCount}
            onChange={event => setAuditIssuesCount(event.target.value)}
            className="rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            inputMode="numeric"
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitRenewal} disabled={!productId || !hasApproval}>
          Submit Self-Renewal Handoff
        </Button>
        {!hasApproval && <span className="text-xs text-muted-foreground">Authorized operator approval is required before applying any renewal fix.</span>}
      </div>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Self-Renewal Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Step 6 completes on recommendation plus safe terminal action or guidance.</p>
            </div>
            <ScoreDisplay percent={renewalOutput?.renewalScore ?? score.renewalScore} />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>renewalComplete: {String(score.renewalComplete)}</div>
            <div>readyForGtm: {String(score.readyForGtm)}</div>
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
