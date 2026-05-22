import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, Brain, TrendingUp, Zap, CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';

const SCORE_COLOR = s => s >= 8 ? 'text-emerald-400' : s >= 6 ? 'text-amber-400' : 'text-red-400';

function FeedbackCard({ fb, i }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.04 }}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/20 transition-colors">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{fb.run_type?.replace('_', ' ') || 'Run'} Analysis</p>
          <p className="text-[10px] text-muted-foreground truncate">{fb.summary?.slice(0, 70)}</p>
        </div>
        <div className="text-right shrink-0 space-y-0.5">
          {fb.confidence_score && (
            <p className={`text-sm font-bold ${SCORE_COLOR(fb.confidence_score)}`}>{fb.confidence_score}/10</p>
          )}
          <p className="text-[9px] text-muted-foreground">{new Date(fb.timestamp).toLocaleDateString()}</p>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border/50 p-4 space-y-3"
          >
            {fb.summary && <p className="text-xs text-muted-foreground">{fb.summary}</p>}

            {fb.what_worked?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">What Worked</p>
                {fb.what_worked.map((w, j) => (
                  <p key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />{w}
                  </p>
                ))}
              </div>
            )}

            {fb.what_failed?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-wide">What Failed</p>
                {fb.what_failed.map((w, j) => (
                  <p key={j} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <AlertTriangle className="h-3 w-3 text-red-400 shrink-0 mt-0.5" />{w}
                  </p>
                ))}
              </div>
            )}

            {fb.improvements?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Improvements for Next Run</p>
                {fb.improvements.map((imp, j) => (
                  <p key={j} className="text-xs text-foreground flex items-start gap-1.5">
                    <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />{imp}
                  </p>
                ))}
              </div>
            )}

            {fb.optimized_prompt && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-1">
                <p className="text-[10px] font-bold text-primary uppercase tracking-wide">Optimized Prompt Suggestion</p>
                <p className="text-xs text-foreground font-mono">{fb.optimized_prompt}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AIFeedbackLoop() {
  const [runs, setRuns] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [avgScore, setAvgScore] = useState(null);

  useEffect(() => { fetchRuns(); }, []);

  const fetchRuns = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Run.list('-created_date', 20);
      setRuns(data.filter(r => r.status === 'success' || r.status === 'failed'));
    } catch {} finally { setLoading(false); }
  };

  const analyzeAll = async () => {
    if (runs.length === 0) return;
    setAnalyzing(true);
    setFeedbacks([]);

    try {
      // Analyze runs in batches via LLM
      const batchSize = 5;
      const toAnalyze = runs.slice(0, 10);
      const newFeedbacks = [];

      for (let i = 0; i < toAnalyze.length; i += batchSize) {
        const batch = toAnalyze.slice(i, i + batchSize);
        const prompt = `You are an AI performance analyst. Analyze these pipeline run results and generate structured feedback to improve future runs.

Runs:
${batch.map((r, idx) => `${idx + 1}. Type: ${r.type}, Status: ${r.status}, Input: "${(r.input || '').slice(0, 100)}", Error: "${r.error || 'none'}"`).join('\n')}

For each run, generate feedback. Return JSON array: { "feedbacks": [{ "run_index": number, "run_type": string, "summary": string, "confidence_score": number (1-10), "what_worked": string[], "what_failed": string[], "improvements": string[], "optimized_prompt": string }] }`;

        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: 'object',
            properties: {
              feedbacks: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    run_index: { type: 'number' },
                    run_type: { type: 'string' },
                    summary: { type: 'string' },
                    confidence_score: { type: 'number' },
                    what_worked: { type: 'array', items: { type: 'string' } },
                    what_failed: { type: 'array', items: { type: 'string' } },
                    improvements: { type: 'array', items: { type: 'string' } },
                    optimized_prompt: { type: 'string' },
                  },
                },
              },
            },
          },
        });

        const batchFeedbacks = (res?.feedbacks || []).map((fb, j) => ({
          ...fb,
          timestamp: batch[j]?.created_date || new Date().toISOString(),
          run_id: batch[j]?.id,
        }));
        newFeedbacks.push(...batchFeedbacks);
      }

      setFeedbacks(newFeedbacks);
      if (newFeedbacks.length > 0) {
        const avg = newFeedbacks.reduce((a, f) => a + (f.confidence_score || 0), 0) / newFeedbacks.length;
        setAvgScore(Math.round(avg * 10) / 10);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Feedback Loop
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI analyzes past runs to extract learnings and optimize future pipeline performance
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={fetchRuns} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Runs
        </Button>
      </motion.div>

      {/* Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{runs.length}</p>
          <p className="text-[10px] text-muted-foreground">Runs to Analyze</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{feedbacks.length}</p>
          <p className="text-[10px] text-muted-foreground">Feedbacks Generated</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4 text-center">
          <p className={`text-2xl font-bold ${avgScore ? SCORE_COLOR(avgScore) : 'text-muted-foreground'}`}>
            {avgScore ? `${avgScore}/10` : '—'}
          </p>
          <p className="text-[10px] text-muted-foreground">Avg Confidence</p>
        </div>
      </div>

      {/* Analyze Button */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-xl border border-primary/30 bg-primary/5 p-6 space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Run AI Analysis</p>
          <p className="text-xs text-muted-foreground mt-1">
            AI will review your last {Math.min(runs.length, 10)} pipeline runs — identifying patterns, failures, and generating optimized prompts for better future results.
          </p>
        </div>
        <Button onClick={analyzeAll} disabled={analyzing || runs.length === 0} className="gap-2">
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {analyzing ? 'Analyzing...' : `Analyze ${Math.min(runs.length, 10)} Runs`}
        </Button>
        {analyzing && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            AI is reading run patterns and generating improvement recommendations...
          </div>
        )}
      </motion.div>

      {/* Feedback Cards */}
      {feedbacks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Feedback Results ({feedbacks.length})</h2>
            <span className="text-[10px] text-muted-foreground ml-auto">Click a card to expand</span>
          </div>
          <div className="space-y-3">
            {feedbacks.map((fb, i) => <FeedbackCard key={i} fb={fb} i={i} />)}
          </div>
        </div>
      )}

      {!analyzing && feedbacks.length === 0 && runs.length > 0 && (
        <div className="text-center py-12">
          <Brain className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Click "Analyze Runs" to generate AI feedback</p>
          <p className="text-xs text-muted-foreground/60 mt-1">The AI will study your pipeline history and suggest improvements</p>
        </div>
      )}

      {runs.length === 0 && !loading && (
        <div className="text-center py-12">
          <Brain className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No completed runs yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Run some pipelines first, then come back for AI feedback</p>
        </div>
      )}
    </div>
  );
}