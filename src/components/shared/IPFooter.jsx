// ─── IP FOOTER — shown on all FlowAI pages ────────────────────────────────────
import { Link } from 'react-router-dom';

export default function IPFooter() {
  return (
    <footer className="border-t border-border bg-card/30 px-6 py-4 mt-auto">
      <div className="max-w-6xl mx-auto space-y-1.5 text-center">
        <p className="text-[10px] text-muted-foreground">
          FlowAI is proprietary technology of VEU AI Studio. Unauthorized access, scraping, reverse engineering, or redistribution is prohibited.
        </p>
        <p className="text-[10px] text-muted-foreground">
          © 2026 VEU AI Studio. All rights reserved. Patent pending.
        </p>
        <div className="flex items-center justify-center gap-3 text-[10px]">
          <Link to="/terms-of-use" className="text-muted-foreground hover:text-primary transition-colors">Terms of Use</Link>
          <span className="text-border">·</span>
          <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
        </div>
      </div>
    </footer>
  );
}