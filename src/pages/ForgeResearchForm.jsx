import { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, FileText, LockKeyhole } from 'lucide-react';
import { useLocation, useSearchParams } from 'react-router-dom';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  SectionStatusIcon,
} from '@/components/forge/ForgeSectionRenderer.jsx';
import { buildResearchTemplate } from '@/lib/forge/researchTemplate';
import { scoreForgeStep } from '@/lib/forge/forgeStepScorer';
import { resolveProductContext } from '@/lib/forge/resolveProductContext';
import { persistenceDisplayText } from '@/lib/forge/persistForgeArtifactClient';
import { loadDurableStageArtifacts } from '@/lib/forge/durableStageClient';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';

function blockedPublicUrlReason(value) {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return 'Enter a valid http(s) URL before running Research Forge.';
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return 'Only http(s) URLs can be used for Research Forge.';
  }
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host === '::1') {
    return 'Localhost URLs are blocked for Research Forge.';
  }
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 0 || a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254)) {
      return 'Private, loopback, and link-local URLs are blocked for Research Forge.';
    }
  }
  return null;
}

export function resolveForgeResearchRouteContext({
  productId,
  productName,
  productUrl,
  productDescription,
} = /** @type {any} */ ({})) {
  if (productId) {
    return {
      id: productId,
      name: productName ?? productId,
      url: productUrl ?? null,
      description: productDescription ?? '',
      platform: 'unknown',
      derivedFromUrl: false,
    };
  }
  if (productUrl || productDescription) {
    const derived = resolveProductContext({
      url: productUrl ?? null,
      description: productDescription ?? '',
    });
    return {
      ...derived,
      derivedFromUrl: true,
    };
  }
  return {
    id: null,
    name: productName ?? 'Unknown Product',
    url: productUrl ?? null,
    description: productDescription ?? '',
    platform: 'unknown',
    derivedFromUrl: false,
  };
}

export default function ForgeResearchForm() {
  const { getBearerToken } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const productIdParam = searchParams.get('productId') ?? null;
  const productNameParam = searchParams.get('productName') ?? null;
  const productUrl = searchParams.get('url') ?? location.state?.url ?? null;
  const productDescription = searchParams.get('description') ?? location.state?.description ?? '';
  const productContext = useMemo(() => resolveForgeResearchRouteContext({
    productId: productIdParam,
    productName: productNameParam,
    productUrl,
    productDescription,
  }), [productDescription, productIdParam, productNameParam, productUrl]);
  const productId = productContext.id;
  const productName = productContext.name;
  const template = useMemo(() => buildResearchTemplate(productContext), [productContext]);
  const manualSections = template.sections.filter(section => section.source === 'manual');
  const autoSections = template.sections.filter(section => section.source === 'auto');
  const orchestratedSections = template.sections.filter(section => section.source === 'orchestrated');
  const [manualInputs, setManualInputs] = useState({});
  const [researchOutput, setResearchOutput] = useState(null);
  const [score, setScore] = useState(null);
  const [urlGuardMessage, setUrlGuardMessage] = useState(null);
  const [persistenceState, setPersistenceState] = useState(null);

  useEffect(() => {
    let active = true;
    if (!productId) return () => {
      active = false;
    };
    (async () => {
      try {
        const artifacts = await loadDurableStageArtifacts({ getBearerToken, productId });
        if (!active || !artifacts.research?.output) return;
        setResearchOutput(artifacts.research.output);
        setScore(scoreForgeStep(artifacts.research.output));
        setPersistenceState({
          state: 'persisted',
          runId: artifacts.research.provenance?.runId ?? null,
          artifactId: artifacts.research.id,
        });
      } catch (error) {
        if (active) setPersistenceState({ state: 'failed', reason: error.message });
      }
    })();
    return () => {
      active = false;
    };
  }, [getBearerToken, productId]);

  const allManualComplete = manualSections.every(section => {
    const value = section.status === 'complete' ? section.input : manualInputs[section.id];
    return typeof value === 'string' && value.trim().length > 0;
  });

  const updateInput = (sectionId, value) => {
    setManualInputs(current => ({ ...current, [sectionId]: value }));
  };

  const submitResearch = async () => {
    if (!productId) return;
    const blockedReason = blockedPublicUrlReason(productUrl);
    if (blockedReason) {
      setUrlGuardMessage(blockedReason);
      return;
    }
    setUrlGuardMessage(null);
    setPersistenceState({ state: 'pending' });
    const token = await getBearerToken();
    const response = await fetch('/api/forge/stage', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': `research-${productId}-${Date.now()}`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        stage: 'research',
        productId,
        environment: 'staging',
        productionPromotionAuthorized: false,
        url: productUrl,
        manualInputs,
        productContext,
        config: {
          toolIntelligenceMode: 'AUTOMATIC',
          productId,
          productName,
          productDescription,
          productUrl,
        },
      }),
    });
    const payload = await response.json();
    if (!response.ok || !payload?.ok) {
      const failedAttempts = Array.isArray(payload?.details?.attempts)
        ? payload.details.attempts
          .filter(attempt => attempt?.state === 'failed' || attempt?.state === 'timeout' || attempt?.state === 'unavailable')
          .map(attempt => `${attempt.tool || attempt.memberId || 'provider'}: ${attempt.reason || attempt.state}`)
          .join(' | ')
        : '';
      setPersistenceState({
        state: 'failed',
        reason: [payload?.message || payload?.error || `HTTP ${response.status}`, failedAttempts].filter(Boolean).join(' — '),
      });
      return;
    }
    const output = payload.artifact?.output;
    setResearchOutput(output);
    setScore(scoreForgeStep(output));
    setPersistenceState({ state: 'persisted', runId: payload.runId, artifactId: payload.artifact?.id });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <BookOpenCheck className="h-7 w-7 text-primary" />
            Research Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{productId ? `Processing: ${productName}` : 'No product selected'}</p>
          {productContext.derivedFromUrl && (
            <p className="mt-1 text-xs text-muted-foreground">
              Product context derived from URL for this run.
            </p>
          )}
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {persistenceState?.state === 'failed' ? 'PERSISTED: FAILED' : researchOutput?.readyForDesign ? 'READY FOR DESIGN' : 'RESEARCH IN PROGRESS'}
        </div>
      </div>

      {!productId && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= or ?url= to the URL to continue.
        </section>
      )}

      {urlGuardMessage && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          {urlGuardMessage}
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
          Auto-populated
        </div>
        <div className="grid gap-3">
          {autoSections.map(section => {
            const preview = researchOutput?.sections?.find(item => item.id === section.id)?.input ?? null;
            return (
              <div key={section.id} className="rounded-lg border border-border bg-card p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <SectionStatusIcon status={getSectionStatus(preview)} />
                  {section.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
                <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                  <ForgeSectionRenderer value={preview} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <LockKeyhole className="h-4 w-4 text-primary" />
          Manual inputs
        </div>
        <div className="grid gap-3">
          {manualSections.map(section => (
            <label key={section.id} className="grid gap-2 rounded-lg border border-border bg-card p-4">
              <span className="flex items-center gap-2 text-sm font-bold text-foreground">
                <SectionStatusIcon status={getSectionStatus(section.input)} />
                {section.label}
              </span>
              <span className="text-xs text-muted-foreground">{section.prompt}</span>
              <textarea
                value={section.status === 'complete' ? section.input : (manualInputs[section.id] ?? '')}
                onChange={event => updateInput(section.id, event.target.value)}
                readOnly={section.status === 'complete'}
                rows={4}
                className="min-h-28 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Orchestrated research
        </div>
        <div className="grid gap-3">
          {orchestratedSections.map(section => {
            const preview = researchOutput?.sections?.find(item => item.id === section.id)?.input ?? null;
            return (
              <div key={section.id} className="rounded-lg border border-border bg-card p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <SectionStatusIcon status={getSectionStatus(preview)} />
                  {section.label}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
                <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                  <ForgeSectionRenderer value={preview} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitResearch} disabled={!productId || !allManualComplete}>
          Submit Research
        </Button>
        {!allManualComplete && <span className="text-xs text-muted-foreground">Complete all manual sections to run Step 1.</span>}
      </div>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Forge Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Ready for design requires at least 95% completion.</p>
            </div>
            <ScoreDisplay percent={researchOutput?.completionPct ?? score.score} />
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
