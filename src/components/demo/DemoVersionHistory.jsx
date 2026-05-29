import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { History, RotateCcw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Uses DemoEnvironment list sorted by updated_at to show version snapshots.
// Each "version" is a saved record state (we store a version log in synthetic_data._versions).
export default function DemoVersionHistory({ demo, productName, onRestored }) {
  const versions = demo?.synthetic_data?._versions || [];
  const [expanded, setExpanded] = useState(null);
  const [restoring, setRestoring] = useState(null);

  const snapshotCurrent = async () => {
    if (!demo?.id) return;
    const snapshot = {
      saved_at: new Date().toISOString(),
      label: `Snapshot ${versions.length + 1}`,
      tour_script: demo.tour_script,
      microsite_content: demo.microsite_content,
      synthetic_data_preview: JSON.stringify(demo.synthetic_data || {}).slice(0, 300),
    };
    const updatedSynthetic = {
      ...(demo.synthetic_data || {}),
      _versions: [...versions, snapshot].slice(-10), // keep last 10
    };
    await base44.entities.DemoEnvironment.update(demo.id, {
      synthetic_data: updatedSynthetic,
      updated_at: new Date().toISOString(),
    });
    onRestored?.({ ...demo, synthetic_data: updatedSynthetic });
  };

  const restore = async (version) => {
    if (!demo?.id) return;
    setRestoring(version.saved_at);
    await base44.entities.DemoEnvironment.update(demo.id, {
      tour_script: version.tour_script || demo.tour_script,
      microsite_content: version.microsite_content || demo.microsite_content,
      updated_at: new Date().toISOString(),
    });
    setRestoring(null);
    onRestored?.({ ...demo, tour_script: version.tour_script, microsite_content: version.microsite_content });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-primary" /> Version History
          <span className="text-[10px] text-muted-foreground font-normal">({versions.length} snapshot{versions.length !== 1 ? 's' : ''})</span>
        </p>
        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={snapshotCurrent}>
          <History className="h-3 w-3" /> Save Snapshot
        </Button>
      </div>

      {versions.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-3">
          No snapshots yet — click "Save Snapshot" to create a restore point.
        </p>
      ) : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {[...versions].reverse().map((v, i) => (
            <div key={v.saved_at} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold text-foreground">{v.label}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {formatDistanceToNow(new Date(v.saved_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setExpanded(expanded === v.saved_at ? null : v.saved_at)}
                    className="text-muted-foreground hover:text-foreground transition-colors">
                    {expanded === v.saved_at ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>
                  <Button size="sm" variant="outline" className="h-6 px-2 text-[10px] gap-1"
                    onClick={() => restore(v)} disabled={restoring === v.saved_at}>
                    {restoring === v.saved_at ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCcw className="h-2.5 w-2.5" />}
                    Restore
                  </Button>
                </div>
              </div>
              {expanded === v.saved_at && v.synthetic_data_preview && (
                <pre className="text-[9px] font-mono text-muted-foreground bg-secondary/30 rounded p-2 max-h-24 overflow-y-auto whitespace-pre-wrap">
                  {v.synthetic_data_preview}…
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}