import { readForgeRunStatus } from './_lib/forgeRunStatusBus.js';

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'OPTIONS') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const runId = typeof req.query?.runId === 'string'
    ? req.query.runId.trim()
    : '';
  if (!runId) {
    return res.status(400).json({ ok: false, error: 'missing_runId' });
  }

  const { record, transport } = await readForgeRunStatus(runId);
  if (!record) {
    return res.status(404).json({ ok: false, error: 'run_not_found', runId, transport });
  }
  return res.status(200).json({
    ok: true,
    run: {
      ...record,
      transport,
    },
  });
}
