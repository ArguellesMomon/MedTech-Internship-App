import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  Plus, Edit3, Trash2, Search, X, Copy,
  Check, Star, StickyNote, FileText,
  ChevronDown, ChevronUp, ArrowUpDown,
  Filter, Settings2, Sparkles, SlidersHorizontal,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const DEFAULT_SECTIONS = [
  { id: 'Hematology',              color: '#ff6f91', bg: '#fff0f4' },
  { id: 'Clinical Chemistry',      color: '#ff8c5a', bg: '#fff5ee' },
  { id: 'Microbiology',            color: '#5f8dff', bg: '#eff4ff' },
  { id: 'Blood Bank',              color: '#e05555', bg: '#fff0f0' },
  { id: 'Histopathology/Cytology', color: '#4abf95', bg: '#edfaf4' },
];

const CUSTOM_SECTION_COLORS = [
  { color: '#8d6fff', bg: '#f5efff' }, { color: '#34b3ff', bg: '#e8f6ff' },
  { color: '#54c58e', bg: '#ecfbf2' }, { color: '#f6b45f', bg: '#fff4e8' },
  { color: '#f56b8a', bg: '#fff0f4' }, { color: '#b071ec', bg: '#f4ecff' },
  { color: '#26c6da', bg: '#e0f7fa' }, { color: '#ef6c00', bg: '#fff3e0' },
];

const CUSTOM_SECTION_STORAGE_KEY = 'rotation_guide.sections';

function colorToSoftBg(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#fff0f4';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = v => Math.round(v + (255 - v) * 0.88).toString(16).padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function generateSectionMeta(name) {
  const hash = name.split('').reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0);
  return CUSTOM_SECTION_COLORS[Math.abs(hash) % CUSTOM_SECTION_COLORS.length];
}

function normalizeStoredSections(saved) {
  if (!Array.isArray(saved)) return DEFAULT_SECTIONS;
  const merged = saved.some(s => DEFAULT_SECTIONS.some(base => base.id === s?.id))
    ? saved
    : [...DEFAULT_SECTIONS, ...saved];
  const seen = new Set();
  return merged.reduce((list, section) => {
    const id = typeof section?.id === 'string' ? section.id.trim() : '';
    if (!id || seen.has(id.toLowerCase())) return list;
    const meta = generateSectionMeta(id);
    const color = section.color || meta.color;
    seen.add(id.toLowerCase());
    list.push({ id, color, bg: section.bg || colorToSoftBg(color) });
    return list;
  }, []);
}

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'az',     label: 'A → Z'        },
  { id: 'za',     label: 'Z → A'        },
];

const MAX_BODY = 3000;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ─────────────────────────────────────────────
   MANAGE SECTIONS MODAL
───────────────────────────────────────────── */
function ManageSectionsModal({ sections, onAdd, onRemove, onColorChange, onClose }) {
  const [name,     setName]     = useState('');
  const [error,    setError]    = useState('');
  const [removing, setRemoving] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

  const allIds = sections.map(s => s.id);

  const handleAdd = () => {
    const label = name.trim();
    if (!label) { setError('Please enter a section name.'); return; }
    if (allIds.some(id => id.toLowerCase() === label.toLowerCase())) {
      setError('That section already exists.'); return;
    }
    onAdd(label); setName(''); setError('');
  };

  return (
    <div className="ms-overlay" onClick={onClose}>
      <div className="ms-modal" onClick={e => e.stopPropagation()}>
        <div className="ms-head">
          <div className="ms-head-left">
            <div className="ms-head-icon"><Settings2 size={18} /></div>
            <div>
              <h3 className="ms-title">Manage Sections</h3>
              <p className="ms-sub">Add, remove, and color your note sections</p>
            </div>
          </div>
          <button className="ms-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="ms-add-box">
          <p className="ms-box-label">New Section</p>
          <div className="ms-add-row">
            <input ref={inputRef} className="ms-input"
              placeholder="e.g. Immunology, Parasitology…"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              maxLength={40} />
            <button className="ms-add-btn" onClick={handleAdd}>
              <Plus size={15} /> Add
            </button>
          </div>
          {error && <p className="ms-error">{error}</p>}
        </div>

        <div>
          <p className="ms-box-label">
            Sections
            {sections.length > 0 && (
              <span className="ms-count">{sections.length}</span>
            )}
          </p>
          {sections.length === 0 ? (
            <div className="ms-empty">
              <span style={{ fontSize: 28 }}>🗂️</span>
              <p style={{ margin: 0, fontSize: 13, color: '#bbb' }}>No sections yet.</p>
            </div>
          ) : (
            <div className="ms-list">
              {sections.map(sec => {
                const meta  = { ...generateSectionMeta(sec.id), ...sec };
                const isRem = removing === sec.id;
                return (
                  <div key={sec.id} className={`ms-row ${isRem ? 'ms-row-rem' : ''}`}>
                    <div className="ms-row-main">
                      <div className="ms-sec-pill"
  style={{ background: colorToSoftBg(meta.color), color: meta.color, borderColor: meta.color + '44' }}>                        <span className="ms-dot" style={{ background: meta.color }} />
                        {sec.id}
                      </div>
                      <label className="ms-color-control" title={`Change ${sec.id} color`}>
                        <span className="ms-color-swatch" style={{ background: meta.color }} />
                        <input
                          type="color"
                          value={meta.color}
                          onChange={e => onColorChange(sec.id, e.target.value)}
                        />
                      </label>
                    </div>
                    {isRem ? (
                      <div className="ms-confirm">
                        <span>Remove?</span>
                        <button className="ms-yes" onClick={() => { onRemove(sec.id); setRemoving(null); }}>Yes</button>
                        <button className="ms-no"  onClick={() => setRemoving(null)}>No</button>
                      </div>
                    ) : (
                      <button className="ms-rm-btn" onClick={() => setRemoving(sec.id)}>
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="ms-note">
          <Sparkles size={12} style={{ color: '#ff8fb1', flexShrink: 0 }} />
          Removing a section hides it from new notes and filters; existing notes keep their label.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NOTE MODAL
───────────────────────────────────────────── */
function NoteModal({ editing, defaultSection, onClose, onSaved, allSections, sectionMap }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    title:        editing?.title        ?? '',
    body:         editing?.body         ?? '',
    section_name: editing?.section_name ?? defaultSection ?? allSections[0]?.id ?? '',
    is_staff_tip: editing?.is_staff_tip ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const charLeft    = MAX_BODY - form.body.length;
  const meta        = sectionMap[form.section_name] ?? generateSectionMeta(form.section_name);
  const accentColor = meta?.color ?? '#ff6f91';

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true); setError('');
    const payload = {
      title: form.title.trim(), body: form.body.trim(),
      section_name: form.section_name, is_staff_tip: form.is_staff_tip,
    };
    let result;
    if (editing) {
      result = await supabase.from('notes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('notes')
        .insert([{ ...payload, user_id: user.id }]).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="nm-overlay" onClick={onClose}>
      <div className="nm-sheet" onClick={e => e.stopPropagation()}>
        <div className="nm-header" style={{ background: `linear-gradient(135deg, ${accentColor}e0, ${accentColor})` }}>
          <div className="nm-header-left">
            <div className="nm-header-icon">
              {editing ? <Edit3 size={16} color="white" /> : <Plus size={16} color="white" />}
            </div>
            <span className="nm-header-title">{editing ? 'Edit Note' : 'New Note'}</span>
          </div>
          <button className="nm-header-close" onClick={onClose}><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit} className="nm-body">
          <div>
            <p className="nm-label">Section</p>
            <div className="nm-sec-pills">
              {allSections.map(s => {
                const sm = sectionMap[s.id] ?? generateSectionMeta(s.id);
                const on = form.section_name === s.id;
                return (
                  <button key={s.id} type="button" className="nm-sec-pill"
                    style={on
                      ? { background: sm.color, borderColor: sm.color, color: '#fff', boxShadow: `0 4px 12px ${sm.color}44` }
                      : { borderColor: sm.color + '55', color: sm.color }}
                    onClick={() => setForm({ ...form, section_name: s.id })}>
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="nm-label">
            Title *
            <input className="nm-input" value={form.title} required maxLength={120}
              placeholder="Give your note a title…"
              style={{ '--a': accentColor }}
              onChange={e => setForm({ ...form, title: e.target.value })} />
          </label>

          <label className="nm-label">
            Content *
            <textarea className="nm-textarea" rows={5} required
              value={form.body} placeholder="Write your note, tip, or reminder…"
              style={{ '--a': accentColor }}
              onChange={e => { if (e.target.value.length <= MAX_BODY) setForm({ ...form, body: e.target.value }); }} />
            <span className={`nm-char ${charLeft < 50 ? 'warn' : ''}`}>{charLeft} left</span>
          </label>

          <div className="nm-toggle-row" onClick={() => setForm({ ...form, is_staff_tip: !form.is_staff_tip })}>
            <div className={`nm-toggle ${form.is_staff_tip ? 'on' : ''}`}>
              <span className="nm-knob" />
            </div>
            <span className="nm-toggle-label">
              <Star size={13} style={{ display: 'inline', marginRight: 5, verticalAlign: -2,
                color: form.is_staff_tip ? '#f59e0b' : '#ccc' }} />
              Mark as Staff Tip
            </span>
          </div>

          {error && <p className="nm-err">{error}</p>}

          <div className="nm-actions">
            <button type="submit" className="nm-submit"
              style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}
              disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Note' : 'Add Note'}
            </button>
            <button type="button" className="nm-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NOTE CARD
───────────────────────────────────────────── */
function NoteCard({ note, onOpen, onEdit, onDelete, sectionMap, style }) {
  const [copied,     setCopied]    = useState(false);
  const [confirmDel, setConfirmDel]= useState(false);

  const meta    = sectionMap[note.section_name] ?? generateSectionMeta(note.section_name);
  const isTip   = note.is_staff_tip;
  const preview = note.body.length > 160
    ? note.body.slice(0, 160) + '…'
    : note.body;

  const copyNote = async e => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openFromKeyboard = e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen(note);
    }
  };

  return (
    <article
      className={`nc-card ${isTip ? 'nc-tip' : ''}`}
      style={{ '--c': meta?.color ?? '#ff6f91', '--b': meta?.bg ?? '#fff0f4', ...style }}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(note)}
      onKeyDown={openFromKeyboard}
    >
      <div className="nc-tab" style={{ background: isTip ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : meta?.color }} />

      {isTip && (
        <div className="nc-tip-ribbon">
          <Star size={11} fill="currentColor" /> Staff Tip
        </div>
      )}

      <div className="nc-content">
        <div className="nc-top-row">
          <span className="nc-section-badge"
            style={{ background: meta?.bg, color: meta?.color }}>
            {note.section_name}
          </span>
          <div className="nc-btns">
            <button className="nc-btn" onClick={copyNote} title="Copy">
              {copied
                ? <Check size={12} style={{ color: '#4abf95' }} />
                : <Copy size={12} />}
            </button>
            <button className="nc-btn" onClick={e => { e.stopPropagation(); onEdit(note); }} title="Edit">
              <Edit3 size={12} />
            </button>
            {confirmDel ? (
              <span className="nc-del-confirm" onClick={e => e.stopPropagation()}>
                Delete?
                <button className="nc-del-yes" onClick={() => onDelete(note.id)}>Yes</button>
                <button className="nc-del-no"  onClick={() => setConfirmDel(false)}>No</button>
              </span>
            ) : (
              <button className="nc-btn nc-btn-del" onClick={e => { e.stopPropagation(); setConfirmDel(true); }} title="Delete">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        <h4 className="nc-title">{note.title}</h4>
        <p className="nc-body">{preview}</p>

        <span className="nc-open-hint" style={{ color: meta?.color }}>
          Open note
        </span>
      </div>

      <div className="nc-footer">
        <span className="nc-time">
          {note.updated_at && note.updated_at !== note.created_at
            ? `Edited ${timeAgo(note.updated_at)}`
            : `${timeAgo(note.created_at)}`}
        </span>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
   NOTE VIEW MODAL
───────────────────────────────────────────── */
function NoteViewModal({ note, onClose, onEdit, sectionMap }) {
  const [copied, setCopied] = useState(false);
  const meta  = sectionMap[note.section_name] ?? generateSectionMeta(note.section_name);
  const isTip = note.is_staff_tip;

  const copyNote = async () => {
    await navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="nv-overlay" onClick={onClose}>
      <div
        className="nv-modal"
        onClick={e => e.stopPropagation()}
        style={{ '--c': meta?.color ?? '#ff6f91', '--b': meta?.bg ?? '#fff0f4' }}
      >
        <div className="nv-top" style={{ background: meta?.color }}>
          <div className="nv-top-left">
            <FileText size={16} />
            <span>{isTip ? 'Staff Tip' : 'Note'}</span>
          </div>
          <button className="nv-close" onClick={onClose} title="Close"><X size={17} /></button>
        </div>

        <div className="nv-body">
          <div className="nv-meta-row">
            <span className="nv-section" style={{ background: meta?.bg, color: meta?.color }}>
              {note.section_name}
            </span>
            <span className="nv-time">
              {note.updated_at && note.updated_at !== note.created_at
                ? `Edited ${timeAgo(note.updated_at)}`
                : timeAgo(note.created_at)}
            </span>
          </div>

          <h3 className="nv-title">{note.title}</h3>
          <div className="nv-text">{note.body}</div>

          <div className="nv-actions">
            <button className="nv-action primary" onClick={copyNote}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="nv-action" onClick={() => { onClose(); onEdit(note); }}>
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN NOTES SECTION
───────────────────────────────────────────── */
export default function NotesSection() {
  const { user } = useAuth();

  const [notes,          setNotes]          = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [filterType,     setFilterType]     = useState('all');
  const [filterSection,  setFilterSection]  = useState('');
  const [sortBy,         setSortBy]         = useState('newest');
  const [showSort,       setShowSort]       = useState(false);
  const [showFilters,    setShowFilters]    = useState(false);
  const [showNoteModal,  setShowNoteModal]  = useState(false);
  const [viewingNote,    setViewingNote]    = useState(null);
  const [editingNote,    setEditingNote]    = useState(null);
  const [sections,       setSections]       = useState(DEFAULT_SECTIONS);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [showManage,     setShowManage]     = useState(false);

  /* ── Fetch notes ── */
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase.from('notes').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false });
      setNotes(data || []);
      setLoading(false);
    };
    fetch();
  }, [user.id]);

  /* ── Load custom sections from Supabase ── */
  useEffect(() => {
    const loadSections = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', CUSTOM_SECTION_STORAGE_KEY)
          .maybeSingle();

        if (error) {
          console.error('Load sections error:', error);
          setSections(DEFAULT_SECTIONS);
          setSectionsLoaded(true);
          return;
        }

        if (data && data.value && Array.isArray(data.value)) {
          console.log('Loaded sections from Supabase:', data.value);
          setSections(normalizeStoredSections(data.value));
        } else {
          console.log('No existing sections, using defaults');
          setSections(DEFAULT_SECTIONS);
        }
      } catch (err) {
        console.error('Unexpected load error:', err);
        setSections(DEFAULT_SECTIONS);
      } finally {
        setSectionsLoaded(true);
      }
    };

    loadSections();
  }, [user.id]);

  /* ── Save sections to Supabase whenever they change ── */
  useEffect(() => {
    if (!sectionsLoaded) return; // wait for initial load

    const saveSections = async () => {
      try {
        console.log('Saving sections to Supabase:', sections);
        const { error } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: user.id,
              key: CUSTOM_SECTION_STORAGE_KEY,
              value: sections,
            },
            { onConflict: 'user_id, key' }
          );

        if (error) {
          console.error('Save sections error:', error);
        } else {
          console.log('Sections saved successfully');
        }
      } catch (err) {
        console.error('Unexpected save error:', err);
      }
    };

    saveSections();
  }, [sections, sectionsLoaded, user.id]);

  const allSections = sections;
  const sectionMap  = useMemo(() => Object.fromEntries(allSections.map(s => [s.id, s])), [allSections]);

  /* ── Stats ── */
  const totalTips  = notes.filter(n => n.is_staff_tip).length;
  const totalNotes = notes.length - totalTips;

  /* ── Derived filter ── */
  const filtered = useMemo(() => {
    let r = [...notes];
    if (filterSection)          r = r.filter(n => n.section_name === filterSection);
    if (filterType === 'notes') r = r.filter(n => !n.is_staff_tip);
    if (filterType === 'tips')  r = r.filter(n => n.is_staff_tip);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    if (sortBy === 'oldest') r.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'az') r.sort((a,b) => a.title.localeCompare(b.title));
    else if (sortBy === 'za') r.sort((a,b) => b.title.localeCompare(a.title));
    return r;
  }, [notes, filterSection, filterType, search, sortBy]);

  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (filterSection ? 1 : 0);

  const handleAddSection = label => {
    const meta = generateSectionMeta(label);
    setSections(prev => [...prev, { id: label, color: meta.color, bg: meta.bg }]);
    setFilterSection(label);
  };
  const handleRemoveSection = id => {
    setSections(prev => prev.filter(s => s.id !== id));
    if (filterSection === id) setFilterSection('');
  };
  const handleSectionColorChange = (id, color) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, color, bg: colorToSoftBg(color) } : s));
  };
  const handleSaved = (saved, isEdit) => {
    setNotes(prev => isEdit ? prev.map(n => n.id === saved.id ? saved : n) : [saved, ...prev]);
  };
  const handleDelete = async id => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const currentSortLabel = SORT_OPTIONS.find(o => o.id === sortBy)?.label ?? 'Sort';
  const clearFilters = () => { setFilterType('all'); setFilterSection(''); };

  return (
    <>
      <style>{`
        /* (All your original styles remain exactly the same – no changes needed) */
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        .ns-page {
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          display: flex; flex-direction: column; gap: 0;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,220,232,0.55);
          border-radius: 28px;
          box-shadow: 0 2px 12px rgba(255,111,145,0.05), 0 6px 28px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          padding: 28px;
        }

        .ns-hero {
          padding-bottom: 22px;
          border-bottom: 1px solid rgba(255,200,220,0.3);
          margin-bottom: 22px;
          animation: ns-up 0.5s ease both;
        }

        .ns-hero-top {
          display: flex; align-items: flex-end;
          justify-content: space-between; gap: 16px; flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .ns-title {
          margin: 0;
          color: #1c1012;
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 5vw, 2.55rem);
          font-weight: 700;
          line-height: 1.08;
          letter-spacing: 0;
        }

        .ns-title-accent { color: #ff5d8f; font-style: italic; }

        .ns-stats {
          display: grid; grid-template-columns: repeat(3,1fr); gap: 1px;
          background: rgba(255,200,220,0.25);
          border-radius: 20px; overflow: hidden;
          border: 1px solid rgba(255,200,220,0.35);
        }

        .ns-stat {
          background: rgba(255,255,255,0.9);
          padding: 16px 18px;
          display: flex; flex-direction: column; gap: 3px;
        }

        .ns-stat-n {
          font-size: 2rem; font-weight: 800;
          color: #ff5d8f; line-height: 1; letter-spacing: 0;
          font-family: inherit;
        }

        .ns-stat-l {
          font-size: 11px; font-weight: 700; color: #c8b0a8;
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        .ns-stat:nth-child(2) .ns-stat-n { color: #f59e0b; }
        .ns-stat:nth-child(3) .ns-stat-n { color: #888; }

        .ns-toolbar {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 14px; flex-wrap: wrap;
          animation: ns-up 0.5s ease 0.05s both;
          position: relative; z-index: 20;
        }

        .ns-search-wrap {
          flex: 1; min-width: 180px; position: relative; display: flex; align-items: center;
        }
        .ns-si { position: absolute; left: 13px; color: #ccc; pointer-events: none; }
        .ns-search {
          width: 100%;
          border: 1.5px solid rgba(255,200,220,0.5);
          background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 11px 36px 11px 36px;
          font-size: 13px; outline: none; transition: 0.2s;
          color: #333; font-family: inherit;
        }
        .ns-search:focus {
          border-color: #ff8fb1; background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }
        .ns-sc { position: absolute; right: 12px; background: none; border: none; color: #bbb; cursor: pointer; display: flex; padding: 0; }

        .ns-sort-wrap { position: relative; z-index: 50; }
        .ns-sort-btn {
          display: flex; align-items: center; gap: 7px;
          border: 1.5px solid rgba(255,200,220,0.5);
          background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 15px;
          font-size: 13px; font-weight: 600; color: #888;
          cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit;
        }
        .ns-sort-btn:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .ns-sort-dd {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: white; border-radius: 18px; border: 1px solid #ffe0ea;
          box-shadow: 0 16px 40px rgba(255,111,145,0.15);
          overflow: hidden; z-index: 1000; min-width: 160px;
        }
        .ns-sort-opt {
          display: block; width: 100%; text-align: left; border: none;
          background: transparent; padding: 12px 16px; font-size: 13px; color: #555;
          cursor: pointer; transition: 0.15s; font-family: inherit;
        }
        .ns-sort-opt:hover  { background: #fff0f4; color: #ff5d8f; }
        .ns-sort-opt.active { color: #ff5d8f; font-weight: 700; background: #fff5f8; }

        .ns-filter-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: 1.5px solid rgba(255,200,220,0.5);
          background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 16px;
          font-size: 13px; font-weight: 600; color: #888;
          cursor: pointer; transition: all 0.2s; white-space: nowrap; font-family: inherit;
        }
        .ns-filter-btn:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .ns-filter-btn.has-filters {
          border-color: #ff8fb1; color: #ff5d8f;
          background: #fff0f4;
          box-shadow: 0 4px 16px rgba(255,111,145,0.18);
        }
        .ns-filter-count {
          display: inline-flex; align-items: center; justify-content: center;
          width: 18px; height: 18px; background: #ff5d8f; color: white;
          border-radius: 50%; font-size: 10px; font-weight: 800;
        }

        .ns-new-btn {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white;
          border-radius: 999px; padding: 10px 18px;
          font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s;
          white-space: nowrap; font-family: inherit;
          box-shadow: 0 4px 16px rgba(255,111,145,0.3);
        }
        .ns-new-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,111,145,0.4); }

        .ns-fp-outer {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.4,0,0.2,1);
          margin-bottom: 0;
        }
        .ns-fp-outer.open {
          grid-template-rows: 1fr;
          margin-bottom: 16px;
        }
        .ns-fp-inner {
          overflow: hidden;
          min-height: 0;
        }
        .ns-fp-panel {
          background: rgba(255,255,255,0.88);
          border: 1.5px solid rgba(255,200,220,0.45);
          border-radius: 18px;
          padding: 18px;
          display: flex; flex-direction: column; gap: 16px;
          margin-top: 8px;
          box-shadow: 0 4px 20px rgba(255,111,145,0.08);
        }

        .ns-type-seg {
          display: flex; background: #f5eff2; border-radius: 14px; padding: 4px; gap: 2px;
        }
        .ns-type-seg-btn {
          flex: 1; padding: 8px 12px; border: none; border-radius: 11px;
          background: transparent; font-size: 12px; font-weight: 600; color: #aaa;
          cursor: pointer; transition: all 0.18s; font-family: inherit; white-space: nowrap;
        }
        .ns-type-seg-btn:hover { color: #ff5d8f; }
        .ns-type-seg-btn.on {
          background: white; color: #ff5d8f;
          box-shadow: 0 2px 10px rgba(255,111,145,0.15);
        }

        .ns-sec-row-head {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .ns-sec-row-label {
          font-size: 11px; font-weight: 700; color: #c8b0a8;
          text-transform: uppercase; letter-spacing: 0.09em;
        }
        .ns-manage-link {
          background: none; border: none; color: #ff8fb1; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: color 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .ns-manage-link:hover { color: #ff5d8f; }

        .ns-sec-pills {
          display: flex; flex-wrap: wrap; gap: 7px;
        }
        .ns-sec-pill {
          padding: 6px 14px; border-radius: 999px; border: 1.5px solid;
          background: transparent; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.18s; font-family: inherit;
          white-space: nowrap;
        }
        .ns-sec-pill.all { border-color: rgba(255,111,145,0.4); color: #ff5d8f; }
        .ns-sec-pill.all.on { background: #ff5d8f; color: white; border-color: #ff5d8f; }

        .ns-fp-clear-row {
          display: flex; align-items: center; justify-content: flex-end;
        }
        .ns-clear-btn {
          background: none; border: 1.5px solid rgba(255,200,220,0.5);
          color: #bbb; border-radius: 999px; padding: 6px 14px;
          font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.18s; font-family: inherit;
          display: flex; align-items: center; gap: 5px;
        }
        .ns-clear-btn:hover { border-color: #e05555; color: #e05555; background: #fde8e8; }
        .ns-clear-btn.hidden { display: none; }

        .ns-count {
          font-size: 12px; color: #c8b0a8; margin-bottom: 16px;
          display: flex; align-items: center; gap: 6px;
        }

        .ns-grid {
          display: grid;
          grid-template-columns: repeat(2,1fr);
          gap: 14px;
          align-items: start;
        }

        @keyframes ns-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes nc-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)  scale(1);    }
        }

        .nc-card {
          border-radius: 20px;
          border: 1.5px solid rgba(255,200,220,0.5);
          background: rgba(255,255,255,0.96);
          overflow: hidden;
          display: flex; flex-direction: column;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1);
          transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s;
          animation: nc-in 0.35s ease both;
          position: relative;
          cursor: pointer;
        }

        .nc-card:focus-visible {
          outline: 3px solid color-mix(in srgb, var(--c) 32%, transparent);
          outline-offset: 3px;
        }

        .nc-card:hover {
          transform: translateY(-3px);
          box-shadow:
            0 14px 34px color-mix(in srgb, var(--c) 18%, rgba(0,0,0,0.08)),
            inset 0 1px 0 rgba(255,255,255,1);
          border-color: color-mix(in srgb, var(--c) 40%, rgba(255,200,220,0.5));
        }

        .nc-tip {
          background: linear-gradient(180deg, #fffbea 0%, rgba(255,255,255,0.96) 72px);
        }

        .nc-tab {
          height: 5px; flex-shrink: 0;
        }

        .nc-tip-ribbon {
          display: inline-flex; align-items: center; gap: 5px;
          background: linear-gradient(135deg,#fef3c7,#fde68a);
          color: #92400e;
          font-size: 10px; font-weight: 800;
          text-transform: uppercase; letter-spacing: 0.08em;
          padding: 5px 14px;
          border-bottom: 1px solid #fcd34d44;
        }

        .nc-content { padding: 14px 16px; flex: 1; display: flex; flex-direction: column; gap: 9px; }

        .nc-top-row {
          display: flex; align-items: center; justify-content: space-between; gap: 6px;
        }

        .nc-section-badge {
          border-radius: 999px; padding: 3px 10px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.04em; white-space: nowrap;
          text-transform: uppercase;
        }

        .nc-btns {
          display: flex; align-items: center; gap: 3px; flex-shrink: 0;
          opacity: 0; transition: opacity 0.2s;
        }
        .nc-card:hover .nc-btns { opacity: 1; }

        @media (hover: none) {
          .nc-btns { opacity: 1; }
        }

        .nc-btn {
          width: 28px; height: 28px; border: none; border-radius: 8px;
          background: #f5f0f2; display: flex; align-items: center; justify-content: center;
          color: #c8b0a8; cursor: pointer; transition: all 0.15s;
        }
        .nc-btn:hover        { background: #ffe4ec; color: #ff5d8f; transform: scale(1.08); }
        .nc-btn-del:hover    { background: #fde8e8; color: #e05555; }

        .nc-del-confirm {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #888; background: #fff8fa;
          border: 1px solid #ffe0ea; border-radius: 10px; padding: 3px 8px;
        }
        .nc-del-yes {
          border: none; background: #fde8e8; color: #e05555;
          border-radius: 6px; padding: 2px 7px; font-size: 11px; font-weight: 700; cursor: pointer;
        }
        .nc-del-no {
          border: none; background: #f0f0f0; color: #888;
          border-radius: 6px; padding: 2px 7px; font-size: 11px; font-weight: 600; cursor: pointer;
        }

        .nc-title {
          font-weight: 700;
          font-size: 14px; color: #1c1412;
          margin: 0; line-height: 1.35; letter-spacing: 0;
        }

        .nc-body {
          font-size: 12px; color: #666; line-height: 1.6;
          margin: 0; white-space: pre-wrap; word-break: break-word;
          background-image: repeating-linear-gradient(
            transparent, transparent 27px,
            rgba(255,200,220,0.18) 27px, rgba(255,200,220,0.18) 28px
          );
          background-size: 100% 28px;
          padding-bottom: 2px;
        }

        .nc-open-hint {
          background: none; border: none;
          font-size: 11px; font-weight: 700;
          padding: 0; align-self: flex-start;
          display: inline-flex; align-items: center; gap: 3px;
          transition: opacity 0.15s; font-family: inherit;
        }
        .nc-card:hover .nc-open-hint { opacity: 0.72; }

        .nc-footer {
          padding: 8px 14px;
          border-top: 1px solid rgba(255,200,220,0.25);
          background: rgba(255,248,251,0.6);
        }
        .nc-time { font-size: 11px; color: #d0c0c8; font-weight: 500; }

        .nv-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.32);
          backdrop-filter: blur(7px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 22px;
        }
        .nv-modal {
          width: 100%; max-width: 620px; max-height: min(82vh, 720px);
          background: white; border-radius: 24px; overflow: hidden;
          box-shadow: 0 24px 70px rgba(0,0,0,0.18);
          border: 1px solid color-mix(in srgb, var(--c) 28%, #ffe0ea);
          display: flex; flex-direction: column; animation: nm-up 0.28s ease both;
        }
        .nv-top {
          min-height: 54px; padding: 14px 18px; color: white;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
        }
        .nv-top-left { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .nv-close {
          width: 34px; height: 34px; border: none; border-radius: 12px;
          background: rgba(255,255,255,0.18); color: white; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: 0.18s;
        }
        .nv-close:hover { background: rgba(255,255,255,0.28); }
        .nv-body { padding: 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
        .nv-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
        .nv-section { border-radius: 999px; padding: 5px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
        .nv-time { font-size: 12px; color: #c8b0a8; font-weight: 600; }
        .nv-title { margin: 0; color: #1c1412; font-size: 1.35rem; line-height: 1.25; letter-spacing: 0; }
        .nv-text {
          color: #444; font-size: 13px; line-height: 1.75; white-space: pre-wrap; word-break: break-word;
          background: linear-gradient(180deg, var(--b), rgba(255,255,255,0.7));
          border: 1px solid color-mix(in srgb, var(--c) 18%, #ffe0ea);
          border-radius: 16px; padding: 16px;
        }
        .nv-actions { display: flex; align-items: center; gap: 10px; justify-content: flex-end; padding-top: 2px; }
        .nv-action {
          border: 1.5px solid rgba(255,200,220,0.55); background: white; color: #888;
          border-radius: 999px; padding: 10px 16px; font-size: 13px; font-weight: 700;
          cursor: pointer; display: inline-flex; align-items: center; gap: 7px; font-family: inherit; transition: 0.18s;
        }
        .nv-action:hover { border-color: var(--c); color: var(--c); background: var(--b); }
        .nv-action.primary { background: var(--c); border-color: var(--c); color: white; }
        .nv-action.primary:hover { opacity: 0.9; color: white; }

        .ns-empty {
          grid-column: 1/-1;
          text-align: center; padding: 48px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
background: radial-gradient(circle at top left, rgba(255,143,177,0.18), transparent 32%),
            radial-gradient(circle at bottom right, rgba(95,141,255,0.16), transparent 34%),
            linear-gradient(135deg, #fff8fb 0%, #f7f9ff 54%, #edfaf4 100%);          border-radius: 24px; border: 1.5px dashed #ffd6e1;
        }
        .ns-empty-blob { font-size: 42px; line-height: 1; margin-bottom: 4px; }
        .ns-empty-title { margin: 0; font-size: 1.2rem; color: #333; font-weight: 700; font-family: inherit; font-style: normal; }
        .ns-empty-hint  { margin: 0; color: #aaa; font-size: 13px; max-width: 340px; line-height: 1.6; }

        .ns-skeleton-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
        .ns-skeleton-card {
          border-radius: 20px; overflow: hidden;
          background: white; border: 1.5px solid rgba(255,200,220,0.4);
        }
        .ns-skeleton-tab { height: 5px; background: #f0e0e8; }
        .ns-skeleton-body {
          padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;
        }
        .ns-skel {
          border-radius: 8px;
          background: linear-gradient(90deg, #f8f0f4 25%, #fde8ef 50%, #f8f0f4 75%);
          background-size: 200% 100%;
          animation: ns-shimmer 1.6s ease-in-out infinite;
        }
        @keyframes ns-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .nm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.28);
          backdrop-filter: blur(6px); z-index: 1000;
          display: flex; align-items: flex-end; justify-content: center;
        }
        .nm-sheet {
          background: white; width: 100%; max-width: 620px;
          border-radius: 28px 28px 0 0;
          box-shadow: 0 -8px 48px rgba(0,0,0,0.14);
          max-height: 92vh; display: flex; flex-direction: column;
          animation: nm-up 0.3s cubic-bezier(0.34,1.2,0.64,1) both;
          overflow: hidden;
        }
        @keyframes nm-up { from { transform: translateY(60px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .nm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px; gap: 12px; flex-shrink: 0;
        }
        .nm-header-left  { display: flex; align-items: center; gap: 11px; }
        .nm-header-icon  { width: 32px; height: 32px; border-radius: 10px; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center; }
        .nm-header-title { font-family: inherit; font-style: normal; font-size: 1.05rem; font-weight: 700; color: white; margin: 0; }
        .nm-header-close { border: none; background: rgba(255,255,255,0.2); border-radius: 9px; padding: 7px; cursor: pointer; display: flex; color: white; transition: 0.2s; }
        .nm-header-close:hover { background: rgba(255,255,255,0.32); }

        .nm-body { flex: 1; overflow-y: auto; padding: 22px; display: flex; flex-direction: column; gap: 16px; }

        .nm-label {
          display: flex; flex-direction: column; gap: 7px;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #bbb; margin: 0;
        }
        .nm-sec-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .nm-sec-pill {
          padding: 6px 12px; border-radius: 999px; border: 1.5px solid;
          background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; font-family: inherit;
        }
        .nm-input {
          border: 1.5px solid rgba(255,200,220,0.6); background: #fff8fa; border-radius: 14px;
          padding: 13px 15px; font-size: 15px; outline: none; transition: 0.2s;
          color: #1c1412; font-family: inherit; width: 100%;
        }
        .nm-input:focus {
          border-color: var(--a, #ff8fb1); background: white;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--a, #ff8fb1) 18%, transparent);
        }
        .nm-textarea {
          border: 1.5px solid rgba(255,200,220,0.6); background: #fff8fa; border-radius: 14px;
          padding: 13px 15px; font-size: 14px; outline: none; transition: 0.2s;
          color: #444; resize: vertical; min-height: 120px;
          font-family: inherit; line-height: 1.7; width: 100%;
        }
        .nm-textarea:focus {
          border-color: var(--a, #ff8fb1); background: white;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--a, #ff8fb1) 18%, transparent);
        }
        .nm-char { align-self: flex-end; font-size: 11px; color: #ccc; }
        .nm-char.warn { color: #ff8c5a; font-weight: 600; }

        .nm-toggle-row { display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none; }
        .nm-toggle { width: 42px; height: 24px; border-radius: 999px; background: #e8e0e4; position: relative; transition: background 0.2s; flex-shrink: 0; }
        .nm-toggle.on { background: linear-gradient(135deg,#fcd34d,#f59e0b); }
        .nm-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
        .nm-toggle.on .nm-knob { transform: translateX(18px); }
        .nm-toggle-label { font-size: 13px; font-weight: 600; color: #666; }

        .nm-err { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .nm-actions { display: flex; gap: 10px; padding-top: 4px; }
        .nm-submit {
          display: inline-flex; align-items: center; gap: 7px; border: none; color: white;
          border-radius: 999px; padding: 13px 24px; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: 0.2s; font-family: inherit;
        }
        .nm-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,111,145,0.3); }
        .nm-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .nm-cancel { border: none; background: #f0ecea; color: #888; border-radius: 999px; padding: 13px 20px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; }

        .ms-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.28);
          backdrop-filter: blur(6px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .ms-modal {
          background: white; border-radius: 28px; padding: 26px;
          width: 100%; max-width: 460px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.14);
          border: 1px solid rgba(255,200,220,0.4);
          max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 22px;
          animation: nm-up 0.28s ease both;
        }
        .ms-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .ms-head-left { display: flex; align-items: center; gap: 12px; }
        .ms-head-icon { width: 40px; height: 40px; border-radius: 14px; background: linear-gradient(135deg,#ff8fb1,#ff6f91); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .ms-title  { margin: 0 0 3px; font-family: inherit; font-style: normal; font-size: 1.05rem; font-weight: 700; color: #1c1412; }
        .ms-sub    { margin: 0; font-size: 12px; color: #bbb; }
        .ms-close  { border: none; background: #f4f0f2; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; flex-shrink: 0; }
        .ms-close:hover { background: #ffe4ec; color: #ff5d8f; }
        .ms-box-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #c8b0a8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .ms-count { display: inline-flex; align-items: center; justify-content: center; background: #fff0f4; color: #ff6f91; border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
        .ms-add-box { background: #fff8fa; border: 1px solid rgba(255,200,220,0.4); border-radius: 18px; padding: 18px; }
        .ms-add-row { display: flex; gap: 10px; align-items: center; }
        .ms-input { flex: 1 1 auto; min-width: 0; width: 100%; border: 1.5px solid rgba(255,200,220,0.6); background: white; border-radius: 12px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; font-family: inherit; }
        .ms-input:focus { border-color: #ff8fb1; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .ms-add-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit; }
        .ms-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,111,145,0.25); }
        .ms-error { background: #fde8e8; color: #c0392b; border-radius: 10px; padding: 8px 12px; font-size: 12px; margin-top: 10px; }
        .ms-empty { text-align: center; padding: 24px 16px; background: #fff8fa; border-radius: 16px; border: 1px dashed rgba(255,200,220,0.5); display: flex; flex-direction: column; align-items: center; gap: 6px; color: #bbb; font-size: 13px; }
        .ms-list { display: flex; flex-direction: column; gap: 8px; }
        .ms-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1.5px solid rgba(255,200,220,0.4); background: #fff8fa; transition: 0.2s; }
        .ms-row:hover { border-color: #ffb8ce; background: white; }
        .ms-row-rem { border-color: #ffd0d0; background: #fff5f5; }
        .ms-row-main { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .ms-sec-pill { display: inline-flex; align-items: center; gap: 7px; min-width: 0; max-width: 100%; border: 1.5px solid; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .ms-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .ms-color-control { width: 30px; height: 30px; border: 1.5px solid rgba(255,200,220,0.5); background: white; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; position: relative; overflow: hidden; }
        .ms-color-control input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .ms-color-swatch { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); }
        .ms-rm-btn { display: inline-flex; align-items: center; gap: 5px; border: 1.5px solid rgba(255,200,220,0.5); background: white; color: #aaa; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; flex-shrink: 0; white-space: nowrap; }
        .ms-rm-btn:hover { border-color: #ffd0d0; background: #fde8e8; color: #e05555; }
        .ms-confirm { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #888; flex-shrink: 0; font-weight: 600; white-space: nowrap; }
        .ms-yes { border: none; background: linear-gradient(135deg,#ff8f8f,#e05555); color: white; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .ms-no  { border: none; background: #f0f0f0; color: #888; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .ms-note { display: flex; align-items: flex-start; gap: 8px; background: #fff8fa; border: 1px solid rgba(255,200,220,0.4); border-radius: 14px; padding: 12px 14px; font-size: 12px; color: #bbb; line-height: 1.6; }

        @media (max-width: 767px) {
          .ns-page   { border-radius: 22px; padding: 20px 20px 56px; }
          .ns-title  { font-size: 2rem; }
          .ns-grid   { grid-template-columns: 1fr; }
          .ns-skeleton-grid { grid-template-columns: 1fr; }
          .ns-stats  { grid-template-columns: repeat(3,1fr); }
          .ns-stat-n { font-size: 1.8rem; }
          .ns-toolbar { gap: 7px; }
          .ns-new-btn { padding: 11px 16px; font-size: 12px; }
          .ms-add-row { gap: 8px; }
          .ms-add-btn { padding-inline: 16px; }
          .nm-sheet   { border-radius: 24px 24px 0 0; }
          .nm-body    { padding: 18px; }
          .ns-fab {
            display: flex !important;
            position: fixed; bottom: calc(72px + env(safe-area-inset-bottom,0px));
            right: 16px; z-index: 200;
            width: 54px; height: 54px; border-radius: 50%;
            border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
            color: white; align-items: center; justify-content: center;
            box-shadow: 0 8px 28px rgba(255,111,145,0.48); cursor: pointer;
            transition: 0.2s;
          }
          .ns-fab:active { transform: scale(0.94); }
          .ns-new-btn { display: none; }
        }

        .ns-fab { display: none; }

        @media (min-width: 768px) and (max-width: 1023px) {
          .ns-page   { padding: 24px; }
          .ns-title  { font-size: 2rem; }
          .ns-grid   { grid-template-columns: repeat(2,1fr); }
          .nm-overlay { align-items: center; padding: 20px; }
          .nm-sheet   { border-radius: 28px; max-height: 88vh; }
        }

        @media (min-width: 1024px) {
          .ns-grid { grid-template-columns: repeat(2,1fr); }
          .nm-overlay { align-items: center; padding: 24px; }
          .nm-sheet   { border-radius: 28px; max-height: 86vh; }
        }
      `}</style>

      <div className="ns-page">
        <div className="ns-hero">
          <div className="ns-hero-top">
            <h1 className="ns-title">
              Notes &amp; <span className="ns-title-accent">Tips</span>
            </h1>
          </div>
          <div className="ns-stats">
            <div className="ns-stat">
              <span className="ns-stat-n">{totalNotes}</span>
              <span className="ns-stat-l">Personal</span>
            </div>
            <div className="ns-stat">
              <span className="ns-stat-n">{totalTips}</span>
              <span className="ns-stat-l">Staff Tips</span>
            </div>
            <div className="ns-stat">
              <span className="ns-stat-n">{notes.length}</span>
              <span className="ns-stat-l">Total</span>
            </div>
          </div>
        </div>

        <div className="ns-toolbar">
          <div className="ns-search-wrap">
            <Search size={14} className="ns-si" />
            <input className="ns-search" placeholder="Search notes and tips…"
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button className="ns-sc" onClick={() => setSearch('')}><X size={12} /></button>
            )}
          </div>

          <div className="ns-sort-wrap">
            <button className="ns-sort-btn" onClick={() => setShowSort(v => !v)}>
              <ArrowUpDown size={13} />
              {currentSortLabel}
            </button>
            {showSort && (
              <div className="ns-sort-dd">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.id}
                    className={`ns-sort-opt ${sortBy === opt.id ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.id); setShowSort(false); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className={`ns-filter-btn ${activeFilterCount > 0 ? 'has-filters' : ''}`}
            onClick={() => setShowFilters(v => !v)}
          >
            <SlidersHorizontal size={14} />
            Section
            {activeFilterCount > 0 && (
              <span className="ns-filter-count">{activeFilterCount}</span>
            )}
            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button className="ns-new-btn"
            onClick={() => { setEditingNote(null); setShowNoteModal(true); }}>
            <Plus size={15} /> New Note
          </button>
        </div>

        <div className={`ns-fp-outer ${showFilters ? 'open' : ''}`}>
          <div className="ns-fp-inner">
            <div className="ns-fp-panel">
              <div>
                <p className="ms-box-label" style={{ margin: '0 0 10px' }}>Show</p>
                <div className="ns-type-seg">
                  {[
                    { id: 'all',   label: `All (${notes.length})`     },
                    { id: 'notes', label: `Notes (${totalNotes})`     },
                    { id: 'tips',  label: `⭐ Tips (${totalTips})`    },
                  ].map(t => (
                    <button key={t.id}
                      className={`ns-type-seg-btn ${filterType === t.id ? 'on' : ''}`}
                      onClick={() => setFilterType(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="ns-sec-row-head">
                  <span className="ns-sec-row-label">Section</span>
                  <button className="ns-manage-link" onClick={() => setShowManage(true)}>
                    <Edit3 size={11} /> Edit Sections
                  </button>
                </div>
                <div className="ns-sec-pills">
                  <button
                    className={`ns-sec-pill all ${filterSection === '' ? 'on' : ''}`}
                    onClick={() => setFilterSection('')}>All</button>
                  {allSections.map(s => {
                    const meta = sectionMap[s.id] ?? generateSectionMeta(s.id);
                    const on   = filterSection === s.id;
                    return (
                      <button key={s.id} className="ns-sec-pill"
                        style={{
                          borderColor: meta.color + '88',
                          color:       on ? '#fff' : meta.color,
                          background:  on ? meta.color : 'transparent',
                        }}
                        onClick={() => setFilterSection(on ? '' : s.id)}>
                        {s.id}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="ns-fp-clear-row">
                <button
                  className={`ns-clear-btn ${activeFilterCount === 0 ? 'hidden' : ''}`}
                  onClick={clearFilters}
                >
                  <X size={12} /> Clear all filters
                </button>
              </div>
            </div>
          </div>
        </div>

        {(search || filterSection || filterType !== 'all') && !loading && (
          <p className="ns-count">
            Showing {filtered.length} of {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        )}

        {loading ? (
          <div className="ns-skeleton-grid">
            {[1,2,3,4].map(i => (
              <div key={i} className="ns-skeleton-card">
                <div className="ns-skeleton-tab" />
                <div className="ns-skeleton-body">
                  <div className="ns-skel" style={{ height: 14, width: '45%', borderRadius: 8 }} />
                  <div className="ns-skel" style={{ height: 18, width: '75%', borderRadius: 8 }} />
                  <div className="ns-skel" style={{ height: 12, width: '90%', borderRadius: 6 }} />
                  <div className="ns-skel" style={{ height: 12, width: '70%', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ns-grid">
            {filtered.length === 0 ? (
              <div className="ns-empty">
                <div className="ns-empty-blob">
                  {search ? '🔍' : notes.length === 0 ? '📓' : '🗂️'}
                </div>
                <p className="ns-empty-title">
                  {search
                    ? `No notes match "${search}"`
                    : notes.length === 0
                    ? 'Your notebook is empty'
                    : 'Nothing matches these filters'}
                </p>
                <p className="ns-empty-hint">
                  {notes.length === 0
                    ? 'Start capturing clinical learnings, tips, and reminders'
                    : 'Try clearing your filters'}
                </p>
                {notes.length === 0 && (
                  <button className="ns-new-btn" style={{ marginTop: 6 }}
                    onClick={() => { setEditingNote(null); setShowNoteModal(true); }}>
                    <Plus size={15} /> Add First Note
                  </button>
                )}
              </div>
            ) : (
              filtered.map((note, idx) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  sectionMap={sectionMap}
                  style={{ animationDelay: `${Math.min(idx * 45, 300)}ms` }}
                  onOpen={setViewingNote}
                  onEdit={n => { setEditingNote(n); setShowNoteModal(true); }}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}
      </div>

      <button className="ns-fab" onClick={() => { setEditingNote(null); setShowNoteModal(true); }}>
        <Plus size={22} />
      </button>

      {viewingNote && (
        <NoteViewModal
          note={viewingNote}
          sectionMap={sectionMap}
          onClose={() => setViewingNote(null)}
          onEdit={n => { setEditingNote(n); setShowNoteModal(true); }}
        />
      )}

      {showNoteModal && (
        <NoteModal
          editing={editingNote}
          defaultSection={filterSection || allSections[0]?.id}
          allSections={allSections}
          sectionMap={sectionMap}
          onClose={() => { setShowNoteModal(false); setEditingNote(null); }}
          onSaved={handleSaved}
        />
      )}

      {showManage && (
        <ManageSectionsModal
          sections={sections}
          onAdd={handleAddSection}
          onRemove={handleRemoveSection}
          onColorChange={handleSectionColorChange}
          onClose={() => setShowManage(false)}
        />
      )}
    </>
  );
}