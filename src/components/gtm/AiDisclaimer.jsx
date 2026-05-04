import { AlertCircle } from 'lucide-react';

export default function AiDisclaimer({ className = '' }) {
  return (
    <p className={`text-[10px] text-amber-400 flex items-center gap-1 ${className}`}>
      <AlertCircle className="h-3 w-3 shrink-0" />
      AI-generated — review before use
    </p>
  );
}