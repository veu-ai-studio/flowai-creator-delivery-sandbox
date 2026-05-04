import { motion } from 'framer-motion';
import { Globe, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export default function OriginalProductPanel({ audit, metadata }) {
  const score = audit.overall_score || 0;
  const issueCount = Object.values(audit.issues || {}).flat().length;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Original Product
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{metadata?.title || 'Product'}</p>
        </div>
        <a href={audit.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1">
          Visit <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Audit Score</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">/100</p>
        </div>
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Issues Found</p>
          <p className={`text-2xl font-bold ${issueCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{issueCount}</p>
        </div>
        {audit.scores?.ui_ux !== undefined && (
          <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">UI/UX</p>
            <p className="text-2xl font-bold text-blue-400">{audit.scores.ui_ux}</p>
          </div>
        )}
      </div>

      {issueCount > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Key Issues</p>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {Object.entries(audit.issues || {})
              .flatMap(([layer, issues]) =>
                (Array.isArray(issues) ? issues : [issues]).slice(0, 3).map((issue, i) => ({
                  ...issue,
                  layer,
                  id: `${layer}-${i}`,
                }))
              )
              .slice(0, 5)
              .map(issue => (
                <div key={issue.id} className="flex items-start gap-2 text-xs rounded-lg bg-red-500/10 border border-red-500/20 p-2">
                  <AlertCircle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-red-400 font-semibold">{issue.layer || 'Issue'}</p>
                    <p className="text-muted-foreground">{issue.description || JSON.stringify(issue).slice(0, 60)}</p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}