import { useFlow } from "@/lib/flowStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";

export default function InputSettings({ node }) {
  const { updateNodeConfig } = useFlow();
  const cfg = node.config;

  const minLen = cfg.minLength ?? "";
  const maxLen = cfg.maxLength ?? "";
  const required = cfg.required ?? true;

  // Inline validation feedback
  const minMaxError = minLen !== "" && maxLen !== "" && Number(minLen) > Number(maxLen);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Input Label</Label>
        <Input
          value={cfg.label || ""}
          onChange={(e) => updateNodeConfig(node.id, { label: e.target.value })}
          placeholder="e.g. User Question"
          className="h-8 text-sm bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Default Value</Label>
        <Input
          value={cfg.value || ""}
          onChange={(e) => updateNodeConfig(node.id, { value: e.target.value })}
          placeholder="e.g. Sample input text"
          className="h-8 text-sm bg-background"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Placeholder Text</Label>
        <Input
          value={cfg.placeholder || ""}
          onChange={(e) => updateNodeConfig(node.id, { placeholder: e.target.value })}
          placeholder="e.g. Enter your input..."
          className="h-8 text-sm bg-background"
        />
      </div>

      {/* Validation section */}
      <div className="pt-2 border-t border-border space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Validation</p>

        {/* Required toggle */}
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Required</Label>
          <button
            onClick={() => updateNodeConfig(node.id, { required: !required })}
            className={`relative inline-flex h-4 w-7 rounded-full transition-colors ${required ? "bg-primary" : "bg-secondary"}`}
          >
            <span className={`inline-block h-3 w-3 mt-0.5 rounded-full bg-white shadow transition-transform ${required ? "translate-x-3.5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {/* Min / Max length */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Min length</Label>
            <Input
              type="number"
              min={0}
              value={minLen}
              onChange={(e) => updateNodeConfig(node.id, { minLength: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="—"
              className={`h-7 text-xs bg-background ${minMaxError ? "border-destructive" : ""}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">Max length</Label>
            <Input
              type="number"
              min={0}
              value={maxLen}
              onChange={(e) => updateNodeConfig(node.id, { maxLength: e.target.value === "" ? undefined : Number(e.target.value) })}
              placeholder="—"
              className={`h-7 text-xs bg-background ${minMaxError ? "border-destructive" : ""}`}
            />
          </div>
        </div>

        {minMaxError && (
          <div className="flex items-center gap-1.5 text-[10px] text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Min length cannot exceed max length
          </div>
        )}

        {/* Preview badge */}
        <div className="rounded-lg bg-secondary/50 border border-border p-2 space-y-1 text-[10px] text-muted-foreground">
          <p className="font-medium text-foreground">Validation Summary</p>
          <p>{required ? "✓ Required field" : "○ Optional field"}</p>
          {minLen !== "" && <p>✓ Min {minLen} chars</p>}
          {maxLen !== "" && <p>✓ Max {maxLen} chars</p>}
          {minLen === "" && maxLen === "" && <p className="text-muted-foreground/50">No length constraints</p>}
        </div>
      </div>
    </div>
  );
}