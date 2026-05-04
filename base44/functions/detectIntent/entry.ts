import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

async function fetchHTML(url, timeoutMs = 15000) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return await res.text();
  } catch (e) {
    console.warn(`[detectIntent] fetch error: ${e.message}`);
    return '';
  }
}

async function detectIntentWithLLM(html, url) {
  if (!OPENAI_API_KEY) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'system',
          content: `You are an expert product analyst. Analyze the given HTML and return a JSON object with:
{
  "productType": "saas|ai_tool|landing|marketplace|blog|internal_tool|ecommerce",
  "deliveryType": "web_app|mobile_app|desktop_app|api_only|website",
  "targetUser": "description of target user",
  "valueProposition": "main value proposition in 1-2 sentences",
  "features": ["list", "of", "key", "features"],
  "complexity": "simple|moderate|complex"
}`,
        }, {
          role: 'user',
          content: `URL: ${url}\n\nHTML (first 5000 chars):\n${html.slice(0, 5000)}`,
        }],
        temperature: 0.3,
        max_tokens: 800,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  } catch (e) {
    console.warn(`[detectIntent] LLM error: ${e.message}`);
    return null;
  }
}

function detectIntentRules(html) {
  const lower = html.toLowerCase();
  let productType = 'landing';
  let deliveryType = 'website';
  let confidence = 0;

  // Detect product type
  if ((lower.match(/dashboard|signup|login|auth|account|profile/g) || []).length >= 2 &&
      (lower.match(/features|pricing|plan/g) || []).length >= 2) {
    productType = 'saas';
    confidence = 0.8;
  } else if ((lower.match(/ai|machine learning|llm|model|input|output/g) || []).length >= 3) {
    productType = 'ai_tool';
    confidence = 0.7;
  } else if ((lower.match(/buy|sell|marketplace|listing|product|cart/g) || []).length >= 3) {
    productType = 'marketplace';
    confidence = 0.7;
  } else if ((lower.match(/shop|store|product|cart|checkout|payment/g) || []).length >= 3) {
    productType = 'ecommerce';
    confidence = 0.7;
  } else if ((lower.match(/blog|article|post|author|category|tag/g) || []).length >= 3) {
    productType = 'blog';
    confidence = 0.7;
  } else if ((lower.match(/portfolio|project|work|skill|resume/g) || []).length >= 3) {
    productType = 'portfolio';
    confidence = 0.6;
  } else if ((lower.match(/admin|dashboard|management|control panel/g) || []).length >= 2) {
    productType = 'internal_tool';
    confidence = 0.7;
  }

  // Detect delivery type
  if ((lower.match(/mobile|android|ios|iphone|responsive|touch|swipe/g) || []).length >= 2) {
    deliveryType = 'mobile_app';
  } else if ((lower.match(/electron|desktop|window|application/g) || []).length >= 2) {
    deliveryType = 'desktop_app';
  } else if ((lower.match(/api|endpoint|request|response|json|rest/g) || []).length >= 3 &&
             !lower.includes('html')) {
    deliveryType = 'api_only';
  } else if ((lower.match(/pages?|route|navigation|menu|sidebar/g) || []).length >= 2) {
    deliveryType = 'web_app';
  }

  return { productType, deliveryType, confidence };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { url } = body;
    if (!url) return Response.json({ error: 'url is required' }, { status: 400 });

    console.log(`[detectIntent] analyzing: ${url}`);

    const html = await fetchHTML(url);
    
    // Try LLM first
    let intent = await detectIntentWithLLM(html, url);
    
    // Fallback to rules
    if (!intent) {
      const rules = detectIntentRules(html);
      intent = {
        productType: rules.productType,
        deliveryType: rules.deliveryType,
        targetUser: 'Unknown (analysis failed)',
        valueProposition: 'Product value proposition unclear',
        features: [],
        complexity: 'moderate',
      };
    } else if (!intent.deliveryType) {
      // If LLM returns productType but not deliveryType, infer it
      const rules = detectIntentRules(html);
      intent.deliveryType = rules.deliveryType || 'web_app';
    }

    // Record metric
    await base44.asServiceRole.entities.ToolMetrics.create({
      tool_id: 'detectIntent',
      tool_name: 'Intent Detector',
      capability: 'reasoning',
      success: true,
      latency_ms: 0,
      cost_usd: 0.001,
      task_type: 'intent_detection',
      user_email: user.email,
    }).catch(() => {});

    console.log(`[detectIntent] detected ${intent.productType} (${intent.deliveryType}) — confidence: high`);
    return Response.json(intent);

  } catch (error) {
    console.error('[detectIntent] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});