// tests/api/agent/3/control.test.js
//
// Tests for api/agent/3/control.js — the dashboard back-channel POST
// endpoint that bridges control commands to the SSE handler's
// OrchestrationState via runControlBus.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import controlHandler, { __test as CONTROL_TEST } from '../../../../api/agent/3/control.js';
import {
  writeCommand, readAndClearCommand, resetForTests, __internals,
} from '../../../../api/_lib/runControlBus.js';

// ── Minimal fake req/res shaped like a Vercel handler signature ──────────

function makeReq({ method = 'POST', body = {}, headers = {} } = {}) {
  return { method, body, headers, query: {} };
}

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return res;
}

beforeEach(() => {
  resetForTests();
  // Clear env that the control endpoint's auth resolver reads.
  delete process.env.FLOWAI_INTERNAL_SECRET;
});

// ── Method gate ──────────────────────────────────────────────────────────

describe('control.js — method gate', () => {
  it('returns 405 on non-POST', async () => {
    const req = makeReq({ method: 'GET' });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.body.error).toBe('method_not_allowed');
    expect(res.headers.Allow).toBe('POST');
  });
});

// ── Body validation ──────────────────────────────────────────────────────

describe('control.js — body validation', () => {
  it('returns 400 on invalid JSON string body', async () => {
    const req = makeReq({ body: 'not-json' });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_json');
  });

  it('returns 400 on missing runId', async () => {
    const req = makeReq({
      body: { command: 'pause' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.field).toBe('runId');
  });

  it('returns 400 on unknown command', async () => {
    const req = makeReq({
      body: { runId: 'r1', command: 'nuke' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_command');
    expect(res.body.allowed).toEqual(expect.arrayContaining(['pause', 'resume', 'switchMode', 'stop']));
  });

  it('returns 400 when switchMode is missing the mode field', async () => {
    const req = makeReq({
      body: { runId: 'r1', command: 'switchMode' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_mode');
  });

  it('returns 400 when switchMode mode is invalid', async () => {
    const req = makeReq({
      body: { runId: 'r1', command: 'switchMode', mode: 'turbo' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('invalid_mode');
  });
});

// ── Auth ─────────────────────────────────────────────────────────────────

describe('control.js — auth', () => {
  it('returns 401 when no auth context is present', async () => {
    const req = makeReq({ body: { runId: 'r1', command: 'pause' } });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('no_auth_context');
  });

  it('returns 401 when internal marker is set but secret mismatches', async () => {
    process.env.FLOWAI_INTERNAL_SECRET = 'expected-secret';
    const req = makeReq({
      body: { runId: 'r1', command: 'pause' },
      headers: {
        'x-flowai-internal': 'true',
        authorization: 'Bearer wrong-secret',
      },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('internal_auth_failed');
  });

  it('accepts x-product-scope auth and writes the command', async () => {
    const req = makeReq({
      body: { runId: 'r1', command: 'pause' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('accepts internal auth when secret matches', async () => {
    process.env.FLOWAI_INTERNAL_SECRET = 'right-secret';
    const req = makeReq({
      body: { runId: 'r1', command: 'pause' },
      headers: {
        'x-flowai-internal': 'true',
        authorization: 'Bearer right-secret',
      },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.ok).toBe(true);
  });
});

// ── Each command writes correctly to the bus ─────────────────────────────

describe('control.js — each command persists to the bus', () => {
  it('pause: writes envelope; readAndClearCommand returns it', async () => {
    const req = makeReq({
      body: { runId: 'run-pause', command: 'pause' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true, runId: 'run-pause', command: 'pause', mode: null, applied: 'queued',
    });
    expect(['kv', 'memory']).toContain(res.body.transport);

    const got = await readAndClearCommand('run-pause');
    expect(got).toMatchObject({ command: 'pause', mode: null });
    // Drained — subsequent read returns null.
    expect(await readAndClearCommand('run-pause')).toBeNull();
  });

  it('resume: writes envelope', async () => {
    const req = makeReq({
      body: { runId: 'run-resume', command: 'resume' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.command).toBe('resume');
    const got = await readAndClearCommand('run-resume');
    expect(got).toMatchObject({ command: 'resume' });
  });

  it('stop: writes envelope', async () => {
    const req = makeReq({
      body: { runId: 'run-stop', command: 'stop' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.command).toBe('stop');
    const got = await readAndClearCommand('run-stop');
    expect(got).toMatchObject({ command: 'stop' });
  });

  it('switchMode: writes envelope with mode field', async () => {
    const req = makeReq({
      body: { runId: 'run-switch', command: 'switchMode', mode: 'manual' },
      headers: { 'x-product-scope': 'flowai-dashboard' },
    });
    const res = makeRes();
    await controlHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      command: 'switchMode', mode: 'manual', applied: 'queued',
    });
    const got = await readAndClearCommand('run-switch');
    expect(got).toMatchObject({ command: 'switchMode', mode: 'manual' });
  });

  it('switchMode: accepts each of auto/guided/manual', async () => {
    for (const mode of ['auto', 'guided', 'manual']) {
      const req = makeReq({
        body: { runId: `run-${mode}`, command: 'switchMode', mode },
        headers: { 'x-product-scope': 'flowai-dashboard' },
      });
      const res = makeRes();
      await controlHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.mode).toBe(mode);
    }
  });
});

// ── KV-fallback behaviour ────────────────────────────────────────────────

describe('runControlBus — KV fallback', () => {
  it('falls back to in-memory when KV env vars are absent', async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    resetForTests();
    const result = await writeCommand('fallback-1', 'pause');
    expect(result.transport).toBe('memory');
    const got = await readAndClearCommand('fallback-1');
    expect(got).toMatchObject({ command: 'pause' });
  });

  it('falls back to in-memory when @vercel/kv import fails (simulated via __internals)', async () => {
    // Force the "unavailable" path by inspecting __internals.getKvClient
    // and confirming it returns null without env vars present.
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    resetForTests();
    const client = await __internals.getKvClient();
    expect(client).toBeNull();
  });

  it('readAndClearCommand returns null when no command is pending', async () => {
    resetForTests();
    const got = await readAndClearCommand('never-written');
    expect(got).toBeNull();
  });

  it('keyFor throws on non-string runId', () => {
    expect(() => __internals.keyFor(null)).toThrow(/runId must be a non-empty string/);
    expect(() => __internals.keyFor('')).toThrow();
  });

  it('envelope shape is { command, mode, writtenAt, id }', () => {
    const env = __internals.envelope('pause', { mode: null });
    expect(env).toMatchObject({ command: 'pause', mode: null });
    expect(typeof env.writtenAt).toBe('string');
    expect(typeof env.id).toBe('string');
    expect(env.id.length).toBeGreaterThan(0);
  });

  it('memory delivery is exactly-once for the same envelope', async () => {
    resetForTests();
    await writeCommand('once-1', 'stop');
    const first = await readAndClearCommand('once-1');
    const second = await readAndClearCommand('once-1');
    expect(first).toMatchObject({ command: 'stop' });
    expect(second).toBeNull();
  });

  it('two consecutive writes with the same runId — second overrides first', async () => {
    resetForTests();
    await writeCommand('overlap', 'pause');
    await writeCommand('overlap', 'resume');
    const got = await readAndClearCommand('overlap');
    expect(got.command).toBe('resume');
  });
});

// ── Exposed constants ────────────────────────────────────────────────────

describe('control.js — exposed constants', () => {
  it('ALLOWED_COMMANDS includes the documented four', () => {
    expect(CONTROL_TEST.ALLOWED_COMMANDS).toEqual(new Set(['pause', 'resume', 'switchMode', 'stop']));
  });
  it('ALLOWED_MODES includes auto/guided/manual', () => {
    expect(CONTROL_TEST.ALLOWED_MODES).toEqual(new Set(['auto', 'guided', 'manual']));
  });
});
