import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Tooltip from "@/components/ui/Tooltip";
import {
  ArrowLeft,
  BarChart3,
  Boxes,
  ClipboardList,
  FolderKanban,
  Globe,
  Home,
  Rocket,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { listActiveFlowAIRuns, subscribeFlowAIRuns } from "@/lib/flowaiRunStore";

const navSections = [
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
    title: "LAUNCH",
    items: [
      {
        label: "New Run",
        path: "/flowai",
        icon: Rocket,
        tooltip: "Start a FlowAI run from a URL, product description, pasted content, or screenshot context.",
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
        label: "Run History",
        path: "/runs",
        icon: ClipboardList,
        tooltip: "Previous FlowAI runs across products, statuses, and dates.",
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
        label: "Objective & Settings",
        path: "/configuration",
        icon: SlidersHorizontal,
        tooltip: "Session objective, operating mode, and organization settings.",
      },
    ],
  },
];

function isActivePath(locationPath, itemPath) {
  return locationPath === itemPath || locationPath.startsWith(`${itemPath}/`);
}

function NavItem({ label, path, icon: Icon, tooltip }) {
  const location = useLocation();
  const active = isActivePath(location.pathname, path);
  const inner = (
    <Link
      to={path}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        active
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

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        navigate("/flowai");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  useEffect(() => subscribeFlowAIRuns(() => setActiveRuns(listActiveFlowAIRuns())), []);

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
        {activeRuns.length > 0 && (
          <button
            type="button"
            onClick={() => navigate('/runs')}
            className="flex w-full items-center justify-between gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15"
            title={activeRuns.map((run) => `${run.product}: ${run.progressLabel}`).join('\n')}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true">🟢</span>
              <span className="truncate">{activeRuns.length} Running</span>
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
