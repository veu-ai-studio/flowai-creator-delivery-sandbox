import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, PenLine, ShieldCheck } from 'lucide-react';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  SectionStatusIcon,
} from '@/components/forge/ForgeSectionRenderer.jsx';
import { Button } from '@/components/ui/button';
import { runAudit } from '@/lib/forge/auditRunner';
import { scoreAuditStep, AUDIT_QUEUED } from '@/lib/forge/auditStepScorer';
import { runBuild } from '@/lib/forge/buildRunner';
import { runDesign } from '@/lib/forge/designRunner';
import { runResearch } from '@/lib/forge/researchRunner';

export default function ForgeAuditForm() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('productId') ?? null;
  const productName = searchParams.get('productName') ?? productId ?? 'Unknown Product';
  const [decisionText, setDecisionText] = useState('');
  const [buildOutput, setBuildOutput] = useState(null);
  const [auditOutput, setAuditOutput] = useState(null);
  const [score, setScore] = useState(null);
  const hasDecision = decisionText.trim().length > 0;

  useEffect(() => {
    let active = true;
    if (!productId) {
      setBuildOutput(null);
      setAuditOutput(null);
      setScore(null);
      return () => {
        active = false;
      };
    }

    (async () => {
      const research = await runResearch(productId, {}, { productId, productName });
      const design = await runDesign(productId, research, {}, { productId, productName });
      const build = await runBuild(productId, design, {}, { productId, productName });
      const audit = await runAudit(productId, build, {}, { productId, productName });
      if (!active) return;
      setBuildOutput(build);
      setAuditOutput(audit);
      setScore(scoreAuditStep(audit));
    })();

    return () => {
      active = false;
    };
  }, [productId, productName]);

  const submitAudit = async () => {
    if (!productId || !buildOutput) return;
    const output = await runAudit(productId, buildOutput, {
      'audit-decision-log': decisionText,
    }, {
      productId,
      productName,
    });
    setAuditOutput(output);
    setScore(scoreAuditStep(output));
  };

  if (!productId) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Quality Audit Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">No product selected</p>
        </div>
        <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          No product selected. Add ?productId= to the URL to continue.
        </section>
      </div>
    );
  }

  if (!auditOutput || !score) {
    return <div className="p-8 text-sm text-muted-foreground">Preparing quality audit...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8 lg:p-10">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Quality Audit Forge
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Processing: {productName}</p>
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
            <SectionStatusIcon status={getSectionStatus(section.input)} />
            {section.label}
          </div>
          <ForgeSectionRenderer value={section.input} />
        </section>
      ))}

      <section className="rounded-lg border border-border bg-card p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          <SectionStatusIcon status={getSectionStatus(auditOutput.auditFindings)} />
          Audit Findings
        </p>
        <div className="mt-3 rounded-md border border-border bg-background/50 p-3 text-xs text-muted-foreground">
          <ForgeSectionRenderer value={auditOutput.auditFindings} />
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
        <Button type="button" onClick={submitAudit} disabled={!productId || !hasDecision}>
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
          <ScoreDisplay percent={auditOutput?.auditScore ?? score.auditScore} />
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
