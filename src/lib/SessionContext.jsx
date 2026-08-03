import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

const SessionContext = createContext(null);

export function isUsableGovernanceSession(session) {
  return Boolean(
    session
    && session.status === 'active'
    && Array.isArray(session.urls)
    && session.urls.length > 0
    && Array.isArray(session.selected_activities)
    && session.selected_activities.length > 0
    && session.current_activity
  );
}

export function SessionProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Restore active session on mount
  useEffect(() => {
    const restore = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) { setLoadingSession(false); return; }
        const sessions = await base44.entities.GovernanceSession.filter({
          owner_email: user.email,
          status: 'active',
        }, '-created_date', 1);
        if (sessions.length > 0 && isUsableGovernanceSession(sessions[0])) {
          setActiveSession(sessions[0]);
          const startedAt = sessions[0].started_at ? new Date(sessions[0].started_at) : new Date();
          setElapsedSeconds(Math.floor((Date.now() - startedAt.getTime()) / 1000));
        }
      } catch (e) {
        // no session — fine
      }
      setLoadingSession(false);
    };
    restore();
  }, []);

  // Elapsed timer
  useEffect(() => {
    if (!activeSession) return;
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, [activeSession]);

  const launchSession = useCallback(async ({ urls, selectedActivities, sessionSettings, capabilityTransfer }) => {
    const user = await base44.auth.me();
    const gateCount = computeGateCount(selectedActivities, urls.length, sessionSettings);
    const record = await base44.entities.GovernanceSession.create({
      owner_email: user.email,
      status: 'active',
      urls,
      selected_activities: selectedActivities,
      session_settings: sessionSettings,
      capability_transfer: capabilityTransfer || {},
      current_url_index: 0,
      current_activity: selectedActivities[0],
      current_gate: 0,
      gates_pending: gateCount,
      elapsed_seconds: 0,
      started_at: new Date().toISOString(),
    });
    setActiveSession(record);
    setElapsedSeconds(0);
    return record;
  }, []);

  const updateSession = useCallback(async (patch) => {
    if (!activeSession) return;
    const updated = await base44.entities.GovernanceSession.update(activeSession.id, patch);
    setActiveSession(updated);
  }, [activeSession]);

  const pauseSession = useCallback(async () => {
    await updateSession({ status: 'paused' });
  }, [updateSession]);

  const endSession = useCallback(async (metadata = {}) => {
    if (!activeSession) return;
    await base44.entities.GovernanceSession.update(activeSession.id, { status: 'completed', ...metadata });
    setActiveSession(null);
    setElapsedSeconds(0);
  }, [activeSession]);

  const cancelSession = useCallback(async () => {
    if (!activeSession) return;
    await base44.entities.GovernanceSession.update(activeSession.id, { status: 'cancelled' });
    setActiveSession(null);
    setElapsedSeconds(0);
  }, [activeSession]);

  const formatElapsed = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <SessionContext.Provider value={{
      activeSession,
      loadingSession,
      elapsedSeconds,
      formattedElapsed: formatElapsed(elapsedSeconds),
      launchSession,
      updateSession,
      pauseSession,
      endSession,
      cancelSession,
    }}>
      {children}
    </SessionContext.Provider>
  );
}

function computeGateCount(activities, urlCount, settings) {
  const gatedActivities = activities.filter(a =>
    ['self_protect', 'self_heal', 'self_optimize', 'self_upgrade', 'capability_transfer'].includes(a)
  );
  const gatesPerActivity = 4;
  if (settings?.gate_timing === 'session_end') return gatesPerActivity;
  if (settings?.gate_timing === 'per_activity') return gatedActivities.length * gatesPerActivity;
  return gatedActivities.length * gatesPerActivity * urlCount;
}

export function useSession() {
  return useContext(SessionContext);
}
