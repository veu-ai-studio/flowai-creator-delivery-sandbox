import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, Check } from 'lucide-react';
import jsPDF from 'jspdf';

export default function PDFReportGenerator({ results, crawlData, url }) {
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 10;

      // Header
      doc.setFontSize(20);
      doc.text('QA Audit Report', 10, yPos);
      yPos += 10;

      // URL & Date
      doc.setFontSize(10);
      doc.text(`URL: ${url}`, 10, yPos);
      yPos += 6;
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 10, yPos);
      yPos += 12;

      // Overall Score
      doc.setFontSize(14);
      doc.text(`Overall Score: ${results.scores.overall}/10`, 10, yPos);
      yPos += 10;

      // Layer Scores
      doc.setFontSize(11);
      doc.text('Layer Breakdown:', 10, yPos);
      yPos += 6;
      Object.entries(results.scores)
        .filter(([k]) => k !== 'overall')
        .forEach(([layer, score]) => {
          doc.setFontSize(10);
          doc.text(`  ${layer.replace(/_/g, ' ')}: ${score}/10`, 10, yPos);
          yPos += 5;
        });

      yPos += 5;

      // Recommendations
      doc.setFontSize(11);
      doc.text('Recommendations:', 10, yPos);
      yPos += 6;

      results.recommendations.slice(0, 10).forEach((rec) => {
        const lines = doc.splitTextToSize(`${rec.action} (${rec.priority})`, pageWidth - 20);
        lines.forEach((line) => {
          if (yPos > pageHeight - 10) {
            doc.addPage();
            yPos = 10;
          }
          doc.setFontSize(9);
          doc.text(line, 10, yPos);
          yPos += 4;
        });
        yPos += 2;
      });

      // Save
      doc.save(`qa-audit-${new Date().getTime()}.pdf`);

      // Store report in database
      await base44.entities.QAAuditReport.create({
        url,
        scores: results.scores,
        issues: results.issues,
        recommendations: results.recommendations,
        crawl_data: crawlData,
        report_notes: '',
      });

      setGenerated(true);
      setTimeout(() => setGenerated(false), 2000);
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Generate PDF Report</span>
        </div>
        <Button
          size="sm"
          className="gap-2"
          onClick={handleGeneratePDF}
          disabled={loading || !results}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : generated ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? 'Generating...' : generated ? 'Saved!' : 'Download PDF'}
        </Button>
      </div>
    </motion.div>
  );
}