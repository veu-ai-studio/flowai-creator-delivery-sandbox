import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Megaphone, PenLine } from 'lucide-react';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  SectionStatusIcon,
} from '@/components/forge/ForgeSectionRenderer.jsx';
import { Button } from '@/components/ui/button';
import { runGtm } from '@/lib/forge/gtmRunner';
import { scoreGtmStep } from '@/lib/forge/gtmStepScorer';
import { persistForgeStepArtifactClient, persistenceDisplayText } from '@/lib/forge/persistForgeArtifactClient';

function gtmContextFromQuery(productId, productName, searchParams) {
  const outputUrl = searchParams.get('outputUrl') ?? searchParams.get('url') ?? null;
  const renewalComplete = searchParams.get('renewalComplete') !== 'false';
  return {
    productId,
    productName,
    targetClass: searchParams.get('targetClass') ?? 'web',
    deployOutput: outputUrl ? { outputUrl } : {},
    renewalOutput: { renewalComplete: Boolean(outputUrl) && renewalComplete },
    userObjectives: searchParams.get('objective') ? [searchParams.get('objective')] : [],
    issues: [],
  };
}

export default function ForgeGTMForm() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? null;
  const productName = searchParams.get('productName') ?? productId ?? 'Unknown Product';
  const [decisionText, setDecisionText] = useState('');
  const [gtmOutput, setGtmOutput] = useState(null);
  const [score, setScore] = useState(null);
  const [persistenceState, setPersistenceState] = useState(null);
  const hasDecision = decisionText.trim().length > 0;

  useEffect(() => {
    let active = true;
    if (!productId) {
      setGtmOutput(null);
      setScore(null);
      setPersistenceState(null);
      return () => {
        active = false;
      };
    }
    (async () => {
      const output = await runGtm(productId, gtmContextFromQuery(productId, productName, searchParams), {}, {});
      if (!active) return;
      setGtmOutput(output);
      setScore(scoreGtmStep(output));
      setPersistenceState(null);
    })();
    return () => {
      active = false;
    };
  }, [productId, productName, searchParams]);

  const submitGtm = async () => {
    if (!productId) return;
    const output = await runGtm(productId, gtmContextFromQuery(productId, productName, searchParams), {
      'gtm-human-decision-log': decisionText,
    }, {});
    setGtmOutput(output);
    setScore(scoreGtmStep(output));
    setPersistenceState({ state: 'pending' });
    const persisted = await persistForgeStepArtifactClient({
      productId,
      runId: output.runId ?? `gtm-${Date.now()}`,
      stepKey: 'gtm',
      stepLabel: 'GTM Forge',
      artifact: output,
      mode: 'GUIDED',
      runtime: output.context?.deployOutput?.outputUrl ? 'live_deploy_context' : 'offline',
      evidenceTier: 'B',
      proofLabel: output.context?.deployOutput?.outputUrl ? 'LIVE_PREVIEW' : 'UNIT',
    });
    setPersistenceState(persisted);
  };

  const autoSections = gtmOutput?.sections?.filter(section => section.source === 'auto') ?? [];
  const manualSections = gtmOutput?.sections?.filter(section => section.source === 'manual') ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Megaphone className="h-7 w-7 text-primary" />
            GTM Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {productId ? `Processing: ${productName}` : 'No product selected'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {persistenceState?.state === 'failed'
            ? 'PERSISTED: FAILED'
            : gtmOutput?.readyForMonitor
              ? 'READY FOR MONITOR'
              : 'GTM EVIDENCE PARTIAL'}
        </div>
      </div>

      {!productId && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= and ?outputUrl= to the URL to continue.
        </section>
      )}

      {gtmOutput?.flag && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">{gtmOutput.flag}</p>
          <p className="mt-1">{gtmOutput.correctivePrompts?.[0]}</p>
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
          GTM readiness
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
          Human GTM decision
        </div>
        {manualSections.map(section => (
          <label key={section.id} className="grid gap-3 rounded-lg border border-border bg-card p-4">
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <SectionStatusIcon status={getSectionStatus(section.input)} />
              {section.label}
            </span>
            <span className="text-xs text-muted-foreground">{section.prompt}</span>
            <textarea
              value={decisionText}
              onChange={event => setDecisionText(event.target.value)}
              rows={4}
              className="min-h-28 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              placeholder="Authorized operator GTM readiness decision"
            />
          </label>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitGtm} disabled={!productId || !hasDecision}>
          Submit GTM Decision
        </Button>
        {!hasDecision && <span className="text-xs text-muted-foreground">Human decision log required before GTM readiness.</span>}
      </div>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">GTM Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Ready for Monitor requires sourced evidence and human decision log.</p>
            </div>
            <ScoreDisplay percent={gtmOutput?.gtmScore ?? score.gtmScore} />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>gtmReady: {String(score.gtmReady)}</div>
            <div>readyForMonitor: {String(score.readyForMonitor)}</div>
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
