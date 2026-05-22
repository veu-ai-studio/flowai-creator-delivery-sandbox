import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { Variable, Plus, Trash2, Pencil, Check, Copy, Search, Loader2, GitBranch, AlertTriangle, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Global Variable Management page.
 * Loads all SavedFlows and displays aggregated variable usage across flows.
 */
export default function Variables() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(null);

  // Editing state for a flow's variables
  const [editingFlowId, setEditingFlowId] = useState(null);
  const [editDraft, setEditDraft] = useState([]); // [{ key, value }]
  const [saving, setSaving] = useState(false);

  // New variable form (inside a flow)
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  useEffect(() => {
    base44.entities.SavedFlow.list("-updated_date", 200)
      .then((data) => { setFlows(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const flowsWithVars = flows.filter((f) => (f.variables || []).length > 0);
  const totalVars = flows.reduce((sum, f) => sum + (f.variables?.length || 0), 0);

  // Global aggregated vars across all flows (for overview)
  const globalVarMap = {};
  flows.forEach((f) => {
    (f.variables || []).forEach((v) => {
      if (!globalVarMap[v.key]) globalVarMap[v.key] = { key: v.key, flows: [] };
      globalVarMap[v.key].flows.push({ flowId: f.id, flowName: f.name, value: v.value });
    });
  });

  const globalVars = Object.values(globalVarMap);
  const filteredGlobal = globalVars.filter((v) =>
    !search || v.key.toLowerCase().includes(search.toLowerCase())
  );

  const copyVar = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  // Start editing a flow's variables
  const startEdit = (flow) => {
    setEditingFlowId(flow.id);
    setEditDraft(JSON.parse(JSON.stringify(flow.variables || [])));
    setNewKey("");
    setNewVal("");
  };

  const cancelEdit = () => {
    setEditingFlowId(null);
    setEditDraft([]);
  };

  const addDraftVar = () => {
    const key = newKey.trim().replace(/[^a-zA-Z0-9_]/g, "");
    if (!key) return;
    if (editDraft.some((v) => v.key === key)) return;
    setEditDraft((prev) => [...prev, { key, value: newVal }]);
    setNewKey("");
    setNewVal("");
  };

  const removeDraftVar = (key) => {
    setEditDraft((prev) => prev.filter((v) => v.key !== key));
  };

  const updateDraftVar = (key, value) => {
    setEditDraft((prev) => prev.map((v) => v.key === key ? { ...v, value } : v));
  };

  const saveEdit = async () => {
    setSaving(true);
    const flow = flows.find((f) => f.id === editingFlowId);
    if (!flow) { setSaving(false); return; }
    await base44.entities.SavedFlow.update(editingFlowId, { variables: editDraft });
    setFlows((prev) => prev.map((f) => f.id === editingFlowId ? { ...f, variables: editDraft } : f));
    setSaving(false);
    setEditingFlowId(null);
    setEditDraft([]);
  };

  // Filter displayed flows
  const filteredFlows = flows.filter((f) =>
    (f.variables || []).length > 0 &&
    (!search || (f.variables || []).some((v) => v.key.toLowerCase().includes(search.toLowerCase())))
  );

  return (
    <div className="p-8 lg:p-10 max-w-4xl space-y-8">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2">
          <Variable className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Variable Management</h1>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          Manage flow-level variables across all saved flows. Variables are used with <code className="text-primary bg-secondary px-1 rounded">{"{{key}}"}</code> syntax in prompts.
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        className="grid grid-cols-3 gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {[
          { label: "Total Flows", value: flows.length, icon: GitBranch },
          { label: "Flows with Variables", value: flowsWithVars.length, icon: Tag },
          { label: "Total Variables", value: totalVars, icon: Variable },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <p className="text-xl font-semibold text-foreground">{value}</p>}
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* Global variable overview */}
      {globalVars.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">All Variables</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search variables…"
                className="h-8 pl-8 text-xs w-48 bg-card"
              />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-12 px-4 py-2 bg-secondary/30 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b border-border">
              <span className="col-span-4">Variable</span>
              <span className="col-span-5">Used in flows</span>
              <span className="col-span-3 text-right">Copy</span>
            </div>
            <div className="divide-y divide-border">
              {filteredGlobal.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No variables match your search.</p>
              ) : filteredGlobal.map((v) => (
                <div key={v.key} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-accent/20 transition-colors">
                  <div className="col-span-4">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{`{{${v.key}}}`}</code>
                  </div>
                  <div className="col-span-5 flex flex-wrap gap-1">
                    {v.flows.map((f) => (
                      <span key={f.flowId} className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded truncate max-w-[120px]" title={f.flowName}>
                        {f.flowName}
                      </span>
                    ))}
                  </div>
                  <div className="col-span-3 flex justify-end">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyVar(v.key)}>
                      {copied === v.key ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Per-flow variable editors */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-sm font-semibold text-foreground mb-3">Edit by Flow</h2>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : flows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 min-h-[200px] flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No saved flows yet. Create flows to manage variables.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {flows
                .filter((f) => !search || (f.variables || []).some((v) => v.key.toLowerCase().includes(search.toLowerCase())))
                .map((flow) => {
                  const isEditing = editingFlowId === flow.id;
                  const vars = isEditing ? editDraft : (flow.variables || []);

                  return (
                    <motion.div
                      key={flow.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-border bg-card overflow-hidden"
                    >
                      {/* Flow header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <div className="flex items-center gap-2">
                          <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{flow.name}</span>
                          <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full">
                            {vars.length} var{vars.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <Button size="sm" className="h-7 text-xs gap-1" onClick={saveEdit} disabled={saving}>
                                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                Save
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelEdit}>
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => startEdit(flow)}>
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Variables list */}
                      <div className="p-3 space-y-2">
                        {vars.length === 0 && !isEditing && (
                          <p className="text-xs text-muted-foreground/50 text-center py-3">
                            No variables. Click Edit to add some.
                          </p>
                        )}
                        {vars.map((v) => (
                          <div key={v.key} className="flex items-center gap-2 group">
                            <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded w-32 shrink-0 truncate">
                              {`{{${v.key}}}`}
                            </code>
                            {isEditing ? (
                              <>
                                <Input
                                  value={v.value}
                                  onChange={(e) => updateDraftVar(v.key, e.target.value)}
                                  placeholder="default value"
                                  className="h-7 text-xs flex-1 bg-background"
                                />
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeDraftVar(v.key)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs text-muted-foreground flex-1 truncate">
                                  {v.value ? <span className="text-foreground/80">{v.value}</span> : <span className="italic opacity-40">no default</span>}
                                </span>
                                {!v.value && (
                                  <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5">
                                    <AlertTriangle className="h-2.5 w-2.5" /> no default
                                  </span>
                                )}
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => copyVar(v.key)}>
                                  {copied === v.key ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                </Button>
                              </>
                            )}
                          </div>
                        ))}

                        {/* Add new var form */}
                        {isEditing && (
                          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                            <Input
                              value={newKey}
                              onChange={(e) => setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                              placeholder="key"
                              className="h-7 text-xs bg-background w-28 font-mono"
                              onKeyDown={(e) => e.key === "Enter" && addDraftVar()}
                            />
                            <Input
                              value={newVal}
                              onChange={(e) => setNewVal(e.target.value)}
                              placeholder="default value"
                              className="h-7 text-xs bg-background flex-1"
                              onKeyDown={(e) => e.key === "Enter" && addDraftVar()}
                            />
                            <Button size="icon" variant="secondary" className="h-7 w-7 shrink-0" onClick={addDraftVar}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}