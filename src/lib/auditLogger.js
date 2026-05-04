// Silent background audit logger — never throws, never blocks UI
import { base44 } from '@/api/base44Client';

export async function logAction({ actionType, actionDetail = '', stepName = '', sessionId = '', productUrl = '', outcome = '', mode = '' }) {
  try {
    const user = await base44.auth.me().catch(() => null);
    await base44.entities.GovernanceAuditLog.create({
      timestamp: new Date().toISOString(),
      user: user?.email || 'unknown',
      session_id: sessionId,
      product_url: productUrl,
      action_type: actionType,
      action_detail: actionDetail,
      step_name: stepName,
      outcome,
      mode,
    });
  } catch {
    // Silent — audit logging must never break the UI
  }
}