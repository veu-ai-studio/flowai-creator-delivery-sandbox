'use strict';

import { ReservedOpsRunnerAgentBase } from './ReservedOpsRunnerAgentBase.js';

export class Agent25OpsRunnerEpsilon extends ReservedOpsRunnerAgentBase {
  static charterId = 25;

  static charter() {
    return ReservedOpsRunnerAgentBase.charterFor(25);
  }

  constructor(deps) {
    super(deps, { id: 25, label: 'ops-runner-epsilon' });
  }
}
