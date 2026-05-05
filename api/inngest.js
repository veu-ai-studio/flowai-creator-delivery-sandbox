// Inngest function endpoint.
// Inngest's hosted control plane POSTs here to invoke each registered function.
// Local dev: `npx inngest-cli dev` to run a local control plane.
// Production: configure your Inngest cloud project with this endpoint URL.

import { serve } from 'inngest/express';
import { getInngest, inngestFunctions } from './_lib/inngest.js';

// Vercel's Node runtime supports both default-export and "config" exports.
// `serve()` returns a request handler compatible with Express + Vercel.
const handler = serve({
  client: getInngest(),
  functions: inngestFunctions,
  signingKey: process.env.INNGEST_SIGNING_KEY,
});

export default handler;

// Vercel: bump body size and timeout for long-running step executors.
export const config = {
  api: {
    bodyParser: { sizeLimit: '4mb' },
  },
  maxDuration: 60,
};
