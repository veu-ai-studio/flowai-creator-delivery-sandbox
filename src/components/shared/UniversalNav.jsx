// ─── UNIVERSAL NAV — Sprint NAV-2 ─────────────────────────────────────────────
// Four buttons: Back | Home (/dashboard) | Workspace (/) | Landing (/landing)
// Active page button is highlighted in blue; others are muted gray.
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home, Zap, Globe } from 'lucide-react';

export default function UniversalNav({ className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const isHome      = path === '/dashboard' || (path !== '/' && path !== '/landing');
  const isWorkspace = path === '/';
  const isLanding   = path === '/landing';

  const activeClass   = 'flex items-center gap-1.5 text-xs h-8 px-3 rounded-md bg-primary/10 text-primary border border-primary/30 font-semibold transition-all';
  const inactiveClass = 'flex items-center gap-1.5 text-xs h-8 px-3 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-all';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* ← Back — always present */}
      <button onClick={() => navigate(-1)} className={inactiveClass} title="Go back">
        <ArrowLeft className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Back</span>
      </button>

      {/* 🏠 Home → /dashboard */}
      <button
        onClick={() => navigate('/dashboard')}
        className={isHome ? activeClass : inactiveClass}
        title="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Home</span>
      </button>

      {/* ⚡ Workspace → / */}
      <button
        onClick={() => navigate('/')}
        className={isWorkspace ? activeClass : inactiveClass}
        title="Command Center / Workspace"
      >
        <Zap className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Workspace</span>
      </button>

      {/* 🌐 Landing → /landing */}
      <button
        onClick={() => navigate('/landing')}
        className={isLanding ? activeClass : inactiveClass}
        title="Marketing / Landing page"
      >
        <Globe className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Landing</span>
      </button>
    </div>
  );
}