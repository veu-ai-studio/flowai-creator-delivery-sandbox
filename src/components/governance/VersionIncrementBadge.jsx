import { motion } from 'framer-motion';
import { GitBranch } from 'lucide-react';

export default function VersionIncrementBadge({ versionIncrement, changelog }) {
  if (!versionIncrement) return null;

  const colorMap = {
    major: 'border-purple-500/40 bg-purple-500/5 text-purple-400',
    minor: 'border-blue-500/40 bg-blue-500/5 text-blue-400',
    patch: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400',
  };
  const key = (versionIncrement.split(' ')[0] || 'patch').toLowerCase();
  const style = colorMap[key] || colorMap.patch;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border p-4 space-y-2 ${style}`}>
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4" />
        <p className="text-sm font-bold">Version Increment Locked: {versionIncrement}</p>
      </div>
      {changelog && (
        <p className="text-[11px] opacity-80 whitespace-pre-line">{changelog}</p>
      )}
    </motion.div>
  );
}