// api/_lib/sourceAcquisition.js
//
// Source acquisition layer for the renewal pipeline.
//
// Given an input, attempts to retrieve real source code so the
// remediation engine can take the PATCH-EXISTING-SOURCE path rather
// than GENERATE-FROM-SCRATCH.  Tries in order:
//
//   1. Git URL (gitUrl) — uses GitHub REST API to fetch a tarball of
//      the default branch and extracts the file tree in-memory.
//      (Vercel serverless functions cannot shell out to `git clone`;
//      the GitHub tarball endpoint is the equivalent that works from a
//      function.  Both public and private repos are supported when a
//      GITHUB_MODELS_PAT or GITHUB_TOKEN is in env.)
//
//   2. Vercel project (vercelProject + token) — calls Vercel's
//      /v9/projects/{id} endpoint via the orchestra vercel adapter.
//      Returns metadata + the linked Git repo URL when available; the
//      caller can then re-invoke source acquisition with that gitUrl.
//
//   3. Base44 project (base44Project + token) — STUB.  Returns null.
//      The Base44 source-export API surface is not yet wired.
//
//   4. Fallback: returns null.  The remediation engine then takes the
//      GENERATE-FROM-SCRATCH path.
//
// ─── RETURN SHAPE ────────────────────────────────────────────────────
//   {
//     sourceRoot: { files: [{ path, content }] } | null,
//     framework:  'vite' | 'next' | 'unknown' | null,
//     retrievalMethod: 'git-tarball' | 'vercel-project' | 'base44-stub' | 'none',
//     gitRepoUrl?: string,
//     notes: string[],
//   }
//
// Files included from the tarball are filtered to text source files
// only — no node_modules, dist, .git, lockfiles, binary assets.

import { dispatch } from '../../src/lib/orchestra/index.js';

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.json', '.html', '.htm', '.css', '.scss', '.less',
  '.md', '.txt', '.yml', '.yaml', '.svg',
]);
const SKIP_PREFIXES = ['node_modules/', 'dist/', '.git/', 'build/', '.next/', 'out/', '.vercel/', '.cache/'];
const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  '.DS_Store',
]);
const MAX_TOTAL_BYTES = 500_000; // 500 KB cap to keep things manageable.

/**
 * @param {{
 *   gitUrl?:        string,
 *   vercelProject?: string,
 *   base44Project?: string,
 *   teamId?:        string,
 * }} hints
 */
export async function acquireSource(hints) {
  const notes = [];

  if (hints?.gitUrl) {
    const r = await tryGit(hints.gitUrl, notes);
    if (r) return r;
  }

  if (hints?.vercelProject) {
    const meta = await dispatch('source-retrieval', { projectId: hints.vercelProject, teamId: hints.teamId });
    if (meta.ok && meta.data?.gitRepoUrl) {
      notes.push(`Vercel project ${hints.vercelProject} linked to ${meta.data.gitRepoUrl}; following.`);
      const r = await tryGit(meta.data.gitRepoUrl, notes);
      if (r) return r;
    } else if (meta.ok) {
      notes.push(`Vercel project ${hints.vercelProject} reachable but no linked Git repo. ${meta.data?.hint || ''}`);
    } else {
      notes.push(`Vercel source retrieval failed: ${meta.error || 'unknown'}`);
    }
  }

  if (hints?.base44Project) {
    notes.push('Base44 source export not yet wired — see src/lib/orchestra/stubs.js.');
    return { sourceRoot: null, framework: null, retrievalMethod: 'base44-stub', notes };
  }

  notes.push('No source hints supplied or all hints failed — generate-from-scratch path will be used.');
  return { sourceRoot: null, framework: null, retrievalMethod: 'none', notes };
}

/**
 * Attempt to fetch a Git repository's tarball via the GitHub REST API.
 * Supports both public and private repos (when GITHUB_TOKEN is set).
 *
 * @param {string} gitUrl   e.g. "https://github.com/owner/repo" or "owner/repo"
 * @param {string[]} notes  accumulator for diagnostic strings
 */
async function tryGit(gitUrl, notes) {
  const parsed = parseGitHubUrl(gitUrl);
  if (!parsed) {
    notes.push(`Unrecognized git URL: ${gitUrl} (only github.com is wired)`);
    return null;
  }
  const { owner, repo, ref } = parsed;
  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_MODELS_PAT || null;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'FlowAI-renewal/1.0',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const refQs = ref ? `/${encodeURIComponent(ref)}` : '';
  const tarballUrl = `https://api.github.com/repos/${owner}/${repo}/tarball${refQs}`;
  let res;
  try {
    res = await fetch(tarballUrl, { headers, redirect: 'follow' });
  } catch (e) {
    notes.push(`GitHub tarball fetch failed: ${e.message || String(e)}`);
    return null;
  }
  if (!res.ok) {
    notes.push(`GitHub tarball ${res.status}: ${res.statusText}`);
    return null;
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  notes.push(`Fetched tarball ${owner}/${repo}${ref ? '@' + ref : ''} (${buf.byteLength} bytes)`);

  let files;
  try {
    files = await extractTextFilesFromTarball(buf, notes);
  } catch (e) {
    notes.push(`Tarball extraction failed: ${e.message || String(e)}`);
    return null;
  }
  if (!files || files.length === 0) {
    notes.push('Tarball extracted 0 text files — bailing.');
    return null;
  }
  const framework = detectFramework(files);
  notes.push(`Detected framework: ${framework}; ${files.length} text files (${files.reduce((a, f) => a + f.content.length, 0)} bytes)`);
  return {
    sourceRoot: { files },
    framework,
    retrievalMethod: 'git-tarball',
    gitRepoUrl: `https://github.com/${owner}/${repo}`,
    notes,
  };
}

function parseGitHubUrl(input) {
  if (typeof input !== 'string' || !input.trim()) return null;
  const s = input.trim().replace(/\.git$/i, '');
  // owner/repo[@ref]
  let m = s.match(/^([\w.-]+)\/([\w.-]+)(?:@([\w./-]+))?$/);
  if (m) return { owner: m[1], repo: m[2], ref: m[3] || null };
  try {
    const u = new URL(s);
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return null;
    return { owner: parts[0], repo: parts[1], ref: u.hash ? u.hash.slice(1) : null };
  } catch {
    return null;
  }
}

function detectFramework(files) {
  const pkgFile = files.find((f) => f.path.endsWith('package.json'));
  if (!pkgFile) return 'unknown';
  let pkg;
  try { pkg = JSON.parse(pkgFile.content); } catch { return 'unknown'; }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  if (deps.next) return 'next';
  if (deps.vite) return 'vite';
  return 'unknown';
}

/**
 * Extract text files from a gzipped tarball.  Uses the runtime's
 * built-in DecompressionStream + a small custom tar parser (POSIX
 * ustar; the GitHub tarball endpoint emits ustar archives).
 *
 * Skips: node_modules/, dist/, .git/, lockfiles, binary assets.
 * Caps total bytes at MAX_TOTAL_BYTES.
 */
async function extractTextFilesFromTarball(gzipped, notes) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not available in this runtime');
  }
  const decompressed = await gunzipToBytes(gzipped);
  const files = [];
  let total = 0;
  for (const entry of iterateTar(decompressed)) {
    if (!entry || entry.type !== '0' && entry.type !== '' /* '0' or empty for regular files */) continue;
    // Strip the top-level dir GitHub prepends (e.g., "owner-repo-sha/").
    const rel = stripTopDir(entry.name);
    if (!rel) continue;
    if (SKIP_PREFIXES.some((p) => rel.startsWith(p))) continue;
    const base = rel.split('/').pop();
    if (SKIP_FILES.has(base)) continue;
    const ext = base.includes('.') ? '.' + base.split('.').pop().toLowerCase() : '';
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    let content;
    try { content = new TextDecoder('utf-8', { fatal: false }).decode(entry.data); } catch { continue; }
    if (total + content.length > MAX_TOTAL_BYTES) {
      notes.push(`Stopping extraction at ${total} bytes (cap ${MAX_TOTAL_BYTES}); skipped remaining files.`);
      break;
    }
    total += content.length;
    files.push({ path: rel, content });
  }
  return files;
}

function stripTopDir(name) {
  const idx = name.indexOf('/');
  if (idx === -1) return null;
  return name.slice(idx + 1) || null;
}

async function gunzipToBytes(bytes) {
  const ds = new DecompressionStream('gzip');
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(bytes); controller.close(); },
  });
  const reader = stream.pipeThrough(ds).getReader();
  const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value instanceof Uint8Array ? value : new Uint8Array(value));
  }
  let total = 0;
  for (const c of chunks) total += c.byteLength;
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

/**
 * Iterate a POSIX ustar archive.  Yields { name, type, data: Uint8Array }
 * entries.
 */
function* iterateTar(bytes) {
  let pos = 0;
  while (pos + 512 <= bytes.length) {
    const header = bytes.subarray(pos, pos + 512);
    // EOF: 2 consecutive zero blocks.
    if (header.every((b) => b === 0)) break;
    const name = readCString(header, 0, 100);
    const sizeOctal = readCString(header, 124, 12).trim();
    const type = String.fromCharCode(header[156] || 0);
    const prefix = readCString(header, 345, 155);
    const fullName = prefix ? `${prefix}/${name}` : name;
    const size = parseInt(sizeOctal || '0', 8) || 0;
    pos += 512;
    if (size === 0) { yield { name: fullName, type, data: new Uint8Array(0) }; continue; }
    const data = bytes.subarray(pos, pos + size);
    yield { name: fullName, type, data };
    // tar pads to 512-byte boundaries.
    pos += Math.ceil(size / 512) * 512;
  }
}

function readCString(buf, offset, length) {
  let end = offset;
  const max = offset + length;
  while (end < max && buf[end] !== 0) end++;
  return new TextDecoder('utf-8').decode(buf.subarray(offset, end));
}

export const __internals = Object.freeze({
  parseGitHubUrl,
  detectFramework,
  iterateTar,
  stripTopDir,
});
