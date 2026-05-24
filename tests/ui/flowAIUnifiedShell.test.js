import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarSrc = readFileSync(resolve(__dirname, '../../src/components/layout/Sidebar.jsx'), 'utf8');
const dashboardSrc = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');
const workspaceSrc = readFileSync(resolve(__dirname, '../../src/pages/Workspace.jsx'), 'utf8');
const appSrc = readFileSync(resolve(__dirname, '../../src/App.jsx'), 'utf8');
const appLayoutSrc = readFileSync(resolve(__dirname, '../../src/components/layout/AppLayout.jsx'), 'utf8');
const universalNavSrc = readFileSync(resolve(__dirname, '../../src/components/shared/UniversalNav.jsx'), 'utf8');

describe('FlowAI unified operating system shell', () => {
  it('splits New Run and Workspace into distinct routes', () => {
    expect(appSrc).toMatch(/path="\/flowai"\s+element=\{<FlowAIDashboard \/>/);
    expect(appSrc).toMatch(/path="\/workspace"\s+element=\{<Workspace \/>/);
    expect(workspaceSrc).toContain('8-step upgrade pipeline');
    expect(workspaceSrc).toContain('Original Product');
    expect(workspaceSrc).toContain('Upgraded Version');
  });

  it('exposes the canonical sidebar sections and labels', () => {
    expect(sidebarSrc).toMatch(/Product-Agnostic AI Operating System/);
    expect(sidebarSrc).toMatch(/title:\s*"NAVIGATION"/);
    expect(sidebarSrc).toMatch(/label:\s*"Home"/);
    expect(sidebarSrc).toMatch(/label:\s*"Workspace"/);
    expect(sidebarSrc).toMatch(/label:\s*"Landing Page"/);
    expect(sidebarSrc).toMatch(/>Back</);
    expect(sidebarSrc).toMatch(/title:\s*"CONFIGURATION"/);
    expect(sidebarSrc).toMatch(/label:\s*"New Run"/);
    expect(sidebarSrc).toMatch(/title:\s*"PORTFOLIO"/);
    expect(sidebarSrc).toMatch(/label:\s*"Portfolio Dashboard"/);
    expect(sidebarSrc).toMatch(/label:\s*"Product Registry"/);
    expect(sidebarSrc).toMatch(/label:\s*"Session History"/);
    expect(sidebarSrc).toMatch(/title:\s*"CONFIGURATION"/);
    expect(sidebarSrc).toMatch(/label:\s*"My Products"/);
    expect(sidebarSrc).toMatch(/label:\s*"Objective & Settings"/);
  });

  it('does not keep the old split launch/workspace navigation labels in the sidebar', () => {
    expect(sidebarSrc).not.toMatch(/Launch FlowAI/);
    expect(sidebarSrc).not.toMatch(/Renewal Workspace/);
    expect(sidebarSrc).not.toMatch(/AUTO OPERATIONS/);
    expect(sidebarSrc).not.toMatch(/GUIDED OPERATIONS/);
    expect(sidebarSrc).not.toMatch(/MANUAL OPERATIONS/);
  });

  it('combines URL, description, and pasted content in New Run', () => {
    expect(dashboardSrc).toMatch(/Enter URL/);
    expect(dashboardSrc).toMatch(/Describe Product/);
    expect(dashboardSrc).toMatch(/Paste Content/);
    expect(dashboardSrc).toMatch(/Test Fetch/);
    expect(dashboardSrc).toMatch(/Attach files/);
    expect(dashboardSrc).toMatch(/REGISTERED_PRODUCT_CONFIG/);
    expect(dashboardSrc).not.toMatch(/setInputMethod/);
    expect(dashboardSrc).toMatch(/method:\s*'combined'/);
    expect(dashboardSrc).toMatch(/description:\s*inputPayload\.productDescription/);
    expect(dashboardSrc).toMatch(/productDescription:\s*inputPayload\.productDescription/);
    expect(dashboardSrc).toMatch(/attachments:\s*attachmentsPayload/);
  });

  it('connects app-layout pages with global Back, Home, Workspace, and Landing controls', () => {
    expect(appLayoutSrc).toMatch(/<UniversalNav className="hidden lg:flex" \/>/);
    expect(universalNavSrc).toContain("navigate('/dashboard')");
    expect(universalNavSrc).toContain("navigate('/workspace')");
    expect(universalNavSrc).toContain("navigate('/landing')");
    expect(universalNavSrc).toContain('navigate(-1)');
  });

  it('keeps the FlowAI run page inside AppLayout with visible 8-step run progress', () => {
    expect(appSrc).toMatch(/<Route element=\{<AppLayout \/>\}>[\s\S]*path="\/flowai"\s+element=\{<FlowAIDashboard \/>/);
    expect(dashboardSrc).toContain('PipelineProgressTracker');
    expect(dashboardSrc).toContain('8-Step Pipeline');
    expect(dashboardSrc).toContain('Research');
    expect(dashboardSrc).toContain('Design');
    expect(dashboardSrc).toContain('Build');
    expect(dashboardSrc).toContain('Quality Audit');
    expect(dashboardSrc).toContain('Deploy');
    expect(dashboardSrc).toContain('Self-Renewal');
    expect(dashboardSrc).toContain('GTM');
    expect(dashboardSrc).toContain('Monitor');
    expect(dashboardSrc).toContain('Running...');
    expect(dashboardSrc).toContain('Failed');
    expect(dashboardSrc).toContain('Complete');
  });

  it('does not abort an active run when sidebar navigation unmounts the run page', () => {
    expect(dashboardSrc).toContain('async function stop()');
    expect(dashboardSrc).toContain('if (abortRef.current) abortRef.current.abort();');
    expect(dashboardSrc).not.toContain('useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);');
  });

  it('surfaces registered product system notes inside the FlowAI run UI', () => {
    expect(dashboardSrc).toMatch(/findRegisteredProductConfigForUrl/);
    expect(dashboardSrc).toMatch(/registeredProductNote/);
    expect(dashboardSrc).toMatch(/\{registeredProductNote\}/);
  });
});
