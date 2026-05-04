import { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileJson, FileText, Loader2, CheckCircle2, BarChart3 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function PerformanceExportTool({ results, url, runHistory = [] }) {
  const [exporting, setExporting] = useState(null);

  const exportJSON = async () => {
    setExporting('json');
    await new Promise(r => setTimeout(r, 300));
    const payload = {
      exported_at: new Date().toISOString(),
      url,
      current_scores: results?.scores,
      recommendations_count: results?.recommendations?.length || 0,
      run_history: runHistory.map(r => ({ timestamp: r.timestamp, scores: r.scores })),
      issues_summary: results?.issues,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qa-report-${(url || 'export').replace(/https?:\/\//, '').replace(/\//g, '-')}-${Date.now()}.json`;
    a.click();
    setExporting('done_json');
    setTimeout(() => setExporting(null), 2000);
  };

  const exportCSV = async () => {
    setExporting('csv');
    await new Promise(r => setTimeout(r, 300));
    const rows = [['Timestamp', 'Overall', 'UI/UX', 'API', 'Logic', 'Business Value']];
    const allRuns = runHistory.length > 0 ? runHistory : (results ? [results] : []);
    allRuns.forEach(r => {
      rows.push([
        r.timestamp || new Date().toISOString(),
        r.scores?.overall ?? '',
        r.scores?.ui_ux ?? '',
        r.scores?.api ?? '',
        r.scores?.logic ?? '',
        r.scores?.business_value ?? '',
      ]);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qa-scores-${Date.now()}.csv`;
    a.click();
    setExporting('done_csv');
    setTimeout(() => setExporting(null), 2000);
  };

  const exportMarkdown = async () => {
    setExporting('md');
    await new Promise(r => setTimeout(r, 300));
    if (!results) return setExporting(null);
    const md = [
      `# QA Audit Report`,
      `**URL:** ${url}`,
      `**Date:** ${new Date().toLocaleString()}`,
      '',
      `## Scores`,
      `| Layer | Score |`,
      `|-------|-------|`,
      ...Object.entries(results.scores || {}).map(([k, v]) => `| ${k.replace(/_/g, ' ')} | ${v}/10 |`),
      '',
      `## Recommendations (${results.recommendations?.length || 0})`,
      ...(results.recommendations || []).map((r, i) => `${i + 1}. **[${r.priority}]** ${r.action}`),
    ].join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qa-report-${Date.now()}.md`;
    a.click();
    setExporting('done_md');
    setTimeout(() => setExporting(null), 2000);
  };

  const exports = [
    { key: 'json', label: 'Export JSON', icon: FileJson, action: exportJSON, color: 'text-blue-400' },
    { key: 'csv',  label: 'Export CSV',  icon: BarChart3, action: exportCSV, color: 'text-emerald-400' },
    { key: 'md',   label: 'Export MD',   icon: FileText, action: exportMarkdown, color: 'text-purple-400' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Download className="h-4 w-4 text-primary" /> Performance Export
      </h3>
      <div className="flex gap-2 flex-wrap">
        {exports.map(({ key, label, icon: Icon, action, color }) => {
          const isDone = exporting === `done_${key}`;
          const isLoading = exporting === key;
          return (
            <Button key={key} variant="outline" size="sm" onClick={action}
              disabled={!!exporting || !results} className="h-8 gap-1.5 text-xs">
              {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> :
               isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
               <Icon className={`h-3.5 w-3.5 ${color}`} />}
              {isDone ? 'Downloaded!' : label}
            </Button>
          );
        })}
      </div>
      {!results && <p className="text-[10px] text-muted-foreground">Run an audit first to enable exports.</p>}
      {runHistory.length > 1 && <p className="text-[10px] text-muted-foreground">{runHistory.length} runs available in export</p>}
    </div>
  );
}