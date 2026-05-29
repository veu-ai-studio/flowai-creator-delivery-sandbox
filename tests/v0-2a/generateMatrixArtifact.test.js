import { describe, expect, it } from 'vitest';

import { parseSsotMarkdown } from '../../scripts/generateMatrixArtifact.js';

describe('v0.2A matrix artifact generator', () => {
  it('preserves coded Layer 1 claim ids', () => {
    const parsed = parseSsotMarkdown(`
### 12.1 Evidence Claims (Layer 1 \u2014 Matrix Status)
- \`CA18-AUDIT-TRAIL\` \u2014 Governance audit trail \u2014 VERIFIED

### 12.2 Capability Planning (Layer 2)
- Workflow 1 SUB-1A analysis/scoring: CURRENT

### 12.3 Production Evidence
`);

    expect(parsed.layer1[0]).toMatchObject({
      surfaceId: 'ca18-audit-trail',
      name: 'Governance audit trail',
      status: 'VERIFIED',
      tier: 'B',
    });
    expect(parsed.layer2[0]).toMatchObject({
      surfaceId: 'workflow-1-sub-1a-analysis-scoring',
      status: 'CURRENT',
      tier: 'B',
    });
  });

  it('applies default Tier A to persistence-oriented generated entries', () => {
    const parsed = parseSsotMarkdown(`
### 12.1 Evidence Claims (Layer 1 \u2014 Matrix Status)
- \`PERSISTENCE-CLAIM\` \u2014 Supabase persisted record evidence \u2014 PARTIAL

### 12.2 Capability Planning (Layer 2)

### 12.3 Production Evidence
`);

    expect(parsed.layer1[0]).toMatchObject({
      surfaceId: 'persistence-claim',
      tier: 'A',
    });
    expect(parsed.surfaceTierMap['persistence-claim']).toBe('A');
  });
});
