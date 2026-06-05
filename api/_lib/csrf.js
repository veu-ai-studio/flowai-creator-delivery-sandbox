function header(req, name) {
  const value = req.headers?.[name] ?? req.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function hostFrom(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

function isBearerOrServiceRequest(req) {
  const auth = header(req, 'authorization');
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return true;
  if (header(req, 'x-flowai-service-key')) return true;
  if (header(req, 'x-flowai-operator-secret')) return true;
  return false;
}

export function requireSameSiteForStateChange(req, res) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return true;
  if (isBearerOrServiceRequest(req)) return true;

  const host = header(req, 'x-forwarded-host') ?? header(req, 'host');
  const originHost = hostFrom(header(req, 'origin'));
  const refererHost = hostFrom(header(req, 'referer'));
  const sourceHost = originHost ?? refererHost;

  if (sourceHost && host && sourceHost === host) return true;
  res.status(403).json({
    ok: false,
    error: 'CSRF protection failed',
    reason: 'State-changing requests must originate from the same site or use service/bearer auth.',
  });
  return false;
}
