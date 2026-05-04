import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Lightbulb, Copy, Check, X, Code2, AlertCircle } from 'lucide-react';

export default function AutoFixSuggestionModal({ analysis, crawlData, isOpen, onClose }) {
  const [fixes, setFixes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(null);

  const handleGenerateFixes = async () => {
    setLoading(true);
    setFixes([]);

    try {
      const res = await base44.functions.invoke('generateFixes', {
        analysis,
        crawlData,
      });

      const generatedFixes = Array.isArray(res.data?.fixes) ? res.data.fixes : [];
      setFixes(generatedFixes);
    } catch (error) {
      console.error('Fix generation error:', error);
      setFixes([]);
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">Auto-Fix Suggestions</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-secondary rounded transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            {fixes.length === 0 && !loading && (
              <div className="space-y-4 py-8">
                <p className="text-center text-muted-foreground">
                  Click below to generate code fixes for detected issues.
                </p>
                <Button
                  size="lg"
                  className="w-full gap-2"
                  onClick={handleGenerateFixes}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Code2 className="h-4 w-4" />}
                  {loading ? 'Generating Fixes...' : 'Generate AI-Powered Fixes'}
                </Button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing issues and generating fixes...</p>
              </div>
            )}

            {fixes.length > 0 && (
              <div className="space-y-3">
                {fixes.map((fix, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{fix.issue || 'Issue'}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fix.explanation || ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap ${
                        fix.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        fix.severity === 'high' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {fix.severity || 'medium'}
                      </span>
                    </div>

                    {fix.fix_code && (
                      <>
                        <pre className="text-xs bg-background rounded p-3 overflow-x-auto text-foreground border border-border max-h-48 overflow-y-auto">
                          {fix.fix_code}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs gap-1.5 h-8"
                          onClick={() => handleCopy(fix.fix_code, i)}
                        >
                          {copied === i ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    {fix.details && (
                      <div className="text-xs text-muted-foreground bg-background/50 rounded p-2 space-y-1">
                        {Array.isArray(fix.details) && fix.details.map((detail, j) => (
                          <div key={j} className="flex gap-2">
                            <span className="text-primary">•</span>
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleGenerateFixes}
                >
                  Regenerate Fixes
                </Button>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                className="gap-2"
                onClick={handleGenerateFixes}
                disabled={loading || fixes.length === 0}
              >
                <Lightbulb className="h-4 w-4" />
                {fixes.length > 0 ? 'Export Fixes' : 'Generate'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}