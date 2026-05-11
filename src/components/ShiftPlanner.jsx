import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  CalendarDays, Plus, Heart, Clock, ChevronLeft, ChevronRight,
  Edit3, Trash2, X, Check, Sunrise, Sun, Moon, Coffee, BookOpen,
  HelpCircle, BarChart2, Droplets, Timer, Filter, AlertCircle,
  GraduationCap, Search, ArrowUpDown, Copy, CheckCircle2,
  Zap, FileText, ChevronDown, ChevronUp, Calendar,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SHIFT_TYPES = {
  morning:   { label: 'Morning',   color: '#ff8c5a', bg: '#fff5ee', icon: Sunrise   },
  afternoon: { label: 'Afternoon', color: '#5f8dff', bg: '#eff4ff', icon: Sun       },
  night:     { label: 'Night',     color: '#8b6fff', bg: '#f3f0ff', icon: Moon      },
  rest:      { label: 'Rest',      color: '#4abf95', bg: '#edfaf4', icon: Coffee    },
  exam:      { label: 'Exam',      color: '#e05555', bg: '#fff0f0', icon: BookOpen  },
  other:     { label: 'Other',     color: '#999',    bg: '#f5f5f5', icon: HelpCircle },
};

const SECTIONS = [
  'Hematology',
  'Clinical Chemistry',
  'Microbiology',
  'Blood Bank',
  'Histopathology/Cytology',
];

const SECTION_META = {
  'Hematology':              { color: '#ff6f91', bg: '#fff0f4' },
  'Clinical Chemistry':      { color: '#ff8c5a', bg: '#fff5ee' },
  'Microbiology':            { color: '#5f8dff', bg: '#eff4ff' },
  'Blood Bank':              { color: '#e05555', bg: '#fff0f0' },
  'Histopathology/Cytology': { color: '#4abf95', bg: '#edfaf4' },
};

const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EXAM_SORT_OPTIONS = [
  { id: 'soonest', label: 'Soonest first' },
  { id: 'latest',  label: 'Latest first'  },
  { id: 'az',      label: 'A → Z'         },
  { id: 'za',      label: 'Z → A'         },
];

const WELLNESS_TIPS = [
  { emoji: '💧', tip: 'Drink a glass of water every 2 hours — dehydration kills focus.' },
  { emoji: '🧠', tip: 'Take a 5-minute walk between procedures to reset your mind.' },
  { emoji: '😴', tip: 'Aim for 7–8 hours of sleep; memory consolidation happens at night.' },
  { emoji: '🍎', tip: 'Eat a balanced meal before your shift — avoid heavy carbs before night duty.' },
  { emoji: '👁️', tip: 'Follow the 20-20-20 rule: every 20 min, look 20 ft away for 20 sec.' },
  { emoji: '🧘', tip: 'Three deep breaths before a stressful procedure can lower your heart rate.' },
  { emoji: '🤝', tip: 'Ask your senior for feedback after every major procedure — it compounds fast.' },
  { emoji: '📵', tip: 'Avoid phone use 30 min before sleep; blue light disrupts melatonin.' },
  { emoji: '🍵', tip: 'Limit caffeine after 2 PM to protect your sleep quality.' },
  { emoji: '✍️', tip: 'Write one thing you learned each shift — tiny logs become big knowledge.' },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function isToday(dateStr) {
  return dateStr === toDateStr(new Date());
}

function calcDuration(start, end) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcDurationHrs(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateFull(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/* Returns urgency level + display info based on days remaining */
function getUrgency(days) {
  if (days < 0)  return { level: 'past',    borderColor: '#e0e0e0', badgeBg: '#f5f5f5', badgeColor: '#bbb',    icon: '✅', label: `${Math.abs(days)}d ago` };
  if (days === 0) return { level: 'today',  borderColor: '#e05555', badgeBg: '#fff0f0', badgeColor: '#e05555', icon: '🔥', label: 'Today!'     };
  if (days === 1) return { level: 'urgent', borderColor: '#ff6f91', badgeBg: '#fff0f4', badgeColor: '#ff5d8f', icon: '⚡', label: 'Tomorrow'   };
  if (days <= 3)  return { level: 'urgent', borderColor: '#ff8c5a', badgeBg: '#fff5ee', badgeColor: '#ff8c5a', icon: '⚠️', label: `In ${days} days` };
  if (days <= 7)  return { level: 'soon',   borderColor: '#5f8dff', badgeBg: '#eff4ff', badgeColor: '#5f8dff', icon: '📅', label: `In ${days} days` };
  return           { level: 'normal',        borderColor: '#ffe0ea', badgeBg: '#fff8fb', badgeColor: '#ff8fb1', icon: '📚', label: `In ${days} days` };
}

function getWeekStart(d) {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
}

function getWeekLabel(weekStart) {
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function isMissingTableError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.message?.includes('Could not find the table')
  );
}

/* ─────────────────────────────────────────────
   EXAM MODAL
───────────────────────────────────────────── */
function ExamModal({ editing, onClose, onSaved }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    exam_name:    editing?.exam_name    ?? '',
    exam_date:    editing?.exam_date    ?? toDateStr(new Date()),
    section_name: editing?.section_name ?? SECTIONS[0],
    notes:        editing?.notes        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const days       = daysUntil(form.exam_date);
  const urgency    = getUrgency(days);
  const sectionMeta = SECTION_META[form.section_name] ?? { color: '#ff6f91', bg: '#fff0f4' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.exam_name.trim()) { setError('Exam name is required.'); return; }
    setSaving(true);
    setError('');

    let result;
    if (editing) {
      result = await supabase
        .from('exams')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('exams')
        .insert([{ ...form, user_id: user.id }])
        .select()
        .single();
    }

    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="em-overlay" onClick={onClose}>
      <div className="em-modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="em-header">
          <div className="em-header-left">
            <div className="em-header-icon" style={{ background: sectionMeta.bg }}>
              <GraduationCap size={20} style={{ color: sectionMeta.color }} />
            </div>
            <div>
              <h3 className="em-header-title">
                {editing ? 'Edit Exam' : 'Add Exam Date'}
              </h3>
              <p className="em-header-sub">Track your upcoming assessment</p>
            </div>
          </div>
          <button className="em-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Countdown preview */}
        {form.exam_date && (
          <div
            className="em-countdown-preview"
            style={{ background: urgency.badgeBg, borderColor: urgency.borderColor + '55' }}
          >
            <span className="em-countdown-icon">{urgency.icon}</span>
            <span style={{ color: urgency.badgeColor, fontWeight: 700, fontSize: 13 }}>
              {urgency.label}
            </span>
            <span style={{ color: '#aaa', fontSize: 12 }}>
              — {formatDateLong(form.exam_date)}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="em-form">

          {/* Exam Name */}
          <label className="em-label">
            Exam Name *
            <input
              className="em-input"
              placeholder="e.g. Hematology Midterm Exam"
              value={form.exam_name}
              onChange={(e) => setForm({ ...form, exam_name: e.target.value })}
              required
              maxLength={120}
            />
          </label>

          {/* Date */}
          <label className="em-label">
            Exam Date *
            <input
              type="date"
              className="em-input"
              value={form.exam_date}
              onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
              required
            />
          </label>

          {/* Section */}
          <div>
            <p className="em-label" style={{ marginBottom: 10 }}>Section</p>
            <div className="em-section-pills">
              {SECTIONS.map((s) => {
                const sm = SECTION_META[s];
                const active = form.section_name === s;
                return (
                  <button
                    key={s}
                    type="button"
                    className="em-section-pill"
                    style={active
                      ? { background: sm.color, borderColor: sm.color, color: '#fff' }
                      : { borderColor: sm.color + '66', color: sm.color }
                    }
                    onClick={() => setForm({ ...form, section_name: s })}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <label className="em-label">
            Description & Study Notes
            <textarea
              className="em-textarea"
              rows={4}
              placeholder="Topics covered, what to review, key concepts, study tips..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {error && <p className="em-error">{error}</p>}

          <div className="em-actions">
            <button type="submit" className="em-primary-btn" disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Exam' : 'Save Exam'}
            </button>
            <button type="button" className="em-secondary-btn" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXAM CARD
───────────────────────────────────────────── */
function ExamCard({ exam, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const days     = daysUntil(exam.exam_date);
  const urgency  = getUrgency(days);
  const secMeta  = SECTION_META[exam.section_name] ?? { color: '#ff6f91', bg: '#fff0f4' };
  const isPast   = days < 0;

  const copyExam = async () => {
    const text = [
      `📚 ${exam.exam_name}`,
      `📅 ${formatDateLong(exam.exam_date)}`,
      exam.section_name ? `🔬 ${exam.section_name}` : '',
      exam.notes ? `\n📝 Notes:\n${exam.notes}` : '',
    ].filter(Boolean).join('\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const hasNotes  = exam.notes && exam.notes.trim().length > 0;
  const longNotes = hasNotes && exam.notes.trim().length > 120;
  const notesPreview = longNotes && !expanded
    ? exam.notes.trim().slice(0, 120) + '…'
    : exam.notes?.trim();

  return (
    <div
      className={`ex-card ${urgency.level} ${isPast ? 'ex-card-past' : ''}`}
      style={{ borderLeftColor: urgency.borderColor }}
    >
      {/* Top row */}
      <div className="ex-card-top">
        <div className="ex-card-badges">
          {exam.section_name && (
            <span
              className="ex-section-badge"
              style={{ background: secMeta.bg, color: secMeta.color }}
            >
              {exam.section_name}
            </span>
          )}
          <span
            className="ex-countdown-badge"
            style={{ background: urgency.badgeBg, color: urgency.badgeColor }}
          >
            {urgency.icon} {urgency.label}
          </span>
        </div>
        <div className="ex-card-actions">
          <button className="ex-icon-btn" onClick={copyExam} title="Copy details">
            {copied
              ? <Check size={13} style={{ color: '#4abf95' }} />
              : <Copy size={13} />}
          </button>
          <button className="ex-icon-btn" onClick={() => onEdit(exam)} title="Edit">
            <Edit3 size={13} />
          </button>
          <button className="ex-icon-btn danger" onClick={() => onDelete(exam.id)} title="Delete">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Exam name */}
      <h4 className={`ex-card-name ${isPast ? 'past' : ''}`}>{exam.exam_name}</h4>

      {/* Date */}
      <p className="ex-card-date">
        <Calendar size={12} style={{ display: 'inline', marginRight: 5, verticalAlign: -1 }} />
        {formatDateLong(exam.exam_date)}
      </p>

      {/* Notes */}
      {hasNotes && (
        <div className="ex-card-notes-wrap">
          <p className="ex-card-notes">{notesPreview}</p>
          {longNotes && (
            <button
              className="ex-expand-btn"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded
                ? <><ChevronUp size={11} /> Show less</>
                : <><ChevronDown size={11} /> Read more</>}
            </button>
          )}
        </div>
      )}

      {/* Today pulse ring */}
      {days === 0 && (
        <div className="ex-today-banner">
          🔥 This exam is TODAY — good luck!
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXAMS PANEL (full exams tab content)
───────────────────────────────────────────── */
function ExamsPanel({ exams, loading, error, onAdd, onEdit, onDelete }) {
  const [search,        setSearch]        = useState('');
  const [filterTab,     setFilterTab]     = useState('upcoming'); // all | upcoming | thisweek | past
  const [filterSection, setFilterSection] = useState('');
  const [sortBy,        setSortBy]        = useState('soonest');
  const [showSort,      setShowSort]      = useState(false);

  const today = useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  /* Derived stats */
  const stats = useMemo(() => {
    const upcoming  = exams.filter(e => daysUntil(e.exam_date) >= 0);
    const past      = exams.filter(e => daysUntil(e.exam_date) < 0);
    const thisWeek  = exams.filter(e => { const d = daysUntil(e.exam_date); return d >= 0 && d <= 7; });
    const urgent    = exams.filter(e => { const d = daysUntil(e.exam_date); return d >= 0 && d <= 3; });
    return { total: exams.length, upcoming: upcoming.length, past: past.length, thisWeek: thisWeek.length, urgent: urgent.length };
  }, [exams]);

  /* Filter + sort */
  const filtered = useMemo(() => {
    let list = [...exams];

    // Tab filter
    if (filterTab === 'upcoming') list = list.filter(e => daysUntil(e.exam_date) >= 0);
    if (filterTab === 'thisweek') list = list.filter(e => { const d = daysUntil(e.exam_date); return d >= 0 && d <= 7; });
    if (filterTab === 'past')     list = list.filter(e => daysUntil(e.exam_date) < 0);

    // Section filter
    if (filterSection) list = list.filter(e => e.section_name === filterSection);

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.exam_name.toLowerCase().includes(q) ||
        e.notes?.toLowerCase().includes(q) ||
        e.section_name?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'soonest') list.sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date));
    if (sortBy === 'latest')  list.sort((a, b) => new Date(b.exam_date) - new Date(a.exam_date));
    if (sortBy === 'az')      list.sort((a, b) => a.exam_name.localeCompare(b.exam_name));
    if (sortBy === 'za')      list.sort((a, b) => b.exam_name.localeCompare(a.exam_name));

    return list;
  }, [exams, filterTab, filterSection, search, sortBy]);

  const currentSortLabel = EXAM_SORT_OPTIONS.find(o => o.id === sortBy)?.label ?? 'Sort';

  return (
    <div className="ex-panel">

      {/* Error */}
      {error && (
        <div className="ex-error-box">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="ex-stats-row">
        <div className="ex-stat-card">
          <span className="ex-stat-num">{stats.total}</span>
          <span className="ex-stat-label">Total Exams</span>
        </div>
        <div className="ex-stat-card upcoming">
          <span className="ex-stat-num">{stats.upcoming}</span>
          <span className="ex-stat-label">Upcoming</span>
        </div>
        <div className={`ex-stat-card thisweek ${stats.thisWeek > 0 ? 'has-items' : ''}`}>
          <span className="ex-stat-num">{stats.thisWeek}</span>
          <span className="ex-stat-label">This Week</span>
        </div>
        <div className="ex-stat-card past">
          <span className="ex-stat-num">{stats.past}</span>
          <span className="ex-stat-label">Completed</span>
        </div>
      </div>

      {/* Urgent banner */}
      {stats.urgent > 0 && filterTab !== 'past' && (
        <div className="ex-urgent-banner">
          <Zap size={14} />
          <strong>{stats.urgent} exam{stats.urgent > 1 ? 's' : ''}</strong>
          {stats.urgent > 1 ? ' are' : ' is'} happening within 3 days — study hard! 💪
        </div>
      )}

      {/* Toolbar */}
      <div className="ex-toolbar">
        <div className="ex-search-wrap">
          <Search size={13} className="ex-search-icon" />
          <input
            className="ex-search"
            placeholder="Search exams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button className="ex-search-clear" onClick={() => setSearch('')}>
              <X size={12} />
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="ex-sort-wrap">
          <button
            className="ex-sort-btn"
            onClick={() => setShowSort(v => !v)}
          >
            <ArrowUpDown size={12} />
            <span className="ex-sort-label">{currentSortLabel}</span>
          </button>
          {showSort && (
            <div className="ex-sort-dropdown">
              {EXAM_SORT_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`ex-sort-opt ${sortBy === opt.id ? 'active' : ''}`}
                  onClick={() => { setSortBy(opt.id); setShowSort(false); }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button className="ex-add-btn" onClick={onAdd}>
          <Plus size={15} />
          <span>Add Exam</span>
        </button>
      </div>

      {/* Tab filter */}
      <div className="ex-tab-row">
        {[
          { id: 'all',      label: `All (${stats.total})`             },
          { id: 'upcoming', label: `Upcoming (${stats.upcoming})`     },
          { id: 'thisweek', label: `This Week (${stats.thisWeek})`    },
          { id: 'past',     label: `Completed (${stats.past})`        },
        ].map(t => (
          <button
            key={t.id}
            className={`ex-tab ${filterTab === t.id ? 'active' : ''}`}
            onClick={() => setFilterTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Section pills */}
      <div className="ex-section-filter">
        <span className="ex-filter-label"><Filter size={11} /> Section:</span>
        <button
          className={`ex-sec-pill all-pill ${!filterSection ? 'active' : ''}`}
          onClick={() => setFilterSection('')}
        >
          All
        </button>
        {SECTIONS.map(s => {
          const sm = SECTION_META[s];
          const active = filterSection === s;
          return (
            <button
              key={s}
              className="ex-sec-pill"
              style={{
                borderColor: sm.color + '88',
                color:       active ? '#fff' : sm.color,
                background:  active ? sm.color : 'transparent',
              }}
              onClick={() => setFilterSection(active ? '' : s)}
            >
              {s}
            </button>
          );
        })}
      </div>

      {/* Results count */}
      {(search || filterSection || filterTab !== 'upcoming') && (
        <p className="ex-results-count">
          Showing {filtered.length} of {exams.length} exam{exams.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Cards */}
      {loading ? (
        <div className="ex-empty">
          <p>Loading your exams…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ex-empty">
          <div className="ex-empty-icon">
            {search ? '🔍' : exams.length === 0 ? '📅' : '🎉'}
          </div>
          <p>
            {search
              ? `No exams match "${search}"`
              : exams.length === 0
              ? 'No exams added yet — schedule your first one!'
              : filterTab === 'past'
              ? 'No completed exams yet.'
              : filterTab === 'thisweek'
              ? 'No exams this week — enjoy the break! ✨'
              : 'No upcoming exams match the filter.'}
          </p>
          {exams.length === 0 && (
            <button className="ex-add-btn-empty" onClick={onAdd}>
              <Plus size={14} /> Schedule Exam
            </button>
          )}
        </div>
      ) : (
        <div className="ex-cards-grid">
          {filtered.map(exam => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHIFT MODAL (existing — unchanged)
───────────────────────────────────────────── */
function ShiftModal({ editing, defaultDate, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name: editing?.section_name ?? SECTIONS[0],
    shift_date:   editing?.shift_date   ?? defaultDate ?? toDateStr(new Date()),
    start_time:   editing?.start_time   ?? '07:00',
    end_time:     editing?.end_time     ?? '15:00',
    shift_type:   editing?.shift_type   ?? 'morning',
    notes:        editing?.notes        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const duration  = calcDuration(form.start_time, form.end_time);
  const ShiftIcon = SHIFT_TYPES[form.shift_type]?.icon ?? HelpCircle;
  const typeColor = SHIFT_TYPES[form.shift_type]?.color ?? '#888';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    let result;
    if (editing) {
      result = await supabase.from('shifts').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('shifts').insert([{ ...form, user_id: user.id }]).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="sp-overlay" onClick={onClose}>
      <div className="sp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sp-modal-header">
          <div className="sp-modal-title-row">
            <div className="sp-modal-dot" style={{ background: typeColor }} />
            <h3>{editing ? 'Edit Shift' : 'Add Shift'}</h3>
          </div>
          <button className="sp-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="sp-modal-form">
          <div>
            <p className="sp-field-label">Shift Type</p>
            <div className="sp-type-pills">
              {Object.entries(SHIFT_TYPES).map(([key, val]) => {
                const TIcon = val.icon;
                return (
                  <button key={key} type="button"
                    className={`sp-type-pill ${form.shift_type === key ? 'active' : ''}`}
                    style={form.shift_type === key
                      ? { background: val.color, borderColor: val.color, color: '#fff' }
                      : { borderColor: val.color + '66', color: val.color }}
                    onClick={() => setForm({ ...form, shift_type: key })}>
                    <TIcon size={13} />{val.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="sp-field-label">
            Section
            <select className="sp-select" value={form.section_name} onChange={(e) => setForm({ ...form, section_name: e.target.value })}>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="sp-field-label">
            Date
            <input type="date" className="sp-input" value={form.shift_date} onChange={(e) => setForm({ ...form, shift_date: e.target.value })} required />
          </label>
          <div className="sp-time-row">
            <label className="sp-field-label" style={{ flex: 1 }}>
              Start Time
              <input type="time" className="sp-input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} required />
            </label>
            <label className="sp-field-label" style={{ flex: 1 }}>
              End Time
              <input type="time" className="sp-input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} required />
            </label>
          </div>
          {duration && (
            <div className="sp-duration-preview" style={{ borderColor: typeColor + '55', color: typeColor }}>
              <Timer size={13} />Duration: <strong>{duration}</strong>
            </div>
          )}
          <label className="sp-field-label">
            Notes (optional)
            <textarea className="sp-textarea" rows={2} placeholder="Any reminders or details…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
          {error && <p className="sp-error">{error}</p>}
          <div className="sp-modal-actions">
            <button type="submit" className="sp-primary-btn" disabled={saving}>
              <Check size={15} />{saving ? 'Saving…' : editing ? 'Update Shift' : 'Add Shift'}
            </button>
            <button type="button" className="sp-secondary-btn" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WEEKLY STATS
───────────────────────────────────────────── */
function WeeklyStats({ shifts }) {
  const totalHours = useMemo(
    () => shifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0),
    [shifts]
  );
  const typeCounts = useMemo(() => {
    const c = {};
    shifts.forEach(s => { c[s.shift_type] = (c[s.shift_type] ?? 0) + 1; });
    return c;
  }, [shifts]);
  const nightCount = typeCounts['night'] ?? 0;

  return (
    <div className="sp-stats-bar">
      <div className="sp-stat"><CalendarDays size={15} /><span><strong>{shifts.length}</strong> shifts</span></div>
      <div className="sp-stat-divider" />
      <div className="sp-stat"><Clock size={15} /><span><strong>{totalHours.toFixed(1)}h</strong> total</span></div>
      <div className="sp-stat-divider" />
      {nightCount >= 3 && (
        <div className="sp-stat warn"><AlertCircle size={14} /><span>{nightCount} night shifts — rest well!</span></div>
      )}
      {Object.entries(typeCounts).map(([type, count]) => {
        const meta = SHIFT_TYPES[type];
        return (
          <div key={type} className="sp-type-chip"
            style={{ background: meta?.bg, color: meta?.color, border: `1px solid ${meta?.color}44` }}>
            {meta?.label} ×{count}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHIFT CALENDAR (with exam markers)
───────────────────────────────────────────── */
function ShiftCalendar({ shifts, exams, onAdd, onEdit, onDelete, currentWeek, onPrevWeek, onNextWeek }) {
  const weekStart = getWeekStart(currentWeek);
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
  const todayStr = toDateStr(new Date());

  return (
    <div className="sp-card sp-calendar-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap pink"><CalendarDays size={20} /></div>
        <div><h3>Weekly Schedule</h3><p>Shifts & exam markers</p></div>
      </div>

      <div className="sp-week-nav">
        <button className="sp-nav-btn" onClick={onPrevWeek}><ChevronLeft size={16} /></button>
        <span className="sp-week-label">{getWeekLabel(weekStart)}</span>
        <button className="sp-nav-btn" onClick={onNextWeek}><ChevronRight size={16} /></button>
        {toDateStr(weekStart) !== toDateStr(getWeekStart(new Date())) && (
          <button className="sp-today-btn" onClick={() => onNextWeek('today')}>Today</button>
        )}
      </div>

      <WeeklyStats shifts={shifts} />

      <div className="sp-cal-grid">
        {weekDates.map((date, i) => {
          const dateStr   = toDateStr(date);
          const dayShifts = shifts.filter(s => s.shift_date === dateStr);
          const dayExams  = exams.filter(e => e.exam_date === dateStr);
          const today     = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`sp-cal-day ${today ? 'today' : ''} ${(dayShifts.length + dayExams.length) > 0 ? 'has-shifts' : ''}`}
              onClick={() => onAdd(dateStr)}
              title={`Add shift on ${formatDateFull(dateStr)}`}
            >
              <div className="sp-cal-day-header">
                <span className="sp-day-name">{DAYS_SHORT[i]}</span>
                <span className={`sp-day-num ${today ? 'today-num' : ''}`}>{date.getDate()}</span>
              </div>

              <div className="sp-cal-day-shifts">
                {dayShifts.length === 0 && dayExams.length === 0 && (
                  <div className="sp-cal-empty-day"><Plus size={12} /></div>
                )}

                {/* Shift pills */}
                {dayShifts.map(shift => {
                  const meta  = SHIFT_TYPES[shift.shift_type] ?? SHIFT_TYPES.other;
                  const SIcon = meta.icon;
                  return (
                    <div key={shift.id} className="sp-shift-pill"
                      style={{ background: meta.bg, borderColor: meta.color + '55', color: meta.color }}
                      onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                      title={`${meta.label} • ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`}>
                      <SIcon size={10} />
                      <span>{meta.label}</span>
                      <button className="sp-pill-delete" onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }} title="Delete">
                        <X size={9} />
                      </button>
                    </div>
                  );
                })}

                {/* Exam markers */}
                {dayExams.map(exam => {
                  const days    = daysUntil(exam.exam_date);
                  const urgency = getUrgency(days);
                  return (
                    <div
                      key={exam.id}
                      className="sp-exam-marker"
                      style={{ background: urgency.badgeBg, borderColor: urgency.borderColor + '88', color: urgency.badgeColor }}
                      title={`📚 ${exam.exam_name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GraduationCap size={9} />
                      <span>{exam.exam_name.length > 8 ? exam.exam_name.slice(0, 8) + '…' : exam.exam_name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ALL SHIFTS LIST (existing — unchanged)
───────────────────────────────────────────── */
function AllShiftsList({ allShifts, onEdit, onDelete }) {
  const [filterType, setFilterType] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    let list = [...allShifts].sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date));
    if (filterType) list = list.filter(s => s.shift_type === filterType);
    return list;
  }, [allShifts, filterType]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(s => {
      const key = s.shift_date.slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalHours = useMemo(
    () => allShifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0),
    [allShifts]
  );

  return (
    <div className="sp-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap blue"><BarChart2 size={20} /></div>
        <div><h3>Shift History</h3><p>{allShifts.length} shifts · {totalHours.toFixed(1)}h total</p></div>
      </div>
      <div className="sp-list-toolbar">
        <div className="sp-filter-wrap">
          <button className={`sp-filter-btn ${filterType ? 'active' : ''}`} onClick={() => setShowFilter(v => !v)}>
            <Filter size={13} />{filterType ? SHIFT_TYPES[filterType]?.label : 'All types'}
          </button>
          {showFilter && (
            <div className="sp-filter-dropdown">
              <button className={`sp-filter-opt ${!filterType ? 'active' : ''}`} onClick={() => { setFilterType(''); setShowFilter(false); }}>All types</button>
              {Object.entries(SHIFT_TYPES).map(([key, val]) => (
                <button key={key} className={`sp-filter-opt ${filterType === key ? 'active' : ''}`} style={{ color: val.color }}
                  onClick={() => { setFilterType(key); setShowFilter(false); }}>{val.label}</button>
              ))}
            </div>
          )}
        </div>
        {filterType && (
          <button className="sp-clear-filter" onClick={() => setFilterType('')}><X size={12} /> Clear</button>
        )}
      </div>
      {grouped.length === 0 ? (
        <div className="sp-empty"><p>No shifts logged yet ✨</p></div>
      ) : (
        <div className="sp-shift-list">
          {grouped.map(([month, monthShifts]) => (
            <div key={month}>
              <p className="sp-month-label">
                {new Date(month + '-15').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                <span>{monthShifts.length} shifts</span>
              </p>
              {monthShifts.map(shift => {
                const meta  = SHIFT_TYPES[shift.shift_type] ?? SHIFT_TYPES.other;
                const SIcon = meta.icon;
                const duration = calcDuration(shift.start_time, shift.end_time);
                const today    = isToday(shift.shift_date);
                return (
                  <div key={shift.id} className={`sp-shift-row ${today ? 'today-row' : ''}`}>
                    <div className="sp-shift-left">
                      <div className="sp-type-icon" style={{ background: meta.bg, color: meta.color }}><SIcon size={14} /></div>
                      <div>
                        <div className="sp-shift-main">
                          <strong>{formatDateFull(shift.shift_date)}</strong>
                          {today && <span className="sp-today-badge">Today</span>}
                        </div>
                        <div className="sp-shift-sub">
                          <span className="sp-type-tag" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                          <span className="sp-time-range">{formatTime(shift.start_time)} – {formatTime(shift.end_time)}</span>
                          {duration && <span className="sp-dur-tag"><Timer size={10} /> {duration}</span>}
                        </div>
                        {shift.section_name && <p className="sp-shift-section">{shift.section_name}</p>}
                        {shift.notes && <p className="sp-shift-notes">{shift.notes}</p>}
                      </div>
                    </div>
                    <div className="sp-shift-row-actions">
                      <button className="sp-icon-btn" onClick={() => onEdit(shift)} title="Edit"><Edit3 size={13} /></button>
                      <button className="sp-icon-btn danger" onClick={() => onDelete(shift.id)} title="Delete"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   WELLNESS PANEL (existing — unchanged)
───────────────────────────────────────────── */
function WellnessPanel({ weekShifts }) {
  const [tipIndex,  setTipIndex]  = useState(() => Math.floor(Math.random() * WELLNESS_TIPS.length));
  const [hydration, setHydration] = useState(0);
  const HYDRATION_GOAL = 8;

  const nightCount = weekShifts.filter(s => s.shift_type === 'night').length;
  const totalHours = weekShifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0);
  const fatigue    = totalHours >= 40 ? 'high' : totalHours >= 24 ? 'moderate' : 'low';

  const fatigueInfo = {
    high:     { color: '#e05555', bg: '#fff0f0', text: 'High workload this week. Prioritize rest and recovery.' },
    moderate: { color: '#ff8c5a', bg: '#fff5ee', text: 'Moderate workload. Stay hydrated and take breaks.' },
    low:      { color: '#4abf95', bg: '#edfaf4', text: 'Manageable schedule. Keep the great momentum! ✨' },
  };

  const tip = WELLNESS_TIPS[tipIndex];

  return (
    <div className="sp-card sp-wellness-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap green"><Heart size={20} /></div>
        <div><h3>Wellness Check</h3><p>Stay healthy during internship</p></div>
      </div>
      <div className="sp-fatigue-bar" style={{ background: fatigueInfo[fatigue].bg, borderColor: fatigueInfo[fatigue].color + '44' }}>
        <AlertCircle size={14} style={{ color: fatigueInfo[fatigue].color, flexShrink: 0 }} />
        <div>
          <p className="sp-fatigue-label" style={{ color: fatigueInfo[fatigue].color }}>
            {fatigue.charAt(0).toUpperCase() + fatigue.slice(1)} Fatigue Risk
          </p>
          <p className="sp-fatigue-text">{fatigueInfo[fatigue].text}</p>
        </div>
      </div>
      {nightCount >= 2 && (
        <div className="sp-night-warning">
          <Moon size={13} /> {nightCount} night shifts this week — extra sleep is essential.
        </div>
      )}
      <div className="sp-hydration">
        <div className="sp-hydration-header">
          <span className="sp-section-label"><Droplets size={13} /> Daily Hydration</span>
          <span className="sp-hydration-count">{hydration}/{HYDRATION_GOAL} glasses</span>
        </div>
        <div className="sp-hydration-cups">
          {Array.from({ length: HYDRATION_GOAL }).map((_, i) => (
            <button key={i} className={`sp-cup ${i < hydration ? 'filled' : ''}`}
              onClick={() => setHydration(i < hydration ? i : i + 1)}>💧</button>
          ))}
        </div>
        {hydration >= HYDRATION_GOAL && <p className="sp-hydration-done">✅ Hydration goal reached today!</p>}
      </div>
      <div className="sp-tip-card">
        <div className="sp-tip-emoji">{tip.emoji}</div>
        <div>
          <p className="sp-tip-label">Wellness Tip</p>
          <p className="sp-tip-text">{tip.tip}</p>
        </div>
      </div>
      <button className="sp-next-tip-btn" onClick={() => setTipIndex(i => (i + 1) % WELLNESS_TIPS.length)}>
        Next tip →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN SHIFT PLANNER
───────────────────────────────────────────── */
export default function ShiftPlanner() {
  const { user } = useAuth();

  /* ── Shifts state ── */
  const [allShifts,    setAllShifts]    = useState([]);
  const [weekShifts,   setWeekShifts]   = useState([]);
  const [currentWeek,  setCurrentWeek]  = useState(new Date());
  const [loadingShifts,setLoadingShifts]= useState(true);
  const [showShiftModal,setShowShiftModal]=useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [modalDate,    setModalDate]    = useState('');

  /* ── Exams state ── */
  const [allExams,    setAllExams]    = useState([]);
  const [loadingExams,setLoadingExams]= useState(true);
  const [examError,   setExamError]   = useState(null);
  const [showExamModal,setShowExamModal]=useState(false);
  const [editingExam, setEditingExam] = useState(null);

  /* ── Page tab ── */
  const [activeTab, setActiveTab] = useState('shifts');

  /* ── Derived ── */
  const upcomingExamCount = useMemo(
    () => allExams.filter(e => daysUntil(e.exam_date) >= 0).length,
    [allExams]
  );

  /* ── Fetch shifts ── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingShifts(true);
      const { data } = await supabase
        .from('shifts').select('*').eq('user_id', user.id)
        .order('shift_date', { ascending: false });
      setAllShifts(data || []);
      setLoadingShifts(false);
    };
    fetchAll();
  }, [user.id]);

  /* ── Derive week shifts ── */
  useEffect(() => {
    const weekStart = getWeekStart(currentWeek);
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const s = toDateStr(weekStart);
    const e = toDateStr(weekEnd);
    setWeekShifts(allShifts.filter(sh => sh.shift_date >= s && sh.shift_date <= e));
  }, [allShifts, currentWeek]);

  /* ── Fetch exams ── */
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      const { data, error } = await supabase
        .from('exams').select('*').eq('user_id', user.id)
        .order('exam_date', { ascending: true });
      if (error) {
        if (isMissingTableError(error)) {
          setExamError('Exams table not found. Run supabase/schema.sql in your project.');
        } else {
          console.error(error);
        }
      } else {
        setAllExams(data || []);
        setExamError(null);
      }
      setLoadingExams(false);
    };
    fetchExams();
  }, [user.id]);

  /* ── Shift handlers ── */
  const handleShiftSaved = (saved, isEdit) => {
    if (isEdit) setAllShifts(prev => prev.map(s => s.id === saved.id ? saved : s));
    else        setAllShifts(prev => [saved, ...prev]);
  };

  const handleShiftDelete = useCallback(async (id) => {
    await supabase.from('shifts').delete().eq('id', id);
    setAllShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  /* ── Exam handlers ── */
  const handleExamSaved = (saved, isEdit) => {
    if (isEdit) setAllExams(prev => prev.map(e => e.id === saved.id ? saved : e));
    else        setAllExams(prev => [...prev, saved].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)));
  };

  const handleExamDelete = useCallback(async (id) => {
    await supabase.from('exams').delete().eq('id', id);
    setAllExams(prev => prev.filter(e => e.id !== id));
  }, []);

  /* ── Open helpers ── */
  const openAddShift  = (dateStr) => { setEditingShift(null); setModalDate(dateStr); setShowShiftModal(true); };
  const openEditShift = (shift)   => { setEditingShift(shift); setModalDate('');  setShowShiftModal(true); };
  const openAddExam   = ()        => { setEditingExam(null); setShowExamModal(true); };
  const openEditExam  = (exam)    => { setEditingExam(exam); setShowExamModal(true); };

  const prevWeek = () => setCurrentWeek(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  const nextWeek = (cmd) => {
    if (cmd === 'today') { setCurrentWeek(new Date()); return; }
    setCurrentWeek(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  };

  return (
    <>
      <style>{`
        /* ── Page ── */
        .sp-page { width: 100%; }
        .sp-page-title {
          font-size: 2rem; font-weight: 700;
          color: #ff5d8f; margin-bottom: 20px;
        }

        /* ── Page tabs ── */
        .sp-page-tabs {
          display: flex; gap: 8px;
          margin-bottom: 24px; flex-wrap: wrap;
        }
        .sp-page-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 22px;
          border-radius: 999px;
          border: 1.5px solid #ffd6e1;
          background: rgba(255,255,255,0.8);
          color: #aaa; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
          position: relative;
        }
        .sp-page-tab:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .sp-page-tab.active {
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          border-color: transparent; color: white;
          box-shadow: 0 6px 18px rgba(255,111,145,0.3);
        }
        .sp-tab-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 20px; height: 20px;
          background: rgba(255,255,255,0.3);
          border-radius: 999px; font-size: 11px; font-weight: 700;
          padding: 0 5px;
        }
        .sp-page-tab:not(.active) .sp-tab-badge {
          background: #ffe0ea; color: #ff5d8f;
        }

        /* ── Grid ── */
        .sp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }

        /* ── Card ── */  
        .sp-card {
          background: rgba(255,255,255,0.84);
          border-radius: 28px; padding: 24px;
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 32px rgba(255,111,145,0.08);
          display: flex; flex-direction: column; gap: 16px;
        }
        .sp-calendar-card { grid-column: 1 / -1; }
        .sp-card-header { display: flex; align-items: center; gap: 14px; }
        .sp-card-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .sp-card-header p  { margin: 4px 0 0; color: #999; font-size: 13px; }
        .sp-icon-wrap {
          width: 46px; height: 46px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .pink  { background: linear-gradient(135deg,#ff8fb1,#ff6f91); }
        .blue  { background: linear-gradient(135deg,#7ab6ff,#5f8dff); }
        .green { background: linear-gradient(135deg,#6dd6b1,#4abf95); }

        /* ── Week nav ── */
        .sp-week-nav { display: flex; align-items: center; gap: 10px; }
        .sp-week-label { flex: 1; text-align: center; font-size: 14px; font-weight: 700; color: #555; }
        .sp-nav-btn {
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 12px; padding: 7px 10px; cursor: pointer;
          display: flex; align-items: center; color: #ff6f91; transition: 0.2s;
        }
        .sp-nav-btn:hover { background: #ffe4ec; }
        .sp-today-btn {
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 12px; padding: 7px 14px;
          font-size: 12px; font-weight: 600; cursor: pointer;
        }

        /* ── Stats bar ── */
        .sp-stats-bar {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
          padding: 12px 16px; background: #fff8fa;
          border-radius: 16px; border: 1px solid #ffe0ea;
        }
        .sp-stat { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666; }
        .sp-stat strong { color: #ff5d8f; }
        .sp-stat.warn { color: #e05555; }
        .sp-stat-divider { width: 1px; height: 16px; background: #ffd6e1; }
        .sp-type-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }

        /* ── Calendar grid ── */
        .sp-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; }
        .sp-cal-day {
          background: #fff8fa; border-radius: 18px;
          border: 1.5px solid #ffe0ea; padding: 10px 8px;
          cursor: pointer; transition: all 0.2s;
          min-height: 90px; display: flex; flex-direction: column; gap: 5px;
        }
        .sp-cal-day:hover { border-color: #ff8fb1; box-shadow: 0 4px 14px rgba(255,111,145,0.13); transform: translateY(-1px); }
        .sp-cal-day.today { border-color: #ff6f91; background: linear-gradient(135deg,#fff0f4,#fff8fa); box-shadow: 0 0 0 2px #ff6f91; }
        .sp-cal-day-header { display: flex; flex-direction: column; align-items: center; }
        .sp-day-name { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #bbb; }
        .sp-day-num { font-size: 16px; font-weight: 700; color: #444; line-height: 1.3; }
        .sp-day-num.today-num { color: #ff5d8f; }
        .sp-cal-day-shifts { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .sp-cal-empty-day { display: flex; align-items: center; justify-content: center; color: #e0c0cc; margin-top: auto; opacity: 0; transition: opacity 0.2s; }
        .sp-cal-day:hover .sp-cal-empty-day { opacity: 1; }
        .sp-shift-pill {
          display: flex; align-items: center; gap: 4px;
          border-radius: 8px; border: 1px solid;
          padding: 3px 6px; font-size: 9px; font-weight: 600;
          cursor: pointer; transition: filter 0.15s; position: relative;
        }
        .sp-shift-pill:hover { filter: brightness(0.95); }
        .sp-shift-pill span { flex: 1; }
        .sp-pill-delete {
          background: none; border: none; cursor: pointer; padding: 0;
          display: flex; align-items: center; opacity: 0.5; transition: opacity 0.15s; color: inherit;
        }
        .sp-pill-delete:hover { opacity: 1; }

        /* Exam marker in calendar */
        .sp-exam-marker {
          display: flex; align-items: center; gap: 3px;
          border-radius: 6px; border: 1px solid;
          padding: 2px 5px; font-size: 9px; font-weight: 700;
          cursor: default;
        }
        .sp-exam-marker span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ── Shift list ── */
        .sp-list-toolbar { display: flex; align-items: center; gap: 10px; position: relative; }
        .sp-filter-btn {
          display: flex; align-items: center; gap: 7px;
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 8px 14px;
          font-size: 12px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s;
        }
        .sp-filter-btn.active { border-color: #ff8fb1; color: #ff5d8f; }
        .sp-filter-btn:hover  { border-color: #ff8fb1; }
        .sp-filter-wrap { position: relative; }
        .sp-filter-dropdown {
          position: absolute; top: calc(100% + 8px); left: 0;
          background: white; border-radius: 18px; border: 1px solid #ffe0ea;
          box-shadow: 0 12px 32px rgba(255,111,145,0.16);
          overflow: hidden; z-index: 200; min-width: 140px;
        }
        .sp-filter-opt {
          display: block; width: 100%; text-align: left;
          border: none; background: transparent; padding: 11px 16px;
          font-size: 13px; color: #555; cursor: pointer; transition: 0.15s;
        }
        .sp-filter-opt:hover { background: #fff0f4; }
        .sp-filter-opt.active { font-weight: 700; background: #fff5f8; }
        .sp-clear-filter {
          background: none; border: none; color: #bbb; font-size: 12px; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
        }
        .sp-clear-filter:hover { color: #ff5d8f; }
        .sp-shift-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
        .sp-shift-list::-webkit-scrollbar { width: 4px; }
        .sp-shift-list::-webkit-scrollbar-track { background: transparent; }
        .sp-shift-list::-webkit-scrollbar-thumb { background: #ffd6e1; border-radius: 4px; }
        .sp-month-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
          color: #ccc; margin: 12px 0 6px; display: flex; justify-content: space-between; align-items: center;
        }
        .sp-month-label span { font-weight: 500; letter-spacing: 0; }
        .sp-shift-row {
          display: flex; align-items: flex-start; justify-content: space-between;
          background: #fff8fa; border: 1.5px solid #ffe0ea;
          border-radius: 16px; padding: 12px 14px; gap: 10px; transition: 0.2s;
        }
        .sp-shift-row:hover { border-color: #ffb8ce; }
        .sp-shift-row.today-row { border-color: #ff8fb1; background: linear-gradient(135deg,#fff0f4,#fff8fa); }
        .sp-shift-left { display: flex; align-items: flex-start; gap: 12px; flex: 1; }
        .sp-type-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sp-shift-main { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
        .sp-shift-main strong { font-size: 13px; color: #333; }
        .sp-today-badge { background: #ff6f91; color: white; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 2px 8px; }
        .sp-shift-sub { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sp-type-tag { border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 600; }
        .sp-time-range { font-size: 12px; color: #888; }
        .sp-dur-tag { display: flex; align-items: center; gap: 3px; font-size: 11px; color: #bbb; }
        .sp-shift-section { margin: 4px 0 0; font-size: 12px; color: #aaa; }
        .sp-shift-notes { margin: 4px 0 0; font-size: 12px; color: #888; font-style: italic; }
        .sp-shift-row-actions { display: flex; gap: 5px; flex-shrink: 0; }
        .sp-icon-btn {
          border: none; background: #f0f0f0; padding: 7px; border-radius: 10px;
          cursor: pointer; display: flex; align-items: center; color: #888; transition: 0.2s;
        }
        .sp-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .sp-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }

        /* ── Wellness ── */
        .sp-fatigue-bar { display: flex; align-items: flex-start; gap: 10px; border-radius: 16px; border: 1px solid; padding: 14px; }
        .sp-fatigue-label { margin: 0 0 3px; font-size: 13px; font-weight: 700; }
        .sp-fatigue-text  { margin: 0; font-size: 12px; color: #666; line-height: 1.5; }
        .sp-night-warning { display: flex; align-items: center; gap: 8px; background: #f3f0ff; color: #8b6fff; border-radius: 14px; padding: 10px 14px; font-size: 12px; font-weight: 600; border: 1px solid #d4cafe; }
        .sp-section-label { font-size: 12px; font-weight: 700; color: #aaa; text-transform: uppercase; letter-spacing: 0.06em; display: flex; align-items: center; gap: 5px; }
        .sp-hydration { display: flex; flex-direction: column; gap: 10px; }
        .sp-hydration-header { display: flex; justify-content: space-between; align-items: center; }
        .sp-hydration-count { font-size: 12px; font-weight: 600; color: #5f8dff; }
        .sp-hydration-cups { display: flex; gap: 6px; flex-wrap: wrap; }
        .sp-cup {
          width: 32px; height: 32px; border-radius: 10px; border: 1.5px solid #ddd;
          background: #f5f5f5; cursor: pointer; font-size: 14px;
          display: flex; align-items: center; justify-content: center;
          transition: 0.15s; filter: grayscale(1); opacity: 0.4;
        }
        .sp-cup.filled { filter: none; opacity: 1; border-color: #5f8dff; background: #eff4ff; }
        .sp-cup:hover { transform: scale(1.1); }
        .sp-hydration-done { font-size: 12px; font-weight: 600; color: #4abf95; margin: 0; }
        .sp-tip-card { display: flex; align-items: flex-start; gap: 12px; background: #fff8fa; border: 1px solid #ffe0ea; border-radius: 16px; padding: 14px; }
        .sp-tip-emoji { font-size: 22px; flex-shrink: 0; line-height: 1; }
        .sp-tip-label { margin: 0 0 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ccc; }
        .sp-tip-text  { margin: 0; font-size: 13px; color: #555; line-height: 1.55; }
        .sp-next-tip-btn { align-self: flex-start; background: none; border: none; color: #ff8fb1; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0; }
        .sp-next-tip-btn:hover { color: #ff5d8f; }
        .sp-empty { text-align: center; color: #bbb; padding: 24px 0; font-size: 14px; }

        /* ── Shift modal ── */
        .sp-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.22); backdrop-filter: blur(5px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .sp-modal {
          background: white; border-radius: 28px; padding: 28px; width: 100%; max-width: 500px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2); border: 1px solid #ffe0ea;
          max-height: 90vh; overflow-y: auto;
        }
        .sp-modal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .sp-modal-title-row { display: flex; align-items: center; gap: 10px; }
        .sp-modal-dot { width: 10px; height: 10px; border-radius: 50%; }
        .sp-modal-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .sp-modal-form { display: flex; flex-direction: column; gap: 16px; }
        .sp-field-label { display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin: 0; }
        .sp-input, .sp-select, .sp-textarea { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px; padding: 11px 14px; font-size: 16px; outline: none; transition: 0.2s; color: #444; font-family: inherit; width: 100%; }
        .sp-input:focus, .sp-select:focus, .sp-textarea:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .sp-textarea { resize: vertical; min-height: 70px; }
        .sp-time-row { display: flex; gap: 12px; }
        .sp-type-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .sp-type-pill { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 999px; border: 1.5px solid; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .sp-duration-preview { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 12px; border: 1px solid; font-size: 13px; color: #888; }
        .sp-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .sp-modal-actions { display: flex; gap: 10px; padding-top: 4px; }
        .sp-primary-btn {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 999px;
          padding: 11px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .sp-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .sp-primary-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .sp-secondary-btn { border: none; background: #f4f4f4; color: #666; border-radius: 999px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }

        /* ═══════════════════════════════════════
           EXAM PANEL STYLES
        ═══════════════════════════════════════ */

        .ex-panel { width: 100%; display: flex; flex-direction: column; gap: 18px; }

        /* Error */
        .ex-error-box {
          display: flex; align-items: center; gap: 10px;
          background: #fff0f0; color: #c0392b;
          border: 1px solid #ffd0d0; border-radius: 16px;
          padding: 14px 18px; font-size: 13px;
        }

        /* Stats row */
        .ex-stats-row {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
        }
        .ex-stat-card {
          background: rgba(255,255,255,0.88);
          border: 1.5px solid #ffe0ea;
          border-radius: 20px; padding: 16px 14px;
          display: flex; flex-direction: column; gap: 4px;
          text-align: center; transition: 0.2s;
        }
        .ex-stat-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.1); }
        .ex-stat-num { font-size: 24px; font-weight: 700; color: #ff5d8f; line-height: 1; }
        .ex-stat-label { font-size: 11px; font-weight: 600; color: #bbb; text-transform: uppercase; letter-spacing: 0.06em; }
        .ex-stat-card.upcoming .ex-stat-num { color: #5f8dff; }
        .ex-stat-card.thisweek.has-items .ex-stat-num { color: #ff8c5a; }
        .ex-stat-card.past .ex-stat-num { color: #4abf95; }

        /* Urgent banner */
        .ex-urgent-banner {
          display: flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #fff0f0, #fff5ee);
          border: 1.5px solid #ffb8b8; border-radius: 18px;
          padding: 14px 18px; font-size: 13px; color: #e05555;
          font-weight: 500;
        }
        .ex-urgent-banner strong { font-weight: 700; }

        /* Toolbar */
        .ex-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ex-search-wrap { flex: 1; min-width: 180px; position: relative; display: flex; align-items: center; }
        .ex-search-icon { position: absolute; left: 13px; color: #ccc; pointer-events: none; }
        .ex-search {
          width: 100%; border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 36px 10px 34px;
          font-size: 16px; outline: none; transition: 0.2s; color: #444;
        }
        .ex-search:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .ex-search-clear { position: absolute; right: 12px; background: none; border: none; color: #bbb; cursor: pointer; display: flex; padding: 0; }
        .ex-sort-wrap { position: relative; }
        .ex-sort-btn {
          display: flex; align-items: center; gap: 7px;
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 16px;
          font-size: 13px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s;
          white-space: nowrap;
        }
        .ex-sort-btn:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .ex-sort-label { max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ex-sort-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0;
          background: white; border-radius: 18px; border: 1px solid #ffe0ea;
          box-shadow: 0 12px 32px rgba(255,111,145,0.16); overflow: hidden; z-index: 200; min-width: 150px;
        }
        .ex-sort-opt { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 12px 16px; font-size: 13px; color: #555; cursor: pointer; transition: 0.15s; }
        .ex-sort-opt:hover { background: #fff0f4; color: #ff5d8f; }
        .ex-sort-opt.active { color: #ff5d8f; font-weight: 700; background: #fff5f8; }
        .ex-add-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 10px 20px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .ex-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }

        /* Tab filter */
        .ex-tab-row { display: flex; gap: 6px; flex-wrap: wrap; }
        .ex-tab {
          padding: 8px 16px; border-radius: 999px;
          border: 1.5px solid #ffe0ea; background: rgba(255,255,255,0.8);
          font-size: 12px; font-weight: 600; color: #aaa; cursor: pointer; transition: 0.2s;
          white-space: nowrap;
        }
        .ex-tab:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .ex-tab.active {
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          border-color: transparent; color: white;
          box-shadow: 0 4px 12px rgba(255,111,145,0.25);
        }

        /* Section filter */
        .ex-section-filter { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .ex-filter-label { font-size: 11px; font-weight: 700; color: #ccc; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
        .ex-sec-pill {
          padding: 5px 12px; border-radius: 999px; border: 1.5px solid;
          background: transparent; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: 0.15s; white-space: nowrap;
        }
        .ex-sec-pill.all-pill { border-color: #ffd6e1; color: #ff5d8f; }
        .ex-sec-pill.all-pill.active { background: #ff5d8f; color: white; border-color: #ff5d8f; }

        /* Results count */
        .ex-results-count { font-size: 12px; color: #bbb; margin: 0; padding-left: 2px; }

        /* Cards grid */
        .ex-cards-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }

        /* Exam card */
        .ex-card {
          background: rgba(255,255,255,0.9);
          border-radius: 22px;
          border: 1.5px solid #ffe0ea;
          border-left: 4px solid;
          padding: 18px;
          display: flex; flex-direction: column; gap: 10px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .ex-card:hover { box-shadow: 0 8px 24px rgba(255,111,145,0.1); transform: translateY(-1px); }
        .ex-card.ex-card-past { opacity: 0.7; }
        .ex-card.today { animation: ex-pulse-border 2s ease-in-out infinite; }

        @keyframes ex-pulse-border {
          0%, 100% { box-shadow: 0 0 0 0 rgba(224,85,85,0); }
          50%       { box-shadow: 0 0 0 4px rgba(224,85,85,0.2); }
        }

        .ex-card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
        .ex-card-badges { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex: 1; }
        .ex-section-badge { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .ex-countdown-badge {
          display: inline-flex; align-items: center; gap: 4px;
          border-radius: 999px; padding: 4px 10px;
          font-size: 11px; font-weight: 700; white-space: nowrap;
        }
        .ex-card-actions { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
        .ex-icon-btn {
          border: none; background: #f0f0f0; padding: 7px; border-radius: 10px;
          cursor: pointer; display: flex; align-items: center;
          color: #888; transition: 0.2s;
        }
        .ex-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; transform: scale(1.05); }
        .ex-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .ex-card-name {
          margin: 0; font-size: 15px; font-weight: 700; color: #333; line-height: 1.4;
        }
        .ex-card-name.past { color: #aaa; text-decoration: line-through; }
        .ex-card-date { margin: 0; font-size: 12px; color: #999; line-height: 1.5; }
        .ex-card-notes-wrap { display: flex; flex-direction: column; gap: 4px; }
        .ex-card-notes {
          margin: 0; font-size: 13px; color: #666; line-height: 1.6;
          white-space: pre-wrap; word-break: break-word;
          background: #fff8fa; border-radius: 12px; padding: 10px 12px;
          border: 1px solid #ffe0ea;
        }
        .ex-expand-btn {
          background: none; border: none; color: #ff8fb1;
          font-size: 11px; font-weight: 600; cursor: pointer; padding: 0;
          display: inline-flex; align-items: center; gap: 3px;
          align-self: flex-start;
        }
        .ex-expand-btn:hover { color: #ff5d8f; }
        .ex-today-banner {
          background: linear-gradient(135deg,#fff0f0,#fff5ee);
          border: 1px solid #ffb8b8; border-radius: 12px;
          padding: 10px 14px; font-size: 12px;
          font-weight: 600; color: #e05555; text-align: center;
        }

        /* Empty state */
        .ex-empty { text-align: center; padding: 48px 24px; color: #bbb; }
        .ex-empty-icon { font-size: 40px; margin-bottom: 12px; }
        .ex-empty p { margin: 0 0 16px; font-size: 14px; }
        .ex-add-btn-empty {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 10px 20px;
          font-size: 13px; font-weight: 600; cursor: pointer; margin: 0 auto;
        }

        /* ── Exam Modal ── */
        .em-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.22);
          backdrop-filter: blur(5px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .em-modal {
          background: white; border-radius: 28px; padding: 28px;
          width: 100%; max-width: 520px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2);
          border: 1px solid #ffe0ea; max-height: 92vh; overflow-y: auto;
        }
        .em-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; }
        .em-header-left { display: flex; align-items: center; gap: 12px; }
        .em-header-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .em-header-title { margin: 0; font-size: 1.1rem; color: #333; font-weight: 700; }
        .em-header-sub { margin: 3px 0 0; font-size: 12px; color: #bbb; }
        .em-close-btn { border: none; background: #f4f4f4; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; }
        .em-close-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .em-countdown-preview {
          display: flex; align-items: center; gap: 10px;
          border-radius: 16px; border: 1px solid; padding: 12px 16px;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .em-countdown-icon { font-size: 18px; line-height: 1; }
        .em-form { display: flex; flex-direction: column; gap: 16px; }
        .em-label { display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin: 0; }
        .em-input {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 12px 14px; font-size: 16px; outline: none; transition: 0.2s;
          color: #444; font-family: inherit; width: 100%;
        }
        .em-input:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .em-textarea {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 12px 14px; font-size: 16px; outline: none; transition: 0.2s;
          color: #444; resize: vertical; min-height: 100px; font-family: inherit;
          line-height: 1.6; width: 100%;
        }
        .em-textarea:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .em-section-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .em-section-pill { padding: 6px 12px; border-radius: 999px; border: 1.5px solid; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .em-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .em-actions { display: flex; gap: 10px; padding-top: 4px; }
        .em-primary-btn {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white;
          border-radius: 999px; padding: 11px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
        }
        .em-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .em-primary-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .em-secondary-btn { border: none; background: #f4f4f4; color: #666; border-radius: 999px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }

        /* ═══════════════════════════════════════
           RESPONSIVE — iPhone (< 768px)
        ═══════════════════════════════════════ */
        @media (max-width: 767px) {
          .sp-page-title     { font-size: 1.7rem; margin-bottom: 16px; }
          .sp-page-tabs      { gap: 6px; }
          .sp-page-tab       { padding: 10px 16px; font-size: 13px; }
          .sp-grid           { grid-template-columns: 1fr; }
          .sp-cal-grid       { grid-template-columns: repeat(3,1fr); gap: 6px; }
          .sp-cal-day        { min-height: 70px; padding: 8px 6px; }
          .sp-day-num        { font-size: 14px; }
          .sp-shift-pill     { font-size: 8px; padding: 2px 4px; }
          .sp-exam-marker    { font-size: 8px; padding: 2px 4px; }
          .sp-modal          { padding: 20px; border-radius: 24px; }
          .sp-time-row       { flex-direction: column; }
          .sp-shift-list     { max-height: 280px; }
          .sp-card           { padding: 18px; }
          .ex-stats-row      { grid-template-columns: repeat(2,1fr); gap: 10px; }
          .ex-stat-card      { padding: 14px 12px; }
          .ex-stat-num       { font-size: 20px; }
          .ex-cards-grid     { grid-template-columns: 1fr; }
          .ex-toolbar        { gap: 8px; }
          .ex-add-btn span   { display: none; }
          .ex-add-btn        { padding: 10px 14px; }
          .em-modal          { padding: 20px; border-radius: 24px; }
          .em-section-pills  { gap: 5px; }
          .em-section-pill   { font-size: 11px; padding: 5px 10px; }
          .ex-tab            { padding: 7px 12px; font-size: 11px; }
        }

        /* ═══════════════════════════════════════
           RESPONSIVE — iPad portrait (768–1023px)
        ═══════════════════════════════════════ */
        @media (min-width: 768px) and (max-width: 1023px) {
          .sp-page-title     { font-size: 1.8rem; }
          .sp-grid           { grid-template-columns: 1fr; }
          .sp-cal-grid       { grid-template-columns: repeat(7,1fr); gap: 6px; }
          .sp-cal-day        { min-height: 80px; }
          .sp-modal          { max-width: 480px; }
          .ex-stats-row      { grid-template-columns: repeat(4,1fr); }
          .ex-cards-grid     { grid-template-columns: repeat(2,1fr); }
          .em-modal          { max-width: 480px; }
        }

        /* ═══════════════════════════════════════
           RESPONSIVE — iPad landscape (1024px+)
        ═══════════════════════════════════════ */
        @media (min-width: 1024px) {
          .sp-grid           { grid-template-columns: 1fr 1fr; }
          .ex-cards-grid     { grid-template-columns: repeat(2,1fr); }
        }
      `}</style>

      <div className="sp-page">
        <h2 className="sp-page-title">Shift Planner ✨</h2>

        {/* Page-level tabs */}
        <div className="sp-page-tabs">
          <button
            className={`sp-page-tab ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shifts')}
          >
            <CalendarDays size={16} />
            Shifts
          </button>
          <button
            className={`sp-page-tab ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
          >
            <GraduationCap size={16} />
            Exam Dates
            {upcomingExamCount > 0 && (
              <span className="sp-tab-badge">{upcomingExamCount}</span>
            )}
          </button>
        </div>

        {/* ── SHIFTS TAB ── */}
        {activeTab === 'shifts' && (
          <>
            {!loadingShifts && (
              <ShiftCalendar
                shifts={weekShifts}
                exams={allExams}
                onAdd={openAddShift}
                onEdit={openEditShift}
                onDelete={handleShiftDelete}
                currentWeek={currentWeek}
                onPrevWeek={prevWeek}
                onNextWeek={nextWeek}
              />
            )}

            <div className="sp-grid">
              <AllShiftsList
                allShifts={allShifts}
                onEdit={openEditShift}
                onDelete={handleShiftDelete}
              />
              <WellnessPanel weekShifts={weekShifts} />
            </div>
          </>
        )}

        {/* ── EXAMS TAB ── */}
        {activeTab === 'exams' && (
          <ExamsPanel
            exams={allExams}
            loading={loadingExams}
            error={examError}
            onAdd={openAddExam}
            onEdit={openEditExam}
            onDelete={handleExamDelete}
          />
        )}
      </div>

      {/* Shift modal */}
      {showShiftModal && (
        <ShiftModal
          editing={editingShift}
          defaultDate={modalDate}
          onClose={() => { setShowShiftModal(false); setEditingShift(null); setModalDate(''); }}
          onSaved={handleShiftSaved}
        />
      )}

      {/* Exam modal */}
      {showExamModal && (
        <ExamModal
          editing={editingExam}
          onClose={() => { setShowExamModal(false); setEditingExam(null); }}
          onSaved={handleExamSaved}
        />
      )}
    </>
  );
}