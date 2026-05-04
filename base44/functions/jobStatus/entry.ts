/**
 * Job Queue — Poll job status by job_id
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { job_id } = body;
    if (!job_id) return Response.json({ error: 'Missing job_id' }, { status: 400 });

    const jobs = await base44.asServiceRole.entities.Job.filter({ id: job_id });
    const job = jobs[0];
    if (!job) return Response.json({ error: 'Job not found' }, { status: 404 });

    return Response.json({
      job_id: job.id,
      status: job.status,
      progress: job.progress || 0,
      result: job.result || null,
      error: job.error || null,
      started_at: job.started_at,
      completed_at: job.completed_at,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});