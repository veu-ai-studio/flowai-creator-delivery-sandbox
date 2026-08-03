const SESSION_CONFIG_KEY = 'flowai_session_config';

/** @param {any} input */
export function consumeFlowAIAutoStart({ location, history, storage } = {}) {
  if (!location || !history || !storage) return null;
  const params = new URLSearchParams(location.search || '');
  if (params.get('autoStart') !== '1' || params.get('sessionConfig') !== '1') return null;

  let config = null;
  try { config = JSON.parse(storage.getItem(SESSION_CONFIG_KEY) || 'null'); }
  catch { config = null; }
  const launchNonce = typeof config?.launchNonce === 'string' ? config.launchNonce.trim() : '';
  if (!launchNonce || !Array.isArray(config?.inputs) || !config.inputs[0]?.value?.trim()) return null;

  // Claim synchronously before any network dispatch. A remount or refresh sees
  // neither the trigger nor payload, while a racing duplicate still carries
  // the same backend idempotency key.
  params.delete('autoStart');
  params.delete('sessionConfig');
  const query = params.toString();
  history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash || ''}`);
  storage.removeItem(SESSION_CONFIG_KEY);
  return { config, launchNonce };
}

export const FLOWAI_AUTO_START = Object.freeze({ SESSION_CONFIG_KEY });
