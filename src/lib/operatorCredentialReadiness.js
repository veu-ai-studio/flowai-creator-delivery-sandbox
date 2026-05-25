export const OPERATOR_READINESS_CREDENTIALS = Object.freeze([
  'GITHUB_OPERATOR_TOKEN',
  'VERCEL_OPERATOR_TOKEN',
  'VERCEL_ORG_ID',
  'VERCEL_PROJECT_ID_SAIGE',
  'ANTHROPIC_API_KEY',
  'BROWSERLESS_API_KEY',
  'SUPABASE_URL',
]);

export function credentialStatus(value) {
  return typeof value === 'string' && value.trim().length > 0 ? 'PRESENT' : 'MISSING';
}

export function getOperatorCredentialReadiness(env = process.env) {
  const credentials = {};
  let present = 0;

  for (const name of OPERATOR_READINESS_CREDENTIALS) {
    const status = credentialStatus(env?.[name]);
    credentials[name] = status;
    if (status === 'PRESENT') present += 1;
  }

  return Object.freeze({
    ok: present === OPERATOR_READINESS_CREDENTIALS.length,
    checkedAt: new Date().toISOString(),
    credentials,
    summary: Object.freeze({
      total: OPERATOR_READINESS_CREDENTIALS.length,
      present,
      missing: OPERATOR_READINESS_CREDENTIALS.length - present,
    }),
  });
}

export function buildOperatorCredentialReadinessGovernanceEntry({
  runId,
  productId,
  mode,
  environment,
  env = process.env,
} = {}) {
  const readiness = getOperatorCredentialReadiness(env);
  return Object.freeze({
    kind: 'operator.credential_readiness.v1',
    runId: runId ?? null,
    productId: productId ?? null,
    mode: mode ?? null,
    environment: environment ?? null,
    ok: readiness.ok,
    credentials: readiness.credentials,
    summary: readiness.summary,
    at: readiness.checkedAt,
  });
}
