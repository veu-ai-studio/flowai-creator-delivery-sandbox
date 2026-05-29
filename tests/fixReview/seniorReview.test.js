// tests/fixReview/seniorReview.test.js
//
// End-to-end and per-check tests for the senior-engineer 8-question
// fix review. Each test feeds synthetic diff input that triggers a
// specific verdict so we know the check fires (and doesn't fire) on
// the right shapes.

import { describe, it, expect } from 'vitest';
import {
  runSeniorReview,
  parseUnifiedDiff,
  SENIOR_REVIEW_QUESTIONS,
} from '../../src/lib/fixReview/seniorReview.js';
import { checkRegressionRisk }          from '../../src/lib/fixReview/checks/regressionRisk.js';
import { checkArchitecturalLayer }      from '../../src/lib/fixReview/checks/architecturalLayer.js';
import { checkFrameworkConventions }    from '../../src/lib/fixReview/checks/frameworkConventions.js';
import { checkRuntimeIntegrity }        from '../../src/lib/fixReview/checks/runtimeIntegrity.js';
import { checkStateModel }              from '../../src/lib/fixReview/checks/stateModel.js';
import { checkSecurityAssumptions }     from '../../src/lib/fixReview/checks/securityAssumptions.js';
import { checkDeploymentCompatibility } from '../../src/lib/fixReview/checks/deploymentCompatibility.js';
import { checkRootCause }               from '../../src/lib/fixReview/checks/rootCause.js';

function file({ path, status = 'modified', addedLines = [], removedLines = [] }) {
  return {
    path, oldPath: path, status,
    additions: addedLines.length, deletions: removedLines.length,
    addedLines, removedLines,
  };
}

describe('runSeniorReview — end-to-end', () => {
  it('emits all 8 questions in order with verdicts', () => {
    const diff = { files: [] };
    const result = runSeniorReview({ diff });
    expect(result.questions.length).toBe(8);
    expect(result.questions.map((q) => q.id)).toEqual([
      'regression_risk', 'architectural_layer', 'framework_conventions',
      'runtime_integrity', 'state_model', 'security_assumptions',
      'deployment_compatibility', 'root_cause',
    ]);
    for (const q of result.questions) {
      expect(['pass', 'warn', 'fail', 'unknown']).toContain(q.verdict);
    }
  });

  it('empty diff rolls up to green', () => {
    const result = runSeniorReview({ diff: { files: [] } });
    expect(result.overall).toBe('green');
  });

  it('overall = red when any question is fail', () => {
    const diff = {
      files: [file({
        path: 'src/components/Bad.jsx', status: 'added',
        addedLines: ['dangerouslySetInnerHTML={{ __html: x }}'],
      })],
    };
    const result = runSeniorReview({ diff });
    expect(result.overall).toBe('red');
    expect(result.questions.find((q) => q.id === 'security_assumptions').verdict).toBe('fail');
  });

  it('SENIOR_REVIEW_QUESTIONS is frozen and totals 8', () => {
    expect(SENIOR_REVIEW_QUESTIONS.length).toBe(8);
    expect(Object.isFrozen(SENIOR_REVIEW_QUESTIONS)).toBe(true);
  });
});

describe('Q1 regressionRisk', () => {
  it('unknown when no importGraph supplied', () => {
    const diff = { files: [file({ path: 'src/lib/x.js', addedLines: ['x'] })] };
    const result = checkRegressionRisk({ diff, repoContext: {} });
    expect(result.verdict).toBe('unknown');
  });
  it('fail when fan-in >= 10', () => {
    const diff = { files: [file({ path: 'src/lib/x.js' })] };
    const importGraph = { 'src/lib/x.js': Array.from({ length: 12 }, (_, i) => `c${i}.js`) };
    const result = checkRegressionRisk({ diff, repoContext: { importGraph } });
    expect(result.verdict).toBe('fail');
  });
  it('warn when fan-in 3..9', () => {
    const diff = { files: [file({ path: 'src/lib/x.js' })] };
    const importGraph = { 'src/lib/x.js': ['a', 'b', 'c', 'd'] };
    const result = checkRegressionRisk({ diff, repoContext: { importGraph } });
    expect(result.verdict).toBe('warn');
  });
  it('pass when fan-in 0..2', () => {
    const diff = { files: [file({ path: 'src/lib/x.js' })] };
    const importGraph = { 'src/lib/x.js': ['a'] };
    const result = checkRegressionRisk({ diff, repoContext: { importGraph } });
    expect(result.verdict).toBe('pass');
  });
});

describe('Q2 architecturalLayer', () => {
  it('warns when UI + lib-shared touched together', () => {
    const diff = {
      files: [
        file({ path: 'src/pages/Foo.jsx' }),
        file({ path: 'src/lib/shared/clock.js' }),
      ],
    };
    const result = checkArchitecturalLayer({ diff });
    expect(result.verdict).toBe('warn');
    expect(result.evidence.join('\n')).toMatch(/risky_layer_pair/);
  });
  it('pass on a single-layer change', () => {
    const diff = { files: [file({ path: 'src/lib/agents/renewal/orchestrator.js' })] };
    expect(checkArchitecturalLayer({ diff }).verdict).toBe('pass');
  });
  it('warns when >=3 distinct layers (excluding test/docs/script)', () => {
    const diff = {
      files: [
        file({ path: 'src/pages/Foo.jsx' }),
        file({ path: 'src/lib/evaluation/evaluationPipeline.js' }),
        file({ path: 'src/lib/scoring/x.js' }),
        file({ path: 'src/lib/remediation/x.js' }),
      ],
    };
    expect(checkArchitecturalLayer({ diff }).verdict).toBe('warn');
  });
});

describe('Q3 frameworkConventions', () => {
  it('fails on process.env.X without VITE_ prefix in a frontend file', () => {
    const diff = {
      files: [file({
        path: 'src/pages/Foo.jsx', status: 'added',
        addedLines: ['const k = process.env.MY_KEY;'],
      })],
    };
    expect(checkFrameworkConventions({ diff }).verdict).toBe('fail');
  });
  it('passes when process.env.VITE_X is used in a frontend file', () => {
    const diff = {
      files: [file({
        path: 'src/pages/Foo.jsx', status: 'added',
        addedLines: ['const k = process.env.VITE_KEY;'],
      })],
    };
    expect(checkFrameworkConventions({ diff }).verdict).toBe('pass');
  });
  it('warns on require() in an ESM file', () => {
    const diff = {
      files: [file({
        path: 'src/lib/x.js', status: 'modified',
        addedLines: ['const fs = require("fs");'],
      })],
    };
    expect(checkFrameworkConventions({ diff }).verdict).toBe('warn');
  });
});

describe('Q4 runtimeIntegrity', () => {
  it('fails on case-collision filenames in the same diff', () => {
    const diff = {
      files: [
        file({ path: 'src/components/ui/Tooltip.jsx', status: 'added' }),
        file({ path: 'src/components/ui/tooltip.jsx', status: 'added' }),
      ],
    };
    expect(checkRuntimeIntegrity({ diff }).verdict).toBe('fail');
  });
  it('fails when a frontend file imports a Node built-in', () => {
    const diff = {
      files: [file({
        path: 'src/components/Foo.jsx', status: 'modified',
        addedLines: ['import { readFileSync } from "fs";'],
      })],
    };
    expect(checkRuntimeIntegrity({ diff }).verdict).toBe('fail');
  });
  it('passes on a clean diff', () => {
    const diff = {
      files: [file({
        path: 'src/lib/agents/renewal/x.js',
        addedLines: ['export function x() { return 1; }'],
      })],
    };
    expect(checkRuntimeIntegrity({ diff }).verdict).toBe('pass');
  });
});

describe('Q5 stateModel', () => {
  it('warns when useState is added in a component', () => {
    const diff = {
      files: [file({
        path: 'src/components/Foo.jsx',
        addedLines: ['const [x, setX] = useState(0);'],
      })],
    };
    expect(checkStateModel({ diff }).verdict).toBe('warn');
  });
  it('warns when a Supabase upsert appears', () => {
    const diff = {
      files: [file({
        path: 'src/lib/db.js',
        addedLines: ['await supabase.from("users").upsert(row);'],
      })],
    };
    expect(checkStateModel({ diff }).verdict).toBe('warn');
  });
  it('passes when no state-bearing pattern appears', () => {
    const diff = {
      files: [file({
        path: 'src/lib/util.js',
        addedLines: ['export function add(a, b) { return a + b; }'],
      })],
    };
    expect(checkStateModel({ diff }).verdict).toBe('pass');
  });
});

describe('Q6 securityAssumptions', () => {
  it('fails on dangerouslySetInnerHTML in added lines', () => {
    const diff = {
      files: [file({
        path: 'src/components/Foo.jsx',
        addedLines: ['<div dangerouslySetInnerHTML={{ __html: x }} />'],
      })],
    };
    expect(checkSecurityAssumptions({ diff }).verdict).toBe('fail');
  });
  it('warns when a security-sensitive path is touched without obvious red flags', () => {
    const diff = {
      files: [file({
        path: 'src/lib/agents/auth/x.js',
        addedLines: ['export function noop() {}'],
      })],
    };
    expect(checkSecurityAssumptions({ diff }).verdict).toBe('warn');
  });
});

describe('Q7 deploymentCompatibility', () => {
  it('warns when package.json adds deps but no lockfile change', () => {
    const diff = {
      files: [file({
        path: 'package.json',
        addedLines: ['"axios": "^1.0.0",'],
      })],
    };
    expect(checkDeploymentCompatibility({ diff, repoContext: {} }).verdict).toBe('warn');
  });
  it('warns when a new api handler is added without vercel.json edit', () => {
    const diff = {
      files: [file({ path: 'api/new-handler.js', status: 'added' })],
    };
    expect(checkDeploymentCompatibility({ diff, repoContext: {} }).verdict).toBe('warn');
  });
  it('warns when new process.env reads appear and a known list is supplied', () => {
    const diff = {
      files: [file({
        path: 'src/lib/x.js',
        addedLines: ['const k = process.env.NEW_THING;'],
      })],
    };
    const result = checkDeploymentCompatibility({ diff, repoContext: { knownEnvVars: ['EXISTING_ONE'] } });
    expect(result.verdict).toBe('warn');
    expect(result.evidence.join('\n')).toMatch(/NEW_THING/);
  });
});

describe('Q8 rootCause', () => {
  it('warns on empty catch block in added lines', () => {
    const diff = {
      files: [file({
        path: 'src/lib/x.js',
        addedLines: ['try { x(); } catch (e) {}'],
      })],
    };
    expect(checkRootCause({ diff }).verdict).toBe('warn');
  });
  it('warns on null-coalesce-mask pattern', () => {
    const diff = {
      files: [file({
        path: 'src/lib/x.js',
        addedLines: ['const count = stats.count ?? 0;'],
      })],
    };
    expect(checkRootCause({ diff }).verdict).toBe('warn');
  });
  it('passes when no symptomatic pattern appears', () => {
    const diff = {
      files: [file({
        path: 'src/lib/x.js',
        addedLines: ['export function add(a, b) { return a + b; }'],
      })],
    };
    expect(checkRootCause({ diff }).verdict).toBe('pass');
  });
});

describe('parseUnifiedDiff', () => {
  it('extracts file paths + per-file additions/deletions', () => {
    const text = [
      'diff --git a/src/a.js b/src/a.js',
      'index abc..def 100644',
      '--- a/src/a.js',
      '+++ b/src/a.js',
      '@@ -1,3 +1,4 @@',
      ' const x = 1;',
      '+const y = 2;',
      '-const z = 3;',
      ' const w = 4;',
    ].join('\n');
    const { files } = parseUnifiedDiff(text);
    expect(files.length).toBe(1);
    expect(files[0].path).toBe('src/a.js');
    expect(files[0].additions).toBe(1);
    expect(files[0].deletions).toBe(1);
    expect(files[0].addedLines).toEqual(['const y = 2;']);
  });

  it('detects added file status from `new file` header', () => {
    const text = [
      'diff --git a/new.js b/new.js',
      'new file mode 100644',
      '--- /dev/null',
      '+++ b/new.js',
      '@@ -0,0 +1,2 @@',
      '+a',
      '+b',
    ].join('\n');
    const { files } = parseUnifiedDiff(text);
    expect(files[0].status).toBe('added');
    expect(files[0].additions).toBe(2);
  });
});
