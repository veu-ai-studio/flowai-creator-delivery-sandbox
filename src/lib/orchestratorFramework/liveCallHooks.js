import { PLATFORM_REGISTRY } from './platformRegistry.js';

export const LIVE_CALL_STATUS = Object.freeze({
  DISABLED: 'LIVE_DISABLED',
  READY: 'LIVE_READY',
  UNKNOWN_PLATFORM: 'UNKNOWN_PLATFORM',
});

export function resolvePlatform(registry, platformId) {
  return (registry ?? PLATFORM_REGISTRY).find(platform => platform.id === platformId) ?? null;
}

export function createLiveCallEnvelope({
  platformId,
  action,
  payload = {},
  registry = PLATFORM_REGISTRY,
  credentialResolver = null,
} = {}) {
  const platform = resolvePlatform(registry, platformId);
  if (!platform) {
    return Object.freeze({
      status: LIVE_CALL_STATUS.UNKNOWN_PLATFORM,
      platformId,
      action,
      payload,
      credentialRef: null,
      credentialPresent: false,
      liveCall: false,
    });
  }

  const credentialPresent = typeof credentialResolver === 'function'
    ? Boolean(credentialResolver(platform.credentialRef))
    : false;

  if (!platform.liveEnabled) {
    return Object.freeze({
      status: LIVE_CALL_STATUS.DISABLED,
      platformId: platform.id,
      action,
      payload,
      credentialRef: platform.credentialRef,
      credentialPresent,
      liveCall: false,
      reason: 'platform_live_calls_disabled',
    });
  }

  return Object.freeze({
    status: LIVE_CALL_STATUS.READY,
    platformId: platform.id,
    action,
    payload,
    credentialRef: platform.credentialRef,
    credentialPresent,
    liveCall: true,
  });
}
