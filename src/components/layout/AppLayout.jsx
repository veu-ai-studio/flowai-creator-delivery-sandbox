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

  // Content protection — install once on mount
  useEffect(() => {
    const cleanupRightClick = installRightClickProtection();
    const cleanupDevTools = installDevToolsDetection();
    return () => {
      cleanupRightClick();
      cleanupDevTools();
    };
  }, []);

  // Global paste fix — forces React to recognise pasted values in all inputs/textareas
  useEffect(() => {
    const handlePaste = (e) => {
      const target = e.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        const text = e.clipboardData.getData('text/plain');
        if (text) {
          e.preventDefault();
          const proto = target.tagName === 'INPUT'
            ? window.HTMLInputElement.prototype
            : window.HTMLTextAreaElement.prototype;
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(proto, 'value').set;
          nativeInputValueSetter.call(target, target.value + text);
          target.dispatchEvent(new Event('input', { bubbles: true }));
          target.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    };
    document.addEventListener('paste', handlePaste, true);
    return () => document.removeEventListener('paste', handlePaste, true);
  }, []);

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile unless open */}
      <div className={`fixed left-0 top-0 bottom-0 z-40 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar />
      </div>

      <div className="md:ml-64 flex flex-col min-h-screen">
        <OrchestrationBar />

        {/* Top bar - utility controls only; primary navigation lives in the sidebar. */}
        <div className="px-4 md:px-6 py-2 border-b border-border flex items-center justify-between gap-3">
          {/* Mobile: hamburger on the left */}
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden shrink-0" onClick={() => setSidebarOpen(v => !v)}>
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

        <main className="flex-1">
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
