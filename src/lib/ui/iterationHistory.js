export function normalizeIterationHistoryRow(iteration) {
  if (!iteration || typeof iteration !== 'object') return iteration;

  const steps = Array.isArray(iteration.steps) ? iteration.steps : [];
  const reusedPreFixScore = steps.some((step) => (
    step?.step === 11
    && step?.result?.reusedPreFixScore === true
  ));
  const hasNoPreview = iteration.previewUrl == null || iteration.previewUrl === '';

  if (!hasNoPreview || !reusedPreFixScore || typeof iteration.preScore !== 'number') {
    return iteration;
  }

  return {
    ...iteration,
    postScore: iteration.preScore,
    delta: 0,
    noPreviewScoreReuse: true,
    scoreReuseNote: 'No preview available; post score reused from baseline.',
  };
}
