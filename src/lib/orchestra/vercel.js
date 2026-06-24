// src/lib/orchestra/vercel.js
//
// Vercel adapter — uses Vercel's REST deployments API to deploy file
// trees to preview URLs.
//
// The dispatch asks for `git clone` + `npm install` + `npm run build` +
// `vercel deploy` inside the renewal pipeline.  Vercel serverless
// functions cannot run those binaries.  The equivalent that DOES work
// is `POST /v13/deployments` with an inline file list — Vercel itself
// runs the install + build server-side and returns a preview URL.
// This is the same pattern the project's existing `deployApp` Base44
// function uses (base44/functions/deployApp/entry.ts) so we are not
// inventing a new pattern.
//
// VERCEL_OPERATOR_TOKEN / VERCEL_TOKEN is read from process.env
// (Doppler-injected). The operator-token alias keeps credential naming
// aligned with the server-side operator bridge while preserving the legacy
// VERCEL_TOKEN path.

import { memberOk, memberError } from './member.js';

export const id = 'vercel';
export const displayName = 'Vercel (REST deployments API)';
export const capabilities = Object.freeze(['deploy', 'source-retrieval']);
export const wired = true;

const VERCEL_API = 'https://api.vercel.com';
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS  = 120_000;

/**
 * @param {string} action
 * @param {object} payload
 */
export async function invoke(action, payload) {
  if (action === 'deploy')           return deploy(payload);
  if (action === 'source-retrieval') return sourceRetrieval(payload);
  return memberError(id, action, `unsupported action "${action}"`);
}

/**
 * Deploy a file tree to Vercel.  Returns the preview URL once the
 * deployment reaches READY (or surfaces the build log on failure).
 *
 * Payload:
 *   {
 *     files:        [{ path: 'package.json', content: '...' }, ...]
 *     projectName?: string
 *     target?:      'production' | 'preview' (defaults to 'preview')
 *     framework?:   'vite' | null   (passed to projectSettings)
 *     teamId?:      string          (defaults to env VERCEL_TEAM or none)
 *   }
 */
async function deploy(payload) {
  const token = process.env.VERCEL_OPERATOR_TOKEN || process.env.VERCEL_TOKEN;
  if (!token) return memberError(id, 'deploy', 'VERCEL_OPERATOR_TOKEN/VERCEL_TOKEN missing from environment');

  const files = Array.isArray(payload?.files) ? payload.files : null;
  if (!files || files.length === 0) return memberError(id, 'deploy', 'files[] required');

  const target = payload.target === 'production' ? 'production' : 'preview';
  const projectName = payload.stableProjectName === true
    ? sanitizeProjectSlug(payload.projectName || 'flowai-renewed')
    : sanitizeProjectName(payload.projectName || 'flowai-renewed');
  const framework = payload.framework || null;
  const teamId = payload.teamId || process.env.VERCEL_TEAM || null;
  const teamQs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';

  // Encode each file as { file, data, encoding }.  base64 keeps binary
  // safety; even though all our content is text, base64 is the safer
  // wire format for the Vercel deployments endpoint.
  const encodedFiles = files.map((f) => ({
    file: f.path,
    data: encodeBase64Utf8(typeof f.content === 'string' ? f.content : ''),
    encoding: 'base64',
  }));

  const submitBody = buildDeploymentSubmitBody({
    projectName,
    encodedFiles,
    target,
    framework,
  });

  let submitRes;
  try {
    submitRes = await fetch(`${VERCEL_API}/v13/deployments${teamQs}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(submitBody),
    });
  } catch (e) {
    return memberError(id, 'deploy', `Vercel network error: ${e.message || String(e)}`);
  }

  const submitText = await submitRes.text();
  let submit;
  try { submit = JSON.parse(submitText); }
  catch { return memberError(id, 'deploy', `Vercel returned non-JSON ${submitRes.status}`, { rawText: submitText.slice(0, 400) }); }

  if (!submitRes.ok) {
    return memberError(id, 'deploy', `Vercel ${submitRes.status}: ${submit?.error?.message || 'unknown error'}`, {
      details: submit,
    });
  }

  const deploymentId = submit.id;
  let url = submit.url ? `https://${submit.url}` : null;
  let readyState = submit.readyState;

  if (deploymentId && readyState !== 'READY') {
    const polled = await pollUntilReady(deploymentId, token, teamQs);
    if (polled.ready) {
      url = polled.url || url;
      readyState = 'READY';
    } else if (polled.state === 'ERROR' || polled.state === 'CANCELED') {
      // Try to fetch build logs.
      const log = await fetchBuildLog(deploymentId, token, teamQs).catch(() => null);
      return memberError(id, 'deploy', `Vercel build ${polled.state}`, {
        deploymentId,
        state: polled.state,
        url,
        buildLog: log,
      });
    } else {
      const log = await fetchBuildLog(deploymentId, token, teamQs).catch(() => null);
      return memberError(id, 'deploy', `Vercel build did not reach READY (state=${polled.state})`, {
        deploymentId,
        state: polled.state,
        url,
        buildLog: log,
      });
    }
  }

  return memberOk(id, 'deploy', {
    url,
    deploymentId,
    target,
    projectName,
    readyState,
  });
}

async function pollUntilReady(deploymentId, token, teamQs) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const r = await fetch(`${VERCEL_API}/v13/deployments/${deploymentId}${teamQs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) break;
    const data = await r.json();
    if (data.readyState === 'READY') {
      return { ready: true, url: data.url ? `https://${data.url}` : (data.alias?.[0] ? `https://${data.alias[0]}` : null), state: 'READY' };
    }
    if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
      return { ready: false, state: data.readyState };
    }
  }
  return { ready: false, state: 'TIMEOUT' };
}

async function fetchBuildLog(deploymentId, token, teamQs) {
  try {
    const r = await fetch(`${VERCEL_API}/v2/deployments/${deploymentId}/events${teamQs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const events = await r.json().catch(() => null);
    if (!Array.isArray(events)) return null;
    return events
      .filter((e) => e && (e.type === 'stdout' || e.type === 'stderr' || e.type === 'command' || e.type === 'fatal'))
      .map((e) => `[${e.type}] ${e.payload?.text || ''}`)
      .slice(-50)
      .join('\n');
  } catch {
    return null;
  }
}

/**
 * Source retrieval — uses Vercel's project / source endpoint to export
 * the source of a project the operator owns.  Today Vercel does NOT
 * expose a single endpoint that returns the full source tree as a tar
 * archive for a given project on the Hobby/Pro public API surface; the
 * closest is `GET /v9/projects/{id}` plus the deployment-files API per
 * file.  We attempt the project lookup and surface what we can.  If
 * the project / source cannot be exported, the caller falls back to
 * generate-from-scratch.
 *
 * Payload:
 *   { projectId: string, teamId?: string }
 */
async function sourceRetrieval(payload) {
  const token = process.env.VERCEL_OPERATOR_TOKEN || process.env.VERCEL_TOKEN;
  if (!token) return memberError(id, 'source-retrieval', 'VERCEL_OPERATOR_TOKEN/VERCEL_TOKEN missing from environment');
  const projectId = payload?.projectId;
  if (!projectId) return memberError(id, 'source-retrieval', 'projectId required');
  const teamId = payload.teamId || process.env.VERCEL_TEAM || null;
  const teamQs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
  try {
    const r = await fetch(`${VERCEL_API}/v9/projects/${encodeURIComponent(projectId)}${teamQs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return memberError(id, 'source-retrieval', `Vercel projects ${r.status}`);
    const project = await r.json();
    // Best-effort: the public API does not return source tree directly;
    // we surface project metadata so the caller can choose to fall back
    // to a Git-based retrieval (project.link.repo) or generate-from-scratch.
    return memberOk(id, 'source-retrieval', {
      projectId,
      framework: project.framework || null,
      gitRepoUrl: project.link?.repo
        ? (project.link.type === 'github' ? `https://github.com/${project.link.repo}` : null)
        : null,
      hint: 'Vercel REST does not export the full source tree for arbitrary projects; use the Git link via the github adapter when available.',
    });
  } catch (e) {
    return memberError(id, 'source-retrieval', e.message || String(e));
  }
}

function sanitizeProjectName(name) {
  return sanitizeProjectSlug(name)
    + '-' + Date.now().toString(36).slice(-6);
}

function sanitizeProjectSlug(name) {
  return String(name).toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 52);
}

function encodeBase64Utf8(str) {
  // Node Buffer is the most reliable utf-8 base64 path.  Falls back to
  // a TextEncoder + btoa loop when Buffer is unavailable (e.g., a
  // browser bundle, which won't actually invoke deploy() — server-only).
  if (typeof Buffer !== 'undefined' && Buffer.from) {
    return Buffer.from(str, 'utf8').toString('base64');
  }
  if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  throw new Error('No base64 encoder available in this runtime');
}

function buildDeploymentSubmitBody({
  projectName,
  encodedFiles,
  target = 'preview',
  framework = null,
}) {
  return {
    name: projectName,
    files: encodedFiles,
    ...(target === 'production' ? { target: 'production' } : {}),
    projectSettings: { framework },
  };
}

export const __internals = Object.freeze({
  sanitizeProjectName,
  sanitizeProjectSlug,
  encodeBase64Utf8,
  buildDeploymentSubmitBody,
});
