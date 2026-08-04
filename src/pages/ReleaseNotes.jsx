import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2 } from 'lucide-react';

const RELEASES = [
  {
    sprint: 'Sprint PROTECT-1',
    title: 'Anti-Crawling, IP Protection, Self-Renewal, and Self-Protection Architecture',
    date: 'May 2026',
    items: [
      'Phase 1 — Right-click protection on all FlowAI pages with polite notice: "FlowAI is proprietary VEU AI Studio infrastructure."',
      'Phase 1 — DevTools detection logged to GovernanceAuditLog on each occurrence',
      'Phase 1 — Content protection: user-select:none on all generated reports and sprint instructions',
      'Phase 1 — IP and legal footer on all pages: copyright, patent pending, scraping prohibition',
      'Phase 1 — Terms of Use and Privacy Policy pages at /terms-of-use and /privacy-policy',
      'Phase 1 — Session security: XOR cipher for sessionStorage with 8-hour expiry',
      'Phase 1 — Bot detection utility: headless browser signatures, missing User-Agent, rapid-click detection',
      'Phase 2 — Platform Health Widget on Dashboard: status, last self-test, active threats, proxy status',
      'Phase 2 — Automated daily self-test (scheduledSelfTest) — runs at 3am, tests proxy + 3 entities',
      'Phase 2 — Anomaly detection utilities: session speed, score jump, clearance contradiction',
      'Phase 3 — Self-Renewal Capability Package at /capability-packages/self-renewal — 4 components',
      'Phase 3 — Self-Renewal install sprints for all 5 VEU AI Studio products at /capability-packages/self-renewal/install',
      'Phase 4 — Self-Protection Capability Package at /capability-packages/self-protection — 4 components',
      'Phase 4 — Self-Protection install sprints for all 5 VEU AI Studio products at /capability-packages/self-protection/install',
      'Phase 4/3 — Capability Transfer page at /capability-transfer with one-click consolidated sprint generator',
      'Phase 5 — Security Posture dimension added to Step 4 Quality Audit (scored 0-10, triggers Self-Protection sprint if < 6)',
      'Phase 5 — Self-Renewal Phase 2 generates Self-Protection installation sprint when Security Posture < 6',
      'Capability Transfer added to Settings sidebar section',
    ],
  },
  {
    sprint: 'Sprint HARD-1',
    title: 'Hardening, Audit Trail, and Legacy Cleanup',
    date: 'May 2026',
    items: [
      'Session persistence — AutoSession, GuidedSession, ManualSession results written to DB on every step completion',
      'Resume Session prompt — returning users see unfinished sessions with last step name, steps completed, and two-button choice',
      'GovernanceAuditLog entity — tamper-evident log of every action in Auto, Guided, and Manual modes',
      'Silent background audit logger — session_started, step_completed, proposal_approved/modified/skipped, findings_approved, fix_applied/skipped, clearance events',
      'Audit Trail page at /audit-trail — reverse-chronological log with filters for product, action type, mode — read only',
      'Audit Trail linked in Settings sidebar section',
      'Clearance Protocol Prompt — after Accept and Lock in Auto Runner, a prompt to Start Clearance Protocol appears automatically',
      'ClearanceProtocolPrompt component stores session context for pre-population',
      'Legacy route redirects — /flows, /flow-designer, /run-flow, /run-history, /variables, /old-dashboard all redirect to /dashboard',
      '/autonomous-engine and /auto-runner redirect to /flowai — the authenticated operational ledger is the single canonical auto-execution interface',
      'Self-Renewal Phase 6 — Re-run Self-Test to Verify Fixes button appears after Human Gate review completes',
      'Score improvement delta display — Functionality: 5 → 8 (+3) ✅ per dimension when Phase 1 re-runs',
      'Clearance Protocol added as fifth tool under Go To Market step in both Guided and Manual modes',
    ],
  },
  {
    sprint: 'Sprint ARCH-1',
    title: 'Architecture, Configuration & Self-Renewal',
    date: 'May 2026',
    items: [
      'Six-section sidebar: Dashboard, Configuration, Auto Operations, Guided Operations, Manual Operations, Settings',
      'Configuration page at /configuration — unified session setup with product selection, input method, objective, auto parameters, and launch buttons',
      'Self-Renewal replaces Govern & Heal across all operation modes — sidebar, progress bar, step headers, AutoRunner cards',
      'Guided Operations approval flow — FlowAI proposes before every step; Approve, Modify, Skip; findings feedback loop',
      'Manual Operations user-proposal flow — user defines scope; FlowAI confirms before executing; same feedback loop',
      'Auto Operations reads Configuration — no re-entry of product or objective',
      'Session context banner on every Guided and Manual step showing product, objective, mode, step number',
      'Describe & Build, Clone & Improve, Synthesize & Build accessible from Configuration sidebar section',
    ],
  },
  {
    sprint: 'Sprint UX-C',
    title: 'Five-Section Sidebar',
    date: 'May 2026',
    items: [
      'Five-section sidebar: Dashboard, Auto Operations, Guided Operations, Manual Operations, Settings',
      'Auto Runner — live execution stream for all eight process steps sequentially',
      'Guided Operations — eight-step process bar with session persistence across browser sessions',
      'Manual Operations — eight-step tracker with time awareness and AI Help on every step',
      'Dashboard rebuilt with six panels: Product Health, Active Sessions, Pending Gates, Recent Activity, Quick Actions, Usage',
      'Onboarding — five-step guided setup with mode recommendation logic',
      'Release Notes page with full sprint history',
      'Renamed: Creator Studio → My Workspace, My Creations → My Products, and 14 other labels updated',
      'AutoSession, GuidedSession, ManualSession entities added',
      'Tooltip coverage extended to all five sections and all sidebar items',
    ],
  },
  {
    sprint: 'Sprint UX-B',
    title: 'Readability and Navigation',
    date: 'April 2026',
    items: [
      'Typography standards — heading hierarchy, 13px body text, WCAG AA contrast ratios',
      'Information density rules — consistent card padding, table row heights, truncation',
      'Breadcrumb trails on all pages',
      'Context-aware back button logic',
      'Loading, success, error, and empty state standardization',
      'Mobile and tablet responsive breakpoints',
      'Standards embedded as Transferable Capability in governance engine',
    ],
  },
  {
    sprint: 'Sprint UX-A',
    title: 'Zero-Typing and Tooltips',
    date: 'April 2026',
    items: [
      'Portfolio Quick Select — select target URLs without typing',
      'Smart session defaults — Manual iteration, Per-URL gate timing pre-selected',
      'Keyboard shortcuts: Cmd+N (new session), Cmd+Enter (launch), Cmd+/ (AI assistant)',
      'Universal tooltip system — 500ms delay, auto-flip, Escape dismissal',
      'Tooltips on all 35 sidebar items, 10 section headers, logo, and New Session button',
      'Tooltips on Clearance and Demo Builder action buttons',
    ],
  },
  {
    sprint: 'Sprint 10',
    title: 'My Workspace',
    date: 'March 2026',
    items: [
      'Natural language product creation — Describe & Build mode',
      'Clone & Improve — audit any existing product URL and generate improved version',
      'Synthesize & Build — compare 2-5 reference products and synthesize the best',
      'My Products page with strategy, architecture, and build sprint viewing',
      'Register Product flow connecting to Portfolio and Clearance',
      'CreatedProduct entity with full three-output persistence',
    ],
  },
  {
    sprint: 'Sprint 9',
    title: 'Product Clearance Protocol',
    date: 'February 2026',
    items: [
      'Six-step clearance wizard — Governance, Readiness, White-Label, Data Export, Demo, Sign-Off',
      'ClearanceRecord entity tracking step-by-step clearance progress',
      'All five VEU AI Studio products pre-loaded: SAIGE, PressAI, ReachSMS, RelTwin, MyPregLife',
      'Step indicators with emoji status, overall clearance status badges',
      'Clearance wizard with AI-generated checklists per step',
      'Custom product support — add any product to the clearance protocol',
    ],
  },
  {
    sprint: 'Sprint 8',
    title: 'Tool Intelligence Marketplace',
    date: 'February 2026',
    items: [
      'Platform Intelligence — AI-ranked tool recommendations by performance, cost, Africa availability',
      'Compare Tools — side-by-side comparison of up to four tools with AI analysis',
      'My Tech Stack — per-product technology stack management with Africa readiness indicator',
      '65 tools pre-loaded across 12 categories',
      'AI recommendation panel with use-case-specific suggestions',
      'Stack export as Markdown, setup guide generation per product',
    ],
  },
  {
    sprint: 'Sprint 7.5a',
    title: 'Basic Security',
    date: 'January 2026',
    items: [
      'Base44 authentication enabled — all pages require login',
      'Landing page built — public-facing FlowAI description and contact',
      'UserRole entity with admin/operator/client roles',
      'URL Whitelist entity for governance session targeting',
      'Admin setup flow with secure key management',
    ],
  },
  {
    sprint: 'Sprint 7',
    title: 'Demo and GTM',
    date: 'January 2026',
    items: [
      'Demo Builder — three-step synthetic data generation, microsite HTML, guided tour script',
      'Investor Hub — 12-slide pitch deck generation, portfolio page assembly',
      'Launch Assets — email sequences, LinkedIn posts, executive summaries, pilot proposals',
      'DemoEnvironment, GTMAsset, InvestorAsset entities',
      'Custom product support in Demo Builder',
      'Tour step editor, data sources, and version history panels',
    ],
  },
  {
    sprint: 'Sprint 6 Phase 3',
    title: 'Dual Deployment',
    date: 'December 2025',
    items: [
      'Environments page — track and synchronize dev and production environments',
      'Drift detection — compare dev vs prod and generate remediation sprints',
      'Live Monitor — real-time health checks for all deployed products',
      'Cross-environment governance — Gate 1 review for low-scoring environments',
      'ProductEnvironment entity with score history and sync reports',
    ],
  },
  {
    sprint: 'Sprint 6 Phase 2',
    title: 'Deployment Scaffold',
    date: 'November 2025',
    items: [
      'Readiness Checker — score products across six readiness dimensions',
      'Scaffold Generator — SQL schemas, Vercel config, README, migration checklist',
      'DeploymentScaffold entity with full scaffold persistence',
      'Architecture page with product-by-product readiness visualization',
    ],
  },
  {
    sprint: 'Sprint 6 Phase 1',
    title: 'Production Credibility',
    date: 'November 2025',
    items: [
      'Domain Manager — AI-generated domain recommendations, DNS records, professional email setup',
      'Brand Identity — VEU AI Studio unified brand system with CSS variables and component standards',
      'White-Label — automated sprint generation to remove Base44 branding from any product',
      'Data Portability — GDPR-compliant export sprint generation per product',
      'BrandSystem, DomainStrategy entities',
    ],
  },
  {
    sprint: 'Sprint 5',
    title: 'Self-Governance Layer',
    date: 'October 2025',
    items: [
      'Self-Test — automated end-to-end functional baseline testing',
      'Self-Audit — four-dimension scoring engine (UI/UX, API, Logic, Business Value)',
      'Self-Protect — snapshot and rollback infrastructure before any changes',
      'Self-Heal — automatic fix application for detected issues',
      'Self-Optimize — performance improvement cycle targeting dimensions below 8/10',
      'Self-Upgrade — version locking and upgrade management',
      'Four Human Gates — review, approval, testing, acceptance at each governance cycle',
      'Governance Center — centralized governance dashboard with timeline and history',
      'Master Control Card — session configuration with URL targeting, activity selection, mode settings',
    ],
  },
];

export default function ReleaseNotes() {
  return (
    <div className="p-8 lg:p-10 max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" /> Release Notes
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Complete history of every sprint delivered — what was built and when
        </p>
      </motion.div>

      <div className="space-y-4">
        {RELEASES.map((release, i) => (
          <motion.div key={release.sprint} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary">{release.sprint}</span>
                    <h3 className="text-base font-bold text-foreground">{release.title}</h3>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{release.date}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{release.items.length} items</span>
              </div>
              <ul className="mt-3 space-y-1">
                {release.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400/60 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
