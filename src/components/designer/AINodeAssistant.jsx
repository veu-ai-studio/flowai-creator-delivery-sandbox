import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Send, Loader2, X, ChevronDown, ChevronUp, Wand2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFlow } from "@/lib/flowStore";
import { motion, AnimatePresence } from "framer-motion";

const SUGGESTIONS = {
  ai: [
    "Write a system prompt for customer support",
    "Make this node extract JSON data",
    "Optimize the prompt for concise output",
    "Add chain-of-thought reasoning",
  ],
  input: [
    "Suggest a good label and placeholder",
    "What input format works best here?",
    "How should I validate user input?",
  ],
  action: [
    "What transformation should I use?",
    "How do I clean up the AI output?",
    "Suggest a data normalization approach",
  ],
  output: [
    "Should I use JSON or text format?",
    "How can I format the output nicely?",
  ],
  condition: [
    "Suggest condition logic for this branch",
    "How should I handle the false branch?",
    "What operator fits this use case?",
  ],
};

function buildContext(node, nodes, edges) {
  const lines = [`Selected block: ${node.type} — "${node.config?.label || node.label || node.type}"`];
  if (node.config?.systemPrompt) lines.push(`Current system prompt: "${node.config.systemPrompt.slice(0, 120)}"`);
  if (node.config?.model) lines.push(`Model: ${node.config.model}`);
  if (node.config?.actionType) lines.push(`Action type: ${node.config.actionType}`);
  if (node.config?.operator) lines.push(`Condition operator: ${node.config.operator}`);
  const connected = edges
    .filter((e) => e.from === node.id || e.to === node.id)
    .map((e) => {
      const otherId = e.from === node.id ? e.to : e.from;
      const other = nodes.find((n) => n.id === otherId);
      return other ? `${e.from === node.id ? "→" : "←"} ${other.type} (${other.config?.label || other.type})` : null;
    })
    .filter(Boolean);
  if (connected.length) lines.push(`Connected to: ${connected.join(", ")}`);
  return lines.join("\n");
}

export default function AINodeAssistant({ node }) {
  const { nodes, edges, updateNode } = useFlow();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);

  const sendMessage = async (text) => {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);
    scrollBottom();

    const context = buildContext(node, nodes, edges);
    const systemPrompt = `You are an expert AI workflow assistant helping a user configure a flow block.
Context about the selected block:
${context}

Give concise, actionable advice. If the user asks to generate or improve a system prompt, provide the full prompt text.
If you suggest config values (system prompt, labels, operators), clearly prefix them with "SUGGESTED:" so they can be applied.
Keep responses under 120 words unless generating a full prompt.`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: userMsg,
      model: "gpt_5_mini",
    });

    const assistantText = typeof response === "string" ? response : JSON.stringify(response);
    setMessages((prev) => [...prev, { role: "assistant", content: assistantText }]);
    setLoading(false);
    scrollBottom();
  };

  // Auto-apply suggested system prompt
  const applySystemPrompt = (text) => {
    const match = text.match(/SUGGESTED:\s*([\s\S]+)/i);
    if (match && node.type === "ai") {
      updateNode(node.id, { config: { ...node.config, systemPrompt: match[1].trim() } });
    }
  };

  const suggestions = SUGGESTIONS[node.type] || [];

  return (
    <div className="border-t border-border mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-accent/30 transition-colors"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="font-semibold text-foreground">AI Assistant</span>
        <span className="text-muted-foreground ml-auto">
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3">
              {/* Suggestion chips */}
              {messages.length === 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="h-2.5 w-2.5" /> Quick prompts
                  </p>
                  <div className="flex flex-col gap-1">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-secondary/50 hover:bg-accent/50 border border-border/50 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message thread */}
              {messages.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${m.role === "user" ? "bg-primary/10 text-foreground ml-4" : "bg-secondary/50 text-foreground mr-2"}`}>
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="h-2.5 w-2.5 text-primary" />
                          <span className="text-[10px] font-semibold text-primary">AI Assistant</span>
                          {m.content.includes("SUGGESTED:") && node.type === "ai" && (
                            <button
                              onClick={() => applySystemPrompt(m.content)}
                              className="ml-auto flex items-center gap-0.5 text-[10px] text-emerald-400 hover:text-emerald-300 font-semibold"
                            >
                              <Wand2 className="h-2.5 w-2.5" /> Apply
                            </button>
                          )}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{m.content.replace(/^SUGGESTED:\s*/i, "")}</p>
                    </div>
                  ))}
                  {loading && (
                    <div className="bg-secondary/50 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin text-primary" /> Thinking…
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              )}

              {messages.length > 0 && (
                <button
                  onClick={() => setMessages([])}
                  className="text-[10px] text-muted-foreground/60 hover:text-muted-foreground flex items-center gap-1"
                >
                  <X className="h-2.5 w-2.5" /> Clear conversation
                </button>
              )}

              {/* Input */}
              <div className="flex gap-1.5">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Ask about this block…"
                  disabled={loading}
                  className="flex-1 text-xs bg-secondary/50 border border-border rounded-lg px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <Button size="icon" className="h-7 w-7 shrink-0" onClick={() => sendMessage()} disabled={!input.trim() || loading}>
                  {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}