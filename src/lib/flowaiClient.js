// FlowAI client — single shared module that calls our Vercel /api endpoints
// and provides localStorage-backed fallbacks for entities the original code
// expected to reach via the Base44 SDK.
//
// This lets the app work end-to-end on Vercel + Anthropic only, with no
// Base44 backend.

const API = ''; // same origin

// ─── Claude-backed endpoints ────────────────────────────────────────────────

export async function researchUrl(url, { objective } = {}) {
  const r = await fetch(`${API}/api/research-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, objective }),
  });
  return r.json();
}

export async function fetchUrl(url) {
  const r = await fetch(`${API}/api/fetch-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  return r.json();
}

export async function auditProduct(url, { auditType, pageContent } = {}) {
  const r = await fetch(`${API}/api/audit-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, auditType, pageContent }),
  });
  return r.json();
}

export async function describeProduct({ description, productName, audience, features } = {}) {
  const r = await fetch(`${API}/api/describe-product`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description, productName, audience, features }),
  });
  return r.json();
}

export async function llmStep(prompt, { complexity = 'routine', maxTokens = 1500 } = {}) {
  const r = await fetch(`${API}/api/llm-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, complexity, maxTokens }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.details || err.error || `llm-step ${r.status}`);
  }
  return r.json();
}

// ─── Local session persistence (localStorage) ──────────────────────────────
//
// Sessions, products, and audit logs all live in localStorage so the user can
// browse history without a database. Keys are namespaced under "flowai_*".

const SESSIONS_KEY = 'flowai_sessions';
const PRODUCTS_KEY = 'flowai_products';

function readArray(key) {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}
function writeArray(key, arr) {
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch {}
}

function newId() {
  return 's_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// ── Sessions ──
export function listSessions() {
  return readArray(SESSIONS_KEY).sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0));
}

export function getSession(id) {
  return readArray(SESSIONS_KEY).find((s) => s.id === id) || null;
}

export function createSession({ inputs, objective, mode, multiMode, autoParams }) {
  const session = {
    id: newId(),
    startedAt: Date.now(),
    completedAt: null,
    status: 'running',
    inputs,
    objective,
    mode,
    multiMode,
    autoParams,
    currentStep: 0,
    stepResults: {},
  };
  const all = readArray(SESSIONS_KEY);
  all.push(session);
  writeArray(SESSIONS_KEY, all);
  return session;
}

export function updateSession(id, patch) {
  const all = readArray(SESSIONS_KEY);
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  all[idx] = { ...all[idx], ...patch };
  writeArray(SESSIONS_KEY, all);
  return all[idx];
}

export function recordStepResult(sessionId, stepKey, result) {
  const all = readArray(SESSIONS_KEY);
  const idx = all.findIndex((s) => s.id === sessionId);
  if (idx === -1) return null;
  const session = all[idx];
  session.stepResults = session.stepResults || {};
  session.stepResults[stepKey] = {
    summary: (result?.summary || '').slice(0, 240),
    full_output: (result?.full_output || '').slice(0, 16000),
    completedAt: Date.now(),
  };
  writeArray(SESSIONS_KEY, all);
  return session;
}

export function deleteSession(id) {
  const all = readArray(SESSIONS_KEY).filter((s) => s.id !== id);
  writeArray(SESSIONS_KEY, all);
}

// ── Products (replaces base44 CreatedProduct) ──
export function listProducts() {
  return readArray(PRODUCTS_KEY).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

export function createProduct({ product_name, base44_url, description }) {
  const product = {
    id: newId(),
    product_name,
    base44_url: base44_url || '',
    description: description || '',
    createdAt: Date.now(),
    created_date: new Date().toISOString(),
  };
  const all = readArray(PRODUCTS_KEY);
  all.push(product);
  writeArray(PRODUCTS_KEY, all);
  return product;
}

export function deleteProduct(id) {
  const all = readArray(PRODUCTS_KEY).filter((p) => p.id !== id);
  writeArray(PRODUCTS_KEY, all);
}
