import { useState } from 'react';
import { Download, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FlowBatchExport({ flows = [] }) {
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const handleExport = async () => {
    if (flows.length === 0) return;
    setExporting(true);

    const exportData = flows.map(flow => ({
      name: flow.name,
      nodes: flow.nodes || [],
      edges: flow.edges || [],
      variables: flow.variables || [],
      created_date: flow.created_date,
      updated_date: flow.updated_date,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flows-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" 
      onClick={handleExport} disabled={exporting || flows.length === 0}>
      {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : exported ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
      {exported ? 'Exported!' : `Export ${flows.length} Flow${flows.length !== 1 ? 's' : ''}`}
    </Button>
  );
}