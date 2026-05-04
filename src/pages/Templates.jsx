import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FLOW_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/templates";
import { BLOCK_TYPES } from "@/lib/flowStore";
import { Button } from "@/components/ui/button";
import { LayoutTemplate, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORY_COLORS = {
  "AI": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "AI + Logic": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Data": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Productivity": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Dev": "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export default function Templates() {
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();

  const filtered = activeCategory === "All"
    ? FLOW_TEMPLATES
    : FLOW_TEMPLATES.filter((t) => t.category === activeCategory);

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
    <div className="p-8 lg:p-10 max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Template Library</h1>
        </div>
        <p className="mt-1 text-muted-foreground text-sm">
          Start from a pre-built flow. Click any template to open it in the Designer.
        </p>
      </motion.div>

      {/* Category filter */}
      <div className="flex gap-1 mt-6 flex-wrap">
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeCategory === cat ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {filtered.map((template, i) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all p-5 flex flex-col"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[template.category] || "bg-secondary text-muted-foreground border-border"}`}>
                {template.category}
              </span>
              <span className="text-[10px] text-muted-foreground">{template.nodes.length} blocks</span>
            </div>

            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {template.name}
            </h3>
            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed flex-1">
              {template.description}
            </p>

            {/* Block type pills */}
            <div className="flex flex-wrap gap-1 mt-3">
              {[...new Set(template.nodes.map((n) => n.type))].map((type) => {
                const meta = BLOCK_TYPES[type];
                if (!meta) return null;
                return (
                  <span key={type} className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.bgColor} ${meta.borderColor} ${meta.color}`}>
                    {meta.label.replace(" Block", "")}
                  </span>
                );
              })}
            </div>

            {template.variables.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {template.variables.map((v) => (
                  <span key={v.key} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                    {`{{${v.key}}}`}
                  </span>
                ))}
              </div>
            )}

            <Button
              size="sm"
              className="mt-4 gap-2 w-full"
              onClick={() => handleUse(template)}
            >
              Use Template
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}