import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, Plus, X, Send, CheckCircle2, AlertTriangle, Loader2, Webhook } from 'lucide-react';

const TRIGGER_OPTIONS = [
  { key: 'on_audit_complete', label: 'Audit Complete' },
  { key: 'on_score_drop', label: 'Score Drop' },
  { key: 'on_critical_issue', label: 'Critical Issue Found' },
  { key: 'on_regression', label: 'Visual Regression' },
];

const METHOD_OPTIONS = ['POST', 'GET'];

function WebhookRow({ webhook, onRemove, onTest, testing }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="rounded-lg border border-border/50 bg-secondary/30 p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-foreground">{webhook.label || 'Unnamed Webhook'}</p>
          <p className="text-[10px] font-mono text-muted-foreground truncate max-w-xs">{webhook.url}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => onTest(webhook)}
            disabled={testing}
          >
            {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            Test
          </Button>
          <button onClick={() => onRemove(webhook.id)} className="p-1 hover:bg-destructive/20 rounded">
            <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {webhook.triggers.map(t => (
          <span key={t} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20">
            {TRIGGER_OPTIONS.find(o => o.key === t)?.label || t}
          </span>
        ))}
      </div>

      {webhook.lastStatus && (
        <div className={`flex items-center gap-1.5 text-[10px] ${webhook.lastStatus === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
          {webhook.lastStatus === 'success'
            ? <CheckCircle2 className="h-3 w-3" />
            : <AlertTriangle className="h-3 w-3" />}
          Last test: {webhook.lastStatus} {webhook.lastStatusTime ? `at ${webhook.lastStatusTime}` : ''}
        </div>
      )}
    </motion.div>
  );
}

export default function WebhookNotificationCenter({ results, url }) {
  const [webhooks, setWebhooks] = useState([]);
  const [form, setForm] = useState({ label: '', url: '', method: 'POST', triggers: [] });
  const [showForm, setShowForm] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const toggleTrigger = (key) => {
    setForm(prev => ({
      ...prev,
      triggers: prev.triggers.includes(key)
        ? prev.triggers.filter(t => t !== key)
        : [...prev.triggers, key],
    }));
  };

  const addWebhook = () => {
    if (!form.url.trim() || form.triggers.length === 0) return;
    setWebhooks(prev => [...prev, { ...form, id: Date.now(), lastStatus: null }]);
    setForm({ label: '', url: '', method: 'POST', triggers: [] });
    setShowForm(false);
  };

  const removeWebhook = (id) => setWebhooks(prev => prev.filter(w => w.id !== id));

  const testWebhook = async (webhook) => {
    setTestingId(webhook.id);
    const payload = {
      event: 'test',
      url,
      timestamp: new Date().toISOString(),
      scores: results?.scores || null,
      message: 'Test notification from QA Audit Engine',
    };

    try {
      if (webhook.method === 'POST') {
        await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          mode: 'no-cors',
        });
      } else {
        const params = new URLSearchParams({ url, event: 'test', timestamp: payload.timestamp });
        await fetch(`${webhook.url}?${params}`, { mode: 'no-cors' });
      }
      setWebhooks(prev => prev.map(w => w.id === webhook.id
        ? { ...w, lastStatus: 'success', lastStatusTime: new Date().toLocaleTimeString() }
        : w
      ));
    } catch {
      setWebhooks(prev => prev.map(w => w.id === webhook.id
        ? { ...w, lastStatus: 'error', lastStatusTime: new Date().toLocaleTimeString() }
        : w
      ));
    } finally {
      setTestingId(null);
    }
  };

  const fireWebhooksForTrigger = async (triggerKey) => {
    const matching = webhooks.filter(w => w.triggers.includes(triggerKey));
    await Promise.all(matching.map(testWebhook));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" />
          Webhook Notification Center
        </h2>
        <Button size="sm" className="gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3.5 w-3.5" />
          Add Webhook
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Register webhooks to receive real-time QA audit events in your systems (Slack, Discord, Zapier, custom APIs).
      </p>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4"
          >
            <p className="text-xs font-semibold text-primary">New Webhook</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Label</label>
                <Input
                  value={form.label}
                  onChange={e => setForm(p => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. Slack #qa-alerts"
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Method</label>
                <select
                  value={form.method}
                  onChange={e => setForm(p => ({ ...p, method: e.target.value }))}
                  className="w-full h-8 rounded-md bg-secondary/50 border border-border text-foreground text-xs px-2"
                >
                  {METHOD_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Webhook URL</label>
              <Input
                value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                placeholder="https://hooks.slack.com/services/..."
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Trigger On</label>
              <div className="flex flex-wrap gap-2">
                {TRIGGER_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => toggleTrigger(opt.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      form.triggers.includes(opt.key)
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary/50 text-muted-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={addWebhook} disabled={!form.url.trim() || form.triggers.length === 0}>
                Add Webhook
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webhooks list */}
      <div className="space-y-2">
        <AnimatePresence>
          {webhooks.map(webhook => (
            <WebhookRow
              key={webhook.id}
              webhook={webhook}
              onRemove={removeWebhook}
              onTest={testWebhook}
              testing={testingId === webhook.id}
            />
          ))}
        </AnimatePresence>
        {webhooks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            No webhooks configured. Add one to start receiving notifications.
          </div>
        )}
      </div>

      {/* Manual fire panel */}
      {webhooks.length > 0 && (
        <div className="p-3 rounded-lg bg-secondary/30 border border-border/50 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground">Manual Fire</p>
          <div className="flex flex-wrap gap-2">
            {TRIGGER_OPTIONS.map(opt => (
              <Button
                key={opt.key}
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => fireWebhooksForTrigger(opt.key)}
                disabled={!webhooks.some(w => w.triggers.includes(opt.key))}
              >
                <Bell className="h-3 w-3" />
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}