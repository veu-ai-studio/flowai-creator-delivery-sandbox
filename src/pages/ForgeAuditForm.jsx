import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, FileText, PenLine, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { runAudit } from '@/lib/forge/auditRunner';
import { scoreAuditStep, AUDIT_QUEUED } from '@/lib/forge/auditStepScorer';
import { runBuild } from '@/lib/forge/buildRunner';
import { runDesign } from '@/lib/forge/designRunner';
import { runResearch } from '@/lib/forge/researchRunner';

const PRODUCT_ID = 'saige';

function InputPreview({ value }) {
  if (typeof value === 'string') return <span>{value}</span>;
  return <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words text-[11px] leading-relaxed">{JSON.stringify(value, null, 2)}</pre>;
}

function StatusBadge({ status }) {
  const tone = status === 'PASS'
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
    : status === 'FAIL'
      ? 'border-red-500/30 bg-red-500/10 text-red-200'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-200';
  return <span className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${tone}`}>{status}</span>;
}

function CheckList({ checks }) {
  return (
    <div className="space-y-2">
      {(checks ?? []).map(check => (
        <div key={check.id} className="flex flex-col gap-2 rounded-md border border-border bg-background/50 p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold text-foreground">{check.label}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{check.reason}</p>
          </div>
          <StatusBadge status={check.status} />
        </div>
      ))}
    </div>
  );
}

export default function ForgeAuditForm() {
  const buildOutput = useMemo(() => {
    const research = runResearch(PRODUCT_ID);
    const design = runDesign(PRODUCT_ID, research, {});
    return runBuild(PRODUCT_ID, design, {});
  }, []);
  const [decisionText, setDecisionText] = useState('');
  const [auditOutput, setAuditOutput] = useState(null);
  const [score, setScore] = useState(null);
  const hasDecision = decisionText.trim().length > 0;

  useEffect(() => {
    let active = true;
    runAudit(PRODUCT_ID, buildOutput, {}).then(output => {
      if (!active) return;
      setAuditOutput(output);
      setScore(scoreAuditStep(output));
    });
    return () => {
      active = false;
    };
  }, [buildOutput]);

  const submitAudit = async () => {
    const output = await runAudit(PRODUCT_ID, buildOutput, {
      'audit-decision-log': decisionText,
    });
    setAuditOutput(output);
    setScore(scoreAuditStep(output));
  };

  if (!auditOutput || !score) {
    return <div className="p-8 text-sm text-muted-foreground">Preparing quality audit...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <ShieldCheck className="h-7 w-7 text-primary" />
            SAIGE Quality Audit Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Step 4 quality audit for the FlowAI reference product.</p>
        </div>
        <div className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground">
          {auditOutput.readyForDeploy ? 'READY FOR DEPLOY' : 'AUDIT EVIDENCE PARTIAL'}
        </div>
      </div>

      {auditOutput.flag === AUDIT_QUEUED && (
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <p className="font-bold">AUDIT_QUEUED</p>
          <p className="mt-1">{auditOutput.sections.find(section => section.id === 'audit-entry-state')?.input?.reason}</p>
        </section>
      )}

      {auditOutput.sections.filter(section => section.source === 'auto').map(section => (
        <section key={section.id} className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            {section.label}
          </div>
          {Array.isArray(section.input)
            ? <CheckList checks={section.input} />
            : <InputPreview value={section.input} />}
        </section>
      ))}

      <section className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-bold text-foreground">Audit Findings</p>
        <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
          <InputPreview value={auditOutput.auditFindings} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold text-foreground">
          <PenLine className="h-4 w-4 text-primary" />
          Audit decision log
        </div>
        <label className="grid gap-2 rounded-lg border border-border bg-card p-4">
          <span className="text-xs text-muted-foreground">Accept findings or flag items for remediation</span>
          <textarea
            value={decisionText}
            onChange={event => setDecisionText(event.target.value)}
            rows={5}
            className="min-h-32 rounded-md border border-border bg-background p-3 text-sm text-foreground outline-none focus:border-primary"
          />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submitAudit} disabled={!hasDecision}>
          Submit Audit
        </Button>
        {!hasDecision && <span className="text-xs text-muted-foreground">Add at least one audit decision to complete Step 4.</span>}
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-bold text-foreground">Audit Step Score</p>
            <p className="mt-1 text-xs text-muted-foreground">Ready for deploy requires score at least 95 and auditComplete true.</p>
          </div>
          <div className="flex items-center gap-2 text-lg font-bold text-foreground">
            {score.readyForDeploy && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            {score.auditScore}%
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
          <div>auditComplete: {String(score.auditComplete)}</div>
          <div>readyForDeploy: {String(score.readyForDeploy)}</div>
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
    </div>
  );
}
