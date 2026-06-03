import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const src = readFileSync('src/pages/ForgeResearchForm.jsx', 'utf8');

describe('Research Forge URL propagation', () => {
  it('reads URL and description from query params or navigation state', () => {
    expect(src).toContain("searchParams.get('url') ?? location.state?.url");
    expect(src).toContain("searchParams.get('description') ?? location.state?.description");
  });

  it('passes URL through the existing researchRunner precedence fields', () => {
    expect(src).toContain('url: productUrl');
    expect(src).toContain('productUrl');
    expect(src).toContain('productContext');
    expect(src).toContain('normalizedInput');
  });

  it('captures description without hardcoding AUTOMATIC client-side mode', () => {
    expect(src).toContain('productDescription');
    expect(src).toContain("toolIntelligenceMode: 'GUIDED'");
    expect(src).not.toContain("toolIntelligenceMode: 'AUTOMATIC'");
  });

  it('blocks unsafe URLs before runResearch', () => {
    expect(src).toContain('function blockedPublicUrlReason');
    expect(src).toContain("host === 'localhost'");
    expect(src).toContain('a === 10');
    expect(src).toContain('a === 169 && b === 254');
    expect(src).toContain('setUrlGuardMessage(blockedReason)');
  });
});
