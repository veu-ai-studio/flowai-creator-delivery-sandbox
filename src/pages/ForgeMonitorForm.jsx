import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, FileText } from 'lucide-react';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  SectionStatusIcon,
} from '@/components/forge/ForgeSectionRenderer.jsx';
import { Button } from '@/components/ui/button';
import { runMonitor } from '@/lib/forge/monitorRunner';
import { scoreMonitorStep } from '@/lib/forge/monitorStepScorer';
import { persistForgeStepArtifactClient, persistenceDisplayText } from '@/lib/forge/persistForgeArtifactClient';

function monitorContextFromQuery(productId, searchParams) {
  const outputUrl = searchParams.get('outputUrl') ?? searchParams.get('url') ?? null;
  return {
    productId,
    outputUrl,
    targetClass: searchParams.get('targetClass') ?? 'web',
    storeReviewStatus: searchParams.get('storeReviewStatus') ?? 'not_applicable',
  };
}

function localMonitorAdapter(status) {
  return async ({ outputUrl }) => ({
    ok: status === 'healthy',
    status,
    statusCode: status === 'healthy' ? 200 : 500,
    latencyMs: 1,
    evidence: `local monitor adapter checked ${outputUrl}`,
  });
}

export default function ForgeMonitorForm() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? null;
  const productName = searchParams.get('productName') ?? productId ?? 'Unknown Product';
  const [checkStatus, setCheckStatus] = useState(searchParams.get('status') ?? 'healthy');
  const [monitorOutput, setMonitorOutput] = useState(null);
  const [score, setScore] = useState(null);
  const [persistenceState, setPersistenceState] = useState(null);

  useEffect(() => {
    let active = true;
    if (!productId) {
      setMonitorOutput(null);
      setScore(null);
      setPersistenceState(null);
      return () => {
        active = false;
      };
    }
    (async () => {
      const output = await runMonitor(productId, monitorContextFromQuery(productId, searchParams), {}, {});
      if (!active) return;
      setMonitorOutput(output);
      setScore(scoreMonitorStep(output));
      setPersistenceState(null);
    })();
    return () => {
      active = false;
    };
  }, [productId, searchParams]);

  const submitMonitor = async () => {
    if (!productId) return;
    const output = await runMonitor(productId, monitorContextFromQuery(productId, searchParams), {}, {
      monitorAdapter: localMonitorAdapter(checkStatus),
    });
    setMonitorOutput(output);
    setScore(scoreMonitorStep(output));
    setPersistenceState({ state: 'pending' });
    const persisted = await persistForgeStepArtifactClient({
      productId,
      runId: output.runId ?? `monitor-${Date.now()}`,
      stepKey: 'monitor',
      stepLabel: 'Monitor Forge',
      artifact: output,
      mode: 'GUIDED',
      runtime: output.target?.outputUrl ? 'live_monitor_context' : 'offline',
      evidenceTier: 'B',
      proofLabel: output.target?.outputUrl ? 'LIVE_PREVIEW' : 'UNIT',
    });
    setPersistenceState(persisted);
  };

  const autoSections = monitorOutput?.sections?.filter(section => section.source === 'auto') ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Activity className="h-7 w-7 text-primary" />
            Monitor Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {productId ? `Processing: ${productName}` : 'No product selected'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {persistenceState?.state === 'failed'
            ? 'PERSISTED: FAILED'
            : monitorOutput?.loopClosed
              ? 'LOOP CLOSED'
              : 'MONITOR EVIDENCE PARTIAL'}
        </div>
      </div>

      {!productId && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= and ?outputUrl= to the URL to continue.
        </section>
      )}

      {monitorOutput?.flag && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">{monitorOutput.flag}</p>
          <p className="mt-1">{monitorOutput.correctivePrompts?.[0]}</p>
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
          Monitor signals
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

      <section className="grid gap-3 rounded-lg border border-border bg-card p-4">
        <span className="text-sm font-bold text-foreground">Run live check</span>
        <select
          value={checkStatus}
          onChange={event => setCheckStatus(event.target.value)}
          className="rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="healthy">healthy</option>
          <option value="unhealthy">unhealthy</option>
        </select>
        <Button type="button" onClick={submitMonitor} disabled={!productId}>
          Submit Monitor Check
        </Button>
      </section>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Monitor Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Loop closes only after a real check and renewal decision.</p>
            </div>
            <ScoreDisplay percent={monitorOutput?.monitorScore ?? score.monitorScore} />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>monitorComplete: {String(score.monitorComplete)}</div>
            <div>loopClosed: {String(score.loopClosed)}</div>
          </div>
        </section>
      )}
    </div>
  );
}
