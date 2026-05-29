import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Trophy, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

function CopyBtn({ text, label = 'Copy Report' }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
      {copied ? <><Check className="h-3 w-3 text-emerald-400" /> Copied</> : <><Copy className="h-3 w-3" /> {label}</>}
    </Button>
  );
}

function ClearanceBadge({ text }) {
  const upper = (text || '').toUpperCase();
  if (upper.includes('NOT CLEARED')) return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 font-bold text-lg">
      <AlertCircle className="h-5 w-5" /> NOT CLEARED
    </div>
  );
  if (upper.includes('CONDITIONAL')) return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-400 font-bold text-lg">
      <AlertTriangle className="h-5 w-5" /> CONDITIONAL
    </div>
  );
  if (upper.includes('CLEARED')) return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-bold text-lg">
      <CheckCircle2 className="h-5 w-5" /> CLEARED
    </div>
  );
  return null;
}

function Section({ title, content, highlight = false }) {
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-secondary/10'}`}>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{content}</div>
    </div>
  );
}

function ScoreExtract({ text }) {
  // Try to extract a demo readiness score from the text
  const match = text.match(/demo readiness[^:]*:\s*(\d+)\s*\/\s*50/i)
    || text.match(/score[^:]*:\s*(\d+)\s*\/\s*50/i)
    || text.match(/(\d+)\s*\/\s*50/);
  if (!match) return null;
  const score = parseInt(match[1]);
  const pct = Math.round((score / 50) * 100);
  const color = score >= 45 ? 'bg-emerald-500' : score >= 30 ? 'bg-amber-500' : 'bg-red-500';
  const textColor = score >= 45 ? 'text-emerald-400' : score >= 30 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Demo Readiness Score</span>
        <span className={`font-bold ${textColor}`}>{score}/50</span>
      </div>
      <div className="h-2 rounded-full bg-border overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FinalReport({ multiMode, inputs, stepResults, allInputStepResults, onAccept }) {
  // stepResults = array of {step, result} for single input
  // allInputStepResults = array of arrays for multi-input

  const finalStepResult = stepResults?.[stepResults.length - 1]?.result;
  const finalText = finalStepResult?.full_output || '';

  const fullReport = stepResults?.map(sr =>
    `=== ${sr.step.toUpperCase()} ===\n${sr.result?.full_output || ''}`
  ).join('\n\n');

  if (multiMode === 'compare') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-xl border border-primary/30 bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <p className="text-sm font-bold text-foreground">Comparison Report — Head-to-Head Scorecard</p>
          </div>
          <CopyBtn text={finalText} label="Copy Scorecard" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
          {inputs.map((inp, i) => (
            <div key={i} className="rounded-lg border border-border bg-secondary/20 px-3 py-2">
              <span className="font-bold text-primary">{inp.name}</span>
              <span className="text-muted-foreground ml-2">{inp.type}: {inp.value.slice(0, 40)}{inp.value.length > 40 ? '…' : ''}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/10 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          {finalText}
        </div>
        <Button onClick={onAccept} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Accept Report
        </Button>
      </motion.div>
    );
  }

  if (multiMode === 'combine') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-xl border border-primary/30 bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-bold text-foreground">Combination Report — Unified Specification</p>
          <CopyBtn text={finalText} label="Copy Unified Spec" />
        </div>
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/10 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          {finalText}
        </div>
        <Button onClick={onAccept} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Accept Report
        </Button>
      </motion.div>
    );
  }

  if (multiMode === 'benchmark') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="space-y-4 rounded-xl border border-primary/30 bg-card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <p className="text-sm font-bold text-foreground">Benchmark Report — Competitive Positioning</p>
          <CopyBtn text={finalText} label="Copy Benchmark" />
        </div>
        <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/10 rounded-lg p-4 max-h-[600px] overflow-y-auto">
          {finalText}
        </div>
        <Button onClick={onAccept} className="gap-2">
          <CheckCircle2 className="h-4 w-4" /> Accept Report
        </Button>
      </motion.div>
    );
  }

  // Single input final report
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-xl border border-emerald-500/30 bg-card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          <p className="text-sm font-bold text-foreground">Final Report — All 8 Steps Complete</p>
        </div>
        <div className="flex gap-2">
          <CopyBtn text={fullReport || finalText} label="Copy Full Report" />
        </div>
      </div>

      {/* Clearance Decision — prominent */}
      <div className="flex flex-wrap gap-3 items-center">
        <ClearanceBadge text={finalText} />
        <ScoreExtract text={finalText} />
      </div>

      {/* Full findings */}
      <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-secondary/10 rounded-lg p-4 max-h-[600px] overflow-y-auto border border-border">
        {finalText}
      </div>

      <Button onClick={onAccept} className="gap-2">
        <CheckCircle2 className="h-4 w-4" /> Accept and Lock
      </Button>
    </motion.div>
  );
}