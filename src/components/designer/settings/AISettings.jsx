import { useFlow } from "@/lib/flowStore";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AISchemaSettings from "./AISchemaSettings";
import VariableAutocompleteTextarea from "../VariableAutocompleteTextarea";

const MODELS = [
  { id: "gpt-4o-mini",       label: "GPT-4o Mini",       badge: "Fast · Cheap",     color: "text-emerald-400" },
  { id: "gpt-4o",            label: "GPT-4o",             badge: "Balanced",         color: "text-blue-400"   },
  { id: "gpt-4",             label: "GPT-4",              badge: "Powerful",         color: "text-violet-400" },
  { id: "claude_sonnet_4_6", label: "Claude Sonnet 4.6",  badge: "High Quality",     color: "text-amber-400"  },
  { id: "claude_opus_4_6",   label: "Claude Opus 4.6",    badge: "Most Capable",     color: "text-orange-400" },
  { id: "gemini_3_flash",    label: "Gemini 3 Flash",     badge: "Web Search",       color: "text-cyan-400"   },
  { id: "gemini_3_1_pro",    label: "Gemini 3.1 Pro",     badge: "Web + Reasoning",  color: "text-teal-400"   },
];

export default function AISettings({ node }) {
  const { updateNodeConfig } = useFlow();
  const cfg = node.config;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Model</Label>
        <Select
          value={cfg.model || "gpt-4o-mini"}
          onValueChange={(v) => updateNodeConfig(node.id, { model: v })}
        >
          <SelectTrigger className="h-8 text-sm bg-background">
            <SelectValue>
              {(() => {
                const m = MODELS.find((m) => m.id === (cfg.model || "gpt-4o-mini"));
                return m ? <span className={`font-medium ${m.color}`}>{m.label}</span> : cfg.model;
              })()}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {MODELS.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex items-center justify-between gap-3 w-full">
                  <span className={`font-medium ${m.color}`}>{m.label}</span>
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{m.badge}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(() => {
          const m = MODELS.find((x) => x.id === (cfg.model || "gpt-4o-mini"));
          return m ? <p className={`text-[10px] ${m.color} opacity-70`}>{m.badge}</p> : null;
        })()}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">System Prompt</Label>
        <VariableAutocompleteTextarea
          value={cfg.systemPrompt || ""}
          onChange={(e) => updateNodeConfig(node.id, { systemPrompt: e.target.value })}
          placeholder="You are a helpful assistant."
          className="text-sm bg-background h-24"
          rows={4}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Temperature ({cfg.temperature || "0.7"})</Label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={cfg.temperature || "0.7"}
          onChange={(e) => updateNodeConfig(node.id, { temperature: e.target.value })}
          className="w-full accent-primary"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Precise (0)</span>
          <span>Creative (2)</span>
        </div>
      </div>

      <AISchemaSettings node={node} />
    </div>
  );
}