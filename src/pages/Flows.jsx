import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FolderOpen, Plus, Trash2, Play, Clock, Loader2, LayoutGrid,
  Kanban, BarChart2, GitBranch, CheckSquare, Square, Zap, BookOpen, Download
} from "lucide-react";
import CanvasPreview from "@/components/designer/CanvasPreview";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { BLOCK_TYPES } from "@/lib/flowStore";
import { formatDistanceToNow } from "date-fns";
import FlowKanban from "@/components/flows/FlowKanban";
import FlowPerformanceChart from "@/components/flows/FlowPerformanceChart";
import FlowVersionHistory from "@/components/flows/FlowVersionHistory";
import FlowExecutionLogs from "@/components/flows/FlowExecutionLogs";
import FlowScheduler from "@/components/flows/FlowScheduler";
import FlowPerformanceExport from "@/components/flows/FlowPerformanceExport";
import FlowBatchExport from "@/components/flows/FlowBatchExport";
import FlowClone from "@/components/flows/FlowClone";
import TemplateLibraryModal from "@/components/designer/TemplateLibraryModal";

const VIEWS = [
  { key: 'list',    label: 'List',       icon: LayoutGrid },
  { key: 'kanban',  label: 'Kanban',     icon: Kanban },
];

export default function Flows() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [view, setView] = useState('list');
  const [selected, setSelected] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [expandedFlow, setExpandedFlow] = useState(null);
  const [expandedTab, setExpandedTab] = useState('perf');
  const [flowRuns, setFlowRuns] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const navigate = useNavigate();

  const fetchFlows = async () => {
    setLoading(true);
    const data = await base44.entities.SavedFlow.list("-updated_date");
    setFlows(data);
    setLoading(false);
  };

  useEffect(() => { fetchFlows(); }, []);

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    setDeletingId(id);
    await base44.entities.SavedFlow.delete(id);
    setFlows(prev => prev.filter(f => f.id !== id));
    setDeletingId(null);
  };

  const handleOpen = (flow) => navigate("/flow-designer", { state: { loadFlow: flow } });

  const handleRun = (flow, e) => {
    e?.stopPropagation();
    navigate("/run-flow", { state: { nodes: flow.nodes, edges: flow.edges, variables: flow.variables || [], flowName: flow.name, flowId: flow.id } });
  };

  const toggleSelect = (id, e) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(selected.size === flows.length ? new Set() : new Set(flows.map(f => f.id)));

  const bulkDelete = async () => {
    setBulkDeleting(true);
    await Promise.all([...selected].map(id => base44.entities.SavedFlow.delete(id)));
    setFlows(prev => prev.filter(f => !selected.has(f.id)));
    setSelected(new Set());
    setBulkDeleting(false);
  };

  const bulkRun = () => {
    const toRun = flows.filter(f => selected.has(f.id));
    if (toRun[0]) handleRun(toRun[0]);
  };

  const toggleExpand = async (flowId, e) => {
    e.stopPropagation();
    setExpandedFlow(prev => prev === flowId ? null : flowId);
    // Pre-fetch runs for export/perf tabs
    if (!flowRuns[flowId]) {
      base44.entities.FlowRun.filter({ flow_id: flowId }, '-created_date', 30)
        .then(data => setFlowRuns(prev => ({ ...prev, [flowId]: data })))
        .catch(() => {});
    }
  };

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Saved Flows</h1>
          <p className="mt-1 text-muted-foreground text-sm">Browse, manage and analyze your automation flows.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowTemplates(true)}>
            <BookOpen className="h-4 w-4" /> Templates
          </Button>
          <Button className="gap-2" onClick={() => navigate("/flow-designer")}>
            <Plus className="h-4 w-4" /> New Flow
          </Button>
        </div>
      </motion.div>

      {/* View toggle + bulk actions */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${view === v.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <v.icon className="h-3.5 w-3.5" /> {v.label}
            </button>
          ))}
        </div>

        {flows.length > 0 && view === 'list' && (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button onClick={selectAll}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                {selected.size === flows.length ? <CheckSquare className="h-3.5 w-3.5 text-primary" /> : <Square className="h-3.5 w-3.5" />}
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </button>
              {selected.size > 0 && (
                <AnimatePresence>
                  <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} className="flex gap-1.5">
                    <Button size="sm" variant="outline" onClick={bulkRun} className="h-7 gap-1 text-xs">
                      <Play className="h-3 w-3" /> Run First
                    </Button>
                    <Button size="sm" variant="destructive" onClick={bulkDelete} disabled={bulkDeleting} className="h-7 gap-1 text-xs">
                      {bulkDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      Delete ({selected.size})
                    </Button>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
            <FlowBatchExport flows={flows.filter(f => selected.size === 0 || selected.has(f.id))} />
          </div>
        )}
      </div>

      {/* Content */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : flows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 min-h-[320px] flex flex-col items-center justify-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-secondary/80 border border-border flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">No flows yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Create your first flow to get started</p>
            </div>
            <Button variant="secondary" size="sm" className="gap-2 mt-2" onClick={() => navigate("/flow-designer")}>
              <Plus className="h-3.5 w-3.5" /> Open Flow Designer
            </Button>
          </div>
        ) : view === 'kanban' ? (
          <FlowKanban flows={flows} onRun={handleRun} />
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {flows.map(flow => {
                const nodeCount = flow.nodes?.length || 0;
                const blockSummary = Object.entries(
                  (flow.nodes || []).reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {})
                );
                const isSelected = selected.has(flow.id);
                const isExpanded = expandedFlow === flow.id;

                return (
                  <motion.div key={flow.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                    className={`rounded-xl border transition-all ${isSelected ? 'border-primary/60 bg-primary/5' : 'border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5'}`}>
                    <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => handleOpen(flow)}>
                      {/* Checkbox */}
                      <button onClick={e => toggleSelect(flow.id, e)} className="mt-0.5 shrink-0">
                        {isSelected
                          ? <CheckSquare className="h-4 w-4 text-primary" />
                          : <Square className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />}
                      </button>

                      {/* Preview */}
                      <div className="shrink-0 rounded-lg border border-border bg-secondary/30 overflow-hidden hidden sm:block">
                        <CanvasPreview nodes={flow.nodes || []} edges={flow.edges || []} width={100} height={64} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{flow.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground">{nodeCount} block{nodeCount !== 1 ? "s" : ""}</span>
                          {flow.updated_date && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(flow.updated_date), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        {blockSummary.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {blockSummary.map(([type, count]) => {
                              const meta = BLOCK_TYPES[type];
                              if (!meta) return null;
                              return (
                                <span key={type} className={`text-xs px-2 py-0.5 rounded-full border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}>
                                  {count}× {meta.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8"
                          onClick={e => handleRun(flow, e)}>
                          <Play className="h-3 w-3" /> Run
                        </Button>
                        <FlowClone flow={flow} onCloneSuccess={cloned => { setFlows(prev => [cloned, ...prev]); }} />
                        <button onClick={e => toggleExpand(flow.id, e)}
                          className="h-8 px-2 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all flex items-center gap-1">
                          <BarChart2 className="h-3 w-3" />
                        </button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={e => handleDelete(flow.id, e)} disabled={deletingId === flow.id}>
                          {deletingId === flow.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border">
                          <div className="p-5 space-y-4">
                            {/* Sub-tabs */}
                            <div className="flex gap-1">
                              {[
                                { key: 'perf',     label: 'Performance', icon: BarChart2 },
                                { key: 'logs',     label: 'Exec Logs',   icon: Zap },
                                { key: 'versions', label: 'Versions',    icon: GitBranch },
                                { key: 'schedule', label: 'Schedule',    icon: Clock },
                                { key: 'export',   label: 'Export',      icon: Download },
                              ].map(t => (
                                <button key={t.key} onClick={() => setExpandedTab(t.key)}
                                  className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-md border transition-all ${expandedTab === t.key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>
                                  <t.icon className="h-3 w-3" /> {t.label}
                                </button>
                              ))}
                            </div>

                            {expandedTab === 'perf'     && <FlowPerformanceChart flowId={flow.id} flowName={flow.name} />}
                            {expandedTab === 'logs'     && <FlowExecutionLogs flowId={flow.id} />}
                            {expandedTab === 'versions' && <FlowVersionHistory flowId={flow.id} onRestore={v => handleOpen({ ...flow, nodes: v.nodes, edges: v.edges })} />}
                            {expandedTab === 'schedule' && <FlowScheduler flowId={flow.id} flowName={flow.name} />}
                            {expandedTab === 'export'   && <FlowPerformanceExport flowId={flow.id} flowName={flow.name} runs={flowRuns[flow.id] || []} />}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Template Library Modal */}
      {showTemplates && <TemplateLibraryModal onClose={() => setShowTemplates(false)} onSelect={template => { navigate('/flow-designer', { state: { template } }); setShowTemplates(false); }} />}
    </div>
  );
}