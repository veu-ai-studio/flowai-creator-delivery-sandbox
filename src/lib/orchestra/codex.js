// src/lib/orchestra/codex.js
//
// Codex adapter backed by the OpenAI API. This member produces code-patch
// and generate-from-scratch artifacts only; disk, git, tests, and deploy
// remain outside this adapter.

import { memberOk, memberError } from './member.js';

export const id = 'codex';
export const displayName = 'Codex (OpenAI API direct)';
export const capabilities = Object.freeze(['code-patch', 'generate-from-scratch']);
export const wired = true;

const DEFAULT_MODEL = 'gpt-4o';
const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';

export async function invoke(action, payload) {
  if (action === 'code-patch') return codePatch(payload);
  if (action === 'generate-from-scratch') return generateFromScratch(payload);
  return memberError(id, action, `unsupported action "${action}"`);
}

/** @param {any} payload */
async function codePatch(payload) {
  const { filePath, sourceContent, issueSpec, framework, timeoutMs, env } = payload || {};
  if (typeof filePath !== 'string' || !filePath) return memberError(id, 'code-patch', 'filePath required');
  if (typeof sourceContent !== 'string') return memberError(id, 'code-patch', 'sourceContent required');
  if (!issueSpec || typeof issueSpec !== 'object') return memberError(id, 'code-patch', 'issueSpec required');

  const prompt = buildPatchPrompt({ filePath, sourceContent, issueSpec, framework });
  let response;
  try {
    response = await callOpenAIJson({ prompt, maxTokens: 4000, timeoutMs, env });
  } catch (e) {
    return memberError(id, 'code-patch', e.message || String(e), statusExtras(e));
  }

  const parsed = safeJson(response.text);
  if (!parsed || typeof parsed.patchedContent !== 'string') {
    return memberError(id, 'code-patch', 'Codex response did not include patchedContent', {
      rawText: (response.text || '').slice(0, 600),
    });
  }

  return memberOk(id, 'code-patch', {
    filePath,
    patchedContent: parsed.patchedContent,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    model: response.model,
    usage: response.usage,
  });
}

/** @param {any} payload */
async function generateFromScratch(payload) {
  const { spec, framework, timeoutMs, env } = payload || {};
  if (!spec || typeof spec !== 'object') return memberError(id, 'generate-from-scratch', 'spec required');
  const fw = framework || 'vite-react';
  if (fw !== 'vite-react') return memberError(id, 'generate-from-scratch', `framework "${fw}" not supported; only "vite-react" is wired`);

  const prompt = buildGeneratePrompt({ spec });
  let response;
  try {
    response = await callOpenAIJson({ prompt, maxTokens: 6000, timeoutMs, env });
  } catch (e) {
    return memberError(id, 'generate-from-scratch', e.message || String(e), statusExtras(e));
  }

  const parsed = safeJson(response.text);
  const files = Array.isArray(parsed?.files)
    ? parsed.files.filter(file => file && typeof file.path === 'string' && typeof file.content === 'string')
    : [];
  const missing = missingRequiredFiles(files);
  if (files.length === 0 || missing.length > 0) {
    return memberError(id, 'generate-from-scratch', 'Codex response did not include a complete Vite-React file tree', {
      missingRequiredFiles: missing,
      rawText: (response.text || '').slice(0, 600),
    });
  }

  return memberOk(id, 'generate-from-scratch', {
    files: files.map(file => ({ path: file.path.trim(), content: file.content })),
    framework: fw,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    model: response.model,
    usage: response.usage,
  });
}

/** @param {any} input */
async function callOpenAIJson({ prompt, maxTokens, timeoutMs, env = globalThis.process?.env } = {}) {
  const apiKey = typeof env?.OPENAI_API_KEY === 'string' ? env.OPENAI_API_KEY.trim() : '';
  if (!apiKey) {
    const error = /** @type {any} */ (new Error('OPENAI_API_KEY is required for Codex dispatch'));
    error.status = 401;
    throw error;
  }
  if (typeof globalThis.fetch !== 'function') {
    throw new Error('fetch is required for Codex OpenAI API dispatch');
  }

  const model = env?.OPENAI_CODE_MODEL || env?.OPENAI_MODEL || DEFAULT_MODEL;
  const controller = typeof AbortController === 'function' && timeoutMs
    ? new AbortController()
    : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  try {
    const response = await globalThis.fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller?.signal,
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: 'You are Codex, a precise code-generation adapter. Return exactly valid JSON and no markdown.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }

    if (!response.ok) {
      const error = /** @type {any} */ (new Error(`OpenAI Codex dispatch failed with HTTP ${response.status}`));
      error.status = response.status;
      error.details = body?.error?.message || text.slice(0, 600);
      throw error;
    }

    const output = body?.choices?.[0]?.message?.content;
    if (typeof output !== 'string' || output.trim().length === 0) {
      throw new Error('OpenAI Codex dispatch returned empty content');
    }

    return Object.freeze({
      text: output,
      model: body?.model ?? model,
      usage: body?.usage ?? {},
    });
  } catch (e) {
    if (e?.name === 'AbortError') throw new Error(`OpenAI Codex dispatch timed out after ${timeoutMs}ms`);
    throw e;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function buildPatchPrompt({ filePath, sourceContent, issueSpec, framework }) {
  return `Apply the smallest possible edit to the source file below that resolves the issue.

Framework: ${framework || 'unknown'}
File path: ${filePath}
Issue: ${issueSpec.category || '(unspecified)'} severity=${issueSpec.severity || 'medium'}
Issue evidence: ${issueSpec.evidence || '(none)'}
Fix spec: ${JSON.stringify(issueSpec.fixSpec || {})}

Current file content:
\`\`\`
${sourceContent}
\`\`\`

Return exactly this JSON shape:
{
  "patchedContent": "<full updated file content, ready to be written back to disk>",
  "rationale": "<one or two sentences describing what changed and why>"
}

Rules:
- Preserve all surrounding code unchanged.
- Apply the smallest patch that resolves the issue.
- Do not introduce imports unless required by the fix.
- patchedContent must be the complete file content, not a diff.
- If the issue is not addressable by editing this file, return the original sourceContent verbatim and explain why.`;
}

function buildGeneratePrompt({ spec }) {
  return `Produce a complete, buildable Vite + React 18 project that implements this spec.

Spec:
${JSON.stringify(spec, null, 2)}

Return exactly this JSON shape:
{
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "vite.config.js", "content": "..." },
    { "path": "index.html", "content": "..." },
    { "path": "src/main.jsx", "content": "..." },
    { "path": "src/App.jsx", "content": "..." },
    { "path": "src/index.css", "content": "..." }
  ],
  "rationale": "<one short paragraph>"
}

Rules:
- package.json must define a "build" script that runs "vite build".
- vite.config.js must use @vitejs/plugin-react.
- index.html must reference /src/main.jsx.
- src/main.jsx must render App into #root.
- src/App.jsx must implement the product as a real single-page experience.
- Do not import remote images, fonts, or external CSS frameworks.
- Total output should stay under 50 KB.`;
}

function missingRequiredFiles(files) {
  const present = new Set(files.map(file => file.path.trim()));
  return ['package.json', 'vite.config.js', 'index.html', 'src/main.jsx', 'src/App.jsx', 'src/index.css']
    .filter(path => !present.has(path));
}

function statusExtras(error) {
  const extras = {};
  if (typeof error?.status === 'number') extras.status = error.status;
  if (typeof error?.details === 'string') extras.details = error.details.slice(0, 600);
  return extras;
}

export function safeJson(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  try { return JSON.parse(body); } catch { /* recover below */ }
  const match = body.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { return null; } }
  return null;
}

export const __internals = Object.freeze({
  buildGeneratePrompt,
  buildPatchPrompt,
  callOpenAIJson,
  missingRequiredFiles,
});
