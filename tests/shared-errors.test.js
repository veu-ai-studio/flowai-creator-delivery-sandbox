/**
 * TDD scaffold for src/lib/shared/errors.js.
 * Spec: specs/w5-design/08-error-hierarchy.md
 *
 * Expected to fail until implemented.
 */
import { describe, it, expect } from 'vitest';

const MODULE = '../src/lib/shared/errors.js';
const load = () => import(MODULE);

const SUBCLASSES = [
  'ConfigError',
  'ValidationError',
  'PayloadError',
  'CharterError',
  'AuthorityError',
  'DependencyError',
  'NotImplementedError',
  'ChainError',
  'EvaluatorError',
];

describe('errors — surface', () => {
  it('exports FlowAiError base class', async () => {
    const { FlowAiError } = await load();
    expect(typeof FlowAiError).toBe('function');
    expect(FlowAiError.prototype).toBeInstanceOf(Error);
  });

  it.each(SUBCLASSES)('exports %s subclass of FlowAiError', async (name) => {
    const m = await load();
    expect(typeof m[name]).toBe('function');
    const e = new m[name]('test');
    expect(e).toBeInstanceOf(m.FlowAiError);
    expect(e).toBeInstanceOf(Error);
  });
});

describe('errors — FlowAiError shape', () => {
  it('carries code and details', async () => {
    const { FlowAiError } = await load();
    const e = new FlowAiError('boom', { code: 'X_TEST', details: { foo: 1 } });
    expect(e.code).toBe('X_TEST');
    expect(e.details).toEqual({ foo: 1 });
  });

  it('details is frozen', async () => {
    const { FlowAiError } = await load();
    const e = new FlowAiError('boom', { details: { foo: 1 } });
    expect(Object.isFrozen(e.details)).toBe(true);
  });

  it('default code is FLOWAI_ERROR', async () => {
    const { FlowAiError } = await load();
    expect(new FlowAiError('x').code).toBe('FLOWAI_ERROR');
  });

  it('supports cause via ES2022 cause option', async () => {
    const { FlowAiError } = await load();
    const inner = new Error('inner');
    const outer = new FlowAiError('outer', { cause: inner });
    expect(outer.cause).toBe(inner);
  });

  it('subclass name on .name property', async () => {
    const { ValidationError } = await load();
    expect(new ValidationError('x').name).toBe('ValidationError');
  });

  it('toJSON returns serializable shape without stack by default', async () => {
    const { FlowAiError } = await load();
    const e = new FlowAiError('boom', { code: 'X', details: { a: 1 } });
    const j = e.toJSON();
    expect(j).toMatchObject({ name: 'FlowAiError', message: 'boom', code: 'X', details: { a: 1 } });
    expect(j.stack).toBeUndefined();
  });
});

describe('errors — catch by subclass', () => {
  it('catchers can branch on instanceof', async () => {
    const { ValidationError, AuthorityError } = await load();
    function pick(e) {
      if (e instanceof AuthorityError) return 'auth';
      if (e instanceof ValidationError) return 'val';
      return 'other';
    }
    expect(pick(new ValidationError('x'))).toBe('val');
    expect(pick(new AuthorityError('x'))).toBe('auth');
  });
});
