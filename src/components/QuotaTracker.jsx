import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  Plus, Edit3, Trash2, X, Check,
  ClipboardList, BarChart2, AlertCircle,
  Filter, ChevronDown, ChevronUp, Target,
  CheckCircle2, TrendingUp, Award, Zap,
  PencilLine, Calendar, BookOpen, Search,
  Settings2, Sparkles,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   SECTION MANAGEMENT UTILITIES
───────────────────────────────────────────── */
const CUSTOM_SECTION_STORAGE_KEY = 'rotation_guide.sections';

const BASE_SECTIONS = [
  { id: 'Hematology',         color: '#ff6f91', bg: '#fff0f4', grad: 'linear-gradient(135deg,#ff8fb1,#ff6f91)' },
  { id: 'Clinical Chemistry', color: '#ff8c5a', bg: '#fff5ee', grad: 'linear-gradient(135deg,#ffb37a,#ff8c5a)' },
  { id: 'Microbiology',       color: '#5f8dff', bg: '#eff4ff', grad: 'linear-gradient(135deg,#7ab6ff,#5f8dff)' },
  { id: 'Blood Bank',         color: '#e05555', bg: '#fff0f0', grad: 'linear-gradient(135deg,#ff8f8f,#e05555)' },
  { id: 'Histopathology/Cytology', color: '#4abf95', bg: '#edfaf4', grad: 'linear-gradient(135deg,#6dd6b1,#4abf95)' },
];

const CUSTOM_SECTION_PALETTE = [
  { color: '#8d6fff', bg: '#f5efff' }, { color: '#34b3ff', bg: '#e8f6ff' },
  { color: '#54c58e', bg: '#ecfbf2' }, { color: '#f6b45f', bg: '#fff4e8' },
  { color: '#f56b8a', bg: '#fff0f4' }, { color: '#b071ec', bg: '#f4ecff' },
  { color: '#26c6da', bg: '#e0f7fa' }, { color: '#ef6c00', bg: '#fff3e0' },
];

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
  const palette = CUSTOM_SECTION_PALETTE[Math.abs(hash) % CUSTOM_SECTION_PALETTE.length];
  const grad = `linear-gradient(135deg,${palette.color}cc,${palette.color})`;
  return { ...palette, grad };
}

function normalizeStoredSections(saved) {
  // No saved data yet → first visit, use defaults
  if (!Array.isArray(saved) || saved.length === 0) return BASE_SECTIONS;

  // Saved array IS the source of truth — if a section was removed it stays gone.
  // Reconstruct each entry, preserving base-section styling unless the user changed the color.
  const seen = new Set();
  return saved.reduce((list, s) => {
    const id = typeof s?.id === 'string' ? s.id.trim() : '';
    if (!id || seen.has(id.toLowerCase())) return list;
    seen.add(id.toLowerCase());
    const base  = BASE_SECTIONS.find(b => b.id === id);
    const color = s.color || base?.color || generateSectionMeta(id).color;
    const bg    = s.bg    || base?.bg    || colorToSoftBg(color);
    const grad  = s.grad  || base?.grad  || `linear-gradient(135deg,${color}cc,${color})`;
    list.push({ id, color, bg, grad });
    return list;
  }, []);
}

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const COMPETENCY = [
  { id: 'pass',       label: 'Pass',          emoji: '✅', color: '#4abf95', bg: '#edfaf4' },
  { id: 'needs_work', label: 'Needs Work',    emoji: '⚠️', color: '#ff8c5a', bg: '#fff5ee' },
  { id: 'fail',       label: 'Fail',          emoji: '❌', color: '#e05555', bg: '#fff0f0' },
  { id: 'observed',   label: 'Observed Only', emoji: '👁️', color: '#5f8dff', bg: '#eff4ff' },
];
const COMP_MAP = Object.fromEntries(COMPETENCY.map(c => [c.id, c]));

const DEFAULT_PROCEDURES = {
  'Hematology':         ['CBC (Complete Blood Count)', 'Peripheral Blood Smear', 'ESR', 'Platelet Count', 'PT/APTT', 'Reticulocyte Count'],
  'Clinical Chemistry': ['Blood Glucose', 'Lipid Profile', 'Liver Function Tests', 'BUN/Creatinine', 'Electrolytes', 'Urinalysis'],
  'Microbiology':       ['Gram Staining', 'Culture & Sensitivity', 'KOH Preparation', 'AFB Smear', 'Antibiotic Sensitivity Test', 'Stool Exam'],
  'Blood Bank':         ['ABO/Rh Typing', 'Crossmatching', 'Antibody Screening', 'Direct Coombs Test', 'Blood Component Prep'],
  'Histopathology/Cytology': ['Tissue Processing', 'Microtomy / Sectioning', 'H&E Staining', 'Pap Smear Preparation', 'Special Stains', 'Frozen Section'],
};

function isMissingTable(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205' ||
    error?.message?.includes('schema cache') || error?.message?.includes('does not exist') ||
    error?.message?.includes('Could not find the table');
}

function fmt(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function fmtFull(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10);
}

function isYesterday(dateStr) {
  const y = new Date(); y.setDate(y.getDate() - 1);
  return dateStr === y.toISOString().slice(0, 10);
}

function getDayLabel(dateStr) {
  if (isToday(dateStr))     return '📅 Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  return fmt(dateStr);
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

  const handleAdd = () => {
    const label = name.trim();
    if (!label) { setError('Please enter a section name.'); return; }
    if (sections.some(s => s.id.toLowerCase() === label.toLowerCase())) {
      setError('That section already exists.'); return;
    }
    onAdd(label); setName(''); setError('');
  };

  return (
    <div className="ms-overlay" onClick={onClose}>
      <div className="ms-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="ms-head">
          <div className="ms-head-left">
            <div className="ms-head-icon"><Settings2 size={18} /></div>
            <div>
              <h3 className="ms-title">Manage Sections</h3>
              <p className="ms-sub">Add custom sections, change colors, or remove extras</p>
            </div>
          </div>
          <button className="ms-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Add new section */}
        <div className="ms-add-box">
          <p className="ms-box-label">New Section</p>
          <div className="ms-add-row">
            <input
              ref={inputRef}
              className="ms-input"
              placeholder="e.g. Immunology, Parasitology…"
              value={name}
              onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              maxLength={40}
            />
            <button className="ms-add-btn" onClick={handleAdd}>
              <Plus size={14} /> Add
            </button>
          </div>
          {error && <p className="ms-error">{error}</p>}
        </div>

        {/* Section list */}
        <div>
          <p className="ms-box-label">
            All Sections
            <span className="ms-count">{sections.length}</span>
          </p>
          <div className="ms-list">
            {sections.map(sec => {
              const meta  = { ...generateSectionMeta(sec.id), ...sec };
              const isRem = removing === sec.id;

              return (
                <div key={sec.id} className={`ms-row ${isRem ? 'ms-row-rem' : ''}`}>
                  <div className="ms-row-main">
                    <div className="ms-sec-pill"
                      style={{ background: meta.bg, color: meta.color, borderColor: meta.color + '44' }}>
                      <span className="ms-dot" style={{ background: meta.color }} />
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
        </div>

        
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   HERO STATS BAR
───────────────────────────────────────────── */
function HeroStats({ logs, quotasBySection }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayCount = logs.filter(l => l.log_date === todayStr).reduce((s, l) => s + (l.count_done ?? 1), 0);
  const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const weekCount  = logs.filter(l => new Date(l.log_date + 'T12:00:00') >= weekStart).reduce((s, l) => s + (l.count_done ?? 1), 0);
  const totalProcs = logs.reduce((s, l) => s + (l.count_done ?? 1), 0);
  const passRate   = logs.length > 0 ? Math.round(logs.filter(l => l.competency === 'pass').length / logs.length * 100) : 0;

  let totalDone = 0, totalRequired = 0;
  Object.values(quotasBySection).forEach(quotas => {
    quotas.forEach(q => {
      totalDone     += q.completed_count ?? 0;
      totalRequired += q.target_count    ?? 0;
    });
  });
  const overallPct = totalRequired > 0 ? Math.min(100, Math.round(totalDone / totalRequired * 100)) : 0;

  const stats = [
    { label: 'Today',     value: todayCount,    color: '#ff6f91' },
    { label: 'This Week', value: weekCount,      color: '#ff8c5a' },
    { label: 'Total Done',value: totalProcs,     color: '#5f8dff' },
    { label: 'Pass Rate', value: `${passRate}%`, color: '#4abf95' },
    { label: 'Quota',     value: `${overallPct}%`, color: '#8b6fff' },
  ];

  return (
    <div className="hs-row">
      {stats.map(s => (
        <div key={s.label} className="hs-card">
          <span className="hs-val" style={{ color: s.color }}>{s.value}</span>
          <span className="hs-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOG ENTRY MODAL
───────────────────────────────────────────── */
function LogModal({ editing, defaultSection, quotasBySection, sections, sectionMap, onClose, onSaved }) {
  const { user } = useAuth();

  const [sectionId, setSectionId] = useState(
    editing?.section_name ?? defaultSection ?? sections[0]?.id ?? ''
  );
  const meta = sectionMap[sectionId] ?? generateSectionMeta(sectionId);

  const procedureOptions = useMemo(() => {
    const defaults   = DEFAULT_PROCEDURES[sectionId] ?? [];
    const defaultSet = new Set(defaults);
    const fromQuotas = (quotasBySection[sectionId] ?? []).map(q => q.task_name);
    const customOnly = fromQuotas.filter(p => !defaultSet.has(p));
    return [...defaults, ...customOnly];
  }, [sectionId, quotasBySection]);

  const [form, setForm] = useState({
    log_date:       editing?.log_date       ?? new Date().toISOString().slice(0, 10),
    procedure_name: editing?.procedure_name ?? '',
    count_done:     editing?.count_done     ?? 1,
    competency:     editing?.competency     ?? 'pass',
    supervisor:     editing?.supervisor     ?? '',
    notes:          editing?.notes          ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSectionChange = (id) => {
    setSectionId(id);
    setForm(f => ({ ...f, procedure_name: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.procedure_name) { setError('Please select a procedure.'); return; }
    setSaving(true); setError('');

    const payload = {
      user_id:        user.id,
      section_name:   sectionId,
      log_date:       form.log_date,
      procedure_name: form.procedure_name,
      count_done:     Number(form.count_done),
      competency:     form.competency,
      supervisor:     form.supervisor.trim(),
      notes:          form.notes.trim(),
      progress:       100,
      updated_at:     new Date().toISOString(),
    };

    let result;
    if (editing) {
      result = await supabase.from('daily_reports').update(payload).eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('daily_reports').insert([payload]).select().single();
    }

    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="lm-overlay" onClick={onClose}>
      <div className="lm-sheet" onClick={e => e.stopPropagation()}>
        <div className="lm-header">
          <div className="lm-hrow">
            <div className="lm-hdot" style={{ background: meta?.color }} />
            <h3 className="lm-htitle">{editing ? 'Edit Entry' : 'Log Procedure'}</h3>
          </div>
          <button className="lm-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="lm-form">
          {/* Section pills */}
          <div>
            <p className="lm-flabel">Section *</p>
            <div className="lm-sec-pills">
              {sections.map(s => {
                const sm = sectionMap[s.id] ?? generateSectionMeta(s.id);
                return (
                  <button key={s.id} type="button"
                    className="lm-sec-pill"
                    style={sectionId === s.id
                      ? { background: sm.color, borderColor: sm.color, color: '#fff' }
                      : { borderColor: sm.color + '55', color: sm.color }}
                    onClick={() => handleSectionChange(s.id)}>
                    {s.id}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date + Count */}
          <div className="lm-row2">
            <label className="lm-flabel">
              Date *
              <input type="date" className="lm-input" value={form.log_date}
                onChange={e => setForm({ ...form, log_date: e.target.value })} required />
            </label>
            <label className="lm-flabel">
              Count *
              <input type="number" className="lm-input" min="1" max="999"
                value={form.count_done}
                onChange={e => setForm({ ...form, count_done: e.target.value })} required />
            </label>
          </div>

          {/* Procedure */}
          <div>
            <p className="lm-flabel">Procedure *</p>
            <select className="lm-input lm-sel"
              value={form.procedure_name}
              onChange={e => setForm({ ...form, procedure_name: e.target.value })} required>
              <option value="">— Select procedure —</option>
              {procedureOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Competency */}
          <div>
            <p className="lm-flabel">Competency Rating *</p>
            <div className="lm-comp-grid">
              {COMPETENCY.map(c => (
                <button key={c.id} type="button"
                  className={`lm-comp-btn ${form.competency === c.id ? 'active' : ''}`}
                  style={form.competency === c.id
                    ? { background: c.color, borderColor: c.color, color: '#fff' }
                    : { borderColor: c.color + '55', color: c.color }}
                  onClick={() => setForm({ ...form, competency: c.id })}>
                  <span className="lm-comp-emoji">{c.emoji}</span>
                  <span>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Supervisor */}
          <label className="lm-flabel">
            Supervisor
            <input className="lm-input" placeholder="Supervising MLT / MLS name…"
              value={form.supervisor}
              onChange={e => setForm({ ...form, supervisor: e.target.value })} />
          </label>

          {/* Notes */}
          <label className="lm-flabel">
            Reflection / Notes
            <textarea className="lm-textarea" rows={3}
              placeholder="What did you learn? Any difficulties?"
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </label>

          {error && <p className="lm-error">{error}</p>}

          <div className="lm-actions">
            <button type="submit" className="lm-primary" disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Entry' : 'Save Entry'}
            </button>
            <button type="button" className="lm-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   DAILY LOG TAB
───────────────────────────────────────────── */
function DailyLogTab({ logs, quotasBySection, sections, sectionMap, onAdd, onEdit, onDelete, onManageSections }) {
  const [filterSection, setFilterSection] = useState('');
  const [filterComp,    setFilterComp]    = useState('');
  const [search,        setSearch]        = useState('');
  const [showFilters,   setShowFilters]   = useState(false);
  const [confirmId,     setConfirmId]     = useState(null);

  const filtered = useMemo(() => {
    let list = [...logs].sort((a, b) => {
      const dd = new Date(b.log_date) - new Date(a.log_date);
      return dd !== 0 ? dd : new Date(b.created_at) - new Date(a.created_at);
    });
    if (filterSection) list = list.filter(l => l.section_name === filterSection);
    if (filterComp)    list = list.filter(l => l.competency === filterComp);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(l =>
        l.procedure_name?.toLowerCase().includes(q) ||
        l.notes?.toLowerCase().includes(q) ||
        l.supervisor?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [logs, filterSection, filterComp, search]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(l => {
      if (!map[l.log_date]) map[l.log_date] = [];
      map[l.log_date].push(l);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const activeFilters = [filterSection, filterComp, search.trim()].filter(Boolean).length;

  return (
    <div className="dl-wrap">
      {/* Toolbar */}
      <div className="dl-toolbar">
        <div className="dl-search-wrap">
          <Search size={13} className="dl-search-icon" />
          <input className="dl-search" placeholder="Search procedures, notes…"
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="dl-search-clear" onClick={() => setSearch('')}><X size={11} /></button>}
        </div>

        <button
          className={`dl-filter-btn ${activeFilters > 0 ? 'active' : ''}`}
          onClick={() => setShowFilters(v => !v)}>
          <Filter size={13} />
          Filters
          {activeFilters > 0 && <span className="dl-filter-badge">{activeFilters}</span>}
          {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        <button className="dl-add-btn" onClick={() => onAdd()}>
          <Plus size={15} /> Log Entry
        </button>
      </div>

      {/* Collapsible filter panel */}
      <div className={`dl-fp-outer ${showFilters ? 'open' : ''}`}>
        <div className="dl-fp-inner">
          <div className="dl-filter-panel">

            {/* Section filter */}
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
                  onClick={() => setFilterSection('')}>All</button>
                {sections.map(s => {
                  const sm = sectionMap[s.id] ?? generateSectionMeta(s.id);
                  return (
                    <button key={s.id}
                      className="dl-fpill"
                      style={filterSection === s.id
                        ? { background: sm.color, borderColor: sm.color, color: '#fff' }
                        : { borderColor: sm.color + '55', color: sm.color }}
                      onClick={() => setFilterSection(filterSection === s.id ? '' : s.id)}>
                      {s.id}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Competency filter */}
            <div className="dl-filter-group">
              <span className="dl-filter-group-label">Rating</span>
              <div className="dl-filter-pills">
                <button
                  className={`dl-fpill ${!filterComp ? 'all-active' : ''}`}
                  onClick={() => setFilterComp('')}>All</button>
                {COMPETENCY.map(c => (
                  <button key={c.id}
                    className="dl-fpill"
                    style={filterComp === c.id
                      ? { background: c.color, borderColor: c.color, color: '#fff' }
                      : { borderColor: c.color + '55', color: c.color }}
                    onClick={() => setFilterComp(filterComp === c.id ? '' : c.id)}>
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {activeFilters > 0 && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="dl-clear-all" onClick={() => { setFilterSection(''); setFilterComp(''); setSearch(''); }}>
                  <X size={11} /> Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      {(activeFilters > 0 || search) && (
        <p className="dl-results-count">{filtered.length} of {logs.length} entries</p>
      )}

      {/* Empty */}
      {grouped.length === 0 && (
        <div className="dl-empty-hero">
          <div className="dl-empty-hero-icon">{logs.length === 0 ? '📓' : '🔍'}</div>
          <h3>{logs.length === 0 ? 'No log entries yet' : 'No matching entries'}</h3>
          <p>{logs.length === 0
            ? 'Start by logging your first procedure.'
            : 'No entries match the current filters.'}</p>
          {logs.length === 0 && (
            <button className="dl-empty-btn" onClick={() => onAdd()}>
              <Plus size={14} /> Log First Procedure
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="dl-timeline">
        {grouped.map(([dateStr, dayLogs]) => (
          <div key={dateStr} className="dl-day-group">
            <div className="dl-day-header">
              <span className="dl-day-label">
                {getDayLabel(dateStr)}
                {isToday(dateStr) && <span className="dl-today-dot" />}
              </span>
              <span className="dl-day-sub">
                {fmtFull(dateStr)} · {dayLogs.reduce((s, l) => s + (l.count_done ?? 1), 0)} procedures
              </span>
            </div>

            {dayLogs.map(log => {
              const comp    = COMP_MAP[log.competency] ?? COMP_MAP.observed;
              const secMeta = sectionMap[log.section_name] ?? generateSectionMeta(log.section_name);
              const isConf  = confirmId === log.id;

              return (
                <div key={log.id} className="dl-entry-card"
                  style={{ borderLeftColor: secMeta?.color ?? '#ff6f91' }}>
                  <div className="dl-entry-top">
                    <div className="dl-entry-main">
                      <h4 className="dl-entry-proc">{log.procedure_name}</h4>
                      <div className="dl-entry-tags">
                        <span className="dl-tag" style={{ background: secMeta?.bg, color: secMeta?.color }}>
                          {log.section_name}
                        </span>
                        <span className="dl-tag" style={{ background: comp.bg, color: comp.color }}>
                          {comp.emoji} {comp.label}
                        </span>
                        <span className="dl-tag count" style={{ background: secMeta?.bg, color: secMeta?.color }}>
                          ×{log.count_done}
                        </span>
                      </div>
                    </div>
                    <div className="dl-entry-actions">
                      {isConf ? (
                        <div className="dl-confirm-row">
                          <span>Delete?</span>
                          <button className="dl-conf-yes" onClick={() => { onDelete(log.id); setConfirmId(null); }}>Yes</button>
                          <button className="dl-conf-no"  onClick={() => setConfirmId(null)}>No</button>
                        </div>
                      ) : (
                        <>
                          <button className="dl-act-btn" onClick={() => onEdit(log)} title="Edit">
                            <Edit3 size={13} />
                          </button>
                          <button className="dl-act-btn danger" onClick={() => setConfirmId(log.id)} title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {log.supervisor && <p className="dl-entry-sup">👤 {log.supervisor}</p>}
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
function QuotaBoardTab({ logs, quotasBySection, sections, sectionMap, onQuotasChange, onManageSections }) {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState(sections[0]?.id ?? '');
  const [editingId,   setEditingId]   = useState(null);
  const [editForm,    setEditForm]    = useState({ task_name: '', target_count: '', completed_count: '' });
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState('');
  const [deleting,    setDeleting]    = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  // Keep expandedSection valid if sections change
  useEffect(() => {
    if (expandedSection && !sections.find(s => s.id === expandedSection)) {
      setExpandedSection(sections[0]?.id ?? '');
    }
  }, [sections, expandedSection]);

  const logCounts = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const key = `${l.section_name}::${l.procedure_name}`;
      map[key] = (map[key] ?? 0) + (l.count_done ?? 1);
    });
    return map;
  }, [logs]);

  const startEdit  = (quota) => { setEditingId(quota.id); setEditForm({ task_name: quota.task_name, target_count: String(quota.target_count), completed_count: String(quota.completed_count ?? 0) }); setError(''); };
  const startNew   = (sid)   => { setEditingId(`new::${sid}`); setEditForm({ task_name: '', target_count: '', completed_count: '0' }); setError(''); };
  const cancelEdit = ()      => { setEditingId(null); setError(''); };

  const saveEdit = async (sectionId) => {
    if (!editForm.task_name.trim()) { setError('Procedure name is required.'); return; }
    const target = parseInt(editForm.target_count, 10);
    const done   = parseInt(editForm.completed_count, 10);
    if (isNaN(target) || target < 1) { setError('Goal must be ≥ 1.'); return; }
    if (isNaN(done)   || done < 0)   { setError('Progress must be ≥ 0.'); return; }

    setSaving(true); setError('');
    const existing = quotasBySection[sectionId] ?? [];

    if (editingId.startsWith('new::')) {
      const { data, error: err } = await supabase.from('quotas').insert([{
        user_id: user.id, section_name: sectionId,
        task_name: editForm.task_name.trim(), target_count: target, completed_count: done,
      }]).select().single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onQuotasChange(sectionId, [...existing, data]);
    } else {
      const { data, error: err } = await supabase.from('quotas')
        .update({ task_name: editForm.task_name.trim(), target_count: target, completed_count: done, updated_at: new Date().toISOString() })
        .eq('id', editingId).select().single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onQuotasChange(sectionId, existing.map(q => q.id === editingId ? data : q));
    }
    cancelEdit();
  };

  const deleteQuota = async (sectionId, id) => {
    setDeleting(id);
    await supabase.from('quotas').delete().eq('id', id);
    setDeleting(null);
    onQuotasChange(sectionId, (quotasBySection[sectionId] ?? []).filter(q => q.id !== id));
  };

  const quickIncrement = async (sectionId, quota) => {
    const newCount = (quota.completed_count ?? 0) + 1;
    const { data, error: err } = await supabase.from('quotas')
      .update({ completed_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', quota.id).select().single();
    if (!err) onQuotasChange(sectionId, (quotasBySection[sectionId] ?? []).map(q => q.id === quota.id ? data : q));
  };

  const sectionSummaries = useMemo(() => sections.map(sec => {
    const meta   = sectionMap[sec.id] ?? generateSectionMeta(sec.id);
    const quotas = quotasBySection[sec.id] ?? [];
    let done = 0, required = 0;
    quotas.forEach(q => {
      const logCount = logCounts[`${sec.id}::${q.task_name}`] ?? 0;
      done     += Math.max(q.completed_count ?? 0, logCount);
      required += q.target_count ?? 0;
    });
    const pct = required > 0 ? Math.min(100, Math.round(done / required * 100)) : 0;
    return { ...sec, ...meta, done, required, pct, quotaCount: quotas.length };
  }), [sections, sectionMap, quotasBySection, logCounts]);

  return (
    <div className="qb-wrap">
      {/* Section overview grid */}
      <div className="qb-header-row">
        <p className="qb-overview-label">Sections</p>
        <button className="qb-manage-link" onClick={onManageSections}>
          <Settings2 size={12} /> Edit Sections
        </button>
      </div>

      <div className="qb-overview">
        {sectionSummaries.map(sec => (
          <button key={sec.id}
            className={`qb-sec-btn ${expandedSection === sec.id ? 'active' : ''}`}
            style={expandedSection === sec.id
              ? { borderColor: sec.color, background: sec.bg, boxShadow: `0 0 0 2.5px ${sec.color}44` }
              : { borderColor: sec.color + '33' }}
            onClick={() => setExpandedSection(expandedSection === sec.id ? null : sec.id)}>
            <div className="qb-sec-top">
              <span className="qb-sec-name" style={{ color: sec.color }}>{sec.id}</span>
              <span className="qb-sec-pct" style={{ color: sec.pct >= 100 ? '#4abf95' : sec.color }}>
                {sec.pct >= 100 ? '✅' : `${sec.pct}%`}
              </span>
            </div>
            <div className="qb-sec-bar">
              <div className="qb-sec-fill"
                style={{ width: `${sec.pct}%`, background: sec.pct >= 100 ? 'linear-gradient(90deg,#6dd6b1,#4abf95)' : sec.grad }} />
            </div>
            <span className="qb-sec-sub">{sec.done}/{sec.required} · {sec.quotaCount} procedures</span>
          </button>
        ))}
      </div>

      {/* Expanded section detail */}
      {expandedSection && (() => {
        const secMeta = sectionMap[expandedSection] ?? generateSectionMeta(expandedSection);
        const quotas  = quotasBySection[expandedSection] ?? [];
        const trackedNames      = new Set(quotas.map(q => q.task_name));
        const defaultProcs      = DEFAULT_PROCEDURES[expandedSection] ?? [];
        const untrackedDefaults = defaultProcs.filter(p => !trackedNames.has(p) && !dismissedSuggestions.has(p));
        const newKey     = `new::${expandedSection}`;
        const isAddingNew = editingId === newKey;

        const addDefaultAsQuota = async (procName) => {
          setSaving(true); setError('');
          const { data, error: err } = await supabase.from('quotas').insert([{
            user_id: user.id, section_name: expandedSection,
            task_name: procName, target_count: 50, completed_count: 0,
          }]).select().single();
          setSaving(false);
          if (err) { setError(err.message); return; }
          onQuotasChange(expandedSection, [...quotas, data]);
        };

        return (
          <div className="qb-detail" style={{ borderColor: secMeta.color + '44' }}>
            <div className="qb-detail-header">
              <div>
                <h3 className="qb-detail-title" style={{ color: secMeta.color }}>{expandedSection}</h3>
                <p className="qb-detail-sub">{quotas.length} tracked procedures</p>
              </div>
              <button className="qb-add-btn"
                style={{ background: secMeta.grad }}
                onClick={() => startNew(expandedSection)}
                disabled={isAddingNew}>
                <Plus size={14} /> Add Procedure
              </button>
            </div>

            {error && <p className="qb-error">{error}</p>}

            {/* New row */}
            {isAddingNew && (
              <div className="qb-edit-card" style={{ borderColor: secMeta.color + '55' }}>
                <input className="qb-input qb-proc-input" placeholder="Procedure name…" autoFocus
                  value={editForm.task_name} onChange={e => setEditForm({ ...editForm, task_name: e.target.value })} />
                <div className="qb-edit-nums">
                  <label className="qb-num-label">
                    <Target size={11} /> Goal
                    <input className="qb-input qb-num" type="number" min="1" placeholder="50"
                      value={editForm.target_count} onChange={e => setEditForm({ ...editForm, target_count: e.target.value })} />
                  </label>
                  <label className="qb-num-label">
                    <CheckCircle2 size={11} /> Done
                    <input className="qb-input qb-num" type="number" min="0" placeholder="0"
                      value={editForm.completed_count} onChange={e => setEditForm({ ...editForm, completed_count: e.target.value })} />
                  </label>
                </div>
                <div className="qb-edit-btns">
                  <button className="qb-save-btn" style={{ background: secMeta.grad }}
                    onClick={() => saveEdit(expandedSection)} disabled={saving}>
                    <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="qb-cancel-btn" onClick={cancelEdit}><X size={13} /></button>
                </div>
              </div>
            )}

            {quotas.length === 0 && !isAddingNew && (
              <div className="qb-empty-hero">
                <div className="qb-empty-hero-icon">🎯</div>
                <h3>No quota items yet</h3>
                <p>Add your first procedure target to start tracking this section.</p>
              </div>
            )}

            {quotas.map(q => {
              const logCount  = logCounts[`${expandedSection}::${q.task_name}`] ?? 0;
              const manCount  = q.completed_count ?? 0;
              const effective = Math.max(manCount, logCount);
              const pct       = Math.min(100, Math.round(effective / (q.target_count || 1) * 100));
              const complete  = effective >= q.target_count;
              const isEditRow = editingId === q.id;

              if (isEditRow) {
                return (
                  <div key={q.id} className="qb-edit-card" style={{ borderColor: secMeta.color + '55' }}>
                    <input className="qb-input qb-proc-input" autoFocus
                      value={editForm.task_name} onChange={e => setEditForm({ ...editForm, task_name: e.target.value })} />
                    <div className="qb-edit-nums">
                      <label className="qb-num-label">
                        <Target size={11} /> Goal
                        <input className="qb-input qb-num" type="number" min="1"
                          value={editForm.target_count} onChange={e => setEditForm({ ...editForm, target_count: e.target.value })} />
                      </label>
                      <label className="qb-num-label">
                        <CheckCircle2 size={11} /> Done
                        <input className="qb-input qb-num" type="number" min="0"
                          value={editForm.completed_count} onChange={e => setEditForm({ ...editForm, completed_count: e.target.value })} />
                      </label>
                    </div>
                    <div className="qb-edit-btns">
                      <button className="qb-save-btn" style={{ background: secMeta.grad }}
                        onClick={() => saveEdit(expandedSection)} disabled={saving}>
                        <Check size={13} /> {saving ? 'Saving…' : 'Update'}
                      </button>
                      <button className="qb-cancel-btn" onClick={cancelEdit}><X size={13} /></button>
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
                        <span className="qb-log-hint" title="Counted from your daily logs">
                          📋 {logCount} from logs
                        </span>
                      )}
                      <span className="qb-count" style={{ color: complete ? '#4abf95' : secMeta.color }}>
                        {effective}/{q.target_count}{complete ? ' ✅' : ''}
                      </span>
                      <button className="qb-plus-btn"
                        style={{ color: secMeta.color, borderColor: secMeta.color + '44' }}
                        onClick={() => quickIncrement(expandedSection, q)} title="Quick +1">
                        +1
                      </button>
                      <button className="qb-icon-btn" onClick={() => startEdit(q)} title="Edit">
                        <PencilLine size={12} />
                      </button>
                      <button className="qb-icon-btn danger" title="Delete"
                        disabled={deleting === q.id}
                        onClick={() => deleteQuota(expandedSection, q.id)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="qb-bar-wrap">
                    <div className="qb-bar">
                      <div className="qb-bar-fill"
                        style={{ width: `${pct}%`, background: complete ? 'linear-gradient(90deg,#6dd6b1,#4abf95)' : secMeta.grad }} />
                    </div>
                    <span className="qb-pct-label">{pct}%</span>
                  </div>
                  {logCount > 0 && manCount > 0 && (
                    <p className="qb-src-hint">Manual: {manCount} · From logs: {logCount}</p>
                  )}
                </div>
              );
            })}

            {/* Suggested procedures */}
            {untrackedDefaults.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1.5px solid ${secMeta.color}22` }}>
                <p className="qb-detail-sub" style={{ marginBottom: '10px', color: secMeta.color, fontWeight: 600 }}>
                  📚 Suggested Procedures
                </p>
                {untrackedDefaults.map(proc => (
                  <div key={proc} className="qb-default-proc">
                    <span className="qb-default-name">{proc}</span>
                    <div className="qb-default-btns">
                      <button className="qb-default-add-btn"
                        style={{ background: secMeta.grad, color: 'white' }}
                        onClick={() => addDefaultAsQuota(proc)} disabled={saving} title="Add to quota tracking">
                        <Plus size={12} /> Add
                      </button>
                      <button className="qb-default-delete-btn"
                        onClick={() => setDismissedSuggestions(prev => new Set([...prev, proc]))}
                        title="Dismiss this suggestion">
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
   MAIN
───────────────────────────────────────────── */
export default function DailyReportTracker() {
  const { user } = useAuth();

  const [allLogs,         setAllLogs]         = useState([]);
  const [quotasBySection, setQuotasBySection] = useState({});
  const [loading,         setLoading]         = useState(true);
  const [dbError,         setDbError]         = useState(null);
  const [activeTab,       setActiveTab]       = useState('log');
  const [showModal,       setShowModal]       = useState(false);
  const [editingLog,      setEditingLog]      = useState(null);
  const [defaultSection,  setDefaultSection]  = useState('');

  // ── Dynamic sections state ──
  const [sections,       setSections]       = useState(BASE_SECTIONS);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [showManage,     setShowManage]     = useState(false);

  useEffect(() => {
    const loadSections = async () => {
      const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', CUSTOM_SECTION_STORAGE_KEY)
        .maybeSingle();
      setSections(data?.value ? normalizeStoredSections(data.value) : BASE_SECTIONS);
      setSectionsLoaded(true);
    };
    loadSections();
  }, [user.id]);

  useEffect(() => {
    if (!sectionsLoaded) return;
    supabase.from('user_settings').upsert([{
      user_id: user.id,
      key: CUSTOM_SECTION_STORAGE_KEY,
      value: sections,
    }], { onConflict: 'user_id,key' });
  }, [sections, sectionsLoaded, user.id]);

  const sectionMap = useMemo(() => {
    const map = {};
    sections.forEach(s => { map[s.id] = { ...generateSectionMeta(s.id), ...s }; });
    return map;
  }, [sections]);

  // Section management handlers
  const handleAddSection = (label) => {
    const meta = generateSectionMeta(label);
    setSections(prev => [...prev, { id: label, color: meta.color, bg: meta.bg, grad: meta.grad }]);
    setQuotasBySection(prev => ({ ...prev, [label]: [] }));
  };

  const handleRemoveSection = (id) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  const handleSectionColorChange = (id, color) => {
    const bg   = colorToSoftBg(color);
    const grad = `linear-gradient(135deg,${color}cc,${color})`;
    setSections(prev => prev.map(s => s.id === id ? { ...s, color, bg, grad } : s));
  };

  // ── Data loading ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data: logsData, error: logsErr } = await supabase
        .from('daily_reports').select('*').eq('user_id', user.id)
        .order('log_date', { ascending: false }).order('created_at', { ascending: false });

      if (logsErr) {
        if (isMissingTable(logsErr)) setDbError('The daily_reports table is missing. Run supabase/schema.sql in your Supabase project.');
        else console.error(logsErr);
        setLoading(false);
        return;
      }
      setAllLogs(logsData ?? []);

      const { data: quotasData, error: quotasErr } = await supabase
        .from('quotas').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (quotasErr && !isMissingTable(quotasErr)) console.error(quotasErr);

      const grouped = {};
      sections.forEach(s => { grouped[s.id] = []; });
      (quotasData ?? []).forEach(q => {
        if (!grouped[q.section_name]) grouped[q.section_name] = [];
        grouped[q.section_name].push(q);
      });
      setQuotasBySection(grouped);
      setDefaultSection(sections[0]?.id ?? '');
      setLoading(false);
    };
    load();
  }, [user.id]);

  const handleLogSaved = useCallback((saved, isEdit) => {
    setAllLogs(prev => isEdit ? prev.map(l => l.id === saved.id ? saved : l) : [saved, ...prev]);
  }, []);

  const handleLogDelete = useCallback(async (id) => {
    await supabase.from('daily_reports').delete().eq('id', id);
    setAllLogs(prev => prev.filter(l => l.id !== id));
  }, []);

  const handleQuotasChange = useCallback((sectionId, newQuotas) => {
    setQuotasBySection(prev => ({ ...prev, [sectionId]: newQuotas }));
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
    let completed = 0, required = 0, quotaItems = 0;
    Object.values(quotasBySection).forEach(quotas => {
      quotaItems += quotas.length;
      quotas.forEach(q => {
        completed += q.completed_count ?? 0;
        required  += q.target_count ?? 0;
      });
    });
    return {
      logCount: allLogs.length,
      quotaItems,
      quotaPct: required > 0 ? Math.min(100, Math.round((completed / required) * 100)) : 0,
    };
  }, [allLogs.length, quotasBySection]);

  return (
    <>
      <style>{`
        /* ─── Page ─── */
        .qtr-page { width: 100%; }
        .qtr-title { font-size: 2rem; font-weight: 700; color: #ff5d8f; margin-bottom: 6px; }
        .qtr-sub { color: #888; font-size: 0.92rem; margin-bottom: 24px; line-height: 1.6; }

        .qtr-error {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fff0f0; color: #c0392b;
          border: 1px solid #ffd0d0; border-radius: 18px;
          padding: 16px 20px; font-size: 13px; margin-bottom: 24px; line-height: 1.5;
        }

        /* ─── Hero stats ─── */
        .hs-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .hs-card {
          flex: 1; min-width: 90px;
          background: rgba(255,255,255,0.88); border: 1.5px solid #ffe0ea;
          border-radius: 20px; padding: 16px 14px;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .hs-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.1); }
        .hs-val   { font-size: 22px; font-weight: 700; line-height: 1; }
        .hs-label { font-size: 10px; font-weight: 600; color: #bbb; text-transform: uppercase; letter-spacing: 0.06em; text-align: center; }

        /* ─── Page tabs ─── */
        .qtr-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
        .qtr-tab {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; border-radius: 20px;
          border: 1.5px solid #ffe0ea; background: rgba(255,255,255,0.86);
          color: #aaa; cursor: pointer; transition: all 0.2s; text-align: left;
          font-family: inherit; min-width: 0;
          box-shadow: 0 4px 18px rgba(255,111,145,0.06);
        }
        .qtr-tab:hover { border-color: #ffb8ce; color: #ff5d8f; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,111,145,0.12); }
        .qtr-tab.active { background: linear-gradient(135deg,#fff8fa,#ffffff); border-color: #ff8fb1; color: #ff5d8f; box-shadow: 0 10px 28px rgba(255,111,145,0.16); }
        .qtr-tab-icon {
          width: 42px; height: 42px; border-radius: 15px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          box-shadow: 0 6px 16px rgba(255,111,145,0.24);
        }
        .qtr-tab.quota .qtr-tab-icon { background: linear-gradient(135deg,#7ab6ff,#5f8dff); box-shadow: 0 6px 16px rgba(95,141,255,0.24); }
        .qtr-tab-copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
        .qtr-tab-title { font-size: 14px; font-weight: 800; color: #333; line-height: 1.2; }
        .qtr-tab-sub   { font-size: 12px; font-weight: 600; color: #bbaab2; line-height: 1.35; }
        .qtr-tab-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 34px; height: 28px; padding: 0 10px; border-radius: 999px;
          background: #fff0f4; color: #ff5d8f; font-size: 12px; font-weight: 800; flex-shrink: 0;
        }
        .qtr-tab.quota .qtr-tab-badge { background: #eff4ff; color: #5f8dff; }
        @media (max-width: 640px) { .qtr-tabs { grid-template-columns: 1fr; } }

        /* ─── Daily Log ─── */
        .dl-wrap { display: flex; flex-direction: column; gap: 16px; }
        .dl-toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .dl-search-wrap { flex: 1; min-width: 180px; position: relative; display: flex; align-items: center; }
        .dl-search-icon { position: absolute; left: 13px; color: #ccc; pointer-events: none; }
        .dl-search {
          width: 100%; border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 34px 10px 34px;
          font-size: 13px; outline: none; transition: 0.2s; color: #444; font-family: inherit;
        }
        .dl-search:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .dl-search-clear { position: absolute; right: 12px; background: none; border: none; color: #bbb; cursor: pointer; display: flex; padding: 0; }

        .dl-filter-btn {
          display: flex; align-items: center; gap: 6px;
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 16px;
          font-size: 13px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit;
        }
        .dl-filter-btn:hover, .dl-filter-btn.active { border-color: #ff8fb1; color: #ff5d8f; background: #fff0f4; }
        .dl-filter-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; background: #ff6f91; color: white;
          border-radius: 999px; font-size: 10px; font-weight: 700; padding: 0 4px;
        }

        .dl-add-btn {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white;
          border-radius: 999px; padding: 10px 20px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .dl-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }

        /* ─── Collapsible filter panel (grid-rows trick) ─── */
        .dl-fp-outer {
          display: grid; grid-template-rows: 0fr;
          transition: grid-template-rows 0.32s cubic-bezier(0.4,0,0.2,1);
        }
        .dl-fp-outer.open { grid-template-rows: 1fr; }
        .dl-fp-inner { overflow: hidden; min-height: 0; }
        .dl-filter-panel {
          background: rgba(255,255,255,0.92); border: 1.5px solid #ffe0ea;
          border-radius: 20px; padding: 18px 20px; margin-top: 2px;
          display: flex; flex-direction: column; gap: 14px;
          box-shadow: 0 4px 20px rgba(255,111,145,0.07);
        }
        .dl-filter-group { display: flex; flex-direction: column; gap: 8px; }
        .dl-filter-group-header { display: flex; align-items: center; justify-content: space-between; }
        .dl-filter-group-label  { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #ccc; }

        /* "Edit Sections" link inside filter panel */
        .dl-manage-link {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; color: #ff8fb1; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: color 0.15s; padding: 0;
        }
        .dl-manage-link:hover { color: #ff5d8f; }

        .dl-filter-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .dl-fpill {
          padding: 6px 14px; border-radius: 999px; border: 1.5px solid #ffd6e1;
          background: transparent; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: 0.15s; white-space: nowrap; font-family: inherit;
        }
        .dl-fpill.all-active { background: #ff5d8f; color: white; border-color: #ff5d8f; }
        .dl-clear-all {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: 1.5px solid rgba(255,200,220,0.5);
          color: #bbb; border-radius: 999px; padding: 6px 14px;
          font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.18s; font-family: inherit;
        }
        .dl-clear-all:hover { border-color: #e05555; color: #e05555; background: #fde8e8; }
        .dl-results-count { font-size: 12px; color: #bbb; margin: 0; padding-left: 2px; }

        /* ─── Empty ─── */
        .dl-empty-hero {
          text-align: center; padding: 56px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.6);
          border-radius: 28px; border: 1.5px dashed #ffd6e1;
        }
        .dl-empty-hero-icon { font-size: 48px; line-height: 1; margin-bottom: 4px; }
        .dl-empty-hero h3 { margin: 0; font-size: 1.3rem; color: #333; font-weight: 700; }
        .dl-empty-hero p  { margin: 0; color: #aaa; font-size: 14px; max-width: 340px; line-height: 1.6; }
        .dl-empty-btn {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white;
          border-radius: 999px; padding: 10px 22px; font-size: 13px; font-weight: 600; cursor: pointer;
        }

        /* ─── Timeline ─── */
        .dl-timeline { display: flex; flex-direction: column; gap: 24px; }
        .dl-day-group { display: flex; flex-direction: column; gap: 10px; }
        .dl-day-header { display: flex; align-items: baseline; gap: 10px; padding-bottom: 8px; border-bottom: 1.5px solid #ffe0ea; }
        .dl-day-label { font-size: 15px; font-weight: 700; color: #333; display: flex; align-items: center; gap: 8px; }
        .dl-today-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff6f91; display: inline-block; animation: pulse-dot 1.5s ease-in-out infinite; }
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
        .dl-day-sub { font-size: 12px; color: #bbb; }

        .dl-entry-card {
          background: rgba(255,255,255,0.9); border: 1.5px solid #ffe0ea;
          border-left: 4px solid; border-radius: 20px; padding: 16px 18px;
          display: flex; flex-direction: column; gap: 8px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .dl-entry-card:hover { box-shadow: 0 6px 20px rgba(255,111,145,0.1); transform: translateY(-1px); }
        .dl-entry-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .dl-entry-main { flex: 1; display: flex; flex-direction: column; gap: 8px; }
        .dl-entry-proc { margin: 0; font-size: 15px; font-weight: 700; color: #333; }
        .dl-entry-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .dl-tag { display: inline-flex; align-items: center; gap: 4px; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; white-space: nowrap; }
        .dl-entry-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .dl-act-btn { border: none; background: #f0f0f0; padding: 8px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; color: #888; transition: 0.2s; }
        .dl-act-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .dl-act-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .dl-confirm-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; }
        .dl-conf-yes { border: none; background: #fde8e8; color: #e05555; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .dl-conf-no  { border: none; background: #f0f0f0; color: #888; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer; }
        .dl-entry-sup { margin: 0; font-size: 12px; color: #aaa; }
        .dl-entry-notes { margin: 0; font-size: 13px; color: #666; font-style: italic; line-height: 1.55; border-left: 2px solid #ffe0ea; padding-left: 10px; }

        /* ─── Quota Board ─── */
        .qb-wrap { display: flex; flex-direction: column; gap: 20px; }
        .qb-header-row { display: flex; align-items: center; justify-content: space-between; }
        .qb-overview-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #ccc; margin: 0; }
        .qb-manage-link {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none; color: #ff8fb1; font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: color 0.15s; padding: 0;
        }
        .qb-manage-link:hover { color: #ff5d8f; }

        .qb-overview { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
        .qb-sec-btn {
          background: rgba(255,255,255,0.88); border: 1.5px solid;
          border-radius: 20px; padding: 14px; cursor: pointer; text-align: left;
          transition: all 0.2s; display: flex; flex-direction: column; gap: 8px;
        }
        .qb-sec-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.07); }
        .qb-sec-btn.active { background: white; }
        .qb-sec-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .qb-sec-name { font-size: 11px; font-weight: 700; line-height: 1.4; }
        .qb-sec-pct  { font-size: 13px; font-weight: 700; white-space: nowrap; }
        .qb-sec-bar  { height: 6px; background: #f0f0f0; border-radius: 999px; overflow: hidden; }
        .qb-sec-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
        .qb-sec-sub  { font-size: 10px; color: #bbb; font-weight: 600; }

        .qb-detail { background: rgba(255,255,255,0.9); border: 1.5px solid; border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 14px; }
        .qb-detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .qb-detail-title { margin: 0; font-size: 1.1rem; font-weight: 700; }
        .qb-detail-sub   { margin: 4px 0 0; font-size: 13px; color: #aaa; }
        .qb-add-btn { display: inline-flex; align-items: center; gap: 7px; border: none; color: white; border-radius: 999px; padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .qb-add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .qb-add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .qb-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .qb-empty-hero {
          text-align: center; padding: 40px 24px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
          background: rgba(255,255,255,0.6);
          border-radius: 24px; border: 1.5px dashed #ffd6e1;
        }
        .qb-empty-hero-icon { font-size: 44px; line-height: 1; margin-bottom: 4px; }
        .qb-empty-hero h3 { margin: 0; font-size: 1.15rem; color: #333; font-weight: 700; }
        .qb-empty-hero p  { margin: 0; color: #aaa; font-size: 13px; line-height: 1.6; max-width: 340px; }

        .qb-edit-card { background: white; border: 1.5px solid; border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 4px 16px rgba(255,111,145,0.1); }
        .qb-input { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 12px; padding: 10px 12px; font-size: 13px; outline: none; transition: 0.2s; color: #444; font-family: inherit; }
        .qb-input:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .qb-proc-input { width: 100%; }
        .qb-edit-nums { display: flex; gap: 12px; }
        .qb-num-label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #bbb; flex: 1; }
        .qb-num { width: 100%; }
        .qb-edit-btns { display: flex; gap: 8px; }
        .qb-save-btn { display: inline-flex; align-items: center; gap: 6px; border: none; color: white; border-radius: 10px; padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .qb-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .qb-cancel-btn { border: none; background: #f0f0f0; border-radius: 10px; padding: 8px 10px; cursor: pointer; display: flex; align-items: center; color: #888; }
        .qb-cancel-btn:hover { background: #ffe4ec; color: #ff5d8f; }

        .qb-quota-row { background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 16px; padding: 14px; transition: box-shadow 0.2s; }
        .qb-quota-row:hover { box-shadow: 0 3px 12px rgba(255,111,145,0.08); }
        .qb-quota-row.complete { border-color: #b8f0da; background: #f0fdf7; }
        .qb-qrow-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .qb-qname { font-size: 13px; font-weight: 600; color: #444; flex: 1; }
        .qb-qrow-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
        .qb-log-hint { font-size: 10px; color: #bbb; background: #f5f5f5; padding: 2px 7px; border-radius: 999px; }
        .qb-count { font-size: 12px; font-weight: 700; }
        .qb-plus-btn { border: 1.5px solid; background: transparent; border-radius: 8px; padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.15s; }
        .qb-plus-btn:hover { opacity: 0.75; transform: scale(1.08); }
        .qb-icon-btn { border: none; background: #f0f0f0; padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; color: #888; transition: 0.2s; }
        .qb-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .qb-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .qb-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .qb-bar-wrap { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
        .qb-bar { flex: 1; height: 8px; background: #f3dbe3; border-radius: 999px; overflow: hidden; }
        .qb-bar-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
        .qb-pct-label { font-size: 11px; font-weight: 700; color: #bbb; min-width: 32px; text-align: right; }
        .qb-src-hint { font-size: 10px; color: #ccc; margin: 0; }

        .qb-default-proc { display: flex; justify-content: space-between; align-items: center; background: #fafafa; border: 1.5px solid #f0f0f0; border-radius: 14px; padding: 12px 14px; margin-bottom: 8px; gap: 10px; }
        .qb-default-name { font-size: 13px; color: #666; font-weight: 500; flex: 1; }
        .qb-default-add-btn { display: inline-flex; align-items: center; gap: 5px; border: none; border-radius: 999px; padding: 6px 12px; font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; }
        .qb-default-add-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.15); }
        .qb-default-add-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .qb-default-btns { display: flex; gap: 8px; align-items: center; }
        .qb-default-delete-btn { display: inline-flex; align-items: center; justify-content: center; border: 1.5px solid #e0e0e0; border-radius: 999px; padding: 6px 8px; background: #fff; color: #999; cursor: pointer; transition: 0.2s; }
        .qb-default-delete-btn:hover { border-color: #ff6f91; color: #ff6f91; background: #ffe0ea; transform: translateY(-1px); }

        /* ─── Log Modal ─── */
        .lm-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.22); backdrop-filter: blur(5px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .lm-sheet { background: white; border-radius: 28px; padding: 28px; width: 100%; max-width: 520px; box-shadow: 0 24px 60px rgba(255,111,145,0.2); border: 1px solid #ffe0ea; max-height: 90vh; overflow-y: auto; }
        .lm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .lm-hrow { display: flex; align-items: center; gap: 10px; }
        .lm-hdot { width: 10px; height: 10px; border-radius: 50%; }
        .lm-htitle { margin: 0; font-size: 1.1rem; font-weight: 700; color: #333; }
        .lm-close { border: none; background: #f4f4f4; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; }
        .lm-close:hover { background: #ffe4ec; color: #ff5d8f; }
        .lm-form { display: flex; flex-direction: column; gap: 16px; }
        .lm-sec-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .lm-sec-pill { padding: 6px 12px; border-radius: 999px; border: 1.5px solid; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; white-space: nowrap; font-family: inherit; }
        .lm-row2 { display: flex; gap: 14px; }
        .lm-row2 > * { flex: 1; }
        .lm-flabel { display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin: 0; }
        .lm-input, .lm-sel { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; font-family: inherit; width: 100%; appearance: none; }
        .lm-input:focus, .lm-sel:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .lm-textarea { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; resize: vertical; min-height: 80px; font-family: inherit; line-height: 1.6; width: 100%; }
        .lm-textarea:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .lm-comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .lm-comp-btn { display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-radius: 14px; border: 1.5px solid; background: transparent; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.15s; font-family: inherit; }
        .lm-comp-emoji { font-size: 16px; }
        .lm-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .lm-actions { display: flex; gap: 10px; padding-top: 4px; }
        .lm-primary { display: inline-flex; align-items: center; gap: 7px; border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 999px; padding: 11px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; }
        .lm-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .lm-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .lm-secondary { border: none; background: #f4f4f4; color: #666; border-radius: 999px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

        /* ─── Manage Sections Modal ─── */
        .ms-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.25); backdrop-filter: blur(6px); z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .ms-modal { background: white; border-radius: 28px; padding: 26px; width: 100%; max-width: 480px; box-shadow: 0 24px 60px rgba(0,0,0,0.14); border: 1px solid rgba(255,200,220,0.4); max-height: 90vh; overflow-y: auto; display: flex; flex-direction: column; gap: 22px; animation: ms-up 0.28s ease both; }
        @keyframes ms-up { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: none; } }
        .ms-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .ms-head-left { display: flex; align-items: center; gap: 12px; }
        .ms-head-icon { width: 40px; height: 40px; border-radius: 14px; background: linear-gradient(135deg,#ff8fb1,#ff6f91); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .ms-title { margin: 0 0 3px; font-size: 1.1rem; font-weight: 700; color: #1c1412; }
        .ms-sub   { margin: 0; font-size: 12px; color: #bbb; }
        .ms-close { border: none; background: #f4f0f2; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; flex-shrink: 0; }
        .ms-close:hover { background: #ffe4ec; color: #ff5d8f; }
        .ms-box-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #c8b0a8; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .ms-count { display: inline-flex; align-items: center; justify-content: center; background: #fff0f4; color: #ff6f91; border-radius: 999px; padding: 1px 8px; font-size: 11px; font-weight: 700; }
        .ms-add-box { background: #fff8fa; border: 1px solid rgba(255,200,220,0.4); border-radius: 18px; padding: 18px; }
        .ms-add-row { display: flex; gap: 10px; align-items: center; }
        .ms-input { flex: 1; border: 1.5px solid rgba(255,200,220,0.6); background: white; border-radius: 12px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; font-family: inherit; }
        .ms-input:focus { border-color: #ff8fb1; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .ms-add-btn { display: inline-flex; align-items: center; gap: 6px; border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit; }
        .ms-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,111,145,0.25); }
        .ms-error { background: #fde8e8; color: #c0392b; border-radius: 10px; padding: 8px 12px; font-size: 12px; margin-top: 10px; }
        .ms-list { display: flex; flex-direction: column; gap: 8px; }
        .ms-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 14px; border-radius: 16px; border: 1.5px solid rgba(255,200,220,0.4); background: #fff8fa; transition: 0.2s; }
        .ms-row:hover { border-color: #ffb8ce; background: white; }
        .ms-row-rem { border-color: #ffd0d0; background: #fff5f5; }
        .ms-row-main { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
        .ms-sec-pill { display: inline-flex; align-items: center; gap: 7px; border: 1.5px solid; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 700; white-space: nowrap; }
        .ms-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .ms-color-control { width: 30px; height: 30px; border: 1.5px solid rgba(255,200,220,0.5); background: white; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; position: relative; overflow: hidden; }
        .ms-color-control input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
        .ms-color-swatch { width: 16px; height: 16px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); }
        .ms-rm-btn { display: inline-flex; align-items: center; gap: 5px; border: 1.5px solid rgba(255,200,220,0.5); background: white; color: #aaa; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; flex-shrink: 0; }
        .ms-rm-btn:hover { border-color: #ffd0d0; background: #fde8e8; color: #e05555; }
        .ms-confirm { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #888; flex-shrink: 0; font-weight: 600; }
        .ms-yes { border: none; background: linear-gradient(135deg,#ff8f8f,#e05555); color: white; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .ms-no  { border: none; background: #f0f0f0; color: #888; border-radius: 999px; padding: 5px 12px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
        .ms-note { display: flex; align-items: flex-start; gap: 8px; background: #fff8fa; border: 1px solid rgba(255,200,220,0.4); border-radius: 14px; padding: 12px 14px; font-size: 12px; color: #bbb; line-height: 1.6; }

        /* ─── Responsive ─── */
        @media (max-width: 767px) {
          .qtr-title { font-size: 1.7rem; }
          .hs-row { gap: 8px; }
          .hs-card { min-width: 60px; padding: 12px 8px; }
          .hs-val  { font-size: 18px; }
          .qb-overview { grid-template-columns: repeat(2,1fr); gap: 8px; }
          .lm-sheet { padding: 20px; border-radius: 24px; }
          .lm-row2 { flex-direction: column; }
          .qb-edit-nums { flex-direction: column; }
          .dl-toolbar { gap: 8px; }
          .ms-add-row { flex-direction: column; }
          .ms-add-btn { justify-content: center; }
        }
        @media (min-width: 768px) and (max-width: 1023px) {
          .qb-overview { grid-template-columns: repeat(3,1fr); }
        }
      `}</style>

      <div className="qtr-page">
        <h2 className="qtr-title">📋 Daily Logbook & Quota Tracker</h2>

        {dbError && (
          <div className="qtr-error">
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{dbError}</span>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '52px 0', color: '#ccc', fontSize: 14 }}>
            Loading your logbook…
          </div>
        ) : (
          <>
            <HeroStats logs={allLogs} quotasBySection={quotasBySection} />

            {/* Tabs */}
            <div className="qtr-tabs">
              <button className={`qtr-tab ${activeTab === 'log' ? 'active' : ''}`} onClick={() => setActiveTab('log')}>
                <span className="qtr-tab-icon"><ClipboardList size={18} /></span>
                <span className="qtr-tab-copy">
                  <span className="qtr-tab-title">Daily Log</span>
                  <span className="qtr-tab-sub">Record procedures and competency</span>
                </span>
                <span className="qtr-tab-badge">{tabStats.logCount}</span>
              </button>
              <button className={`qtr-tab quota ${activeTab === 'quota' ? 'active' : ''}`} onClick={() => setActiveTab('quota')}>
                <span className="qtr-tab-icon"><BarChart2 size={18} /></span>
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

      {/* Log Entry Modal */}
      {showModal && (
        <LogModal
          editing={editingLog}
          defaultSection={defaultSection}
          quotasBySection={quotasBySection}
          sections={sections}
          sectionMap={sectionMap}
          onClose={() => { setShowModal(false); setEditingLog(null); }}
          onSaved={handleLogSaved}
        />
      )}

      {/* Manage Sections Modal */}
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
