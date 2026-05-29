import { describe, expect, it } from 'vitest';
import {
  buildSsotVocabularyContext,
  toInternalOrchestraExecutionMode,
  toInternalSystemOperationLevel,
  toSsotOrchestraExecutionMode,
  toSsotSystemOperationLevel,
} from '../../src/lib/flowai/ssotVocabularyAdapters.js';

describe('SSOT vocabulary adapters', () => {
  it('maps internal Orchestra execution modes to SSOT vocabulary', () => {
    expect(toSsotOrchestraExecutionMode('auto')).toBe('AUTOMATIC');
    expect(toSsotOrchestraExecutionMode('guided')).toBe('GUIDED');
    expect(toSsotOrchestraExecutionMode('manual')).toBe('MANUAL-ORCHESTRA');
  });

  it('maps SSOT Orchestra execution modes back to internal runtime values', () => {
    expect(toInternalOrchestraExecutionMode('AUTOMATIC')).toBe('auto');
    expect(toInternalOrchestraExecutionMode('GUIDED')).toBe('guided');
    expect(toInternalOrchestraExecutionMode('MANUAL-ORCHESTRA')).toBe('manual');
  });

  it('maps internal system operation levels to SSOT vocabulary', () => {
    expect(toSsotSystemOperationLevel('supervised')).toBe('SUPERVISED-OP');
    expect(toSsotSystemOperationLevel('manual')).toBe('MANUAL-OP');
  });

  it('maps SSOT system operation levels back to internal runtime values', () => {
    expect(toInternalSystemOperationLevel('SUPERVISED-OP')).toBe('supervised');
    expect(toInternalSystemOperationLevel('MANUAL-OP')).toBe('manual');
  });

  it('builds governance context while preserving internal values', () => {
    expect(buildSsotVocabularyContext({
      orchestraMode: 'auto',
      systemOperationLevel: 'supervised',
    })).toEqual({
      axisA: {
        ssot: 'SUPERVISED-OP',
        internal: 'supervised',
      },
      axisB: {
        ssot: 'AUTOMATIC',
        internal: 'auto',
      },
    });
  });

  it('returns null for unsupported values instead of inventing vocabulary', () => {
    expect(toSsotOrchestraExecutionMode('migration')).toBeNull();
    expect(toSsotSystemOperationLevel('auto')).toBeNull();
  });
});
