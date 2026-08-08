import { DISPATCH_STATES, normalizeDispatchCandidates, redactSecrets } from '../tools/toolDispatchContract.js';
import { getMember } from '../orchestra/index.js';

export class RankedToolFailoverError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RankedToolFailoverError';
    this.details = details;
  }
}

function candidateLabel(candidate) {
  return candidate?.platform_name ??
    candidate?.toolName ??
    candidate?.name ??
    candidate?.memberId ??
    'unknown-tool';
}

function candidateKey(candidate) {
  return `${candidate?.memberId ?? 'no-member'}::${candidateLabel(candidate)}`;
}

function attemptSnapshot(candidate, index, patch = {}) {
  return Object.freeze({
    index,
    rank: candidate?.rank ?? index + 1,
    tool: candidateLabel(candidate),
    memberId: candidate?.memberId ?? null,
    dispatchState: candidate?.dispatchState ?? DISPATCH_STATES.UNAVAILABLE,
    dispatchReason: candidate?.dispatchReason ?? null,
    credentialStatus: Object.freeze({ ...(candidate?.credentialStatus ?? {}) }),
    executionMode: candidate?.executionMode ?? null,
    selectionFactors: candidate?.selectionFactors ?? null,
    selectionScores: candidate?.selectionScores ?? null,
    selectionScore: candidate?.selectionScore ?? null,
    guidedSetup: candidate?.guidedSetup ?? null,
    ...patch,
  });
}

function normalizeCandidateList({ action, candidates = [], selectedTool = null, env = process.env }) {
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  if (list.length > 0) {
    const normalized = normalizeDispatchCandidates(list, { env, action });
    if (action !== 'crawl' || !list.some(candidate => candidate?.selectionContext === 'research')) return normalized;
    return Object.freeze([...normalized].sort((left, right) => (
      Number(right.dispatchCallable) - Number(left.dispatchCallable)
      || Number(right.selectionScore ?? 0) - Number(left.selectionScore ?? 0)
      || Number(left.rank ?? 0) - Number(right.rank ?? 0)
    )));
  }
  return selectedTool ? normalizeDispatchCandidates([selectedTool], { env, action }) : Object.freeze([]);
}

function supportsAction(candidate, action) {
  const member = candidate?.memberId ? getMember(candidate.memberId) : null;
  return !!(member && Array.isArray(member.capabilities) && member.capabilities.includes(action));
}

function timeoutResult(action, candidate, timeoutMs) {
  return Object.freeze({
    ok: false,
    action,
    member: candidate?.memberId ?? candidateLabel(candidate),
    timeout: true,
    error: `tool dispatch timed out after ${timeoutMs}ms`,
  });
}

async function invokeWithTimeout({ action, payload, dispatchFn, candidate, timeoutMs }) {
  let timeoutId = null;
  const invoke = Promise.resolve().then(() => dispatchFn(
    action,
    typeof payload === 'function' ? payload(candidate) : payload,
    { memberId: candidate.memberId },
  ));
  const timeout = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(timeoutResult(action, candidate, timeoutMs)), timeoutMs);
    timeoutId.unref?.();
  });

  try {
    return await Promise.race([invoke, timeout]);
  } catch (error) {
    return Object.freeze({
      ok: false,
      action,
      member: candidate?.memberId ?? candidateLabel(candidate),
      error: error?.message ?? String(error),
      thrown: true,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function defaultValidateResult(result) {
  return result;
}

function resultFailureState(result) {
  if (result?.timeout === true) return 'timeout';
  if (result?.deferred === true) return 'unavailable';
  return 'failed';
}

function resultFailureReason(result) {
  if (result?.timeout === true) return result.error ?? 'tool dispatch timed out';
  if (result?.deferred === true) return result.error ?? 'tool deferred execution';
  return result?.error ?? 'tool dispatch failed';
}

/** @param {any} input */
export async function runRankedToolWithFailover({
  action,
  payload = {},
  candidates = [],
  selectedTool = null,
  dispatchFn,
  timeoutMs = 30_000,
  timeoutMsForCandidate = null,
  env = process.env,
  validateResult = defaultValidateResult,
  onAttempt = null,
} = {}) {
  if (typeof action !== 'string' || action.trim().length === 0) {
    throw new TypeError('runRankedToolWithFailover: action required');
  }
  if (typeof dispatchFn !== 'function') {
    throw new TypeError('runRankedToolWithFailover: dispatchFn required');
  }

  const normalizedCandidates = normalizeCandidateList({ action, candidates, selectedTool, env });
  const attemptHistory = [];

  for (const [index, candidate] of normalizedCandidates.entries()) {
    const selectedAttempt = attemptSnapshot(candidate, index, { state: 'selected' });
    attemptHistory.push(selectedAttempt);
    onAttempt?.(selectedAttempt);

    if (candidate.dispatchState !== DISPATCH_STATES.CALLABLE) {
      const unavailable = attemptSnapshot(candidate, index, {
        state: 'unavailable',
        reason: candidate.dispatchReason ?? 'candidate is not callable',
      });
      attemptHistory.push(unavailable);
      onAttempt?.(unavailable);
      continue;
    }

    if (!supportsAction(candidate, action)) {
      const unavailable = attemptSnapshot(candidate, index, {
        state: 'unavailable',
        reason: `Adapter "${candidate.memberId}" does not support action "${action}".`,
      });
      attemptHistory.push(unavailable);
      onAttempt?.(unavailable);
      continue;
    }

    const candidateTimeoutMs = typeof timeoutMsForCandidate === 'function'
      ? timeoutMsForCandidate(candidate, index, { defaultTimeoutMs: timeoutMs })
      : timeoutMs;
    const boundedCandidateTimeoutMs = Number.isFinite(candidateTimeoutMs) && candidateTimeoutMs > 0
      ? candidateTimeoutMs
      : timeoutMs;
    const result = await invokeWithTimeout({
      action,
      payload,
      dispatchFn,
      candidate,
      timeoutMs: boundedCandidateTimeoutMs,
    });
    if (!result || result.ok !== true || result.deferred === true || result.timeout === true) {
      const failed = attemptSnapshot(candidate, index, {
        state: resultFailureState(result),
        reason: resultFailureReason(result),
        result: redactSecrets(result ?? {}, env),
      });
      attemptHistory.push(failed);
      onAttempt?.(failed);
      continue;
    }

    try {
      validateResult(result, candidate);
    } catch (error) {
      const failed = attemptSnapshot(candidate, index, {
        state: 'failed',
        reason: error?.message ?? String(error),
        result: redactSecrets(result, env),
      });
      attemptHistory.push(failed);
      onAttempt?.(failed);
      continue;
    }

    const succeeded = attemptSnapshot(candidate, index, {
      state: 'succeeded',
      result: redactSecrets(result, env),
    });
    attemptHistory.push(succeeded);
    onAttempt?.(succeeded);
    return Object.freeze({
      ok: true,
      action,
      candidate: Object.freeze(candidate),
      memberId: candidate.memberId,
      result: redactSecrets(result, env),
      attemptHistory: Object.freeze([...attemptHistory]),
      candidates: normalizedCandidates,
    });
  }

  const final = Object.freeze({
    state: 'final_failed',
    action,
    exhaustionKind: attemptHistory.some(attempt => (
      attempt.executionMode === 'credential_free_public_fetch'
      && ['failed', 'timeout'].includes(attempt.state)
    )) ? 'internet_source_exhausted' : 'provider_exhausted',
    reason: normalizedCandidates.length > 0
      ? 'All policy-allowed ranked candidates exhausted without a successful dispatch.'
      : 'No policy-allowed ranked candidates were available for dispatch.',
  });
  attemptHistory.push(final);
  onAttempt?.(final);
  throw new RankedToolFailoverError(
    `P2 live execution STOP: ${action} exhausted ranked tool candidates`,
    {
      action,
      exhaustionKind: final.exhaustionKind,
      attemptHistory: Object.freeze([...attemptHistory]),
      candidates: normalizedCandidates,
    },
  );
}

export function attachAttemptHistory(toolSelection, failover = null) {
  if (!toolSelection || !failover) return toolSelection;
  const attemptsByKey = new Map();
  for (const attempt of failover.attemptHistory ?? []) {
    if (!attempt.memberId && !attempt.tool) continue;
    attemptsByKey.set(`${attempt.memberId ?? 'no-member'}::${attempt.tool}`, attempt);
  }
  const candidates = (failover.candidates ?? toolSelection.candidates ?? []).map(candidate => {
    const attempt = attemptsByKey.get(candidateKey(candidate));
    return Object.freeze({
      ...candidate,
      lastAttemptState: attempt?.state ?? null,
      lastAttemptReason: attempt?.reason ?? null,
    });
  });

  return Object.freeze({
    ...toolSelection,
    candidates: Object.freeze(candidates),
    attemptHistory: Object.freeze([...(failover.attemptHistory ?? [])]),
    selectedDispatchMemberId: failover.memberId ?? null,
    selectedDispatchTool: failover.candidate ? candidateLabel(failover.candidate) : null,
  });
}
