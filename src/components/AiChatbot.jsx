import { isDemoMode } from '../lib/demo';
import '../styles/features/AiChatbot.css';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus,
  PanelLeft,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  User,
  AlertCircle,
  MessageSquare,
  Search,
  X,
  Sparkles,
  ChevronDown,
  ArrowUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import hamsterLogo from '../assets/Hamster.webp';

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const MAX_CTX = 8;

const SUGGESTIONS = [
  { text: 'Help me plan my study week' },
  { text: 'How can I prepare for my hematology rotation?' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => Date.now();
const trunc = (s, n = 46) => (s.length > n ? s.slice(0, n) + '…' : s);
const fmt = (ts) =>
  new Date(ts).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

function groupConvs(convs) {
  const todayMs = new Date().setHours(0, 0, 0, 0);
  const yesterMs = todayMs - 86400000;
  const weekMs = todayMs - 7 * 86400000;
  const g = { today: [], yesterday: [], week: [], older: [] };
  convs.forEach((c) => {
    const d = new Date(c.updatedAt).setHours(0, 0, 0, 0);
    if (d >= todayMs) g.today.push(c);
    else if (d >= yesterMs) g.yesterday.push(c);
    else if (d >= weekMs) g.week.push(c);
    else g.older.push(c);
  });
  return g;
}

/* ─── Markdown renderer ───────────────────────────────────────────────────────── */
function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*') && p.endsWith('*')) return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith('`') && p.endsWith('`'))
      return (
        <code key={i} className="pip-ic">
          {p.slice(1, -1)}
        </code>
      );
    return p;
  });
}

function MD({ content }) {
  const lines = content.split('\n');
  const out = [];
  let i = 0,
    listBuf = [],
    listType = null;

  const flush = () => {
    if (!listBuf.length) return;
    const Tag = listType === 'ul' ? 'ul' : 'ol';
    out.push(
      <Tag key={`l${i}`} className="pip-list">
        {listBuf}
      </Tag>,
    );
    listBuf = [];
    listType = null;
  };

  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) {
      flush();
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code.push(lines[i]);
        i++;
      }
      out.push(
        <div key={`cb${i}`} className="pip-cb">
          {lang && <div className="pip-cb-lang">{lang}</div>}
          <pre>
            <code>{code.join('\n')}</code>
          </pre>
        </div>,
      );
    } else if (l.startsWith('### ')) {
      flush();
      out.push(
        <h3 key={i} className="pip-h3">
          {parseInline(l.slice(4))}
        </h3>,
      );
    } else if (l.startsWith('## ')) {
      flush();
      out.push(
        <h2 key={i} className="pip-h2">
          {parseInline(l.slice(3))}
        </h2>,
      );
    } else if (l.startsWith('# ')) {
      flush();
      out.push(
        <h1 key={i} className="pip-h1">
          {parseInline(l.slice(2))}
        </h1>,
      );
    } else if (/^[-*] /.test(l)) {
      if (listType !== 'ul') {
        flush();
        listType = 'ul';
      }
      listBuf.push(<li key={i}>{parseInline(l.slice(2))}</li>);
    } else if (/^\d+\. /.test(l)) {
      if (listType !== 'ol') {
        flush();
        listType = 'ol';
      }
      listBuf.push(<li key={i}>{parseInline(l.replace(/^\d+\. /, ''))}</li>);
    } else if (l === '---') {
      flush();
      out.push(<hr key={i} className="pip-hr" />);
    } else if (l.trim() === '') {
      flush();
      out.push(<div key={i} className="pip-spacer" />);
    } else {
      flush();
      out.push(
        <p key={i} className="pip-p">
          {parseInline(l)}
        </p>,
      );
    }
    i++;
  }
  flush();
  return <div className="pip-md">{out}</div>;
}

/* ─── Pip Avatar ──────────────────────────────────────────────────────────────── */
function PipAvatar({ size = 34 }) {
  return (
    <div className="pip-avatar-wrap" style={{ width: size, height: size }}>
      <img
        src={hamsterLogo}
        alt="Pip"
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </div>
  );
}

/* ─── Typing indicator ────────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="pip-row bot">
      <PipAvatar size={34} />
      <div className="pip-bubble bot pip-typing-bubble">
        <span className="pip-typing-label">Pip is thinking</span>
        <div className="pip-typing-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

/* ─── Empty / welcome state ───────────────────────────────────────────────────── */
function EmptyState({ onSend }) {
  return (
    <div className="pip-empty">
      {/* Ambient background orbs */}
      <div className="pip-orb pip-orb-1" />
      <div className="pip-orb pip-orb-2" />
      <div className="pip-orb pip-orb-3" />

      <div className="pip-empty-hero">
        <img src={hamsterLogo} alt="Pip" className="pip-hero-img" />
      </div>

      <div className="pip-empty-text">
        <h2 className="pip-empty-h">
          Hi! I'm <span className="pip-name-accent">Pip</span> 👋
        </h2>
        <p className="pip-empty-sub">
          Your little study companion for lab rotations, revision, and a bit of encouragement.
        </p>
      </div>

      <div className="pip-chips">
        {SUGGESTIONS.map((s) => (
          <button key={s.text} className="pip-chip" onClick={() => onSend(s.text)}>
            <span className="pip-chip-icon">{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Message Bubble ──────────────────────────────────────────────────────────── */
function Bubble({ msg, copied, onCopy, showRegen, onRegen, loading }) {
  const bot = msg.role === 'assistant';
  return (
    <div className={`pip-row ${bot ? 'bot' : 'user'}`}>
      {bot && <PipAvatar size={34} />}
      <div className="pip-bwrap">
        <div className={`pip-bubble ${bot ? 'bot' : 'user'}`}>
          {bot ? <MD content={msg.content} /> : <span>{msg.content}</span>}
        </div>
        <div className="pip-acts">
          <span className="pip-ts">{fmt(msg.ts)}</span>
          <button className="pip-act" onClick={() => onCopy(msg.content, msg.id)} title="Copy">
            {copied === msg.id ? (
              <Check size={11} strokeWidth={2.5} />
            ) : (
              <Copy size={11} strokeWidth={2} />
            )}
          </button>
          {showRegen && !loading && (
            <button className="pip-act regen" onClick={onRegen} title="Regenerate response">
              <RefreshCw size={11} strokeWidth={2} />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      </div>
      {!bot && (
        <div className="pip-user-av">
          <User size={15} strokeWidth={2} />
        </div>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────────────────────── */
export default function AIChatbot() {
  const [convs, setConvs] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(null);
  const [search, setSearch] = useState('');
  const [sbOpen, setSbOpen] = useState(false);
  const [sbCollapsed, setSbCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [kbHeight, setKbHeight] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const endRef = useRef(null);
  const taRef = useRef(null);
  const msgsRef = useRef(null);

  /* ── Auth ── */
  const getUserId = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
  }, []);

  /* ── Load conversations — now includes DB row id for each message ── */
  const loadConversations = useCallback(async () => {
    try {
      const userId = await getUserId();
      const { data: messages, error: msgErr } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, role, content, created_at') // ← include id
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      const convMap = new Map();
      messages?.forEach((msg) => {
        const cid = msg.conversation_id;
        if (!convMap.has(cid)) {
          convMap.set(cid, {
            id: cid,
            title: 'New conversation',
            messages: [],
            updatedAt: new Date(msg.created_at).getTime(),
            createdAt: new Date(msg.created_at).getTime(),
          });
        }
        const conv = convMap.get(cid);
        conv.messages.push({
          id: `${cid}_${msg.created_at}`,
          dbId: msg.id, // ← store DB row id for regenerate
          role: msg.role,
          content: msg.content,
          ts: new Date(msg.created_at).getTime(),
        });
        conv.updatedAt = Math.max(conv.updatedAt, new Date(msg.created_at).getTime());
        if (conv.title === 'New conversation' && msg.role === 'user') {
          conv.title = trunc(msg.content);
        }
      });

      const arr = Array.from(convMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      setConvs(arr);
      setActiveId((prev) => (!prev && arr.length > 0 ? arr[0].id : prev));
    } catch (err) {
      console.error('loadConversations:', err);
      setError('Failed to load chat history.');
    }
  }, [getUserId]);

  /* ── Save message — returns the new DB row id ── */
  const saveMessage = useCallback(
    async (conversationId, role, content) => {
      const userId = await getUserId();
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{ user_id: userId, conversation_id: conversationId, role, content }])
        .select('id')
        .single();
      if (error) throw error;
      return data?.id; // ← return DB id
    },
    [getUserId],
  );

  /* ── New conversation ── */
  const newChat = useCallback(() => {
    const newId = `conv_${uid()}`;
    setConvs((prev) => [
      {
        id: newId,
        title: 'New conversation',
        messages: [],
        createdAt: now(),
        updatedAt: now(),
      },
      ...prev,
    ]);
    setActiveId(newId);
    setInput('');
    setError(null);
    setSbOpen(false);
    setTimeout(() => taRef.current?.focus(), 120);
  }, []);

  /* ── Delete conversation ── */
  const deleteConv = useCallback(
    async (id, e) => {
      e?.stopPropagation();
      try {
        const userId = await getUserId();
        await supabase
          .from('chat_messages')
          .delete()
          .eq('user_id', userId)
          .eq('conversation_id', id);
        setConvs((prev) => {
          const next = prev.filter((c) => c.id !== id);
          if (id === activeId) setActiveId(next[0]?.id || null);
          return next;
        });
      } catch (err) {
        console.error('deleteConv:', err);
        setError('Failed to delete conversation.');
      }
    },
    [getUserId, activeId],
  );

  /* ── Select conversation ── */
  const selectConv = useCallback((id) => {
    setActiveId(id);
    setError(null);
    setSbOpen(false);
    setTimeout(() => taRef.current?.focus(), 120);
  }, []);

  /* ── Copy message ── */
  const copyMsg = useCallback((content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  /* ── Auto-resize textarea ── */
  const resizeTA = useCallback(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + 'px';
  }, []);

  /* ── Groq API call ── */
  const callGroq = useCallback(async (history) => {
    if (isDemoMode())
      return '♡ **A little hello from Pip**\n\nThis is a sample response in the demo, so you can explore the conversation interface.\n\nFor a gentler study week, choose one topic at a time, jot down questions for your instructor, and leave room for breaks. You don’t need to figure everything out today.\n\nSign in to a real account to use live study chat when it is configured.';
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Please sign in again to chat with Pip.');
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({
        messages: history.slice(-MAX_CTX).map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Pip couldn’t connect. Please try again.');
    return data.content;
  }, []);

  /* ── Send message ── */
  const sendMessage = useCallback(
    async (textArg) => {
      const text = (textArg !== undefined ? textArg : input).trim();
      if (!text || loading) return;

      let cid = activeId;
      if (!cid) {
        cid = `conv_${uid()}`;
        setConvs((prev) => [
          {
            id: cid,
            title: trunc(text),
            messages: [],
            createdAt: now(),
            updatedAt: now(),
          },
          ...prev,
        ]);
        setActiveId(cid);
      }

      const tempUserMsg = { id: uid(), dbId: null, role: 'user', content: text, ts: now() };
      setConvs((prev) =>
        prev.map((c) =>
          c.id !== cid
            ? c
            : {
                ...c,
                messages: [...c.messages, tempUserMsg],
                title: c.messages.length === 0 ? trunc(text) : c.title,
                updatedAt: now(),
              },
        ),
      );
      setInput('');
      setLoading(true);
      setError(null);
      if (taRef.current) taRef.current.style.height = 'auto';

      try {
        // Save user message and get its DB id
        const userDbId = await saveMessage(cid, 'user', text);

        // Patch the temp user msg with real DB id
        setConvs((prev) =>
          prev.map((c) =>
            c.id !== cid
              ? c
              : {
                  ...c,
                  messages: c.messages.map((m) =>
                    m.id === tempUserMsg.id ? { ...m, dbId: userDbId } : m,
                  ),
                },
          ),
        );

        // Build history for Groq
        const currentConv = convs.find((c) => c.id === cid);
        const prevMsgs = currentConv?.messages.slice(-MAX_CTX) || [];
        const history = [...prevMsgs, { ...tempUserMsg, dbId: userDbId }];

        const reply = await callGroq(history);
        const replyDbId = await saveMessage(cid, 'assistant', reply);
        const botMsg = { id: uid(), dbId: replyDbId, role: 'assistant', content: reply, ts: now() };

        setConvs((prev) =>
          prev.map((c) =>
            c.id !== cid
              ? c
              : {
                  ...c,
                  messages: [...c.messages, botMsg],
                  updatedAt: now(),
                },
          ),
        );
      } catch (err) {
        console.error('sendMessage:', err);
        setError(err.message);
        // Keep the saved question visible so history and the conversation agree.
      } finally {
        setLoading(false);
        setTimeout(() => taRef.current?.focus(), 100);
      }
    },
    [input, loading, activeId, convs, saveMessage, callGroq],
  );

  /* ── Regenerate — now works correctly using dbId ── */
  const regenerate = useCallback(async () => {
    if (loading || !activeId) return;
    const conv = convs.find((c) => c.id === activeId);
    if (!conv || conv.messages.length === 0) return;

    const msgs = conv.messages;

    // Find the last user message
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const trimmed = msgs.slice(0, lastUserIdx + 1);
    const lastMsg = msgs[msgs.length - 1];

    // Delete the last assistant message from DB using its dbId
    if (lastMsg.role === 'assistant' && lastMsg.dbId) {
      try {
        const userId = await getUserId();
        await supabase.from('chat_messages').delete().eq('id', lastMsg.dbId).eq('user_id', userId);
      } catch (err) {
        console.error('Failed to delete old assistant message:', err);
        // Continue anyway — worst case is a duplicate in DB
      }
    }

    // Optimistically remove the last bot message from UI
    setConvs((prev) => prev.map((c) => (c.id !== activeId ? c : { ...c, messages: trimmed })));
    setLoading(true);
    setError(null);

    try {
      const history = trimmed.slice(-MAX_CTX);
      const reply = await callGroq(history);
      const replyDbId = await saveMessage(activeId, 'assistant', reply);
      const botMsg = { id: uid(), dbId: replyDbId, role: 'assistant', content: reply, ts: now() };

      setConvs((prev) =>
        prev.map((c) =>
          c.id !== activeId
            ? c
            : {
                ...c,
                messages: [...trimmed, botMsg],
                updatedAt: now(),
              },
        ),
      );
    } catch (err) {
      console.error('regenerate:', err);
      setError(err.message);
      // Restore original messages on failure
      setConvs((prev) => prev.map((c) => (c.id !== activeId ? c : { ...c, messages: msgs })));
    } finally {
      setLoading(false);
    }
  }, [loading, activeId, convs, callGroq, saveMessage, getUserId]);

  /* ── Keyboard handler ── */
  const handleKey = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage],
  );

  /* ── Toggle sidebar ── */
  const toggleSidebar = useCallback(() => {
    if (isMobile) setSbOpen((s) => !s);
    else setSbCollapsed((s) => !s);
  }, [isMobile]);

  /* ── Scroll-to-bottom detection ── */
  const handleMsgsScroll = useCallback(() => {
    const el = msgsRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }, []);

  const scrollToBottom = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  /* ── Effects ── */
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const fn = () => {
      setIsMobile(window.innerWidth < 900);
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const activeMessageCount = convs.find((c) => c.id === activeId)?.messages?.length || 0;
  useEffect(() => {
    if (!showScrollBtn) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessageCount, loading, showScrollBtn]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const fn = () => {
      const kb = Math.max(
        0,
        window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop,
      );
      setKbHeight(kb);
      if (kb > 50) setTimeout(scrollToBottom, 100);
    };
    window.visualViewport.addEventListener('resize', fn);
    window.visualViewport.addEventListener('scroll', fn);
    return () => {
      window.visualViewport.removeEventListener('resize', fn);
      window.visualViewport.removeEventListener('scroll', fn);
    };
  }, [scrollToBottom]);

  /* ── Derived values ── */
  const activeConv = convs.find((c) => c.id === activeId);
  const msgs = activeConv?.messages || [];
  const filtered = search
    ? convs.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
    : convs;
  const groups = groupConvs(filtered);
  const GROUP_LABELS = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'Past 7 days',
    older: 'Older',
  };

  const sidebarCls = ['pip-sb', sbOpen ? 'open' : '', !isMobile && sbCollapsed ? 'collapsed' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <div className="pip-root" style={{ paddingBottom: kbHeight > 0 ? kbHeight : undefined }}>
        {/* Animated mesh background */}
        <div className="pip-bg" aria-hidden="true">
          <div className="pip-bg-blob pip-bg-blob-1" />
          <div className="pip-bg-blob pip-bg-blob-2" />
          <div className="pip-bg-blob pip-bg-blob-3" />
        </div>

        <div className="pip-layout">
          {/* ── Sidebar ── */}
          <aside className={sidebarCls}>
            {/* Brand header */}
            <div className="pip-sb-head">
              <div className="pip-brand">
                <div className="pip-brand-img">
                  <img src={hamsterLogo} alt="Pip" />
                </div>
                <div className="pip-brand-text">
                  <span className="pip-brand-name">Pip</span>
                  <span className="pip-brand-tagline">MedTech Companion</span>
                </div>
              </div>
              <button
                className="pip-sb-close"
                onClick={() => setSbOpen(false)}
                aria-label="Close sidebar"
              >
                <X size={15} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="pip-sb-body">
              <button className="pip-new-btn" onClick={newChat}>
                <Plus size={14} strokeWidth={2.5} />
                <span>New Conversation</span>
              </button>

              {/* Search */}
              <div className="pip-search-wrap">
                <Search size={12} className="pip-search-ico" />
                <input
                  className="pip-search"
                  placeholder="Search conversations…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button aria-label="Close" className="pip-search-x" onClick={() => setSearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Conversation list */}
              <div className="pip-conv-list">
                {['today', 'yesterday', 'week', 'older'].map((g) => {
                  const items = groups[g];
                  if (!items?.length) return null;
                  return (
                    <div key={g} className="pip-cgroup">
                      <div className="pip-cgroup-label">{GROUP_LABELS[g]}</div>
                      {items.map((c) => (
                        <div
                          key={c.id}
                          className={`pip-citem ${c.id === activeId ? 'active' : ''}`}
                        >
                          <button
                            className="pip-cselect"
                            onClick={() => selectConv(c.id)}
                            aria-pressed={c.id === activeId}
                          >
                            <MessageSquare size={11} className="pip-citem-ico" />
                            <span className="pip-citem-title">{c.title}</span>
                          </button>
                          <button
                            className="pip-cdel"
                            onClick={(e) => deleteConv(c.id, e)}
                            title="Delete conversation"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="pip-conv-empty">
                    {search ? (
                      <>
                        <Search size={18} />
                        <span>No results for "{search}"</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>
                          No conversations yet.
                          <br />
                          Start a new one!
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pip-sb-foot">
              <div className="pip-model-pill">
                <span className="pip-model-dot" />
                <span>Llama 3.3 70B · Groq</span>
              </div>
            </div>
          </aside>

          {/* ── Main chat area ── */}
          <main className="pip-main">
            {/* Topbar */}
            <div className="pip-topbar">
              <button
                className="pip-toggle-btn"
                onClick={toggleSidebar}
                aria-label="Toggle sidebar"
              >
                <PanelLeft size={16} />
              </button>
              <div className="pip-topbar-title">
                <img src={hamsterLogo} alt="" className="pip-topbar-avatar" />
                <div>
                  <div className="pip-topbar-name">Pip</div>
                  <div className="pip-topbar-conv">{activeConv?.title || 'New Conversation'}</div>
                </div>
              </div>
              {msgs.length > 0 && (
                <button className="pip-clear-btn" onClick={newChat} title="New conversation">
                  <Plus size={15} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="pip-msgs" ref={msgsRef} onScroll={handleMsgsScroll}>
              {msgs.length === 0 ? (
                <EmptyState onSend={sendMessage} />
              ) : (
                <div className="pip-msgs-inner">
                  {msgs.map((m, idx) => (
                    <Bubble
                      key={m.id}
                      msg={m}
                      copied={copied}
                      onCopy={copyMsg}
                      showRegen={m.role === 'assistant' && idx === msgs.length - 1}
                      onRegen={regenerate}
                      loading={loading}
                    />
                  ))}
                  {loading && <TypingIndicator />}
                  {error && (
                    <div className="pip-err">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                      <button
                        aria-label="Close"
                        className="pip-err-dismiss"
                        onClick={() => setError(null)}
                      >
                        <X size={12} />
                      </button>
                      <button className="pip-err-retry" onClick={regenerate}>
                        Retry
                      </button>
                    </div>
                  )}
                  <div ref={endRef} style={{ height: 12 }} />
                </div>
              )}
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollBtn && (
              <button
                className="pip-scroll-btn"
                onClick={scrollToBottom}
                aria-label="Scroll to bottom"
              >
                <ChevronDown size={16} />
              </button>
            )}

            {/* Disclaimer */}
            <div className="pip-disclaimer">
              <AlertCircle size={10} />
              <span>
                For educational reference only — always verify with your resident or consultant.
              </span>
            </div>

            {/* Input */}
            <div className="pip-input-area">
              <div className="pip-input-box">
                <textarea
                  ref={taRef}
                  className="pip-ta"
                  placeholder="Ask Pip a study question…"
                  value={input}
                  rows={1}
                  onChange={(e) => {
                    setInput(e.target.value);
                    resizeTA();
                  }}
                  onKeyDown={handleKey}
                  onFocus={() => setTimeout(scrollToBottom, 300)}
                />
                <button
                  className={`pip-send ${input.trim() && !loading ? 'active' : ''}`}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                >
                  {loading ? (
                    <span className="pip-spinner" />
                  ) : (
                    <ArrowUp size={16} strokeWidth={2.5} />
                  )}
                </button>
              </div>
              <p className="pip-hint">
                <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift+Enter</kbd> for new line
              </p>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

/* ─── CSS ─────────────────────────────────────────────────────────────────────── */
