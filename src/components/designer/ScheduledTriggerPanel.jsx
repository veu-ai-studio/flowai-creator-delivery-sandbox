import { useState, useEffect } from "react";
import { Clock, ChevronDown, ChevronUp, Plus, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";

const INTERVALS = [
  { label: "Every 5 min",  value: "5min",   interval: 5,  unit: "minutes" },
  { label: "Every 15 min", value: "15min",  interval: 15, unit: "minutes" },
  { label: "Every hour",   value: "1h",     interval: 1,  unit: "hours" },
  { label: "Every 6 hrs",  value: "6h",     interval: 6,  unit: "hours" },
  { label: "Daily",        value: "1d",     interval: 1,  unit: "days" },
  { label: "Weekly",       value: "7d",     interval: 7,  unit: "days" },
];

export default function ScheduledTriggerPanel({ flowId, flowName }) {
  const [open, setOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState("1h");
  const [seedInput, setSeedInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { ok, msg }

  // Load saved schedules for this flow from entity
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    base44.entities.SavedFlow.filter({ id: flowId })
      .then((res) => {
        const flow = res[0];
        setSchedules(flow?.schedules || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [open, flowId]);

  const persistSchedules = async (updated) => {
    await base44.entities.SavedFlow.update(flowId, { schedules: updated });
    setSchedules(updated);
  };

  const handleAdd = async () => {
    setSaving(true);
    setStatus(null);
    const iv = INTERVALS.find((i) => i.value === selectedInterval);
    const newSchedule = {
      id: crypto.randomUUID(),
      interval: iv.interval,
      unit: iv.unit,
      label: iv.label,
      seedInput,
      active: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...schedules, newSchedule];
    await persistSchedules(updated);
    setSeedInput("");
    setAdding(false);
    setSaving(false);
    setStatus({ ok: true, msg: `Schedule added: ${iv.label}` });
    setTimeout(() => setStatus(null), 3000);
  };

  const handleRemove = async (id) => {
    const updated = schedules.filter((s) => s.id !== id);
    await persistSchedules(updated);
  };

  const handleToggle = async (id) => {
    const updated = schedules.map((s) => s.id === id ? { ...s, active: !s.active } : s);
    await persistSchedules(updated);
  };

  return (
    <div className="border-t border-border">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-colors"
      >
        <Clock className="h-3.5 w-3.5 text-violet-400" />
        <span className="font-medium">Scheduled Triggers</span>
        {schedules.length > 0 && (
          <span className="bg-violet-500/15 text-violet-400 border border-violet-500/20 text-[10px] rounded-full px-1.5 py-0.5 font-medium">
            {schedules.filter((s) => s.active).length} active
          </span>
        )}
        <span className="ml-auto">{open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Configure this flow to run automatically on a schedule. Each schedule runs with an optional seed input.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {schedules.length === 0 && !adding && (
                <p className="text-[11px] text-muted-foreground/50 text-center py-2">No schedules yet.</p>
              )}

              {/* Existing schedules */}
              <div className="space-y-2">
                {schedules.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{s.label}</p>
                      {s.seedInput && (
                        <p className="text-[10px] text-muted-foreground truncate">Input: {s.seedInput}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggle(s.id)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${
                        s.active
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      {s.active ? "ON" : "OFF"}
                    </button>
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => handleRemove(s.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>

              {/* Add new schedule form */}
              {adding ? (
                <div className="space-y-2 rounded-lg border border-border/50 bg-secondary/10 p-3">
                  <Select value={selectedInterval} onValueChange={setSelectedInterval}>
                    <SelectTrigger className="h-7 text-xs bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTERVALS.map((iv) => (
                        <SelectItem key={iv.value} value={iv.value}>{iv.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input
                    value={seedInput}
                    onChange={(e) => setSeedInput(e.target.value)}
                    placeholder="Seed input (optional)…"
                    className="w-full text-xs bg-secondary/50 border border-border rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-7 text-xs gap-1.5" onClick={handleAdd} disabled={saving}>
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      Add Schedule
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm" variant="outline" className="w-full h-7 text-xs gap-1.5"
                  onClick={() => setAdding(true)}
                >
                  <Plus className="h-3 w-3" /> Add Schedule
                </Button>
              )}

              {status && (
                <div className={`flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${status.ok ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                  {status.ok ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {status.msg}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}