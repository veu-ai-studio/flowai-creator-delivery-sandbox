import { useState } from 'react';
import { Download, Package, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DemoBatchExport({ products, demos }) {
  const [exporting, setExporting] = useState(false);
  const [done, setDone] = useState(false);

  const readyProducts = products.filter(p => demos[p.name]?.demo_status === 'ready');

  const exportAll = () => {
    setExporting(true);
    const exportData = readyProducts.map(p => {
      const demo = demos[p.name];
      return {
        product: p.name,
        tagline: p.tagline,
        demo_org: p.demo_org,
        generated_at: demo.updated_at,
        synthetic_data: demo.synthetic_data,
        tour_script: (() => { try { return JSON.parse(demo.tour_script || '{}'); } catch { return {}; } })(),
        microsite_html: demo.microsite_content,
        deployed: demo.microsite_deployed || false,
      };
    });

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veu-demo-environments-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setDone(true);
    setTimeout(() => setDone(false), 3000);
  };

  const exportMicrosites = () => {
    readyProducts.forEach(p => {
      const demo = demos[p.name];
      if (!demo?.microsite_content) return;
      const blob = new Blob([demo.microsite_content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${p.name.toLowerCase()}-demo-microsite.html`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (readyProducts.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <p className="text-xs font-bold text-foreground">Batch Export</p>
        <span className="text-[10px] text-muted-foreground">{readyProducts.length} demo{readyProducts.length !== 1 ? 's' : ''} ready</span>
      </div>
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={exportAll} disabled={exporting}>
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : done ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
          {done ? 'Exported!' : 'Export All (JSON)'}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={exportMicrosites}>
          <Download className="h-3.5 w-3.5" /> Export All Microsites (HTML)
        </Button>
      </div>
      <div className="flex flex-wrap gap-1">
        {readyProducts.map(p => (
          <span key={p.name} className="text-[9px] px-2 py-0.5 rounded-full border border-border bg-secondary/30 text-muted-foreground">{p.name}</span>
        ))}
      </div>
    </div>
  );
}