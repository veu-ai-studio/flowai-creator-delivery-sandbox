export function normalizeLegacyAutoSession(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const nested = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)
    ? raw.data
    : {};
  const ids = [raw.id, raw._id, nested.id, nested._id].filter(Boolean);
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length !== 1) return null;
  const [id] = uniqueIds;
  return { ...raw, ...nested, id };
}

export function quiesceLegacyAutoSessionExecution({ sessionDbIdRef, isPausedRef, timerRef, clearTimer } = {}) {
  const sessionId = sessionDbIdRef?.current || null;
  if (isPausedRef) isPausedRef.current = true;
  if (timerRef?.current != null && typeof clearTimer === 'function') clearTimer(timerRef.current);
  if (sessionDbIdRef) sessionDbIdRef.current = null;
  return sessionId;
}

export async function cancelLegacyAutoSession({ base44Client, sessionId, reason, existingSession } = {}) {
  if (!sessionId) throw new Error('legacy_session_id_missing');
  const update = base44Client?.entities?.AutoSession?.update;
  if (typeof update !== 'function') throw new Error('legacy_session_store_unavailable');
  await update.call(base44Client.entities.AutoSession, sessionId, {
    // AutoSession's live schema predates operational cancellation and permits
    // only running/completed/failed/paused. Use terminal failed plus explicit
    // cancellation metadata to dispose the legacy row without schema drift.
    overall_status: 'failed',
    completed_at: new Date().toISOString(),
    step_results: {
      ...(existingSession?.id === sessionId && existingSession?.step_results
        ? existingSession.step_results
        : {}),
      cancellation: {
        disposition: 'cancelled_legacy_session',
        reason: reason || 'operator_cancelled',
      },
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
      if (typeof get === 'function') updated = normalizeLegacyAutoSession(await get.call(entity, sessionId));
    } catch {
      updated = null;
    }
    const disposition = updated?.step_results?.cancellation?.disposition
      || updated?.deliverables?.disposition;
    const getConfirmed = updated?.id === sessionId
      && updated?.overall_status === 'failed'
      && disposition === 'cancelled_legacy_session';
    if (!getConfirmed && typeof filter === 'function') {
      try {
        const rows = await filter.call(entity, { id: sessionId }, '-updated_date', 1);
        updated = Array.isArray(rows)
          ? rows.map(normalizeLegacyAutoSession).filter(Boolean).find(row => row.id === sessionId) || null
          : null;
      } catch {
        updated = null;
      }
    }
    const confirmedDisposition = updated?.step_results?.cancellation?.disposition
      || updated?.deliverables?.disposition;
    if (updated?.id === sessionId
      && updated?.overall_status === 'failed'
      && confirmedDisposition === 'cancelled_legacy_session') break;
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (updated?.id !== sessionId) throw new Error('legacy_session_identity_unconfirmed');
  if (updated?.overall_status !== 'failed') throw new Error('legacy_session_cancel_unconfirmed');
  const finalDisposition = updated?.step_results?.cancellation?.disposition
    || updated?.deliverables?.disposition;
  if (finalDisposition !== 'cancelled_legacy_session') {
    throw new Error('legacy_session_disposition_unconfirmed');
  }
  return updated;
}
