import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const handlerSource = readFileSync(new URL('../src/api/run-construction.js', import.meta.url), 'utf8');
const landingSource = readFileSync(new URL('../src/pages/LandingPage.jsx', import.meta.url), 'utf8');

describe('run-construction release policy', () => {
  it('authenticates before rate limiting and body parsing', () => {
    const authOffset = handlerSource.indexOf('await requireAuthHard(req, res)');
    const rateLimitOffset = handlerSource.indexOf('await rateLimit(req');
    const bodyParseOffset = handlerSource.indexOf("typeof req.body === 'string'");

    expect(authOffset).toBeGreaterThan(0);
    expect(authOffset).toBeLessThan(rateLimitOffset);
    expect(authOffset).toBeLessThan(bodyParseOffset);
  });

  it('routes normal production URLs through the operational runner', () => {
    expect(landingSource).toContain("['migration', 'fresh_build'].includes(flowHubPath)");
    expect(landingSource).toContain("navigate(`/flowai?url=${encodeURIComponent(urlInput.trim())}&mode=${encodeURIComponent(mode)}`)");
    expect(landingSource).not.toContain("activeCard === 'A' && !!urlInput.trim();");
  });
});
