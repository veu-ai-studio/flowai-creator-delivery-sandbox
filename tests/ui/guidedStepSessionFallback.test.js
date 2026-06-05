import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guidedStepSrc = readFileSync('src/pages/GuidedStep.jsx', 'utf8');

describe('GuidedStep session initialization fallback', () => {
  it('bounds Base44 GuidedSession load so /guided routes cannot spin forever', () => {
    expect(guidedStepSrc).toContain('GUIDED_SESSION_LOAD_TIMEOUT_MS = 8000');
    expect(guidedStepSrc).toContain('function withGuidedSessionTimeout');
    expect(guidedStepSrc).toContain('Promise.race([promise, timeout])');
    expect(guidedStepSrc).toContain('withGuidedSessionTimeout(base44.entities.GuidedSession.filter');
    expect(guidedStepSrc).toContain('withGuidedSessionTimeout(base44.entities.GuidedSession.create');
  });

  it('falls back to the guided input panel with visible warning on session-load failure', () => {
    expect(guidedStepSrc).toContain('setSessionLoadWarning');
    expect(guidedStepSrc).toContain('Guided session service timed out. Start a new session or retry.');
    expect(guidedStepSrc).toContain('Guided session fallback');
    expect(guidedStepSrc).toMatch(/setShowInputPanel\(true\)[\s\S]*setPhase\('propose'\)[\s\S]*setLoading\(false\)/);
  });
});
