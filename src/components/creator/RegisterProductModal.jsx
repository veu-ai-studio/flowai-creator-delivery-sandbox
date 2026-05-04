import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, CheckCircle2, Loader2 } from 'lucide-react';

export default function RegisterProductModal({ productName, clientName, mode, targetAudience, sourceUrls, strategy, architecture, sprint, onClose, onRegistered }) {
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleRegister = async () => {
    setSaving(true);
    const attribution = `Built for ${clientName} by VEU AI Studio`;

    // Save CreatedProduct
    const created = await base44.entities.CreatedProduct.create({
      product_name: productName,
      client_name: clientName,
      creation_mode: mode,
      target_audience: targetAudience || '',
      source_urls: sourceUrls || [],
      product_strategy: strategy || '',
      technical_architecture: architecture || '',
      build_sprint: sprint || '',
      attribution,
      clearance_status: 'not_started',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Add to ClearanceRecord queue
    await base44.entities.ClearanceRecord.create({
      product_name: productName,
      base44_url: '',
      custom_domain: domain,
      target_audience: targetAudience || '',
      step1_status: 'pending', step2_status: 'pending', step3_status: 'pending',
      step4_status: 'pending', step5_status: 'pending', step6_status: 'pending',
      overall_status: 'not_started',
      created_at: new Date().toISOString(),
    });

    // Add to ProductRegistry (Portfolio Engine)
    await base44.entities.ProductRegistry.create({
      label: productName,
      url: domain || `https://${productName.toLowerCase().replace(/\s+/g, '')}.base44.app`,
      owner_email: '',
      notes: attribution,
      run_count: 0,
    });

    setSaving(false);
    setDone(true);
    onRegistered(created);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
      <div className="bg-card rounded-xl border border-border p-6 max-w-md w-full space-y-5">
        <div className="flex items-center justify-between">
          <p className="text-base font-bold text-foreground">Register This Product</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>

        {done ? (
          <div className="text-center py-4 space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-foreground">Product Registered!</p>
            <p className="text-xs text-muted-foreground">Find it in Portfolio Engine and Clearance Protocol when ready to deploy.</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>✅ Added to My Creations</p>
              <p>✅ Added to Portfolio Engine</p>
              <p>✅ Added to Clearance Protocol queue</p>
            </div>
            <Button size="sm" onClick={onClose} className="mt-2">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary/20 p-3 space-y-1">
                <p className="text-xs text-muted-foreground">Product name</p>
                <p className="text-sm font-bold text-foreground">{productName}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold text-primary">Built for {clientName} by VEU AI Studio</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Recommended Domain (optional)</label>
                <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="e.g. myproduct.com" className="h-9 text-sm" />
              </div>
              <p className="text-[10px] text-muted-foreground">This will also add the product to Portfolio Engine and the Clearance Protocol queue.</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={handleRegister} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {saving ? 'Registering...' : 'Register Product'}
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}