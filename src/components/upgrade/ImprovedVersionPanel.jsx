import { motion } from 'framer-motion';
import { CheckCircle2, Zap, ExternalLink, FileCode2 } from 'lucide-react';

export default function ImprovedVersionPanel({ audit, url, verifyResult, generatedFiles }) {
  const score = audit.overall_score || 0;
  const issueCount = Object.values(audit.issues || {}).flat().length;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-6 space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-400" />
            Improved Version
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">Auto-generated & deployed</p>
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1">
          Open Live <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">New Score</p>
          <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
        </div>
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Issues</p>
          <p className={`text-2xl font-bold ${issueCount === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>{issueCount}</p>
        </div>
        {verifyResult?.get_api?.ok && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-emerald-400 font-semibold">GET /api</span>
          </div>
        )}
        {verifyResult?.post_api_run?.ok && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="text-[10px] text-emerald-400 font-semibold">POST /api/run</span>
          </div>
        )}
      </div>

      {generatedFiles && generatedFiles.length > 0 && (
        <div className="rounded-lg bg-secondary/30 border border-border/50 p-3">
          <p className="text-xs font-semibold text-foreground flex items-center gap-1 mb-2">
            <FileCode2 className="h-3 w-3 text-primary" />
            Generated Files ({generatedFiles.length})
          </p>
          <div className="flex flex-wrap gap-1">
            {generatedFiles.map((f, i) => (
              <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                {f.path.split('/').pop()}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}