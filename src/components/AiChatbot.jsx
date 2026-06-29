import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Plus, PanelLeft, Send, Trash2, Copy, Check, RefreshCw,
  User, AlertCircle, MessageSquare, Search, X, Sparkles,
  ChevronDown, ArrowUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase.js';
import hamsterLogo from '../assets/Hamster.png';

/* ─── Constants ──────────────────────────────────────────────────────────────── */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';
const MAX_CTX  = 8;

const SYSTEM_PROMPT = `You are Pip, a warm and knowledgeable medical companion specifically designed for medical interns and students in the Philippines. You combine deep clinical knowledge with the friendly energy of a trusted study buddy.

CLINICAL KNOWLEDGE:
- Internal Medicine: hypertension, diabetes, pneumonia, sepsis, CHF, CKD, ACS, CVA, GI bleeding, and all common ward cases
- Surgery: pre/post-operative care, wound management, surgical emergencies
- Pediatrics: growth & development, EPI Philippines immunization schedules, IMCI, neonatal care
- OB-GYN: prenatal care, high-risk pregnancy, labor & delivery, postpartum, gynecologic conditions
- Emergency Medicine: ACLS/BLS protocols, triage, trauma management
- Community Medicine: Philippine DOH programs, barangay health center workflows

DRUG REFERENCE:
- Generic and Philippine brand names, mechanisms of action
- Adult and pediatric dosing, routes, frequency
- Side effects, contraindications, drug interactions
- Philippine National Formulary essential medicines

PROCEDURES & NORMAL VALUES:
- IV insertion, NGT, urethral catheterization, wound suturing, ABG, LP, thoracentesis, paracentesis
- Normal lab values and vital signs by age group
- ECG basics and interpretation

ROTATION GUIDANCE:
- What to expect per rotation (Medicine, Surgery, Peds, OB, ER, Psych, Ophtha, ENT, Ortho, Derm, Community)
- Intern duties, on-call tips, documentation (SOAP, admission notes, discharge summaries)

PERSONALITY & TONE:
- Warm, encouraging, and never condescending — like your smartest batchmate
- Respond in Taglish naturally when the user writes in it (e.g., "Okay so ang DOC for CAP is...")
- Use clear formatting: bullet points, numbered steps, bold key terms
- Always add a brief safety note for clinical questions: verify with your resident/consultant
- Never give advice that could directly harm a patient`;

const SUGGESTIONS = [
  { icon: '💊', text: 'Drug of choice for CAP?' },
  { icon: '🩺', text: 'Hypertensive urgency management' },
  { icon: '👶', text: 'Pedia vital signs by age group' },
  { icon: '🧪', text: 'NGT insertion step by step' },
  { icon: '⚡', text: 'ACLS algorithm for VFib' },
  { icon: '📋', text: 'SOAP note format for ward rounds' },
  { icon: '🩸', text: 'DKA management protocol' },
  { icon: '🏥', text: 'What to expect in ER rotation?' },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────────── */
const uid   = () => Math.random().toString(36).slice(2, 10);
const now   = () => Date.now();
const trunc = (s, n = 46) => s.length > n ? s.slice(0, n) + '…' : s;
const fmt   = ts => new Date(ts).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

function groupConvs(convs) {
  const todayMs  = new Date().setHours(0, 0, 0, 0);
  const yesterMs = todayMs - 86400000;
  const weekMs   = todayMs - 7 * 86400000;
  const g = { today: [], yesterday: [], week: [], older: [] };
  convs.forEach(c => {
    const d = new Date(c.updatedAt).setHours(0, 0, 0, 0);
    if      (d >= todayMs)  g.today.push(c);
    else if (d >= yesterMs) g.yesterday.push(c);
    else if (d >= weekMs)   g.week.push(c);
    else                    g.older.push(c);
  });
  return g;
}

/* ─── Markdown renderer ───────────────────────────────────────────────────────── */
function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} className="pip-ic">{p.slice(1, -1)}</code>;
    return p;
  });
}

function MD({ content }) {
  const lines = content.split('\n');
  const out = [];
  let i = 0, listBuf = [], listType = null;

  const flush = () => {
    if (!listBuf.length) return;
    const Tag = listType === 'ul' ? 'ul' : 'ol';
    out.push(<Tag key={`l${i}`} className="pip-list">{listBuf}</Tag>);
    listBuf = []; listType = null;
  };

  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('```')) {
      flush();
      const lang = l.slice(3).trim();
      const code = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) { code.push(lines[i]); i++; }
      out.push(
        <div key={`cb${i}`} className="pip-cb">
          {lang && <div className="pip-cb-lang">{lang}</div>}
          <pre><code>{code.join('\n')}</code></pre>
        </div>
      );
    } else if (l.startsWith('### ')) { flush(); out.push(<h3 key={i} className="pip-h3">{parseInline(l.slice(4))}</h3>);
    } else if (l.startsWith('## '))  { flush(); out.push(<h2 key={i} className="pip-h2">{parseInline(l.slice(3))}</h2>);
    } else if (l.startsWith('# '))   { flush(); out.push(<h1 key={i} className="pip-h1">{parseInline(l.slice(2))}</h1>);
    } else if (/^[-*] /.test(l)) {
      if (listType !== 'ul') { flush(); listType = 'ul'; }
      listBuf.push(<li key={i}>{parseInline(l.slice(2))}</li>);
    } else if (/^\d+\. /.test(l)) {
      if (listType !== 'ol') { flush(); listType = 'ol'; }
      listBuf.push(<li key={i}>{parseInline(l.replace(/^\d+\. /, ''))}</li>);
    } else if (l === '---') { flush(); out.push(<hr key={i} className="pip-hr" />);
    } else if (l.trim() === '') { flush(); out.push(<div key={i} className="pip-spacer" />);
    } else { flush(); out.push(<p key={i} className="pip-p">{parseInline(l)}</p>); }
    i++;
  }
  flush();
  return <div className="pip-md">{out}</div>;
}

/* ─── Pip Avatar ──────────────────────────────────────────────────────────────── */
function PipAvatar({ size = 34 }) {
  return (
    <div className="pip-avatar-wrap" style={{ width: size, height: size }}>
      <img src={hamsterLogo} alt="Pip" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
          <span /><span /><span />
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
          Your MedTech Companion — ask me anything about rotations,
          drugs, procedures, or clinical cases.
        </p>
      </div>

      <div className="pip-chips">
        {SUGGESTIONS.map(s => (
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
            {copied === msg.id
              ? <Check size={11} strokeWidth={2.5} />
              : <Copy size={11} strokeWidth={2} />}
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
  const [convs,        setConvs]        = useState([]);
  const [activeId,     setActiveId]     = useState(null);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [copied,       setCopied]       = useState(null);
  const [search,       setSearch]       = useState('');
  const [sbOpen,       setSbOpen]       = useState(false);
  const [sbCollapsed,  setSbCollapsed]  = useState(false);
  const [isMobile,     setIsMobile]     = useState(() => window.innerWidth < 900);
  const [kbHeight,     setKbHeight]     = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const endRef  = useRef(null);
  const taRef   = useRef(null);
  const msgsRef = useRef(null);

  /* ── Auth ── */
  const getUserId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');
    return user.id;
  }, []);

  /* ── Load conversations — now includes DB row id for each message ── */
  const loadConversations = useCallback(async () => {
    try {
      const userId = await getUserId();
      const { data: messages, error: msgErr } = await supabase
        .from('chat_messages')
        .select('id, conversation_id, role, content, created_at')   // ← include id
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      const convMap = new Map();
      messages?.forEach(msg => {
        const cid = msg.conversation_id;
        if (!convMap.has(cid)) {
          convMap.set(cid, {
            id: cid, title: 'New conversation', messages: [],
            updatedAt: new Date(msg.created_at).getTime(),
            createdAt: new Date(msg.created_at).getTime(),
          });
        }
        const conv = convMap.get(cid);
        conv.messages.push({
          id:    `${cid}_${msg.created_at}`,
          dbId:  msg.id,          // ← store DB row id for regenerate
          role:  msg.role,
          content: msg.content,
          ts:    new Date(msg.created_at).getTime(),
        });
        conv.updatedAt = Math.max(conv.updatedAt, new Date(msg.created_at).getTime());
        if (conv.title === 'New conversation' && msg.role === 'user') {
          conv.title = trunc(msg.content);
        }
      });

      const arr = Array.from(convMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      setConvs(arr);
      setActiveId(prev => (!prev && arr.length > 0) ? arr[0].id : prev);
    } catch (err) {
      console.error('loadConversations:', err);
      setError('Failed to load chat history.');
    }
  }, [getUserId]);

  /* ── Save message — returns the new DB row id ── */
  const saveMessage = useCallback(async (conversationId, role, content) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('chat_messages')
      .insert([{ user_id: userId, conversation_id: conversationId, role, content }])
      .select('id')
      .single();
    if (error) throw error;
    return data?.id;   // ← return DB id
  }, [getUserId]);

  /* ── New conversation ── */
  const newChat = useCallback(() => {
    const newId = `conv_${uid()}`;
    setConvs(prev => [{
      id: newId, title: 'New conversation', messages: [],
      createdAt: now(), updatedAt: now(),
    }, ...prev]);
    setActiveId(newId);
    setInput('');
    setError(null);
    setSbOpen(false);
    setTimeout(() => taRef.current?.focus(), 120);
  }, []);

  /* ── Delete conversation ── */
  const deleteConv = useCallback(async (id, e) => {
    e?.stopPropagation();
    try {
      const userId = await getUserId();
      await supabase.from('chat_messages').delete().eq('user_id', userId).eq('conversation_id', id);
      setConvs(prev => {
        const next = prev.filter(c => c.id !== id);
        if (id === activeId) setActiveId(next[0]?.id || null);
        return next;
      });
    } catch (err) {
      console.error('deleteConv:', err);
      setError('Failed to delete conversation.');
    }
  }, [getUserId, activeId]);

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
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY is not set in your .env file.');
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL, max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map(m => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      throw new Error(e?.error?.message || `API error ${res.status}`);
    }
    const d = await res.json();
    return d.choices?.[0]?.message?.content || 'Sorry, I could not generate a response.';
  }, []);

  /* ── Send message ── */
  const sendMessage = useCallback(async (textArg) => {
    const text = (textArg !== undefined ? textArg : input).trim();
    if (!text || loading) return;

    let cid = activeId;
    if (!cid) {
      cid = `conv_${uid()}`;
      setConvs(prev => [{
        id: cid, title: trunc(text), messages: [],
        createdAt: now(), updatedAt: now(),
      }, ...prev]);
      setActiveId(cid);
    }

    const tempUserMsg = { id: uid(), dbId: null, role: 'user', content: text, ts: now() };
    setConvs(prev => prev.map(c => c.id !== cid ? c : {
      ...c,
      messages: [...c.messages, tempUserMsg],
      title: c.messages.length === 0 ? trunc(text) : c.title,
      updatedAt: now(),
    }));
    setInput('');
    setLoading(true);
    setError(null);
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      // Save user message and get its DB id
      const userDbId = await saveMessage(cid, 'user', text);

      // Patch the temp user msg with real DB id
      setConvs(prev => prev.map(c => c.id !== cid ? c : {
        ...c,
        messages: c.messages.map(m => m.id === tempUserMsg.id ? { ...m, dbId: userDbId } : m),
      }));

      // Build history for Groq
      const currentConv = convs.find(c => c.id === cid);
      const prevMsgs    = currentConv?.messages.slice(-MAX_CTX) || [];
      const history     = [...prevMsgs, { ...tempUserMsg, dbId: userDbId }];

      const reply      = await callGroq(history);
      const replyDbId  = await saveMessage(cid, 'assistant', reply);
      const botMsg     = { id: uid(), dbId: replyDbId, role: 'assistant', content: reply, ts: now() };

      setConvs(prev => prev.map(c => c.id !== cid ? c : {
        ...c, messages: [...c.messages, botMsg], updatedAt: now(),
      }));
    } catch (err) {
      console.error('sendMessage:', err);
      setError(err.message);
      // Roll back the optimistic user message
      setConvs(prev => prev.map(c => c.id !== cid ? c : {
        ...c, messages: c.messages.filter(m => m.id !== tempUserMsg.id),
      }));
    } finally {
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 100);
    }
  }, [input, loading, activeId, convs, saveMessage, callGroq]);

  /* ── Regenerate — now works correctly using dbId ── */
  const regenerate = useCallback(async () => {
    if (loading || !activeId) return;
    const conv = convs.find(c => c.id === activeId);
    if (!conv || conv.messages.length === 0) return;

    const msgs = conv.messages;

    // Find the last user message
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;

    const trimmed = msgs.slice(0, lastUserIdx + 1);
    const lastMsg = msgs[msgs.length - 1];

    // Delete the last assistant message from DB using its dbId
    if (lastMsg.role === 'assistant' && lastMsg.dbId) {
      try {
        const userId = await getUserId();
        await supabase.from('chat_messages')
          .delete()
          .eq('id', lastMsg.dbId)
          .eq('user_id', userId);
      } catch (err) {
        console.error('Failed to delete old assistant message:', err);
        // Continue anyway — worst case is a duplicate in DB
      }
    }

    // Optimistically remove the last bot message from UI
    setConvs(prev => prev.map(c => c.id !== activeId ? c : { ...c, messages: trimmed }));
    setLoading(true);
    setError(null);

    try {
      const history   = trimmed.slice(-MAX_CTX);
      const reply     = await callGroq(history);
      const replyDbId = await saveMessage(activeId, 'assistant', reply);
      const botMsg    = { id: uid(), dbId: replyDbId, role: 'assistant', content: reply, ts: now() };

      setConvs(prev => prev.map(c => c.id !== activeId ? c : {
        ...c, messages: [...trimmed, botMsg], updatedAt: now(),
      }));
    } catch (err) {
      console.error('regenerate:', err);
      setError(err.message);
      // Restore original messages on failure
      setConvs(prev => prev.map(c => c.id !== activeId ? c : { ...c, messages: msgs }));
    } finally {
      setLoading(false);
    }
  }, [loading, activeId, convs, callGroq, saveMessage, getUserId]);

  /* ── Keyboard handler ── */
  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }, [sendMessage]);

  /* ── Toggle sidebar ── */
  const toggleSidebar = useCallback(() => {
    if (isMobile) setSbOpen(s => !s);
    else setSbCollapsed(s => !s);
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
  useEffect(() => { loadConversations(); }, [loadConversations]);

  useEffect(() => {
    const fn = () => { setIsMobile(window.innerWidth < 900); };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (!showScrollBtn) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convs.find(c => c.id === activeId)?.messages?.length, loading]);

  useEffect(() => {
    if (!window.visualViewport) return;
    const fn = () => {
      const kb = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
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
  const activeConv = convs.find(c => c.id === activeId);
  const msgs       = activeConv?.messages || [];
  const filtered   = search
    ? convs.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : convs;
  const groups = groupConvs(filtered);
  const GROUP_LABELS = { today: 'Today', yesterday: 'Yesterday', week: 'Past 7 days', older: 'Older' };

  const sidebarCls = [
    'pip-sb',
    sbOpen ? 'open' : '',
    !isMobile && sbCollapsed ? 'collapsed' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <style>{CSS}</style>
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
              <button className="pip-sb-close" onClick={() => setSbOpen(false)} aria-label="Close sidebar">
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
                  onChange={e => setSearch(e.target.value)}
                />
                {search && (
                  <button className="pip-search-x" onClick={() => setSearch('')}>
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Conversation list */}
              <div className="pip-conv-list">
                {['today', 'yesterday', 'week', 'older'].map(g => {
                  const items = groups[g];
                  if (!items?.length) return null;
                  return (
                    <div key={g} className="pip-cgroup">
                      <div className="pip-cgroup-label">{GROUP_LABELS[g]}</div>
                      {items.map(c => (
                        <button
                          key={c.id}
                          className={`pip-citem ${c.id === activeId ? 'active' : ''}`}
                          onClick={() => selectConv(c.id)}
                        >
                          <MessageSquare size={11} className="pip-citem-ico" />
                          <span className="pip-citem-title">{c.title}</span>
                          <button
                            className="pip-cdel"
                            onClick={e => deleteConv(c.id, e)}
                            title="Delete conversation"
                          >
                            <Trash2 size={11} />
                          </button>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="pip-conv-empty">
                    {search
                      ? <><Search size={18} /><span>No results for "{search}"</span></>
                      : <><Sparkles size={18} /><span>No conversations yet.<br />Start a new one!</span></>
                    }
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
              <button className="pip-toggle-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
                <PanelLeft size={16} />
              </button>
              <div className="pip-topbar-title">
                <img src={hamsterLogo} alt="" className="pip-topbar-avatar" />
                <div>
                  <div className="pip-topbar-name">Pip</div>
                  <div className="pip-topbar-conv">
                    {activeConv?.title || 'New Conversation'}
                  </div>
                </div>
              </div>
              {msgs.length > 0 && (
                <button
                  className="pip-clear-btn"
                  onClick={newChat}
                  title="New conversation"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {/* Messages */}
            <div
              className="pip-msgs"
              ref={msgsRef}
              onScroll={handleMsgsScroll}
            >
              {msgs.length === 0
                ? <EmptyState onSend={sendMessage} />
                : (
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
                        <button className="pip-err-dismiss" onClick={() => setError(null)}>
                          <X size={12} />
                        </button>
                        <button className="pip-err-retry" onClick={regenerate}>
                          Retry
                        </button>
                      </div>
                    )}
                    <div ref={endRef} style={{ height: 12 }} />
                  </div>
                )
              }
            </div>

            {/* Scroll-to-bottom button */}
            {showScrollBtn && (
              <button className="pip-scroll-btn" onClick={scrollToBottom} aria-label="Scroll to bottom">
                <ChevronDown size={16} />
              </button>
            )}

            {/* Disclaimer */}
            <div className="pip-disclaimer">
              <AlertCircle size={10} />
              <span>For educational reference only — always verify with your resident or consultant.</span>
            </div>

            {/* Input */}
            <div className="pip-input-area">
              <div className="pip-input-box">
                <textarea
                  ref={taRef}
                  className="pip-ta"
                  placeholder="Ask Pip a clinical question…"
                  value={input}
                  rows={1}
                  onChange={e => { setInput(e.target.value); resizeTA(); }}
                  onKeyDown={handleKey}
                  onFocus={() => setTimeout(scrollToBottom, 300)}
                />
                <button
                  className={`pip-send ${input.trim() && !loading ? 'active' : ''}`}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  aria-label="Send message"
                >
                  {loading
                    ? <span className="pip-spinner" />
                    : <ArrowUp size={16} strokeWidth={2.5} />}
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
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700;1,9..144,700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Root ── */
.pip-root {
  font-family: 'Plus Jakarta Sans', sans-serif;
  display: flex; flex-direction: column;
  height: calc(100dvh - 68px);
  margin: -24px -20px calc(-132px - env(safe-area-inset-bottom, 0px));
  position: relative; overflow: hidden;
}

/* ── Animated mesh background ── */
.pip-bg {
  position: absolute; inset: 0; z-index: 0;
  background: linear-gradient(135deg, #fff5f8 0%, #fdf4ff 40%, #f0f9ff 100%);
  overflow: hidden;
  pointer-events: none;
}
.pip-bg-blob {
  position: absolute; border-radius: 50%;
  filter: blur(70px); opacity: 0.55;
}
.pip-bg-blob-1 {
  width: 520px; height: 520px;
  background: radial-gradient(circle, #ffb3d1 0%, transparent 70%);
  top: -180px; left: -140px;
  animation: blobDrift 12s ease-in-out infinite;
}
.pip-bg-blob-2 {
  width: 420px; height: 420px;
  background: radial-gradient(circle, #d8b4fe 0%, transparent 70%);
  bottom: -120px; right: -100px;
  animation: blobDrift 10s ease-in-out infinite reverse;
  animation-delay: -4s;
}
.pip-bg-blob-3 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, #99f6e4 0%, transparent 70%);
  top: 40%; left: 55%;
  animation: blobDrift 14s ease-in-out infinite;
  animation-delay: -7s;
}
@keyframes blobDrift {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(30px,-20px) scale(1.05); }
  66%      { transform: translate(-20px,15px) scale(0.95); }
}

/* ── Layout ── */
.pip-layout {
  display: flex; height: 100%; position: relative;
  overflow: hidden; z-index: 1;
}

/* ── Sidebar ── */
.pip-sb {
  width: 275px; flex-shrink: 0;
  background: rgba(255,255,255,0.78);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-right: 1px solid rgba(255,182,210,0.3);
  display: flex; flex-direction: column;
  overflow: hidden; z-index: 30;
  box-shadow: 4px 0 32px rgba(255,100,150,0.07);
  transition: transform 0.32s cubic-bezier(0.4,0,0.2,1),
              width   0.32s cubic-bezier(0.4,0,0.2,1);
}
@media (max-width: 899px) {
  .pip-sb {
    position: absolute; top:0; left:0; bottom:0;
    transform: translateX(-100%);
  }
  .pip-sb.open {
    transform: translateX(0);
    box-shadow: 8px 0 48px rgba(0,0,0,0.18);
  }
}
@media (min-width: 900px) {
  .pip-sb { position: relative; transform: none; }
  .pip-sb.collapsed { width: 0; border-right: none; box-shadow: none; }
}

/* Sidebar header */
.pip-sb-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 16px 16px; flex-shrink: 0;
  border-bottom: 1px solid rgba(255,182,210,0.25);
  background: linear-gradient(180deg, rgba(255,240,248,0.9) 0%, rgba(255,255,255,0.5) 100%);
  min-width: 275px;
}
.pip-brand { display: flex; align-items: center; gap: 10px; }
.pip-brand-img {
  width: 46px; height: 46px; flex-shrink: 0;
  border-radius: 16px;
  background: linear-gradient(135deg, #ffd6e8, #ffe8f0);
  border: 2px solid rgba(255,143,177,0.3);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(255,100,150,0.18);
}
.pip-brand-img img { width: 100%; height: 100%; object-fit: contain; }
.pip-brand-text { display: flex; flex-direction: column; gap: 1px; }
.pip-brand-name {
  font-family: 'Fraunces', serif; font-style: italic;
  font-size: 20px; font-weight: 700; color: #1a0a14;
  letter-spacing: -0.5px; line-height: 1;
}
.pip-brand-tagline {
  font-size: 10.5px; font-weight: 600; color: #e8a0be;
  letter-spacing: 0.04em; text-transform: uppercase;
}
.pip-sb-close {
  width: 28px; height: 28px; border: none; border-radius: 9px;
  background: rgba(255,111,145,0.08); color: #d0a0b8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.18s; flex-shrink: 0;
}
.pip-sb-close:hover { background: #ffe4ec; color: #ff5d8f; }
@media (min-width: 900px) { .pip-sb-close { display: none; } }

/* Sidebar body */
.pip-sb-body {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column;
  padding: 12px 10px; gap: 8px; min-width: 275px;
}
.pip-sb-body::-webkit-scrollbar { width: 3px; }
.pip-sb-body::-webkit-scrollbar-thumb { background: rgba(255,150,190,0.3); border-radius: 3px; }

.pip-new-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; border-radius: 14px; border: none;
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  color: white; font-size: 13px; font-weight: 700;
  font-family: 'Plus Jakarta Sans', sans-serif;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 16px rgba(255,100,145,0.3);
  letter-spacing: 0.01em;
}
.pip-new-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 24px rgba(255,100,145,0.4);
  background: linear-gradient(135deg, #ff9fbf, #ff7fa1);
}
.pip-new-btn:active { transform: scale(0.98); }

/* Search */
.pip-search-wrap { position: relative; }
.pip-search-ico {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: #ccc; pointer-events: none;
}
.pip-search {
  width: 100%; padding: 9px 28px 9px 28px;
  background: rgba(255,255,255,0.7); border: 1.5px solid rgba(255,182,210,0.4);
  border-radius: 12px; color: #333; font-size: 12.5px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  outline: none; box-sizing: border-box; transition: 0.18s;
}
.pip-search::placeholder { color: #d0b8c8; }
.pip-search:focus {
  border-color: #ff8fb1; background: white;
  box-shadow: 0 0 0 3px rgba(255,143,177,0.12);
}
.pip-search-x {
  position: absolute; right: 9px; top: 50%; transform: translateY(-50%);
  border: none; background: none; color: #ccc; cursor: pointer;
  display: flex; align-items: center; padding: 3px;
  border-radius: 6px; transition: 0.15s;
}
.pip-search-x:hover { color: #ff5d8f; background: #fff0f4; }

/* Conversation list */
.pip-conv-list { flex: 1; }
.pip-cgroup { margin-bottom: 2px; }
.pip-cgroup-label {
  font-size: 9.5px; font-weight: 800; color: #e0b0cc;
  text-transform: uppercase; letter-spacing: 0.1em;
  padding: 12px 6px 5px;
}
.pip-citem {
  display: flex; align-items: center; gap: 7px;
  width: 100%; padding: 9px 8px; border-radius: 12px;
  border: none; background: transparent; color: #555;
  font-size: 12.5px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500;
  cursor: pointer; text-align: left; transition: all 0.16s; position: relative;
  white-space: nowrap;
}
.pip-citem:hover { background: rgba(255,111,145,0.07); color: #ff5d8f; }
.pip-citem.active {
  background: linear-gradient(135deg, rgba(255,143,177,0.15), rgba(255,111,145,0.08));
  color: #ff5d8f; font-weight: 600;
  border: 1px solid rgba(255,143,177,0.25);
}
.pip-citem.active::before {
  content: ''; position: absolute; left: 0; top: 18%; bottom: 18%;
  width: 3px; border-radius: 0 3px 3px 0;
  background: linear-gradient(180deg, #ff8fb1, #ff6f91);
}
.pip-citem-ico { color: #e0c0cc; flex-shrink: 0; }
.pip-citem.active .pip-citem-ico { color: #ff8fb1; }
.pip-citem-title { flex: 1; overflow: hidden; text-overflow: ellipsis; font-size: 12.5px; }
.pip-cdel {
  opacity: 0; background: none; border: none; padding: 4px;
  color: #ccc; cursor: pointer; border-radius: 7px;
  display: flex; align-items: center; transition: 0.15s; flex-shrink: 0;
}
.pip-citem:hover .pip-cdel { opacity: 1; }
.pip-cdel:hover { color: #e05555; background: rgba(224,85,85,0.1); }

.pip-conv-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  text-align: center; color: #d0b8c8; font-size: 12.5px;
  padding: 32px 16px; line-height: 1.6;
}

/* Sidebar footer */
.pip-sb-foot {
  padding: 12px 14px; flex-shrink: 0; min-width: 275px;
  border-top: 1px solid rgba(255,182,210,0.2);
  background: linear-gradient(0deg, rgba(255,248,252,0.9) 0%, transparent 100%);
}
.pip-model-pill {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(255,240,248,0.9);
  border: 1px solid rgba(255,182,210,0.4);
  border-radius: 999px; padding: 6px 14px;
  font-size: 11px; color: #c8a0b8; font-weight: 600;
  letter-spacing: 0.02em;
}
.pip-model-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74,222,128,0.6);
}

/* ── Main area ── */
.pip-main {
  flex: 1; min-width: 0; display: flex; flex-direction: column;
  position: relative; overflow: hidden;
}

/* Topbar */
.pip-topbar {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px; flex-shrink: 0;
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,182,210,0.2);
}
.pip-toggle-btn {
  width: 34px; height: 34px; border-radius: 11px; border: none;
  background: rgba(255,111,145,0.08); color: #ff5d8f;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.18s; flex-shrink: 0;
}
.pip-toggle-btn:hover { background: rgba(255,111,145,0.15); }
.pip-topbar-title {
  flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0;
}
.pip-topbar-avatar {
  width: 32px; height: 32px; border-radius: 10px;
  object-fit: contain;
  background: linear-gradient(135deg, #ffd6e8, #ffe8f0);
  border: 1.5px solid rgba(255,143,177,0.25);
  flex-shrink: 0;
}
.pip-topbar-name {
  font-family: 'Fraunces', serif; font-style: italic;
  font-size: 15px; font-weight: 700; color: #1a0a14; line-height: 1.1;
}
.pip-topbar-conv {
  font-size: 11.5px; color: #e8a0be; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 240px;
}
.pip-clear-btn {
  width: 32px; height: 32px; border-radius: 10px; border: none;
  background: rgba(255,111,145,0.08); color: #ff8fb1;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.18s; flex-shrink: 0;
}
.pip-clear-btn:hover { background: rgba(255,111,145,0.15); color: #ff5d8f; }

/* Messages */
.pip-msgs {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  display: flex; flex-direction: column;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
}
.pip-msgs::-webkit-scrollbar { width: 4px; }
.pip-msgs::-webkit-scrollbar-thumb { background: rgba(255,182,210,0.4); border-radius: 4px; }
.pip-msgs-inner {
  flex: 1; padding: 24px 20px 8px;
  max-width: 740px; width: 100%; margin: 0 auto; box-sizing: border-box;
}

/* Empty / welcome state */
.pip-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 24px 24px 8px; text-align: center; gap: 0;
  position: relative; overflow: hidden;
  max-width: 680px; margin: 0 auto; width: 100%; box-sizing: border-box;
}
.pip-orb {
  position: absolute; border-radius: 50%; pointer-events: none;
  filter: blur(60px); opacity: 0.5;
}
.pip-orb-1 {
  width: 300px; height: 300px;
  background: radial-gradient(circle, #ffb3d1, transparent 70%);
  top: -60px; left: -60px;
  animation: orbFloat 8s ease-in-out infinite;
}
.pip-orb-2 {
  width: 250px; height: 250px;
  background: radial-gradient(circle, #d8b4fe, transparent 70%);
  bottom: 20px; right: -40px;
  animation: orbFloat 10s ease-in-out infinite reverse;
}
.pip-orb-3 {
  width: 200px; height: 200px;
  background: radial-gradient(circle, #99f6e4, transparent 70%);
  top: 50%; left: 50%; transform: translate(-50%,-50%);
  animation: orbFloat 12s ease-in-out infinite;
}
@keyframes orbFloat {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(15px,-10px) scale(1.06); }
}
.pip-empty-hero {
  width: 200px; height: 200px; position: relative; z-index: 1;
  animation: heroFloat 4s ease-in-out infinite;
  filter: drop-shadow(0 16px 32px rgba(255,100,150,0.25));
}
@keyframes heroFloat {
  0%,100% { transform: translateY(0) rotate(-1deg); }
  50%      { transform: translateY(-10px) rotate(1deg); }
}
.pip-empty-hero img { width: 100%; height: 100%; object-fit: contain; }
.pip-empty-text { position: relative; z-index: 1; margin-top: 4px; margin-bottom: 20px; }
.pip-empty-h {
  font-family: 'Fraunces', serif; font-style: italic;
  font-size: clamp(1.6rem, 5vw, 2rem); font-weight: 700;
  color: #1a0a14; margin: 0 0 8px; letter-spacing: -0.5px; line-height: 1.15;
}
.pip-name-accent {
  background: linear-gradient(135deg, #ff6b9d, #c84b97);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.pip-empty-sub {
  font-size: 13.5px; color: #b8a0b8; line-height: 1.65;
  max-width: 320px; margin: 0 auto; font-weight: 500;
}
.pip-chips {
  display: flex; flex-wrap: wrap; gap: 8px;
  justify-content: center; max-width: 540px;
  position: relative; z-index: 1;
}
.pip-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px;
  background: rgba(255,255,255,0.85);
  border: 1.5px solid rgba(255,182,210,0.45);
  border-radius: 24px; font-size: 12.5px; font-weight: 600;
  color: #666; cursor: pointer; transition: all 0.2s;
  font-family: 'Plus Jakarta Sans', sans-serif;
  box-shadow: 0 2px 10px rgba(255,111,145,0.08);
  backdrop-filter: blur(10px);
}
.pip-chip-icon { font-size: 14px; line-height: 1; }
.pip-chip:hover {
  border-color: #ff8fb1; color: #ff5d8f; background: white;
  transform: translateY(-2px); box-shadow: 0 6px 24px rgba(255,111,145,0.2);
}
.pip-chip:active { transform: scale(0.97); }

/* ── Message rows ── */
.pip-row {
  display: flex; align-items: flex-start; gap: 10px;
  margin-bottom: 20px; animation: msgIn 0.28s ease both;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.pip-row.user { flex-direction: row-reverse; }

/* Pip avatar */
.pip-avatar-wrap {
  border-radius: 12px; overflow: hidden; flex-shrink: 0; margin-top: 2px;
  background: linear-gradient(135deg, #ffe4f0, #ffd6e8);
  border: 1.5px solid rgba(255,143,177,0.2);
  box-shadow: 0 2px 10px rgba(255,100,150,0.12);
}

/* User avatar */
.pip-user-av {
  width: 34px; height: 34px; border-radius: 12px; flex-shrink: 0; margin-top: 2px;
  background: linear-gradient(135deg, #818cf8, #6366f1);
  color: white; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 10px rgba(99,102,241,0.3);
}

.pip-bwrap {
  display: flex; flex-direction: column; gap: 4px;
  max-width: min(78%, 580px);
}
.pip-row.user .pip-bwrap { align-items: flex-end; }

/* Bubbles */
.pip-bubble {
  padding: 13px 17px; border-radius: 20px;
  font-size: 13.5px; line-height: 1.7; word-break: break-word;
}
.pip-bubble.bot {
  background: rgba(255,255,255,0.92);
  border-radius: 4px 20px 20px 20px; color: #222;
  border: 1.5px solid rgba(255,182,210,0.3);
  box-shadow: 0 2px 16px rgba(255,100,150,0.06), 0 1px 0 rgba(255,255,255,0.9) inset;
  backdrop-filter: blur(10px);
}
.pip-bubble.user {
  background: linear-gradient(135deg, #ff8fb1, #ff6b9d);
  border-radius: 20px 4px 20px 20px; color: white;
  box-shadow: 0 6px 24px rgba(255,100,150,0.35);
}

/* Message actions */
.pip-acts {
  display: flex; align-items: center; gap: 5px;
  opacity: 0; transition: opacity 0.18s; padding: 0 2px;
}
.pip-row:hover .pip-acts { opacity: 1; }
.pip-ts { font-size: 10.5px; color: #d0b8c8; margin-right: 2px; font-weight: 500; }
.pip-act {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 4px 8px; border-radius: 8px; border: none;
  background: transparent; color: #c0b0c0; cursor: pointer;
  font-size: 11px; font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 600;
  transition: all 0.15s;
}
.pip-act:hover { background: rgba(255,111,145,0.1); color: #ff5d8f; }
.pip-act.regen { color: #a0b8d0; }
.pip-act.regen:hover { background: rgba(74,191,149,0.1); color: #4abf95; }

/* Typing bubble */
.pip-typing-bubble {
  display: flex !important; align-items: center !important;
  gap: 10px; padding: 14px 20px !important; min-width: 150px;
}
.pip-typing-label {
  font-size: 12px; color: #d0b0c0; font-style: italic; font-weight: 600;
  font-family: 'Fraunces', serif;
}
.pip-typing-dots { display: flex; align-items: center; gap: 4px; }
.pip-typing-dots span {
  width: 7px; height: 7px; border-radius: 50%;
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  animation: typeBounce 1.4s ease-in-out infinite; flex-shrink: 0;
}
.pip-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.pip-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typeBounce {
  0%,60%,100% { transform: translateY(0) scale(1); opacity: 0.4; }
  30%          { transform: translateY(-7px) scale(1.15); opacity: 1; }
}

/* Error */
.pip-err {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 16px; border-radius: 16px;
  background: rgba(254,242,242,0.95); border: 1px solid rgba(252,165,165,0.5);
  color: #b91c1c; font-size: 12.5px; margin-bottom: 14px; font-weight: 500;
  backdrop-filter: blur(8px);
}
.pip-err-dismiss {
  margin-left: auto; background: none; border: none; color: #f87171;
  cursor: pointer; padding: 3px; border-radius: 6px; display: flex;
  transition: 0.15s;
}
.pip-err-dismiss:hover { background: rgba(239,68,68,0.1); }
.pip-err-retry {
  padding: 5px 14px; background: white;
  border: 1.5px solid rgba(252,165,165,0.6);
  border-radius: 999px; color: #ef4444; font-size: 12px;
  cursor: pointer; transition: 0.15s; white-space: nowrap;
  font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 700;
}
.pip-err-retry:hover { background: #fef2f2; }

/* Scroll to bottom button */
.pip-scroll-btn {
  position: absolute; bottom: 130px; left: 50%; transform: translateX(-50%);
  z-index: 20; width: 36px; height: 36px; border-radius: 50%;
  border: 1.5px solid rgba(255,182,210,0.4);
  background: rgba(255,255,255,0.92); color: #ff5d8f;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; box-shadow: 0 4px 16px rgba(255,100,150,0.18);
  transition: all 0.2s; backdrop-filter: blur(10px);
  animation: fadeInUp 0.2s ease;
}
.pip-scroll-btn:hover { background: white; transform: translateX(-50%) scale(1.1); }
@keyframes fadeInUp { from { opacity:0; transform: translateX(-50%) translateY(6px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

/* Markdown */
.pip-md { line-height: 1.75; color: #222; }
.pip-p { margin: 0 0 8px; font-size: 13.5px; }
.pip-p:last-child { margin-bottom: 0; }
.pip-h1 {
  font-size: 16px; font-weight: 800; margin: 12px 0 7px;
  color: #ff5d8f; font-family: 'Fraunces', serif; font-style: italic;
  letter-spacing: -0.2px;
}
.pip-h2 { font-size: 14.5px; font-weight: 700; margin: 10px 0 6px; color: #1a0a14; }
.pip-h3 { font-size: 13.5px; font-weight: 700; margin: 8px 0 5px; color: #444; }
.pip-list { margin: 5px 0 10px; padding-left: 20px; display: flex; flex-direction: column; gap: 4px; }
.pip-list li { font-size: 13.5px; line-height: 1.65; color: #333; }
.pip-hr { border: none; border-top: 1px solid rgba(255,182,210,0.35); margin: 12px 0; }
.pip-spacer { height: 6px; }
.pip-ic {
  background: rgba(255,111,145,0.1); color: #c84b7a;
  border-radius: 6px; padding: 1px 7px; font-size: 12.5px;
  font-family: 'JetBrains Mono', monospace; font-weight: 500;
  border: 1px solid rgba(255,111,145,0.2);
}
.pip-cb {
  background: #141018; border-radius: 16px; margin: 10px 0;
  overflow: hidden; border: 1px solid rgba(255,255,255,0.06);
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
}
.pip-cb-lang {
  padding: 8px 16px; background: rgba(255,255,255,0.04);
  font-size: 10.5px; color: #8b5cf6; font-weight: 700;
  font-family: 'JetBrains Mono', monospace; text-transform: uppercase; letter-spacing: 0.1em;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.pip-cb pre { margin: 0; padding: 16px; overflow-x: auto; }
.pip-cb code { font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #e2e8f0; line-height: 1.7; }

/* Disclaimer */
.pip-disclaimer {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 20px; flex-shrink: 0;
  background: rgba(255,251,235,0.88); backdrop-filter: blur(10px);
  border-top: 1px solid rgba(253,224,71,0.3);
  font-size: 10.5px; color: #a16207; font-weight: 600;
}

/* Input */
.pip-input-area {
  padding: 12px 16px;
  padding-bottom: max(12px, calc(12px + env(safe-area-inset-bottom, 0px)));
  background: rgba(255,255,255,0.82); backdrop-filter: blur(24px);
  border-top: 1px solid rgba(255,182,210,0.25); flex-shrink: 0;
  box-shadow: 0 -4px 24px rgba(255,100,150,0.07);
}
.pip-input-box {
  display: flex; align-items: flex-end; gap: 10px;
  max-width: 740px; margin: 0 auto; background: white;
  border: 1.5px solid rgba(255,182,210,0.45); border-radius: 22px;
  padding: 10px 10px 10px 18px;
  box-shadow: 0 2px 20px rgba(255,100,150,0.08);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.pip-input-box:focus-within {
  border-color: #ff8fb1;
  box-shadow: 0 0 0 3.5px rgba(255,143,177,0.16), 0 4px 24px rgba(255,100,150,0.12);
}
.pip-ta {
  flex: 1; border: none; outline: none; resize: none;
  background: transparent; font-size: 14px; color: #222;
  font-family: 'Plus Jakarta Sans', sans-serif; font-weight: 500;
  line-height: 1.5; max-height: 140px; min-height: 22px; padding: 6px 0;
  -webkit-appearance: none;
}
.pip-ta::placeholder { color: #d0b8c8; font-weight: 400; }
.pip-send {
  width: 40px; height: 40px; border-radius: 14px; border: none;
  background: rgba(255,182,210,0.25); color: #e0c0cc;
  display: flex; align-items: center; justify-content: center;
  cursor: not-allowed; flex-shrink: 0; transition: all 0.22s;
}
.pip-send.active {
  background: linear-gradient(135deg, #ff8fb1, #ff6b9d); color: white;
  cursor: pointer; box-shadow: 0 4px 16px rgba(255,100,150,0.4);
}
.pip-send.active:hover {
  transform: scale(1.08); box-shadow: 0 6px 24px rgba(255,100,150,0.5);
  background: linear-gradient(135deg, #ff9fbf, #ff7ba9);
}
.pip-send.active:active { transform: scale(0.95); }
.pip-spinner {
  width: 16px; height: 16px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.35); border-top-color: white;
  animation: spin 0.65s linear infinite; display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.pip-hint {
  font-size: 10.5px; color: #e0ccd8; text-align: center;
  margin: 7px 0 0; font-weight: 500;
}
.pip-hint kbd {
  background: rgba(255,182,210,0.2); border: 1px solid rgba(255,182,210,0.4);
  border-radius: 5px; padding: 1px 5px; font-size: 9.5px;
  font-family: 'Plus Jakarta Sans', sans-serif;
  color: #d0a0b8; font-weight: 700;
}

/* Mobile backdrop */
.pip-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.35);
  backdrop-filter: blur(6px); z-index: 25; animation: bkdIn 0.22s ease;
}
@keyframes bkdIn { from { opacity:0; } to { opacity:1; } }

/* ── Responsive ── */
@media (max-width: 480px) {
  .pip-root { margin: -24px -20px calc(-132px - env(safe-area-inset-bottom, 0px)); }
  .pip-msgs-inner { padding: 16px 14px 8px; }
  .pip-input-area { padding: 10px 12px; padding-bottom: max(10px, calc(10px + env(safe-area-inset-bottom, 0px))); }
  .pip-bubble { font-size: 13px; padding: 12px 14px; }
  .pip-empty { padding: 16px 14px; }
  .pip-empty-hero { width: 150px; height: 150px; }
  .pip-chips { gap: 6px; }
  .pip-chip { font-size: 12px; padding: 8px 12px; }
}
@media (min-width: 768px) and (max-width: 899px) {
  .pip-root { margin: -8px -40px calc(-132px - env(safe-area-inset-bottom, 0px)); }
  .pip-msgs-inner { padding: 24px 28px 12px; max-width: 680px; }
  .pip-input-box { max-width: 680px; }
}
@media (min-width: 900px) {
  .pip-root { margin: -8px -40px -115px; }
  .pip-msgs-inner { padding: 28px 40px 12px; max-width: 760px; }
  .pip-input-box { max-width: 760px; }
  .pip-input-area { padding: 14px 40px; padding-bottom: 14px; }
}
@media (min-width: 1280px) {
  .pip-msgs-inner { max-width: 820px; }
  .pip-input-box { max-width: 820px; }
}
`;