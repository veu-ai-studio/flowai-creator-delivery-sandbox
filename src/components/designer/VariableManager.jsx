import { useState } from "react";
import { useFlow } from "@/lib/flowStore";
import { Plus, Trash2, Variable, ChevronDown, ChevronUp, Copy, Check, Tag, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function VariableManager() {
  const { variables, nodes, addVariable, updateVariable, removeVariable } = useFlow();
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(null);

  const handleAdd = () => {
    const key = newKey.trim().replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
    if (!key) return;
    addVariable(key, newVal);
    setNewKey("");
    setNewVal("");
  };

  // Count how many nodes reference each variable
  const getUsageCount = (key) => {
    const pattern = `{{${key}}}`;
    return nodes.reduce((count, node) => {
      const configStr = JSON.stringify(node.config || {});
      return count + (configStr.split(pattern).length - 1);
    }, 0);
  };

  const copyVar = (key) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="border-t border-border">
      <button
        className="w-full p-3 flex items-center gap-2 hover:bg-secondary/20 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <Variable className="h-3.5 w-3.5 text-primary shrink-0" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left">
          Variables
        </h3>
        {variables.length > 0 && (
          <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-medium">
            {variables.length}
          </span>
        )}
        {expanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
      </button>

      {expanded && (
        <>
          <div className="px-3 pb-2 space-y-1.5 max-h-48 overflow-y-auto">
            {variables.length === 0 && (
              <p className="text-xs text-muted-foreground/50 py-1">
                No variables yet. Use <code className="bg-secondary px-1 rounded text-primary">{"{{key}}"}</code> in AI prompts.
              </p>
            )}
            {variables.map((v) => {
              const usage = getUsageCount(v.key);
              return (
                <div key={v.key} className="group rounded-lg border border-border/50 bg-secondary/20 p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Tag className="h-2.5 w-2.5 text-muted-foreground/50 shrink-0" />
                    <button
                      onClick={() => copyVar(v.key)}
                      className="flex items-center gap-1 text-xs text-primary font-mono hover:text-primary/80 transition-colors"
                      title="Click to copy {{key}}"
                    >
                      {copied === v.key
                        ? <Check className="h-2.5 w-2.5" />
                        : <Copy className="h-2.5 w-2.5" />}
                      {"{{"}{v.key}{"}}"}
                    </button>
                    <div className="ml-auto flex items-center gap-1">
                      {usage > 0 ? (
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-1.5 py-0.5 font-medium">
                          {usage}× used
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-1.5 py-0.5 font-medium">
                          <AlertCircle className="h-2 w-2" /> unused
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-muted-foreground hover:text-destructive shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeVariable(v.key)}
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="h-6 text-xs bg-secondary/50 border-border/50 px-2"
                    value={v.value}
                    onChange={(e) => updateVariable(v.key, e.target.value)}
                    placeholder="default value"
                  />
                  {!v.value && (
                    <p className="text-[9px] text-muted-foreground/40 italic">No default — must be provided at runtime</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="px-3 pb-3 flex gap-1.5">
            <Input
              className="h-7 text-xs bg-secondary/50 border-border px-2 w-24"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
              placeholder="name"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Input
              className="h-7 text-xs bg-secondary/50 border-border px-2 flex-1"
              value={newVal}
              onChange={(e) => setNewVal(e.target.value)}
              placeholder="default"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button size="icon" variant="secondary" className="h-7 w-7 shrink-0" onClick={handleAdd} title="Add variable">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}