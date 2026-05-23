const STORAGE_KEY = 'flowai.pipelineRuns.v1';
export const FLOWAI_RUNS_CHANGED = 'flowai:runs-changed';

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
    stepCount: Number.isFinite(run.stepCount) ? run.stepCount : 0,
    branchUrl: run.branchUrl ?? null,
    compareUrl: run.compareUrl ?? null,
  };
}

export function listFlowAIRuns() {
  return readRuns();
}

export function listActiveFlowAIRuns() {
  return readRuns().filter((run) => run.status === 'running' || run.status === 'paused');
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
  const next = normalizeRun({ ...runs[index], ...patch });
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
