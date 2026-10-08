import ThemedIcon, { SafetyIconPicker } from './ui/ThemedIcon';
import useQuickCreate from '../hooks/useQuickCreate';
import Dialog from './ui/Dialog';
import '../styles/features/RotationGuide.css';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/useAuth';
import {
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
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
  Clock,
  Layers,
  Shield,
  Target,
  RotateCcw,
  Settings2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  Award,
  Check,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS & STORAGE KEYS
───────────────────────────────────────────── */
const SECTION_STORAGE_KEY = 'rotation_guide.sections';

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

const DEFAULT_SECTIONS = [
  {
    id: 'Hematology',
    label: 'Hematology',
    icon: Droplets,
    color: '#ff6f91',
    bg: 'linear-gradient(135deg,#ff8fb1,#ff6f91)',
    cardBg: 'var(--rose-soft)',
    cardBorder: '#ffd6e1',
    overview:
      'Study of blood, blood-forming organs, and blood diseases. Covers CBC, peripheral blood smears, coagulation studies, and bone marrow analysis.',
    objectives: [
      'Perform manual and automated CBC',
      'Prepare and read peripheral blood smears',
      'Conduct coagulation tests (PT, APTT)',
      'Identify normal and abnormal blood cells',
    ],
    safety: [
      { icon: 'Hand', text: 'Wear gloves at all times when handling blood specimens' },
      {
        icon: 'TriangleAlert',
        text: 'Treat all blood as potentially infectious (Universal Precautions)',
      },
      { icon: 'Trash2', text: 'Dispose of sharps immediately in designated sharps containers' },
      { icon: 'SprayCan', text: 'Decontaminate surfaces with 10% bleach after any spill' },
      { icon: 'Tag', text: 'Label specimens immediately after collection — never rely on memory' },
      { icon: 'Scale', text: 'Always balance the centrifuge with opposite tubes before spinning' },
    ],
  },
  {
    id: 'Clinical Chemistry',
    label: 'Clin. Chemistry',
    icon: FlaskConical,
    color: '#ff9f5a',
    bg: 'linear-gradient(135deg,#ffb37a,#ff8c5a)',
    cardBg: 'var(--peach-soft)',
    cardBorder: '#ffd6b8',
    overview:
      'Quantitative analysis of body fluids to assess organ function. Includes liver enzymes, kidney panels, glucose, lipid profiles, and electrolytes.',
    objectives: [
      'Operate automated chemistry analyzers',
      'Perform quality control procedures',
      'Interpret liver, kidney, and metabolic panels',
      'Conduct urinalysis and special chemistry tests',
    ],
    safety: [
      { icon: 'Glasses', text: 'Wear goggles, gloves, and lab coat when handling reagents' },
      { icon: 'Ban', text: 'Never pipette by mouth under any circumstances' },
      { icon: 'Recycle', text: 'Segregate and dispose of chemical waste in designated containers' },
      { icon: 'ShowerHead', text: 'Know the location of eyewash stations and emergency showers' },
      { icon: 'Wind', text: 'Handle concentrated acids and bases only inside a fume hood' },
      { icon: 'CalendarDays', text: 'Check reagent expiration dates before every use' },
    ],
  },
  {
    id: 'Microbiology',
    label: 'Microbiology',
    icon: Microscope,
    color: '#5f8dff',
    bg: 'linear-gradient(135deg,#7ab6ff,#5f8dff)',
    cardBg: 'var(--lavender-soft)',
    cardBorder: '#c5d9ff',
    overview:
      'Identification of pathogenic microorganisms from clinical specimens. Covers culture, sensitivity testing, Gram staining, and identification of bacteria, fungi, and parasites.',
    objectives: [
      'Perform Gram staining and interpret results',
      'Inoculate culture media and identify colonies',
      'Conduct antibiotic sensitivity testing (AST)',
      'Identify common pathogens from various specimens',
    ],
    safety: [
      {
        icon: 'Archive',
        text: 'Perform aerosol-generating procedures only inside a biosafety cabinet',
      },
      { icon: 'Flame', text: 'Autoclave all cultures and contaminated materials before disposal' },
      {
        icon: 'LockKeyhole',
        text: 'Never leave active cultures unattended, unsecured, or unlabeled',
      },
      { icon: 'ShieldCheck', text: 'Wear N95 mask when processing respiratory specimens' },
      { icon: 'Thermometer', text: 'Flame inoculating loops before AND after each use' },
      {
        icon: 'Megaphone',
        text: 'Report all accidental exposures or spills immediately to supervisor',
      },
    ],
  },
  {
    id: 'Blood Bank',
    label: 'Blood Bank',
    icon: Heart,
    color: '#e05555',
    bg: 'linear-gradient(135deg,#ff8f8f,#e05555)',
    cardBg: 'var(--rose-soft)',
    cardBorder: '#ffcaca',
    overview:
      'Blood typing, compatibility testing, and blood product management. Ensures safe transfusion practices through rigorous crossmatching, donor screening, and component preparation.',
    objectives: [
      'Perform ABO and Rh blood typing',
      'Conduct compatibility crossmatching',
      'Prepare blood components (PRBCs, FFP, Platelets)',
      'Manage blood product inventory and issue records',
    ],
    safety: [
      {
        icon: 'IdCard',
        text: 'Verify patient ID and blood type with two staff members before any release',
      },
      { icon: 'Thermometer', text: 'Store RBCs at 2–6°C; never allow temperature excursions' },
      {
        icon: 'CircleCheck',
        text: 'Complete full crossmatch before releasing blood products — no shortcuts',
      },
      { icon: 'Hand', text: 'Handle all blood products as potentially infectious' },
      { icon: 'NotebookPen', text: 'Document all discrepancies immediately, no matter how minor' },
      {
        icon: 'UsersRound',
        text: 'Two-person verification is mandatory for all critical transfusion steps',
      },
    ],
  },
  {
    id: 'Histopathology/Cytology',
    label: 'Histo/Cyto',
    icon: BookOpen,
    color: '#4abf95',
    bg: 'linear-gradient(135deg,#6dd6b1,#4abf95)',
    cardBg: 'var(--sage-soft)',
    cardBorder: '#b8f0da',
    overview:
      'Microscopic examination of tissues and cells for disease diagnosis. Covers tissue processing, microtomy, H&E staining, special stains, and cytological preparations.',
    objectives: [
      'Embed and section tissue using microtome',
      'Perform Hematoxylin & Eosin (H&E) staining',
      'Prepare Pap smears and cytological specimens',
      'Identify histological features of normal and diseased tissue',
    ],
    safety: [
      {
        icon: 'Wind',
        text: 'Always use a fume hood when working with formalin or xylene — both are toxic',
      },
      { icon: 'Hand', text: 'Use chemical-resistant nitrile gloves when handling fixatives' },
      {
        icon: 'Scissors',
        text: 'Change microtome blades using a blade holder — never touch directly',
      },
      {
        icon: 'TriangleAlert',
        text: 'Formalin is a known carcinogen; minimize exposure and wear respiratory protection',
      },
      {
        icon: 'Tag',
        text: 'Label every cassette and slide immediately — mix-ups have serious diagnostic consequences',
      },
      {
        icon: 'Trash2',
        text: 'Dispose of xylene and formalin waste in labeled chemical waste containers only',
      },
    ],
  },
];

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function colorToSoftBg(hex) {
  const c = hex.replace('#', '');
  if (c.length !== 6) return '#fff0f4';
  const r = parseInt(c.slice(0, 2), 16),
    g = parseInt(c.slice(2, 4), 16),
    b = parseInt(c.slice(4, 6), 16);
  const mix = (v) =>
    Math.round(v + (255 - v) * 0.88)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function colorToGrad(hex) {
  const c = hex.replace('#', '');
  if (c.length !== 6) return `linear-gradient(135deg,${hex},${hex})`;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  // Mix 35% white into each channel → opaque lighter shade for gradient start
  const mix = (v) =>
    Math.round(v + (255 - v) * 0.35)
      .toString(16)
      .padStart(2, '0');
  const lighter = `#${mix(r)}${mix(g)}${mix(b)}`;
  return `linear-gradient(135deg,${lighter},${hex})`;
}

function generateSectionMeta(name) {
  const hash = name.split('').reduce((a, c) => c.charCodeAt(0) + ((a << 5) - a), 0);
  const color = SECTION_COLOR_PRESETS[Math.abs(hash) % SECTION_COLOR_PRESETS.length];
  return { color, bg: colorToGrad(color), cardBg: colorToSoftBg(color), cardBorder: color + '44' };
}

function getRotationStatus(r) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(r.start_date + 'T00:00:00');
  const end = new Date(r.end_date + 'T00:00:00');
  if (today >= start && today <= end) return 'active';
  if (today < start) return 'upcoming';
  return 'completed';
}

function getDaysLeft(endDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(endDate + 'T00:00:00') - today) / 86400000);
}

function getDaysUntil(startDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(startDate + 'T00:00:00') - today) / 86400000);
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateShort(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getDuration(start, end) {
  const s = new Date(start + 'T00:00:00'),
    e = new Date(end + 'T00:00:00');
  const days = Math.ceil((e - s) / 86400000) + 1;
  if (days >= 7) return `${Math.round(days / 7)} wk${Math.round(days / 7) !== 1 ? 's' : ''}`;
  return `${days} day${days !== 1 ? 's' : ''}`;
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
      setError('Enter a section name.');
      return;
    }
    if (sections.some((s) => s.id.toLowerCase() === label.toLowerCase())) {
      setError('Section already exists.');
      return;
    }
    onAdd(label);
    setName('');
    setError('');
  };

  return (
    <Dialog className="msm-overlay" onClose={onClose}>
      <div className="msm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="msm-head">
          <div className="msm-head-left">
            <div className="msm-head-icon">
              <Settings2 size={18} />
            </div>
            <div>
              <h3 className="msm-title">Manage Sections</h3>
              <p className="msm-sub">Add, recolor, or remove rotation sections</p>
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
            Sections <span className="msm-count">{sections.length}</span>
          </p>

          {sections.length === 0 ? (
            <div className="msm-empty">
              <span style={{ fontSize: 28 }}>
                <ThemedIcon name="Layers" />
              </span>
              <p>No sections yet.</p>
            </div>
          ) : (
            <div className="msm-list">
              {sections.map((sec) => {
                const isRem = removing === sec.id;
                return (
                  <div key={sec.id} className={`msm-row ${isRem ? 'msm-row-rem' : ''}`}>
                    <div className="msm-row-main">
                      <div className="msm-sec-pill">
                        <span className="msm-dot" style={{ background: sec.color }} />
                        {sec.id}
                      </div>
                      <label
                        htmlFor="field-rotationguide-1"
                        className="msm-color-ctrl"
                        title="Change color"
                      >
                        <span className="msm-color-swatch" style={{ background: sec.color }} />
                        <input
                          id="field-rotationguide-1"
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
          <Sparkles size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          Removing a section hides it from new rotations and the procedure guide. Existing records
          keep their saved label.
        </div>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   ROTATION MODAL — slide-up sheet with colored header
───────────────────────────────────────────── */
function RotationModal({ editing, existingRotations, sections, onClose, onSaved }) {
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
  const [selectedSection, setSelectedSection] = useState(
    editing
      ? sections.some((s) => s.id === editing.section_name)
        ? editing.section_name
        : '__custom__'
      : '',
  );

  const secMeta = sections?.find((s) => s.id === selectedSection);
  const accentColor = secMeta?.color ?? '#ff6f91';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.section_name.trim()) {
      setError('Please select or enter a section.');
      return;
    }
    if (new Date(form.start_date) >= new Date(form.end_date)) {
      setError('End date must be after start date.');
      return;
    }
    const newStart = new Date(form.start_date + 'T00:00:00'),
      newEnd = new Date(form.end_date + 'T00:00:00');
    const overlaps = existingRotations.filter((r) => {
      if (editing && r.id === editing.id) return false;
      const rStart = new Date(r.start_date + 'T00:00:00'),
        rEnd = new Date(r.end_date + 'T00:00:00');
      return newStart <= rEnd && newEnd >= rStart;
    });
    if (overlaps.length > 0) {
      const o = overlaps[0];
      setError(
        `Overlaps with "${o.section_name}" rotation (${formatDate(o.start_date)} – ${formatDate(o.end_date)}).`,
      );
      return;
    }
    setSaving(true);
    const result = editing
      ? await supabase
          .from('rotations')
          .update({ ...form })
          .eq('id', editing.id)
          .select()
          .single()
      : await supabase
          .from('rotations')
          .insert([{ ...form, user_id: user.id }])
          .select()
          .single();
    setSaving(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <Dialog className="rm-overlay" onClose={onClose}>
      <div className="rm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <div className="rm-header-left">
            <div className="rm-header-icon">
              <RotateCcw size={16} color="currentColor" />
            </div>
            <span className="rm-header-title">{editing ? 'Edit Rotation' : 'Add Rotation'}</span>
          </div>
          <button aria-label="Close" className="rm-header-close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rm-body">
          <label htmlFor="field-rotationguide-2" className="rm-label">
            Section *
            <select
              id="field-rotationguide-2"
              className="rm-input rm-select"
              value={selectedSection}
              style={{ '--a': accentColor }}
              onChange={(e) => {
                setSelectedSection(e.target.value);
                if (e.target.value !== '__custom__')
                  setForm({ ...form, section_name: e.target.value });
                else setForm({ ...form, section_name: '' });
              }}
              required
            >
              <option value="">Select a section…</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
              <option value="__custom__">Other / Custom</option>
            </select>
            {selectedSection === '__custom__' && (
              <input
                className="rm-input"
                style={{ marginTop: 8, '--a': accentColor }}
                placeholder="Type section name…"
                value={form.section_name}
                onChange={(e) => setForm({ ...form, section_name: e.target.value })}
              />
            )}
          </label>

          <label htmlFor="field-rotationguide-3" className="rm-label">
            Hospital / Site
            <input
              id="field-rotationguide-3"
              className="rm-input"
              style={{ '--a': accentColor }}
              value={form.hospital_site}
              onChange={(e) => setForm({ ...form, hospital_site: e.target.value })}
              placeholder="e.g. Perpetual Help Medical Center"
            />
          </label>

          <div className="rm-row2">
            <label htmlFor="field-rotationguide-6" className="rm-label">
              Start Date *
              <input
                id="field-rotationguide-6"
                type="date"
                className="rm-input"
                style={{ '--a': accentColor }}
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                required
              />
            </label>
            <label htmlFor="field-rotationguide-7" className="rm-label">
              End Date *
              <input
                id="field-rotationguide-7"
                type="date"
                className="rm-input"
                style={{ '--a': accentColor }}
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                required
              />
            </label>
          </div>

          {form.start_date &&
            form.end_date &&
            new Date(form.start_date) < new Date(form.end_date) && (
              <div className="rm-duration-preview">
                <Clock size={13} /> Duration:{' '}
                <strong>{getDuration(form.start_date, form.end_date)}</strong>
              </div>
            )}

          <label htmlFor="field-rotationguide-4" className="rm-label">
            Supervisor
            <input
              id="field-rotationguide-4"
              className="rm-input"
              style={{ '--a': accentColor }}
              value={form.supervisor_name}
              onChange={(e) => setForm({ ...form, supervisor_name: e.target.value })}
              placeholder="e.g. Dr. Santos, RMT"
            />
          </label>

          <label htmlFor="field-rotationguide-5" className="rm-label">
            Notes
            <textarea
              id="field-rotationguide-5"
              className="rm-textarea"
              style={{ '--a': accentColor }}
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any reminders or details…"
            />
          </label>

          {error && (
            <div className="rm-error">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          <div className="rm-actions">
            <button
              type="submit"
              className="rm-primary"

              disabled={saving}
            >
              <CheckCircle2 size={15} />
              {saving ? 'Saving…' : editing ? 'Update Rotation' : 'Add Rotation'}
            </button>
            <button type="button" className="rm-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   ROTATION CARD
───────────────────────────────────────────── */
function RotationCard({ rotation, sections, onEdit, onDelete }) {
  const status = getRotationStatus(rotation);
  const daysLeft = getDaysLeft(rotation.end_date);
  const daysUntil = getDaysUntil(rotation.start_date);
  const duration = getDuration(rotation.start_date, rotation.end_date);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const secMeta = sections.find((s) => s.id === rotation.section_name);
  const color = secMeta?.color ?? '#ff6f91';
  const grad = secMeta?.bg ?? 'linear-gradient(135deg,#ff8fb1,#ff6f91)';
  const cardBg = secMeta?.cardBg ?? '#fff0f4';

  const statusConfig = {
    active: {
      label: 'Active Now',
      dotColor: '#4abf95',
      textColor: '#2e9e6e',
      bgColor: 'var(--sage-soft)',
      pulse: true,
    },
    upcoming: {
      label: 'Upcoming',
      dotColor: '#5f8dff',
      textColor: '#3d6fcc',
      bgColor: 'var(--lavender-soft)',
      pulse: false,
    },
    completed: {
      label: 'Completed',
      dotColor: '#bbb',
      textColor: '#999',
      bgColor: 'var(--surface-subtle)',
      pulse: false,
    },
  };
  const sc = statusConfig[status];

  const progressPct = useMemo(() => {
    if (status !== 'active') return null;
    const start = new Date(rotation.start_date + 'T00:00:00');
    const end = new Date(rotation.end_date + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const total = (end - start) / 86400000;
    const done = (today - start) / 86400000;
    return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
  }, [rotation, status]);

  return (
    <div className={`rc-card ${status}`} style={{ '--sec-color': color, '--sec-cardBg': cardBg }}>
      <div className="rc-strip" style={{ background: grad }} />
      <div className="rc-body">
        <div className="rc-top-row">
          <div className="rc-status-badge">
            <span className="rc-badge-dot" style={{ background: sc.dotColor }}>
              {sc.pulse && <span className="rc-pulse-ring" />}
            </span>
            {sc.label}
          </div>
          <div className="rc-actions-row">
            <button className="rc-icon-btn" onClick={() => onEdit(rotation)} title="Edit">
              <Edit3 size={13} />
            </button>
            {confirmDelete ? (
              <div className="rc-confirm-row">
                <span>Remove?</span>
                <button className="rc-confirm-yes" onClick={() => onDelete(rotation.id)}>
                  Yes
                </button>
                <button className="rc-confirm-no" onClick={() => setConfirmDelete(false)}>
                  No
                </button>
              </div>
            ) : (
              <button
                className="rc-icon-btn danger"
                onClick={() => setConfirmDelete(true)}
                title="Delete"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>

        <h4 className="rc-section-name">{rotation.section_name}</h4>

        <div className="rc-info-stack">
          {rotation.hospital_site && (
            <div className="rc-info-row">
              <MapPin size={13} style={{ color: 'var(--ink)', opacity: 0.7, flexShrink: 0 }} />
              <span>{rotation.hospital_site}</span>
            </div>
          )}
          <div className="rc-info-row">
            <Calendar size={13} style={{ color: 'var(--ink)', opacity: 0.7, flexShrink: 0 }} />
            <span>
              {formatDateShort(rotation.start_date)} → {formatDateShort(rotation.end_date)}
            </span>
            <span className="rc-duration-chip">{duration}</span>
          </div>
          {rotation.supervisor_name && (
            <div className="rc-info-row">
              <User size={13} style={{ color: 'var(--ink)', opacity: 0.7, flexShrink: 0 }} />
              <span>{rotation.supervisor_name}</span>
            </div>
          )}
        </div>

        {status === 'active' && progressPct !== null && (
          <div className="rc-progress-block">
            <div className="rc-progress-header">
              <span>Rotation Progress</span>
              <span style={{ color: 'var(--ink)', fontWeight: 700 }}>{progressPct}%</span>
            </div>
            <div className="rc-progress-track">
              <div
                className="rc-progress-fill"
                style={{ width: `${progressPct}%`, background: grad }}
              />
            </div>
            <p className="rc-days-remaining">
              {daysLeft === 0 ? (
                <>
                  <ThemedIcon name="PartyPopper" size={14} /> Last day!
                </>
              ) : (
                `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`
              )}
            </p>
          </div>
        )}

        {status === 'upcoming' && (
          <div className="rc-upcoming-tag">
            <Clock size={12} /> Starts in {daysUntil} day{daysUntil !== 1 ? 's' : ''}
          </div>
        )}

        {rotation.notes && (
          <p className="rc-notes-text">
            <ThemedIcon name="NotebookPen" /> {rotation.notes}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATIONS STATS
───────────────────────────────────────────── */
function RotationsStats({ rotations }) {
  const active = rotations.filter((r) => getRotationStatus(r) === 'active').length;
  const upcoming = rotations.filter((r) => getRotationStatus(r) === 'upcoming').length;
  const completed = rotations.filter((r) => getRotationStatus(r) === 'completed').length;

  return (
    <div className="rs-stats">
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: 'var(--sage)' }}>
          {active}
        </span>
        <span className="rs-stat-l">Active</span>
      </div>
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: 'var(--lavender)' }}>
          {upcoming}
        </span>
        <span className="rs-stat-l">Upcoming</span>
      </div>
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: 'var(--muted)' }}>
          {completed}
        </span>
        <span className="rs-stat-l">Completed</span>
      </div>
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: 'var(--accent)' }}>
          {rotations.length}
        </span>
        <span className="rs-stat-l">Total</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATIONS TAB (receives rotations as props)
───────────────────────────────────────────── */
function RotationsTab({
  sections,
  rotations,
  loading,
  onAddRotation,
  onEditRotation,
  onDeleteRotation,
  onManageSections,
}) {
  const active = rotations.filter((r) => getRotationStatus(r) === 'active');
  const upcoming = rotations.filter((r) => getRotationStatus(r) === 'upcoming');
  const completed = rotations.filter((r) => getRotationStatus(r) === 'completed');

  return (
    <div className="rt-wrap">
      <div className="rt-toolbar">
        <div className="rt-toolbar-actions">
          <button className="rg-manage-btn" onClick={onManageSections}>
            <Settings2 size={14} /> Manage Sections
          </button>
          <button className="rg-primary-btn" onClick={onAddRotation}>
            <Plus size={15} /> Add Rotation
          </button>
        </div>
      </div>

      {rotations.length > 0 && <RotationsStats rotations={rotations} />}

      {loading ? (
        <div className="rg-empty">
          <div className="rg-empty-spinner" />
          <p>Loading rotations…</p>
        </div>
      ) : rotations.length === 0 ? (
        <div className="rg-empty-hero">
          <div className="rg-empty-hero-icon">
            <ThemedIcon name="Hospital" />
          </div>
          <h3>No rotations yet</h3>
          <p>Add your first rotation to start tracking your clinical internship journey.</p>
          <button className="rg-primary-btn" onClick={onAddRotation}>
            <Plus size={15} /> Add Your First Rotation
          </button>
        </div>
      ) : (
        <div className="rt-sections">
          {active.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span
                  className="rt-group-dot"
                  style={{ background: '#4abf95', boxShadow: '0 0 0 3px rgba(74,191,149,0.22)' }}
                />
                <span style={{ color: 'var(--sage)' }}>Active Rotation</span>
              </div>
              <div className="rt-cards-grid">
                {active.map((r) => (
                  <RotationCard
                    key={r.id}
                    rotation={r}
                    sections={sections}
                    onEdit={onEditRotation}
                    onDelete={onDeleteRotation}
                  />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{ background: '#5f8dff' }} />
                <span style={{ color: 'var(--lavender)' }}>Upcoming ({upcoming.length})</span>
              </div>
              <div className="rt-cards-grid">
                {upcoming.map((r) => (
                  <RotationCard
                    key={r.id}
                    rotation={r}
                    sections={sections}
                    onEdit={onEditRotation}
                    onDelete={onDeleteRotation}
                  />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{ background: '#ccc' }} />
                <span style={{ color: 'var(--muted)' }}>Completed ({completed.length})</span>
              </div>
              <div className="rt-cards-grid">
                {completed.map((r) => (
                  <RotationCard
                    key={r.id}
                    rotation={r}
                    sections={sections}
                    onEdit={onEditRotation}
                    onDelete={onDeleteRotation}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCEDURE MODAL (now lifted to top level)
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
      return;
    }
    onSaved(result.data, Boolean(editing));
    onClose();
  };

  return (
    <Dialog className="rm-overlay" onClose={onClose}>
      <div className="rm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header">
          <div className="rm-header-left">
            <div className="rm-header-icon">
              <Layers size={16} color="currentColor" />
            </div>
            <span className="rm-header-title">{editing ? 'Edit Procedure' : 'Add Procedure'}</span>
          </div>
          <button aria-label="Close" className="rm-header-close" onClick={onClose}>
            <X size={17} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="rm-body">
          <label htmlFor="field-rotationguide-8" className="rm-label">
            Procedure Name *
            <input
              id="field-rotationguide-8"
              className="rm-input"
              value={form.procedure_name}
              onChange={(e) => setForm({ ...form, procedure_name: e.target.value })}
              placeholder="e.g. Complete Blood Count"
              required
            />
          </label>
          <label htmlFor="field-rotationguide-9" className="rm-label">
            Description
            <textarea
              id="field-rotationguide-9"
              className="rm-textarea"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Steps, purpose, expected values…"
            />
          </label>
          <label htmlFor="field-rotationguide-10" className="rm-label">
            Safety Notes
            <textarea
              id="field-rotationguide-10"
              className="rm-textarea"
              rows={2}
              value={form.safety_notes}
              onChange={(e) => setForm({ ...form, safety_notes: e.target.value })}
              placeholder="PPE required, hazards, special handling…"
            />
          </label>
          {error && (
            <div className="rm-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
          <div className="rm-actions">
            <button type="submit" className="rm-primary" disabled={saving}>
              <CheckCircle2 size={15} />
              {saving ? 'Saving…' : editing ? 'Update' : 'Add Procedure'}
            </button>
            <button type="button" className="rm-secondary" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────
   PROCEDURE CARD (unchanged)
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
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          <button className="icon-btn" onClick={() => onEdit(procedure)}>
            <Edit3 size={13} />
          </button>
          <button
            aria-label="Delete"
            className="icon-btn danger"
            onClick={() => onDelete(procedure.id)}
          >
            <Trash2 size={13} />
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
                <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
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
   EDITABLE SAFETY REMINDERS
───────────────────────────────────────────── */
function SafetyReminders({ sectionId, defaultSafety }) {
  const { user } = useAuth();
  const storageKey = `rotation_guide.safety.${sectionId}`;
  const [items, setItems] = useState(defaultSafety);
  const [loaded, setLoaded] = useState(false);
  const [addingIcon, setAddingIcon] = useState('ShieldCheck');
  const [addingText, setAddingText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editIcon, setEditIcon] = useState('');
  const [editText, setEditText] = useState('');

  useEffect(() => {
    setItems(defaultSafety);
    setLoaded(false);
  }, [sectionId, defaultSafety]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', storageKey)
        .maybeSingle();
      if (error) console.error('Load safety error:', error);
      if (Array.isArray(data?.value)) setItems(data.value);
      setLoaded(true);
    };
    load();
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!user?.id || !loaded) return;
    const save = async () => {
      const { error } = await supabase.from('user_settings').upsert(
        [
          {
            user_id: user.id,
            key: storageKey,
            value: items,
          },
        ],
        { onConflict: 'user_id,key' },
      );
      if (error) console.error('Save safety error:', error);
    };
    save();
  }, [items, loaded, storageKey, user?.id]);

  const addItem = () => {
    if (!addingText.trim()) return;
    setItems((prev) => [...prev, { icon: addingIcon, text: addingText.trim() }]);
    setAddingText('');
    setAddingIcon('ShieldCheck');
    setShowAdd(false);
  };

  const deleteItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditIcon(items[idx].icon);
    setEditText(items[idx].text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    setItems((prev) =>
      prev.map((item, i) => (i === editIdx ? { icon: editIcon, text: editText.trim() } : item)),
    );
    setEditIdx(null);
  };

  return (
    <div className="sg-wrap">
      <div className="sg-toolbar">
        <p className="sg-count">
          {items.length} reminder{items.length !== 1 ? 's' : ''}
        </p>
        <button
          className="sg-add-btn"

          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus size={13} /> Add Reminder
        </button>
      </div>
      {showAdd && (
        <div className="sg-add-form">
          <div className="sg-add-row">
            <SafetyIconPicker
              value={addingIcon}
              onChange={setAddingIcon}
              label="New reminder icon"
            />
            <input
              className="sg-text-input"
              value={addingText}
              onChange={(e) => setAddingText(e.target.value)}
              placeholder="Describe the safety reminder…"
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
            />
            <button
              aria-label="Confirm"
              className="sg-save-btn"

              onClick={addItem}
            >
              <Check size={13} />
            </button>
            <button
              aria-label="Close"
              className="sg-cancel-btn"
              onClick={() => {
                setShowAdd(false);
                setAddingText('');
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
      <div className="safety-grid">
        {items.map((item, i) => (
          <div key={i} className="safety-card">
            {editIdx === i ? (
              <div className="sg-edit-row">
                <SafetyIconPicker value={editIcon} onChange={setEditIcon} label="Reminder icon" />
                <input
                  className="sg-text-input small"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
                <button
                  aria-label="Confirm"
                  className="sg-save-btn"

                  onClick={saveEdit}
                >
                  <Check size={12} />
                </button>
                <button
                  aria-label="Close"
                  className="sg-cancel-btn"
                  onClick={() => setEditIdx(null)}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <span className="safety-icon">
                  <ThemedIcon name={item.icon} size={22} />
                </span>
                <p style={{ flex: 1 }}>{item.text}</p>
                <div className="sg-item-actions">
                  <button className="sg-item-btn" onClick={() => startEdit(i)}>
                    <Edit3 size={11} />
                  </button>
                  <button
                    aria-label="Delete"
                    className="sg-item-btn danger"
                    onClick={() => deleteItem(i)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   EDITABLE LEARNING OBJECTIVES
───────────────────────────────────────────── */
function LearningObjectives({ sectionId, defaultObjectives }) {
  const { user } = useAuth();
  const storageKey = `rotation_guide.objectives.${sectionId}`;
  const [items, setItems] = useState(defaultObjectives);
  const [loaded, setLoaded] = useState(false);
  const [addText, setAddText] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    setItems(defaultObjectives);
    setLoaded(false);
  }, [sectionId, defaultObjectives]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', storageKey)
        .maybeSingle();
      if (error) console.error('Load objectives error:', error);
      if (Array.isArray(data?.value)) setItems(data.value);
      setLoaded(true);
    };
    load();
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!user?.id || !loaded) return;
    const save = async () => {
      const { error } = await supabase.from('user_settings').upsert(
        [
          {
            user_id: user.id,
            key: storageKey,
            value: items,
          },
        ],
        { onConflict: 'user_id,key' },
      );
      if (error) console.error('Save objectives error:', error);
    };
    save();
  }, [items, loaded, storageKey, user?.id]);

  const addItem = () => {
    if (!addText.trim()) return;
    setItems((prev) => [...prev, addText.trim()]);
    setAddText('');
    setShowAdd(false);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    setItems((prev) => prev.map((item, i) => (i === editIdx ? editText.trim() : item)));
    setEditIdx(null);
  };

  const deleteItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="obj-wrap">
      <div className="sg-toolbar">
        <p className="sg-count">
          {items.length} objective{items.length !== 1 ? 's' : ''}
        </p>
        <button
          className="sg-add-btn"

          onClick={() => setShowAdd((v) => !v)}
        >
          <Plus size={13} /> Add Objective
        </button>
      </div>
      {showAdd && (
        <div className="sg-add-form">
          <div className="sg-add-row">
            <input
              className="sg-text-input"
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              placeholder="Describe the learning objective…"
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              autoFocus
            />
            <button
              aria-label="Confirm"
              className="sg-save-btn"

              onClick={addItem}
            >
              <Check size={13} />
            </button>
            <button
              aria-label="Close"
              className="sg-cancel-btn"
              onClick={() => {
                setShowAdd(false);
                setAddText('');
              }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}
      <ul className="objective-list">
        {items.map((obj, i) => (
          <li key={i} className="objective-item">
            <span className="obj-num">{i + 1}</span>
            {editIdx === i ? (
              <div className="sg-add-row" style={{ flex: 1 }}>
                <input
                  className="sg-text-input small"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
                <button
                  aria-label="Confirm"
                  className="sg-save-btn"

                  onClick={saveEdit}
                >
                  <Check size={12} />
                </button>
                <button
                  aria-label="Close"
                  className="sg-cancel-btn"
                  onClick={() => setEditIdx(null)}
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <span style={{ flex: 1 }}>{obj}</span>
                <div className="sg-item-actions">
                  <button
                    className="sg-item-btn"
                    onClick={() => {
                      setEditIdx(i);
                      setEditText(obj);
                    }}
                  >
                    <Edit3 size={11} />
                  </button>
                  <button
                    aria-label="Delete"
                    className="sg-item-btn danger"
                    onClick={() => deleteItem(i)}
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────────────────────
   SECTION PANEL (receives openProcedureModal callback)
───────────────────────────────────────────── */
function SectionPanel({ meta, onOpenProcedureModal }) {
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('procedures');

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

  const handleDelete = async (id) => {
    await supabase.from('procedures').delete().eq('id', id);
    setProcedures((prev) => prev.filter((p) => p.id !== id));
  };

  const filtered = procedures.filter(
    (p) =>
      p.procedure_name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase()),
  );

  const Icon = meta.icon;

  return (
    <div className="section-panel">
      <div className="panel-header">
        <div className="panel-icon-wrap">
          <Icon size={22} color="currentColor" />
        </div>
        <div>
          <h3>{meta.id}</h3>
          <p>{meta.overview}</p>
        </div>
      </div>

      <div className="sub-tabs">
        {[
          { id: 'procedures', label: `Procedures (${procedures.length})`, Icon: Layers },
          { id: 'safety', label: 'Safety Reminders', Icon: Shield },
          { id: 'overview', label: 'Objectives', Icon: Target },
        ].map((t) => (
          <button
            key={t.id}
            className={`sub-tab ${activeTab === t.id ? 'active' : ''}`}

            onClick={() => setActiveTab(t.id)}
          >
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

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
                <button aria-label="Close" className="search-clear" onClick={() => setSearch('')}>
                  <X size={12} />
                </button>
              )}
            </div>
            <button
              className="rg-primary-btn small"
              onClick={() => onOpenProcedureModal(meta.id, null)}
            >
              <Plus size={14} /> Add
            </button>
          </div>
          {loading ? (
            <div className="rg-empty">
              <p>Loading…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rg-empty">
              <p>{search ? `No match for "${search}"` : 'No procedures yet'}</p>
              {!search && (
                <button
                  className="rg-primary-btn small"
                  onClick={() => onOpenProcedureModal(meta.id, null)}
                >
                  <Plus size={14} /> Add First Procedure
                </button>
              )}
            </div>
          ) : (
            <div className="proc-list">
              {filtered.map((proc) => (
                <ProcedureCard
                  key={proc.id}
                  procedure={proc}
                  accentColor={meta.color}
                  onEdit={(p) => onOpenProcedureModal(meta.id, p)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'safety' && (
        <div className="tab-body">
          <SafetyReminders sectionId={meta.id} defaultSafety={meta.safety} color={meta.color} />
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="tab-body">
          <LearningObjectives
            sectionId={meta.id}
            defaultObjectives={meta.objectives}
            color={meta.color}
            grad={meta.bg}
          />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROCEDURES TAB (receives openProcedureModal callback)
───────────────────────────────────────────── */
function ProceduresTab({ sections, onOpenProcedureModal, onManageSections }) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');
  const activeMeta = sections.find((s) => s.id === activeSection) ?? sections[0];

  useEffect(() => {
    if (!sections.find((s) => s.id === activeSection) && sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  return (
    <div>
      <div className="pt-header-row">
        <p className="pt-header-label">Sections</p>
        <button className="pt-manage-link" onClick={onManageSections}>
          <Settings2 size={11} /> Edit Sections
        </button>
      </div>
      <div className="section-tabs">
        {sections.map((s) => {
          const SIcon = s.icon ?? BookOpen;
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              className={`section-tab ${isActive ? 'active' : ''}`}

              onClick={() => setActiveSection(s.id)}
            >
              <SIcon size={15} /> {s.label ?? s.id}
            </button>
          );
        })}
      </div>
      {activeMeta && <SectionPanel meta={activeMeta} onOpenProcedureModal={onOpenProcedureModal} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN ROTATION GUIDE
───────────────────────────────────────────── */
export default function RotationGuide() {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState('rotations');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionsLoaded, setSectionsLoaded] = useState(false);
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [loadError, setLoadError] = useState('');
  const [rotations, setRotations] = useState([]);
  const [rotationsLoading, setRotationsLoading] = useState(true);
  const [proceduresRefresh, setProceduresRefresh] = useState(0); // used to refresh procedure lists

  // Rotation modal state
  const [showRotationModal, setShowRotationModal] = useState(
    () => new URLSearchParams(window.location.search).get('new') === '1',
  );
  useQuickCreate(setShowRotationModal);
  const [editingRotation, setEditingRotation] = useState(null);

  // Procedure modal state
  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [procedureSection, setProcedureSection] = useState('');
  const [editingProcedure, setEditingProcedure] = useState(null);

  // Fetch rotations
  const fetchRotations = useCallback(async () => {
    if (!user?.id) return;
    setRotationsLoading(true);
    const { data, error } = await supabase
      .from('rotations')
      .select('*')
      .eq('user_id', user.id)
      .order('start_date', { ascending: true });
    if (!error) {
      setRotations(data ?? []);
      setLoadError('');
    } else
      setLoadError('Your rotations couldn’t load. Check your connection and refresh to try again.');
    setRotationsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchRotations();
  }, [fetchRotations]);

  // Load custom sections from Supabase
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('value')
          .eq('user_id', user.id)
          .eq('key', SECTION_STORAGE_KEY)
          .maybeSingle();
        if (error) {
          console.error('Load sections error:', error);
          setSections(DEFAULT_SECTIONS);

          return;
        }
        const saved = data?.value;
        if (Array.isArray(saved) && saved.length > 0) {
          const merged = saved.map((sv) => {
            const def = DEFAULT_SECTIONS.find((d) => d.id === sv.id);
            if (def) {
              return {
                ...def,
                color: sv.color ?? def.color,
                bg: sv.bg ?? def.bg,
                cardBg: sv.cardBg ?? def.cardBg,
                cardBorder: sv.cardBorder ?? def.cardBorder,
              };
            }
            const meta = generateSectionMeta(sv.id);
            return {
              id: sv.id,
              label: sv.id,
              icon: BookOpen,
              color: sv.color ?? meta.color,
              bg: sv.bg ?? meta.bg,
              cardBg: sv.cardBg ?? meta.cardBg,
              cardBorder: sv.cardBorder ?? meta.cardBorder,
              overview: `${sv.id} rotation section.`,
              objectives: [],
              safety: [],
            };
          });
          setSections(merged);
        } else {
          setSections(DEFAULT_SECTIONS);
        }
        setSectionsLoaded(true);
      } catch (err) {
        console.error('Unexpected load error:', err);
        setSections(DEFAULT_SECTIONS);
      }
    };
    load();
  }, [user?.id]);

  // Save custom sections whenever they change
  useEffect(() => {
    if (!user?.id || !sectionsLoaded) return;
    const save = async () => {
      const toSave = sections.map((s) => ({
        id: s.id,
        color: s.color,
        bg: s.bg,
        cardBg: s.cardBg,
        cardBorder: s.cardBorder,
      }));
      const { error } = await supabase.from('user_settings').upsert(
        [
          {
            user_id: user.id,
            key: SECTION_STORAGE_KEY,
            value: toSave,
          },
        ],
        { onConflict: 'user_id,key' },
      );
      if (error) console.error('Save sections error:', error);
    };
    save();
  }, [sections, sectionsLoaded, user?.id]);

  const handleAddSection = (label) => {
    const meta = generateSectionMeta(label);
    setSections((prev) => [
      ...prev,
      {
        id: label,
        label,
        icon: BookOpen,
        color: meta.color,
        bg: meta.bg,
        cardBg: meta.cardBg,
        cardBorder: meta.cardBorder,
        overview: `${label} rotation section.`,
        objectives: [],
        safety: [],
      },
    ]);
  };

  const handleRemoveSection = (id) => setSections((prev) => prev.filter((s) => s.id !== id));

  const handleColorChange = (id, color) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id !== id
          ? s
          : {
              ...s,
              color,
              bg: colorToGrad(color),
              cardBg: colorToSoftBg(color),
              cardBorder: color + '44',
            },
      ),
    );
  };

  const handleRotationSaved = (saved, isEdit) => {
    setRotations((prev) =>
      isEdit
        ? prev.map((r) => (r.id === saved.id ? saved : r))
        : [...prev, saved].sort((a, b) => a.start_date.localeCompare(b.start_date)),
    );
  };

  const handleDeleteRotation = async (id) => {
    const { error } = await supabase.from('rotations').delete().eq('id', id).eq('user_id', user.id);
    if (error) {
      setLoadError('The rotation couldn’t be deleted. Please try again.');
      return;
    }
    setRotations((prev) => prev.filter((r) => r.id !== id));
  };

  const handleProcedureSaved = () => {
    // Increment refresh counter to trigger re-fetch in SectionPanel
    setProceduresRefresh((prev) => prev + 1);
  };

  // Pass refresh key to ProceduresTab -> SectionPanel as a prop to re-fetch procedures
  // We'll add a key to SectionPanel that changes on each save.
  // But SectionPanel is inside ProceduresTab, which is inside RotationGuide. We can pass a refreshKey down.
  // Instead of complicating, I'll add a useEffect in SectionPanel that listens to a custom event,
  // but that would require modifying SectionPanel. The simpler way: pass refreshKey as a prop.
  // I'll modify ProceduresTab to accept a refreshKey prop and pass it to SectionPanel, which will use it in fetchProcedures dependency.
  // Actually, I'll just add a `key` to SectionPanel that changes on each save – that forces a remount and refetch.
  // But the SectionPanel for the active section would be recreated, which is fine.
  // However, the parent ProceduresTab would need to know about the refresh key. I'll implement that.

  return (
    <>
      <div className="rg-page">
        {loadError && (
          <p className="inline-error" role="alert">
            {loadError}
          </p>
        )}
        <div className="rg-header">
          <h1 className="rg-title">
            Rotation <span className="rg-title-accent">Guide</span>
          </h1>
          <p className="tool-page-description">
            Your training, one section at a time. Keep your rotations and learning guides together.
          </p>
        </div>

        <div className="rg-main-tabs">
          <button
            className={`rg-main-tab ${mainTab === 'rotations' ? 'active' : ''}`}
            onClick={() => setMainTab('rotations')}
          >
            <RotateCcw size={16} />
            <span className="rg-tab-copy">
              <span className="rg-tab-title">My Rotations</span>
            </span>
          </button>
          <button
            className={`rg-main-tab ${mainTab === 'procedures' ? 'active' : ''}`}
            onClick={() => setMainTab('procedures')}
          >
            <Microscope size={16} />
            <span className="rg-tab-copy">
              <span className="rg-tab-title">Procedure Guide</span>
            </span>
          </button>
        </div>

        {mainTab === 'rotations' && (
          <RotationsTab
            sections={sections}
            rotations={rotations}
            loading={rotationsLoading}
            onAddRotation={() => {
              setEditingRotation(null);
              setShowRotationModal(true);
            }}
            onEditRotation={(rot) => {
              setEditingRotation(rot);
              setShowRotationModal(true);
            }}
            onDeleteRotation={handleDeleteRotation}
            onManageSections={() => setShowSectionModal(true)}
          />
        )}

        {mainTab === 'procedures' && (
          <ProceduresTab
            key={proceduresRefresh}
            sections={sections}
            onManageSections={() => setShowSectionModal(true)}
            onOpenProcedureModal={(section, procedure) => {
              setProcedureSection(section);
              setEditingProcedure(procedure);
              setShowProcedureModal(true);
            }}
          />
        )}
      </div>

      {/* Global Modals - rendered outside .rg-page to ensure fixed positioning */}
      {showRotationModal && (
        <RotationModal
          editing={editingRotation}
          existingRotations={rotations}
          sections={sections}
          onClose={() => {
            setShowRotationModal(false);
            setEditingRotation(null);
          }}
          onSaved={handleRotationSaved}
        />
      )}

      {showProcedureModal && (
        <ProcedureModal
          section={procedureSection}
          editing={editingProcedure}
          onClose={() => {
            setShowProcedureModal(false);
            setEditingProcedure(null);
            setProcedureSection('');
          }}
          onSaved={handleProcedureSaved}
        />
      )}

      {showSectionModal && (
        <ManageSectionsModal
          sections={sections}
          onAdd={handleAddSection}
          onRemove={handleRemoveSection}
          onColorChange={handleColorChange}
          onClose={() => setShowSectionModal(false)}
        />
      )}
    </>
  );
}
