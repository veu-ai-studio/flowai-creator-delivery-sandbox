export async function cancelLegacyAutoSession({ base44Client, sessionId, reason } = {}) {
  if (!sessionId) throw new Error('legacy_session_id_missing');
  const update = base44Client?.entities?.AutoSession?.update;
  if (typeof update !== 'function') throw new Error('legacy_session_store_unavailable');
  const updated = await update.call(base44Client.entities.AutoSession, sessionId, {
    // AutoSession's live schema predates operational cancellation and permits
    // only running/completed/failed/paused. Use terminal failed plus explicit
    // cancellation metadata to dispose the legacy row without schema drift.
    overall_status: 'failed',
    completed_at: new Date().toISOString(),
    deliverables: {
      disposition: 'cancelled_legacy_session',
      cancellation_reason: reason || 'operator_cancelled',
    },
  });
  if (updated?.overall_status !== 'failed') throw new Error('legacy_session_cancel_unconfirmed');
  return updated;
}
