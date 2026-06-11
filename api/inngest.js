// Inngest function endpoint — invoked by Inngest's hosted control plane to
// run each registered function. Lazy-loads the serve adapter and functions
// so cold start of OTHER endpoints doesn't pay for the Inngest serve helper.

import { getServeHandler } from './_lib/inngest.js';

export default async function handler(req, res) {
  try {
    const serveHandler = await getServeHandler();
    return serveHandler(req, res);
  } catch (e) {
    return res.status(500).json({
      error: 'Inngest serve handler failed to initialise',
      details: e.message || String(e),
      hint: 'Confirm INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY are set in env.',
    });
  }
}

export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
  maxDuration: 800,
};

export const maxDuration = 800;
