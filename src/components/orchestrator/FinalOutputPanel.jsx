import { CheckCircle2, Globe, ExternalLink, AlertTriangle, Trophy, Smartphone, ShoppingBag } from 'lucide-react';
import { safeStr } from '@/lib/safeStr';

export default function FinalOutputPanel({ context }) {
  const { analysis, deploy, mobile, appstore, output } = context || {};
  if (!output) return null;

  const liveUrl = deploy?.url;
  const replitUrl = context?.build?.replit?.url;

  const classColor = {
    'Prototype': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'MVP': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'Production-ready': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    'Marketplace-ready': 'text-primary bg-primary/10 border-primary/30',
  }[output.classification] || 'text-muted-foreground bg-secondary/20 border-border';

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Trophy className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Pipeline Complete — {analysis?.productName}</p>
          <p className="text-[10px] text-muted-foreground">{analysis?.productType} · {output.readinessScore}/100 readiness</p>
        </div>
        <span className={`ml-auto text-[10px] font-bold px-2 py-1 rounded border ${classColor}`}>
          {output.classification}
        </span>
      </div>

      {/* Live URLs */}
      {(liveUrl || replitUrl) && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">Live Deployments</p>
          {liveUrl && (
            <a href={liveUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline font-mono bg-primary/10 px-3 py-2 rounded-lg border border-primary/20">
              <Globe className="h-4 w-4 shrink-0" /> Vercel: {liveUrl} <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          )}
          {replitUrl && (
            <a href={replitUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-orange-400 hover:underline font-mono bg-orange-500/10 px-3 py-2 rounded-lg border border-orange-500/20">
              <Globe className="h-4 w-4 shrink-0" /> Replit: {replitUrl} <ExternalLink className="h-3 w-3 ml-auto" />
            </a>
          )}
        </div>
      )}

      {/* Mobile + App Store */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mobile && (
          <div className="p-3 rounded-lg border border-border bg-card space-y-1">
            <div className="flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-blue-400" />
              <p className="text-xs font-bold text-foreground">Mobile Strategy</p>
            </div>
            <p className="text-[10px] text-muted-foreground">PWA: {mobile.pwaReadiness}% · Native: {mobile.nativeReadiness}%</p>
            <p className="text-[10px] text-muted-foreground">Framework: {mobile.nativeStrategy?.framework}</p>
          </div>
        )}
        {appstore && (
          <div className="p-3 rounded-lg border border-border bg-card space-y-1">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-purple-400" />
              <p className="text-xs font-bold text-foreground">App Store Readiness</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Apple: {appstore.appleReadiness?.score}% · Google: {appstore.googlePlayReadiness?.score}%</p>
            <p className="text-[10px] text-muted-foreground">Samsung: {appstore.samsungReadiness?.score}%</p>
          </div>
        )}
      </div>

      {/* Gap Report */}
      {output.gapReport?.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-[10px] font-semibold text-amber-400 uppercase">Gap Report</p>
          </div>
          {output.gapReport.map((g, i) => {
            const gObj = typeof g === 'object' && g !== null ? g : { impact: '', gap: String(g) };
            return (
              <div key={i} className="flex items-start gap-2 text-[10px]">
                <span className={`mt-0.5 px-1 py-0.5 rounded text-[9px] font-bold ${gObj.impact === 'high' ? 'bg-red-500/20 text-red-400' : gObj.impact === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-secondary text-muted-foreground'}`}>{String(gObj.impact || '')}</span>
                <span className="text-muted-foreground flex-1">{String(gObj.gap || '')}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Next Steps */}
      {output.nextSteps?.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-emerald-400 uppercase">Next Steps</p>
          {output.nextSteps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-muted-foreground">{safeStr(s)}</span>
            </div>
          ))}
        </div>
      )}

      {output.executiveSummary && (
        <p className="text-[10px] text-muted-foreground italic border-t border-border/40 pt-3">{output.executiveSummary}</p>
      )}
    </div>
  );
}