import { describe, expect, it } from 'vitest';

import {
  formatAuditReport,
  runAudit,
} from '../../scripts/auditCommit.js';

function makeGit({ rangeFiles = [], headFiles = [], newFiles = [], commitFiles = {}, fileContents = {}, addedDiff = '' } = {}) {
  return args => {
    const command = args.join(' ');
    if (args[0] === 'diff' && args.includes('--diff-filter=A')) return `${newFiles.join('\n')}\n`;
    if (args[0] === 'diff' && args.includes('--unified=0')) return addedDiff;
    if (args[0] === 'diff' && args[1] === '--name-only' && args[2]?.includes('^')) return `${headFiles.join('\n')}\n`;
    if (args[0] === 'diff' && args[1] === '--name-only') return `${rangeFiles.join('\n')}\n`;
    if (args[0] === 'rev-list') return `${Object.keys(commitFiles).join('\n')}\n`;
    if (args[0] === 'diff-tree') return `${(commitFiles[args.at(-1)] ?? []).join('\n')}\n`;
    if (args[0] === 'show') {
      const spec = args[1];
      const file = spec.slice(spec.indexOf(':') + 1);
      return fileContents[file] ?? '';
    }
    throw new Error(`unexpected git call: ${command}`);
  };
}

describe('v0.2C auditCommit', () => {
  it('PASS output when all checks clean', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['src/lib/orchestratorFramework/controlScheme.js'],
        headFiles: ['src/lib/orchestratorFramework/controlScheme.js'],
        commitFiles: { head456: ['src/lib/orchestratorFramework/controlScheme.js'] },
      }),
    });
    const report = formatAuditReport(result);

    expect(result.mechanicalVerdict).toBe('PASS');
    expect(report).toContain('AUTOMATED AUDIT REPORT');
    expect(report).toContain('CHECK 1 PROTECTED FILES: PASS');
    expect(report).toContain('MECHANICAL VERDICT: PASS');
  });

  it('FAIL on protected file touched', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['src/api/base44Client.js'],
        headFiles: ['src/api/base44Client.js'],
      }),
    });

    expect(result.checks.protectedFiles.status).toBe('FAIL');
    expect(result.mechanicalVerdict).toBe('FAIL');
  });

  it('FAIL on CA-19/CA-25 found in new src/', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['src/lib/orchestratorFramework/ca19.js'],
        headFiles: ['src/lib/orchestratorFramework/ca19.js'],
        newFiles: ['src/lib/orchestratorFramework/ca19.js'],
        fileContents: {
          'src/lib/orchestratorFramework/ca19.js': 'export const marker = "CA-19 implementation";',
        },
      }),
    });

    expect(result.checks.caAbsence.status).toBe('FAIL');
    expect(result.mechanicalVerdict).toBe('FAIL');
  });

  it('WARNING on out-of-scope file detected', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['package.json'],
        headFiles: ['package.json'],
      }),
    });

    expect(result.checks.scopeBoundary.status).toBe('WARNING');
    expect(result.mechanicalVerdict).toBe('PASS');
  });

  it('excludes generated matrix artifact from scope boundary warnings', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['src/lib/orchestratorFramework/matrixArtifact.json'],
        headFiles: ['src/lib/orchestratorFramework/matrixArtifact.json'],
      }),
    });

    expect(result.checks.scopeBoundary.status).toBe('PASS');
    expect(result.checks.scopeBoundary.details).toEqual([]);
  });

  it('logs App.jsx route update as info when a new page is added', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['src/App.jsx', 'src/pages/ForgeResearchForm.jsx'],
        headFiles: ['src/App.jsx', 'src/pages/ForgeResearchForm.jsx'],
        newFiles: ['src/pages/ForgeResearchForm.jsx'],
      }),
    });

    expect(result.checks.scopeBoundary.status).toBe('PASS');
    expect(result.checks.scopeBoundary.details).toEqual([
      'INFO: src/App.jsx route update expected because new page file added: src/pages/ForgeResearchForm.jsx',
    ]);
    expect(result.mechanicalVerdict).toBe('PASS');
  });

  it('output matches exact format spec', () => {
    const result = runAudit({
      base: 'base123',
      head: 'head456',
      git: makeGit({
        rangeFiles: ['src/lib/orchestratorFramework/controlScheme.js'],
        headFiles: ['src/lib/orchestratorFramework/controlScheme.js'],
      }),
    });
    const report = formatAuditReport({ ...result, timestamp: '2026-05-29T00:00:00.000Z' });
    const lines = report.split('\n');

    expect(lines[0]).toBe('═══════════════════════════════════════════════');
    expect(lines[1]).toBe('AUTOMATED AUDIT REPORT');
    expect(lines[2]).toBe('Base: base123  Head: head456');
    expect(lines[3]).toBe('Date: 2026-05-29T00:00:00.000Z');
    expect(lines[5]).toBe('CHECK 1 PROTECTED FILES: PASS');
    expect(lines[6]).toBe('CHECK 2 LANE DISCIPLINE: PASS');
    expect(lines[7]).toBe('CHECK 3 CA-19/25 ABSENCE: PASS');
    expect(lines[8]).toBe('CHECK 4 SCOPE BOUNDARY: PASS');
    expect(lines[9]).toBe('CHECK 5 HOT-STORE BOUNDARY: PASS');
    expect(lines[11]).toBe('MECHANICAL VERDICT: PASS');
    expect(lines.at(-1)).toBe('═══════════════════════════════════════════════');
  });
});
