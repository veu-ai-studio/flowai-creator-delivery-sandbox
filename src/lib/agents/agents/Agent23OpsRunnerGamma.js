'use strict';

import { ReservedOpsRunnerAgentBase } from './ReservedOpsRunnerAgentBase.js';

export class Agent23OpsRunnerGamma extends ReservedOpsRunnerAgentBase {
  static charterId = 23;

  static charter() {
    return ReservedOpsRunnerAgentBase.charterFor(23);
  }

  constructor(deps) {
    super(deps, { id: 23, label: 'ops-runner-gamma' });
  }
}
