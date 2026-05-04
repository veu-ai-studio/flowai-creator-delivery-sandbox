import { useNavigate } from "react-router-dom";
import { FLOW_TEMPLATES } from "@/lib/templates";
import { BLOCK_TYPES } from "@/lib/flowStore";
import { LayoutTemplate, ArrowRight } from "lucide-react";

const FEATURED_IDS = ["summarizer", "sentiment", "translate", "email-draft"];

export default function QuickTemplates() {
  const navigate = useNavigate();
  const featured = FLOW_TEMPLATES.filter((t) => FEATURED_IDS.includes(t.id)).slice(0, 4);

  const handleUse = (template) => {
    navigate("/flow-designer", {
      state: {
        loadFlow: {
          name: template.name,
          nodes: JSON.parse(JSON.stringify(template.nodes)),
          edges: JSON.parse(JSON.stringify(template.edges)),
          variables: JSON.parse(JSON.stringify(template.variables)),
        },
      },
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Start Templates</h3>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {featured.map((t) => (
          <button
            key={t.id}
            onClick={() => handleUse(t)}
            className="text-left p-3 rounded-lg border border-border bg-secondary/30 hover:border-primary/40 hover:bg-accent/20 transition-all group"
          >
            <div className="flex flex-wrap gap-1 mb-2">
              {[...new Set(t.nodes.map((n) => n.type))].map((type) => {
                const meta = BLOCK_TYPES[type];
                if (!meta) return null;
                return (
                  <span key={type} className={`text-[9px] px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}>
                    {meta.label.replace(" Block", "")}
                  </span>
                );
              })}
            </div>
            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{t.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{t.description}</p>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              Use template <ArrowRight className="h-2.5 w-2.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}