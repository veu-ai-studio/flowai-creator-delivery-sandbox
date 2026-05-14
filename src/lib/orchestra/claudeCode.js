// src/lib/orchestra/claudeCode.js
//
// Claude Code adapter — the CANONICAL Orchestra member.
//
// Backed by the Anthropic Messages API (api/_lib/claude.js's callClaude).
// Provides code-generation prompting for two flagship actions:
//
//   - "code-patch"           → applies a textual patch to one source file
//   - "generate-from-scratch"→ produces a complete Vite-React project tree
//
// Both actions are pure-prompt: the adapter constructs a deterministic
// prompt, invokes Claude, parses the JSON response, validates the
// payload shape, and returns it.  All disk / git / npm / Vercel work
// is done OUTSIDE this module by the remediation engine.

import { memberOk, memberError } from './member.js';

export const id = 'claude-code';
export const displayName = 'Claude Code (Anthropic API direct)';
export const capabilities = Object.freeze(['code-patch', 'generate-from-scratch']);
export const wired = true;

/**
 * Public invoke entrypoint.  Server-side only — relies on
 * api/_lib/claude.js#callClaude which reads ANTHROPIC_API_KEY from env.
 *
 * @param {string} action
 * @param {object} payload
 * @returns {Promise<import('./member.js').MemberResult>}
 */
export async function invoke(action, payload) {
  if (action === 'code-patch') return codePatch(payload);
  if (action === 'generate-from-scratch') return generateFromScratch(payload);
  return memberError(id, action, `unsupported action "${action}"`);
}

// ─── code-patch ──────────────────────────────────────────────────────

async function codePatch(payload) {
  const { filePath, sourceContent, issueSpec, framework } = payload || {};
  if (typeof filePath !== 'string' || !filePath) return memberError(id, 'code-patch', 'filePath required');
  if (typeof sourceContent !== 'string')           return memberError(id, 'code-patch', 'sourceContent required');
  if (!issueSpec || typeof issueSpec !== 'object') return memberError(id, 'code-patch', 'issueSpec required');

  const { callClaude } = await import('../../../api/_lib/claude.js');
  const prompt = buildPatchPrompt({ filePath, sourceContent, issueSpec, framework });
  let response;
  try {
    response = await callClaude({ prompt, maxTokens: 4000, complexity: 'routine' });
  } catch (e) {
    return memberError(id, 'code-patch', e.message || String(e));
  }
  const parsed = safeJson(response.text);
  if (!parsed || typeof parsed.patchedContent !== 'string') {
    return memberError(id, 'code-patch', 'Claude response did not include patchedContent', { rawText: (response.text || '').slice(0, 600) });
  }
  return memberOk(id, 'code-patch', {
    filePath,
    patchedContent: parsed.patchedContent,
    rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
    model: response.model,
    usage: response.usage,
  });
}

function buildPatchPrompt({ filePath, sourceContent, issueSpec, framework }) {
  return `You are a precise code-patch engine.  Apply the smallest possible edit to the source file below that resolves the issue.

Framework: ${framework || 'unknown'}
File path: ${filePath}
Issue: ${issueSpec.category || '(unspecified)'}  severity=${issueSpec.severity || 'medium'}
Issue evidence: ${issueSpec.evidence || '(none)'}
Fix spec: ${JSON.stringify(issueSpec.fixSpec || {})}

Current file content:
${'```'}
${sourceContent}
${'```'}

Return EXACTLY this JSON shape — no markdown fences, no commentary:
{
  "patchedContent": "<full updated file content, ready to be written back to disk>",
  "rationale": "<one or two sentences describing what you changed and why>"
}

Rules:
- Preserve ALL surrounding code unchanged.  Apply the smallest patch that resolves the issue.
- Do NOT introduce new imports unless required by the fix.
- Do NOT alter formatting or whitespace outside the patched region.
- patchedContent MUST be the complete file content (not a diff), so the caller can write it back directly.
- If the issue is not addressable by editing this file, set patchedContent to the original sourceContent verbatim and explain why in rationale.`;
}

// ─── generate-from-scratch ───────────────────────────────────────────

async function generateFromScratch(payload) {
  const { spec, framework } = payload || {};
  if (!spec || typeof spec !== 'object') return memberError(id, 'generate-from-scratch', 'spec required');
  const fw = framework || 'vite-react';
  if (fw !== 'vite-react') return memberError(id, 'generate-from-scratch', `framework "${fw}" not supported; only "vite-react" is wired`);

  const { callClaude } = await import('../../../api/_lib/claude.js');
  const prompt = buildGeneratePrompt({ spec });
  let response;
  try {
    response = await callClaude({ prompt, maxTokens: 6000, complexity: 'complex' });
  } catch (e) {
    return memberError(id, 'generate-from-scratch', e.message || String(e));
  }
  const parsed = safeJson(response.text);
  // Resilience: when Claude returns no parseable JSON or no files[],
  // fall back to the hardcoded Vite-React skeleton seeded from the
  // spec.  This guarantees generate-from-scratch ALWAYS produces a
  // buildable project — silent generator misfires never block the
  // pipeline.  The rationale string surfaces the fallback so the UI /
  // smoke can detect it.
  let rawFiles = [];
  let usedFallback = false;
  if (parsed && Array.isArray(parsed.files)) {
    rawFiles = parsed.files
      .filter((f) => f && typeof f.path === 'string' && typeof f.content === 'string')
      .map((f) => ({ path: f.path.trim(), content: f.content }));
  } else {
    usedFallback = true;
  }
  // Apply hardening: ensure required files are present.  When rawFiles is
  // empty (Claude returned no files), ensureRequiredFiles seeds the
  // entire skeleton from the spec.
  const finalFiles = ensureRequiredFiles(rawFiles, spec);

  return memberOk(id, 'generate-from-scratch', {
    files: finalFiles,
    framework: fw,
    rationale: usedFallback
      ? 'Claude response was not parseable; falling back to hardcoded Vite-React skeleton seeded from spec.'
      : (typeof parsed.rationale === 'string' ? parsed.rationale : ''),
    fallbackUsed: usedFallback,
    model: response.model,
    usage: response.usage,
  });
}

function buildGeneratePrompt({ spec }) {
  return `You are a Vite-React project generator.  Produce a COMPLETE, BUILDABLE Vite + React 18 project that implements the spec below.

Spec:
- Product name: ${spec.productName || '(derive from concept)'}
- Concept: ${spec.productConcept || '(none)'}
- Target users: ${spec.targetUsers || '(none)'}
- Core claims: ${JSON.stringify(spec.coreClaims || [])}
- Detected features: ${JSON.stringify(spec.detectedFeatures || [])}
- Issues to resolve: ${JSON.stringify(spec.issuesToResolve || [])}
- Optional source contributions (multi-URL synthesis): ${JSON.stringify(spec.sourceContributions || [])}

Return EXACTLY this JSON shape — no markdown fences, no commentary:
{
  "files": [
    { "path": "package.json", "content": "..." },
    { "path": "vite.config.js", "content": "..." },
    { "path": "index.html", "content": "..." },
    { "path": "src/main.jsx", "content": "..." },
    { "path": "src/App.jsx", "content": "..." },
    { "path": "src/index.css", "content": "..." }
  ],
  "rationale": "<one short paragraph describing the layout / sections you produced>"
}

CRITICAL RULES:
- package.json MUST list "vite": "^5", "react": "^18", "react-dom": "^18" in dependencies (or devDependencies for vite), and define { "scripts": { "build": "vite build" } }.
- vite.config.js MUST import "@vitejs/plugin-react" (add it to devDependencies) and export default defineConfig({ plugins: [react()] }).
- index.html MUST reference /src/main.jsx as a module: <script type="module" src="/src/main.jsx"></script>.
- src/main.jsx MUST createRoot the App component into #root.
- src/App.jsx MUST render a single-page marketing landing page implementing the spec — hero, features section, CTA, footer with privacy/terms links.
- DO NOT use Tailwind, shadcn, or any external CSS framework — keep styling inline or via src/index.css to avoid extra dependencies.
- DO NOT import images or fonts from external URLs.
- DO NOT include any product name from the seed phrase "saigedemo, pressai, reltwin, smscommunities, mybirthsafe, SAIGE".
- Total bytes of all files combined should be under 50 KB.
- The project MUST build cleanly with "npm install && npm run build".`;
}

function ensureRequiredFiles(files, spec) {
  const map = new Map(files.map((f) => [f.path, f.content]));
  const productName = sanitizeName(spec.productName || spec.productConcept || 'flowai-renewed');

  if (!map.has('package.json')) {
    map.set('package.json', JSON.stringify({
      name: productName,
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: { build: 'vite build', dev: 'vite' },
      dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
      devDependencies: { vite: '^5.4.0', '@vitejs/plugin-react': '^4.3.0' },
    }, null, 2));
  }
  if (!map.has('vite.config.js')) {
    map.set('vite.config.js', `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\nexport default defineConfig({ plugins: [react()] });\n`);
  }
  if (!map.has('index.html')) {
    map.set('index.html', `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>${esc(spec.productName || 'Renewed by FlowAI')}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`);
  }
  if (!map.has('src/main.jsx')) {
    map.set('src/main.jsx', `import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App.jsx';\nimport './index.css';\ncreateRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);\n`);
  }
  if (!map.has('src/App.jsx')) {
    map.set('src/App.jsx', fallbackAppJsx(spec));
  }
  if (!map.has('src/index.css')) {
    map.set('src/index.css', fallbackIndexCss());
  }
  return Array.from(map.entries()).map(([path, content]) => ({ path, content }));
}

function fallbackAppJsx(spec) {
  const concept = (spec.productConcept || 'A clearly described product').replace(/`/g, '\\`');
  const target = (spec.targetUsers || 'Specific users with a real need').replace(/`/g, '\\`');
  const features = (Array.isArray(spec.detectedFeatures) ? spec.detectedFeatures : []).slice(0, 6);
  return `import React from 'react';
export default function App() {
  return (
    <div className="page">
      <header className="banner">Renewed by FlowAI</header>
      <main>
        <section className="hero">
          <span className="badge">For ${target}</span>
          <h1>${concept}</h1>
          <p className="lead">Built to address the specific user need above.</p>
          <div className="cta-row">
            <a className="cta primary" href="#signup">Get started</a>
            <a className="cta secondary" href="#contact">Talk to us</a>
          </div>
        </section>
        ${features.length > 0 ? `<section className="features">
          <h2>What you get</h2>
          <div className="grid">${features.map((f) => `<div className="card"><h3>${f.replace(/`/g, '\\`')}</h3></div>`).join('')}</div>
        </section>` : ''}
        <section id="signup" className="signup">
          <h2>Ready to try it?</h2>
          <a className="cta primary" href="#">Sign up free</a>
        </section>
      </main>
      <footer>
        <p>© ${new Date().getFullYear()} — Built by FlowAI.</p>
        <p><a href="#privacy">Privacy policy</a> · <a href="#terms">Terms of use</a></p>
      </footer>
    </div>
  );
}
`;
}

function fallbackIndexCss() {
  return `:root { color-scheme: light dark; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, system-ui, sans-serif; line-height: 1.5; color: #0f172a; background: #f8fafc; }
@media (prefers-color-scheme: dark) { body { color: #e2e8f0; background: #0f172a; } .card { background: #1e293b; } }
.banner { background: #1d4ed8; color: white; padding: 12px 24px; font-size: 13px; }
.page { max-width: 960px; margin: 0 auto; padding: 24px; }
.hero { padding: 64px 16px; text-align: center; }
.hero h1 { font-size: 44px; margin: 16px 0; }
.badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #dbeafe; color: #1e40af; font-size: 13px; font-weight: 600; }
.lead { font-size: 18px; max-width: 600px; margin: 0 auto 24px; opacity: 0.86; }
.cta-row { display: flex; gap: 12px; justify-content: center; }
.cta { display: inline-block; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; }
.cta.primary { background: #1d4ed8; color: white; }
.cta.secondary { border: 2px solid #1d4ed8; color: #1d4ed8; }
.features { margin: 48px 0; }
.features h2, .signup h2 { font-size: 28px; margin-bottom: 16px; text-align: center; }
.grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.card { background: white; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
.card h3 { font-size: 16px; }
.signup { text-align: center; margin: 64px 0; }
footer { text-align: center; padding: 24px; border-top: 1px solid #e2e8f0; font-size: 12px; opacity: 0.7; }
footer a { color: inherit; }
`;
}

function sanitizeName(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 64) || 'flowai-renewed';
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Tolerant JSON parser: strips ```json fences, recovers a {...} block.
export function safeJson(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  try { return JSON.parse(body); } catch { /* fall through */ }
  const match = body.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { return null; } }
  return null;
}

export const __internals = Object.freeze({
  ensureRequiredFiles,
  sanitizeName,
  buildGeneratePrompt,
  buildPatchPrompt,
});
