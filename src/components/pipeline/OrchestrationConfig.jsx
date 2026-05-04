import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings2, Eye, EyeOff, CheckCircle2, Save } from 'lucide-react';

const FIELDS = [
  { key: 'OPENAI_API_KEY',   label: 'ChatGPT API Key',    placeholder: 'sk-...', hint: 'openai.com/api-keys', sensitive: true },
  { key: 'REPLIT_ENDPOINT',  label: 'Replit Endpoint URL', placeholder: 'https://...repl.co/run', hint: 'Your Replit deployment URL', sensitive: false },
  { key: 'VERCEL_TOKEN',     label: 'Vercel Token',        placeholder: 'Bearer token from vercel.com', hint: 'vercel.com/account/tokens', sensitive: true },
];

export default function OrchestrationConfig({ onClose }) {
  const [values, setValues] = useState({});
  const [show, setShow] = useState({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('flowai_orch_config') || '{}');
    setValues(stored);
  }, []);

  const handleSave = () => {
    localStorage.setItem('flowai_orch_config', JSON.stringify(values));
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose?.(); }, 1200);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-card p-6 space-y-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          Orchestration Config
        </h3>
        <p className="text-[10px] text-muted-foreground">Stored locally in browser — never sent to server without your action</p>
      </div>

      <div className="space-y-4">
        {FIELDS.map(({ key, label, placeholder, hint, sensitive }) => (
          <div key={key} className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{label}</label>
            <div className="relative">
              <Input
                type={sensitive && !show[key] ? 'password' : 'text'}
                value={values[key] || ''}
                onChange={e => setValues(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="h-9 text-sm pr-9"
              />
              {sensitive && (
                <button
                  type="button"
                  onClick={() => setShow(prev => ({ ...prev, [key]: !prev[key] }))}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show[key] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">→ {hint}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave} className="gap-1.5">
          {saved ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved!' : 'Save Config'}
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Cancel</Button>
      </div>

      <div className="text-[10px] text-muted-foreground space-y-0.5 pt-2 border-t border-border font-mono">
        <p>• Without keys: ChatGPT + Vercel + Replit run in simulation mode</p>
        <p>• With keys: real API calls are made to each service</p>
        <p>• To permanently set keys, add them in Dashboard → Settings → Environment Variables</p>
      </div>
    </motion.div>
  );
}