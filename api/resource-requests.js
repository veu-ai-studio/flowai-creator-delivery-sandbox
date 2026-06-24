const TABLE = 'generated_product_records';
const PROJECT_ID = process.env.FLOWAI_GENERATED_PRODUCT_ID || 'community-resource-navigator';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function cleanText(value, max = 800) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function backendConfig() {
  const url = cleanText(process.env.FLOWAI_GENERATED_SUPABASE_URL || process.env.SUPABASE_URL, 300).replace(/\/$/, '');
  const serviceKey = cleanText(process.env.FLOWAI_GENERATED_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, 2000);
  return { url, serviceKey };
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

async function supabaseFetch(path, init = {}) {
  const config = backendConfig();
  if (!config.url || !config.serviceKey) {
    const error = new Error('Generated product persistence is not configured.');
    error.code = 'PERSISTENCE_NOT_CONFIGURED';
    throw error;
  }
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 300) }; }
  if (!response.ok) {
    const error = new Error(body?.message || body?.raw || `Supabase request failed with ${response.status}`);
    error.code = 'PERSISTENCE_UPSTREAM_FAILED';
    error.status = response.status;
    throw error;
  }
  return body;
}

function recommendationFor(need, category) {
  const normalized = cleanText(need, 1200).toLowerCase();
  const selected = cleanText(category, 80) || 'housing';
  if (normalized.includes('food') || normalized.includes('meal') || selected === 'food') {
    return {
      label: 'Food',
      nextStep: 'Visit the nearest food pantry intake desk this week and bring an ID plus proof of household size if available.',
      followUp: 'Ask about mobile pantry routes if transportation is difficult.',
    };
  }
  if (normalized.includes('clinic') || normalized.includes('medicine') || normalized.includes('health') || selected === 'health') {
    return {
      label: 'Health',
      nextStep: 'Contact a community health center and request a sliding-scale appointment or benefits navigator intake.',
      followUp: 'Ask about same-day pharmacy assistance if medication is urgent.',
    };
  }
  if (normalized.includes('job') || normalized.includes('work') || selected === 'work') {
    return {
      label: 'Work',
      nextStep: 'Book a workforce center intake and ask for resume review, transportation support, and training eligibility in the same visit.',
      followUp: 'Ask for rapid placement employers if income is urgent.',
    };
  }
  return {
    label: 'Housing',
    nextStep: 'Call 211 and ask for emergency rental assistance, then collect your lease, notice, and proof of income before the appointment.',
    followUp: 'Ask for same-day legal aid screening if eviction is mentioned.',
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return json(res, 200, { ok: true });
  try {
    if (req.method === 'GET') {
      const rows = await supabaseFetch(`${TABLE}?project_id=eq.${encodeURIComponent(PROJECT_ID)}&record_type=eq.resource_request&select=id,payload,created_at&order=created_at.desc&limit=20`, {
        method: 'GET',
      });
      return json(res, 200, { ok: true, projectId: PROJECT_ID, records: Array.isArray(rows) ? rows : [] });
    }
    if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method_not_allowed' });
    const body = await readBody(req);
    const need = cleanText(body.need, 1200);
    const category = cleanText(body.category, 80);
    if (!need) return json(res, 400, { ok: false, error: 'need_required' });
    const recommendation = recommendationFor(need, category);
    const payload = {
      need,
      category,
      recommendation,
      proofMarker: 'FlowAI M4 Creator Type 2 persistence-backed',
    };
    const inserted = await supabaseFetch(TABLE, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify([{
        project_id: PROJECT_ID,
        record_type: 'resource_request',
        payload,
        source: 'flowai-generated-product',
      }]),
    });
    return json(res, 200, { ok: true, projectId: PROJECT_ID, record: Array.isArray(inserted) ? inserted[0] : inserted });
  } catch (error) {
    return json(res, error?.code === 'PERSISTENCE_NOT_CONFIGURED' ? 503 : 502, {
      ok: false,
      error: error?.code || 'PERSISTENCE_FAILED',
      message: String(error?.message || error).slice(0, 300),
    });
  }
}
