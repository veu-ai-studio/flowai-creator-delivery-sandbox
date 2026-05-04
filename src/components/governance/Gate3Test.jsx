import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Copy, Check, Loader2, Clock, CheckCircle2, RefreshCw } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Gate3Test({ preparedAction, testChecklist = [], url, isSpa, appContext, preScores, onAccept }) {
  const [copied, setCopied] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [testNotes, setTestNotes] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [rerunResults, setRerunResults] = useState(null);
  const [rerunLoading, setRerunLoading] = useState(false);

  // 30-second timer
  useEffect(() => {
    if (secondsElapsed >= 30) return;
    const t = setTimeout(() => setSecondsElapsed(s => s + 1), 1000);
    return () => clearTimeout(t);
  }, [secondsElapsed]);

  const timerReady = secondsElapsed >= 30;

  const copyAction = () => {
    navigator.clipboard.writeText(preparedAction || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleChecklistItem = (i) => {
    setCheckedItems(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const runRetest = async () => {
    setRerunLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Quick re-verification test for ${url}. Previous scores: ${JSON.stringify(preScores || {})}. 
        Test these specific areas: ${testChecklist.join(', ')}.
        Return only a simple summary of pass/fail for each area and overall score change.`,
        response_json_schema: {
          type: 'object',
          properties: {
            overall_change: { type: 'string' },
            area_results: { type: 'array', items: { type: 'object', properties: { area: { type: 'string' }, result: { type: 'string' } } } },
            new_score_estimate: { type: 'number' },
          },
        },
      });
      setRerunResults(result);
    } catch (e) {
      setRerunResults({ overall_change: `Error: ${e.message}`, area_results: [] });
    }
    setRerunLoading(false);
  };

  const canAccept = timerReady && acknowledged;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-blue-500/30 bg-card p-6 space-y-5">

      {/* Header */}
      <div>
        <p className="text-xs font-bold text-blue-400 uppercase tracking-wide">⛔ Gate 3 — Human Test</p>
        <h3 className="text-base font-bold text-foreground mt-0.5">Review Prepared Action & Verify</h3>
        <p className="text-xs text-muted-foreground mt-1">Copy the action below, apply it, then run verification before accepting.</p>
      </div>

      {/* Timer */}
      <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${timerReady ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-border bg-secondary/20 text-muted-foreground'}`}>
        <Clock className="h-3.5 w-3.5" />
        {timerReady ? 'Minimum review time elapsed — acceptance available.' : `Please review for at least ${30 - secondsElapsed}s more before accepting.`}
      </div>

      {/* Prepared Action */}
      {preparedAction && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Prepared Action</p>
          <div className="relative">
            <pre className="text-[11px] font-mono bg-secondary/30 border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-48 text-foreground">
              {preparedAction}
            </pre>
            <button onClick={copyAction}
              className="absolute top-2 right-2 h-6 px-2 rounded bg-secondary text-muted-foreground hover:text-foreground text-[10px] flex items-center gap-1 transition-colors border border-border">
              {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
        </div>
      )}

      {/* Test Checklist */}
      {testChecklist.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-foreground">Verification Checklist</p>
          {testChecklist.map((item, i) => (
            <label key={i} className={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${checkedItems.has(i) ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:bg-secondary/20'}`}>
              <div className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checkedItems.has(i) ? 'border-emerald-500 bg-emerald-500' : 'border-border bg-background'}`}
                onClick={() => toggleChecklistItem(i)}>
                {checkedItems.has(i) && <Check className="h-2.5 w-2.5 text-white" />}
              </div>
              <span className="text-xs text-foreground">{item}</span>
            </label>
          ))}
        </div>
      )}

      {/* Re-run buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={runRetest} disabled={rerunLoading} className="gap-1.5 text-xs h-8">
          {rerunLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Run Self-Test
        </Button>
      </div>

      {/* Re-run results */}
      {rerunResults && (
        <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Verification Results</p>
          <p className="text-[11px] text-muted-foreground">{rerunResults.overall_change}</p>
          {rerunResults.area_results?.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px]">
              <span className="text-muted-foreground">{r.area}:</span>
              <span className={`font-bold ${r.result?.includes('PASS') ? 'text-emerald-400' : r.result?.includes('FAIL') ? 'text-red-400' : 'text-amber-400'}`}>
                {r.result}
              </span>
            </div>
          ))}
          {rerunResults.new_score_estimate && preScores?.test && (
            <p className="text-[11px] text-primary font-semibold">
              Test score: {preScores.test}% → {rerunResults.new_score_estimate}%
              ({rerunResults.new_score_estimate > preScores.test ? '+' : ''}{rerunResults.new_score_estimate - preScores.test})
            </p>
          )}
        </div>
      )}

      {/* Test Notes */}
      <div className="space-y-1">
        <p className="text-[11px] text-muted-foreground font-semibold">Test Notes (optional)</p>
        <textarea value={testNotes} onChange={e => setTestNotes(e.target.value)}
          placeholder="Record your observations, what you tested, and any concerns..."
          className="w-full h-16 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
      </div>

      {/* Acknowledgment */}
      <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${!timerReady ? 'opacity-50 pointer-events-none' : ''} ${acknowledged ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:bg-secondary/20'}`}>
        <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} disabled={!timerReady} className="h-4 w-4 mt-0.5" />
        <span className="text-xs text-foreground">I have tested the changes and results are satisfactory.</span>
      </label>

      <Button onClick={() => onAccept({ testNotes, checkedItems: [...checkedItems], rerunResults })}
        disabled={!canAccept} className="w-full gap-2">
        <CheckCircle2 className="h-4 w-4" /> Proceed to Gate 4 — Final Acceptance →
      </Button>
    </motion.div>
  );
}