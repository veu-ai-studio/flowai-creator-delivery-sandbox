import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { History, RotateCcw, X, Loader2, Tag, Pencil, Check, GitBranch, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import CanvasPreview from "./CanvasPreview";

export default function VersionHistoryPanel({ flowId, currentNodes, currentEdges, onRestore, onClose }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(null);
  const [editingLabel, setEditingLabel] = useState(null);
  const [labelDraft, setLabelDraft] = useState("");
  const [savingLabel, setSavingLabel] = useState(null);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    if (!flowId) { setLoading(false); return; }
    base44.entities.FlowVersion.filter({ flow_id: flowId }, "-version_number", 50)
      .then((data) => { setVersions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [flowId]);

  const handleRestore = async (version) => {
    setRestoring(version.id);
    onRestore({ name: version.flow_name, nodes: version.nodes || [], edges: version.edges || [], variables: version.variables || [] });
    setRestoring(null);
    onClose();
  };

  const handleSaveLabel = async (versionId) => {
    setSavingLabel(versionId);
    await base44.entities.FlowVersion.update(versionId, { label: labelDraft.trim() || null });
    setVersions((prev) => prev.map((v) => v.id === versionId ? { ...v, label: labelDraft.trim() || null } : v));
    setEditingLabel(null);
    setSavingLabel(null);
  };

  // Diff summary between two snapshots
  const getDiff = (version, prevVersion) => {
    if (!prevVersion) return null;
    const nodesBefore = prevVersion.nodes?.length || 0;
    const nodesAfter = version.nodes?.length || 0;
    const edgesBefore = prevVersion.edges?.length || 0;
    const edgesAfter = version.edges?.length || 0;
    const parts = [];
    const dn = nodesAfter - nodesBefore;
    const de = edgesAfter - edgesBefore;
    if (dn !== 0) parts.push(`${dn > 0 ? "+" : ""}${dn} block${Math.abs(dn) !== 1 ? "s" : ""}`);
    if (de !== 0) parts.push(`${de > 0 ? "+" : ""}${de} edge${Math.abs(de) !== 1 ? "s" : ""}`);
    return parts.length > 0 ? parts.join(", ") : "No structural changes";
  };

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Version History</h2>
          {versions.length > 0 && (
            <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
              {versions.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {!flowId && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <GitBranch className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Save the flow first to enable version history.</p>
          </div>
        </div>
      )}

      {flowId && loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {flowId && !loading && versions.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No versions yet. Save the flow to create the first version.</p>
          </div>
        </div>
      )}

      {flowId && !loading && versions.length > 0 && (
        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {versions.map((v, i) => {
            const diff = getDiff(v, versions[i + 1]);
            const isEditing = editingLabel === v.id;
            return (
              <div key={v.id} className="p-3 hover:bg-secondary/30 transition-colors group space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Version badge + label */}
                    <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                      <span className="text-xs font-bold text-foreground font-mono">
                        v{v.version_number}
                      </span>
                      {i === 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25 font-medium">
                          Latest
                        </span>
                      )}
                      {v.label && !isEditing && (
                        <span className="flex items-center gap-0.5 text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">
                          <Tag className="h-2.5 w-2.5" />
                          {v.label}
                        </span>
                      )}
                    </div>

                    {/* Inline label editor */}
                    {isEditing ? (
                      <div className="flex items-center gap-1 mb-1.5">
                        <Input
                          autoFocus
                          className="h-6 text-xs flex-1 bg-secondary/50 border-border px-2"
                          value={labelDraft}
                          onChange={(e) => setLabelDraft(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleSaveLabel(v.id); if (e.key === "Escape") setEditingLabel(null); }}
                          placeholder="e.g. stable, before-refactor"
                        />
                        <Button
                          size="icon"
                          variant="secondary"
                          className="h-6 w-6 shrink-0"
                          onClick={() => handleSaveLabel(v.id)}
                          disabled={savingLabel === v.id}
                        >
                          {savingLabel === v.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Check className="h-2.5 w-2.5" />}
                        </Button>
                      </div>
                    ) : null}

                    {/* Stats */}
                    <p className="text-xs text-muted-foreground">
                      {v.nodes?.length || 0} blocks · {v.edges?.length || 0} edges
                      {v.variables?.length > 0 && ` · ${v.variables.length} vars`}
                    </p>

                    {/* Diff from previous */}
                    {diff && (
                      <p className="text-xs text-muted-foreground/50 mt-0.5 italic">{diff}</p>
                    )}

                    {/* Timestamp */}
                    <p className="text-xs text-muted-foreground/50 mt-0.5">
                      {v.created_date
                        ? formatDistanceToNow(new Date(v.created_date), { addSuffix: true })
                        : "Unknown time"}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2" onClick={() => handleRestore(v)} disabled={restoring === v.id}>
                      {restoring === v.id ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <RotateCcw className="h-2.5 w-2.5" />}
                      Restore
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 text-muted-foreground" onClick={() => setPreviewId(previewId === v.id ? null : v.id)}>
                      <Eye className="h-2.5 w-2.5" />
                      Preview
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 px-2 text-muted-foreground" onClick={() => { setEditingLabel(v.id); setLabelDraft(v.label || ""); }}>
                      <Pencil className="h-2.5 w-2.5" />
                      Label
                    </Button>
                  </div>
                </div>

                {/* Canvas preview */}
                {previewId === v.id && (
                  <div className="rounded-lg border border-border overflow-hidden bg-secondary/20">
                    <CanvasPreview nodes={v.nodes || []} edges={v.edges || []} width={232} height={110} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}