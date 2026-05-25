import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const landingSource = readFileSync(new URL('../../src/pages/LandingPage.jsx', import.meta.url), 'utf8');

describe('FlowAI positioning copy', () => {
  it('positions FlowAI as a universal product upgrade engine with 95/100 bands', () => {
    expect(landingSource).toContain('universal product');
    expect(landingSource).toContain('95/100 target');
    expect(landingSource).toContain('Excellent 90');
    expect(landingSource).toContain('Strong 75');
    expect(landingSource).toContain('Developing 50');
    expect(landingSource).toContain('Needs Work 25');
    expect(landingSource).toContain('Critical 0');
    expect(landingSource).toContain('Enter your product URL...');
  });

  it('removes old governance-threshold positioning from the landing page', () => {
    expect(landingSource).not.toContain('governance assessment engine');
    expect(landingSource).not.toContain('50-point governance');
    expect(landingSource).not.toContain('Showcase-ready 45');
    expect(landingSource).not.toContain('saigedemo.com');
    expect(landingSource).not.toContain('customer-facing SaaS');
  });

  it('surfaces Migration Mode while blocking execution unless operator-enabled', () => {
    expect(landingSource).toContain('Migrate');
    expect(landingSource).toContain('FlowAI detects platform dependencies and migrates the product to a standalone v2');
    expect(landingSource).toContain('Migration Mode requires operator enablement. Contact your admin.');
    expect(landingSource).toContain('VITE_FLOWAI_ENABLE_MIGRATION_MODE');
    expect(landingSource).toContain("mode={isMigrationMode ? 'MIGRATION' : 'FOREGROUND'}");
  });
});
