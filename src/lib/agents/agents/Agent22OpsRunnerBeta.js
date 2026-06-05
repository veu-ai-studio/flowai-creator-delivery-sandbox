'use strict';

import { ReservedOpsRunnerAgentBase } from './ReservedOpsRunnerAgentBase.js';

export class Agent22OpsRunnerBeta extends ReservedOpsRunnerAgentBase {
  static charterId = 22;

  static charter() {
    return ReservedOpsRunnerAgentBase.charterFor(22);
  }

  constructor(deps) {
    super(deps, { id: 22, label: 'ops-runner-beta' });
  }
}
