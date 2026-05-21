// src/lib/verification/postFixSnapshot.js
//
// PART B — Phase C snapshots default to TIER_3 (full evaluator stack)
// so the baseline ↔ post-fix comparison is fair regardless of any
// budget tier the broader pass was running under.

'use strict';

import { runEvaluationPipeline as defaultRunEvaluationPipeline } from '../evaluation/evaluationPipeline.js';
import { TIER } from '../evaluation/evaluationBudget.js';
import { captureSnapshot } from './snapshotShared.js';

export async function capturePostFixSnapshot({ url, runEvaluationPipeline = defaultRunEvaluationPipeline, evaluationResult, options } = {}) {
  const snapshotOptions = evaluationResult
    ? options
    : { evaluationTier: TIER.TIER_3, ...(options ?? {}) };
  return captureSnapshot({ url, runEvaluationPipeline, evaluationResult, options: snapshotOptions });
}
