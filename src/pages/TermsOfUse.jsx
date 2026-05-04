import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';

export default function TermsOfUse() {
  return (
    <div className="p-8 lg:p-10 max-w-3xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="h-7 w-7 text-primary" /> Terms of Use
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Last updated: May 2026</p>
      </motion.div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-5 text-sm text-muted-foreground leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">1. Proprietary Platform</h2>
          <p>FlowAI is proprietary technology of VEU AI Studio. Access to this platform is restricted to authorized VEU AI Studio personnel and licensed clients. Unauthorized access, scraping, reverse engineering, cloning, redistribution, or any form of reproduction is strictly prohibited.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">2. Intellectual Property</h2>
          <p>All content, workflows, algorithms, generated outputs, and capabilities within FlowAI are the exclusive intellectual property of VEU AI Studio. © 2026 VEU AI Studio. All rights reserved. Patent pending.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">3. Permitted Use</h2>
          <p>Authorized users may use FlowAI solely for internal product governance, quality assurance, and go-to-market operations on behalf of VEU AI Studio or licensed client products. Any other use requires written permission from VEU AI Studio.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">4. Data and Privacy</h2>
          <p>Session data, product analysis outputs, and governance records are stored securely and are not shared with third parties. See our Privacy Policy for full details.</p>
        </section>
        <section className="space-y-2">
          <h2 className="text-foreground font-semibold text-base">5. Contact</h2>
          <p>For licensing inquiries: legal@veuaistudio.com</p>
        </section>
      </div>
    </div>
  );
}