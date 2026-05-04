import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileJson, FileText, CheckCircle2, AlertTriangle, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function BulkUploadTool({ onImported }) {
  const [dragging, setDragging] = useState(false);
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef();

  const processFiles = async (fileList) => {
    const accepted = Array.from(fileList).filter(f =>
      f.type === 'application/json' || f.name.endsWith('.json') || f.name.endsWith('.csv')
    );
    if (!accepted.length) return;

    const entries = accepted.map(f => ({ file: f, status: 'pending', result: null }));
    setFiles(entries);
    setProcessing(true);

    const updated = [...entries];
    for (let i = 0; i < accepted.length; i++) {
      const text = await accepted[i].text();
      let parsed = null;
      try {
        if (accepted[i].name.endsWith('.csv')) {
          const lines = text.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          parsed = lines.slice(1).map(line => {
            const vals = line.split(',');
            return Object.fromEntries(headers.map((h, j) => [h, vals[j]?.trim()]));
          });
        } else {
          parsed = JSON.parse(text);
          if (!Array.isArray(parsed)) parsed = [parsed];
        }
        updated[i] = { ...updated[i], status: 'success', result: parsed, count: parsed.length };
      } catch (e) {
        updated[i] = { ...updated[i], status: 'error', result: null, error: e.message };
      }
      setFiles([...updated]);
    }

    setProcessing(false);
    const allParsed = updated.filter(u => u.status === 'success').flatMap(u => u.result);
    if (allParsed.length > 0 && onImported) onImported(allParsed);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const remove = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Upload className="h-4 w-4 text-primary" /> Bulk Upload Tool
      </h3>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-secondary/20'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept=".json,.csv" className="hidden"
          onChange={e => processFiles(e.target.files)} />
        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Drop JSON or CSV files here, or click to browse</p>
        <p className="text-[10px] text-muted-foreground mt-1">Supports bulk audit data, URL lists, and report imports</p>
      </div>

      <AnimatePresence>
        {files.map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-lg border p-3 flex items-center gap-3 ${
              f.status === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
              f.status === 'error' ? 'border-red-500/30 bg-red-500/5' : 'border-border bg-secondary/20'
            }`}>
            {f.name?.endsWith('.csv') ? <FileText className="h-4 w-4 text-muted-foreground shrink-0" /> : <FileJson className="h-4 w-4 text-blue-400 shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{f.file.name}</p>
              {f.status === 'success' && <p className="text-[10px] text-emerald-400">{f.count} records imported</p>}
              {f.status === 'error' && <p className="text-[10px] text-red-400">{f.error}</p>}
              {f.status === 'pending' && <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing...</p>}
            </div>
            {f.status === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />}
            {f.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />}
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}