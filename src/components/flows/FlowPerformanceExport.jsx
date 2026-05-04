import { useState } from 'react';
import { Download, FileText, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FlowPerformanceExport({ flowId, flowName, runs = [] }) {
  const [exporting, setExporting] = useState(null);

  const download = (filename, content, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const exportJSON = async () => {
    setExporting('json');
    await new Promise(r => setTimeout(r, 300));
    const data = { flowId, flowName, exportedAt: new Date().toISOString(), totalRuns: runs.length, runs };
    download(`${flowName || 'flow'}-performance.json`, JSON.stringify(data, null, 2), 'application/json');
    setExporting(null);
  };

  const exportCSV = async () => {
    setExporting('csv');
    await new Promise(r => setTimeout(r, 300));
    const header = 'Run #,Status,Duration (s),Node Count,Date\n';
    const rows = runs.map((r, i) =>
      `${i + 1},${r.status || 'unknown'},${((r.duration_ms || 0) / 1000).toFixed(1)},${r.node_count || 0},${r.created_date || ''}`
    ).join('\n');
    download(`${flowName || 'flow'}-performance.csv`, header + rows, 'text/csv');
    setExporting(null);
  };

  const exportMarkdown = async () => {
    setExporting('md');
    await new Promise(r => setTimeout(r, 300));
    const successRate = runs.length ? Math.round((runs.filter(r => r.status === 'success').length / runs.length) * 100) : 0;
    const avgDur = runs.length ? (runs.reduce((a, r) => a + (r.duration_ms || 0), 0) / runs.length / 1000).toFixed(1) : 0;
    const md = `# Flow Performance Report: ${flowName}

Generated: ${new Date().toLocaleString()}

## Summary
| Metric | Value |
|---|---|
| Total Runs | ${runs.length} |
| Success Rate | ${successRate}% |
| Avg Duration | ${avgDur}s |

## Run History
| Run | Status | Duration | Nodes | Date |
|---|---|---|---|---|
${runs.map((r, i) => `| ${i + 1} | ${r.status || '—'} | ${((r.duration_ms || 0) / 1000).toFixed(1)}s | ${r.node_count || 0} | ${r.created_date ? new Date(r.created_date).toLocaleDateString() : '—'} |`).join('\n')}
`;
    download(`${flowName || 'flow'}-performance.md`, md, 'text/markdown');
    setExporting(null);
  };

  if (runs.length === 0) return (
    <p className="text-xs text-muted-foreground text-center py-4">Run the flow at least once to export performance data.</p>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold text-foreground flex items-center gap-2">
        <Download className="h-3.5 w-3.5 text-primary" /> Export Performance Data
        <span className="text-muted-foreground font-normal">({runs.length} runs)</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'json', label: 'JSON',     fn: exportJSON },
          { key: 'csv',  label: 'CSV',      fn: exportCSV },
          { key: 'md',   label: 'Markdown', fn: exportMarkdown },
        ].map(({ key, label, fn }) => (
          <Button key={key} variant="outline" size="sm" onClick={fn} disabled={!!exporting}
            className="h-7 text-xs gap-1.5">
            {exporting === key
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <FileText className="h-3 w-3" />}
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}