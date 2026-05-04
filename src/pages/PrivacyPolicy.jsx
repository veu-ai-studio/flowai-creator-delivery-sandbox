import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="p-8 lg:p-10 max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Shield className="h-7 w-7 text-primary" /> Privacy Policy
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Last updated: May 2026</p>
      </motion.div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-5 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">1. Data We Collect</h2>
          <p>FlowAI collects session data, product URLs analyzed, governance audit logs, and usage metrics necessary to provide the platform. No personally identifiable information beyond your authentication email is stored.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">2. How We Use Data</h2>
          <p>Collected data is used exclusively to operate FlowAI's governance and analysis features. We do not sell, share, or distribute any user data or product analysis outputs to third parties.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">3. Data Retention</h2>
          <p>Governance audit logs are retained for 12 months. Session data is retained for 90 days. You may request deletion by contacting privacy@veuaistudio.com.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">4. Security</h2>
          <p>All data is encrypted in transit and at rest. Session tokens expire after 8 hours of inactivity. Access is restricted to authenticated, authorized users only.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">5. Contact</h2>
          <p>Privacy inquiries: privacy@veuaistudio.com</p>
        </section>
      </div>
    </div>
  );
}