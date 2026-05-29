import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/SessionContext';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import SelfTestRunner from './SelfTestRunner';
import Gate1Review from './Gate1Review';
import Gate2Approval from './Gate2Approval';
import Gate3Test from './Gate3Test';
import Gate4Acceptance from './Gate4Acceptance';

// Maps activity key → plain-English label
const ACTIVITY_LABEL = {
  self_test: 'Self-Test', self_audit: 'Self-Audit', self_protect: 'Self-Protect',
  self_heal: 'Self-Heal', self_optimize: 'Self-Optimize', self_upgrade: 'Self-Upgrade',
  capability_transfer: 'Capability Transfer',
};

export default function GovernanceSessionRunner() {
  const { activeSession, updateSession, endSession } = useSession();

  // Per-URL session state
  const [urlIndex, setUrlIndex] = useState(0);
  const [phase, setPhase] = useState('self_test'); // self_test | self_audit | gate1 | gate2 | executing | gate3 | gate4 | done
  const [testReport, setTestReport] = useState(null);
  const [auditReport, setAuditReport] = useState(null);
  const [approvedItems, setApprovedItems] = useState([]);
  const [preparedAction, setPreparedAction] = useState('');
  const [testChecklist, setTestChecklist] = useState([]);
  const [preScores, setPreScores] = useState(null);
  const [postScores, setPostScores] = useState(null);
  const [protectionActive, setProtectionActive] = useState(false);
  const [protectionSnapshot, setProtectionSnapshot] = useState(null);
  const [executing, setExecuting] = useState(false);
  const [actionType, setActionType] = useState('');
  const [executionResult, setExecutionResult] = useState(null);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [gate3Notes, setGate3Notes] = useState('');

  // Inline Self-Audit phase — must be before any early return
  const [runningAudit, setRunningAudit] = useState(false);

  if (!activeSession) return null;

  const urls = activeSession.urls || [];
  const activities = activeSession.selected_activities || [];
  const settings = activeSession.session_settings || {};
  const currentUrlObj = urls[urlIndex];
  const url = currentUrlObj?.url;
  const isSpa = currentUrlObj?.is_spa;
  const appContext = currentUrlObj?.context;

  // Determine which gated activities are in this session
  const gatedActivities = activities.filter(a =>
    ['self_heal', 'self_optimize', 'self_upgrade'].includes(a)
  );
  const hasGatedActivities = gatedActivities.length > 0;

  // Self-Audit runner (inline, test-informed)
  const runSelfAudit = async (testResult) => {
    const evalGoal = settings.evaluation_goal || 'General Visitor';
    const failedDimensions = Object.entries(testResult?.dimension_scores || {})
      .filter(([, v]) => v?.status === 'FAIL')
      .map(([k]) => k);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's self-audit engine. Score this application across four dimensions.

Target: ${url}
SPA: ${isSpa ? 'YES' : 'NO'}
App context: ${appContext || 'None provided'}
Evaluation goal / user persona: ${evalGoal}
Self-Test results summary: ${testResult?.baseline_summary || 'No test data'}
Self-Test failed dimensions: ${failedDimensions.join(', ') || 'None'}

CRITICAL RULE: Any dimension that had a FAIL status in Self-Test CANNOT score above 3/10 in this audit.
Failed test dimensions: ${failedDimensions.join(', ') || 'none'}

Score each of the four audit dimensions 0-10:
- ui_ux: User experience, visual design, navigation clarity, mobile responsiveness
- api: API reliability, response times, error handling, data consistency
- logic: Business logic correctness, workflow integrity, edge case handling
- business_value: Value delivered to target persona (${evalGoal}), feature completeness, ROI

Also produce:
- overall: weighted average
- recommendations: array of top 5 specific improvements (each: action string, priority low/medium/high/critical, layer)
- issues: object with arrays of issue strings per layer`,
      response_json_schema: {
        type: 'object',
        properties: {
          scores: {
            type: 'object',
            properties: {
              overall: { type: 'number' }, ui_ux: { type: 'number' },
              api: { type: 'number' }, logic: { type: 'number' }, business_value: { type: 'number' },
            },
          },
          recommendations: { type: 'array', items: { type: 'object', properties: { action: { type: 'string' }, priority: { type: 'string' }, layer: { type: 'string' } } } },
          issues: { type: 'object' },
        },
      },
    });

    // Save to QAAuditReport
    const saved = await base44.entities.QAAuditReport.create({
      url,
      scores: result.scores,
      recommendations: result.recommendations || [],
      issues: result.issues || {},
      report_notes: `Session audit — goal: ${evalGoal}. Test-informed: failed dims = [${failedDimensions.join(', ')}]`,
    });

    return { ...result, id: saved.id };
  };

  // Self-Protect snapshot
  const runProtect = async () => {
    const snapshot = await base44.integrations.Core.InvokeLLM({
      prompt: `You are FlowAI's self-protection engine. Create a protection snapshot before applying changes.

Target: ${url}
Current audit score: ${auditReport?.scores?.overall ?? 'unknown'}/10
Current test score: ${testReport?.test_score_percentage ?? 'unknown'}%
Test baseline: ${testReport?.baseline_summary || 'none'}

Produce:
1. current_state: What is working correctly right now that must be preserved (2-3 sentences)
2. risk_assessment: What is at risk from incoming changes (1-2 sentences)  
3. rollback_criteria: Exact conditions meaning the change failed and rollback is needed
4. protection_checklist: 3-5 specific items to verify after any change is applied`,
      response_json_schema: {
        type: 'object',
        properties: {
          current_state: { type: 'string' },
          risk_assessment: { type: 'string' },
          rollback_criteria: { type: 'string' },
          protection_checklist: { type: 'array', items: { type: 'string' } },
        },
      },
    });
    setProtectionSnapshot(snapshot);
    setProtectionActive(true);
    return snapshot;
  };

  // Engine runners for Heal/Optimize/Upgrade
  const runEngine = async (activity, items) => {
    setExecuting(true);
    setActionType(ACTIVITY_LABEL[activity]);
    const pScores = {
      test: testReport?.test_score_percentage,
      overall: auditReport?.scores?.overall,
      ...(auditReport?.scores || {}),
    };
    setPreScores(pScores);

    try {
      let result;
      if (activity === 'self_heal') {
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are FlowAI's self-healing engine. The human operator approved these heal actions.

Target: ${url}
Approved items: ${items.map(i => i.action).join('\n')}
Protection snapshot active: YES
Test failures addressed: ${items.map(i => i.test_failure || i.action).join(', ')}

For each approved item produce a Base44 sprint instruction:
1. Root cause (one sentence)
2. Affected component (exact file or component name)
3. Surgical fix (precise enough to implement without ambiguity)
4. Human test checklist item (one specific verification step)
5. Rollback trigger (exact condition meaning the fix failed)

Format as a numbered, copy-pasteable Base44 sprint request.`,
          response_json_schema: {
            type: 'object',
            properties: {
              sprint_request: { type: 'string' },
              test_checklist: { type: 'array', items: { type: 'string' } },
              rollback_conditions: { type: 'array', items: { type: 'string' } },
            },
          },
        });
      } else if (activity === 'self_optimize') {
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are FlowAI's self-optimization engine. Human approved these optimization items.

Target: ${url}
Audit scores: ${JSON.stringify(auditReport?.scores || {})}
Test results: ${testReport?.baseline_summary}
Approved optimizations: ${items.map(i => i.action).join('\n')}

Only optimize dimensions scoring below 8/10. For each approved item:
1. Specific change required
2. Expected score improvement per dimension (format: dimension: X→Y)
3. Implementation risk: Low/Medium/High
4. Verification step

Format as copy-pasteable Base44 sprint request.`,
          response_json_schema: {
            type: 'object',
            properties: {
              sprint_request: { type: 'string' },
              test_checklist: { type: 'array', items: { type: 'string' } },
              expected_improvements: { type: 'object' },
            },
          },
        });
      } else if (activity === 'self_upgrade') {
        // Prerequisite check
        if ((testReport?.test_score_percentage ?? 0) < 80 || (auditReport?.scores?.overall ?? 0) < 7) {
          setExecuting(false);
          return { error: 'Prerequisites not met: need 80%+ test score and 7/10+ audit score.' };
        }
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are FlowAI's self-upgrade engine. Human approved the upgrade.

Target: ${url}
Current version: v0.1
Test score: ${testReport?.test_score_percentage}%
Audit overall: ${auditReport?.scores?.overall}/10
Approved items: ${items.map(i => i.action).join('\n')}
Protection snapshot: active

Produce:
1. version_increment: patch/minor/major with justification
2. changelog: human-readable list of genuine improvements
3. new_baseline_scores: updated expected scores per dimension
4. regression_test_checklist: specific items to verify (array)
5. rollback_instruction: exact steps to revert if Gate 4 results in rollback`,
          response_json_schema: {
            type: 'object',
            properties: {
              version_increment: { type: 'string' },
              changelog: { type: 'string' },
              new_baseline_scores: { type: 'object' },
              regression_test_checklist: { type: 'array', items: { type: 'string' } },
              rollback_instruction: { type: 'string' },
              sprint_request: { type: 'string' },
            },
          },
        });
      }

      setPreparedAction(result?.sprint_request || JSON.stringify(result, null, 2));
      setTestChecklist(result?.test_checklist || result?.regression_test_checklist || []);
      setExecutionResult(result);
    } catch (e) {
      setPreparedAction(`Error generating action: ${e.message}`);
    }
    setExecuting(false);
  };

  // Build Gate 2 items from audit recommendations + test failures
  const buildGate2Items = () => {
    const auditItems = (auditReport?.recommendations || [])
      .filter(r => {
        const layerScore = auditReport?.scores?.[r.layer];
        return layerScore == null || layerScore < 8;
      })
      .map(r => ({
        action: r.action,
        risk: r.priority === 'critical' ? 'High' : r.priority === 'high' ? 'High' : r.priority === 'medium' ? 'Medium' : 'Low',
        source: `Audit — ${r.layer}`,
        audit_dimension: r.layer,
        audit_score: auditReport?.scores?.[r.layer],
        test_failure: null,
      }));

    // Add any test failures as heal items
    const testItems = Object.entries(testReport?.dimension_scores || {})
      .filter(([, v]) => v?.status === 'FAIL')
      .map(([dim, v]) => ({
        action: `Fix ${dim.replace('_', ' ')} failure: ${v.evidence}`,
        risk: v.severity === 'Critical' ? 'High' : v.severity === 'High' ? 'High' : 'Medium',
        source: `Self-Test — ${dim.replace('_', ' ')}`,
        test_failure: v.evidence,
        audit_dimension: null,
      }));

    return [...testItems, ...auditItems].slice(0, 8);
  };

  // Phase handlers
  const handleTestComplete = (report) => {
    setTestReport(report);
    if (activities.includes('self_audit')) {
      setPhase('self_audit');
    } else if (hasGatedActivities) {
      setPhase('gate1');
    } else {
      setPhase('done');
    }
  };

  const handleAuditComplete = async (report) => {
    setAuditReport(report);
    if (hasGatedActivities) {
      setPhase('gate1');
    } else {
      setPhase('done');
    }
  };

  const handleGate1Proceed = () => setPhase('gate2');

  const handleGate2Approve = async (items) => {
    setApprovedItems(items);
    // Run protect before gate3 for heal/upgrade
    if (activities.includes('self_protect')) {
      setPhase('protecting');
      await runProtect();
    }
    // Determine which activity to execute first
    const firstGated = gatedActivities[0];
    if (firstGated) {
      setActionType(ACTIVITY_LABEL[firstGated]);
      await runEngine(firstGated, items);
    }
    setPhase('gate3');
  };

  const handleGate2Reject = ({ reason }) => {
    setPhase('done');
  };

  const handleGate3Accept = ({ testNotes }) => {
    setGate3Notes(testNotes);
    setPostScores({
      test: testReport?.test_score_percentage,
      overall: auditReport?.scores?.overall,
      ...(auditReport?.scores || {}),
    });
    setPhase('gate4');
  };

  const handleGate4Accept = async ({ confidence }) => {
    const metadata = {};

    // If upgrade — record version increment
    if (activities.includes('self_upgrade') && executionResult?.version_increment) {
      metadata.version_increment = executionResult.version_increment;
      metadata.changelog = executionResult.changelog || '';
    }

    // Log capability transfer if selected
    if (activities.includes('capability_transfer') && approvedItems.length > 0) {
      await base44.entities.GovernanceSession.update(activeSession.id, {
        capability_transfer: {
          transferred_at: new Date().toISOString(),
          source_url: url,
          items: approvedItems.map(i => i.action),
          confidence,
        },
      });
    }

    setProtectionActive(false);
    setProtectionSnapshot(null);
    await updateSession({ current_activity: 'completed', status: 'completed', ...metadata });
    setSessionComplete(true);
    setPhase('done');
  };

  const handleGate4Rollback = async ({ reason }) => {
    setProtectionActive(false);
    setProtectionSnapshot(null);
    setPhase('gate2'); // Return to Gate 2 with retry option
  };

  const triggerAudit = async () => {
    setRunningAudit(true);
    const report = await runSelfAudit(testReport);
    setAuditReport(report);
    setRunningAudit(false);
    handleAuditComplete(report);
  };

  if (sessionComplete) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3">
        <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
        <h3 className="text-base font-bold text-foreground">Session Complete</h3>
        <p className="text-xs text-muted-foreground">All governance activities processed. Governance timeline updated.</p>
        <Button variant="outline" size="sm" onClick={endSession}>Close Session</Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
        {['self_test', 'self_audit', 'gate1', 'gate2', 'gate3', 'gate4'].map((p, i) => (
          <span key={p} className={`flex items-center gap-1 ${phase === p ? 'text-primary font-bold' : ''}`}>
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {p.replace('_', ' ')}
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* SELF-TEST */}
        {phase === 'self_test' && (
          <motion.div key="test" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-border bg-card p-5">
              <SelfTestRunner
                url={url} isSpa={isSpa} appContext={appContext}
                sessionId={activeSession.id}
                onComplete={handleTestComplete}
              />
            </div>
          </motion.div>
        )}

        {/* SELF-AUDIT */}
        {phase === 'self_audit' && (
          <motion.div key="audit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div>
                <p className="text-sm font-bold text-foreground">Self-Audit Engine</p>
                <p className="text-xs text-muted-foreground">Test-informed scoring · Goal: {settings.evaluation_goal || 'General Visitor'}</p>
              </div>
              {testReport && (
                <div className="text-xs text-muted-foreground bg-secondary/20 rounded-lg p-2">
                  Test baseline: {testReport.test_score_percentage}% — failed: {testReport.blocking_issues || 'none'}
                </div>
              )}
              <Button onClick={triggerAudit} disabled={runningAudit} className="gap-2 w-full">
                {runningAudit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {runningAudit ? 'Running Audit...' : 'Run Self-Audit'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* PROTECTING */}
        {phase === 'protecting' && (
          <motion.div key="protecting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
              <div>
                <p className="text-sm font-bold text-amber-400">Running Self-Protect</p>
                <p className="text-xs text-muted-foreground">Creating protection snapshot before applying changes...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* GATE 1 */}
        {phase === 'gate1' && (
          <motion.div key="gate1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Gate1Review
              testReport={testReport}
              auditReport={auditReport}
              actionType={gatedActivities.map(a => ACTIVITY_LABEL[a]).join(' + ')}
              triggerReason="Self-Test and Self-Audit complete. Review results before approving changes."
              onProceed={handleGate1Proceed}
            />
          </motion.div>
        )}

        {/* GATE 2 */}
        {phase === 'gate2' && (
          <motion.div key="gate2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Gate2Approval
              items={buildGate2Items()}
              actionType={gatedActivities.map(a => ACTIVITY_LABEL[a]).join(' + ')}
              onApprove={handleGate2Approve}
              onReject={handleGate2Reject}
            />
          </motion.div>
        )}

        {/* EXECUTING */}
        {(phase === 'executing' || executing) && (
          <motion.div key="executing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-bold text-foreground">Executing: {actionType}</p>
                <p className="text-xs text-muted-foreground">Generating sprint request from approved items...</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* GATE 3 */}
        {phase === 'gate3' && !executing && (
          <motion.div key="gate3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Gate3Test
              preparedAction={preparedAction}
              testChecklist={testChecklist}
              url={url} isSpa={isSpa} appContext={appContext}
              preScores={preScores}
              onAccept={handleGate3Accept}
            />
          </motion.div>
        )}

        {/* GATE 4 */}
        {phase === 'gate4' && (
          <motion.div key="gate4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Gate4Acceptance
              preScores={preScores}
              postScores={postScores}
              actionType={actionType}
              protectionSnapshot={protectionSnapshot}
              testNotes={gate3Notes}
              executionResult={executionResult}
              onAccept={handleGate4Accept}
              onRollback={handleGate4Rollback}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}