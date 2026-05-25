import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Tooltip from "@/components/ui/Tooltip";
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Boxes,
  ClipboardList,
  FolderKanban,
  Globe,
  GitBranch,
  Home,
  History,
  Rocket,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { listActiveFlowAIRuns, subscribeFlowAIRuns } from "@/lib/flowaiRunStore";

const MIGRATION_MODE_ENABLED_FOR_UI =
  String(import.meta.env?.VITE_FLOWAI_ENABLE_MIGRATION_MODE || "").toLowerCase() === "true";

function getNavSections({ migrationModeEnabled = MIGRATION_MODE_ENABLED_FOR_UI } = {}) {
  return [
  {
    title: "NAVIGATION",
    items: [
      {
        label: "Home",
        path: "/dashboard",
        icon: Home,
        tooltip: "Return to the FlowAI home dashboard.",
      },
      {
        label: "Workspace",
        path: "/workspace",
        icon: Zap,
        tooltip: "Open the 8-step FlowAI pipeline workspace.",
      },
      {
        label: "Landing Page",
        path: "/landing",
        icon: Globe,
        tooltip: "Open the public-facing FlowAI landing page.",
      },
    ],
  },
  {
    title: "PORTFOLIO",
    items: [
      {
        label: "Portfolio Dashboard",
        path: "/portfolio",
        icon: BarChart3,
        tooltip: "Portfolio-level product health, runs, scores, and demo readiness.",
      },
      {
        label: "Product Registry",
        path: "/products",
        icon: FolderKanban,
        tooltip: "Registered products, repository mapping, ownership, and operational status.",
      },
      {
        label: "Session History",
        path: "/runs",
        icon: ClipboardList,
        tooltip: "Previous FlowAI runs across products, statuses, and dates.",
      },
    ],
  },
  {
    title: "FLOW HUB",
    items: [
      {
        label: "Production",
        path: "/flow-hub/production",
        icon: Rocket,
        tooltip: "Start the standard FlowAI product upgrade/run flow.",
        activeWhen: ({ pathname }) => pathname === "/flow-hub/production" || pathname === "/",
      },
      {
        label: "Migration",
        path: "/flow-hub/migration",
        icon: GitBranch,
        tooltip: "Open Flow Hub Migration setup for platform dependency migration.",
        disabled: !migrationModeEnabled,
        disabledMessage: "Migration Mode requires operator enablement.",
        activeWhen: ({ pathname, searchParams }) =>
          pathname === "/flow-hub/migration" || (pathname === "/" && searchParams.get("mode") === "migration"),
      },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      {
        label: "My Products",
        path: "/my-products",
        icon: Boxes,
        tooltip: "Products created or managed through FlowAI.",
      },
      {
        label: "Session History",
        path: "/runs",
        icon: History,
        tooltip: "Review previous FlowAI sessions and run outcomes.",
      },
      {
        label: "Clearance Protocol",
        path: "/clearance",
        icon: ShieldCheck,
        tooltip: "Run product clearance before promotion or release.",
      },
      {
        label: "Governance Dashboard",
        path: "/governance",
        icon: BarChart3,
        tooltip: "Review governance evidence, decisions, and audit status.",
      },
      {
        label: "Release Notes",
        path: "/release-notes",
        icon: BookOpen,
        tooltip: "Review FlowAI release history and shipped changes.",
      },
      {
        label: "Objective & Settings",
        path: "/configuration",
        icon: SlidersHorizontal,
        tooltip: "Session objective, operating mode, and organization settings.",
      },
    ],
  },
];
}

function isActivePath(location, item) {
  const searchParams = new URLSearchParams(location.search);
  if (typeof item.activeWhen === "function") {
    return item.activeWhen({ pathname: location.pathname, searchParams });
  }
  const itemPath = item.path.split("?")[0];
  return location.pathname === itemPath || location.pathname.startsWith(`${itemPath}/`);
}

function NavItem({ label, path, icon: Icon, tooltip, disabled, disabledMessage, activeWhen }) {
  const location = useLocation();
  const active = isActivePath(location, { path, activeWhen });
  const inner = (
    <Link
      to={path}
      className={`flex flex-col gap-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : disabled
          ? "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      }`}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </span>
      {disabled && disabledMessage && <span className="pl-7 text-[10px] leading-tight text-amber-300">{disabledMessage}</span>}
    </Link>
  );
  return tooltip ? <Tooltip content={tooltip} className="block">{inner}</Tooltip> : inner;
}

function NavSection({ title, items }) {
  return (
    <section className="space-y-1.5">
      <p className="px-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => <NavItem key={item.path} {...item} />)}
      </div>
    </section>
  );
}

export default function Sidebar() {
  const navigate = useNavigate();
  const [activeRuns, setActiveRuns] = useState(() => listActiveFlowAIRuns());
  const [migrationModeEnabled, setMigrationModeEnabled] = useState(MIGRATION_MODE_ENABLED_FOR_UI);
  const safeActiveRuns = Array.isArray(activeRuns) ? activeRuns.filter((run) => run && typeof run === 'object') : [];
  const navSections = getNavSections({ migrationModeEnabled });

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  useEffect(() => subscribeFlowAIRuns(() => setActiveRuns(listActiveFlowAIRuns())), []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/operator/migration-mode", { headers: { Accept: "application/json" } })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (!cancelled && typeof data?.enabled === "boolean") {
          setMigrationModeEnabled(data.enabled);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto">
      <div className="p-4 sticky top-0 bg-sidebar border-b border-sidebar-border">
        <Tooltip content="FlowAI - product-agnostic AI operating system for VEU AI Studio and similar organizations">
          <div className="flex items-center gap-3 cursor-default">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-semibold tracking-tight text-foreground font-inter">FlowAI</div>
              <div className="text-[10px] leading-tight text-muted-foreground">Product-Agnostic AI Operating System</div>
            </div>
          </div>
        </Tooltip>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-5">
        {safeActiveRuns.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/runs')}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15"
            title={safeActiveRuns.map((run) => `${run.product}: ${run.progressLabel}`).join('\n')}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true">🟢</span>
              <span className="truncate">{safeActiveRuns.length} Running</span>
            </span>
            <span className="text-[10px] text-emerald-200">View</span>
          </button>
        )}
        <Tooltip content="Go back to the previous page">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">Back</span>
          </button>
        </Tooltip>
        {navSections.map((section) => <NavSection key={section.title} {...section} />)}
      </nav>

      <div className="p-4 mx-3 mb-4 rounded-md bg-secondary/50 border border-border sticky bottom-0">
        <p className="text-xs font-semibold text-foreground">FlowAI Engine v0.1</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">One OS. Upgraded URLs.</p>
      </div>
    </aside>
  );
}
