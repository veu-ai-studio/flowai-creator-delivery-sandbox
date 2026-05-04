import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { url, analysis, notificationConfig } = await req.json();

    if (!url || !analysis || !notificationConfig) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const results = { email: null, slack: null, github: null };

    // Email notifications
    if (notificationConfig.email_enabled && notificationConfig.email_recipients?.length > 0) {
      for (const email of notificationConfig.email_recipients) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: `QA Audit Alert: ${url} - Score ${analysis.scores?.overall || 0}/10`,
            body: `Site: ${url}\nScore: ${analysis.scores?.overall}/10\nCritical Issues: ${analysis.recommendations?.filter((r) => r.priority === 'critical').length || 0}\n\nView full report in your QA Audit dashboard.`,
            from_name: 'QA Audit Engine',
          });
          results.email = `Sent to ${email}`;
        } catch (err) {
          results.email = `Failed: ${err.message}`;
        }
      }
    }

    // Slack notifications
    if (notificationConfig.slack_enabled && notificationConfig.slack_webhook_url) {
      try {
        const criticalCount = analysis.recommendations?.filter((r) => r.priority === 'critical').length || 0;
        const color = analysis.scores?.overall >= 7 ? '#36a64f' : '#ff6b6b';

        const slackPayload = {
          attachments: [
            {
              color,
              title: `QA Audit: ${url}`,
              fields: [
                { title: 'Overall Score', value: `${analysis.scores?.overall || 0}/10`, short: true },
                { title: 'Critical Issues', value: `${criticalCount}`, short: true },
                { title: 'UI/UX', value: `${analysis.scores?.ui_ux || 0}/10`, short: true },
                { title: 'API', value: `${analysis.scores?.api || 0}/10`, short: true },
              ],
              footer: 'QA Audit Engine',
              ts: Math.floor(Date.now() / 1000),
            },
          ],
        };

        const slackRes = await fetch(notificationConfig.slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(slackPayload),
        });

        results.slack = slackRes.ok ? 'Posted to Slack' : `Failed: ${slackRes.statusText}`;
      } catch (err) {
        results.slack = `Error: ${err.message}`;
      }
    }

    // GitHub sync (if enabled)
    if (notificationConfig.github_enabled && notificationConfig.github_repo) {
      try {
        const syncRes = await base44.functions.invoke('syncGitHubIssues', {
          reportId: analysis.id,
          repo: notificationConfig.github_repo,
          analysis,
          createIssuesForCritical: notificationConfig.create_issues_for_critical,
        });
        results.github = syncRes.success ? `Issue #${syncRes.issue_number} created` : `Failed: ${syncRes.error}`;
      } catch (err) {
        results.github = `Error: ${err.message}`;
      }
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});