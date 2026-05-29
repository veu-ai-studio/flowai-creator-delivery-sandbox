export type SurfaceTier = 'A' | 'B' | 'C';

export type MatrixLayer = 1 | 2;

export type MatrixRatificationState =
  | 'CANONICAL'
  | 'PENDING-RATIFICATION'
  | 'PROPOSED-DEFERRED';

export interface Surface {
  id: string;
  name: string;
  tier: SurfaceTier;
  description?: string;
}

export interface MatrixEntry {
  layer: MatrixLayer;
  surfaceId: string;
  status: string;
  tier?: SurfaceTier;
  ratificationState?: MatrixRatificationState;
}

export interface ScorerResult {
  verified: boolean;
  reason?: string;
  tier: SurfaceTier;
  verified_pct?: number | null;
}

export interface RenewalOutput {
  productId: string;
  runId: string;
  iterationCount: number;
  iterationZeroFlag: boolean;
  iterationLabel: string;
  scoreBefore: number;
  scoreAfter: number;
  surfacesTested: number;
  surfacesVerified: number;
  surfacesFailed: number;
  evidenceCoverage: number;
  matrixArtifactVersion: string;
  correctiveDispatches: string[];
  timestamp: string;
  gtmFlag: 'GTM-BLOCKED' | 'GTM-ELIGIBLE';
  flowaiSelfScore: ScorerResult;
}

export interface ControlScheme {
  structure: 'autonomous' | 'supervised' | 'controlled';
  mode: 'auto' | 'guided' | 'manual';
  depth: 'quick' | 'normal' | 'deep';
}

export interface ErrorResult {
  error: true;
  reason: string;
}
