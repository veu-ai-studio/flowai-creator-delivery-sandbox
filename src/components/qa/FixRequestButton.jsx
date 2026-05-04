import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Wrench, Loader2, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';

export default function FixRequestButton({ recommendation, crawlData }) {
  const [loading, setLoading] = useState(false);
  const [fix, setFix] = useState(null);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (fix) { setOpen(v => !v); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('generateFixes', {
        recommendation,
        crawlData: crawlData || {},
      });
      const fixes = res?.data?.fixes || [];
      setFix(fixes[0] || { issue: recommendation.action, fix_code: '// No specific code fix generated.', explanation: 'No detailed fix available.' });
      setOpen(true);
    } catch (e) {
      setFix({ issue: recommendation.action, fix_code: '', explanation: `Error: ${e.message}` });
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(fix?.fix_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2">
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-md border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-all disabled:opacity-50"
      >
        {loading
          ? <Loader2 className="h-3 w-3 animate-spin" />
          : <Wrench className="h-3 w-3" />}
        {loading ? 'Generating fix...' : fix ? (open ? 'Hide Fix' : 'Show Fix') : 'Generate Fix Request'}
        {fix && !loading && (open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>

      <AnimatePresence>
        {open && fix && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-lg border border-border bg-background p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground">{fix.explanation}</p>
              {fix.fix_code && (
                <div className="relative group">
                  <pre className="text-[10px] font-mono bg-secondary/40 rounded p-2 overflow-x-auto whitespace-pre-wrap text-foreground max-h-40">
                    {fix.fix_code}
                  </pre>
                  <button
                    onClick={copy}
                    className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center rounded bg-secondary hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {copied ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}