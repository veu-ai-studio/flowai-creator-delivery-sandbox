import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Tooltip from '@/components/ui/Tooltip';
import {
  ShieldCheck, Plus, X, Play, RotateCcw, ChevronRight,
  Search, CheckSquare, Square, Bell, BellOff, BarChart3
} from 'lucide-react';
import ClearanceWizard from '@/components/clearance/ClearanceWizard';
import ClearanceStatusDashboard from '@/components/clearance/ClearanceStatusDashboard';
import ClearanceProgressTimeline from '@/components/clearance/ClearanceProgressTimeline';
import { logAction } from '@/lib/auditLogger';

const VEU_PRODUCTS = [
  { product_name: 'SAIGE',       base44_url: 'https://saige.base44.app',       custom_domain: 'saigeplatform.com',       target_audience: 'University sustainability directors, utility executives', category: 'Sustainability' },
  { product_name: 'PressAI',     base44_url: 'https://pressai.base44.app',     custom_domain: 'ourpublishingai.com',     target_audience: 'Authors and publishers', category: 'Publishing' },
  { product_name: 'ReachSMS',    base44_url: 'https://reachsms.base44.app',    custom_domain: 'ourcommunitiesai.com',    target_audience: 'Nonprofit community organizations', category: 'Community' },
  { product_name: 'RelTwin',     base44_url: 'https://reltwin.com',            custom_domain: 'reltwin.com',             target_audience: 'Coaches and HR professionals', category: 'Relationships' },
  { product_name: 'MyBirthSafe', base44_url: 'https://mybirthsafe.base44.app', custom_domain: 'preglife.com',            target_audience: 'Pregnant women in Nigeria and Africa', category: 'Health' },
];

const STATUS_STYLE = {
  not_started: { label: 'Not Started',        color: 'text-muted-foreground', border: 'border-border',          bg: 'bg-secondary/20' },
  in_progress:  { label: 'In Progress',        color: 'text-blue-400',         border: 'border-blue-500/30',    bg: 'bg-blue-500/5' },
  cleared:      { label: 'Cleared for Launch', color: 'text-emerald-400',      border: 'border-emerald-500/30', bg: 'bg-emerald-500/5' },
  blocked:      { label: 'Blocked',            color: 'text-red-400',          border: 'border-red-500/30',     bg: 'bg-red-500/5' },
};

function getCurrentStep(record) {
  const steps = ['step1','step2','step3','step4','step5','step6'];
  for (let i = 0; i < steps.length; i++) {
    if (record[`${steps[i]}_status`] !== 'passed') return i;
  }
  return 5;
}

export default function Clearance() {
  const [records, setRecords] = useState({});
  const [wizardProduct, setWizardProduct] = useState(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customProducts, setCustomProducts] = useState([]);
  const [customForm, setCustomForm] = useState({ product_name: '', base44_url: '', custom_domain: '', target_audience: '', category: '' });

  // New feature state
  const [selectedProducts, setSelectedProducts] = useState(new Set()); // bulk actions
  const [searchQuery, setSearchQuery] = useState('');                   // search
  const [filterStatus, setFilterStatus] = useState('all');             // filter
  const [alertsEnabled, setAlertsEnabled] = useState(true);            // alerts toggle
  const [showDashboard, setShowDashboard] = useState(true);            // dashboard toggle
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    base44.entities.ClearanceRecord.list('-created_date').then(recs => {
      const map = {};
      recs.forEach(r => { map[r.product_name] = r; });
      setRecords(map);
    });
    base44.auth.me().then(u => { if (u?.email) setUserEmail(u.email); }).catch(() => {});
  }, []);

  const allProducts = [...VEU_PRODUCTS, ...customProducts];

  // ── Filtered & searched products ──────────────────────────────────────────
  const filteredProducts = allProducts.filter(p => {
    const rec = records[p.product_name];
    const status = rec?.overall_status || 'not_started';
    const matchesSearch = !searchQuery.trim() ||
      p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.custom_domain || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // ── Alert on step completion ───────────────────────────────────────────────
  const sendStepAlert = async (productName, stepLabel, status) => {
    if (!alertsEnabled || !userEmail) return;
    base44.integrations.Core.SendEmail({
      to: userEmail,
      subject: `Clearance Alert — ${productName}: ${stepLabel} ${status === 'passed' ? 'Passed ✅' : 'Failed ❌'}`,
      body: `Clearance protocol update for ${productName}.\n\nStep: ${stepLabel}\nResult: ${status === 'passed' ? 'PASSED' : 'FAILED'}\n\nLog in to FlowAI to continue the clearance workflow.\n`,
    }).catch(() => {});
  };

  // ── Audit log on every wizard update ──────────────────────────────────────
  const handleWizardUpdate = (updatedRecord) => {
    setRecords(prev => ({ ...prev, [updatedRecord.product_name]: updatedRecord }));
    if (wizardProduct) setWizardProduct(prev => ({ ...prev, record: updatedRecord }));

    // Detect which step just changed and log/alert
    const stepLabels = ['Governance', 'Readiness', 'White-Label', 'Data Export', 'Demo', 'Sign-Off'];
    for (let i = 1; i <= 6; i++) {
      const prev = records[updatedRecord.product_name]?.[`step${i}_status`];
      const next = updatedRecord[`step${i}_status`];
      if (prev !== next && (next === 'passed' || next === 'failed')) {
        const stepLabel = stepLabels[i - 1];
        logAction({
          actionType: next === 'passed' ? 'clearance_decision_issued' : 'clearance_decision_issued',
          stepName: `Clearance Step ${i}: ${stepLabel}`,
          sessionId: updatedRecord.id || '',
          productUrl: updatedRecord.base44_url || '',
          outcome: next,
          mode: 'clearance',
        });
        sendStepAlert(updatedRecord.product_name, stepLabel, next);
      }
    }
    if (updatedRecord.overall_status === 'cleared' && records[updatedRecord.product_name]?.overall_status !== 'cleared') {
      logAction({
        actionType: 'clearance_accepted_and_locked',
        stepName: 'Final Clearance',
        sessionId: updatedRecord.id || '',
        productUrl: updatedRecord.base44_url || '',
        outcome: 'cleared',
        mode: 'clearance',
      });
      sendStepAlert(updatedRecord.product_name, 'Full Clearance Protocol', 'passed');
    }
  };

  const seedProduct = async (product) => {
    const existing = records[product.product_name];
    if (existing) return existing;
    const rec = await base44.entities.ClearanceRecord.create({
      ...product,
      overall_status: 'not_started',
      step1_status: 'pending', step2_status: 'pending', step3_status: 'pending',
      step4_status: 'pending', step5_status: 'pending', step6_status: 'pending',
      created_at: new Date().toISOString(),
    });
    setRecords(prev => ({ ...prev, [product.product_name]: rec }));
    return rec;
  };

  const openWizard = async (product) => {
    const rec = await seedProduct(product);
    setWizardProduct({ ...product, record: rec });
  };

  const addCustomProduct = () => {
    if (!customForm.product_name.trim()) return;
    const p = { ...customForm, product_name: customForm.product_name.trim() };
    setCustomProducts(prev => [...prev, p]);
    setCustomForm({ product_name: '', base44_url: '', custom_domain: '', target_audience: '', category: '' });
    setShowAddCustom(false);
  };

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const toggleSelect = (name) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };
  const selectAll = () => setSelectedProducts(new Set(filteredProducts.map(p => p.product_name)));
  const clearSelection = () => setSelectedProducts(new Set());
  const bulkStartClearance = async () => {
    for (const name of selectedProducts) {
      const product = allProducts.find(p => p.product_name === name);
      if (product && !records[name]) await seedProduct(product);
    }
    clearSelection();
  };

  return (
    <div className="p-8 lg:p-10 max-w-5xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-primary" /> Product Clearance Protocol
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Six mandatory steps before any product's custom domain goes live
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Tooltip content={alertsEnabled ? 'Email alerts on step completion — click to disable' : 'Email alerts disabled — click to enable'}>
              <button
                onClick={() => setAlertsEnabled(v => !v)}
                className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${alertsEnabled ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400' : 'border-border text-muted-foreground hover:text-foreground'}`}
              >
                {alertsEnabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                {alertsEnabled ? 'Alerts On' : 'Alerts Off'}
              </button>
            </Tooltip>
            <button
              onClick={() => setShowDashboard(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-all ${showDashboard ? 'border-primary/30 bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Dashboard
            </button>
            <Tooltip content="Add a product not in the standard VEU AI Studio list">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAddCustom(v => !v)}>
                <Plus className="h-3.5 w-3.5" /> Add Custom Product
              </Button>
            </Tooltip>
          </div>
        </div>
      </motion.div>

      {/* Status Dashboard */}
      <AnimatePresence>
        {showDashboard && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <ClearanceStatusDashboard records={records} allProducts={allProducts} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add custom product form */}
      <AnimatePresence>
        {showAddCustom && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
              <p className="text-xs font-bold text-cyan-400">Add Custom Product</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <Input placeholder="Product Name *" value={customForm.product_name} onChange={e => setCustomForm(p => ({ ...p, product_name: e.target.value }))} className="h-8 text-xs" />
                <Input placeholder="Base44 URL" value={customForm.base44_url} onChange={e => setCustomForm(p => ({ ...p, base44_url: e.target.value }))} className="h-8 text-xs" />
                <Input placeholder="Custom Domain" value={customForm.custom_domain} onChange={e => setCustomForm(p => ({ ...p, custom_domain: e.target.value }))} className="h-8 text-xs" />
                <Input placeholder="Target Audience" value={customForm.target_audience} onChange={e => setCustomForm(p => ({ ...p, target_audience: e.target.value }))} className="h-8 text-xs" />
                <Input placeholder="Category" value={customForm.category} onChange={e => setCustomForm(p => ({ ...p, category: e.target.value }))} className="h-8 text-xs" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-1 text-xs h-8" onClick={addCustomProduct} disabled={!customForm.product_name.trim()}><Plus className="h-3 w-3" /> Add</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setShowAddCustom(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search + Filter + Bulk toolbar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product, domain, category…"
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-8 text-xs rounded-md border border-input bg-background px-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="all">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="cleared">Cleared</option>
          <option value="blocked">Blocked</option>
        </select>

        {/* Bulk controls */}
        {selectedProducts.size === 0 ? (
          <button onClick={selectAll} className="flex items-center gap-1.5 text-xs px-3 h-8 rounded-md border border-border text-muted-foreground hover:text-foreground transition-all">
            <CheckSquare className="h-3.5 w-3.5" /> Select All
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-primary font-semibold">{selectedProducts.size} selected</span>
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={bulkStartClearance}>
              <Play className="h-3 w-3" /> Bulk Start Clearance
            </Button>
            <button onClick={clearSelection} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Results count */}
      {(searchQuery || filterStatus !== 'all') && (
        <p className="text-[11px] text-muted-foreground">
          Showing {filteredProducts.length} of {allProducts.length} products
        </p>
      )}

      {/* Product rows */}
      <div className="space-y-3">
        {filteredProducts.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No products match your search or filter.</div>
        )}
        {filteredProducts.map(product => {
          const rec = records[product.product_name];
          const overallStatus = rec?.overall_status || 'not_started';
          const st = STATUS_STYLE[overallStatus];
          const currentStep = rec ? getCurrentStep(rec) : 0;
          const hasStarted = rec && overallStatus !== 'not_started';
          const isSelected = selectedProducts.has(product.product_name);

          return (
            <motion.div key={product.product_name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border bg-card overflow-hidden transition-all ${isSelected ? 'border-primary/50 ring-1 ring-primary/20' : st.border}`}>
              <div className="p-5 flex items-start gap-4 flex-wrap">
                {/* Checkbox */}
                <button onClick={() => toggleSelect(product.product_name)} className="mt-1 shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4" />}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-bold text-foreground">{product.product_name}</h3>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.border} ${st.bg} ${st.color}`}>{st.label}</span>
                    {overallStatus === 'cleared' && <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">🏆 Cleared for Public Launch</span>}
                    {product.category && <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{product.category}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {product.custom_domain && <><span className="text-primary font-mono">{product.custom_domain}</span> · </>}
                    {product.base44_url}
                  </p>

                  {/* Progress timeline */}
                  <ClearanceProgressTimeline record={rec} />
                </div>

                <div className="flex gap-2 shrink-0">
                  {!hasStarted ? (
                    <Tooltip content="Begin the six-step clearance process for this product">
                      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => openWizard(product)}>
                        <Play className="h-3.5 w-3.5" /> Start Clearance
                      </Button>
                    </Tooltip>
                  ) : overallStatus === 'cleared' ? (
                    <Tooltip content="View the clearance record">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8" onClick={() => openWizard(product)}>
                        <ShieldCheck className="h-3.5 w-3.5" /> View Clearance
                      </Button>
                    </Tooltip>
                  ) : (
                    <Tooltip content={`Continue from Step ${currentStep + 1} of 6`}>
                      <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => openWizard(product)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Continue (Step {currentStep + 1})
                      </Button>
                    </Tooltip>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Wizard overlay */}
      <AnimatePresence>
        {wizardProduct && (
          <ClearanceWizard
            product={wizardProduct}
            record={wizardProduct.record}
            onUpdate={handleWizardUpdate}
            onClose={() => setWizardProduct(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}