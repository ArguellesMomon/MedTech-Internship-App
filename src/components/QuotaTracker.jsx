import ThemedIcon from './ui/ThemedIcon';
import { countLoggedProcedures, quotaKey, withLoggedProgress } from '../lib/progress';
import { localDate } from '../lib/dates';
import useQuickCreate from '../hooks/useQuickCreate';
import Dialog from './ui/Dialog';
import '../styles/features/QuotaTracker.css';
import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
import {
  Plus,
  Edit3,
  Trash2,
  X,
  Check,
  ClipboardList,
  BarChart2,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Target,
  CheckCircle2,
  TrendingUp,
  Award,
  Zap,
  PencilLine,
  Calendar,
  BookOpen,
  Search,
  Settings2,
  Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
    SECTION MANAGEMENT UTILITIES
  ───────────────────────────────────────────── */
const CUSTOM_SECTION_STORAGE_KEY = 'rotation_guide.sections';

const BASE_SECTIONS = [
  {
    id: 'Hematology',
    color: '#ff6f91',
    bg: 'var(--rose-soft)',
    grad: 'linear-gradient(135deg,#ff8fb1,#ff6f91)',
  },
  {
    id: 'Clinical Chemistry',
    color: '#ff8c5a',
    bg: 'var(--peach-soft)',
    grad: 'linear-gradient(135deg,#ffb37a,#ff8c5a)',
  },
  {
    id: 'Microbiology',
    color: '#5f8dff',
    bg: 'var(--lavender-soft)',
    grad: 'linear-gradient(135deg,#7ab6ff,#5f8dff)',
  },
  {
    id: 'Blood Bank',
    color: '#e05555',
    bg: 'var(--rose-soft)',
    grad: 'linear-gradient(135deg,#ff8f8f,#e05555)',
  },
  {
    id: 'Histopathology/Cytology',
    color: '#4abf95',
    bg: 'var(--sage-soft)',
    grad: 'linear-gradient(135deg,#6dd6b1,#4abf95)',
  },
];

const CUSTOM_SECTION_PALETTE = [
  { color: '#8d6fff', bg: '#f5efff' },
  { color: '#34b3ff', bg: '#e8f6ff' },
  { color: '#54c58e', bg: '#ecfbf2' },
  { color: '#f6b45f', bg: '#fff4e8' },
  { color: '#f56b8a', bg: 'var(--rose-soft)' },
  { color: '#b071ec', bg: '#f4ecff' },
  { color: '#26c6da', bg: '#e0f7fa' },
  { color: '#ef6c00', bg: '#fff3e0' },
];

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
  const palette = CUSTOM_SECTION_PALETTE[Math.abs(hash) % CUSTOM_SECTION_PALETTE.length];
  const grad = `linear-gradient(135deg,${palette.color}cc,${palette.color})`;
  return { ...palette, grad };
}

function normalizeStoredSections(saved) {
  if (!Array.isArray(saved) || saved.length === 0) return BASE_SECTIONS;
  const seen = new Set();
  return saved.reduce((list, s) => {
    const id = typeof s?.id === 'string' ? s.id.trim() : '';
    if (!id || seen.has(id.toLowerCase())) return list;
    seen.add(id.toLowerCase());
    const base = BASE_SECTIONS.find((b) => b.id === id);
    const color = s.color || base?.color || generateSectionMeta(id).color;
    const bg = s.bg || base?.bg || colorToSoftBg(color);
    const grad = s.grad || base?.grad || `linear-gradient(135deg,${color}cc,${color})`;
    list.push({ id, color, bg, grad });
    return list;
  }, []);
}

/* ─────────────────────────────────────────────
    CONSTANTS
  ───────────────────────────────────────────── */
const DEFAULT_PROCEDURES = {
  Hematology: [
    'CBC (Complete Blood Count)',
    'Peripheral Blood Smear',
    'ESR',
    'Platelet Count',
    'PT/APTT',
    'Reticulocyte Count',
  ],
  'Clinical Chemistry': [
    'Blood Glucose',
    'Lipid Profile',
    'Liver Function Tests',
    'BUN/Creatinine',
    'Electrolytes',
    'Urinalysis',
  ],
  Microbiology: [
    'Gram Staining',
    'Culture & Sensitivity',
    'KOH Preparation',
    'AFB Smear',
    'Antibiotic Sensitivity Test',
    'Stool Exam',
  ],
  'Blood Bank': [
    'ABO/Rh Typing',
    'Crossmatching',
    'Antibody Screening',
    'Direct Coombs Test',
    'Blood Component Prep',
  ],
  'Histopathology/Cytology': [
    'Tissue Processing',
    'Microtomy / Sectioning',
    'H&E Staining',
    'Pap Smear Preparation',
    'Special Stains',
    'Frozen Section',
  ],
};

function isMissingTable(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.message?.includes('Could not find the table')
  );
}

function fmt(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtFull(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function isToday(dateStr) {
  return dateStr === localDate();
}

function isYesterday(dateStr) {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return dateStr === y.toISOString().slice(0, 10);
}

function getDayLabel(dateStr) {
  if (isToday(dateStr))
    return (
      <>
        <ThemedIcon name="CalendarDays" size={14} /> Today
      </>
    );
  if (isYesterday(dateStr)) return 'Yesterday';
  return fmt(dateStr);
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
    <Dialog className="ms-overlay" onClose={onClose}>
      <div className="ms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ms-head">
          <div className="ms-head-left">
            <div className="ms-head-icon">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="ms-title">Manage Sections</h3>
              <p className="ms-sub">Add custom sections, change colors, or remove extras</p>
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
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p className="ms-error">{error}</p>}
        </div>

        <div>
          <p className="ms-box-label">
            All Sections
            <span className="ms-count">{sections.length}</span>
          </p>
          <div className="ms-list">
            {sections.map((sec) => {
              const meta = { ...generateSectionMeta(sec.id), ...sec };
              const isRem = removing === sec.id;

              return (
                <div key={sec.id} className={`ms-row ${isRem ? 'ms-row-rem' : ''}`}>
                  <div className="ms-row-main">
                    <div className="ms-sec-pill">
                      <span className="ms-dot" style={{ background: meta.color }} />
                      {sec.id}
                    </div>
                    <label
                      htmlFor="field-quotatracker-1"
                      className="ms-color-control"
                      title={`Change ${sec.id} color`}
                    >
                      <span className="ms-color-swatch" style={{ background: meta.color }} />
                      <input
                        id="field-quotatracker-1"
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
        </div>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
    HERO STATS BAR — clean 3‑stat grid
  ───────────────────────────────────────────── */
function HeroStats({ logs }) {
  const todayStr = localDate();
  const todayCount = logs
    .filter((l) => l.log_date === todayStr)
    .reduce((s, l) => s + (l.count_done ?? 1), 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekCount = logs
    .filter((l) => new Date(l.log_date + 'T12:00:00') >= weekStart)
    .reduce((s, l) => s + (l.count_done ?? 1), 0);

  const totalProcs = logs.reduce((s, l) => s + (l.count_done ?? 1), 0);

  return (
    <div className="hs-stats">
      <div className="hs-stat">
        <span className="hs-stat-n" style={{ color: 'var(--accent)' }}>
          {todayCount}
        </span>
        <span className="hs-stat-l">Today</span>
      </div>
      <div className="hs-stat">
        <span className="hs-stat-n" style={{ color: 'var(--peach)' }}>
          {weekCount}
        </span>
        <span className="hs-stat-l">This Week</span>
      </div>
      <div className="hs-stat">
        <span className="hs-stat-n" style={{ color: 'var(--lavender)' }}>
          {totalProcs}
        </span>
        <span className="hs-stat-l">Total Done</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
    LOG ENTRY MODAL
  ───────────────────────────────────────────── */
function LogModal({
  editing,
  defaultSection,
  quotasBySection,
  sections,
  sectionMap,
  onClose,
  onSaved,
}) {
  const { user } = useAuth();

  const [sectionId, setSectionId] = useState(
    editing?.section_name || defaultSection || sections[0]?.id || '',
  );

  const meta = sectionMap[sectionId] ?? generateSectionMeta(sectionId);
  const accentColor = meta?.color ?? '#ff6f91';

  const procedureOptions = useMemo(() => {
    const defaults = DEFAULT_PROCEDURES[sectionId] ?? [];
    const defaultSet = new Set(defaults);
    const fromQuotas = (quotasBySection[sectionId] ?? []).map((q) => q.task_name);
    const customOnly = fromQuotas.filter((p) => !defaultSet.has(p));
    return [...defaults, ...customOnly];
  }, [sectionId, quotasBySection]);

  const [form, setForm] = useState({
    log_date: editing?.log_date ?? localDate(),
    procedure_name: editing?.procedure_name ?? '',
    count_done: editing?.count_done ?? 1,
    supervisor: editing?.supervisor ?? '',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSectionChange = (id) => {
    setSectionId(id);
    setForm((f) => ({ ...f, procedure_name: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.procedure_name) {
      setError('Please select a procedure.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      user_id: user.id,
      section_name: sectionId,
      log_date: form.log_date,
      procedure_name: form.procedure_name,
      count_done: Number(form.count_done),
      supervisor: form.supervisor.trim(),
      notes: form.notes.trim(),
      progress: 100,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (editing) {
      result = await supabase
        .from('daily_reports')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single();
    } else {
      result = await supabase.from('daily_reports').insert([payload]).select().single();
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
    <Dialog className="lm-overlay" onClose={onClose}>
      <div className="lm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="lm-header">
          <div className="lm-header-left">
            <div className="lm-header-icon">
              {editing ? (
                <Edit3 size={16} color="currentColor" />
              ) : (
                <Plus size={16} color="currentColor" />
              )}
            </div>
            <span className="lm-header-title">{editing ? 'Edit Entry' : 'Log Procedure'}</span>
          </div>
          <button aria-label="Close" className="lm-header-close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="lm-body">
          <div>
            <p className="lm-flabel">Section</p>
            <div className="lm-sec-pills">
              {sections.map((s) => {
                const on = sectionId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="lm-sec-pill"
                    aria-pressed={on}

                    onClick={() => handleSectionChange(s.id)}
                  >
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lm-row2">
            <label htmlFor="field-quotatracker-4" className="lm-flabel">
              Date *
              <input
                id="field-quotatracker-4"
                type="date"
                className="lm-input"
                style={{ '--a': accentColor }}
                value={form.log_date}
                onChange={(e) => setForm({ ...form, log_date: e.target.value })}
                required
              />
            </label>
            <label htmlFor="field-quotatracker-5" className="lm-flabel">
              Count *
              <input
                id="field-quotatracker-5"
                type="number"
                className="lm-input"
                style={{ '--a': accentColor }}
                min="1"
                max="999"
                value={form.count_done}
                onChange={(e) => setForm({ ...form, count_done: e.target.value })}
                required
              />
            </label>
          </div>

          <div>
            <p className="lm-flabel">Procedure *</p>
            <select
              className="lm-input lm-sel"
              style={{ '--a': accentColor }}
              value={form.procedure_name}
              onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}
              required
            >
              <option value="">— Select procedure —</option>
              {procedureOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <label htmlFor="field-quotatracker-2" className="lm-flabel">
            Supervisor
            <input
              id="field-quotatracker-2"
              className="lm-input"
              style={{ '--a': accentColor }}
              placeholder="Supervising MLT / MLS name…"
              value={form.supervisor}
              onChange={(e) => setForm({ ...form, supervisor: e.target.value })}
            />
          </label>

          <label htmlFor="field-quotatracker-3" className="lm-flabel">
            Reflection / Notes
            <textarea
              id="field-quotatracker-3"
              className="lm-textarea"
              style={{ '--a': accentColor }}
              rows={3}
              placeholder="What did you learn? Any difficulties?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          {error && <p className="lm-error">{error}</p>}

          <div className="lm-actions">
            <button
              type="submit"
              className="lm-primary"

              disabled={saving}
            >
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Entry' : 'Save Entry'}
            </button>
            <button type="button" className="lm-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
    DAILY LOG TAB
  ───────────────────────────────────────────── */
function DailyLogTab({ logs, sections, sectionMap, onAdd, onEdit, onDelete, onManageSections }) {
  const [filterSection, setFilterSection] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  const filtered = useMemo(() => {
    let list = [...logs].sort((a, b) => {
      const dd = new Date(b.log_date) - new Date(a.log_date);
      return dd !== 0 ? dd : new Date(b.created_at) - new Date(a.created_at);
    });
    if (filterSection) list = list.filter((l) => l.section_name === filterSection);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.procedure_name?.toLowerCase().includes(q) ||
          l.notes?.toLowerCase().includes(q) ||
          l.supervisor?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [logs, filterSection, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach((l) => {
      if (!map[l.log_date]) map[l.log_date] = [];
      map[l.log_date].push(l);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const activeFilters = [filterSection, search.trim()].filter(Boolean).length;

  return (
    <div className="dl-wrap">
      <div className="dl-toolbar">
        <div className="dl-search-wrap">
          <Search size={13} className="dl-search-icon" />
          <input
            className="dl-search"
            placeholder="Search procedures, notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button aria-label="Close" className="dl-search-clear" onClick={() => setSearch('')}>
              <X size={11} />
            </button>
          )}
        </div>

        <button
          className={`dl-filter-btn ${activeFilters > 0 ? 'active' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          <Filter size={13} />
          Filters
          {activeFilters > 0 && <span className="dl-filter-badge">{activeFilters}</span>}
          {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <button className="dl-add-btn" onClick={() => onAdd()}>
          <Plus size={15} /> Log Entry
        </button>
      </div>

      <div className={`dl-fp-outer ${showFilters ? 'open' : ''}`}>
        <div className="dl-fp-inner">
          <div className="dl-filter-panel">
            <div className="dl-filter-group">
              <div className="dl-filter-group-header">
                <span className="dl-filter-group-label">Section</span>
                <button className="dl-manage-link" onClick={onManageSections}>
                  <Settings2 size={11} /> Edit Sections
                </button>
              </div>
              <div className="dl-filter-pills">
                <button
                  className={`dl-fpill ${!filterSection ? 'all-active' : ''}`}
                  onClick={() => setFilterSection('')}
                >
                  All
                </button>
                {sections.map((s) => {
                  return (
                    <button
                      key={s.id}
                      className="dl-fpill"

                      onClick={() => setFilterSection(filterSection === s.id ? '' : s.id)}
                    >
                      {s.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeFilters > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="dl-clear-all"
                  onClick={() => {
                    setFilterSection('');
                    setSearch('');
                  }}
                >
                  <X size={11} /> Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {(activeFilters > 0 || search) && (
        <p className="dl-results-count">
          {filtered.length} of {logs.length} entries
        </p>
      )}

      {grouped.length === 0 && (
        <div className="dl-empty-hero">
          <div className="dl-empty-hero-icon">
            {logs.length === 0 ? <ThemedIcon name="NotebookPen" /> : <ThemedIcon name="Search" />}
          </div>
          <h3>{logs.length === 0 ? 'No log entries yet' : 'No matching entries'}</h3>
          <p>
            {logs.length === 0
              ? 'Start by logging your first procedure.'
              : 'No entries match the current filters.'}
          </p>
          {logs.length === 0 && (
            <button className="dl-empty-btn" onClick={() => onAdd()}>
              <Plus size={14} /> Log First Procedure
            </button>
          )}
        </div>
      )}

      <div className="dl-timeline">
        {grouped.map(([dateStr, dayLogs]) => (
          <div key={dateStr} className="dl-day-group">
            <div className="dl-day-header">
              <span className="dl-day-label">
                {getDayLabel(dateStr)}
                {isToday(dateStr) && <span className="dl-today-dot" />}
              </span>
              <span className="dl-day-sub">
                {fmtFull(dateStr)} · {dayLogs.reduce((s, l) => s + (l.count_done ?? 1), 0)}{' '}
                procedures
              </span>
            </div>

            {dayLogs.map((log) => {
              const secMeta = sectionMap[log.section_name] ?? generateSectionMeta(log.section_name);
              const isConf = confirmId === log.id;

              return (
                <div
                  key={log.id}
                  className="dl-entry-card"
                  style={{ borderLeftColor: secMeta?.color ?? '#ff6f91' }}
                >
                  <div className="dl-entry-top">
                    <div className="dl-entry-main">
                      <h4 className="dl-entry-proc">{log.procedure_name}</h4>
                      <div className="dl-entry-tags">
                        <span className="dl-tag">{log.section_name}</span>
                        <span className="dl-tag count">×{log.count_done}</span>
                      </div>
                    </div>
                    <div className="dl-entry-actions">
                      {isConf ? (
                        <div className="dl-confirm-row">
                          <span>Delete?</span>
                          <button
                            className="dl-conf-yes"
                            onClick={() => {
                              onDelete(log.id);
                              setConfirmId(null);
                            }}
                          >
                            Yes
                          </button>
                          <button className="dl-conf-no" onClick={() => setConfirmId(null)}>
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button className="dl-act-btn" onClick={() => onEdit(log)} title="Edit">
                            <Edit3 size={13} />
                          </button>
                          <button
                            className="dl-act-btn danger"
                            onClick={() => setConfirmId(log.id)}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {log.supervisor && (
                    <p className="dl-entry-sup">
                      <ThemedIcon name="UserRound" /> {log.supervisor}
                    </p>
                  )}
                  {log.notes && <p className="dl-entry-notes">"{log.notes}"</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
    QUOTA BOARD TAB
  ───────────────────────────────────────────── */
function QuotaBoardTab({
  logs,
  quotasBySection,
  sections,
  sectionMap,
  onQuotasChange,
  onManageSections,
}) {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState(sections[0]?.id ?? '');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    task_name: '',
    target_count: '',
    completed_count: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());
  const [showSections, setShowSections] = useState(true);

  useEffect(() => {
    if (expandedSection && !sections.find((s) => s.id === expandedSection)) {
      setExpandedSection(sections[0]?.id ?? '');
    }
  }, [sections, expandedSection]);

  const logCounts = useMemo(() => countLoggedProcedures(logs), [logs]);

  const startEdit = (quota) => {
    setEditingId(quota.id);
    setEditForm({
      task_name: quota.task_name,
      target_count: String(quota.target_count),
      completed_count: String(quota.completed_count ?? 0),
    });
    setError('');
  };
  const startNew = (sid) => {
    setEditingId(`new::${sid}`);
    setEditForm({ task_name: '', target_count: '', completed_count: '0' });
    setError('');
  };
  const cancelEdit = () => {
    setEditingId(null);
    setError('');
  };

  const saveEdit = async (sectionId) => {
    if (!editForm.task_name.trim()) {
      setError('Procedure name is required.');
      return;
    }
    const target = parseInt(editForm.target_count, 10);
    const done = parseInt(editForm.completed_count, 10);
    if (isNaN(target) || target < 1) {
      setError('Goal must be ≥ 1.');
      return;
    }
    if (isNaN(done) || done < 0) {
      setError('Progress must be ≥ 0.');
      return;
    }

    setSaving(true);
    setError('');
    const existing = quotasBySection[sectionId] ?? [];

    if (editingId.startsWith('new::')) {
      const { data, error: err } = await supabase
        .from('quotas')
        .insert([
          {
            user_id: user.id,
            section_name: sectionId,
            task_name: editForm.task_name.trim(),
            target_count: target,
            completed_count: done,
          },
        ])
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      onQuotasChange(sectionId, [...existing, data]);
    } else {
      const { data, error: err } = await supabase
        .from('quotas')
        .update({
          task_name: editForm.task_name.trim(),
          target_count: target,
          completed_count: done,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
        .select()
        .single();
      setSaving(false);
      if (err) {
        setError(err.message);
        return;
      }
      onQuotasChange(
        sectionId,
        existing.map((q) => (q.id === editingId ? data : q)),
      );
    }
    cancelEdit();
  };

  const deleteQuota = async (sectionId, id) => {
    setDeleting(id);
    await supabase.from('quotas').delete().eq('id', id);
    setDeleting(null);
    onQuotasChange(
      sectionId,
      (quotasBySection[sectionId] ?? []).filter((q) => q.id !== id),
    );
  };

  const quickIncrement = async (sectionId, quota) => {
    const newCount =
      Math.max(quota.completed_count ?? 0, logCounts[quotaKey(sectionId, quota.task_name)] || 0) +
      1;
    const { data, error: err } = await supabase
      .from('quotas')
      .update({ completed_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', quota.id)
      .select()
      .single();
    if (!err)
      onQuotasChange(
        sectionId,
        (quotasBySection[sectionId] ?? []).map((q) => (q.id === quota.id ? data : q)),
      );
  };

  const sectionSummaries = useMemo(
    () =>
      sections.map((sec) => {
        const meta = sectionMap[sec.id] ?? generateSectionMeta(sec.id);
        const quotas = quotasBySection[sec.id] ?? [];
        let done = 0,
          required = 0;
        quotas.forEach((q) => {
          const logCount = logCounts[quotaKey(sec.id, q.task_name)] ?? 0;
          done += Math.max(q.completed_count ?? 0, logCount);
          required += q.target_count ?? 0;
        });
        const pct = required > 0 ? Math.min(100, Math.round((done / required) * 100)) : 0;
        return { ...sec, ...meta, done, required, pct, quotaCount: quotas.length };
      }),
    [sections, sectionMap, quotasBySection, logCounts],
  );

  return (
    <div className="qb-wrap">
      <div className="qb-header-row">
        <button className="qb-sections-toggle" onClick={() => setShowSections((v) => !v)}>
          <p className="qb-overview-label">Sections</p>
          {showSections ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <button className="qb-manage-link" onClick={onManageSections}>
          <Settings2 size={12} /> Edit Sections
        </button>
      </div>

      <div className={`qb-sections-wrap ${showSections ? 'open' : ''}`}>
        <div className="qb-overview">
          {' '}
          {sectionSummaries.map((sec) => (
            <button
              key={sec.id}
              className={`qb-sec-btn ${expandedSection === sec.id ? 'active' : ''}`}

              onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)}
            >
              <div className="qb-sec-top">
                <span className="qb-sec-name" style={{ color: 'var(--ink)' }}>
                  {sec.id}
                </span>
                <span className="qb-sec-pct">
                  {sec.pct >= 100 ? <ThemedIcon name="CircleCheck" /> : `${sec.pct}%`}
                </span>
              </div>
              <div className="qb-sec-bar">
                <div
                  className="qb-sec-fill"
                  style={{
                    width: `${sec.pct}%`,
                    background:
                      sec.pct >= 100 ? 'linear-gradient(90deg,#6dd6b1,#4abf95)' : sec.grad,
                  }}
                />
              </div>
              <span className="qb-sec-sub">
                {sec.done}/{sec.required} · {sec.quotaCount} procedures
              </span>
            </button>
          ))}
        </div>
      </div>

      {expandedSection &&
        (() => {
          const secMeta = sectionMap[expandedSection] ?? generateSectionMeta(expandedSection);
          const quotas = quotasBySection[expandedSection] ?? [];
          const trackedNames = new Set(quotas.map((q) => q.task_name));
          const defaultProcs = DEFAULT_PROCEDURES[expandedSection] ?? [];
          const untrackedDefaults = defaultProcs.filter(
            (p) => !trackedNames.has(p) && !dismissedSuggestions.has(p),
          );
          const newKey = `new::${expandedSection}`;
          const isAddingNew = editingId === newKey;

          const addDefaultAsQuota = async (procName) => {
            setSaving(true);
            setError('');
            const { data, error: err } = await supabase
              .from('quotas')
              .insert([
                {
                  user_id: user.id,
                  section_name: expandedSection,
                  task_name: procName,
                  target_count: 50,
                  completed_count: 0,
                },
              ])
              .select()
              .single();
            setSaving(false);
            if (err) {
              setError(err.message);
              return;
            }
            onQuotasChange(expandedSection, [...quotas, data]);
          };

          return (
            <div className="qb-detail" style={{ borderColor: secMeta.color + '44' }}>
              <div className="qb-detail-header">
                <div>
                  <h3 className="qb-detail-title" style={{ color: 'var(--ink)' }}>
                    {expandedSection}
                  </h3>
                  <p className="qb-detail-sub">{quotas.length} tracked procedures</p>
                </div>
                <button
                  className="qb-add-btn"

                  onClick={() => startNew(expandedSection)}
                  disabled={isAddingNew}
                >
                  <Plus size={14} /> Add Procedure
                </button>
              </div>

              {error && <p className="qb-error">{error}</p>}

              {isAddingNew && (
                <div className="qb-edit-card" style={{ borderColor: secMeta.color + '55' }}>
                  <input
                    className="qb-input qb-proc-input"
                    placeholder="Procedure name…"
                    autoFocus
                    value={editForm.task_name}
                    onChange={(e) => setEditForm({ ...editForm, task_name: e.target.value })}
                  />
                  <div className="qb-edit-nums">
                    <label htmlFor="field-quotatracker-6" className="qb-num-label">
                      <Target size={11} /> Goal
                      <input
                        id="field-quotatracker-6"
                        className="qb-input qb-num"
                        type="number"
                        min="1"
                        placeholder="50"
                        value={editForm.target_count}
                        onChange={(e) => setEditForm({ ...editForm, target_count: e.target.value })}
                      />
                    </label>
                    <label htmlFor="field-quotatracker-7" className="qb-num-label">
                      <CheckCircle2 size={11} /> Done
                      <input
                        id="field-quotatracker-7"
                        className="qb-input qb-num"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={editForm.completed_count}
                        onChange={(e) =>
                          setEditForm({ ...editForm, completed_count: e.target.value })
                        }
                      />
                    </label>
                  </div>
                  <div className="qb-edit-btns">
                    <button
                      className="qb-save-btn"

                      onClick={() => saveEdit(expandedSection)}
                      disabled={saving}
                    >
                      <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button aria-label="Close" className="qb-cancel-btn" onClick={cancelEdit}>
                      <X size={13} />
                    </button>
                  </div>
                </div>
              )}

              {quotas.length === 0 && !isAddingNew && (
                <div className="qb-empty-hero">
                  <div className="qb-empty-hero-icon">
                    <ThemedIcon name="Target" />
                  </div>
                  <h3>No quota items yet</h3>
                  <p>Add your first procedure target to start tracking this section.</p>
                </div>
              )}

              {quotas.map((q) => {
                const logCount = logCounts[quotaKey(expandedSection, q.task_name)] ?? 0;
                const manCount = q.completed_count ?? 0;
                const effective = Math.max(manCount, logCount);
                const pct = Math.min(100, Math.round((effective / (q.target_count || 1)) * 100));
                const complete = effective >= q.target_count;
                const isEditRow = editingId === q.id;

                if (isEditRow) {
                  return (
                    <div
                      key={q.id}
                      className="qb-edit-card"
                      style={{ borderColor: secMeta.color + '55' }}
                    >
                      <input
                        className="qb-input qb-proc-input"
                        autoFocus
                        value={editForm.task_name}
                        onChange={(e) => setEditForm({ ...editForm, task_name: e.target.value })}
                      />
                      <div className="qb-edit-nums">
                        <label htmlFor="field-quotatracker-8" className="qb-num-label">
                          <Target size={11} /> Goal
                          <input
                            id="field-quotatracker-8"
                            className="qb-input qb-num"
                            type="number"
                            min="1"
                            value={editForm.target_count}
                            onChange={(e) =>
                              setEditForm({ ...editForm, target_count: e.target.value })
                            }
                          />
                        </label>
                        <label htmlFor="field-quotatracker-9" className="qb-num-label">
                          <CheckCircle2 size={11} /> Done
                          <input
                            id="field-quotatracker-9"
                            className="qb-input qb-num"
                            type="number"
                            min="0"
                            value={editForm.completed_count}
                            onChange={(e) =>
                              setEditForm({ ...editForm, completed_count: e.target.value })
                            }
                          />
                        </label>
                      </div>
                      <div className="qb-edit-btns">
                        <button
                          className="qb-save-btn"

                          onClick={() => saveEdit(expandedSection)}
                          disabled={saving}
                        >
                          <Check size={13} /> {saving ? 'Saving…' : 'Update'}
                        </button>
                        <button aria-label="Close" className="qb-cancel-btn" onClick={cancelEdit}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={q.id} className={`qb-quota-row ${complete ? 'complete' : ''}`}>
                    <div className="qb-qrow-top">
                      <span className="qb-qname">{q.task_name}</span>
                      <div className="qb-qrow-right">
                        {logCount > 0 && logCount !== manCount && (
                          <span className="qb-log-hint" title="Counted from your daily logs"></span>
                        )}
                        <span className="qb-count">
                          {effective}/{q.target_count}
                          {complete && <ThemedIcon name="CircleCheck" size={16} />}
                        </span>
                        <button
                          className="qb-plus-btn"
                          style={{ color: 'var(--ink)', borderColor: secMeta.color + '44' }}
                          onClick={() => quickIncrement(expandedSection, q)}
                          title="Quick +1"
                        >
                          +1
                        </button>
                        <button className="qb-icon-btn" onClick={() => startEdit(q)} title="Edit">
                          <PencilLine size={12} />
                        </button>
                        <button
                          className="qb-icon-btn danger"
                          title="Delete"
                          disabled={deleting === q.id}
                          onClick={() => deleteQuota(expandedSection, q.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="qb-bar-wrap">
                      <div className="qb-bar">
                        <div
                          className="qb-bar-fill"
                          style={{
                            width: `${pct}%`,
                            background: complete
                              ? 'linear-gradient(90deg,#6dd6b1,#4abf95)'
                              : secMeta.grad,
                          }}
                        />
                      </div>
                      <span className="qb-pct-label">{pct}%</span>
                    </div>
                    {logCount > 0 && manCount > 0 && (
                      <p className="qb-src-hint">
                        Manual: {manCount} · From logs: {logCount}
                      </p>
                    )}
                  </div>
                );
              })}

              {untrackedDefaults.length > 0 && (
                <div
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1.5px solid ${secMeta.color}22`,
                  }}
                >
                  <p
                    className="qb-detail-sub"
                    style={{ marginBottom: '10px', color: 'var(--ink)', fontWeight: 600 }}
                  >
                    <ThemedIcon name="BookOpen" /> Suggested Procedures
                  </p>
                  {untrackedDefaults.map((proc) => (
                    <div key={proc} className="qb-default-proc">
                      <span className="qb-default-name">{proc}</span>
                      <div className="qb-default-btns">
                        <button
                          className="qb-default-add-btn"

                          onClick={() => addDefaultAsQuota(proc)}
                          disabled={saving}
                          title="Add to quota tracking"
                        >
                          <Plus size={12} /> Add
                        </button>
                        <button
                          className="qb-default-delete-btn"
                          onClick={() =>
                            setDismissedSuggestions((prev) => new Set([...prev, proc]))
                          }
                          title="Dismiss this suggestion"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
    </div>
  );
}

/* ─────────────────────────────────────────────
    MAIN COMPONENT
  ───────────────────────────────────────────── */
export default function DailyReportTracker() {
  const { user } = useAuth();

  const [allLogs, setAllLogs] = useState([]);
  const [quotasBySection, setQuotasBySection] = useState({});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [activeTab, setActiveTab] = useState('log');
  const [showModal, setShowModal] = useState(
    () => new URLSearchParams(window.location.search).get('new') === '1',
  );
  useQuickCreate(setShowModal);
  const [editingLog, setEditingLog] = useState(null);
  const [defaultSection, setDefaultSection] = useState('');

  const [sections, setSections] = useState(BASE_SECTIONS);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [showManage, setShowManage] = useState(false);

  // ── Load custom sections from Supabase ──
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
          setSections(BASE_SECTIONS);

          return;
        }

        const saved = data?.value;
        if (saved && Array.isArray(saved) && saved.length > 0) {
          setSections(normalizeStoredSections(saved));
        } else {
          setSections(BASE_SECTIONS);
        }
        setSectionsLoaded(true);
      } catch (err) {
        console.error('Unexpected load error:', err);
        setSections(BASE_SECTIONS);
      }
    };
    loadSections();
  }, [user.id]);

  // ── Save sections whenever they change ──
  useEffect(() => {
    if (!sectionsLoaded) return;

    const saveSections = async () => {
      try {
        const toSave = sections.map((s) => ({
          id: s.id,
          color: s.color,
          bg: s.bg,
          grad: s.grad,
        }));
        const { error } = await supabase.from('user_settings').upsert(
          {
            user_id: user.id,
            key: CUSTOM_SECTION_STORAGE_KEY,
            value: toSave,
          },
          { onConflict: 'user_id,key' },
        );
        if (error) console.error('Save sections error:', error);
      } catch (err) {
        console.error('Unexpected save error:', err);
      }
    };
    saveSections();
  }, [sections, sectionsLoaded, user.id]);

  const sectionMap = useMemo(() => {
    const map = {};
    sections.forEach((s) => {
      map[s.id] = { ...generateSectionMeta(s.id), ...s };
    });
    return map;
  }, [sections]);

  const handleAddSection = (label) => {
    const meta = generateSectionMeta(label);
    setSections((prev) => [
      ...prev,
      { id: label, color: meta.color, bg: meta.bg, grad: meta.grad },
    ]);
    setQuotasBySection((prev) => ({ ...prev, [label]: [] }));
  };

  const handleRemoveSection = (id) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSectionColorChange = (id, color) => {
    const bg = colorToSoftBg(color);
    const grad = `linear-gradient(135deg,${color}cc,${color})`;
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, color, bg, grad } : s)));
  };

  // ── Load daily logs and quotas ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: logsData, error: logsErr } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (logsErr) {
        if (isMissingTable(logsErr))
          setDbError(
            'The daily_reports table is missing. Run supabase/schema.sql in your Supabase project.',
          );
        else
          setDbError('Your logbook couldn’t load. Check your connection and refresh to try again.');
        setLoading(false);
        return;
      }
      setAllLogs(logsData ?? []);

      const { data: quotasData, error: quotasErr } = await supabase
        .from('quotas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (quotasErr && !isMissingTable(quotasErr)) console.error(quotasErr);

      const grouped = {};
      sections.forEach((s) => {
        grouped[s.id] = [];
      });
      (quotasData ?? []).forEach((q) => {
        if (!grouped[q.section_name]) grouped[q.section_name] = [];
        grouped[q.section_name].push(q);
      });
      setQuotasBySection(grouped);
      setDefaultSection(sections[0]?.id ?? '');
      setLoading(false);
    };
    load();
  }, [user.id, sections]);

  const handleLogSaved = useCallback((saved, isEdit) => {
    setAllLogs((prev) =>
      isEdit ? prev.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...prev],
    );
  }, []);

  const handleLogDelete = useCallback(async (id) => {
    await supabase.from('daily_reports').delete().eq('id', id);
    setAllLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleQuotasChange = useCallback((sectionId, newQuotas) => {
    setQuotasBySection((prev) => ({ ...prev, [sectionId]: newQuotas }));
  }, []);

  const openAdd = (section) => {
    setEditingLog(null);
    setDefaultSection(section ?? sections[0]?.id ?? '');
    setShowModal(true);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setDefaultSection(log.section_name);
    setShowModal(true);
  };

  const tabStats = useMemo(() => {
    let completed = 0,
      required = 0,
      quotaItems = 0;
    Object.values(quotasBySection).forEach((storedQuotas) => {
      const quotas = withLoggedProgress(storedQuotas, allLogs);
      quotaItems += quotas.length;
      quotas.forEach((q) => {
        completed += q.completed_count ?? 0;
        required += q.target_count ?? 0;
      });
    });
    return {
      logCount: allLogs.length,
      quotaItems,
      quotaPct: required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0,
    };
  }, [allLogs, quotasBySection]);

  return (
    <>
      <div className="qtr-page">
        <h1 className="qtr-title">
          Daily Logbook &amp; <span className="qtr-title-accent">Quota Tracker</span>
        </h1>
        <p className="tool-page-description">
          Capture your procedures, reflect on your day, and watch your progress add up.
        </p>

        {dbError && (
          <div className="qtr-error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{dbError}</span>
          </div>
        )}

        {loading ? (
          <div
            style={{ textAlign: 'center', padding: '52px 0', color: 'var(--muted)', fontSize: 14 }}
          >
            Loading your logbook…
          </div>
        ) : (
          <>
            <HeroStats logs={allLogs} />

            <div className="qtr-tabs">
              <button
                className={`qtr-tab ${activeTab === 'log' ? 'active' : ''}`}
                onClick={() => setActiveTab('log')}
              >
                <span className="qtr-tab-icon">
                  <ClipboardList size={18} />
                </span>
                <span className="qtr-tab-copy">
                  <span className="qtr-tab-title">Daily Log</span>
                  <span className="qtr-tab-sub">Record procedures</span>
                </span>
                <span className="qtr-tab-badge">{tabStats.logCount}</span>
              </button>
              <button
                className={`qtr-tab quota ${activeTab === 'quota' ? 'active' : ''}`}
                onClick={() => setActiveTab('quota')}
              >
                <span className="qtr-tab-icon">
                  <BarChart2 size={18} />
                </span>
                <span className="qtr-tab-copy">
                  <span className="qtr-tab-title">Quota Board</span>
                  <span className="qtr-tab-sub">{tabStats.quotaItems} tracked items</span>
                </span>
                <span className="qtr-tab-badge">{tabStats.quotaPct}%</span>
              </button>
            </div>

            {activeTab === 'log' && (
              <DailyLogTab
                logs={allLogs}
                quotasBySection={quotasBySection}
                sections={sections}
                sectionMap={sectionMap}
                onAdd={openAdd}
                onEdit={openEdit}
                onDelete={handleLogDelete}
                onManageSections={() => setShowManage(true)}
              />
            )}

            {activeTab === 'quota' && (
              <QuotaBoardTab
                logs={allLogs}
                quotasBySection={quotasBySection}
                sections={sections}
                sectionMap={sectionMap}
                onQuotasChange={handleQuotasChange}
                onManageSections={() => setShowManage(true)}
              />
            )}
          </>
        )}
      </div>

      {showModal && (
        <LogModal
          editing={editingLog}
          defaultSection={defaultSection}
          quotasBySection={quotasBySection}
          sections={sections}
          sectionMap={sectionMap}
          onClose={() => {
            setShowModal(false);
            setEditingLog(null);
          }}
          onSaved={handleLogSaved}
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
