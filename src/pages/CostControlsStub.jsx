import { Sliders } from 'lucide-react';

export default function CostControlsStub() {
  return (
    <div className="p-8 lg:p-10 max-w-2xl">
      <div className="rounded-xl border border-border bg-card p-10 text-center space-y-4">
        <Sliders className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <h1 className="text-2xl font-bold text-foreground">Cost Controls</h1>
        <p className="text-sm text-muted-foreground">Cost controls coming soon.</p>
      </div>
    </div>
  );
}