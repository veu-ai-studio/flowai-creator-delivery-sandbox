export function summarizeObjectiveTracking({ userObjectives = [], sourceMappedFixProposals = [] } = {}) {
  const proposals = Array.isArray(sourceMappedFixProposals) ? sourceMappedFixProposals : [];
  return (Array.isArray(userObjectives) ? userObjectives : []).map((objective) => {
    const text = objective?.text ?? '';
    const lower = text.toLowerCase();
    const matched = proposals.some((proposal) => {
      const blob = [
        proposal?.title,
        proposal?.issue,
        proposal?.description,
        proposal?.fix,
        proposal?.category,
      ].filter(Boolean).join(' ').toLowerCase();
      return lower && blob.includes(lower.split(/\s+/)[0]);
    });
    return Object.freeze({
      id: objective?.id ?? text,
      text,
      status: matched ? 'met' : 'pending',
      evidence: matched ? 'matched to generated fix proposal' : 'needs implementation evidence',
    });
  });
}

export function summarizeAttachmentCounts(inputSummary = {}) {
  const types = inputSummary.attachmentTypes && typeof inputSummary.attachmentTypes === 'object'
    ? inputSummary.attachmentTypes
    : {};
  return Object.entries(types)
    .map(([type, count]) => `${count} ${type}${count === 1 ? '' : 's'}`)
    .join(', ');
}
