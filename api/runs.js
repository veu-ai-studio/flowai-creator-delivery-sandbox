import { requireAuthHard } from './_lib/auth.js';
import { listOperationalRuns } from './_lib/operationalRuns.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Use GET' });
  const auth = await requireAuthHard(req, res);
  if (!auth) return;
  try { return res.status(200).json({ ok: true, runs: await listOperationalRuns(auth) }); }
  catch (error) { return res.status(503).json({ ok: false, error: error.code || 'RUN_STORE_NOT_LIVE' }); }
}
