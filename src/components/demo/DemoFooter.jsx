import { Zap } from 'lucide-react';

export default function DemoFooter() {
  return (
    <footer className="border-t border-border bg-card/50 py-8 px-6 mt-16">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Zap className="h-4 w-4 text-primary" />
          <span>FlowAI · VEUaaS</span>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <a href="/veuaas" className="hover:text-foreground transition-colors">Marketing</a>
          <a href="/demo" className="hover:text-foreground transition-colors">Sandbox</a>
          <a href="/live-demo" className="hover:text-foreground transition-colors">Live Demo</a>
          <a href="/enterprise-demo" className="hover:text-foreground transition-colors">Enterprise</a>
        </div>
        <p className="text-xs text-muted-foreground">Built by VEU AI Studio · © 2026</p>
      </div>
    </footer>
  );
}