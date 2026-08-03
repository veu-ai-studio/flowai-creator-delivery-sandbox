export async function cancelLegacyAutoSession({ base44Client, sessionId, reason } = {}) {
  if (!sessionId) throw new Error('legacy_session_id_missing');
  const update = base44Client?.entities?.AutoSession?.update;
  if (typeof update !== 'function') throw new Error('legacy_session_store_unavailable');
  await update.call(base44Client.entities.AutoSession, sessionId, {
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
  const entity = base44Client?.entities?.AutoSession;
  const get = entity?.get;
  const filter = entity?.filter;
  if (typeof get !== 'function' && typeof filter !== 'function') {
    throw new Error('legacy_session_readback_unavailable');
  }

  // Base44 deployments are not uniform: some expose `get`, while others only
  // support entity `filter`, and a just-written row can be briefly stale. Read
  // through either supported path and retry before making any success claim.
  let updated = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      if (typeof get === 'function') updated = await get.call(entity, sessionId);
    } catch {
      updated = null;
    }
    const getConfirmed = updated?.id === sessionId
      && updated?.overall_status === 'failed'
      && updated?.deliverables?.disposition === 'cancelled_legacy_session';
    if (!getConfirmed && typeof filter === 'function') {
      try {
        const rows = await filter.call(entity, { id: sessionId }, '-updated_date', 1);
        updated = Array.isArray(rows) ? rows.find(row => row?.id === sessionId) || null : null;
      } catch {
        updated = null;
      }
    }
    if (updated?.overall_status === 'failed'
      && updated?.deliverables?.disposition === 'cancelled_legacy_session') break;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (updated?.overall_status !== 'failed') throw new Error('legacy_session_cancel_unconfirmed');
  if (updated?.deliverables?.disposition !== 'cancelled_legacy_session') {
    throw new Error('legacy_session_disposition_unconfirmed');
  }
  return updated;
}
