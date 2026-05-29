import { useMemo, useState } from 'react';
import { CheckCircle2, FileText, PenLine, Workflow } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { runDesign } from '@/lib/forge/designRunner';
import { scoreDesignStep, DESIGN_PARTIAL_TOOL_REQUIRED } from '@/lib/forge/designStepScorer';
import { runResearch } from '@/lib/forge/researchRunner';

const PRODUCT_ID = 'saige';

function InputPreview({ value }) {
  if (typeof value === 'string') return <span>{value}</span>;
  return <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

export default function ForgeDesignForm() {
  const researchOutput = useMemo(() => runResearch(PRODUCT_ID), []);
  const initialOutput = useMemo(() => runDesign(PRODUCT_ID, researchOutput, {}), [researchOutput]);
  const [decisionText, setDecisionText] = useState('');
  const [designOutput, setDesignOutput] = useState(initialOutput);
  const [score, setScore] = useState(scoreDesignStep(initialOutput));

  const autoSections = designOutput.sections.filter(section => section.source === 'auto');
  const orchestratedSections = designOutput.sections.filter(section => section.source === 'orchestrated');
  const derivedSections = designOutput.sections.filter(section => section.source === 'derived');
  const manualSections = designOutput.sections.filter(section => section.source === 'manual');
  const hasDecision = decisionText.trim().length > 0;

  const submitDesign = () => {
    const output = runDesign(PRODUCT_ID, researchOutput, {
      'design-decision-log': decisionText,
    });
    setDesignOutput(output);
    setScore(scoreDesignStep(output));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <Workflow className="h-7 w-7 text-primary" />
            SAIGE Design Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Step 2 design capture for the FlowAI reference product.</p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {designOutput.readyForBuild ? 'READY FOR BUILD' : 'DESIGN PARTIAL'}
        </div>
      </div>

      {designOutput.flag === DESIGN_PARTIAL_TOOL_REQUIRED && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">{DESIGN_PARTIAL_TOOL_REQUIRED}</p>
          <p className="mt-1">{designOutput.partialFlag.reason}</p>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Auto-populated
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
          Orchestrated design
        </div>
        <div className="grid gap-3">
          {orchestratedSections.map(section => (
            <div key={section.id} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-bold text-foreground">{section.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
              <div className="mt-2 inline-flex rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-200">
                Pending AI design tool configuration
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
          Design gaps
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
          Design decision log
        </div>
        {manualSections.map(section => (
          <label key={section.id} className="grid gap-2 rounded-lg border border-border bg-card p-4">
            <span className="text-sm font-bold text-foreground">{section.label}</span>
            <span className="text-xs text-muted-foreground">{section.prompt}</span>
            <textarea
              value={decisionText}
              onChange={event => setDecisionText(event.target.value)}
              rows={5}
              placeholder="Add MINIMUM BUILD DIRECTIVE: [description] to proceed without full tool configuration"
              className="min-h-32 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </label>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitDesign} disabled={!hasDecision}>
          Submit Design
        </Button>
        {!hasDecision && <span className="text-xs text-muted-foreground">Add at least one design decision to score Step 2.</span>}
      </div>

      {score && (
        <section className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Design Step Score</p>
              <p className="mt-1 text-xs text-muted-foreground">Ready for build requires score at least 95 and designComplete true.</p>
            </div>
            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
              {score.readyForBuild && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {score.designScore}%
            </div>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
            <div>designComplete: {String(score.designComplete)}</div>
            <div>readyForBuild: {String(score.readyForBuild)}</div>
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
