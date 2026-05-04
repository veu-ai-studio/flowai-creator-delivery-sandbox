/**
 * Memory Layer — persist and retrieve run history, scores, iteration history
 * tied to user_id + optional project_id
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action, project_id, run_data, limit: reqLimit } = body;

    if (action === 'save') {
      // Persist a run with scores + output
      if (!run_data) return Response.json({ error: 'Missing run_data' }, { status: 400 });
      const saved = await base44.asServiceRole.entities.Run.create({
        user_email: user.email,
        project_id: project_id || null,
        type: run_data.type || 'qa_audit',
        status: 'success',
        input: String(run_data.input || '').slice(0, 500),
        output: run_data.output || {},
        scores: run_data.scores || {},
        duration_ms: run_data.duration_ms || 0,
      });
      return Response.json({ saved_id: saved.id, status: 'saved' });
    }

    if (action === 'load') {
      // Load run history for this user (optionally filtered by project)
      const filter = { user_email: user.email };
      if (project_id) filter.project_id = project_id;
      const runs = await base44.asServiceRole.entities.Run.filter(filter, '-created_date', reqLimit || 20);
      return Response.json({ runs });
    }

    if (action === 'clear') {
      // Not exposed — future admin action
      return Response.json({ error: 'Not supported' }, { status: 400 });
    }

    return Response.json({ error: 'Invalid action. Use: save | load' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});