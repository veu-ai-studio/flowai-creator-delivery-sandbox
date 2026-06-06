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
    expect(landingSource).toContain('Migration Mode is currently disabled.');
    expect(landingSource).toContain('Enable Migration Mode');
    expect(landingSource).toContain('/api/operator/enable-migration-mode');
    expect(landingSource).toContain('/api/operator/disable-migration-mode');
    expect(landingSource).toContain('Migration Mode requires operator activation.');
    expect(landingSource).not.toContain('Contact your admin.');
    expect(landingSource).toContain('VITE_FLOWAI_ENABLE_MIGRATION_MODE');
    expect(landingSource).toContain('resolveRunConstructionMode({');
    expect(landingSource).toContain("if (isMigrationMode) return 'MIGRATION'");
    expect(landingSource).toContain('migrationModeEnabled ? (');
    expect(landingSource).toContain('Start Migration');
  });

  it('keeps the operator secret as a non-persisted emergency header only', () => {
    expect(landingSource).toContain('operatorSecret');
    expect(landingSource).toContain("'x-flowai-operator-secret'");
    expect(landingSource).toContain('Enable with Operator Secret');
    expect(landingSource).toContain('operatorSecret={operatorSecret}');
    expect(landingSource).not.toContain('FLOWAI_OPERATOR_SECRET');
    expect(landingSource).not.toContain('VITE_FLOWAI_OPERATOR_SECRET');
    expect(landingSource).not.toMatch(/operatorSecret[\s\S]{0,240}(localStorage|sessionStorage|URLSearchParams)/);
  });

  it('renders migration summaries in run results', () => {
    const runPanelSource = readFileSync(new URL('../../src/components/RunConstructionPanel.jsx', import.meta.url), 'utf8');
    expect(runPanelSource).toContain('MIGRATION MODE');
    expect(runPanelSource).toContain('Files migrated');
    expect(runPanelSource).toContain('Dependencies removed');
    expect(runPanelSource).toContain('Upgrade URL');
    expect(runPanelSource).toContain('Operator secret');
    expect(runPanelSource).toContain("'x-flowai-operator-secret'");
    expect(runPanelSource).toContain('authRequired && mode ===');
  });
});
