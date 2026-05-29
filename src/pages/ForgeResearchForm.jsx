import { useMemo, useState } from 'react';
import { BookOpenCheck, CheckCircle2, FileText, LockKeyhole } from 'lucide-react';

import { buildResearchTemplate } from '@/lib/forge/researchTemplate';
import { runResearch } from '@/lib/forge/researchRunner';
import { scoreForgeStep } from '@/lib/forge/forgeStepScorer';
import { Button } from '@/components/ui/button';

const PRODUCT_ID = 'saige';

function InputPreview({ value }) {
  if (typeof value === 'string') return <span>{value}</span>;
  return <pre className="whitespace-pre-wrap break-words text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

export default function ForgeResearchForm() {
  const template = useMemo(() => buildResearchTemplate(PRODUCT_ID), []);
  const manualSections = template.sections.filter(section => section.source === 'manual');
  const autoSections = template.sections.filter(section => section.source === 'auto');
  const orchestratedSections = template.sections.filter(section => section.source === 'orchestrated');
  const [manualInputs, setManualInputs] = useState({});
  const [researchOutput, setResearchOutput] = useState(null);
  const [score, setScore] = useState(null);

  const allManualComplete = manualSections.every(section => {
    const value = section.status === 'complete' ? section.input : manualInputs[section.id];
    return typeof value === 'string' && value.trim().length > 0;
  });

  const updateInput = (sectionId, value) => {
    setManualInputs(current => ({ ...current, [sectionId]: value }));
  };

  const submitResearch = () => {
    const output = runResearch(PRODUCT_ID, manualInputs);
    setResearchOutput(output);
    setScore(scoreForgeStep(output));
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <BookOpenCheck className="h-7 w-7 text-primary" />
            SAIGE Research Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Step 1 research capture for the FlowAI reference product.</p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {researchOutput?.readyForDesign ? 'READY FOR DESIGN' : 'RESEARCH IN PROGRESS'}
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <FileText className="h-4 w-4 text-primary" />
          Auto-populated
        </div>
        <div className="grid gap-3">
          {autoSections.map(section => {
            const preview = researchOutput?.sections?.find(item => item.id === section.id)?.input ?? 'Runs after submit.';
            return (
              <div key={section.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-bold text-foreground">{section.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
                <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                  <InputPreview value={preview} />
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
              <span className="text-sm font-bold text-foreground">{section.label}</span>
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
            const preview = researchOutput?.sections?.find(item => item.id === section.id)?.input ?? 'Requires configured AI research tool or supplied orchestrated output.';
            return (
              <div key={section.id} className="rounded-lg border border-border bg-card p-4">
                <p className="text-sm font-bold text-foreground">{section.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{section.prompt}</p>
                <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
                  <InputPreview value={preview} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitResearch} disabled={!allManualComplete}>
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
            <div className="flex items-center gap-2 text-lg font-bold text-foreground">
              {score.readyForNextStep && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
              {score.score}%
            </div>
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
