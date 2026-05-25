import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sidebarSrc = readFileSync(resolve(__dirname, '../../src/components/layout/Sidebar.jsx'), 'utf8');
const dashboardSrc = readFileSync(resolve(__dirname, '../../src/pages/FlowAIDashboard.jsx'), 'utf8');
const runConstructionPanelSrc = readFileSync(resolve(__dirname, '../../src/components/RunConstructionPanel.jsx'), 'utf8');
const workspaceSrc = readFileSync(resolve(__dirname, '../../src/pages/Workspace.jsx'), 'utf8');
const appSrc = readFileSync(resolve(__dirname, '../../src/App.jsx'), 'utf8');
const appLayoutSrc = readFileSync(resolve(__dirname, '../../src/components/layout/AppLayout.jsx'), 'utf8');
const universalNavSrc = readFileSync(resolve(__dirname, '../../src/components/shared/UniversalNav.jsx'), 'utf8');
const activeRunIndicatorSrc = readFileSync(resolve(__dirname, '../../src/components/layout/ActiveRunIndicator.jsx'), 'utf8');
const activeJobsPanelSrc = readFileSync(resolve(__dirname, '../../src/components/jobs/ActiveJobsPanel.jsx'), 'utf8');
const jobContextSrc = readFileSync(resolve(__dirname, '../../src/lib/JobContext.jsx'), 'utf8');

describe('FlowAI unified operating system shell', () => {
  it('splits Flow Hub Production and Workspace into distinct routes', () => {
    expect(appSrc).toMatch(/path="\/"\s+element=\{<LegacyFlowHubRedirect \/>/);
    expect(appSrc).toMatch(/path="\/flow-hub\/production"\s+element=\{<LandingPage \/>/);
    expect(appSrc).toMatch(/path="\/flow-hub\/migration"\s+element=\{<LandingPage \/>/);
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
    expect(sidebarSrc).toMatch(/title:\s*"FLOW HUB"/);
    expect(sidebarSrc).toMatch(/label:\s*"Production"/);
    expect(sidebarSrc).toMatch(/label:\s*"Migration"/);
    expect(sidebarSrc).not.toMatch(/label:\s*"New Run"/);
    expect(sidebarSrc).not.toMatch(/label:\s*"Migrate a Product"/);
    expect(sidebarSrc).toMatch(/title:\s*"CONFIGURATION"/);
    expect(sidebarSrc).toContain('Migration Mode requires operator enablement.');
    expect(sidebarSrc).toMatch(/title:\s*"PORTFOLIO"/);
    expect(sidebarSrc).toMatch(/label:\s*"Portfolio Dashboard"/);
    expect(sidebarSrc).toMatch(/label:\s*"Product Registry"/);
    expect(sidebarSrc).toMatch(/label:\s*"Session History"/);
    expect(sidebarSrc).toMatch(/title:\s*"CONFIGURATION"/);
    expect(sidebarSrc).toMatch(/label:\s*"My Products"/);
    expect(sidebarSrc).toMatch(/label:\s*"Objective & Settings"/);
  });

  it('treats Flow Hub Production and Migration as first-class sidebar destinations', () => {
    const landingSrc = readFileSync(resolve(__dirname, '../../src/pages/LandingPage.jsx'), 'utf8');
    expect(sidebarSrc).toContain('activeWhen');
    expect(sidebarSrc).toContain('pathname === "/flow-hub/production"');
    expect(sidebarSrc).toContain('pathname === "/flow-hub/migration"');
    expect(sidebarSrc).toContain('searchParams.get("mode") === "migration"');
    expect(sidebarSrc).toContain('path: "/flow-hub/production"');
    expect(sidebarSrc).toContain('path: "/flow-hub/migration"');
    expect(sidebarSrc).toContain('fetch("/api/operator/migration-mode"');
    expect(sidebarSrc).toContain('setMigrationModeEnabled(data.enabled)');
    expect(sidebarSrc).toContain('disabled: !migrationModeEnabled');
    expect(landingSrc).toContain("params.get('mode') === 'migration'");
    expect(landingSrc).toContain("location.pathname === '/flow-hub/migration'");
    expect(landingSrc).toContain("location.pathname === '/flow-hub/production'");
    expect(landingSrc).toContain("setMode('migration')");
    expect(landingSrc).toContain('Flow Hub — Production');
    expect(landingSrc).toContain('Flow Hub — Migration');
    expect(landingSrc).toContain('isFocusedMigrationSetup');
    expect(landingSrc).toContain('Step 1 - Select Your Product');
    expect(landingSrc).toContain('Which product do you want to migrate?');
    expect(landingSrc).toContain('Step 2 - Migration Details');
    expect(landingSrc).toContain('Step 3 - Confirm and Start');
  });

  it('keeps focused migration Step 3 visible on load and Step 2 before Step 3 after URL entry', () => {
    const landingSrc = readFileSync(resolve(__dirname, '../../src/pages/LandingPage.jsx'), 'utf8');
    const step2Index = landingSrc.indexOf('Step 2 - Migration Details');
    const step3Index = landingSrc.indexOf('Step 3 - Confirm and Start');
    const step2GuardIndex = landingSrc.indexOf('{urlInput.trim() && (');

    expect(step2Index).toBeGreaterThan(-1);
    expect(step3Index).toBeGreaterThan(-1);
    expect(step2Index).toBeLessThan(step3Index);
    expect(step2GuardIndex).toBeGreaterThan(-1);
    expect(step2GuardIndex).toBeLessThan(step2Index);
    expect(landingSrc.slice(step2Index, step3Index)).not.toContain('{urlInput.trim() && (');
    expect(landingSrc).toContain('Platform detected');
    expect(landingSrc).toContain('Upgrade repo target');
    expect(landingSrc).toContain('Estimated files');
    expect(landingSrc).toContain('Rollback');
    expect(landingSrc).toContain('data-paste-behavior="replace"');
    expect(landingSrc).toContain('setUrlInput(text.trim())');
    expect(landingSrc).toContain('Enter product URL — e.g. https://saigeplatform.com');
    expect(landingSrc).toContain('border-cyan-500/60');
  });

  it('keeps Flow Hub Production setup separate from focused migration setup', () => {
    const landingSrc = readFileSync(resolve(__dirname, '../../src/pages/LandingPage.jsx'), 'utf8');

    expect(landingSrc).toContain("location.pathname === '/flow-hub/production'");
    expect(landingSrc).toContain('Start the standard product upgrade flow.');
    expect(landingSrc).toContain('Flow Hub — Production');
    expect(landingSrc).toContain('Enter your product URL...');
  });

  it('guards sidebar active-run rendering before calling map', () => {
    expect(sidebarSrc).toContain("const safeActiveRuns = Array.isArray(activeRuns) ? activeRuns.filter((run) => run && typeof run === 'object') : []");
    expect(sidebarSrc).toContain('safeActiveRuns.map');
    expect(sidebarSrc).not.toContain('title={activeRuns.map');
  });

  it('guards Flow Hub route shell arrays before rendering active run and job panels', () => {
    const landingSrc = readFileSync(resolve(__dirname, '../../src/pages/LandingPage.jsx'), 'utf8');

    expect(appSrc).toMatch(/path="\/flow-hub\/production"\s+element=\{<LandingPage \/>/);
    expect(appSrc).toMatch(/path="\/flow-hub\/migration"\s+element=\{<LandingPage \/>/);
    expect(appLayoutSrc).toContain('<ActiveRunIndicator />');
    expect(appLayoutSrc).toContain('<ActiveJobsPanel />');

    expect(sidebarSrc).toContain("Array.isArray(activeRuns) ? activeRuns.filter((run) => run && typeof run === 'object') : []");
    expect(sidebarSrc).not.toContain('activeRuns.map');

    expect(activeRunIndicatorSrc).toContain("Array.isArray(runs) ? runs.filter((run) => run && typeof run === 'object') : []");
    expect(activeRunIndicatorSrc).not.toContain('runs.map');

    expect(activeJobsPanelSrc).toContain("Array.isArray(jobs) ? jobs.filter((job) => job && typeof job === 'object') : []");
    expect(activeJobsPanelSrc).toContain('Array.isArray(job.result?.apps) ? job.result.apps : []');
    expect(activeJobsPanelSrc).not.toContain('jobs.map');
    expect(activeJobsPanelSrc).not.toContain('jobs.filter(j');
    expect(activeJobsPanelSrc).not.toContain('job.result.apps.map');

    expect(jobContextSrc).toContain("Array.isArray(parsed) ? parsed.filter((job) => job && typeof job === 'object') : []");
    expect(jobContextSrc).not.toContain('return parsed');

    expect(landingSrc).toContain("Array.isArray(products) ? products.filter((product) => product && typeof product === 'object') : []");
    expect(landingSrc).toContain("Array.isArray(uploadedFiles) ? uploadedFiles.filter((file) => file && typeof file === 'object') : []");
    expect(landingSrc).not.toContain('products.map');
    expect(landingSrc).not.toContain('uploadedFiles.map');
  });

  it('does not keep the old split launch/workspace navigation labels in the sidebar', () => {
    expect(sidebarSrc).not.toMatch(/Launch FlowAI/);
    expect(sidebarSrc).not.toMatch(/Renewal Workspace/);
    expect(sidebarSrc).not.toMatch(/AUTO OPERATIONS/);
    expect(sidebarSrc).not.toMatch(/GUIDED OPERATIONS/);
    expect(sidebarSrc).not.toMatch(/MANUAL OPERATIONS/);
  });

  it('combines URL, description, and pasted content in Flow Hub Production', () => {
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

  it('renders 8-step progress and readable log labels in the homepage run panel', () => {
    expect(runConstructionPanelSrc).toContain('PipelineProgressTracker');
    expect(runConstructionPanelSrc).toContain('MACRO_STEPS');
    expect(runConstructionPanelSrc).toContain('Research');
    expect(runConstructionPanelSrc).toContain('Design');
    expect(runConstructionPanelSrc).toContain('Build');
    expect(runConstructionPanelSrc).toContain('Quality Audit');
    expect(runConstructionPanelSrc).toContain('Deploy');
    expect(runConstructionPanelSrc).toContain('Self-Renewal');
    expect(runConstructionPanelSrc).toContain('GTM');
    expect(runConstructionPanelSrc).toContain('Monitor');
    expect(runConstructionPanelSrc).toContain('Running...');
    expect(runConstructionPanelSrc).toContain('Named Step');
    expect(runConstructionPanelSrc).toContain('Five-Layer Scoring');
  });

  it('renders GitHub migration diagnostics from blockers without secret fields', () => {
    expect(runConstructionPanelSrc).toContain('blocker.githubMessage');
    expect(runConstructionPanelSrc).toContain('blocker.githubErrors');
    expect(runConstructionPanelSrc).toContain('GitHub: {blocker.githubMessage}');
    expect(runConstructionPanelSrc).not.toContain('blocker.Authorization');
    expect(runConstructionPanelSrc).not.toContain('blocker.token');
  });

  it('auto-starts focused Migration runs without the redundant Run FlowAI confirmation', () => {
    const landingSrc = readFileSync(resolve(__dirname, '../../src/pages/LandingPage.jsx'), 'utf8');
    expect(runConstructionPanelSrc).toContain('autoStart = false');
    expect(runConstructionPanelSrc).toContain('autoStartRef');
    expect(runConstructionPanelSrc).toContain('if (!autoStart || autoStartRef.current || status !==');
    expect(landingSrc).toMatch(/mode="MIGRATION"[\s\S]*autoStart/);
    expect(landingSrc).not.toMatch(/mode=\{isMigrationMode \? 'MIGRATION' : 'FOREGROUND'\}[\s\S]{0,160}autoStart/);
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
