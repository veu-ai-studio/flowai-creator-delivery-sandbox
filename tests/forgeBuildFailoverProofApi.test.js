import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { __test as failoverProofTest } from '../api/forge/build-failover-proof.js';

function readRepoFile(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('api/forge/build-failover-proof boundary', () => {
  it('keeps production proof execution behind operator auth, not the auth-hard bypass', () => {
    const source = readRepoFile('api/forge/build-failover-proof.js');
    expect(source).toContain('requireOperatorAuth');
    expect(source).not.toContain('requireAuthHard');
  });

  it('exposes the watch panel only on the production Flow Hub proof URL', () => {
    const source = readRepoFile('src/pages/LandingPage.jsx');
    expect(source).toContain("location.pathname === '/flow-hub/production'");
    expect(source).toContain("get('buildFailoverProof') === '1'");
  });

  it('allows the browser to pass an operator secret without bundling one', () => {
    const source = readRepoFile('src/components/BuildFailoverProofPanel.jsx');
    expect(source).toContain("'x-flowai-operator-secret'");
    expect(source).not.toContain('FLOWAI_OPERATOR_SECRET');
  });

  it('creates fixed-purpose proof requests for the approved deploy project', () => {
    const request = failoverProofTest.createBuildFailoverProofRequest(new Date('2026-06-25T18:00:00Z'));
    expect(request).toMatchObject({
      productId: 'build-failover-production-proof',
      deliveryMode: 'deploy-chain-sandbox',
      deploymentProjectName: 'flowai-build-failover-proof',
      toolDispatchTimeoutMs: 5000,
      buildProofControls: {
        forceHangOnce: {
          action: 'code-patch',
          memberId: 'codex',
        },
      },
    });
  });
});
