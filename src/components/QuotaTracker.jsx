import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  Plus, Edit3, Trash2, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, BarChart2,
  BookOpen, Layers, ClipboardList, X, Check,
  TrendingUp, Award, AlertCircle, Filter,
  Save, PencilLine, Target, RefreshCw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const SECTIONS = [
  { id: 'Hematology',             color: '#ff6f91', bg: '#fff0f4', light: '#fff8fb' },
  { id: 'Clinical Chemistry',     color: '#ff8c5a', bg: '#fff5ee', light: '#fffaf7' },
  { id: 'Microbiology',           color: '#5f8dff', bg: '#eff4ff', light: '#f7f9ff' },
  { id: 'Blood Bank',             color: '#e05555', bg: '#fff0f0', light: '#fff8f8' },
  { id: 'Histopathology/Cytology',color: '#4abf95', bg: '#edfaf4', light: '#f5fdf9' },
];

const SECTION_MAP = Object.fromEntries(SECTIONS.map((s) => [s.id, s]));

const COMPETENCY = [
  { id: 'pass',        label: 'Pass',         icon: '✅', color: '#4abf95', bg: '#edfaf4' },
  { id: 'needs_work',  label: 'Needs Work',   icon: '⚠️', color: '#ff8c5a', bg: '#fff5ee' },
  { id: 'fail',        label: 'Fail',         icon: '❌', color: '#e05555', bg: '#fff0f0' },
  { id: 'observed',    label: 'Observed Only', icon: '👁️', color: '#5f8dff', bg: '#eff4ff' },
];

const COMP_MAP = Object.fromEntries(COMPETENCY.map((c) => [c.id, c]));

/* Default seed quotas — used only when a section has no saved quotas yet */
const DEFAULT_QUOTAS = {
  'Hematology':              [
    { procedure: 'CBC (Complete Blood Count)',   required: 50 },
    { procedure: 'Peripheral Blood Smear',       required: 30 },
    { procedure: 'ESR',                          required: 20 },
    { procedure: 'Platelet Count',               required: 20 },
    { procedure: 'Coagulation Studies (PT/APTT)',required: 15 },
    { procedure: 'Reticulocyte Count',           required: 10 },
  ],
  'Clinical Chemistry':      [
    { procedure: 'Blood Glucose',               required: 40 },
    { procedure: 'Lipid Profile',               required: 25 },
    { procedure: 'Liver Function Tests',        required: 20 },
    { procedure: 'Kidney Function Tests (BUN/Creatinine)', required: 20 },
    { procedure: 'Electrolytes',                required: 15 },
    { procedure: 'Urinalysis (Chem)',            required: 30 },
  ],
  'Microbiology':            [
    { procedure: 'Gram Staining',               required: 40 },
    { procedure: 'Culture & Sensitivity',       required: 25 },
    { procedure: 'KOH Preparation',             required: 15 },
    { procedure: 'AFB Smear',                   required: 10 },
    { procedure: 'Antibiotic Sensitivity Test', required: 20 },
    { procedure: 'Stool Exam (Parasite)',        required: 20 },
  ],
  'Blood Bank':              [
    { procedure: 'ABO/Rh Typing',              required: 30 },
    { procedure: 'Crossmatching',              required: 25 },
    { procedure: 'Antibody Screening',         required: 15 },
    { procedure: 'Direct Coombs Test',         required: 10 },
    { procedure: 'Blood Component Prep',       required: 10 },
  ],
  'Histopathology/Cytology': [
    { procedure: 'Tissue Processing',          required: 20 },
    { procedure: 'Microtomy / Sectioning',     required: 20 },
    { procedure: 'H&E Staining',              required: 25 },
    { procedure: 'Pap Smear Preparation',     required: 15 },
    { procedure: 'Special Stains',            required: 10 },
    { procedure: 'Frozen Section',            required: 5  },
  ],
};

function isMissingTableError(error) {
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    error?.message?.includes('schema cache') ||
    error?.message?.includes('does not exist') ||
    error?.message?.includes('Could not find the table')
  );
}

function toLocaleDateStr(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/* ─────────────────────────────────────────────
   SUMMARY DASHBOARD
───────────────────────────────────────────── */
function SummaryDashboard({ allLogs, quotasBySection, activeSection, onSelectSection }) {
  const sectionStats = useMemo(() => {
    return SECTIONS.map((sec) => {
      const logs = allLogs.filter((l) => l.section_name === sec.id);
      const quotas = quotasBySection[sec.id] ?? [];

      // Build done counts from logs
      const logDoneCounts = {};
      logs.forEach((l) => {
        logDoneCounts[l.procedure_name] = (logDoneCounts[l.procedure_name] ?? 0) + (l.count_done ?? 1);
      });

      // Merge: quota's manual count OR log count (whichever is higher, quota manual takes precedence if set)
      let totalDone = 0;
      let totalRequired = 0;
      quotas.forEach((q) => {
        const logCount = logDoneCounts[q.task_name] ?? 0;
        const manualCount = q.completed_count ?? 0;
        totalDone += Math.max(manualCount, logCount);
        totalRequired += q.target_count ?? 0;
      });

      const pct = totalRequired > 0 ? Math.min(100, Math.round((totalDone / totalRequired) * 100)) : 0;
      const passCount = logs.filter((l) => l.competency === 'pass').length;
      const passRate = logs.length > 0 ? Math.round((passCount / logs.length) * 100) : null;
      const lastEntry = logs[0]?.log_date ?? null;
      return { ...sec, totalDone, totalRequired, pct, passRate, entryCount: logs.length, lastEntry };
    });
  }, [allLogs, quotasBySection]);

  const grandTotal = sectionStats.reduce((s, x) => s + x.totalDone, 0);
  const grandRequired = sectionStats.reduce((s, x) => s + x.totalRequired, 0);
  const grandPct = grandRequired > 0 ? Math.min(100, Math.round((grandTotal / grandRequired) * 100)) : 0;
  const completedSections = sectionStats.filter((s) => s.pct >= 100).length;

  return (
    <div className="qt-summary">
      <div className="qt-grand-card">
        <div className="qt-grand-left">
          <div className="qt-grand-ring">
            <svg viewBox="0 0 80 80" width="80" height="80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#ffe0ea" strokeWidth="8" />
              <circle
                cx="40" cy="40" r="34" fill="none"
                stroke="url(#pinkGrad)" strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - grandPct / 100)}`}
                strokeLinecap="round"
                transform="rotate(-90 40 40)"
              />
              <defs>
                <linearGradient id="pinkGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ff8fb1"/>
                  <stop offset="100%" stopColor="#ff6f91"/>
                </linearGradient>
              </defs>
            </svg>
            <span className="qt-grand-pct">{grandPct}%</span>
          </div>
          <div>
            <p className="qt-grand-label">Overall Completion</p>
            <p className="qt-grand-sub">{grandTotal} of {grandRequired} total procedures</p>
          </div>
        </div>
        <div className="qt-grand-chips">
          <div className="qt-grand-chip pink">
            <Award size={14} />
            <span>{completedSections}/{SECTIONS.length} sections complete</span>
          </div>
          <div className="qt-grand-chip blue">
            <ClipboardList size={14} />
            <span>{allLogs.length} log entries total</span>
          </div>
        </div>
      </div>

      <div className="qt-section-cards">
        {sectionStats.map((sec) => (
          <button
            key={sec.id}
            className={`qt-sec-card ${activeSection === sec.id ? 'active' : ''}`}
            style={activeSection === sec.id
              ? { borderColor: sec.color, boxShadow: `0 0 0 2px ${sec.color}44` }
              : { borderColor: sec.color + '33' }}
            onClick={() => onSelectSection(sec.id)}
          >
            <div className="qt-sec-top">
              <span className="qt-sec-name" style={{ color: sec.color }}>{sec.id}</span>
              <span className="qt-sec-pct" style={{ color: sec.pct >= 100 ? '#4abf95' : sec.color }}>
                {sec.pct >= 100 ? '✅' : `${sec.pct}%`}
              </span>
            </div>
            <div className="qt-mini-bar-wrap">
              <div className="qt-mini-bar">
                <div
                  className="qt-mini-fill"
                  style={{
                    width: `${sec.pct}%`,
                    background: sec.pct >= 100
                      ? 'linear-gradient(90deg,#6dd6b1,#4abf95)'
                      : `linear-gradient(90deg,${sec.color}cc,${sec.color})`,
                  }}
                />
              </div>
            </div>
            <div className="qt-sec-meta">
              <span>{sec.totalDone}/{sec.totalRequired} done</span>
              {sec.passRate !== null && (
                <span style={{ color: '#4abf95' }}>{sec.passRate}% pass</span>
              )}
            </div>
            {sec.lastEntry && (
              <p className="qt-sec-last">Last: {toLocaleDateStr(sec.lastEntry)}</p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDITABLE QUOTA PROGRESS
───────────────────────────────────────────── */
function QuotaProgress({ sectionId, logs, quotas, onQuotasChange }) {
  const { user } = useAuth();
  const meta = SECTION_MAP[sectionId];

  // editingId: quota id being inline-edited, or 'new' for new row
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ task_name: '', target_count: '', completed_count: '' });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');

  // Compute log-based done counts to show alongside manual
  const logDoneCounts = useMemo(() => {
    const map = {};
    logs.forEach((l) => {
      map[l.procedure_name] = (map[l.procedure_name] ?? 0) + (l.count_done ?? 1);
    });
    return map;
  }, [logs]);

  const startEdit = (quota) => {
    setEditingId(quota.id);
    setEditForm({
      task_name: quota.task_name,
      target_count: String(quota.target_count),
      completed_count: String(quota.completed_count ?? 0),
    });
    setError('');
  };

  const startNew = () => {
    setEditingId('new');
    setEditForm({ task_name: '', target_count: '', completed_count: '0' });
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ task_name: '', target_count: '', completed_count: '' });
    setError('');
  };

  const saveEdit = async () => {
    if (!editForm.task_name.trim()) { setError('Procedure name is required.'); return; }
    const target = parseInt(editForm.target_count, 10);
    const done = parseInt(editForm.completed_count, 10);
    if (isNaN(target) || target < 1) { setError('Goal must be at least 1.'); return; }
    if (isNaN(done) || done < 0) { setError('Progress must be 0 or more.'); return; }

    setSaving(true); setError('');

    if (editingId === 'new') {
      const { data, error: err } = await supabase
        .from('quotas')
        .insert([{
          user_id: user.id,
          section_name: sectionId,
          task_name: editForm.task_name.trim(),
          target_count: target,
          completed_count: done,
        }])
        .select()
        .single();
      setSaving(false);
      if (err) { setError(err.message); return; }
      onQuotasChange([...quotas, data]);
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
      if (err) { setError(err.message); return; }
      onQuotasChange(quotas.map((q) => (q.id === editingId ? data : q)));
    }
    cancelEdit();
  };

  const deleteQuota = async (id) => {
    setDeletingId(id);
    await supabase.from('quotas').delete().eq('id', id);
    setDeletingId(null);
    onQuotasChange(quotas.filter((q) => q.id !== id));
  };

  // Quick-increment done count without opening full edit
  const incrementDone = async (quota) => {
    const newCount = (quota.completed_count ?? 0) + 1;
    const { data, error: err } = await supabase
      .from('quotas')
      .update({ completed_count: newCount, updated_at: new Date().toISOString() })
      .eq('id', quota.id)
      .select()
      .single();
    if (!err) onQuotasChange(quotas.map((q) => (q.id === quota.id ? data : q)));
  };

  return (
    <div className="qp-wrap">
      <div className="qp-header-row">
        <div className="qp-header">
          <Layers size={15} style={{ color: meta?.color }} />
          <span style={{ color: meta?.color }}>Quota Progress — {sectionId}</span>
        </div>
        <button
          className="qp-add-btn"
          style={{ background: `linear-gradient(135deg,${meta?.color}cc,${meta?.color})` }}
          onClick={startNew}
          disabled={editingId !== null}
        >
          <Plus size={13} /> Add Procedure
        </button>
      </div>

      {error && <p className="qp-error">{error}</p>}

      <div className="qp-list">
        {/* New row form */}
        {editingId === 'new' && (
          <div className="qp-edit-row new-row" style={{ borderColor: meta?.color + '55' }}>
            <div className="qp-edit-fields">
              <input
                className="qp-input"
                placeholder="Procedure name…"
                value={editForm.task_name}
                onChange={(e) => setEditForm({ ...editForm, task_name: e.target.value })}
                autoFocus
              />
              <div className="qp-edit-numbers">
                <label className="qp-num-label">
                  <Target size={11} />
                  Goal
                  <input
                    className="qp-input qp-num-input"
                    type="number"
                    min="1"
                    placeholder="50"
                    value={editForm.target_count}
                    onChange={(e) => setEditForm({ ...editForm, target_count: e.target.value })}
                  />
                </label>
                <label className="qp-num-label">
                  <CheckCircle2 size={11} />
                  Done
                  <input
                    className="qp-input qp-num-input"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={editForm.completed_count}
                    onChange={(e) => setEditForm({ ...editForm, completed_count: e.target.value })}
                  />
                </label>
              </div>
            </div>
            <div className="qp-edit-actions">
              <button className="qp-save-btn" onClick={saveEdit} disabled={saving}
                style={{ background: `linear-gradient(135deg,${meta?.color}cc,${meta?.color})` }}>
                <Check size={13} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button className="qp-cancel-btn" onClick={cancelEdit}>
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {quotas.length === 0 && editingId !== 'new' && (
          <div className="qp-empty">
            <p>No quota procedures yet — add your first one!</p>
          </div>
        )}

        {quotas.map((q) => {
          const logCount = logDoneCounts[q.task_name] ?? 0;
          const manualCount = q.completed_count ?? 0;
          // Show the higher of manual vs log, but let manual override
          const effectiveDone = Math.max(manualCount, logCount);
          const pct = Math.min(100, Math.round((effectiveDone / (q.target_count || 1)) * 100));
          const complete = effectiveDone >= q.target_count;
          const isEditing = editingId === q.id;

          if (isEditing) {
            return (
              <div key={q.id} className="qp-edit-row" style={{ borderColor: meta?.color + '55' }}>
                <div className="qp-edit-fields">
                  <input
                    className="qp-input"
                    placeholder="Procedure name…"
                    value={editForm.task_name}
                    onChange={(e) => setEditForm({ ...editForm, task_name: e.target.value })}
                    autoFocus
                  />
                  <div className="qp-edit-numbers">
                    <label className="qp-num-label">
                      <Target size={11} />
                      Goal
                      <input
                        className="qp-input qp-num-input"
                        type="number"
                        min="1"
                        value={editForm.target_count}
                        onChange={(e) => setEditForm({ ...editForm, target_count: e.target.value })}
                      />
                    </label>
                    <label className="qp-num-label">
                      <CheckCircle2 size={11} />
                      Done
                      <input
                        className="qp-input qp-num-input"
                        type="number"
                        min="0"
                        value={editForm.completed_count}
                        onChange={(e) => setEditForm({ ...editForm, completed_count: e.target.value })}
                      />
                    </label>
                  </div>
                </div>
                <div className="qp-edit-actions">
                  <button className="qp-save-btn" onClick={saveEdit} disabled={saving}
                    style={{ background: `linear-gradient(135deg,${meta?.color}cc,${meta?.color})` }}>
                    <Check size={13} /> {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button className="qp-cancel-btn" onClick={cancelEdit}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div key={q.id} className={`qp-row ${complete ? 'complete' : ''}`}>
              <div className="qp-row-top">
                <span className="qp-proc-name">{q.task_name}</span>
                <div className="qp-row-right">
                  {logCount > 0 && logCount !== manualCount && (
                    <span className="qp-log-hint" title="Auto-counted from daily logs">
                      📋 {logCount} from logs
                    </span>
                  )}
                  <span className={`qp-count ${complete ? 'done' : ''}`}>
                    {effectiveDone}/{q.target_count}
                    {complete && ' ✅'}
                  </span>
                  {/* Quick +1 button */}
                  <button
                    className="qp-plus-btn"
                    style={{ color: meta?.color, borderColor: meta?.color + '44' }}
                    onClick={() => incrementDone(q)}
                    title="Quick +1"
                  >
                    +1
                  </button>
                  <button className="qp-icon-btn" onClick={() => startEdit(q)} title="Edit">
                    <PencilLine size={12} />
                  </button>
                  <button
                    className="qp-icon-btn danger"
                    onClick={() => deleteQuota(q.id)}
                    disabled={deletingId === q.id}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className="qp-bar">
                <div
                  className="qp-fill"
                  style={{
                    width: `${pct}%`,
                    background: complete
                      ? 'linear-gradient(90deg,#6dd6b1,#4abf95)'
                      : `linear-gradient(90deg,${meta?.color}99,${meta?.color})`,
                  }}
                />
              </div>
              <div className="qp-row-bottom">
                <span className="qp-pct-label">{pct}% complete</span>
                {manualCount > 0 && logCount > 0 && (
                  <span className="qp-source-hint">
                    Manual: {manualCount} · Logs: {logCount}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOG ENTRY MODAL
───────────────────────────────────────────── */
function LogModal({ sectionId, editing, quotas, onClose, onSaved }) {
  const { user } = useAuth();
  const meta = SECTION_MAP[sectionId];

  const procedureOptions = quotas.length > 0
    ? quotas.map((q) => q.task_name)
    : (DEFAULT_QUOTAS[sectionId] ?? []).map((q) => q.procedure);

  const [form, setForm] = useState({
    log_date:       editing?.log_date       ?? new Date().toISOString().slice(0, 10),
    procedure_name: editing?.procedure_name ?? (procedureOptions[0] ?? ''),
    count_done:     editing?.count_done     ?? 1,
    competency:     editing?.competency     ?? 'pass',
    notes:          editing?.notes          ?? '',
    supervisor:     editing?.supervisor     ?? '',
  });
  const [customProc, setCustomProc] = useState(
    editing?.procedure_name && !procedureOptions.includes(editing.procedure_name)
      ? editing.procedure_name : ''
  );
  const [useCustom, setUseCustom] = useState(
    Boolean(editing?.procedure_name && !procedureOptions.includes(editing.procedure_name))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const effectiveProcedure = useCustom ? customProc : form.procedure_name;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveProcedure.trim()) { setError('Please select or enter a procedure.'); return; }
    setSaving(true); setError('');

    const payload = {
      user_id:        user.id,
      section_name:   sectionId,
      log_date:       form.log_date,
      procedure_name: effectiveProcedure.trim(),
      count_done:     Number(form.count_done),
      competency:     form.competency,
      notes:          form.notes.trim(),
      supervisor:     form.supervisor.trim(),
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
      <div className="lm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="lm-header">
          <div className="lm-title-row">
            <div className="lm-dot" style={{ background: meta?.color }} />
            <h3>{editing ? 'Edit Log Entry' : 'New Log Entry'}</h3>
          </div>
          <button className="lm-close" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="lm-form">
          <div className="lm-row2">
            <label className="lm-label">
              Date *
              <input type="date" className="lm-input" value={form.log_date}
                onChange={(e) => setForm({ ...form, log_date: e.target.value })} required />
            </label>
            <label className="lm-label">
              Count Done *
              <input type="number" className="lm-input" min="1" max="999"
                value={form.count_done}
                onChange={(e) => setForm({ ...form, count_done: e.target.value })} required />
            </label>
          </div>

          <div>
            <p className="lm-label" style={{ marginBottom: 8 }}>Procedure *</p>
            {!useCustom ? (
              <select className="lm-input lm-select" value={form.procedure_name}
                onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}>
                {procedureOptions.map((p) => <option key={p}>{p}</option>)}
              </select>
            ) : (
              <input className="lm-input" placeholder="Type procedure name…"
                value={customProc}
                onChange={(e) => setCustomProc(e.target.value)} />
            )}
            <button type="button" className="lm-toggle-custom"
              onClick={() => setUseCustom((v) => !v)}>
              {useCustom ? '← Pick from list' : '+ Custom procedure'}
            </button>
          </div>

          <div>
            <p className="lm-label" style={{ marginBottom: 8 }}>Competency Rating *</p>
            <div className="lm-comp-pills">
              {COMPETENCY.map((c) => (
                <button key={c.id} type="button"
                  className={`lm-comp-pill ${form.competency === c.id ? 'active' : ''}`}
                  style={form.competency === c.id
                    ? { background: c.color, borderColor: c.color, color: '#fff' }
                    : { borderColor: c.color + '55', color: c.color }}
                  onClick={() => setForm({ ...form, competency: c.id })}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          </div>

          <label className="lm-label">
            Supervisor (optional)
            <input className="lm-input" placeholder="Name of supervising MLT/MLS…"
              value={form.supervisor}
              onChange={(e) => setForm({ ...form, supervisor: e.target.value })} />
          </label>

          <label className="lm-label">
            Reflection / Notes (optional)
            <textarea className="lm-textarea" rows={3}
              placeholder="What did you learn? Any difficulties encountered?"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>

          {error && <p className="lm-error">{error}</p>}

          <div className="lm-actions">
            <button type="submit" className="lm-primary" disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Entry' : 'Log Entry'}
            </button>
            <button type="button" className="lm-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   LOG ENTRY CARD
───────────────────────────────────────────── */
function LogCard({ log, accentColor, onEdit, onDelete, confirmingId, onConfirmDelete, onCancelDelete }) {
  const comp = COMP_MAP[log.competency] ?? COMP_MAP.observed;
  const isConfirming = confirmingId === log.id;

  return (
    <div className="lc-card" style={{ borderLeftColor: accentColor }}>
      <div className="lc-top">
        <div className="lc-left">
          <span className="lc-date">{toLocaleDateStr(log.log_date)}</span>
          <span className="lc-proc">{log.procedure_name}</span>
        </div>
        <div className="lc-right">
          <span className="lc-count" style={{ background: accentColor + '18', color: accentColor }}>
            ×{log.count_done}
          </span>
          <span className="lc-comp" style={{ background: comp.bg, color: comp.color }}>
            {comp.icon} {comp.label}
          </span>
        </div>
      </div>
      {log.supervisor && <p className="lc-supervisor">👤 {log.supervisor}</p>}
      {log.notes && <p className="lc-notes">"{log.notes}"</p>}
      <div className="lc-footer">
        <div className="lc-actions">
          <button className="lc-btn" onClick={() => onEdit(log)} title="Edit"><Edit3 size={12} /></button>
          {isConfirming ? (
            <div className="lc-confirm">
              <span>Delete?</span>
              <button className="lc-btn danger" onClick={() => onConfirmDelete(log.id)}>Yes</button>
              <button className="lc-btn" onClick={onCancelDelete}>No</button>
            </div>
          ) : (
            <button className="lc-btn danger" onClick={() => onDelete(log.id)} title="Delete">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION PANEL
───────────────────────────────────────────── */
function SectionPanel({ sectionId, logs, quotas, onAdd, onEdit, onDelete, onQuotasChange }) {
  const meta = SECTION_MAP[sectionId];
  const [activeTab, setActiveTab] = useState('log');
  const [filterComp, setFilterComp] = useState('');
  const [confirmingId, setConfirmingId] = useState(null);

  const filtered = useMemo(() => {
    let list = [...logs].sort((a, b) => new Date(b.log_date) - new Date(a.log_date));
    if (filterComp) list = list.filter((l) => l.competency === filterComp);
    return list;
  }, [logs, filterComp]);

  const handleDeleteClick = (id) => setConfirmingId(id);
  const handleConfirmDelete = (id) => { onDelete(id); setConfirmingId(null); };
  const handleCancelDelete = () => setConfirmingId(null);

  return (
    <div className="sp2-panel">
      <div className="sp2-header" style={{ background: `linear-gradient(135deg, ${meta.color}22, ${meta.color}08)`, borderColor: meta.color + '33' }}>
        <div className="sp2-header-top">
          <div>
            <h3 style={{ color: meta.color, margin: 0 }}>{sectionId}</h3>
            <p className="sp2-header-sub">{logs.length} log {logs.length === 1 ? 'entry' : 'entries'} · {quotas.length} quota items</p>
          </div>
          <button
            className="sp2-add-btn"
            style={{ background: `linear-gradient(135deg, ${meta.color}dd, ${meta.color})` }}
            onClick={onAdd}
          >
            <Plus size={15} /> Log Entry
          </button>
        </div>

        <div className="sp2-tabs">
          {[
            { id: 'log',    label: `📋 Daily Log (${logs.length})` },
            { id: 'quota',  label: `📊 Quota Progress (${quotas.length})` },
          ].map((t) => (
            <button key={t.id}
              className={`sp2-tab ${activeTab === t.id ? 'active' : ''}`}
              style={activeTab === t.id ? { borderBottomColor: meta.color, color: meta.color } : {}}
              onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'log' && (
        <div className="sp2-body">
          {logs.length > 0 && (
            <div className="sp2-filter-row">
              <span className="sp2-filter-label"><Filter size={11} /> Rating:</span>
              <button className={`sp2-fpill all ${!filterComp ? 'active' : ''}`}
                style={!filterComp ? { background: meta.color, color: '#fff', borderColor: meta.color } : { color: meta.color, borderColor: meta.color + '55' }}
                onClick={() => setFilterComp('')}>All</button>
              {COMPETENCY.map((c) => (
                <button key={c.id}
                  className={`sp2-fpill ${filterComp === c.id ? 'active' : ''}`}
                  style={filterComp === c.id
                    ? { background: c.color, color: '#fff', borderColor: c.color }
                    : { color: c.color, borderColor: c.color + '55' }}
                  onClick={() => setFilterComp(filterComp === c.id ? '' : c.id)}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 ? (
            <div className="sp2-empty">
              <p>{logs.length === 0 ? 'No entries yet — start logging your procedures! 📝' : 'No entries match this filter.'}</p>
              {logs.length === 0 && (
                <button className="sp2-empty-btn" style={{ background: `linear-gradient(135deg,${meta.color}cc,${meta.color})` }} onClick={onAdd}>
                  <Plus size={14} /> Log First Entry
                </button>
              )}
            </div>
          ) : (
            <div className="sp2-log-list">
              {filtered.map((log) => (
                <LogCard
                  key={log.id}
                  log={log}
                  accentColor={meta.color}
                  onEdit={onEdit}
                  onDelete={handleDeleteClick}
                  confirmingId={confirmingId}
                  onConfirmDelete={handleConfirmDelete}
                  onCancelDelete={handleCancelDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'quota' && (
        <div className="sp2-body">
          <QuotaProgress
            sectionId={sectionId}
            logs={logs}
            quotas={quotas}
            onQuotasChange={onQuotasChange}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN
───────────────────────────────────────────── */
export default function DailyReportTracker() {
  const { user } = useAuth();

  const [allLogs,        setAllLogs]        = useState([]);
  const [quotasBySection,setQuotasBySection] = useState({});
  const [loading,        setLoading]        = useState(true);
  const [dbError,        setDbError]        = useState(null);
  const [activeSection,  setActiveSection]  = useState(SECTIONS[0].id);
  const [showModal,      setShowModal]      = useState(false);
  const [editingLog,     setEditingLog]     = useState(null);

  /* ── Seed default quotas for a section if none exist ── */
  const seedDefaultQuotas = useCallback(async (sectionId) => {
    const defaults = DEFAULT_QUOTAS[sectionId] ?? [];
    if (defaults.length === 0) return [];

    const rows = defaults.map((d) => ({
      user_id:         user.id,
      section_name:    sectionId,
      task_name:       d.procedure,
      target_count:    d.required,
      completed_count: 0,
    }));

    const { data, error } = await supabase
      .from('quotas')
      .insert(rows)
      .select();

    if (error) {
      console.error('Failed to seed quotas:', error.message);
      return [];
    }
    return data ?? [];
  }, [user.id]);

  /* ── Fetch everything ── */
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      // Fetch logs
      const { data: logsData, error: logsError } = await supabase
        .from('daily_reports')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false });

      if (logsError) {
        if (isMissingTableError(logsError)) {
          setDbError('The daily_reports table is missing. Run supabase/schema.sql in your project.');
        } else {
          console.error(logsError);
        }
        setLoading(false);
        return;
      }
      setAllLogs(logsData || []);

      // Fetch quotas
      const { data: quotasData, error: quotasError } = await supabase
        .from('quotas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (quotasError && !isMissingTableError(quotasError)) {
        console.error(quotasError);
      }

      const existingQuotas = quotasData ?? [];

      // Group by section
      const grouped = {};
      SECTIONS.forEach((s) => { grouped[s.id] = []; });
      existingQuotas.forEach((q) => {
        if (grouped[q.section_name]) grouped[q.section_name].push(q);
      });

      // Seed sections that have no quotas yet
      const seedPromises = SECTIONS.map(async (sec) => {
        if (grouped[sec.id].length === 0) {
          const seeded = await seedDefaultQuotas(sec.id);
          grouped[sec.id] = seeded;
        }
      });
      await Promise.all(seedPromises);

      setQuotasBySection({ ...grouped });
      setDbError(null);
      setLoading(false);
    };

    fetchAll();
  }, [user.id, seedDefaultQuotas]);

  const sectionLogs = useMemo(
    () => allLogs.filter((l) => l.section_name === activeSection),
    [allLogs, activeSection]
  );

  const activeQuotas = quotasBySection[activeSection] ?? [];

  const handleSaved = useCallback((saved, isEdit) => {
    if (isEdit) {
      setAllLogs((prev) => prev.map((l) => (l.id === saved.id ? saved : l)));
    } else {
      setAllLogs((prev) => [saved, ...prev]);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    await supabase.from('daily_reports').delete().eq('id', id);
    setAllLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleQuotasChange = useCallback((sectionId, newQuotas) => {
    setQuotasBySection((prev) => ({ ...prev, [sectionId]: newQuotas }));
  }, []);

  const openAdd = () => { setEditingLog(null); setShowModal(true); };
  const openEdit = (log) => { setEditingLog(log); setShowModal(true); };

  return (
    <>
      <style>{`
        /* ── Page ── */
        .qtr-page { width: 100%; font-family: 'Poppins', sans-serif; }
        .qtr-title { font-size: 2rem; font-weight: 700; color: #ff5d8f; margin-bottom: 4px; }
        .qtr-sub { color: #888; font-size: 0.92rem; margin-bottom: 28px; line-height: 1.6; }

        /* ── Error ── */
        .qtr-error {
          background: #fff0f0; color: #c0392b;
          border: 1px solid #ffd0d0;
          border-radius: 18px; padding: 18px 22px;
          font-size: 14px; margin-bottom: 24px;
          display: flex; align-items: flex-start; gap: 10px;
        }

        /* ── Summary ── */
        .qt-summary { margin-bottom: 28px; }
        .qt-grand-card {
          background: rgba(255,255,255,0.9);
          border-radius: 24px; padding: 22px 26px;
          border: 1px solid #ffe0ea;
          box-shadow: 0 8px 28px rgba(255,111,145,0.08);
          display: flex; align-items: center;
          justify-content: space-between; gap: 20px;
          margin-bottom: 16px; flex-wrap: wrap;
        }
        .qt-grand-left { display: flex; align-items: center; gap: 18px; }
        .qt-grand-ring { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
        .qt-grand-pct {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 15px; font-weight: 700; color: #ff5d8f;
        }
        .qt-grand-label { font-size: 15px; font-weight: 700; color: #333; margin: 0 0 4px; }
        .qt-grand-sub { font-size: 12px; color: #999; margin: 0; }
        .qt-grand-chips { display: flex; gap: 10px; flex-wrap: wrap; }
        .qt-grand-chip {
          display: flex; align-items: center; gap: 7px;
          border-radius: 999px; padding: 8px 14px;
          font-size: 12px; font-weight: 600;
        }
        .qt-grand-chip.pink { background: #fff0f4; color: #ff5d8f; border: 1px solid #ffd6e1; }
        .qt-grand-chip.blue { background: #eff4ff; color: #5f8dff; border: 1px solid #c5d9ff; }
        .qt-section-cards {
          display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px;
        }
        .qt-sec-card {
          background: rgba(255,255,255,0.88);
          border-radius: 20px; border: 1.5px solid;
          padding: 14px; cursor: pointer;
          transition: all 0.2s; text-align: left;
          display: flex; flex-direction: column; gap: 8px;
        }
        .qt-sec-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,0.08); }
        .qt-sec-card.active { background: white; }
        .qt-sec-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .qt-sec-name { font-size: 11px; font-weight: 700; line-height: 1.4; }
        .qt-sec-pct  { font-size: 12px; font-weight: 700; white-space: nowrap; }
        .qt-mini-bar-wrap { width: 100%; }
        .qt-mini-bar { height: 6px; background: #f0f0f0; border-radius: 999px; overflow: hidden; }
        .qt-mini-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }
        .qt-sec-meta { display: flex; justify-content: space-between; font-size: 10px; color: #aaa; font-weight: 600; }
        .qt-sec-last { font-size: 10px; color: #ccc; margin: 0; }

        /* ── Quota Progress ── */
        .qp-wrap { padding: 4px 0; }
        .qp-header-row {
          display: flex; align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .qp-header {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; font-weight: 700;
        }
        .qp-add-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; color: white; border-radius: 999px;
          padding: 8px 14px; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
        }
        .qp-add-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .qp-add-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

        .qp-error {
          background: #fde8e8; color: #c0392b;
          border-radius: 12px; padding: 10px 14px;
          font-size: 13px; margin-bottom: 12px;
        }

        .qp-list { display: flex; flex-direction: column; gap: 10px; }

        .qp-empty {
          text-align: center; padding: 28px 0;
          color: #bbb; font-size: 13px;
        }

        /* ── Quota row (display) ── */
        .qp-row {
          background: #fff8fa;
          border: 1.5px solid #ffe0ea;
          border-radius: 16px;
          padding: 12px 14px;
          transition: box-shadow 0.2s;
        }
        .qp-row:hover { box-shadow: 0 3px 12px rgba(255,111,145,0.08); }
        .qp-row.complete { border-color: #b8f0da; background: #f0fdf7; }

        .qp-row-top {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 8px; gap: 8px;
        }
        .qp-proc-name { font-size: 13px; color: #444; font-weight: 600; flex: 1; }
        .qp-row-right {
          display: flex; align-items: center; gap: 6px; flex-shrink: 0; flex-wrap: wrap;
        }
        .qp-log-hint {
          font-size: 10px; color: #bbb; font-weight: 500;
          background: #f5f5f5; padding: 2px 7px; border-radius: 999px;
        }
        .qp-count { font-size: 12px; font-weight: 700; color: #999; }
        .qp-count.done { color: #4abf95; }

        .qp-plus-btn {
          border: 1.5px solid; background: transparent;
          border-radius: 8px; padding: 3px 8px;
          font-size: 11px; font-weight: 700;
          cursor: pointer; transition: 0.15s;
        }
        .qp-plus-btn:hover { opacity: 0.75; transform: scale(1.05); }

        .qp-icon-btn {
          border: none; background: #f0f0f0;
          padding: 6px; border-radius: 8px;
          cursor: pointer; display: flex; align-items: center;
          color: #888; transition: 0.2s;
        }
        .qp-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .qp-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .qp-icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .qp-bar { height: 8px; background: #f3dbe3; border-radius: 999px; overflow: hidden; margin-bottom: 6px; }
        .qp-fill { height: 100%; border-radius: 999px; transition: width 0.4s ease; }

        .qp-row-bottom {
          display: flex; justify-content: space-between;
          align-items: center;
        }
        .qp-pct-label { font-size: 11px; color: #bbb; }
        .qp-source-hint { font-size: 10px; color: #ccc; }

        /* ── Edit row ── */
        .qp-edit-row {
          background: white;
          border: 1.5px solid;
          border-radius: 16px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          box-shadow: 0 4px 16px rgba(255,111,145,0.1);
        }
        .qp-edit-row.new-row {
          order: -1;
        }
        .qp-edit-fields {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .qp-edit-numbers {
          display: flex;
          gap: 12px;
        }
        .qp-num-label {
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #bbb;
          flex: 1;
          align-items: flex-start;
        }
        .qp-num-label svg { color: #ccc; }
        .qp-input {
          border: 1.5px solid #ffd6e1;
          background: #fff8fa;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          transition: 0.2s;
          color: #444;
          font-family: inherit;
          width: 100%;
        }
        .qp-input:focus {
          border-color: #ff8fb1;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }
        .qp-num-input {
          width: 100%;
        }
        .qp-edit-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .qp-save-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; color: white; border-radius: 10px;
          padding: 8px 14px; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
        }
        .qp-save-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .qp-cancel-btn {
          border: none; background: #f0f0f0;
          border-radius: 10px; padding: 8px 10px;
          cursor: pointer; display: flex; align-items: center;
          color: #888; transition: 0.2s;
        }
        .qp-cancel-btn:hover { background: #ffe4ec; color: #ff5d8f; }

        /* ── Section Panel ── */
        .sp2-panel {
          background: rgba(255,255,255,0.88);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 32px rgba(255,111,145,0.07);
          overflow: hidden;
        }
        .sp2-header { padding: 22px 26px 0; border-bottom: 1px solid #ffe8f0; }
        .sp2-header-top {
          display: flex; justify-content: space-between;
          align-items: flex-start; margin-bottom: 16px;
        }
        .sp2-header-sub { margin: 4px 0 0; color: #999; font-size: 13px; }
        .sp2-add-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; color: white; border-radius: 999px;
          padding: 10px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .sp2-add-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.25); }
        .sp2-tabs { display: flex; gap: 0; }
        .sp2-tab {
          padding: 12px 18px; border: none;
          border-bottom: 2.5px solid transparent;
          background: transparent; color: #999;
          font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .sp2-tab:hover { color: #ff5d8f; }
        .sp2-body { padding: 22px 26px; }

        /* ── Filter row ── */
        .sp2-filter-row {
          display: flex; align-items: center; gap: 7px;
          flex-wrap: wrap; margin-bottom: 16px;
        }
        .sp2-filter-label { font-size: 11px; font-weight: 600; color: #ccc; display: flex; align-items: center; gap: 4px; }
        .sp2-fpill {
          padding: 5px 12px; border-radius: 999px;
          border: 1.5px solid; background: transparent;
          font-size: 11px; font-weight: 600; cursor: pointer; transition: 0.15s;
        }
        .sp2-log-list { display: flex; flex-direction: column; gap: 10px; }

        /* ── Log card ── */
        .lc-card {
          background: #fff8fa; border: 1.5px solid #ffe0ea;
          border-left: 4px solid; border-radius: 18px;
          padding: 14px 16px; display: flex; flex-direction: column; gap: 7px;
          transition: box-shadow 0.2s;
        }
        .lc-card:hover { box-shadow: 0 4px 14px rgba(255,111,145,0.1); }
        .lc-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
        .lc-left { display: flex; flex-direction: column; gap: 3px; }
        .lc-date { font-size: 11px; color: #bbb; font-weight: 600; }
        .lc-proc { font-size: 14px; font-weight: 700; color: #333; }
        .lc-right { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; flex-shrink: 0; }
        .lc-count { border-radius: 999px; padding: 4px 10px; font-size: 12px; font-weight: 700; }
        .lc-comp { border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600; }
        .lc-supervisor { margin: 0; font-size: 12px; color: #aaa; }
        .lc-notes {
          margin: 0; font-size: 12px; color: #777;
          font-style: italic; line-height: 1.5;
          border-left: 2px solid #ffe0ea; padding-left: 10px;
        }
        .lc-footer { margin-top: 2px; }
        .lc-actions { display: flex; align-items: center; gap: 6px; }
        .lc-btn {
          border: none; background: #f0f0f0; padding: 6px 8px; border-radius: 9px;
          cursor: pointer; display: flex; align-items: center;
          color: #888; font-size: 12px; font-weight: 600; transition: 0.2s; gap: 4px;
        }
        .lc-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .lc-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .lc-confirm { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #888; }

        /* ── Empty ── */
        .sp2-empty { text-align: center; padding: 36px 0; color: #bbb; font-size: 14px; }
        .sp2-empty p { margin: 0 0 14px; }
        .sp2-empty-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; color: white; border-radius: 999px;
          padding: 10px 18px; font-size: 13px; font-weight: 600; cursor: pointer; margin: 0 auto;
        }

        /* ── Log modal ── */
        .lm-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.22); backdrop-filter: blur(5px);
          z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .lm-modal {
          background: white; border-radius: 28px; padding: 28px; width: 100%; max-width: 520px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2); border: 1px solid #ffe0ea;
          max-height: 90vh; overflow-y: auto;
        }
        .lm-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .lm-title-row { display: flex; align-items: center; gap: 10px; }
        .lm-dot { width: 10px; height: 10px; border-radius: 50%; }
        .lm-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .lm-close {
          border: none; background: #f4f4f4; border-radius: 10px;
          padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s;
        }
        .lm-close:hover { background: #ffe4ec; color: #ff5d8f; }
        .lm-form { display: flex; flex-direction: column; gap: 16px; }
        .lm-row2 { display: flex; gap: 14px; }
        .lm-row2 > * { flex: 1; }
        .lm-label {
          display: flex; flex-direction: column; gap: 7px;
          font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
          color: #aaa; margin: 0;
        }
        .lm-input, .lm-select {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444;
          font-family: inherit; width: 100%;
        }
        .lm-select { appearance: none; cursor: pointer; }
        .lm-input:focus, .lm-select:focus {
          border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }
        .lm-textarea {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444;
          resize: vertical; min-height: 80px; font-family: inherit; line-height: 1.6; width: 100%;
        }
        .lm-textarea:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .lm-toggle-custom {
          background: none; border: none; color: #ff8fb1; font-size: 12px; font-weight: 600;
          cursor: pointer; padding: 6px 0 0; display: inline-block;
        }
        .lm-toggle-custom:hover { color: #ff5d8f; }
        .lm-comp-pills { display: flex; flex-wrap: wrap; gap: 8px; }
        .lm-comp-pill {
          padding: 7px 13px; border-radius: 999px; border: 1.5px solid; background: transparent;
          font-size: 12px; font-weight: 600; cursor: pointer; transition: 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .lm-error { background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0; }
        .lm-actions { display: flex; gap: 10px; padding-top: 4px; }
        .lm-primary {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 11px 20px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
        }
        .lm-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .lm-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .lm-secondary {
          border: none; background: #f4f4f4; color: #666; border-radius: 999px;
          padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .qt-section-cards { grid-template-columns: repeat(2,1fr); }
          .qtr-title { font-size: 1.7rem; }
          .sp2-body { padding: 18px; }
          .sp2-header { padding: 18px 18px 0; }
          .lm-modal { padding: 20px; }
          .lm-row2 { flex-direction: column; }
          .qt-grand-card { flex-direction: column; align-items: flex-start; }
          .qp-edit-numbers { flex-direction: column; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .qt-section-cards { grid-template-columns: repeat(3,1fr); }
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
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#ccc', fontSize: 14 }}>
            Loading your logbook…
          </div>
        ) : (
          <>
            <SummaryDashboard
              allLogs={allLogs}
              quotasBySection={quotasBySection}
              activeSection={activeSection}
              onSelectSection={setActiveSection}
            />

            <SectionPanel
              sectionId={activeSection}
              logs={sectionLogs}
              quotas={activeQuotas}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={handleDelete}
              onQuotasChange={(newQuotas) => handleQuotasChange(activeSection, newQuotas)}
            />
          </>
        )}
      </div>

      {showModal && (
        <LogModal
          sectionId={activeSection}
          editing={editingLog}
          quotas={activeQuotas}
          onClose={() => { setShowModal(false); setEditingLog(null); }}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}