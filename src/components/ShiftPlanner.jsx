import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
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
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SHIFT_TYPES = {
  morning:   { label: 'Morning',   color: '#ff8c5a', bg: '#fff5ee', icon: Sunrise  },
  afternoon: { label: 'Afternoon', color: '#5f8dff', bg: '#eff4ff', icon: Sun      },
  night:     { label: 'Night',     color: '#8b6fff', bg: '#f3f0ff', icon: Moon     },
  rest:      { label: 'Rest',      color: '#4abf95', bg: '#edfaf4', icon: Coffee   },
  exam:      { label: 'Exam',      color: '#e05555', bg: '#fff0f0', icon: BookOpen },
  other:     { label: 'Other',     color: '#999',    bg: '#f5f5f5', icon: HelpCircle },
};

const SECTIONS = [
  'Hematology',
  'Clinical Chemistry',
  'Microbiology',
  'Blood Bank',
  'Histopathology/Cytology',
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

/* ─────────────────────────────────────────────
   SHIFT MODAL
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

  const duration = calcDuration(form.start_time, form.end_time);
  const ShiftIcon = SHIFT_TYPES[form.shift_type]?.icon ?? HelpCircle;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let result;
    if (editing) {
      result = await supabase
        .from('shifts')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('shifts')
        .insert([{ ...form, user_id: user.id }])
        .select()
        .single();
    }

    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  const typeColor = SHIFT_TYPES[form.shift_type]?.color ?? '#888';

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
          {/* Shift type pills */}
          <div>
            <p className="sp-field-label">Shift Type</p>
            <div className="sp-type-pills">
              {Object.entries(SHIFT_TYPES).map(([key, val]) => {
                const TIcon = val.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`sp-type-pill ${form.shift_type === key ? 'active' : ''}`}
                    style={form.shift_type === key
                      ? { background: val.color, borderColor: val.color, color: '#fff' }
                      : { borderColor: val.color + '66', color: val.color }}
                    onClick={() => setForm({ ...form, shift_type: key })}
                  >
                    <TIcon size={13} />
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section */}
          <label className="sp-field-label">
            Section
            <select
              className="sp-select"
              value={form.section_name}
              onChange={(e) => setForm({ ...form, section_name: e.target.value })}
            >
              {SECTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>

          {/* Date */}
          <label className="sp-field-label">
            Date
            <input
              type="date"
              className="sp-input"
              value={form.shift_date}
              onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
              required
            />
          </label>

          {/* Time row */}
          <div className="sp-time-row">
            <label className="sp-field-label" style={{ flex: 1 }}>
              Start Time
              <input
                type="time"
                className="sp-input"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                required
              />
            </label>
            <label className="sp-field-label" style={{ flex: 1 }}>
              End Time
              <input
                type="time"
                className="sp-input"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                required
              />
            </label>
          </div>

          {/* Duration preview */}
          {duration && (
            <div className="sp-duration-preview" style={{ borderColor: typeColor + '55', color: typeColor }}>
              <Timer size={13} />
              Duration: <strong>{duration}</strong>
            </div>
          )}

          {/* Notes */}
          <label className="sp-field-label">
            Notes (optional)
            <textarea
              className="sp-textarea"
              rows={2}
              placeholder="Any reminders or details…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {error && <p className="sp-error">{error}</p>}

          <div className="sp-modal-actions">
            <button type="submit" className="sp-primary-btn" disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Shift' : 'Add Shift'}
            </button>
            <button type="button" className="sp-secondary-btn" onClick={onClose}>
              Cancel
            </button>
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
    const counts = {};
    shifts.forEach((s) => {
      counts[s.shift_type] = (counts[s.shift_type] ?? 0) + 1;
    });
    return counts;
  }, [shifts]);

  const nightCount = typeCounts['night'] ?? 0;

  return (
    <div className="sp-stats-bar">
      <div className="sp-stat">
        <CalendarDays size={15} />
        <span><strong>{shifts.length}</strong> shifts</span>
      </div>
      <div className="sp-stat-divider" />
      <div className="sp-stat">
        <Clock size={15} />
        <span><strong>{totalHours.toFixed(1)}h</strong> total</span>
      </div>
      <div className="sp-stat-divider" />
      {nightCount >= 3 && (
        <div className="sp-stat warn">
          <AlertCircle size={14} />
          <span>{nightCount} night shifts — rest well!</span>
        </div>
      )}
      {Object.entries(typeCounts).map(([type, count]) => {
        const meta = SHIFT_TYPES[type];
        return (
          <div
            key={type}
            className="sp-type-chip"
            style={{ background: meta?.bg, color: meta?.color, border: `1px solid ${meta?.color}44` }}
          >
            {meta?.label} ×{count}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SHIFT CALENDAR
───────────────────────────────────────────── */
function ShiftCalendar({ shifts, onAdd, onEdit, onDelete, currentWeek, onPrevWeek, onNextWeek }) {
  const weekStart = getWeekStart(currentWeek);

  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayStr = toDateStr(new Date());

  return (
    <div className="sp-card sp-calendar-card">
      {/* Header */}
      <div className="sp-card-header">
        <div className="sp-icon-wrap pink">
          <CalendarDays size={20} />
        </div>
        <div>
          <h3>Weekly Schedule</h3>
          <p>Your shift calendar</p>
        </div>
      </div>

      {/* Week nav */}
      <div className="sp-week-nav">
        <button className="sp-nav-btn" onClick={onPrevWeek}><ChevronLeft size={16} /></button>
        <span className="sp-week-label">{getWeekLabel(weekStart)}</span>
        <button className="sp-nav-btn" onClick={onNextWeek}><ChevronRight size={16} /></button>
        {toDateStr(weekStart) !== toDateStr(getWeekStart(new Date())) && (
          <button
            className="sp-today-btn"
            onClick={() => onNextWeek('today')}
          >
            Today
          </button>
        )}
      </div>

      {/* Weekly stats */}
      <WeeklyStats shifts={shifts} />

      {/* 7-day grid */}
      <div className="sp-cal-grid">
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const dayShifts = shifts.filter((s) => s.shift_date === dateStr);
          const today = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`sp-cal-day ${today ? 'today' : ''} ${dayShifts.length > 0 ? 'has-shifts' : ''}`}
              onClick={() => onAdd(dateStr)}
              title={`Add shift on ${formatDateFull(dateStr)}`}
            >
              <div className="sp-cal-day-header">
                <span className="sp-day-name">{DAYS_SHORT[i]}</span>
                <span className={`sp-day-num ${today ? 'today-num' : ''}`}>{date.getDate()}</span>
              </div>

              <div className="sp-cal-day-shifts">
                {dayShifts.length === 0 && (
                  <div className="sp-cal-empty-day">
                    <Plus size={12} />
                  </div>
                )}
                {dayShifts.map((shift) => {
                  const meta = SHIFT_TYPES[shift.shift_type] ?? SHIFT_TYPES.other;
                  const SIcon = meta.icon;
                  return (
                    <div
                      key={shift.id}
                      className="sp-shift-pill"
                      style={{ background: meta.bg, borderColor: meta.color + '55', color: meta.color }}
                      onClick={(e) => { e.stopPropagation(); onEdit(shift); }}
                      title={`${meta.label} • ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`}
                    >
                      <SIcon size={10} />
                      <span>{meta.label}</span>
                      <button
                        className="sp-pill-delete"
                        onClick={(e) => { e.stopPropagation(); onDelete(shift.id); }}
                        title="Delete"
                      >
                        <X size={9} />
                      </button>
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
   ALL SHIFTS LIST
───────────────────────────────────────────── */
function AllShiftsList({ allShifts, onEdit, onDelete }) {
  const [filterType, setFilterType] = useState('');
  const [showFilter, setShowFilter] = useState(false);

  const filtered = useMemo(() => {
    let list = [...allShifts].sort(
      (a, b) => new Date(b.shift_date) - new Date(a.shift_date)
    );
    if (filterType) list = list.filter((s) => s.shift_type === filterType);
    return list;
  }, [allShifts, filterType]);

  /* group by month */
  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach((s) => {
      const key = s.shift_date.slice(0, 7); // YYYY-MM
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
        <div className="sp-icon-wrap blue">
          <BarChart2 size={20} />
        </div>
        <div>
          <h3>Shift History</h3>
          <p>{allShifts.length} shifts · {totalHours.toFixed(1)}h total</p>
        </div>
      </div>

      {/* Filter */}
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
                onClick={() => { setFilterType(''); setShowFilter(false); }}
              >
                All types
              </button>
              {Object.entries(SHIFT_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  className={`sp-filter-opt ${filterType === key ? 'active' : ''}`}
                  style={{ color: val.color }}
                  onClick={() => { setFilterType(key); setShowFilter(false); }}
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
          <p>No shifts logged yet ✨</p>
        </div>
      ) : (
        <div className="sp-shift-list">
          {grouped.map(([month, monthShifts]) => (
            <div key={month}>
              <p className="sp-month-label">
                {new Date(month + '-15').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
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
                      <div
                        className="sp-type-icon"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        <SIcon size={14} />
                      </div>
                      <div>
                        <div className="sp-shift-main">
                          <strong>{formatDateFull(shift.shift_date)}</strong>
                          {today && <span className="sp-today-badge">Today</span>}
                        </div>
                        <div className="sp-shift-sub">
                          <span
                            className="sp-type-tag"
                            style={{ background: meta.bg, color: meta.color }}
                          >
                            {meta.label}
                          </span>
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
                        {shift.notes && (
                          <p className="sp-shift-notes">{shift.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="sp-shift-row-actions">
                      <button className="sp-icon-btn" onClick={() => onEdit(shift)} title="Edit">
                        <Edit3 size={13} />
                      </button>
                      <button className="sp-icon-btn danger" onClick={() => onDelete(shift.id)} title="Delete">
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
  const [tipIndex,    setTipIndex]    = useState(() => Math.floor(Math.random() * WELLNESS_TIPS.length));
  const [hydration,   setHydration]   = useState(0);
  const HYDRATION_GOAL = 8;

  const nightCount = weekShifts.filter((s) => s.shift_type === 'night').length;
  const totalHours = weekShifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0);
  const fatigue = totalHours >= 40 ? 'high' : totalHours >= 24 ? 'moderate' : 'low';

  const fatigueInfo = {
    high:     { color: '#e05555', bg: '#fff0f0', text: 'High workload this week. Prioritize rest and recovery.' },
    moderate: { color: '#ff8c5a', bg: '#fff5ee', text: 'Moderate workload. Stay hydrated and take breaks.' },
    low:      { color: '#4abf95', bg: '#edfaf4', text: 'Manageable schedule. Keep the great momentum! ✨' },
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

      {/* Fatigue indicator */}
      <div
        className="sp-fatigue-bar"
        style={{ background: fatigueInfo[fatigue].bg, borderColor: fatigueInfo[fatigue].color + '44' }}
      >
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

      {/* Hydration tracker */}
      <div className="sp-hydration">
        <div className="sp-hydration-header">
          <span className="sp-section-label"><Droplets size={13} /> Daily Hydration</span>
          <span className="sp-hydration-count">
            {hydration}/{HYDRATION_GOAL} glasses
          </span>
        </div>
        <div className="sp-hydration-cups">
          {Array.from({ length: HYDRATION_GOAL }).map((_, i) => (
            <button
              key={i}
              className={`sp-cup ${i < hydration ? 'filled' : ''}`}
              onClick={() => setHydration(i < hydration ? i : i + 1)}
              title={`${i + 1} glass${i > 0 ? 'es' : ''}`}
            >
              💧
            </button>
          ))}
        </div>
        {hydration >= HYDRATION_GOAL && (
          <p className="sp-hydration-done">✅ Hydration goal reached today!</p>
        )}
      </div>

      {/* Wellness tip */}
      <div className="sp-tip-card">
        <div className="sp-tip-emoji">{tip.emoji}</div>
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
   MAIN SHIFT PLANNER
───────────────────────────────────────────── */
export default function ShiftPlanner() {
  const { user } = useAuth();

  const [allShifts,   setAllShifts]   = useState([]);
  const [weekShifts,  setWeekShifts]  = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editingShift,setEditingShift]= useState(null);
  const [modalDate,   setModalDate]   = useState('');

  /* ── Fetch all shifts once ── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('shift_date', { ascending: false });
      setAllShifts(data || []);
      setLoading(false);
    };
    fetchAll();
  }, [user.id]);

  /* ── Derive week shifts from allShifts ── */
  useEffect(() => {
    const weekStart = getWeekStart(currentWeek);
    const weekEnd   = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const s = toDateStr(weekStart);
    const e = toDateStr(weekEnd);
    setWeekShifts(allShifts.filter((sh) => sh.shift_date >= s && sh.shift_date <= e));
  }, [allShifts, currentWeek]);

  /* ── Handlers ── */
  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setAllShifts((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
    } else {
      setAllShifts((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = useCallback(async (id) => {
    await supabase.from('shifts').delete().eq('id', id);
    setAllShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const openAdd = (dateStr) => {
    setEditingShift(null);
    setModalDate(dateStr);
    setShowModal(true);
  };

  const openEdit = (shift) => {
    setEditingShift(shift);
    setModalDate('');
    setShowModal(true);
  };

  const prevWeek = () => {
    setCurrentWeek((d) => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  };

  const nextWeek = (cmd) => {
    if (cmd === 'today') { setCurrentWeek(new Date()); return; }
    setCurrentWeek((d) => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  };

  return (
    <>
      <style>{`
        /* ── Page ── */
        .sp-page { width: 100%; }
        .sp-page-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ff5d8f;
          margin-bottom: 6px;
        }
        .sp-page-sub {
          color: #888;
          font-size: 0.95rem;
          margin-bottom: 28px;
        }

        /* ── Grid ── */
        .sp-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .sp-grid-wide { grid-column: 1 / -1; }

        /* ── Card ── */
        .sp-card {
          background: rgba(255,255,255,0.84);
          border-radius: 28px;
          padding: 24px;
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 32px rgba(255,111,145,0.08);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .sp-calendar-card { grid-column: 1 / -1; }

        .sp-card-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .sp-card-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .sp-card-header p  { margin: 4px 0 0; color: #999; font-size: 13px; }

        .sp-icon-wrap {
          width: 46px; height: 46px;
          border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .pink  { background: linear-gradient(135deg,#ff8fb1,#ff6f91); }
        .blue  { background: linear-gradient(135deg,#7ab6ff,#5f8dff); }
        .green { background: linear-gradient(135deg,#6dd6b1,#4abf95); }

        /* ── Week nav ── */
        .sp-week-nav {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sp-week-label {
          flex: 1;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
          color: #555;
        }
        .sp-nav-btn {
          border: 1.5px solid #ffd6e1;
          background: rgba(255,255,255,0.9);
          border-radius: 12px;
          padding: 7px 10px;
          cursor: pointer;
          display: flex; align-items: center;
          color: #ff6f91;
          transition: 0.2s;
        }
        .sp-nav-btn:hover { background: #ffe4ec; }

        .sp-today-btn {
          border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white;
          border-radius: 12px;
          padding: 7px 14px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        /* ── Stats bar ── */
        .sp-stats-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 12px 16px;
          background: #fff8fa;
          border-radius: 16px;
          border: 1px solid #ffe0ea;
        }
        .sp-stat {
          display: flex; align-items: center; gap: 6px;
          font-size: 13px; color: #666;
        }
        .sp-stat strong { color: #ff5d8f; }
        .sp-stat.warn { color: #e05555; }
        .sp-stat-divider {
          width: 1px; height: 16px;
          background: #ffd6e1;
        }
        .sp-type-chip {
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
        }

        /* ── 7-day grid ── */
        .sp-cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }

        .sp-cal-day {
          background: #fff8fa;
          border-radius: 18px;
          border: 1.5px solid #ffe0ea;
          padding: 10px 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 90px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .sp-cal-day:hover {
          border-color: #ff8fb1;
          box-shadow: 0 4px 14px rgba(255,111,145,0.13);
          transform: translateY(-1px);
        }
        .sp-cal-day.today {
          border-color: #ff6f91;
          background: linear-gradient(135deg, #fff0f4, #fff8fa);
          box-shadow: 0 0 0 2px #ff6f91;
        }

        .sp-cal-day-header {
          display: flex; flex-direction: column; align-items: center;
        }
        .sp-day-name {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: #bbb;
        }
        .sp-day-num {
          font-size: 16px; font-weight: 700; color: #444;
          line-height: 1.3;
        }
        .sp-day-num.today-num {
          color: #ff5d8f;
        }

        .sp-cal-day-shifts {
          display: flex; flex-direction: column; gap: 4px; flex: 1;
        }

        .sp-cal-empty-day {
          display: flex; align-items: center; justify-content: center;
          color: #e0c0cc; margin-top: auto;
          opacity: 0; transition: opacity 0.2s;
        }
        .sp-cal-day:hover .sp-cal-empty-day { opacity: 1; }

        .sp-shift-pill {
          display: flex; align-items: center; gap: 4px;
          border-radius: 8px;
          border: 1px solid;
          padding: 3px 6px;
          font-size: 9px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 0.15s;
          position: relative;
        }
        .sp-shift-pill:hover { filter: brightness(0.95); }
        .sp-shift-pill span { flex: 1; }

        .sp-pill-delete {
          background: none; border: none;
          cursor: pointer; padding: 0;
          display: flex; align-items: center;
          opacity: 0.5; transition: opacity 0.15s;
          color: inherit;
        }
        .sp-pill-delete:hover { opacity: 1; }

        /* ── Shift list ── */
        .sp-list-toolbar {
          display: flex; align-items: center; gap: 10px;
          position: relative;
        }
        .sp-filter-btn {
          display: flex; align-items: center; gap: 7px;
          border: 1.5px solid #ffd6e1;
          background: rgba(255,255,255,0.9);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: 12px; font-weight: 600;
          color: #888; cursor: pointer; transition: 0.2s;
        }
        .sp-filter-btn.active { border-color: #ff8fb1; color: #ff5d8f; }
        .sp-filter-btn:hover  { border-color: #ff8fb1; }

        .sp-filter-wrap { position: relative; }
        .sp-filter-dropdown {
          position: absolute; top: calc(100% + 8px); left: 0;
          background: white;
          border-radius: 18px;
          border: 1px solid #ffe0ea;
          box-shadow: 0 12px 32px rgba(255,111,145,0.16);
          overflow: hidden; z-index: 200; min-width: 140px;
        }
        .sp-filter-opt {
          display: block; width: 100%; text-align: left;
          border: none; background: transparent;
          padding: 11px 16px;
          font-size: 13px; color: #555;
          cursor: pointer; transition: 0.15s;
        }
        .sp-filter-opt:hover { background: #fff0f4; }
        .sp-filter-opt.active { font-weight: 700; background: #fff5f8; }

        .sp-clear-filter {
          background: none; border: none;
          color: #bbb; font-size: 12px; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
        }
        .sp-clear-filter:hover { color: #ff5d8f; }

        .sp-shift-list {
          display: flex; flex-direction: column; gap: 4px;
          max-height: 400px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .sp-shift-list::-webkit-scrollbar { width: 4px; }
        .sp-shift-list::-webkit-scrollbar-track { background: transparent; }
        .sp-shift-list::-webkit-scrollbar-thumb { background: #ffd6e1; border-radius: 4px; }

        .sp-month-label {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #ccc; margin: 12px 0 6px;
          display: flex; justify-content: space-between; align-items: center;
        }
        .sp-month-label span { font-weight: 500; letter-spacing: 0; }

        .sp-shift-row {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          background: #fff8fa;
          border: 1.5px solid #ffe0ea;
          border-radius: 16px;
          padding: 12px 14px;
          gap: 10px;
          transition: 0.2s;
        }
        .sp-shift-row:hover { border-color: #ffb8ce; }
        .sp-shift-row.today-row {
          border-color: #ff8fb1;
          background: linear-gradient(135deg, #fff0f4, #fff8fa);
        }

        .sp-shift-left {
          display: flex; align-items: flex-start; gap: 12px; flex: 1;
        }
        .sp-type-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .sp-shift-main {
          display: flex; align-items: center; gap: 8px; margin-bottom: 5px;
        }
        .sp-shift-main strong { font-size: 13px; color: #333; }
        .sp-today-badge {
          background: #ff6f91; color: white;
          font-size: 10px; font-weight: 700;
          border-radius: 999px; padding: 2px 8px;
        }

        .sp-shift-sub {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }
        .sp-type-tag {
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px; font-weight: 600;
        }
        .sp-time-range { font-size: 12px; color: #888; }
        .sp-dur-tag {
          display: flex; align-items: center; gap: 3px;
          font-size: 11px; color: #bbb;
        }
        .sp-shift-section { margin: 4px 0 0; font-size: 12px; color: #aaa; }
        .sp-shift-notes {
          margin: 4px 0 0; font-size: 12px;
          color: #888; font-style: italic;
        }

        .sp-shift-row-actions {
          display: flex; gap: 5px; flex-shrink: 0;
        }
        .sp-icon-btn {
          border: none; background: #f0f0f0;
          padding: 7px; border-radius: 10px;
          cursor: pointer; display: flex; align-items: center;
          color: #888; transition: 0.2s;
        }
        .sp-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .sp-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }

        /* ── Wellness ── */
        .sp-fatigue-bar {
          display: flex; align-items: flex-start; gap: 10px;
          border-radius: 16px; border: 1px solid;
          padding: 14px;
        }
        .sp-fatigue-label { margin: 0 0 3px; font-size: 13px; font-weight: 700; }
        .sp-fatigue-text  { margin: 0; font-size: 12px; color: #666; line-height: 1.5; }

        .sp-night-warning {
          display: flex; align-items: center; gap: 8px;
          background: #f3f0ff; color: #8b6fff;
          border-radius: 14px; padding: 10px 14px;
          font-size: 12px; font-weight: 600;
          border: 1px solid #d4cafe;
        }

        .sp-section-label {
          font-size: 12px; font-weight: 700;
          color: #aaa; text-transform: uppercase; letter-spacing: 0.06em;
          display: flex; align-items: center; gap: 5px;
        }

        .sp-hydration { display: flex; flex-direction: column; gap: 10px; }
        .sp-hydration-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        .sp-hydration-count { font-size: 12px; font-weight: 600; color: #5f8dff; }
        .sp-hydration-cups { display: flex; gap: 6px; flex-wrap: wrap; }
        .sp-cup {
          width: 32px; height: 32px;
          border-radius: 10px; border: 1.5px solid #ddd;
          background: #f5f5f5; cursor: pointer;
          font-size: 14px; display: flex;
          align-items: center; justify-content: center;
          transition: 0.15s; filter: grayscale(1); opacity: 0.4;
        }
        .sp-cup.filled { filter: none; opacity: 1; border-color: #5f8dff; background: #eff4ff; }
        .sp-cup:hover { transform: scale(1.1); }

        .sp-hydration-done {
          font-size: 12px; font-weight: 600; color: #4abf95; margin: 0;
        }

        .sp-tip-card {
          display: flex; align-items: flex-start; gap: 12px;
          background: #fff8fa; border: 1px solid #ffe0ea;
          border-radius: 16px; padding: 14px;
        }
        .sp-tip-emoji { font-size: 22px; flex-shrink: 0; line-height: 1; }
        .sp-tip-label { margin: 0 0 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ccc; }
        .sp-tip-text  { margin: 0; font-size: 13px; color: #555; line-height: 1.55; }
        .sp-next-tip-btn {
          align-self: flex-start;
          background: none; border: none;
          color: #ff8fb1; font-size: 12px;
          font-weight: 600; cursor: pointer;
          padding: 0;
        }
        .sp-next-tip-btn:hover { color: #ff5d8f; }

        /* ── Empty ── */
        .sp-empty { text-align: center; color: #bbb; padding: 24px 0; font-size: 14px; }

        /* ── Modal ── */
        .sp-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.22);
          backdrop-filter: blur(5px);
          z-index: 1000;
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        .sp-modal {
          background: white; border-radius: 28px;
          padding: 28px; width: 100%; max-width: 500px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2);
          border: 1px solid #ffe0ea;
          max-height: 90vh; overflow-y: auto;
        }
        .sp-modal-header {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }
        .sp-modal-title-row { display: flex; align-items: center; gap: 10px; }
        .sp-modal-dot { width: 10px; height: 10px; border-radius: 50%; }
        .sp-modal-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .sp-modal-form { display: flex; flex-direction: column; gap: 16px; }
        .sp-field-label {
          display: flex; flex-direction: column; gap: 7px;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: #aaa; margin: 0;
        }
        .sp-input, .sp-select, .sp-textarea {
          border: 1.5px solid #ffd6e1;
          background: #fff8fa; border-radius: 14px;
          padding: 11px 14px; font-size: 14px;
          outline: none; transition: 0.2s; color: #444;
          font-family: inherit;
        }
        .sp-input:focus, .sp-select:focus, .sp-textarea:focus {
          border-color: #ff8fb1; background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }
        .sp-textarea { resize: vertical; min-height: 70px; }
        .sp-time-row { display: flex; gap: 12px; }
        .sp-type-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .sp-type-pill {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 999px;
          border: 1.5px solid; background: transparent;
          font-size: 12px; font-weight: 600;
          cursor: pointer; transition: 0.15s;
        }
        .sp-duration-preview {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; border-radius: 12px;
          border: 1px solid; font-size: 13px; color: #888;
        }
        .sp-error {
          background: #fde8e8; color: #c0392b;
          border-radius: 12px; padding: 10px 14px;
          font-size: 13px; margin: 0;
        }
        .sp-modal-actions { display: flex; gap: 10px; padding-top: 4px; }
        .sp-primary-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px;
          padding: 11px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .sp-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .sp-primary-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .sp-secondary-btn {
          border: none; background: #f4f4f4; color: #666;
          border-radius: 999px; padding: 11px 18px;
          font-size: 13px; font-weight: 600; cursor: pointer;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .sp-grid          { grid-template-columns: 1fr; }
          .sp-cal-grid      { grid-template-columns: repeat(3,1fr); }
          .sp-modal         { padding: 20px; }
          .sp-page-title    { font-size: 1.7rem; }
          .sp-time-row      { flex-direction: column; }
          .sp-shift-list    { max-height: 320px; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .sp-grid          { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="sp-page">
        <h2 className="sp-page-title">Shift Planner ✨</h2>
        

        <div className="sp-grid">
          {/* Full-width calendar */}
          {!loading && (
            <ShiftCalendar
              shifts={weekShifts}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
              currentWeek={currentWeek}
              onPrevWeek={prevWeek}
              onNextWeek={nextWeek}
            />
          )}

          {/* Shift history */}
          <AllShiftsList
            allShifts={allShifts}
            onEdit={openEdit}
            onDelete={handleDelete}
          />

          {/* Wellness */}
          <WellnessPanel weekShifts={weekShifts} />
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ShiftModal
          editing={editingShift}
          defaultDate={modalDate}
          onClose={() => { setShowModal(false); setEditingShift(null); setModalDate(''); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}