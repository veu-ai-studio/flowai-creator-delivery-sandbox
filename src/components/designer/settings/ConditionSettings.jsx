import { useFlow } from "@/lib/flowStore";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Plus, Trash2, FlaskConical, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";

const OPERATORS = [
  { value: "contains", label: "contains", needsValue: true },
  { value: "not_contains", label: "does not contain", needsValue: true },
  { value: "equals", label: "equals", needsValue: true },
  { value: "not_equals", label: "does not equal", needsValue: true },
  { value: "starts_with", label: "starts with", needsValue: true },
  { value: "ends_with", label: "ends with", needsValue: true },
  { value: "is_json", label: "is valid JSON", needsValue: false },
  { value: "length_gt", label: "length greater than", needsValue: true },
  { value: "length_lt", label: "length less than", needsValue: true },
  { value: "is_empty", label: "is empty", needsValue: false },
  { value: "is_not_empty", label: "is not empty", needsValue: false },
];

function evaluateOp(pipeline, op, val) {
  switch (op) {
    case "contains": return pipeline.includes(val);
    case "not_contains": return !pipeline.includes(val);
    case "equals": return pipeline.trim() === val.trim();
    case "not_equals": return pipeline.trim() !== val.trim();
    case "starts_with": return pipeline.startsWith(val);
    case "ends_with": return pipeline.endsWith(val);
    case "is_json": try { JSON.parse(pipeline); return true; } catch { return false; }
    case "length_gt": return pipeline.length > parseInt(val, 10);
    case "length_lt": return pipeline.length < parseInt(val, 10);
    case "is_empty": return pipeline.trim() === "";
    case "is_not_empty": return pipeline.trim() !== "";
    default: return false;
  }
}

function evaluateConditions(pipeline, conditions, logic) {
  if (!conditions || conditions.length === 0) return false;
  const results = conditions.map((c) => evaluateOp(pipeline, c.operator || "contains", c.conditionValue || ""));
  return logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

export default function ConditionSettings({ node }) {
  const { updateNodeConfig, variables } = useFlow();
  const cfg = node.config || {};

  // Support both legacy single-condition and new multi-condition array
  const conditions = cfg.conditions || [{ operator: cfg.operator || "contains", conditionValue: cfg.conditionValue || "" }];
  const logic = cfg.logic || "and";

  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState(null);

  const updateConditions = (newConditions, newLogic) => {
    updateNodeConfig(node.id, {
      conditions: newConditions,
      logic: newLogic ?? logic,
      // Keep legacy fields in sync with first condition for backward compat
      operator: newConditions[0]?.operator || "contains",
      conditionValue: newConditions[0]?.conditionValue || "",
    });
  };

  const addCondition = () => {
    updateConditions([...conditions, { operator: "contains", conditionValue: "" }]);
  };

  const removeCondition = (i) => {
    const next = conditions.filter((_, idx) => idx !== i);
    updateConditions(next.length ? next : [{ operator: "contains", conditionValue: "" }]);
  };

  const updateCondition = (i, field, value) => {
    const next = conditions.map((c, idx) => idx === i ? { ...c, [field]: value } : c);
    updateConditions(next);
  };

  const handleTest = () => {
    const result = evaluateConditions(testInput, conditions, logic);
    setTestResult(result);
  };

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="rounded-lg bg-orange-500/10 border border-orange-500/30 p-3">
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="h-3.5 w-3.5 text-orange-400" />
          <span className="text-xs font-medium text-orange-400">Branch Logic</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect two outgoing edges — first edge = <strong className="text-emerald-400">TRUE</strong>, second edge = <strong className="text-red-400">FALSE</strong>.
        </p>
      </div>

      {/* Logic combinator (only shown when >1 condition) */}
      {conditions.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">Match</span>
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {["and", "or"].map((opt) => (
              <button
                key={opt}
                onClick={() => updateConditions(conditions, opt)}
                className={`px-3 py-1.5 font-medium uppercase tracking-wide transition-colors ${
                  logic === opt ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">conditions</span>
        </div>
      )}

      {/* Condition rows */}
      <div className="space-y-2">
        {conditions.map((cond, i) => {
          const opMeta = OPERATORS.find((o) => o.value === cond.operator);
          return (
            <div key={i} className="rounded-lg border border-border/60 bg-secondary/20 p-2.5 space-y-2">
              {conditions.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    {i === 0 ? "If" : logic.toUpperCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground hover:text-destructive"
                    onClick={() => removeCondition(i)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Operator</Label>
                <Select value={cond.operator || "contains"} onValueChange={(v) => updateCondition(i, "operator", v)}>
                  <SelectTrigger className="h-7 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {opMeta?.needsValue !== false && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {cond.operator?.includes("length") ? "Number" : "Value"}
                  </Label>
                  <Input
                    value={cond.conditionValue || ""}
                    onChange={(e) => updateCondition(i, "conditionValue", e.target.value)}
                    placeholder={cond.operator?.includes("length") ? "e.g. 100" : "e.g. error"}
                    className="h-7 text-xs bg-background"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add condition button */}
      <Button variant="outline" size="sm" className="w-full h-7 gap-1.5 text-xs" onClick={addCondition}>
        <Plus className="h-3 w-3" />
        Add Condition
      </Button>

      {/* Live tester */}
      <div className="rounded-lg border border-border/60 bg-secondary/10 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <FlaskConical className="h-3 w-3" />
          Live Tester
        </div>
        <Input
          value={testInput}
          onChange={(e) => { setTestInput(e.target.value); setTestResult(null); }}
          placeholder="Paste sample text to test…"
          className="h-7 text-xs bg-background"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" className="h-7 text-xs gap-1" onClick={handleTest}>
            Test
          </Button>
          {testResult !== null && (
            <div className={`flex items-center gap-1 text-xs font-medium ${testResult ? "text-emerald-400" : "text-red-400"}`}>
              {testResult ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {testResult ? "TRUE — takes true branch" : "FALSE — takes false branch"}
            </div>
          )}
        </div>
      </div>

      {/* Branch legend */}
      <div className="text-xs text-muted-foreground space-y-1 bg-secondary/40 rounded-lg p-3">
        <p className="font-medium text-foreground">Branch edges:</p>
        <p>• <span className="text-emerald-400">1st edge</span> → condition is TRUE</p>
        <p>• <span className="text-red-400">2nd edge</span> → condition is FALSE</p>
      </div>
    </div>
  );
}