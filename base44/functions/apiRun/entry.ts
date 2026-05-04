/**
 * API Gateway — /api/run
 * Queues a job and records a Run entry. Returns job_id for polling.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { type, input, project_id } = body;

    if (!type || !input) {
      return Response.json({ error: 'Missing required fields: type, input' }, { status: 400 });
    }

    // Record usage
    await base44.asServiceRole.entities.UsageRecord.create({
      user_email: user.email,
      action: type === 'qa_audit' ? 'audit' : type,
      plan: user.plan || 'free',
    });

    // Create the Run record
    const run = await base44.asServiceRole.entities.Run.create({
      user_email: user.email,
      project_id: project_id || null,
      type,
      status: 'queued',
      input: String(input).slice(0, 500),
    });

    // Create a Job for async processing
    const job = await base44.asServiceRole.entities.Job.create({
      user_email: user.email,
      type: type === 'qa_audit' ? 'qa' : type,
      status: 'queued',
      payload: { run_id: run.id, input, project_id },
      progress: 0,
    });

    // Link job to run
    await base44.asServiceRole.entities.Run.update(run.id, { job_id: job.id, status: 'running' });
    await base44.asServiceRole.entities.Job.update(job.id, { status: 'running', started_at: new Date().toISOString() });

    return Response.json({ run_id: run.id, job_id: job.id, status: 'queued' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});