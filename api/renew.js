// POST /api/renew
//
// Renewal pipeline orchestrator — accepts one of three input payload
// shapes and runs: adapt → detect → renew → before/after report.
//
// Body shape (one of):
//   { inputType: "url",         url: <string>, options?: { depth?, maxPages? } }
//   { inputType: "description", description: { productName?, whatItDoes?, targetAudience?, keyFeatures?, currentIssues?, liveUrl?, voiceNote?, loginEmail?, loginPassword? } }
//   { inputType: "content",     content: { text?, attachments?: [{filename, mimeType, size, base64?}] } }
//
// Response: BeforeAfterReport (see api/_lib/beforeAfterReport.js).
//
// Credentials on the description payload are session-only — never
// persisted in any store, never echoed in the response, never logged.

import { setCorsHeaders } from './_lib/claude.js';
import { adaptUrl } from './_lib/inputAdapters/url.js';
import { adaptDescription } from './_lib/inputAdapters/description.js';
import { adaptContent } from './_lib/inputAdapters/content.js';
import { detectIssues } from './_lib/issueDetector.js';
import { renew, resolveRenewalType } from './_lib/renewalEngine.js';
import { buildBeforeAfterReport, detectIssuesOnRenewal } from './_lib/beforeAfterReport.js';
import { buildInputArtifact, scrubCredentials } from '../src/lib/renewal/inputArtifact.js';

function originFrom(req) {
  const xfProto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return '';
  return `${xfProto}://${host}`;
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

  const body = req.body || {};
  const inputType = body.inputType;
  if (!['url', 'description', 'content'].includes(inputType)) {
    return res.status(400).json({ error: 'inputType must be one of "url" | "description" | "content"' });
  }

  let adapterResult;
  try {
    if (inputType === 'url') {
      adapterResult = await adaptUrl(body.url, body.options || {});
    } else if (inputType === 'description') {
      adapterResult = await adaptDescription(body.description || {}, body.options || {});
    } else {
      adapterResult = await adaptContent(body.content || {}, body.options || {});
    }
  } catch (e) {
    return res.status(500).json({ error: 'adapter failed', details: e.message || String(e) });
  }

  if (!adapterResult.ok) {
    return res.status(200).json({
      ok: false,
      reason: adapterResult.reason || 'adapter rejected input',
      inputType,
    });
  }

  const artifact = buildInputArtifact({
    inputType,
    raw: adapterResult.raw,
    normalized: adapterResult.normalized,
  });

  const issueListBefore = detectIssues(artifact, adapterResult.evidence);

  let renewalResult;
  try {
    renewalResult = await renew({
      artifact,
      issues: issueListBefore.issues,
      requestOrigin: originFrom(req),
      renewalType: resolveRenewalType(inputType),
    });
  } catch (e) {
    return res.status(500).json({ error: 'renewal failed', details: e.message || String(e) });
  }

  const issueListAfter = detectIssuesOnRenewal(artifact, renewalResult.patchesApplied);
  const report = buildBeforeAfterReport({
    artifact: scrubCredentials(artifact),
    evidence: adapterResult.evidence,
    issueListBefore,
    issueListAfter,
    renewalResult,
  });
  return res.status(200).json({ ok: true, report });
}
