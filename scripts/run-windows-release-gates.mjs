#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const RELEASE_GATES = Object.freeze([
  { name: 'lint', command: 'npm', args: ['run', 'lint'] },
  { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
  { name: 'build:preflight', command: 'npm', args: ['run', 'build:preflight'] },
  { name: 'vitest', command: 'npm', args: ['exec', '--no', '--', 'vitest', 'run'] },
  { name: 'lane-discipline', command: 'node', args: ['scripts/checkLaneDiscipline.js'] },
  { name: 'ssot-traceability', command: 'node', args: ['scripts/check-ssot-traceability.mjs'] },
  { name: 'matrix-generation', command: 'node', args: ['scripts/generateMatrixArtifact.js'] },
]);

function quoteCmdArg(value) {
  const text = String(value);
  return /[\s"&|<>^]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function spawnSpec(gate, platform = process.platform) {
  if (gate.command === 'node') return { command: process.execPath, args: gate.args };
  if (platform !== 'win32') return { command: gate.command, args: gate.args };
  const commandLine = [gate.command, ...gate.args].map(quoteCmdArg).join(' ');
  return {
    command: process.env.ComSpec || 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine],
  };
}

export function runGate(gate, {
  spawnImpl = spawn,
  platform = process.platform,
  cwd = process.cwd(),
  heartbeatMs = 30_000,
  log = console.log,
} = {}) {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    log(JSON.stringify({ event: 'release_gate_started', gate: gate.name }));
    const spec = spawnSpec(gate, platform);
    const child = spawnImpl(spec.command, spec.args, {
      cwd,
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    });
    const heartbeat = setInterval(() => {
      log(JSON.stringify({
        event: 'release_gate_heartbeat',
        gate: gate.name,
        elapsedSeconds: Math.round((Date.now() - startedAt) / 1000),
        pid: child.pid ?? null,
      }));
    }, heartbeatMs);
    heartbeat.unref?.();
    let settled = false;
    const finish = (exitCode, signal = null, error = null) => {
      if (settled) return;
      settled = true;
      clearInterval(heartbeat);
      const result = {
        gate: gate.name,
        exitCode,
        signal,
        durationMs: Date.now() - startedAt,
        error: error ? String(error.message || error) : null,
      };
      log(JSON.stringify({ event: 'release_gate_finished', ...result }));
      resolve(result);
    };
    child.once('error', (error) => finish(1, null, error));
    child.once('close', (code, signal) => finish(Number.isInteger(code) ? code : 1, signal));
  });
}

export async function runReleaseGates(options = {}) {
  const results = [];
  for (const gate of options.gates || RELEASE_GATES) {
    const result = await runGate(gate, options);
    results.push(result);
    if (result.exitCode !== 0) return { ok: false, exitCode: result.exitCode, results };
  }
  return { ok: true, exitCode: 0, results };
}

const invokedDirectly = process.argv[1]
  && fileURLToPath(import.meta.url).toLowerCase() === process.argv[1].toLowerCase();

if (invokedDirectly) {
  const result = await runReleaseGates();
  process.exitCode = result.exitCode;
}
