// D36 T1 verification — exercise the atomic-audit path on the
// freshly-seeded mypreglife/prd product_ssot row.
import { appendGovernanceEntry } from '../src/lib/agents/renewal/optionCPipeline.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const r = await appendGovernanceEntry({
  productId: 'mypreglife', environment: 'prd', supabase,
  entry: { kind: 'd36_t1_verification', at: new Date().toISOString(), note: 'verifying atomic-audit on freshly-seeded mypreglife/prd row' },
});

console.log('atomic-audit result:', JSON.stringify({
  written: r.written,
  reason: r.reason ?? null,
  attempts: r.attempts ?? null,
  priorUpdatedAt: r.priorUpdatedAt ?? null,
  nextUpdatedAt: r.nextUpdatedAt ?? null,
}));

// Cleanup: optional — remove the verification entry so the run-time
// governance_record stays free of test-noise.
const { error } = await supabase
  .from('product_ssot')
  .update({ governance_record: [] })
  .eq('product_id', 'mypreglife')
  .eq('environment', 'prd');
if (error) console.log('cleanup err:', error.message);
else console.log('cleanup: governance_record cleared');
