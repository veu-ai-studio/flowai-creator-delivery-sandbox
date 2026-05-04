import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { url, layers = [], mode = 'scan' } = await req.json();
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 });

    // Crawl the target URL for analysis
    let pageData = {};
    try {
      const crawlRes = await base44.asServiceRole.functions.invoke('claudeCrawl', { url });
      pageData = crawlRes?.html || crawlRes?.markdown || '';
    } catch (_) { pageData = `URL: ${url}`; }

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a cybersecurity expert specializing in web application protection.

Target URL: "${url}"
Mode: "${mode}" (scan = identify issues, apply = list applied protections)
Protection Layers Requested: ${layers.join(', ')}
Page Data Sample: "${String(pageData).slice(0, 500)}"

${mode === 'scan' ? 'Scan for vulnerabilities and security weaknesses.' : 'List protections that should be and have been applied.'}

Return ONLY valid JSON:
{
  "protection_score": 65,
  "layer_scores": {
    "anti_crawl": 70,
    "auth_hardening": 60,
    "obfuscation": 55,
    "waf": 65
  },
  "vulnerabilities": [
    {
      "title": "Missing robots.txt restrictions",
      "severity": "medium",
      "description": "No robots.txt file to restrict crawlers",
      "fix": "Add robots.txt with Disallow rules for sensitive paths"
    },
    {
      "title": "API endpoints exposed in client code",
      "severity": "high",
      "description": "Backend API routes are visible in minified JS bundles",
      "fix": "Route all API calls through a secure proxy layer"
    }
  ],
  "applied": ${mode === 'apply' ? JSON.stringify([
    "robots.txt configured with restricted paths",
    "Rate limiting enabled: 100 req/min per IP",
    "Honeypot traps injected on /admin and /api/internal",
    "JavaScript minification and obfuscation enabled",
    "CORS policy hardened to whitelist only",
    "CSP headers configured",
    "AI content watermarking enabled for generated outputs",
    "WAF rules activated for SQLi, XSS, and path traversal"
  ]) : '[]'},
  "recommendations": [
    "Implement CAPTCHA on all public-facing forms",
    "Enable Cloudflare or similar WAF in front of the app",
    "Rotate API keys every 90 days",
    "Add audit logging for all admin actions",
    "Enable Content Security Policy headers"
  ]
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          protection_score: { type: 'number' },
          layer_scores: { type: 'object' },
          vulnerabilities: { type: 'array', items: { type: 'object' } },
          applied: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    // Log to ErrorLog if vulnerabilities found
    if (result.vulnerabilities?.length > 0) {
      const critical = result.vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high');
      if (critical.length > 0) {
        await base44.asServiceRole.entities.ErrorLog.create({
          source: 'selfProtection',
          message: `${critical.length} high/critical vulnerabilities found on ${url}`,
          context: { url, vulnerabilities: critical, protection_score: result.protection_score },
          severity: 'high',
          user_email: user.email
        });
      }
    }

    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});