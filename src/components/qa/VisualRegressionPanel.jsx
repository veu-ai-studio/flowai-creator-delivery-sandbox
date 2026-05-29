import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, AlertTriangle, CheckCircle2, Eye } from 'lucide-react';

const DIFF_LEVELS = {
  none: { label: 'No Change', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  minor: { label: 'Minor', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
  major: { label: 'Major', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
};

export default function VisualRegressionPanel({ url, crawlData }) {
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [diffResult, setDiffResult] = useState(null);

  const captureSnapshot = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a visual QA tool. Analyze the following crawl data from ${url} and describe the visual state of the page in detail. 
        
Crawl data: ${JSON.stringify(crawlData || { url }, null, 2)}

Return a visual snapshot analysis including:
- Layout structure (header, nav, main content areas, footer)
- Color scheme and branding
- Interactive elements visible (buttons, forms, modals)
- Any visible errors or broken elements
- Estimated visual complexity score (1-10)
- Key UI landmarks (list 5-10 specific elements)`,
        response_json_schema: {
          type: 'object',
          properties: {
            layout: { type: 'string' },
            color_scheme: { type: 'string' },
            interactive_elements: { type: 'array', items: { type: 'string' } },
            errors: { type: 'array', items: { type: 'string' } },
            complexity_score: { type: 'number' },
            landmarks: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      const newSnapshot = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        url,
        data: res,
      };
      setSnapshots(prev => [newSnapshot, ...prev]);
      setDiffResult(null);
    } catch (err) {
      console.error('Snapshot error', err);
    } finally {
      setLoading(false);
    }
  };

  const runComparison = async () => {
    if (snapshots.length < 2) return;
    setComparing(true);
    try {
      const [current, previous] = snapshots;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Compare these two visual snapshots of a web page and identify regressions.

PREVIOUS SNAPSHOT:
${JSON.stringify(previous.data, null, 2)}

CURRENT SNAPSHOT:
${JSON.stringify(current.data, null, 2)}

Identify visual regressions, improvements, and unchanged areas. Be specific about what changed.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_diff: { type: 'string', enum: ['none', 'minor', 'major'] },
            regressions: { type: 'array', items: { type: 'string' } },
            improvements: { type: 'array', items: { type: 'string' } },
            unchanged: { type: 'array', items: { type: 'string' } },
            summary: { type: 'string' },
          },
        },
      });
      setDiffResult(res);
    } catch (err) {
      console.error('Compare error', err);
    } finally {
      setComparing(false);
    }
  };

  const level = diffResult ? DIFF_LEVELS[diffResult.overall_diff] || DIFF_LEVELS.none : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Camera className="h-4 w-4 text-primary" />
          Visual Regression Detection
        </h2>
        <div className="flex gap-2">
          {snapshots.length >= 2 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={runComparison} disabled={comparing}>
              {comparing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Compare
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={captureSnapshot} disabled={loading}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Capture Snapshot
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Capture visual snapshots before/after changes to detect UI regressions automatically.
      </p>

      {/* Diff result */}
      <AnimatePresence>
        {diffResult && level && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-lg border p-4 space-y-3 ${level.bg}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {diffResult.overall_diff === 'none'
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  : <AlertTriangle className="h-4 w-4 text-amber-400" />}
                <span className={`text-sm font-semibold ${level.color}`}>
                  {level.label} Visual Change Detected
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{diffResult.summary}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {diffResult.regressions?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wide">Regressions</p>
                  {diffResult.regressions.map((r, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {r}</p>
                  ))}
                </div>
              )}
              {diffResult.improvements?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide">Improvements</p>
                  {diffResult.improvements.map((r, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {r}</p>
                  ))}
                </div>
              )}
              {diffResult.unchanged?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Unchanged</p>
                  {diffResult.unchanged.map((r, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">• {r}</p>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshots list */}
      {snapshots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Snapshots ({snapshots.length})</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {snapshots.map((snap, i) => (
              <motion.div
                key={snap.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="p-3 rounded-lg border border-border/50 bg-secondary/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-primary">
                    Snapshot {snapshots.length - i} {i === 0 ? '(latest)' : ''}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(snap.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-muted-foreground">Layout: </span>
                    <span className="text-foreground">{snap.data?.layout?.slice(0, 60)}…</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Complexity: </span>
                    <span className="text-foreground font-semibold">{snap.data?.complexity_score}/10</span>
                  </div>
                </div>
                {snap.data?.errors?.length > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    {snap.data.errors.length} visual error(s) detected
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {snapshots.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-xs">
          Capture a snapshot before and after changes to detect regressions.
        </div>
      )}
    </motion.div>
  );
}