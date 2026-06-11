import { describe, expect, it } from 'vitest';
import { parseSseTranscript, summarizeSseProof } from '../../scripts/cto/saige-sse-proof.mjs';

describe('SAIGE SSE proof summarizer', () => {
  it('classifies a stream without a terminal event as incomplete', () => {
    const transcript = [
      'data: {"type":"start","runId":"run-1"}',
      '',
      'data: {"type":"step","log":{"stepName":"Product Discovery","tool":"product_registry lookup","status":"complete","result":{"kind":"product"}}}',
      '',
      'data: {"type":"heartbeat","at":"2026-06-11T13:06:10.838Z"}',
      '',
    ].join('\n');

    const summary = summarizeSseProof(parseSseTranscript(transcript));

    expect(summary.verdict).toBe('INCOMPLETE_STREAM');
    expect(summary.acceptedTerminal).toBe(false);
    expect(summary.hasDone).toBe(false);
    expect(summary.hasFinal).toBe(false);
    expect(summary.milestones.productDiscovery).toBe(true);
    expect(summary.milestones.branchCreation).toBe(false);
  });

  it('requires [DONE] plus final delivery milestones for end-to-end completion', () => {
    const final = {
      type: 'final',
      result: {
        runId: 'run-2',
        previewUrl: 'https://preview.example',
        finalScore: 82,
        exitReason: 'COMPLETED',
        orchestrationLog: [
          { step: 9, result: { branchName: 'flowai/test' } },
          { step: 10, stepName: 'Final governance write', tool: 'governance audit', result: { kind: 'governance.write' } },
          { step: 11, stepName: 'ProductSSOT Symbiotic Write', tool: 'ProductSSOT', result: { kind: 'product_ssot.symbiotic_run.v1' } },
        ],
      },
    };
    const transcript = [
      `data: ${JSON.stringify(final)}`,
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    const summary = summarizeSseProof(parseSseTranscript(transcript));

    expect(summary.verdict).toBe('END_TO_END_COMPLETE');
    expect(summary.acceptedTerminal).toBe(true);
    expect(summary.endToEndComplete).toBe(true);
    expect(summary.observed.branchName).toBe('flowai/test');
    expect(summary.observed.previewUrl).toBe('https://preview.example');
  });

  it('does not count the source URL as deployed preview evidence', () => {
    const final = {
      type: 'final',
      result: {
        runId: 'run-source-preview',
        previewUrl: 'https://saigeplatform.com',
        finalScore: 73,
        exitReason: 'MAX_ITERATIONS',
        orchestrationLog: [
          { step: 9, result: { branchName: 'flowai/test' } },
          { step: 10, stepName: 'Final governance write', tool: 'governance audit', result: { kind: 'governance.write' } },
          { step: 11, stepName: 'ProductSSOT Symbiotic Write', tool: 'ProductSSOT', result: { kind: 'product_ssot.symbiotic_run.v1' } },
        ],
      },
    };
    const transcript = [
      `data: ${JSON.stringify(final)}`,
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    const summary = summarizeSseProof(parseSseTranscript(transcript), {
      request: { url: 'https://saigeplatform.com' },
    });

    expect(summary.verdict).toBe('TERMINAL_FINAL_INCOMPLETE_MILESTONES');
    expect(summary.endToEndComplete).toBe(false);
    expect(summary.milestones.previewDeployment).toBe(false);
    expect(summary.observed.previewUrl).toBeNull();
  });

  it('prefers a distinct upgraded URL over a source preview URL', () => {
    const final = {
      type: 'final',
      result: {
        runId: 'run-upgraded-preview',
        previewUrl: 'https://saigeplatform.com',
        upgradedUrl: 'https://saige-v2.vercel.app',
        finalScore: 73,
        exitReason: 'MAX_ITERATIONS',
        orchestrationLog: [
          { step: 9, result: { branchName: 'flowai/test' } },
          { step: 10, stepName: 'Final governance write', tool: 'governance audit', result: { kind: 'governance.write' } },
          { step: 11, stepName: 'ProductSSOT Symbiotic Write', tool: 'ProductSSOT', result: { kind: 'product_ssot.symbiotic_run.v1' } },
        ],
      },
    };
    const transcript = [
      `data: ${JSON.stringify(final)}`,
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    const summary = summarizeSseProof(parseSseTranscript(transcript), {
      request: { url: 'https://saigeplatform.com' },
    });

    expect(summary.verdict).toBe('END_TO_END_COMPLETE');
    expect(summary.endToEndComplete).toBe(true);
    expect(summary.milestones.previewDeployment).toBe(true);
    expect(summary.observed.previewUrl).toBe('https://saige-v2.vercel.app');
  });

  it('accepts an honest timeout terminal without calling it end-to-end complete', () => {
    const transcript = [
      'data: {"type":"timeout","kind":"sse_soft_timeout","timeoutMs":770000}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');

    const summary = summarizeSseProof(parseSseTranscript(transcript));

    expect(summary.verdict).toBe('HONEST_TIMEOUT_TERMINAL');
    expect(summary.acceptedTerminal).toBe(true);
    expect(summary.endToEndComplete).toBe(false);
  });
});
