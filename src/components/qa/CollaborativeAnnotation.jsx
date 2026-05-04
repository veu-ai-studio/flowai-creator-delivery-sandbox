import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquarePlus, Pin, CheckCheck, Trash2 } from 'lucide-react';

const STORAGE_KEY = 'qa_annotations';

export default function CollaborativeAnnotation({ results, url }) {
  const [annotations, setAnnotations] = useState([]);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('note');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setAnnotations(JSON.parse(saved));
  }, []);

  const save = (updated) => {
    setAnnotations(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleAdd = () => {
    if (!text.trim()) return;
    save([
      { id: Date.now(), text, category, url, pinned: false, resolved: false, created: new Date().toISOString() },
      ...annotations,
    ]);
    setText('');
  };

  const toggle = (id, field) =>
    save(annotations.map((a) => (a.id === id ? { ...a, [field]: !a[field] } : a)));

  const remove = (id) => save(annotations.filter((a) => a.id !== id));

  const categoryColors = {
    note: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    issue: 'text-red-400 bg-red-500/10 border-red-500/30',
    idea: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <MessageSquarePlus className="h-5 w-5 text-primary" />
        Collaborative Annotations
      </h2>

      {/* Add form */}
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-foreground"
        >
          <option value="note">Note</option>
          <option value="issue">Issue</option>
          <option value="idea">Idea</option>
        </select>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Add annotation..."
          className="h-9 text-sm flex-1"
        />
        <Button size="sm" onClick={handleAdd} disabled={!text.trim()}>Add</Button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-72 overflow-y-auto">
        <AnimatePresence>
          {annotations.filter((a) => a.url === url).map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              className={`rounded-lg border p-3 flex items-start justify-between gap-2 ${categoryColors[a.category] || ''} ${a.resolved ? 'opacity-50' : ''}`}
            >
              <div className="space-y-0.5 flex-1">
                <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">{a.category}</span>
                <p className={`text-sm ${a.resolved ? 'line-through' : ''}`}>{a.text}</p>
                <p className="text-[10px] opacity-60">{new Date(a.created).toLocaleString()}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => toggle(a.id, 'pinned')} className="p-1 hover:opacity-70">
                  <Pin className={`h-3.5 w-3.5 ${a.pinned ? 'text-amber-400' : 'opacity-40'}`} />
                </button>
                <button onClick={() => toggle(a.id, 'resolved')} className="p-1 hover:opacity-70">
                  <CheckCheck className={`h-3.5 w-3.5 ${a.resolved ? 'text-emerald-400' : 'opacity-40'}`} />
                </button>
                <button onClick={() => remove(a.id)} className="p-1 hover:opacity-70">
                  <Trash2 className="h-3.5 w-3.5 opacity-40 hover:text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {annotations.filter((a) => a.url === url).length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No annotations yet.</p>
        )}
      </div>
    </motion.div>
  );
}