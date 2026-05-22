import { useMemo, useState } from 'react';
import { AlertTriangle, Copy, Download, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';

function badgeColor(value) {
  if (value === 'low') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
  if (value === 'medium') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
  if (value === 'high') return 'bg-red-500/10 text-red-400 border-red-500/30';
  return 'bg-muted/30 text-muted-foreground border-border';
}

function copyText(text) {
  try { navigator.clipboard?.writeText?.(text); } catch { /* ignore */ }
}

function downloadJson(payload) {
  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowai-findings-report.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch { /* ignore */ }
}

export default function FindingsReport({ deepBrowserAnalysis, fixProposals, sourceMappedFixProposals, findingsCount, findingsSeverity }) {
  const [copied, setCopied] = useState(null);
  const proposals = Array.isArray(fixProposals) ? fixProposals : [];
  const sourceMapped = Array.isArray(sourceMappedFixProposals) ? sourceMappedFixProposals : [];
  const deep = deepBrowserAnalysis && typeof deepBrowserAnalysis === 'object' ? deepBrowserAnalysis : null;
  const framework = deep?.frameworkDetection;
  const summary = deep?.summary || {};
  const sev = findingsSeverity || {};
  const total = typeof findingsCount === 'number'
    ? findingsCount
    : ((sev.critical ?? 0) + (sev.high ?? 0) + (sev.medium ?? 0) + (sev.low ?? 0));

  const payload = useMemo(() => ({
    generatedBy: 'FlowAI FindingsReport',
    summary,
    frameworkDetection: framework,
    consoleFindings: deep?.consoleFindings ?? [],
    networkFindings: deep?.networkFindings ?? [],
    assetInventory: deep?.assetInventory ?? {},
    fixProposals: proposals,
    sourceMappedFixProposals: sourceMapped,
  }), [deep, framework, proposals, sourceMapped, summary]);

  if (!deep && proposals.length === 0 && sourceMapped.length === 0 && total === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-background/50 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-foreground">Engineering Findings Report</p>
          <p className="text-[10px] text-muted-foreground">
            FlowAI inspected rendered runtime behavior. Source-level patches require registered repository access.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => downloadJson(payload)}>
          <Download className="h-3 w-3" /> JSON
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-1 text-[10px]">
        <div className="rounded bg-muted/40 p-1.5 text-center"><div className="font-bold">{total}</div><div className="text-muted-foreground">findings</div></div>
        <div className="rounded bg-red-500/15 p-1.5 text-center"><div className="font-bold text-red-400">{sev.critical ?? 0}</div><div className="text-muted-foreground">critical</div></div>
        <div className="rounded bg-orange-500/15 p-1.5 text-center"><div className="font-bold text-orange-400">{sev.high ?? 0}</div><div className="text-muted-foreground">high</div></div>
        <div className="rounded bg-amber-500/15 p-1.5 text-center"><div className="font-bold text-amber-400">{sev.medium ?? 0}</div><div className="text-muted-foreground">medium</div></div>
        <div className="rounded bg-muted/30 p-1.5 text-center"><div className="font-bold text-muted-foreground">{sev.low ?? 0}</div><div className="text-muted-foreground">low</div></div>
      </div>

      {framework && (
        <div className="rounded border border-border/60 p-2 text-[11px]">
          <span className="font-semibold text-foreground">Framework detected:</span>{' '}
          <span className="text-primary">{framework.framework}</span>{' '}
          <span className="text-muted-foreground">({framework.confidence} confidence)</span>
          {Array.isArray(framework.evidence) && framework.evidence.length > 0 && (
            <div className="text-[10px] text-muted-foreground mt-1">{framework.evidence.join('; ')}</div>
          )}
        </div>
      )}

      {deep && deep.ok === false && (
        <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] flex gap-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Deep browser analysis unavailable: {deep.error || deep.summary?.reason || 'Playwright/Browserless did not provide a page.'}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-2 text-[10px]">
        <div className="rounded border border-border/60 p-2">
          <div className="font-semibold text-foreground">Console</div>
          <div className="text-muted-foreground">{summary.consoleCount ?? 0} captured</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="font-semibold text-foreground">Network</div>
          <div className="text-muted-foreground">{summary.networkCount ?? 0} flagged</div>
        </div>
        <div className="rounded border border-border/60 p-2">
          <div className="font-semibold text-foreground">Assets</div>
          <div className="text-muted-foreground">{summary.scriptCount ?? 0} scripts · {summary.stylesheetCount ?? 0} stylesheets</div>
        </div>
      </div>

      {proposals.length > 0 ? (
        <div className="space-y-2">
          {proposals.slice(0, 8).map((proposal, i) => {
            const risk = proposal.riskAssessment || {};
            const copyPayload = `${proposal.title}\n\n${proposal.proposal}\n\nBefore:\n${proposal.before}\n\nAfter:\n${proposal.after}`;
            return (
              <details key={`${proposal.findingId}-${i}`} className="rounded border border-border/60 bg-card/60">
                <summary className="cursor-pointer px-3 py-2 text-xs flex items-center gap-2">
                  <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold flex-1">{proposal.title}</span>
                  <span className={`rounded border px-1.5 py-0.5 ${badgeColor(risk.regressionRisk)}`}>
                    {risk.regressionRisk || 'unknown'} risk
                  </span>
                  <span className="text-muted-foreground">{risk.confidence ?? 0}%</span>
                </summary>
                <div className="px-3 pb-3 space-y-2 text-[11px]">
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded bg-primary/10 text-primary px-1.5 py-0.5">{proposal.fixLevel}</span>
                    <span className="rounded bg-muted/40 text-muted-foreground px-1.5 py-0.5">{proposal.evidenceLevel}</span>
                    {risk.requiresReview && <span className="rounded bg-amber-500/10 text-amber-400 px-1.5 py-0.5">requires review</span>}
                  </div>
                  <p className="text-foreground/90">{proposal.proposal}</p>
                  <p className="text-muted-foreground">{proposal.rationale}</p>
                  {proposal.fixLevel === 'SOURCE_REQUIRED' && (
                    <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 flex gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Source access required for a real patch. This report does not claim a source file path.</span>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-2">
                    <pre className="rounded bg-black/30 p-2 overflow-auto whitespace-pre-wrap"><span className="text-muted-foreground">Before</span>{'\n'}{proposal.before || '(not available)'}</pre>
                    <pre className="rounded bg-black/30 p-2 overflow-auto whitespace-pre-wrap"><span className="text-muted-foreground">After</span>{'\n'}{proposal.after || '(source required)'}</pre>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="gap-1 text-xs" onClick={() => { copyText(copyPayload); setCopied(i); }}>
                    <Copy className="h-3 w-3" /> {copied === i ? 'Copied' : 'Copy fix'}
                  </Button>
                </div>
              </details>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">No DOM-level proposals were generated from the current evidence.</p>
      )}

      {sourceMapped.length > 0 && (
        <div className="space-y-2">
          <div>
            <p className="text-xs font-bold text-foreground">Source-Mapped Recommendations</p>
            <p className="text-[10px] text-muted-foreground">
              U5 recommendations are source-aware and recommendation-only. FlowAI will not auto-apply these changes.
            </p>
          </div>
          {sourceMapped.slice(0, 8).map((proposal, i) => (
            <details key={`${proposal.findingId || proposal.category || 'source'}-${i}`} className="rounded border border-border/60 bg-card/60">
              <summary className="cursor-pointer px-3 py-2 text-xs flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold flex-1">{proposal.category || 'source recommendation'}</span>
                <span className={`rounded border px-1.5 py-0.5 ${
                  proposal.confidence === 'HIGH'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : proposal.confidence === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-muted/30 text-muted-foreground border-border'
                }`}>
                  {proposal.confidence || 'LOW'}
                </span>
                <span className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-blue-300">
                  {proposal.authority || 'recommend_only'}
                </span>
              </summary>
              <div className="px-3 pb-3 space-y-2 text-[11px]">
                {proposal.sourceMapComplete ? (
                  <p className="text-muted-foreground">
                    <span className="text-foreground font-semibold">Source:</span>{' '}
                    <span className="font-mono">{proposal.filePath}</span>
                    {proposal.lineNumber && <span className="font-mono">:{proposal.lineNumber}</span>}
                  </p>
                ) : (
                  <div className="rounded border border-amber-500/30 bg-amber-500/10 p-2 flex gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Source map incomplete. FlowAI is intentionally limiting this to a LOW-confidence recommendation.</span>
                  </div>
                )}
                <p className="text-foreground/90">{proposal.proposedFix}</p>
                <p className="text-muted-foreground">Reason: {proposal.reason || 'source_mapped_recommendation'}</p>
                <pre className="rounded bg-black/30 p-2 overflow-auto whitespace-pre-wrap">
                  <span className="text-muted-foreground">Current snippet</span>{'\n'}{proposal.currentSnippet || '(not available)'}
                </pre>
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
