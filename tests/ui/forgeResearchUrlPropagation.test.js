import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync('src/pages/ForgeResearchForm.jsx', 'utf8');

describe('Research Forge URL propagation', () => {
  it('reads URL and description from query params or navigation state', () => {
    expect(src).toContain("searchParams.get('url') ?? location.state?.url");
    expect(src).toContain("searchParams.get('description') ?? location.state?.description");
  });

  it('passes URL and product context to the server-side independent stage', () => {
    expect(src).toContain('url: productUrl');
    expect(src).toContain('productUrl');
    expect(src).toContain('productContext');
    expect(src).toContain("fetch('/api/forge/stage'");
  });

  it('captures description and delegates AUTOMATIC execution to the server', () => {
    expect(src).toContain('productDescription');
    expect(src).toContain("toolIntelligenceMode: 'AUTOMATIC'");
    expect(src).not.toContain('runResearch(');
  });

  it('blocks unsafe URLs before the server request', () => {
    expect(src).toContain('function blockedPublicUrlReason');
    expect(src).toContain("host === 'localhost'");
    expect(src).toContain('a === 10');
    expect(src).toContain('a === 169 && b === 254');
    expect(src).toContain('setUrlGuardMessage(blockedReason)');
  });
});
