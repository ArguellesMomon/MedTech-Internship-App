import ThemedIcon from './ui/ThemedIcon';
import { useLocation } from 'react-router-dom';
import useQuickCreate from '../hooks/useQuickCreate';
import Dialog from './ui/Dialog';
import '../styles/features/NotesSection.css';
import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Copy,
  Check,
  Star,
  StickyNote,
  FileText,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
  Settings2,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const DEFAULT_SECTIONS = [
  { id: 'Hematology', color: '#ff6f91', bg: 'var(--rose-soft)' },
  { id: 'Clinical Chemistry', color: '#ff8c5a', bg: 'var(--peach-soft)' },
  { id: 'Microbiology', color: '#5f8dff', bg: 'var(--lavender-soft)' },
  { id: 'Blood Bank', color: '#e05555', bg: 'var(--rose-soft)' },
  { id: 'Histopathology/Cytology', color: '#4abf95', bg: 'var(--sage-soft)' },
];

const CUSTOM_SECTION_COLORS = [
  { color: '#8d6fff', bg: '#f5efff' },
  { color: '#34b3ff', bg: '#e8f6ff' },
  { color: '#54c58e', bg: '#ecfbf2' },
  { color: '#f6b45f', bg: '#fff4e8' },
  { color: '#f56b8a', bg: 'var(--rose-soft)' },
  { color: '#b071ec', bg: '#f4ecff' },
  { color: '#26c6da', bg: '#e0f7fa' },
  { color: '#ef6c00', bg: '#fff3e0' },
];

const CUSTOM_SECTION_STORAGE_KEY = 'rotation_guide.sections';

function colorToSoftBg(hex) {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#fff0f4';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (v) =>
    Math.round(v + (255 - v) * 0.88)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function generateSectionMeta(name) {
  const hash = name.split('').reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0);
  return CUSTOM_SECTION_COLORS[Math.abs(hash) % CUSTOM_SECTION_COLORS.length];
}

function normalizeStoredSections(saved) {
  if (!Array.isArray(saved)) return DEFAULT_SECTIONS;
  const merged = saved.some((s) => DEFAULT_SECTIONS.some((base) => base.id === s?.id))
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
  { id: 'az', label: 'A → Z' },
  { id: 'za', label: 'Z → A' },
];

const MAX_BODY = 3000;

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ─────────────────────────────────────────────
   MANAGE SECTIONS MODAL
───────────────────────────────────────────── */
function ManageSectionsModal({ sections, onAdd, onRemove, onColorChange, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const allIds = sections.map((s) => s.id);

  const handleAdd = () => {
    const label = name.trim();
    if (!label) {
      setError('Please enter a section name.');
      return;
    }
    if (allIds.some((id) => id.toLowerCase() === label.toLowerCase())) {
      setError('That section already exists.');
      return;
    }
    onAdd(label);
    setName('');
    setError('');
  };

  return (
    <Dialog className="ms-overlay" onClose={onClose}>
      <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ms-head">
          <div className="ms-head-left">
            <div className="ms-head-icon">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="ms-title">Manage Sections</h3>
              <p className="ms-sub">Add, remove, and color your note sections</p>
            </div>
          </div>
          <button aria-label="Close" className="ms-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="ms-add-box">
          <p className="ms-box-label">New Section</p>
          <div className="ms-add-row">
            <input
              ref={inputRef}
              className="ms-input"
              placeholder="e.g. Immunology, Parasitology…"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={40}
            />
            <button className="ms-add-btn" onClick={handleAdd}>
              <Plus size={15} /> Add
            </button>
          </div>
          {error && <p className="ms-error">{error}</p>}
        </div>

        <div>
          <p className="ms-box-label">
            Sections
            {sections.length > 0 && <span className="ms-count">{sections.length}</span>}
          </p>
          {sections.length === 0 ? (
            <div className="ms-empty">
              <span style={{ fontSize: 28 }}>
                <ThemedIcon name="Layers" />
              </span>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>No sections yet.</p>
            </div>
          ) : (
            <div className="ms-list">
              {sections.map((sec) => {
                const meta = { ...generateSectionMeta(sec.id), ...sec };
                const isRem = removing === sec.id;
                return (
                  <div key={sec.id} className={`ms-row ${isRem ? 'ms-row-rem' : ''}`}>
                    <div className="ms-row-main">
                      <div className="ms-sec-pill">
                        {' '}
                        <span className="ms-dot" style={{ background: meta.color }} />
                        {sec.id}
                      </div>
                      <label
                        htmlFor="field-notessection-1"
                        className="ms-color-control"
                        title={`Change ${sec.id} color`}
                      >
                        <span className="ms-color-swatch" style={{ background: meta.color }} />
                        <input
                          id="field-notessection-1"
                          type="color"
                          value={meta.color}
                          onChange={(e) => onColorChange(sec.id, e.target.value)}
                        />
                      </label>
                    </div>
                    {isRem ? (
                      <div className="ms-confirm">
                        <span>Remove?</span>
                        <button
                          className="ms-yes"
                          onClick={() => {
                            onRemove(sec.id);
                            setRemoving(null);
                          }}
                        >
                          Yes
                        </button>
                        <button className="ms-no" onClick={() => setRemoving(null)}>
                          No
                        </button>
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
          <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Removing a section hides it from new notes and filters; existing notes keep their label.
        </div>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   NOTE MODAL
───────────────────────────────────────────── */
function NoteModal({ editing, defaultSection, onClose, onSaved, allSections, sectionMap }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: editing?.title ?? '',
    body: editing?.body ?? '',
    section_name: editing?.section_name ?? defaultSection ?? allSections[0]?.id ?? '',
    is_staff_tip: editing?.is_staff_tip ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const charLeft = MAX_BODY - form.body.length;
  const meta = sectionMap[form.section_name] ?? generateSectionMeta(form.section_name);
  const accentColor = meta?.color ?? '#ff6f91';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      section_name: form.section_name,
      is_staff_tip: form.is_staff_tip,
    };
    let result;
    if (editing) {
      result = await supabase
        .from('notes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('notes')
        .insert([{ ...payload, user_id: user.id }])
        .select()
        .single();
    }
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <Dialog className="nm-overlay" onClose={onClose}>
      <div className="nm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="nm-header">
          <div className="nm-header-left">
            <div className="nm-header-icon">
              {editing ? (
                <Edit3 size={16} color="currentColor" />
              ) : (
                <Plus size={16} color="currentColor" />
              )}
            </div>
            <span className="nm-header-title">{editing ? 'Edit Note' : 'New Note'}</span>
          </div>
          <button aria-label="Close" className="nm-header-close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="nm-body">
          <div>
            <p className="nm-label">Section</p>
            <div className="nm-sec-pills">
              {allSections.map((s) => {
                const on = form.section_name === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="nm-sec-pill"
                    aria-pressed={on}

                    onClick={() => setForm({ ...form, section_name: s.id })}
                  >
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          <label htmlFor="field-notessection-2" className="nm-label">
            Title *
            <input
              id="field-notessection-2"
              className="nm-input"
              value={form.title}
              required
              maxLength={120}
              placeholder="Give your note a title…"
              style={{ '--a': accentColor }}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>

          <label htmlFor="field-notessection-3" className="nm-label">
            Content *
            <textarea
              id="field-notessection-3"
              className="nm-textarea"
              rows={5}
              required
              value={form.body}
              placeholder="Write your note, tip, or reminder…"
              style={{ '--a': accentColor }}
              onChange={(e) => {
                if (e.target.value.length <= MAX_BODY) setForm({ ...form, body: e.target.value });
              }}
            />
            <span className={`nm-char ${charLeft < 50 ? 'warn' : ''}`}>{charLeft} left</span>
          </label>

          <div
            className="nm-toggle-row"
            onClick={() => setForm({ ...form, is_staff_tip: !form.is_staff_tip })}
          >
            <div className={`nm-toggle ${form.is_staff_tip ? 'on' : ''}`}>
              <span className="nm-knob" />
            </div>
            <span className="nm-toggle-label">
              <Star
                size={13}
                style={{
                  display: 'inline',
                  marginRight: 5,
                  verticalAlign: -2,
                  color: 'var(--ink)',
                }}
              />
              Mark as Staff Tip
            </span>
          </div>

          {error && <p className="nm-err">{error}</p>}

          <div className="nm-actions">
            <button
              type="submit"
              className="nm-submit"

              disabled={saving}
            >
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Note' : 'Add Note'}
            </button>
            <button type="button" className="nm-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   NOTE CARD
───────────────────────────────────────────── */
function NoteCard({ note, onOpen, onEdit, onDelete, sectionMap, style }) {
  const [copied, setCopied] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const meta = sectionMap[note.section_name] ?? generateSectionMeta(note.section_name);
  const isTip = note.is_staff_tip;
  const preview = note.body.length > 160 ? note.body.slice(0, 160) + '…' : note.body;

  const copyNote = async (e) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const openFromKeyboard = (e) => {
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
      <div
        className="nc-tab"
        style={{ background: isTip ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : meta?.color }}
      />

      {isTip && (
        <div className="nc-tip-ribbon">
          <Star size={11} fill="currentColor" /> Staff Tip
        </div>
      )}

      <div className="nc-content">
        <div className="nc-top-row">
          <span className="nc-section-badge">{note.section_name}</span>
          <div className="nc-btns">
            <button className="nc-btn" onClick={copyNote} title="Copy">
              {copied ? <Check size={12} style={{ color: 'var(--sage)' }} /> : <Copy size={12} />}
            </button>
            <button
              className="nc-btn"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note);
              }}
              title="Edit"
            >
              <Edit3 size={12} />
            </button>
            {confirmDel ? (
              <span className="nc-del-confirm" onClick={(e) => e.stopPropagation()}>
                Delete?
                <button className="nc-del-yes" onClick={() => onDelete(note.id)}>
                  Yes
                </button>
                <button className="nc-del-no" onClick={() => setConfirmDel(false)}>
                  No
                </button>
              </span>
            ) : (
              <button
                className="nc-btn nc-btn-del"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDel(true);
                }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        <h4 className="nc-title">{note.title}</h4>
        <p className="nc-body">{preview}</p>

        <span className="nc-open-hint">Open note</span>
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
  const meta = sectionMap[note.section_name] ?? generateSectionMeta(note.section_name);
  const isTip = note.is_staff_tip;

  const copyNote = async () => {
    await navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Dialog className="nv-overlay" onClose={onClose}>
      <div
        className="nv-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ '--c': meta?.color ?? '#ff6f91', '--b': meta?.bg ?? '#fff0f4' }}
      >
        <div className="nv-top">
          <div className="nv-top-left">
            <FileText size={16} />
            <span>{isTip ? 'Staff Tip' : 'Note'}</span>
          </div>
          <button className="nv-close" onClick={onClose} title="Close">
            <X size={17} />
          </button>
        </div>

        <div className="nv-body">
          <div className="nv-meta-row">
            <span className="nv-section">{note.section_name}</span>
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
            <button
              className="nv-action"
              onClick={() => {
                onClose();
                onEdit(note);
              }}
            >
              <Edit3 size={14} /> Edit
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   MAIN NOTES SECTION
───────────────────────────────────────────── */
export default function NotesSection() {
  const location = useLocation();
  const { user } = useAuth();

  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSection, setFilterSection] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showSort, setShowSort] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(
    () => new URLSearchParams(window.location.search).get('new') === '1',
  );
  useQuickCreate(setShowNoteModal);
  const [viewingNote, setViewingNote] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [showManage, setShowManage] = useState(false);

  /* ── Fetch notes ── */
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error)
        setLoadError('Your notes couldn’t load. Check your connection and refresh to try again.');
      else {
        setNotes(data || []);
        setLoadError('');
      }
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

          return;
        }

        if (data && data.value && Array.isArray(data.value)) {
          setSections(normalizeStoredSections(data.value));
        } else {
          setSections(DEFAULT_SECTIONS);
        }
        setSectionsLoaded(true);
      } catch (err) {
        console.error('Unexpected load error:', err);
        setSections(DEFAULT_SECTIONS);
      }
    };

    loadSections();
  }, [user.id]);

  /* ── Save sections to Supabase whenever they change ── */
  useEffect(() => {
    if (!sectionsLoaded) return; // wait for initial load

    const saveSections = async () => {
      try {
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: user.id,
            key: CUSTOM_SECTION_STORAGE_KEY,
            value: sections,
          },
          { onConflict: 'user_id, key' },
        );

        if (error) {
          console.error('Save sections error:', error);
        }
      } catch (err) {
        console.error('Unexpected save error:', err);
      }
    };

    saveSections();
  }, [sections, sectionsLoaded, user.id]);

  useEffect(() => {
    const id = new URLSearchParams(location.search).get('note');
    if (id) setViewingNote(notes.find((note) => note.id === id) || null);
  }, [notes, location.search]);
  const allSections = sections;
  const sectionMap = useMemo(
    () => Object.fromEntries(allSections.map((s) => [s.id, s])),
    [allSections],
  );

  /* ── Stats ── */
  const totalTips = notes.filter((n) => n.is_staff_tip).length;
  const totalNotes = notes.length - totalTips;

  /* ── Derived filter ── */
  const filtered = useMemo(() => {
    let r = [...notes];
    if (filterSection) r = r.filter((n) => n.section_name === filterSection);
    if (filterType === 'notes') r = r.filter((n) => !n.is_staff_tip);
    if (filterType === 'tips') r = r.filter((n) => n.is_staff_tip);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
    }
    if (sortBy === 'oldest') r.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'az') r.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'za') r.sort((a, b) => b.title.localeCompare(a.title));
    return r;
  }, [notes, filterSection, filterType, search, sortBy]);

  const activeFilterCount = (filterType !== 'all' ? 1 : 0) + (filterSection ? 1 : 0);

  const handleAddSection = (label) => {
    const meta = generateSectionMeta(label);
    setSections((prev) => [...prev, { id: label, color: meta.color, bg: meta.bg }]);
    setFilterSection(label);
  };
  const handleRemoveSection = (id) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
    if (filterSection === id) setFilterSection('');
  };
  const handleSectionColorChange = (id, color) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, color, bg: colorToSoftBg(color) } : s)),
    );
  };
  const handleSaved = (saved, isEdit) => {
    setNotes((prev) =>
      isEdit ? prev.map((n) => (n.id === saved.id ? saved : n)) : [saved, ...prev],
    );
  };
  const handleDelete = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setLoadError('The note couldn’t be deleted. Please try again.');
      return;
    }
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? 'Sort';
  const clearFilters = () => {
    setFilterType('all');
    setFilterSection('');
  };

  return (
    <>
      <div className="ns-page">
        {loadError && (
          <p className="inline-error" role="alert">
            {loadError}
          </p>
        )}
        <div className="ns-hero">
          <div className="ns-hero-top">
            <h1 className="ns-title">
              Notes &amp; <span className="ns-title-accent">Tips</span>
            </h1>
            <p className="tool-page-description">
              Little discoveries, staff wisdom, and things you want to remember.
            </p>
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
            <input
              className="ns-search"
              placeholder="Search notes and tips…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button aria-label="Close" className="ns-sc" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="ns-sort-wrap">
            <button className="ns-sort-btn" onClick={() => setShowSort((v) => !v)}>
              <ArrowUpDown size={13} />
              {currentSortLabel}
            </button>
            {showSort && (
              <div className="ns-sort-dd">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`ns-sort-opt ${sortBy === opt.id ? 'active' : ''}`}
                    onClick={() => {
                      setSortBy(opt.id);
                      setShowSort(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className={`ns-filter-btn ${activeFilterCount > 0 ? 'has-filters' : ''}`}
            onClick={() => setShowFilters((v) => !v)}
          >
            <SlidersHorizontal size={14} />
            Section
            {activeFilterCount > 0 && <span className="ns-filter-count">{activeFilterCount}</span>}
            {showFilters ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <button
            className="button primary ns-new-btn"
            onClick={() => {
              setEditingNote(null);
              setShowNoteModal(true);
            }}
          >
            <Plus size={16} aria-hidden="true" /> <span>Add Note</span>
          </button>
        </div>

        <div className={`ns-fp-outer ${showFilters ? 'open' : ''}`}>
          <div className="ns-fp-inner">
            <div className="ns-fp-panel">
              <div>
                <p className="ms-box-label" style={{ margin: '0 0 10px' }}>
                  Show
                </p>
                <div className="ns-type-seg">
                  {[
                    { id: 'all', label: `All (${notes.length})` },
                    { id: 'notes', label: `Notes (${totalNotes})` },
                    { id: 'tips', label: `Tips (${totalTips})`, icon: true },
                  ].map((t) => (
                    <button
                      key={t.id}
                      className={`ns-type-seg-btn ${filterType === t.id ? 'on' : ''}`}
                      onClick={() => setFilterType(t.id)}
                    >
                      {t.icon && <ThemedIcon name="Star" size={14} />} {t.label}
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
                    onClick={() => setFilterSection('')}
                  >
                    All
                  </button>
                  {allSections.map((s) => {
                    const on = filterSection === s.id;
                    return (
                      <button
                        key={s.id}
                        className="ns-sec-pill"
                        aria-pressed={on}

                        onClick={() => setFilterSection(on ? '' : s.id)}
                      >
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
            {[1, 2, 3, 4].map((i) => (
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
                  {search ? (
                    <ThemedIcon name="Search" />
                  ) : notes.length === 0 ? (
                    <ThemedIcon name="NotebookPen" />
                  ) : (
                    <ThemedIcon name="Layers" />
                  )}
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
                  <button
                    className="button primary ns-new-btn"
                    onClick={() => {
                      setEditingNote(null);
                      setShowNoteModal(true);
                    }}
                  >
                    <Plus size={16} aria-hidden="true" /> <span>Add First Note</span>
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
                  onEdit={(n) => {
                    setEditingNote(n);
                    setShowNoteModal(true);
                  }}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        )}
      </div>

      {viewingNote && (
        <NoteViewModal
          note={viewingNote}
          sectionMap={sectionMap}
          onClose={() => setViewingNote(null)}
          onEdit={(n) => {
            setEditingNote(n);
            setShowNoteModal(true);
          }}
        />
      )}

      {showNoteModal && (
        <NoteModal
          editing={editingNote}
          defaultSection={filterSection || allSections[0]?.id}
          allSections={allSections}
          sectionMap={sectionMap}
          onClose={() => {
            setShowNoteModal(false);
            setEditingNote(null);
          }}
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
