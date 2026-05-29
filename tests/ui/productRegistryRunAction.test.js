import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const registrySrc = readFileSync(resolve(__dirname, '../../src/pages/ProductRegistry.jsx'), 'utf8');
const dashboardSrc = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');

describe('ProductRegistry run action', () => {
  it('adds a primary Run action that navigates to Flow Hub Production with selected product params', () => {
    expect(registrySrc).toContain('const runProduct = (product) =>');
    expect(registrySrc).toContain("params.set('url', targetUrl)");
    expect(registrySrc).toContain("params.set('product', product.name)");
    expect(registrySrc).toContain("navigate(`/flowai${params.toString() ? `?${params.toString()}` : ''}`)");
    expect(registrySrc).toContain('<Play className="h-3 w-3 fill-current" /> Run');
    expect(registrySrc).toContain('bg-primary');
  });

  it('makes product rows clickable while existing action buttons stop propagation', () => {
    expect(registrySrc).toContain('onClick={() => runProduct(p)}');
    expect(registrySrc).toContain('cursor-pointer');
    expect(registrySrc).toContain('const stopAction = (event, action) =>');
    expect(registrySrc).toContain('event.stopPropagation()');
    expect(registrySrc).toMatch(/stopAction\(event,\s*\(\)\s*=>\s*navigate\('\/runs'\)\)/);
    expect(registrySrc).toMatch(/stopAction\(event,\s*\(\)\s*=>\s*navigate\('\/clearance'\)\)/);
    expect(registrySrc).toContain('stopAction(event, () => archiveProduct(p.slug))');
  });

  it('prefills the FlowAI Production URL from Product Registry query params', () => {
    expect(dashboardSrc).toContain('new URLSearchParams(window.location.search)');
    expect(dashboardSrc).toContain("params.get('url')");
    expect(dashboardSrc).toContain('setUrl(selectedUrl)');
    expect(dashboardSrc).toContain("method: 'combined'");
  });
});
