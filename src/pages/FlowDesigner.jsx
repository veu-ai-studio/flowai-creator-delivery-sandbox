import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Play, Save, CheckCircle2, Loader2, History, LayoutTemplate, MessageSquare } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { FlowProvider, useFlow } from "@/lib/flowStore";
import { validateFlow } from "@/lib/flowValidator";
import BlockLibrary from "../components/designer/BlockLibrary";
import Canvas from "../components/designer/Canvas";
import BlockSettings from "../components/designer/BlockSettings";
import ValidationBar from "../components/designer/ValidationBar";
import VariableManager from "../components/designer/VariableManager";
import VersionHistoryPanel from "../components/designer/VersionHistoryPanel";
import WebhookPanel from "../components/designer/WebhookPanel";
import ScheduledTriggerPanel from "../components/designer/ScheduledTriggerPanel";
import TemplateLibraryModal from "../components/designer/TemplateLibraryModal";
import CollaborationPanel from "../components/designer/CollaborationPanel";

function DesignerInner() {
  const { flowName, setFlowName, nodes, edges, variables, loadFlow } = useFlow();
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCollaboration, setShowCollaboration] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Load flow if passed via router state
  useEffect(() => {
    const state = location.state;
    if (state?.loadFlow) {
      loadFlow({
        name: state.loadFlow.name,
        nodes: state.loadFlow.nodes,
        edges: state.loadFlow.edges,
        variables: state.loadFlow.variables || [],
      });
      setSavedId(state.loadFlow.id || null);
    }
  }, []);

  const validationResult = useMemo(() => {
    if (nodes.length === 0) return null;
    return validateFlow(nodes, edges);
  }, [nodes, edges]);

  const getNextVersionNumber = async (flowId) => {
    const existing = await base44.entities.FlowVersion.filter({ flow_id: flowId }, "-version_number", 1);
    return (existing[0]?.version_number || 0) + 1;
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = { name: flowName, nodes, edges, variables };
    let flowId = savedId;

    if (flowId) {
      await base44.entities.SavedFlow.update(flowId, payload);
    } else {
      const saved = await base44.entities.SavedFlow.create(payload);
      flowId = saved.id;
      setSavedId(flowId);
    }

    // Save a version snapshot
    const versionNumber = await getNextVersionNumber(flowId);
    await base44.entities.FlowVersion.create({
      flow_id: flowId,
      flow_name: flowName,
      version_number: versionNumber,
      nodes,
      edges,
      variables,
    });

    setSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleRestoreVersion = ({ name, nodes: n, edges: e, variables: vars }) => {
    loadFlow({ name, nodes: n, edges: e, variables: vars });
  };

  return (
    <motion.div
      className="h-screen flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Top bar */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            className="text-base font-semibold text-foreground bg-transparent border-none outline-none focus:ring-0 w-48 truncate"
            placeholder="Untitled Flow"
          />
          <span className="text-xs text-muted-foreground">
            {nodes.length} block{nodes.length !== 1 ? "s" : ""}
            {edges.length > 0 && ` · ${edges.length} edge${edges.length !== 1 ? "s" : ""}`}
            {variables.length > 0 && ` · ${variables.length} var${variables.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setShowTemplates(true)}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            Templates
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${showCollaboration ? "text-primary" : ""}`}
            onClick={() => setShowCollaboration((v) => !v)}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Comments
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className={`gap-2 ${showHistory ? "text-primary" : ""}`}
            onClick={() => setShowHistory((v) => !v)}
            title="Version History"
          >
            <History className="h-3.5 w-3.5" />
            History
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleSave}
            disabled={saving || nodes.length === 0}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saveSuccess ? "Saved!" : "Save"}
          </Button>

          <Button
            size="sm"
            className="gap-2"
            disabled={nodes.length === 0}
            onClick={() => {
              navigate("/run-flow", { state: { nodes, edges, variables, flowName, flowId: savedId } });
            }}
          >
            <Play className="h-3.5 w-3.5" />
            Run Flow
          </Button>
        </div>
      </div>

      {/* Validation bar */}
      <ValidationBar result={validationResult} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: Block Library + Variable Manager + Webhook */}
        <div className="flex flex-col w-60 border-r border-border bg-card shrink-0 overflow-y-auto">
          <BlockLibrary embedded />
          <VariableManager />
          {savedId && <WebhookPanel flowId={savedId} flowName={flowName} />}
          {savedId && <ScheduledTriggerPanel flowId={savedId} flowName={flowName} />}
        </div>

        <Canvas validationResult={validationResult} />
        <BlockSettings />

        {/* Collaboration panel */}
        {showCollaboration && (
          <CollaborationPanel
            flowId={savedId}
            onClose={() => setShowCollaboration(false)}
          />
        )}

        {/* Version History panel (slides in from right) */}
        {showHistory && (
          <VersionHistoryPanel
            flowId={savedId}
            currentNodes={nodes}
            currentEdges={edges}
            onRestore={handleRestoreVersion}
            onClose={() => setShowHistory(false)}
          />
        )}
      </div>

      {/* Template Library Modal */}
      <AnimatePresence>
        {showTemplates && (
          <TemplateLibraryModal
            onSelect={({ name, nodes: n, edges: e, variables: vars }) => {
              loadFlow({ name, nodes: n, edges: e, variables: vars });
              setSavedId(null);
            }}
            onClose={() => setShowTemplates(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FlowDesigner() {
  return (
    <FlowProvider>
      <DesignerInner />
    </FlowProvider>
  );
}