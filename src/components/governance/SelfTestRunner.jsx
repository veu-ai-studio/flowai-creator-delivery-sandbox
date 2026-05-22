import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, RefreshCw, HelpCircle
} from 'lucide-react';

const DIMENSIONS = [
  { key: 'navigation',      label: 'Navigation',          desc: 'Every page loads without errors' },
  { key: 'functionality',   label: 'Core Functionality',  desc: 'Primary features execute correctly' },
  { key: 'data_integrity',  label: 'Data Integrity',      desc: 'Forms submit, data persists, reads return correct data' },
  { key: 'ui_rendering',    label: 'UI Rendering',        desc: 'No broken layouts or rendering errors' },
  { key: 'api_health',      label: 'API Health',          desc: 'Endpoints respond with expected structures' },
  { key: 'integration',     label: 'Integrations',        desc: 'LLM calls and third-party integrations respond' },
  { key: 'regression',      label: 'Regression Check',    desc: 'No previously passing capabilities now failing' },
];

const STATUS_STYLE = {
  PASS:        { icon: CheckCircle2, cls: 'text-emerald-400', bg: 'border-emerald-500/30 bg-emerald-500/5' },
  FAIL:        { icon: XCircle,      cls: 'text-red-400',     bg: 'border-red-500/30 bg-red-500/5' },
  PARTIAL:     { icon: AlertTriangle,cls: 'text-amber-400',   bg: 'border-amber-500/30 bg-amber-500/5' },
  UNTESTABLE:  { icon: HelpCircle,   cls: 'text-muted-foreground', bg: 'border-border bg-secondary/10' },
};

const SEV_COLOR = { Critical: 'text-red-400', High: 'text-orange-400', Medium: 'text-amber-400', Low: 'text-muted-foreground' };

export default function SelfTestRunner({ url, isSpa, appContext, sessionId, onComplete }) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const runTest = async () => {
    setRunning(true);
    setError(null);
    setReport(null);

    try {
      // Fetch previous test for regression
      let previousBaseline = null;
      try {
        const prev = await base44.entities.TestReport.filter({ target_url: url }, '-created_date', 1);
        if (prev.length > 0) previousBaseline = prev[0].baseline_summary;
      } catch {}

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are FlowAI's self-testing engine. Systematically verify the functional state of this target application.

Target URL: ${url}
SPA (React/Base44): ${isSpa ? 'YES — client-side rendered, skip crawl-penalty for missing meta' : 'NO'}
App context: ${appContext || 'None provided'}
Previous baseline: ${previousBaseline || 'No previous test — first run'}

Test all SEVEN dimensions and respond with structured JSON:

1. NAVIGATION — do all pages load without errors?
2. CORE FUNCTIONALITY — do primary features execute their intended function?
3. DATA INTEGRITY — do forms submit, does data persist, do reads return correct data?
4. UI RENDERING — are there broken layouts, missing elements, or rendering errors?
5. API HEALTH — do API endpoints respond with expected data structures?
6. INTEGRATION POINTS — do LLM calls execute, do third-party integrations respond?
7. REGRESSION CHECK — compare against previous baseline; flag any capability that previously passed and now fails.

For each dimension produce status (PASS/FAIL/PARTIAL/UNTESTABLE), evidence (one sentence), severity if failing (Critical/High/Medium/Low), regression_flag (true/false).

Also produce:
- test_score_percentage (0-100): percentage of dimensions passing or partial
- blocking_issues: comma-separated list of blocking issues (empty string if none)
- regression_flags: comma-separated list of regression failures (empty string if none)
- baseline_summary: 2-sentence plain English summary of current functional state
- mode_recommendation: one of "test_audit_only", "fix_issues", "improve", "full_cycle"
- mode_reason: one sentence explaining the recommendation`,
        response_json_schema: {
          type: 'object',
          properties: {
            navigation:      { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            functionality:   { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            data_integrity:  { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            ui_rendering:    { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            api_health:      { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            integration:     { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            regression:      { type: 'object', properties: { status: { type: 'string' }, evidence: { type: 'string' }, severity: { type: 'string' }, regression_flag: { type: 'boolean' } } },
            test_score_percentage: { type: 'number' },
            blocking_issues: { type: 'string' },
            regression_flags: { type: 'string' },
            baseline_summary: { type: 'string' },
            mode_recommendation: { type: 'string' },
            mode_reason: { type: 'string' },
          },
        },
      });

      // Save to TestReport entity
      const saved = await base44.entities.TestReport.create({
        target_url: url,
        navigation_score: result.navigation?.status,
        functionality_score: result.functionality?.status,
        data_integrity_score: result.data_integrity?.status,
        ui_rendering_score: result.ui_rendering?.status,
        api_health_score: result.api_health?.status,
        integration_score: result.integration?.status,
        regression_score: result.regression?.status,
        test_score_percentage: result.test_score_percentage,
        blocking_issues: result.blocking_issues,
        regression_flags: result.regression_flags,
        baseline_summary: result.baseline_summary,
        dimension_scores: result,
        session_id: sessionId || null,
        is_self_test: true,
        started_at: new Date().toISOString(),
      });

      setReport({ ...result, id: saved.id });
      if (onComplete) onComplete({ ...result, id: saved.id });
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const score = report?.test_score_percentage ?? null;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Self-Test Engine</h3>
          <p className="text-[11px] text-muted-foreground">7-dimension functional baseline — {url}</p>
        </div>
        <Button onClick={runTest} disabled={running} size="sm" className="gap-1.5">
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {running ? 'Testing...' : report ? 'Re-test' : 'Run Self-Test'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg p-3">{error}</p>}

      <AnimatePresence>
        {report && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {/* Score header */}
            <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
              <div className={`text-4xl font-bold ${scoreColor}`}>{score}%</div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-foreground">Test Score</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{report.baseline_summary}</p>
              </div>
              {report.mode_recommendation && (
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Recommended Mode</p>
                  <p className="text-xs font-bold text-primary">{report.mode_recommendation?.replace(/_/g, ' ')}</p>
                  <p className="text-[9px] text-muted-foreground">{report.mode_reason}</p>
                </div>
              )}
            </div>

            {/* Dimension grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DIMENSIONS.map(dim => {
                const d = report[dim.key];
                if (!d) return null;
                const style = STATUS_STYLE[d.status] || STATUS_STYLE.UNTESTABLE;
                const StatusIcon = style.icon;
                return (
                  <motion.div key={dim.key} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                    className={`rounded-lg border p-3 ${style.bg}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${style.cls}`} />
                      <span className="text-xs font-bold text-foreground">{dim.label}</span>
                      <span className={`text-[9px] font-bold ml-auto ${style.cls}`}>{d.status}</span>
                      {d.regression_flag && <span className="text-[9px] text-red-400 font-bold">⚠ REGRESSION</span>}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{d.evidence}</p>
                    {d.severity && d.status !== 'PASS' && (
                      <p className={`text-[9px] font-bold mt-1 ${SEV_COLOR[d.severity] || 'text-muted-foreground'}`}>
                        Severity: {d.severity}
                      </p>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Blocking issues */}
            {report.blocking_issues && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                <p className="text-xs font-bold text-red-400 mb-1">Blocking Issues</p>
                <p className="text-[11px] text-red-300">{report.blocking_issues}</p>
              </div>
            )}
            {report.regression_flags && (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-3">
                <p className="text-xs font-bold text-orange-400 mb-1">Regression Flags</p>
                <p className="text-[11px] text-orange-300">{report.regression_flags}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}