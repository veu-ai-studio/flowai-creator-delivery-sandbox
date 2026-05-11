import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Tooltip from "@/components/ui/Tooltip";
import {
  LayoutDashboard, Zap, Clock, Wrench, Settings,
  Pencil, ListChecks, Play, SlidersHorizontal,
  Search, GitBranch, Hammer, ShieldCheck, Megaphone, Activity,
  BarChart3, ChevronDown, BookOpen, Users, List, CreditCard, Sliders, Shield, RefreshCw, Layers, Link2, FileText, Smartphone, Package
} from "lucide-react";
// Alias — Layers already imported above, used for Portfolio section icon

// ─── SIX-SECTION NAV STRUCTURE ───────────────────────────────────────────────

const navSections = [
  {
    title: "PORTFOLIO",
    description: "Multi-Product OS",
    icon: Layers,
    tooltip: "Portfolio-level view across all VEU AI Studio products",
    items: [
      { label: "Portfolio Dashboard", path: "/portfolio", icon: LayoutDashboard, tooltip: "Hero stats, product grid, active runs and demo-ready count across all products" },
      { label: "Product Registry",    path: "/products",  icon: Package,       tooltip: "Table of all registered products with status, scores, and row actions" },
      { label: "Run History",         path: "/runs",      icon: Play,          tooltip: "All 8-step pipeline runs across all products — filterable by product, status, date" },
      { label: "Dashboard",           path: "/dashboard", icon: LayoutDashboard, tooltip: "Single-product command center — health, sessions, pending gates, quick actions" },
    ],
  },
  {
    title: "CONFIGURATION",
    description: "Session Setup",
    icon: SlidersHorizontal,
    tooltip: "Configure your session before launching any operation — select product, input method, objective, and parameters.",
    items: [
      { label: "My Products",       path: "/my-products",     icon: ListChecks, tooltip: "All products created — status, clearance progress, and deliverables." },
      { label: "Describe & Build",  path: "/configuration?mode=describe",    icon: Pencil,     tooltip: "Describe your product in plain English. Opens Configuration with Describe & Build pre-selected." },
      { label: "Clone & Improve",   path: "/configuration?mode=clone",       icon: Link2,      tooltip: "Provide an existing product URL. Opens Configuration with Clone & Improve pre-selected." },
      { label: "Synthesize & Build",path: "/configuration?mode=synthesize",  icon: Layers,     tooltip: "Provide 2–5 competing URLs. Opens Configuration with Synthesize & Build pre-selected." },
      { label: "Objective & Settings", path: "/configuration", icon: SlidersHorizontal, tooltip: "Set session objective, auto parameters, and launch into any operation mode." },
    ],
  },
  {
    title: "AUTO OPERATIONS",
    description: "Seconds to minutes",
    icon: Zap,
    tooltip: "FlowAI executes all 8 steps automatically without pausing. You review the final report only.",
    items: [
      { label: "Auto Runner", path: "/auto-runner", icon: Play, tooltip: "Watch FlowAI execute all eight process steps live — Research through Monitor — in one continuous automated session." },
    ],
  },
  {
    title: "GUIDED OPERATIONS",
    description: "Minutes to hours",
    icon: Clock,
    tooltip: "FlowAI proposes its approach at each step. You approve, modify, or skip before any execution begins.",
    items: [
      { label: "Research",      path: "/guided/research",  icon: Search,      tooltip: "FlowAI proposes research questions. You approve before analysis begins." },
      { label: "Design",        path: "/guided/design",    icon: GitBranch,   tooltip: "FlowAI proposes design dimensions. You approve before evaluation begins." },
      { label: "Build",         path: "/guided/build",     icon: Hammer,      tooltip: "FlowAI proposes build audit scope. You approve before execution begins." },
      { label: "Quality Audit", path: "/guided/qa-audit",  icon: BarChart3,   tooltip: "FlowAI proposes scoring criteria. You approve before audit begins." },
      { label: "Deploy",        path: "/guided/deploy",    icon: ShieldCheck, tooltip: "FlowAI proposes deployment checks. You approve before assessment begins." },
      { label: "Self-Renewal",  path: "/guided/govern",    icon: RefreshCw,   tooltip: "FlowAI proposes self-test, self-heal, optimize, and upgrade scope. You approve each gate." },
      { label: "Go To Market",  path: "/guided/gtm",       icon: Megaphone,   tooltip: "FlowAI proposes GTM dimensions. You approve before readiness assessment begins." },
      { label: "App Store",     path: "/app-store-distribution", icon: Smartphone, tooltip: "Guide your product through Apple App Store and Google Play Store submission." },
      { label: "Monitor",       path: "/guided/monitor",   icon: Activity,    tooltip: "FlowAI proposes final report structure. You approve before clearance decision is produced." },
    ],
  },
  {
    title: "MANUAL OPERATIONS",
    description: "Hours to days",
    icon: Wrench,
    tooltip: "You propose what needs to be done at each step. FlowAI executes your instructions.",
    items: [
      { label: "Research",      path: "/manual/research",  icon: Search,      tooltip: "You define the research scope. FlowAI executes your instructions." },
      { label: "Design",        path: "/manual/design",    icon: GitBranch,   tooltip: "You define the design dimensions. FlowAI evaluates per your criteria." },
      { label: "Build",         path: "/manual/build",     icon: Hammer,      tooltip: "You define the build audit scope. FlowAI checks what you specify." },
      { label: "Quality Audit", path: "/manual/qa-audit",  icon: BarChart3,   tooltip: "You define the scoring criteria. FlowAI audits per your standards." },
      { label: "Deploy",        path: "/manual/deploy",    icon: ShieldCheck, tooltip: "You define the deployment checks. FlowAI assesses what you specify." },
      { label: "Self-Renewal",  path: "/manual/govern",    icon: RefreshCw,   tooltip: "You define the self-renewal scope. FlowAI executes per your instructions." },
      { label: "Go To Market",  path: "/manual/gtm",       icon: Megaphone,   tooltip: "You define the GTM review criteria. FlowAI evaluates per your scope." },
      { label: "Monitor",       path: "/manual/monitor",   icon: Activity,    tooltip: "You define the monitoring focus. FlowAI produces findings per your specification." },
    ],
  },
  {
    title: "SETTINGS",
    description: "Platform Configuration",
    icon: Settings,
    tooltip: "Platform configuration, onboarding, and administration.",
    items: [
      { label: "Onboarding",           path: "/onboarding",    icon: Zap,        tooltip: "First-time setup guide. Complete this to configure FlowAI for your specific products and workflow." },
      { label: "Release Notes",        path: "/release-notes", icon: BookOpen,   tooltip: "Complete history of every sprint delivered — what was built and when." },
      { label: "Users",                path: "/users",         icon: Users,      tooltip: "Manage operator and client accounts. Control who has access to which features." },
      { label: "URL Whitelist",        path: "/url-whitelist", icon: List,       tooltip: "Manage approved URLs for governance sessions. Add, remove, or grant temporary access." },
      { label: "Cost & Usage",          path: "/cost-usage",    icon: CreditCard, tooltip: "Track token usage and cost breakdown by session, with monthly totals." },
      { label: "Cost Controls",        path: "/cost-controls", icon: Sliders,    tooltip: "Set token budgets, session limits, and usage alerts to manage API costs." },
      { label: "Governance Settings",  path: "/governance",    icon: Shield,     tooltip: "Configure thresholds for Self-Protect, Self-Optimize, and Self-Upgrade triggers." },
      { label: "Audit Trail",          path: "/audit-trail",   icon: FileText,   tooltip: "Tamper-evident log of every FlowAI action — read only." },
      { label: "Capability Transfer",  path: "/capability-transfer", icon: Package,  tooltip: "Install Self-Renewal and Self-Protection into any Base44 product with one sprint." },
      { label: "Org & Settings",       path: "/settings",      icon: Settings,   tooltip: "Organization info, members, and integration status." },
    ],
  },
];

// ─── NAV ITEM ─────────────────────────────────────────────────────────────────

function NavItem({ label, path, icon: Icon, isActive, tooltip }) {
  const inner = (
    <Link
      to={path}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
  return tooltip ? <Tooltip content={tooltip} className="block">{inner}</Tooltip> : inner;
}

// ─── NAV SECTION ──────────────────────────────────────────────────────────────

function NavSection({ title, description, icon: SectionIcon, tooltip, items, isOpen, onToggle, timeTag }) {
  const location = useLocation();
  const isActive = items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'));

  const btn = (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide transition-colors ${
        isActive
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
      }`}
    >
      <SectionIcon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 text-left">{title}</span>
      {timeTag && <span className="text-[8px] text-muted-foreground/60 font-normal normal-case hidden xl:block">{timeTag}</span>}
      <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
    </button>
  );

  return (
    <div className="space-y-1">
      {tooltip ? <Tooltip content={tooltip} className="block">{btn}</Tooltip> : btn}
      {isOpen && (
        <div className="pl-2 space-y-0.5 border-l border-sidebar-border">
          {items.map(({ label, path, icon: Icon, tooltip }) => (
            <NavItem
              key={path}
              label={label}
              path={path}
              icon={Icon}
              tooltip={tooltip}
              isActive={location.pathname === path || location.pathname.startsWith(path + '/')}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TIME TAGS FOR SECTION HEADERS ────────────────────────────────────────────

const TIME_TAGS = {
  "AUTO OPERATIONS":    "seconds–minutes",
  "GUIDED OPERATIONS":  "minutes–hours",
  "MANUAL OPERATIONS":  "hours–days",
  "CONFIGURATION":      "session setup",
};

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const navigate = useNavigate();

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'n') { e.preventDefault(); navigate('/auto-runner'); }
        if (e.key === '/') { e.preventDefault(); navigate('/auto-runner'); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

  const [openSections, setOpenSections] = useState({
    "PORTFOLIO": true,
    "CONFIGURATION": true,
    "AUTO OPERATIONS": false,
    "GUIDED OPERATIONS": false,
    "MANUAL OPERATIONS": false,
    "SETTINGS": false,
  });

  const toggleSection = (title) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="p-4 flex flex-col gap-3 sticky top-0 bg-sidebar border-b border-sidebar-border">
        <Tooltip content="FlowAI — VEU AI Studio's proprietary governance and product platform">
          <div className="flex items-center gap-3 cursor-default">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold tracking-tight text-foreground font-inter">FlowAI</div>
              <div className="text-[10px] text-muted-foreground">Process-Driven</div>
            </div>
          </div>
        </Tooltip>

      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-3">
        {navSections.map(section => (
          <NavSection
            key={section.title}
            title={section.title}
            description={section.description}
            icon={section.icon}
            tooltip={section.tooltip}
            items={section.items}
            isOpen={openSections[section.title]}
            onToggle={() => toggleSection(section.title)}
            timeTag={TIME_TAGS[section.title]}
          />
        ))}
      </nav>

      <div className="p-4 mx-3 mb-4 rounded-lg bg-secondary/50 border border-border sticky bottom-0">
        <p className="text-xs text-muted-foreground leading-relaxed">FlowAI Engine v0.1</p>
      </div>
    </aside>
  );
}