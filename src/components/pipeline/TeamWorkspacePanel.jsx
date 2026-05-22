import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Trash2, Shield, Eye, Edit3, Check, Loader2, Crown } from 'lucide-react';

const ROLES = [
  { id: 'owner',  label: 'Owner',  icon: Crown,  color: 'text-amber-400', desc: 'Full control' },
  { id: 'editor', label: 'Editor', icon: Edit3,  color: 'text-blue-400',  desc: 'Edit pipelines' },
  { id: 'viewer', label: 'Viewer', icon: Eye,    color: 'text-gray-400',  desc: 'View only' },
];

const ROLE_BADGE = {
  owner:  'bg-amber-500/10 border-amber-500/30 text-amber-400',
  editor: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  viewer: 'bg-gray-500/10 border-gray-500/30 text-gray-400',
};

const ACTIVITIES = [
  { user: 'sarah@team.io',  action: 'ran Research → Deploy pipeline', time: '2m ago' },
  { user: 'marcus@team.io', action: 'updated QA rules config',         time: '14m ago' },
  { user: 'aisha@team.io',  action: 'added 3 stages to My Pipeline',   time: '1h ago' },
  { user: 'james@team.io',  action: 'exported PDF audit report',        time: '3h ago' },
];

export default function TeamWorkspacePanel() {
  const [members, setMembers] = useState([
    { id: '1', email: 'you@workspace.io',    role: 'owner',  joined: '2024-01-10' },
    { id: '2', email: 'sarah@team.io',       role: 'editor', joined: '2024-02-05' },
    { id: '3', email: 'marcus@team.io',      role: 'editor', joined: '2024-03-01' },
    { id: '4', email: 'aisha@team.io',       role: 'viewer', joined: '2024-03-15' },
  ]);
  const [invite, setInvite] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [inviting, setInviting] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('FlowAI Workspace');
  const [editingName, setEditingName] = useState(false);
  const [tab, setTab] = useState('members');
  const [settings, setSettings] = useState({
    'Allow editors to invite members': false,
    'Require approval for new pipelines': true,
    'Enable activity notifications': true,
    'Share audit reports with all members': false,
  });

  const handleInvite = async () => {
    if (!invite.trim() || !invite.includes('@')) return;
    setInviting(true);
    await new Promise(r => setTimeout(r, 800));
    setMembers(prev => [...prev, { id: String(Date.now()), email: invite.trim(), role: inviteRole, joined: new Date().toISOString().slice(0, 10) }]);
    setInvitedEmail(invite.trim());
    setInvite('');
    setInviting(false);
    setTimeout(() => setInvitedEmail(''), 3000);
  };

  const handleRoleChange = (id, newRole) => {
    setMembers(prev => prev.map(m => m.id === id ? { ...m, role: newRole } : m));
  };

  const handleRemove = (id) => {
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const TABS = [
    { id: 'members',  label: 'Members', count: members.length },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        {editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={workspaceName}
              onChange={e => setWorkspaceName(e.target.value)}
              className="h-8 text-sm font-semibold max-w-xs"
              autoFocus
            />
            <Button size="sm" className="h-8 gap-1" onClick={() => setEditingName(false)}>
              <Check className="h-3.5 w-3.5" /> Save
            </Button>
          </div>
        ) : (
          <div className="flex-1">
            <button onClick={() => setEditingName(true)} className="text-base font-bold text-foreground hover:text-primary transition-colors">
              {workspaceName}
            </button>
            <p className="text-xs text-muted-foreground">{members.length} members</p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-secondary/30 border border-border w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
            {t.count && <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.5 rounded-full font-bold">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* Members tab */}
      {tab === 'members' && (
        <div className="space-y-4">
          {/* Invite row */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invite Member</p>
            <div className="flex gap-2 flex-wrap">
              <Input
                value={invite}
                onChange={e => setInvite(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInvite()}
                placeholder="colleague@company.com"
                className="h-9 text-sm flex-1 min-w-[200px]"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value)}
                className="h-9 rounded-lg border border-border bg-secondary/30 text-sm text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ROLES.filter(r => r.id !== 'owner').map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
              <Button size="sm" className="h-9 gap-1.5 shrink-0" onClick={handleInvite} disabled={inviting || !invite.includes('@')}>
                {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Invite
              </Button>
            </div>
            {invitedEmail && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3" /> Invite sent to {invitedEmail}
              </p>
            )}
          </div>

          {/* Member list */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="divide-y divide-border/40">
              {members.map(m => {
                const RoleIcon = ROLES.find(r => r.id === m.role)?.icon || Shield;
                return (
                  <motion.div key={m.id} layout className="flex items-center gap-3 px-4 py-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {m.email[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.email}</p>
                      <p className="text-[10px] text-muted-foreground">Joined {m.joined}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.role === 'owner' ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${ROLE_BADGE.owner}`}>Owner</span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={e => handleRoleChange(m.id, e.target.value)}
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold bg-transparent cursor-pointer focus:outline-none ${ROLE_BADGE[m.role]}`}
                        >
                          {ROLES.filter(r => r.id !== 'owner').map(r => (
                            <option key={r.id} value={r.id} className="bg-card text-foreground">{r.label}</option>
                          ))}
                        </select>
                      )}
                      {m.role !== 'owner' && (
                        <button onClick={() => handleRemove(m.id)} className="h-6 w-6 rounded flex items-center justify-center hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent Activity</p>
          <div className="space-y-3">
            {ACTIVITIES.map((a, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0 mt-0.5">
                  {a.user[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground">
                    <span className="font-semibold">{a.user.split('@')[0]}</span>
                    <span className="text-muted-foreground"> {a.action}</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">{a.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Settings tab */}
      {tab === 'settings' && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Workspace Settings</p>
          <div className="space-y-3">
            {Object.keys(settings).map(label => (
              <label key={label} className="flex items-center gap-3 cursor-pointer group">
                <div
                  onClick={() => setSettings(prev => ({ ...prev, [label]: !prev[label] }))}
                  className={`h-5 w-9 rounded-full relative transition-colors ${settings[label] ? 'bg-primary' : 'bg-secondary'}`}
                >
                  <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${settings[label] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className="text-sm text-foreground group-hover:text-foreground/90">{label}</span>
              </label>
            ))}
          </div>
          <Button size="sm" className="mt-2">Save Settings</Button>
        </div>
      )}
    </div>
  );
}