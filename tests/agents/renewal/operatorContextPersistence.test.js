import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const orchestratorSrc = readFileSync(
  resolve(__dirname, '../../../src/lib/agents/renewal/orchestrator.js'),
  'utf8',
);

describe('operator context persistence', () => {
  it('promotes a pathB run to PATH_A when the operator repo probe is validated', () => {
    expect(orchestratorSrc).toContain('state.operatorContext = Object.freeze({');
    expect(orchestratorSrc).toContain('validated: access?.canRead === true');
    expect(orchestratorSrc).toContain('if (pathB && githubRepoUrl && state.operatorContext?.validated === true)');
    expect(orchestratorSrc).toContain('__operatorContext: state.operatorContext');
    expect(orchestratorSrc).toContain('pathB = false');
    expect(orchestratorSrc).toContain("state.runMode = 'PATH_A'");
    expect(orchestratorSrc).toContain('operator context promotion');
  });
});
