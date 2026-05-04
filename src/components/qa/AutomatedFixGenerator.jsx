import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Wrench, Loader2, Copy, Check, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const PRIORITY_COLORS = {
  critical: 'border-red-500/30 bg-red-500/5 text-red-400',
  high: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
  medium: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
  low: 'border-gray-500/30 bg-gray-500/5 text-gray-400',
};

function FixCard({ fix, index }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(fix.code || fix.fix_steps?.join('\n') || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-lg border p-4 space-y-3 ${PRIORITY_COLORS[fix.priority] || PRIORITY_COLORS.medium}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[fix.priority] || PRIORITY_COLORS.medium}`}>
              {fix.priority}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">{fix.layer?.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{fix.issue}</p>
          <p className="text-xs text-muted-foreground">{fix.explanation}</p>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-background/50 shrink-0">
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2"
          >
            {fix.fix_steps?.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Fix Steps</p>
                <ol className="space-y-1">
                  {fix.fix_steps.map((step, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex gap-2">
                      <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {fix.code && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Code Fix</p>
                <pre className="text-[10px] bg-background rounded-lg p-3 overflow-x-auto text-foreground border border-border max-h-40 overflow-y-auto">
                  {fix.code}
                </pre>
              </div>
            )}
            {fix.estimated_effort && (
              <p className="text-[10px] text-muted-foreground">⏱ Estimated effort: <span className="text-foreground font-medium">{fix.estimated_effort}</span></p>
            )}
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copied' : 'Copy Fix'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function AutomatedFixGenerator({ results, crawlData }) {
  const [fixes, setFixes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateFixes = async () => {
    if (!results) return;
    setLoading(true);
    setFixes([]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert software engineer. Based on the QA audit results below, generate specific, actionable fixes for each issue.

URL: ${results.url || 'unknown'}
Overall Score: ${results.scores?.overall}/10
Issues: ${JSON.stringify(results.recommendations, null, 2)}
Crawl metadata: links=${crawlData?.links?.length || 0}, buttons=${crawlData?.buttons?.length || 0}, forms=${crawlData?.forms || 0}, errors=${crawlData?.errors?.length || 0}

For each major issue, provide: the issue name, a brief explanation, ordered fix steps, a code snippet where applicable, estimated effort, priority, and layer.`,
        response_json_schema: {
          type: 'object',
          properties: {
            fixes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  issue: { type: 'string' },
                  explanation: { type: 'string' },
                  fix_steps: { type: 'array', items: { type: 'string' } },
                  code: { type: 'string' },
                  estimated_effort: { type: 'string' },
                  priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                  layer: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setFixes(res?.fixes || []);
      setGenerated(true);
    } catch (err) {
      console.error('Fix generation error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          Automated Fix Generator
          {generated && fixes.length > 0 && (
            <span className="text-xs text-muted-foreground font-normal">({fixes.length} fixes)</span>
          )}
        </h2>
        <Button size="sm" className="gap-2" onClick={generateFixes} disabled={loading || !results}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : generated ? 'Regenerate' : 'Generate Fixes'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        AI-generated, step-by-step fixes with code snippets for each detected issue — sorted by priority.
      </p>

      <div className="space-y-3">
        {fixes
          .sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.priority) - ['critical', 'high', 'medium', 'low'].indexOf(b.priority))
          .map((fix, i) => <FixCard key={i} fix={fix} index={i} />)}
      </div>

      {!generated && !loading && (
        <div className="text-center py-6 text-muted-foreground text-xs">
          Run an audit first, then generate automated fixes for detected issues.
        </div>
      )}
    </motion.div>
  );
}