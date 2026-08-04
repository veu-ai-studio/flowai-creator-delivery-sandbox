import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path) => readFileSync(resolve(path), 'utf8');
const appSource = read('src/App.jsx');
const landingSource = read('src/pages/LandingPage.jsx');
const configurationSource = read('src/pages/Configuration.jsx');

describe('legacy Auto Runner quarantine', () => {
  it('never mounts the legacy executor from a production route', () => {
    expect(appSource).not.toContain("import AutoRunner from './pages/AutoRunner'");
    expect(appSource).toContain('<Route path="/auto-runner" element={<Navigate to="/flowai?mode=auto" replace />} />');
    expect(appSource).toContain('<Route path="/autonomous-engine" element={<Navigate to="/flowai?mode=auto" replace />} />');
  });

  it('opens the authoritative runner idle for direct navigation', () => {
    expect(appSource).not.toMatch(/path="\/auto-runner"[^\n]+autoStart=1/);
  });

  it('uses an explicit, nonce-backed one-shot launch for saved configurations', () => {
    expect(landingSource).toContain('launchNonce: crypto.randomUUID()');
    expect(landingSource).toContain('autoStart=1&sessionConfig=1');
    expect(configurationSource).toContain('config.launchNonce = crypto.randomUUID()');
    expect(configurationSource).toContain('/flowai?mode=auto&autoStart=1&sessionConfig=1');
  });

  it('does not expose legacy execution or history links from the production hub', () => {
    expect(landingSource).not.toContain("navigate('/auto-runner')");
    expect(landingSource).toContain("{ label: 'Session History',    path: '/runs'");
  });
});
