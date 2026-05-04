import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Save, Plus, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

export default function TourStepEditor({ demo, productName, onSaved }) {
  const parsed = (() => { try { return JSON.parse(demo?.tour_script || '{}'); } catch { return {}; } })();
  const [steps, setSteps] = useState(parsed.steps || []);
  const [welcomeMessage, setWelcomeMessage] = useState(parsed.welcome_message || '');
  const [closingCta, setClosingCta] = useState(parsed.closing_cta || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const updateStep = (i, field, val) => {
    setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };

  const addStep = () => {
    setSteps(prev => [...prev, { id: `step-${prev.length + 1}`, title: '', text: '', attachTo: '' }]);
  };

  const removeStep = (i) => {
    setSteps(prev => prev.filter((_, idx) => idx !== i));
  };

  const save = async () => {
    setSaving(true);
    const updated = JSON.stringify({ welcome_message: welcomeMessage, steps, closing_cta: closingCta }, null, 2);
    await base44.entities.DemoEnvironment.update(demo.id, { tour_script: updated, updated_at: new Date().toISOString() });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved?.(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-amber-400" /> Tour Step Editor
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={addStep}>
            <Plus className="h-3 w-3" /> Add Step
          </Button>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Save className="h-3 w-3" />}
            {saved ? 'Saved!' : 'Save Tour'}
          </Button>
        </div>
      </div>

      {/* Welcome message */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-semibold">Welcome Message</p>
        <Input value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)}
          placeholder="Welcome message shown at tour start…" className="h-7 text-xs" />
      </div>

      {/* Steps */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {steps.map((step, i) => (
          <div key={i} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <button onClick={() => removeStep(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <Input value={step.title || ''} onChange={e => updateStep(i, 'title', e.target.value)}
              placeholder="Step title" className="h-7 text-xs" />
            <Input value={typeof step.text === 'string' ? step.text : ''} onChange={e => updateStep(i, 'text', e.target.value)}
              placeholder="Tooltip text (max 50 words)" className="h-7 text-xs" />
            <Input value={step.attachTo || ''} onChange={e => updateStep(i, 'attachTo', e.target.value)}
              placeholder="CSS selector (e.g. .dashboard-widget)" className="h-7 text-xs font-mono" />
          </div>
        ))}
        {steps.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No steps yet — click "Add Step" to begin</p>
        )}
      </div>

      {/* Closing CTA */}
      <div className="space-y-1">
        <p className="text-[10px] text-muted-foreground font-semibold">Closing CTA</p>
        <Input value={closingCta} onChange={e => setClosingCta(e.target.value)}
          placeholder="Closing call-to-action shown after last step…" className="h-7 text-xs" />
      </div>
    </div>
  );
}