// Tests for src/lib/syntheticPromptLoader.js
//
// The loader reads from a non-public source (env vars). Tests inject the
// env source via `opts.env` so no real environment variables are read.

import { describe, it, expect } from 'vitest';
import {
  loadSyntheticPrompt,
  syntheticPromptEnvKey,
  SYNTHETIC_PROMPT_KEY_PREFIX,
} from '../src/lib/syntheticPromptLoader.js';

describe('SYNTHETIC_PROMPT_KEY_PREFIX', () => {
  it('exposes the canonical key prefix', () => {
    expect(SYNTHETIC_PROMPT_KEY_PREFIX).toBe('VITE_SYNTHETIC_PROMPT_');
  });
});

describe('syntheticPromptEnvKey', () => {
  it('uppercases and strips non-alphanumerics', () => {
    expect(syntheticPromptEnvKey('saige')).toBe('VITE_SYNTHETIC_PROMPT_SAIGE');
    expect(syntheticPromptEnvKey('PressAI')).toBe('VITE_SYNTHETIC_PROMPT_PRESSAI');
    expect(syntheticPromptEnvKey('MyBirthSafe')).toBe('VITE_SYNTHETIC_PROMPT_MYBIRTHSAFE');
    expect(syntheticPromptEnvKey('rel-twin')).toBe('VITE_SYNTHETIC_PROMPT_RELTWIN');
    expect(syntheticPromptEnvKey('reach_sms')).toBe('VITE_SYNTHETIC_PROMPT_REACHSMS');
  });

  it('returns null for empty / non-string input', () => {
    expect(syntheticPromptEnvKey('')).toBe(null);
    expect(syntheticPromptEnvKey(null)).toBe(null);
    expect(syntheticPromptEnvKey(undefined)).toBe(null);
    expect(syntheticPromptEnvKey(42)).toBe(null);
  });
});

describe('loadSyntheticPrompt', () => {
  it('returns null when env source is empty', () => {
    expect(loadSyntheticPrompt('saige', { env: {} })).toBe(null);
  });

  it('returns null for non-string slug', () => {
    expect(loadSyntheticPrompt(null, { env: { VITE_SYNTHETIC_PROMPT_SAIGE: 'x' } })).toBe(null);
    expect(loadSyntheticPrompt(undefined, { env: { VITE_SYNTHETIC_PROMPT_SAIGE: 'x' } })).toBe(null);
    expect(loadSyntheticPrompt(42, { env: { VITE_SYNTHETIC_PROMPT_SAIGE: 'x' } })).toBe(null);
  });

  it('returns null for empty-string slug', () => {
    expect(loadSyntheticPrompt('', { env: { VITE_SYNTHETIC_PROMPT_SAIGE: 'x' } })).toBe(null);
  });

  it('returns the env value when set (lowercase slug)', () => {
    const env = { VITE_SYNTHETIC_PROMPT_SAIGE: 'Generate a SAIGE demo dataset.' };
    expect(loadSyntheticPrompt('saige', { env })).toBe('Generate a SAIGE demo dataset.');
  });

  it('returns the env value when slug is mixed-case', () => {
    const env = { VITE_SYNTHETIC_PROMPT_PRESSAI: 'PressAI prompt' };
    expect(loadSyntheticPrompt('PressAI', { env })).toBe('PressAI prompt');
  });

  it('strips non-alphanumeric characters from slug before lookup', () => {
    const env = { VITE_SYNTHETIC_PROMPT_RELTWIN: 'RelTwin prompt' };
    expect(loadSyntheticPrompt('rel-twin', { env })).toBe('RelTwin prompt');
    expect(loadSyntheticPrompt('rel_twin', { env })).toBe('RelTwin prompt');
    expect(loadSyntheticPrompt('Rel.Twin', { env })).toBe('RelTwin prompt');
  });

  it('returns null when env value is empty string', () => {
    expect(loadSyntheticPrompt('saige', { env: { VITE_SYNTHETIC_PROMPT_SAIGE: '' } })).toBe(null);
  });

  it('returns null when env value is non-string', () => {
    expect(loadSyntheticPrompt('saige', { env: { VITE_SYNTHETIC_PROMPT_SAIGE: 42 } })).toBe(null);
    expect(loadSyntheticPrompt('saige', { env: { VITE_SYNTHETIC_PROMPT_SAIGE: null } })).toBe(null);
  });

  it('uses process.env when no override and import.meta.env is unavailable', () => {
    const PREV = process.env.VITE_SYNTHETIC_PROMPT_TESTPROC;
    process.env.VITE_SYNTHETIC_PROMPT_TESTPROC = 'from process.env';
    try {
      expect(loadSyntheticPrompt('testproc')).toBe('from process.env');
    } finally {
      if (PREV === undefined) delete process.env.VITE_SYNTHETIC_PROMPT_TESTPROC;
      else process.env.VITE_SYNTHETIC_PROMPT_TESTPROC = PREV;
    }
  });

  it('does not leak across product slugs', () => {
    const env = { VITE_SYNTHETIC_PROMPT_SAIGE: 'saige content' };
    expect(loadSyntheticPrompt('pressai', { env })).toBe(null);
    expect(loadSyntheticPrompt('saige', { env })).toBe('saige content');
  });
});
