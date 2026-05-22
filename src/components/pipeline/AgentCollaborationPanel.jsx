import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Brain, Send, Loader2, RefreshCw } from 'lucide-react';

const AGENTS = [
  { key: 'planner',  label: 'Planner',  color: 'text-primary',    bg: 'bg-primary/10'    },
  { key: 'research', label: 'Research', color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
  { key: 'design',   label: 'Design',   color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { key: 'build',    label: 'Build',    color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { key: 'qa',       label: 'QA',       color: 'text-red-400',    bg: 'bg-red-500/10'    },
  { key: 'deploy',   label: 'Deploy',   color: 'text-emerald-400',bg: 'bg-emerald-500/10'},
];

function AgentAvatar({ agentKey, size = 'sm' }) {
  const cfg = AGENTS.find(a => a.key === agentKey) || AGENTS[0];
  const sz = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-xs';
  return (
    <div className={`${sz} rounded-full ${cfg.bg} border border-current/20 flex items-center justify-center font-bold shrink-0 ${cfg.color}`}>
      {cfg.label[0]}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const cfg = AGENTS.find(a => a.key === msg.agent);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {!isUser && <AgentAvatar agentKey={msg.agent || 'planner'} />}
      <div className={`max-w-[80%] rounded-xl px-3 py-2 space-y-1 ${isUser ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 border border-border'}`}>
        {!isUser && cfg && <p className={`text-[9px] font-bold uppercase tracking-wide ${cfg.color}`}>{cfg.label}</p>}
        <p className="text-xs leading-relaxed">{msg.content}</p>
        <p className="text-[9px] opacity-50">{new Date(msg.ts).toLocaleTimeString()}</p>
      </div>
    </motion.div>
  );
}

export default function AgentCollaborationPanel() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [activeAgents, setActiveAgents] = useState(['planner', 'research', 'build']);
  const [topic, setTopic] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleAgent = (key) => {
    setActiveAgents(prev => prev.includes(key) ? prev.filter(a => a !== key) : [...prev, key]);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input, ts: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    const userInput = input;
    setInput('');
    setRunning(true);

    try {
      // Each selected agent responds to the message
      const context = messages.slice(-4).map(m => `${m.agent || 'user'}: ${m.content}`).join('\n');
      const res = await base44.functions.invoke('multiAgent', {
        input: `Collaborative discussion topic: "${topic || userInput}"\nLatest message: "${userInput}"\nConversation so far:\n${context}`,
        agents: activeAgents,
        parallel: true,
      });

      const agentLog = res?.data?.agentLog || [];
      // Turn each agent result into a chat message
      for (const entry of agentLog) {
        const reply = entry.result?.summary || entry.result?.output || '...';
        setMessages(prev => [...prev, {
          role: 'agent',
          agent: entry.agentKey,
          content: reply,
          ts: new Date().toISOString(),
          simulated: entry.simulated,
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'agent', agent: 'planner', content: `Error: ${e.message}`, ts: new Date().toISOString() }]);
    } finally {
      setRunning(false);
    }
  };

  const clearChat = () => setMessages([]);

  const kickoffCollaboration = async () => {
    if (!topic.trim()) return;
    setMessages([]);
    setInput(topic);
    setTopic('');
    await sendMessage();
  };

  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Agent Collaboration
        </h2>
        <Button size="sm" variant="outline" onClick={clearChat} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Clear
        </Button>
      </div>

      {/* Agent selector */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-muted-foreground">Active agents:</span>
        {AGENTS.map(({ key, label, color, bg }) => (
          <button key={key} onClick={() => toggleAgent(key)}
            className={`text-[10px] font-bold px-2 py-1 rounded-full border transition-all ${
              activeAgents.includes(key) ? `${color} ${bg} border-current/30` : 'text-muted-foreground border-border'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Kickoff topic */}
      {messages.length === 0 && (
        <div className="flex gap-2">
          <Input
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && kickoffCollaboration()}
            placeholder='Start a topic: "Design a subscription billing system"'
            className="h-9 text-sm"
          />
          <Button size="sm" onClick={kickoffCollaboration} disabled={running || !topic.trim()} className="gap-1.5 shrink-0">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
            Start
          </Button>
        </div>
      )}

      {/* Active agents avatars row */}
      {activeAgents.length > 0 && (
        <div className="flex items-center gap-1.5">
          {activeAgents.map(key => <AgentAvatar key={key} agentKey={key} size="sm" />)}
          <span className="text-[10px] text-muted-foreground ml-1">{activeAgents.length} agents in session</span>
        </div>
      )}

      {/* Chat window */}
      <div className="h-72 overflow-y-auto space-y-3 p-3 rounded-lg bg-secondary/10 border border-border/50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-muted-foreground">Start a topic to begin agent collaboration</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
        </AnimatePresence>
        {running && (
          <div className="flex gap-2 items-center text-xs text-muted-foreground">
            <div className="flex gap-1">
              {activeAgents.map(k => <AgentAvatar key={k} agentKey={k} size="sm" />)}
            </div>
            <Loader2 className="h-3 w-3 animate-spin" /> Agents collaborating...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      {messages.length > 0 && (
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !running && sendMessage()}
            placeholder="Ask the agents a follow-up..."
            className="h-9 text-sm"
            disabled={running}
          />
          <Button size="sm" onClick={sendMessage} disabled={running || !input.trim()} className="gap-1.5 shrink-0">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          </Button>
        </div>
      )}
    </div>
  );
}