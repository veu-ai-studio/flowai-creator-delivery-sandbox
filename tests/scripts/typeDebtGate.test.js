import { describe, expect, it } from 'vitest';
import {
  compareDiagnostics,
  evaluateTypeDebt,
  parseDiagnostics,
} from '../../scripts/check-type-debt.mjs';

const original = 'src/a.js(1,2): error TS2322: Type string is not assignable to number.';

describe('audited TypeScript debt gate', () => {
  it('parses stable diagnostic identities', () => {
    expect(parseDiagnostics(`${original}\r\nsrc/b.jsx(4,5): error TS2339: Property x does not exist.`)).toEqual([
      expect.objectContaining({ file: 'src/a.js', line: 1, column: 2, code: 'TS2322' }),
      expect.objectContaining({ file: 'src/b.jsx', line: 4, column: 5, code: 'TS2339' }),
    ]);
  });

  it('captures global and configuration diagnostics', () => {
    expect(parseDiagnostics('error TS18003: No inputs were found in config file.')).toEqual([
      { file: null, line: null, column: null, code: 'TS18003', message: 'No inputs were found in config file.' },
    ]);
    expect(() => parseDiagnostics('prefix error TS18003: malformed')).toThrow(/Unparsed TypeScript diagnostic/);
  });

  it('requires a reviewed baseline ratchet when debt is resolved', () => {
    const baseline = parseDiagnostics(`${original}\nsrc/old.js(2,3): error TS2339: Old debt.`);
    const current = parseDiagnostics(original);
    expect(evaluateTypeDebt({ current, baseline })).toMatchObject({
      ok: false,
      currentCount: 1,
      baselineCount: 2,
      additions: [],
    });
  });

  it('fails any new diagnostic, including a moved legacy error', () => {
    const baseline = parseDiagnostics(original);
    const current = parseDiagnostics('src/a.js(2,2): error TS2322: Type string is not assignable to number.');
    const comparison = compareDiagnostics(current, baseline);
    expect(comparison.additions).toHaveLength(1);
    expect(evaluateTypeDebt({ current, baseline }).ok).toBe(false);
  });

  it('treats duplicate occurrences as distinct debt', () => {
    const baseline = parseDiagnostics(original);
    const current = parseDiagnostics(`${original}\n${original}`);
    expect(compareDiagnostics(current, baseline).additions).toHaveLength(1);
  });

  it('fails a resolved diagnostic if it reappears after baseline pruning', () => {
    const debt = parseDiagnostics(original);
    expect(evaluateTypeDebt({ current: [], baseline: debt }).ok).toBe(false);
    expect(evaluateTypeDebt({ current: debt, baseline: [] }).ok).toBe(false);
  });
});
