// Voyage AI embeddings helper.
//
// Env:
//   VOYAGE_API_KEY      — Voyage AI key
//   VOYAGE_MODEL        — default 'voyage-3-lite' (1024 dims). Match this to
//                         the vector(N) column dimension in supabase migration.
//
// Today: no key set → embedText/embedBatch return null and similaritySearch
// gracefully degrades to a string-match fallback so callers never crash.
//
// Schema: embedding columns are already on products, run_steps, and
// clearance_checks (see 0001_initial.sql). Population is deferred to a future
// background job.

// Voyage SDK is lazy-loaded so importing this module doesn't pay the cost
// (or risk a crash) at cold start when VOYAGE_API_KEY isn't set.

const DEFAULT_MODEL = 'voyage-3-lite';

let cached = null;
let loadFailed = false;

async function getClient() {
  if (cached) return cached;
  if (loadFailed) return null;
  if (!process.env.VOYAGE_API_KEY) return null;
  try {
    const mod = await import('voyageai');
    const Client = mod.VoyageAIClient || mod.default || mod;
    cached = new Client({ apiKey: process.env.VOYAGE_API_KEY });
    return cached;
  } catch (e) {
    loadFailed = true;
    console.warn('[embeddings] failed to load voyageai:', e.message);
    return null;
  }
}

export function isEmbeddingsConfigured() {
  return Boolean(process.env.VOYAGE_API_KEY);
}

export function embeddingDimensions() {
  // voyage-3-lite returns 1024d. If a future model has different dims, the
  // migration's vector(1024) needs to change — keep this constant in sync.
  const model = (process.env.VOYAGE_MODEL || DEFAULT_MODEL).toLowerCase();
  if (model.includes('voyage-3-lite')) return 1024;
  if (model.includes('voyage-3-large')) return 1024;
  if (model.includes('voyage-large-2')) return 1536;
  return 1024;
}

// Returns Float32 vector of length `embeddingDimensions()`, or null if disabled.
export async function embedText(text, { inputType = 'document' } = {}) {
  const client = await getClient();
  if (!client) return null;
  if (!text || !String(text).trim()) return null;
  try {
    const result = await client.embed({
      input: [String(text).slice(0, 32000)],
      model: process.env.VOYAGE_MODEL || DEFAULT_MODEL,
      inputType, // 'document' for stored content, 'query' for similarity queries
    });
    return result?.data?.[0]?.embedding || null;
  } catch (e) {
    console.warn('[embeddings] embed failed:', e.message);
    return null;
  }
}

export async function embedBatch(texts = [], { inputType = 'document', batchSize = 64 } = {}) {
  const client = await getClient();
  if (!client) return texts.map(() => null);
  const out = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const slice = texts.slice(i, i + batchSize).map((t) => String(t || '').slice(0, 32000));
    try {
      const r = await client.embed({
        input: slice,
        model: process.env.VOYAGE_MODEL || DEFAULT_MODEL,
        inputType,
      });
      const vecs = (r?.data || []).map((d) => d.embedding || null);
      while (vecs.length < slice.length) vecs.push(null);
      out.push(...vecs);
    } catch (e) {
      console.warn('[embeddings] batch failed:', e.message);
      for (let j = 0; j < slice.length; j++) out.push(null);
    }
  }
  return out;
}

// Cosine similarity between two equal-length vectors.
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

// In-process similarity search across a small list. For Postgres-side ANN, the
// products / run_steps / clearance_checks tables already have ivfflat indexes
// — that path runs on Supabase and skips this helper.
export async function similaritySearch(query, items = [], { textField = 'text', topK = 10 } = {}) {
  if (!query || !items.length) return [];
  const client = await getClient();

  // Fallback: simple substring scoring when Voyage is unavailable.
  if (!client) {
    const q = String(query).toLowerCase();
    return items
      .map((it) => {
        const t = String(it[textField] || '').toLowerCase();
        const score = t.includes(q) ? 1 - Math.abs(t.length - q.length) / (t.length + q.length) : 0;
        return { item: it, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  // Embed the query and every item, then rank by cosine similarity.
  const qVec = await embedText(query, { inputType: 'query' });
  if (!qVec) return [];
  const itemVecs = await embedBatch(items.map((it) => it[textField] || ''), { inputType: 'document' });
  return items
    .map((it, i) => ({ item: it, score: cosine(qVec, itemVecs[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
