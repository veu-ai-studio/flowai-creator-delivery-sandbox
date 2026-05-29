// U7 - production verification + SSOT update proposal.
//
// This module is deliberately side-effect free. It can call an injected
// production analysis function, but it never mutates SSOT files, commits,
// deploys, or assumes a fix worked without post-deploy evidence.

'use strict';

function normalizeFindingIds(findingIds) {
  if (!Array.isArray(findingIds)) return [];
  return findingIds
    .map((id) => String(id ?? '').trim())
    .filter(Boolean);
}

function findingIdentity(finding) {
  return String(
    finding?.findingId
    ?? finding?.id
    ?? finding?.category
    ?? finding?.title
    ?? '',
  ).trim();
}

function extractFindings(result) {
  if (Array.isArray(result?.findings)) return result.findings;
  if (Array.isArray(result?.engineeringFindings)) return result.engineeringFindings;
  if (Array.isArray(result?.issues)) return result.issues;
  return [];
}

function extractScore(result) {
  const candidates = [
    result?.gtmScore,
    result?.trustScore,
    result?.score,
    result?.gtmReadiness?.score,
    result?.scores?.gtm,
    result?.scores?.trust,
    result?.snapshot?.score,
  ];
  const score = candidates.find((value) => typeof value === 'number' && Number.isFinite(value));
  return typeof score === 'number' ? score : null;
}

function buildScoreDelta({ preMergeResult, postDeployResult }) {
  const before = extractScore(preMergeResult);
  const after = extractScore(postDeployResult);
  if (before === null || after === null) {
    return Object.freeze({
      before,
      after,
      delta: null,
      direction: 'unknown',
      reason: 'score_data_unavailable',
    });
  }
  const delta = after - before;
  return Object.freeze({
    before,
    after,
    delta,
    direction: delta > 0 ? 'improved' : delta < 0 ? 'regressed' : 'neutral',
    reason: 'measured_from_pre_and_post_results',
  });
}

function buildVerificationSets({ findingIds, postDeployResult }) {
  const postFindingIds = new Set(extractFindings(postDeployResult).map(findingIdentity).filter(Boolean));
  const explicitlyVerified = new Set((postDeployResult?.verifiedFindingIds ?? []).map(String));
  const explicitlyUnresolved = new Set((postDeployResult?.unresolvedFindingIds ?? []).map(String));

  const verified = [];
  const unresolved = [];

  for (const findingId of findingIds) {
    if (explicitlyVerified.has(findingId)) {
      verified.push(Object.freeze({ findingId, status: 'verified', reason: 'post_deploy_analysis_marked_verified' }));
    } else if (explicitlyUnresolved.has(findingId) || postFindingIds.has(findingId)) {
      unresolved.push(Object.freeze({ findingId, status: 'unresolved', reason: 'finding_still_present_post_deploy' }));
    } else {
      verified.push(Object.freeze({ findingId, status: 'verified', reason: 'finding_absent_from_post_deploy_analysis' }));
    }
  }

  return Object.freeze({ verified, unresolved });
}

function appendSsotSection({
  currentSsotContent,
  timestamp,
  preMergeRunId,
  postDeployUrl,
  verified,
  unresolved,
  scoreDelta,
}) {
  if (typeof currentSsotContent !== 'string') return currentSsotContent ?? '';

  const lines = [
    '',
    '### U7 Production Verification Update',
    '',
    `- Timestamp: ${timestamp}`,
    `- Pre-merge run: ${preMergeRunId ?? 'unknown'}`,
    `- Post-deploy URL: ${postDeployUrl}`,
    `- Verified findings: ${verified.length}`,
    `- Unresolved findings: ${unresolved.length}`,
    `- Score delta: ${scoreDelta.delta === null ? 'unknown' : `${scoreDelta.delta >= 0 ? '+' : ''}${scoreDelta.delta}`}`,
  ];

  for (const item of verified) {
    lines.push(`- VERIFIED: ${item.findingId} (${item.reason})`);
  }
  for (const item of unresolved) {
    lines.push(`- UNRESOLVED: ${item.findingId} (${item.reason})`);
  }

  return `${currentSsotContent.trimEnd()}\n${lines.join('\n')}\n`;
}

function unresolvedForAnalysisGap(findingIds, reason) {
  return findingIds.map((findingId) => Object.freeze({
    findingId,
    status: 'unresolved',
    reason,
  }));
}

export async function verifyProductionDeployment({
  preMergeRunId,
  postDeployUrl,
  findingIds,
  currentSsotContent,
  preMergeResult,
  postDeployResult,
  runProductionAnalysis,
  runAnalysis,
  timestamp,
} = {}) {
  const normalizedFindingIds = normalizeFindingIds(findingIds);
  const generatedAt = timestamp ?? new Date().toISOString();
  const analyzer = runProductionAnalysis ?? runAnalysis;

  if (typeof postDeployUrl !== 'string' || !postDeployUrl.trim()) {
    const unresolved = unresolvedForAnalysisGap(normalizedFindingIds, 'post_deploy_url_required');
    return Object.freeze({
      verified: Object.freeze([]),
      unresolved: Object.freeze(unresolved),
      scoreDelta: Object.freeze({ before: null, after: null, delta: null, direction: 'unknown', reason: 'post_deploy_url_required' }),
      ssotUpdated: false,
      updatedSsotContent: currentSsotContent ?? '',
      verificationReport: Object.freeze({
        kind: 'u7_production_verification',
        status: 'blocked',
        preMergeRunId: preMergeRunId ?? null,
        postDeployUrl: postDeployUrl ?? null,
        generatedAt,
        reason: 'post_deploy_url_required',
      }),
    });
  }

  let measuredPostDeployResult = postDeployResult ?? null;
  if (!measuredPostDeployResult && typeof analyzer === 'function') {
    try {
      measuredPostDeployResult = await analyzer({
        preMergeRunId,
        postDeployUrl,
        findingIds: normalizedFindingIds,
      });
    } catch (error) {
      const unresolved = unresolvedForAnalysisGap(normalizedFindingIds, 'production_analysis_failed');
      return Object.freeze({
        verified: Object.freeze([]),
        unresolved: Object.freeze(unresolved),
        scoreDelta: Object.freeze({ before: extractScore(preMergeResult), after: null, delta: null, direction: 'unknown', reason: 'production_analysis_failed' }),
        ssotUpdated: false,
        updatedSsotContent: currentSsotContent ?? '',
        verificationReport: Object.freeze({
          kind: 'u7_production_verification',
          status: 'analysis_failed',
          preMergeRunId: preMergeRunId ?? null,
          postDeployUrl,
          generatedAt,
          reason: error?.message ?? 'production_analysis_failed',
        }),
      });
    }
  }

  if (!measuredPostDeployResult) {
    const unresolved = unresolvedForAnalysisGap(normalizedFindingIds, 'production_analysis_unavailable');
    return Object.freeze({
      verified: Object.freeze([]),
      unresolved: Object.freeze(unresolved),
      scoreDelta: Object.freeze({ before: extractScore(preMergeResult), after: null, delta: null, direction: 'unknown', reason: 'production_analysis_unavailable' }),
      ssotUpdated: false,
      updatedSsotContent: currentSsotContent ?? '',
      verificationReport: Object.freeze({
        kind: 'u7_production_verification',
        status: 'unverified',
        preMergeRunId: preMergeRunId ?? null,
        postDeployUrl,
        generatedAt,
        reason: 'production_analysis_unavailable',
      }),
    });
  }

  const { verified, unresolved } = buildVerificationSets({
    findingIds: normalizedFindingIds,
    postDeployResult: measuredPostDeployResult,
  });
  const scoreDelta = buildScoreDelta({ preMergeResult, postDeployResult: measuredPostDeployResult });
  const updatedSsotContent = appendSsotSection({
    currentSsotContent,
    timestamp: generatedAt,
    preMergeRunId,
    postDeployUrl,
    verified,
    unresolved,
    scoreDelta,
  });

  return Object.freeze({
    verified: Object.freeze(verified),
    unresolved: Object.freeze(unresolved),
    scoreDelta,
    ssotUpdated: typeof currentSsotContent === 'string',
    updatedSsotContent,
    verificationReport: Object.freeze({
      kind: 'u7_production_verification',
      status: unresolved.length > 0 ? 'partial' : 'verified',
      preMergeRunId: preMergeRunId ?? null,
      postDeployUrl,
      generatedAt,
      findingIds: Object.freeze([...normalizedFindingIds]),
      verifiedCount: verified.length,
      unresolvedCount: unresolved.length,
      scoreDelta,
      ssotUpdateMode: 'return_content_for_engineering_commit',
    }),
  });
}

export const __internals = Object.freeze({
  normalizeFindingIds,
  findingIdentity,
  extractFindings,
  extractScore,
  buildScoreDelta,
  buildVerificationSets,
  appendSsotSection,
});
