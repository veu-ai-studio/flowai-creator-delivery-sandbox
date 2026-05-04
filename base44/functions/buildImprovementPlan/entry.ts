import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * buildImprovementPlan — Turn audit findings into structured improvement steps
 *
 * Takes audit results and generates a prioritized, actionable improvement plan.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { audit, intent } = body;
    if (!audit) return Response.json({ error: 'audit is required' }, { status: 400 });

    console.log(`[buildImprovementPlan] building plan for ${intent?.productType || 'unknown'}`);

    const plan = [];

    // Priority 1: Fix critical issues
    if (audit.summary?.critical > 0) {
      plan.push({
        priority: 1,
        category: 'Critical Issues',
        action: `Fix ${audit.summary.critical} critical issue${audit.summary.critical > 1 ? 's' : ''}`,
        details: audit.issues?.slice(0, 3).map(i => i.detail) || [],
      });
    }

    // Priority 2: Improve UX structure
    if (!audit.checks?.ui?.hasNav || !audit.checks?.ui?.hasFooter) {
      plan.push({
        priority: 2,
        category: 'UX Structure',
        action: 'Add missing navigation and footer',
        details: [
          audit.checks?.ui?.hasNav ? null : 'Add <nav> element with section links',
          audit.checks?.ui?.hasFooter ? null : 'Add <footer> with copyright and links',
        ].filter(Boolean),
      });
    }

    // Priority 3: Enhance value clarity
    if (!audit.checks?.ui?.hasH1 || (audit.checks?.ui?.textLength || 0) < 500) {
      plan.push({
        priority: 3,
        category: 'Value Clarity',
        action: 'Add clear headlines and content',
        details: [
          !audit.checks?.ui?.hasH1 ? 'Add prominent <h1> headline' : null,
          (audit.checks?.ui?.textLength || 0) < 500 ? 'Expand content with features, benefits, and pricing sections' : null,
        ].filter(Boolean),
      });
    }

    // Priority 4: Add missing core features based on product type
    if (intent) {
      const missing = [];
      if (intent.productType === 'saas' && !audit.checks?.ui?.hasForm) {
        missing.push('Add signup/login form');
      }
      if (intent.productType === 'ai_tool' && !audit.checks?.ui?.hasForm) {
        missing.push('Add input form for AI interaction');
      }
      if ((intent.productType === 'landing' || intent.productType === 'ecommerce') && !audit.checks?.ui?.hasForm) {
        missing.push('Add CTA button or contact form');
      }
      if (missing.length > 0) {
        plan.push({
          priority: 4,
          category: 'Feature Completeness',
          action: `Add missing ${intent.productType} features`,
          details: missing,
        });
      }
    }

    // Priority 5: Optimize conversion
    if (!audit.checks?.ui?.hasForm && !audit.checks?.api_get?.ok) {
      plan.push({
        priority: 5,
        category: 'Conversion & Performance',
        action: 'Add conversion flow and fix API endpoints',
        details: [
          !audit.checks?.ui?.hasForm ? 'Add contact/signup form' : null,
          !audit.checks?.api_get?.ok ? 'Ensure API endpoints are functional' : null,
        ].filter(Boolean),
      });
    }

    // Sort by priority
    plan.sort((a, b) => a.priority - b.priority);

    console.log(`[buildImprovementPlan] generated ${plan.length} improvement steps`);
    return Response.json({
      plan,
      totalSteps: plan.length,
      estimatedImpact: `${plan.length * 15}% expected score improvement`,
    });

  } catch (error) {
    console.error('[buildImprovementPlan] fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});