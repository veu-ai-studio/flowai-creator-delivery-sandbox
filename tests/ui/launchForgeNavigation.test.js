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
  it('existing launch function preserved', () => {
    expect(src).toContain(
      "async function launch");
  });
});
