import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import Sidebar from "./Sidebar";
import OrchestrationBar from "./OrchestrationBar";
import SearchModal from "@/components/search/SearchModal";
import { Button } from "@/components/ui/button";
import { Search, Menu, X } from "lucide-react";
import ActiveJobsPanel from "@/components/jobs/ActiveJobsPanel";
import IPFooter from "@/components/shared/IPFooter";
import UniversalNav from "@/components/shared/UniversalNav";
import { installRightClickProtection, installDevToolsDetection } from "@/lib/contentProtection";
import FlowAIHealthBadge from "@/components/layout/FlowAIHealthBadge";
import ActiveRunIndicator from "@/components/layout/ActiveRunIndicator";

export default function AppLayout() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [searchOpen]);

  // Close mobile sidebar on route change
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  // Content protection — install once on mount
  useEffect(() => {
    const cleanupRightClick = installRightClickProtection();
    const cleanupDevTools = installDevToolsDetection();
    return () => {
      cleanupRightClick();
      cleanupDevTools();
    };
  }, []);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-background font-inter">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button type="button" aria-label="Close navigation" className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div
        aria-hidden={isMobile && !sidebarOpen ? 'true' : undefined}
        inert={isMobile && !sidebarOpen ? '' : undefined}
        className={`fixed left-0 top-0 bottom-0 z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <Sidebar />
      </div>

      <div className="md:ml-64 flex min-w-0 flex-col min-h-screen">
        <OrchestrationBar />

        {/* Top bar - utility controls only; primary navigation lives in the sidebar. */}
        <div className="min-w-0 px-4 md:px-6 py-2 border-b border-border flex items-center justify-between gap-3">
          {/* Mobile: hamburger on the left */}
          <Button aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen} variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden shrink-0" onClick={() => setSidebarOpen(v => !v)}>
            {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>

          <div className="flex min-w-0 flex-col">
            <p className="text-xs font-semibold text-foreground">FlowAI</p>
            <p className="text-[10px] text-muted-foreground truncate">Product-Agnostic AI Operating System</p>
          </div>

          <div className="flex-1" />

          <FlowAIHealthBadge />
          <ActiveRunIndicator />
          <UniversalNav className="hidden lg:flex" />

          {/* Search */}
          <Button variant="outline" size="sm" onClick={() => setSearchOpen(true)} className="gap-2 text-xs h-8 shrink-0">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Search</span>
            <span className="text-[10px] text-muted-foreground ml-1">⌘K</span>
          </Button>
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <ActiveJobsPanel />
      <IPFooter />
    </div>
  );
}
