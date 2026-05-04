import { useFlow, BLOCK_TYPES } from "@/lib/flowStore";
import { Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InputSettings from "./settings/InputSettings";
import AISettings from "./settings/AISettings";
import ActionSettings from "./settings/ActionSettings";
import OutputSettings from "./settings/OutputSettings";
import ConditionSettings from "./settings/ConditionSettings";
import AINodeAssistant from "./AINodeAssistant";
import NodeTester from "./NodeTester";

const SETTINGS_MAP = {
  input: InputSettings,
  ai: AISettings,
  action: ActionSettings,
  output: OutputSettings,
  condition: ConditionSettings,
};

export default function BlockSettings() {
  const { selectedNode, removeNode } = useFlow();

  if (!selectedNode) {
    return (
      <div className="w-64 border-l border-border bg-card flex flex-col shrink-0">
        <div className="p-4 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Block Settings
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="h-10 w-10 rounded-xl bg-secondary/80 border border-border flex items-center justify-center mx-auto mb-3">
              <Settings className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Select a block to configure
            </p>
          </div>
        </div>
      </div>
    );
  }

  const meta = BLOCK_TYPES[selectedNode.type];
  const SettingsComponent = SETTINGS_MAP[selectedNode.type];

  return (
    <div className="w-64 border-l border-border bg-card flex flex-col shrink-0">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Block Settings
          </h2>
          <p className={`text-sm font-semibold mt-0.5 ${meta.color}`}>{meta.label}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => removeNode(selectedNode.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {SettingsComponent && <SettingsComponent node={selectedNode} />}
        </div>
        <NodeTester node={selectedNode} />
        <AINodeAssistant node={selectedNode} />
      </div>
    </div>
  );
}