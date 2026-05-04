import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link2, Plus, Trash2, Save, CheckCircle2, Loader2 } from 'lucide-react';

// Stores data source links in synthetic_data._data_sources
export default function DemoDataSources({ demo, onSaved }) {
  const existingSources = demo?.synthetic_data?._data_sources || [];
  const [sources, setSources] = useState(existingSources);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const add = () => {
    if (!newLabel.trim() && !newUrl.trim()) return;
    setSources(prev => [...prev, { label: newLabel.trim(), url: newUrl.trim() }]);
    setNewLabel('');
    setNewUrl('');
  };

  const remove = (i) => setSources(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    const updatedSynthetic = { ...(demo.synthetic_data || {}), _data_sources: sources };
    await base44.entities.DemoEnvironment.update(demo.id, {
      synthetic_data: updatedSynthetic,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.(updatedSynthetic);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-primary" /> Linked Data Sources
        </p>
        <Button size="sm" className="h-7 gap-1 text-xs" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Save className="h-3 w-3" />}
          {saved ? 'Saved!' : 'Save'}
        </Button>
      </div>

      {/* Existing sources */}
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {sources.map((src, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/20 px-3 py-1.5">
            <Link2 className="h-3 w-3 text-primary shrink-0" />
            <span className="text-[10px] font-semibold text-foreground flex-none w-28 truncate">{src.label || '—'}</span>
            {src.url ? (
              <a href={src.url} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline flex-1 truncate">{src.url}</a>
            ) : (
              <span className="text-[10px] text-muted-foreground flex-1">No URL</span>
            )}
            <button onClick={() => remove(i)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-2">No data sources linked yet</p>
        )}
      </div>

      {/* Add new */}
      <div className="flex gap-2 items-center">
        <Input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="Label" className="h-7 text-xs w-28" />
        <Input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="URL (optional)" className="h-7 text-xs flex-1" />
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs shrink-0" onClick={add}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground">Link real data sources, reports, or benchmarks used to inform the synthetic data.</p>
    </div>
  );
}