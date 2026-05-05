// Resend email client + branded VEU AI Studio templates.
//
// Env:
//   RESEND_API_KEY        — Resend API key
//   EMAIL_FROM            — default From address (e.g. "FlowAI <hello@veu.ai>")
//   EMAIL_REPLY_TO        — default Reply-To
//   EMAIL_DRY_RUN         — 'true' to skip the actual send and just log
//
// All template fns accept a context object and return { subject, html, text }.
// sendEmail() handles transport. Today: no API key set → sendEmail returns
// { ok: false, reason: 'resend not configured' } and never throws.

import { Resend } from 'resend';

let cached = null;
function getResend() {
  if (cached) return cached;
  if (!process.env.RESEND_API_KEY) return null;
  cached = new Resend(process.env.RESEND_API_KEY);
  return cached;
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

const DEFAULT_FROM = 'FlowAI <hello@veu.ai>';

const FOOTER_HTML = (clientName) => `
  <table role="presentation" width="100%" style="margin-top:32px;border-top:1px solid #e5e7eb">
    <tr><td style="padding:16px 0;font:13px/1.5 -apple-system,Segoe UI,sans-serif;color:#6b7280;text-align:center">
      Built for ${escapeHtml(clientName || 'VEU AI Studio')} by <strong style="color:#111827">VEU AI Studio</strong>.
      <br /><span style="color:#9ca3af">FlowAI Engine v0.1 · Process-Driven Product Governance Platform</span>
    </td></tr>
  </table>`;

const FOOTER_TEXT = (clientName) =>
  `\n\n---\nBuilt for ${clientName || 'VEU AI Studio'} by VEU AI Studio.\nFlowAI Engine v0.1`;

const SHELL = ({ title, body, clientName }) => `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title></head>
<body style="margin:0;background:#f9fafb;font:15px/1.55 -apple-system,Segoe UI,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
        <tr><td>
          <p style="margin:0 0 16px;font-size:20px;font-weight:700;color:#0e1521">FlowAI</p>
          ${body}
          ${FOOTER_HTML(clientName)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── Templates ───────────────────────────────────────────────────────────

export function welcomeEmail({ user, clientName, ctaUrl } = {}) {
  const name = user?.full_name || user?.email || 'there';
  const subject = `Welcome to FlowAI — your AI ops platform is ready`;
  const body = `
    <p style="margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px">FlowAI is your internal operations platform for product governance, audits, and clearance.
    Everything you build here is auto-saved to your account and ready to share with your team.</p>
    <p style="margin:0 0 24px">Start by analyzing a product URL or describing one — FlowAI will produce a five-layer
    research brief, audit, and demo-readiness score in under two minutes.</p>
    <p style="margin:0 0 16px"><a href="${escapeHtml(ctaUrl || 'https://flowai-dun.vercel.app')}"
      style="display:inline-block;background:#0e1521;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
      Open FlowAI →</a></p>`;
  const text = `Hi ${name},\n\nFlowAI is ready. Open ${ctaUrl || 'https://flowai-dun.vercel.app'} to start.${FOOTER_TEXT(clientName)}`;
  return { subject, html: SHELL({ title: subject, body, clientName }), text };
}

export function runCompleteEmail({ run, user, clientName, ctaUrl } = {}) {
  const name = user?.full_name || user?.email || 'there';
  const product = run?.product_name || run?.inputs?.[0]?.value || 'your product';
  const score = run?.final_score ?? null;
  const decision = run?.decision || run?.clearance_decision || null;
  const subject = `FlowAI run complete — ${product}`;
  const body = `
    <p style="margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px">FlowAI finished analyzing <strong>${escapeHtml(product)}</strong>.</p>
    ${score != null ? `<p style="margin:0 0 8px">Final score: <strong>${escapeHtml(String(score))}/50</strong></p>` : ''}
    ${decision ? `<p style="margin:0 0 16px">Clearance decision: <strong>${escapeHtml(decision)}</strong></p>` : ''}
    <p style="margin:0 0 24px"><a href="${escapeHtml(ctaUrl || 'https://flowai-dun.vercel.app/my-sessions')}"
      style="display:inline-block;background:#0e1521;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
      View full report →</a></p>
    <p style="margin:0;color:#6b7280;font-size:13px">Run ID: ${escapeHtml(run?.id || 'n/a')}</p>`;
  const text = `Hi ${name},\n\nFlowAI finished analyzing ${product}.\n${score != null ? `Final score: ${score}/50\n` : ''}${decision ? `Decision: ${decision}\n` : ''}\nView: ${ctaUrl || 'https://flowai-dun.vercel.app/my-sessions'}${FOOTER_TEXT(clientName)}`;
  return { subject, html: SHELL({ title: subject, body, clientName }), text };
}

export function clearanceFailedEmail({ product, user, conditions = [], clientName, ctaUrl } = {}) {
  const name = user?.full_name || user?.email || 'there';
  const productName = product?.name || product?.product_name || 'your product';
  const subject = `Clearance failed — ${productName}`;
  const conditionsHtml = conditions.length
    ? `<ul style="margin:0 0 16px 20px;padding:0">${conditions.map((c) => `<li style="margin:0 0 6px">${escapeHtml(c)}</li>`).join('')}</ul>`
    : '<p style="margin:0 0 16px;color:#6b7280">No specific conditions were captured.</p>';
  const body = `
    <p style="margin:0 0 16px">Hi ${escapeHtml(name)},</p>
    <p style="margin:0 0 16px"><strong>${escapeHtml(productName)}</strong> did not pass clearance. The conditions below
    must be addressed before the next clearance run.</p>
    ${conditionsHtml}
    <p style="margin:0 0 24px"><a href="${escapeHtml(ctaUrl || 'https://flowai-dun.vercel.app/clearance')}"
      style="display:inline-block;background:#dc2626;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">
      Open Clearance Protocol →</a></p>`;
  const text = `Hi ${name},\n\n${productName} did not pass clearance.\n\nConditions:\n${conditions.map((c) => '- ' + c).join('\n')}\n\nOpen: ${ctaUrl || 'https://flowai-dun.vercel.app/clearance'}${FOOTER_TEXT(clientName)}`;
  return { subject, html: SHELL({ title: subject, body, clientName }), text };
}

// ─── Transport ───────────────────────────────────────────────────────────

export async function sendEmail({ to, subject, html, text, from, replyTo, tags } = {}) {
  if (!to) return { ok: false, reason: 'No recipient' };
  if (process.env.EMAIL_DRY_RUN === 'true') {
    return { ok: true, dryRun: true, to, subject };
  }
  const client = getResend();
  if (!client) {
    return { ok: false, reason: 'resend not configured (RESEND_API_KEY missing)' };
  }
  try {
    const result = await client.emails.send({
      from: from || process.env.EMAIL_FROM || DEFAULT_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
      reply_to: replyTo || process.env.EMAIL_REPLY_TO || undefined,
      tags: tags || undefined,
    });
    return { ok: true, id: result?.data?.id || result?.id || null };
  } catch (e) {
    return { ok: false, reason: e.message || String(e) };
  }
}
