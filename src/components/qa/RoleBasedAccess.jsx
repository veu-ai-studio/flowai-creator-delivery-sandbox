import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Plus, Trash2, Check, Lock, Eye, Edit3, Settings } from 'lucide-react';
import { asArray } from '@/lib/uiDataGuards';

const ROLES = {
  admin: {
    label: 'Admin',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/30',
    icon: Settings,
    permissions: ['run_audit', 'view_reports', 'edit_config', 'delete_reports', 'manage_users', 'export_data'],
  },
  editor: {
    label: 'Editor',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/30',
    icon: Edit3,
    permissions: ['run_audit', 'view_reports', 'edit_config', 'export_data'],
  },
  viewer: {
    label: 'Viewer',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
    icon: Eye,
    permissions: ['view_reports'],
  },
};

const ALL_PERMISSIONS = [
  { key: 'run_audit', label: 'Run Audits', desc: 'Trigger new audit scans' },
  { key: 'view_reports', label: 'View Reports', desc: 'Read audit results & history' },
  { key: 'edit_config', label: 'Edit Configuration', desc: 'Modify scoring weights & rules' },
  { key: 'delete_reports', label: 'Delete Reports', desc: 'Remove historical audit data' },
  { key: 'manage_users', label: 'Manage Users', desc: 'Add/remove team members & roles' },
  { key: 'export_data', label: 'Export Data', desc: 'Download PDFs & JSON reports' },
];

export default function RoleBasedAccess() {
  const [currentUser, setCurrentUser] = useState(null);
  const [members, setMembers] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [adding, setAdding] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Load saved members from local storage (no dedicated entity needed)
        const saved = localStorage.getItem('qa_rbac_members');
        if (saved) setMembers(asArray(JSON.parse(saved)));
        else {
          // Seed with current user as admin
          const initial = [{ email: user.email, role: 'admin', name: user.full_name || user.email }];
          setMembers(initial);
          localStorage.setItem('qa_rbac_members', JSON.stringify(initial));
        }
      } catch (e) {
        console.error('RBAC init error:', e);
      }
    };
    init();
  }, []);

  const saveMembers = (updated) => {
    setMembers(updated);
    localStorage.setItem('qa_rbac_members', JSON.stringify(updated));
  };

  const handleAddMember = () => {
    if (!newEmail.trim()) return;
    const updated = [...safeMembers, { email: newEmail.trim(), role: newRole, name: newEmail.trim() }];
    saveMembers(updated);
    setNewEmail('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRemoveMember = (email) => {
    if (email === currentUser?.email) return; // can't remove yourself
    saveMembers(safeMembers.filter(m => m.email !== email));
  };

  const handleRoleChange = (email, newRoleVal) => {
    saveMembers(safeMembers.map(m => m.email === email ? { ...m, role: newRoleVal } : m));
  };

  const safeMembers = asArray(members);
  const currentUserRole = safeMembers.find(m => m.email === currentUser?.email)?.role || 'viewer';
  const currentPerms = ROLES[currentUserRole]?.permissions || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-5"
    >
      <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Shield className="h-5 w-5 text-primary" />
        Role-Based Access Control
      </h2>

      {/* Current user badge */}
      {currentUser && (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${ROLES[currentUserRole]?.bg}`}>
          <div className={`p-1.5 rounded ${ROLES[currentUserRole]?.bg}`}>
            {(() => { const Icon = ROLES[currentUserRole]?.icon || Lock; return <Icon className={`h-4 w-4 ${ROLES[currentUserRole]?.color}`} />; })()}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{currentUser.full_name || currentUser.email}</p>
            <p className={`text-xs ${ROLES[currentUserRole]?.color}`}>Your role: {ROLES[currentUserRole]?.label}</p>
          </div>
        </div>
      )}

      {/* Permissions summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Permissions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_PERMISSIONS.map((perm) => {
            const allowed = currentPerms.includes(perm.key);
            return (
              <div
                key={perm.key}
                className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${allowed ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-secondary/30 border-border/50 text-muted-foreground'}`}
              >
                {allowed ? <Check className="h-3 w-3 shrink-0" /> : <Lock className="h-3 w-3 shrink-0" />}
                <span>{perm.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Team members */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Team Members ({safeMembers.length})</p>
        <div className="space-y-2">
          {safeMembers.map((member) => {
            const roleInfo = ROLES[member.role];
            const RoleIcon = roleInfo?.icon || Lock;
            return (
              <motion.div
                key={member.email}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border/50"
              >
                <RoleIcon className={`h-4 w-4 shrink-0 ${roleInfo?.color}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{member.name || member.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.email, e.target.value)}
                  disabled={member.email === currentUser?.email}
                  className="h-7 text-xs bg-secondary border border-border rounded px-2 text-foreground focus:outline-none disabled:opacity-50"
                >
                  {Object.entries(ROLES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
                {member.email !== currentUser?.email && (
                  <button
                    onClick={() => handleRemoveMember(member.email)}
                    className="p-1 hover:bg-destructive/20 rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Add member */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
            placeholder="user@company.com"
            className="h-8 text-xs flex-1"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="h-8 text-xs bg-secondary border border-border rounded px-2 text-foreground focus:outline-none"
          >
            {Object.entries(ROLES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>
          <Button size="sm" className="h-8 gap-1" onClick={handleAddMember} disabled={!newEmail.trim()}>
            {saved ? <Check className="h-3 w-3 text-emerald-400" /> : <Plus className="h-3 w-3" />}
            Add
          </Button>
        </div>
      </div>

      {/* Role legend */}
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role Definitions</p>
        <div className="space-y-2">
          {Object.entries(ROLES).map(([key, role]) => {
            const Icon = role.icon;
            return (
              <div key={key} className={`p-2.5 rounded-lg border ${role.bg} flex items-start gap-2`}>
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${role.color}`} />
                <div>
                  <p className={`text-xs font-semibold ${role.color}`}>{role.label}</p>
                  <p className="text-[10px] text-muted-foreground">{role.permissions.join(', ')}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
