import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Database, Loader2, CheckCircle2 } from 'lucide-react';

export default function SeedMetricsButton({ onSeeded }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [result, setResult] = useState(null);

  const handleSeed = async () => {
    setLoading(true);
    setDone(false);
    try {
      const res = await base44.functions.invoke('seedToolMetrics', { clear: true });
      setResult(res.data);
      setDone(true);
      setTimeout(() => setDone(false), 4000);
      if (onSeeded) onSeeded();
    } catch (e) {
      console.error('Seed failed:', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" className="gap-1.5" onClick={handleSeed} disabled={loading}>
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Database className="h-3.5 w-3.5" />}
        {loading ? 'Seeding...' : done ? `Seeded ${result?.records_created} records` : 'Seed Test Data'}
      </Button>
    </div>
  );
}