'use strict';

import { ReservedOpsRunnerAgentBase } from './ReservedOpsRunnerAgentBase.js';

export class Agent24OpsRunnerDelta extends ReservedOpsRunnerAgentBase {
  static charterId = 24;

  static charter() {
    return ReservedOpsRunnerAgentBase.charterFor(24);
  }

  constructor(deps) {
    super(deps, { id: 24, label: 'ops-runner-delta' });
  }
}
