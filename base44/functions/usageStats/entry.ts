/**
 * Billing — Usage stats and plan enforcement
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLAN_LIMITS = {
  free: { run: 10, deploy: 2, audit: 5, research: 5, build: 3 },
  pro: { run: 999, deploy: 50, audit: 999, research: 999, build: 999 },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { check_action } = body;

    const plan = user.plan || 'free';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

    // Get this month's usage
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const records = await base44.asServiceRole.entities.UsageRecord.filter({ user_email: user.email });
    const thisMonth = records.filter(r => r.created_date >= monthStart);

    const usage = {};
    for (const action of Object.keys(limits)) {
      usage[action] = thisMonth.filter(r => r.action === action).length;
    }

    // Check if a specific action is allowed
    let allowed = true;
    let reason = null;
    if (check_action) {
      const used = usage[check_action] || 0;
      const limit = limits[check_action] || 0;
      allowed = used < limit;
      if (!allowed) reason = `${check_action} limit reached (${used}/${limit}) on ${plan} plan. Upgrade to Pro.`;
    }

    return Response.json({
      plan,
      usage,
      limits,
      allowed,
      reason,
      upgrade_url: 'https://flowai.base44.app/upgrade',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});