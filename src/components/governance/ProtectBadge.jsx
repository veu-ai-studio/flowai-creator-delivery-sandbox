import { Shield } from 'lucide-react';

// Amber shield badge shown in navigation when protection snapshot is active
export default function ProtectBadge({ protectionActive }) {
  if (!protectionActive) return null;
  return (
    <div
      title="Protection snapshot active — rollback available if changes fail"
      className="flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-bold"
    >
      <Shield className="h-3.5 w-3.5" />
      Protected
    </div>
  );
}