import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { GitBranch, Save, RotateCcw, Tag, Clock, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function VersionControlPanel() {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [label, setLabel] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [restoring, setRestoring] = useState(null);

  const fetchVersions = async () => {
    setLoading(true);
    const data = await base44.entities.FlowVersion.list('-created_date', 30).catch(() => []);
    setVersions(data);
    setLoading(false);
  };

  useEffect(() => { fetchVersions(); }, []);

  const saveVersion = async () => {
    if (saving) return;
    setSaving(true);
    const maxVersion = versions.reduce((max, v) => Math.max(max, v.version_number || 0), 0);
    await base44.entities.FlowVersion.create({
      flow_id: 'manual',
      flow_name: label || `Snapshot v${maxVersion + 1}`,
      version_number: maxVersion + 1,
      nodes: [],
      edges: [],
      variables: [],
      label: label || `Manual snapshot — ${new Date().toLocaleString()}`,
    });
    setLabel('');
    await fetchVersions();
    setSaving(false);
  };

  const restoreVersion = async (version) => {
    setRestoring(version.id);
    await new Promise(r => setTimeout(r, 800)); // simulate restore
    setRestoring(null);
    alert(`Restored to: ${version.flow_name} (v${version.version_number})`);
  };

  return (
    <div className="space-y-4">
      {/* Save new version */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3 flex-wrap">
        <GitBranch className="h-4 w-4 text-primary shrink-0" />
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Version label (optional)..."
          className="flex-1 bg-secondary/40 rounded-md border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
        />
        <Button size="sm" className="gap-1.5" onClick={saveVersion} disabled={saving}>
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? 'Saving...' : 'Save Snapshot'}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Versions', value: versions.length, color: 'text-primary' },
          { label: 'Flows Tracked', value: [...new Set(versions.map(v => v.flow_id))].length, color: 'text-purple-400' },
          { label: 'Latest Version', value: versions[0] ? `v${versions[0].version_number}` : '—', color: 'text-emerald-400' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-border bg-card p-3 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Version list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Version History
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <GitBranch className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No versions saved yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Save a snapshot to start version tracking.</p>
          </div>
        ) : (
          versions.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-lg border border-border bg-card overflow-hidden"
            >
              <div
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setExpanded(expanded === v.id ? null : v.id)}
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{v.flow_name}</p>
                  <p className="text-xs text-muted-foreground">v{v.version_number} · {v.created_date ? formatDistanceToNow(new Date(v.created_date), { addSuffix: true }) : 'just now'}</p>
                </div>
                {v.label && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary/60 text-muted-foreground hidden sm:block truncate max-w-[120px]">{v.label}</span>
                )}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 h-7 text-xs"
                    onClick={e => { e.stopPropagation(); restoreVersion(v); }}
                    disabled={restoring === v.id}
                  >
                    {restoring === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
                    Restore
                  </Button>
                  {expanded === v.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </div>

              <AnimatePresence>
                {expanded === v.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-3 grid grid-cols-3 gap-3 text-xs">
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{v.nodes?.length || 0}</p>
                        <p className="text-muted-foreground">Nodes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{v.edges?.length || 0}</p>
                        <p className="text-muted-foreground">Edges</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-foreground">{v.variables?.length || 0}</p>
                        <p className="text-muted-foreground">Variables</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}