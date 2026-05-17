/**
 * MessageSchema — Agent-to-agent message contract for FlowAI
 * ---------------------------------------------------------------------------
 * Authored by: W2 (Backend Super Agents)
 * Status:      RATIFIED by W0
 * Owner:       /src/lib/agents/MessageSchema.js
 * Consumers:   BaseAgent, every Super Agent, W3 audit tooling
 * ---------------------------------------------------------------------------
 */

'use strict';

const ENVELOPE_VERSION = '1.0.0';

const VALID_PRODUCT_SCOPES = new Set([
  'flowai', 'saige', 'reltwin', 'reachsms', 'pressai', 'mypreglife',
  // System-only scope reserved for the FlowAI self-adversarial test
  // suite (docs/specs/FLOWAI_SELF_ADVERSARIAL_TEST_PLAN.md §11.8).
  // Mirrors the BaseAgent PRODUCT_SCOPES.TEST entry. Test rows are
  // cleaned up between runs by scripts/cleanup-test-tenant.mjs.
  '_test',
]);

const TOPICS = Object.freeze({
  // --- Agent #1 Lifecycle Engine ---
  '1.product.lifecycle_event.v1':       'Lifecycle stage transition for a product',
  '1.product.gate_request.v1':          'Lifecycle requesting gate evaluation',

  // --- Agent #2 Code Builder ---
  '2.build.completed.v1':               'A build artifact is ready',
  '2.build.failed.v1':                  'Build failed; payload includes diagnostics',

  // --- Agent #3 Self-Renewal ---
  '3.renewal.candidate.v1':             'Self-renewal proposes an update',
  '3.renewal.applied.v1':               'Renewal applied to a product surface',
  '3.renewal.initiated.v1':             'Renewal job started (sync endpoint or Inngest async)',
  '3.renewal.completed.v1':             'Renewal job finished — terminal success envelope',
  '3.renewal.failed.v1':                'Renewal job finished — terminal failure envelope',
  '3.renewal.status.v1':                'Renewal job in-flight progress (phase, percent, hint)',

  // --- Agent #4 Provider Onboarding (FlowAI-only) ---
  '4.provider.onboarded.v1':            'New solution provider activated',
  '4.provider.suspended.v1':            'Provider suspended (manual or auto)',

  // --- Agent #5 End-Customer Intake (FlowAI-only) ---
  '5.endcustomer.intake.completed.v1':  'Sub-org provisioned for a provider',

  // --- Agent #6 Research ---
  '6.research.brief.v1':                'Research output ready for downstream agents',

  // --- Agent #7 Design ---
  '7.design.spec.v1':                   'Design spec ready for build',

  // --- Agent #8 Quality Audit (FlowAI-only) ---
  '8.audit.requested.v1':               'Audit run requested for a target',
  '8.audit.completed.v1':               'Audit results posted; scores included',

  // --- Agent #9 Go-To-Market ---
  '9.gtm.asset.v1':                     'GTM asset ready (drafts only)',

  // --- Agent #10 Monitor ---
  '10.metric.v1':                       'Metric sample from a monitored surface',
  '10.health.v1':                       'Aggregated health snapshot',
  '10.anomaly.v1':                      'Anomaly detected',

  // --- Agent #11 Strategic Intelligence (FlowAI-only) ---
  '11.brief.weekly.v1':                 'Weekly strategic brief to W0',
  '11.alert.material.v1':               'Material event alert',
  '11.trajectory.report.v1':            '$5B trajectory report',

  // --- Agent #12 Portfolio Risk & Fire Detection (FlowAI-only) ---
  '12.fire.p0.v1':                      'P0 — immediate response required',
  '12.fire.p1.v1':                      'P1 — alert within minutes',
  '12.fire.p2.v1':                      'P2 — weekly slow-burn pattern',
  '12.health.daily.v1':                 'Daily portfolio health dashboard',

  // --- Agent #13 Self-Protection ---
  '13.threat.detected.v1':              'Threat signature matched',
  '13.signature.update.v1':             'New threat signature broadcast',
  '13.dmca.filed.v1':                   'DMCA takedown filed',

  // --- Agent #14 Public Policy (FlowAI-only) ---
  '14.regulation.new.v1':               'New regulation in user-selected jurisdiction',
  '14.regulation.update.v1':            'Existing regulation updated',
  '14.compliance.brief.weekly.v1':      'Weekly regulatory brief',

  // --- Agent #15 Benchmarking & Competition ---
  '15.benchmark.report.v1':             'Benchmark vs peer set',

  // --- Agent #16 Productivity & HR (FlowAI-only) ---
  '16.productivity.report.v1':          'Productivity report for VEU and providers',

  // --- Agent #17 Product Evolution ---
  '17.evolution.proposal.v1':           'Proposed product evolution step',

  // --- Agent #18 Business Planning & Performance (FlowAI-only) ---
  '18.plan.update.v1':                  'Business plan or performance update',

  // --- Agent #19 Technological Evolution ---
  '19.tech.signal.v1':                  'Technology signal worth tracking',

  // --- Agent #20 Environmental Impacts ---
  '20.impact.assessment.v1':            'Environmental impact assessment',

  // --- Portfolio-level (cross-agent rollups) ---
  'portfolio.fire.v1':                  'Portfolio-level fire rollup (from #12)',
  'portfolio.health.v1':                'Portfolio-level health rollup',

  // --- System (runner / governance internals) ---
  'system.governance.score.v1':         'Governance score posted for a target',
  'system.readiness.score.v1':          'Readiness score posted for a target',
  'system.clearance.decision.v1':       'Product Clearance Protocol decision',
});

const PAYLOAD_VALIDATORS = Object.freeze({
  '10.metric.v1': (p) => {
    _required(p, ['surface', 'metric', 'value', 'unit']);
    if (typeof p.value !== 'number' || !Number.isFinite(p.value)) {
      throw new Error('10.metric.v1: value must be finite number');
    }
  },
  '10.anomaly.v1': (p) => {
    _required(p, ['surface', 'metric', 'observed', 'expected', 'severity']);
    if (!['low', 'medium', 'high'].includes(p.severity)) {
      throw new Error('10.anomaly.v1: severity must be low|medium|high');
    }
  },
  '12.fire.p0.v1': (p) => {
    _required(p, ['title', 'affectedSurfaces', 'detectedAt', 'evidence']);
    if (!Array.isArray(p.affectedSurfaces) || p.affectedSurfaces.length === 0) {
      throw new Error('12.fire.p0.v1: affectedSurfaces must be non-empty array');
    }
  },
  '12.fire.p1.v1': (p) => _required(p, ['title', 'affectedSurfaces', 'detectedAt', 'evidence']),
  '12.fire.p2.v1': (p) => _required(p, ['title', 'pattern', 'window']),
  '13.threat.detected.v1': (p) => _required(p, ['signatureId', 'surface', 'evidence']),
  '13.signature.update.v1': (p) => _required(p, ['signatureId', 'pattern', 'severity']),
  '14.regulation.new.v1': (p) => _required(p, ['jurisdiction', 'citation', 'summary', 'effectiveDate']),
  'system.governance.score.v1': (p) => {
    _required(p, ['targetType', 'targetId', 'score', 'rubricVersion']);
    _scoreRange(p.score, 'system.governance.score.v1');
  },
  'system.readiness.score.v1': (p) => {
    _required(p, ['targetType', 'targetId', 'score', 'rubricVersion']);
    _scoreRange(p.score, 'system.readiness.score.v1');
  },
  'system.clearance.decision.v1': (p) => {
    _required(p, ['targetType', 'targetId', 'governanceScore', 'readinessScore', 'decision']);
    if (!['CLEAR', 'DO_NOT_ACCEPT'].includes(p.decision)) {
      throw new Error('system.clearance.decision.v1: decision must be CLEAR or DO_NOT_ACCEPT');
    }
  },
});

function _required(payload, fields) {
  if (!payload || typeof payload !== 'object') throw new Error('payload must be object');
  for (const f of fields) {
    if (payload[f] === undefined || payload[f] === null) {
      throw new Error(`payload missing required field "${f}"`);
    }
  }
}

function _scoreRange(score, topic) {
  if (typeof score !== 'number' || score < 0 || score > 100) {
    throw new Error(`${topic}: score must be number in [0,100], got ${score}`);
  }
}

function validateEnvelope(env) {
  if (!env || typeof env !== 'object') throw new Error('envelope must be object');
  _required(env, ['messageId', 'topic', 'payload', 'from', 'traceId', 'at', 'schemaVersion']);
  if (env.schemaVersion !== ENVELOPE_VERSION) {
    throw new Error(`envelope.schemaVersion must be ${ENVELOPE_VERSION}, got ${env.schemaVersion}`);
  }
  if (!TOPICS[env.topic]) {
    throw new Error(`unknown topic "${env.topic}" — add it to MessageSchema.TOPICS first`);
  }
  if (!env.from || typeof env.from !== 'object') throw new Error('envelope.from must be object');
  _required(env.from, ['agentId', 'productScope']);
  if (!Number.isInteger(env.from.agentId) || env.from.agentId < 1 || env.from.agentId > 25) {
    if (env.from.agentId !== 'system' && env.from.agentId !== 'portfolio') {
      throw new Error(`envelope.from.agentId invalid: ${env.from.agentId}`);
    }
  }
  if (!VALID_PRODUCT_SCOPES.has(env.from.productScope)) {
    throw new Error(`envelope.from.productScope invalid: ${env.from.productScope}`);
  }
  if (typeof env.at !== 'number' || !Number.isFinite(env.at)) {
    throw new Error('envelope.at must be a finite Unix ms timestamp');
  }
  const validator = PAYLOAD_VALIDATORS[env.topic];
  if (validator) validator(env.payload);
  return true;
}

function makeEnvelope({ topic, payload, from, runId = null, traceId, at }) {
  const env = {
    messageId: `msg_${at}_${Math.random().toString(36).slice(2, 12)}`,
    topic,
    payload,
    from,
    runId,
    traceId: traceId ?? `trace_${at}_${Math.random().toString(36).slice(2, 10)}`,
    at,
    schemaVersion: ENVELOPE_VERSION,
  };
  validateEnvelope(env);
  return Object.freeze(env);
}

export {
  ENVELOPE_VERSION,
  TOPICS,
  PAYLOAD_VALIDATORS,
  validateEnvelope,
  makeEnvelope,
};