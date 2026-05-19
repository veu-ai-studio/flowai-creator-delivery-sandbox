// src/lib/construction/index.js — barrel for the Build/Wire engine.
//
// Generic, product-agnostic. Per dispatch zero-per-product-code-path
// discipline: every product is resolved through product_registry +
// Phase B delta_log findings.

export {
  runConstruction,
  runWireUpConstruction,
  shouldRunConstruction,
  SUPPORTED_CLASSES,
  CONSTRUCTION_CLASS_KIND,
  CONSTRUCTION_COMMIT_KIND,
  __exports,
} from './ConstructionEngine.js';

export {
  generateWireUp,
  extractWireUpCandidates,
  buildWireUpPrompt,
  parseWireUpResponse,
} from './constructors/WireUpConstructor.js';

export * as S1 from './gates/S1Baseline.js';
export * as S2 from './gates/S2ScopeBound.js';
export * as S4 from './gates/S4SecurityPreWrite.js';
export * as S5 from './gates/S5Rollback.js';
export * as S6 from './gates/S6OperatorApproval.js';
export * as S8 from './gates/S8PhaseB.js';
