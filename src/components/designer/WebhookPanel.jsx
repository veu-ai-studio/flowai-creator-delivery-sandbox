import { useState } from "react";
import { Webhook, Copy, Check, ChevronDown, ChevronUp, Play, Loader2, CheckCircle2, AlertCircle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

const WEBHOOK_BASE = `${window.location.origin}/api/functions/webhookTrigger`;

export default function WebhookPanel({ flowId, flowName }) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("docs"); // "docs" | "test"
  const [copied, setCopied] = useState(null);
  const [testInput, setTestInput] = useState("");
  const [testVars, setTestVars] = useState("{}");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { ok, data, error }

  if (!flowId) return null;

  const webhookUrl = WEBHOOK_BASE;
  const exampleBody = JSON.stringify({ flow_id: flowId, input: "Hello from webhook", variables: {} }, null, 2);
  const curlExample = `curl -X POST ${webhookUrl} \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify({ flow_id: flowId, input: "Hello from webhook", variables: {} })}'`;

  const copy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    let vars = {};
    try { vars = JSON.parse(testVars || "{}"); } catch {}
    const res = await base44.functions.invoke("webhookTrigger", {
      flow_id: flowId,
      input: testInput || "Test trigger",
      variables: vars,
    });
    if (res.data?.error) {
      setTestResult({ ok: false, error: res.data.error });
    } else {
      setTestResult({ ok: true, data: res.data });
    }
    setTesting(false);
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
      >
        <Webhook className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium">Webhook Trigger</span>
        <span className="ml-auto">{open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          {/* Tab switcher */}
          <div className="flex gap-1 bg-secondary/40 rounded-lg p-0.5">
            {["docs", "test"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1 text-[10px] font-medium rounded-md capitalize transition-colors ${
                  activeTab === tab ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab === "docs" ? "Documentation" : "Live Tester"}
              </button>
            ))}
          </div>

          {activeTab === "docs" && (
            <>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Trigger this flow externally via HTTP POST. Include <span className="font-mono text-primary">flow_id</span> to identify the flow.
              </p>

              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Endpoint</p>
                <div className="flex items-center gap-1.5">
                  <code className="flex-1 text-[10px] font-mono bg-secondary/50 rounded px-2 py-1.5 text-foreground truncate">
                    POST {webhookUrl}
                  </code>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copy(webhookUrl, "url")}>
                    {copied === "url" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Request Body</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono bg-secondary/50 rounded px-3 py-2 text-foreground overflow-x-auto">{exampleBody}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => copy(exampleBody, "body")}>
                    {copied === "body" ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">cURL</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono bg-secondary/50 rounded px-3 py-2 text-foreground overflow-x-auto whitespace-pre-wrap break-all">{curlExample}</pre>
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => copy(curlExample, "curl")}>
                    {copied === "curl" ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
                  </Button>
                </div>
              </div>
            </>
          )}

          {activeTab === "test" && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
                <FlaskConical className="h-3 w-3" />
                <span>Sends a real webhook request to this flow</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Input</label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter test input…"
                  rows={3}
                  className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Variables (JSON)</label>
                <input
                  value={testVars}
                  onChange={(e) => setTestVars(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>

              <Button size="sm" className="w-full gap-2" onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                {testing ? "Sending…" : "Send Test Request"}
              </Button>

              {testResult && (
                <div className={`rounded-lg border p-3 text-xs space-y-1.5 ${testResult.ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/30 bg-destructive/5"}`}>
                  <div className={`flex items-center gap-1.5 font-semibold ${testResult.ok ? "text-emerald-400" : "text-destructive"}`}>
                    {testResult.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {testResult.ok ? "Webhook received successfully" : "Request failed"}
                  </div>
                  <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {testResult.ok ? JSON.stringify(testResult.data, null, 2) : testResult.error}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}