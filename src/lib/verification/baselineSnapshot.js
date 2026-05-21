// src/lib/verification/baselineSnapshot.js
//
// PART B — Phase C snapshots default to TIER_3 (full evaluator stack)
// so the baseline ↔ post-fix comparison is fair regardless of any
// budget tier the broader pass was running under.

'use strict';

import { runEvaluationPipeline as defaultRunEvaluationPipeline } from '../evaluation/evaluationPipeline.js';
import { TIER } from '../evaluation/evaluationBudget.js';
import { captureSnapshot } from './snapshotShared.js';

export async function captureBaselineSnapshot({ url, runEvaluationPipeline = defaultRunEvaluationPipeline, evaluationResult, options } = {}) {
  // When the caller already has a pipeline result (orchestrator's STEP 4
  // reuse path), pass it through unmodified — the evaluation already ran
  // and re-running would double the cost. Otherwise force TIER_3 + the
  // full evaluator stack so we get a fair-compare anchor.
  const snapshotOptions = evaluationResult
    ? options
    : { evaluationTier: TIER.TIER_3, ...(options ?? {}) };
  return captureSnapshot({ url, runEvaluationPipeline, evaluationResult, options: snapshotOptions });
}
