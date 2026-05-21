// src/lib/verification/baselineSnapshot.js

'use strict';

import { runEvaluationPipeline as defaultRunEvaluationPipeline } from '../evaluation/evaluationPipeline.js';
import { captureSnapshot } from './snapshotShared.js';

export async function captureBaselineSnapshot({ url, runEvaluationPipeline = defaultRunEvaluationPipeline, evaluationResult, options } = {}) {
  return captureSnapshot({ url, runEvaluationPipeline, evaluationResult, options });
}
