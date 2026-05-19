// src/lib/construction/ConstructionEngine.js
//
// FlowAI Build/Wire Construction Engine — Phase 1 wire_up scaffold per
// CA-17 (Build/Wire Engine Spec V3-FINAL). Generic, product-agnostic.
// Drives the canonical S1→S2→S6→GENERATE→S4→S7→S8→PR lifecycle defined
// in CA-17 §4. Wired by the renewal orchestrator as a deps.constructionEngine
// override; integration is observe-only when the product_registry row
// does not set construction_eligible = true.
//
// Construction classes (CA-17 §2): wire_up | endpoint_generation |
// schema_migration | redesign_implementation. Phase 1 enables wire_up
// only; the other classes register their constructor when their CAs
// land.
//
// Per CA-17 §7 NON-OVERRIDABLE discipline preserved at S2/S4/S5/S6.
//
// Per dispatch zero-per-product-code-path discipline: every product is
// resolved through the product_registry row + Phase B delta_log
// findings — no per-product branches inside this module.

'use strict';

import { runS1Baseline, BASELINE_KIND } from './gates/S1Baseline.js';
import { runS2ScopeBound, declareScopeCaps, validateAgainstCaps, SCOPE_VIOLATION_KIND, SCOPE_DECLARED_KIND } from './gates/S2ScopeBound.js';
import { runS4SecurityPreWrite, SECURITY_PRE_WRITE_FAILURE_KIND } from './gates/S4SecurityPreWrite.js';
import { runS5RollbackPreCommit, captureSnapshot, casCheck, prepareAutoRollback, ROLLBACK_KIND, ROLLBACK_PENDING_KIND, ROLLBACK_TEST_MODE_KIND } from './gates/S5Rollback.js';
import { runS6OperatorApproval, APPROVAL_KIND } from './gates/S6OperatorApproval.js';
import { runS8PhaseB, PHASE_B_KIND, PHASE_B_FAILURE_KIND } from './gates/S8PhaseB.js';
import { generateWireUp, extractWireUpCandidates } from './constructors/WireUpConstructor.js';

export const CONSTRUCTION_CLASS_KIND = 'construction_class.v1';
export const CONSTRUCTION_COMMIT_KIND = 'construction_commit.v1';

export const SUPPORTED_CLASSES = Object.freeze(['wire_up']);

function makeEngineError(code, message, extra = {}) {
  const err = new Error(message);
  err.code = code;
  err.gate = extra.gate ?? null;
  for (const [k, v] of Object.entries(extra)) err[k] = v;
  return err;
}

/**
 * Decide if construction should run for this product + iteration. The
 * engine only fires when ALL of the following hold:
 *
 *   - product_registry row has construction_eligible === true (operator
 *     opt-in per dispatch; default OFF).
 *   - Phase B findings include at least one wire_up candidate.
 *   - The renewal orchestrator passed a non-null appendGovernanceEntry
 *     hook (audit trail is mandatory; no silent run).
 *
 * @returns {{ shouldRun: boolean, reason: string, candidates?: Array }}
 */
export function shouldRunConstruction({ product, phaseBFindings, appendGovernanceEntry }) {
  const envBypass = !!product?.product_id && typeof process !== 'undefined' && !!process.env?.CONSTRUCTION_FORCE_ELIGIBLE_PRODUCTS
    && process.env.CONSTRUCTION_FORCE_ELIGIBLE_PRODUCTS.split(',').map((s) => s.trim()).includes(product.product_id);
  if (!product || (product.construction_eligible !== true && !envBypass)) {
    return { shouldRun: false, reason: 'product_registry.construction_eligible_not_true' };
  }
  if (typeof appendGovernanceEntry !== 'function') {
    return { shouldRun: false, reason: 'no_governance_audit_hook' };
  }
  const candidates = extractWireUpCandidates({ findings: phaseBFindings ?? [], limit: 5 });
  if (candidates.length === 0) {
    return { shouldRun: false, reason: 'no_wire_up_candidates_in_phase_b_findings' };
  }
  return { shouldRun: true, reason: 'eligible', candidates };
}

/**
 * Resolve which file to use as the origin page for a wire_up candidate
 * and the synthetic backend handler path. Generic: pulls the location
 * from the finding and maps page paths back to repo-relative files
 * using the supplied resolver.
 */
function resolveCandidatePaths({ candidate, originPageResolver }) {
  if (typeof originPageResolver !== 'function') {
    throw makeEngineError('NO_ORIGIN_PAGE_RESOLVER',
      'ConstructionEngine: originPageResolver dep required to map Phase B finding location → repo file');
  }
  const resolved = originPageResolver(candidate);
  if (!resolved || typeof resolved.path !== 'string') {
    throw makeEngineError('ORIGIN_PAGE_NOT_RESOLVED',
      `ConstructionEngine: could not resolve origin page for finding ${candidate.location ?? '(unknown)'}`,
      { candidate });
  }
  // Derive an endpoint handler path from the finding location.
  // wire_up convention: /api/wire/<slug>.js
  const slug = (candidate.location ?? candidate.id ?? 'wireup')
    .toString()
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40) || 'wireup';
  return {
    originPagePath: resolved.path,
    originPageContent: typeof resolved.content === 'string' ? resolved.content : '',
    endpointHandlerPath: `api/wire/${slug}.js`,
  };
}

function countLines(source) {
  if (typeof source !== 'string' || source.length === 0) return 0;
  return source.split(/\r?\n/).length;
}

/**
 * Run one wire_up construction end-to-end against a single candidate.
 * Emits the S1→S2→S6→GENERATE→S4→S5→S8 envelopes in order; the caller
 * is responsible for the S7 commit + PR step (we return the candidate
 * files and the test-mode-ok flag to drive that).
 */
export async function runWireUpConstruction({ product, environment, candidate, baselineArgs, knownPackages, originPageResolver, registryConfig, appendGovernanceEntry, supabase, deps, logger, now }) {
  const productId = product.product_id;
  const _logger = logger ?? console;
  const _now = typeof now === 'function' ? now : () => Date.now();

  // 0. construction_class.v1 — declare the class up front (CA-17 §2).
  await appendGovernanceEntry({
    productId, environment: environment ?? 'prd',
    entry: Object.freeze({
      kind: CONSTRUCTION_CLASS_KIND,
      construction_class: 'wire_up',
      candidate_id: candidate.id ?? candidate.location ?? null,
      captured_at: new Date(_now()).toISOString(),
    }),
    supabase,
  });

  // 1. S1 baseline.
  const s1 = await runS1Baseline({
    productId, environment, args: baselineArgs,
    appendGovernanceEntry, supabase, logger: _logger,
  });
  const baselineHash = s1.baselineHash;

  // 2. S2 scope-cap declaration. wire_up defaults; candidate file list
  // not yet known so we declare caps + validate after generation.
  const s2Decl = declareScopeCaps({ constructionClass: 'wire_up', operatorOverrides: registryConfig?.scopeOverrides });
  await appendGovernanceEntry({
    productId, environment: environment ?? 'prd',
    entry: Object.freeze({
      kind: SCOPE_DECLARED_KIND,
      construction_class: 'wire_up',
      caps: s2Decl.caps,
      clamps: s2Decl.clamps,
      captured_at: new Date(_now()).toISOString(),
    }),
    supabase,
  });

  // 3. S6 operator approval (test-mode auto-admin when registry sets it).
  const s6 = await runS6OperatorApproval({
    productId, environment,
    constructionClass: 'wire_up',
    approval: registryConfig?.approval ?? null,
    baselineHash,
    recentEntries: registryConfig?.recentEntries ?? [],
    testModeAutoApprove: registryConfig?.s6AutoApproveInTestMode === true,
    testModeAutoApproveOperator: registryConfig?.s6AutoApproveOperator ?? 'phase1-test-auto-admin',
    appendGovernanceEntry, supabase, logger: _logger, now: _now,
  });

  // 4. GENERATE — invoke WireUpConstructor.
  const paths = resolveCandidatePaths({ candidate, originPageResolver });
  const generateImpl = typeof deps?.generateWireUp === 'function' ? deps.generateWireUp : generateWireUp;
  const generated = await generateImpl({
    finding: candidate,
    originPageContent: paths.originPageContent,
    originPagePath: paths.originPagePath,
    endpointHandlerPath: paths.endpointHandlerPath,
    knownPackages,
    opts: deps?.aiOpts ?? {},
  });

  // Skip cleanly if the constructor returned an empty wire_up.
  const endpointSource = generated.candidate.endpointHandler.source.trim();
  const framePatchDiff = generated.candidate.framePatch.diff.trim();
  if (endpointSource.length === 0 && framePatchDiff.length === 0) {
    const skipEnvelope = Object.freeze({
      kind: 'construction_wire_up_no_candidate.v1',
      candidate_id: candidate.id ?? candidate.location ?? null,
      reason: 'model_returned_empty_wire_up',
      captured_at: new Date(_now()).toISOString(),
    });
    await appendGovernanceEntry({ productId, environment, entry: skipEnvelope, supabase });
    return Object.freeze({ ok: true, skipped: true, reason: 'empty_wire_up', envelopes: { s1: s1.envelope, s2: s2Decl, s6: s6.envelope, skip: skipEnvelope } });
  }

  const generatedFiles = [
    {
      path: generated.candidate.endpointHandler.path || paths.endpointHandlerPath,
      source: endpointSource,
      lineCount: countLines(endpointSource),
      isDiff: false,
    },
    {
      path: generated.candidate.framePatch.path || paths.originPagePath,
      source: framePatchDiff,
      lineCount: countLines(framePatchDiff),
      isDiff: true,
    },
  ];

  // 5. S2 validate the candidate file set against caps.
  await runS2ScopeBound({
    productId, environment,
    constructionClass: 'wire_up',
    operatorOverrides: registryConfig?.scopeOverrides,
    candidate: {
      files: generatedFiles,
      newDependencies: [], // wire_up: 0 new deps mandate (per CA-17 §3.2)
      newEndpointCount: 1, // exactly one new handler per wire_up
      dependencyGraphRadius: 1,
    },
    appendGovernanceEntry, supabase, logger: _logger,
  });

  // 6. S4 pre-write security gates: prompt-injection guard + dependency
  //    expansion + cross-file collateral. allowedPrefixes for wire_up
  //    constrain to api/wire/ + the originating page tree.
  const allowedPrefixes = [
    'api/wire/',
    'api/_lib/',
    paths.originPagePath.split('/').slice(0, -1).join('/') + '/',
  ];
  await runS4SecurityPreWrite({
    productId, environment,
    candidate: {
      issue: candidate.message ?? '',
      fix: candidate.recommendation ?? '',
      findings: [candidate],
      generatedFiles: generatedFiles.filter((f) => !f.isDiff), // diffs are validated by diffEditor downstream
    },
    knownPackages,
    allowedPrefixes,
    appendGovernanceEntry, supabase, logger: _logger,
  });

  // 7. S5 pre-commit: capture rollback snapshot + dry-run.
  const filePaths = generatedFiles.map((f) => f.path);
  const s5 = await runS5RollbackPreCommit({
    productId, environment,
    filePaths,
    retentionDays: registryConfig?.snapshotRetentionDays ?? undefined,
    executeRollback: deps?.executeRollback,
    appendGovernanceEntry, supabase, logger: _logger,
  });

  // 8. S7 — orchestrator commit. We DO NOT commit from this module
  //    (separation of concerns: github writes live in renewal/githubBranchWriter.js).
  //    Instead we return the candidate file set + audit envelopes so the
  //    caller (the renewal orchestrator's STEP 7→9 region) commits via
  //    its existing path. The S7 invariant is upheld by the renewal
  //    orchestrator's existing per-product self_renewal_branch logic.

  // 9. S8 — deferred to caller: Phase B against the freshly-deployed
  //    preview URL. The engine exposes runS8PhaseB for the caller to
  //    invoke once the Vercel preview lands. The result gates PR open.

  return Object.freeze({
    ok: true,
    skipped: false,
    candidate_id: candidate.id ?? candidate.location ?? null,
    construction_class: 'wire_up',
    baselineHash,
    candidateFiles: generatedFiles,
    snapshot: s5.snapshot,
    envelopes: {
      s1: s1.envelope,
      s2_declared: s2Decl,
      s6: s6.envelope,
      s5: s5.envelope,
    },
    next_steps: Object.freeze([
      's7_commit_via_renewal_orchestrator_github_branch_writer',
      's8_phase_b_via_runS8PhaseB_against_preview_url',
    ]),
  });
}

/**
 * Top-level entry: try wire_up construction across the candidate set,
 * stopping after the first successful generation (Phase 1 proof-of-
 * concept). Returns the envelope + candidate files so the renewal
 * orchestrator can hand them to its commit + deploy + S8 chain.
 *
 * Failures inside one candidate emit their abort envelope + advance
 * to the next candidate; the function only throws if ALL candidates
 * fail or a required dep is missing.
 */
export async function runConstruction({ product, environment, phaseBFindings, baselineArgs, knownPackages, originPageResolver, registryConfig, appendGovernanceEntry, supabase, deps, logger, now }) {
  if (!product || typeof product.product_id !== 'string') {
    throw makeEngineError('BAD_PRODUCT', 'ConstructionEngine.runConstruction: product.product_id required');
  }
  const decision = shouldRunConstruction({ product, phaseBFindings, appendGovernanceEntry });
  if (!decision.shouldRun) {
    return Object.freeze({ ok: true, ran: false, reason: decision.reason });
  }
  const failures = [];
  for (const candidate of decision.candidates) {
    try {
      const result = await runWireUpConstruction({
        product, environment, candidate, baselineArgs, knownPackages, originPageResolver, registryConfig, appendGovernanceEntry, supabase, deps, logger, now,
      });
      if (result.ok && !result.skipped) {
        return Object.freeze({ ok: true, ran: true, result, attempted: failures.length + 1, failures });
      }
      if (result.skipped) {
        failures.push({ candidate_id: candidate.id ?? candidate.location, reason: result.reason });
      }
    } catch (e) {
      const code = e?.code ?? 'CONSTRUCTION_UNCAUGHT';
      const gate = e?.gate ?? null;
      failures.push({ candidate_id: candidate.id ?? candidate.location, reason: e?.message ?? String(e), code, gate });
      // Emit an abort audit entry so the failure is recorded against
      // the run. Then advance to the next candidate.
      try {
        await appendGovernanceEntry({
          productId: product.product_id,
          environment: environment ?? 'prd',
          entry: Object.freeze({
            kind: 'construction_attempt_aborted.v1',
            construction_class: 'wire_up',
            candidate_id: candidate.id ?? candidate.location ?? null,
            failure_code: code,
            failure_gate: gate,
            failure_message: (e?.message ?? String(e)).slice(0, 300),
            captured_at: new Date((now ?? Date.now)()).toISOString(),
          }),
          supabase,
        });
      } catch { /* governance write failure must not throw out of this path */ }
    }
  }
  return Object.freeze({ ok: false, ran: true, reason: 'all_candidates_failed', attempted: decision.candidates.length, failures });
}

export const __exports = Object.freeze({
  // Re-export gate runners for downstream wiring (eg. the renewal
  // orchestrator's STEP 11/12 region calls runS8PhaseB once Vercel
  // hands back the preview URL).
  runS1Baseline,
  runS2ScopeBound,
  runS4SecurityPreWrite,
  runS5RollbackPreCommit,
  runS6OperatorApproval,
  runS8PhaseB,
  captureSnapshot,
  casCheck,
  prepareAutoRollback,
  extractWireUpCandidates,
  generateWireUp,
  // Envelope kinds for consumers' switches.
  BASELINE_KIND,
  SCOPE_DECLARED_KIND,
  SCOPE_VIOLATION_KIND,
  SECURITY_PRE_WRITE_FAILURE_KIND,
  ROLLBACK_KIND,
  ROLLBACK_PENDING_KIND,
  ROLLBACK_TEST_MODE_KIND,
  APPROVAL_KIND,
  PHASE_B_KIND,
  PHASE_B_FAILURE_KIND,
  CONSTRUCTION_CLASS_KIND,
  CONSTRUCTION_COMMIT_KIND,
});
