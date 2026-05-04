import { useFlow } from "@/lib/flowStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const OUTPUT_FORMATS = [
  { value: "text", label: "Plain Text" },
  { value: "json", label: "JSON (pretty-print)" },
  { value: "uppercase", label: "UPPERCASE" },
];

export default function OutputSettings({ node }) {
  const { updateNodeConfig } = useFlow();
  const cfg = node.config;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Output Label</Label>
        <Input
          value={cfg.label || ""}
          onChange={(e) => updateNodeConfig(node.id, { label: e.target.value })}
          placeholder="e.g. Result"
          className="h-8 text-sm bg-background"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Output Format</Label>
        <Select
          value={cfg.format || "text"}
          onValueChange={(v) => updateNodeConfig(node.id, { format: v })}
        >
          <SelectTrigger className="h-8 text-sm bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTPUT_FORMATS.map(({ value, label }) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}