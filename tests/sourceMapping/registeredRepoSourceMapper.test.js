import { describe, expect, it } from 'vitest';
import {
  mapFindingToSource,
  mapFindingsToSource,
  sourcePathForFinding,
} from '../../src/lib/sourceMapping/registeredRepoSourceMapper.js';

const FILES = [
  'package.json',
  'index.html',
  'src/App.jsx',
  'src/pages/Dashboard.jsx',
  'src/pages/Settings.jsx',
  'src/components/NavButton.jsx',
  'src/styles/global.css',
];

describe('registeredRepoSourceMapper (U4)', () => {
  it('maps an explicit existing file path with high confidence', () => {
    const mapped = mapFindingToSource({
      repoFileList: FILES,
      finding: {
        id: 'f1',
        category: 'axe:button-name',
        filePath: 'src/components/NavButton.jsx',
      },
    });

    expect(mapped.mapped).toBe(true);
    expect(mapped.selectedFilePath).toBe('src/components/NavButton.jsx');
    expect(mapped.confidence).toBe(0.98);
    expect(mapped.reason).toBe('finding_declared_existing_file_path');
  });

  it('maps URL route tokens to matching page source files', () => {
    const mapped = mapFindingToSource({
      repoFileList: FILES,
      finding: {
        id: 'f2',
        category: 'network:http_404',
        location: 'https://saigeplatform.com/settings',
      },
    });

    expect(mapped.mapped).toBe(true);
    expect(mapped.selectedFilePath).toBe('src/pages/Settings.jsx');
    expect(mapped.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('maps contrast findings to real stylesheet candidates only', () => {
    const mapped = mapFindingToSource({
      repoFileList: FILES,
      finding: {
        id: 'f3',
        category: 'axe:color-contrast',
        location: 'https://saigeplatform.com/dashboard',
      },
    });

    expect(mapped.mapped).toBe(true);
    expect(mapped.selectedFilePath).toBe('src/styles/global.css');
    expect(mapped.reason).toBe('category_prefers_stylesheet');
  });

  it('does not invent paths when repo inventory is unavailable', () => {
    const mapped = mapFindingToSource({
      repoFileList: null,
      finding: { id: 'f4', category: 'axe:image-alt', location: '/dashboard' },
    });

    expect(mapped.mapped).toBe(false);
    expect(mapped.selectedFilePath).toBeNull();
    expect(mapped.candidates).toEqual([]);
  });

  it('returns a batch summary and path lookup for high-confidence mappings', () => {
    const finding = {
      id: 'f5',
      category: 'axe:button-name',
      location: 'https://saigeplatform.com/dashboard',
    };
    const summary = mapFindingsToSource({
      repoFileList: FILES,
      findings: [finding],
    });

    expect(summary.kind).toBe('registered_repo_source_mapping');
    expect(summary.mapped).toBe(1);
    expect(summary.highConfidence).toBe(1);
    expect(sourcePathForFinding({
      finding,
      sourceMappings: summary.mappings,
      minimumConfidence: 0.7,
    })).toBe('src/pages/Dashboard.jsx');
  });
});
