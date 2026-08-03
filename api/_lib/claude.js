// Shared helper for calling the Anthropic Messages API.
//
// All FlowAI serverless endpoints use this helper so model selection,
// timeouts, error handling, and CORS are consistent.

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const SONNET = 'claude-sonnet-4-6';
const OPUS = 'claude-opus-4-7';
const DEFAULT_TIMEOUT_MS = 60000;

export function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// Pick model: opus only if caller explicitly requests it. Sonnet is the default
// because every endpoint in this project is short-form analysis.
export function pickModel(complexity = 'routine') {
  return complexity === 'complex' ? OPUS : SONNET;
}

export async function callClaude({
  prompt,
  systemPrompt = null,
  maxTokens = 1000,
  complexity = 'routine',
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured on the server.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model: pickModel(complexity),
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    };
    if (systemPrompt) body.system = systemPrompt;

    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const details = await upstream.text();
      const err = /** @type {any} */ (new Error(`Anthropic returned ${upstream.status}`));
      err.status = upstream.status;
      err.details = details;
      throw err;
    }

    const data = await upstream.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      model: body.model,
      usage: data.usage,
      stop_reason: data.stop_reason,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// Lightweight HTML → text extractor — strips tags, decodes a few entities,
// pulls out title/meta/h1-h3, and caps body to ~50k chars (raised from
// 12k under Defect A 2026-05-16: at 12k the scoring/analysis steps were
// running on a truncated DOM, marking products "incomplete content" when
// the real SPA had finished rendering. 50k holds the full visible text of
// every observed real SPA; Claude's context window handles it comfortably).
export function extractTextFromHtml(html, sourceUrl = '') {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? decode(titleMatch[1]).trim() : '';

  const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  const metaDescription = metaMatch ? decode(metaMatch[1]).trim() : '';

  const headings = [];
  const headingRe = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = headingRe.exec(html)) !== null && headings.length < 30) {
    const text = stripTags(m[2]).trim();
    if (text) headings.push({ tag: m[1].toLowerCase(), text: decode(text).slice(0, 200) });
  }

  // Strip script/style blocks before extracting body text
  const scrubbed = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  const bodyText = decode(stripTags(scrubbed))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50000);

  return { url: sourceUrl, title, metaDescription, headings, bodyText };
}

function stripTags(s) { return s.replace(/<[^>]+>/g, ' '); }
function decode(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

export async function fetchUrlAsText(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; FlowAI/1.0; +https://flowai-dun.vercel.app)',
        'accept': 'text/html,application/xhtml+xml',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!r.ok) {
      return { ok: false, status: r.status, reason: `HTTP ${r.status}` };
    }
    const html = await r.text();
    return { ok: true, html, status: r.status };
  } catch (e) {
    return { ok: false, reason: e.name === 'AbortError' ? 'Fetch timed out' : (e.message || String(e)) };
  } finally {
    clearTimeout(t);
  }
}
