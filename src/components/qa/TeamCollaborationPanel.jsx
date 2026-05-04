import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, MessageSquare, Send, Loader2, Plus } from 'lucide-react';

export default function TeamCollaborationPanel({ reportId, workspaceId, url }) {
  const [workspace, setWorkspace] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const me = await base44.auth.me();
        setUser(me);
        
        if (workspaceId) {
          const ws = await base44.entities.TeamWorkspace.get(workspaceId);
          setWorkspace(ws);
          
          const comms = await base44.entities.AuditComment.filter({ report_id: reportId }, '-created_date');
          setComments(comms);
        }
      } catch (error) {
        console.error('Collab init error:', error);
      }
    };
    init();
  }, [reportId, workspaceId]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;
    setLoading(true);
    try {
      await base44.entities.AuditComment.create({
        report_id: reportId,
        workspace_id: workspaceId,
        author_email: user.email,
        content: newComment,
      });
      setComments(await base44.entities.AuditComment.filter({ report_id: reportId }, '-created_date'));
      setNewComment('');
    } catch (error) {
      console.error('Comment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !workspace) return;
    try {
      const updated = {
        ...workspace,
        members: [...workspace.members, { email: newMemberEmail, role: 'viewer' }],
      };
      await base44.entities.TeamWorkspace.update(workspaceId, updated);
      setWorkspace(updated);
      setNewMemberEmail('');
      setShowAddMember(false);
    } catch (error) {
      console.error('Add member error:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border bg-card p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Team Workspace
        </h2>
        <Button size="sm" className="gap-1.5 h-8" onClick={() => setShowAddMember(!showAddMember)}>
          <Plus className="h-3 w-3" />
          Add Member
        </Button>
      </div>

      {/* Add member form */}
      <AnimatePresence>
        {showAddMember && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50"
          >
            <Input
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="team@example.com"
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" onClick={handleAddMember} className="h-8">Invite</Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team members */}
      {workspace && (
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Members ({workspace.members.length})</p>
          {workspace.members.map((member, i) => (
            <div key={i} className="text-xs p-2 rounded bg-secondary/30 border border-border/50 flex justify-between items-center">
              <span className="text-foreground">{member.email}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{member.role}</span>
            </div>
          ))}
        </div>
      )}

      {/* Comments */}
      <div className="border-t border-border pt-4 space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Discussion ({comments.length})</span>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {comments.map((comment, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-secondary/30 border border-border/50 p-3 space-y-1"
            >
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-foreground">{comment.author_email}</span>
                {comment.resolved && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">✓ Resolved</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{comment.content}</p>
            </motion.div>
          ))}
        </div>

        {/* Add comment */}
        <div className="flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
            placeholder="Add comment..."
            className="h-8 text-xs flex-1"
            disabled={loading}
          />
          <Button size="icon" className="h-8 w-8" onClick={handleAddComment} disabled={loading || !newComment.trim()}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}