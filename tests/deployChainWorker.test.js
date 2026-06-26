import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import {
  APPROVED_CREATOR_DELIVERY_SANDBOX_FULL_NAME,
  APPROVED_DEPLOY_PROJECT_NAMES,
  APPROVED_DEPLOY_SANDBOX_FULL_NAME,
  __test as deployChainTest,
  assertApprovedDeployChainSandbox,
  buildDeployableAppFiles,
  extractVisibleBodyText,
  htmlHasVisibleBodyText,
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
      precreatedOnly: false,
    });
  });

  it('approves the pre-created Creator delivery sandbox for proof delivery', () => {
    const sandbox = resolveDeployChainSandbox({
      FLOWAI_DEPLOY_CHAIN_SANDBOX_OWNER: 'veu-ai-studio',
      FLOWAI_DEPLOY_CHAIN_SANDBOX_REPO: 'flowai-creator-delivery-sandbox',
    });

    expect(sandbox).toMatchObject({
      fullName: APPROVED_CREATOR_DELIVERY_SANDBOX_FULL_NAME,
      approved: true,
      precreatedOnly: true,
    });
  });

  it('keeps only approved stable deploy proof projects', () => {
    expect(APPROVED_DEPLOY_PROJECT_NAMES).toEqual([
      'flowai-m2-deploy-chain-proof',
      'flowai-m3-upgrader-proof',
      'flowai-build-failover-proof',
    ]);
  });

  it('mints a GitHub App installation token when no operator token is configured', async () => {
    const { privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const calls = [];
    const credential = await deployChainTest.resolveGitHubDeployCredential({
      GITHUB_APP_ID: '12345',
      GITHUB_APP_INSTALLATION_ID: '67890',
      GITHUB_APP_PRIVATE_KEY: privateKey,
    }, async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 201,
        async text() {
          return JSON.stringify({ token: 'installation-token' });
        },
      };
    });

    expect(credential).toEqual({
      token: 'installation-token',
      source: 'GITHUB_APP_INSTALLATION_TOKEN',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain('/app/installations/67890/access_tokens');
    expect(calls[0].init.headers.Authorization).toMatch(/^Bearer /);
  });

  it('uses the scoped delivery token for the pre-created Creator delivery sandbox', async () => {
    const credential = await deployChainTest.resolveGitHubDeployCredential({
      GITHUB_DELIVERY_TOKEN: 'repo-scoped-delivery-token',
      GITHUB_OPERATOR_TOKEN: 'operator-token',
    }, async () => {
      throw new Error('GitHub App token mint should not be reached for pre-created delivery sandbox');
    }, {
      fullName: APPROVED_CREATOR_DELIVERY_SANDBOX_FULL_NAME,
    });

    expect(credential).toEqual({
      token: 'repo-scoped-delivery-token',
      source: 'GITHUB_DELIVERY_TOKEN',
    });
  });

  it('requires selected-tool output to be runnable app code, not proof JSON', () => {
    expect(() => normalizeRunnableAppOutput('{"proofRunId":"x"}')).toThrow(/not a runnable React component/);
    expect(() => normalizeRunnableAppOutput('export default function App(){ return <main>placeholder shell</main>; }')).toThrow(/placeholder-family/);
    expect(normalizeRunnableAppOutput('```jsx\nexport default function App(){ return <main>FlowAI M2 deployed software verified</main>; }\n```'))
      .toContain('FlowAI M2 deployed software verified');
  });

  it('builds a self-contained rendered app where selected output is visible in body text', () => {
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
    expect(byPath.has('src/main.jsx')).toBe(false);
    expect(byPath.has('package.json')).toBe(false);
    expect(byPath.get('index.html')).toContain('FlowAI M2 deployed software verified');
    expect(byPath.get('index.html')).toContain('<title>FlowAI Deploy Chain Proof</title>');
    expect(byPath.get('index.html')).toContain('id="flowai-m2-output"');
    expect(byPath.get('index.html')).not.toContain('/src/main.jsx');
    expect(extractVisibleBodyText(byPath.get('index.html'))).toContain('FlowAI M2 deployed software verified');
    expect(JSON.parse(byPath.get('flowai-deploy-proof.json'))).toMatchObject({
      proofRunId: 'flowai-build-m2-proof',
      buildRequestId: 'flowai-build-request-m2',
      selectedToolId: 'Codex',
      selectedMemberId: 'codex',
      flowaiCommit: 'abc123',
      browserMarker: 'FlowAI M2 deployed software verified',
    });
  });

  it('normalizes multi-element app output before comparing deployed visible text', () => {
    const files = buildDeployableAppFiles({
      proofRunId: 'flowai-build-m3-proof',
      buildRequestId: 'flowai-build-request-m3',
      selectedToolOutput: 'export default function App(){ return <main><h1>Community Aid Matcher</h1><p>FlowAI M3 deployed-endpoint upgrade verified a0f447a.</p><button>Generate outreach plan</button></main>; }',
      selectedTool: { platform_name: 'Codex' },
      selectedMemberId: 'codex',
      flowaiCommit: 'a0f447a',
    });
    const byPath = new Map(files.map(file => [file.path, file.content]));
    const proof = JSON.parse(byPath.get('flowai-deploy-proof.json'));

    expect(proof.browserMarker).toBe('Community Aid Matcher FlowAI M3 deployed-endpoint upgrade verified a0f447a. Generate outreach plan');
    expect(byPath.get('index.html')).toContain('<button>Generate outreach plan</button>');
    expect(byPath.get('index.html')).not.toContain('<button disabled>');
    expect(htmlHasVisibleBodyText(byPath.get('index.html'), proof.browserMarker)).toBe(true);
    expect(htmlHasVisibleBodyText(
      '<body><main><h1>Community Aid Matcher</h1><p>FlowAI M3 deployed-endpoint upgrade verified a0f447a.</p><button>Generate outreach plan</button></main></body>',
      proof.browserMarker,
    )).toBe(true);
  });

  it('visible-body checker does not accept title, script, or source-only markers', () => {
    expect(htmlHasVisibleBodyText('<title>FlowAI M2 deployed software verified</title><body></body>', 'FlowAI M2 deployed software verified'))
      .toBe(false);
    expect(htmlHasVisibleBodyText('<body><script>FlowAI M2 deployed software verified</script></body>', 'FlowAI M2 deployed software verified'))
      .toBe(false);
    expect(htmlHasVisibleBodyText('<body><main>FlowAI M2 deployed software verified</main></body>', 'FlowAI M2 deployed software verified'))
      .toBe(true);
  });
});
