import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dashboardSource = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');
const orchestratorSource = readFileSync(resolve(__dirname, '../../src/lib/agents/renewal/orchestrator.js'), 'utf8');

describe('fork-based upgrade visibility', () => {
  it('keeps the SAIGE system note explicit about old vs new repos', () => {
    const registrySource = readFileSync(resolve(__dirname, '../../src/lib/products/registeredProductConfig.js'), 'utf8');
    expect(registrySource).toContain('github.com/veu-ai-studio/saige is read-only');
    expect(registrySource).toContain('github.com/veu-ai-studio/saige-v2 is the FlowAI upgrade target');
  });

  it('emits upgrade target governance from the orchestrator', () => {
    expect(orchestratorSource).toContain('upgradeTargetResolver.js');
    expect(orchestratorSource).toContain('original repo is read-only');
    expect(orchestratorSource).toContain('upgradeTargets');
  });

  it('continues surfacing branch links in the result card', () => {
    expect(dashboardSource).toContain('Registered repair branch');
    expect(dashboardSource).toContain('Open branch');
    expect(dashboardSource).toContain('Open compare');
  });
});
