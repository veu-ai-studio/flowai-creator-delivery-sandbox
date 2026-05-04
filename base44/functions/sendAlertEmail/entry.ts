import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, url, analysis, trigger_type } = await req.json();

    if (!email || !url || !analysis) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let subject = '';
    let body = '';

    switch (trigger_type) {
      case 'score_drop':
        subject = `⚠️ QA Score Alert: ${url} dropped to ${analysis.scores.overall}/10`;
        body = `Your site ${url} experienced a score drop.\n\nCurrent Score: ${analysis.scores.overall}/10\n\nLayer Breakdown:\n- UI/UX: ${analysis.scores.ui_ux}/10\n- API: ${analysis.scores.api}/10\n- Logic: ${analysis.scores.logic}/10\n- Business Value: ${analysis.scores.business_value}/10\n\nTop Issues:\n${analysis.recommendations.slice(0, 3).map(r => `- ${r.action} (${r.priority})`).join('\n')}`;
        break;
      case 'critical_issues':
        subject = `🔴 Critical Issues Found: ${url}`;
        body = `${analysis.recommendations.filter(r => r.priority === 'critical').length} critical issues detected on ${url}.\n\n${analysis.recommendations.filter(r => r.priority === 'critical').map(r => `- ${r.action}`).join('\n')}`;
        break;
      case 'audit_complete':
        subject = `✅ Audit Complete: ${url} - Score ${analysis.scores.overall}/10`;
        body = `Your audit of ${url} is complete.\n\nOverall Score: ${analysis.scores.overall}/10\n\nSummary:\n- UI/UX: ${analysis.scores.ui_ux}/10\n- API: ${analysis.scores.api}/10\n- Logic: ${analysis.scores.logic}/10\n- Business Value: ${analysis.scores.business_value}/10\n\nTop 3 Recommendations:\n${analysis.recommendations.slice(0, 3).map(r => `- ${r.action}`).join('\n')}`;
        break;
    }

    await base44.integrations.Core.SendEmail({
      to: email,
      subject,
      body,
      from_name: 'QA Audit Engine',
    });

    return Response.json({ success: true, email_sent: email });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});