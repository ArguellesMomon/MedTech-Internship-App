import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useLocation } from 'react-router-dom'
import {
  CalendarDays, Plus, Heart, Clock, ChevronLeft, ChevronRight,
  Edit3, Trash2, X, Check, Sunrise, Sun, Moon, Coffee, BookOpen,
  HelpCircle, BarChart2, Droplets, Timer, Filter, AlertCircle,
  GraduationCap, Search, ArrowUpDown, Copy, CheckCircle2,
  Zap, FileText, ChevronDown, ChevronUp, Calendar,
  Brain, Target, Flame, Settings2, Sparkles,
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
  'Hematology', 'Clinical Chemistry', 'Microbiology',
  'Blood Bank', 'Histopathology/Cytology',
];

const SECTION_META = {
  'Hematology':              { color: '#ff6f91', bg: '#fff0f4' },
  'Clinical Chemistry':      { color: '#ff8c5a', bg: '#fff5ee' },
  'Microbiology':            { color: '#5f8dff', bg: '#eff4ff' },
  'Blood Bank':              { color: '#e05555', bg: '#fff0f0' },
  'Histopathology/Cytology': { color: '#4abf95', bg: '#edfaf4' },
};

const SECTION_STORAGE_KEY = 'shift_planner.sections';
const DEFAULT_SECTION_LIST = SECTIONS.map(id => ({ id, ...SECTION_META[id] }));
const SECTION_COLOR_PRESETS = [
  '#ff6f91', '#ff8c5a', '#5f8dff', '#e05555', '#4abf95',
  '#8b6fff', '#26c6da', '#f6b45f', '#b071ec', '#54c58e',
];

const STUDY_GOAL_STORAGE_KEY = 'shift_planner.study_goal_mins';
const DAYS_SHORT  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GOAL_PRESETS = [30, 60, 90, 120, 180, 240];

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

const STUDY_TIPS = [
  { emoji: '📚', tip: 'Start reviewing 3–5 days before the exam. Cramming the night before rarely sticks.' },
  { emoji: '🧠', tip: 'Use active recall: close your notes and retrieve key concepts from memory.' },
  { emoji: '😴', tip: 'Get 8 hours of sleep the night before — memory consolidation happens while you sleep.' },
  { emoji: '✍️', tip: 'Write practice questions for yourself. If you can teach it, you truly know it.' },
  { emoji: '🍳', tip: 'Eat a protein-rich meal before your exam. Avoid heavy carbs that cause energy crashes.' },
  { emoji: '⏰', tip: 'Arrive 15 minutes early to settle nerves and do a final calm review.' },
  { emoji: '🎯', tip: 'Focus on understanding concepts, not memorizing. Lab values will follow naturally.' },
  { emoji: '💧', tip: 'Stay hydrated during study sessions — even mild dehydration cuts focus by 20%.' },
  { emoji: '🔄', tip: 'Space your review: 1 day, 3 days, and 7 days before the exam for best retention.' },
  { emoji: '🧘', tip: 'Take 5-minute breaks every 25 minutes (Pomodoro) to maintain peak concentration.' },
  { emoji: '🖊️', tip: 'Rewrite your notes by hand — motor memory reinforces what your eyes read.' },
  { emoji: '👥', tip: 'Teach a concept to a classmate. The act of explaining reveals gaps in your knowledge.' },
];

/* ─────────────────────────────────────────────
   HELPERS  (unchanged)
───────────────────────────────────────────── */
function toDateStr(d) {
  const year  = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day   = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

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
  const color = SECTION_COLOR_PRESETS[Math.abs(hash) % SECTION_COLOR_PRESETS.length];
  return { color, bg: colorToSoftBg(color) };
}

function normalizeSections(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return DEFAULT_SECTION_LIST;
  const seen = new Set();
  return saved.reduce((list, section) => {
    const id = typeof section?.id === 'string' ? section.id.trim() : '';
    if (!id || seen.has(id.toLowerCase())) return list;
    const meta  = SECTION_META[id] ?? generateSectionMeta(id);
    const color = section.color || meta.color;
    seen.add(id.toLowerCase());
    list.push({ id, color, bg: section.bg || colorToSoftBg(color) });
    return list;
  }, []);
}

function isToday(dateStr) { return dateStr === toDateStr(new Date()); }

function calcDuration(start, end) {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60); const m = mins % 60;
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
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatDateLong(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [y, m, d] = dateStr.split('-').map(Number);
  return Math.round((new Date(y, m - 1, d) - today) / 86400000);
}

function getUrgency(days) {
  if (days < 0)   return { level: 'past',   borderColor: '#e0e0e0', badgeBg: '#f5f5f5', badgeColor: '#bbb',    icon: '✅', label: `${Math.abs(days)}d ago` };
  if (days === 0) return { level: 'today',  borderColor: '#e05555', badgeBg: '#fff0f0', badgeColor: '#e05555', icon: '🔥', label: 'Today!'    };
  if (days === 1) return { level: 'urgent', borderColor: '#ff6f91', badgeBg: '#fff0f4', badgeColor: '#ff5d8f', icon: '⚡', label: 'Tomorrow'  };
  if (days <= 3)  return { level: 'urgent', borderColor: '#ff8c5a', badgeBg: '#fff5ee', badgeColor: '#ff8c5a', icon: '⚠️', label: `In ${days} days` };
  if (days <= 7)  return { level: 'soon',   borderColor: '#5f8dff', badgeBg: '#eff4ff', badgeColor: '#5f8dff', icon: '📅', label: `In ${days} days` };
  return            { level: 'normal',       borderColor: '#ffe0ea', badgeBg: '#fff8fb', badgeColor: '#ff8fb1', icon: '📚', label: `In ${days} days` };
}

function getWeekStart(d) {
  const s = new Date(d); s.setDate(d.getDate() - d.getDay()); s.setHours(0, 0, 0, 0); return s;
}

function getWeekLabel(weekStart) {
  const end = new Date(weekStart); end.setDate(weekStart.getDate() + 6);
  const opts = { month: 'short', day: 'numeric' };
  return `${weekStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

function isMissingTableError(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205' ||
    error?.message?.includes('schema cache') || error?.message?.includes('does not exist') ||
    error?.message?.includes('Could not find the table');
}

/* ─────────────────────────────────────────────
   SHARED MODAL STYLES  (injected once)
───────────────────────────────────────────── */
const MODAL_STYLES = `
  /* ═══════════════════════════════════════════
     SHARED BOTTOM-SHEET / CENTERED MODAL BASE
     Mirrors NoteSection modal pattern exactly
  ═══════════════════════════════════════════ */

  /* Overlay */
  .m-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.30);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1100;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
  }

  /* Sheet — slides up from bottom on all sizes */
  .m-sheet {
    background: #fff;
    width: 100%;
    max-width: 620px;
    border-radius: 28px 28px 0 0;
    box-shadow: 0 -12px 60px rgba(0,0,0,0.16), 0 -2px 0 rgba(255,200,220,0.3);
    max-height: 94vh;
    display: flex;
    flex-direction: column;
    animation: m-rise 0.32s cubic-bezier(0.34, 1.18, 0.64, 1) both;
    overflow: hidden;
  }

  @keyframes m-rise {
    from { transform: translateY(72px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }

  /* On tablets/desktop: center it like NoteSection does */
  @media (min-width: 640px) {
    .m-overlay {
      align-items: center;
      padding: 24px;
    }
    .m-sheet {
      border-radius: 28px;
      max-height: 88vh;
    }
  }

  /* Drag pill */
  .m-drag-pill {
    width: 36px; height: 4px;
    background: rgba(255,255,255,0.45);
    border-radius: 999px;
    margin: 0 auto;
    flex-shrink: 0;
    position: absolute;
    top: 10px; left: 50%;
    transform: translateX(-50%);
  }
  @media (min-width: 640px) { .m-drag-pill { display: none; } }

  /* Gradient header */
  .m-header {
    display: flex; align-items: center;
    justify-content: space-between;
    padding: 22px 22px 20px;
    gap: 12px;
    flex-shrink: 0;
    position: relative;
  }

  .m-header-left {
    display: flex; align-items: center; gap: 12px;
  }

  .m-header-icon {
    width: 36px; height: 36px;
    border-radius: 12px;
    background: rgba(255,255,255,0.22);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .m-header-title {
    font-family: 'DM Sans', sans-serif;
    font-size: 1.05rem; font-weight: 800;
    color: white; margin: 0; line-height: 1.2;
  }

  .m-header-sub {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px; color: rgba(255,255,255,0.72);
    margin: 2px 0 0; font-weight: 500;
  }

  .m-close-btn {
    width: 34px; height: 34px;
    border: none; border-radius: 11px;
    background: rgba(255,255,255,0.18);
    color: white; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background 0.18s; flex-shrink: 0;
  }
  .m-close-btn:hover { background: rgba(255,255,255,0.30); }

  /* Scrollable body */
  .m-body {
    flex: 1; overflow-y: auto;
    padding: 22px;
    display: flex; flex-direction: column; gap: 18px;
    overscroll-behavior: contain;
  }
  .m-body::-webkit-scrollbar { width: 4px; }
  .m-body::-webkit-scrollbar-track { background: transparent; }
  .m-body::-webkit-scrollbar-thumb { background: #ffd6e1; border-radius: 4px; }

  /* Field label */
  .m-label {
    display: flex; flex-direction: column; gap: 8px;
    font-size: 11px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.09em;
    color: #c8b0a8; margin: 0;
  }

  /* Text input */
  .m-input {
    border: 1.5px solid rgba(255,200,220,0.6);
    background: #fff8fa; border-radius: 14px;
    padding: 13px 15px; font-size: 15px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    color: #1c1412; font-family: 'DM Sans', sans-serif;
    width: 100%; box-sizing: border-box;
  }
  .m-input:focus {
    border-color: var(--m-accent, #ff8fb1);
    background: white;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--m-accent, #ff8fb1) 18%, transparent);
  }

  /* Textarea */
  .m-textarea {
    border: 1.5px solid rgba(255,200,220,0.6);
    background: #fff8fa; border-radius: 14px;
    padding: 13px 15px; font-size: 14px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    color: #444; resize: vertical; min-height: 90px;
    font-family: 'DM Sans', sans-serif; line-height: 1.7;
    width: 100%; box-sizing: border-box;
  }
  .m-textarea:focus {
    border-color: var(--m-accent, #ff8fb1);
    background: white;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--m-accent, #ff8fb1) 18%, transparent);
  }

  /* Pill row */
  .m-pills { display: flex; flex-wrap: wrap; gap: 8px; }

  .m-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 999px;
    border: 1.5px solid; background: transparent;
    font-size: 12px; font-weight: 700;
    cursor: pointer; transition: all 0.18s;
    font-family: 'DM Sans', sans-serif;
    white-space: nowrap;
  }
  .m-pill.active {
    box-shadow: 0 4px 14px color-mix(in srgb, var(--pill-color, #ff6f91) 30%, transparent);
  }

  /* Duration preview chip */
  .m-duration-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-radius: 14px;
    background: var(--m-bg, #fff5ee);
    border: 1.5px solid color-mix(in srgb, var(--m-accent, #ff8c5a) 25%, transparent);
    font-size: 13px; color: var(--m-accent, #ff8c5a); font-weight: 600;
    align-self: flex-start;
  }

  /* 2-col time row */
  .m-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  /* Error */
  .m-err {
    background: #fde8e8; color: #c0392b;
    border-radius: 12px; padding: 10px 14px;
    font-size: 13px; margin: 0;
  }

  /* Action buttons */
  .m-actions { display: flex; gap: 10px; padding-top: 4px; padding-bottom: 8px; }

  .m-submit {
    display: inline-flex; align-items: center; gap: 7px;
    border: none; color: white; border-radius: 999px;
    padding: 13px 24px; font-size: 14px; font-weight: 700;
    cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
    font-family: 'DM Sans', sans-serif; flex: 1;
    justify-content: center;
  }
  .m-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(255,111,145,0.32);
  }
  .m-submit:disabled { opacity: 0.6; cursor: not-allowed; }

  .m-cancel {
    border: none; background: #f0ecea; color: #888;
    border-radius: 999px; padding: 13px 20px;
    font-size: 14px; font-weight: 600;
    cursor: pointer; font-family: 'DM Sans', sans-serif;
    transition: background 0.2s;
  }
  .m-cancel:hover { background: #e8e2e4; }

  /* Select field */
  .m-select {
    border: 1.5px solid rgba(255,200,220,0.6);
    background: #fff8fa; border-radius: 14px;
    padding: 13px 15px; font-size: 15px;
    outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    color: #444; font-family: 'DM Sans', sans-serif;
    width: 100%; box-sizing: border-box; cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23c8b0a8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 14px center;
    padding-right: 36px;
  }
  .m-select:focus {
    border-color: var(--m-accent, #ff8fb1);
    background-color: white;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--m-accent, #ff8fb1) 18%, transparent);
  }

  /* Divider */
  .m-divider {
    height: 1px;
    background: rgba(255,200,220,0.3);
    margin: 2px 0;
  }

  /* ══ Exam modal countdown preview ══ */
  .m-countdown {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 16px;
    border: 1.5px solid; flex-wrap: wrap;
  }
  .m-countdown-icon { font-size: 20px; line-height: 1; }

  /* ══ Manage Sections Modal ══ */
  .msm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.30);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 1100;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
  }
  .msm-modal {
    background: white; border-radius: 28px; padding: 26px;
    width: 100%; max-width: 460px;
    box-shadow: 0 24px 60px rgba(0,0,0,0.14);
    border: 1px solid rgba(255,200,220,0.4);
    max-height: 90vh; overflow-y: auto;
    display: flex; flex-direction: column; gap: 22px;
    animation: m-rise 0.28s ease both;
  }
  .msm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
  .msm-head-left { display: flex; align-items: center; gap: 12px; }
  .msm-head-icon { width: 40px; height: 40px; border-radius: 14px; background: linear-gradient(135deg,#ff8fb1,#ff6f91); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
  .msm-title  { margin: 0 0 3px; font-size: 1.05rem; font-weight: 700; color: #1c1412; }
  .msm-sub    { margin: 0; font-size: 12px; color: #bbb; }
  .msm-close  { border: none; background: #f4f0f2; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; flex-shrink: 0; }
  .msm-close:hover { background: #ffe4ec; color: #ff5d8f; }
  .msm-box-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #c8b0a8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .msm-count { display: inline-flex; align-items: center; justify-content: center; background: #fff0f4; color: #ff6f91; border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
  .msm-add-box { background: #fff8fa; border: 1px solid rgba(255,200,220,0.4); border-radius: 18px; padding: 18px; }
  .msm-add-row { display: flex; gap: 10px; align-items: center; }
  .msm-input { flex: 1 1 auto; min-width: 0; border: 1.5px solid rgba(255,200,220,0.6); background: white; border-radius: 12px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; font-family: inherit; }
  .msm-input:focus { border-color: #ff8fb1; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
  .msm-add-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit; }
  .msm-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,111,145,0.25); }
  .msm-error { background: #fde8e8; color: #c0392b; border-radius: 10px; padding: 8px 12px; font-size: 12px; margin-top: 10px; }
  .msm-empty { text-align: center; padding: 24px 16px; background: #fff8fa; border-radius: 16px; border: 1px dashed rgba(255,200,220,0.5); display: flex; flex-direction: column; align-items: center; gap: 6px; color: #bbb; font-size: 13px; }
  .msm-list { display: flex; flex-direction: column; gap: 8px; }
  .msm-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1.5px solid rgba(255,200,220,0.4); background: #fff8fa; transition: 0.2s; }
  .msm-row:hover { border-color: #ffb8ce; background: white; }
  .msm-row-rem { border-color: #ffd0d0; background: #fff5f5; }
  .msm-row-main { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
  .msm-sec-pill { display: inline-flex; align-items: center; gap: 7px; min-width: 0; max-width: 100%; border: 1.5px solid; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .msm-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .msm-color-ctrl { width: 30px; height: 30px; border: 1.5px solid rgba(255,200,220,0.5); background: white; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; position: relative; overflow: hidden; }
  .msm-color-ctrl input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
  .msm-color-swatch { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); }
  .msm-rm-btn { display: inline-flex; align-items: center; gap: 5px; border: 1.5px solid rgba(255,200,220,0.5); background: white; color: #aaa; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; flex-shrink: 0; white-space: nowrap; }
  .msm-rm-btn:hover { border-color: #ffd0d0; background: #fde8e8; color: #e05555; }
  .msm-confirm { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #888; flex-shrink: 0; font-weight: 600; white-space: nowrap; }
  .msm-yes { border: none; background: linear-gradient(135deg,#ff8f8f,#e05555); color: white; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .msm-no  { border: none; background: #f0f0f0; color: #888; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
  .msm-note { display: flex; align-items: flex-start; gap: 8px; background: #fff8fa; border: 1px solid rgba(255,200,220,0.4); border-radius: 14px; padding: 12px 14px; font-size: 12px; color: #bbb; line-height: 1.6; }
`;

/* ─────────────────────────────────────────────
   SHIFT MODAL  ← completely redesigned
───────────────────────────────────────────── */
function ShiftModal({ editing, defaultDate, onClose, onSaved, sections }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name: editing?.section_name ?? sections[0]?.id ?? '',
    shift_date:   editing?.shift_date   ?? defaultDate ?? toDateStr(new Date()),
    start_time:   editing?.start_time   ?? '07:00',
    end_time:     editing?.end_time     ?? '15:00',
    shift_type:   editing?.shift_type   ?? 'morning',
    notes:        editing?.notes        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const meta       = SHIFT_TYPES[form.shift_type] ?? SHIFT_TYPES.other;
  const ShiftIcon  = meta.icon;
  const accentColor = meta.color;
  const accentBg    = meta.bg;
  const duration   = calcDuration(form.start_time, form.end_time);

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    let result;
    if (editing) {
      result = await supabase.from('shifts')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('shifts')
        .insert([{ ...form, user_id: user.id }]).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="m-overlay" onClick={onClose}>
      <style>{MODAL_STYLES}</style>
      <div
        className="m-sheet"
        style={{ '--m-accent': accentColor, '--m-bg': accentBg }}
        onClick={e => e.stopPropagation()}
      >
        <div className="m-drag-pill" />

        {/* Gradient header */}
        <div
          className="m-header"
          style={{ background: `linear-gradient(135deg, ${accentColor}d0, ${accentColor})` }}
        >
          <div className="m-header-left">
            <div className="m-header-icon">
              <ShiftIcon size={17} color="white" />
            </div>
            <div>
              <p className="m-header-title">{editing ? 'Edit Shift' : 'New Shift'}</p>
              <p className="m-header-sub">{meta.label} · {form.shift_date ? formatDateFull(form.shift_date) : 'Pick a date'}</p>
            </div>
          </div>
          <button className="m-close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="m-body">

          {/* Shift type pills */}
          <div>
            <p className="m-label" style={{ marginBottom: 10 }}>Shift Type</p>
            <div className="m-pills">
              {Object.entries(SHIFT_TYPES).map(([key, val]) => {
                const TIcon = val.icon;
                const on = form.shift_type === key;
                return (
                  <button key={key} type="button"
                    className={`m-pill ${on ? 'active' : ''}`}
                    style={on
                      ? { background: val.color, borderColor: val.color, color: '#fff', '--pill-color': val.color }
                      : { borderColor: val.color + '66', color: val.color }}
                    onClick={() => setForm({ ...form, shift_type: key })}>
                    <TIcon size={13} />
                    {val.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="m-divider" />

          {/* Section */}
          <label className="m-label">
            Section
            <select
              className="m-select"
              value={form.section_name}
              onChange={e => setForm({ ...form, section_name: e.target.value })}>
              {sections.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
            </select>
          </label>

          {/* Date */}
          <label className="m-label">
            Date *
            <input type="date" className="m-input" value={form.shift_date}
              onChange={e => setForm({ ...form, shift_date: e.target.value })} required />
          </label>

          {/* Times */}
          <div className="m-time-row">
            <label className="m-label">
              Start Time *
              <input type="time" className="m-input" value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })} required />
            </label>
            <label className="m-label">
              End Time *
              <input type="time" className="m-input" value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })} required />
            </label>
          </div>

          {/* Duration chip */}
          {duration && (
            <div className="m-duration-chip">
              <Timer size={14} />
              <span>Duration: <strong>{duration}</strong></span>
            </div>
          )}

          {/* Notes */}
          <label className="m-label">
            Notes
            <textarea className="m-textarea" rows={3}
              placeholder="Any reminders, preparations, or notes…"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>

          {error && <p className="m-err">{error}</p>}

          <div className="m-actions">
            <button type="submit" className="m-submit"
              style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}
              disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Shift' : 'Add Shift'}
            </button>
            <button type="button" className="m-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EXAM MODAL  ← completely redesigned
───────────────────────────────────────────── */
function ExamModal({ editing, defaultDate, onClose, onSaved, sections, sectionMap }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    exam_name:    editing?.exam_name    ?? '',
    exam_date:    editing?.exam_date    ?? defaultDate ?? toDateStr(new Date()),
    section_name: editing?.section_name ?? sections[0]?.id ?? '',
    notes:        editing?.notes        ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const days        = form.exam_date ? daysUntil(form.exam_date) : null;
  const urgency     = days !== null ? getUrgency(days) : null;
  const sectionMeta = sectionMap[form.section_name] ?? { color: '#5f8dff', bg: '#eff4ff' };
  const accentColor = sectionMeta.color;
  const accentBg    = sectionMeta.bg;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.exam_name.trim()) { setError('Exam name is required.'); return; }
    setSaving(true); setError('');
    let result;
    if (editing) {
      result = await supabase.from('exams')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('exams')
        .insert([{ ...form, user_id: user.id }]).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="m-overlay" onClick={onClose}>
      <style>{MODAL_STYLES}</style>
      <div
        className="m-sheet"
        style={{ '--m-accent': accentColor, '--m-bg': accentBg }}
        onClick={e => e.stopPropagation()}
      >
        <div className="m-drag-pill" />

        {/* Gradient header */}
        <div
          className="m-header"
          style={{ background: `linear-gradient(135deg, ${accentColor}d0, ${accentColor})` }}
        >
          <div className="m-header-left">
            <div className="m-header-icon">
              <GraduationCap size={17} color="white" />
            </div>
            <div>
              <p className="m-header-title">{editing ? 'Edit Exam' : 'Add Exam Date'}</p>
              <p className="m-header-sub">
                {form.exam_date
                  ? urgency ? `${urgency.icon} ${urgency.label}` : 'Pick a date'
                  : 'Track your upcoming assessment'}
              </p>
            </div>
          </div>
          <button className="m-close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="m-body">

          {/* Countdown preview */}
          {form.exam_date && urgency && (
            <div className="m-countdown"
              style={{ background: urgency.badgeBg, borderColor: urgency.borderColor + '55' }}>
              <span className="m-countdown-icon">{urgency.icon}</span>
              <span style={{ color: urgency.badgeColor, fontWeight: 700, fontSize: 13 }}>{urgency.label}</span>
              <span style={{ color: '#aaa', fontSize: 12 }}>— {formatDateLong(form.exam_date)}</span>
            </div>
          )}

          {/* Exam name */}
          <label className="m-label">
            Exam Name *
            <input className="m-input" required maxLength={120}
              placeholder="e.g. Hematology Midterm Exam"
              value={form.exam_name}
              onChange={e => setForm({ ...form, exam_name: e.target.value })} />
          </label>

          {/* Exam date */}
          <label className="m-label">
            Exam Date *
            <input type="date" className="m-input" value={form.exam_date} required
              onChange={e => setForm({ ...form, exam_date: e.target.value })} />
          </label>

          <div className="m-divider" />

          {/* Section pills */}
          <div>
            <p className="m-label" style={{ marginBottom: 10 }}>Section</p>
            <div className="m-pills">
              {sections.map(s => {
                const sm = sectionMap[s.id] ?? s;
                const on = form.section_name === s.id;
                return (
                  <button key={s.id} type="button"
                    className={`m-pill ${on ? 'active' : ''}`}
                    style={on
                      ? { background: sm.color, borderColor: sm.color, color: '#fff', '--pill-color': sm.color }
                      : { borderColor: sm.color + '66', color: sm.color }}
                    onClick={() => setForm({ ...form, section_name: s.id })}>
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <label className="m-label">
            Description & Study Notes
            <textarea className="m-textarea" rows={4}
              placeholder="Topics covered, what to review, key concepts, study tips…"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>

          {error && <p className="m-err">{error}</p>}

          <div className="m-actions">
            <button type="submit" className="m-submit"
              style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}
              disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Exam' : 'Save Exam'}
            </button>
            <button type="button" className="m-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MANAGE SECTIONS MODAL  (restyled, same logic)
───────────────────────────────────────────── */
function ManageSectionsModal({ sections, onAdd, onRemove, onColorChange, onClose }) {
  const [name,     setName]     = useState('');
  const [error,    setError]    = useState('');
  const [removing, setRemoving] = useState(null);

  const handleAdd = () => {
    const label = name.trim();
    if (!label) { setError('Please enter a section name.'); return; }
    if (sections.some(s => s.id.toLowerCase() === label.toLowerCase())) {
      setError('That section already exists.'); return;
    }
    onAdd(label); setName(''); setError('');
  };

  return (
    <div className="msm-overlay" onClick={onClose}>
      <style>{MODAL_STYLES}</style>
      <div className="msm-modal" onClick={e => e.stopPropagation()}>

        <div className="msm-head">
          <div className="msm-head-left">
            <div className="msm-head-icon"><Settings2 size={18} /></div>
            <div>
              <h3 className="msm-title">Manage Sections</h3>
              <p className="msm-sub">Add, remove, and color sections for shifts and exams</p>
            </div>
          </div>
          <button className="msm-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="msm-add-box">
          <p className="msm-box-label">New Section</p>
          <div className="msm-add-row">
            <input className="msm-input"
              placeholder="e.g. Immunology, Parasitology…"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              maxLength={40} autoFocus />
            <button className="msm-add-btn" onClick={handleAdd}><Plus size={14} /> Add</button>
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
              <span style={{ fontSize: 28 }}>🗂️</span>
              <p>No sections yet.</p>
            </div>
          ) : (
            <div className="msm-list">
              {sections.map(sec => {
                const isRem = removing === sec.id;
                return (
                  <div key={sec.id} className={`msm-row ${isRem ? 'msm-row-rem' : ''}`}>
                    <div className="msm-row-main">
                      <div className="msm-sec-pill"
                        style={{ background: sec.bg, color: sec.color, borderColor: sec.color + '55' }}>
                        <span className="msm-dot" style={{ background: sec.color }} />
                        {sec.id}
                      </div>
                      <label className="msm-color-ctrl" title={`Change ${sec.id} color`}>
                        <span className="msm-color-swatch" style={{ background: sec.color }} />
                        <input type="color" value={sec.color}
                          onChange={e => onColorChange(sec.id, e.target.value)} />
                      </label>
                    </div>
                    {isRem ? (
                      <div className="msm-confirm">
                        <span>Remove?</span>
                        <button className="msm-yes" onClick={() => { onRemove(sec.id); setRemoving(null); }}>Yes</button>
                        <button className="msm-no"  onClick={() => setRemoving(null)}>No</button>
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
          <Sparkles size={12} style={{ color: '#ff8fb1', flexShrink: 0 }} />
          Removing a section hides it from new shifts, exams, and filters. Existing records keep their saved label.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   All remaining sub-components (unchanged logic)
───────────────────────────────────────────── */
function ExamCalendar({ exams, onAdd, onEdit, currentMonth, onPrevMonth, onNextMonth }) {
  const year  = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = toDateStr(new Date());

  const monthLabel   = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const firstDayOfWk = new Date(year, month, 1).getDay();

  const cells = [
    ...Array.from({ length: firstDayOfWk }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }),
  ];

  const monthExams = useMemo(() => exams.filter(e => {
    const [y, m] = e.exam_date.split('-').map(Number);
    return y === year && m === month + 1;
  }), [exams, year, month]);

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  return (
    <div className="sp-card sp-calendar-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap" style={{ background: 'linear-gradient(135deg,#7ab6ff,#5f8dff)' }}>
          <GraduationCap size={20} />
        </div>
        <div>
          <h3>Exam Calendar</h3>
          <p>{monthExams.length} exam{monthExams.length !== 1 ? 's' : ''} this month</p>
        </div>
        <button className="ec-add-month-btn" onClick={() => onAdd(null)}>
          <Plus size={14} /> Add Exam
        </button>
      </div>

      <div className="sp-week-nav">
        <button className="sp-nav-btn" onClick={onPrevMonth}><ChevronLeft size={16} /></button>
        <span className="sp-week-label">{monthLabel}</span>
        <button className="sp-nav-btn" onClick={onNextMonth}><ChevronRight size={16} /></button>
        {!isCurrentMonth && (
          <button className="sp-today-btn" onClick={() => onNextMonth('today')}>Today</button>
        )}
      </div>

      <div className="ec-month-grid">
        {DAYS_SHORT.map(d => <div key={d} className="ec-dow-header">{d}</div>)}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`blank-${i}`} className="ec-cell ec-cell-blank" />;
          const dayExams  = exams.filter(e => e.exam_date === dateStr);
          const today     = dateStr === todayStr;
          const dayNum    = parseInt(dateStr.slice(-2), 10);
          const isPast    = dateStr < todayStr;
          return (
            <div key={dateStr}
              className={`ec-cell ${today ? 'ec-today' : ''} ${isPast ? 'ec-past' : ''} ${dayExams.length > 0 ? 'ec-has-exam' : ''}`}
              onClick={() => onAdd(dateStr)}
              title={`Add exam — ${formatDateFull(dateStr)}`}>
              <div className="ec-cell-top">
                <span className={`ec-day-num ${today ? 'ec-today-num' : ''}`}>{dayNum}</span>
              </div>
              <div className="ec-cell-exams">
                {dayExams.length === 0 && <div className="ec-empty-hint"><Plus size={9} /></div>}
                {dayExams.map(exam => {
                  const u = getUrgency(daysUntil(exam.exam_date));
                  return (
                    <div key={exam.id} className="ec-exam-pill"
                      style={{ background: u.badgeBg, borderColor: u.borderColor + '99', color: u.badgeColor }}
                      onClick={e => { e.stopPropagation(); onEdit(exam); }}
                      title={exam.exam_name}>
                      <GraduationCap size={8} />
                      <span>{exam.exam_name.length > 9 ? exam.exam_name.slice(0, 9) + '…' : exam.exam_name}</span>
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

function ExamHistoryList({ allExams, onEdit, onDelete, sectionMap }) {
  const [filterTab,  setFilterTab]  = useState('upcoming');
  const [filterSec,  setFilterSec]  = useState('');
  const [search,     setSearch]     = useState('');
  const [confirmDel, setConfirmDel] = useState(null);

  const filtered = useMemo(() => {
    let list = [...allExams];
    if (filterTab === 'upcoming') list = list.filter(e => daysUntil(e.exam_date) >= 0);
    if (filterTab === 'past')     list = list.filter(e => daysUntil(e.exam_date) < 0);
    if (filterSec)                list = list.filter(e => e.section_name === filterSec);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e => e.exam_name.toLowerCase().includes(q) || e.notes?.toLowerCase().includes(q));
    }
    list.sort((a, b) =>
      filterTab === 'past'
        ? new Date(b.exam_date) - new Date(a.exam_date)
        : new Date(a.exam_date) - new Date(b.exam_date)
    );
    return list;
  }, [allExams, filterTab, filterSec, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = e.exam_date.slice(0, 7);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort((a, b) =>
      filterTab === 'past' ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])
    );
  }, [filtered, filterTab]);

  const upcomingCount = useMemo(() => allExams.filter(e => daysUntil(e.exam_date) >= 0).length, [allExams]);
  const pastCount     = useMemo(() => allExams.filter(e => daysUntil(e.exam_date) < 0).length, [allExams]);

  return (
    <div className="sp-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap blue"><BookOpen size={20} /></div>
        <div><h3>Exam Schedule</h3><p>{allExams.length} exam{allExams.length !== 1 ? 's' : ''} total</p></div>
      </div>
      <div className="ehl-tabs">
        {[
          { id: 'all',      label: 'All',      count: allExams.length },
          { id: 'upcoming', label: 'Upcoming', count: upcomingCount   },
          { id: 'past',     label: 'Past',     count: pastCount       },
        ].map(t => (
          <button key={t.id} className={`ehl-tab ${filterTab === t.id ? 'active' : ''}`}
            onClick={() => setFilterTab(t.id)}>
            {t.label}<span className="ehl-tab-count">{t.count}</span>
          </button>
        ))}
      </div>
      <div className="ehl-search-wrap">
        <Search size={12} className="ehl-search-icon" />
        <input className="ehl-search" placeholder="Search exams…"
          value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button className="ehl-search-clear" onClick={() => setSearch('')}><X size={11} /></button>}
      </div>
      {grouped.length === 0 ? (
        <div className="sp-empty">
          <p>{search ? `No exams match "${search}"` : filterTab === 'past' ? 'No past exams yet.' : 'No upcoming exams — you\'re clear! ✨'}</p>
        </div>
      ) : (
        <div className="ehl-list">
          {grouped.map(([monthKey, monthExams]) => (
            <div key={monthKey}>
              <p className="sp-month-label">
                {new Date(monthKey + '-15').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                <span>{monthExams.length} exam{monthExams.length !== 1 ? 's' : ''}</span>
              </p>
              {monthExams.map(exam => {
                const days    = daysUntil(exam.exam_date);
                const urgency = getUrgency(days);
                const secMeta = sectionMap[exam.section_name] ?? { color: '#ff6f91', bg: '#fff0f4' };
                const isPast  = days < 0;
                const isConf  = confirmDel === exam.id;
                return (
                  <div key={exam.id}
                    className={`ehl-row ${isToday(exam.exam_date) ? 'ehl-row-today' : ''} ${isPast ? 'ehl-row-past' : ''}`}
                    style={{ borderLeftColor: urgency.borderColor }}>
                    <div className="ehl-row-left">
                      <div className="ehl-row-icon" style={{ background: urgency.badgeBg, color: urgency.badgeColor }}>
                        <GraduationCap size={14} />
                      </div>
                      <div className="ehl-row-info">
                        <div className="ehl-row-name-row">
                          <span className={`ehl-row-name ${isPast ? 'past' : ''}`}>{exam.exam_name}</span>
                          <span className="ehl-countdown" style={{ background: urgency.badgeBg, color: urgency.badgeColor }}>
                            {urgency.icon} {urgency.label}
                          </span>
                        </div>
                        <div className="ehl-row-meta">
                          <span className="ehl-row-date">
                            <Calendar size={10} style={{ display: 'inline', marginRight: 3, verticalAlign: -1 }} />
                            {formatDateFull(exam.exam_date)}
                          </span>
                          {exam.section_name && (
                            <span className="ehl-row-sec" style={{ background: secMeta.bg, color: secMeta.color }}>
                              {exam.section_name}
                            </span>
                          )}
                        </div>
                        {exam.notes && <p className="ehl-row-notes">{exam.notes.length > 80 ? exam.notes.slice(0, 80) + '…' : exam.notes}</p>}
                      </div>
                    </div>
                    <div className="ehl-row-actions">
                      {isConf ? (
                        <div className="ehl-confirm">
                          <span>Delete?</span>
                          <button className="ehl-yes" onClick={() => { onDelete(exam.id); setConfirmDel(null); }}>Yes</button>
                          <button className="ehl-no"  onClick={() => setConfirmDel(null)}>No</button>
                        </div>
                      ) : (
                        <>
                          <button className="sp-icon-btn" onClick={() => onEdit(exam)}><Edit3 size={13} /></button>
                          <button className="sp-icon-btn danger" onClick={() => setConfirmDel(exam.id)}><Trash2 size={13} /></button>
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

function ExamStudyWellness({ exams }) {
  const { user } = useAuth();
  const [tipIndex,    setTipIndex]    = useState(() => Math.floor(Math.random() * STUDY_TIPS.length));
  const [studyMins,   setStudyMins]   = useState(0);
  const [timerOn,     setTimerOn]     = useState(false);
  const [studyGoal,   setStudyGoal]   = useState(120);
  const [goalLoaded,  setGoalLoaded]  = useState(false);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput,   setGoalInput]   = useState(String(studyGoal));

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase.from('user_settings').select('value')
        .eq('user_id', user.id).eq('key', STUDY_GOAL_STORAGE_KEY).maybeSingle();
      const parsed = Number(data?.value);
      setStudyGoal(Number.isFinite(parsed) && parsed >= 5 ? parsed : 120);
      setGoalLoaded(true);
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !goalLoaded) return;
    supabase.from('user_settings').upsert([{ user_id: user.id, key: STUDY_GOAL_STORAGE_KEY, value: studyGoal }], { onConflict: 'user_id,key' });
  }, [studyGoal, goalLoaded, user?.id]);

  useEffect(() => {
    if (!timerOn) return;
    const id = setInterval(() => setStudyMins(m => m + 1), 60000);
    return () => clearInterval(id);
  }, [timerOn]);

  const nextExam = useMemo(() => {
    return [...exams].filter(e => daysUntil(e.exam_date) >= 0)
      .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))[0] ?? null;
  }, [exams]);

  const stats = useMemo(() => {
    const upcoming = exams.filter(e => daysUntil(e.exam_date) >= 0);
    return { upcoming: upcoming.length, week7: upcoming.filter(e => daysUntil(e.exam_date) <= 7).length, urgent: upcoming.filter(e => daysUntil(e.exam_date) <= 3).length };
  }, [exams]);

  const tip         = STUDY_TIPS[tipIndex];
  const nextUrgency = nextExam ? getUrgency(daysUntil(nextExam.exam_date)) : null;
  const studyPct    = Math.min(100, studyGoal > 0 ? Math.round((studyMins / studyGoal) * 100) : 0);
  const goalReached = studyMins >= studyGoal && studyGoal > 0;

  const applyGoal = () => {
    const val = parseInt(goalInput, 10);
    if (!isNaN(val) && val >= 5 && val <= 1440) { setStudyGoal(val); setStudyMins(0); setTimerOn(false); }
    else setGoalInput(String(studyGoal));
    setEditingGoal(false);
  };

  const applyPreset = (mins) => { setStudyGoal(mins); setGoalInput(String(mins)); setStudyMins(0); setTimerOn(false); };

  return (
    <div className="sp-card sp-wellness-card">
      <div className="sp-card-header">
        <div className="sp-icon-wrap green"><Brain size={20} /></div>
        <div><h3>Study & Wellness</h3><p>Prepare smart, not just hard</p></div>
      </div>
      {nextExam ? (
        <div className="esw-next-exam" style={{ borderColor: nextUrgency.borderColor + '55', background: nextUrgency.badgeBg }}>
          <div className="esw-next-top">
            <span className="esw-next-label">Next Exam</span>
            <span className="esw-next-badge" style={{ background: nextUrgency.borderColor, color: '#fff' }}>
              {nextUrgency.icon} {nextUrgency.label}
            </span>
          </div>
          <p className="esw-next-name" style={{ color: nextUrgency.badgeColor }}>{nextExam.exam_name}</p>
          <p className="esw-next-date">{formatDateLong(nextExam.exam_date)}</p>
        </div>
      ) : (
        <div className="esw-no-exam"><CheckCircle2 size={18} style={{ color: '#4abf95' }} /><span>No upcoming exams scheduled.</span></div>
      )}
      <div className="esw-stats">
        <div className="esw-stat"><span className="esw-stat-val" style={{ color: '#5f8dff' }}>{stats.upcoming}</span><span className="esw-stat-label">Upcoming</span></div>
        <div className="esw-stat-div" />
        <div className="esw-stat"><span className="esw-stat-val" style={{ color: stats.week7 > 0 ? '#ff8c5a' : '#4abf95' }}>{stats.week7}</span><span className="esw-stat-label">This Week</span></div>
        <div className="esw-stat-div" />
        <div className="esw-stat"><span className="esw-stat-val" style={{ color: stats.urgent > 0 ? '#e05555' : '#4abf95' }}>{stats.urgent}</span><span className="esw-stat-label">Urgent (≤3d)</span></div>
      </div>
      <div className="esw-timer">
        <div className="esw-timer-header">
          <span className="sp-section-label"><Timer size={13} /> Study Timer</span>
          {editingGoal ? (
            <div className="esw-goal-edit">
              <input className="esw-goal-input" type="number" min={5} max={1440} value={goalInput}
                onChange={e => setGoalInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') applyGoal(); if (e.key === 'Escape') { setEditingGoal(false); setGoalInput(String(studyGoal)); } }}
                autoFocus />
              <span className="esw-goal-unit">min</span>
              <button className="esw-goal-apply" onClick={applyGoal}><Check size={11} /></button>
              <button className="esw-goal-cancel" onClick={() => { setEditingGoal(false); setGoalInput(String(studyGoal)); }}><X size={11} /></button>
            </div>
          ) : (
            <button className="esw-goal-display" onClick={() => { setEditingGoal(true); setGoalInput(String(studyGoal)); }}>
              <span style={{ color: timerOn ? '#ff5d8f' : '#888', fontWeight: 700, fontSize: 12 }}>{studyMins}m / {studyGoal}m</span>
              <Edit3 size={10} style={{ color: '#ccc', marginLeft: 4 }} />
            </button>
          )}
        </div>
        <div className="esw-goal-presets">
          {GOAL_PRESETS.map(mins => (
            <button key={mins} className={`esw-preset-chip ${studyGoal === mins ? 'active' : ''}`}
              onClick={() => applyPreset(mins)}>
              {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
            </button>
          ))}
        </div>
        <div className="esw-timer-bar-wrap">
          <div className="esw-timer-bar">
            <div className="esw-timer-fill" style={{
              width: `${studyPct}%`,
              background: goalReached ? 'linear-gradient(90deg,#6dd6b1,#4abf95)' : 'linear-gradient(90deg,#ff8fb1,#ff6f91)',
              transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
            }} />
          </div>
          <span className="esw-timer-pct" style={{ color: goalReached ? '#4abf95' : '#bbb' }}>{studyPct}%</span>
        </div>
        <div className="esw-timer-btns">
          <button className={`esw-timer-toggle ${timerOn ? 'on' : ''}`} onClick={() => setTimerOn(v => !v)}>
            {timerOn ? '⏸ Pause' : '▶ Start'}
          </button>
          <button className="esw-timer-reset" onClick={() => { setTimerOn(false); setStudyMins(0); }}>Reset</button>
        </div>
        {goalReached && <p className="esw-timer-done">✅ Daily study goal reached! Great work! 🎉</p>}
      </div>
      <div className="sp-tip-card">
        <div className="sp-tip-emoji">{tip.emoji}</div>
        <div><p className="sp-tip-label">Study Tip</p><p className="sp-tip-text">{tip.tip}</p></div>
      </div>
      <button className="sp-next-tip-btn" onClick={() => setTipIndex(i => (i + 1) % STUDY_TIPS.length)}>
        Next tip →
      </button>
    </div>
  );
}

function ExamsPanel({ exams, loading, error, onAdd, onEdit, onDelete, sections, sectionMap,
  currentMonth, onPrevMonth, onNextMonth }) {
  const stats = useMemo(() => ({
    urgent: exams.filter(e => daysUntil(e.exam_date) >= 0 && daysUntil(e.exam_date) <= 3).length,
  }), [exams]);
  if (loading) return <div className="ex-empty"><p>Loading your exams…</p></div>;
  return (
    <div className="ex-panel">
      {error && <div className="ex-error-box"><AlertCircle size={15} /><span>{error}</span></div>}
      {stats.urgent > 0 && (
        <div className="ex-urgent-banner">
          <Zap size={14} />
          <strong>{stats.urgent} exam{stats.urgent > 1 ? 's' : ''}</strong>
          {stats.urgent > 1 ? ' are' : ' is'} happening within 3 days — study hard! 💪
        </div>
      )}
      <ExamCalendar exams={exams} onAdd={onAdd} onEdit={onEdit}
        currentMonth={currentMonth} onPrevMonth={onPrevMonth} onNextMonth={onNextMonth} />
      <div className="sp-grid">
        <ExamHistoryList allExams={exams} onEdit={onEdit} onDelete={onDelete} sectionMap={sectionMap} />
        <ExamStudyWellness exams={exams} />
      </div>
    </div>
  );
}

function WeeklyStats({ shifts }) {
  const totalHours = useMemo(() => shifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0), [shifts]);
  const typeCounts = useMemo(() => { const c = {}; shifts.forEach(s => { c[s.shift_type] = (c[s.shift_type] ?? 0) + 1; }); return c; }, [shifts]);
  const nightCount = typeCounts['night'] ?? 0;
  return (
    <div className="sp-stats-bar">
      <div className="sp-stat"><CalendarDays size={15} /><span><strong>{shifts.length}</strong> shifts</span></div>
      <div className="sp-stat-divider" />
      <div className="sp-stat"><Clock size={15} /><span><strong>{totalHours.toFixed(1)}h</strong> total</span></div>
      <div className="sp-stat-divider" />
      {nightCount >= 3 && <div className="sp-stat warn"><AlertCircle size={14} /><span>{nightCount} night shifts — rest well!</span></div>}
      {Object.entries(typeCounts).map(([type, count]) => {
        const meta = SHIFT_TYPES[type];
        return (
          <div key={type} className="sp-type-chip" style={{ background: meta?.bg, color: meta?.color, border: `1px solid ${meta?.color}44` }}>
            {meta?.label} ×{count}
          </div>
        );
      })}
    </div>
  );
}

function ShiftCalendar({ shifts, exams, onAdd, onEdit, onDelete, currentWeek, onPrevWeek, onNextWeek }) {
  const weekStart = getWeekStart(currentWeek);
  const weekDates = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
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
            <div key={dateStr}
              className={`sp-cal-day ${today ? 'today' : ''} ${(dayShifts.length + dayExams.length) > 0 ? 'has-shifts' : ''}`}
              onClick={() => onAdd(dateStr)} title={`Add shift on ${formatDateFull(dateStr)}`}>
              <div className="sp-cal-day-header">
                <span className="sp-day-name">{DAYS_SHORT[i]}</span>
                <span className={`sp-day-num ${today ? 'today-num' : ''}`}>{date.getDate()}</span>
              </div>
              <div className="sp-cal-day-shifts">
                {dayShifts.length === 0 && dayExams.length === 0 && (
                  <div className="sp-cal-empty-day"><Plus size={12} /></div>
                )}
                {dayShifts.map(shift => {
                  const meta = SHIFT_TYPES[shift.shift_type] ?? SHIFT_TYPES.other;
                  const SIcon = meta.icon;
                  return (
                    <div key={shift.id} className="sp-shift-pill"
                      style={{ background: meta.bg, borderColor: meta.color + '55', color: meta.color }}
                      onClick={e => { e.stopPropagation(); onEdit(shift); }}
                      title={`${meta.label} • ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`}>
                      <SIcon size={10} /><span>{meta.label}</span>
                      <button className="sp-pill-delete" onClick={e => { e.stopPropagation(); onDelete(shift.id); }}><X size={9} /></button>
                    </div>
                  );
                })}
                {dayExams.map(exam => {
                  const u = getUrgency(daysUntil(exam.exam_date));
                  return (
                    <div key={exam.id} className="sp-exam-marker"
                      style={{ background: u.badgeBg, borderColor: u.borderColor + '88', color: u.badgeColor }}
                      title={`📚 ${exam.exam_name}`} onClick={e => e.stopPropagation()}>
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
    filtered.forEach(s => { const key = s.shift_date.slice(0, 7); if (!groups[key]) groups[key] = []; groups[key].push(s); });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const totalHours = useMemo(() => allShifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0), [allShifts]);

  return (
    <div className="sp-card" style={showFilter ? { position: 'relative', zIndex: 10 } : {}}>
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
              <button className={`sp-filter-opt ${!filterType ? 'active' : ''}`}
                onClick={() => { setFilterType(''); setShowFilter(false); }}>All types</button>
              {Object.entries(SHIFT_TYPES).map(([key, val]) => (
                <button key={key} className={`sp-filter-opt ${filterType === key ? 'active' : ''}`}
                  style={{ color: val.color }}
                  onClick={() => { setFilterType(key); setShowFilter(false); }}>{val.label}</button>
              ))}
            </div>
          )}
        </div>
        {filterType && <button className="sp-clear-filter" onClick={() => setFilterType('')}><X size={12} /> Clear</button>}
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
                const meta     = SHIFT_TYPES[shift.shift_type] ?? SHIFT_TYPES.other;
                const SIcon    = meta.icon;
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
                      <button className="sp-icon-btn" onClick={() => onEdit(shift)}><Edit3 size={13} /></button>
                      <button className="sp-icon-btn danger" onClick={() => onDelete(shift.id)}><Trash2 size={13} /></button>
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
        <div className="sp-night-warning"><Moon size={13} /> {nightCount} night shifts this week — extra sleep is essential.</div>
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
        <div><p className="sp-tip-label">Wellness Tip</p><p className="sp-tip-text">{tip.tip}</p></div>
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
  const location = useLocation();
  const { user } = useAuth();

  const [allShifts,      setAllShifts]      = useState([]);
  const [weekShifts,     setWeekShifts]     = useState([]);
  const [currentWeek,    setCurrentWeek]    = useState(new Date());
  const [loadingShifts,  setLoadingShifts]  = useState(true);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift,   setEditingShift]   = useState(null);
  const [modalDate,      setModalDate]      = useState('');

  const [allExams,        setAllExams]        = useState([]);
  const [loadingExams,    setLoadingExams]    = useState(true);
  const [examError,       setExamError]       = useState(null);
  const [showExamModal,   setShowExamModal]   = useState(false);
  const [editingExam,     setEditingExam]     = useState(null);
  const [examDefaultDate, setExamDefaultDate] = useState('');
  const [currentExamMonth,setCurrentExamMonth]= useState(new Date());

  const [sections,          setSections]          = useState(DEFAULT_SECTION_LIST);
  const [sectionsLoaded,    setSectionsLoaded]    = useState(false);
  const [showSectionManage, setShowSectionManage] = useState(false);

  const [activeTab, setActiveTab] = useState(location.state?.tab ?? 'shifts');

  const upcomingExamCount = useMemo(() => allExams.filter(e => daysUntil(e.exam_date) >= 0).length, [allExams]);
  const sectionMap = useMemo(() => Object.fromEntries(sections.map(s => [s.id, s])), [sections]);

  useEffect(() => {
    const loadSections = async () => {
      const { data } = await supabase.from('user_settings').select('value')
        .eq('user_id', user.id).eq('key', SECTION_STORAGE_KEY).maybeSingle();
      setSections(data?.value ? normalizeSections(data.value) : DEFAULT_SECTION_LIST);
      setSectionsLoaded(true);
    };
    loadSections();
  }, [user.id]);

  useEffect(() => {
    if (!sectionsLoaded) return;
    supabase.from('user_settings').upsert([{ user_id: user.id, key: SECTION_STORAGE_KEY, value: sections }], { onConflict: 'user_id,key' });
  }, [sections, sectionsLoaded, user.id]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoadingShifts(true);
      const { data } = await supabase.from('shifts').select('*').eq('user_id', user.id)
        .order('shift_date', { ascending: false });
      setAllShifts(data || []); setLoadingShifts(false);
    };
    fetchAll();
  }, [user.id]);

  useEffect(() => {
    const weekStart = getWeekStart(currentWeek);
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const s = toDateStr(weekStart); const e = toDateStr(weekEnd);
    setWeekShifts(allShifts.filter(sh => sh.shift_date >= s && sh.shift_date <= e));
  }, [allShifts, currentWeek]);

  useEffect(() => {
    const fetchExams = async () => {
      setLoadingExams(true);
      const { data, error } = await supabase.from('exams').select('*').eq('user_id', user.id)
        .order('exam_date', { ascending: true });
      if (error) {
        if (isMissingTableError(error)) setExamError('Exams table not found. Run supabase/schema.sql in your project.');
        else console.error(error);
      } else { setAllExams(data || []); setExamError(null); }
      setLoadingExams(false);
    };
    fetchExams();
  }, [user.id]);

  const handleShiftSaved  = (saved, isEdit) => isEdit
    ? setAllShifts(prev => prev.map(s => s.id === saved.id ? saved : s))
    : setAllShifts(prev => [saved, ...prev]);

  const handleShiftDelete = useCallback(async (id) => {
    await supabase.from('shifts').delete().eq('id', id);
    setAllShifts(prev => prev.filter(s => s.id !== id));
  }, []);

  const handleExamSaved = (saved, isEdit) => isEdit
    ? setAllExams(prev => prev.map(e => e.id === saved.id ? saved : e))
    : setAllExams(prev => [...prev, saved].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)));

  const handleExamDelete = useCallback(async (id) => {
    await supabase.from('exams').delete().eq('id', id);
    setAllExams(prev => prev.filter(e => e.id !== id));
  }, []);

  const openAddShift  = (dateStr) => { setEditingShift(null); setModalDate(dateStr); setShowShiftModal(true); };
  const openEditShift = (shift)   => { setEditingShift(shift); setModalDate(''); setShowShiftModal(true); };
  const openAddExam   = (dateStr) => { setEditingExam(null); setExamDefaultDate(dateStr ?? ''); setShowExamModal(true); };
  const openEditExam  = (exam)    => { setEditingExam(exam); setExamDefaultDate(''); setShowExamModal(true); };

  const handleAddSection         = (label) => { const meta = generateSectionMeta(label); setSections(prev => [...prev, { id: label, ...meta }]); };
  const handleRemoveSection      = (id)    => setSections(prev => prev.filter(s => s.id !== id));
  const handleSectionColorChange = (id, color) => setSections(prev => prev.map(s => s.id === id ? { ...s, color, bg: colorToSoftBg(color) } : s));

  const prevWeek = () => setCurrentWeek(d => { const n = new Date(d); n.setDate(d.getDate() - 7); return n; });
  const nextWeek = (cmd) => {
    if (cmd === 'today') { setCurrentWeek(new Date()); return; }
    setCurrentWeek(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  };
  const prevExamMonth = () => setCurrentExamMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextExamMonth = (cmd) => {
    if (cmd === 'today') { setCurrentExamMonth(new Date()); return; }
    setCurrentExamMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        /* ── Page ── */
        .sp-page {
          width: 100%;
          display: flex; flex-direction: column; gap: 24px;
          font-family: 'DM Sans', sans-serif;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,220,232,0.55);
          border-radius: 28px;
          box-shadow: 0 2px 12px rgba(255,111,145,0.05), 0 6px 28px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          padding: 28px;
        }
        .sp-page-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 5vw, 2.55rem);
          font-weight: 700; color: #1c1012;
          margin: 0 0 6px; line-height: 1.08;
        }
        .sp-title-accent { color: #ff5d8f; font-style: italic; }

        /* ── Page tabs ── */
        .sp-page-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 4px; }
        .sp-page-tab {
          display: flex; align-items: center; gap: 12px; padding: 16px 18px;
          border-radius: 22px; border: 1.5px solid rgba(255,224,234,0.9);
          background: rgba(255,255,255,0.9); color: #aaa;
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: all 0.2s; text-align: left; min-width: 0;
          box-shadow: 0 8px 24px rgba(255,111,145,0.08);
        }
        .sp-page-tab svg { width: 42px; height: 42px; padding: 11px; border-radius: 15px; color: white; flex-shrink: 0; background: linear-gradient(135deg,#ff8fb1,#ff6f91); box-shadow: 0 7px 18px rgba(255,111,145,0.24); }
        .sp-page-tab:nth-child(2) svg { background: linear-gradient(135deg,#7ab6ff,#5f8dff); box-shadow: 0 7px 18px rgba(95,141,255,0.24); }
        .sp-page-tab:hover { border-color: #ffb8ce; color: #ff5d8f; transform: translateY(-1px); box-shadow: 0 12px 30px rgba(255,111,145,0.14); }
        .sp-page-tab.active { background: #fff; border-color: #ff8fb1; color: #ff5d8f; box-shadow: 0 14px 34px rgba(255,111,145,0.18); }
        .sp-page-tab-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
        .sp-page-tab-title { font-size: 14px; font-weight: 800; color: #333; line-height: 1.2; }
        .sp-page-tab-sub { font-size: 12px; font-weight: 600; color: #bbaab2; line-height: 1.35; }
        .sp-page-tab.active .sp-page-tab-title { color: #ff5d8f; }
        .sp-tab-badge { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 26px; background: #eff4ff; color: #5f8dff; border-radius: 999px; font-size: 12px; font-weight: 800; padding: 0 8px; margin-left: auto; flex-shrink: 0; }

        /* ── Manage sections toolbar ── */
        .sp-sections-toolbar { display: flex; align-items: center; justify-content: flex-end; margin-bottom: 8px; }
        .sp-manage-sec-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: 1.5px solid rgba(255,200,220,0.6);
          background: rgba(255,255,255,0.9); border-radius: 999px;
          padding: 8px 16px; font-size: 12px; font-weight: 700;
          color: #999; cursor: pointer; transition: all 0.2s; font-family: inherit;
        }
        .sp-manage-sec-btn:hover { border-color: #ff8fb1; color: #ff5d8f; background: #fff0f4; box-shadow: 0 4px 14px rgba(255,111,145,0.12); }

        /* ── Grid ── */
        .sp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px; }

        /* ── Card ── */
        .sp-card { background: rgba(255,255,255,0.84); border-radius: 28px; padding: 24px; backdrop-filter: blur(14px); border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 10px 32px rgba(255,111,145,0.08); display: flex; flex-direction: column; gap: 16px; }
        .sp-calendar-card { grid-column: 1 / -1; }
        .sp-card-header { display: flex; align-items: center; gap: 14px; }
        .sp-card-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .sp-card-header p  { margin: 4px 0 0; color: #999; font-size: 13px; }
        .sp-icon-wrap { width: 46px; height: 46px; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .pink  { background: linear-gradient(135deg,#ff8fb1,#ff6f91); }
        .blue  { background: linear-gradient(135deg,#7ab6ff,#5f8dff); }
        .green { background: linear-gradient(135deg,#6dd6b1,#4abf95); }

        /* ── Week nav ── */
        .sp-week-nav { display: flex; align-items: center; gap: 10px; }
        .sp-week-label { flex: 1; text-align: center; font-size: 14px; font-weight: 700; color: #555; }
        .sp-nav-btn { border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9); border-radius: 12px; padding: 7px 10px; cursor: pointer; display: flex; align-items: center; color: #ff6f91; transition: 0.2s; }
        .sp-nav-btn:hover { background: #ffe4ec; }
        .sp-today-btn { border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 12px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer; }

        /* ── Stats bar ── */
        .sp-stats-bar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 12px 16px; background: #fff8fa; border-radius: 16px; border: 1px solid #ffe0ea; }
        .sp-stat { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666; }
        .sp-stat strong { color: #ff5d8f; }
        .sp-stat.warn { color: #e05555; }
        .sp-stat-divider { width: 1px; height: 16px; background: #ffd6e1; }
        .sp-type-chip { padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }

        /* ── Shift Calendar ── */
        .sp-cal-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 8px; }
        .sp-cal-day { background: #fff8fa; border-radius: 18px; border: 1.5px solid #ffe0ea; padding: 10px 8px; cursor: pointer; transition: all 0.2s; min-height: 90px; display: flex; flex-direction: column; gap: 5px; }
        .sp-cal-day:hover { border-color: #ff8fb1; box-shadow: 0 4px 14px rgba(255,111,145,0.13); transform: translateY(-1px); }
        .sp-cal-day.today { border-color: #ff6f91; background: linear-gradient(135deg,#fff0f4,#fff8fa); box-shadow: 0 0 0 2px #ff6f91; }
        .sp-cal-day-header { display: flex; flex-direction: column; align-items: center; }
        .sp-day-name { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #bbb; }
        .sp-day-num { font-size: 16px; font-weight: 700; color: #444; line-height: 1.3; }
        .sp-day-num.today-num { color: #ff5d8f; }
        .sp-cal-day-shifts { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .sp-cal-empty-day { display: flex; align-items: center; justify-content: center; color: #e0c0cc; margin-top: auto; opacity: 0; transition: opacity 0.2s; }
        .sp-cal-day:hover .sp-cal-empty-day { opacity: 1; }
        .sp-shift-pill { display: flex; align-items: center; gap: 4px; border-radius: 8px; border: 1px solid; padding: 3px 6px; font-size: 9px; font-weight: 600; cursor: pointer; transition: filter 0.15s; }
        .sp-shift-pill:hover { filter: brightness(0.95); }
        .sp-shift-pill span { flex: 1; }
        .sp-pill-delete { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; opacity: 0.5; transition: opacity 0.15s; color: inherit; }
        .sp-pill-delete:hover { opacity: 1; }
        .sp-exam-marker { display: flex; align-items: center; gap: 3px; border-radius: 6px; border: 1px solid; padding: 2px 5px; font-size: 9px; font-weight: 700; cursor: default; }
        .sp-exam-marker span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        /* ═══ EXAM CALENDAR ═══ */
        .ec-add-month-btn { margin-left: auto; display: inline-flex; align-items: center; gap: 6px; border: none; background: linear-gradient(135deg,#7ab6ff,#5f8dff); color: white; border-radius: 999px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .ec-add-month-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(95,141,255,0.3); }
        .ec-month-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
        .ec-dow-header { text-align: center; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #ccc; padding: 4px 0 8px; }
        .ec-cell-blank { background: transparent; border: none; min-height: 80px; }
        .ec-cell { background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 14px; padding: 8px 6px; min-height: 80px; cursor: pointer; display: flex; flex-direction: column; gap: 4px; transition: all 0.2s; }
        .ec-cell:hover { border-color: #ff8fb1; box-shadow: 0 4px 14px rgba(255,111,145,0.12); transform: translateY(-1px); }
        .ec-cell.ec-today { border-color: #5f8dff; background: linear-gradient(135deg,#eff4ff,#f8fbff); box-shadow: 0 0 0 2px #5f8dff44; }
        .ec-cell.ec-past  { opacity: 0.55; }
        .ec-cell.ec-has-exam { border-color: #5f8dff88; }
        .ec-cell-top { display: flex; justify-content: flex-end; }
        .ec-day-num { font-size: 13px; font-weight: 700; color: #555; line-height: 1; }
        .ec-today-num { color: white; background: #5f8dff; border-radius: 999px; padding: 2px 6px; font-size: 11px; }
        .ec-cell-exams { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .ec-empty-hint { display: flex; align-items: center; justify-content: center; color: #e0c0cc; flex: 1; opacity: 0; transition: opacity 0.2s; }
        .ec-cell:hover .ec-empty-hint { opacity: 1; }
        .ec-exam-pill { display: flex; align-items: center; gap: 3px; border: 1px solid; border-radius: 6px; padding: 2px 5px; font-size: 8.5px; font-weight: 700; cursor: pointer; transition: filter 0.15s; white-space: nowrap; overflow: hidden; }
        .ec-exam-pill:hover { filter: brightness(0.92); transform: scale(1.03); }
        .ec-exam-pill span { overflow: hidden; text-overflow: ellipsis; }

        /* ═══ EXAM HISTORY LIST ═══ */
        .ehl-tabs { display: flex; gap: 4px; background: #f5eff2; border-radius: 14px; padding: 4px; }
        .ehl-tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 10px; border: none; border-radius: 11px; background: transparent; font-size: 12px; font-weight: 700; color: #aaa; cursor: pointer; transition: all 0.18s; font-family: inherit; white-space: nowrap; }
        .ehl-tab:hover { color: #ff5d8f; }
        .ehl-tab.active { background: white; color: #ff5d8f; box-shadow: 0 2px 10px rgba(255,111,145,0.14); }
        .ehl-tab-count { min-width: 20px; height: 20px; border-radius: 999px; padding: 0 5px; display: inline-flex; align-items: center; justify-content: center; background: #f0ecea; color: #aaa; font-size: 10px; font-weight: 800; }
        .ehl-tab.active .ehl-tab-count { background: #fff0f4; color: #ff5d8f; }
        .ehl-search-wrap { position: relative; display: flex; align-items: center; }
        .ehl-search-icon { position: absolute; left: 12px; color: #ccc; pointer-events: none; }
        .ehl-search { width: 100%; border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 999px; padding: 9px 32px 9px 30px; font-size: 13px; outline: none; transition: 0.2s; color: #444; font-family: inherit; }
        .ehl-search:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .ehl-search-clear { position: absolute; right: 11px; background: none; border: none; color: #bbb; cursor: pointer; display: flex; padding: 0; }
        .ehl-list > div { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
        .ehl-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; background: #fff8fa; border: 1.5px solid #ffe0ea; border-left: 3px solid; border-radius: 14px; padding: 12px 12px 12px 10px; transition: 0.2s; }
        .ehl-row:hover { border-color: #ffb8ce; border-left-color: inherit; background: white; }
        .ehl-row.ehl-row-today { background: linear-gradient(135deg,#fff0f4,#fff8fa); }
        .ehl-row.ehl-row-past  { opacity: 0.65; }
        .ehl-row-left { display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 0; }
        .ehl-row-icon { width: 32px; height: 32px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .ehl-row-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
        .ehl-row-name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .ehl-row-name { font-size: 13px; font-weight: 700; color: #333; line-height: 1.3; }
        .ehl-row-name.past { text-decoration: line-through; color: #aaa; }
        .ehl-countdown { display: inline-flex; align-items: center; gap: 3px; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; white-space: nowrap; }
        .ehl-row-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
        .ehl-row-date { font-size: 11px; color: #aaa; display: flex; align-items: center; }
        .ehl-row-sec  { border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; white-space: nowrap; }
        .ehl-row-notes { margin: 0; font-size: 11px; color: #888; line-height: 1.5; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ehl-row-actions { display: flex; gap: 4px; flex-shrink: 0; align-items: flex-start; }
        .ehl-confirm { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #888; font-weight: 600; }
        .ehl-yes { border: none; background: #fde8e8; color: #e05555; border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: 700; cursor: pointer; }
        .ehl-no  { border: none; background: #f0f0f0; color: #888; border-radius: 8px; padding: 4px 8px; font-size: 11px; font-weight: 600; cursor: pointer; }

        /* ═══ EXAM STUDY WELLNESS ═══ */
        .esw-next-exam { border: 1.5px solid; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 5px; }
        .esw-next-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
        .esw-next-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.09em; color: #bbb; }
        .esw-next-badge { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; white-space: nowrap; }
        .esw-next-name { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.3; }
        .esw-next-date { margin: 0; font-size: 12px; color: #aaa; }
        .esw-no-exam { display: flex; align-items: center; gap: 10px; background: #edfaf4; border: 1px solid #b8f0da; border-radius: 14px; padding: 12px 14px; font-size: 13px; color: #4abf95; font-weight: 600; }
        .esw-stats { display: flex; align-items: center; justify-content: space-around; background: #fff8fa; border: 1px solid #ffe0ea; border-radius: 16px; padding: 14px 16px; }
        .esw-stat { display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .esw-stat-val { font-size: 22px; font-weight: 700; line-height: 1; }
        .esw-stat-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #bbb; }
        .esw-stat-div { width: 1px; height: 36px; background: #ffd6e1; }
        .esw-timer { background: #fff8fa; border: 1px solid #ffe0ea; border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
        .esw-timer-header { display: flex; align-items: center; justify-content: space-between; }
        .esw-goal-display { display: inline-flex; align-items: center; gap: 4px; background: none; border: 1px dashed #ffd6e1; border-radius: 8px; padding: 3px 8px; cursor: pointer; transition: 0.2s; }
        .esw-goal-display:hover { border-color: #ff8fb1; background: #fff0f4; }
        .esw-goal-edit { display: flex; align-items: center; gap: 5px; }
        .esw-goal-input { width: 56px; border: 1.5px solid #ff8fb1; border-radius: 8px; padding: 3px 8px; font-size: 12px; font-weight: 700; color: #ff5d8f; outline: none; background: white; font-family: inherit; text-align: center; }
        .esw-goal-unit { font-size: 11px; color: #aaa; font-weight: 600; }
        .esw-goal-apply { border: none; background: #4abf95; color: white; border-radius: 6px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.15s; }
        .esw-goal-apply:hover { background: #39a87f; }
        .esw-goal-cancel { border: none; background: #f0f0f0; color: #888; border-radius: 6px; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.15s; }
        .esw-goal-cancel:hover { background: #fde8e8; color: #e05555; }
        .esw-goal-presets { display: flex; flex-wrap: wrap; gap: 5px; }
        .esw-preset-chip { border: 1.5px solid #ffd6e1; background: white; color: #aaa; border-radius: 999px; padding: 3px 10px; font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; }
        .esw-preset-chip:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .esw-preset-chip.active { border-color: #ff6f91; background: #ff6f91; color: white; }
        .esw-timer-bar-wrap { display: flex; align-items: center; gap: 10px; }
        .esw-timer-bar { flex: 1; height: 10px; background: #f3dbe3; border-radius: 999px; overflow: hidden; }
        .esw-timer-fill { height: 100%; border-radius: 999px; }
        .esw-timer-pct { font-size: 11px; font-weight: 700; min-width: 34px; text-align: right; }
        .esw-timer-btns { display: flex; gap: 8px; }
        .esw-timer-toggle { flex: 1; border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; font-family: inherit; }
        .esw-timer-toggle.on { background: linear-gradient(135deg,#ffb8ce,#ff8fb1); }
        .esw-timer-toggle:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(255,111,145,0.25); }
        .esw-timer-reset { border: 1.5px solid #ffd6e1; background: white; color: #aaa; border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: 0.2s; }
        .esw-timer-reset:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .esw-timer-done { margin: 0; font-size: 12px; font-weight: 600; color: #4abf95; }

        /* ── Shift list ── */
        .sp-list-toolbar { display: flex; align-items: center; gap: 10px; position: relative; }
        .sp-filter-btn { display: flex; align-items: center; gap: 7px; border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9); border-radius: 999px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s; }
        .sp-filter-btn.active { border-color: #ff8fb1; color: #ff5d8f; }
        .sp-filter-wrap { position: relative; }
        .sp-filter-dropdown { position: absolute; top: calc(100% + 8px); left: 0; background: white; border-radius: 18px; border: 1px solid #ffe0ea; box-shadow: 0 12px 32px rgba(255,111,145,0.16); overflow: hidden; z-index: 200; min-width: 140px; }
        .sp-filter-opt { display: block; width: 100%; text-align: left; border: none; background: transparent; padding: 11px 16px; font-size: 13px; color: #555; cursor: pointer; transition: 0.15s; }
        .sp-filter-opt:hover { background: #fff0f4; }
        .sp-filter-opt.active { font-weight: 700; background: #fff5f8; }
        .sp-clear-filter { background: none; border: none; color: #bbb; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; }
        .sp-clear-filter:hover { color: #ff5d8f; }
        .sp-shift-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; padding-right: 4px; }
        .sp-shift-list::-webkit-scrollbar { width: 4px; }
        .sp-shift-list::-webkit-scrollbar-thumb { background: #ffd6e1; border-radius: 4px; }
        .sp-month-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ccc; margin: 12px 0 6px; display: flex; justify-content: space-between; align-items: center; }
        .sp-month-label span { font-weight: 500; letter-spacing: 0; }
        .sp-shift-row { display: flex; align-items: flex-start; justify-content: space-between; background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 16px; padding: 12px 14px; gap: 10px; transition: 0.2s; }
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
        .sp-icon-btn { border: none; background: #f0f0f0; padding: 7px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; color: #888; transition: 0.2s; }
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
        .sp-cup { width: 32px; height: 32px; border-radius: 10px; border: 1.5px solid #ddd; background: #f5f5f5; cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center; transition: 0.15s; filter: grayscale(1); opacity: 0.4; }
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

        /* ── Exam Panel ── */
        .ex-panel { width: 100%; display: flex; flex-direction: column; gap: 20px; }
        .ex-error-box { display: flex; align-items: center; gap: 10px; background: #fff0f0; color: #c0392b; border: 1px solid #ffd0d0; border-radius: 16px; padding: 14px 18px; font-size: 13px; }
        .ex-urgent-banner { display: flex; align-items: center; gap: 10px; background: linear-gradient(135deg,#fff0f0,#fff5ee); border: 1.5px solid #ffb8b8; border-radius: 18px; padding: 14px 18px; font-size: 13px; color: #e05555; font-weight: 500; }
        .ex-urgent-banner strong { font-weight: 700; }

        /* ── Responsive ── */
        @media (max-width: 767px) {
          .sp-page { border-radius: 22px; padding: 20px 20px 56px; }
          .sp-page-title { font-size: 1.7rem; }
          .sp-page-tabs  { grid-template-columns: 1fr; gap: 8px; }
          .sp-page-tab   { padding: 12px 14px; border-radius: 18px; }
          .sp-page-tab svg { width: 38px; height: 38px; padding: 10px; border-radius: 13px; }
          .sp-grid       { grid-template-columns: 1fr; }
          .sp-cal-grid   { grid-template-columns: repeat(3,1fr); gap: 6px; }
          .sp-cal-day    { min-height: 70px; padding: 8px 6px; }
          .sp-day-num    { font-size: 14px; }
          .sp-shift-pill, .sp-exam-marker { font-size: 8px; padding: 2px 4px; }
          .sp-shift-list, .ehl-list { max-height: 280px; }
          .sp-card       { padding: 18px; }
          .ec-month-grid { gap: 4px; }
          .ec-cell       { min-height: 56px; padding: 5px 4px; }
          .ec-day-num    { font-size: 11px; }
          .ec-exam-pill  { font-size: 7.5px; padding: 1px 3px; }
          .ehl-row-name  { font-size: 12px; }
          .esw-stats     { padding: 10px; gap: 8px; }
          .esw-stat-val  { font-size: 18px; }
          .esw-goal-presets { gap: 4px; }
          .esw-preset-chip { padding: 3px 8px; font-size: 10px; }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .sp-page { padding: 24px; }
          .sp-page-title { font-size: 1.8rem; }
          .sp-grid       { grid-template-columns: 1fr; }
          .sp-cal-grid   { grid-template-columns: repeat(7,1fr); gap: 6px; }
          .sp-cal-day    { min-height: 80px; }
          .ec-cell       { min-height: 70px; }
        }

        @media (min-width: 1024px) {
          .sp-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="sp-page">
        <h2 className="sp-page-title">Shift <span className="sp-title-accent">Planner</span></h2>

        {/* Tab switcher */}
        <div className="sp-page-tabs">
          <button className={`sp-page-tab ${activeTab === 'shifts' ? 'active' : ''}`} onClick={() => setActiveTab('shifts')}>
            <CalendarDays size={16} />
            <span className="sp-page-tab-copy">
              <span className="sp-page-tab-title">Shifts</span>
              <span className="sp-page-tab-sub">Weekly schedule and history</span>
            </span>
          </button>
          <button className={`sp-page-tab ${activeTab === 'exams' ? 'active' : ''}`} onClick={() => setActiveTab('exams')}>
            <GraduationCap size={16} />
            <span className="sp-page-tab-copy">
              <span className="sp-page-tab-title">Exam Dates</span>
              <span className="sp-page-tab-sub">Upcoming tests and reminders</span>
            </span>
            {upcomingExamCount > 0 && <span className="sp-tab-badge">{upcomingExamCount}</span>}
          </button>
        </div>

        {/* Manage sections */}
        <div className="sp-sections-toolbar">
          <button className="sp-manage-sec-btn" onClick={() => setShowSectionManage(true)}>
            <Settings2 size={13} /> Manage Sections
          </button>
        </div>

        {activeTab === 'shifts' && (
          <>
            {!loadingShifts && (
              <ShiftCalendar
                shifts={weekShifts} exams={allExams}
                onAdd={openAddShift} onEdit={openEditShift} onDelete={handleShiftDelete}
                currentWeek={currentWeek} onPrevWeek={prevWeek} onNextWeek={nextWeek}
              />
            )}
            <div className="sp-grid">
              <AllShiftsList allShifts={allShifts} onEdit={openEditShift} onDelete={handleShiftDelete} />
              <WellnessPanel weekShifts={weekShifts} />
            </div>
          </>
        )}

        {activeTab === 'exams' && (
          <ExamsPanel
            exams={allExams} loading={loadingExams} error={examError}
            onAdd={openAddExam} onEdit={openEditExam} onDelete={handleExamDelete}
            sections={sections} sectionMap={sectionMap}
            onManageSections={() => setShowSectionManage(true)}
            currentMonth={currentExamMonth}
            onPrevMonth={prevExamMonth}
            onNextMonth={nextExamMonth}
          />
        )}
      </div>

      {/* ── Modals — rendered outside .sp-page ── */}
      {showShiftModal && (
        <ShiftModal
          editing={editingShift}
          defaultDate={modalDate}
          onClose={() => { setShowShiftModal(false); setEditingShift(null); setModalDate(''); }}
          onSaved={handleShiftSaved}
          sections={sections}
        />
      )}

      {showExamModal && (
        <ExamModal
          editing={editingExam}
          defaultDate={examDefaultDate}
          onClose={() => { setShowExamModal(false); setEditingExam(null); setExamDefaultDate(''); }}
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