// Vercel serverless function: proxies a prompt to the Anthropic Claude API.
//
// How it works:
//   1. The frontend (or curl) sends a POST request to /api/test-claude
//      with a JSON body like: { "prompt": "Hello, Claude" }
//   2. This function forwards that prompt to Anthropic's Messages API,
//      using the ANTHROPIC_API_KEY stored as a Vercel environment variable.
//   3. Anthropic responds with Claude's reply; we extract the text and
//      return it as JSON: { "text": "Hi there!" }

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 500;

// Allow the frontend (running on the same domain as this function) to call us.
// We echo the caller's Origin header back instead of using "*" — that way
// the response is valid for whichever Vercel preview or production URL the
// request came from, without us having to hardcode a domain.
function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  // Browsers send a preflight OPTIONS request before any POST with a JSON
  // body. We respond "204 No Content" to say "yes, you may proceed".
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Vercel automatically parses JSON request bodies for us.
  const { prompt } = req.body || {};
  if (typeof prompt !== 'string' || !prompt.trim()) {
    return res
      .status(400)
      .json({ error: 'Body must include a non-empty "prompt" string.' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
  }

  try {
    // Call Anthropic's Messages API. The three required headers are:
    //   x-api-key:          your secret key (never sent to the browser)
    //   anthropic-version:  pins the API version so behavior is stable
    //   content-type:       tells Anthropic we're sending JSON
    const upstream = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const details = await upstream.text();
      return res.status(500).json({
        error: 'Anthropic API request failed.',
        status: upstream.status,
        details,
      });
    }

    const data = await upstream.json();

    // Anthropic returns content as an array of "blocks". For a plain text
    // reply there is usually one block of type "text" — but we join all
    // text blocks defensively in case there's more than one.
    const text = (data.content || [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return res.status(200).json({
      text,
      usage: data.usage,
      stop_reason: data.stop_reason,
    });
  } catch (err) {
    return res.status(500).json({
      error: 'Unexpected error calling Anthropic API.',
      details: err?.message ?? String(err),
    });
  }
}
