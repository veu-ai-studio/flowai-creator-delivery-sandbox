import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus } from 'lucide-react';

const INDUSTRIES = [
  'Education & Universities',
  'Healthcare & Life Sciences',
  'Nonprofits & Community',
  'Publishing & Media',
  'HR & Coaching',
  'Finance & Fintech',
  'Real Estate',
  'Retail & E-commerce',
  'Government & Public Sector',
  'Legal & Compliance',
  'Agriculture & Environment',
  'Technology & SaaS',
  'Other',
];

const EMPTY = {
  name: '',
  url: '',
  audience: '',
  demo_org: '',
  description: '',
  industry: 'Technology & SaaS',
};

export default function CustomProductModal({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onAdd({
      name: form.name.trim(),
      url: form.url.trim(),
      tagline: `${form.industry} — ${form.description.slice(0, 60) || 'AI-powered solution'}`,
      audience: form.audience.trim() || 'enterprise buyers',
      audience_short: form.audience.trim().split(' ').slice(0, 3).join(' ') || 'Buyers',
      demo_org: form.demo_org.trim() || `${form.name.trim()} Demo Client`,
      description: form.description.trim(),
      industry: form.industry,
      color: 'text-cyan-400',
      border: 'border-cyan-500/30',
      bg: 'bg-cyan-500/5',
      dot: 'bg-cyan-400',
      is_custom: true,
    });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
        className="bg-card border border-border rounded-2xl w-full max-w-lg space-y-5 p-6">

        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Add Custom Product
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Product Name <span className="text-red-400">*</span></Label>
              <Input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. BudgetAI" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Product URL (optional)</Label>
              <Input value={form.url} onChange={e => set('url', e.target.value)}
                placeholder="https://yourproduct.com" className="h-8 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Target Audience / Buyer Persona</Label>
              <Input value={form.audience} onChange={e => set('audience', e.target.value)}
                placeholder="e.g. CFOs at mid-market companies" className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Demo Organization Name</Label>
              <Input value={form.demo_org} onChange={e => set('demo_org', e.target.value)}
                placeholder="e.g. Acme Corp" className="h-8 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Industry / Category</Label>
            <select value={form.industry} onChange={e => set('industry', e.target.value)}
              className="w-full h-8 rounded-md border border-input bg-transparent px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
              {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Product Description</Label>
            <Textarea value={form.description} onChange={e => set('description', e.target.value)}
              placeholder="Describe your product, its core features, and the problem it solves. This drives the synthetic data and demo content generation."
              className="min-h-24 text-sm resize-none" />
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="gap-1.5" onClick={handleSubmit} disabled={!form.name.trim()}>
            <Plus className="h-3.5 w-3.5" /> Add Product
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}