import ThemedIcon from './ui/ThemedIcon';
import ScheduleCalendar from './schedule/ScheduleCalendar';
import BatchDates from './schedule/BatchDates';
import { uniqueDates } from '../lib/calendar';
import useQuickCreate from '../hooks/useQuickCreate';
import Dialog from './ui/Dialog';
import '../styles/features/ShiftPlanner.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import { useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Plus,
  Heart,
  Clock,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Trash2,
  X,
  Check,
  Sunrise,
  Sun,
  Moon,
  Coffee,
  BookOpen,
  HelpCircle,
  BarChart2,
  Droplets,
  Timer,
  Filter,
  AlertCircle,
  GraduationCap,
  Search,
  ArrowUpDown,
  Copy,
  CheckCircle2,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
  Calendar,
  Brain,
  Target,
  Flame,
  Settings2,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SHIFT_TYPES = {
  morning: { label: 'Morning', color: '#ff8c5a', bg: 'var(--peach-soft)', icon: Sunrise },
  afternoon: { label: 'Afternoon', color: '#5f8dff', bg: 'var(--lavender-soft)', icon: Sun },
  night: { label: 'Night', color: '#8b6fff', bg: 'var(--lavender-soft)', icon: Moon },
  rest: { label: 'Rest', color: '#4abf95', bg: 'var(--sage-soft)', icon: Coffee },
  exam: { label: 'Exam', color: '#e05555', bg: 'var(--rose-soft)', icon: BookOpen },
  other: { label: 'Other', color: 'var(--muted)', bg: 'var(--surface-subtle)', icon: HelpCircle },
};

const SECTIONS = [
  'Hematology',
  'Clinical Chemistry',
  'Microbiology',
  'Blood Bank',
  'Histopathology/Cytology',
];

const SECTION_META = {
  Hematology: { color: '#ff6f91', bg: 'var(--rose-soft)' },
  'Clinical Chemistry': { color: '#ff8c5a', bg: 'var(--peach-soft)' },
  Microbiology: { color: '#5f8dff', bg: 'var(--lavender-soft)' },
  'Blood Bank': { color: '#e05555', bg: 'var(--rose-soft)' },
  'Histopathology/Cytology': { color: '#4abf95', bg: 'var(--sage-soft)' },
};

const SECTION_STORAGE_KEY = 'rotation_guide.sections';
const DEFAULT_SECTION_LIST = SECTIONS.map((id) => ({ id, ...SECTION_META[id] }));
const SECTION_COLOR_PRESETS = [
  '#ff6f91',
  '#ff8c5a',
  '#5f8dff',
  '#e05555',
  '#4abf95',
  '#8b6fff',
  '#26c6da',
  '#f6b45f',
  '#b071ec',
  '#54c58e',
];

const STUDY_GOAL_STORAGE_KEY = 'shift_planner.study_goal_mins';
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GOAL_PRESETS = [30, 60, 90, 120, 180, 240];

const WELLNESS_TIPS = [
  { icon: 'Droplets', tip: 'Drink a glass of water every 2 hours — dehydration kills focus.' },
  { icon: 'Brain', tip: 'Take a 5-minute walk between procedures to reset your mind.' },
  { icon: 'Moon', tip: 'Aim for 7–8 hours of sleep; memory consolidation happens at night.' },
  {
    icon: 'Apple',
    tip: 'Eat a balanced meal before your shift — avoid heavy carbs before night duty.',
  },
  { icon: 'Eye', tip: 'Follow the 20-20-20 rule: every 20 min, look 20 ft away for 20 sec.' },
  {
    icon: 'HeartPulse',
    tip: 'Three deep breaths before a stressful procedure can lower your heart rate.',
  },
  {
    icon: 'Handshake',
    tip: 'Ask your senior for feedback after every major procedure — it compounds fast.',
  },
  {
    icon: 'PhoneOff',
    tip: 'Avoid phone use 30 min before sleep; blue light disrupts melatonin.',
  },
  { icon: 'Coffee', tip: 'Limit caffeine after 2 PM to protect your sleep quality.' },
  {
    icon: 'PenLine',
    tip: 'Write one thing you learned each shift — tiny logs become big knowledge.',
  },
];

const STUDY_TIPS = [
  {
    icon: 'BookOpen',
    tip: 'Start reviewing 3–5 days before the exam. Cramming the night before rarely sticks.',
  },
  {
    icon: 'Brain',
    tip: 'Use active recall: close your notes and retrieve key concepts from memory.',
  },
  {
    icon: 'Moon',
    tip: 'Get 8 hours of sleep the night before — memory consolidation happens while you sleep.',
  },
  {
    icon: 'PenLine',
    tip: 'Write practice questions for yourself. If you can teach it, you truly know it.',
  },
  {
    icon: 'Utensils',
    tip: 'Eat a protein-rich meal before your exam. Avoid heavy carbs that cause energy crashes.',
  },
  {
    icon: 'AlarmClock',
    tip: 'Arrive 15 minutes early to settle nerves and do a final calm review.',
  },
  {
    icon: 'Target',
    tip: 'Focus on understanding concepts, not memorizing. Lab values will follow naturally.',
  },
  {
    icon: 'Droplets',
    tip: 'Stay hydrated during study sessions — even mild dehydration cuts focus by 20%.',
  },
  {
    icon: 'RefreshCw',
    tip: 'Space your review: 1 day, 3 days, and 7 days before the exam for best retention.',
  },
  {
    icon: 'HeartPulse',
    tip: 'Take 5-minute breaks every 25 minutes (Pomodoro) to maintain peak concentration.',
  },
  {
    icon: 'PenLine',
    tip: 'Rewrite your notes by hand — motor memory reinforces what your eyes read.',
  },
  {
    icon: 'UsersRound',
    tip: 'Teach a concept to a classmate. The act of explaining reveals gaps in your knowledge.',
  },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function toDateStr(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const color = SECTION_COLOR_PRESETS[Math.abs(hash) % SECTION_COLOR_PRESETS.length];
  return { color, bg: colorToSoftBg(color) };
}

function normalizeSections(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_SECTION_LIST;
  const seen = new Set();
  return saved.reduce((list, section) => {
    const id = typeof section?.id === 'string' ? section.id.trim() : '';
    if (!id || seen.has(id.toLowerCase())) return list;
    const meta = SECTION_META[id] ?? generateSectionMeta(id);
    const color = section.color || meta.color;
    seen.add(id.toLowerCase());
    list.push({ id, color, bg: section.bg || colorToSoftBg(color) });
    return list;
  }, []);
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
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDateFull(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function getUrgency(days) {
  if (days < 0)
    return {
      level: 'past',
      borderColor: '#e0e0e0',
      badgeBg: 'var(--surface-subtle)',
      badgeColor: '#bbb',
      icon: 'CircleCheck',
      label: `${Math.abs(days)}d ago`,
    };
  if (days === 0)
    return {
      level: 'today',
      borderColor: '#e05555',
      badgeBg: 'var(--rose-soft)',
      badgeColor: '#e05555',
      icon: 'Flame',
      label: 'Today!',
    };
  if (days === 1)
    return {
      level: 'urgent',
      borderColor: '#ff6f91',
      badgeBg: 'var(--rose-soft)',
      badgeColor: '#ff5d8f',
      icon: 'Zap',
      label: 'Tomorrow',
    };
  if (days <= 3)
    return {
      level: 'urgent',
      borderColor: '#ff8c5a',
      badgeBg: 'var(--peach-soft)',
      badgeColor: '#ff8c5a',
      icon: 'TriangleAlert',
      label: `In ${days} days`,
    };
  if (days <= 7)
    return {
      level: 'soon',
      borderColor: '#5f8dff',
      badgeBg: 'var(--lavender-soft)',
      badgeColor: '#5f8dff',
      icon: 'CalendarDays',
      label: `In ${days} days`,
    };
  return {
    level: 'normal',
    borderColor: '#ffe0ea',
    badgeBg: 'var(--rose-soft)',
    badgeColor: '#ff8fb1',
    icon: 'BookOpen',
    label: `In ${days} days`,
  };
}

function getWeekStart(d) {
  const s = new Date(d);
  s.setDate(d.getDate() - d.getDay());
  s.setHours(0, 0, 0, 0);
  return s;
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
   SHARED MODAL STYLES (injected once)
───────────────────────────────────────────── */
import '../styles/features/ShiftModals.css';

/* ─────────────────────────────────────────────
   SHIFT MODAL
───────────────────────────────────────────── */
function ShiftModal({ editing, defaultDate, onClose, onSaved, sections }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name: editing?.section_name ?? sections[0]?.id ?? '',
    shift_date:
      editing?.shift_date ??
      ((Array.isArray(defaultDate) ? defaultDate[0] : defaultDate) || toDateStr(new Date())),
    start_time: editing?.start_time ?? '07:00',
    end_time: editing?.end_time ?? '15:00',
    shift_type: editing?.shift_type ?? 'morning',
    notes: editing?.notes ?? '',
  });
  const [extraDates, setExtraDates] = useState(() =>
    Array.isArray(defaultDate) ? uniqueDates(defaultDate).slice(1) : [],
  );
  const dates = uniqueDates([form.shift_date, ...extraDates]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const meta = SHIFT_TYPES[form.shift_type] ?? SHIFT_TYPES.other;
  const ShiftIcon = meta.icon;
  const accentColor = meta.color;
  const accentBg = meta.bg;
  const duration = calcDuration(form.start_time, form.end_time);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!dates.length || dates.length > 31) {
      setError('Choose between 1 and 31 valid dates.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = editing
        ? await supabase
            .from('shifts')
            .update({ ...form, updated_at: new Date().toISOString() })
            .eq('id', editing.id)
            .eq('user_id', user.id)
            .select()
            .single()
        : await supabase
            .from('shifts')
            .insert(dates.map((date) => ({ ...form, shift_date: date, user_id: user.id })))
            .select();
      if (result.error) throw result.error;
      onSaved(result.data, Boolean(editing));
      onClose();
    } catch (err) {
      setError(err.message || 'Couldn’t save your plans. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog className="m-overlay" onClose={onClose}>
      <div
        className="m-sheet"
        style={{ '--m-accent': accentColor, '--m-bg': accentBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="m-drag-pill" />

        <div className="m-header">
          <div className="m-header-left">
            <div className="m-header-icon">
              <ShiftIcon size={17} color="currentColor" />
            </div>
            <div>
              <p className="m-header-title">{editing ? 'Edit Shift' : 'New Shift'}</p>
              <p className="m-header-sub">
                {meta.label} · {form.shift_date ? formatDateFull(form.shift_date) : 'Pick a date'}
              </p>
            </div>
          </div>
          <button aria-label="Close" className="m-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="m-body">
          <div>
            <p className="m-label" style={{ marginBottom: 10 }}>
              Shift Type
            </p>
            <div className="m-pills">
              {Object.entries(SHIFT_TYPES).map(([key, val]) => {
                const TIcon = val.icon;
                const on = form.shift_type === key;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`m-pill ${on ? 'active' : ''}`}
                    aria-pressed={on}

                    onClick={() => setForm({ ...form, shift_type: key })}
                  >
                    <TIcon size={13} />
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="m-divider" />

          <label htmlFor="field-shiftplanner-1" className="m-label">
            Section
            <select
              id="field-shiftplanner-1"
              className="m-select"
              value={form.section_name}
              onChange={(e) => setForm({ ...form, section_name: e.target.value })}
            >
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </label>

          <BatchDates
            date={form.shift_date}
            onChange={(date) => setForm({ ...form, shift_date: date })}
            extras={extraDates}
            onExtrasChange={setExtraDates}
            editing={Boolean(editing)}
          />

          <div className="m-time-row">
            <label htmlFor="field-shiftplanner-4" className="m-label">
              Start Time *
              <input
                id="field-shiftplanner-4"
                type="time"
                className="m-input"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </label>
            <label htmlFor="field-shiftplanner-5" className="m-label">
              End Time *
              <input
                id="field-shiftplanner-5"
                type="time"
                className="m-input"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </label>
          </div>

          {duration && (
            <div className="m-duration-chip">
              <Timer size={14} />
              <span>
                Duration: <strong>{duration}</strong>
              </span>
            </div>
          )}

          <label htmlFor="field-shiftplanner-3" className="m-label">
            Notes
            <textarea
              id="field-shiftplanner-3"
              className="m-textarea"
              rows={3}
              placeholder="Any reminders, preparations, or notes…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {error && <p className="m-err">{error}</p>}

          <div className="m-actions">
            <button
              type="submit"
              className="m-submit"

              disabled={saving}
            >
              <Check size={15} />
              {saving
                ? 'Saving…'
                : editing
                  ? 'Update Shift'
                  : dates.length > 1
                    ? 'Add ' + dates.length + ' shifts'
                    : 'Add Shift'}
            </button>
            <button type="button" className="m-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   EXAM MODAL
───────────────────────────────────────────── */
function ExamModal({ editing, defaultDate, onClose, onSaved, sections, sectionMap }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    exam_name: editing?.exam_name ?? '',
    exam_date:
      editing?.exam_date ??
      ((Array.isArray(defaultDate) ? defaultDate[0] : defaultDate) || toDateStr(new Date())),
    section_name: editing?.section_name ?? sections[0]?.id ?? '',
    notes: editing?.notes ?? '',
  });
  const [extraDates, setExtraDates] = useState(() =>
    Array.isArray(defaultDate) ? uniqueDates(defaultDate).slice(1) : [],
  );
  const dates = uniqueDates([form.exam_date, ...extraDates]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const days = form.exam_date ? daysUntil(form.exam_date) : null;
  const urgency = days !== null ? getUrgency(days) : null;
  const sectionMeta = sectionMap[form.section_name] ?? {
    color: '#5f8dff',
    bg: 'var(--lavender-soft)',
  };
  const accentColor = sectionMeta.color;
  const accentBg = sectionMeta.bg;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!dates.length || dates.length > 31) {
      setError('Choose between 1 and 31 valid dates.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = editing
        ? await supabase
            .from('exams')
            .update({ ...form, updated_at: new Date().toISOString() })
            .eq('id', editing.id)
            .eq('user_id', user.id)
            .select()
            .single()
        : await supabase
            .from('exams')
            .insert(dates.map((date) => ({ ...form, exam_date: date, user_id: user.id })))
            .select();
      if (result.error) throw result.error;
      onSaved(result.data, Boolean(editing));
      onClose();
    } catch (err) {
      setError(err.message || 'Couldn’t save your plans. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog className="m-overlay" onClose={onClose}>
      <div
        className="m-sheet"
        style={{ '--m-accent': accentColor, '--m-bg': accentBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="m-drag-pill" />

        <div className="m-header">
          <div className="m-header-left">
            <div className="m-header-icon">
              <GraduationCap size={17} color="currentColor" />
            </div>
            <div>
              <p className="m-header-title">{editing ? 'Edit Exam' : 'Add Exam Date'}</p>
              <p className="m-header-sub">
                {form.exam_date ? (
                  urgency ? (
                    <>
                      <ThemedIcon name={urgency.icon} size={14} /> {urgency.label}
                    </>
                  ) : (
                    'Pick a date'
                  )
                ) : (
                  'Track your upcoming assessment'
                )}
              </p>
            </div>
          </div>
          <button aria-label="Close" className="m-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="m-body">
          {form.exam_date && urgency && (
            <div
              className="m-countdown"
              style={{ background: urgency.badgeBg, borderColor: urgency.borderColor + '55' }}
            >
              <span className="m-countdown-icon">
                <ThemedIcon name={urgency.icon} size={16} />
              </span>
              <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 13 }}>
                {urgency.label}
              </span>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                — {formatDateLong(form.exam_date)}
              </span>
            </div>
          )}

          <label htmlFor="field-shiftplanner-6" className="m-label">
            Exam Name *
            <input
              id="field-shiftplanner-6"
              type="text"
              className="m-input"
              required
              maxLength={120}
              placeholder="e.g. Hematology Midterm Exam"
              value={form.exam_name}
              onChange={(e) => setForm({ ...form, exam_name: e.target.value })}
            />
          </label>

          <BatchDates
            date={form.exam_date}
            onChange={(date) => setForm({ ...form, exam_date: date })}
            extras={extraDates}
            onExtrasChange={setExtraDates}
            editing={Boolean(editing)}
          />

          <div className="m-divider" />

          <div>
            <p className="m-label" style={{ marginBottom: 10 }}>
              Section
            </p>
            <div className="m-pills">
              {sections.map((s) => {
                const on = form.section_name === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`m-pill ${on ? 'active' : ''}`}

                    onClick={() => setForm({ ...form, section_name: s.id })}
                  >
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          <label htmlFor="field-shiftplanner-8" className="m-label">
            Description & Study Notes
            <textarea
              id="field-shiftplanner-8"
              className="m-textarea"
              rows={4}
              placeholder="Topics covered, what to review, key concepts, study tips…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {error && <p className="m-err">{error}</p>}

          <div className="m-actions">
            <button
              type="submit"
              className="m-submit"

              disabled={saving}
            >
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Exam' : 'Save Exam'}
            </button>
            <button type="button" className="m-cancel" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   MANAGE SECTIONS MODAL
───────────────────────────────────────────── */
function ManageSectionsModal({ sections, onAdd, onRemove, onColorChange, onClose }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [removing, setRemoving] = useState(null);

  const handleAdd = () => {
    const label = name.trim();
    if (!label) {
      setError('Please enter a section name.');
      return;
    }
    if (sections.some((s) => s.id.toLowerCase() === label.toLowerCase())) {
      setError('That section already exists.');
      return;
    }
    onAdd(label);
    setName('');
    setError('');
  };

  return (
    <Dialog className="msm-overlay" onClose={onClose}>
      <div className="msm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="msm-head">
          <div className="msm-head-left">
            <div className="msm-head-icon">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="msm-title">Manage Sections</h3>
              <p className="msm-sub">Add, remove, and color sections for shifts and exams</p>
            </div>
          </div>
          <button aria-label="Close" className="msm-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="msm-add-box">
          <p className="msm-box-label">New Section</p>
          <div className="msm-add-row">
            <input
              className="msm-input"
              placeholder="e.g. Immunology, Parasitology…"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              maxLength={40}
              autoFocus
            />
            <button className="msm-add-btn" onClick={handleAdd}>
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p className="msm-error">{error}</p>}
        </div>

        <div>
          <p className="msm-box-label">
            Sections
            {sections.length > 0 && <span className="msm-count">{sections.length}</span>}
          </p>
          {sections.length === 0 ? (
            <div className="msm-empty">
              <span style={{ fontSize: 28 }}>
                <ThemedIcon name="Layers" />
              </span>
              <p>No sections yet.</p>
            </div>
          ) : (
            <div className="msm-list">
              {sections.map((sec) => {
                const isRem = removing === sec.id;
                return (
                  <div key={sec.id} className={`msm-row ${isRem ? 'msm-row-rem' : ''}`}>
                    <div className="msm-row-main">
                      <div className="msm-sec-pill">
                        <span className="msm-dot" style={{ background: sec.color }} />
                        {sec.id}
                      </div>
                      <label
                        htmlFor="field-shiftplanner-9"
                        className="msm-color-ctrl"
                        title={`Change ${sec.id} color`}
                      >
                        <span className="msm-color-swatch" style={{ background: sec.color }} />
                        <input
                          id="field-shiftplanner-9"
                          type="color"
                          value={sec.color}
                          onChange={(e) => onColorChange(sec.id, e.target.value)}
                        />
                      </label>
                    </div>
                    {isRem ? (
                      <div className="msm-confirm">
                        <span>Remove?</span>
                        <button
                          className="msm-yes"
                          onClick={() => {
                            onRemove(sec.id);
                            setRemoving(null);
                          }}
                        >
                          Yes
                        </button>
                        <button className="msm-no" onClick={() => setRemoving(null)}>
                          No
                        </button>
                      </div>
                    ) : (
                      <button className="msm-rm-btn" onClick={() => setRemoving(sec.id)}>
                        <Trash2 size={12} /> Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="msm-note">
          <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Removing a section hides it from new shifts, exams, and filters. Existing records keep
          their saved label.
        </div>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   EXAM CALENDAR
───────────────────────────────────────────── */
function ExamHistoryList({ allExams, onEdit, onDelete }) {
  const [filterTab, setFilterTab] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    let list = [...allExams];
    if (filterTab === 'upcoming') list = list.filter((e) => daysUntil(e.exam_date) >= 0);
    if (filterTab === 'past') list = list.filter((e) => daysUntil(e.exam_date) < 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) => e.exam_name.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q),
      );
    }
    list.sort((a, b) =>
      filterTab === 'past'
        ? new Date(b.exam_date) - new Date(a.exam_date)
        : new Date(a.exam_date) - new Date(b.exam_date),
    );
    return list;
  }, [allExams, filterTab, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      const key = e.exam_date.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort((a, b) =>
      filterTab === 'past' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0]),
    );
  }, [filtered, filterTab]);

  const upcomingCount = useMemo(
    () => allExams.filter((e) => daysUntil(e.exam_date) >= 0).length,
    [allExams],
  );
  const pastCount = useMemo(
    () => allExams.filter((e) => daysUntil(e.exam_date) < 0).length,
    [allExams],
  );

  return (
    <div className="sp-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap blue">
          <BookOpen size={20} />
        </div>
        <div>
          <h3>Exam Schedule</h3>
          <p>
            {allExams.length} exam{allExams.length !== 1 ? 's' : ''} total
          </p>
        </div>
      </div>
      <div className="ehl-tabs">
        {[
          { id: 'all', label: 'All', count: allExams.length },
          { id: 'upcoming', label: 'Upcoming', count: upcomingCount },
          { id: 'past', label: 'Past', count: pastCount },
        ].map((t) => (
          <button
            key={t.id}
            className={`ehl-tab ${filterTab === t.id ? 'active' : ''}`}
            onClick={() => setFilterTab(t.id)}
          >
            {t.label}
            <span className="ehl-tab-count">{t.count}</span>
          </button>
        ))}
      </div>
      <div className="ehl-search-wrap">
        <Search size={12} className="ehl-search-icon" />
        <input
          className="ehl-search"
          placeholder="Search exams…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button aria-label="Close" className="ehl-search-clear" onClick={() => setSearch('')}>
            <X size={11} />
          </button>
        )}
      </div>
      {grouped.length === 0 ? (
        <div className="sp-empty">
          <p>
            {search
              ? `No exams match "${search}"`
              : filterTab === 'past'
                ? 'No past exams yet.'
                : "No upcoming exams — you're clear!"}
          </p>
        </div>
      ) : (
        <div className="ehl-list">
          {grouped.map(([monthKey, monthExams]) => (
            <div key={monthKey}>
              <p className="sp-month-label">
                {new Date(monthKey + '-15').toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
                <span>
                  {monthExams.length} exam{monthExams.length !== 1 ? 's' : ''}
                </span>
              </p>
              {monthExams.map((exam) => {
                const days = daysUntil(exam.exam_date);
                const urgency = getUrgency(days);
                const isPast = days < 0;
                const isConf = confirmDel === exam.id;
                return (
                  <div
                    key={exam.id}
                    className={`ehl-row ${isToday(exam.exam_date) ? 'ehl-row-today' : ''} ${isPast ? 'ehl-row-past' : ''}`}
                    style={{ borderLeftColor: urgency.borderColor }}
                  >
                    <div className="ehl-row-left">
                      <div
                        className="ehl-row-icon"
                        style={{ background: urgency.badgeBg, color: 'var(--ink)' }}
                      >
                        <GraduationCap size={14} />
                      </div>
                      <div className="ehl-row-info">
                        <div className="ehl-row-name-row">
                          <span className={`ehl-row-name ${isPast ? 'past' : ''}`}>
                            {exam.exam_name}
                          </span>
                          <span className="ehl-countdown">
                            <ThemedIcon name={urgency.icon} size={16} /> {urgency.label}
                          </span>
                        </div>
                        <div className="ehl-row-meta">
                          <span className="ehl-row-date">
                            <Calendar
                              size={10}
                              style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }}
                            />
                            {formatDateFull(exam.exam_date)}
                          </span>
                          {exam.section_name && (
                            <span className="ehl-row-sec">{exam.section_name}</span>
                          )}
                        </div>
                        {exam.notes && (
                          <p className="ehl-row-notes">
                            {exam.notes.length > 80 ? exam.notes.slice(0, 80) + '…' : exam.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="ehl-row-actions">
                      {isConf ? (
                        <div className="ehl-confirm">
                          <span>Delete?</span>
                          <button
                            className="ehl-yes"
                            onClick={() => {
                              onDelete(exam.id);
                              setConfirmDel(null);
                            }}
                          >
                            Yes
                          </button>
                          <button className="ehl-no" onClick={() => setConfirmDel(null)}>
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button className="sp-icon-btn" onClick={() => onEdit(exam)}>
                            <Edit3 size={13} />
                          </button>
                          <button
                            aria-label="Delete"
                            className="sp-icon-btn danger"
                            onClick={() => setConfirmDel(exam.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
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
   EXAM STUDY WELLNESS
───────────────────────────────────────────── */
function ExamStudyWellness({ exams }) {
  const { user } = useAuth();
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * STUDY_TIPS.length));
  const [studyMins, setStudyMins] = useState(0);
  const [timerOn, setTimerOn] = useState(false);
  const [studyGoal, setStudyGoal] = useState(120);
  const [goalLoaded, setGoalLoaded] = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(studyGoal));

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', STUDY_GOAL_STORAGE_KEY)
        .maybeSingle();
      const parsed = Number(data?.value);
      setStudyGoal(Number.isFinite(parsed) && parsed >= 5 ? parsed : 120);
      setGoalLoaded(true);
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !goalLoaded) return;
    supabase
      .from('user_settings')
      .upsert([{ user_id: user.id, key: STUDY_GOAL_STORAGE_KEY, value: studyGoal }], {
        onConflict: 'user_id,key',
      });
  }, [studyGoal, goalLoaded, user?.id]);

  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setStudyMins((m) => m + 1), 60000);
    return () => clearInterval(id);
  }, [timerOn]);

  const nextExam = useMemo(() => {
    return (
      [...exams]
        .filter((e) => daysUntil(e.exam_date) >= 0)
        .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] ?? null
    );
  }, [exams]);

  const stats = useMemo(() => {
    const upcoming = exams.filter((e) => daysUntil(e.exam_date) >= 0);
    return {
      upcoming: upcoming.length,
      week7: upcoming.filter((e) => daysUntil(e.exam_date) <= 7).length,
      urgent: upcoming.filter((e) => daysUntil(e.exam_date) <= 3).length,
    };
  }, [exams]);

  const tip = STUDY_TIPS[tipIndex];
  const nextUrgency = nextExam ? getUrgency(daysUntil(nextExam.exam_date)) : null;
  const studyPct = Math.min(100, studyGoal > 0 ? Math.round((studyMins / studyGoal) * 100) : 0);
  const goalReached = studyMins >= studyGoal && studyGoal > 0;

  const applyGoal = () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val >= 5 && val <= 1440) {
      setStudyGoal(val);
      setStudyMins(0);
      setTimerOn(false);
    } else setGoalInput(String(studyGoal));
    setEditingGoal(false);
  };

  const applyPreset = (mins) => {
    setStudyGoal(mins);
    setGoalInput(String(mins));
    setStudyMins(0);
    setTimerOn(false);
  };

  return (
    <div className="sp-card sp-wellness-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap green">
          <Brain size={20} />
        </div>
        <div>
          <h3>Study & Wellness</h3>
          <p>Prepare smart, not just hard</p>
        </div>
      </div>
      {nextExam ? (
        <div
          className="esw-next-exam"
          style={{ borderColor: nextUrgency.borderColor + '55', background: nextUrgency.badgeBg }}
        >
          <div className="esw-next-top">
            <span className="esw-next-label">Next Exam</span>
            <span className="esw-next-badge">
              <ThemedIcon name={nextUrgency.icon} size={16} /> {nextUrgency.label}
            </span>
          </div>
          <p className="esw-next-name">{nextExam.exam_name}</p>
          <p className="esw-next-date">{formatDateLong(nextExam.exam_date)}</p>
        </div>
      ) : (
        <div className="esw-no-exam">
          <CheckCircle2 size={18} style={{ color: 'var(--sage)' }} />
          <span>No upcoming exams scheduled.</span>
        </div>
      )}
      <div className="esw-stats">
        <div className="esw-stat">
          <span className="esw-stat-val" style={{ color: 'var(--lavender)' }}>
            {stats.upcoming}
          </span>
          <span className="esw-stat-label">Upcoming</span>
        </div>
        <div className="esw-stat-div" />
        <div className="esw-stat">
          <span className="esw-stat-val" style={{ color: 'var(--ink)' }}>
            {stats.week7}
          </span>
          <span className="esw-stat-label">This Week</span>
        </div>
        <div className="esw-stat-div" />
        <div className="esw-stat">
          <span className="esw-stat-val" style={{ color: 'var(--ink)' }}>
            {stats.urgent}
          </span>
          <span className="esw-stat-label">Urgent (≤3d)</span>
        </div>
      </div>
      <div className="esw-timer">
        <div className="esw-timer-header">
          <span className="sp-section-label">
            <Timer size={13} /> Study Timer
          </span>
          {editingGoal ? (
            <div className="esw-goal-edit">
              <input
                className="esw-goal-input"
                type="number"
                min={5}
                max={1440}
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyGoal();
                  if (e.key === 'Escape') {
                    setEditingGoal(false);
                    setGoalInput(String(studyGoal));
                  }
                }}
                autoFocus
              />
              <span className="esw-goal-unit">min</span>
              <button aria-label="Confirm" className="esw-goal-apply" onClick={applyGoal}>
                <Check size={11} />
              </button>
              <button
                aria-label="Close"
                className="esw-goal-cancel"
                onClick={() => {
                  setEditingGoal(false);
                  setGoalInput(String(studyGoal));
                }}
              >
                <X size={11} />
              </button>
            </div>
          ) : (
            <button
              className="esw-goal-display"
              onClick={() => {
                setEditingGoal(true);
                setGoalInput(String(studyGoal));
              }}
            >
              <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: 12 }}>
                {studyMins}m / {studyGoal}m
              </span>
              <Edit3 size={10} style={{ color: 'var(--muted)', marginLeft: 4 }} />
            </button>
          )}
        </div>
        <div className="esw-goal-presets">
          {GOAL_PRESETS.map((mins) => (
            <button
              key={mins}
              className={`esw-preset-chip ${studyGoal === mins ? 'active' : ''}`}
              onClick={() => applyPreset(mins)}
            >
              {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
            </button>
          ))}
        </div>
        <div className="esw-timer-bar-wrap">
          <div className="esw-timer-bar">
            <div
              className="esw-timer-fill"
              style={{
                width: `${studyPct}%`,
                background: goalReached
                  ? 'linear-gradient(90deg,#6dd6b1,#4abf95)'
                  : 'linear-gradient(90deg,#ff8fb1,#ff6f91)',
                transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
              }}
            />
          </div>
          <span className="esw-timer-pct" style={{ color: 'var(--ink)' }}>
            {studyPct}%
          </span>
        </div>
        <div className="esw-timer-btns">
          <button
            className={`esw-timer-toggle ${timerOn ? 'on' : ''}`}
            onClick={() => setTimerOn((v) => !v)}
          >
            <ThemedIcon name={timerOn ? 'Pause' : 'Play'} size={16} /> {timerOn ? 'Pause' : 'Start'}
          </button>
          <button
            className="esw-timer-reset"
            onClick={() => {
              setTimerOn(false);
              setStudyMins(0);
            }}
          >
            Reset
          </button>
        </div>
        {goalReached && (
          <p className="esw-timer-done">
            <ThemedIcon name="CircleCheck" /> Daily study goal reached! Great work!{' '}
            <ThemedIcon name="PartyPopper" />
          </p>
        )}
      </div>
      <div className="sp-tip-card">
        <div className="sp-tip-icon">
          <ThemedIcon name={tip.icon} size={24} />
        </div>
        <div>
          <p className="sp-tip-label">Study Tip</p>
          <p className="sp-tip-text">{tip.tip}</p>
        </div>
      </div>
      <button
        className="sp-next-tip-btn"
        onClick={() => setTipIndex((i) => (i + 1) % STUDY_TIPS.length)}
      >
        Next tip →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXAMS PANEL
───────────────────────────────────────────── */
function ExamsPanel({
  exams,
  loading,
  error,
  onAdd,
  onEdit,
  onDelete,
  sectionMap,
  currentMonth,
  onCursorChange,
}) {
  const stats = useMemo(
    () => ({
      urgent: exams.filter((e) => daysUntil(e.exam_date) >= 0 && daysUntil(e.exam_date) <= 3)
        .length,
    }),
    [exams],
  );
  if (loading)
    return (
      <div className="ex-empty">
        <p>Loading your exams…</p>
      </div>
    );
  return (
    <div className="ex-panel">
      {error && (
        <div className="ex-error-box">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      {stats.urgent > 0 && (
        <div className="ex-urgent-banner">
          <Zap size={14} />
          <strong>
            {stats.urgent} exam{stats.urgent > 1 ? 's' : ''}
          </strong>
          {stats.urgent > 1 ? ' are' : ' is'} happening within 3 days — study hard!{' '}
          <ThemedIcon name="HeartPulse" />
        </div>
      )}
      <ScheduleCalendar
        kind="exam"
        initialView="month"
        exams={exams}
        onAdd={onAdd}
        onEdit={onEdit}
        cursor={currentMonth}
        onCursorChange={onCursorChange}
      />
      <div className="sp-grid">
        <ExamHistoryList
          allExams={exams}
          onEdit={onEdit}
          onDelete={onDelete}
          sectionMap={sectionMap}
        />
        <ExamStudyWellness exams={exams} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   WEEKLY STATS
───────────────────────────────────────────── */
function AllShiftsList({ allShifts, onEdit, onDelete }) {
  const [filterType, setFilterType] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    let list = [...allShifts].sort((a, b) => new Date(b.shift_date) - new Date(a.shift_date));
    if (filterType) list = list.filter((s) => s.shift_type === filterType);
    return list;
  }, [allShifts, filterType]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((s) => {
      const key = s.shift_date.slice(0, 7);
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalHours = useMemo(
    () => allShifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0),
    [allShifts],
  );

  return (
    <div className="sp-card" style={showFilter ? { position: 'relative', zIndex: 10 } : {}}>
      <div className="sp-card-header">
        <div className="sp-icon-wrap blue">
          <BarChart2 size={20} />
        </div>
        <div>
          <h3>Shift History</h3>
          <p>
            {allShifts.length} shifts · {totalHours.toFixed(1)}h total
          </p>
        </div>
      </div>
      <div className="sp-list-toolbar">
        <div className="sp-filter-wrap">
          <button
            className={`sp-filter-btn ${filterType ? 'active' : ''}`}
            onClick={() => setShowFilter((v) => !v)}
          >
            <Filter size={13} />
            {filterType ? SHIFT_TYPES[filterType]?.label : 'All types'}
          </button>
          {showFilter && (
            <div className="sp-filter-dropdown">
              <button
                className={`sp-filter-opt ${!filterType ? 'active' : ''}`}
                onClick={() => {
                  setFilterType('');
                  setShowFilter(false);
                }}
              >
                All types
              </button>
              {Object.entries(SHIFT_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  className={`sp-filter-opt ${filterType === key ? 'active' : ''}`}

                  onClick={() => {
                    setFilterType(key);
                    setShowFilter(false);
                  }}
                >
                  {val.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {filterType && (
          <button className="sp-clear-filter" onClick={() => setFilterType('')}>
            <X size={12} /> Clear
          </button>
        )}
      </div>
      {grouped.length === 0 ? (
        <div className="sp-empty">
          <p>
            No shifts logged yet <ThemedIcon name="Sparkles" />
          </p>
        </div>
      ) : (
        <div className="sp-shift-list">
          {grouped.map(([month, monthShifts]) => (
            <div key={month}>
              <p className="sp-month-label">
                {new Date(month + '-15').toLocaleDateString(undefined, {
                  month: 'long',
                  year: 'numeric',
                })}
                <span>{monthShifts.length} shifts</span>
              </p>
              {monthShifts.map((shift) => {
                const meta = SHIFT_TYPES[shift.shift_type] ?? SHIFT_TYPES.other;
                const SIcon = meta.icon;
                const duration = calcDuration(shift.start_time, shift.end_time);
                const today = isToday(shift.shift_date);
                return (
                  <div key={shift.id} className={`sp-shift-row ${today ? 'today-row' : ''}`}>
                    <div className="sp-shift-left">
                      <div className="sp-type-icon">
                        <SIcon size={14} />
                      </div>
                      <div>
                        <div className="sp-shift-main">
                          <strong>{formatDateFull(shift.shift_date)}</strong>
                          {today && <span className="sp-today-badge">Today</span>}
                        </div>
                        <div className="sp-shift-sub">
                          <span className="sp-type-tag">{meta.label}</span>
                          <span className="sp-time-range">
                            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                          </span>
                          {duration && (
                            <span className="sp-dur-tag">
                              <Timer size={10} /> {duration}
                            </span>
                          )}
                        </div>
                        {shift.section_name && (
                          <p className="sp-shift-section">{shift.section_name}</p>
                        )}
                        {shift.notes && <p className="sp-shift-notes">{shift.notes}</p>}
                      </div>
                    </div>
                    <div className="sp-shift-row-actions">
                      <button
                        aria-label="Edit shift"
                        className="sp-icon-btn"
                        onClick={() => onEdit(shift)}
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        aria-label="Delete"
                        className="sp-icon-btn danger"
                        onClick={() => onDelete(shift.id)}
                      >
                        <Trash2 size={13} />
                      </button>
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
   WELLNESS PANEL
───────────────────────────────────────────── */
function WellnessPanel({ weekShifts }) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * WELLNESS_TIPS.length));
  const [hydration, setHydration] = useState(0);
  const HYDRATION_GOAL = 8;

  const nightCount = weekShifts.filter((s) => s.shift_type === 'night').length;
  const totalHours = weekShifts.reduce(
    (sum, s) => sum + calcDurationHrs(s.start_time, s.end_time),
    0,
  );
  const fatigue = totalHours >= 40 ? 'high' : totalHours >= 24 ? 'moderate' : 'low';
  const fatigueInfo = {
    high: {
      color: '#e05555',
      bg: 'var(--rose-soft)',
      text: 'High workload this week. Prioritize rest and recovery.',
    },
    moderate: {
      color: '#ff8c5a',
      bg: 'var(--peach-soft)',
      text: 'Moderate workload. Stay hydrated and take breaks.',
    },
    low: {
      color: '#4abf95',
      bg: 'var(--sage-soft)',
      text: 'Manageable schedule. Keep the great momentum!',
    },
  };
  const tip = WELLNESS_TIPS[tipIndex];
  return (
    <div className="sp-card sp-wellness-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap green">
          <Heart size={20} />
        </div>
        <div>
          <h3>Wellness Check</h3>
          <p>Stay healthy during internship</p>
        </div>
      </div>
      <div
        className="sp-fatigue-bar"
        style={{
          background: fatigueInfo[fatigue].bg,
          borderColor: fatigueInfo[fatigue].color + '44',
        }}
      >
        <AlertCircle size={14} style={{ color: 'var(--ink)', flexShrink: 0 }} />
        <div>
          <p className="sp-fatigue-label">
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
          <span className="sp-section-label">
            <Droplets size={13} /> Daily Hydration
          </span>
          <span className="sp-hydration-count">
            {hydration}/{HYDRATION_GOAL} glasses
          </span>
        </div>
        <p className="sp-hydration-help">Tap the number of glasses you’ve had today.</p>
        <div className="sp-hydration-cups" role="group" aria-label="Water intake today">
          {Array.from({ length: HYDRATION_GOAL }).map((_, i) => (
            <button
              key={i}
              className={`sp-cup ${i < hydration ? 'filled' : ''}`}
              aria-label={'Set water intake to ' + (i + 1) + (i === 0 ? ' glass' : ' glasses')}
              aria-pressed={i + 1 === hydration}
              onClick={() => setHydration(i + 1)}
            >
              <span aria-hidden="true">
                <ThemedIcon name="Droplets" />
              </span>
              <span className="sp-cup-label">
                {i + 1} {i === 0 ? 'glass' : 'glasses'}
              </span>
            </button>
          ))}
        </div>
        {hydration > 0 && (
          <button className="sp-water-reset" onClick={() => setHydration(0)}>
            Reset water count
          </button>
        )}
        {hydration >= HYDRATION_GOAL && (
          <p className="sp-hydration-done">
            <ThemedIcon name="CircleCheck" /> Hydration goal reached today!
          </p>
        )}
      </div>
      <div className="sp-tip-card">
        <div className="sp-tip-icon">
          <ThemedIcon name={tip.icon} size={24} />
        </div>
        <div>
          <p className="sp-tip-label">Wellness Tip</p>
          <p className="sp-tip-text">{tip.tip}</p>
        </div>
      </div>
      <button
        className="sp-next-tip-btn"
        onClick={() => setTipIndex((i) => (i + 1) % WELLNESS_TIPS.length)}
      >
        Next tip →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN SHIFT PLANNER (with fixed section persistence)
───────────────────────────────────────────── */
export default function ShiftPlanner() {
  const location = useLocation();
  const { user } = useAuth();

  const [allShifts, setAllShifts] = useState([]);
  const [weekShifts, setWeekShifts] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loadingShifts, setLoadingShifts] = useState(true);
  const [shiftError, setShiftError] = useState('');
  const [showShiftModal, setShowShiftModal] = useState(
    () => new URLSearchParams(window.location.search).get('new') === '1',
  );
  useQuickCreate(setShowShiftModal);
  const [editingShift, setEditingShift] = useState(null);
  const [modalDate, setModalDate] = useState('');

  const [allExams, setAllExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(true);
  const [examError, setExamError] = useState(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [examDefaultDate, setExamDefaultDate] = useState('');
  const [currentExamMonth, setCurrentExamMonth] = useState(new Date());

  const [sections, setSections] = useState(DEFAULT_SECTION_LIST);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [showSectionManage, setShowSectionManage] = useState(false);

  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 'shifts');

  const upcomingExamCount = useMemo(
    () => allExams.filter((e) => daysUntil(e.exam_date) >= 0).length,
    [allExams],
  );
  const sectionMap = useMemo(() => Object.fromEntries(sections.map((s) => [s.id, s])), [sections]);

  // ── Load custom sections from Supabase ──
  useEffect(() => {
    const loadSections = async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', SECTION_STORAGE_KEY)
          .maybeSingle();

        if (error) {
          console.error('ShiftPlanner load sections error:', error);
          setSections(DEFAULT_SECTION_LIST);

          return;
        }

        const saved = data?.value;
        if (saved && Array.isArray(saved) && saved.length > 0) {
          const normalized = normalizeSections(saved);

          setSections(normalized);
        } else {
          setSections(DEFAULT_SECTION_LIST);
        }
        setSectionsLoaded(true);
      } catch (err) {
        console.error('ShiftPlanner unexpected load error:', err);
        setSections(DEFAULT_SECTION_LIST);
      }
    };
    loadSections();
  }, [user.id]);

  // ── Save custom sections whenever they change ──
  useEffect(() => {
    if (!sectionsLoaded) return;

    const saveSections = async () => {
      try {
        const toSave = sections.map((s) => ({
          id: s.id,
          color: s.color,
          bg: s.bg,
        }));
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: user.id,
            key: SECTION_STORAGE_KEY,
            value: toSave,
          },
          { onConflict: 'user_id,key' },
        );
        if (error) {
          console.error('ShiftPlanner save sections error:', error);
        }
      } catch (err) {
        console.error('ShiftPlanner unexpected save error:', err);
      }
    };
    saveSections();
  }, [sections, sectionsLoaded, user.id]);

  // ── Fetch shifts ──
  useEffect(() => {
    const fetchAll = async () => {
      setLoadingShifts(true);
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('shift_date', { ascending: false });
      if (error) setShiftError('Couldn’t load your shifts. Please refresh and try again.');
      else {
        setAllShifts(data || []);
        setShiftError('');
      }
      setLoadingShifts(false);
    };
    fetchAll();
  }, [user.id]);

  // ── Filter shifts for current week ──
  useEffect(() => {
    const weekStart = getWeekStart(currentWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const s = toDateStr(weekStart);
    const e = toDateStr(weekEnd);
    setWeekShifts(allShifts.filter((sh) => sh.shift_date >= s && sh.shift_date <= e));
  }, [allShifts, currentWeek]);

  // ── Fetch exams ──
  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .order('exam_date', { ascending: true });
      if (error) {
        if (isMissingTableError(error))
          setExamError('Exams table not found. Run supabase/schema.sql in your project.');
        else setExamError('Couldn’t load your exams. Please refresh and try again.');
      } else {
        setAllExams(data || []);
        setExamError(null);
      }
      setLoadingExams(false);
    };
    fetchExams();
  }, [user.id]);

  // ── Handlers ──
  const handleShiftSaved = (saved, isEdit) =>
    isEdit
      ? setAllShifts((prev) => prev.map((s) => (s.id === saved.id ? saved : s)))
      : setAllShifts((prev) => [...saved, ...prev]);

  const handleShiftDelete = useCallback(async (id) => {
    await supabase.from('shifts').delete().eq('id', id);
    setAllShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleExamSaved = (saved, isEdit) =>
    isEdit
      ? setAllExams((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
      : setAllExams((prev) =>
          [...prev, ...saved].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)),
        );

  const handleExamDelete = useCallback(async (id) => {
    await supabase.from('exams').delete().eq('id', id);
    setAllExams((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const openAddShift = (dateStr) => {
    setEditingShift(null);
    setModalDate(dateStr);
    setShowShiftModal(true);
  };
  const openEditShift = (shift) => {
    setEditingShift(shift);
    setModalDate('');
    setShowShiftModal(true);
  };
  const openAddExam = (dateStr) => {
    setEditingExam(null);
    setExamDefaultDate(dateStr ?? '');
    setShowExamModal(true);
  };
  const openEditExam = (exam) => {
    setEditingExam(exam);
    setExamDefaultDate('');
    setShowExamModal(true);
  };

  const handleAddSection = (label) => {
    const meta = generateSectionMeta(label);
    setSections((prev) => [...prev, { id: label, color: meta.color, bg: meta.bg }]);
  };

  const handleRemoveSection = (id) => setSections((prev) => prev.filter((s) => s.id !== id));

  const handleSectionColorChange = (id, color) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, color, bg: colorToSoftBg(color) } : s)),
    );
  };

  return (
    <>
      <div className="sp-page">
        <h1 className="sp-page-title">
          Shift <span className="sp-title-accent">Planner</span>
        </h1>
        <p className="tool-page-description">
          Plan your duty days and exams. Leave a little room to breathe.
        </p>

        <div className="sp-page-tabs">
          <button
            className={`sp-page-tab ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shifts')}
          >
            <CalendarDays size={16} />
            <span className="sp-page-tab-copy">
              <span className="sp-page-tab-title">Shifts</span>
              <span className="sp-page-tab-sub">Weekly schedule and history</span>
            </span>
          </button>
          <button
            className={`sp-page-tab ${activeTab === 'exams' ? 'active' : ''}`}
            onClick={() => setActiveTab('exams')}
          >
            <GraduationCap size={16} />
            <span className="sp-page-tab-copy">
              <span className="sp-page-tab-title">Exam Dates</span>
              <span className="sp-page-tab-sub">Upcoming tests and reminders</span>
            </span>
            {upcomingExamCount > 0 && <span className="sp-tab-badge">{upcomingExamCount}</span>}
          </button>
        </div>

        <div className="sp-sections-toolbar">
          <button className="sp-manage-sec-btn" onClick={() => setShowSectionManage(true)}>
            <Settings2 size={13} /> Manage Sections
          </button>
        </div>

        {activeTab === 'shifts' && (
          <>
            {shiftError && (
              <p className="inline-error" role="alert">
                {shiftError}
              </p>
            )}
            {loadingShifts && (
              <p className="schedule-instruction" role="status">
                Loading your schedule…
              </p>
            )}
            {!loadingShifts && (
              <ScheduleCalendar
                shifts={allShifts}
                exams={allExams}
                onAdd={openAddShift}
                onEdit={openEditShift}
                onDelete={handleShiftDelete}
                cursor={currentWeek}
                onCursorChange={setCurrentWeek}
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

        {activeTab === 'exams' && (
          <ExamsPanel
            exams={allExams}
            loading={loadingExams}
            error={examError}
            onAdd={openAddExam}
            onEdit={openEditExam}
            onDelete={handleExamDelete}
            sections={sections}
            sectionMap={sectionMap}
            onManageSections={() => setShowSectionManage(true)}
            currentMonth={currentExamMonth}
            onCursorChange={setCurrentExamMonth}
          />
        )}
      </div>

      {showShiftModal && (
        <ShiftModal
          editing={editingShift}
          defaultDate={modalDate}
          onClose={() => {
            setShowShiftModal(false);
            setEditingShift(null);
            setModalDate('');
          }}
          onSaved={handleShiftSaved}
          sections={sections}
        />
      )}

      {showExamModal && (
        <ExamModal
          editing={editingExam}
          defaultDate={examDefaultDate}
          onClose={() => {
            setShowExamModal(false);
            setEditingExam(null);
            setExamDefaultDate('');
          }}
          onSaved={handleExamSaved}
          sections={sections}
          sectionMap={sectionMap}
        />
      )}

      {showSectionManage && (
        <ManageSectionsModal
          sections={sections}
          onAdd={handleAddSection}
          onRemove={handleRemoveSection}
          onColorChange={handleSectionColorChange}
          onClose={() => setShowSectionManage(false)}
        />
      )}
    </>
  );
}
