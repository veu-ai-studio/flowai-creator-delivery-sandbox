const STORAGE_KEY = 'flowai.pipelineRuns.v1';
export const FLOWAI_RUNS_CHANGED = 'flowai:runs-changed';
export const FLOWAI_RUN_HEARTBEAT_TIMEOUT_MS = 120_000;
export const FLOWAI_MACRO_STEPS = Object.freeze([
  'research',
  'design',
  'build',
  'qa_audit',
  'deploy',
  'self_renewal',
  'gtm',
  'monitor',
]);

const ORCHESTRATOR_STEP_TO_MACRO = Object.freeze({
  1: 'research',
  2: 'research',
  3: 'research',
  4: 'qa_audit',
  5: 'qa_audit',
  6: 'design',
  7: 'build',
  8: 'self_renewal',
  9: 'self_renewal',
  10: 'deploy',
  11: 'qa_audit',
  12: 'gtm',
  13: 'self_renewal',
  14: 'monitor',
});

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function nowIso() {
  return new Date().toISOString();
}

function readRuns() {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeStepResults(stepResults) {
  const input = stepResults && typeof stepResults === 'object' ? stepResults : {};
  return FLOWAI_MACRO_STEPS.reduce((acc, key) => {
    if (input[key]) acc[key] = input[key];
    return acc;
  }, {});
}

function countCompletedMacroSteps(stepResults) {
  const normalized = normalizeStepResults(stepResults);
  return FLOWAI_MACRO_STEPS.filter((key) => Boolean(normalized[key])).length;
}

function deriveMacroStepFromOrchestratorStep(step) {
  const n = Number(step);
  if (!Number.isFinite(n)) return null;
  return ORCHESTRATOR_STEP_TO_MACRO[Math.floor(n)] ?? null;
}

function macroSummaryFromLog(log = {}) {
  const result = log.result && typeof log.result === 'object'
    ? log.result
    : null;
  return {
    summary: log.stepName ?? log.tool ?? `Step ${log.step ?? ''}`,
    status: log.status ?? 'running',
    orchestrationStep: Number.isFinite(Number(log.step)) ? Number(log.step) : null,
    tool: log.tool ?? null,
    at: log.at ?? nowIso(),
    score: typeof result?.gtmScore === 'number'
      ? result.gtmScore
      : (typeof result?.postScore === 'number' ? result.postScore : null),
  };
}

export function buildFlowAIStepPatchFromLog(log = {}) {
  const macroStep = deriveMacroStepFromOrchestratorStep(log.step);
  if (!macroStep) {
    return {
      progressLabel: log.stepName ?? log.tool ?? `Step ${log.step ?? ''}`,
      lastHeartbeatAt: nowIso(),
    };
  }
  const stepResults = { [macroStep]: macroSummaryFromLog(log) };
  return {
    progressLabel: stepResults[macroStep].summary,
    stepResults,
    lastHeartbeatAt: nowIso(),
  };
}

function mergeStepResults(existing, patch) {
  return {
    ...normalizeStepResults(existing),
    ...normalizeStepResults(patch),
  };
}

function withStaleRunsReconciled(runs, now = Date.now(), timeoutMs = FLOWAI_RUN_HEARTBEAT_TIMEOUT_MS) {
  let changed = false;
  const next = runs.map((run) => {
    if (run.status !== 'running' && run.status !== 'paused') return run;
    const heartbeat = Date.parse(run.lastHeartbeatAt || run.startTime || '');
    if (!Number.isFinite(heartbeat) || now - heartbeat <= timeoutMs) return run;
    changed = true;
    return normalizeRun({
      ...run,
      status: 'timed_out',
      endTime: nowIso(),
      verdict: 'SSE_HEARTBEAT_TIMEOUT',
      progressLabel: 'Timed out after SSE heartbeat stopped',
    });
  });
  if (changed) writeRuns(next);
  return next;
}

function writeRuns(runs) {
  if (!canUseStorage()) return;
  const sorted = [...runs].sort((a, b) => new Date(b.startTime || 0) - new Date(a.startTime || 0));
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(FLOWAI_RUNS_CHANGED, { detail: sorted }));
}

function normalizeRun(run) {
  return {
    id: run.id ?? run.runId ?? `local_${Date.now()}`,
    runId: run.runId ?? run.id ?? null,
    product: run.product ?? 'Unknown product',
    productUrl: run.productUrl ?? null,
    startTime: run.startTime ?? nowIso(),
    endTime: run.endTime ?? null,
    score: typeof run.score === 'number' ? run.score : null,
    status: run.status ?? 'running',
    verdict: run.verdict ?? null,
    branchCreated: run.branchCreated ?? null,
    progressLabel: run.progressLabel ?? 'Starting',
    stepResults: normalizeStepResults(run.stepResults),
    stepCount: Number.isFinite(run.stepCount)
      ? run.stepCount
      : countCompletedMacroSteps(run.stepResults),
    lastHeartbeatAt: run.lastHeartbeatAt ?? run.startTime ?? nowIso(),
    branchUrl: run.branchUrl ?? null,
    compareUrl: run.compareUrl ?? null,
  };
}

export function listFlowAIRuns() {
  return withStaleRunsReconciled(readRuns());
}

export function listActiveFlowAIRuns() {
  return listFlowAIRuns().filter((run) => run.status === 'running' || run.status === 'paused');
}

export function upsertFlowAIRun(run) {
  const normalized = normalizeRun(run);
  const runs = readRuns();
  const index = runs.findIndex((existing) => existing.id === normalized.id || (normalized.runId && existing.runId === normalized.runId));
  if (index >= 0) {
    runs[index] = { ...runs[index], ...normalized };
  } else {
    runs.unshift(normalized);
  }
  writeRuns(runs);
  return normalized;
}

export function updateFlowAIRun(id, patch) {
  const runs = readRuns();
  const index = runs.findIndex((run) => run.id === id || run.runId === id);
  if (index < 0) return null;
  const stepResults = mergeStepResults(runs[index].stepResults, patch.stepResults);
  const next = normalizeRun({
    ...runs[index],
    ...patch,
    stepResults,
    stepCount: Number.isFinite(patch.stepCount)
      ? patch.stepCount
      : countCompletedMacroSteps(stepResults),
  });
  runs[index] = next;
  writeRuns(runs);
  return next;
}

export function replaceFlowAIRunId(localId, runId) {
  const runs = readRuns();
  const index = runs.findIndex((run) => run.id === localId);
  if (index < 0) return null;
  runs[index] = normalizeRun({ ...runs[index], id: runId, runId });
  writeRuns(runs);
  return runs[index];
}

export function subscribeFlowAIRuns(listener) {
  if (typeof window === 'undefined') return () => {};
  const handler = () => listener(listFlowAIRuns());
  window.addEventListener(FLOWAI_RUNS_CHANGED, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(FLOWAI_RUNS_CHANGED, handler);
    window.removeEventListener('storage', handler);
  };
}

export function runVerdictFromResult(result = {}) {
  if (result.gtmReady === true) return 'GTM_READY';
  if (result.exitReason === 'REGRESSION_DETECTED') return 'REGRESSION_DETECTED';
  if (typeof result.exitReason === 'string' && result.exitReason) return result.exitReason;
  return 'BEST_EFFORT';
}
