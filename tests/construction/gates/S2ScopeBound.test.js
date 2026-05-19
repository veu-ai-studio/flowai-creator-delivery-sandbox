// tests/construction/gates/S2ScopeBound.test.js
//
// CA-17 §3.2 conformance — S2 bounded scope. Covers S2-CT-1..S2-CT-6
// including v3-final density 100 + redesign_implementation clamp.

import { describe, it, expect } from 'vitest';
import {
  declareScopeCaps,
  validateAgainstCaps,
  SYSTEM_CAPS,
  PER_CLASS_DEFAULTS,
  SCOPE_VIOLATION_KIND,
  SYSTEM_CAP_CLAMP_KIND,
} from '../../../src/lib/construction/gates/S2ScopeBound.js';

describe('S2 — declareScopeCaps per-class defaults + system caps', () => {
  it('system caps frozen at 15/1500/3/4/100 (v3-final)', () => {
    expect(SYSTEM_CAPS.file_count_cap).toBe(15);
    expect(SYSTEM_CAPS.line_count_cap).toBe(1500);
    expect(SYSTEM_CAPS.new_dependency_cap).toBe(3);
    expect(SYSTEM_CAPS.dependency_graph_radius).toBe(4);
    expect(SYSTEM_CAPS.per_file_density_ceiling).toBe(100);
  });

  it('wire_up class defaults match CA-17 §3.2 v3-final', () => {
    const { caps } = declareScopeCaps({ constructionClass: 'wire_up' });
    expect(caps.file_count_cap).toBe(5);
    expect(caps.line_count_cap).toBe(200);
    expect(caps.new_dependency_cap).toBe(0);
    expect(caps.per_file_density_ceiling).toBe(100);
  });

  it('S2-CT-6: redesign_implementation override above system cap is CLAMPED with system_cap_clamp.v1', () => {
    const { caps, clamps } = declareScopeCaps({
      constructionClass: 'redesign_implementation',
      operatorOverrides: { file_count_cap: 20 },
    });
    expect(caps.file_count_cap).toBe(15);
    expect(clamps).toHaveLength(1);
    expect(clamps[0].kind).toBe(SYSTEM_CAP_CLAMP_KIND);
    expect(clamps[0].clamped_to).toBe(15);
  });

  it('non-redesign overrides above system cap REJECTED (not clamped)', () => {
    expect(() => declareScopeCaps({
      constructionClass: 'wire_up',
      operatorOverrides: { file_count_cap: 20 },
    })).toThrowError(/REJECTS/);
  });

  it('unknown construction class is rejected', () => {
    expect(() => declareScopeCaps({ constructionClass: 'badclass' }))
      .toThrowError(/unknown construction class/);
  });
});

describe('S2 — validateAgainstCaps abort paths', () => {
  const wireUpCaps = declareScopeCaps({ constructionClass: 'wire_up' }).caps;

  it('S2-CT-1: file_count over class cap aborts with construction_scope_violation', () => {
    const files = Array.from({ length: 6 }, (_, i) => ({ path: `a/b/${i}.js`, lineCount: 20 }));
    let err;
    try { validateAgainstCaps({ caps: wireUpCaps, files }); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.code).toBe(SCOPE_VIOLATION_KIND);
    expect(err.cap_violated).toBe('file_count');
  });

  it('S2-CT-2: line_count aggregate over class cap aborts', () => {
    const files = [
      { path: 'a/1.js', lineCount: 99 },
      { path: 'a/2.js', lineCount: 99 },
      { path: 'a/3.js', lineCount: 99 },
    ];
    let err;
    try { validateAgainstCaps({ caps: wireUpCaps, files }); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.cap_violated).toBe('line_count');
  });

  it('S2-CT-5 (v3-final): per-file density 105 > 100 aborts even under aggregate cap', () => {
    const files = [
      { path: 'a/1.js', lineCount: 105 },
      { path: 'a/2.js', lineCount: 50 },
    ];
    let err;
    try { validateAgainstCaps({ caps: wireUpCaps, files }); } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.cap_violated).toBe('file_density_ceiling');
    expect(err.lineCount).toBe(105);
  });

  it('new-dependency violation aborts (wire_up requires 0)', () => {
    let err;
    try {
      validateAgainstCaps({
        caps: wireUpCaps,
        files: [{ path: 'a.js', lineCount: 10 }],
        newDependencies: ['lodash'],
      });
    } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.cap_violated).toBe('new_dependencies');
  });

  it('dependency_graph_radius violation aborts', () => {
    let err;
    try {
      validateAgainstCaps({
        caps: wireUpCaps,
        files: [{ path: 'a.js', lineCount: 10 }],
        dependencyGraphRadius: 5,
      });
    } catch (e) { err = e; }
    expect(err).toBeDefined();
    expect(err.cap_violated).toBe('dependency_graph_radius');
  });

  it('S2-CT-4: caps surface in approval summary including density ceiling 100', () => {
    const { caps } = declareScopeCaps({ constructionClass: 'wire_up' });
    expect(caps.per_file_density_ceiling).toBe(100);
  });

  it('happy path: valid wire_up candidate passes', () => {
    const { caps } = declareScopeCaps({ constructionClass: 'wire_up' });
    const result = validateAgainstCaps({
      caps,
      files: [
        { path: 'api/wire/transfer.js', lineCount: 60 },
        { path: 'src/pages/Settings.jsx', lineCount: 20 },
      ],
      newDependencies: [],
      newEndpointCount: 1,
      dependencyGraphRadius: 1,
    });
    expect(result.ok).toBe(true);
    expect(result.fileCount).toBe(2);
    expect(result.totalLines).toBe(80);
  });
});
