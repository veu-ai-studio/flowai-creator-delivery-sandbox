'use strict';

export const OBSERVED_URL_FIELDS = Object.freeze([
  'failingUrl',
  'pageUrl',
  'locationUrl',
  'observedUrl',
  'observed_url',
  'location',
]);

export function hostnameForUrl(value) {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value.trim())) return null;
  try {
    return new URL(value.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function hostnamesFromOptions({ activeTargetUrl, observedHostnames } = {}) {
  const hosts = new Set();
  const add = (value) => {
    const host = hostnameForUrl(value);
    if (host) hosts.add(host);
  };
  add(activeTargetUrl);
  if (Array.isArray(observedHostnames)) {
    for (const host of observedHostnames) {
      if (typeof host === 'string' && host.trim()) {
        const normalized = host.includes('://') ? hostnameForUrl(host) : host.trim().toLowerCase();
        if (normalized) hosts.add(normalized);
      }
    }
  }
  return hosts;
}

export function matchesActiveHost(value, activeHosts) {
  if (!(activeHosts instanceof Set) || activeHosts.size === 0) return true;
  const host = hostnameForUrl(value);
  return !host || activeHosts.has(host);
}

export function urlFieldIsObserved(finding, field) {
  if (OBSERVED_URL_FIELDS.includes(field)) return true;
  if (field !== 'url') return false;
  return finding?.urlObserved === true
    || finding?.urlIsObserved === true
    || finding?.observedUrlField === 'url'
    || finding?.urlRole === 'observed'
    || finding?.evidenceRole === 'observed';
}

export function observedLocationEvidenceForFinding(finding, options = {}) {
  const activeHosts = hostnamesFromOptions(options);
  let hasObservedUrlEvidence = false;
  let activeHostFiltered = false;

  for (const field of [...OBSERVED_URL_FIELDS, 'url']) {
    if (!urlFieldIsObserved(finding, field)) continue;
    const value = finding?.[field];
    if (typeof value !== 'string' || !value.trim()) continue;
    const trimmed = value.trim();
    const host = hostnameForUrl(trimmed);
    hasObservedUrlEvidence = hasObservedUrlEvidence || !!host;
    if (matchesActiveHost(trimmed, activeHosts)) {
      return Object.freeze({
        location: trimmed,
        hasObservedUrlEvidence,
        activeHostFiltered,
        hasActiveHostScope: activeHosts.size > 0,
      });
    }
    if (host && activeHosts.size > 0) activeHostFiltered = true;
  }

  return Object.freeze({
    location: null,
    hasObservedUrlEvidence,
    activeHostFiltered,
    hasActiveHostScope: activeHosts.size > 0,
  });
}

export function observedLocationForFinding(finding, options = {}) {
  return observedLocationEvidenceForFinding(finding, options).location;
}
