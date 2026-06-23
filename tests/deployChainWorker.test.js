import { describe, expect, it } from 'vitest';

import {
  APPROVED_DEPLOY_SANDBOX_FULL_NAME,
  assertApprovedDeployChainSandbox,
  buildDeployableAppFiles,
  normalizeRunnableAppOutput,
  resolveDeployChainSandbox,
} from '../api/_lib/deployChainWorker.js';
import { BuildExecutionWorkerError } from '../api/_lib/buildExecutionWorker.js';

describe('DeployChainWorker M2 helper', () => {
  it('hard-stops any non-approved deployable sandbox target', () => {
    const sandbox = resolveDeployChainSandbox({
      FLOWAI_DEPLOY_CHAIN_SANDBOX_OWNER: 'veu-ai-studio',
      FLOWAI_DEPLOY_CHAIN_SANDBOX_REPO: 'flowai-build-execution-sandbox',
    });

    expect(sandbox.approved).toBe(false);
    expect(() => assertApprovedDeployChainSandbox(sandbox)).toThrow(BuildExecutionWorkerError);
    expect(() => assertApprovedDeployChainSandbox(sandbox)).toThrow(/not the approved deployable sandbox/);
  });

  it('resolves the approved deployable sandbox by default', () => {
    const sandbox = resolveDeployChainSandbox({});
    expect(sandbox).toMatchObject({
      fullName: APPROVED_DEPLOY_SANDBOX_FULL_NAME,
      approved: true,
    });
  });

  it('requires selected-tool output to be runnable app code, not proof JSON', () => {
    expect(() => normalizeRunnableAppOutput('{"proofRunId":"x"}')).toThrow(/not a runnable React component/);
    expect(() => normalizeRunnableAppOutput('export default function App(){ return <main>placeholder shell</main>; }')).toThrow(/placeholder-family/);
    expect(normalizeRunnableAppOutput('```jsx\nexport default function App(){ return <main>FlowAI M2 deployed software verified</main>; }\n```'))
      .toContain('FlowAI M2 deployed software verified');
  });

  it('builds a minimal Vite app where selected output is the rendered App file', () => {
    const files = buildDeployableAppFiles({
      proofRunId: 'flowai-build-m2-proof',
      buildRequestId: 'flowai-build-request-m2',
      selectedToolOutput: 'export default function App(){ return <main>FlowAI M2 deployed software verified</main>; }',
      selectedTool: { platform_name: 'Codex' },
      selectedMemberId: 'codex',
      flowaiCommit: 'abc123',
    });
    const byPath = new Map(files.map(file => [file.path, file.content]));

    expect(byPath.get('src/App.jsx')).toContain('FlowAI M2 deployed software verified');
    expect(byPath.get('index.html')).toContain('FlowAI M2 deployed software verified');
    expect(byPath.get('index.html')).toContain('/src/main.jsx');
    expect(byPath.get('src/main.jsx')).toContain("import App from './App.jsx'");
    expect(JSON.parse(byPath.get('flowai-deploy-proof.json'))).toMatchObject({
      proofRunId: 'flowai-build-m2-proof',
      buildRequestId: 'flowai-build-request-m2',
      selectedToolId: 'Codex',
      selectedMemberId: 'codex',
      flowaiCommit: 'abc123',
      browserMarker: 'FlowAI M2 deployed software verified',
    });
  });
});
