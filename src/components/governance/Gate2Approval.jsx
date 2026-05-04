import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const RISK_STYLE = {
  Low:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  High:   'text-red-400 bg-red-500/10 border-red-500/20',
};

const REJECT_REASONS = ['Not needed', 'Too risky', 'Wrong diagnosis', 'Other'];

export default function Gate2Approval({ items = [], actionType, onApprove, onReject }) {
  const [checked, setChecked] = useState(() => new Set(items.map((_, i) => i)));
  const [modifying, setModifying] = useState(null);
  const [modifications, setModifications] = useState({});
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('Not needed');
  const [expandedItem, setExpandedItem] = useState(null);

  const toggleItem = (i) => {
    setChecked(prev => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  const handleApprove = () => {
    const approvedItems = items
      .filter((_, i) => checked.has(i))
      .map((item, i) => modifications[i] ? { ...item, action: modifications[i] } : item);
    onApprove(approvedItems);
  };

  const handleReject = () => {
    onReject({ reason: rejectReason });
  };

  // Flag high-risk items separately
  const highRiskItems = items.filter((item, i) => item.risk === 'High' && checked.has(i));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-500/30 bg-card p-6 space-y-5">

      {/* Header */}
      <div>
        <p className="text-xs font-bold text-amber-400 uppercase tracking-wide">⛔ Gate 2 — Human Approval</p>
        <h3 className="text-base font-bold text-foreground mt-0.5">{actionType || 'Select items to act on'}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          All items are pre-checked. Uncheck any to exclude. High-risk items require individual cycles.
        </p>
      </div>

      {/* High-risk warning */}
      {highRiskItems.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">
            <span className="font-bold">{highRiskItems.length} high-risk item{highRiskItems.length > 1 ? 's' : ''}</span> will be split into a separate approval cycle.
          </p>
        </div>
      )}

      {/* Item checklist */}
      <div className="space-y-2">
        {items.map((item, i) => {
          const isChecked = checked.has(i);
          const isModifying = modifying === i;
          const isExpanded = expandedItem === i;
          return (
            <div key={i} className={`rounded-lg border transition-all ${isChecked ? 'border-primary/40 bg-primary/5' : 'border-border bg-secondary/10 opacity-60'}`}>
              <div className="flex items-start gap-3 p-3">
                <button onClick={() => toggleItem(i)} className="mt-0.5 shrink-0">
                  <div className={`h-4 w-4 rounded border flex items-center justify-center ${isChecked ? 'border-primary bg-primary' : 'border-border bg-background'}`}>
                    {isChecked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-semibold text-foreground">{modifications[i] || item.action}</p>
                    {item.risk && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${RISK_STYLE[item.risk] || RISK_STYLE.Medium}`}>
                        {item.risk} risk
                      </span>
                    )}
                    {item.impact && <span className="text-[9px] text-emerald-400 font-semibold">+{item.impact}</span>}
                  </div>
                  {item.source && <p className="text-[10px] text-muted-foreground mt-0.5">Source: {item.source}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setModifying(isModifying ? null : i)}
                    className="h-6 px-2 rounded text-[10px] text-muted-foreground hover:text-foreground border border-border hover:bg-secondary/50 transition-all flex items-center gap-0.5">
                    <Edit2 className="h-2.5 w-2.5" /> Modify
                  </button>
                  <button onClick={() => setExpandedItem(isExpanded ? null : i)} className="text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {isModifying && (
                <div className="px-3 pb-3">
                  <textarea
                    value={modifications[i] || item.action}
                    onChange={e => setModifications(prev => ({ ...prev, [i]: e.target.value }))}
                    className="w-full h-20 text-xs bg-background border border-input rounded-md px-3 py-2 resize-none text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                    placeholder="Modify the action scope, constraints, or priority..."
                  />
                  <button onClick={() => setModifying(null)} className="text-[10px] text-primary hover:underline mt-1">Done editing</button>
                </div>
              )}

              <AnimatePresence>
                {isExpanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="px-3 pb-3 text-[10px] text-muted-foreground border-t border-border/40 pt-2 space-y-1">
                      {item.test_failure && <p><span className="font-bold text-foreground">Test failure:</span> {item.test_failure}</p>}
                      {item.audit_dimension && <p><span className="font-bold text-foreground">Audit dimension:</span> {item.audit_dimension} — {item.audit_score}/10</p>}
                      {item.checklist && <p><span className="font-bold text-foreground">Test checklist:</span> {item.checklist}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No action items generated. System may be healthy.</p>
        )}
      </div>

      {/* Actions */}
      {!rejecting ? (
        <div className="flex gap-2">
          <Button onClick={handleApprove} disabled={checked.size === 0} className="flex-1 gap-2">
            <Check className="h-4 w-4" /> Approve Selected ({checked.size})
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setRejecting(true)} className="gap-1.5">
            <X className="h-4 w-4" /> Reject
          </Button>
        </div>
      ) : (
        <div className="space-y-2 p-3 rounded-lg border border-red-500/30 bg-red-500/5">
          <p className="text-xs font-semibold text-red-400">Select rejection reason:</p>
          <select value={rejectReason} onChange={e => setRejectReason(e.target.value)}
            className="w-full h-8 rounded border border-input bg-transparent px-2 text-sm text-foreground">
            {REJECT_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" onClick={handleReject} className="flex-1">Confirm Rejection</Button>
            <Button variant="outline" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}