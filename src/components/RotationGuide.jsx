import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  ShieldAlert,
  FlaskConical,
  Droplets,
  Microscope,
  Heart,
  BookOpen,
  X,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  User,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   ROTATION FORM MODAL
───────────────────────────────────────────── */
function RotationModal({ editing, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name: editing?.section_name ?? '',
    hospital_site: editing?.hospital_site ?? '',
    start_date: editing?.start_date ?? '',
    end_date: editing?.end_date ?? '',
    supervisor_name: editing?.supervisor_name ?? '',
    notes: editing?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (new Date(form.start_date) >= new Date(form.end_date)) {
      setError('End date must be after start date');
      setSaving(false);
      return;
    }

    let result;
    if (editing) {
      result = await supabase
        .from('rotations')
        .update({ ...form })
        .eq('id', editing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('rotations')
        .insert([{ ...form, user_id: user.id }])
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      onSaved(result.data, Boolean(editing));
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editing ? 'Edit Rotation' : 'Add Rotation'}</h3>
          <button className="icon-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Section Name *
            <input
              value={form.section_name}
              onChange={(e) => setForm({ ...form, section_name: e.target.value })}
              placeholder="e.g. Hematology"
              required
            />
          </label>

          <label>
            Hospital Site
            <input
              value={form.hospital_site}
              onChange={(e) => setForm({ ...form, hospital_site: e.target.value })}
              placeholder="e.g. Central Medical Lab"
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label>
              Start Date *
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </label>
            <label>
              End Date *
              <input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </label>
          </div>

          <label>
            Supervisor Name
            <input
              value={form.supervisor_name}
              onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })}
              placeholder="e.g. Dr. Smith"
            />
          </label>

          <label>
            Notes
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes..."
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="primary-btn" disabled={saving}>
              <CheckCircle2 size={15} />
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Rotation'}
            </button>
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
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
  const isActive = () => {
    const today = new Date();
    const start = new Date(rotation.start_date);
    const end = new Date(rotation.end_date);
    return today >= start && today <= end;
  };

  const getDaysLeft = () => {
    const today = new Date();
    const end = new Date(rotation.end_date);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const active = isActive();
  const daysLeft = getDaysLeft();

  return (
    <div className={`rotation-card ${active ? 'active' : ''}`}>
      <div className="rotation-card-header">
        <div className="rotation-badge">
          {active ? (
            <div className="badge-active">🔄 Active</div>
          ) : daysLeft < 0 ? (
            <div className="badge-past">✓ Completed</div>
          ) : (
            <div className="badge-upcoming">📅 Upcoming</div>
          )}
        </div>
        <div className="rotation-actions">
          <button className="icon-btn" onClick={() => onEdit(rotation)} title="Edit">
            <Edit3 size={14} />
          </button>
          <button
            className="icon-btn danger"
            onClick={() => onDelete(rotation.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h4 className="rotation-section">{rotation.section_name}</h4>

      <div className="rotation-info">
        {rotation.hospital_site && (
          <p>
            <MapPin size={14} /> {rotation.hospital_site}
          </p>
        )}
        <p>
          <Calendar size={14} />
          {new Date(rotation.start_date).toLocaleDateString()} -{' '}
          {new Date(rotation.end_date).toLocaleDateString()}
        </p>
        {rotation.supervisor_name && (
          <p>
            <User size={14} /> {rotation.supervisor_name}
          </p>
        )}
      </div>

      {rotation.notes && <p className="rotation-notes">{rotation.notes}</p>}

      {active && daysLeft >= 0 && (
        <div className="rotation-countdown">
          {daysLeft === 0 ? '🎉 Last day!' : `${daysLeft} days remaining`}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATION SECTION
───────────────────────────────────────────── */
function RotationSection() {
  const { user } = useAuth();
  const [rotations, setRotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRotation, setEditingRotation] = useState(null);

  const fetchRotations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rotations')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: false });

    if (!error) setRotations(data ?? []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    fetchRotations();
  }, [fetchRotations]);

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setRotations((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
    } else {
      setRotations((prev) => [saved, ...prev]);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('rotations').delete().eq('id', id);
    if (!error) setRotations((prev) => prev.filter((r) => r.id !== id));
  };

  const openEdit = (rotation) => {
    setEditingRotation(rotation);
    setShowModal(true);
  };

  const currentRotation = rotations.find(() => {
    const today = new Date();
    const rotation = rotations[0];
    if (!rotation) return false;
    const start = new Date(rotation.start_date);
    const end = new Date(rotation.end_date);
    return today >= start && today <= end;
  });

  return (
    <div className="rotation-section-panel">
      <div className="rotation-section-header">
        <div>
          <h3>Your Rotations</h3>
          <p>Manage your internship rotation schedule</p>
        </div>
        <button
          className="primary-btn"
          onClick={() => {
            setEditingRotation(null);
            setShowModal(true);
          }}
        >
          <Plus size={15} /> Add Rotation
        </button>
      </div>

      {loading ? (
        <div className="empty-state"><p>Loading rotations…</p></div>
      ) : rotations.length === 0 ? (
        <div className="empty-state">
          <p>No rotations yet — add your first one! ✨</p>
        </div>
      ) : (
        <div className="rotation-cards-grid">
          {rotations.map((rot) => (
            <RotationCard
              key={rot.id}
              rotation={rot}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {showModal && (
        <RotationModal
          editing={editingRotation}
          onClose={() => {
            setShowModal(false);
            setEditingRotation(null);
          }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION METADATA
───────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'Hematology',
    label: 'Hematology',
    icon: Droplets,
    color: '#ff6f91',
    bg: 'linear-gradient(135deg,#ff8fb1,#ff6f91)',
    overview:
      'Study of blood, blood-forming organs, and blood diseases. Covers CBC, peripheral blood smears, coagulation studies, and bone marrow analysis.',
    objectives: [
      'Perform manual and automated CBC',
      'Prepare and read peripheral blood smears',
      'Conduct coagulation tests (PT, APTT)',
      'Identify normal and abnormal blood cells',
    ],
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
    id: 'Clinical Chemistry',
    label: 'Clin. Chemistry',
    icon: FlaskConical,
    color: '#ff9f5a',
    bg: 'linear-gradient(135deg,#ffb37a,#ff8c5a)',
    overview:
      'Quantitative analysis of body fluids to assess organ function. Includes liver enzymes, kidney panels, glucose, lipid profiles, and electrolytes.',
    objectives: [
      'Operate automated chemistry analyzers',
      'Perform quality control procedures',
      'Interpret liver, kidney, and metabolic panels',
      'Conduct urinalysis and special chemistry tests',
    ],
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
    id: 'Microbiology',
    label: 'Microbiology',
    icon: Microscope,
    color: '#7ab6ff',
    bg: 'linear-gradient(135deg,#7ab6ff,#5f8dff)',
    overview:
      'Identification of pathogenic microorganisms from clinical specimens. Covers culture, sensitivity testing, Gram staining, and identification of bacteria, fungi, and parasites.',
    objectives: [
      'Perform Gram staining and interpret results',
      'Inoculate culture media and identify colonies',
      'Conduct antibiotic sensitivity testing (AST)',
      'Identify common pathogens from various specimens',
    ],
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
    id: 'Blood Bank',
    label: 'Blood Bank',
    icon: Heart,
    color: '#ff6f6f',
    bg: 'linear-gradient(135deg,#ff8f8f,#ff6060)',
    overview:
      'Blood typing, compatibility testing, and blood product management. Ensures safe transfusion practices through rigorous crossmatching, donor screening, and component preparation.',
    objectives: [
      'Perform ABO and Rh blood typing',
      'Conduct compatibility crossmatching',
      'Prepare blood components (PRBCs, FFP, Platelets)',
      'Manage blood product inventory and issue records',
    ],
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
    id: 'Histopathology/Cytology',
    label: 'Histo/Cyto',
    icon: BookOpen,
    color: '#6dd6b1',
    bg: 'linear-gradient(135deg,#6dd6b1,#4abf95)',
    overview:
      'Microscopic examination of tissues and cells for disease diagnosis. Covers tissue processing, microtomy, H&E staining, special stains, and cytological preparations.',
    objectives: [
      'Embed and section tissue using microtome',
      'Perform Hematoxylin & Eosin (H&E) staining',
      'Prepare Pap smears and cytological specimens',
      'Identify histological features of normal and diseased tissue',
    ],
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
   PROCEDURE FORM MODAL
───────────────────────────────────────────── */
function ProcedureModal({ section, editing, onClose, onSaved }) {
  const [form, setForm] = useState({
    procedure_name: editing?.procedure_name ?? '',
    description: editing?.description ?? '',
    safety_notes: editing?.safety_notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    let result;
    if (editing) {
      result = await supabase
        .from('procedures')
        .update({ ...form })
        .eq('id', editing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('procedures')
        .insert([{ ...form, section_name: section }])
        .select()
        .single();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      onSaved(result.data, Boolean(editing));
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editing ? 'Edit Procedure' : 'Add Procedure'}</h3>
          <button className="icon-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Procedure Name *
            <input
              value={form.procedure_name}
              onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}
              placeholder="e.g. Complete Blood Count"
              required
            />
          </label>

          <label>
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Steps, purpose, expected values..."
            />
          </label>

          <label>
            Safety Notes
            <textarea
              rows={2}
              value={form.safety_notes}
              onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
              placeholder="PPE required, hazards, special handling..."
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="primary-btn" disabled={saving}>
              <CheckCircle2 size={15} />
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Procedure'}
            </button>
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
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
            <button
              className="icon-btn expand-btn"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? 'Collapse' : 'View details'}
            >
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          )}
          <button className="icon-btn" onClick={() => onEdit(procedure)} title="Edit">
            <Edit3 size={14} />
          </button>
          <button
            className="icon-btn danger"
            onClick={() => onDelete(procedure.id)}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
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
              <span className="detail-label">
                <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                Safety Notes
              </span>
              <p>{procedure.safety_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION PANEL
───────────────────────────────────────────── */
function SectionPanel({ meta }) {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProc, setEditingProc] = useState(null);
  const [activeTab, setActiveTab] = useState('procedures'); // procedures | safety | overview

  const fetchProcedures = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('procedures')
      .select('*')
      .eq('section_name', meta.id)
      .order('created_at', { ascending: true });

    if (!error) setProcedures(data ?? []);
    setLoading(false);
  }, [meta.id]);

  useEffect(() => {
    fetchProcedures();
  }, [fetchProcedures]);

  const handleSaved = (saved, isEdit) => {
    if (isEdit) {
      setProcedures((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setProcedures((prev) => [...prev, saved]);
    }
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('procedures').delete().eq('id', id);
    if (!error) setProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const openEdit = (proc) => {
    setEditingProc(proc);
    setShowModal(true);
  };

  const filtered = procedures.filter((p) =>
    p.procedure_name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const Icon = meta.icon;

  return (
    <div className="section-panel">
      {/* Panel Header */}
      <div className="panel-header" style={{ background: meta.bg }}>
        <div className="panel-icon-wrap">
          <Icon size={22} color="white" />
        </div>
        <div>
          <h3>{meta.id}</h3>
          <p>{meta.overview}</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="sub-tabs">
        {[
          { id: 'procedures', label: `Procedures (${procedures.length})` },
          { id: 'safety', label: 'Safety Reminders' },
          { id: 'overview', label: 'Learning Objectives' },
        ].map((t) => (
          <button
            key={t.id}
            className={`sub-tab ${activeTab === t.id ? 'active' : ''}`}
            style={activeTab === t.id ? { borderBottomColor: meta.color, color: meta.color } : {}}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PROCEDURES TAB ── */}
      {activeTab === 'procedures' && (
        <div className="tab-body">
          <div className="proc-toolbar">
            <div className="search-wrap">
              <Search size={14} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search procedures…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              className="primary-btn"
              onClick={() => { setEditingProc(null); setShowModal(true); }}
            >
              <Plus size={15} /> Add
            </button>
          </div>

          {loading ? (
            <div className="empty-state"><p>Loading procedures…</p></div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              {search
                ? <p>No procedures match "<em>{search}</em>"</p>
                : <p>No procedures yet — add your first one! ✨</p>}
            </div>
          ) : (
            <div className="proc-list">
              {filtered.map((proc) => (
                <ProcedureCard
                  key={proc.id}
                  procedure={proc}
                  accentColor={meta.color}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SAFETY TAB ── */}
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

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="tab-body">
          <ul className="objective-list">
            {meta.objectives.map((obj, i) => (
              <li key={i} className="objective-item">
                <span
                  className="obj-num"
                  style={{ background: meta.bg }}
                >
                  {i + 1}
                </span>
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ProcedureModal
          section={meta.id}
          editing={editingProc}
          onClose={() => { setShowModal(false); setEditingProc(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN ROTATION GUIDE
───────────────────────────────────────────── */
function RotationGuide() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const activeMeta = SECTIONS.find((s) => s.id === activeSection);

  return (
    <>
      <style>{`
        /* ── Page ── */
        .rg-page { width: 100%; }

        .rg-title {
          font-size: 2rem;
          font-weight: 700;
          color: #ff5d8f;
          margin-bottom: 6px;
        }

        .rg-subtitle {
          color: #888;
          margin-bottom: 28px;
          font-size: 0.95rem;
        }

        /* ── Rotation Section Panel ── */
        .rotation-section-panel {
          background: rgba(255,255,255,0.82);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 36px rgba(255,111,145,0.09);
          padding: 24px 28px;
          margin-bottom: 28px;
        }

        .rotation-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
        }

        .rotation-section-header h3 {
          margin: 0 0 4px;
          font-size: 1.2rem;
          color: #333;
        }

        .rotation-section-header p {
          margin: 0;
          color: #888;
          font-size: 13px;
        }

        .rotation-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .rotation-card {
          background: #fff8fa;
          border: 1.5px solid #ffe0ea;
          border-radius: 18px;
          padding: 18px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .rotation-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #ff8fb1, #ff6f91);
          opacity: 0;
          transition: opacity 0.2s;
        }

        .rotation-card.active::before {
          opacity: 1;
        }

        .rotation-card:hover {
          border-color: #ffb8ce;
          box-shadow: 0 6px 18px rgba(255,111,145,0.12);
          transform: translateY(-2px);
        }

        .rotation-card.active {
          background: linear-gradient(135deg, rgba(255,143,177,0.08), rgba(255,111,145,0.06));
          border-color: #ff8fb1;
        }

        .rotation-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          gap: 12px;
        }

        .rotation-badge {
          flex: 1;
        }

        .badge-active,
        .badge-upcoming,
        .badge-past {
          display: inline-block;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .badge-active {
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
        }

        .badge-upcoming {
          background: #e3f2fd;
          color: #1976d2;
        }

        .badge-past {
          background: #e8f5e9;
          color: #388e3c;
        }

        .rotation-actions {
          display: flex;
          gap: 6px;
        }

        .rotation-section {
          margin: 0 0 12px;
          font-size: 16px;
          font-weight: 700;
          color: #333;
        }

        .rotation-info {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .rotation-info p {
          margin: 0;
          font-size: 13px;
          color: #666;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rotation-info svg {
          color: #ff8fb1;
          flex-shrink: 0;
        }

        .rotation-notes {
          margin: 12px 0 0;
          padding: 10px 12px;
          background: #fff0f4;
          border-left: 3px solid #ff8fb1;
          border-radius: 6px;
          font-size: 13px;
          color: #555;
          line-height: 1.5;
        }

        .rotation-countdown {
          margin-top: 12px;
          padding: 10px 12px;
          background: linear-gradient(135deg, rgba(255,143,177,0.1), rgba(255,111,145,0.08));
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          color: #ff5d8f;
          text-align: center;
        }

        /* ── Section Tabs ── */
        .section-tabs {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .section-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 999px;
          border: 1.5px solid #ffd6e1;
          background: rgba(255,255,255,0.75);
          color: #888;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .section-tab:hover {
          border-color: #ff8fb1;
          color: #ff5d8f;
          background: white;
          transform: translateY(-1px);
        }

        .section-tab.active {
          color: white;
          border-color: transparent;
          box-shadow: 0 6px 18px rgba(255,111,145,0.28);
          transform: translateY(-1px);
        }

        .section-tab svg {
          flex-shrink: 0;
        }

        /* ── Panel ── */
        .section-panel {
          background: rgba(255,255,255,0.82);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 10px 36px rgba(255,111,145,0.09);
          overflow: hidden;
        }

        .panel-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 24px 28px;
          color: white;
        }

        .panel-header h3 {
          margin: 0 0 6px;
          font-size: 1.2rem;
        }

        .panel-header p {
          margin: 0;
          font-size: 13px;
          opacity: 0.92;
          line-height: 1.5;
          max-width: 600px;
        }

        .panel-icon-wrap {
          width: 46px;
          height: 46px;
          border-radius: 16px;
          background: rgba(255,255,255,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── Sub-tabs ── */
        .sub-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid #ffe0ea;
          padding: 0 24px;
          background: white;
        }

        .sub-tab {
          padding: 14px 18px;
          border: none;
          border-bottom: 2.5px solid transparent;
          background: transparent;
          color: #999;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .sub-tab:hover { color: #ff5d8f; }
        .sub-tab.active { color: #ff5d8f; }

        /* ── Tab body ── */
        .tab-body {
          padding: 24px 28px;
        }

        /* ── Procedure toolbar ── */
        .proc-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }

        .search-wrap {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 13px;
          color: #bbb;
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          border: 1.5px solid #ffd6e1;
          background: #fff8fa;
          border-radius: 999px;
          padding: 10px 36px 10px 34px;
          font-size: 16px;
          outline: none;
          transition: 0.2s;
          color: #444;
        }

        .search-input:focus {
          border-color: #ff8fb1;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }

        .search-clear {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #bbb;
          cursor: pointer;
          padding: 0;
          display: flex;
        }

        /* ── Procedure list ── */
        .proc-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .proc-card {
          background: #fff8fa;
          border: 1.5px solid #ffe0ea;
          border-radius: 18px;
          overflow: hidden;
          transition: box-shadow 0.2s, border-color 0.2s;
        }

        .proc-card:hover {
          border-color: #ffb8ce;
          box-shadow: 0 4px 14px rgba(255,111,145,0.1);
        }

        .proc-card.expanded {
          border-color: #ff8fb1;
        }

        .proc-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          gap: 10px;
        }

        .proc-name-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
        }

        .proc-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        .proc-name-row strong {
          font-size: 14px;
          color: #444;
        }

        .proc-controls {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .proc-details {
          padding: 0 16px 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          border-top: 1px solid #ffe0ea;
          padding-top: 14px;
          margin: 0 16px;
          margin-bottom: 14px;
        }

        .proc-detail-block p {
          margin: 4px 0 0;
          font-size: 13px;
          color: #666;
          line-height: 1.55;
        }

        .detail-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #aaa;
        }

        .safety-block {
          background: #fff5e6;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid #ffd6a0;
        }

        .safety-block .detail-label { color: #cc7a00; }
        .safety-block p { color: #885500; }

        /* ── Icon buttons ── */
        .icon-btn {
          border: none;
          background: #ffe4ec;
          padding: 7px;
          border-radius: 10px;
          cursor: pointer;
          display: flex;
          align-items: center;
          color: #ff5d8f;
          transition: 0.2s;
        }

        .icon-btn:hover { background: #ffd0e0; transform: scale(1.05); }
        .icon-btn.danger { background: #fde8e8; color: #e05555; }
        .icon-btn.danger:hover { background: #fcd0d0; }
        .expand-btn { background: #f0f0f0; color: #888; }
        .expand-btn:hover { background: #e8e8e8; }

        /* ── Safety Grid ── */
        .safety-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .safety-card {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #fff8fa;
          border: 1.5px solid #ffe0ea;
          border-radius: 18px;
          padding: 16px;
        }

        .safety-emoji {
          font-size: 20px;
          flex-shrink: 0;
          line-height: 1;
        }

        .safety-card p {
          margin: 0;
          font-size: 13px;
          color: #555;
          line-height: 1.55;
        }

        /* ── Objectives ── */
        .objective-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .objective-item {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #fff8fa;
          border: 1.5px solid #ffe0ea;
          border-radius: 18px;
          padding: 16px;
          font-size: 14px;
          color: #444;
          line-height: 1.5;
        }

        .obj-num {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          color: white;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        /* ── Primary/secondary buttons ── */
        .primary-btn {
          border: none;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 600;
          font-size: 13px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: 0.2s ease;
          white-space: nowrap;
        }

        .primary-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,111,145,0.25); }
        .primary-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .secondary-btn {
          border: none;
          background: #f4f4f4;
          color: #666;
          border-radius: 999px;
          padding: 10px 18px;
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          transition: 0.2s;
        }

        .secondary-btn:hover { background: #eee; }

        /* ── Empty state ── */
        .empty-state {
          padding: 32px 0;
          text-align: center;
          color: #aaa;
          font-size: 14px;
        }

        /* ── Modal ── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.25);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-card {
          background: white;
          border-radius: 28px;
          padding: 28px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.22);
          border: 1px solid #ffe0ea;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #444;
        }

        .icon-close {
          border: none;
          background: #f4f4f4;
          border-radius: 10px;
          padding: 6px;
          cursor: pointer;
          display: flex;
          color: #888;
          transition: 0.2s;
        }

        .icon-close:hover { background: #ffe4ec; color: #ff5d8f; }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .modal-form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #666;
        }

        .modal-form input,
        .modal-form textarea {
          border: 1.5px solid #ffd6e1;
          background: #fff8fa;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 16px;
          outline: none;
          transition: 0.2s;
          color: #444;
          resize: vertical;
          font-family: inherit;
        }

        .modal-form input:focus,
        .modal-form textarea:focus {
          border-color: #ff8fb1;
          background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }

        .form-error {
          font-size: 13px;
          color: #e05555;
          background: #fde8e8;
          padding: 10px 14px;
          border-radius: 12px;
          margin: 0;
        }

        .modal-actions {
          display: flex;
          gap: 10px;
          padding-top: 4px;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .section-tabs { gap: 8px; }
          .section-tab { padding: 8px 14px; font-size: 12px; }
          .panel-header { padding: 18px; flex-direction: column; gap: 12px; }
          .tab-body { padding: 18px; }
          .safety-grid { grid-template-columns: 1fr; }
          .sub-tabs { overflow-x: auto; gap: 0; }
          .sub-tab { padding: 12px 14px; font-size: 12px; }
          .proc-toolbar { flex-wrap: wrap; }
          .modal-card { padding: 20px; }
          .rotation-section-panel { padding: 18px; }
          .rotation-section-header { flex-direction: column; gap: 12px; }
          .rotation-section-header button { width: 100%; }
          .rotation-cards-grid { grid-template-columns: 1fr; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .safety-grid { grid-template-columns: 1fr; }
          .rotation-cards-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="rg-page">
        <h2 className="rg-title">Rotation & Procedure Guide</h2>

        {/* Rotation Management Section */}
        <RotationSection />

        {/* Section selector tabs */}
        <div className="section-tabs">
          {SECTIONS.map((s) => {
            const SIcon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                className={`section-tab ${isActive ? 'active' : ''}`}
                style={isActive ? { background: s.bg } : {}}
                onClick={() => setActiveSection(s.id)}
              >
                <SIcon size={15} />
                {s.label}
              </button>
            );
          })}
        </div>

        {/* Active section panel */}
        {activeMeta && <SectionPanel key={activeMeta.id} meta={activeMeta} />}
      </div>
    </>
  );
}

export default RotationGuide;