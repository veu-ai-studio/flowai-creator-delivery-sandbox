import { readFileSync } from 'fs';
import { describe, it, expect } from 'vitest';

const src = readFileSync(
  'src/pages/FlowAIDashboard.jsx', 'utf8');

describe('Launch Forge navigation', () => {
  it('imports useNavigate', () => {
    expect(src).toContain(
      "useNavigate");
  });
  it('imports resolveProductContext', () => {
    expect(src).toContain(
      "resolveProductContext");
  });
  it('defines launchForge function', () => {
    expect(src).toContain("launchForge");
  });
  it('navigates to forge/research', () => {
    expect(src).toContain(
      "/forge/research?productId=");
  });
  it('uses encodeURIComponent', () => {
    expect(src).toContain(
      "encodeURIComponent");
  });
  it('passes URL and description into forge navigation', () => {
    expect(src).toContain('&url=');
    expect(src).toContain('&description=');
    expect(src).toContain('state: {');
    expect(src).toContain('description: inputPayload.productDescription');
  });
  it('blocks unsafe URLs before navigating to forge', () => {
    expect(src).toContain('function blockedPublicUrlReason');
    expect(src).toContain("host === 'localhost'");
    expect(src).toContain('a === 10');
    expect(src).toContain('a === 169 && b === 254');
    expect(src).toContain('setErrorMsg(blockedReason)');
  });
  it('keeps public fetch failures non-blocking for forge', () => {
    expect(src).toContain('URL reachability unconfirmed - forge will attempt live crawl and stop if unreachable.');
    expect(src).toContain("ok: 'warning'");
  });
  it('existing launch function preserved', () => {
    expect(src).toContain(
      "async function launch");
  });
});
