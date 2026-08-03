import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { RELEASE_GATES, runGate, runReleaseGates } from '../../scripts/run-windows-release-gates.mjs';

function spawning(exitCodes) {
  const calls = [];
  const spawnImpl = vi.fn((command, args, options) => {
    calls.push({ command, args, options });
    const child = new EventEmitter();
    child.pid = 1234 + calls.length;
    queueMicrotask(() => child.emit('close', exitCodes[calls.length - 1], null));
    return child;
  });
  return { calls, spawnImpl };
}

describe('Windows release gate runner', () => {
  it('runs debt non-regression separately before preserving strict typecheck truth', () => {
    expect(RELEASE_GATES.slice(1, 3)).toEqual([
      { name: 'typecheck:debt', command: 'npm', args: ['run', 'typecheck:debt'] },
      { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
    ]);
  });
  it('uses Windows executables, terminates, and preserves a genuine failure code', async () => {
    const { calls, spawnImpl } = spawning([7]);
    const result = await runGate(
      { name: 'lint', command: 'npm', args: ['run', 'lint'] },
      { spawnImpl, platform: 'win32', heartbeatMs: 5, log: vi.fn() },
    );
    expect(result.exitCode).toBe(7);
    expect(calls).toEqual([expect.objectContaining({
      command: process.env.ComSpec || 'cmd.exe',
      args: ['/d', '/s', '/c', 'npm run lint'],
      options: expect.objectContaining({ shell: false, windowsHide: true }),
    })]);
  });

  it('runs gates serially and does not mask or continue after a failure', async () => {
    const { calls, spawnImpl } = spawning([0, 2, 0]);
    const result = await runReleaseGates({
      gates: [
        { name: 'lint', command: 'npm', args: ['run', 'lint'] },
        { name: 'typecheck', command: 'npm', args: ['run', 'typecheck'] },
        { name: 'build', command: 'npm', args: ['run', 'build:preflight'] },
      ],
      spawnImpl,
      platform: 'win32',
      heartbeatMs: 5,
      log: vi.fn(),
    });
    expect(result).toMatchObject({ ok: false, exitCode: 2 });
    expect(calls.map((call) => call.args[3])).toEqual(['npm run lint', 'npm run typecheck']);
  });

  it('reports success only after every child terminates successfully', async () => {
    const { calls, spawnImpl } = spawning([0, 0]);
    const result = await runReleaseGates({
      gates: [
        { name: 'lane', command: 'node', args: ['lane.js'] },
        { name: 'ssot', command: 'node', args: ['ssot.mjs'] },
      ],
      spawnImpl,
      platform: 'win32',
      heartbeatMs: 5,
      log: vi.fn(),
    });
    expect(result).toMatchObject({ ok: true, exitCode: 0 });
    expect(calls).toHaveLength(2);
    expect(calls.every((call) => call.command === process.execPath)).toBe(true);
  });
});
