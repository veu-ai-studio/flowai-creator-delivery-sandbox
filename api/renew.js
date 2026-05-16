// POST /api/renew
//
// Renewal pipeline orchestrator — Orchestra-powered.
//
// Body shape (one of):
//   { inputType: "url",         url: <string>, options?, sourceHints?: { gitUrl?, vercelProject?, base44Project? } }
//   { inputType: "description", description: { ... } }
//   { inputType: "content",     content: { text?, attachments? } }
//   { inputType: "multi-url",   urls: <string[]>, options? }
//
// Response: BeforeAfterReport with renewedUrl pointing at a real Vercel
// preview deployment (or ok:false with buildLog when the renewal could
// not produce a deployable build).
//
// Credentials on the description payload are session-only — never
// persisted, never echoed in the response, never logged.

import { setCorsHeaders } from './_lib/claude.js';
import { adaptUrl } from './_lib/inputAdapters/url.js';
import { adaptDescription } from './_lib/inputAdapters/description.js';
import { adaptContent } from './_lib/inputAdapters/content.js';
import { adaptMultiUrl } from './_lib/inputAdapters/multiUrl.js';
import { detectIssues } from './_lib/issueDetector.js';
import { renew } from './_lib/renewalEngine.js';
import { buildBeforeAfterReport, detectIssuesOnRenewal } from './_lib/beforeAfterReport.js';
import { buildInputArtifact, scrubCredentials } from '../src/lib/renewal/inputArtifact.js';
import { requireAuthHard } from './_lib/auth.js';

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

  // S-3 fix (W4 adversarial bd2f923): auth gate BEFORE body validation.
  if (!(await requireAuthHard(req, res))) return;

  const body = req.body || {};
  const inputType = body.inputType;
  if (!['url', 'description', 'content', 'multi-url'].includes(inputType)) {
    return res.status(400).json({ error: 'inputType must be one of "url" | "description" | "content" | "multi-url"' });
  }

  let adapterResult;
  try {
    if (inputType === 'url') {
      adapterResult = await adaptUrl(body.url, body.options || {});
    } else if (inputType === 'description') {
      adapterResult = await adaptDescription(body.description || {}, body.options || {});
    } else if (inputType === 'content') {
      adapterResult = await adaptContent(body.content || {}, body.options || {});
    } else {
      adapterResult = await adaptMultiUrl(body.urls || [], body.options || {});
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

  // Single-input artifact build (multi-url synthesis builds its own
  // artifact internally; the adapter still returns normalized for the
  // issue detector).
  const artifactType = inputType === 'multi-url' ? 'multi-url-synthesis' : inputType;
  const artifact = buildInputArtifact({
    inputType: artifactType,
    raw: adapterResult.raw,
    normalized: adapterResult.normalized,
  });

  const issueListBefore = detectIssues(
    // detectIssues was wired for 'url'|'description'|'content'.  For
    // multi-url synthesis we run the common + url-only detectors.
    artifactType === 'multi-url-synthesis'
      ? { ...artifact, inputType: 'url' }
      : artifact,
    adapterResult.evidence,
  );

  let renewalResult;
  try {
    renewalResult = await renew({
      artifact,
      issues: issueListBefore.issues,
      sourceHints: inputType === 'url' ? (body.sourceHints || null) : null,
      urls: inputType === 'multi-url' ? body.urls : undefined,
      requestOrigin: originFrom(req),
    });
  } catch (e) {
    return res.status(500).json({ error: 'renewal failed', details: e.message || String(e) });
  }

  // On build failure, surface the build log and return ok:false WITHOUT
  // a deployment URL (per dispatch: don't deploy a broken build).
  if (!renewalResult.ok) {
    return res.status(200).json({
      ok: false,
      reason: renewalResult.reason || 'Renewal could not produce a deployable build',
      inputType,
      remediationPath: renewalResult.remediationPath,
      sourceDisclosure: renewalResult.sourceDisclosure,
      buildLog: renewalResult.buildLog || null,
      deploymentId: renewalResult.deploymentId || null,
      patchErrors: renewalResult.patchErrors || null,
    });
  }

  const issueListAfter = detectIssuesOnRenewal(
    artifactType === 'multi-url-synthesis' ? { ...artifact, inputType: 'url' } : artifact,
    renewalResult.patchesApplied || [],
  );
  const report = buildBeforeAfterReport({
    artifact: scrubCredentials(artifact),
    evidence: adapterResult.evidence,
    issueListBefore, issueListAfter,
    renewalResult,
  });
  return res.status(200).json({ ok: true, report });
}
