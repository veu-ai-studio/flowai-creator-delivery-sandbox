// Shown when a URL fetch fails — gives user two recovery options.
// Never allows silent fallback to URL-string inference.
import { AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FetchFailurePrompt({ url, reason, onRetry, onSwitchToDescription }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-red-400">Page could not be fetched</p>
          <p className="text-[11px] text-muted-foreground break-all">{url}</p>
          {reason && (
            <p className="text-[11px] text-red-300/80">Reason: {reason}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-foreground leading-relaxed">
        FlowAI cannot produce accurate findings without reading the real page content.
        Proceeding on URL-string inference alone would generate generic, unreliable results.
      </p>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 flex-1"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try a different URL
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-1"
          onClick={onSwitchToDescription}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Switch to description input
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Tip: If this is a private or login-protected app, use "Describe" mode to tell FlowAI what the product does.
      </p>
    </div>
  );
}