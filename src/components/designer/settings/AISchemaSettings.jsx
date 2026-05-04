import { useState } from "react";
import { useFlow } from "@/lib/flowStore";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Code2 } from "lucide-react";

const EXAMPLE_SCHEMA = `{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "sentiment": { "type": "string", "enum": ["positive","negative","neutral"] },
    "score": { "type": "number" }
  },
  "required": ["summary", "sentiment"]
}`;

export default function AISchemaSettings({ node }) {
  const { updateNodeConfig } = useFlow();
  const cfg = node.config;
  const [schemaError, setSchemaError] = useState(null);
  const [schemaOk, setSchemaOk] = useState(false);

  const handleSchemaChange = (raw) => {
    updateNodeConfig(node.id, { jsonSchema: raw });
    setSchemaOk(false);
    setSchemaError(null);
  };

  const validateSchema = () => {
    if (!cfg.jsonSchema?.trim()) {
      setSchemaError(null);
      setSchemaOk(false);
      return;
    }
    try {
      const parsed = JSON.parse(cfg.jsonSchema);
      if (parsed.type !== "object") throw new Error("Root must be type: object");
      setSchemaOk(true);
      setSchemaError(null);
    } catch (e) {
      setSchemaError(e.message);
      setSchemaOk(false);
    }
  };

  const loadExample = () => {
    updateNodeConfig(node.id, { jsonSchema: EXAMPLE_SCHEMA });
    setSchemaOk(false);
    setSchemaError(null);
  };

  const clearSchema = () => {
    updateNodeConfig(node.id, { jsonSchema: "" });
    setSchemaOk(false);
    setSchemaError(null);
  };

  return (
    <div className="space-y-3 border-t border-border pt-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Code2 className="h-3.5 w-3.5 text-blue-400" />
          <Label className="text-xs text-muted-foreground">JSON Schema (optional)</Label>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={loadExample}>
            Example
          </Button>
          {cfg.jsonSchema && (
            <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={clearSchema}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <Textarea
        value={cfg.jsonSchema || ""}
        onChange={(e) => handleSchemaChange(e.target.value)}
        onBlur={validateSchema}
        placeholder={"Paste a JSON Schema here to enforce structured output..."}
        className="font-mono text-xs h-36 bg-background resize-none"
      />

      {schemaError && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3 w-3" /> {schemaError}
        </div>
      )}
      {schemaOk && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3 w-3" /> Valid JSON Schema
        </div>
      )}
      <p className="text-xs text-muted-foreground/60">
        When set, the AI will return structured JSON matching this schema. Output is validated at runtime.
      </p>
    </div>
  );
}