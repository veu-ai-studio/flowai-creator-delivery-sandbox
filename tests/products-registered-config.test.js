import { describe, it, expect } from 'vitest';
import {
  REGISTERED_PRODUCT_CONFIG,
  findRegisteredProductConfigForUrl,
} from '../src/lib/products/registeredProductConfig.js';

describe('registered product config', () => {
  it('registers SAIGE with source mapping limitation metadata', () => {
    const saige = REGISTERED_PRODUCT_CONFIG.find((product) => product.name === 'SAIGE');
    expect(saige).toMatchObject({
      domain: 'saigeplatform.com',
      repo: 'https://github.com/victor2081new-cloud/saige',
      branch: 'main',
      status: 'registered',
      note: 'repo contains zip only - source mapping limited until codebase extracted',
    });
    expect(saige.systemNote).toContain('SAIGE repo registered');
    expect(saige.systemNote).toContain('saige-github-upload.zip');
  });

  it('matches SAIGE URLs by host only', () => {
    expect(findRegisteredProductConfigForUrl('https://saigeplatform.com')?.name).toBe('SAIGE');
    expect(findRegisteredProductConfigForUrl('www.saigeplatform.com')?.name).toBe('SAIGE');
    expect(findRegisteredProductConfigForUrl('https://example.com')).toBeNull();
  });
});
