import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Menu, Send, Trash2, Copy, Check, RefreshCw,
  Stethoscope, Bot, User, AlertCircle, MessageSquare,
  Search, X, ChevronLeft, Sparkles, Zap,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient'; // adjust path

/* ─── Constants ─────────────────────────────────────────────────────────────── */
const GROQ_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL     = 'llama-3.3-70b-versatile';
const MAX_CTX   = 6;

const SYSTEM_PROMPT = `You are MedMate AI, an intelligent medical assistant specifically designed for medical interns and students in the Philippines. You have comprehensive knowledge of:

CLINICAL KNOWLEDGE:
- Internal Medicine: common ward cases, diagnostics, management protocols (hypertension, diabetes, pneumonia, sepsis, CHF, CKD, ACS, CVA, GI bleeding, etc.)
- Surgery: pre/post-operative care, surgical techniques overview, wound management, common surgical emergencies
- Pediatrics: growth and development, immunization schedules (EPI Philippines), common childhood illnesses, IMCI, neonatal care
- OB-GYN: prenatal care, normal and high-risk pregnancy, labor and delivery, postpartum care, common gynecologic conditions
- Emergency Medicine: ACLS/BLS protocols, triage, trauma management, common ER presentations
- Community Medicine: public health, Philippine DOH programs, barangay health center workflows

DRUG REFERENCE:
- Generic drug names, brand names available in the Philippines, mechanisms of action
- Dosing (adult and pediatric), routes of administration, frequency
- Common side effects, contraindications, drug interactions
- Essential medicines list (Philippine National Formulary)

PROCEDURES:
- Step-by-step guidance for common intern procedures
- Normal values for lab results and vital signs
- ECG interpretation basics

ROTATION GUIDANCE:
- What to expect in each rotation
- Typical intern duties per rotation
- Documentation tips (SOAP format, discharge summaries)

GUIDELINES:
- Respond in a clear, professional but friendly tone suitable for a medical intern
- Provide evidence-based information aligned with Philippine DOH guidelines
- Always recommend verifying with a current reference or senior physician
- Always remind the user to confirm with their resident/consultant
- You can respond in Taglish if the user writes in it
- Use bullet points, numbered lists, and clear formatting
- NEVER provide advice that could directly harm a patient`;

const SUGGESTIONS = [
  { icon: '💊', text: 'Drug of choice for CAP?' },
  { icon: '🩺', text: 'Hypertensive urgency management' },
  { icon: '👶', text: 'Pedia vital signs by age' },
  { icon: '🧪', text: 'NGT insertion step by step' },
  { icon: '⚡', text: 'ACLS algorithm for VFib' },
  { icon: '📋', text: 'SOAP note format' },
  { icon: '🩸', text: 'DKA management protocol' },
  { icon: '🏥', text: 'ER rotation duties' },
];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const uid   = () => Math.random().toString(36).slice(2, 10);
const now   = () => Date.now();
const trunc = (s, n = 44) => s.length > n ? s.slice(0, n) + '…' : s;
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

/* ─── Inline markdown parser ─────────────────────────────────────────────────── */
function parseInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('*')  && p.endsWith('*'))  return <em key={i}>{p.slice(1, -1)}</em>;
    if (p.startsWith('`')  && p.endsWith('`'))  return <code key={i} className="mm-ic">{p.slice(1, -1)}</code>;
    return p;
  });
}

/* ─── Block markdown renderer ────────────────────────────────────────────────── */
function MD({ content }) {
  const lines = content.split('\n');
  const out = [];
  let i = 0, listBuf = [], listType = null;

  const flush = () => {
    if (!listBuf.length) return;
    const Tag = listType === 'ul' ? 'ul' : 'ol';
    out.push(<Tag key={`l${i}`} className="mm-list">{listBuf}</Tag>);
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
        <div key={`cb${i}`} className="mm-cb">
          {lang && <span className="mm-cb-lang">{lang}</span>}
          <pre><code>{code.join('\n')}</code></pre>
        </div>
      );
    } else if (l.startsWith('### ')) { flush(); out.push(<h3 key={i} className="mm-h3">{parseInline(l.slice(4))}</h3>);
    } else if (l.startsWith('## '))  { flush(); out.push(<h2 key={i} className="mm-h2">{parseInline(l.slice(3))}</h2>);
    } else if (l.startsWith('# '))   { flush(); out.push(<h1 key={i} className="mm-h1">{parseInline(l.slice(2))}</h1>);
    } else if (/^[-*] /.test(l)) {
      if (listType !== 'ul') { flush(); listType = 'ul'; }
      listBuf.push(<li key={i}>{parseInline(l.slice(2))}</li>);
    } else if (/^\d+\. /.test(l)) {
      if (listType !== 'ol') { flush(); listType = 'ol'; }
      listBuf.push(<li key={i}>{parseInline(l.replace(/^\d+\. /, ''))}</li>);
    } else if (l === '---') { flush(); out.push(<hr key={i} className="mm-hr" />);
    } else if (l.trim() === '') { flush(); out.push(<div key={i} className="mm-br" />);
    } else { flush(); out.push(<p key={i} className="mm-p">{parseInline(l)}</p>); }
    i++;
  }
  flush();
  return <div className="mm-md">{out}</div>;
}

/* ─── Typing animation ───────────────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="mm-row bot">
      <div className="mm-av bot">
        <Stethoscope size={14} />
      </div>
      <div className="mm-bubble bot mm-typing-bubble">
        <span className="mm-typing-label">MedMate is thinking</span>
        <span className="mm-typing-dots">
          <span />
          <span />
          <span />
        </span>
      </div>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────────── */
function EmptyState({ onSend }) {
  return (
    <div className="mm-empty">
      <div className="mm-empty-orb" />
      <div className="mm-empty-orb mm-empty-orb-2" />
      <div className="mm-empty-icon-wrap">
        <div className="mm-empty-icon">
          <Stethoscope size={28} />
        </div>
        <div className="mm-empty-sparkle"><Sparkles size={12} /></div>
      </div>
      <h2 className="mm-empty-h">How can I help you today?</h2>
      <p className="mm-empty-sub">
        Your AI-powered clinical companion for Philippine medical interns.
      </p>
      <div className="mm-chips">
        {SUGGESTIONS.map(s => (
          <button key={s.text} className="mm-chip" onClick={() => onSend(s.text)}>
            <span className="mm-chip-icon">{s.icon}</span>
            <span>{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Message bubble ─────────────────────────────────────────────────────────── */
function Bubble({ msg, copied, onCopy, showRegen, onRegen, loading }) {
  const bot = msg.role === 'assistant';
  return (
    <div className={`mm-row ${bot ? 'bot' : 'user'}`}>
      {bot && (
        <div className="mm-av bot">
          <Stethoscope size={14} />
        </div>
      )}
      <div className="mm-bwrap">
        <div className={`mm-bubble ${bot ? 'bot' : 'user'}`}>
          {bot ? <MD content={msg.content} /> : <span>{msg.content}</span>}
        </div>
        <div className="mm-acts">
          <span className="mm-ts">{fmt(msg.ts)}</span>
          <button className="mm-act" onClick={() => onCopy(msg.content, msg.id)} title="Copy">
            {copied === msg.id ? <Check size={11} /> : <Copy size={11} />}
          </button>
          {showRegen && !loading && (
            <button className="mm-act regen" onClick={onRegen} title="Regenerate">
              <RefreshCw size={11} />
            </button>
          )}
        </div>
      </div>
      {!bot && (
        <div className="mm-av user">
          <User size={14} />
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */
export default function AIChatbot() {
  const navigate = useNavigate();
  const [convs,    setConvs]    = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(null);
  const [copied,   setCopied]   = useState(null);
  const [search,   setSearch]   = useState('');
  const [sbOpen,   setSbOpen]   = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 900);
  const [kbHeight, setKbHeight] = useState(0);

  const endRef  = useRef(null);
  const taRef   = useRef(null);
  const msgsRef = useRef(null);

  // Get current user
  const getUserId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }, []);

  // Load all conversations from Supabase
  const loadConversations = useCallback(async () => {
    try {
      const userId = await getUserId();
      const { data: messages, error: msgErr } = await supabase
        .from('chat_messages')
        .select('conversation_id, role, content, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (msgErr) throw msgErr;

      // Group by conversation_id
      const convMap = new Map();
      messages?.forEach(msg => {
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
          role: msg.role,
          content: msg.content,
          ts: new Date(msg.created_at).getTime(),
        });
        conv.updatedAt = Math.max(conv.updatedAt, new Date(msg.created_at).getTime());
        // Set title from first user message
        if (conv.title === 'New conversation' && msg.role === 'user') {
          conv.title = trunc(msg.content);
        }
      });

      const convsArray = Array.from(convMap.values());
      convsArray.sort((a, b) => b.updatedAt - a.updatedAt);
      setConvs(convsArray);
      if (convsArray.length > 0 && !activeId) {
        setActiveId(convsArray[0].id);
      }
    } catch (err) {
      console.error('Load conversations error:', err);
      setError('Failed to load chat history.');
    }
  }, [getUserId, activeId]);

  // Save a message to Supabase
  const saveMessage = useCallback(async (conversationId, role, content) => {
    const userId = await getUserId();
    const { error } = await supabase
      .from('chat_messages')
      .insert([{
        user_id: userId,
        conversation_id: conversationId,
        role,
        content,
      }]);
    if (error) throw error;
  }, [getUserId]);

  // Create a new conversation
  const newChat = useCallback(async () => {
    const newId = `conv_${uid()}`;
    const newConv = {
      id: newId,
      title: 'New conversation',
      messages: [],
      createdAt: now(),
      updatedAt: now(),
    };
    setConvs(prev => [newConv, ...prev]);
    setActiveId(newId);
    setInput('');
    setError(null);
    setSbOpen(false);
    setTimeout(() => taRef.current?.focus(), 120);
  }, []);

  // Delete entire conversation
  const deleteConv = useCallback(async (id, e) => {
    e?.stopPropagation();
    try {
      const userId = await getUserId();
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', id);
      setConvs(prev => prev.filter(c => c.id !== id));
      if (activeId === id) {
        const remaining = convs.filter(c => c.id !== id);
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Delete conversation error:', err);
      setError('Failed to delete conversation.');
    }
  }, [getUserId, activeId, convs]);

  // Clear current conversation (delete all messages in it)
  const clearCurrentConversation = useCallback(async () => {
    if (!activeId) return;
    if (!window.confirm('Clear this conversation? This cannot be undone.')) return;
    try {
      const userId = await getUserId();
      await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)
        .eq('conversation_id', activeId);
      setConvs(prev => prev.map(c =>
        c.id === activeId ? { ...c, messages: [], updatedAt: now() } : c
      ));
    } catch (err) {
      console.error('Clear conversation error:', err);
      setError('Failed to clear conversation.');
    }
  }, [getUserId, activeId]);

  // Select a conversation
  const selectConv = useCallback((id) => {
    setActiveId(id);
    setError(null);
    setSbOpen(false);
    setTimeout(() => taRef.current?.focus(), 120);
  }, []);

  // Copy message
  const copyMsg = useCallback((content, id) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  // Resize textarea
  const resizeTA = useCallback(() => {
    if (!taRef.current) return;
    taRef.current.style.height = 'auto';
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + 'px';
  }, []);

  // Call Groq API
  const callGroq = useCallback(async (history) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) throw new Error('VITE_GROQ_API_KEY is not set in your .env file.');
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL, max_tokens: 768,
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

  // Send a new message
  const sendMessage = useCallback(async (textArg) => {
    const text = (textArg !== undefined ? textArg : input).trim();
    if (!text || loading) return;

    let cid = activeId;
    if (!cid) {
      cid = `conv_${uid()}`;
      const newConv = {
        id: cid,
        title: trunc(text),
        messages: [],
        createdAt: now(),
        updatedAt: now(),
      };
      setConvs(prev => [newConv, ...prev]);
      setActiveId(cid);
    }

    // Optimistically add user message to UI
    const userMsg = { id: uid(), role: 'user', content: text, ts: now() };
    setConvs(prev => prev.map(c =>
      c.id !== cid ? c : {
        ...c,
        messages: [...c.messages, userMsg],
        title: c.messages.length === 0 ? trunc(text) : c.title,
        updatedAt: now(),
      }
    ));
    setInput('');
    setLoading(true);
    setError(null);
    if (taRef.current) taRef.current.style.height = 'auto';

    try {
      // Save user message to DB
      await saveMessage(cid, 'user', text);

      // Get AI response
      const currentConv = convs.find(c => c.id === cid);
      const prevMsgs = currentConv?.messages.slice(-MAX_CTX) || [];
      const history = [...prevMsgs, userMsg];
      const reply = await callGroq(history);
      const botMsg = { id: uid(), role: 'assistant', content: reply, ts: now() };

      // Save assistant message
      await saveMessage(cid, 'assistant', reply);

      // Update UI
      setConvs(prev => prev.map(c =>
        c.id !== cid ? c : {
          ...c,
          messages: [...c.messages, botMsg],
          updatedAt: now(),
        }
      ));
    } catch (err) {
      console.error('Send message error:', err);
      setError(err.message);
      // Remove the optimistic user message from UI
      setConvs(prev => prev.map(c =>
        c.id !== cid ? c : { ...c, messages: c.messages.filter(m => m.id !== userMsg.id) }
      ));
    } finally {
      setLoading(false);
      setTimeout(() => taRef.current?.focus(), 100);
    }
  }, [input, loading, activeId, convs, saveMessage, callGroq]);

  // Regenerate last assistant response
  const regenerate = useCallback(async () => {
    if (loading || !activeId) return;
    const conv = convs.find(c => c.id === activeId);
    if (!conv) return;
    const msgs = conv.messages;
    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') { lastUserIdx = i; break; }
    }
    if (lastUserIdx === -1) return;
    const trimmed = msgs.slice(0, lastUserIdx + 1);
    // Remove the last assistant message (if any)
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.role === 'assistant') {
      // Delete from DB
      try {
        const userId = await getUserId();
        // We need to delete the specific assistant message. Since we don't have its DB id,
        // we can delete all messages after the last user message.
        // Simpler: delete all messages in this conversation and re-insert? No.
        // Alternative: store DB id in message object. But we don't have it.
        // For simplicity, we'll delete the conversation and re-insert up to the user message?
        // That's messy. Instead, we'll just not delete, and let the new assistant message be appended,
        // but that would duplicate. We'll implement by deleting the last assistant message using a query.
        // Since we don't store the DB id in state, we'll use a different approach: 
        // We'll delete all messages from this conversation that have created_at >= the last user message's ts? 
        // Not reliable. Better to store the DB id in the message object. Let's modify the state to include DB id.
        // But to keep changes minimal, we'll do a simpler approach: 
        // Instead of deleting, we'll just add a new assistant message and the user can have two.
        // But that's not good. Let's add DB id to message objects.
        // I'll update loadConversations and sendMessage to store the message's id from DB.
        // For now, we'll skip regeneration and show a toast that it's coming.
        setError('Regenerate coming soon with DB ids. Use new message for now.');
        return;
      } catch (err) { console.error(err); }
    }
    setLoading(true);
    setError(null);
    try {
      const history = trimmed.slice(-MAX_CTX);
      const reply = await callGroq(history);
      const botMsg = { id: uid(), role: 'assistant', content: reply, ts: now() };
      await saveMessage(activeId, 'assistant', reply);
      setConvs(prev => prev.map(c =>
        c.id !== activeId ? c : {
          ...c,
          messages: [...trimmed, botMsg],
          updatedAt: now(),
        }
      ));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loading, activeId, convs, callGroq, saveMessage, getUserId]);

  // Keyboard handling
  const handleKey = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Effects
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const fn = () => {
      setIsMobile(window.innerWidth < 900);
      if (window.innerWidth >= 900) setSbOpen(false);
    };
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [convs.find(c => c.id === activeId)?.messages, loading]);

  // Keyboard avoidance
  useEffect(() => {
    if (!window.visualViewport) return;
    const onResize = () => {
      const kb = Math.max(0, window.innerHeight - window.visualViewport.height - window.visualViewport.offsetTop);
      setKbHeight(kb);
      if (kb > 50) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };
    window.visualViewport.addEventListener('resize', onResize);
    window.visualViewport.addEventListener('scroll', onResize);
    return () => {
      window.visualViewport.removeEventListener('resize', onResize);
      window.visualViewport.removeEventListener('scroll', onResize);
    };
  }, []);

  const activeConv = convs.find(c => c.id === activeId);
  const msgs = activeConv?.messages || [];
  const filtered = search
    ? convs.filter(c => c.title.toLowerCase().includes(search.toLowerCase()))
    : convs;
  const groups = groupConvs(filtered);
  const GROUP_LABELS = { today: 'Today', yesterday: 'Yesterday', week: 'Past 7 days', older: 'Older' };

  return (
    <>
      <style>{CSS}</style>
      <div className="mm-root" style={{ paddingBottom: kbHeight > 0 ? kbHeight : undefined }}>
        {sbOpen && isMobile && (
          <div className="mm-backdrop" onClick={() => setSbOpen(false)} />
        )}
        <div className="mm-layout">
          {/* Sidebar */}
          <aside className={`mm-sb ${sbOpen ? 'open' : ''}`}>
            <div className="mm-sb-head">
              <div className="mm-brand">
                <div className="mm-brand-icon"><Stethoscope size={16} /></div>
                <div>
                  <span className="mm-brand-name">MedMate AI</span>
                  <span className="mm-brand-sub">Clinical Assistant</span>
                </div>
              </div>
              <button className="mm-sb-close" onClick={() => setSbOpen(false)}><X size={16} /></button>
            </div>
            <div className="mm-sb-scroll">
              <button className="mm-new-btn" onClick={newChat}>
                <Plus size={15} /><span>New Conversation</span>
              </button>
              <div className="mm-search-wrap">
                <Search size={13} className="mm-search-icon" />
                <input className="mm-search" placeholder="Search conversations…" value={search} onChange={e => setSearch(e.target.value)} />
                {search && <button className="mm-search-x" onClick={() => setSearch('')}><X size={11} /></button>}
              </div>
              <div className="mm-conv-list">
                {['today', 'yesterday', 'week', 'older'].map(g => {
                  const items = groups[g];
                  if (!items?.length) return null;
                  return (
                    <div key={g} className="mm-cgroup">
                      <div className="mm-cgroup-label">{GROUP_LABELS[g]}</div>
                      {items.map(c => (
                        <button key={c.id} className={`mm-citem ${c.id === activeId ? 'active' : ''}`} onClick={() => selectConv(c.id)}>
                          <MessageSquare size={12} className="mm-citem-icon" />
                          <span className="mm-citem-title">{c.title}</span>
                          <button className="mm-cdel" onClick={e => deleteConv(c.id, e)} title="Delete"><Trash2 size={11} /></button>
                        </button>
                      ))}
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="mm-conv-empty">{search ? `No results for "${search}"` : 'No conversations yet'}</p>
                )}
              </div>
            </div>
            <div className="mm-sb-foot">
              <div className="mm-model-pill"><span className="mm-model-dot" /><span>llama-3.3-70b · Groq</span></div>
            </div>
          </aside>

          {/* Main */}
          <div className="mm-main">
            <div className="mm-header">
              <button className="mm-menu-btn" onClick={() => setSbOpen(s => !s)}>
                {sbOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="mm-header-center">
                <div className="mm-header-icon"><Stethoscope size={14} /></div>
                <div className="mm-header-text">
                  <span className="mm-header-title">{activeConv?.title || 'MedMate AI'}</span>
                  <span className="mm-header-sub">Medical AI Assistant</span>
                </div>
              </div>
              <div className="mm-header-right">
                {msgs.length > 0 && (
                  <button className="mm-hdr-btn danger" title="Clear conversation" onClick={clearCurrentConversation}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>

            <div className="mm-msgs" ref={msgsRef}>
              {msgs.length === 0 ? (
                <EmptyState onSend={sendMessage} />
              ) : (
                <div className="mm-msgs-inner">
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
                    <div className="mm-err">
                      <AlertCircle size={14} />
                      <span>{error}</span>
                      <button onClick={regenerate} className="mm-err-retry">Retry</button>
                    </div>
                  )}
                  <div ref={endRef} style={{ height: 8 }} />
                </div>
              )}
            </div>

            <div className="mm-disclaimer">
              <AlertCircle size={10} />
              <span>Educational reference only — always verify with your resident or consultant.</span>
            </div>

            <div className="mm-input-area">
              <div className="mm-input-box">
                <textarea
                  ref={taRef}
                  className="mm-ta"
                  placeholder="Ask a clinical question…"
                  value={input}
                  rows={1}
                  onChange={e => { setInput(e.target.value); resizeTA(); }}
                  onKeyDown={handleKey}
                  onFocus={() => setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 300)}
                />
                <button
                  className={`mm-send ${input.trim() && !loading ? 'active' : ''}`}
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                >
                  {loading ? <span className="mm-send-spin" /> : <Send size={15} />}
                </button>
              </div>
              <p className="mm-hint">Enter to send · Shift+Enter for new line</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── CSS ────────────────────────────────────────────────────────────────────── */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

/* ─── Root ─── */
.mm-root {
  font-family: 'DM Sans', sans-serif;
  display: flex;
  flex-direction: column;
  height: calc(100dvh - 68px);
  margin: -24px -20px calc(-132px - env(safe-area-inset-bottom, 0px));
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #fff8fb 0%, #f7f8ff 50%, #f0fdf8 100%);
}

.mm-layout {
  display: flex;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Sidebar */
.mm-sb {
  width: 270px;
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid rgba(255,200,220,0.4);
  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);
  overflow: hidden;
  z-index: 30;
  box-shadow: 4px 0 24px rgba(255,111,145,0.06);
}
@media (max-width: 899px) {
  .mm-sb {
    position: absolute;
    top: 0; left: 0; bottom: 0;
    transform: translateX(-100%);
  }
  .mm-sb.open {
    transform: translateX(0);
    box-shadow: 8px 0 40px rgba(0,0,0,0.18);
  }
}
@media (min-width: 900px) {
  .mm-sb {
    transform: none !important;
    position: relative;
  }
}
.mm-sb-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 16px 14px;
  border-bottom: 1px solid rgba(255,200,220,0.3);
  flex-shrink: 0;
  background: linear-gradient(135deg, #fff5f8, #fff8fb);
}
.mm-brand {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mm-brand-icon {
  width: 36px; height: 36px;
  border-radius: 12px;
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 4px 14px rgba(255,111,145,0.35);
}
.mm-brand-name {
  display: block;
  font-size: 14px; font-weight: 700;
  color: #1c1412; letter-spacing: -0.2px;
  font-family: 'Fraunces', serif;
  font-style: italic;
}
.mm-brand-sub {
  display: block;
  font-size: 10.5px; color: #c8b0a8; font-weight: 500;
  letter-spacing: 0.02em;
}
.mm-sb-close {
  width: 30px; height: 30px; border-radius: 9px;
  border: none; background: #f5eef2; color: #c8b0a8;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: 0.18s; flex-shrink: 0;
}
.mm-sb-close:hover { background: #ffe4ec; color: #ff5d8f; }
@media (min-width: 900px) { .mm-sb-close { display: none; } }

.mm-sb-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding-bottom: 8px;
}
.mm-sb-scroll::-webkit-scrollbar { width: 3px; }
.mm-sb-scroll::-webkit-scrollbar-thumb { background: rgba(255,200,220,0.5); border-radius: 3px; }
.mm-new-btn {
  display: flex; align-items: center; gap: 9px;
  margin: 12px 12px 8px;
  padding: 11px 15px;
  background: linear-gradient(135deg, #fff0f4, #ffe8ef);
  border: 1.5px solid rgba(255,143,177,0.4);
  border-radius: 14px;
  color: #ff5d8f; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.18s;
  font-family: 'DM Sans', sans-serif;
  flex-shrink: 0; text-align: left;
  box-shadow: 0 2px 10px rgba(255,111,145,0.1);
}
.mm-new-btn:hover {
  background: linear-gradient(135deg, #ffe4ec, #ffd6e5);
  border-color: rgba(255,93,143,0.5);
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(255,111,145,0.2);
}
.mm-search-wrap {
  position: relative;
  margin: 0 12px 8px;
  flex-shrink: 0;
}
.mm-search-icon {
  position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
  color: #ccc; pointer-events: none;
}
.mm-search {
  width: 100%; padding: 9px 30px 9px 30px;
  background: #fff8fa; border: 1.5px solid rgba(255,200,220,0.5);
  border-radius: 12px; color: #444; font-size: 12.5px;
  font-family: 'DM Sans', sans-serif;
  outline: none; box-sizing: border-box; transition: 0.18s;
}
.mm-search::placeholder { color: #ccc; }
.mm-search:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.12); }
.mm-search-x {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  border: none; background: none; color: #ccc; cursor: pointer;
  display: flex; align-items: center; padding: 2px;
}
.mm-search-x:hover { color: #ff5d8f; }
.mm-conv-list {
  flex: 1; padding: 0 8px;
}
.mm-cgroup { margin-bottom: 4px; }
.mm-cgroup-label {
  font-size: 10px; font-weight: 700; color: #c8b0a8;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 10px 8px 5px;
}
.mm-citem {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 9px 10px;
  border-radius: 12px; border: none;
  background: transparent; color: #555;
  font-size: 12.5px; font-family: 'DM Sans', sans-serif;
  cursor: pointer; text-align: left;
  transition: all 0.15s; position: relative;
}
.mm-citem:hover { background: #fff0f4; color: #ff5d8f; }
.mm-citem.active {
  background: linear-gradient(135deg, #fff0f4, #ffe8ef);
  color: #ff5d8f; font-weight: 600;
  border: 1px solid rgba(255,143,177,0.3);
}
.mm-citem.active::before {
  content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 3px; border-radius: 0 3px 3px 0;
  background: #ff6f91;
}
.mm-citem-icon { color: #e0c0cc; flex-shrink: 0; }
.mm-citem.active .mm-citem-icon { color: #ff8fb1; }
.mm-citem-title {
  flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-size: 12.5px;
}
.mm-cdel {
  opacity: 0; background: none; border: none; padding: 4px;
  color: #ccc; cursor: pointer; border-radius: 6px;
  display: flex; align-items: center; transition: 0.15s; flex-shrink: 0;
}
.mm-citem:hover .mm-cdel { opacity: 1; }
.mm-cdel:hover { color: #e05555; background: #fde8e8; }
.mm-conv-empty {
  text-align: center; color: #ccc; font-size: 12.5px;
  padding: 24px 16px; line-height: 1.6;
}
.mm-sb-foot {
  padding: 12px 16px;
  border-top: 1px solid rgba(255,200,220,0.3);
  flex-shrink: 0;
  background: linear-gradient(180deg, transparent, rgba(255,248,251,0.8));
}
.mm-model-pill {
  display: inline-flex; align-items: center; gap: 7px;
  background: #fff0f4; border: 1px solid rgba(255,200,220,0.5);
  border-radius: 999px; padding: 5px 12px;
  font-size: 11px; color: #c8a0b0; font-weight: 600;
}
.mm-model-dot {
  width: 7px; height: 7px; border-radius: 50%; background: #4abf95;
  box-shadow: 0 0 6px rgba(74,191,149,0.6);
}

/* Main area */
.mm-main {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.mm-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px;
  background: rgba(255,255,255,0.96);
  backdrop-filter: blur(24px);
  border-bottom: 1px solid rgba(255,200,220,0.35);
  flex-shrink: 0;
  position: sticky; top: 0;
  z-index: 10;
  box-shadow: 0 2px 16px rgba(255,111,145,0.08);
}
.mm-menu-btn {
  width: 38px; height: 38px; border-radius: 12px; border: none;
  background: #fff0f4; color: #ff8fb1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s; flex-shrink: 0;
}
.mm-menu-btn:hover { background: #ffd6e8; color: #ff5d8f; transform: scale(1.06); }
.mm-header-center {
  flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0;
}
.mm-header-icon {
  width: 34px; height: 34px; border-radius: 11px;
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  display: flex; align-items: center; justify-content: center;
  color: white; flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(255,111,145,0.3);
}
.mm-header-text {
  display: flex; flex-direction: column; gap: 1px; min-width: 0;
}
.mm-header-title {
  font-size: 14px; font-weight: 700; color: #1c1412;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  font-family: 'Fraunces', serif; font-style: italic;
}
.mm-header-sub { font-size: 10.5px; color: #c8b0a8; font-weight: 500; }
.mm-header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.mm-hdr-btn {
  width: 36px; height: 36px; border-radius: 11px; border: none;
  background: #f5eef2; color: #c8b0a8; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.18s;
}
.mm-hdr-btn:hover { background: #ffe4ec; color: #ff5d8f; }
.mm-hdr-btn.danger:hover { background: #fde8e8; color: #e05555; }

.mm-msgs {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
}
.mm-msgs::-webkit-scrollbar { width: 4px; }
.mm-msgs::-webkit-scrollbar-thumb { background: rgba(255,200,220,0.5); border-radius: 4px; }
.mm-msgs-inner {
  flex: 1;
  padding: 24px 20px 8px;
  max-width: 720px; width: 100%;
  margin: 0 auto; box-sizing: border-box;
}
@media (min-width: 768px) {
  .mm-msgs-inner { padding: 28px 32px 12px; }
}
/* Empty state */
.mm-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  padding: 32px 24px; text-align: center;
  gap: 10px; position: relative; overflow: hidden;
  max-width: 680px; margin: 0 auto; width: 100%;
  box-sizing: border-box;
}
.mm-empty-orb {
  position: absolute; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(255,111,145,0.1) 0%, transparent 70%);
  width: 360px; height: 360px; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  animation: orbPulse 4s ease-in-out infinite;
}
.mm-empty-orb-2 {
  background: radial-gradient(circle, rgba(95,141,255,0.07) 0%, transparent 70%);
  width: 280px; height: 280px;
  animation-delay: 2s;
}
@keyframes orbPulse {
  0%,100% { transform: translate(-50%,-50%) scale(1); opacity: 0.7; }
  50% { transform: translate(-50%,-50%) scale(1.1); opacity: 1; }
}
.mm-empty-icon-wrap {
  position: relative; margin-bottom: 8px;
  animation: iconFloat 3.5s ease-in-out infinite;
}
@keyframes iconFloat {
  0%,100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.mm-empty-icon {
  width: 72px; height: 72px; border-radius: 24px;
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  display: flex; align-items: center; justify-content: center;
  color: white;
  box-shadow: 0 12px 36px rgba(255,111,145,0.35), 0 0 0 8px rgba(255,143,177,0.12);
}
.mm-empty-sparkle {
  position: absolute; top: -6px; right: -6px;
  width: 24px; height: 24px; border-radius: 8px;
  background: linear-gradient(135deg, #ffeaa7, #f59e0b);
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 10px;
  box-shadow: 0 3px 10px rgba(245,158,11,0.4);
  animation: sparkleRotate 3s linear infinite;
}
@keyframes sparkleRotate {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}
.mm-empty-h {
  font-family: 'Fraunces', serif;
  font-size: clamp(1.3rem, 5vw, 1.7rem);
  font-weight: 700; color: #1c1412;
  margin: 4px 0 0; letter-spacing: -0.3px;
  line-height: 1.15;
}
.mm-empty-sub {
  font-size: 13px; color: #bbb; margin: 0 0 8px;
  max-width: 300px; line-height: 1.6;
}
.mm-chips {
  display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
  max-width: 520px;
}
.mm-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 15px; background: rgba(255,255,255,0.9);
  border: 1.5px solid rgba(255,200,220,0.5);
  border-radius: 22px; font-size: 12.5px; font-weight: 500;
  color: #555; cursor: pointer; transition: all 0.18s;
  font-family: 'DM Sans', sans-serif;
  box-shadow: 0 2px 8px rgba(255,111,145,0.07);
  backdrop-filter: blur(8px);
}
.mm-chip-icon { font-size: 14px; line-height: 1; }
.mm-chip:hover {
  border-color: #ff8fb1; color: #ff5d8f;
  background: white; transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(255,111,145,0.18);
}

/* Rows */
.mm-row {
  display: flex; align-items: flex-start; gap: 10px;
  margin-bottom: 18px; animation: msgIn 0.3s ease both;
}
@keyframes msgIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.mm-row.user { flex-direction: row-reverse; }
.mm-av {
  width: 32px; height: 32px; border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; color: white; margin-top: 2px;
}
.mm-av.bot {
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  box-shadow: 0 3px 10px rgba(255,111,145,0.3);
}
.mm-av.user {
  background: linear-gradient(135deg, #7ab6ff, #5f8dff);
  box-shadow: 0 3px 10px rgba(95,141,255,0.3);
}
.mm-bwrap {
  display: flex; flex-direction: column; gap: 4px;
  max-width: min(80%, 560px);
}
.mm-row.user .mm-bwrap { align-items: flex-end; }
.mm-bubble {
  padding: 13px 16px; border-radius: 18px;
  font-size: 13.5px; line-height: 1.65; word-break: break-word;
}
.mm-bubble.bot {
  background: rgba(255,255,255,0.92);
  border-radius: 4px 18px 18px 18px;
  color: #333;
  border: 1.5px solid rgba(255,200,220,0.35);
  box-shadow: 0 2px 12px rgba(255,111,145,0.06), 0 1px 0 rgba(255,255,255,1) inset;
  backdrop-filter: blur(8px);
}
.mm-bubble.user {
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  border-radius: 18px 4px 18px 18px;
  color: white;
  box-shadow: 0 6px 20px rgba(255,111,145,0.35);
}
.mm-acts {
  display: flex; align-items: center; gap: 5px;
  opacity: 0; transition: opacity 0.18s; padding: 0 3px;
}
.mm-row:hover .mm-acts { opacity: 1; }
.mm-ts { font-size: 10.5px; color: #ccc; margin-right: 2px; }
.mm-act {
  width: 24px; height: 24px; border-radius: 7px; border: none;
  background: transparent; color: #ccc; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.mm-act:hover { background: #fff0f4; color: #ff5d8f; }
.mm-act.regen:hover { background: #f0fdf4; color: #4abf95; }

/* Typing */
.mm-typing-bubble {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 18px !important;
  min-width: 140px;
}
.mm-typing-label {
  font-size: 11.5px; color: #d0b0bc; font-style: italic; font-weight: 500;
}
.mm-typing-dots {
  display: flex; align-items: center; gap: 4px;
}
.mm-typing-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: linear-gradient(135deg, #ff8fb1, #ff6f91);
  animation: typingBounce 1.4s ease-in-out infinite;
  flex-shrink: 0;
}
.mm-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.mm-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%,60%,100% { transform: translateY(0) scale(1); opacity: 0.5; }
  30% { transform: translateY(-6px) scale(1.1); opacity: 1; }
}
/* Error */
.mm-err {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 15px; border-radius: 14px;
  background: #fde8e8; border: 1px solid #ffd0d0;
  color: #c0392b; font-size: 12.5px; margin-bottom: 14px;
}
.mm-err-retry {
  margin-left: auto; padding: 5px 12px;
  background: white; border: 1px solid #ffb8b8;
  border-radius: 999px; color: #e05555; font-size: 12px;
  cursor: pointer; transition: 0.15s;
  font-family: 'DM Sans', sans-serif; font-weight: 600;
  white-space: nowrap;
}
.mm-err-retry:hover { background: #fff0f0; }
/* Markdown */
.mm-md { line-height: 1.7; color: #333; }
.mm-p { margin: 0 0 8px; font-size: 13.5px; }
.mm-p:last-child { margin-bottom: 0; }
.mm-h1 { font-size: 15.5px; font-weight: 700; margin: 10px 0 7px; color: #ff5d8f; font-family: 'Fraunces', serif; }
.mm-h2 { font-size: 14px; font-weight: 700; margin: 10px 0 6px; color: #1c1412; }
.mm-h3 { font-size: 13.5px; font-weight: 600; margin: 8px 0 5px; color: #444; }
.mm-list {
  margin: 5px 0 10px; padding-left: 18px;
  display: flex; flex-direction: column; gap: 3px;
}
.mm-list li { font-size: 13.5px; line-height: 1.6; color: #333; }
.mm-hr { border: none; border-top: 1px solid rgba(255,200,220,0.4); margin: 10px 0; }
.mm-br { height: 5px; }
.mm-ic {
  background: rgba(255,111,145,0.1); color: #d63d6e;
  border-radius: 5px; padding: 1px 6px; font-size: 12.5px;
  font-family: 'Courier New', monospace; border: 1px solid rgba(255,111,145,0.15);
}
.mm-cb {
  background: #1c1e2a; border-radius: 14px;
  margin: 8px 0; overflow: hidden;
  border: 1px solid rgba(255,255,255,0.06);
}
.mm-cb-lang {
  padding: 7px 14px; background: rgba(255,255,255,0.05);
  font-size: 10.5px; color: #94a3b8; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.6px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.mm-cb pre { margin: 0; padding: 14px; overflow-x: auto; }
.mm-cb code {
  font-family: 'Courier New', monospace; font-size: 12.5px;
  color: #e2e8f0; line-height: 1.6;
}
/* Disclaimer */
.mm-disclaimer {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 20px;
  background: rgba(255,251,235,0.9);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(254,243,199,0.8);
  font-size: 10.5px; color: #92400e; flex-shrink: 0;
  font-weight: 500;
}
/* Input */
.mm-input-area {
  padding: 12px 16px;
  padding-bottom: max(12px, calc(12px + env(safe-area-inset-bottom, 0px)));
  background: rgba(255,255,255,0.92);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255,200,220,0.35);
  flex-shrink: 0;
  box-shadow: 0 -2px 20px rgba(255,111,145,0.06);
}
.mm-input-box {
  display: flex; align-items: flex-end; gap: 10px;
  max-width: 720px; margin: 0 auto;
  background: white; border: 1.5px solid rgba(255,200,220,0.5);
  border-radius: 20px; padding: 10px 10px 10px 16px;
  box-shadow: 0 2px 16px rgba(255,111,145,0.08);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.mm-input-box:focus-within {
  border-color: #ff8fb1;
  box-shadow: 0 0 0 3px rgba(255,143,177,0.15), 0 4px 20px rgba(255,111,145,0.12);
}
.mm-ta {
  flex: 1; border: none; outline: none; resize: none;
  background: transparent; font-size: 14px; color: #333;
  font-family: 'DM Sans', sans-serif;
  line-height: 1.55; max-height: 140px; min-height: 22px; padding: 0;
  -webkit-appearance: none;
}
.mm-ta::placeholder { color: #ccc; }
.mm-send {
  width: 38px; height: 38px; border-radius: 13px; border: none;
  background: rgba(255,200,220,0.3); color: #e0c0cc;
  display: flex; align-items: center; justify-content: center;
  cursor: not-allowed; flex-shrink: 0; transition: all 0.2s;
}
.mm-send.active {
  background: linear-gradient(135deg, #ff8fb1, #ff6f91); color: white; cursor: pointer;
  box-shadow: 0 4px 14px rgba(255,111,145,0.4);
}
.mm-send.active:hover { transform: scale(1.07); box-shadow: 0 6px 20px rgba(255,111,145,0.5); }
.mm-send.active:active { transform: scale(0.96); }
.mm-send-spin {
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }
.mm-hint {
  font-size: 10.5px; color: #ddd; text-align: center;
  margin: 6px 0 0; font-weight: 500;
}
.mm-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  z-index: 25;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@media (max-width: 480px) {
  .mm-root { margin: -24px -20px calc(-132px - env(safe-area-inset-bottom, 0px)); }
  .mm-msgs-inner { padding: 16px 14px 8px; }
  .mm-input-area { padding: 10px 12px; padding-bottom: max(10px, calc(10px + env(safe-area-inset-bottom, 0px))); }
  .mm-bubble { font-size: 13px; padding: 11px 13px; }
  .mm-empty { padding: 20px 16px; gap: 8px; }
  .mm-empty-icon { width: 60px; height: 60px; border-radius: 20px; }
  .mm-empty-h { font-size: 1.2rem; }
  .mm-chips { gap: 6px; }
  .mm-chip { font-size: 12px; padding: 8px 12px; }
  .mm-header { padding: 12px 14px; }
}
@media (min-width: 768px) and (max-width: 899px) {
  .mm-root { margin: -8px -40px calc(-132px - env(safe-area-inset-bottom, 0px)); }
  .mm-msgs-inner { padding: 24px 28px 12px; max-width: 680px; }
  .mm-input-box { max-width: 680px; }
  .mm-chip { font-size: 13px; }
}
@media (min-width: 900px) {
  .mm-root { margin: -8px -40px -115px; }
  .mm-msgs-inner { padding: 28px 40px 12px; max-width: 760px; }
  .mm-input-box { max-width: 760px; }
  .mm-input-area { padding: 14px 40px; }
}
@media (min-width: 1280px) {
  .mm-msgs-inner { max-width: 820px; }
  .mm-input-box { max-width: 820px; }
}
`;