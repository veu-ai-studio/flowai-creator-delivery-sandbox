/**
 * Slack Notifications — send structured alerts to Slack
 * Supports: audit reports, pipeline events, error alerts, custom messages
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { webhook_url, event_type, data } = body;

    if (!webhook_url) return Response.json({ error: 'webhook_url required' }, { status: 400 });

    let payload;

    switch (event_type) {
      case 'audit_complete': {
        const { scores, url, recommendations } = data;
        const overall = scores?.overall || 0;
        const emoji = overall >= 8 ? '✅' : overall >= 6 ? '⚠️' : '🔴';
        const criticals = (recommendations || []).filter(r => r.priority === 'critical');
        payload = {
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `${emoji} QA Audit Complete` }
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*URL:* \`${url}\`\n*Overall Score:* ${overall}/10 · *Critical Issues:* ${criticals.length}`
              }
            },
            {
              type: 'section',
              fields: [
                { type: 'mrkdwn', text: `*UI/UX*\n${scores?.ui_ux || 0}/10` },
                { type: 'mrkdwn', text: `*API*\n${scores?.api || 0}/10` },
                { type: 'mrkdwn', text: `*Logic*\n${scores?.logic || 0}/10` },
                { type: 'mrkdwn', text: `*Business Value*\n${scores?.business_value || 0}/10` },
              ]
            },
            ...(criticals.length > 0 ? [{
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*🔥 Critical Issues:*\n${criticals.slice(0, 3).map(r => `• ${r.action}`).join('\n')}`
              }
            }] : []),
            { type: 'divider' },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `FlowAI QA Engine · ${new Date().toLocaleString()}` }]
            }
          ]
        };
        break;
      }

      case 'pipeline_complete': {
        const { input, live_url, stages_completed } = data;
        payload = {
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: '🚀 Pipeline Orchestration Complete' }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Input:* ${input?.slice(0, 100) || 'N/A'}` }
            },
            ...(live_url ? [{
              type: 'section',
              text: { type: 'mrkdwn', text: `*Live URL:* <${live_url}|${live_url}>` }
            }] : []),
            ...(stages_completed?.length ? [{
              type: 'section',
              text: { type: 'mrkdwn', text: `*Stages:* ${stages_completed.join(' → ')}` }
            }] : []),
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `FlowAI · ${new Date().toLocaleString()}` }]
            }
          ]
        };
        break;
      }

      case 'error_alert': {
        const { source, message, severity } = data;
        const sevEmoji = severity === 'critical' ? '🚨' : severity === 'high' ? '❗' : '⚠️';
        payload = {
          blocks: [
            {
              type: 'header',
              text: { type: 'plain_text', text: `${sevEmoji} System Error — ${severity?.toUpperCase()}` }
            },
            {
              type: 'section',
              text: { type: 'mrkdwn', text: `*Source:* \`${source}\`\n*Message:* ${message}` }
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `FlowAI · ${new Date().toLocaleString()}` }]
            }
          ]
        };
        break;
      }

      default: {
        // Custom / generic message
        const { message, title } = data || {};
        payload = {
          blocks: [
            ...(title ? [{ type: 'header', text: { type: 'plain_text', text: title } }] : []),
            {
              type: 'section',
              text: { type: 'mrkdwn', text: message || 'No message provided' }
            },
            {
              type: 'context',
              elements: [{ type: 'mrkdwn', text: `FlowAI · ${new Date().toLocaleString()}` }]
            }
          ]
        };
      }
    }

    const res = await fetch(webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok && res.status !== 0) {
      return Response.json({ error: `Slack returned ${res.status}` }, { status: 502 });
    }

    return Response.json({ success: true, event_type });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});