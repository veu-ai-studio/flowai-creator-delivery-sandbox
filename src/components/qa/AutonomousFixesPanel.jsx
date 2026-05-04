import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Copy, Check, Loader2, Zap, Code2 } from 'lucide-react';

export default function AutonomousFixesPanel({ analysis, crawlData }) {
  const [fixes, setFixes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleGenerateFixes = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateFixes', {
        analysis,
        crawlData,
      });
      setFixes(res.data?.fixes || []);
    } catch (error) {
      console.error('Fix generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Autonomous Fixes
        </h2>
        <Button
          size="sm"
          className="gap-2"
          onClick={handleGenerateFixes}
          disabled={loading || !analysis}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Generate Fixes'}
        </Button>
      </div>

      <AnimatePresence>
        {fixes && fixes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {fixes.map((fix, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{fix.issue}</p>
                    <p className="text-xs text-muted-foreground mt-1">{fix.explanation}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary capitalize">
                    {fix.category}
                  </span>
                </div>
                <pre className="text-xs bg-background rounded p-3 overflow-x-auto text-foreground border border-border max-h-40 overflow-y-auto">
                  {fix.fix_code}
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => handleCopy(fix.fix_code, i)}
                >
                  {copied === i ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  {copied === i ? 'Copied' : 'Copy'}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}