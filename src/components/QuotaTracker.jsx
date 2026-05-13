import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  Plus, Edit3, Trash2, X, Check,
  ClipboardList, BarChart2, AlertCircle,
  Filter, ChevronDown, ChevronUp, Target,
  CheckCircle2, TrendingUp, Award, Zap,
  PencilLine, Calendar, BookOpen, Search,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SECTIONS = [
  { id: 'Hematology',              color: '#ff6f91', bg: '#fff0f4', grad: 'linear-gradient(135deg,#ff8fb1,#ff6f91)' },
  { id: 'Clinical Chemistry',      color: '#ff8c5a', bg: '#fff5ee', grad: 'linear-gradient(135deg,#ffb37a,#ff8c5a)' },
  { id: 'Microbiology',            color: '#5f8dff', bg: '#eff4ff', grad: 'linear-gradient(135deg,#7ab6ff,#5f8dff)' },
  { id: 'Blood Bank',              color: '#e05555', bg: '#fff0f0', grad: 'linear-gradient(135deg,#ff8f8f,#e05555)' },
  { id: 'Histo / Cyto', color: '#4abf95', bg: '#edfaf4', grad: 'linear-gradient(135deg,#6dd6b1,#4abf95)' },
];
const SECTION_MAP = Object.fromEntries(SECTIONS.map(s => [s.id, s]));

const COMPETENCY = [
  { id: 'pass',       label: 'Pass',          emoji: '✅', color: '#4abf95', bg: '#edfaf4' },
  { id: 'needs_work', label: 'Needs Work',    emoji: '⚠️', color: '#ff8c5a', bg: '#fff5ee' },
  { id: 'fail',       label: 'Fail',          emoji: '❌', color: '#e05555', bg: '#fff0f0' },
  { id: 'observed',   label: 'Observed Only', emoji: '👁️', color: '#5f8dff', bg: '#eff4ff' },
];
const COMP_MAP = Object.fromEntries(COMPETENCY.map(c => [c.id, c]));

const DEFAULT_PROCEDURES = {
  'Hematology':              ['CBC (Complete Blood Count)', 'Peripheral Blood Smear', 'ESR', 'Platelet Count', 'PT/APTT', 'Reticulocyte Count'],
  'Clinical Chemistry':      ['Blood Glucose', 'Lipid Profile', 'Liver Function Tests', 'BUN/Creatinine', 'Electrolytes', 'Urinalysis'],
  'Microbiology':            ['Gram Staining', 'Culture & Sensitivity', 'KOH Preparation', 'AFB Smear', 'Antibiotic Sensitivity Test', 'Stool Exam'],
  'Blood Bank':              ['ABO/Rh Typing', 'Crossmatching', 'Antibody Screening', 'Direct Coombs Test', 'Blood Component Prep'],
  'Histo / Cyto': ['Tissue Processing', 'Microtomy / Sectioning', 'H&E Staining', 'Pap Smear Preparation', 'Special Stains', 'Frozen Section'],
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
  SECTIONS.forEach(sec => {
    const quotas = quotasBySection[sec.id] ?? [];
    quotas.forEach(q => {
      totalDone     += q.completed_count ?? 0;
      totalRequired += q.target_count    ?? 0;
    });
  });
  const overallPct = totalRequired > 0 ? Math.min(100, Math.round(totalDone / totalRequired * 100)) : 0;

  const stats = [
    { label: 'Today',     value: todayCount, color: '#ff6f91' },
    { label: 'This Week', value: weekCount, color: '#ff8c5a' },
    { label: 'Total Done',value: totalProcs, color: '#5f8dff' },
    { label: 'Pass Rate', value: `${passRate}%`, color: '#4abf95' },
    { label: 'Quota',     value: `${overallPct}%`, color: '#8b6fff' },
  ];

  return (
    <div className="hs-row">
      {stats.map(s => (
        <div key={s.label} className="hs-card">
          <span className="hs-emoji">{s.icon}</span>
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
function LogModal({ editing, defaultSection, quotasBySection, onClose, onSaved }) {
  const { user } = useAuth();

  const [sectionId, setSectionId] = useState(editing?.section_name ?? defaultSection ?? SECTIONS[0].id);
  const meta = SECTION_MAP[sectionId];

  const procedureOptions = useMemo(() => {
    // Always start from the hardcoded defaults for this section — these are
    // guaranteed to be correct regardless of what the DB contains.
    const defaults   = DEFAULT_PROCEDURES[sectionId] ?? [];
    const defaultSet = new Set(defaults);

    // Only append quota task_names that are genuinely custom (not already in
    // the defaults), so stale/contaminated rows from a prior seeding bug
    // never bleed Hematology procedures into other sections' selectors.
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

  // When section changes, reset procedure
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
      progress:       100, // legacy compat
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
        {/* Header */}
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
              {SECTIONS.map(s => (
                <button key={s.id} type="button"
                  className="lm-sec-pill"
                  style={sectionId === s.id
                    ? { background: s.color, borderColor: s.color, color: '#fff' }
                    : { borderColor: s.color + '55', color: s.color }}
                  onClick={() => handleSectionChange(s.id)}>
                  {s.id}
                </button>
              ))}
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

          {/* Competency rating */}
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
function DailyLogTab({ logs, quotasBySection, onAdd, onEdit, onDelete }) {
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

  /* Group by date */
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
          Filters {activeFilters > 0 && <span className="dl-filter-badge">{activeFilters}</span>}
        </button>

        <button className="dl-add-btn" onClick={() => onAdd()}>
          <Plus size={15} /> Log Entry
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="dl-filter-panel">
          {/* Section */}
          <div className="dl-filter-group">
            <span className="dl-filter-group-label">Section</span>
            <div className="dl-filter-pills">
              <button
                className={`dl-fpill ${!filterSection ? 'all-active' : ''}`}
                onClick={() => setFilterSection('')}>All</button>
              {SECTIONS.map(s => (
                <button key={s.id}
                  className={`dl-fpill ${filterSection === s.id ? 'active' : ''}`}
                  style={filterSection === s.id
                    ? { background: s.color, borderColor: s.color, color: '#fff' }
                    : { borderColor: s.color + '55', color: s.color }}
                  onClick={() => setFilterSection(filterSection === s.id ? '' : s.id)}>
                  {s.id}
                </button>
              ))}
            </div>
          </div>
          {/* Competency */}
          <div className="dl-filter-group">
            <span className="dl-filter-group-label">Rating</span>
            <div className="dl-filter-pills">
              <button
                className={`dl-fpill ${!filterComp ? 'all-active' : ''}`}
                onClick={() => setFilterComp('')}>All</button>
              {COMPETENCY.map(c => (
                <button key={c.id}
                  className={`dl-fpill ${filterComp === c.id ? 'active' : ''}`}
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
            <button className="dl-clear-all" onClick={() => { setFilterSection(''); setFilterComp(''); setSearch(''); }}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Results count */}
      {(activeFilters > 0 || search) && (
        <p className="dl-results-count">{filtered.length} of {logs.length} entries</p>
      )}

      {/* Empty */}
      {grouped.length === 0 && (
        <div className="dl-empty">
          <div className="dl-empty-icon">{logs.length === 0 ? '📓' : '🔍'}</div>
          <p>{logs.length === 0
            ? "No log entries yet — start by logging your first procedure!"
            : "No entries match the current filters."}</p>
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
            {/* Day header */}
            <div className="dl-day-header">
              <span className="dl-day-label">
                {getDayLabel(dateStr)}
                {isToday(dateStr) && <span className="dl-today-dot" />}
              </span>
              <span className="dl-day-sub">
                {fmtFull(dateStr)} · {dayLogs.reduce((s, l) => s + (l.count_done ?? 1), 0)} procedures
              </span>
            </div>

            {/* Entry cards */}
            {dayLogs.map(log => {
              const comp   = COMP_MAP[log.competency] ?? COMP_MAP.observed;
              const secMeta = SECTION_MAP[log.section_name];
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
                        <span className="dl-tag count" style={{ background: (secMeta?.bg), color: secMeta?.color }}>
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
                  {log.supervisor && (
                    <p className="dl-entry-sup">👤 {log.supervisor}</p>
                  )}
                  {log.notes && (
                    <p className="dl-entry-notes">"{log.notes}"</p>
                  )}
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
function QuotaBoardTab({ logs, quotasBySection, onQuotasChange }) {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState(SECTIONS[0].id);
  const [editingId, setEditingId] = useState(null);
  const [editForm,  setEditForm]  = useState({ task_name: '', target_count: '', completed_count: '' });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [deleting,  setDeleting]  = useState(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

  /* Log-derived counts for each section */
  const logCounts = useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const key = `${l.section_name}::${l.procedure_name}`;
      map[key] = (map[key] ?? 0) + (l.count_done ?? 1);
    });
    return map;
  }, [logs]);

  const startEdit = (quota) => {
    setEditingId(quota.id);
    setEditForm({ task_name: quota.task_name, target_count: String(quota.target_count), completed_count: String(quota.completed_count ?? 0) });
    setError('');
  };

  const startNew = (sectionId) => {
    setEditingId(`new::${sectionId}`);
    setEditForm({ task_name: '', target_count: '', completed_count: '0' });
    setError('');
  };

  const cancelEdit = () => { setEditingId(null); setError(''); };

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

  /* Compute per-section summary */
  const sectionSummaries = useMemo(() => SECTIONS.map(sec => {
    const quotas = quotasBySection[sec.id] ?? [];
    let done = 0, required = 0;
    quotas.forEach(q => {
      const logCount = logCounts[`${sec.id}::${q.task_name}`] ?? 0;
      done     += Math.max(q.completed_count ?? 0, logCount);
      required += q.target_count ?? 0;
    });
    const pct = required > 0 ? Math.min(100, Math.round(done / required * 100)) : 0;
    return { ...sec, done, required, pct, quotaCount: quotas.length };
  }), [quotasBySection, logCounts]);

  return (
    <div className="qb-wrap">
      {/* Section overview grid */}
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
        const secMeta = SECTION_MAP[expandedSection];
        const quotas  = quotasBySection[expandedSection] ?? [];
        const trackedNames = new Set(quotas.map(q => q.task_name));
        const defaultProcs = DEFAULT_PROCEDURES[expandedSection] ?? [];
        const untrackedDefaults = defaultProcs.filter(p => !trackedNames.has(p) && !dismissedSuggestions.has(p));
        const newKey  = `new::${expandedSection}`;
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
              <div className="qb-empty">
                <p>No quota items yet — click "Add Procedure" to start tracking.</p>
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

            {/* Untracked default procedures */}
            {untrackedDefaults.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1.5px solid ${secMeta.color}22` }}>
                <p className="qb-detail-sub" style={{ marginBottom: '10px', color: secMeta.color, fontWeight: 600 }}>
                  📚 Suggested Procedures
                </p>
                {untrackedDefaults.map(proc => (
                  <div key={proc} className="qb-default-proc">
                    <span className="qb-default-name">{proc}</span>
                    <div className="qb-default-btns">
                      <button
                        className="qb-default-add-btn"
                        style={{ background: secMeta.grad, color: 'white' }}
                        onClick={() => addDefaultAsQuota(proc)}
                        disabled={saving}
                        title="Add to quota tracking">
                        <Plus size={12} /> Add
                      </button>
                      <button
                        className="qb-default-delete-btn"
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
  const [defaultSection,  setDefaultSection]  = useState(SECTIONS[0].id);

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
      SECTIONS.forEach(s => { grouped[s.id] = []; });
      (quotasData ?? []).forEach(q => { if (grouped[q.section_name]) grouped[q.section_name].push(q); });
      setQuotasBySection(grouped);
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
    setDefaultSection(section ?? SECTIONS[0].id);
    setShowModal(true);
  };

  const openEdit = (log) => {
    setEditingLog(log);
    setDefaultSection(log.section_name);
    setShowModal(true);
  };

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
        .hs-row {
          display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;
        }
        .hs-card {
          flex: 1; min-width: 90px;
          background: rgba(255,255,255,0.88); border: 1.5px solid #ffe0ea;
          border-radius: 20px; padding: 16px 14px;
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .hs-card:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.1); }
        .hs-emoji { font-size: 20px; line-height: 1; }
        .hs-val { font-size: 22px; font-weight: 700; line-height: 1; }
        .hs-label { font-size: 10px; font-weight: 600; color: #bbb; text-transform: uppercase; letter-spacing: 0.06em; text-align: center; }

        /* ─── Page tabs (matches ShiftPlanner) ─── */
        .qtr-tabs { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .qtr-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 22px; border-radius: 999px;
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.8);
          color: #aaa; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all 0.2s;
        }
        .qtr-tab:hover { border-color: #ff8fb1; color: #ff5d8f; }
        .qtr-tab.active {
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          border-color: transparent; color: white;
          box-shadow: 0 6px 18px rgba(255,111,145,0.3);
        }

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
          display: flex; align-items: center; gap: 7px;
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.9);
          border-radius: 999px; padding: 10px 16px;
          font-size: 13px; font-weight: 600; color: #888; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .dl-filter-btn:hover, .dl-filter-btn.active { border-color: #ff8fb1; color: #ff5d8f; }
        .dl-filter-badge {
          display: inline-flex; align-items: center; justify-content: center;
          min-width: 18px; height: 18px; background: #ff6f91; color: white;
          border-radius: 999px; font-size: 10px; font-weight: 700; padding: 0 4px;
        }

        .dl-add-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 10px 20px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .dl-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }

        .dl-filter-panel {
          background: rgba(255,255,255,0.92); border: 1.5px solid #ffe0ea;
          border-radius: 20px; padding: 18px 20px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .dl-filter-group { display: flex; flex-direction: column; gap: 8px; }
        .dl-filter-group-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #ccc; }
        .dl-filter-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .dl-fpill {
          padding: 6px 14px; border-radius: 999px; border: 1.5px solid #ffd6e1;
          background: transparent; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: 0.15s; white-space: nowrap;
        }
        .dl-fpill.all-active { background: #ff5d8f; color: white; border-color: #ff5d8f; }
        .dl-clear-all {
          align-self: flex-start; background: none; border: none;
          color: #ff8fb1; font-size: 12px; font-weight: 600; cursor: pointer; padding: 0;
        }
        .dl-clear-all:hover { color: #ff5d8f; }

        .dl-results-count { font-size: 12px; color: #bbb; margin: 0; padding-left: 2px; }

        /* ─── Empty ─── */
        .dl-empty { text-align: center; padding: 52px 24px; color: #bbb; }
        .dl-empty-icon { font-size: 44px; margin-bottom: 14px; }
        .dl-empty p { margin: 0 0 18px; font-size: 14px; line-height: 1.6; }
        .dl-empty-btn {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white;
          border-radius: 999px; padding: 10px 22px; font-size: 13px; font-weight: 600; cursor: pointer;
        }

        /* ─── Timeline ─── */
        .dl-timeline { display: flex; flex-direction: column; gap: 24px; }

        .dl-day-group { display: flex; flex-direction: column; gap: 10px; }

        .dl-day-header {
          display: flex; align-items: baseline; gap: 10px;
          padding-bottom: 8px; border-bottom: 1.5px solid #ffe0ea;
        }
        .dl-day-label {
          font-size: 15px; font-weight: 700; color: #333;
          display: flex; align-items: center; gap: 8px;
        }
        .dl-today-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #ff6f91; display: inline-block;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
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
        .dl-tag {
          display: inline-flex; align-items: center; gap: 4px;
          border-radius: 999px; padding: 4px 10px;
          font-size: 11px; font-weight: 600; white-space: nowrap;
        }
        .dl-tag.count { font-weight: 700; }

        .dl-entry-actions { display: flex; gap: 6px; flex-shrink: 0; }
        .dl-act-btn {
          border: none; background: #f0f0f0; padding: 8px; border-radius: 10px;
          cursor: pointer; display: flex; align-items: center; color: #888; transition: 0.2s;
        }
        .dl-act-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .dl-act-btn.danger:hover { background: #fde8e8; color: #e05555; }

        .dl-confirm-row { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; }
        .dl-conf-yes {
          border: none; background: #fde8e8; color: #e05555; border-radius: 8px;
          padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .dl-conf-no {
          border: none; background: #f0f0f0; color: #888; border-radius: 8px;
          padding: 5px 10px; font-size: 12px; font-weight: 600; cursor: pointer;
        }

        .dl-entry-sup { margin: 0; font-size: 12px; color: #aaa; }
        .dl-entry-notes {
          margin: 0; font-size: 13px; color: #666; font-style: italic; line-height: 1.55;
          border-left: 2px solid #ffe0ea; padding-left: 10px;
        }

        /* ─── Quota Board ─── */
        .qb-wrap { display: flex; flex-direction: column; gap: 20px; }

        .qb-overview { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; }
        .qb-sec-btn {
          background: rgba(255,255,255,0.88); border: 1.5px solid;
          border-radius: 20px; padding: 14px; cursor: pointer;
          text-align: left; transition: all 0.2s;
          display: flex; flex-direction: column; gap: 8px;
        }
        .qb-sec-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 18px rgba(0,0,0,0.07); }
        .qb-sec-btn.active { background: white; }
        .qb-sec-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .qb-sec-name { font-size: 11px; font-weight: 700; line-height: 1.4; }
        .qb-sec-pct  { font-size: 13px; font-weight: 700; white-space: nowrap; }
        .qb-sec-bar  { height: 6px; background: #f0f0f0; border-radius: 999px; overflow: hidden; }
        .qb-sec-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
        .qb-sec-sub  { font-size: 10px; color: #bbb; font-weight: 600; }

        .qb-detail {
          background: rgba(255,255,255,0.9); border: 1.5px solid;
          border-radius: 24px; padding: 24px; display: flex; flex-direction: column; gap: 14px;
        }
        .qb-detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .qb-detail-title  { margin: 0; font-size: 1.1rem; font-weight: 700; }
        .qb-detail-sub    { margin: 4px 0 0; font-size: 13px; color: #aaa; }
        .qb-add-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; color: white; border-radius: 999px;
          padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .qb-add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.15); }
        .qb-add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .qb-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .qb-empty { text-align: center; padding: 24px 0; color: #bbb; font-size: 13px; }

        .qb-edit-card {
          background: white; border: 1.5px solid; border-radius: 18px;
          padding: 16px; display: flex; flex-direction: column; gap: 12px;
          box-shadow: 0 4px 16px rgba(255,111,145,0.1);
        }
        .qb-input {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 12px;
          padding: 10px 12px; font-size: 13px; outline: none; transition: 0.2s; color: #444; font-family: inherit;
        }
        .qb-input:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .qb-proc-input { width: 100%; }
        .qb-edit-nums { display: flex; gap: 12px; }
        .qb-num-label {
          display: flex; flex-direction: column; gap: 5px;
          font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #bbb; flex: 1;
        }
        .qb-num { width: 100%; }
        .qb-edit-btns { display: flex; gap: 8px; }
        .qb-save-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; color: white; border-radius: 10px;
          padding: 8px 14px; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .qb-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .qb-cancel-btn { border: none; background: #f0f0f0; border-radius: 10px; padding: 8px 10px; cursor: pointer; display: flex; align-items: center; color: #888; }
        .qb-cancel-btn:hover { background: #ffe4ec; color: #ff5d8f; }

        .qb-quota-row {
          background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 16px; padding: 14px;
          transition: box-shadow 0.2s;
        }
        .qb-quota-row:hover { box-shadow: 0 3px 12px rgba(255,111,145,0.08); }
        .qb-quota-row.complete { border-color: #b8f0da; background: #f0fdf7; }
        .qb-qrow-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .qb-qname { font-size: 13px; font-weight: 600; color: #444; flex: 1; }
        .qb-qrow-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
        .qb-log-hint { font-size: 10px; color: #bbb; background: #f5f5f5; padding: 2px 7px; border-radius: 999px; }
        .qb-count { font-size: 12px; font-weight: 700; }
        .qb-plus-btn {
          border: 1.5px solid; background: transparent; border-radius: 8px;
          padding: 3px 8px; font-size: 11px; font-weight: 700; cursor: pointer; transition: 0.15s;
        }
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

        .qb-default-proc {
          display: flex; justify-content: space-between; align-items: center;
          background: #fafafa; border: 1.5px solid #f0f0f0; border-radius: 14px;
          padding: 12px 14px; margin-bottom: 8px; gap: 10px;
        }
        .qb-default-name { font-size: 13px; color: #666; font-weight: 500; flex: 1; }
        .qb-default-add-btn {
          display: inline-flex; align-items: center; gap: 5px;
          border: none; border-radius: 999px; padding: 6px 12px;
          font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.2s;
          white-space: nowrap;
        }
        .qb-default-add-btn:hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(0,0,0,0.15); }
        .qb-default-add-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .qb-default-btns {
          display: flex; gap: 8px; align-items: center;
        }
        .qb-default-delete-btn {
          display: inline-flex; align-items: center; justify-content: center;
          border: 1.5px solid #e0e0e0; border-radius: 999px; padding: 6px 8px;
          background: #fff; color: #999; cursor: pointer; transition: 0.2s;
          font-size: 11px; font-weight: 600;
        }
        .qb-default-delete-btn:hover {
          border-color: #ff6f91; color: #ff6f91; background: #ffe0ea;
          transform: translateY(-1px); box-shadow: 0 3px 8px rgba(0,0,0,0.08);
        }
        .qb-default-delete-btn:active { transform: translateY(0); }

        /* ─── Log Modal ─── */
        .lm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.22); backdrop-filter: blur(5px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .lm-sheet {
          background: white; border-radius: 28px; padding: 28px; width: 100%; max-width: 520px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2); border: 1px solid #ffe0ea;
          max-height: 90vh; overflow-y: auto;
        }
        .lm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .lm-hrow { display: flex; align-items: center; gap: 10px; }
        .lm-hdot { width: 10px; height: 10px; border-radius: 50%; }
        .lm-htitle { margin: 0; font-size: 1.1rem; font-weight: 700; color: #333; }
        .lm-close { border: none; background: #f4f4f4; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; }
        .lm-close:hover { background: #ffe4ec; color: #ff5d8f; }
        .lm-form { display: flex; flex-direction: column; gap: 16px; }
        .lm-sec-pills { display: flex; flex-wrap: wrap; gap: 7px; }
        .lm-sec-pill { padding: 6px 12px; border-radius: 999px; border: 1.5px solid; background: transparent; font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s; white-space: nowrap; }
        .lm-row2 { display: flex; gap: 14px; }
        .lm-row2 > * { flex: 1; }
        .lm-flabel { display: flex; flex-direction: column; gap: 7px; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; margin: 0; }
        .lm-input, .lm-sel {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444;
          font-family: inherit; width: 100%; appearance: none;
        }
        .lm-input:focus, .lm-sel:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .lm-textarea { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; resize: vertical; min-height: 80px; font-family: inherit; line-height: 1.6; width: 100%; }
        .lm-textarea:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .lm-comp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .lm-comp-btn { display: flex; align-items: center; gap: 8px; padding: 11px 14px; border-radius: 14px; border: 1.5px solid; background: transparent; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.15s; }
        .lm-comp-emoji { font-size: 16px; }
        .lm-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .lm-actions { display: flex; gap: 10px; padding-top: 4px; }
        .lm-primary {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 999px;
          padding: 11px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .lm-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .lm-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .lm-secondary { border: none; background: #f4f4f4; color: #666; border-radius: 999px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; }

        /* ─── Responsive ─── */
        @media (max-width: 767px) {
          .qtr-title { font-size: 1.7rem; }
          .hs-row { gap: 8px; }
          .hs-card { min-width: 60px; padding: 12px 8px; }
          .hs-val  { font-size: 18px; }
          .qb-overview { grid-template-columns: repeat(2,1fr); gap: 8px; }
          .lm-sheet { padding: 20px; border-radius: 24px; }
          .lm-row2 { flex-direction: column; }
          .lm-comp-grid { grid-template-columns: 1fr 1fr; }
          .qb-edit-nums { flex-direction: column; }
          .dl-toolbar { gap: 8px; }
          .dl-add-btn span { display: none; }
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
            {/* Hero stats */}
            <HeroStats logs={allLogs} quotasBySection={quotasBySection} />

            {/* Tabs */}
            <div className="qtr-tabs">
              <button
                className={`qtr-tab ${activeTab === 'log' ? 'active' : ''}`}
                onClick={() => setActiveTab('log')}>
                <ClipboardList size={16} />
                Daily Log ({allLogs.length})
              </button>
              <button
                className={`qtr-tab ${activeTab === 'quota' ? 'active' : ''}`}
                onClick={() => setActiveTab('quota')}>
                <BarChart2 size={16} />
                Quota Board
              </button>
            </div>

            {/* Tab content */}
            {activeTab === 'log' && (
              <DailyLogTab
                logs={allLogs}
                quotasBySection={quotasBySection}
                onAdd={openAdd}
                onEdit={openEdit}
                onDelete={handleLogDelete}
              />
            )}

            {activeTab === 'quota' && (
              <QuotaBoardTab
                logs={allLogs}
                quotasBySection={quotasBySection}
                onQuotasChange={handleQuotasChange}
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
          onClose={() => { setShowModal(false); setEditingLog(null); }}
          onSaved={handleLogSaved}
        />
      )}
    </>
  );
}