import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, FileText, Hammer, PenLine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { runBuild } from '@/lib/forge/buildRunner';
import { scoreBuildStep, BUILD_BLOCKED } from '@/lib/forge/buildStepScorer';
import { runDesign } from '@/lib/forge/designRunner';
import { runResearch } from '@/lib/forge/researchRunner';

function InputPreview({ value }) {
  if (typeof value === 'string') return <span>{value}</span>;
  return <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

export default function ForgeBuildForm() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? null;
  const productName = searchParams.get('productName') ?? productId ?? 'Unknown Product';
  const [decisionText, setDecisionText] = useState('');
  const [designOutput, setDesignOutput] = useState(null);
  const [buildOutput, setBuildOutput] = useState(null);
  const [score, setScore] = useState(null);

  useEffect(() => {
    let active = true;
    if (!productId) {
      setDesignOutput(null);
      setBuildOutput(null);
      setScore(null);
      return () => {
        active = false;
      };
    }

    (async () => {
      const research = await runResearch(productId, {}, { productId, productName });
      const design = await runDesign(productId, research, {}, { productId, productName });
      const build = await runBuild(productId, design, {}, { productId, productName });
      if (!active) return;
      setDesignOutput(design);
      setBuildOutput(build);
      setScore(scoreBuildStep(build));
    })();

    return () => {
      active = false;
    };
  }, [productId, productName]);

  const autoSections = buildOutput?.sections?.filter(section => section.source === 'auto') ?? [];
  const orchestratedSections = buildOutput?.sections?.filter(section => section.source === 'orchestrated') ?? [];
  const derivedSections = buildOutput?.sections?.filter(section => section.source === 'derived') ?? [];
  const manualSections = buildOutput?.sections?.filter(section => section.source === 'manual') ?? [];
  const hasDecision = decisionText.trim().length > 0;

  const submitBuild = async () => {
    if (!productId || !designOutput) return;
    const output = await runBuild(productId, designOutput, {
      'build-decision-log': decisionText,
    }, {
      productId,
      productName,
    });
    setBuildOutput(output);
    setScore(scoreBuildStep(output));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Hammer className="h-7 w-7 text-primary" />
            Build Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {productId ? `Processing: ${productName}` : 'No product selected'}
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {buildOutput?.readyForQualityAudit ? 'READY FOR QUALITY AUDIT' : 'BUILD EVIDENCE PARTIAL'}
        </div>
      </div>

      {!productId && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= to the URL to continue.
        </section>
      )}

      {productId && !buildOutput && (
        <section className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Preparing build plan...
        </section>
      )}

      {buildOutput?.flag === BUILD_BLOCKED && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">BUILD_BLOCKED</p>
          <p className="mt-1">{buildOutput.entryPath.reason}</p>
          <p className="mt-1 text-xs">{buildOutput.entryPath.action}</p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Auto-populated build plan
        </div>
        <div className="grid gap-3">
          {autoSections.map(section => (
            <div key={section.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{section.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
              <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                <InputPreview value={section.input} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Code task dispatches
        </div>
        <div className="grid gap-3">
          {orchestratedSections.map(section => (
            <div key={section.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{section.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
              <div className="mt-2 inline-flex rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200">
                Pending AI build tool or entry-path unlock
              </div>
              <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                <InputPreview value={section.input} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Build risks
        </div>
        <div className="grid gap-3">
          {derivedSections.map(section => (
            <div key={section.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{section.label}</p>
              <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                <InputPreview value={section.input} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PenLine className="h-4 w-4 text-primary" />
          Build decision log
        </div>
        {manualSections.map(section => (
          <label key={section.id} className="grid gap-2 rounded-lg border border-border bg-card p-4">
            <span className="text-sm font-bold text-foreground">{section.label}</span>
            <span className="text-xs text-muted-foreground">{section.prompt}</span>
            <textarea
              value={decisionText}
              onChange={event => setDecisionText(event.target.value)}
              rows={5}
              className="min-h-32 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitBuild} disabled={!productId || !hasDecision}>
          Submit Build Plan
        </Button>
        {!hasDecision && <span className="text-xs text-muted-foreground">Add at least one build decision to score Step 3.</span>}
      </div>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Build Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Ready for quality audit requires score at least 95 and buildComplete true.</p>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
              {score.readyForQualityAudit && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {score.buildScore}%
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>buildComplete: {String(score.buildComplete)}</div>
            <div>readyForQualityAudit: {String(score.readyForQualityAudit)}</div>
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
