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
  { emoji: '💧', tip: 'Drink a glass of water every 2 hours — dehydration kills focus.' },
  { emoji: '🧠', tip: 'Take a 5-minute walk between procedures to reset your mind.' },
  { emoji: '😴', tip: 'Aim for 7–8 hours of sleep; memory consolidation happens at night.' },
  {
    emoji: '🍎',
    tip: 'Eat a balanced meal before your shift — avoid heavy carbs before night duty.',
  },
  { emoji: '👁️', tip: 'Follow the 20-20-20 rule: every 20 min, look 20 ft away for 20 sec.' },
  {
    emoji: '🧘',
    tip: 'Three deep breaths before a stressful procedure can lower your heart rate.',
  },
  {
    emoji: '🤝',
    tip: 'Ask your senior for feedback after every major procedure — it compounds fast.',
  },
  { emoji: '📵', tip: 'Avoid phone use 30 min before sleep; blue light disrupts melatonin.' },
  { emoji: '🍵', tip: 'Limit caffeine after 2 PM to protect your sleep quality.' },
  { emoji: '✍️', tip: 'Write one thing you learned each shift — tiny logs become big knowledge.' },
];

const STUDY_TIPS = [
  {
    emoji: '📚',
    tip: 'Start reviewing 3–5 days before the exam. Cramming the night before rarely sticks.',
  },
  {
    emoji: '🧠',
    tip: 'Use active recall: close your notes and retrieve key concepts from memory.',
  },
  {
    emoji: '😴',
    tip: 'Get 8 hours of sleep the night before — memory consolidation happens while you sleep.',
  },
  {
    emoji: '✍️',
    tip: 'Write practice questions for yourself. If you can teach it, you truly know it.',
  },
  {
    emoji: '🍳',
    tip: 'Eat a protein-rich meal before your exam. Avoid heavy carbs that cause energy crashes.',
  },
  { emoji: '⏰', tip: 'Arrive 15 minutes early to settle nerves and do a final calm review.' },
  {
    emoji: '🎯',
    tip: 'Focus on understanding concepts, not memorizing. Lab values will follow naturally.',
  },
  {
    emoji: '💧',
    tip: 'Stay hydrated during study sessions — even mild dehydration cuts focus by 20%.',
  },
  {
    emoji: '🔄',
    tip: 'Space your review: 1 day, 3 days, and 7 days before the exam for best retention.',
  },
  {
    emoji: '🧘',
    tip: 'Take 5-minute breaks every 25 minutes (Pomodoro) to maintain peak concentration.',
  },
  { emoji: '🖊️', tip: 'Rewrite your notes by hand — motor memory reinforces what your eyes read.' },
  {
    emoji: '👥',
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
      icon: '✅',
      label: `${Math.abs(days)}d ago`,
    };
  if (days === 0)
    return {
      level: 'today',
      borderColor: '#e05555',
      badgeBg: 'var(--rose-soft)',
      badgeColor: '#e05555',
      icon: '🔥',
      label: 'Today!',
    };
  if (days === 1)
    return {
      level: 'urgent',
      borderColor: '#ff6f91',
      badgeBg: 'var(--rose-soft)',
      badgeColor: '#ff5d8f',
      icon: '⚡',
      label: 'Tomorrow',
    };
  if (days <= 3)
    return {
      level: 'urgent',
      borderColor: '#ff8c5a',
      badgeBg: 'var(--peach-soft)',
      badgeColor: '#ff8c5a',
      icon: '⚠️',
      label: `In ${days} days`,
    };
  if (days <= 7)
    return {
      level: 'soon',
      borderColor: '#5f8dff',
      badgeBg: 'var(--lavender-soft)',
      badgeColor: '#5f8dff',
      icon: '📅',
      label: `In ${days} days`,
    };
  return {
    level: 'normal',
    borderColor: '#ffe0ea',
    badgeBg: 'var(--rose-soft)',
    badgeColor: '#ff8fb1',
    icon: '📚',
    label: `In ${days} days`,
  };
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
   SHARED MODAL STYLES (injected once)
───────────────────────────────────────────── */
const MODAL_STYLES = `
  /* ═══════════════════════════════════════════
     SHARED BOTTOM-SHEET / CENTERED MODAL BASE
  ═══════════════════════════════════════════ */

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

  .m-body {
    flex: 1; overflow-y: auto;
    padding: 22px;
    display: flex; flex-direction: column; gap: 18px;
    overscroll-behavior: contain;
  }
  .m-body::-webkit-scrollbar { width: 4px; }
  .m-body::-webkit-scrollbar-track { background: transparent; }
  .m-body::-webkit-scrollbar-thumb { background: #ffd6e1; border-radius: 4px; }

  .m-label {
    display: flex; flex-direction: column; gap: 8px;
    font-size: 11px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.09em;
    color: #c8b0a8; margin: 0;
  }

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

  .m-duration-chip {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 16px; border-radius: 14px;
    background: var(--m-bg, #fff5ee);
    border: 1.5px solid color-mix(in srgb, var(--m-accent, #ff8c5a) 25%, transparent);
    font-size: 13px; color: var(--m-accent, #ff8c5a); font-weight: 600;
    align-self: flex-start;
  }

  .m-time-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .m-err {
    background: #fde8e8; color: #c0392b;
    border-radius: 12px; padding: 10px 14px;
    font-size: 13px; margin: 0;
  }

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

  .m-divider {
    height: 1px;
    background: rgba(255,200,220,0.3);
    margin: 2px 0;
  }

  .m-countdown {
    display: flex; align-items: center; gap: 10px;
    padding: 12px 16px; border-radius: 16px;
    border: 1.5px solid; flex-wrap: wrap;
  }
  .m-countdown-icon { font-size: 20px; line-height: 1; }

  /* Manage Sections Modal */
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
   SHIFT MODAL
───────────────────────────────────────────── */
function ShiftModal({ editing, defaultDate, onClose, onSaved, sections }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name: editing?.section_name ?? sections[0]?.id ?? '',
    shift_date: editing?.shift_date ?? defaultDate ?? toDateStr(new Date()),
    start_time: editing?.start_time ?? '07:00',
    end_time: editing?.end_time ?? '15:00',
    shift_type: editing?.shift_type ?? 'morning',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const meta = SHIFT_TYPES[form.shift_type] ?? SHIFT_TYPES.other;
  const ShiftIcon = meta.icon;
  const accentColor = meta.color;
  const accentBg = meta.bg;
  const duration = calcDuration(form.start_time, form.end_time);

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
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <Dialog className="m-overlay" onClose={onClose}>
      <style>{MODAL_STYLES}</style>
      <div
        className="m-sheet"
        style={{ '--m-accent': accentColor, '--m-bg': accentBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="m-drag-pill" />

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
                    style={
                      on
                        ? {
                            background: val.color,
                            borderColor: val.color,
                            color: '#fff',
                            '--pill-color': val.color,
                          }
                        : { borderColor: val.color + '66', color: val.color }
                    }
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

          <label htmlFor="field-shiftplanner-2" className="m-label">
            Date *
            <input
              id="field-shiftplanner-2"
              type="date"
              className="m-input"
              value={form.shift_date}
              onChange={(e) => setForm({ ...form, shift_date: e.target.value })}
              required
            />
          </label>

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
              style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}
              disabled={saving}
            >
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Shift' : 'Add Shift'}
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
    exam_date: editing?.exam_date ?? defaultDate ?? toDateStr(new Date()),
    section_name: editing?.section_name ?? sections[0]?.id ?? '',
    notes: editing?.notes ?? '',
  });
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
    if (!form.exam_name.trim()) {
      setError('Exam name is required.');
      return;
    }
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
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <Dialog className="m-overlay" onClose={onClose}>
      <style>{MODAL_STYLES}</style>
      <div
        className="m-sheet"
        style={{ '--m-accent': accentColor, '--m-bg': accentBg }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="m-drag-pill" />

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
                  ? urgency
                    ? `${urgency.icon} ${urgency.label}`
                    : 'Pick a date'
                  : 'Track your upcoming assessment'}
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
              <span className="m-countdown-icon">{urgency.icon}</span>
              <span style={{ color: urgency.badgeColor, fontWeight: 700, fontSize: 13 }}>
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
              className="m-input"
              required
              maxLength={120}
              placeholder="e.g. Hematology Midterm Exam"
              value={form.exam_name}
              onChange={(e) => setForm({ ...form, exam_name: e.target.value })}
            />
          </label>

          <label htmlFor="field-shiftplanner-7" className="m-label">
            Exam Date *
            <input
              id="field-shiftplanner-7"
              type="date"
              className="m-input"
              value={form.exam_date}
              required
              onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
            />
          </label>

          <div className="m-divider" />

          <div>
            <p className="m-label" style={{ marginBottom: 10 }}>
              Section
            </p>
            <div className="m-pills">
              {sections.map((s) => {
                const sm = sectionMap[s.id] ?? s;
                const on = form.section_name === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`m-pill ${on ? 'active' : ''}`}
                    style={
                      on
                        ? {
                            background: sm.color,
                            borderColor: sm.color,
                            color: '#fff',
                            '--pill-color': sm.color,
                          }
                        : { borderColor: sm.color + '66', color: sm.color }
                    }
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
              style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}
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
      <style>{MODAL_STYLES}</style>
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
              <span style={{ fontSize: 28 }}>🗂️</span>
              <p>No sections yet.</p>
            </div>
          ) : (
            <div className="msm-list">
              {sections.map((sec) => {
                const isRem = removing === sec.id;
                return (
                  <div key={sec.id} className={`msm-row ${isRem ? 'msm-row-rem' : ''}`}>
                    <div className="msm-row-main">
                      <div
                        className="msm-sec-pill"
                        style={{
                          background: colorToSoftBg(sec.color),
                          color: sec.color,
                          borderColor: sec.color + '55',
                        }}
                      >
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
          <Sparkles size={12} style={{ color: '#ff8fb1', flexShrink: 0 }} />
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
function ExamCalendar({ exams, onAdd, onEdit, currentMonth, onPrevMonth, onNextMonth }) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const todayStr = toDateStr(new Date());

  const monthLabel = currentMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWk = new Date(year, month, 1).getDay();

  const cells = [
    ...Array.from({ length: firstDayOfWk }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }),
  ];

  const monthExams = useMemo(
    () =>
      exams.filter((e) => {
        const [y, m] = e.exam_date.split('-').map(Number);
        return y === year && m === month + 1;
      }),
    [exams, year, month],
  );

  const isCurrentMonth = year === new Date().getFullYear() && month === new Date().getMonth();

  return (
    <div className="sp-card sp-calendar-card">
      <div className="sp-card-header">
        <div
          className="sp-icon-wrap"
          style={{ background: 'linear-gradient(135deg,#7ab6ff,#5f8dff)' }}
        >
          <GraduationCap size={20} />
        </div>
        <div>
          <h3>Exam Calendar</h3>
          <p>
            {monthExams.length} exam{monthExams.length !== 1 ? 's' : ''} this month
          </p>
        </div>
        <button className="ec-add-month-btn" onClick={() => onAdd(null)}>
          <Plus size={14} /> Add Exam
        </button>
      </div>

      <div className="sp-week-nav">
        <button aria-label="Previous" className="sp-nav-btn" onClick={onPrevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span className="sp-week-label">{monthLabel}</span>
        <button aria-label="Next" className="sp-nav-btn" onClick={onNextMonth}>
          <ChevronRight size={16} />
        </button>
        {!isCurrentMonth && (
          <button className="sp-today-btn" onClick={() => onNextMonth('today')}>
            Today
          </button>
        )}
      </div>

      <div className="ec-month-grid">
        {DAYS_SHORT.map((d) => (
          <div key={d} className="ec-dow-header">
            {d}
          </div>
        ))}
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={`blank-${i}`} className="ec-cell ec-cell-blank" />;
          const dayExams = exams.filter((e) => e.exam_date === dateStr);
          const today = dateStr === todayStr;
          const dayNum = parseInt(dateStr.slice(-2), 10);
          const isPast = dateStr < todayStr;
          return (
            <div
              key={dateStr}
              className={`ec-cell ${today ? 'ec-today' : ''} ${isPast ? 'ec-past' : ''} ${dayExams.length > 0 ? 'ec-has-exam' : ''}`}
              onClick={() => onAdd(dateStr)}
              title={`Add exam — ${formatDateFull(dateStr)}`}
            >
              <div className="ec-cell-top">
                <span className={`ec-day-num ${today ? 'ec-today-num' : ''}`}>{dayNum}</span>
              </div>
              <div className="ec-cell-exams">
                {dayExams.length === 0 && (
                  <div className="ec-empty-hint">
                    <Plus size={9} />
                  </div>
                )}
                {dayExams.map((exam) => {
                  const u = getUrgency(daysUntil(exam.exam_date));
                  return (
                    <div
                      key={exam.id}
                      className="ec-exam-pill"
                      style={{
                        background: u.badgeBg,
                        borderColor: u.borderColor + '99',
                        color: u.badgeColor,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(exam);
                      }}
                      title={exam.exam_name}
                    >
                      <GraduationCap size={8} />
                      <span>
                        {exam.exam_name.length > 9
                          ? exam.exam_name.slice(0, 9) + '…'
                          : exam.exam_name}
                      </span>
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
   EXAM HISTORY LIST
───────────────────────────────────────────── */
function ExamHistoryList({ allExams, onEdit, onDelete, sectionMap }) {
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
                : "No upcoming exams — you're clear! ✨"}
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
                const secMeta = sectionMap[exam.section_name] ?? {
                  color: '#ff6f91',
                  bg: 'var(--rose-soft)',
                };
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
                        style={{ background: urgency.badgeBg, color: urgency.badgeColor }}
                      >
                        <GraduationCap size={14} />
                      </div>
                      <div className="ehl-row-info">
                        <div className="ehl-row-name-row">
                          <span className={`ehl-row-name ${isPast ? 'past' : ''}`}>
                            {exam.exam_name}
                          </span>
                          <span
                            className="ehl-countdown"
                            style={{ background: urgency.badgeBg, color: urgency.badgeColor }}
                          >
                            {urgency.icon} {urgency.label}
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
                            <span
                              className="ehl-row-sec"
                              style={{ background: secMeta.bg, color: secMeta.color }}
                            >
                              {exam.section_name}
                            </span>
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
            <span
              className="esw-next-badge"
              style={{ background: nextUrgency.borderColor, color: '#fff' }}
            >
              {nextUrgency.icon} {nextUrgency.label}
            </span>
          </div>
          <p className="esw-next-name" style={{ color: nextUrgency.badgeColor }}>
            {nextExam.exam_name}
          </p>
          <p className="esw-next-date">{formatDateLong(nextExam.exam_date)}</p>
        </div>
      ) : (
        <div className="esw-no-exam">
          <CheckCircle2 size={18} style={{ color: '#4abf95' }} />
          <span>No upcoming exams scheduled.</span>
        </div>
      )}
      <div className="esw-stats">
        <div className="esw-stat">
          <span className="esw-stat-val" style={{ color: '#5f8dff' }}>
            {stats.upcoming}
          </span>
          <span className="esw-stat-label">Upcoming</span>
        </div>
        <div className="esw-stat-div" />
        <div className="esw-stat">
          <span className="esw-stat-val" style={{ color: stats.week7 > 0 ? '#ff8c5a' : '#4abf95' }}>
            {stats.week7}
          </span>
          <span className="esw-stat-label">This Week</span>
        </div>
        <div className="esw-stat-div" />
        <div className="esw-stat">
          <span
            className="esw-stat-val"
            style={{ color: stats.urgent > 0 ? '#e05555' : '#4abf95' }}
          >
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
              <span style={{ color: timerOn ? '#ff5d8f' : '#888', fontWeight: 700, fontSize: 12 }}>
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
          <span className="esw-timer-pct" style={{ color: goalReached ? '#4abf95' : '#bbb' }}>
            {studyPct}%
          </span>
        </div>
        <div className="esw-timer-btns">
          <button
            className={`esw-timer-toggle ${timerOn ? 'on' : ''}`}
            onClick={() => setTimerOn((v) => !v)}
          >
            {timerOn ? '⏸ Pause' : '▶ Start'}
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
          <p className="esw-timer-done">✅ Daily study goal reached! Great work! 🎉</p>
        )}
      </div>
      <div className="sp-tip-card">
        <div className="sp-tip-emoji">{tip.emoji}</div>
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
  onPrevMonth,
  onNextMonth,
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
          {stats.urgent > 1 ? ' are' : ' is'} happening within 3 days — study hard! 💪
        </div>
      )}
      <ExamCalendar
        exams={exams}
        onAdd={onAdd}
        onEdit={onEdit}
        currentMonth={currentMonth}
        onPrevMonth={onPrevMonth}
        onNextMonth={onNextMonth}
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
function WeeklyStats({ shifts }) {
  const totalHours = useMemo(
    () => shifts.reduce((sum, s) => sum + calcDurationHrs(s.start_time, s.end_time), 0),
    [shifts],
  );
  const typeCounts = useMemo(() => {
    const c = {};
    shifts.forEach((s) => {
      c[s.shift_type] = (c[s.shift_type] ?? 0) + 1;
    });
    return c;
  }, [shifts]);
  const nightCount = typeCounts['night'] ?? 0;
  return (
    <div className="sp-stats-bar">
      <div className="sp-stat">
        <CalendarDays size={15} />
        <span>
          <strong>{shifts.length}</strong> shifts
        </span>
      </div>
      <div className="sp-stat-divider" />
      <div className="sp-stat">
        <Clock size={15} />
        <span>
          <strong>{totalHours.toFixed(1)}h</strong> total
        </span>
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
            style={{
              background: meta?.bg,
              color: meta?.color,
              border: `1px solid ${meta?.color}44`,
            }}
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
function ShiftCalendar({
  shifts,
  exams,
  onAdd,
  onEdit,
  onDelete,
  currentWeek,
  onPrevWeek,
  onNextWeek,
}) {
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
        <div className="sp-icon-wrap pink">
          <CalendarDays size={20} />
        </div>
        <div>
          <h3>Weekly Schedule</h3>
          <p>Shifts & exam markers</p>
        </div>
      </div>
      <div className="sp-week-nav">
        <button aria-label="Previous" className="sp-nav-btn" onClick={onPrevWeek}>
          <ChevronLeft size={16} />
        </button>
        <span className="sp-week-label">{getWeekLabel(weekStart)}</span>
        <button aria-label="Next" className="sp-nav-btn" onClick={onNextWeek}>
          <ChevronRight size={16} />
        </button>
        {toDateStr(weekStart) !== toDateStr(getWeekStart(new Date())) && (
          <button className="sp-today-btn" onClick={() => onNextWeek('today')}>
            Today
          </button>
        )}
      </div>
      <WeeklyStats shifts={shifts} />
      <div className="sp-cal-grid">
        {weekDates.map((date, i) => {
          const dateStr = toDateStr(date);
          const dayShifts = shifts.filter((s) => s.shift_date === dateStr);
          const dayExams = exams.filter((e) => e.exam_date === dateStr);
          const today = dateStr === todayStr;
          return (
            <div
              key={dateStr}
              className={`sp-cal-day ${today ? 'today' : ''} ${dayShifts.length + dayExams.length > 0 ? 'has-shifts' : ''}`}
              onClick={() => onAdd(dateStr)}
              title={`Add shift on ${formatDateFull(dateStr)}`}
            >
              <div className="sp-cal-day-header">
                <span className="sp-day-name">{DAYS_SHORT[i]}</span>
                <span className={`sp-day-num ${today ? 'today-num' : ''}`}>{date.getDate()}</span>
              </div>
              <div className="sp-cal-day-shifts">
                {dayShifts.length === 0 && dayExams.length === 0 && (
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
                      style={{
                        background: meta.bg,
                        borderColor: meta.color + '55',
                        color: meta.color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(shift);
                      }}
                      title={`${meta.label} • ${formatTime(shift.start_time)}–${formatTime(shift.end_time)}`}
                    >
                      <SIcon size={10} />
                      <span>{meta.label}</span>
                      <button
                        aria-label="Close"
                        className="sp-pill-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(shift.id);
                        }}
                      >
                        <X size={9} />
                      </button>
                    </div>
                  );
                })}
                {dayExams.map((exam) => {
                  const u = getUrgency(daysUntil(exam.exam_date));
                  return (
                    <div
                      key={exam.id}
                      className="sp-exam-marker"
                      style={{
                        background: u.badgeBg,
                        borderColor: u.borderColor + '88',
                        color: u.badgeColor,
                      }}
                      title={`📚 ${exam.exam_name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <GraduationCap size={9} />
                      <span>
                        {exam.exam_name.length > 8
                          ? exam.exam_name.slice(0, 8) + '…'
                          : exam.exam_name}
                      </span>
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
                  style={{ color: val.color }}
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
          <p>No shifts logged yet ✨</p>
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
                        {shift.notes && <p className="sp-shift-notes">{shift.notes}</p>}
                      </div>
                    </div>
                    <div className="sp-shift-row-actions">
                      <button className="sp-icon-btn" onClick={() => onEdit(shift)}>
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
      text: 'Manageable schedule. Keep the great momentum! ✨',
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
          <span className="sp-section-label">
            <Droplets size={13} /> Daily Hydration
          </span>
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
            >
              💧
            </button>
          ))}
        </div>
        {hydration >= HYDRATION_GOAL && (
          <p className="sp-hydration-done">✅ Hydration goal reached today!</p>
        )}
      </div>
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
   MAIN SHIFT PLANNER (with fixed section persistence)
───────────────────────────────────────────── */
export default function ShiftPlanner() {
  const location = useLocation();
  const { user } = useAuth();

  const [allShifts, setAllShifts] = useState([]);
  const [weekShifts, setWeekShifts] = useState([]);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [loadingShifts, setLoadingShifts] = useState(true);
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
      const { data } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('shift_date', { ascending: false });
      setAllShifts(data || []);
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
        else console.error(error);
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
      : setAllShifts((prev) => [saved, ...prev]);

  const handleShiftDelete = useCallback(async (id) => {
    await supabase.from('shifts').delete().eq('id', id);
    setAllShifts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleExamSaved = (saved, isEdit) =>
    isEdit
      ? setAllExams((prev) => prev.map((e) => (e.id === saved.id ? saved : e)))
      : setAllExams((prev) =>
          [...prev, saved].sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date)),
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

  const prevWeek = () =>
    setCurrentWeek((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() - 7);
      return n;
    });
  const nextWeek = (cmd) => {
    if (cmd === 'today') {
      setCurrentWeek(new Date());
      return;
    }
    setCurrentWeek((d) => {
      const n = new Date(d);
      n.setDate(d.getDate() + 7);
      return n;
    });
  };
  const prevExamMonth = () =>
    setCurrentExamMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextExamMonth = (cmd) => {
    if (cmd === 'today') {
      setCurrentExamMonth(new Date());
      return;
    }
    setCurrentExamMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
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
            onPrevMonth={prevExamMonth}
            onNextMonth={nextExamMonth}
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
