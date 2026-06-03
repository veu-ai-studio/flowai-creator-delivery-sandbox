import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ForgeSectionRenderer, {
  getSectionStatus,
  ScoreDisplay,
  scoreTone,
  SectionStatusIcon,
} from '../../src/components/forge/ForgeSectionRenderer.jsx';

function htmlFor(value) {
  return renderToStaticMarkup(React.createElement(ForgeSectionRenderer, { value }));
}

function expectCleanOutput(html) {
  expect(html).not.toContain('<pre');
  expect(html).not.toContain('JSON.stringify');
}

describe('ForgeSectionRenderer', () => {
  it('renders null as pending text', () => {
    const html = htmlFor(null);
    expect(html).toContain('Pending — runs after submit');
    expectCleanOutput(html);
  });

  it('renders undefined as pending text', () => {
    const html = htmlFor(undefined);
    expect(html).toContain('Pending — runs after submit');
    expectCleanOutput(html);
  });

  it('renders empty string as pending text', () => {
    const html = htmlFor('');
    expect(html).toContain('Pending — runs after submit');
    expectCleanOutput(html);
  });

  it('renders false as pending text', () => {
    const html = htmlFor(false);
    expect(html).toContain('Pending — runs after submit');
    expectCleanOutput(html);
  });

  it('renders function as unsupported section type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const html = htmlFor(() => null);
    expect(html).toContain('Unsupported section type');
    expectCleanOutput(html);
    warn.mockRestore();
  });

  it('renders number as text', () => {
    const html = htmlFor(42);
    expect(html).toContain('42');
    expectCleanOutput(html);
  });

  it('renders true as Yes', () => {
    const html = htmlFor(true);
    expect(html).toContain('Yes');
    expectCleanOutput(html);
  });

  it('renders toolSelectionAdvisory as advisory banner', () => {
    const html = htmlFor({ toolSelectionAdvisory: true });
    expect(html).toContain('Advisory mode — build blocked');
    expectCleanOutput(html);
  });

  it('unwraps toolSelection envelope with null selection and renders pending plus banners', () => {
    const html = htmlFor({
      mode: 'GUIDED',
      stepKey: 'qa_audit',
      selection: null,
      undServedAccessWarning: true,
      pipelineNullAt: [1, 3],
    });
    expect(html).toContain('Underserved access constraint applied');
    expect(html).toContain('Pipeline gaps at steps: 1, 3');
    expect(html).toContain('Pending — runs after submit');
    expectCleanOutput(html);
  });

  it('renders tool array sorted by rank with compositeScore tie-breaker', () => {
    const html = htmlFor([
      { rank: 2, platform_name: 'Beta', platform_type: 'api', compositeScore: 8 },
      { rank: 1, platform_name: 'Alpha', platform_type: 'native', compositeScore: 7 },
      { rank: 2, platform_name: 'Gamma', platform_type: 'api', compositeScore: 9, metadataStatus: 'MISSING_REGISTRY_METADATA' },
    ]);
    expect(html.indexOf('1. Alpha')).toBeLessThan(html.indexOf('2. Gamma'));
    expect(html.indexOf('2. Gamma')).toBeLessThan(html.indexOf('2. Beta'));
    expect(html).toContain('Limited metadata');
    expectCleanOutput(html);
  });

  it('renders single tool object as card', () => {
    const html = htmlFor({ platform_name: 'Perplexity', platform_type: 'research', compositeScore: 9.2, rank: 1 });
    expect(html).toContain('Perplexity');
    expect(html).toContain('Type: research');
    expect(html).toContain('Score: 9.2');
    expectCleanOutput(html);
  });

  it('renders check array with count summary and list', () => {
    const html = htmlFor([
      { id: 'one', label: 'One', status: 'PASS', reason: 'ok' },
      { id: 'two', label: 'Two', status: 'FAIL', reason: 'bad' },
      { id: 'three', label: 'Three', status: 'ADVISORY_ONLY', reason: 'note' },
    ]);
    expect(html).toContain('1 passed · 1 failed · 1 advisory');
    expect(html).toContain('One');
    expect(html).toContain('Two');
    expect(html).toContain('Three');
    expectCleanOutput(html);
  });

  it('renders PASS status as green badge', () => {
    const html = htmlFor({ status: 'PASS', label: 'Check passed', reason: 'ok' });
    expect(html).toContain('Pass');
    expect(html).toContain('text-emerald-200');
    expectCleanOutput(html);
  });

  it('renders FAIL status as red badge', () => {
    const html = htmlFor({ status: 'FAIL', label: 'Check failed', reason: 'bad' });
    expect(html).toContain('Fail');
    expect(html).toContain('text-red-200');
    expectCleanOutput(html);
  });

  it('renders ADVISORY_ONLY status as amber badge', () => {
    const html = htmlFor({ status: 'ADVISORY_ONLY', label: 'Advisory item', reason: 'review' });
    expect(html).toContain('Advisory');
    expect(html).toContain('text-amber-200');
    expectCleanOutput(html);
  });

  it('renders complete and verified status as Verified', () => {
    const html = htmlFor({ complete: true, verified: true });
    expect(html).toContain('Verified');
    expectCleanOutput(html);
  });

  it('renders complete but unverified status as Unverified', () => {
    const html = htmlFor({ complete: true, verified: false, reason: 'needs proof' });
    expect(html).toContain('Unverified');
    expect(html).toContain('needs proof');
    expectCleanOutput(html);
  });

  it('renders complete status without reason', () => {
    const html = htmlFor({ complete: true, verified: false });
    expect(html).toContain('Unverified');
    expectCleanOutput(html);
  });

  it('renders non-tool object array as key value list', () => {
    const html = htmlFor([{ surface_id: 'one', current_state: 'stub' }]);
    expect(html).toContain('Surface Id');
    expect(html).toContain('one');
    expect(html).toContain('Current State');
    expect(html).not.toContain('Score:');
    expectCleanOutput(html);
  });

  it('renders string as plain paragraph', () => {
    const html = htmlFor('Plain research note');
    expect(html).toContain('Plain research note');
    expectCleanOutput(html);
  });

  it('renders generic object as key value list', () => {
    const html = htmlFor({ matrixArtifactVersion: 'abc123', nested: { deeper: { too: 'far' } } });
    expect(html).toContain('Matrix Artifact Version');
    expect(html).toContain('abc123');
    expect(html).toContain('[nested object]');
    expectCleanOutput(html);
  });

  it('gives advisory precedence over status and completion objects', () => {
    const html = htmlFor({
      toolSelectionAdvisory: true,
      status: 'PASS',
      complete: true,
      verified: true,
    });
    expect(html).toContain('Advisory mode — build blocked');
    expect(html).not.toContain('Pass');
    expect(html).not.toContain('Verified');
    expectCleanOutput(html);
  });

  it('maps section status values', () => {
    expect(getSectionStatus(null)).toBe('pending');
    expect(getSectionStatus(false)).toBe('pending');
    expect(getSectionStatus({ complete: true, verified: true })).toBe('verified');
    expect(getSectionStatus({ status: 'PASS' })).toBe('pass');
    expect(getSectionStatus({ status: 'FAIL' })).toBe('fail');
    expect(getSectionStatus({ toolSelectionAdvisory: true })).toBe('advisory');
  });

  it('maps score tones', () => {
    expect(scoreTone(49)).toBe('red');
    expect(scoreTone(50)).toBe('amber');
    expect(scoreTone(94)).toBe('amber');
    expect(scoreTone(95)).toBe('green');
    expect(scoreTone(100)).toBe('green');
  });

  it('renders ScoreDisplay with text and accessible label', () => {
    const html = renderToStaticMarkup(React.createElement(ScoreDisplay, { percent: 95 }));
    expect(html).toContain('Score: 95%');
    expect(html).toContain('aria-label="Score 95 percent"');
    expect(html).toContain('text-emerald-300');
    expectCleanOutput(html);
  });

  it('renders SectionStatusIcon with accessible label', () => {
    const html = renderToStaticMarkup(React.createElement(SectionStatusIcon, { status: 'pass' }));
    expect(html).toContain('aria-label="Verified"');
    expect(html).toContain('title="Verified"');
    expectCleanOutput(html);
  });

  it('renderer source avoids raw JSON helpers', () => {
    const source = readFileSync('src/components/forge/ForgeSectionRenderer.jsx', 'utf8');
    expect(source).not.toContain('<pre');
    expect(source).not.toContain('JSON.stringify');
  });

  it('forge pages use ForgeSectionRenderer instead of raw previews', () => {
    const pages = [
      'src/pages/ForgeResearchForm.jsx',
      'src/pages/ForgeDesignForm.jsx',
      'src/pages/ForgeBuildForm.jsx',
      'src/pages/ForgeAuditForm.jsx',
    ];

    for (const page of pages) {
      const source = readFileSync(page, 'utf8');
      expect(source).not.toContain('function InputPreview');
      expect(source).not.toContain('<pre');
      expect(source).not.toContain('JSON.stringify');
      expect(source).toContain('ForgeSectionRenderer');
    }

    const auditSource = readFileSync('src/pages/ForgeAuditForm.jsx', 'utf8');
    expect(auditSource).not.toContain('function StatusBadge');
    expect(auditSource).not.toContain('function CheckList');
  });

  it('renders ranked candidate list when candidates length is greater than one', () => {
    const html = htmlFor({
      mode: 'GUIDED',
      stepKey: 'research',
      selectionMode: 'single',
      selection: { platform_name: 'Perplexity AI', platform_type: 'research', compositeScore: 9.2 },
      candidates: [
        { platform_name: 'Perplexity AI', platform_type: 'research', compositeScore: 9.2 },
        { platform_name: 'Tavily', platform_type: 'research', compositeScore: 8.5 },
      ],
    });
    expect(html).toContain('Ranked candidates (2)');
    expect(html).toContain('Perplexity AI');
    expect(html).toContain('Tavily');
    expectCleanOutput(html);
  });

  it('marks picked tool with selected badge', () => {
    const html = htmlFor({
      mode: 'GUIDED',
      stepKey: 'design',
      selectionMode: 'single',
      selection: { platform_name: 'Figma', platform_type: 'design', compositeScore: 9.5 },
      candidates: [
        { platform_name: 'Figma', platform_type: 'design', compositeScore: 9.5 },
        { platform_name: 'Canva', platform_type: 'design', compositeScore: 8.1 },
      ],
    });
    expect(html).toContain('★ Selected');
    expect(html).toContain('aria-label="Selected"');
    expectCleanOutput(html);
  });

  it('does not render candidate pool when candidates length is one or less', () => {
    const html = htmlFor({
      mode: 'GUIDED',
      stepKey: 'research',
      selectionMode: 'single',
      selection: { platform_name: 'Perplexity AI', compositeScore: 9.2 },
      candidates: [{ platform_name: 'Perplexity AI', compositeScore: 9.2 }],
    });
    expect(html).not.toContain('Ranked candidates');
    expectCleanOutput(html);
  });

  it('renders candidate pool for pipeline mode and marks selected entries', () => {
    const html = htmlFor({
      mode: 'GUIDED',
      stepKey: 'build',
      selectionMode: 'pipeline',
      selection: [
        { platform_name: 'Base44', platform_type: 'build', compositeScore: 9.5 },
        { platform_name: 'Cursor', platform_type: 'build', compositeScore: 9.2 },
      ],
      candidates: [
        { platform_name: 'Base44', platform_type: 'build', compositeScore: 9.5 },
        { platform_name: 'Cursor', platform_type: 'build', compositeScore: 9.2 },
      ],
    });
    expect(html).toContain('Ranked candidates (2)');
    expect(html).toContain('Selected');
    expect(html).toContain('aria-label="Selected"');
    expect(html).toContain('Base44');
    expect(html).toContain('Cursor');
    expectCleanOutput(html);
  });

  it('candidate pool output avoids pre tags and JSON object notation', () => {
    const html = htmlFor({
      mode: 'GUIDED',
      stepKey: 'research',
      selectionMode: 'single',
      selection: { platform_name: 'Perplexity AI', platform_type: 'research', compositeScore: 9.2 },
      candidates: [
        { platform_name: 'Perplexity AI', platform_type: 'research', compositeScore: 9.2 },
        { platform_name: 'Tavily', platform_type: 'research', compositeScore: 8.5 },
      ],
    });
    expect(html).not.toContain('<pre');
    expect(html).not.toContain('JSON.stringify');
    expect(html).not.toContain('[object Object]');
    expect(html).not.toContain('{&quot;');
  });
});
