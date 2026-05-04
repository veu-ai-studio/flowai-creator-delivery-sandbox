import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, CheckCircle2, FileText, Code2, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';

function buildMarkdown(run) {
  const out = run.output || {};
  const log = out.executionLog || out.agentLog || [];
  const scores = out.scores || {};
  const recs = out.recommendations || [];

  let md = `# FlowAI Audit Report\n\n`;
  md += `**Run ID:** ${run.id}\n`;
  md += `**Type:** ${run.type}\n`;
  md += `**Status:** ${run.status}\n`;
  md += `**Date:** ${new Date(run.created_date).toLocaleString()}\n`;
  if (run.input) md += `**Input:** ${run.input}\n`;
  md += `\n---\n\n`;

  if (Object.keys(scores).length > 0) {
    md += `## Scores\n\n`;
    Object.entries(scores).forEach(([k, v]) => { md += `- **${k}**: ${v}\n`; });
    md += '\n';
  }

  if (log.length > 0) {
    md += `## Execution Log\n\n`;
    log.forEach(entry => {
      const name = entry.name || entry.agent || entry.step;
      const status = entry.status || 'done';
      md += `### ${name} (${status})\n`;
      if (entry.system) md += `- System: ${entry.system}\n`;
      if (entry.duration_ms) md += `- Duration: ${entry.duration_ms}ms\n`;
      if (entry.result?.summary) md += `- Summary: ${entry.result.summary}\n`;
      if (entry.error) md += `- Error: ${entry.error}\n`;
      md += '\n';
    });
  }

  if (recs.length > 0) {
    md += `## Recommendations\n\n`;
    recs.forEach(r => {
      const action = typeof r === 'string' ? r : r.action;
      const priority = r.priority || '';
      md += `- [${priority.toUpperCase() || 'INFO'}] ${action}\n`;
    });
  }

  if (out.liveUrl) md += `\n## Live URL\n\n${out.liveUrl}\n`;

  return md;
}

function buildPDF(run) {
  const doc = new jsPDF();
  const out = run.output || {};
  const log = out.executionLog || out.agentLog || [];
  const scores = out.scores || {};

  doc.setFontSize(20);
  doc.text('FlowAI Audit Report', 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(`Run: ${run.id} | Type: ${run.type} | Status: ${run.status}`, 20, 30);
  doc.text(`Date: ${new Date(run.created_date).toLocaleString()}`, 20, 36);
  if (run.input) doc.text(`Input: ${run.input.slice(0, 80)}`, 20, 42);

  let y = 54;

  if (Object.keys(scores).length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Scores', 20, y); y += 8;
    doc.setFontSize(9);
    Object.entries(scores).forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 26, y); y += 6;
      if (y > 270) { doc.addPage(); y = 20; }
    });
    y += 4;
  }

  if (log.length > 0) {
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text('Execution Log', 20, y); y += 8;
    log.forEach(entry => {
      if (y > 265) { doc.addPage(); y = 20; }
      const name = entry.name || entry.agent || `Step ${entry.step}`;
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`${name} — ${entry.status || 'done'} ${entry.system ? `(${entry.system})` : ''}`, 20, y); y += 6;
      if (entry.result?.summary) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const lines = doc.splitTextToSize(entry.result.summary, 165);
        lines.slice(0, 2).forEach(line => { doc.text(line, 26, y); y += 5; });
      }
      y += 2;
    });
  }

  if (out.liveUrl) {
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(11);
    doc.setTextColor(0, 80, 200);
    doc.text(`Live URL: ${out.liveUrl}`, 20, y);
  }

  return doc;
}

export default function AuditExportPanel() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  useEffect(() => { loadRuns(); }, []);

  const loadRuns = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Run.list('-created_date', 30);
      setRuns(list);
      if (list.length > 0 && !selectedRun) setSelectedRun(list[0]);
    } catch {} finally { setLoading(false); }
  };

  const exportPDF = async (run) => {
    setExporting('pdf');
    try {
      const doc = buildPDF(run);
      doc.save(`flowai-report-${run.id?.slice(-6) || 'export'}.pdf`);
    } finally { setExporting(null); }
  };

  const exportMarkdown = (run) => {
    setExporting('md');
    const md = buildMarkdown(run);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowai-report-${run.id?.slice(-6) || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  const exportJSON = (run) => {
    setExporting('json');
    const blob = new Blob([JSON.stringify(run, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flowai-report-${run.id?.slice(-6) || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(null);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileDown className="h-5 w-5 text-primary" />
          Exportable Audit Reports
        </h2>
        <Button size="sm" variant="outline" onClick={loadRuns} disabled={loading} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {runs.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground py-4 text-center">No runs yet — run the orchestration engine to generate reports.</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Run list */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Run ({runs.length})</p>
          {runs.map((run, i) => (
            <motion.button
              key={run.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedRun(run)}
              className={`w-full text-left rounded-lg border p-3 transition-all ${selectedRun?.id === run.id ? 'border-primary/50 bg-primary/5' : 'border-border bg-secondary/10 hover:bg-secondary/20'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate capitalize">{run.type} run</p>
                  <p className="text-[10px] text-muted-foreground truncate">{run.input?.slice(0, 50) || 'No input'}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${run.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {run.status}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-mono">{new Date(run.created_date).toLocaleDateString()}</span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Export panel for selected run */}
        {selectedRun && (
          <motion.div key={selectedRun.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-border bg-secondary/10 p-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground capitalize">{selectedRun.type} Run</p>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">ID: {selectedRun.id}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(selectedRun.created_date).toLocaleString()}</p>
              {selectedRun.input && <p className="text-xs text-muted-foreground mt-1 truncate">{selectedRun.input}</p>}
            </div>

            {/* Scores preview */}
            {selectedRun.output?.scores && (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(selectedRun.output.scores).map(([k, v]) => (
                  <div key={k} className="rounded bg-secondary/50 border border-border/50 px-2 py-1.5">
                    <p className="text-[9px] text-muted-foreground capitalize">{k.replace('_', ' ')}</p>
                    <p className="text-sm font-bold text-foreground">{v}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Log preview */}
            {(selectedRun.output?.executionLog || selectedRun.output?.agentLog) && (
              <p className="text-[10px] text-muted-foreground">
                {(selectedRun.output.executionLog || selectedRun.output.agentLog).length} steps logged
              </p>
            )}

            {/* Export buttons */}
            <div className="space-y-2 pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Export As</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => exportPDF(selectedRun)} disabled={!!exporting} className="gap-1.5">
                  {exporting === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  PDF
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportMarkdown(selectedRun)} disabled={!!exporting} className="gap-1.5">
                  {exporting === 'md' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Markdown
                </Button>
                <Button size="sm" variant="outline" onClick={() => exportJSON(selectedRun)} disabled={!!exporting} className="gap-1.5">
                  {exporting === 'json' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Code2 className="h-3.5 w-3.5" />}
                  JSON
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}