// src/lib/remediation/runRemediation.js — PHASE B2 STEP 6
//
// Top-level entry point that wires the classifier → budget → fetcher →
// patch generators → collision detector → governance into a single call.
// The renewal orchestrator invokes this AFTER the construction engine
// (which handles wire_up candidates) so the two remediation paths are
// complementary, not competing.
//
// Public:
//   runRemediation({
//     findings,                // normalized Phase B1 output
//     fetchFileForFinding,     // async ({ finding }) → { filePath, fileContent } | null
//     budgets?,                // optional override of DEFAULT_BUDGETS
//     onStep?,                 // SSE emitter (envelope shapes documented inline)
//   }) → {
//     ok, patches, summary, classifier, budget, collisions, ineligible, escalated
//   }
//
// Pure-ish — no Supabase / GitHub writes here. The caller pushes the
// produced patches into its commit pipeline + emits the
// remediation_summary envelope into governance_record.

'use strict';

import { classifyFindings, BUCKET } from './remediationClassifier.js';
import { applyBudget, DEFAULT_BUDGETS } from './remediationBudget.js';
import { detectAndResolveConflicts } from './patchConflictDetector.js';
import { getGenerator } from './patchGenerators/index.js';
import { lookupVerification } from './verificationRegistry.js';

function safeEmit(onStep, payload) {
  if (typeof onStep !== 'function') return;
  try { onStep(payload); } catch { /* swallow */ }
}

/**
 * Run a generator for one classified-eligible finding. Returns either a
 * patch object or null (generator declined / file unavailable / confidence
 * below floor). NEVER throws.
 */
async function attemptPatch({ finding, fetchFileForFinding }) {
  const generator = getGenerator(finding.remediationStrategy);
  if (typeof generator !== 'function') {
    return { ok: false, reason: 'no_generator_for_strategy', strategy: finding.remediationStrategy };
  }
  let file = null;
  try {
    file = typeof fetchFileForFinding === 'function'
      ? await fetchFileForFinding({ finding })
      : null;
  } catch (e) {
    return { ok: false, reason: `fetch_failed:${(e?.message ?? String(e)).slice(0, 120)}`, strategy: finding.remediationStrategy };
  }
  if (!file || typeof file.fileContent !== 'string' || typeof file.filePath !== 'string') {
    return { ok: false, reason: 'no_file_resolved', strategy: finding.remediationStrategy };
  }
  let result;
  try {
    result = generator({
      finding,
      fileContent: file.fileContent,
      filePath: file.filePath,
    });
  } catch (e) {
    return { ok: false, reason: `generator_threw:${(e?.message ?? String(e)).slice(0, 120)}`, strategy: finding.remediationStrategy };
  }
  if (!result || result.patched !== true) {
    return { ok: false, reason: result?.provenance?.reason ?? 'generator_declined', strategy: finding.remediationStrategy };
  }
  return {
    ok: true,
    patch: Object.freeze({
      filePath: file.filePath,
      patchedContent: result.patchedContent,
      changeDescription: result.changeDescription,
      confidence: result.confidence,
      provenance: result.provenance,
      strategy: result.strategy ?? finding.remediationStrategy,
      finding: Object.freeze({
        id: finding.id ?? null,
        severity: finding.severity,
        category: finding.category,
        location: finding.location,
        dimension: finding.dimension,
      }),
      verification: lookupVerification(finding.remediationStrategy),
    }),
  };
}

/**
 * Main entry. See module header for shape.
 */
export async function runRemediation({ findings, fetchFileForFinding, budgets, onStep } = {}) {
  // ── STEP 2 — classify ──────────────────────────────────────────────────────
  const classified = classifyFindings(findings);
  safeEmit(onStep, {
    type: 'step',
    log: {
      kind: 'remediation_classified',
      eligible: classified.counts.eligible,
      escalated: classified.counts.escalated,
      ineligible: classified.counts.ineligible,
      total: classified.counts.total,
    },
  });

  // ── STEP 3 — budget ────────────────────────────────────────────────────────
  const budgeted = applyBudget(classified.eligible, budgets);
  safeEmit(onStep, {
    type: 'step',
    log: {
      kind: 'budget_applied',
      withinBudget: budgeted.counts.withinBudget,
      deferred: budgeted.counts.deferred,
      appliedCaps: budgeted.appliedCaps,
    },
  });

  // ── STEP 4 — run patch generators (parallel) ───────────────────────────────
  let fixesAttempted = 0;
  let fixesSucceeded = 0;
  let fixesFailed = 0;
  const proposedPatches = [];
  const failedFixes = [];

  const attemptResults = await Promise.all(
    budgeted.withinBudget.map(async (finding) => {
      fixesAttempted += 1;
      const result = await attemptPatch({ finding, fetchFileForFinding });
      if (result.ok) {
        safeEmit(onStep, {
          type: 'step',
          log: {
            kind: 'fix_generated',
            category: finding.category,
            strategy: finding.remediationStrategy,
            confidence: result.patch.confidence,
            severity: finding.severity,
          },
        });
        return { ok: true, patch: result.patch, finding };
      }
      return { ok: false, finding, reason: result.reason };
    }),
  );
  for (const r of attemptResults) {
    if (r.ok) {
      fixesSucceeded += 1;
      proposedPatches.push(r.patch);
    } else {
      fixesFailed += 1;
      failedFixes.push({
        category: r.finding.category,
        strategy: r.finding.remediationStrategy,
        reason: r.reason,
        severity: r.finding.severity,
      });
    }
  }

  // ── STEP 5 — collision detection ───────────────────────────────────────────
  const collisions = detectAndResolveConflicts(proposedPatches);
  safeEmit(onStep, {
    type: 'step',
    log: {
      kind: 'collision_check',
      conflicts: collisions.counts.detected,
      resolved: collisions.counts.resolved,
      kept: collisions.counts.kept,
      deferred: collisions.counts.deferred,
    },
  });

  // ── Build governance summary ───────────────────────────────────────────────
  const summary = Object.freeze({
    totalFindings:   classified.counts.total,
    eligible:        classified.counts.eligible,
    escalated:       classified.counts.escalated,
    ineligible:      classified.counts.ineligible,
    fixesAttempted,
    fixesSucceeded,
    fixesFailed,
    budgetApplied: Object.freeze({
      withinBudget: budgeted.counts.withinBudget,
      deferred:     budgeted.counts.deferred,
      caps:         budgeted.appliedCaps,
    }),
    collisions: Object.freeze({
      detected: collisions.counts.detected,
      resolved: collisions.counts.resolved,
      kept:     collisions.counts.kept,
      deferred: collisions.counts.deferred,
    }),
    failedFixes,
  });

  return Object.freeze({
    ok: true,
    patches:    collisions.kept,
    summary,
    classifier: classified.counts,
    budget:     budgeted.counts,
    collisions: collisions.counts,
    deferred:   budgeted.deferred.concat(collisions.deferred),
    ineligible: classified.ineligible.map((f) => Object.freeze({
      id: f.id, category: f.category, severity: f.severity, reason: f.remediationReason,
    })),
    escalated: classified.escalated.map((f) => Object.freeze({
      id: f.id, category: f.category, severity: f.severity, dimension: f.dimension, reason: f.remediationReason,
    })),
    conflicts: collisions.conflicts,
  });
}

export { DEFAULT_BUDGETS };
