import { useFlow } from "@/lib/flowStore";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import VariableAutocompleteTextarea from "../VariableAutocompleteTextarea";

const ACTION_TYPES = [
  { value: "transform", label: "AI Transform" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
  { value: "trim", label: "Trim Whitespace" },
];

export default function ActionSettings({ node }) {
  const { updateNodeConfig } = useFlow();
  const cfg = node.config;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Action Type</Label>
        <Select
          value={cfg.actionType || "transform"}
          onValueChange={(v) => updateNodeConfig(node.id, { actionType: v })}
        >
          <SelectTrigger className="h-8 text-sm bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(cfg.actionType === "transform" || !cfg.actionType) && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Transform Prompt</Label>
          <VariableAutocompleteTextarea
            value={cfg.transformPrompt || ""}
            onChange={(e) => updateNodeConfig(node.id, { transformPrompt: e.target.value })}
            placeholder="Summarize the following:"
            className="text-sm bg-background h-24"
            rows={4}
          />
          <p className="text-xs text-muted-foreground/60">
            The pipeline value will be appended after this prompt.
          </p>
        </div>
      )}
    </div>
  );
}