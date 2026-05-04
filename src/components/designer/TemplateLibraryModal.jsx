import { useState, useMemo } from "react";
import { FLOW_TEMPLATES, TEMPLATE_CATEGORIES, DIFFICULTY_COLORS } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { X, LayoutTemplate, Search, Variable, ArrowRight } from "lucide-react";
import { BLOCK_TYPES } from "@/lib/flowStore";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_COLORS = {
  "AI":           "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "AI + Logic":   "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Data":         "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Productivity": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Dev":          "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

export default function TemplateLibraryModal({ onSelect, onClose }) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState(null);

  const filtered = useMemo(() => {
    let list = activeCategory === "All" ? FLOW_TEMPLATES : FLOW_TEMPLATES.filter((t) => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list;
  }, [activeCategory, search]);

  const handleSelect = (template) => {
    onSelect({
      name: template.name,
      nodes: JSON.parse(JSON.stringify(template.nodes)),
      edges: JSON.parse(JSON.stringify(template.edges)),
      variables: JSON.parse(JSON.stringify(template.variables)),
    });
    onClose();
  };

  const previewTemplate = preview ? FLOW_TEMPLATES.find((t) => t.id === preview) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <LayoutTemplate className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Template Library</h2>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {FLOW_TEMPLATES.length} templates
            </span>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search + category filters */}
        <div className="px-6 pt-4 pb-2 shrink-0 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full h-8 pl-9 pr-3 text-sm bg-secondary/50 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <div className="flex gap-1 flex-wrap">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  activeCategory === cat ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-accent border border-transparent"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Body: grid + optional preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Template grid */}
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="h-8 w-8 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No templates match your search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {filtered.map((template) => {
                  const isActive = preview === template.id;
                  return (
                    <button
                      key={template.id}
                      onClick={() => setPreview(isActive ? null : template.id)}
                      className={`text-left rounded-xl border transition-all p-4 group ${
                        isActive ? "border-primary/50 bg-primary/5" : "border-border bg-secondary/30 hover:border-primary/30 hover:bg-accent/20"
                      }`}
                    >
                      {/* Top badges */}
                      <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[template.category] || "bg-secondary text-muted-foreground border-border"}`}>
                          {template.category}
                        </span>
                        {template.difficulty && (
                          <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${DIFFICULTY_COLORS[template.difficulty] || ""}`}>
                            {template.difficulty}
                          </span>
                        )}
                        {template.variables.length > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border bg-primary/10 text-primary border-primary/20">
                            <Variable className="h-2.5 w-2.5" />
                            {template.variables.length} var{template.variables.length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                        {template.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
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
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground ml-auto">
                          {template.nodes.length} nodes
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview panel */}
          <AnimatePresence>
            {previewTemplate && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 280, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-l border-border bg-secondary/20 flex flex-col overflow-hidden shrink-0"
              >
                <div className="p-4 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">{previewTemplate.name}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{previewTemplate.description}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {/* Pipeline visualization */}
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Pipeline</p>
                    <div className="space-y-1.5">
                      {previewTemplate.nodes.map((node, i) => {
                        const meta = BLOCK_TYPES[node.type];
                        return (
                          <div key={node.id} className="flex flex-col items-start">
                            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs w-full ${meta?.bgColor} ${meta?.borderColor}`}>
                              <span className={`font-medium ${meta?.color}`}>{meta?.label || node.type}</span>
                              <span className="text-muted-foreground/60 text-[10px] truncate flex-1">{node.config?.label || node.config?.model || ""}</span>
                            </div>
                            {i < previewTemplate.nodes.length - 1 && (
                              <div className="ml-3 w-px h-3 bg-border" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Variables */}
                  {previewTemplate.variables.length > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Variables</p>
                      <div className="space-y-1">
                        {previewTemplate.variables.map((v) => (
                          <div key={v.key} className="flex items-center gap-2 text-xs">
                            <code className="text-primary font-mono">{`{{${v.key}}}`}</code>
                            <span className="text-muted-foreground truncate">{v.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-border">
                  <Button className="w-full gap-2" size="sm" onClick={() => handleSelect(previewTemplate)}>
                    Use Template
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}