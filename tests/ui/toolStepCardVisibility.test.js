import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import StepToolStatusList from '../../src/components/operations/StepToolStatusList.jsx';
import { rankedToolsForStepCard } from '../../src/lib/tools/stepToolVisibility.js';

describe('P13-A step-card ranked tool visibility', () => {
  it('provides ranked tool statuses for all 8 operation steps', () => {
    const steps = ['research', 'design', 'build', 'qa_audit', 'deploy', 'govern', 'gtm', 'monitor'];
    for (const step of steps) {
      const tools = rankedToolsForStepCard(step);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools[0]).toHaveProperty('dispatchState');
    }
  });

  it('renders callable and unavailable statuses without raw JSON', () => {
    const html = renderToStaticMarkup(React.createElement(StepToolStatusList, { stepKey: 'build' }));
    expect(html).toContain('Claude Code');
    expect(html).toContain('pending approval');
    expect(html).toContain('Cursor');
    expect(html).toContain('stub unavailable');
    expect(html).not.toContain('<pre');
    expect(html).not.toContain('[object Object]');
  });

  it('Auto, Guided, and Manual step cards import the ranked tool list component', () => {
    const files = [
      'src/pages/AutoRunner.jsx',
      'src/components/operations/ProcessBar.jsx',
      'src/components/operations/ManualTracker.jsx',
    ];

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source).toContain('StepToolStatusList');
    }
  });
});
