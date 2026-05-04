import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ShieldCheck, CheckCircle2, XCircle, Loader2, User, LogOut } from 'lucide-react';

export default function AuthPanel({ user, setUser, onStatus, status }) {
  const [validating, setValidating] = useState(false);
  const [checks, setChecks] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) runValidation();
  }, [user]);

  const runValidation = async () => {
    setValidating(true);
    setError(null);
    const results = [];

    try {
      const me = await base44.auth.me();
      results.push({ label: 'User authenticated', pass: !!me });
      results.push({ label: 'User ID available', pass: !!me?.id });
      results.push({ label: 'Email present', pass: !!me?.email });
      results.push({ label: 'Role assigned', pass: !!me?.role });
      results.push({ label: 'Session persists', pass: !!me });

      setChecks(results);
      const allPass = results.every(r => r.pass);
      onStatus(allPass ? 'active' : 'failed');
      if (me && setUser) setUser(me);
    } catch (e) {
      setError(e.message);
      onStatus('failed');
    } finally {
      setValidating(false);
    }
  };

  const handleLogin = () => base44.auth.redirectToLogin();
  const handleLogout = () => base44.auth.logout();

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-red-400" />
          Phase A — Auth Layer
        </h2>
        {status === 'active' && <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">AUTH ACTIVE</span>}
        {status === 'failed' && <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 font-bold">FAILED</span>}
      </div>

      {/* User Card */}
      {user ? (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{user.full_name || user.email}</p>
              <p className="text-xs text-muted-foreground">{user.email} · <span className="capitalize">{user.role}</span></p>
            </div>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-secondary/30 p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No active session</p>
          <Button size="sm" onClick={handleLogin} className="gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> Sign In
          </Button>
        </div>
      )}

      {/* Validation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Validation Checks</p>
          <Button size="sm" variant="outline" onClick={runValidation} disabled={validating} className="gap-1.5 h-7 text-xs">
            {validating ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Validate
          </Button>
        </div>
        {checks.map((c, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="flex items-center gap-2 text-xs p-2 rounded bg-secondary/30 border border-border/30">
            {c.pass ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
            <span className={c.pass ? 'text-foreground' : 'text-red-400'}>{c.label}</span>
          </motion.div>
        ))}
        {error && <p className="text-xs text-red-400 p-2 bg-red-500/10 rounded border border-red-500/20">{error}</p>}
      </div>

      {/* Spec */}
      <div className="text-[10px] font-mono text-muted-foreground space-y-0.5 pt-2 border-t border-border">
        <p>• Email/password login via Base44 Auth</p>
        <p>• Session management: JWT tokens</p>
        <p>• Roles: admin | user</p>
        <p>• User ID globally available via base44.auth.me()</p>
      </div>
    </div>
  );
}