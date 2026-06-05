'use strict';

import { AdvisoryAgentBase, advisoryCharterFromRegistry, listCount } from './AdvisoryAgentBase.js';

export class Agent15BenchmarkingCompetition extends AdvisoryAgentBase {
  static charterId = 15;

  static charter() {
    return advisoryCharterFromRegistry(15, { marketplaceTools: ['anthropic-api'] });
  }

  constructor(deps) {
    super(deps, {
      id: 15,
      inputKind: 'benchmarking.request',
      rules: [
        (input) => benchSignal('named_peer_set', listCount(input.peerSet) > 0, 'watch', 'Benchmarking requires named peers.'),
        (input) => benchSignal('design_spec_present', !!input.designSpec || !!input.stepInputs?.designSpec, 'watch', 'Benchmark needs a design spec to compare.'),
        (input) => benchSignal('dimension_coverage', listCount(input.dimensions) >= 3, 'watch', 'Benchmark should cover at least three dimensions.'),
      ],
      selectTopic: () => '15.benchmark.report.v1',
      buildPayload: ({ input, runId, signals, warnings, confidence }) => ({
        runId,
        peerSet: input.peerSet ?? [],
        dimensions: input.dimensions ?? [],
        deltas: input.deltas ?? [],
        readyForEvolution: warnings.length === 0,
        confidence,
        signals,
      }),
    });
  }
}

function benchSignal(rule, condition, activeStatus, message) {
  return { rule, status: condition ? 'clear' : activeStatus, message };
}
