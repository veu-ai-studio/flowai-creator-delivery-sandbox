// src/lib/verification/postFixSnapshot.js

'use strict';

import { runEvaluationPipeline as defaultRunEvaluationPipeline } from '../evaluation/evaluationPipeline.js';
import { captureSnapshot } from './snapshotShared.js';

export async function capturePostFixSnapshot({ url, runEvaluationPipeline = defaultRunEvaluationPipeline, evaluationResult, options } = {}) {
  return captureSnapshot({ url, runEvaluationPipeline, evaluationResult, options });
}
