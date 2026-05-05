import { AlertTriangle } from 'lucide-react';

export default function SandboxBanner({ message, color = 'amber' }) {
  const styles = {
    amber: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    blue:  'border-blue-500/40 bg-blue-500/10 text-blue-400',
    red:   'border-red-500/40 bg-red-500/10 text-red-400',
  }[color] || 'border-amber-500/40 bg-amber-500/10 text-amber-400';

  return (
    <div className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 border-b text-xs font-semibold ${styles}`}>
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {message}
    </div>
  );
}