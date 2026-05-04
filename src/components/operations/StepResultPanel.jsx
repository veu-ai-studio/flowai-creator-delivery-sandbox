import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1 text-[10px] border border-border rounded px-2 py-1 text-muted-foreground hover:text-foreground transition-all">
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
    </button>
  );
}

// Parse clearance decision out of monitor step output
function ClearanceDecision({ text }) {
  if (!text) return null;
  const upper = text.toUpperCase();
  let decision = null;
  let color = '';
  if (upper.includes('NOT CLEARED')) { decision = 'NOT CLEARED'; color = 'text-red-400 border-red-500/40 bg-red-500/5'; }
  else if (upper.includes('CONDITIONAL')) { decision = 'CONDITIONAL'; color = 'text-amber-400 border-amber-500/40 bg-amber-500/5'; }
  else if (upper.includes('CLEARED')) { decision = 'CLEARED'; color = 'text-emerald-400 border-emerald-500/40 bg-emerald-500/5'; }
  if (!decision) return null;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border font-bold text-sm ${color}`}>
      {decision === 'CLEARED' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {decision}
    </div>
  );
}

// Compact multi-column display for findings
function FindingsDisplay({ text, maxLines = 40 }) {
  const lines = (text || '').split('\n').filter(l => l.trim());
  const displayed = lines.slice(0, maxLines);
  const hasMore = lines.length > maxLines;
  const [showAll, setShowAll] = useState(false);

  const visibleLines = showAll ? lines : displayed;

  return (
    <div className="space-y-1">
      {visibleLines.map((line, i) => {
        const isSectionHeader = /^#{1,3}\s|^[A-Z\s]{4,}:$|^\d+\.\s[A-Z]/.test(line.trim());
        const isCritical = /CRITICAL|BLOCKED|NOT CLEARED/i.test(line);
        const isHigh = /\bHIGH\b|CONDITIONAL/i.test(line);
        const isGood = /CLEARED|PASSED|OK|GOOD/i.test(line) && !/NOT CLEARED/i.test(line);

        return (
          <p key={i} className={`text-[11px] leading-relaxed ${
            isSectionHeader ? 'font-bold text-foreground mt-2 first:mt-0' :
            isCritical ? 'text-red-400' :
            isHigh ? 'text-amber-400' :
            isGood ? 'text-emerald-400' :
            'text-foreground/80'
          }`}>
            {line}
          </p>
        );
      })}
      {hasMore && (
        <button onClick={() => setShowAll(v => !v)} className="text-[10px] text-primary hover:text-primary/80 mt-1">
          {showAll ? 'Show less' : `Show ${lines.length - maxLines} more lines`}
        </button>
      )}
    </div>
  );
}

export default function StepResultPanel({ stepLabel, result, inputName, isCompare = false, compareResults = null }) {
  const [expanded, setExpanded] = useState(true);

  if (!result) return null;

  const text = result.full_output || '';

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/20 bg-card overflow-hidden">
      <div className="p-3 flex items-center justify-between gap-2 border-b border-border/30">
        <div className="flex items-center gap-2 flex-wrap">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold text-foreground">{stepLabel} — Results</span>
          {inputName && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">{inputName}</span>}
          <ClearanceDecision text={text} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <CopyBtn text={text} />
          <button onClick={() => setExpanded(v => !v)} className="text-muted-foreground hover:text-foreground">
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="p-4">
              {isCompare && compareResults ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {compareResults.map((cr, idx) => (
                    <div key={idx} className="space-y-2">
                      <p className="text-[10px] font-bold text-primary border-b border-border/30 pb-1">{cr.inputName}</p>
                      <FindingsDisplay text={cr.full_output} maxLines={25} />
                    </div>
                  ))}
                </div>
              ) : (
                <FindingsDisplay text={text} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}