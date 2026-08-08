import { getMember, dispatch as orchestraDispatch } from '../orchestra/index.js';
import { MODES } from './ToolIntelligenceService.js';

export const DISPATCH_STATES = Object.freeze({
  CALLABLE: 'callable',
  MISSING_CREDENTIALS: 'missing_credentials',
  UNAVAILABLE: 'unavailable',
  STUB_UNAVAILABLE: 'stub_unavailable',
  PENDING_OPERATOR_GATE: 'pending_operator_gate',
  MUTATION_DEFERRED: 'mutation_deferred_until_P13C',
  BLOCKED: 'blocked',
});

export const APPROVAL_STATES = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  BLOCKED: 'blocked',
  EXPIRED: 'expired',
});

const MUTATING_ACTIONS = new Set([
  'code-patch',
  'deploy',
  'apply-fix',
  'repo-write',
  'create-pr',
  'generate-from-scratch',
]);

const READ_ONLY_ACTIONS = new Set([
  'analyze',
  'design',
  'score',
  'crawl',
  'screenshot',
  'interact',
  'source-retrieval',
]);

const TOOL_MEMBER_ALIASES = Object.freeze({
  'codex': 'codex',
  'openai codex': 'codex',
  'anthropic claude': 'claude-code',
  'claude code': 'claude-code',
  'claude-code': 'claude-code',
  'flowai': 'claude-code',
  'vercel': 'vercel',
  'browserless': 'browserless',
  'playwright': 'playwright',
  'base44': 'base44',
  'lovable': 'lovable',
  'v0': 'v0',
  'v0 by vercel': 'v0',
  'cursor': 'cursor',
  'replit': 'replit',
  'openrouter': 'openrouter',
  'perplexity ai': 'perplexity',
  'perplexity': 'perplexity',
});

const CREDENTIAL_REQUIREMENTS = Object.freeze({
  codex: ['OPENAI_API_KEY'],
  'claude-code': ['ANTHROPIC_API_KEY'],
  vercel: ['VERCEL_OPERATOR_TOKEN', 'VERCEL_TOKEN'],
  browserless: ['BROWSERLESS_API_KEY'],
  playwright: ['BROWSERLESS_API_KEY'],
  perplexity: ['OPENROUTER_API_KEY'],
});

const GUIDED_CREDENTIAL_SETUP = Object.freeze({
  browserless: Object.freeze({
    provider: 'Browserless',
    consoleUrl: 'https://www.browserless.io/account',
    steps: Object.freeze([
      'Sign in to the Browserless account scoped to FlowAI staging.',
      'In the API Key section, click Copy next to the staging token.',
      'Run the approved FlowAI DPAPI capture command for BROWSERLESS_API_KEY, then resume the recorded run checkpoint.',
    ]),
    secretName: 'BROWSERLESS_API_KEY',
    scope: 'FlowAI staging Research browser rendering only',
    dpapiCapturePath: '%LOCALAPPDATA%\\FlowAI\\credentials\\staging\\browserless\\flowai\\browserless-api-key.dpapi.json',
    resumeCheckpoint: 'research.structured_crawl',
  }),
  playwright: Object.freeze({
    provider: 'Browserless',
    consoleUrl: 'https://www.browserless.io/account',
    steps: Object.freeze([
      'Sign in to the Browserless account scoped to FlowAI staging.',
      'In the API Key section, click Copy next to the staging token.',
      'Run the approved FlowAI DPAPI capture command for BROWSERLESS_API_KEY, then resume the recorded run checkpoint.',
    ]),
    secretName: 'BROWSERLESS_API_KEY',
    scope: 'FlowAI staging Playwright-compatible rich capture only',
    dpapiCapturePath: '%LOCALAPPDATA%\\FlowAI\\credentials\\staging\\browserless\\flowai\\browserless-api-key.dpapi.json',
    resumeCheckpoint: 'research.structured_crawl',
  }),
  perplexity: Object.freeze({
    provider: 'OpenRouter (Perplexity adapter)',
    consoleUrl: 'https://openrouter.ai/settings/keys',
    steps: Object.freeze([
      'Sign in to the OpenRouter account scoped to FlowAI staging.',
      'Create or select the least-privilege staging key and click Copy.',
      'Run the approved FlowAI DPAPI capture command for OPENROUTER_API_KEY, then resume the recorded run checkpoint.',
    ]),
    secretName: 'OPENROUTER_API_KEY',
    scope: 'FlowAI staging Research recovery only',
    dpapiCapturePath: '%LOCALAPPDATA%\\FlowAI\\credentials\\staging\\openrouter\\flowai\\openrouter-api-key.dpapi.json',
    resumeCheckpoint: 'research.structured_crawl',
  }),
});

const SECRET_KEY_PATTERN = /(TOKEN|KEY|SECRET|PASSWORD|CREDENTIAL)/i;
const DEFAULT_TIMEOUT_MS = 30_000;

let approvalCounter = 0;

function nowIso(clock = Date) {
  const value = typeof clock.now === 'function' ? clock.now() : Date.now();
  return new Date(value).toISOString();
}

function approvalId(clock = Date) {
  approvalCounter += 1;
  const stamp = typeof clock.now === 'function' ? clock.now() : Date.now();
  return `approval-${stamp.toString(36)}-${approvalCounter.toString(36)}`;
}

function normalizeName(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeDispatchMode(mode) {
  const normalized = String(mode ?? MODES.MANUAL).trim().toUpperCase();
  if (normalized === 'AUTO') return MODES.AUTOMATIC;
  if (normalized === 'AUTOMATIC') return MODES.AUTOMATIC;
  if (normalized === MODES.GUIDED) return MODES.GUIDED;
  if (normalized === MODES.MANUAL) return MODES.MANUAL;
  return MODES.MANUAL;
}

export function isMutatingAction(action) {
  if (MUTATING_ACTIONS.has(action)) return true;
  if (READ_ONLY_ACTIONS.has(action)) return false;
  return true;
}

export function resolveMemberId(toolOrId) {
  if (toolOrId == null) return null;
  if (typeof toolOrId === 'string') {
    const direct = getMember(toolOrId);
    if (direct) return toolOrId;
    return TOOL_MEMBER_ALIASES[normalizeName(toolOrId)] ?? null;
  }
  const candidates = [
    toolOrId?.memberId,
    toolOrId?.member,
    toolOrId?.platform_name,
    toolOrId?.toolName,
    toolOrId?.name,
  ];
  for (const candidate of candidates) {
    if (candidate == null || candidate === toolOrId) continue;
    const id = resolveMemberId(candidate);
    if (id) return id;
  }
  return null;
}

/** @returns {Readonly<Record<string, string>>} */
export function credentialStatusesForMember(memberId, env = process.env) {
  const names = CREDENTIAL_REQUIREMENTS[memberId] ?? [];
  if (names.length === 0) return Object.freeze({});
  return Object.freeze(Object.fromEntries(names.map(name => [
    name,
    typeof env?.[name] === 'string' && env[name].trim().length > 0 ? 'PRESENT' : 'MISSING',
  ])));
}

function supportsCredentialFreePublicCrawl(memberId, action) {
  return memberId === 'browserless' && action === 'crawl';
}

export function hasRequiredCredential(memberId, env = process.env, action = null) {
  if (supportsCredentialFreePublicCrawl(memberId, action)) return true;
  const names = CREDENTIAL_REQUIREMENTS[memberId] ?? [];
  if (names.length === 0) return true;
  if (memberId === 'vercel') {
    return names.some(name => typeof env?.[name] === 'string' && env[name].trim().length > 0);
  }
  return names.every(name => typeof env?.[name] === 'string' && env[name].trim().length > 0);
}

export function redactSecrets(value, env = process.env) {
  const secrets = Object.entries(env ?? {})
    .filter(([key, secret]) => SECRET_KEY_PATTERN.test(key) && typeof secret === 'string' && secret.length > 0)
    .map(([, secret]) => secret);

  function redactString(text) {
    return secrets.reduce((acc, secret) => acc.split(secret).join('[REDACTED]'), text);
  }

  function walk(item) {
    if (typeof item === 'string') return redactString(item);
    if (Array.isArray(item)) return item.map(walk);
    if (item && typeof item === 'object') {
      return Object.fromEntries(Object.entries(item).map(([key, entry]) => [
        key,
        SECRET_KEY_PATTERN.test(key) ? credentialStatus(entry) : walk(entry),
      ]));
    }
    return item;
  }

  return walk(value);
}

function credentialStatus(value) {
  return typeof value === 'string' && value.trim().length > 0 ? 'PRESENT' : value;
}

/** @param {any} candidate @param {any} opts */
export function normalizeToolCandidate(candidate, opts = {}) {
  const memberId = resolveMemberId(candidate);
  const member = memberId ? getMember(memberId) : null;
  const credentialStatusByName = credentialStatusesForMember(memberId, opts.env);
  /** @type {string} */
  let state = DISPATCH_STATES.UNAVAILABLE;
  let reason = 'Tool is not an admitted Orchestra member for P13-A.';

  if (member && member.wired === false) {
    state = DISPATCH_STATES.STUB_UNAVAILABLE;
    reason = 'Tool is ranked but adapter is stubbed and non-executable.';
  } else if (member && !hasRequiredCredential(memberId, opts.env, opts.action)) {
    state = DISPATCH_STATES.MISSING_CREDENTIALS;
    reason = 'Required server-side credential is missing.';
  } else if (member && member.wired === true) {
    state = DISPATCH_STATES.CALLABLE;
    reason = supportsCredentialFreePublicCrawl(memberId, opts.action)
      && credentialStatusByName.BROWSERLESS_API_KEY === 'MISSING'
      ? 'Adapter is wired for credential-free public URL retrieval; rendered-browser features remain unavailable.'
      : 'Adapter is wired and required server-side credentials are present or not required.';
  }

  const missingCredential = Object.values(credentialStatusByName).includes('MISSING');
  const publicSourceMode = supportsCredentialFreePublicCrawl(memberId, opts.action)
    && credentialStatusByName.BROWSERLESS_API_KEY === 'MISSING';
  const selectionScores = Object.freeze({
    taskFit: memberId === 'browserless' ? 10 : memberId === 'playwright' ? 9 : memberId === 'perplexity' ? 7 : 5,
    evidenceQuality: publicSourceMode ? 6 : memberId === 'perplexity' ? 8 : 10,
    availability: state === DISPATCH_STATES.CALLABLE ? 10 : 0,
    privacy: publicSourceMode ? 10 : 7,
    cost: publicSourceMode ? 10 : 6,
    latency: publicSourceMode ? 9 : 6,
    credentialReadiness: missingCredential ? 0 : 10,
  });
  const selectionScore = Number((Object.values(selectionScores)
    .reduce((sum, value) => sum + value, 0) / Object.keys(selectionScores).length).toFixed(2));

  return Object.freeze({
    ...candidate,
    memberId,
    dispatchState: state,
    dispatchCallable: state === DISPATCH_STATES.CALLABLE,
    credentialStatus: credentialStatusByName,
    dispatchReason: reason,
    executionMode: publicSourceMode ? 'credential_free_public_fetch' : 'provider_adapter',
    selectionFactors: Object.freeze({
      taskFit: candidate?.taskFit ?? (opts.action === 'crawl' ? 'crawl' : 'registered_capability'),
      evidenceQuality: candidate?.evidenceQuality ?? (publicSourceMode ? 'public_html' : 'provider_enriched'),
      availability: state === DISPATCH_STATES.CALLABLE ? 'available' : state,
      privacy: candidate?.privacy ?? (publicSourceMode ? 'direct_public_url_only' : 'provider_bound'),
      cost: candidate?.cost ?? (publicSourceMode ? 'no_provider_charge' : 'provider_metered_or_configured'),
      latency: candidate?.latency ?? (publicSourceMode ? 'single_http_fetch' : 'provider_runtime'),
      credentialReadiness: missingCredential ? 'missing' : 'ready',
    }),
    selectionScores,
    selectionScore,
    guidedSetup: missingCredential ? (GUIDED_CREDENTIAL_SETUP[memberId] ?? null) : null,
  });
}

/** @param {any} candidates @param {any} opts */
export function normalizeDispatchCandidates(candidates = [], opts = {}) {
  const list = Array.isArray(candidates) ? candidates : (candidates ? [candidates] : []);
  return Object.freeze(list.map(candidate => normalizeToolCandidate(candidate, opts)));
}

/** @param {any} input */
function selectedCandidate({ selectedTool, memberId, candidates, env }) {
  if (selectedTool) return normalizeToolCandidate(selectedTool, { env });
  if (memberId) return normalizeToolCandidate({ memberId, platform_name: memberId }, { env });
  const normalized = normalizeDispatchCandidates(candidates, { env });
  return normalized.find(candidate => candidate.dispatchCallable) ?? normalized[0] ?? null;
}

export function createMemoryApprovalStore(clock = Date) {
  const rows = new Map();
  return Object.freeze({
    async create(record) {
      const id = record.id ?? approvalId(clock);
      const row = Object.freeze({ ...record, id, createdAt: record.createdAt ?? nowIso(clock) });
      rows.set(id, row);
      return row;
    },
    async get(id) {
      return rows.get(id) ?? null;
    },
    async update(id, patch) {
      const current = rows.get(id);
      if (!current) return null;
      const row = Object.freeze({ ...current, ...patch, updatedAt: nowIso(clock) });
      rows.set(id, row);
      return row;
    },
    clear() {
      rows.clear();
    },
    entries() {
      return [...rows.values()];
    },
  });
}

export const defaultApprovalStore = createMemoryApprovalStore();

/** @param {any} input */
export async function createPendingApproval({
  store = defaultApprovalStore,
  operatorId = null,
  mode,
  selectedTool,
  action,
  productId = null,
  runId = null,
  sessionId = null,
  env = process.env,
  clock = Date,
} = {}) {
  const tool = normalizeToolCandidate(selectedTool, { env });
  return store.create({
    operatorId,
    mode: normalizeDispatchMode(mode),
    selectedTool: tool?.platform_name ?? tool?.memberId ?? null,
    memberId: tool?.memberId ?? null,
    action,
    actionClass: isMutatingAction(action) ? 'mutating' : 'non_mutating',
    status: APPROVAL_STATES.PENDING,
    credentialStatus: tool?.credentialStatus ?? {},
    productId,
    runId,
    sessionId,
    createdAt: nowIso(clock),
  });
}

/** @param {any} input */
export async function approvePendingAction({ store = defaultApprovalStore, approvalId: id, operatorId = null } = {}) {
  const current = await store.get(id);
  if (!current) return null;
  return store.update(id, {
    status: APPROVAL_STATES.APPROVED,
    approvedBy: operatorId,
    approvedAt: nowIso(),
  });
}

/** @param {any} input */
export async function resolveDispatchEligibility({
  mode = MODES.MANUAL,
  action,
  selectedTool = null,
  memberId = null,
  candidates = [],
  approvalId: id = null,
  operatorEnabledAuto = false,
  approvalStore = defaultApprovalStore,
  env = process.env,
} = {}) {
  const effectiveMode = normalizeDispatchMode(mode);
  const mutating = isMutatingAction(action);
  const normalizedCandidates = normalizeDispatchCandidates(candidates, { env });
  const selected = selectedCandidate({ selectedTool, memberId, candidates: normalizedCandidates, env });
  const base = {
    mode: effectiveMode,
    action,
    actionClass: mutating ? 'mutating' : 'non_mutating',
    selectedTool: selected,
    candidates: normalizedCandidates,
    credentialStatus: selected?.credentialStatus ?? {},
    approvalId: id,
  };

  if (!action) {
    return Object.freeze({ ...base, state: DISPATCH_STATES.BLOCKED, callable: false, reason: 'action required' });
  }
  if (!selected) {
    return Object.freeze({ ...base, state: DISPATCH_STATES.UNAVAILABLE, callable: false, reason: 'No selected tool or ranked candidate available.' });
  }
  if (selected.dispatchState !== DISPATCH_STATES.CALLABLE) {
    return Object.freeze({ ...base, state: selected.dispatchState, callable: false, reason: selected.dispatchReason });
  }
  if (mutating) {
    return Object.freeze({
      ...base,
      state: effectiveMode === MODES.AUTOMATIC ? DISPATCH_STATES.MUTATION_DEFERRED : DISPATCH_STATES.PENDING_OPERATOR_GATE,
      callable: false,
      reason: 'P13-A is read-only at runtime; mutating actions are deferred to P13-C.',
    });
  }
  if (effectiveMode === MODES.AUTOMATIC && operatorEnabledAuto !== true) {
    return Object.freeze({ ...base, state: DISPATCH_STATES.PENDING_OPERATOR_GATE, callable: false, reason: 'AUTO requires explicit operator enablement.' });
  }
  if (effectiveMode === MODES.GUIDED) {
    const approval = id ? await approvalStore.get(id) : null;
    if (!approval || approval.status !== APPROVAL_STATES.APPROVED) {
      return Object.freeze({ ...base, state: DISPATCH_STATES.PENDING_OPERATOR_GATE, callable: false, reason: 'GUIDED requires durable server-side approval before dispatch.' });
    }
  }

  return Object.freeze({ ...base, state: DISPATCH_STATES.CALLABLE, callable: true, reason: 'Dispatch eligible.' });
}

/** @param {any} input */
export async function dispatchToolAction({
  action,
  payload = {},
  timeoutMs = DEFAULT_TIMEOUT_MS,
  dispatchFn = orchestraDispatch,
  env = process.env,
  ...eligibilityInput
} = {}) {
  const eligibility = await resolveDispatchEligibility({ ...eligibilityInput, action, env });
  if (!eligibility.callable) {
    return Object.freeze({ ok: false, dispatched: false, eligibility: redactSecrets(eligibility, env) });
  }

  const memberId = eligibility.selectedTool?.memberId;
  const invoke = dispatchFn(action, payload, { memberId });
  const timeout = new Promise((resolve) => {
    setTimeout(() => resolve({
      ok: false,
      action,
      member: memberId,
      error: `tool dispatch timed out after ${timeoutMs}ms`,
      timeout: true,
    }), timeoutMs);
  });
  const result = await Promise.race([invoke, timeout]);
  return Object.freeze({
    ok: result?.ok === true && result?.deferred !== true,
    dispatched: true,
    eligibility: redactSecrets(eligibility, env),
    result: redactSecrets(result, env),
  });
}

export const __test = Object.freeze({
  MUTATING_ACTIONS,
  READ_ONLY_ACTIONS,
  TOOL_MEMBER_ALIASES,
  CREDENTIAL_REQUIREMENTS,
});
