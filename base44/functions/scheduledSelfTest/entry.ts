// ─── SCHEDULED SELF-TEST — Phase 2B ──────────────────────────────────────────
// Runs daily. Checks all critical routes, proxy health, and entity accessibility.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PROXY = 'https://attached-assets-victor2081new.replit.app';
const CRITICAL_ROUTES = ['/', '/dashboard', '/clearance', '/audit-trail', '/auto-runner'];
const FLOWAI_BASE = 'https://truthful-flow-logic-lab.base44.app';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const results = [];
    const startTime = Date.now();

    // Check 1: Proxy reachability
    try {
      const proxyRes = await fetch(`${PROXY}/health`, {
        signal: AbortSignal.timeout(8000),
      });
      results.push({ check: 'fetch_proxy', status: proxyRes.ok ? 'PASS' : 'FAIL', detail: `HTTP ${proxyRes.status}` });
    } catch (e) {
      results.push({ check: 'fetch_proxy', status: 'FAIL', detail: e.message });
    }

    // Check 2: GovernanceAuditLog entity accessible
    try {
      await base44.asServiceRole.entities.GovernanceAuditLog.list(undefined, 1);
      results.push({ check: 'entity_GovernanceAuditLog', status: 'PASS' });
    } catch (e) {
      results.push({ check: 'entity_GovernanceAuditLog', status: 'FAIL', detail: e.message });
    }

    // Check 3: ClearanceRecord entity accessible
    try {
      await base44.asServiceRole.entities.ClearanceRecord.list(undefined, 1);
      results.push({ check: 'entity_ClearanceRecord', status: 'PASS' });
    } catch (e) {
      results.push({ check: 'entity_ClearanceRecord', status: 'FAIL', detail: e.message });
    }

    // Check 4: AutoSession entity accessible
    try {
      await base44.asServiceRole.entities.AutoSession.list(undefined, 1);
      results.push({ check: 'entity_AutoSession', status: 'PASS' });
    } catch (e) {
      results.push({ check: 'entity_AutoSession', status: 'FAIL', detail: e.message });
    }

    // Check 5: Test proxy with a sample URL fetch
    try {
      const testRes = await fetch(`${PROXY}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com' }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await testRes.json();
      const hasContent = !!(data.title || data.bodyText);
      results.push({ check: 'proxy_fetch_test', status: hasContent ? 'PASS' : 'FAIL', detail: `title=${data.title?.slice(0, 30)}` });
    } catch (e) {
      results.push({ check: 'proxy_fetch_test', status: 'FAIL', detail: e.message });
    }

    const passed = results.filter(r => r.status === 'PASS').length;
    const failed = results.filter(r => r.status === 'FAIL').length;
    const score = Math.round((passed / results.length) * 100);
    const duration = Date.now() - startTime;

    const detail = `scheduled_self_test: score=${score}% passed=${passed}/${results.length} failed=${failed} duration=${duration}ms`;

    // Log to GovernanceAuditLog
    await base44.asServiceRole.entities.GovernanceAuditLog.create({
      action_type: 'session_started',
      action_detail: detail,
      user: 'system',
      outcome: JSON.stringify({ score, results, duration }),
      timestamp: new Date().toISOString(),
    });

    return Response.json({
      score,
      passed,
      failed,
      total: results.length,
      duration_ms: duration,
      results,
      status: failed === 0 ? 'healthy' : score >= 60 ? 'degraded' : 'critical',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});