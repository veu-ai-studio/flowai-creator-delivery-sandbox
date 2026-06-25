'use strict';

import { memberOk, memberError } from './member.js';
import {
  buildExternalResearchPrompt,
  normalizeResearchRecoveryToCrawlerReport,
} from '../forge/researchRecoveryAdapters.js';

export const id = 'perplexity';
export const displayName = 'Perplexity Research via OpenRouter';
export const capabilities = Object.freeze(['crawl', 'analyze']);
export const wired = true;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'perplexity/sonar';

export async function invoke(action, payload = {}) {
  if (action === 'crawl') return crawl(payload);
  if (action === 'analyze') return analyze(payload);
  return memberError(id, action, `unsupported action "${action}"`);
}

function envFor(payload = {}) {
  return payload.env && typeof payload.env === 'object' ? payload.env : process.env;
}

function safeJson(text) {
  if (typeof text !== 'string' || text.trim().length === 0) return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    if (first >= 0 && last > first) {
      try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { /* fall through */ }
    }
    return null;
  }
}

async function callOpenRouter({ prompt, payload = {}, maxTokens = 1800 }) {
  const env = envFor(payload);
  const apiKey = env.OPENROUTER_API_KEY;
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return { ok: false, error: 'OPENROUTER_API_KEY missing' };
  }
  const fetchImpl = payload.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    return { ok: false, error: 'fetch unavailable' };
  }
  const model = env.OPENROUTER_PERPLEXITY_MODEL || DEFAULT_MODEL;
  let response;
  try {
    response = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'http-referer': env.FLOWAI_PUBLIC_URL || 'https://flowai-dun.vercel.app',
        'x-title': 'FlowAI Research Recovery',
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content: 'You are FlowAI research recovery. Return grounded, strict JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });
  } catch (error) {
    return { ok: false, error: error?.message ?? String(error), model };
  }
  const status = Number(response?.status ?? 0);
  const bodyText = await response.text().catch(() => '');
  if (!response.ok) {
    return {
      ok: false,
      status,
      error: `OpenRouter HTTP ${status}`,
      rawText: bodyText.slice(0, 600),
      model,
    };
  }
  const envelope = safeJson(bodyText);
  const content = envelope?.choices?.[0]?.message?.content;
  const parsed = safeJson(content);
  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      error: 'OpenRouter response did not include strict JSON content',
      rawText: String(content ?? bodyText).slice(0, 600),
      model,
    };
  }
  return {
    ok: true,
    model,
    data: parsed,
    usage: envelope?.usage ?? null,
  };
}

async function crawl(payload = {}) {
  const url = typeof payload.url === 'string' ? payload.url.trim() : '';
  if (!url) return memberError(id, 'crawl', 'url required');
  const called = await callOpenRouter({
    payload,
    prompt: buildExternalResearchPrompt({ url, purpose: 'recover crawl evidence for GTM scoring' }),
    maxTokens: payload.maxTokens ?? 1800,
  });
  if (!called.ok) return memberError(id, 'crawl', called.error, called);
  const normalized = normalizeResearchRecoveryToCrawlerReport(called.data, { url }, {
    member: id,
    model: called.model,
    usage: called.usage,
    evidenceRef: called.data?.evidenceRef,
  });
  if (!normalized.ok) return memberError(id, 'crawl', 'Perplexity recovery returned no usable page evidence');
  return memberOk(id, 'crawl', normalized);
}

async function analyze(payload = {}) {
  const prompt = typeof payload.prompt === 'string' ? payload.prompt.trim() : '';
  if (!prompt) return memberError(id, 'analyze', 'prompt required');
  const called = await callOpenRouter({
    payload,
    prompt: `${prompt}\n\nReturn STRICT JSON only: {"summary":"...","findings":["..."],"evidenceRef":"..."}.`,
    maxTokens: payload.maxTokens ?? 1200,
  });
  if (!called.ok) return memberError(id, 'analyze', called.error, called);
  const findings = Array.isArray(called.data?.findings)
    ? called.data.findings.map((item) => typeof item === 'string' ? item : JSON.stringify(item)).filter(Boolean)
    : [];
  const summary = typeof called.data?.summary === 'string' ? called.data.summary.trim() : '';
  if (!summary || findings.length === 0) {
    return memberError(id, 'analyze', 'Perplexity response did not include non-empty analysis schema');
  }
  return memberOk(id, 'analyze', {
    summary,
    findings,
    evidenceRef: typeof called.data?.evidenceRef === 'string' ? called.data.evidenceRef : 'perplexity-openrouter-analysis',
    model: called.model,
    usage: called.usage,
  });
}
