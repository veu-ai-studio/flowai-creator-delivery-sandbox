import { describe, expect, it, vi } from 'vitest';
import {
  RuntimeDispatchProofError,
  WORKFLOW_PATH,
  buildSandboxWorkflowContent,
  runRuntimeDispatchAuthorityProof,
} from '../api/_lib/runtimeDispatchAuthorityProof.js';

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function emptyResponse(status = 204) {
  return new Response(null, { status });
}

function createGithubFetch({ withArtifact = true } = {}) {
  const calls = [];
  const fetchImpl = vi.fn(async (url, init = {}) => {
    const parsed = new URL(url);
    const body = init.body ? JSON.parse(init.body) : null;
    calls.push({ url: String(url), path: parsed.pathname, search: parsed.search, method: init.method || 'GET', body });

    if (parsed.pathname === '/repos/veu-ai-studio/flowai-build-execution-sandbox') {
      return jsonResponse({
        full_name: 'veu-ai-studio/flowai-build-execution-sandbox',
        default_branch: 'main',
        permissions: { admin: true, push: true },
      });
    }

    if (parsed.pathname.includes(`/contents/${WORKFLOW_PATH}`)) {
      if ((init.method || 'GET') === 'PUT') {
        return jsonResponse({ commit: { sha: 'sandbox-workflow-commit' } }, 201);
      }
      return jsonResponse({ message: 'Not Found', status: '404' }, 404);
    }

    if (parsed.pathname.endsWith('/actions/workflows/flowai-runtime-dispatch-proof.yml')) {
      return jsonResponse({
        id: 987654,
        name: 'FlowAI Runtime Dispatch Proof',
        path: WORKFLOW_PATH,
        state: 'active',
      });
    }

    if (parsed.pathname.endsWith('/actions/workflows/flowai-runtime-dispatch-proof.yml/dispatches')) {
      return emptyResponse(204);
    }

    if (parsed.pathname.endsWith('/actions/workflows/flowai-runtime-dispatch-proof.yml/runs')) {
      const dispatchCall = calls.find((call) => call.path.endsWith('/dispatches'));
      const proofRunId = dispatchCall?.body?.inputs?.proofRunId;
      return jsonResponse({
        workflow_runs: [{
          id: 12345,
          url: 'https://api.github.com/repos/veu-ai-studio/flowai-build-execution-sandbox/actions/runs/12345',
          html_url: 'https://github.com/veu-ai-studio/flowai-build-execution-sandbox/actions/runs/12345',
          event: 'workflow_dispatch',
          actor: { login: 'flowai-runtime-bot' },
          status: 'completed',
          conclusion: 'success',
          display_title: `FlowAI runtime dispatch proof ${proofRunId}`,
          name: 'FlowAI Runtime Dispatch Proof',
          created_at: '2026-06-23T06:30:00.000Z',
          updated_at: '2026-06-23T06:30:12.000Z',
        }],
      });
    }

    if (parsed.pathname.endsWith('/actions/runs/12345/artifacts')) {
      const dispatchCall = calls.find((call) => call.path.endsWith('/dispatches'));
      const proofRunId = dispatchCall?.body?.inputs?.proofRunId;
      return jsonResponse({
        artifacts: withArtifact
          ? [{ id: 999, name: `flowai-runtime-dispatch-proof-${proofRunId}` }]
          : [],
      });
    }

    throw new Error(`Unexpected GitHub request: ${init.method || 'GET'} ${parsed.pathname}`);
  });

  return { fetchImpl, calls };
}

describe('runtime dispatch authority proof', () => {
  it('defines a harmless sandbox workflow with nonce echo and artifact return', () => {
    const content = buildSandboxWorkflowContent();

    expect(content).toContain('on:\n  workflow_dispatch:');
    expect(content).toContain('proofRunId');
    expect(content).toContain('actions/upload-artifact@v4');
    expect(content).toContain('permissions:\n  contents: read');
    expect(content).toContain('veu-ai-studio/flowai-build-execution-sandbox');
  });

  it('stops before any network call when sandbox target is not approved', async () => {
    const fetchImpl = vi.fn();

    await expect(runRuntimeDispatchAuthorityProof({
      env: {
        GITHUB_WORKFLOW_TOKEN: 'secret-never-returned',
        FLOWAI_RUNTIME_DISPATCH_SANDBOX_REPO: 'not-approved',
      },
      fetchImpl,
      sleepImpl: async () => {},
    })).rejects.toMatchObject({
      code: 'SANDBOX_BOUNDARY_STOP',
    });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('dispatches the approved sandbox workflow and ingests the matching proof artifact', async () => {
    const { fetchImpl, calls } = createGithubFetch();

    const result = await runRuntimeDispatchAuthorityProof({
      env: {
        GITHUB_WORKFLOW_TOKEN: 'secret-never-returned',
        VERCEL_GIT_COMMIT_SHA: 'flowai-runtime-commit',
      },
      fetchImpl,
      now: () => new Date('2026-06-23T06:30:00.000Z'),
      idFactory: () => 'abcd1234-redacted',
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      maxPollAttempts: 1,
    });

    expect(result).toMatchObject({
      ok: true,
      status: 'SUCCESS',
      dispatchSource: 'FlowAI Runtime',
      runtimeEntryPoint: '/api/runtime-dispatch-authority-proof',
      flowaiCommit: 'flowai-runtime-commit',
      sandbox: {
        fullName: 'veu-ai-studio/flowai-build-execution-sandbox',
        approved: true,
        contained: true,
      },
      run: {
        id: 12345,
        event: 'workflow_dispatch',
        actor: 'flowai-runtime-bot',
        conclusion: 'success',
      },
      result: {
        ingested: true,
        artifactId: 999,
      },
    });
    expect(result.proofRunId).toContain('abcd1234');
    expect(result.proofRunIdContinuity).toEqual({
      generatedByRuntime: true,
      dispatchedToWorkflow: true,
      observedInRunTitle: true,
      observedInArtifactName: true,
      returnedToRuntime: true,
    });

    const dispatchCall = calls.find((call) => call.path.endsWith('/dispatches'));
    expect(dispatchCall.body.inputs).toMatchObject({
      proofRunId: result.proofRunId,
      dispatchSource: 'FlowAI Runtime',
      runtimeEntryPoint: '/api/runtime-dispatch-authority-proof',
      flowaiCommit: 'flowai-runtime-commit',
    });
    expect(JSON.stringify(result)).not.toContain('secret-never-returned');
  });

  it('does not pass when the runner succeeds but no matching proof artifact returns', async () => {
    const { fetchImpl } = createGithubFetch({ withArtifact: false });

    const result = await runRuntimeDispatchAuthorityProof({
      env: {
        GITHUB_WORKFLOW_TOKEN: 'secret-never-returned',
      },
      fetchImpl,
      now: () => new Date('2026-06-23T06:30:00.000Z'),
      idFactory: () => 'abcd1234-redacted',
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      maxPollAttempts: 1,
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe('BLOCK');
    expect(result.proofRunIdContinuity.returnedToRuntime).toBe(false);
    expect(result.result.ingested).toBe(false);
  });

  it('reports missing workflow credential as BLOCK instead of pretending dispatch', async () => {
    await expect(runRuntimeDispatchAuthorityProof({
      env: {},
      fetchImpl: vi.fn(),
    })).rejects.toBeInstanceOf(RuntimeDispatchProofError);
  });
});
