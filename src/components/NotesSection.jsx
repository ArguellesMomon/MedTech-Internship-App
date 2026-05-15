import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  FileText,
  Plus,
  Edit3,
  Trash2,
  Search,
  X,
  Copy,
  Check,
  Star,
  StickyNote,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SECTIONS = [
  { id: 'Hematology',               color: '#ff6f91', bg: '#fff0f4' },
  { id: 'Clinical Chemistry',        color: '#ff8c5a', bg: '#fff5ee' },
  { id: 'Microbiology',              color: '#5f8dff', bg: '#eff4ff' },
  { id: 'Blood Bank',                color: '#e05555', bg: '#fff0f0' },
  { id: 'Histopathology/Cytology',   color: '#4abf95', bg: '#edfaf4' },
];

const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

const CUSTOM_SECTION_COLORS = [
  { color: '#8d6fff', bg: '#f5efff' },
  { color: '#34b3ff', bg: '#e8f6ff' },
  { color: '#54c58e', bg: '#ecfbf2' },
  { color: '#f6b45f', bg: '#fff4e8' },
  { color: '#f56b8a', bg: '#fff0f4' },
  { color: '#b071ec', bg: '#f4ecff' },
];

const CUSTOM_SECTION_STORAGE_KEY = 'intern-app-notes-custom-sections';

function generateSectionMeta(sectionName) {
  const hash = sectionName.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const index = Math.abs(hash) % CUSTOM_SECTION_COLORS.length;
  return CUSTOM_SECTION_COLORS[index];
}

const SORT_OPTIONS = [
  { id: 'newest', label: 'Newest first' },
  { id: 'oldest', label: 'Oldest first' },
  { id: 'az',     label: 'A → Z' },
  { id: 'za',     label: 'Z → A' },
];

const MAX_BODY = 1000;

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ─────────────────────────────────────────────
   NOTE MODAL  (add + edit)
───────────────────────────────────────────── */
function NoteModal({ editing, defaultSection, onClose, onSaved, sections, sectionMap }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    title:        editing?.title        ?? '',
    body:         editing?.body         ?? '',
    section_name: editing?.section_name ?? defaultSection ?? sections[0].id,
    is_staff_tip: editing?.is_staff_tip ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const charLeft = MAX_BODY - form.body.length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setSaving(true);
    setError('');

    const payload = {
      title:        form.title.trim(),
      body:         form.body.trim(),
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
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  const accentColor = sectionMap[form.section_name]?.color ?? generateSectionMeta(form.section_name).color;

  return (
    <div className="ns-overlay" onClick={onClose}>
      <div className="ns-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ns-modal-header">
          <div className="ns-modal-title-row">
            <div className="ns-modal-dot" style={{ background: accentColor }} />
            <h3>{editing ? 'Edit Note' : 'New Note'}</h3>
          </div>
          <button className="ns-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="ns-modal-form">
          {/* Section pills */}
          <div>
            <p className="ns-field-label">Section</p>
            <div className="ns-section-pills">
              {sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`ns-pill ${form.section_name === s.id ? 'active' : ''}`}
                  style={form.section_name === s.id
                    ? { background: s.color, borderColor: s.color, color: '#fff' }
                    : { borderColor: s.color + '55', color: s.color }}
                  onClick={() => setForm({ ...form, section_name: s.id })}
                >
                  {s.id}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <label className="ns-field-label">
            Title *
            <input
              className="ns-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Give your note a title…"
              required
              maxLength={120}
            />
          </label>

          {/* Body */}
          <label className="ns-field-label">
            Content *
            <textarea
              className="ns-textarea"
              rows={5}
              value={form.body}
              onChange={(e) => {
                if (e.target.value.length <= MAX_BODY)
                  setForm({ ...form, body: e.target.value });
              }}
              placeholder="Write your note, tip, or reminder here…"
              required
            />
            <span className={`ns-char-count ${charLeft < 50 ? 'warn' : ''}`}>
              {charLeft} characters left
            </span>
          </label>

          {/* Staff tip toggle */}
          <label className="ns-toggle-row">
            <div className={`ns-toggle ${form.is_staff_tip ? 'on' : ''}`}
              onClick={() => setForm({ ...form, is_staff_tip: !form.is_staff_tip })}>
              <span className="ns-toggle-knob" />
            </div>
            <span className="ns-toggle-label">
              <Star size={13} style={{ display: 'inline', marginRight: 4, verticalAlign: -2 }} />
              Mark as Staff Tip
            </span>
          </label>

          {error && <p className="ns-form-error">{error}</p>}

          <div className="ns-modal-actions">
            <button type="submit" className="ns-primary-btn" disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Note' : 'Add Note'}
            </button>
            <button type="button" className="ns-secondary-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   NOTE CARD
───────────────────────────────────────────── */
function NoteCard({ note, onEdit, onDelete, sectionMap }) {
  const [expanded,  setExpanded]  = useState(false);
  const [copied,    setCopied]    = useState(false);

  const meta    = sectionMap[note.section_name] ?? SECTION_MAP[note.section_name] ?? generateSectionMeta(note.section_name);
  const preview = note.body.length > 140 && !expanded
    ? note.body.slice(0, 140) + '…'
    : note.body;

  const copyNote = async () => {
    await navigator.clipboard.writeText(`${note.title}\n\n${note.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div
      className="ns-card"
      style={{ borderLeftColor: meta?.color ?? '#ff6f91' }}
    >
      {/* Top row */}
      <div className="ns-card-top">
        <div className="ns-card-meta">
          {note.is_staff_tip && (
            <span className="ns-tip-badge">
              <Star size={10} style={{ marginRight: 3, verticalAlign: -1 }} />
              Staff Tip
            </span>
          )}
          <span
            className="ns-section-badge"
            style={{ background: meta?.bg ?? '#fff0f4', color: meta?.color ?? '#ff6f91' }}
          >
            {note.section_name}
          </span>
        </div>

        <div className="ns-card-actions">
          <button
            className="ns-icon-btn"
            onClick={copyNote}
            title="Copy to clipboard"
          >
            {copied ? <Check size={13} style={{ color: '#4abf95' }} /> : <Copy size={13} />}
          </button>
          <button className="ns-icon-btn" onClick={() => onEdit(note)} title="Edit">
            <Edit3 size={13} />
          </button>
          <button className="ns-icon-btn danger" onClick={() => onDelete(note.id)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="ns-card-title">{note.title}</h4>

      {/* Body */}
      <p className="ns-card-body">{preview}</p>

      {/* Expand / collapse */}
      {note.body.length > 140 && (
        <button
          className="ns-expand-btn"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Read more</>}
        </button>
      )}

      {/* Footer */}
      <div className="ns-card-footer">
        <span className="ns-timestamp">
          {note.updated_at && note.updated_at !== note.created_at
            ? `Updated ${timeAgo(note.updated_at)}`
            : `Added ${timeAgo(note.created_at)}`}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN NOTES SECTION
───────────────────────────────────────────── */
function NotesSection() {
  const { user } = useAuth();

  const [notes,           setNotes]          = useState([]);
  const [loading,         setLoading]        = useState(true);
  const [search,          setSearch]         = useState('');
  const [filterType,      setFilterType]     = useState('all');   // all | notes | tips
  const [filterSection,   setFilterSection]  = useState('');
  const [sortBy,          setSortBy]         = useState('newest');
  const [showSort,        setShowSort]       = useState(false);
  const [showModal,       setShowModal]      = useState(false);
  const [editingNote,     setEditingNote]    = useState(null);
  const [customSections,  setCustomSections] = useState([]);
  const [showManageSections, setShowManageSections] = useState(false);
  const [newSectionName,  setNewSectionName] = useState('');
  const [sectionError,    setSectionError]   = useState('');

  /* ── Fetch ── */
  useEffect(() => {
    const fetchNotes = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setNotes(data || []);
      setLoading(false);
    };
    fetchNotes();
  }, [user.id]);

  useEffect(() => {
    const saved = localStorage.getItem(`${CUSTOM_SECTION_STORAGE_KEY}-${user.id}`);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setCustomSections(parsed);
    } catch {
      setCustomSections([]);
    }
  }, [user.id]);

  useEffect(() => {
    localStorage.setItem(
      `${CUSTOM_SECTION_STORAGE_KEY}-${user.id}`,
      JSON.stringify(customSections)
    );
  }, [customSections, user.id]);

  const allSections = useMemo(
    () => [...SECTIONS, ...customSections],
    [customSections]
  );

  const sectionMap = useMemo(
    () => Object.fromEntries(allSections.map((s) => [s.id, s])),
    [allSections]
  );

  /* ── Derived counts ── */
  const totalTips   = notes.filter((n) => n.is_staff_tip).length;
  const totalNotes  = notes.length - totalTips;

  /* ── Filter + sort ── */
  const filtered = useMemo(() => {
    let result = [...notes];

    if (filterSection) result = result.filter((n) => n.section_name === filterSection);
    if (filterType === 'notes') result = result.filter((n) => !n.is_staff_tip);
    if (filterType === 'tips')  result = result.filter((n) => n.is_staff_tip);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'az') result.sort((a, b) => a.title.localeCompare(b.title));
    else if (sortBy === 'za') result.sort((a, b) => b.title.localeCompare(a.title));
    // newest is default (already ordered from supabase)

    return result;
  }, [notes, filterSection, filterType, search, sortBy]);

  /* ── Handlers ── */
  const handleAddSection = () => {
    const label = newSectionName.trim();
    if (!label) {
      setSectionError('Please enter a section name.');
      return;
    }

    const exists = allSections.some((section) => section.id.toLowerCase() === label.toLowerCase());
    if (exists) {
      setSectionError('That section already exists.');
      return;
    }

    const meta = generateSectionMeta(label);
    const nextSection = { id: label, color: meta.color, bg: meta.bg };

    setCustomSections((prev) => [...prev, nextSection]);
    setFilterSection(label);
    setNewSectionName('');
    setSectionError('');
    setShowManageSections(false);
  };

  const handleRemoveSection = (sectionId) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== sectionId));
    if (filterSection === sectionId) setFilterSection('');
  };

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setNotes((prev) => prev.map((n) => (n.id === saved.id ? saved : n)));
    } else {
      setNotes((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = async (id) => {
    await supabase.from('notes').delete().eq('id', id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const openEdit = (note) => {
    setEditingNote(note);
    setShowModal(true);
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.id === sortBy)?.label ?? 'Sort';

  return (
    <>
      <style>{`
        /* ── Page ── */
        .ns-page { width: 100%; }

        .ns-page-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ff5d8f;
          margin-bottom: 6px;
        }

        .ns-page-sub {
          color: #888;
          font-size: 0.95rem;
          margin-bottom: 28px;
        }

        /* ── Stats row ── */
        .ns-stats {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .ns-stat-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.85);
          border: 1px solid #ffe0ea;
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #666;
        }

        .ns-stat-chip span {
          color: #ff5d8f;
          font-weight: 700;
          font-size: 15px;
        }

        /* ── Toolbar ── */
        .ns-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .ns-search-wrap {
          flex: 1;
          min-width: 200px;
          position: relative;
          display: flex;
          align-items: center;
        }

        .ns-search-icon {
          position: absolute;
          left: 13px;
          color: #ccc;
          pointer-events: none;
        }

        .ns-search {
          width: 100%;
          border: 1.5px solid #ffd6e1;
          background: rgba(255,255,255,0.9);
          border-radius: 999px;
          padding: 10px 36px 10px 35px;
          font-size: 13px;
          outline: none;
          transition: 0.2s;
          color: #444;
        }

        .ns-search:focus {
          border-color: #ff8fb1;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }

        .ns-search-clear {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #bbb;
          cursor: pointer;
          display: flex;
          padding: 0;
        }

        /* ── Sort dropdown ── */
        .ns-sort-wrap { position: relative; }

        .ns-sort-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1.5px solid #ffd6e1;
          background: rgba(255,255,255,0.9);
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 600;
          color: #888;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }

        .ns-sort-btn:hover { border-color: #ff8fb1; color: #ff5d8f; }

        .ns-sort-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: white;
          border-radius: 18px;
          border: 1px solid #ffe0ea;
          box-shadow: 0 12px 32px rgba(255,111,145,0.16);
          overflow: hidden;
          z-index: 200;
          min-width: 160px;
        }

        .ns-sort-option {
          display: block;
          width: 100%;
          text-align: left;
          border: none;
          background: transparent;
          padding: 12px 16px;
          font-size: 13px;
          color: #555;
          cursor: pointer;
          transition: 0.15s;
        }

        .ns-sort-option:hover { background: #fff0f4; color: #ff5d8f; }
        .ns-sort-option.active { color: #ff5d8f; font-weight: 700; background: #fff5f8; }

        /* ── Primary button ── */
        .ns-primary-btn {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: none;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          border-radius: 999px;
          padding: 10px 20px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }

        .ns-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .ns-primary-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .ns-secondary-btn {
          border: none;
          background: #f4f4f4;
          color: #666;
          border-radius: 999px;
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .ns-secondary-btn:hover { background: #eee; }

        /* ── Type tabs ── */
        .ns-type-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }

        .ns-type-tab {
          padding: 7px 16px;
          border-radius: 999px;
          border: 1.5px solid #ffe0ea;
          background: rgba(255,255,255,0.8);
          font-size: 13px;
          font-weight: 600;
          color: #999;
          cursor: pointer;
          transition: 0.2s;
        }

        .ns-type-tab:hover { border-color: #ff8fb1; color: #ff5d8f; }

        .ns-type-tab.active {
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          border-color: transparent;
          color: white;
          box-shadow: 0 4px 12px rgba(255,111,145,0.25);
        }

        /* ── Section filter pills ── */
        .ns-filter-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .ns-filter-label {
          font-size: 12px;
          font-weight: 600;
          color: #bbb;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .ns-filter-pill {
          padding: 6px 14px;
          border-radius: 999px;
          border: 1.5px solid;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.2s;
        }

        .ns-filter-pill.all {
          border-color: #ffd6e1;
          color: #ff5d8f;
        }

        .ns-filter-pill.all.active,
        .ns-filter-pill.all:hover {
          background: #ff5d8f;
          color: white;
          border-color: #ff5d8f;
        }

        .ns-add-section-btn {
          border: 1.5px dashed #ffbfd6;
          background: transparent;
          color: #ff5d8f;
          border-radius: 999px;
          padding: 6px 14px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s;
          white-space: nowrap;
        }

        .ns-add-section-btn:hover {
          background: #fff0f4;
          border-color: #ff8fb1;
          color: #ff5d8f;
        }

        .ns-new-section-form {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
          margin-bottom: 18px;
        }

        .ns-input-sm {
          flex: 1;
          min-width: 180px;
        }

        .ns-btn-sm {
          padding: 8px 14px;
          font-size: 12px;
        }

        .ns-new-section-error {
          margin: 10px 0 0;
          width: 100%;
        }

        .ns-section-manager {
          border: 1px solid #ffe0ea;
          background: rgba(255, 247, 250, 0.95);
          border-radius: 24px;
          padding: 18px;
          margin-top: 12px;
          box-shadow: 0 14px 40px rgba(255, 109, 145, 0.09);
        }

        .ns-section-manager-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .ns-section-manager-title {
          margin: 0 0 4px;
          font-size: 14px;
          font-weight: 700;
          color: #333;
        }

        .ns-section-manager-subtitle {
          margin: 0;
          font-size: 12px;
          color: #777;
          line-height: 1.4;
        }

        .ns-add-section-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
          margin-bottom: 16px;
        }

        .ns-section-manager-list {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .ns-section-manager-empty {
          padding: 16px;
          background: white;
          border-radius: 18px;
          border: 1px dashed #ffd6e1;
          color: #8a7b87;
          font-size: 13px;
          text-align: center;
        }

        .ns-custom-section-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 12px 14px;
          border-radius: 16px;
          background: white;
          border: 1px solid #ffe6ed;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .ns-custom-section-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 18px rgba(255, 109, 145, 0.12);
        }

        .ns-custom-section-pill {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
        }

        .ns-custom-section-delete {
          border: none;
          background: #ffe7ef;
          color: #d64566;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .ns-custom-section-delete:hover {
          background: #ffd0dc;
        }

        /* ── Note grid ── */
        .ns-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        /* ── Note card ── */
        .ns-card {
          background: rgba(255,255,255,0.88);
          border-radius: 20px;
          border: 1.5px solid #ffe0ea;
          border-left: 4px solid;
          padding: 16px;
          transition: box-shadow 0.2s, transform 0.2s;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ns-card:hover {
          box-shadow: 0 8px 24px rgba(255,111,145,0.1);
          transform: translateY(-1px);
        }

        .ns-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .ns-card-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .ns-tip-badge {
          display: inline-flex;
          align-items: center;
          background: linear-gradient(135deg, #ffe08a, #ffcc33);
          color: #7a5800;
          border-radius: 999px;
          padding: 3px 9px;
          font-size: 10px;
          font-weight: 700;
        }

        .ns-section-badge {
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 600;
        }

        .ns-card-actions {
          display: flex;
          gap: 5px;
          align-items: center;
          flex-shrink: 0;
        }

        .ns-icon-btn {
          border: none;
          background: #f0f0f0;
          padding: 7px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #888;
          transition: 0.2s;
        }

        .ns-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; transform: scale(1.05); }
        .ns-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }

        .ns-card-title {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #333;
          line-height: 1.4;
        }

        .ns-card-body {
          margin: 0;
          font-size: 13px;
          color: #666;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .ns-expand-btn {
          background: none;
          border: none;
          color: #ff8fb1;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          align-self: flex-start;
        }

        .ns-expand-btn:hover { color: #ff5d8f; }

        .ns-card-footer {
          margin-top: auto;
          padding-top: 6px;
          border-top: 1px solid #f5e6ea;
        }

        .ns-timestamp {
          font-size: 11px;
          color: #bbb;
        }

        /* ── Empty state ── */
        .ns-empty {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px 24px;
          color: #bbb;
        }

        .ns-empty-icon {
          font-size: 40px;
          margin-bottom: 12px;
        }

        .ns-empty p {
          margin: 0 0 16px;
          font-size: 14px;
        }

        /* ── Results count ── */
        .ns-results-count {
          font-size: 12px;
          color: #bbb;
          margin-bottom: 14px;
          padding-left: 2px;
        }

        /* ── Modal ── */
        .ns-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.22);
          backdrop-filter: blur(5px);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .ns-modal {
          background: white;
          border-radius: 28px;
          padding: 28px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2);
          border: 1px solid #ffe0ea;
          max-height: 90vh;
          overflow-y: auto;
        }

        .ns-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .ns-modal-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .ns-modal-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }

        .ns-modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #333;
        }

        .ns-modal-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ns-field-label {
          display: flex;
          flex-direction: column;
          gap: 7px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #aaa;
          margin: 0;
        }

        .ns-input {
          border: 1.5px solid #ffd6e1;
          background: #fff8fa;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          transition: 0.2s;
          color: #444;
          font-family: inherit;
        }

        .ns-input:focus {
          border-color: #ff8fb1;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }

        .ns-textarea {
          border: 1.5px solid #ffd6e1;
          background: #fff8fa;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          transition: 0.2s;
          color: #444;
          resize: vertical;
          min-height: 120px;
          font-family: inherit;
          line-height: 1.6;
        }

        .ns-textarea:focus {
          border-color: #ff8fb1;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }

        .ns-char-count {
          align-self: flex-end;
          font-size: 11px;
          color: #ccc;
        }

        .ns-char-count.warn { color: #ff8c5a; font-weight: 600; }

        .ns-section-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .ns-pill {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1.5px solid;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: 0.15s;
        }

        /* ── Staff tip toggle ── */
        .ns-toggle-row {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          user-select: none;
        }

        .ns-toggle {
          width: 42px;
          height: 24px;
          border-radius: 999px;
          background: #e0e0e0;
          position: relative;
          cursor: pointer;
          transition: background 0.2s;
          flex-shrink: 0;
        }

        .ns-toggle.on { background: linear-gradient(135deg, #ffcc33, #ffb300); }

        .ns-toggle-knob {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s;
          box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        }

        .ns-toggle.on .ns-toggle-knob { transform: translateX(18px); }

        .ns-toggle-label {
          font-size: 13px;
          font-weight: 600;
          color: #666;
        }

        .ns-form-error {
          background: #fde8e8;
          color: #c0392b;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          margin: 0;
        }

        .ns-modal-actions {
          display: flex;
          gap: 10px;
          padding-top: 4px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .ns-grid { grid-template-columns: 1fr; }
          .ns-toolbar { gap: 8px; }
          .ns-modal { padding: 20px; }
          .ns-page-title { font-size: 1.7rem; }
          .ns-section-pills { gap: 6px; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .ns-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ns-page">
        {/* Page header */}
        <h2 className="ns-page-title">Notes & Staff Tips</h2>

        {/* Stats chips */}
        <div className="ns-stats">
          <div className="ns-stat-chip">
            <StickyNote size={15} />
            <span>{totalNotes}</span> personal notes
          </div>
          <div className="ns-stat-chip">
            <Star size={15} style={{ color: '#ffb300' }} />
            <span style={{ color: '#cc8800' }}>{totalTips}</span> staff tips
          </div>
          <div className="ns-stat-chip">
            <FileText size={15} />
            <span>{notes.length}</span> total
          </div>
        </div>

        {/* Toolbar */}
        <div className="ns-toolbar">
          {/* Search */}
          <div className="ns-search-wrap">
            <Search size={14} className="ns-search-icon" />
            <input
              className="ns-search"
              placeholder="Search notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="ns-search-clear" onClick={() => setSearch('')}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="ns-sort-wrap">
            <button
              className="ns-sort-btn"
              onClick={() => setShowSort((v) => !v)}
            >
              <ArrowUpDown size={13} />
              {currentSortLabel}
            </button>
            {showSort && (
              <div className="ns-sort-dropdown">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    className={`ns-sort-option ${sortBy === opt.id ? 'active' : ''}`}
                    onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add button */}
          <button
            className="ns-primary-btn"
            onClick={() => { setEditingNote(null); setShowModal(true); }}
          >
            <Plus size={15} /> New Note
          </button>
        </div>

        {/* Type tabs */}
        <div className="ns-type-tabs">
          {[
            { id: 'all',   label: `All (${notes.length})` },
            { id: 'notes', label: `My Notes (${totalNotes})` },
            { id: 'tips',  label: `⭐ Staff Tips (${totalTips})` },
          ].map((t) => (
            <button
              key={t.id}
              className={`ns-type-tab ${filterType === t.id ? 'active' : ''}`}
              onClick={() => setFilterType(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Section filter pills */}
        <div className="ns-filter-row">
          <span className="ns-filter-label"><Filter size={11} /> Section:</span>
          <button
            className={`ns-filter-pill all ${filterSection === '' ? 'active' : ''}`}
            onClick={() => setFilterSection('')}
          >
            All
          </button>
          {allSections.map((s) => (
            <button
              key={s.id}
              className={`ns-filter-pill ${filterSection === s.id ? 'active' : ''}`}
              style={{
                borderColor: s.color + '88',
                color: filterSection === s.id ? '#fff' : s.color,
                background: filterSection === s.id ? s.color : 'transparent',
              }}
              onClick={() => setFilterSection(filterSection === s.id ? '' : s.id)}
            >
              {s.id}
            </button>
          ))}
          <button
            className="ns-add-section-btn"
            type="button"
            onClick={() => setShowManageSections((prev) => !prev)}
          >
            {showManageSections ? 'Hide section manager' : 'Manage sections'}
          </button>
        </div>
        {showManageSections && (
          <div className="ns-section-manager">
            <div className="ns-section-manager-header">
              <div>
                <p className="ns-section-manager-title">Custom section manager</p>
                <p className="ns-section-manager-subtitle">Add or remove your own note categories with pill-style controls.</p>
              </div>
              <button
                type="button"
                className="ns-secondary-btn ns-btn-sm"
                onClick={() => {
                  setShowManageSections(false);
                  setNewSectionName('');
                  setSectionError('');
                }}
              >
                Close
              </button>
            </div>

            <div className="ns-add-section-row">
              <input
                className="ns-input ns-input-sm"
                value={newSectionName}
                onChange={(e) => { setNewSectionName(e.target.value); setSectionError(''); }}
                placeholder="Add custom section"
              />
              <button type="button" className="ns-primary-btn ns-btn-sm" onClick={handleAddSection}>
                Add section
              </button>
            </div>
            {sectionError && <p className="ns-form-error ns-new-section-error">{sectionError}</p>}

            <div className="ns-section-manager-list">
              {customSections.length === 0 ? (
                <div className="ns-section-manager-empty">No custom sections yet — create one to get started.</div>
              ) : (
                customSections.map((section) => (
                  <div key={section.id} className="ns-custom-section-item">
                    <span className="ns-custom-section-pill" style={{ borderColor: section.color + '88', color: section.color, background: section.bg }}>
                      {section.id}
                    </span>
                    <button
                      type="button"
                      className="ns-custom-section-delete"
                      onClick={() => handleRemoveSection(section.id)}
                      title={`Delete ${section.id}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
     

        {/* Results count */}
        {(search || filterSection || filterType !== 'all') && (
          <p className="ns-results-count">
            Showing {filtered.length} of {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        )}

        {/* Notes grid */}
        {loading ? (
          <div className="ns-empty"><p>Loading your notes…</p></div>
        ) : (
          <div className="ns-grid">
            {filtered.length === 0 ? (
              <div className="ns-empty">
                <div className="ns-empty-icon">
                  {search ? '🔍' : notes.length === 0 ? '📓' : '🗂️'}
                </div>
                <p>
                  {search
                    ? `No notes match "${search}"`
                    : notes.length === 0
                    ? 'No notes yet — start capturing your learnings!'
                    : 'No notes match the current filters.'}
                </p>
                {notes.length === 0 && (
                  <button
                    className="ns-primary-btn"
                    style={{ margin: '0 auto' }}
                    onClick={() => { setEditingNote(null); setShowModal(true); }}
                  >
                    <Plus size={15} /> Write your first note
                  </button>
                )}
              </div>
            ) : (
              filtered.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  sectionMap={sectionMap}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <NoteModal
          editing={editingNote}
          defaultSection={filterSection || allSections[0].id}
          sections={allSections}
          sectionMap={sectionMap}
          onClose={() => { setShowModal(false); setEditingNote(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}

export default NotesSection;