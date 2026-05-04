/**
 * Live Webhook Handler
 * Receives external webhooks (GitHub, Vercel, custom) and routes them to pipeline actions.
 * No auth required for inbound webhooks — validated via secret header.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') || 'flowai-webhook-secret';

function parseSource(req) {
  const ua = req.headers.get('user-agent') || '';
  const event = req.headers.get('x-github-event') || req.headers.get('x-vercel-signature') ? 'vercel' : null;
  if (event === 'vercel') return 'vercel';
  if (ua.includes('GitHub')) return 'github';
  return 'custom';
}

Deno.serve(async (req) => {
  try {
    // Validate secret
    const secret = req.headers.get('x-webhook-secret') || req.headers.get('x-flowai-secret');
    if (secret !== WEBHOOK_SECRET) {
      return Response.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const source = parseSource(req);
    const eventType = body.event || body.action || req.headers.get('x-github-event') || 'unknown';

    // Log the webhook event as an ErrorLog (reusing for event tracking)
    await base44.asServiceRole.entities.ErrorLog.create({
      source: `webhook:${source}`,
      message: `Webhook received: ${eventType}`,
      context: {
        source,
        event_type: eventType,
        payload_keys: Object.keys(body),
        ref: body.ref,
        repository: body.repository?.full_name,
        deployment: body.deployment?.url,
        ts: new Date().toISOString(),
      },
      severity: 'low',
    });

    // Route based on source + event
    let action = null;

    if (source === 'github') {
      if (eventType === 'push') {
        action = { type: 'trigger_pipeline', reason: `Push to ${body.ref}`, repo: body.repository?.full_name };
      } else if (eventType === 'pull_request' && body.action === 'opened') {
        action = { type: 'run_qa', reason: 'PR opened', pr_url: body.pull_request?.html_url };
      } else if (eventType === 'deployment_status') {
        action = { type: 'log_deployment', status: body.deployment_status?.state, env: body.deployment_status?.environment };
      }
    }

    if (source === 'vercel') {
      action = { type: 'log_deployment', status: body.type, url: body.deployment?.url };
    }

    if (source === 'custom') {
      action = { type: body.action || 'log', data: body.data };
    }

    // If it's a pipeline trigger, create a job
    if (action?.type === 'trigger_pipeline') {
      await base44.asServiceRole.entities.Job.create({
        user_email: body.pusher?.email || 'webhook@flowai',
        type: 'pipeline',
        status: 'queued',
        payload: { source, event_type: eventType, ...action },
      });
    }

    return Response.json({ received: true, source, event_type: eventType, action });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});