import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Download, Check } from 'lucide-react';

export default function IntelligentReporting({ results, url }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an executive summary report for this QA audit:
URL: ${url}
Overall Score: ${results?.scores?.overall}/10
Scores: ${JSON.stringify(results?.scores)}
Top Issues: ${JSON.stringify(results?.recommendations?.slice(0, 5))}

Provide: executive_summary, key_wins (array), critical_risks (array), next_steps (array).`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            key_wins: { type: 'array', items: { type: 'string' } },
            critical_risks: { type: 'array', items: { type: 'string' } },
            next_steps: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setReport(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Intelligent Reporting
        </h2>
        <Button size="sm" className="gap-2" onClick={handleGenerate} disabled={loading || !results}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>

      {report && (
        <div className="space-y-4 text-sm">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border/50">
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Executive Summary</p>
            <p className="text-foreground">{report.executive_summary}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Key Wins', items: report.key_wins, color: 'text-emerald-400' },
              { label: 'Critical Risks', items: report.critical_risks, color: 'text-red-400' },
              { label: 'Next Steps', items: report.next_steps, color: 'text-blue-400' },
            ].map(({ label, items, color }) => (
              <div key={label} className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${color}`}>{label}</p>
                <ul className="space-y-1">
                  {(items || []).map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <Check className={`h-3 w-3 shrink-0 mt-0.5 ${color}`} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}