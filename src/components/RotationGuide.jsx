import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  Plus, Edit3, Trash2, ChevronDown, ChevronUp,
  Search, FlaskConical, Droplets, Microscope,
  Heart, BookOpen, X, AlertTriangle, CheckCircle2,
  Calendar, MapPin, User, Clock, ChevronRight,
  Layers, Shield, Target, RotateCcw,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   SECTION METADATA
───────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'Hematology', label: 'Hematology', icon: Droplets,
    color: '#ff6f91', bg: 'linear-gradient(135deg,#ff8fb1,#ff6f91)',
    overview: 'Study of blood, blood-forming organs, and blood diseases. Covers CBC, peripheral blood smears, coagulation studies, and bone marrow analysis.',
    objectives: ['Perform manual and automated CBC','Prepare and read peripheral blood smears','Conduct coagulation tests (PT, APTT)','Identify normal and abnormal blood cells'],
    safety: [
      { icon: '🧤', text: 'Wear gloves at all times when handling blood specimens' },
      { icon: '⚠️', text: 'Treat all blood as potentially infectious (Universal Precautions)' },
      { icon: '🗑️', text: 'Dispose of sharps immediately in designated sharps containers' },
      { icon: '🧴', text: 'Decontaminate surfaces with 10% bleach after any spill' },
      { icon: '🏷️', text: 'Label specimens immediately after collection — never rely on memory' },
      { icon: '⚖️', text: 'Always balance the centrifuge with opposite tubes before spinning' },
    ],
  },
  {
    id: 'Clinical Chemistry', label: 'Clin. Chemistry', icon: FlaskConical,
    color: '#ff9f5a', bg: 'linear-gradient(135deg,#ffb37a,#ff8c5a)',
    overview: 'Quantitative analysis of body fluids to assess organ function. Includes liver enzymes, kidney panels, glucose, lipid profiles, and electrolytes.',
    objectives: ['Operate automated chemistry analyzers','Perform quality control procedures','Interpret liver, kidney, and metabolic panels','Conduct urinalysis and special chemistry tests'],
    safety: [
      { icon: '🥽', text: 'Wear goggles, gloves, and lab coat when handling reagents' },
      { icon: '🚫', text: 'Never pipette by mouth under any circumstances' },
      { icon: '♻️', text: 'Segregate and dispose of chemical waste in designated containers' },
      { icon: '🚿', text: 'Know the location of eyewash stations and emergency showers' },
      { icon: '🌬️', text: 'Handle concentrated acids and bases only inside a fume hood' },
      { icon: '📅', text: 'Check reagent expiration dates before every use' },
    ],
  },
  {
    id: 'Microbiology', label: 'Microbiology', icon: Microscope,
    color: '#7ab6ff', bg: 'linear-gradient(135deg,#7ab6ff,#5f8dff)',
    overview: 'Identification of pathogenic microorganisms from clinical specimens. Covers culture, sensitivity testing, Gram staining, and identification of bacteria, fungi, and parasites.',
    objectives: ['Perform Gram staining and interpret results','Inoculate culture media and identify colonies','Conduct antibiotic sensitivity testing (AST)','Identify common pathogens from various specimens'],
    safety: [
      { icon: '🗄️', text: 'Perform aerosol-generating procedures only inside a biosafety cabinet' },
      { icon: '🔥', text: 'Autoclave all cultures and contaminated materials before disposal' },
      { icon: '🔒', text: 'Never leave active cultures unattended, unsecured, or unlabeled' },
      { icon: '😷', text: 'Wear N95 mask when processing respiratory specimens' },
      { icon: '🌡️', text: 'Flame inoculating loops before AND after each use' },
      { icon: '📢', text: 'Report all accidental exposures or spills immediately to supervisor' },
    ],
  },
  {
    id: 'Blood Bank', label: 'Blood Bank', icon: Heart,
    color: '#ff6f6f', bg: 'linear-gradient(135deg,#ff8f8f,#ff6060)',
    overview: 'Blood typing, compatibility testing, and blood product management. Ensures safe transfusion practices through rigorous crossmatching, donor screening, and component preparation.',
    objectives: ['Perform ABO and Rh blood typing','Conduct compatibility crossmatching','Prepare blood components (PRBCs, FFP, Platelets)','Manage blood product inventory and issue records'],
    safety: [
      { icon: '🪪', text: 'Verify patient ID and blood type with two staff members before any release' },
      { icon: '🌡️', text: 'Store RBCs at 2–6°C; never allow temperature excursions' },
      { icon: '✅', text: 'Complete full crossmatch before releasing blood products — no shortcuts' },
      { icon: '🧤', text: 'Handle all blood products as potentially infectious' },
      { icon: '📝', text: 'Document all discrepancies immediately, no matter how minor' },
      { icon: '👥', text: 'Two-person verification is mandatory for all critical transfusion steps' },
    ],
  },
  {
    id: 'Histopathology/Cytology', label: 'Histo/Cyto', icon: BookOpen,
    color: '#6dd6b1', bg: 'linear-gradient(135deg,#6dd6b1,#4abf95)',
    overview: 'Microscopic examination of tissues and cells for disease diagnosis. Covers tissue processing, microtomy, H&E staining, special stains, and cytological preparations.',
    objectives: ['Embed and section tissue using microtome','Perform Hematoxylin & Eosin (H&E) staining','Prepare Pap smears and cytological specimens','Identify histological features of normal and diseased tissue'],
    safety: [
      { icon: '🌬️', text: 'Always use a fume hood when working with formalin or xylene — both are toxic' },
      { icon: '🧤', text: 'Use chemical-resistant nitrile gloves when handling fixatives' },
      { icon: '🔪', text: 'Change microtome blades using a blade holder — never touch directly' },
      { icon: '☠️', text: 'Formalin is a known carcinogen; minimize exposure and wear respiratory protection' },
      { icon: '🏷️', text: 'Label every cassette and slide immediately — mix-ups have serious diagnostic consequences' },
      { icon: '🗑️', text: 'Dispose of xylene and formalin waste in labeled chemical waste containers only' },
    ],
  },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getRotationStatus(rotation) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(rotation.start_date + 'T00:00:00');
  const end   = new Date(rotation.end_date   + 'T00:00:00');
  if (today >= start && today <= end) return 'active';
  if (today < start)                  return 'upcoming';
  return 'completed';
}

function getDaysLeft(endDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const end   = new Date(endDate + 'T00:00:00');
  return Math.ceil((end - today) / 86400000);
}

function getDaysUntil(startDate) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(startDate + 'T00:00:00');
  return Math.ceil((start - today) / 86400000);
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function getDuration(start, end) {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end   + 'T00:00:00');
  const days = Math.ceil((e - s) / 86400000) + 1;
  if (days >= 7) return `${Math.round(days / 7)} week${Math.round(days / 7) !== 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

/* ─────────────────────────────────────────────
   ROTATION MODAL
───────────────────────────────────────────── */
function RotationModal({ editing, existingRotations, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name:    editing?.section_name    ?? '',
    hospital_site:   editing?.hospital_site   ?? '',
    start_date:      editing?.start_date      ?? '',
    end_date:        editing?.end_date        ?? '',
    supervisor_name: editing?.supervisor_name ?? '',
    notes:           editing?.notes           ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (new Date(form.start_date) >= new Date(form.end_date)) {
      setError('End date must be after start date.'); return;
    }

    // Check for active overlap — only one active rotation allowed
    const newStart = new Date(form.start_date + 'T00:00:00');
    const newEnd   = new Date(form.end_date   + 'T00:00:00');

    const overlaps = existingRotations.filter((r) => {
      if (editing && r.id === editing.id) return false;
      const rStart = new Date(r.start_date + 'T00:00:00');
      const rEnd   = new Date(r.end_date   + 'T00:00:00');
      return newStart <= rEnd && newEnd >= rStart;
    });

    if (overlaps.length > 0) {
      const o = overlaps[0];
      setError(`Date range overlaps with your "${o.section_name}" rotation (${formatDate(o.start_date)} – ${formatDate(o.end_date)}). Only one active rotation is allowed at a time.`);
      return;
    }

    setSaving(true);
    let result;
    if (editing) {
      result = await supabase.from('rotations').update({ ...form }).eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('rotations').insert([{ ...form, user_id: user.id }]).select().single();
    }
    setSaving(false);

    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  const sectionOptions = SECTIONS.map((s) => s.id);

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <h3>{editing ? 'Edit Rotation' : 'Add Rotation'}</h3>
          <button className="rm-close" onClick={onClose}><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="rm-form">
          <label className="rm-label">
            Section *
            <select className="rm-input rm-select" value={form.section_name}
              onChange={(e) => setForm({ ...form, section_name: e.target.value })} required>
              <option value="">Select a section…</option>
              {sectionOptions.map((s) => <option key={s}>{s}</option>)}
              <option value="__custom__">Other / Custom</option>
            </select>
            {form.section_name === '__custom__' && (
              <input className="rm-input" style={{ marginTop: 8 }}
                placeholder="Type section name…"
                onChange={(e) => setForm({ ...form, section_name: e.target.value })} />
            )}
          </label>

          <label className="rm-label">
            Hospital / Site
            <input className="rm-input" value={form.hospital_site}
              onChange={(e) => setForm({ ...form, hospital_site: e.target.value })}
              placeholder="e.g. Perpetual Help Medical Center" />
          </label>

          <div className="rm-row2">
            <label className="rm-label">
              Start Date *
              <input type="date" className="rm-input" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </label>
            <label className="rm-label">
              End Date *
              <input type="date" className="rm-input" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </label>
          </div>

          {form.start_date && form.end_date && new Date(form.start_date) < new Date(form.end_date) && (
            <div className="rm-duration-preview">
              <Clock size={13} /> Duration: <strong>{getDuration(form.start_date, form.end_date)}</strong>
            </div>
          )}

          <label className="rm-label">
            Supervisor
            <input className="rm-input" value={form.supervisor_name}
              onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })}
              placeholder="e.g. Dr. Santos, RMT" />
          </label>

          <label className="rm-label">
            Notes
            <textarea className="rm-textarea" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any reminders or details…" />
          </label>

          {error && (
            <div className="rm-error">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="rm-actions">
            <button type="submit" className="rm-primary" disabled={saving}>
              <CheckCircle2 size={15} />
              {saving ? 'Saving…' : editing ? 'Update Rotation' : 'Add Rotation'}
            </button>
            <button type="button" className="rm-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATION CARD
───────────────────────────────────────────── */
function RotationCard({ rotation, onEdit, onDelete }) {
  const status   = getRotationStatus(rotation);
  const daysLeft = getDaysLeft(rotation.end_date);
  const daysUntil = getDaysUntil(rotation.start_date);
  const duration  = getDuration(rotation.start_date, rotation.end_date);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const sectionMeta = SECTIONS.find((s) => s.id === rotation.section_name);

  const statusConfig = {
    active:    { label: 'Active Now',  dot: '#4abf95', badge: 'rc-badge-active',    glow: true  },
    upcoming:  { label: 'Upcoming',    dot: '#5f8dff', badge: 'rc-badge-upcoming',  glow: false },
    completed: { label: 'Completed',   dot: '#bbb',    badge: 'rc-badge-completed', glow: false },
  };
  const sc = statusConfig[status];

  // progress % for active
  const progressPct = useMemo(() => {
    if (status !== 'active') return null;
    const start = new Date(rotation.start_date + 'T00:00:00');
    const end   = new Date(rotation.end_date   + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const total = (end - start) / 86400000;
    const done  = (today - start) / 86400000;
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }, [rotation, status]);

  return (
    <div className={`rc-card ${status}`}>
      {/* Accent bar */}
      <div className="rc-accent-bar" style={{
        background: sectionMeta
          ? sectionMeta.bg
          : 'linear-gradient(90deg,#ff8fb1,#ff6f91)',
      }} />

      {/* Top row */}
      <div className="rc-top">
        <div className={`rc-badge ${sc.badge}`}>
          <span className="rc-badge-dot" style={{ background: sc.dot }} />
          {sc.label}
          {status === 'active' && <span className="rc-pulse" />}
        </div>
        <div className="rc-card-actions">
          <button className="rc-icon-btn" onClick={() => onEdit(rotation)} title="Edit">
            <Edit3 size={13} />
          </button>
          {confirmDelete ? (
            <div className="rc-confirm">
              <span>Delete?</span>
              <button className="rc-icon-btn danger" onClick={() => onDelete(rotation.id)}>Yes</button>
              <button className="rc-icon-btn" onClick={() => setConfirmDelete(false)}>No</button>
            </div>
          ) : (
            <button className="rc-icon-btn danger" onClick={() => setConfirmDelete(true)} title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Section name */}
      <h4 className="rc-section-name" style={{ color: sectionMeta?.color ?? '#ff5d8f' }}>
        {rotation.section_name}
      </h4>

      {/* Info rows */}
      <div className="rc-info">
        {rotation.hospital_site && (
          <div className="rc-info-row">
            <MapPin size={13} className="rc-info-icon" />
            <span>{rotation.hospital_site}</span>
          </div>
        )}
        <div className="rc-info-row">
          <Calendar size={13} className="rc-info-icon" />
          <span>{formatDate(rotation.start_date)} – {formatDate(rotation.end_date)}</span>
          <span className="rc-duration-chip">{duration}</span>
        </div>
        {rotation.supervisor_name && (
          <div className="rc-info-row">
            <User size={13} className="rc-info-icon" />
            <span>{rotation.supervisor_name}</span>
          </div>
        )}
      </div>

      {/* Active progress bar */}
      {status === 'active' && progressPct !== null && (
        <div className="rc-progress-wrap">
          <div className="rc-progress-top">
            <span>Rotation Progress</span>
            <span>{progressPct}%</span>
          </div>
          <div className="rc-progress-bar">
            <div className="rc-progress-fill"
              style={{
                width: `${progressPct}%`,
                background: sectionMeta ? sectionMeta.bg : 'linear-gradient(90deg,#ff8fb1,#ff6f91)',
              }} />
          </div>
          <p className="rc-days-left">
            {daysLeft === 0 ? '🎉 Last day of this rotation!' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
      )}

      {/* Upcoming countdown */}
      {status === 'upcoming' && (
        <div className="rc-upcoming-chip">
          <Clock size={12} />
          Starts in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
        </div>
      )}

      {/* Notes */}
      {rotation.notes && (
        <p className="rc-notes">📝 {rotation.notes}</p>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATIONS TAB
───────────────────────────────────────────── */
function RotationsTab() {
  const { user } = useAuth();
  const [rotations, setRotations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const fetchRotations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rotations').select('*').eq('user_id', user.id)
      .order('start_date', { ascending: true });
    if (!error) setRotations(data ?? []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchRotations(); }, [fetchRotations]);

  const handleSaved = (saved, isEdit) => {
    setRotations((prev) => isEdit
      ? prev.map((r) => r.id === saved.id ? saved : r)
      : [...prev, saved].sort((a,b) => a.start_date.localeCompare(b.start_date)));
  };

  const handleDelete = async (id) => {
    await supabase.from('rotations').delete().eq('id', id);
    setRotations((prev) => prev.filter((r) => r.id !== id));
  };

  const active    = rotations.filter((r) => getRotationStatus(r) === 'active');
  const upcoming  = rotations.filter((r) => getRotationStatus(r) === 'upcoming');
  const completed = rotations.filter((r) => getRotationStatus(r) === 'completed');

  return (
    <div className="rt-wrap">
      {/* Header */}
      <div className="rt-header">
        <div>
          <p className="rt-desc">Manage your rotation schedule. Only one rotation can be active at a time.</p>
        </div>
        <button className="rg-primary-btn" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={15} /> Add Rotation
        </button>
      </div>

      {loading ? (
        <div className="rg-empty">Loading rotations…</div>
      ) : rotations.length === 0 ? (
        <div className="rg-empty">
          <div className="rg-empty-icon">🏥</div>
          <p>No rotations yet — add your first one!</p>
          <button className="rg-primary-btn" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={15} /> Add Rotation
          </button>
        </div>
      ) : (
        <div className="rt-sections">
          {active.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label active-label">
                <span className="rt-group-dot active-dot" />
                Active Rotation
              </div>
              <div className="rt-cards-grid">
                {active.map((r) => (
                  <RotationCard key={r.id} rotation={r}
                    onEdit={(rot) => { setEditing(rot); setShowModal(true); }}
                    onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{ background: '#5f8dff' }} />
                Upcoming ({upcoming.length})
              </div>
              <div className="rt-cards-grid">
                {upcoming.map((r) => (
                  <RotationCard key={r.id} rotation={r}
                    onEdit={(rot) => { setEditing(rot); setShowModal(true); }}
                    onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{ background: '#bbb' }} />
                Completed ({completed.length})
              </div>
              <div className="rt-cards-grid">
                {completed.map((r) => (
                  <RotationCard key={r.id} rotation={r}
                    onEdit={(rot) => { setEditing(rot); setShowModal(true); }}
                    onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <RotationModal
          editing={editing}
          existingRotations={rotations}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCEDURE MODAL
───────────────────────────────────────────── */
function ProcedureModal({ section, editing, onClose, onSaved }) {
  const [form, setForm] = useState({
    procedure_name: editing?.procedure_name ?? '',
    description:    editing?.description    ?? '',
    safety_notes:   editing?.safety_notes   ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    let result;
    if (editing) {
      result = await supabase.from('procedures').update({ ...form }).eq('id', editing.id).select().single();
    } else {
      result = await supabase.from('procedures').insert([{ ...form, section_name: section }]).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <h3>{editing ? 'Edit Procedure' : 'Add Procedure'}</h3>
          <button className="rm-close" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="rm-form">
          <label className="rm-label">
            Procedure Name *
            <input className="rm-input" value={form.procedure_name}
              onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}
              placeholder="e.g. Complete Blood Count" required />
          </label>
          <label className="rm-label">
            Description
            <textarea className="rm-textarea" rows={3} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Steps, purpose, expected values…" />
          </label>
          <label className="rm-label">
            Safety Notes
            <textarea className="rm-textarea" rows={2} value={form.safety_notes}
              onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
              placeholder="PPE required, hazards, special handling…" />
          </label>
          {error && <div className="rm-error"><AlertTriangle size={14} /><span>{error}</span></div>}
          <div className="rm-actions">
            <button type="submit" className="rm-primary" disabled={saving}>
              <CheckCircle2 size={15} />
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Procedure'}
            </button>
            <button type="button" className="rm-secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCEDURE CARD
───────────────────────────────────────────── */
function ProcedureCard({ procedure, accentColor, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = procedure.description || procedure.safety_notes;
  return (
    <div className={`proc-card ${expanded ? 'expanded' : ''}`}>
      <div className="proc-top">
        <div className="proc-name-row">
          <span className="proc-dot" style={{ background: accentColor }} />
          <strong>{procedure.procedure_name}</strong>
        </div>
        <div className="proc-controls">
          {hasDetails && (
            <button className="icon-btn expand-btn" onClick={() => setExpanded((v) => !v)}>
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          <button className="icon-btn" onClick={() => onEdit(procedure)}><Edit3 size={14} /></button>
          <button className="icon-btn danger" onClick={() => onDelete(procedure.id)}><Trash2 size={14} /></button>
        </div>
      </div>
      {expanded && hasDetails && (
        <div className="proc-details">
          {procedure.description && (
            <div className="proc-detail-block">
              <span className="detail-label">Description</span>
              <p>{procedure.description}</p>
            </div>
          )}
          {procedure.safety_notes && (
            <div className="proc-detail-block safety-block">
              <span className="detail-label"><AlertTriangle size={12} style={{ display:'inline',marginRight:4 }} />Safety Notes</span>
              <p>{procedure.safety_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION PANEL  (procedures tab)
───────────────────────────────────────────── */
function SectionPanel({ meta }) {
  const [procedures, setProcedures] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [editingProc,setEditingProc]= useState(null);
  const [activeTab,  setActiveTab]  = useState('procedures');

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('procedures').select('*')
      .eq('section_name', meta.id).order('created_at', { ascending: true });
    if (!error) setProcedures(data ?? []);
    setLoading(false);
  }, [meta.id]);

  useEffect(() => { fetchProcedures(); }, [fetchProcedures]);

  const handleSaved = (saved, isEdit) => {
    setProcedures((prev) => isEdit ? prev.map((p) => p.id === saved.id ? saved : p) : [...prev, saved]);
  };

  const handleDelete = async (id) => {
    await supabase.from('procedures').delete().eq('id', id);
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = procedures.filter((p) =>
    p.procedure_name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const Icon = meta.icon;

  return (
    <div className="section-panel">
      <div className="panel-header" style={{ background: meta.bg }}>
        <div className="panel-icon-wrap"><Icon size={22} color="white" /></div>
        <div>
          <h3>{meta.id}</h3>
          <p>{meta.overview}</p>
        </div>
      </div>

      <div className="sub-tabs">
        {[
          { id: 'procedures', label: `Procedures (${procedures.length})`, icon: <Layers size={13} /> },
          { id: 'safety',     label: 'Safety',                            icon: <Shield size={13} /> },
          { id: 'overview',   label: 'Objectives',                        icon: <Target size={13} /> },
        ].map((t) => (
          <button key={t.id}
            className={`sub-tab ${activeTab === t.id ? 'active' : ''}`}
            style={activeTab === t.id ? { borderBottomColor: meta.color, color: meta.color } : {}}
            onClick={() => setActiveTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'procedures' && (
        <div className="tab-body">
          <div className="proc-toolbar">
            <div className="search-wrap">
              <Search size={14} className="search-icon" />
              <input className="search-input" placeholder="Search procedures…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
              {search && <button className="search-clear" onClick={() => setSearch('')}><X size={12} /></button>}
            </div>
            <button className="rg-primary-btn small"
              onClick={() => { setEditingProc(null); setShowModal(true); }}>
              <Plus size={15} /> Add
            </button>
          </div>
          {loading ? <div className="rg-empty"><p>Loading…</p></div>
            : filtered.length === 0 ? (
              <div className="rg-empty">
                <p>{search ? `No match for "${search}"` : 'No procedures yet ✨'}</p>
              </div>
            ) : (
              <div className="proc-list">
                {filtered.map((proc) => (
                  <ProcedureCard key={proc.id} procedure={proc} accentColor={meta.color}
                    onEdit={(p) => { setEditingProc(p); setShowModal(true); }}
                    onDelete={handleDelete} />
                ))}
              </div>
            )}
        </div>
      )}

      {activeTab === 'safety' && (
        <div className="tab-body">
          <div className="safety-grid">
            {meta.safety.map((item, i) => (
              <div key={i} className="safety-card">
                <span className="safety-emoji">{item.icon}</span>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="tab-body">
          <ul className="objective-list">
            {meta.objectives.map((obj, i) => (
              <li key={i} className="objective-item">
                <span className="obj-num" style={{ background: meta.bg }}>{i + 1}</span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showModal && (
        <ProcedureModal section={meta.id} editing={editingProc}
          onClose={() => { setShowModal(false); setEditingProc(null); }}
          onSaved={handleSaved} />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCEDURES TAB
───────────────────────────────────────────── */
function ProceduresTab() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const activeMeta = SECTIONS.find((s) => s.id === activeSection);

  return (
    <div>
      <div className="section-tabs">
        {SECTIONS.map((s) => {
          const SIcon = s.icon;
          const isActive = activeSection === s.id;
          return (
            <button key={s.id}
              className={`section-tab ${isActive ? 'active' : ''}`}
              style={isActive ? { background: s.bg } : {}}
              onClick={() => setActiveSection(s.id)}>
              <SIcon size={15} /> {s.label}
            </button>
          );
        })}
      </div>
      {activeMeta && <SectionPanel key={activeMeta.id} meta={activeMeta} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN
───────────────────────────────────────────── */
export default function RotationGuide() {
  const [mainTab, setMainTab] = useState('rotations');

  return (
    <>
      <style>{`
        /* ── Page ── */
        .rg-page { width: 100%; }
        .rg-title { font-size: 2rem; font-weight: 700; color: #ff5d8f; margin-bottom: 6px; }
        .rg-subtitle { color: #888; margin-bottom: 24px; font-size: 0.95rem; }

        /* ── Main tab bar ── */
        .rg-main-tabs {
          display: flex; gap: 0;
          background: rgba(255,255,255,0.85);
          border-radius: 20px; padding: 5px;
          border: 1px solid #ffe0ea;
          box-shadow: 0 4px 16px rgba(255,111,145,0.08);
          margin-bottom: 28px;
          width: fit-content;
        }
        .rg-main-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 11px 22px; border-radius: 15px; border: none;
          background: transparent; color: #999;
          font-size: 14px; font-weight: 600; cursor: pointer;
          transition: all 0.2s; white-space: nowrap;
        }
        .rg-main-tab:hover { color: #ff5d8f; }
        .rg-main-tab.active {
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white;
          box-shadow: 0 4px 14px rgba(255,111,145,0.28);
        }

        /* ── Rotations tab ── */
        .rt-wrap { width: 100%; }
        .rt-header {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 16px;
          margin-bottom: 24px; flex-wrap: wrap;
        }
        .rt-desc { margin: 0; color: #888; font-size: 13px; line-height: 1.6; max-width: 480px; }
        .rt-sections { display: flex; flex-direction: column; gap: 28px; }
        .rt-group {}
        .rt-group-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #aaa; margin-bottom: 12px;
        }
        .active-label { color: #4abf95; }
        .rt-group-dot {
          width: 8px; height: 8px; border-radius: 50%;
        }
        .active-dot { background: #4abf95; box-shadow: 0 0 0 3px rgba(74,191,149,0.25); }
        .rt-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        /* ── Rotation Card ── */
        .rc-card {
          background: white; border-radius: 22px;
          border: 1.5px solid #ffe0ea;
          overflow: hidden; position: relative;
          transition: all 0.22s ease;
          display: flex; flex-direction: column; gap: 0;
        }
        .rc-card:hover {
          border-color: #ffb8ce;
          box-shadow: 0 10px 32px rgba(255,111,145,0.13);
          transform: translateY(-2px);
        }
        .rc-card.active {
          border-color: #ff8fb1;
          box-shadow: 0 8px 28px rgba(255,111,145,0.18);
        }
        .rc-card.completed { opacity: 0.75; }
        .rc-card.completed:hover { opacity: 1; }

        .rc-accent-bar { height: 4px; width: 100%; flex-shrink: 0; }

        .rc-top {
          display: flex; align-items: center;
          justify-content: space-between; gap: 10px;
          padding: 14px 16px 8px;
        }
        .rc-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 11px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          position: relative;
        }
        .rc-badge-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .rc-pulse {
          position: absolute; right: -2px; top: -2px;
          width: 10px; height: 10px; border-radius: 50%;
          background: #4abf95; opacity: 0.6;
          animation: pulse-ring 1.8s ease infinite;
        }
        @keyframes pulse-ring {
          0%   { transform: scale(1); opacity: 0.6; }
          70%  { transform: scale(2); opacity: 0; }
          100% { transform: scale(1); opacity: 0; }
        }
        .rc-badge-active   { background: #edfaf4; color: #2e9e6e; }
        .rc-badge-upcoming { background: #eff4ff; color: #3d6fcc; }
        .rc-badge-completed{ background: #f5f5f5; color: #888; }

        .rc-card-actions { display: flex; gap: 5px; align-items: center; }
        .rc-icon-btn {
          border: none; background: #f4f4f4; padding: 6px; border-radius: 9px;
          cursor: pointer; display: flex; align-items: center; color: #888;
          transition: 0.2s; font-size: 12px; font-weight: 600; gap: 4px;
        }
        .rc-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .rc-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .rc-confirm { display: flex; align-items: center; gap: 5px; font-size: 11px; color: #888; }

        .rc-section-name {
          margin: 0; padding: 0 16px 10px;
          font-size: 17px; font-weight: 800;
          line-height: 1.3;
        }

        .rc-info {
          padding: 0 16px 14px;
          display: flex; flex-direction: column; gap: 7px;
        }
        .rc-info-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #666;
        }
        .rc-info-icon { color: #ffb8ce; flex-shrink: 0; }
        .rc-duration-chip {
          margin-left: auto;
          background: #fff0f4; color: #ff6f91;
          padding: 2px 9px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          white-space: nowrap;
        }

        .rc-progress-wrap {
          padding: 12px 16px 14px;
          border-top: 1px solid #fff0f4;
          background: linear-gradient(135deg,rgba(255,143,177,0.04),rgba(255,111,145,0.02));
        }
        .rc-progress-top {
          display: flex; justify-content: space-between;
          font-size: 11px; font-weight: 700; color: #bbb;
          margin-bottom: 6px;
        }
        .rc-progress-bar {
          height: 7px; background: #ffe8f0; border-radius: 999px; overflow: hidden;
          margin-bottom: 8px;
        }
        .rc-progress-fill {
          height: 100%; border-radius: 999px; transition: width 0.5s ease;
        }
        .rc-days-left {
          margin: 0; font-size: 12px; font-weight: 600; color: #ff6f91;
          text-align: center;
        }

        .rc-upcoming-chip {
          margin: 0 16px 14px;
          display: inline-flex; align-items: center; gap: 6px;
          background: #eff4ff; color: #5f8dff;
          border-radius: 999px; padding: 6px 12px;
          font-size: 12px; font-weight: 600;
          border: 1px solid #c5d9ff;
        }

        .rc-notes {
          margin: 0; padding: 10px 16px 14px;
          font-size: 12px; color: #888; line-height: 1.5;
          border-top: 1px dashed #ffe0ea;
        }

        /* ── Shared buttons ── */
        .rg-primary-btn {
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 11px 20px;
          font-weight: 600; font-size: 13px;
          display: inline-flex; align-items: center; gap: 7px;
          cursor: pointer; transition: 0.2s; white-space: nowrap;
        }
        .rg-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,111,145,0.25); }
        .rg-primary-btn.small { padding: 9px 16px; font-size: 13px; }

        /* ── Empty ── */
        .rg-empty {
          text-align: center; padding: 48px 0; color: #bbb; font-size: 14px;
          display: flex; flex-direction: column; align-items: center; gap: 12px;
        }
        .rg-empty-icon { font-size: 40px; }
        .rg-empty p { margin: 0; }

        /* ── Rotation Modal ── */
        .rm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.22);
          backdrop-filter: blur(5px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }
        .rm-modal {
          background: white; border-radius: 28px; padding: 28px;
          width: 100%; max-width: 500px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2);
          border: 1px solid #ffe0ea; max-height: 90vh; overflow-y: auto;
        }
        .rm-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px;
        }
        .rm-header h3 { margin: 0; font-size: 1.1rem; color: #333; }
        .rm-close {
          border: none; background: #f4f4f4; border-radius: 10px;
          padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s;
        }
        .rm-close:hover { background: #ffe4ec; color: #ff5d8f; }
        .rm-form { display: flex; flex-direction: column; gap: 14px; }
        .rm-row2 { display: flex; gap: 12px; }
        .rm-row2 > * { flex: 1; }
        .rm-label {
          display: flex; flex-direction: column; gap: 6px;
          font-size: 12px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em; color: #aaa;
        }
        .rm-input, .rm-select {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s;
          color: #444; font-family: inherit; width: 100%;
        }
        .rm-select { appearance: none; cursor: pointer; }
        .rm-input:focus, .rm-select:focus {
          border-color: #ff8fb1; background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }
        .rm-textarea {
          border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px;
          padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s;
          color: #444; resize: vertical; font-family: inherit; line-height: 1.6; width: 100%;
        }
        .rm-textarea:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .rm-duration-preview {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 14px; border-radius: 12px;
          background: #fff0f4; color: #ff6f91; font-size: 13px;
          border: 1px solid #ffd6e1;
        }
        .rm-error {
          display: flex; align-items: flex-start; gap: 8px;
          background: #fde8e8; color: #c0392b; border-radius: 12px;
          padding: 11px 14px; font-size: 13px; line-height: 1.5;
        }
        .rm-actions { display: flex; gap: 10px; padding-top: 4px; }
        .rm-primary {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 11px 20px;
          font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .rm-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .rm-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .rm-secondary {
          border: none; background: #f4f4f4; color: #666; border-radius: 999px;
          padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer;
        }

        /* ── Section tabs (procedures page) ── */
        .section-tabs { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px; }
        .section-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 18px; border-radius: 999px;
          border: 1.5px solid #ffd6e1; background: rgba(255,255,255,0.75);
          color: #888; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.2s; white-space: nowrap;
        }
        .section-tab:hover { border-color: #ff8fb1; color: #ff5d8f; background: white; transform: translateY(-1px); }
        .section-tab.active { color: white; border-color: transparent; box-shadow: 0 6px 18px rgba(255,111,145,0.28); transform: translateY(-1px); }

        /* ── Section Panel ── */
        .section-panel {
          background: rgba(255,255,255,0.82); border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 36px rgba(255,111,145,0.09); overflow: hidden;
        }
        .panel-header {
          display: flex; align-items: flex-start; gap: 16px;
          padding: 24px 28px; color: white;
        }
        .panel-header h3 { margin: 0 0 6px; font-size: 1.2rem; }
        .panel-header p  { margin: 0; font-size: 13px; opacity: 0.92; line-height: 1.5; max-width: 600px; }
        .panel-icon-wrap {
          width: 46px; height: 46px; border-radius: 16px;
          background: rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .sub-tabs {
          display: flex; border-bottom: 1px solid #ffe0ea; padding: 0 24px; background: white;
        }
        .sub-tab {
          padding: 13px 16px; border: none; border-bottom: 2.5px solid transparent;
          background: transparent; color: #999; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s; white-space: nowrap;
          display: flex; align-items: center; gap: 6px;
        }
        .sub-tab:hover { color: #ff5d8f; }
        .tab-body { padding: 24px 28px; }

        /* Procedure toolbar */
        .proc-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; }
        .search-wrap { flex: 1; position: relative; display: flex; align-items: center; }
        .search-icon { position: absolute; left: 13px; color: #bbb; pointer-events: none; }
        .search-input {
          width: 100%; border: 1.5px solid #ffd6e1; background: #fff8fa;
          border-radius: 999px; padding: 10px 36px 10px 34px;
          font-size: 14px; outline: none; transition: 0.2s; color: #444;
        }
        .search-input:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .search-clear {
          position: absolute; right: 12px; background: none; border: none;
          color: #bbb; cursor: pointer; padding: 0; display: flex;
        }
        .proc-list { display: flex; flex-direction: column; gap: 10px; }
        .proc-card {
          background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 18px;
          overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s;
        }
        .proc-card:hover { border-color: #ffb8ce; box-shadow: 0 4px 14px rgba(255,111,145,0.1); }
        .proc-card.expanded { border-color: #ff8fb1; }
        .proc-top { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; gap: 10px; }
        .proc-name-row { display: flex; align-items: center; gap: 10px; flex: 1; }
        .proc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .proc-name-row strong { font-size: 14px; color: #444; }
        .proc-controls { display: flex; gap: 6px; align-items: center; }
        .proc-details {
          padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 12px;
          border-top: 1px solid #ffe0ea; margin: 0 16px; margin-bottom: 14px;
        }
        .proc-detail-block p { margin: 4px 0 0; font-size: 13px; color: #666; line-height: 1.55; }
        .detail-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #aaa; }
        .safety-block { background: #fff5e6; padding: 10px 12px; border-radius: 12px; border: 1px solid #ffd6a0; }
        .safety-block .detail-label { color: #cc7a00; }
        .safety-block p { color: #885500; }

        /* Icon buttons */
        .icon-btn {
          border: none; background: #ffe4ec; padding: 7px; border-radius: 10px;
          cursor: pointer; display: flex; align-items: center; color: #ff5d8f; transition: 0.2s;
        }
        .icon-btn:hover { background: #ffd0e0; transform: scale(1.05); }
        .icon-btn.danger { background: #fde8e8; color: #e05555; }
        .icon-btn.danger:hover { background: #fcd0d0; }
        .expand-btn { background: #f0f0f0; color: #888; }
        .expand-btn:hover { background: #e8e8e8; }

        /* Safety + objectives */
        .safety-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; }
        .safety-card { display: flex; gap: 12px; align-items: flex-start; background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 18px; padding: 16px; }
        .safety-emoji { font-size: 20px; flex-shrink: 0; line-height: 1; }
        .safety-card p { margin: 0; font-size: 13px; color: #555; line-height: 1.55; }
        .objective-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 14px; }
        .objective-item { display: flex; align-items: center; gap: 14px; background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 18px; padding: 16px; font-size: 14px; color: #444; line-height: 1.5; }
        .obj-num { width: 30px; height: 30px; border-radius: 50%; color: white; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* Responsive */
        @media (max-width: 768px) {
          .rg-main-tabs { width: 100%; justify-content: center; }
          .rt-cards-grid { grid-template-columns: 1fr; }
          .rt-header { flex-direction: column; }
          .section-tabs { gap: 8px; }
          .section-tab { padding: 8px 14px; font-size: 12px; }
          .panel-header { padding: 18px; flex-direction: column; gap: 12px; }
          .tab-body { padding: 18px; }
          .safety-grid { grid-template-columns: 1fr; }
          .sub-tabs { overflow-x: auto; }
          .rm-modal { padding: 20px; }
          .rm-row2 { flex-direction: column; }
        }
        @media (min-width: 769px) and (max-width: 1024px) {
          .rt-cards-grid { grid-template-columns: repeat(2,1fr); }
          .safety-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="rg-page">
        <h2 className="rg-title">Rotation & Procedure Guide</h2>

        {/* Main tab switcher */}
        <div className="rg-main-tabs">
          <button
            className={`rg-main-tab ${mainTab === 'rotations' ? 'active' : ''}`}
            onClick={() => setMainTab('rotations')}>
            <RotateCcw size={16} /> My Rotations
          </button>
          <button
            className={`rg-main-tab ${mainTab === 'procedures' ? 'active' : ''}`}
            onClick={() => setMainTab('procedures')}>
            <Microscope size={16} /> Procedure Guide
          </button>
        </div>

        {mainTab === 'rotations'  && <RotationsTab />}
        {mainTab === 'procedures' && <ProceduresTab />}
      </div>
    </>
  );
}
