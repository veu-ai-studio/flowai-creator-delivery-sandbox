// Shown after Accept and Lock in Auto Runner — prompts user to start Clearance Protocol
import { motion } from 'framer-motion';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function ClearanceProtocolPrompt({ sessionConfig }) {
  const navigate = useNavigate();

  const handleStart = () => {
    // Store session context so Clearance page can pre-populate
    try {
      const existing = JSON.parse(sessionStorage.getItem('flowai_session_config') || '{}');
      sessionStorage.setItem('flowai_session_config', JSON.stringify({
        ...existing,
        clearance_prefill: {
          product_name: sessionConfig?.inputs?.[0]?.name || 'Product',
          product_url: sessionConfig?.inputs?.find(i => i.type === 'url')?.value || '',
          objective: sessionConfig?.objective || '',
        }
      }));
    } catch {}
    navigate('/clearance');
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/40 bg-primary/5 p-5 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-primary" />
        <p className="text-sm font-bold text-foreground">Ready to formalize this clearance?</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Run the six-step Clearance Protocol to create an official <span className="text-foreground font-semibold">ClearanceRecord</span> for this product.
        This turns FlowAI's governance findings into a shareable, auditable clearance decision.
      </p>
      <Button onClick={handleStart} className="gap-2">
        <ShieldCheck className="h-4 w-4" /> Start Clearance Protocol
        <ChevronRight className="h-3.5 w-3.5" />
      </Button>
    </motion.div>
  );
}