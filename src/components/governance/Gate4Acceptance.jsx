import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import VersionIncrementBadge from './VersionIncrementBadge';

const CONFIDENCE_OPTIONS = [
  { key: 'full',        label: '✅ Fully confident',         desc: 'Tested thoroughly — no concerns' },
  { key: 'mostly',      label: '⚠️ Mostly confident',        desc: 'Minor uncertainties remain' },
  { key: 'provisional', label: '❓ Accepting provisionally', desc: 'Needs follow-up audit' },
];

function ScoreDelta({ label, pre, post }) {
  const delta = post != null && pre != null ? post - pre : null;
  const Icon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
  const color = delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-red-400' : 'text-muted-foreground';
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-border/30">
      <span className="text-muted-foreground capitalize">{label.replace('_', ' ')}</span>
      <div className="flex items-center gap-2">
        <span className="text-foreground">{pre ?? '—'}</span>
        <span className="text-muted-foreground">→</span>
        <span className="text-foreground font-semibold">{post ?? '—'}</span>
        {delta !== null && (
          <span className={`flex items-center gap-0.5 font-bold text-[11px] ${color}`}>
            <Icon className="h-3 w-3" />{delta > 0 ? '+' : ''}{delta}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Gate4Acceptance({ preScores, postScores, actionType, protectionSnapshot, testNotes, executionResult, onAccept, onRollback }) {
  const [confidence, setConfidence] = useState('full');
  const [rollbackReason, setRollbackReason] = useState('');
  const [showRollback, setShowRollback] = useState(false);

  const handleAccept = () => {
    onAccept({ confidence, testNotes, preScores, postScores });
  };

  const handleRollback = () => {
    onRollback({ reason: rollbackReason, protectionSnapshot });
  };

  const allDimensions = ['ui_ux', 'api', 'logic', 'business_value'];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-emerald-500/30 bg-card p-6 space-y-5">

      {/* Header */}
      <div>
        <p className="text-xs font-bold text-emerald-400 uppercase tracking-wide">⛔ Gate 4 — Human Acceptance</p>
        <h3 className="text-base font-bold text-foreground mt-0.5">Accept & Lock or Rollback</h3>
        <p className="text-xs text-muted-foreground mt-1">Review score changes. Accept to lock as new baseline, or rollback to restore prior state.</p>
      </div>

      {/* Score comparison */}
      <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-1">
        <p className="text-xs font-bold text-foreground mb-2">Score Changes</p>
        <ScoreDelta label="Test Score (%)" pre={preScores?.test} post={postScores?.test} />
        <ScoreDelta label="Overall Audit" pre={preScores?.overall} post={postScores?.overall} />
        {allDimensions.map(dim => (
          <ScoreDelta key={dim} label={dim} pre={preScores?.[dim]} post={postScores?.[dim]} />
        ))}
      </div>

      {/* Version increment badge for upgrades */}
      {executionResult?.version_increment && (
        <VersionIncrementBadge
          versionIncrement={executionResult.version_increment}
          changelog={executionResult.changelog}
        />
      )}

      {/* Test notes from Gate 3 */}
      {testNotes && (
        <div className="rounded-lg border border-border bg-secondary/10 p-3">
          <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Your Test Notes</p>
          <p className="text-xs text-foreground">{testNotes}</p>
        </div>
      )}

      {/* Confidence selector */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-foreground">Confidence Level</p>
        {CONFIDENCE_OPTIONS.map(opt => (
          <label key={opt.key} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${confidence === opt.key ? 'border-primary/50 bg-primary/5' : 'border-border hover:bg-secondary/20'}`}>
            <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${confidence === opt.key ? 'border-primary' : 'border-border'}`}
              onClick={() => setConfidence(opt.key)}>
              {confidence === opt.key && <div className="h-2.5 w-2.5 rounded-full bg-primary" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{opt.label}</p>
              <p className="text-[10px] text-muted-foreground">{opt.desc}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Actions */}
      {!showRollback ? (
        <div className="flex gap-3">
          <Button onClick={handleAccept} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="h-4 w-4" /> Accept & Lock
          </Button>
          <Button variant="outline" onClick={() => setShowRollback(true)} className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
            <RotateCcw className="h-4 w-4" /> Rollback
          </Button>
        </div>
      ) : (
        <div className="space-y-3 p-4 rounded-lg border border-red-500/30 bg-red-500/5">
          <p className="text-xs font-bold text-red-400">Describe what went wrong (for governance log):</p>
          <textarea value={rollbackReason} onChange={e => setRollbackReason(e.target.value)}
            placeholder="What failed? What was the unexpected outcome?"
            className="w-full h-16 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring" />
          {protectionSnapshot && (
            <div className="text-[10px] text-muted-foreground border border-amber-500/30 bg-amber-500/5 rounded p-2">
              <span className="text-amber-400 font-bold">Protection snapshot available</span> — prior state can be restored.
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleRollback} className="flex-1 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Confirm Rollback
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowRollback(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}