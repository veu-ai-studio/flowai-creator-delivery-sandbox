import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Users, Send, Circle, MessageCircle, Copy, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const COLORS = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];

function getColor(email) {
  let hash = 0;
  for (const c of (email || '')) hash = (hash * 31 + c.charCodeAt(0)) % COLORS.length;
  return COLORS[hash];
}

function Avatar({ name, email, size = 'sm' }) {
  const initials = (name || email || '?').slice(0, 2).toUpperCase();
  return (
    <div className={`${getColor(email)} ${size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs'} rounded-full flex items-center justify-center text-white font-bold shrink-0`}>
      {initials}
    </div>
  );
}

export default function RealtimeCollabPanel() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([
    { id: 1, author: 'System', email: 'system', text: 'Real-time collaboration session started. Share the session link to invite teammates.', ts: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [sessionLink, setSessionLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeUsers] = useState([
    { name: 'You', email: 'you@team.com', status: 'active' },
    { name: 'AI Agent', email: 'agent@flowai', status: 'active' },
  ]);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(u => {
      if (u) setUser(u);
    }).catch(() => {});
    setSessionLink(`${window.location.origin}/pipeline?session=${Math.random().toString(36).slice(2, 10)}`);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const msg = {
      id: Date.now(),
      author: user?.full_name || 'You',
      email: user?.email || 'you@team.com',
      text: input.trim(),
      ts: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msg]);
    setInput('');

    // Simulate AI agent response
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        author: 'AI Agent',
        email: 'agent@flowai',
        text: `Got it! I can help with: "${msg.text.slice(0, 60)}...". Want me to run this through the pipeline?`,
        ts: new Date().toISOString(),
      }]);
    }, 1200);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(sessionLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Session header */}
      <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live Session</span>
          <span className="flex items-center gap-1 text-xs text-emerald-400">
            <Circle className="h-2 w-2 fill-emerald-400" /> Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">{sessionLink}</span>
          <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={copyLink}>
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy Link'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Active users sidebar */}
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Online ({activeUsers.length})</p>
          {activeUsers.map(u => (
            <div key={u.email} className="flex items-center gap-2">
              <div className="relative">
                <Avatar name={u.name} email={u.email} />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-card" />
              </div>
              <div>
                <p className="text-xs font-medium text-foreground">{u.name}</p>
                <p className="text-[10px] text-muted-foreground">{u.status}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chat area */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card flex flex-col" style={{ height: '380px' }}>
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Team Chat</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence initial={false}>
              {messages.map(msg => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5"
                >
                  <Avatar name={msg.author} email={msg.email} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-semibold text-foreground">{msg.author}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{msg.text}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Message the team..."
              className="flex-1 bg-secondary/40 rounded-md border border-border px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
            />
            <Button size="sm" onClick={sendMessage} disabled={!input.trim()} className="gap-1">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}