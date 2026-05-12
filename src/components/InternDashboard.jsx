import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  Microscope, CalendarDays, ClipboardCheck, GraduationCap,
  MapPin, User2, Clock, TrendingUp, Zap, BookOpen,
  Sunrise, Sun, Moon, Coffee, Sparkles, ChevronRight,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SHIFT_META = {
  morning:   { label: 'Morning',   color: '#ff8c5a', bg: '#fff5ee', icon: Sunrise  },
  afternoon: { label: 'Afternoon', color: '#5f8dff', bg: '#eff4ff', icon: Sun      },
  night:     { label: 'Night',     color: '#8b6fff', bg: '#f3f0ff', icon: Moon     },
  rest:      { label: 'Rest',      color: '#4abf95', bg: '#edfaf4', icon: Coffee   },
  exam:      { label: 'Exam',      color: '#e05555', bg: '#fff0f0', icon: BookOpen },
  other:     { label: 'Other',     color: '#aaa',    bg: '#f5f5f5', icon: Clock    },
};

const SECTION_META = {
  'Hematology':              { color: '#ff6f91', bg: '#fff0f4', light: '#fff8fb' },
  'Clinical Chemistry':      { color: '#ff8c5a', bg: '#fff5ee', light: '#fffaf7' },
  'Microbiology':            { color: '#5f8dff', bg: '#eff4ff', light: '#f7f9ff' },
  'Blood Bank':              { color: '#e05555', bg: '#fff0f0', light: '#fff8f8' },
  'Histopathology/Cytology': { color: '#4abf95', bg: '#edfaf4', light: '#f5fdf9' },
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return { text: 'Still up?',       emoji: '🌙' };
  if (h < 12) return { text: 'Good morning',    emoji: '☀️'  };
  if (h < 17) return { text: 'Good afternoon',  emoji: '🌤️' };
  if (h < 21) return { text: 'Good evening',    emoji: '🌇' };
  return             { text: 'Working late',    emoji: '⭐'  };
}

function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr + 'T12:00:00') - today) / 86400000);
}

function getUrgency(days) {
  if (days < 0)   return { color: '#4abf95', bg: '#edfaf4', label: `${Math.abs(days)}d ago`  };
  if (days === 0) return { color: '#e05555', bg: '#fff0f0', label: 'Today!'                   };
  if (days === 1) return { color: '#ff6f91', bg: '#fff0f4', label: 'Tomorrow'                 };
  if (days <= 3)  return { color: '#ff8c5a', bg: '#fff5ee', label: `In ${days} days`          };
  if (days <= 7)  return { color: '#5f8dff', bg: '#eff4ff', label: `In ${days} days`          };
  return                 { color: '#aaa',    bg: '#f5f5f5', label: `In ${days} days`          };
}

function formatTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatShiftDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const diff = daysUntil(dateStr);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/* ─────────────────────────────────────────────
   SVG PROGRESS RING
───────────────────────────────────────────── */
function ProgressRing({ pct, color, size = 80, strokeWidth = 7 }) {
  const r    = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#f0e6ea" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - Math.min(pct, 100) / 100)}
        style={{ transition: 'stroke-dashoffset 1.1s cubic-bezier(0.34,1.56,0.64,1)' }}
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   SHIMMER SKELETON
───────────────────────────────────────────── */
function Skeleton({ height = 16, width = '100%', radius = 10 }) {
  return (
    <div className="id-skeleton" style={{ height, width, borderRadius: radius }} />
  );
}

/* ─────────────────────────────────────────────
   DASHBOARD HEADER (greeting)
───────────────────────────────────────────── */
function DashboardHeader({ profile, daysInternship }) {
  const { text, emoji } = getGreeting();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Intern';
  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="id-header">
      <div className="id-header-left">
        <p className="id-header-date">{dateLabel}</p>
        <h1 className="id-greeting">
          {text}, <span className="id-greeting-name">{firstName}</span> {emoji}
        </h1>
        {daysInternship !== null && daysInternship >= 0 && (
          <p className="id-internship-day">
            <Zap size={12} className="id-zap-icon" />
            Day <strong>{daysInternship}</strong> of your internship — keep going! ✨
          </p>
        )}
      </div>
      <div className="id-header-badge">
        <Sparkles size={13} />
        <span>Internship Overview</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   CURRENT ROTATION CARD
───────────────────────────────────────────── */
function CurrentRotation() {
  const { user }   = useAuth();
  const [rotation, setRotation] = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('rotations').select('*').eq('user_id', user.id)
        .lte('start_date', today).gte('end_date', today).single();
      if (error && error.code !== 'PGRST116') console.error(error);
      setRotation(data ?? null);
      setLoading(false);
    };
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, [user.id]);

  const meta = SECTION_META[rotation?.section_name] ?? { color: '#ff6f91', bg: '#fff0f4', light: '#fff8fb' };

  /* Days remaining */
  const daysLeft = rotation
    ? Math.max(0, daysUntil(rotation.end_date))
    : null;

  return (
    <div className="id-card id-rotation-card" style={{ '--a': meta.color, '--ab': meta.bg }}>
      {/* Colored gradient header strip */}
      <div
        className="id-rotation-strip"
        style={{ background: `linear-gradient(135deg, ${meta.color}ee 0%, ${meta.color}99 100%)` }}
      >
        {/* Decorative circles */}
        <div className="id-strip-circle id-strip-circle-1" />
        <div className="id-strip-circle id-strip-circle-2" />

        <div className="id-strip-icon">
          <Microscope size={20} />
        </div>
        <div>
          <h3 className="id-strip-title">Current Rotation</h3>
          <p className="id-strip-sub">Active assignment</p>
        </div>
        {daysLeft !== null && (
          <div className="id-days-left-badge">
            {daysLeft}d left
          </div>
        )}
      </div>

      {/* Body */}
      <div className="id-card-body">
        {loading ? (
          <div className="id-skeleton-stack">
            <Skeleton height={22} width="55%" />
            <Skeleton height={16} width="35%" />
            <Skeleton height={14} width="75%" />
            <Skeleton height={14} width="60%" />
          </div>
        ) : !rotation ? (
          <div className="id-empty">
            <div className="id-empty-blob" style={{ background: meta.bg }}>🩺</div>
            <p className="id-empty-title">No active rotation</p>
            <p className="id-empty-hint">Manage in Rotation Guide</p>
          </div>
        ) : (
          <div className="id-rotation-body">
            {/* Section pill */}
            <span className="id-section-pill" style={{ background: meta.bg, color: meta.color }}>
              {rotation.section_name}
            </span>

            <div className="id-detail-stack">
              {rotation.hospital_site && (
                <div className="id-detail-row">
                  <MapPin size={12} style={{ color: meta.color, flexShrink: 0 }} />
                  <span>{rotation.hospital_site}</span>
                </div>
              )}
              <div className="id-detail-row">
                <CalendarDays size={12} style={{ color: meta.color, flexShrink: 0 }} />
                <span>
                  {new Date(rotation.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {' → '}
                  {new Date(rotation.end_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              {rotation.supervisor_name && (
                <div className="id-detail-row">
                  <User2 size={12} style={{ color: meta.color, flexShrink: 0 }} />
                  <span>{rotation.supervisor_name}</span>
                </div>
              )}
            </div>

            {rotation.notes && (
              <div className="id-notes-chip">
                📝 {rotation.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   UPCOMING SHIFTS CARD
───────────────────────────────────────────── */
function UpcomingShifts() {
  const { user } = useAuth();
  const [shifts,  setShifts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('shifts').select('*').eq('user_id', user.id)
        .gte('shift_date', today).order('shift_date', { ascending: true }).limit(5);
      if (error) console.error(error);
      else setShifts(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user.id]);

  return (
    <div className="id-card">
      {/* Header */}
      <div className="id-card-head">
        <div className="id-icon-wrap orange"><CalendarDays size={18} /></div>
        <div className="id-head-text">
          <h3 className="id-card-title">Upcoming Shifts</h3>
          <p className="id-card-sub">Your next duties</p>
        </div>
        {shifts.length > 0 && (
          <span className="id-badge-chip orange">{shifts.length} shift{shifts.length > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* Content */}
      <div className="id-card-body">
        {loading ? (
          <div className="id-skeleton-stack">
            {[64, 64, 64].map((h, i) => <Skeleton key={i} height={h} radius={16} />)}
          </div>
        ) : shifts.length === 0 ? (
          <div className="id-empty">
            <div className="id-empty-blob" style={{ background: '#fff5ee' }}>🌸</div>
            <p className="id-empty-title">No upcoming shifts</p>
            <p className="id-empty-hint">Add shifts in Shift Planner</p>
          </div>
        ) : (
          <div className="id-shift-list">
            {shifts.map((shift, idx) => {
              const meta  = SHIFT_META[shift.shift_type] ?? SHIFT_META.other;
              const Icon  = meta.icon;
              const today = formatShiftDate(shift.shift_date) === 'Today';

              return (
                <div
                  key={shift.id}
                  className={`id-shift-row ${today ? 'id-shift-today' : ''}`}
                  style={{
                    '--sc': meta.color,
                    '--sb': meta.bg,
                    animationDelay: `${idx * 70}ms`,
                  }}
                >
                  {/* Left accent bar */}
                  <div className="id-shift-bar" style={{ background: meta.color }} />

                  {/* Shift type icon */}
                  <div className="id-shift-icon" style={{ background: meta.bg, color: meta.color }}>
                    <Icon size={15} />
                  </div>

                  {/* Text */}
                  <div className="id-shift-text">
                    <div className="id-shift-top-row">
                      <strong style={{ color: today ? meta.color : '#333' }}>
                        {formatShiftDate(shift.shift_date)}
                      </strong>
                      <span className="id-shift-type-tag" style={{ background: meta.bg, color: meta.color }}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="id-shift-bottom-row">
                      <Clock size={10} style={{ flexShrink: 0 }} />
                      <span>{formatTime(shift.start_time)} — {formatTime(shift.end_time)}</span>
                      {shift.section_name && (
                        <span className="id-shift-section-name">· {shift.section_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXAM DATES CARD
───────────────────────────────────────────── */
function ExamDates() {
  const { user } = useAuth();
  const [exams,     setExams]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [examError, setExamError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('exams').select('*').eq('user_id', user.id)
        .order('exam_date', { ascending: true });
      if (error) {
        if (error?.code === 'PGRST205' || error?.message?.includes('Could not find')) {
          setExamError('Exams table missing — run supabase/schema.sql.');
        } else console.error(error);
      } else {
        setExams(data ?? []);
        setExamError(null);
      }
      setLoading(false);
    };
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, [user.id]);

  /* Show up to 4: upcoming first, then most-recent past */
  const displayed = useMemo(() => {
    const upcoming = exams.filter(e => daysUntil(e.exam_date) >= 0);
    const past     = exams.filter(e => daysUntil(e.exam_date) <  0).slice(-1);
    return [...upcoming, ...past].slice(0, 4);
  }, [exams]);

  const upcomingCount = exams.filter(e => daysUntil(e.exam_date) >= 0).length;

  return (
    <div className="id-card">
      <div className="id-card-head">
        <div className="id-icon-wrap blue"><GraduationCap size={18} /></div>
        <div className="id-head-text">
          <h3 className="id-card-title">Exam Dates</h3>
          <p className="id-card-sub">Stay prepared</p>
        </div>
        {upcomingCount > 0 && (
          <span className="id-badge-chip blue">{upcomingCount} upcoming</span>
        )}
      </div>

      <div className="id-card-body">
        {examError && <div className="id-error-chip">{examError}</div>}

        {loading ? (
          <div className="id-skeleton-stack">
            {[68, 68].map((h, i) => <Skeleton key={i} height={h} radius={18} />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="id-empty">
            <div className="id-empty-blob" style={{ background: '#eff4ff' }}>📅</div>
            <p className="id-empty-title">No exams scheduled</p>
            <p className="id-empty-hint">Add exams in Shift Planner</p>
          </div>
        ) : (
          <div className="id-exam-list">
            {displayed.map((exam, idx) => {
              const days    = daysUntil(exam.exam_date);
              const urg     = getUrgency(days);
              const isPast  = days < 0;
              const isToday = days === 0;
              const secMeta = SECTION_META[exam.section_name] ?? { color: '#ff8fb1', bg: '#fff0f4' };
              const d       = new Date(exam.exam_date + 'T12:00:00');

              return (
                <div
                  key={exam.id}
                  className={`id-exam-row ${isPast ? 'id-exam-past' : ''} ${isToday ? 'id-exam-today' : ''}`}
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  {/* Date stamp */}
                  <div
                    className="id-exam-stamp"
                    style={{
                      background: isPast
                        ? 'linear-gradient(135deg,#e8e8e8,#d5d5d5)'
                        : `linear-gradient(135deg, ${urg.color}dd, ${urg.color})`,
                    }}
                  >
                    <span className="id-stamp-day">{d.getDate()}</span>
                    <span className="id-stamp-month">
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="id-stamp-year">{d.getFullYear()}</span>
                  </div>

                  {/* Info */}
                  <div className="id-exam-info">
                    <strong className={`id-exam-name ${isPast ? 'id-exam-past-name' : ''}`}>
                      {exam.exam_name}
                    </strong>
                    {exam.section_name && (
                      <span className="id-exam-section" style={{ color: secMeta.color }}>
                        {exam.section_name}
                      </span>
                    )}
                    {exam.notes && (
                      <span className="id-exam-notes-preview">
                        {exam.notes.length > 50 ? exam.notes.slice(0, 50) + '…' : exam.notes}
                      </span>
                    )}
                  </div>

                  {/* Countdown pill */}
                  <div
                    className={`id-exam-pill ${isToday ? 'id-exam-pill-today' : ''}`}
                    style={{ background: urg.bg, color: urg.color }}
                  >
                    {isToday && <span className="id-pulse-dot" style={{ background: urg.color }} />}
                    {urg.label}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   OVERALL PROGRESS CARD
───────────────────────────────────────────── */
function OverallProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data, error } = await supabase
        .from('quotas').select('section_name, target_count, completed_count')
        .eq('user_id', user.id);
      if (error) { console.error(error); setLoading(false); return; }

      const grouped = {};
      (data ?? []).forEach(q => {
        if (!grouped[q.section_name]) grouped[q.section_name] = { total: 0, completed: 0 };
        grouped[q.section_name].total     += q.target_count;
        grouped[q.section_name].completed += q.completed_count;
      });
      setProgress(Object.entries(grouped));
      setLoading(false);
      // Trigger bar animations after mount
      setTimeout(() => setAnimated(true), 80);
    };
    fetch();
  }, [user.id]);

  const grandTotal     = progress.reduce((s, [, v]) => s + v.total, 0);
  const grandCompleted = progress.reduce((s, [, v]) => s + v.completed, 0);
  const grandPct       = grandTotal > 0 ? Math.min(100, Math.round((grandCompleted / grandTotal) * 100)) : 0;
  const doneCount      = progress.filter(([, v]) => v.total > 0 && v.completed >= v.total).length;

  return (
    <div className="id-card id-progress-card">
      <div className="id-card-head">
        <div className="id-icon-wrap green"><ClipboardCheck size={18} /></div>
        <div className="id-head-text">
          <h3 className="id-card-title">Overall Progress</h3>
          <p className="id-card-sub">Completion status</p>
        </div>
        {grandTotal > 0 && (
          <span className="id-badge-chip green">{grandPct}% done</span>
        )}
      </div>

      <div className="id-card-body">
        {loading ? (
          <div className="id-skeleton-stack">
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <Skeleton height={80} width={80} radius={40} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton height={20} width="40%" />
                <Skeleton height={14} width="60%" />
              </div>
            </div>
            {[1, 2, 3].map(i => <Skeleton key={i} height={32} radius={12} />)}
          </div>
        ) : progress.length === 0 ? (
          <div className="id-empty">
            <div className="id-empty-blob" style={{ background: '#edfaf4' }}>📊</div>
            <p className="id-empty-title">No quotas set yet</p>
            <p className="id-empty-hint">Set up quotas in Daily Reports</p>
          </div>
        ) : (
          <>
            {/* Grand total ring + numbers */}
            <div className="id-grand-row">
              <div className="id-ring-wrap">
                <ProgressRing pct={animated ? grandPct : 0} color="#ff6f91" size={84} />
                <div className="id-ring-center">
                  <span className="id-ring-pct">{grandPct}%</span>
                  <span className="id-ring-sub">done</span>
                </div>
              </div>
              <div className="id-grand-stats">
                <p className="id-grand-num">
                  {grandCompleted}
                  <span className="id-grand-total"> / {grandTotal}</span>
                </p>
                <p className="id-grand-label">total procedures</p>
                <div className="id-sections-done">
                  {doneCount > 0
                    ? `✅ ${doneCount} of ${progress.length} sections complete`
                    : `${progress.length} section${progress.length > 1 ? 's' : ''} in progress`}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="id-progress-divider" />

            {/* Per-section bars */}
            <div className="id-section-bars">
              {progress.map(([section, { total, completed }], idx) => {
                const pct  = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
                const meta = SECTION_META[section] ?? { color: '#ff6f91', bg: '#fff0f4' };
                const done = completed >= total && total > 0;

                return (
                  <div
                    key={section}
                    className="id-sec-bar-row"
                    style={{ animationDelay: `${idx * 90}ms` }}
                  >
                    <div className="id-sec-bar-head">
                      <div className="id-sec-dot" style={{ background: meta.color }} />
                      <span className="id-sec-name">{section}</span>
                      <span
                        className="id-sec-count"
                        style={{ color: done ? '#4abf95' : '#999' }}
                      >
                        {done ? '✅ ' : ''}{completed}/{total}
                      </span>
                    </div>
                    <div className="id-bar-track">
                      <div
                        className="id-bar-fill"
                        style={{
                          width:    animated ? `${pct}%` : '0%',
                          background: done
                            ? 'linear-gradient(90deg, #6dd6b1, #4abf95)'
                            : `linear-gradient(90deg, ${meta.color}99, ${meta.color})`,
                          transitionDelay: `${idx * 110}ms`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN DASHBOARD
───────────────────────────────────────────── */
function InternDashboard() {
  const { profile } = useAuth();

  const daysInternship = profile?.internship_start_date
    ? Math.max(0, Math.round(
        (new Date() - new Date(profile.internship_start_date + 'T12:00:00')) / 86400000
      ))
    : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap');

        /* ─── Base ─── */
        .intern-dashboard {
          width: 100%;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          flex-direction: column;
          gap: 28px;
        }

        /* ─── Greeting header ─── */
        .id-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
          animation: id-fade-up 0.5s ease both;
        }

        .id-header-left { display: flex; flex-direction: column; gap: 6px; }

        .id-header-date {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #c8a8b8;
          margin: 0;
        }

        .id-greeting {
          font-family: 'Sora', sans-serif;
          font-size: 2.1rem;
          font-weight: 700;
          color: #2a2a2a;
          margin: 0;
          line-height: 1.2;
          letter-spacing: -0.02em;
        }

        .id-greeting-name { color: #ff5d8f; }

        .id-internship-day {
          font-size: 13px;
          color: #aaa;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .id-internship-day strong { color: #ff6f91; }

        .id-zap-icon { color: #ffb300; }

        .id-header-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          border-radius: 999px;
          padding: 10px 20px;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.02em;
          box-shadow: 0 6px 20px rgba(255,111,145,0.32);
          flex-shrink: 0;
          white-space: nowrap;
          align-self: flex-start;
          margin-top: 4px;
        }

        /* ─── Grid ─── */
        .id-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        /* ─── Card ─── */
        .id-card {
          background: rgba(255,255,255,0.9);
          border-radius: 28px;
          border: 1px solid rgba(255,220,232,0.55);
          box-shadow:
            0 2px 12px rgba(255,111,145,0.05),
            0 6px 28px rgba(0,0,0,0.04),
            inset 0 1px 0 rgba(255,255,255,0.9);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: box-shadow 0.28s ease, transform 0.28s ease;
          animation: id-fade-up 0.5s ease both;
          backdrop-filter: blur(12px);
        }

        .id-card:hover {
          box-shadow:
            0 4px 20px rgba(255,111,145,0.12),
            0 12px 40px rgba(0,0,0,0.07),
            inset 0 1px 0 rgba(255,255,255,1);
          transform: translateY(-3px);
        }

        .id-card:nth-child(1) { animation-delay: 0.08s; }
        .id-card:nth-child(2) { animation-delay: 0.14s; }
        .id-card:nth-child(3) { animation-delay: 0.20s; }
        .id-card:nth-child(4) { animation-delay: 0.26s; }

        @keyframes id-fade-up {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* ─── Rotation strip ─── */
        .id-rotation-strip {
          position: relative;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 20px 22px;
          color: white;
          overflow: hidden;
          min-height: 88px;
        }

        /* Decorative blobs on strip */
        .id-strip-circle {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.12);
          pointer-events: none;
        }
        .id-strip-circle-1 { width: 100px; height: 100px; right: -20px; top: -30px; }
        .id-strip-circle-2 { width: 60px;  height: 60px;  right: 55px;  bottom: -20px; }

        .id-strip-icon {
          width: 44px; height: 44px;
          border-radius: 14px;
          background: rgba(255,255,255,0.22);
          backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }

        .id-strip-title {
          font-family: 'Sora', sans-serif;
          font-size: 1rem; font-weight: 700;
          margin: 0; color: white;
          position: relative; z-index: 1;
        }

        .id-strip-sub {
          font-size: 12px; opacity: 0.8;
          margin: 3px 0 0; color: white;
          position: relative; z-index: 1;
        }

        .id-days-left-badge {
          margin-left: auto;
          background: rgba(255,255,255,0.22);
          backdrop-filter: blur(8px);
          color: white;
          border-radius: 999px;
          padding: 5px 12px;
          font-size: 11px; font-weight: 700;
          flex-shrink: 0;
          position: relative; z-index: 1;
        }

        /* ─── Standard card header ─── */
        .id-card-head {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 22px 16px;
        }

        .id-icon-wrap {
          width: 44px; height: 44px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .id-icon-wrap.orange { background: linear-gradient(135deg,#ffb37a,#ff8c5a); box-shadow: 0 4px 12px rgba(255,140,90,0.3); }
        .id-icon-wrap.blue   { background: linear-gradient(135deg,#7ab6ff,#5f8dff); box-shadow: 0 4px 12px rgba(95,141,255,0.3); }
        .id-icon-wrap.green  { background: linear-gradient(135deg,#6dd6b1,#4abf95); box-shadow: 0 4px 12px rgba(74,191,149,0.3); }

        .id-head-text { flex: 1; min-width: 0; }

        .id-card-title {
          font-family: 'Sora', sans-serif;
          font-size: 0.95rem; font-weight: 700;
          margin: 0; color: #2a2a2a;
          letter-spacing: -0.01em;
        }

        .id-card-sub { font-size: 11px; color: #c0aab5; margin: 2px 0 0; }

        .id-badge-chip {
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 11px; font-weight: 700;
          white-space: nowrap; flex-shrink: 0;
        }
        .id-badge-chip.orange { background: #fff5ee; color: #ff8c5a; }
        .id-badge-chip.blue   { background: #eff4ff; color: #5f8dff; }
        .id-badge-chip.green  { background: #edfaf4; color: #4abf95; }

        /* ─── Card body ─── */
        .id-card-body { padding: 0 22px 22px; flex: 1; }

        /* ─── Skeleton ─── */
        .id-skeleton-stack { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }

        .id-skeleton {
          background: linear-gradient(90deg, #f8f0f4 25%, #fde8ef 50%, #f8f0f4 75%);
          background-size: 200% 100%;
          animation: id-shimmer 1.6s ease-in-out infinite;
        }

        @keyframes id-shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ─── Empty state ─── */
        .id-empty {
          display: flex; flex-direction: column;
          align-items: center; gap: 6px;
          padding: 30px 0 10px;
          text-align: center;
        }

        .id-empty-blob {
          width: 54px; height: 54px;
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; margin-bottom: 4px;
        }

        .id-empty-title { font-size: 14px; font-weight: 600; color: #bbb; margin: 0; }
        .id-empty-hint  { font-size: 12px; color: #ddd; margin: 0; }

        /* ─── Error ─── */
        .id-error-chip {
          background: #fff0f0; color: #c0392b;
          border: 1px solid #ffd0d0;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 12px; margin-bottom: 12px;
        }

        /* ─── Rotation details ─── */
        .id-rotation-body { display: flex; flex-direction: column; gap: 14px; padding-top: 4px; }

        .id-section-pill {
          display: inline-block;
          border-radius: 999px;
          padding: 7px 16px;
          font-size: 13px; font-weight: 700;
          letter-spacing: 0.01em;
        }

        .id-detail-stack { display: flex; flex-direction: column; gap: 9px; }

        .id-detail-row {
          display: flex; align-items: center; gap: 9px;
          font-size: 13px; color: #555; line-height: 1.4;
        }

        .id-notes-chip {
          background: #fff8fa;
          border: 1px solid #ffe8f0;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 12px; color: #999; line-height: 1.55;
        }

        /* ─── Shifts ─── */
        .id-shift-list { display: flex; flex-direction: column; gap: 9px; padding-top: 4px; }

        .id-shift-row {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff8fb;
          border-radius: 18px;
          border: 1.5px solid #ffe4ee;
          padding: 11px 14px 11px 0;
          overflow: hidden;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          animation: id-row-in 0.35s ease both;
        }

        .id-shift-row:hover {
          border-color: var(--sc);
          box-shadow: 0 4px 14px rgba(0,0,0,0.05);
          transform: translateX(2px);
        }

        .id-shift-today {
          background: var(--sb);
          border-color: var(--sc);
        }

        @keyframes id-row-in {
          from { opacity: 0; transform: translateX(-10px); }
          to   { opacity: 1; transform: translateX(0);     }
        }

        .id-shift-bar {
          width: 4px;
          align-self: stretch;
          flex-shrink: 0;
          border-radius: 0 3px 3px 0;
        }

        .id-shift-icon {
          width: 36px; height: 36px;
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .id-shift-text { flex: 1; min-width: 0; }

        .id-shift-top-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 3px;
        }

        .id-shift-top-row strong { font-size: 13px; font-weight: 600; }

        .id-shift-type-tag {
          font-size: 10px; font-weight: 700;
          border-radius: 999px; padding: 2px 8px;
          letter-spacing: 0.02em;
        }

        .id-shift-bottom-row {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #b0a0a8;
        }

        .id-shift-section-name { color: #d0c0c8; }

        /* ─── Exams ─── */
        .id-exam-list { display: flex; flex-direction: column; gap: 10px; padding-top: 4px; }

        .id-exam-row {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff8fb;
          border-radius: 20px;
          border: 1.5px solid #ffe4ee;
          padding: 12px 14px;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
          animation: id-row-in 0.35s ease both;
        }

        .id-exam-row:hover {
          border-color: #ffb8ce;
          box-shadow: 0 4px 16px rgba(255,111,145,0.09);
          transform: translateY(-1px);
        }

        .id-exam-past { opacity: 0.5; }

        .id-exam-today {
          border-color: #e05555;
          animation: id-row-in 0.35s ease both, id-exam-glow 2.5s ease-in-out 0.6s infinite;
        }

        @keyframes id-exam-glow {
          0%,100% { box-shadow: 0 0 0 0 rgba(224,85,85,0);    }
          50%      { box-shadow: 0 0 0 6px rgba(224,85,85,0.13); }
        }

        .id-exam-stamp {
          width: 54px; height: 58px;
          border-radius: 16px;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 0;
          flex-shrink: 0;
          color: white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }

        .id-stamp-day {
          font-family: 'Sora', sans-serif;
          font-size: 20px; font-weight: 800;
          line-height: 1; letter-spacing: -0.02em;
          color: #e05555
        }

        .id-stamp-month {
          font-size: 9px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.1em;
          opacity: 0.88; margin-top: 1px;
          color: #e05555
        }

        .id-stamp-year {
          font-size: 9px; opacity: 0.7;
          margin-top: 1px; font-weight: 500;
        }

        .id-exam-info {
          flex: 1; min-width: 0;
          display: flex; flex-direction: column; gap: 3px;
        }

        .id-exam-name {
          font-size: 13px; font-weight: 700; color: #2a2a2a;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }

        .id-exam-past-name { text-decoration: line-through; color: #bbb; }

        .id-exam-section {
          font-size: 11px; font-weight: 600;
        }

        .id-exam-notes-preview {
          font-size: 11px; color: #c0aab8;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
          font-style: italic;
        }

        .id-exam-pill {
          border-radius: 999px;
          padding: 5px 10px;
          font-size: 10px; font-weight: 700;
          white-space: nowrap; flex-shrink: 0;
          display: flex; align-items: center; gap: 5px;
          letter-spacing: 0.02em;
        }

        .id-exam-pill-today { animation: id-pill-pop 1.8s ease-in-out infinite; }

        @keyframes id-pill-pop {
          0%,100% { transform: scale(1); }
          50%      { transform: scale(1.05); }
        }

        .id-pulse-dot {
          width: 6px; height: 6px;
          border-radius: 50%; flex-shrink: 0;
          animation: id-dot-pulse 1.3s ease-in-out infinite;
        }

        @keyframes id-dot-pulse {
          0%,100% { opacity: 1; transform: scale(1);   }
          50%      { opacity: 0.4; transform: scale(1.5); }
        }

        /* ─── Progress ─── */
        .id-progress-card .id-card-head { padding-bottom: 14px; }

        .id-grand-row {
          display: flex;
          align-items: center;
          gap: 18px;
          padding-bottom: 18px;
        }

        .id-ring-wrap {
          position: relative;
          width: 84px; height: 84px;
          flex-shrink: 0;
        }

        .id-ring-center {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
        }

        .id-ring-pct {
          font-family: 'Sora', sans-serif;
          font-size: 16px; font-weight: 800;
          color: #ff5d8f; line-height: 1;
        }

        .id-ring-sub { font-size: 10px; color: #c8a8b8; margin-top: 2px; }

        .id-grand-stats { flex: 1; }

        .id-grand-num {
          font-family: 'Sora', sans-serif;
          font-size: 24px; font-weight: 700;
          color: #2a2a2a; margin: 0 0 2px;
          letter-spacing: -0.02em;
        }

        .id-grand-total { font-size: 15px; color: #d0c0c8; font-weight: 400; }

        .id-grand-label { font-size: 11px; color: #c0aab5; margin: 0 0 8px; }

        .id-sections-done {
          font-size: 11px; font-weight: 600;
          color: #4abf95;
          background: #edfaf4;
          border-radius: 999px;
          padding: 4px 10px;
          display: inline-block;
        }

        .id-progress-divider {
          height: 1px;
          background: linear-gradient(90deg, #ffe4ee, #f5e0ea, #ffe4ee);
          margin-bottom: 16px;
        }

        .id-section-bars { display: flex; flex-direction: column; gap: 13px; }

        .id-sec-bar-row { animation: id-row-in 0.35s ease both; }

        .id-sec-bar-head {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 7px;
        }

        .id-sec-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }

        .id-sec-name { font-size: 12px; font-weight: 600; color: #555; flex: 1; }

        .id-sec-count { font-size: 11px; font-weight: 700; }

        .id-bar-track {
          height: 7px;
          background: #f3dbe3;
          border-radius: 999px;
          overflow: hidden;
        }

        .id-bar-fill {
          height: 100%;
          border-radius: 999px;
          transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        /* ─── Responsive: iPhone (< 768px) ─── */
        @media (max-width: 767px) {
          .intern-dashboard { gap: 20px; }
          .id-greeting       { font-size: 1.6rem; }
          .id-header-badge   { display: none; }
          .id-grid           { grid-template-columns: 1fr; gap: 14px; }
          .id-card           { border-radius: 22px; }
          .id-rotation-strip { padding: 16px 18px; min-height: 72px; }
          .id-card-head      { padding: 16px 18px 12px; }
          .id-card-body      { padding: 0 18px 18px; }
          .id-grand-row      { gap: 14px; }
          .id-grand-num      { font-size: 20px; }
          .id-ring-pct       { font-size: 14px; }
          .id-exam-stamp     { width: 48px; height: 52px; }
          .id-stamp-day      { font-size: 17px; }
          .id-strip-circle-1 { width: 70px; height: 70px; }
          .id-strip-circle-2 { width: 40px; height: 40px; }
        }

        /* ─── Responsive: iPad portrait (768–1023px) ─── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .id-grid           { grid-template-columns: 1fr; gap: 18px; }
          .id-greeting       { font-size: 1.85rem; }
        }

        /* ─── Responsive: iPad landscape + desktop (1024px+) ─── */
        @media (min-width: 1024px) {
          .id-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="intern-dashboard">
        <DashboardHeader profile={profile} daysInternship={daysInternship} />

        <div className="id-grid">
          <CurrentRotation />
          <UpcomingShifts />
          <ExamDates />
          <OverallProgress />
        </div>
      </div>
    </>
  );
}

export default InternDashboard; 