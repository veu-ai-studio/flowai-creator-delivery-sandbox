import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ThumbsUp, ThumbsDown, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

const STORAGE_KEY = 'flowai_team_feedback';

const TAGS = ['Bug', 'Feature', 'UX', 'Performance', 'Docs', 'Other'];

function timeAgo(ts) {
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function TeamFeedbackModule({ context = 'general' }) {
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Feature');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(`${STORAGE_KEY}_${context}`);
    if (stored) setItems(JSON.parse(stored));
  }, [context]);

  const save = (updated) => {
    setItems(updated);
    localStorage.setItem(`${STORAGE_KEY}_${context}`, JSON.stringify(updated));
  };

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 400));
    const newItem = { id: Date.now(), text: text.trim(), tag, ts: new Date().toISOString(), votes: 0 };
    save([newItem, ...items]);
    setText('');
    setSubmitting(false);
  };

  const vote = (id, delta) => {
    save(items.map(i => i.id === id ? { ...i, votes: (i.votes || 0) + delta } : i));
  };

  const remove = (id) => save(items.filter(i => i.id !== id));

  const tagColors = {
    Bug: 'text-red-400 bg-red-500/10 border-red-500/20',
    Feature: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    UX: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    Performance: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    Docs: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    Other: 'text-muted-foreground bg-secondary border-border',
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" /> Team Feedback
        {items.length > 0 && <span className="text-[10px] text-muted-foreground">({items.length})</span>}
      </h3>

      {/* Submit */}
      <div className="space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {TAGS.map(t => (
            <button key={t} onClick={() => setTag(t)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${tag === t ? tagColors[t] : 'border-border text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>
        <Textarea value={text} onChange={e => setText(e.target.value)}
          placeholder="Share feedback, ideas, or report an issue..."
          className="min-h-16 text-xs resize-none" />
        <Button size="sm" onClick={submit} disabled={submitting || !text.trim()} className="h-7 gap-1.5 text-xs">
          {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Submit
        </Button>
      </div>

      {/* Feedback list */}
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        <AnimatePresence>
          {items.map(item => (
            <motion.div key={item.id} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tagColors[item.tag] || tagColors.Other}`}>{item.tag}</span>
                <span className="text-[9px] text-muted-foreground">{timeAgo(item.ts)}</span>
              </div>
              <p className="text-xs text-foreground">{item.text}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => vote(item.id, 1)} className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-emerald-400 transition-colors">
                  <ThumbsUp className="h-3 w-3" /> {item.votes > 0 ? item.votes : ''}
                </button>
                <button onClick={() => vote(item.id, -1)} className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-red-400 transition-colors">
                  <ThumbsDown className="h-3 w-3" />
                </button>
                <button onClick={() => remove(item.id)} className="ml-auto text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No feedback yet — be the first!</p>}
      </div>
    </div>
  );
}