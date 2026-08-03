export async function cancelLegacyAutoSession({ base44Client, sessionId, reason } = {}) {
  if (!sessionId) throw new Error('legacy_session_id_missing');
  const update = base44Client?.entities?.AutoSession?.update;
  if (typeof update !== 'function') throw new Error('legacy_session_store_unavailable');
  const updated = await update.call(base44Client.entities.AutoSession, sessionId, {
    overall_status: 'cancelled',
    completed_at: new Date().toISOString(),
    cancellation_reason: reason || 'operator_cancelled',
  });
  if (updated?.overall_status !== 'cancelled') throw new Error('legacy_session_cancel_unconfirmed');
  return updated;
}
