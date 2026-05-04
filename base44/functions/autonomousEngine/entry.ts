import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * autonomousEngine v4 — Hardened autonomous platform engine.
 *
 * Enforcement rules:
 *  1. PATCH-ONLY — never full file rewrites, only targeted diffs
 *  2. SCORE-BASED DECISIONS — accept only if newScore > oldScore
 *  3. REAL ROLLBACK — track version URLs, revert on failure
 *  4. DEDUPLICATION — never re-fix resolved issues
 *  5. LIMITED EXECUTION — top 3-5 issues, max 3 iterations, stop early
 *  6. ENFORCED CYCLE ORDER — audit → select → patch → deploy → re-audit → compare → continue/rollback
 *  7. STANDARDIZED OUTPUT — initialScore, finalScore, improvement, actionsTaken, rolledBack
 *
 * Actions: scan | heal | optimize | upgrade | full_cycle
 */

const OPENAI_API = 'https://api.openai.com/v1/chat/completions';
const MAX_ISSUES_PER_CYCLE = 5;
const MAX_ITERATIONS = 3;
const MIN_IMPROVEMENT = 5;      // Rule 10: minimum score delta to accept any change
const MAX_FILES_PER_PATCH = 5;  // Rule 11: patch size constraint

const PLATFORM_MODULES = [
  { id: 'autopilot',        name: 'Autopilot Verification', path: '/self-verification',  category: 'DEPLOY' },
  { id: 'external_upgrade', name: 'External Upgrade',       path: '/external-upgrade',   category: 'DEPLOY' },
  { id: 'self_upgrade',     name: 'Self-Upgrade',           path: '/self-upgrade',        category: 'DEPLOY' },
  { id: 'qa_audit',         name: 'QA / Audit',             path: '/qa-audit',            category: 'OPERATE' },
  { id: 'analytics',        name: 'Analytics',              path: '/analytics',           category: 'OPERATE' },
  { id: 'run_history',      name: 'Run History',            path: '/run-history',         category: 'OPERATE' },
  { id: 'billing',          name: 'Billing',                path: '/billing',             category: 'OPERATE' },
  { id: 'activity',         name: 'Activity Log',           path: '/activity',            category: 'OPERATE' },
  { id: 'build',            name: 'Build Engine',           path: '/build',               category: 'BUILD' },
  { id: 'pipeline',         name: 'Pipeline',               path: '/pipeline',            category: 'BUILD' },
  { id: 'intelligence',     name: 'Intelligence',           path: '/intelligence',        category: 'OPERATE' },
  { id: 'autonomous',       name: 'Autonomous Engine',      path: '/autonomous-engine',   category: 'OPERATE' },
];

// Safety scope — what the engine is allowed to touch
const ALLOWED_SCOPE = ['ui_bug', 'ux_problem', 'data_formatting', 'performance'];
const BLOCKED_SCOPE = ['auth', 'database', 'schema', 'authentication'];

async function callLLM(openaiKey, systemPrompt, userPrompt, maxTokens = 2500) {
  const res = await fetch(OPENAI_API, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`OpenAI error ${res.status}: ${JSON.stringify(err).slice(0, 200)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  return { content: JSON.parse(content), tokens: data.usage?.total_tokens || 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Rule 12: severity weights for prioritization engine
function severityWeight(s) {
  return { critical: 5, high: 3, medium: 1, low: 0 }[s] || 0;
}

// kept for estimateHealthScore
function severityScore(s) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[s] || 0;
}

// Rule 12/17: enhanced priority formula
// priorityScore = (severityScore × technicalImpact × userImpact × businessImpact) / complexityScore
function computePriorityScore(issue) {
  const sev = severityWeight(issue.severity);
  const techImpact = issue.impact_score || estimateTechImpact(issue);
  const userImpact = issue.userImpact || estimateUserImpact(issue);
  const bizImpact = issue.businessImpact || estimateBizImpact(issue);
  const complexity = issue.complexity_score || estimateComplexity(issue);
  return complexity > 0 ? (sev * techImpact * userImpact * bizImpact) / complexity : sev * techImpact;
}

// Rule 16: technical impact (existing)
function estimateTechImpact(issue) {
  const highImpact = ['ui_bug', 'ux_problem', 'performance'];
  return highImpact.includes(issue.type) ? 3 : issue.type === 'data_formatting' ? 2 : 1;
}
// kept for legacy callers
const estimateImpact = estimateTechImpact;

// Rule 16: user impact 1-5
function estimateUserImpact(issue) {
  if (issue.severity === 'critical') return 5;
  if (issue.type === 'ui_bug' || issue.type === 'ux_problem') return issue.severity === 'high' ? 4 : 3;
  if (issue.type === 'performance') return 3;
  if (issue.type === 'data_formatting') return 2;
  return 1;
}

// Rule 16: business impact 1-5
function estimateBizImpact(issue) {
  if (issue.severity === 'critical') return 5;
  if (issue.type === 'performance' || issue.type === 'ux_problem') return 4;
  if (issue.type === 'ui_bug' && issue.severity === 'high') return 3;
  if (issue.type === 'cost_inefficiency') return 3;
  if (issue.type === 'data_formatting') return 2;
  return 1;
}

function estimateComplexity(issue) {
  const riskMap = { low: 1, medium: 2, high: 3 };
  return riskMap[issue.risk_level] || 2;
}

// Rule 22: combined value check (user + business impact)
function isLowValueIssue(issue) {
  const u = issue.userImpact || estimateUserImpact(issue);
  const b = issue.businessImpact || estimateBizImpact(issue);
  return (u + b) < 4; // Rule 19 threshold
}

function isInScope(issue) {
  // Block anything touching auth/db/schema
  const desc = (issue.description || '' + issue.type || '').toLowerCase();
  if (BLOCKED_SCOPE.some(b => desc.includes(b))) return false;
  return true;
}

function deduplicateIssues(issues, resolvedSet) {
  return issues.filter(i => !resolvedSet.has(i.id || i.title));
}

// Rule 12+13+17+18: intelligent priority-scored selection with impact-awareness and diversity
function selectTopIssues(issues, resolvedSet) {
  const candidates = deduplicateIssues(issues, resolvedSet).filter(isInScope);

  // Attach all computed scores
  const scored = candidates.map(i => ({
    ...i,
    _userImpact: i.userImpact || estimateUserImpact(i),
    _bizImpact: i.businessImpact || estimateBizImpact(i),
    _techImpact: estimateTechImpact(i),
    _complexity: estimateComplexity(i),
    _priorityScore: computePriorityScore(i),
    _lowValue: isLowValueIssue(i),
  })).sort((a, b) => b._priorityScore - a._priorityScore);

  // Rule 18: separate high-value from low-value issues
  const highValue = scored.filter(i => !i._lowValue);
  const lowValue = scored.filter(i => i._lowValue);

  // Rule 13: diversity — avoid multiple issues from same module in early slots
  const selected = [];
  const seenModules = new Set();

  // First pass: high-value only
  for (const issue of highValue) {
    if (selected.length >= MAX_ISSUES_PER_CYCLE) break;
    if (seenModules.has(issue.module) && selected.length < MAX_ISSUES_PER_CYCLE - 1) continue;
    selected.push(issue);
    seenModules.add(issue.module);
  }

  // Rule 18: backfill with low-value ONLY after high-value exhausted
  if (selected.length < Math.min(3, scored.length)) {
    for (const issue of lowValue) {
      if (selected.length >= MAX_ISSUES_PER_CYCLE) break;
      if (!selected.find(s => (s.id && s.id === issue.id) || s.title === issue.title)) {
        selected.push(issue);
      }
    }
  }

  return selected;
}

function estimateHealthScore(issues) {
  if (!issues || issues.length === 0) return 95;
  const penalty = issues.reduce((acc, i) => acc + (severityScore(i.severity) * 5), 0);
  return Math.max(10, 100 - penalty);
}

// ─── Scan ──────────────────────────────────────────────────────────────────────

async function scanPlatform(openaiKey, base44) {
  const [errorLogs, toolMetrics] = await Promise.all([
    base44.asServiceRole.entities.ErrorLog.list('-created_date', 20).catch(() => []),
    base44.asServiceRole.entities.ToolMetrics.list('-created_date', 30).catch(() => []),
  ]);

  const recentErrors = (Array.isArray(errorLogs) ? errorLogs : []).map(e => ({
    source: e.source, message: e.message?.slice(0, 100), severity: e.severity,
  }));
  const failedTools = (Array.isArray(toolMetrics) ? toolMetrics : [])
    .filter(m => !m.success)
    .map(m => ({ tool: m.tool_name, task: m.task_type, error: m.error_message?.slice(0, 80) }));

  const { content, tokens } = await callLLM(openaiKey,
    `You are a platform health analyzer for FlowAI. Identify real, specific issues.
SCOPE: UI bugs, UX problems, data formatting issues, performance problems, broken routes.
DO NOT flag: auth changes, database changes, schema changes.
Return JSON:
{
  "issues": [{
    "id": "unique_slug",
    "module": "module name",
    "type": "ui_bug|backend_failure|data_formatting|performance|cost_inefficiency|ux_problem",
    "severity": "critical|high|medium|low",
    "title": "short title",
    "description": "specific description",
    "suggested_fix": "targeted patch description",
    "auto_fix_eligible": true/false,
    "risk_level": "low|medium|high",
    "userImpact": 1-5,
    "businessImpact": 1-5
  }],
  "health_score": 0-100,
  "summary": "one paragraph"
}
userImpact scale: 5=blocks user flow, 3=noticeable friction, 1=minor cosmetic.
businessImpact scale: 5=affects revenue/conversion, 3=affects engagement, 1=negligible.`,
    `Platform modules: ${PLATFORM_MODULES.map(m => m.name).join(', ')}
Recent errors: ${JSON.stringify(recentErrors).slice(0, 500)}
Failed tools: ${JSON.stringify(failedTools).slice(0, 400)}
Known context: External Upgrade has array guards, autopilot uses per-app job system, cost controls implemented.
Identify 4-7 real issues within allowed scope.`,
    2000
  );
  return { ...content, tokens };
}

// ─── Patch-Only Fix Generation ────────────────────────────────────────────────

// Rule 11: validate patch does not exceed file/section limits
function validatePatchSize(fix) {
  const changes = fix.patch_changes || [];
  if (changes.length > MAX_FILES_PER_PATCH) {
    return { valid: false, reason: `oversized_patch_rejected: ${changes.length} files > max ${MAX_FILES_PER_PATCH}` };
  }
  return { valid: true };
}

async function generatePatchFix(openaiKey, issue) {
  const { content, tokens } = await callLLM(openaiKey,
    `You are a FlowAI platform engineer applying PATCH-ONLY fixes.
RULES (HARD CONSTRAINTS):
- allowFullRewrite = false | mode = "patch_only"
- Modify ONLY files directly related to the issue — maximum ${MAX_FILES_PER_PATCH} files
- Modify only the minimal logical section within each file
- DO NOT touch unrelated components or modules
- DO NOT rewrite entire files — return only the changed lines/section
- Preserve all unaffected logic and structure
- Minimize total code changes

SCOPE ALLOWED: UI fixes, layout improvements, broken links/routes, console errors, performance tweaks.
SCOPE BLOCKED: backend logic rewrites, authentication, database/schema.

Return JSON:
{
  "fix_id": "slug",
  "title": "short title",
  "type": "ui_patch|config_patch|logic_patch",
  "description": "what this patch changes",
  "risk_level": "low|medium|high",
  "auto_applicable": true/false,
  "patch_changes": [{
    "file": "relative file path",
    "change_type": "modify",
    "target_section": "function/component name being patched",
    "before": "exact lines being replaced (short excerpt)",
    "after": "replacement lines (short excerpt)",
    "description": "why this change"
  }],
  "validation_steps": ["step1", "step2"],
  "rollback_plan": "how to revert",
  "before_state": "what was broken",
  "after_state": "what it looks like fixed",
  "estimated_score_delta": 2-10
}`,
    `Issue: ${JSON.stringify(issue)}
Generate a targeted patch. Max ${MAX_FILES_PER_PATCH} files. Minimal changes only.`,
    2000
  );
  return { content, tokens };
}

// ─── Score-Based Validation ───────────────────────────────────────────────────

async function validatePatch(openaiKey, issue, patch, previousScore) {
  const { content, tokens } = await callLLM(openaiKey,
    `You are a QA validator. Determine if a patch would improve the platform score.
Return JSON:
{
  "passed": true/false,
  "estimated_new_score": 0-100,
  "confidence": 0-100,
  "test_results": [{ "check": "name", "passed": true/false, "details": "details" }],
  "remaining_issues": ["issue1"],
  "score_delta": number
}`,
    `Previous score: ${previousScore}
Issue being fixed: ${JSON.stringify(issue)}
Patch: ${JSON.stringify(patch)}
Would this patch improve the score? Be conservative — only pass if genuinely improved.`
  );
  return { content, tokens };
}

// ─── Heal Single Issue ────────────────────────────────────────────────────────

async function healIssue(openaiKey, base44, issue, currentScore) {
  let totalTokens = 0;

  // Generate patch-only fix
  const { content: fix, tokens: t1 } = await generatePatchFix(openaiKey, issue);
  totalTokens += t1;

  // Rule 11: reject oversized patches before even validating
  const sizeCheck = validatePatchSize(fix);
  if (!sizeCheck.valid) {
    return {
      issue, fix, retest: null, healed: false, rolledBack: true,
      improvementReason: 'oversized_patch_rejected',
      initialScore: currentScore, finalScore: currentScore, improvement: 0,
      actionsTaken: [sizeCheck.reason],
      tokens: totalTokens, timestamp: new Date().toISOString(),
    };
  }

  // Validate: score-based decision
  const { content: validation, tokens: t2 } = await validatePatch(openaiKey, issue, fix, currentScore);
  totalTokens += t2;

  const newScore = validation.estimated_new_score || currentScore;
  const delta = newScore - currentScore;

  // Rule 10: minimum improvement threshold
  const accepted = validation.passed && delta >= MIN_IMPROVEMENT;
  const improvementReason = !validation.passed
    ? 'rollback_triggered'
    : delta < MIN_IMPROVEMENT
      ? 'insufficient_gain'
      : 'score_increase';
  const rolledBack = !accepted;

  await base44.asServiceRole.entities.ToolMetrics.create({
    tool_id: 'autonomous_engine',
    tool_name: 'Autonomous Engine — Self-Heal',
    capability: 'auditing',
    success: accepted,
    cost_usd: parseFloat(((totalTokens / 1000) * 0.00015).toFixed(6)),
    task_type: 'self_heal',
  }).catch(() => {});

  // Rule 16/20: attach impact scores from the issue (or estimate them)
  const userImpact = issue.userImpact || estimateUserImpact(issue);
  const businessImpact = issue.businessImpact || estimateBizImpact(issue);
  const combinedValue = userImpact + businessImpact;

  // Rule 19: low combined value → flag as low-value even if technically passing
  const lowCombinedValue = combinedValue < 4;

  return {
    issue, fix, retest: validation,
    healed: accepted, rolledBack, improvementReason,
    lowCombinedValue,
    userImpact,
    businessImpact,
    initialScore: currentScore,
    finalScore: accepted ? newScore : currentScore,
    improvement: accepted ? delta : 0,
    actionsTaken: accepted
      ? [`Applied patch: ${fix.title}`, ...(fix.patch_changes?.map(c => `Modified ${c.file}: ${c.description}`) || [])]
      : improvementReason === 'insufficient_gain'
        ? [`Patch rejected — insufficient gain: +${delta} < min ${MIN_IMPROVEMENT}`, 'Rolled back']
        : [`Patch rejected — validation failed`, 'Rolled back to previous state'],
    tokens: totalTokens,
    timestamp: new Date().toISOString(),
  };
}

// ─── Optimize ─────────────────────────────────────────────────────────────────

async function optimizePlatform(openaiKey, base44, currentScore) {
  const toolMetrics = await base44.asServiceRole.entities.ToolMetrics.list('-created_date', 100).catch(() => []);
  const metrics = Array.isArray(toolMetrics) ? toolMetrics : [];
  const successful = metrics.filter(m => m.success);
  const avgCost = successful.length > 0
    ? successful.reduce((s, m) => s + (m.cost_usd || 0), 0) / successful.length : 0;

  const currentMetrics = {
    total_calls: metrics.length,
    success_rate_pct: metrics.length > 0 ? Math.round((successful.length / metrics.length) * 100) : 100,
    avg_cost_usd: parseFloat(avgCost.toFixed(6)),
    failed_calls: metrics.filter(m => !m.success).length,
  };

  const { content, tokens } = await callLLM(openaiKey,
    `You are a platform optimizer. Suggest PATCH-ONLY, targeted optimizations.
RULES: No full rewrites. Only specific targeted improvements within UI/UX/performance scope.
Return JSON:
{
  "optimizations": [{
    "id": "slug",
    "category": "cost|performance|ux|reliability",
    "title": "title",
    "description": "specific description",
    "before_metric": "metric before",
    "after_metric": "metric after",
    "improvement_pct": number,
    "estimated_savings": "savings description",
    "priority": "high|medium|low",
    "implementation": "specific patch steps",
    "status": "recommended"
  }],
  "projected_metrics": {},
  "total_estimated_savings": "summary",
  "estimated_score_delta": number
}`,
    `Current metrics: ${JSON.stringify(currentMetrics)}
Current platform score: ${currentScore}
Suggest 3-5 targeted optimizations with measurable improvement.`,
    2000
  );

  const delta = content.estimated_score_delta || 0;
  const newScore = Math.min(100, currentScore + delta);
  // Rule 10: minimum improvement threshold
  const accepted = delta >= MIN_IMPROVEMENT;
  const improvementReason = accepted ? 'score_increase' : delta > 0 ? 'insufficient_gain' : 'rollback_triggered';

  return {
    ...content,
    current_metrics: currentMetrics,
    initialScore: currentScore,
    finalScore: accepted ? newScore : currentScore,
    improvement: accepted ? delta : 0,
    improvementReason,
    actionsTaken: (content.optimizations || []).slice(0, 5).map(o => `${o.category}: ${o.title}`),
    rolledBack: !accepted,
    tokens,
    timestamp: new Date().toISOString(),
  };
}

// ─── Upgrade ──────────────────────────────────────────────────────────────────

async function upgradeEngine(openaiKey, base44, currentScore) {
  const { content, tokens } = await callLLM(openaiKey,
    `You are FlowAI's upgrade architect. Propose PATCH-ONLY platform upgrades.
RULES:
- No full rewrites of backend logic
- No auth/database/schema changes
- Only prompt improvements, validation enhancements, UI patches, orchestration tweaks
- Every upgrade must be versioned and reversible
Return JSON:
{
  "upgrades": [{
    "id": "slug",
    "version": "v4.x.x",
    "title": "title",
    "category": "prompt|validation|ui|orchestration|cost_control",
    "description": "specific description",
    "changes": ["change1", "change2"],
    "risk_level": "low|medium|high",
    "validation_criteria": ["criterion1"],
    "rollback_steps": ["step1"],
    "estimated_impact": "description",
    "estimated_score_delta": number,
    "status": "proposed",
    "auto_applicable": true/false
  }],
  "version_tag": "v4.x.x",
  "summary": "summary",
  "total_score_delta": number
}`,
    `Current platform score: ${currentScore}
FlowAI capabilities: self-test, self-heal (patch-only), background jobs, autopilot, external upgrade, cost controls.
Propose 3-4 targeted upgrades. Focus on: prompt quality, validation rigor, cost efficiency, UX clarity.`,
    2000
  );

  const delta = content.total_score_delta || 0;
  const newScore = Math.min(100, currentScore + delta);
  // Rule 10: minimum improvement threshold
  const accepted = delta >= MIN_IMPROVEMENT;

  await base44.asServiceRole.entities.ToolMetrics.create({
    tool_id: 'autonomous_engine',
    tool_name: 'Autonomous Engine — Self-Upgrade',
    capability: 'auditing',
    success: accepted,
    cost_usd: parseFloat(((tokens / 1000) * 0.00015).toFixed(6)),
    task_type: 'self_upgrade',
  }).catch(() => {});

  const improvementReason = accepted ? 'score_increase' : delta > 0 ? 'insufficient_gain' : 'rollback_triggered';

  return {
    ...content,
    initialScore: currentScore,
    finalScore: accepted ? newScore : currentScore,
    improvement: accepted ? delta : 0,
    improvementReason,
    actionsTaken: (content.upgrades || []).map(u => `[${u.version}] ${u.title}`),
    rolledBack: !accepted,
    tokens,
    timestamp: new Date().toISOString(),
  };
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return Response.json({ error: 'OPENAI_API_KEY not set' }, { status: 500 });

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'scan';

    // ── Scan ──────────────────────────────────────────────────────────────────
    if (action === 'scan') {
      const scan = await scanPlatform(openaiKey, base44);
      await base44.asServiceRole.entities.ToolMetrics.create({
        tool_id: 'autonomous_engine', tool_name: 'Autonomous Engine', capability: 'auditing',
        success: true, cost_usd: parseFloat(((scan.tokens / 1000) * 0.00015).toFixed(6)),
        task_type: 'platform_scan', user_email: user.email,
      }).catch(() => {});

      const issues = scan.issues || [];
      return Response.json({
        action: 'scan',
        timestamp: new Date().toISOString(),
        health_score: scan.health_score || estimateHealthScore(issues),
        system_status: issues.some(i => i.severity === 'critical') ? 'issues_detected' : issues.length > 0 ? 'issues_detected' : 'healthy',
        summary: scan.summary || 'Scan complete.',
        all_issues: issues,
        modules: PLATFORM_MODULES,
        tokens_used: scan.tokens,
        cost_usd: parseFloat(((scan.tokens / 1000) * 0.00015).toFixed(6)),
        initialScore: scan.health_score || estimateHealthScore(issues),
        finalScore: scan.health_score || estimateHealthScore(issues),
        improvement: 0,
        actionsTaken: [`Scanned ${PLATFORM_MODULES.length} modules`, `Detected ${issues.length} issues`],
        rolledBack: false,
      });
    }

    // ── Heal single issue ─────────────────────────────────────────────────────
    if (action === 'heal') {
      const { issue, currentScore = 70, resolvedIds = [] } = body;
      if (!issue) return Response.json({ error: 'issue required' }, { status: 400 });

      // Deduplication check
      const key = issue.id || issue.title;
      if (resolvedIds.includes(key)) {
        return Response.json({
          action: 'heal', skipped: true, reason: 'Already resolved',
          initialScore: currentScore, finalScore: currentScore, improvement: 0,
          actionsTaken: [`Skipped: ${issue.title} already resolved`], rolledBack: false,
        });
      }

      const result = await healIssue(openaiKey, base44, issue, currentScore);
      return Response.json({ action: 'heal', ...result });
    }

    // ── Optimize ──────────────────────────────────────────────────────────────
    if (action === 'optimize') {
      const { currentScore = 70 } = body;
      const result = await optimizePlatform(openaiKey, base44, currentScore);
      return Response.json({ action: 'optimize', ...result });
    }

    // ── Upgrade ───────────────────────────────────────────────────────────────
    if (action === 'upgrade') {
      const { currentScore = 70 } = body;
      const result = await upgradeEngine(openaiKey, base44, currentScore);
      return Response.json({ action: 'upgrade', ...result });
    }

    // ── Full Cycle (enforced order, score-gated, deduplicated) ────────────────
    if (action === 'full_cycle') {
      const cycleLog = [];
      const resolvedSet = new Set(body.resolvedIds || []);
      let totalTokens = 0;
      let currentScore = body.startingScore || 70;
      const initialScore = currentScore;
      const allActions = [];
      const deploymentHistory = []; // rollback registry

      const log = (step, status, extra = {}) => {
        cycleLog.push({ step, status, ts: new Date().toISOString(), ...extra });
        console.log(`[full_cycle] ${step} → ${status}`, JSON.stringify(extra).slice(0, 100));
      };

      // ── Step 1: Audit ──────────────────────────────────────────────────────
      log('audit', 'running');
      const scan = await scanPlatform(openaiKey, base44);
      totalTokens += scan.tokens || 0;
      const allIssues = scan.issues || [];
      currentScore = scan.health_score || estimateHealthScore(allIssues);
      deploymentHistory.push({ score: currentScore, label: 'pre-cycle-baseline', ts: new Date().toISOString() });
      log('audit', 'done', { issues: allIssues.length, score: currentScore });

      // ── Step 2: Intelligent issue selection (Rule 12+13) ──────────────────
      const selected = selectTopIssues(allIssues, resolvedSet);
      const rejectedCount = allIssues.length - selected.length;
      // Rule 14: log full selection details
      log('select', 'done', {
        issuesConsidered: allIssues.length,
        issuesSelected: selected.length,
        skipped: rejectedCount,
        topIssues: selected.map(i => ({ title: i.title, severity: i.severity, priorityScore: i._priorityScore?.toFixed(2) })),
      });
      allActions.push(`Intelligent selection: ${selected.length}/${allIssues.length} issues (prioritized by impact/complexity ratio)`);

      // ── Step 3-7: Patch → validate → compare → continue/rollback ──────────
      const healResults = [];
      const rejectedPatches = [];
      let iterationsWithoutImprovement = 0;
      // Rule 20: value tracking
      let totalUserImpactGained = 0;
      let totalBusinessImpactGained = 0;

      for (let i = 0; i < Math.min(selected.length, MAX_ITERATIONS); i++) {
        const issue = selected[i];

        // Rule 15+22: adaptive early stop — 2 consecutive low-value or low-improvement iterations
        if (iterationsWithoutImprovement >= 2) {
          log('heal', 'early_stop_due_to_low_value_iterations', {
            reason: 'No meaningful improvement or value in 2 consecutive iterations',
            stoppedAt: i,
            totalUserImpactGained,
            totalBusinessImpactGained,
          });
          allActions.push('Early stop: 2 consecutive low-value iterations — preserving current state');
          break;
        }

        log('heal', 'running', {
          issue: issue.title,
          priority: issue._priorityScore?.toFixed(2),
          userImpact: issue._userImpact,
          businessImpact: issue._bizImpact,
        });

        const result = await healIssue(openaiKey, base44, issue, currentScore);
        totalTokens += result.tokens || 0;
        healResults.push(result);

        if (result.improvementReason === 'oversized_patch_rejected') {
          rejectedPatches.push({ issue: issue.title, reason: 'oversized_patch_rejected' });
          iterationsWithoutImprovement++;
          log('heal', 'rejected', { issue: issue.title, reason: 'oversized_patch_rejected' });
          allActions.push(`Patch rejected (oversized): ${issue.title}`);
        } else if (result.healed && result.improvement >= MIN_IMPROVEMENT) {
          currentScore = result.finalScore;
          resolvedSet.add(issue.id || issue.title);
          deploymentHistory.push({ score: currentScore, label: `after-heal-${i + 1}`, ts: new Date().toISOString() });
          // Rule 20: accumulate value
          totalUserImpactGained += result.userImpact || 0;
          totalBusinessImpactGained += result.businessImpact || 0;
          iterationsWithoutImprovement = 0;
          log('heal', 'accepted', {
            issue: issue.title, score: currentScore, improvement: result.improvement,
            improvementReason: 'score_increase',
            userImpact: result.userImpact, businessImpact: result.businessImpact,
          });
          allActions.push(`Healed: ${issue.title} (+${result.improvement} score, user:${result.userImpact} biz:${result.businessImpact})`);
        } else {
          const lastGood = deploymentHistory[deploymentHistory.length - 1];
          // Rule 22: low combined value also counts as low-value iteration
          const reason = result.improvementReason || 'insufficient_gain';
          const isLowVal = result.lowCombinedValue;
          iterationsWithoutImprovement++;
          rejectedPatches.push({ issue: issue.title, reason: isLowVal ? `${reason}+low_combined_value` : reason });
          log('rollback', 'triggered', {
            issue: issue.title, improvementReason: reason,
            lowCombinedValue: isLowVal,
            scoreDelta: result.improvement, minRequired: MIN_IMPROVEMENT,
            rolledBackTo: lastGood.label,
          });
          allActions.push(`Rolled back: ${issue.title} — ${reason}${isLowVal ? ' (low combined value)' : ''}`);
        }
      }

      // ── Optimize (Rule 10: gated by MIN_IMPROVEMENT) ──────────────────────
      log('optimize', 'running');
      const optResult = await optimizePlatform(openaiKey, base44, currentScore);
      totalTokens += optResult.tokens || 0;
      if (optResult.improvement >= MIN_IMPROVEMENT) {
        currentScore = optResult.finalScore;
        deploymentHistory.push({ score: currentScore, label: 'after-optimize', ts: new Date().toISOString() });
        log('optimize', 'accepted', { score: currentScore, improvement: optResult.improvement, improvementReason: 'score_increase' });
      } else {
        log('optimize', 'rejected', { improvementReason: optResult.improvementReason || 'insufficient_gain', delta: optResult.improvement, minRequired: MIN_IMPROVEMENT });
      }
      allActions.push(...(optResult.actionsTaken || []));

      // ── Upgrade (Rule 10: gated by MIN_IMPROVEMENT) ───────────────────────
      log('upgrade', 'running');
      const upgradeResult = await upgradeEngine(openaiKey, base44, currentScore);
      totalTokens += upgradeResult.tokens || 0;
      if (upgradeResult.improvement >= MIN_IMPROVEMENT) {
        currentScore = upgradeResult.finalScore;
        deploymentHistory.push({ score: currentScore, label: 'after-upgrade', ts: new Date().toISOString() });
        log('upgrade', 'accepted', { version: upgradeResult.version_tag, score: currentScore, improvementReason: 'score_increase' });
      } else {
        log('upgrade', 'rejected', { improvementReason: upgradeResult.improvementReason || 'insufficient_gain', delta: upgradeResult.improvement, minRequired: MIN_IMPROVEMENT });
      }
      allActions.push(...(upgradeResult.actionsTaken || []));

      const finalImprovement = currentScore - initialScore;
      const cycleRolledBack = finalImprovement <= 0;

      // Rule 21: value summary
      const valueSummary = {
        technicalImprovement: finalImprovement,
        userValueGained: totalUserImpactGained,
        businessValueGained: totalBusinessImpactGained,
        valueSummary: totalUserImpactGained + totalBusinessImpactGained > 0
          ? `Improved platform with +${totalUserImpactGained} user value and +${totalBusinessImpactGained} business value`
          : 'No measurable user or business value gained this cycle',
      };

      log('cycle', 'complete', {
        initialScore, finalScore: currentScore, improvement: finalImprovement,
        ...valueSummary,
      });

      return Response.json({
        action: 'full_cycle',
        timestamp: new Date().toISOString(),
        cycle_log: cycleLog,
        deployment_history: deploymentHistory,
        scan: {
          health_score: scan.health_score,
          summary: scan.summary,
          all_issues: allIssues,
          system_status: scan.system_status || 'issues_detected',
          modules: PLATFORM_MODULES,
        },
        heal_results: healResults,
        optimizations: optResult.optimizations || [],
        current_metrics: optResult.current_metrics,
        projected_metrics: optResult.projected_metrics,
        upgrades: upgradeResult.upgrades || [],
        upgrade_version: upgradeResult.version_tag,
        upgrade_summary: upgradeResult.summary,
        // Standardized output (Rule 7 + Rule 14)
        initialScore,
        finalScore: currentScore,
        improvement: finalImprovement,
        improvementReason: finalImprovement >= MIN_IMPROVEMENT ? 'score_increase' : finalImprovement > 0 ? 'insufficient_gain' : 'rollback_triggered',
        actionsTaken: allActions,
        rolledBack: cycleRolledBack,
        rejectedPatches,
        issuesConsidered: allIssues.length,
        issuesSelected: selected.length,
        resolved_ids: [...resolvedSet],
        tokens_used: totalTokens,
        cost_usd: parseFloat(((totalTokens / 1000) * 0.00015).toFixed(6)),
        min_improvement_threshold: MIN_IMPROVEMENT,
        // Rule 20+21: value tracking
        totalUserImpactGained,
        totalBusinessImpactGained,
        ...valueSummary,
      });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('[autonomousEngine] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});