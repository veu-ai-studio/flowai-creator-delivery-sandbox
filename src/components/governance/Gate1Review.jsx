import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle, XCircle, Shield, BarChart3 } from 'lucide-react';

const SEV_STYLE = {
  Critical: 'text-red-400 bg-red-500/5 border-red-500/30',
  High:     'text-orange-400 bg-orange-500/5 border-orange-500/30',
  Medium:   'text-amber-400 bg-amber-500/5 border-amber-500/30',
  Low:      'text-muted-foreground bg-secondary/20 border-border',
};

const STATUS_ICON = {
  PASS:       <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  FAIL:       <XCircle className="h-3.5 w-3.5 text-red-400" />,
  PARTIAL:    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />,
  UNTESTABLE: <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />,
};

export default function Gate1Review({ testReport, auditReport, actionType, triggerReason, onProceed }) {
  const [acknowledged, setAcknowledged] = useState(false);

  const severity = testReport?.test_score_percentage < 50 ? 'Critical'
    : testReport?.test_score_percentage < 80 ? 'High' : 'Medium';

  const auditOverall = auditReport?.scores?.overall;
  const testScore = testReport?.test_score_percentage;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/40 bg-card p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
          <Shield className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <p className="text-xs font-bold text-red-400 uppercase tracking-wide">⛔ Gate 1 — Human Review Required</p>
          <h3 className="text-base font-bold text-foreground mt-0.5">{actionType || 'Governance Action'}</h3>
          <p className="text-xs text-muted-foreground mt-1">{triggerReason || 'Review test and audit results before proceeding.'}</p>
        </div>
        <span className={`ml-auto text-xs font-bold px-2 py-1 rounded border ${SEV_STYLE[severity]}`}>{severity}</span>
      </div>

      {/* Side-by-side: Test + Audit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Self-Test Panel */}
        <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Self-Test Results
          </p>
          {testReport ? (
            <>
              <div className="text-3xl font-bold text-foreground">{testScore}%</div>
              <p className="text-[11px] text-muted-foreground">{testReport.baseline_summary}</p>
              {testReport.blocking_issues && (
                <p className="text-[10px] text-red-400 font-semibold">⚠ {testReport.blocking_issues}</p>
              )}
              <div className="space-y-1 pt-1">
                {['navigation', 'functionality', 'data_integrity', 'ui_rendering', 'api_health', 'integration', 'regression'].map(dim => {
                  const val = testReport.dimension_scores?.[dim];
                  if (!val) return null;
                  return (
                    <div key={dim} className="flex items-center gap-1.5 text-[10px]">
                      {STATUS_ICON[val.status] || STATUS_ICON.UNTESTABLE}
                      <span className="text-muted-foreground capitalize">{dim.replace('_', ' ')}</span>
                      <span className={`ml-auto font-bold ${val.status === 'PASS' ? 'text-emerald-400' : val.status === 'FAIL' ? 'text-red-400' : 'text-amber-400'}`}>
                        {val.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No test report available.</p>
          )}
        </div>

        {/* Self-Audit Panel */}
        <div className="rounded-lg border border-border bg-secondary/20 p-4 space-y-2">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" /> Self-Audit Scores
          </p>
          {auditReport ? (
            <>
              <div className="text-3xl font-bold text-foreground">{auditOverall}/10</div>
              <div className="space-y-1 pt-1">
                {Object.entries(auditReport.scores || {}).filter(([k]) => k !== 'overall').map(([layer, score]) => (
                  <div key={layer} className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-muted-foreground capitalize">{layer.replace('_', ' ')}</span>
                    <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${score >= 7 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${score * 10}%` }} />
                    </div>
                    <span className={`font-bold ml-1 ${score >= 7 ? 'text-emerald-400' : score >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                      {score}/10
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No audit report available.</p>
          )}
        </div>
      </div>

      {/* What happens if no action */}
      <div className="rounded-lg border border-border bg-secondary/10 p-3 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">If no action is taken: </span>
        {testScore < 50
          ? 'Critical failures will persist. Functionality degradation may worsen without intervention.'
          : testScore < 80
          ? 'Identified issues will remain unresolved. No immediate risk but quality will not improve.'
          : 'System is healthy. Action is optional — improvements available but not urgent.'}
      </div>

      {/* Acknowledge checkbox */}
      <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-secondary/20 transition-all">
        <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} className="h-4 w-4 mt-0.5" />
        <span className="text-xs text-foreground">
          I have reviewed the test results and audit scores above and understand the current system state.
        </span>
      </label>

      <Button onClick={onProceed} disabled={!acknowledged} className="w-full gap-2">
        Proceed to Gate 2 — Approval →
      </Button>
    </motion.div>
  );
}