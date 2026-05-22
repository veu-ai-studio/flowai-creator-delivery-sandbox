import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { MessageSquare, Send, X, Loader2, Smile, Reply, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

const REACTIONS = ["👍", "❤️", "🚀", "💡", "⚠️", "✅"];

// Generate a stable color from an email string
function avatarColor(email = "") {
  const colors = ["bg-blue-500/30 text-blue-300", "bg-violet-500/30 text-violet-300", "bg-emerald-500/30 text-emerald-300", "bg-amber-500/30 text-amber-300", "bg-pink-500/30 text-pink-300", "bg-cyan-500/30 text-cyan-300"];
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) & 0xffff;
  return colors[h % colors.length];
}

function Avatar({ name, email, size = "sm" }) {
  const initials = (name || email || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  const cls = avatarColor(email);
  const dim = size === "sm" ? "h-5 w-5 text-[9px]" : "h-7 w-7 text-xs";
  return (
    <div className={`${dim} rounded-full ${cls} flex items-center justify-center font-bold shrink-0`}>
      {initials}
    </div>
  );
}

function ReactionBar({ commentId, reactions = {}, currentUserEmail, onReact }) {
  const [show, setShow] = useState(false);
  const grouped = Object.entries(reactions).reduce((acc, [emoji, users]) => {
    if (users.length > 0) acc[emoji] = users;
    return acc;
  }, {});

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Object.entries(grouped).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact(commentId, emoji)}
          className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors flex items-center gap-0.5 ${
            users.includes(currentUserEmail)
              ? "bg-primary/15 border-primary/30 text-primary"
              : "bg-secondary/50 border-border text-muted-foreground hover:border-primary/30"
          }`}
          title={users.join(", ")}
        >
          {emoji} {users.length}
        </button>
      ))}
      <div className="relative">
        <button
          onClick={() => setShow((v) => !v)}
          className="text-[10px] px-1.5 py-0.5 rounded-full border border-border/50 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
        >
          <Smile className="h-2.5 w-2.5" />
        </button>
        {show && (
          <div className="absolute bottom-6 left-0 bg-popover border border-border rounded-lg p-1.5 flex gap-1 z-30 shadow-xl">
            {REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact(commentId, emoji); setShow(false); }}
                className="text-sm hover:scale-125 transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CollaborationPanel({ flowId, onClose }) {
  const [comments, setComments] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [user, setUser] = useState(null);
  const [replyTo, setReplyTo] = useState(null); // { id, author_name, message }
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const scrollBottom = () => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

  const fetchComments = async () => {
    if (!flowId) { setLoading(false); return; }
    const data = await base44.entities.FlowComment.filter({ flow_id: flowId }, "created_date", 200);
    setComments(data);
    setLoading(false);
    scrollBottom();
  };

  useEffect(() => {
    fetchComments();
    const unsub = base44.entities.FlowComment.subscribe((event) => {
      if (event.data?.flow_id !== flowId) return;
      if (event.type === "create") { setComments((prev) => [...prev, event.data]); scrollBottom(); }
      if (event.type === "delete") setComments((prev) => prev.filter((c) => c.id !== event.id));
      if (event.type === "update") setComments((prev) => prev.map((c) => c.id === event.id ? event.data : c));
    });
    return unsub;
  }, [flowId]);

  const handleSend = async () => {
    if (!message.trim() || !flowId) return;
    setSending(true);
    await base44.entities.FlowComment.create({
      flow_id: flowId,
      message: message.trim(),
      author_name: user?.full_name || user?.email || "Anonymous",
      author_email: user?.email || "",
      reply_to_id: replyTo?.id || null,
      reply_to_preview: replyTo?.message?.slice(0, 60) || null,
      reactions: {},
    });
    setMessage("");
    setReplyTo(null);
    setSending(false);
    scrollBottom();
  };

  const handleDelete = async (id) => {
    await base44.entities.FlowComment.delete(id);
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleReact = async (commentId, emoji) => {
    const comment = comments.find((c) => c.id === commentId);
    if (!comment || !user?.email) return;
    const reactions = JSON.parse(JSON.stringify(comment.reactions || {}));
    const users = reactions[emoji] || [];
    const idx = users.indexOf(user.email);
    if (idx === -1) users.push(user.email);
    else users.splice(idx, 1);
    reactions[emoji] = users;
    await base44.entities.FlowComment.update(commentId, { reactions });
    setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, reactions } : c));
  };

  const startReply = (comment) => {
    setReplyTo({ id: comment.id, author_name: comment.author_name, message: comment.message });
    inputRef.current?.focus();
  };

  // Unique authors currently present (last 30 comments)
  const recentAuthors = [...new Map(
    comments.slice(-30).map((c) => [c.author_email, { name: c.author_name, email: c.author_email }])
  ).values()].slice(0, 5);

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Collaboration</h3>
          {comments.length > 0 && (
            <span className="text-[10px] bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-medium">
              {comments.length}
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Active collaborators */}
      {recentAuthors.length > 1 && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2 shrink-0">
          <div className="flex -space-x-1.5">
            {recentAuthors.map((a) => (
              <Avatar key={a.email} name={a.name} email={a.email} />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">
            {recentAuthors.length} collaborator{recentAuthors.length > 1 ? "s" : ""}
          </span>
        </div>
      )}

      {!flowId ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-xs text-muted-foreground text-center">Save the flow first to enable collaboration.</p>
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {comments.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8 leading-relaxed">
                No comments yet.<br />Be the first to leave a note!
              </p>
            )}
            <AnimatePresence>
              {comments.map((c) => {
                const isMe = c.author_email === user?.email;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`group flex flex-col gap-1 ${isMe ? "items-end" : "items-start"}`}
                  >
                    {/* Author */}
                    <div className={`flex items-center gap-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                      <Avatar name={c.author_name} email={c.author_email} />
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {isMe ? "You" : (c.author_name || "Anonymous")}
                      </span>
                    </div>

                    {/* Reply context */}
                    {c.reply_to_preview && (
                      <div className={`text-[10px] text-muted-foreground/60 border-l-2 border-border pl-2 italic max-w-[85%] truncate ${isMe ? "self-end" : ""}`}>
                        ↩ {c.reply_to_preview}
                      </div>
                    )}

                    {/* Bubble */}
                    <div className={`relative max-w-[90%] rounded-xl px-3 py-2 text-xs leading-relaxed ${isMe ? "bg-primary/15 text-foreground" : "bg-secondary/60 text-foreground"}`}>
                      {c.message}

                      {/* Actions (hover) */}
                      <div className={`absolute top-1 ${isMe ? "left-1" : "right-1"} hidden group-hover:flex items-center gap-0.5 bg-card border border-border rounded-md px-1 py-0.5 shadow-md`}>
                        <button onClick={() => startReply(c)} className="text-muted-foreground hover:text-primary transition-colors" title="Reply">
                          <Reply className="h-2.5 w-2.5" />
                        </button>
                        {isMe && (
                          <button onClick={() => handleDelete(c.id)} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete">
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Reactions */}
                    <ReactionBar
                      commentId={c.id}
                      reactions={c.reactions || {}}
                      currentUserEmail={user?.email}
                      onReact={handleReact}
                    />

                    <span className="text-[9px] text-muted-foreground/50">
                      {c.created_date ? formatDistanceToNow(new Date(c.created_date), { addSuffix: true }) : ""}
                    </span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-border shrink-0 space-y-2">
            {/* Reply indicator */}
            {replyTo && (
              <div className="flex items-center gap-2 text-[10px] bg-secondary/50 rounded-lg px-2 py-1.5">
                <Reply className="h-2.5 w-2.5 text-primary shrink-0" />
                <span className="text-muted-foreground truncate flex-1">
                  Replying to <span className="text-foreground font-medium">{replyTo.author_name}</span>: {replyTo.message.slice(0, 40)}
                </span>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder={replyTo ? "Write a reply…" : "Add a comment…"}
                className="flex-1 text-xs bg-secondary/50 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={handleSend}
                disabled={!message.trim() || sending}
              >
                {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}