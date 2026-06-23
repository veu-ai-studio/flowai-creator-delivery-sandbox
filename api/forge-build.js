// Vercel top-level API shim for the public BuildExecutionWorker M1 endpoint.
// The handler remains api/forge/build.js; this file only makes the deployed
// POST /api/forge/build surface resolve through a top-level serverless entry.
export { default } from './forge/build.js';
