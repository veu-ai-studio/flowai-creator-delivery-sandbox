import { describe, it, expect } from 'vitest';
import {
  buildInputArtifact,
  validateInputArtifact,
  scrubCredentials,
  newArtifactId,
} from '../../src/lib/renewal/inputArtifact.js';

describe('InputArtifact — builder', () => {
  it('builds a valid artifact for each inputType', () => {
    for (const t of ['url', 'description', 'content']) {
      const a = buildInputArtifact({
        inputType: t,
        raw: { url: 'https://example.test' },
        normalized: { productConcept: 'X', targetUsers: 'Y', coreClaims: ['a'], detectedFeatures: ['b'], observedSurfaces: 'crawl' },
      });
      expect(a.inputType).toBe(t);
      expect(typeof a.id).toBe('string');
      expect(typeof a.submittedAt).toBe('string');
      expect(a.normalized.productConcept).toBe('X');
      expect(validateInputArtifact(a).ok).toBe(true);
    }
  });

  it('rejects invalid inputType', () => {
    expect(() => buildInputArtifact({ inputType: 'foo', raw: {}, normalized: {} })).toThrow();
  });

  it('coerces normalized arrays and surface defaults', () => {
    const a = buildInputArtifact({
      inputType: 'url',
      raw: { url: 'x' },
      normalized: { productConcept: 'x', targetUsers: 'y', coreClaims: 'not-an-array', detectedFeatures: null, observedSurfaces: 'bogus' },
    });
    expect(a.normalized.coreClaims).toEqual([]);
    expect(a.normalized.detectedFeatures).toEqual([]);
    expect(a.normalized.observedSurfaces).toBeNull();
  });

  it('validator catches malformed artifacts', () => {
    expect(validateInputArtifact(null).ok).toBe(false);
    expect(validateInputArtifact({ inputType: 'url' }).ok).toBe(false);
  });

  it('newArtifactId emits a 36-char UUID-shaped string', () => {
    const id = newArtifactId();
    expect(typeof id).toBe('string');
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });
});

describe('InputArtifact — scrubCredentials', () => {
  it('redacts loginEmail/loginPassword in description input', () => {
    const a = buildInputArtifact({
      inputType: 'description',
      raw: { description: { productName: 'X', loginEmail: 'a@b.c', loginPassword: 'hunter2' } },
      normalized: { productConcept: 'X', targetUsers: 'Y', coreClaims: [], detectedFeatures: [], observedSurfaces: 'description-only' },
    });
    const scrubbed = scrubCredentials(a);
    expect(scrubbed.raw.description.loginEmail).toBe('[REDACTED]');
    expect(scrubbed.raw.description.loginPassword).toBe('[REDACTED]');
    expect(scrubbed.raw.description.productName).toBe('X');
    // Original artifact must not be mutated.
    expect(a.raw.description.loginEmail).toBe('a@b.c');
  });

  it('redacts attachment.storedPath in content input', () => {
    const a = buildInputArtifact({
      inputType: 'content',
      raw: { content: { attachments: [{ filename: 'x.png', mimeType: 'image/png', size: 100, storedPath: '/tmp/x.png' }] } },
      normalized: { productConcept: '', targetUsers: '', coreClaims: [], detectedFeatures: [], observedSurfaces: 'vision' },
    });
    const scrubbed = scrubCredentials(a);
    expect(scrubbed.raw.content.attachments[0].storedPath).toMatch(/EPHEMERAL/);
    expect(a.raw.content.attachments[0].storedPath).toBe('/tmp/x.png');
  });
});
