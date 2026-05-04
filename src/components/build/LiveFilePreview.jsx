import { motion } from 'framer-motion';
import { FileText, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function LiveFilePreview({ files, summary, fileCount, framework }) {
  const [expandedFile, setExpandedFile] = useState(null);
  const [copiedFile, setCopiedFile] = useState(null);

  const copyToClipboard = (content, fileName) => {
    navigator.clipboard.writeText(content);
    setCopiedFile(fileName);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Generated Files
          </h3>
          <p className="text-xs text-muted-foreground mt-1">Framework: {framework || 'HTML'} — {fileCount || 0} files</p>
          {summary && <p className="text-xs text-muted-foreground mt-1">{summary}</p>}
        </div>
      </div>

      {files && files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, idx) => (
            <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}
              className="border border-border/50 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFile(expandedFile === idx ? null : idx)}
                className="w-full flex items-center justify-between p-3 bg-secondary/30 hover:bg-secondary/50 transition text-left"
              >
                <span className="text-xs font-mono text-foreground">{file.path}</span>
                <span className="text-xs text-muted-foreground">{(file.content?.length || 0) / 1000}KB</span>
              </button>

              {expandedFile === idx && (
                <div className="bg-background p-3 space-y-2">
                  <div className="relative">
                    <pre className="text-[10px] font-mono text-muted-foreground overflow-x-auto max-h-48 bg-secondary/20 p-3 rounded whitespace-pre-wrap break-words">
                      {file.content?.slice(0, 500)}...
                    </pre>
                    <button
                      onClick={() => copyToClipboard(file.content, file.path)}
                      className="absolute top-2 right-2 p-2 bg-primary hover:bg-primary/90 rounded text-primary-foreground transition"
                    >
                      {copiedFile === file.path ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}