import { Variable } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TestVariablesPanel({ variables, values, onChange }) {
  if (!variables || variables.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Variable className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Test Variables</h3>
        <span className="text-xs text-muted-foreground ml-auto">Override for this run</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {variables.map((v) => (
          <div key={v.key} className="space-y-1">
            <label className="text-xs text-muted-foreground font-mono">
              {"{{"}{v.key}{"}}"}
            </label>
            <Input
              className="h-7 text-xs bg-secondary/50 border-border"
              value={values[v.key] ?? v.value}
              onChange={(e) => onChange(v.key, e.target.value)}
              placeholder={v.value || "empty"}
            />
          </div>
        ))}
      </div>
    </div>
  );
}