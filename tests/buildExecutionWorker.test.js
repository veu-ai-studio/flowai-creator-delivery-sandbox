import { describe, expect, it } from 'vitest';

import {
  BuildExecutionWorkerError,
  assertApprovedBuildExecutionSandbox,
  buildExecutionWorkerWorkflowContent,
  mutatedFilePathForProofRun,
  resolveBuildExecutionSandbox,
  runBuildExecutionWorkerMutation,
} from '../api/_lib/buildExecutionWorker.js';

describe('BuildExecutionWorker M1 helper', () => {
  it('hard-stops any non-sandbox repository target', () => {
    const sandbox = resolveBuildExecutionSandbox({
      FLOWAI_BUILD_EXECUTION_SANDBOX_OWNER: 'veu-ai-studio',
      FLOWAI_BUILD_EXECUTION_SANDBOX_REPO: 'not-the-approved-sandbox',
    });

    expect(sandbox.approved).toBe(false);
    expect(() => assertApprovedBuildExecutionSandbox(sandbox)).toThrow(BuildExecutionWorkerError);
    expect(() => assertApprovedBuildExecutionSandbox(sandbox)).toThrow(/not the approved sandbox/);
  });

  it('keeps mutation paths proofRunId-scoped and rejects unsafe proof ids', () => {
    expect(mutatedFilePathForProofRun('flowai-build-proof-123')).toBe('proof/build-execution/flowai-build-proof-123.json');
    expect(() => mutatedFilePathForProofRun('../escape')).toThrow(/Invalid proofRunId/);
  });

  it('workflow is sandbox mutation only and uses machine workflow_dispatch', () => {
    const workflow = buildExecutionWorkerWorkflowContent();
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('contents: write');
    expect(workflow).toContain('mutationPayloadBase64');
    expect(workflow).toContain('proof/build-execution/${proofRunId}.json');
    expect(workflow).toContain('FlowAI BuildExecutionWorker Stage 1 ${{ inputs.proofRunId }}');
  });

  it('BLOCKs before execution when workflow credentials are missing', async () => {
    await expect(runBuildExecutionWorkerMutation({
      proofRunId: 'flowai-build-proof-credential-test',
      buildRequestId: 'build-request-credential-test',
      selectedMemberId: 'codex',
      selectedToolOutput: 'export default function App() { return "built"; }',
      selectedTool: { platform_name: 'Codex' },
      dispatchResult: { action: 'code-patch', member: 'codex', data: { filePath: 'src/App.jsx' } },
      targetFilePath: 'src/App.jsx',
      env: {},
      fetchImpl: async () => {
        throw new Error('fetch should not be reached without credentials');
      },
    })).rejects.toMatchObject({
      code: 'WORKFLOW_CREDENTIAL_MISSING',
      status: 503,
    });
  });
});
