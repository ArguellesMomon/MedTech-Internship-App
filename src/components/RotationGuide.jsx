import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import {
  Plus, Edit3, Trash2, ChevronDown, ChevronUp,
  Search, FlaskConical, Droplets, Microscope,
  Heart, BookOpen, X, AlertTriangle, CheckCircle2,
  Calendar, MapPin, User, Clock, Layers,
  Shield, Target, RotateCcw, Settings2, Sparkles,
  ChevronRight, TrendingUp, Award, Check,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   CONSTANTS & STORAGE KEYS
───────────────────────────────────────────── */
const SECTION_STORAGE_KEY = 'rotation_guide.sections';

const SECTION_COLOR_PRESETS = [
  '#ff6f91','#ff8c5a','#5f8dff','#e05555','#4abf95',
  '#8b6fff','#26c6da','#f6b45f','#b071ec','#54c58e',
];

const DEFAULT_SECTIONS = [
  {
    id: 'Hematology', label: 'Hematology', icon: Droplets,
    color: '#ff6f91', bg: 'linear-gradient(135deg,#ff8fb1,#ff6f91)',
    cardBg: '#fff0f4', cardBorder: '#ffd6e1',
    overview: 'Study of blood, blood-forming organs, and blood diseases. Covers CBC, peripheral blood smears, coagulation studies, and bone marrow analysis.',
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
    id: 'Clinical Chemistry', label: 'Clin. Chemistry', icon: FlaskConical,
    color: '#ff9f5a', bg: 'linear-gradient(135deg,#ffb37a,#ff8c5a)',
    cardBg: '#fff5ee', cardBorder: '#ffd6b8',
    overview: 'Quantitative analysis of body fluids to assess organ function. Includes liver enzymes, kidney panels, glucose, lipid profiles, and electrolytes.',
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
    id: 'Microbiology', label: 'Microbiology', icon: Microscope,
    color: '#5f8dff', bg: 'linear-gradient(135deg,#7ab6ff,#5f8dff)',
    cardBg: '#eff4ff', cardBorder: '#c5d9ff',
    overview: 'Identification of pathogenic microorganisms from clinical specimens. Covers culture, sensitivity testing, Gram staining, and identification of bacteria, fungi, and parasites.',
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
    id: 'Blood Bank', label: 'Blood Bank', icon: Heart,
    color: '#e05555', bg: 'linear-gradient(135deg,#ff8f8f,#e05555)',
    cardBg: '#fff0f0', cardBorder: '#ffcaca',
    overview: 'Blood typing, compatibility testing, and blood product management. Ensures safe transfusion practices through rigorous crossmatching, donor screening, and component preparation.',
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
    id: 'Histopathology/Cytology', label: 'Histo/Cyto', icon: BookOpen,
    color: '#4abf95', bg: 'linear-gradient(135deg,#6dd6b1,#4abf95)',
    cardBg: '#edfaf4', cardBorder: '#b8f0da',
    overview: 'Microscopic examination of tissues and cells for disease diagnosis. Covers tissue processing, microtomy, H&E staining, special stains, and cytological preparations.',
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
   HELPERS
───────────────────────────────────────────── */
function colorToSoftBg(hex) {
  const c = hex.replace('#','');
  if (c.length !== 6) return '#fff0f4';
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  const mix = v => Math.round(v + (255-v)*0.88).toString(16).padStart(2,'0');
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

function colorToGrad(hex) {
  return `linear-gradient(135deg,${hex}cc,${hex})`;
}

function generateSectionMeta(name) {
  const hash = name.split('').reduce((a,c) => c.charCodeAt(0)+((a<<5)-a),0);
  const color = SECTION_COLOR_PRESETS[Math.abs(hash) % SECTION_COLOR_PRESETS.length];
  return { color, bg: colorToGrad(color), cardBg: colorToSoftBg(color), cardBorder: color + '44' };
}

function getRotationStatus(r) {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(r.start_date+'T00:00:00');
  const end   = new Date(r.end_date  +'T00:00:00');
  if (today >= start && today <= end) return 'active';
  if (today < start)                  return 'upcoming';
  return 'completed';
}

function getDaysLeft(endDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(endDate+'T00:00:00') - today) / 86400000);
}

function getDaysUntil(startDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.ceil((new Date(startDate+'T00:00:00') - today) / 86400000);
}

function formatDate(dateStr) {
  return new Date(dateStr+'T12:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' });
}

function formatDateShort(dateStr) {
  return new Date(dateStr+'T12:00:00').toLocaleDateString(undefined, { month:'short', day:'numeric' });
}

function getDuration(start, end) {
  const s = new Date(start+'T00:00:00'), e = new Date(end+'T00:00:00');
  const days = Math.ceil((e-s)/86400000)+1;
  if (days >= 7) return `${Math.round(days/7)} wk${Math.round(days/7)!==1?'s':''}`;
  return `${days} day${days!==1?'s':''}`;
}

/* ─────────────────────────────────────────────
   MANAGE SECTIONS MODAL
───────────────────────────────────────────── */
function ManageSectionsModal({ sections, onAdd, onRemove, onColorChange, onClose }) {
  const [name,      setName]      = useState('');
  const [error,     setError]     = useState('');
  const [removing,  setRemoving]  = useState(null);

  const handleAdd = () => {
    const label = name.trim();
    if (!label) { setError('Enter a section name.'); return; }
    if (sections.some(s => s.id.toLowerCase() === label.toLowerCase())) { setError('Section already exists.'); return; }
    onAdd(label); setName(''); setError('');
  };

  return (
    <div className="msm-overlay" onClick={onClose}>
      <div className="msm-modal" onClick={e => e.stopPropagation()}>
        <div className="msm-head">
          <div className="msm-head-left">
            <div className="msm-head-icon"><Settings2 size={18} /></div>
            <div>
              <h3 className="msm-title">Manage Sections</h3>
              <p className="msm-sub">Add, recolor, or remove rotation sections</p>
            </div>
          </div>
          <button className="msm-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="msm-add-box">
          <p className="msm-box-label">New Section</p>
          <div className="msm-add-row">
            <input className="msm-input" placeholder="e.g. Immunology, Parasitology…"
              value={name} onChange={e => { setName(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleAdd()} maxLength={40} autoFocus />
            <button className="msm-add-btn" onClick={handleAdd}><Plus size={14} /> Add</button>
          </div>
          {error && <p className="msm-error">{error}</p>}
        </div>

        <div>
          <p className="msm-box-label">
            Sections <span className="msm-count">{sections.length}</span>
          </p>

          {sections.length === 0 ? (
            <div className="msm-empty"><span style={{fontSize:28}}>🗂️</span><p>No sections yet.</p></div>
          ) : (
            <div className="msm-list">
              {sections.map(sec => {
                const isRem  = removing  === sec.id;
                return (
                  <div key={sec.id} className={`msm-row ${isRem ? 'msm-row-rem' : ''}`}>
                    <div className="msm-row-main">
                      <div className="msm-sec-pill"
                        style={{ background: sec.cardBg || colorToSoftBg(sec.color), color: sec.color, borderColor: sec.color+'55' }}>
                        <span className="msm-dot" style={{ background: sec.color }} />
                        {sec.id}
                      </div>

                      <label className="msm-color-ctrl" title="Change color">
                        <span className="msm-color-swatch" style={{ background: sec.color }} />
                        <input type="color" value={sec.color} onChange={e => onColorChange(sec.id, e.target.value)} />
                      </label>
                    </div>

                    {isRem ? (
                      <div className="msm-confirm">
                        <span>Remove?</span>
                        <button className="msm-yes" onClick={() => { onRemove(sec.id); setRemoving(null); }}>Yes</button>
                        <button className="msm-no"  onClick={() => setRemoving(null)}>No</button>
                      </div>
                    ) : (
                      <button className="msm-rm-btn" onClick={() => setRemoving(sec.id)}><Trash2 size={12} /> Remove</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="msm-note">
          <Sparkles size={12} style={{ color:'#ff8fb1', flexShrink:0 }} />
          Removing a section hides it from new rotations and the procedure guide. Existing records keep their saved label.
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATION MODAL  — NoteSection bottom-sheet style
───────────────────────────────────────────── */
function RotationModal({ editing, existingRotations, sections, onClose, onSaved }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    section_name:    editing?.section_name    ?? '',
    hospital_site:   editing?.hospital_site   ?? '',
    start_date:      editing?.start_date      ?? '',
    end_date:        editing?.end_date        ?? '',
    supervisor_name: editing?.supervisor_name ?? '',
    notes:           editing?.notes           ?? '',
  });
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [customName, setCustomName] = useState(
    editing && !sections.some(s => s.id === editing.section_name) ? editing.section_name : ''
  );
  const [showCustom, setShowCustom] = useState(
    editing && !sections.some(s => s.id === editing.section_name)
  );

  /* Derive accent color from selected section */
  const secMeta     = sections.find(s => s.id === form.section_name);
  const accentColor = secMeta?.color ?? '#ff6f91';
  const accentGrad  = secMeta?.bg   ?? 'linear-gradient(135deg,#ff8fb1,#ff6f91)';

  const handleSectionPill = (id) => {
    if (id === '__custom__') {
      setShowCustom(true);
      setForm({ ...form, section_name: customName });
    } else {
      setShowCustom(false);
      setForm({ ...form, section_name: id });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    const sectionName = showCustom ? customName.trim() : form.section_name;
    if (!sectionName) { setError('Please select or enter a section.'); return; }
    if (new Date(form.start_date) >= new Date(form.end_date)) { setError('End date must be after start date.'); return; }
    const newStart = new Date(form.start_date+'T00:00:00'), newEnd = new Date(form.end_date+'T00:00:00');
    const overlaps = existingRotations.filter(r => {
      if (editing && r.id === editing.id) return false;
      const rStart = new Date(r.start_date+'T00:00:00'), rEnd = new Date(r.end_date+'T00:00:00');
      return newStart <= rEnd && newEnd >= rStart;
    });
    if (overlaps.length > 0) {
      const o = overlaps[0];
      setError(`Overlaps with "${o.section_name}" (${formatDate(o.start_date)} – ${formatDate(o.end_date)}).`);
      return;
    }
    setSaving(true);
    const payload = { ...form, section_name: sectionName };
    const result = editing
      ? await supabase.from('rotations').update(payload).eq('id',editing.id).select().single()
      : await supabase.from('rotations').insert([{ ...payload, user_id: user.id }]).select().single();
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing)); onClose();
  };

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-sheet" onClick={e => e.stopPropagation()}>

        {/* Colored header — matches NoteModal */}
        <div className="rm-header" style={{ background: accentGrad }}>
          <div className="rm-header-left">
            <div className="rm-header-icon">
              {editing ? <Edit3 size={16} color="white" /> : <Plus size={16} color="white" />}
            </div>
            <span className="rm-header-title">
              {editing ? 'Edit Rotation' : 'New Rotation'}
            </span>
          </div>
          <button className="rm-header-close" onClick={onClose}><X size={17} /></button>
        </div>

        <form onSubmit={handleSubmit} className="rm-body">

          {/* Section pills — matches NoteModal nm-sec-pills */}
          <div>
            <p className="rm-label-text">Section</p>
            <div className="rm-sec-pills">
              {sections.map(s => {
                const on = !showCustom && form.section_name === s.id;
                return (
                  <button key={s.id} type="button" className="rm-sec-pill"
                    style={on
                      ? { background: s.color, borderColor: s.color, color: '#fff', boxShadow: `0 4px 12px ${s.color}44` }
                      : { borderColor: s.color + '55', color: s.color }}
                    onClick={() => handleSectionPill(s.id)}>
                    {s.label ?? s.id}
                  </button>
                );
              })}
              <button type="button" className="rm-sec-pill"
                style={showCustom
                  ? { background: '#888', borderColor: '#888', color: '#fff' }
                  : { borderColor: '#ccc', color: '#999' }}
                onClick={() => handleSectionPill('__custom__')}>
                Other…
              </button>
            </div>
            {showCustom && (
              <input className="rm-input" style={{ marginTop: 10 }}
                placeholder="Type section name…" value={customName}
                onChange={e => { setCustomName(e.target.value); setForm({ ...form, section_name: e.target.value }); }}
                autoFocus />
            )}
          </div>

          {/* Hospital / Site */}
          <label className="rm-field-label">
            Hospital / Site
            <input className="rm-input" value={form.hospital_site}
              style={{ '--a': accentColor }}
              onChange={e => setForm({...form, hospital_site: e.target.value})}
              placeholder="e.g. Perpetual Help Medical Center" />
          </label>

          {/* Date row */}
          <div className="rm-date-row">
            <label className="rm-field-label">
              Start Date *
              <input type="date" className="rm-input" value={form.start_date}
                style={{ '--a': accentColor }}
                onChange={e => setForm({...form, start_date: e.target.value})} required />
            </label>
            <label className="rm-field-label">
              End Date *
              <input type="date" className="rm-input" value={form.end_date}
                style={{ '--a': accentColor }}
                onChange={e => setForm({...form, end_date: e.target.value})} required />
            </label>
          </div>

          {/* Duration preview */}
          {form.start_date && form.end_date && new Date(form.start_date) < new Date(form.end_date) && (
            <div className="rm-duration-chip" style={{ background: colorToSoftBg(accentColor), color: accentColor, borderColor: accentColor + '33' }}>
              <Clock size={13} />
              Duration: <strong>{getDuration(form.start_date, form.end_date)}</strong>
            </div>
          )}

          {/* Supervisor */}
          <label className="rm-field-label">
            Supervisor
            <input className="rm-input" value={form.supervisor_name}
              style={{ '--a': accentColor }}
              onChange={e => setForm({...form, supervisor_name: e.target.value})}
              placeholder="e.g. Dr. Santos, RMT" />
          </label>

          {/* Notes */}
          <label className="rm-field-label">
            Notes
            <textarea className="rm-textarea" rows={3} value={form.notes}
              style={{ '--a': accentColor }}
              onChange={e => setForm({...form, notes: e.target.value})}
              placeholder="Any reminders or details…" />
          </label>

          {error && (
            <div className="rm-error"><AlertTriangle size={14} style={{flexShrink:0,marginTop:1}} /><span>{error}</span></div>
          )}

          <div className="rm-actions">
            <button type="submit" className="rm-submit"
              style={{ background: accentGrad }}
              disabled={saving}>
              <Check size={15} />
              {saving ? 'Saving…' : editing ? 'Update Rotation' : 'Add Rotation'}
            </button>
            <button type="button" className="rm-cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATION CARD — redesigned
───────────────────────────────────────────── */
function RotationCard({ rotation, sections, onEdit, onDelete }) {
  const status    = getRotationStatus(rotation);
  const daysLeft  = getDaysLeft(rotation.end_date);
  const daysUntil = getDaysUntil(rotation.start_date);
  const duration  = getDuration(rotation.start_date, rotation.end_date);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const secMeta = sections.find(s => s.id === rotation.section_name);
  const color   = secMeta?.color ?? '#ff6f91';
  const grad    = secMeta?.bg    ?? 'linear-gradient(135deg,#ff8fb1,#ff6f91)';
  const cardBg  = secMeta?.cardBg ?? '#fff0f4';

  const statusConfig = {
    active:    { label:'Active Now',  dotColor:'#4abf95', textColor:'#2e9e6e', bgColor:'#edfaf4', pulse:true  },
    upcoming:  { label:'Upcoming',    dotColor:'#5f8dff', textColor:'#3d6fcc', bgColor:'#eff4ff', pulse:false },
    completed: { label:'Completed',   dotColor:'#bbb',    textColor:'#999',    bgColor:'#f5f5f5', pulse:false },
  };
  const sc = statusConfig[status];

  const progressPct = useMemo(() => {
    if (status !== 'active') return null;
    const start = new Date(rotation.start_date+'T00:00:00');
    const end   = new Date(rotation.end_date  +'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const total = (end - start) / 86400000;
    const done  = (today - start) / 86400000;
    return Math.min(100, Math.max(0, Math.round((done/total)*100)));
  }, [rotation, status]);

  return (
    <div className={`rc-card ${status}`} style={{ '--sec-color': color, '--sec-cardBg': cardBg }}>
      {/* Top gradient strip */}
      <div className="rc-strip" style={{ background: grad }} />

      <div className="rc-body">
        {/* Status + actions row */}
        <div className="rc-top-row">
          <div className="rc-status-badge" style={{ background: sc.bgColor, color: sc.textColor }}>
            <span className="rc-badge-dot" style={{ background: sc.dotColor }}>
              {sc.pulse && <span className="rc-pulse-ring" />}
            </span>
            {sc.label}
          </div>
          <div className="rc-actions-row">
            <button className="rc-icon-btn" onClick={() => onEdit(rotation)} title="Edit"><Edit3 size={13} /></button>
            {confirmDelete ? (
              <div className="rc-confirm-row">
                <span>Remove?</span>
                <button className="rc-confirm-yes" onClick={() => onDelete(rotation.id)}>Yes</button>
                <button className="rc-confirm-no" onClick={() => setConfirmDelete(false)}>No</button>
              </div>
            ) : (
              <button className="rc-icon-btn danger" onClick={() => setConfirmDelete(true)} title="Delete"><Trash2 size={13} /></button>
            )}
          </div>
        </div>

        {/* Section name */}
        <h4 className="rc-section-name" style={{ color }}>{rotation.section_name}</h4>

        {/* Info rows */}
        <div className="rc-info-stack">
          {rotation.hospital_site && (
            <div className="rc-info-row">
              <MapPin size={13} style={{ color, opacity:0.7, flexShrink:0 }} />
              <span>{rotation.hospital_site}</span>
            </div>
          )}
          <div className="rc-info-row">
            <Calendar size={13} style={{ color, opacity:0.7, flexShrink:0 }} />
            <span>{formatDateShort(rotation.start_date)} → {formatDateShort(rotation.end_date)}</span>
            <span className="rc-duration-chip" style={{ background: cardBg, color, borderColor: color+'33' }}>{duration}</span>
          </div>
          {rotation.supervisor_name && (
            <div className="rc-info-row">
              <User size={13} style={{ color, opacity:0.7, flexShrink:0 }} />
              <span>{rotation.supervisor_name}</span>
            </div>
          )}
        </div>

        {/* Active progress */}
        {status === 'active' && progressPct !== null && (
          <div className="rc-progress-block">
            <div className="rc-progress-header">
              <span>Rotation Progress</span>
              <span style={{ color, fontWeight:700 }}>{progressPct}%</span>
            </div>
            <div className="rc-progress-track">
              <div className="rc-progress-fill" style={{ width:`${progressPct}%`, background: grad }} />
            </div>
            <p className="rc-days-remaining" style={{ color }}>
              {daysLeft === 0 ? '🎉 Last day!' : `${daysLeft} day${daysLeft!==1?'s':''} remaining`}
            </p>
          </div>
        )}

        {/* Upcoming chip */}
        {status === 'upcoming' && (
          <div className="rc-upcoming-tag" style={{ background: '#eff4ff', color:'#5f8dff', borderColor:'#c5d9ff' }}>
            <Clock size={12} /> Starts in {daysUntil} day{daysUntil!==1?'s':''}
          </div>
        )}

        {rotation.notes && <p className="rc-notes-text">📝 {rotation.notes}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATIONS STATS — NoteSection grid style
───────────────────────────────────────────── */
function RotationsStats({ rotations }) {
  const active    = rotations.filter(r => getRotationStatus(r) === 'active').length;
  const upcoming  = rotations.filter(r => getRotationStatus(r) === 'upcoming').length;
  const completed = rotations.filter(r => getRotationStatus(r) === 'completed').length;

  return (
    <div className="rs-stats">
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: '#4abf95' }}>{active}</span>
        <span className="rs-stat-l">Active</span>
      </div>
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: '#5f8dff' }}>{upcoming}</span>
        <span className="rs-stat-l">Upcoming</span>
      </div>
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: '#aaa' }}>{completed}</span>
        <span className="rs-stat-l">Completed</span>
      </div>
      <div className="rs-stat">
        <span className="rs-stat-n" style={{ color: '#ff5d8f' }}>{rotations.length}</span>
        <span className="rs-stat-l">Total</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   ROTATIONS TAB
───────────────────────────────────────────── */
function RotationsTab({ sections, onManageSections }) {
  const { user } = useAuth();
  const [rotations, setRotations] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);

  const fetchRotations = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rotations').select('*').eq('user_id', user.id)
      .order('start_date', { ascending: true });
    if (!error) setRotations(data ?? []);
    setLoading(false);
  }, [user.id]);

  useEffect(() => { fetchRotations(); }, [fetchRotations]);

  const handleSaved = (saved, isEdit) => {
    setRotations(prev => isEdit
      ? prev.map(r => r.id===saved.id ? saved : r)
      : [...prev, saved].sort((a,b) => a.start_date.localeCompare(b.start_date)));
  };

  const handleDelete = async (id) => {
    await supabase.from('rotations').delete().eq('id', id);
    setRotations(prev => prev.filter(r => r.id !== id));
  };

  const active    = rotations.filter(r => getRotationStatus(r) === 'active');
  const upcoming  = rotations.filter(r => getRotationStatus(r) === 'upcoming');
  const completed = rotations.filter(r => getRotationStatus(r) === 'completed');

  return (
    <div className="rt-wrap">
      {/* Toolbar */}
      <div className="rt-toolbar">
        <div className="rt-toolbar-actions">
          <button className="rg-manage-btn" onClick={onManageSections}>
            <Settings2 size={14} /> Manage Sections
          </button>
          <button className="rg-primary-btn" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={15} /> Add Rotation
          </button>
        </div>
      </div>

      {rotations.length > 0 && <RotationsStats rotations={rotations} />}

      {loading ? (
        <div className="rg-empty"><div className="rg-empty-spinner" /><p>Loading rotations…</p></div>
      ) : rotations.length === 0 ? (
        <div className="rg-empty-hero">
          <div className="rg-empty-hero-icon">🏥</div>
          <h3>No rotations yet</h3>
          <p>Add your first rotation to start tracking your clinical internship journey.</p>
          <button className="rg-primary-btn" onClick={() => { setEditing(null); setShowModal(true); }}>
            <Plus size={15} /> Add Your First Rotation
          </button>
        </div>
      ) : (
        <div className="rt-sections">
          {active.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{background:'#4abf95', boxShadow:'0 0 0 3px rgba(74,191,149,0.22)'}} />
                <span style={{color:'#4abf95'}}>Active Rotation</span>
              </div>
              <div className="rt-cards-grid">
                {active.map(r => (
                  <RotationCard key={r.id} rotation={r} sections={sections}
                    onEdit={rot => { setEditing(rot); setShowModal(true); }} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{background:'#5f8dff'}} />
                <span style={{color:'#5f8dff'}}>Upcoming ({upcoming.length})</span>
              </div>
              <div className="rt-cards-grid">
                {upcoming.map(r => (
                  <RotationCard key={r.id} rotation={r} sections={sections}
                    onEdit={rot => { setEditing(rot); setShowModal(true); }} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="rt-group">
              <div className="rt-group-label">
                <span className="rt-group-dot" style={{background:'#ccc'}} />
                <span style={{color:'#aaa'}}>Completed ({completed.length})</span>
              </div>
              <div className="rt-cards-grid">
                {completed.map(r => (
                  <RotationCard key={r.id} rotation={r} sections={sections}
                    onEdit={rot => { setEditing(rot); setShowModal(true); }} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <RotationModal editing={editing} existingRotations={rotations} sections={sections}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={handleSaved} />
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
      result = await supabase.from('procedures').update({...form}).eq('id',editing.id).select().single();
    } else {
      result = await supabase.from('procedures').insert([{...form, section_name:section}]).select().single();
    }
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    onSaved(result.data, Boolean(editing)); onClose();
  };

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-modal" onClick={e => e.stopPropagation()}>
        <div className="rm-header-old">
          <div className="rm-header-left-old">
            <div className="rm-header-icon-old" style={{ background:'linear-gradient(135deg,#ff8fb1,#ff6f91)' }}>
              <Layers size={18} />
            </div>
            <div>
              <h3 className="rm-title-old">{editing ? 'Edit Procedure' : 'Add Procedure'}</h3>
              <p className="rm-sub-old">Document clinical technique</p>
            </div>
          </div>
          <button className="rm-close-old" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="rm-form-old">
          <label className="rm-label-old">
            Procedure Name *
            <input className="rm-input-old" value={form.procedure_name}
              onChange={e => setForm({...form, procedure_name: e.target.value})}
              placeholder="e.g. Complete Blood Count" required />
          </label>
          <label className="rm-label-old">
            Description
            <textarea className="rm-textarea-old" rows={3} value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Steps, purpose, expected values…" />
          </label>
          <label className="rm-label-old">
            Safety Notes
            <textarea className="rm-textarea-old" rows={2} value={form.safety_notes}
              onChange={e => setForm({...form, safety_notes: e.target.value})}
              placeholder="PPE required, hazards, special handling…" />
          </label>
          {error && <div className="rm-error-old"><AlertTriangle size={14} /><span>{error}</span></div>}
          <div className="rm-actions-old">
            <button type="submit" className="rm-primary-old" disabled={saving}>
              <CheckCircle2 size={15} />{saving ? 'Saving…' : editing ? 'Update' : 'Add Procedure'}
            </button>
            <button type="button" className="rm-secondary-old" onClick={onClose}>Cancel</button>
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
    <div className={`proc-card ${expanded?'expanded':''}`}>
      <div className="proc-top">
        <div className="proc-name-row">
          <span className="proc-dot" style={{background:accentColor}} />
          <strong>{procedure.procedure_name}</strong>
        </div>
        <div className="proc-controls">
          {hasDetails && (
            <button className="icon-btn expand-btn" onClick={() => setExpanded(v=>!v)}>
              {expanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
            </button>
          )}
          <button className="icon-btn" onClick={() => onEdit(procedure)}><Edit3 size={13}/></button>
          <button className="icon-btn danger" onClick={() => onDelete(procedure.id)}><Trash2 size={13}/></button>
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
              <span className="detail-label"><AlertTriangle size={11} style={{display:'inline',marginRight:4}} />Safety Notes</span>
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
function SafetyReminders({ sectionId, defaultSafety, color }) {
  const { user } = useAuth();
  const storageKey = `rotation_guide.safety.${sectionId}`;
  const [items,      setItems]    = useState(defaultSafety);
  const [loaded,     setLoaded]   = useState(false);
  const [addingIcon, setAddingIcon] = useState('🛡️');
  const [addingText, setAddingText] = useState('');
  const [showAdd,    setShowAdd]   = useState(false);
  const [editIdx,    setEditIdx]   = useState(null);
  const [editIcon,   setEditIcon]  = useState('');
  const [editText,   setEditText]  = useState('');

  useEffect(() => {
    setItems(defaultSafety);
    setLoaded(false);
  }, [sectionId, defaultSafety]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', storageKey)
        .maybeSingle();
      if (Array.isArray(data?.value)) setItems(data.value);
      setLoaded(true);
    };
    load();
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!user?.id || !loaded) return;
    supabase.from('user_settings').upsert([{
      user_id: user.id,
      key: storageKey,
      value: items,
    }], { onConflict: 'user_id,key' });
  }, [items, loaded, storageKey, user?.id]);

  const addItem = () => {
    if (!addingText.trim()) return;
    setItems(prev => [...prev, { icon: addingIcon, text: addingText.trim() }]);
    setAddingText(''); setAddingIcon('🛡️'); setShowAdd(false);
  };

  const deleteItem = (idx) => setItems(prev => prev.filter((_,i) => i !== idx));

  const startEdit = (idx) => {
    setEditIdx(idx); setEditIcon(items[idx].icon); setEditText(items[idx].text);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    setItems(prev => prev.map((item,i) => i===editIdx ? { icon:editIcon, text:editText.trim() } : item));
    setEditIdx(null);
  };

  return (
    <div className="sg-wrap">
      <div className="sg-toolbar">
        <p className="sg-count">{items.length} reminder{items.length!==1?'s':''}</p>
        <button className="sg-add-btn" style={{background:color}} onClick={() => setShowAdd(v=>!v)}>
          <Plus size={13}/> Add Reminder
        </button>
      </div>

      {showAdd && (
        <div className="sg-add-form">
          <div className="sg-add-row">
            <input className="sg-icon-input" value={addingIcon}
              onChange={e => setAddingIcon(e.target.value)} placeholder="🛡️" maxLength={4} />
            <input className="sg-text-input" value={addingText}
              onChange={e => setAddingText(e.target.value)}
              placeholder="Describe the safety reminder…"
              onKeyDown={e => e.key==='Enter' && addItem()} />
            <button className="sg-save-btn" style={{background:color}} onClick={addItem}><Check size={13}/></button>
            <button className="sg-cancel-btn" onClick={() => { setShowAdd(false); setAddingText(''); }}><X size={13}/></button>
          </div>
        </div>
      )}

      <div className="safety-grid">
        {items.map((item, i) => (
          <div key={i} className="safety-card">
            {editIdx === i ? (
              <div className="sg-edit-row">
                <input className="sg-icon-input small" value={editIcon}
                  onChange={e => setEditIcon(e.target.value)} maxLength={4} />
                <input className="sg-text-input small" value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && saveEdit()} autoFocus />
                <button className="sg-save-btn" style={{background:color}} onClick={saveEdit}><Check size={12}/></button>
                <button className="sg-cancel-btn" onClick={() => setEditIdx(null)}><X size={12}/></button>
              </div>
            ) : (
              <>
                <span className="safety-emoji">{item.icon}</span>
                <p style={{flex:1}}>{item.text}</p>
                <div className="sg-item-actions">
                  <button className="sg-item-btn" onClick={() => startEdit(i)}><Edit3 size={11}/></button>
                  <button className="sg-item-btn danger" onClick={() => deleteItem(i)}><Trash2 size={11}/></button>
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
function LearningObjectives({ sectionId, defaultObjectives, color, grad }) {
  const { user } = useAuth();
  const storageKey = `rotation_guide.objectives.${sectionId}`;
  const [items,    setItems]   = useState(defaultObjectives);
  const [loaded,   setLoaded]  = useState(false);
  const [addText,  setAddText] = useState('');
  const [showAdd,  setShowAdd] = useState(false);
  const [editIdx,  setEditIdx] = useState(null);
  const [editText, setEditText]= useState('');

  useEffect(() => {
    setItems(defaultObjectives);
    setLoaded(false);
  }, [sectionId, defaultObjectives]);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', storageKey)
        .maybeSingle();
      if (Array.isArray(data?.value)) setItems(data.value);
      setLoaded(true);
    };
    load();
  }, [user?.id, storageKey]);

  useEffect(() => {
    if (!user?.id || !loaded) return;
    supabase.from('user_settings').upsert([{
      user_id: user.id,
      key: storageKey,
      value: items,
    }], { onConflict: 'user_id,key' });
  }, [items, loaded, storageKey, user?.id]);

  const addItem = () => {
    if (!addText.trim()) return;
    setItems(prev => [...prev, addText.trim()]);
    setAddText(''); setShowAdd(false);
  };

  const saveEdit = () => {
    if (!editText.trim()) return;
    setItems(prev => prev.map((item,i) => i===editIdx ? editText.trim() : item));
    setEditIdx(null);
  };

  const deleteItem = (idx) => setItems(prev => prev.filter((_,i) => i !== idx));

  return (
    <div className="obj-wrap">
      <div className="sg-toolbar">
        <p className="sg-count">{items.length} objective{items.length!==1?'s':''}</p>
        <button className="sg-add-btn" style={{background:color}} onClick={() => setShowAdd(v=>!v)}>
          <Plus size={13}/> Add Objective
        </button>
      </div>

      {showAdd && (
        <div className="sg-add-form">
          <div className="sg-add-row">
            <input className="sg-text-input" value={addText}
              onChange={e => setAddText(e.target.value)}
              placeholder="Describe the learning objective…"
              onKeyDown={e => e.key==='Enter' && addItem()} autoFocus />
            <button className="sg-save-btn" style={{background:color}} onClick={addItem}><Check size={13}/></button>
            <button className="sg-cancel-btn" onClick={() => { setShowAdd(false); setAddText(''); }}><X size={13}/></button>
          </div>
        </div>
      )}

      <ul className="objective-list">
        {items.map((obj, i) => (
          <li key={i} className="objective-item">
            <span className="obj-num" style={{background:grad}}>{i+1}</span>
            {editIdx === i ? (
              <div className="sg-add-row" style={{flex:1}}>
                <input className="sg-text-input small" value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && saveEdit()} autoFocus />
                <button className="sg-save-btn" style={{background:color}} onClick={saveEdit}><Check size={12}/></button>
                <button className="sg-cancel-btn" onClick={() => setEditIdx(null)}><X size={12}/></button>
              </div>
            ) : (
              <>
                <span style={{flex:1}}>{obj}</span>
                <div className="sg-item-actions">
                  <button className="sg-item-btn" onClick={() => { setEditIdx(i); setEditText(obj); }}><Edit3 size={11}/></button>
                  <button className="sg-item-btn danger" onClick={() => deleteItem(i)}><Trash2 size={11}/></button>
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
   SECTION PANEL (procedures guide)
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
    setProcedures(prev => isEdit ? prev.map(p => p.id===saved.id ? saved : p) : [...prev, saved]);
  };

  const handleDelete = async (id) => {
    await supabase.from('procedures').delete().eq('id', id);
    setProcedures(prev => prev.filter(p => p.id !== id));
  };

  const filtered = procedures.filter(p =>
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
          { id:'procedures', label:`Procedures (${procedures.length})`, Icon:Layers  },
          { id:'safety',     label:'Safety Reminders',                  Icon:Shield  },
          { id:'overview',   label:'Objectives',                        Icon:Target  },
        ].map(t => (
          <button key={t.id}
            className={`sub-tab ${activeTab===t.id?'active':''}`}
            style={activeTab===t.id ? { borderBottomColor:meta.color, color:meta.color } : {}}
            onClick={() => setActiveTab(t.id)}>
            <t.Icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'procedures' && (
        <div className="tab-body">
          <div className="proc-toolbar">
            <div className="search-wrap">
              <Search size={14} className="search-icon" />
              <input className="search-input" placeholder="Search procedures…"
                value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button className="search-clear" onClick={() => setSearch('')}><X size={12}/></button>}
            </div>
            <button className="rg-primary-btn small" onClick={() => { setEditingProc(null); setShowModal(true); }}>
              <Plus size={14}/> Add
            </button>
          </div>
          {loading ? (
            <div className="rg-empty"><p>Loading…</p></div>
          ) : filtered.length === 0 ? (
            <div className="rg-empty">
              <p>{search ? `No match for "${search}"` : 'No procedures yet ✨'}</p>
              {!search && (
                <button className="rg-primary-btn small" onClick={() => { setEditingProc(null); setShowModal(true); }}>
                  <Plus size={14}/> Add First Procedure
                </button>
              )}
            </div>
          ) : (
            <div className="proc-list">
              {filtered.map(proc => (
                <ProcedureCard key={proc.id} procedure={proc} accentColor={meta.color}
                  onEdit={p => { setEditingProc(p); setShowModal(true); }}
                  onDelete={handleDelete} />
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
function ProceduresTab({ sections }) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? '');
  const activeMeta = sections.find(s => s.id === activeSection) ?? sections[0];

  useEffect(() => {
    if (!sections.find(s => s.id === activeSection) && sections.length > 0) {
      setActiveSection(sections[0].id);
    }
  }, [sections, activeSection]);

  return (
    <div>
      <div className="section-tabs">
        {sections.map(s => {
          const SIcon = s.icon ?? BookOpen;
          const isActive = activeSection === s.id;
          return (
            <button key={s.id}
              className={`section-tab ${isActive?'active':''}`}
              style={isActive ? { background: s.bg } : {}}
              onClick={() => setActiveSection(s.id)}>
              <SIcon size={15} /> {s.label ?? s.id}
            </button>
          );
        })}
      </div>
      {activeMeta && <SectionPanel key={activeMeta.id} meta={activeMeta} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN ROTATION GUIDE
───────────────────────────────────────────── */
export default function RotationGuide() {
  const { user } = useAuth();
  const [mainTab,          setMainTab]          = useState('rotations');
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionsLoaded,   setSectionsLoaded]   = useState(false);

  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('user_settings')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', SECTION_STORAGE_KEY)
        .maybeSingle();
      const saved = data?.value;
      if (Array.isArray(saved) && saved.length > 0) {
        setSections(saved.map(sv => {
          const def = DEFAULT_SECTIONS.find(d => d.id === sv.id);
          if (def) return { ...def, color: sv.color, bg: sv.bg ?? def.bg, cardBg: sv.cardBg ?? def.cardBg, cardBorder: sv.cardBorder ?? def.cardBorder };
          return { id:sv.id, label:sv.id, icon:BookOpen, color:sv.color, bg:sv.bg??colorToGrad(sv.color), cardBg:sv.cardBg??colorToSoftBg(sv.color), cardBorder:sv.cardBorder??(sv.color+'44'), overview:`${sv.id} rotation section.`, objectives:[], safety:[] };
        }));
      } else {
        setSections(DEFAULT_SECTIONS);
      }
      setSectionsLoaded(true);
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !sectionsLoaded) return;
    supabase.from('user_settings').upsert([{
      user_id: user.id,
      key: SECTION_STORAGE_KEY,
      value: sections.map(s => ({ id:s.id, color:s.color, bg:s.bg, cardBg:s.cardBg, cardBorder:s.cardBorder })),
    }], { onConflict: 'user_id,key' });
  }, [sections, sectionsLoaded, user?.id]);

  const handleAddSection = (label) => {
    const meta = generateSectionMeta(label);
    setSections(prev => [...prev, {
      id: label, label, icon: BookOpen,
      color: meta.color, bg: colorToGrad(meta.color),
      cardBg: meta.cardBg, cardBorder: meta.color+'44',
      overview: `${label} rotation section.`,
      objectives: [], safety: [],
    }]);
  };

  const handleRemoveSection = (id) => setSections(prev => prev.filter(s => s.id !== id));

  const handleColorChange = (id, color) => {
    setSections(prev => prev.map(s => s.id !== id ? s : {
      ...s, color, bg: colorToGrad(color), cardBg: colorToSoftBg(color), cardBorder: color+'44',
    }));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        /* ── Page ── */
        .rg-page {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 24px;
          font-family: 'DM Sans', sans-serif;
          background: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,220,232,0.55);
          border-radius: 28px;
          box-shadow: 0 2px 12px rgba(255,111,145,0.05), 0 6px 28px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9);
          backdrop-filter: blur(12px);
          padding: 28px;
        }
        .rg-header { margin-bottom: 2px; }
        .rg-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 5vw, 2.55rem); font-weight: 700; color: #1c1012;
          margin: 0 0 6px;
          line-height: 1.08;
          letter-spacing: 0;
        }
        .rg-title-accent { color: #ff5d8f; font-style: italic; }
        .rg-sub {
          margin: 0; color: #888; font-size: 0.92rem; line-height: 1.6;
        }

        /* ── Main tab switcher ── */
        .rg-main-tabs {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 12px;
        }

        .rg-main-tab {
          display: flex; align-items: center; gap: 10px;
          width: 100%; min-width: 0;
          padding: 14px 18px; border-radius: 20px;
          border: 1.5px solid rgba(255,220,234,0.7);
          background: rgba(255,255,255,0.88);
          color: #aaa; font-size: 14px; font-weight: 700;
          cursor: pointer; transition: all 0.22s;
          box-shadow: 0 4px 14px rgba(255,111,145,0.06);
        }

        .rg-main-tab svg {
          width: 38px; height: 38px; padding: 10px;
          border-radius: 12px; color: white; flex-shrink: 0;
          transition: box-shadow 0.2s;
        }

        .rg-main-tab:first-child svg { background: linear-gradient(135deg,#ff8fb1,#ff6f91); }
        .rg-main-tab:last-child  svg { background: linear-gradient(135deg,#7ab6ff,#5f8dff); }

        .rg-main-tab:hover { border-color: #ffb8ce; color: #ff5d8f; transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(255,111,145,0.12); }

        .rg-main-tab.active {
          background: white; border-color: #ff8fb1;
          color: #ff5d8f; box-shadow: 0 10px 28px rgba(255,111,145,0.16);
        }

        .rg-tab-copy { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .rg-tab-title { font-size: 14px; font-weight: 800; color: #333; line-height:1.2; }
        .rg-tab-sub   { font-size: 12px; color: #bbb; line-height:1.3; }
        .rg-main-tab.active .rg-tab-title { color: #ff5d8f; }

        /* ── Rotations tab ── */
        .rt-wrap { width: 100%; display: flex; flex-direction: column; gap: 14px; }

        .rt-toolbar {
          display: flex; align-items: flex-start;
          justify-content: flex-end; gap: 16px; flex-wrap: wrap;
          margin-bottom: 4px;
        }

        .rt-toolbar-actions { display: flex; gap: 10px; align-items: center; flex-shrink:0; }

        /* ─────────────────────────────────────────────
           STATS — NoteSection grid style
        ───────────────────────────────────────────── */
        .rs-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1px;
          background: rgba(255,200,220,0.25);
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,200,220,0.35);
        }

        .rs-stat {
          background: rgba(255,255,255,0.9);
          padding: 16px 18px;
          display: flex; flex-direction: column; gap: 3px;
        }

        .rs-stat-n {
          font-size: 2rem; font-weight: 800;
          line-height: 1; letter-spacing: 0;
          font-family: inherit;
        }

        .rs-stat-l {
          font-size: 11px; font-weight: 700; color: #c8b0a8;
          text-transform: uppercase; letter-spacing: 0.08em;
        }

        /* ── Rotation sections ── */
        .rt-sections { display: flex; flex-direction: column; gap: 28px; }

        .rt-group {}

        .rt-group-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.09em;
          margin-bottom: 14px;
        }

        .rt-group-dot {
          width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0;
        }

        .rt-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px,1fr));
          gap: 16px;
        }

        /* ── Rotation Card ── */
        .rc-card {
          border-radius: 24px;
          border: 1.5px solid var(--sec-color, #ffd6e1);
          background: white;
          overflow: hidden;
          transition: all 0.22s;
          display: flex; flex-direction: column;
          box-shadow: 0 4px 18px rgba(0,0,0,0.05);
        }

        .rc-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 36px rgba(0,0,0,0.1);
        }

        .rc-card.active {
          box-shadow: 0 8px 28px rgba(255,111,145,0.18);
        }

        .rc-card.completed { opacity: 0.72; }
        .rc-card.completed:hover { opacity: 1; }

        .rc-strip { height: 5px; flex-shrink: 0; }

        .rc-body { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

        .rc-top-row {
          display: flex; align-items: center;
          justify-content: space-between; gap: 8px;
        }

        .rc-status-badge {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 12px; border-radius: 999px;
          font-size: 11px; font-weight: 700;
          position: relative;
        }

        .rc-badge-dot {
          width: 7px; height: 7px; border-radius: 50%;
          flex-shrink: 0; position: relative; display: inline-block;
        }

        .rc-pulse-ring {
          position: absolute; inset: -3px;
          border-radius: 50%;
          background: #4abf95;
          animation: pulseRing 2s ease infinite;
          opacity: 0.5;
        }

        @keyframes pulseRing {
          0%   { transform:scale(1); opacity:0.5; }
          70%  { transform:scale(2.2); opacity:0; }
          100% { transform:scale(1); opacity:0; }
        }

        .rc-actions-row { display: flex; gap: 5px; align-items: center; }

        .rc-icon-btn {
          border: none; background: #f5f5f5; padding: 6px; border-radius: 9px;
          cursor: pointer; display: flex; align-items: center; color: #aaa;
          transition: 0.2s; font-size: 11px; font-weight: 600; gap: 4px;
        }
        .rc-icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .rc-icon-btn.danger:hover { background: #fde8e8; color: #e05555; }

        .rc-confirm-row {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #888; font-weight: 600;
        }
        .rc-confirm-yes { border:none; background:#fde8e8; color:#e05555; border-radius:7px; padding:4px 8px; font-size:11px; font-weight:700; cursor:pointer; }
        .rc-confirm-no  { border:none; background:#f0f0f0; color:#888;    border-radius:7px; padding:4px 8px; font-size:11px; font-weight:600; cursor:pointer; }

        .rc-section-name {
          margin: 0; font-size: 17px; font-weight: 800; line-height: 1.25;
        }

        .rc-info-stack { display: flex; flex-direction: column; gap: 6px; }

        .rc-info-row {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #777;
        }

        .rc-duration-chip {
          margin-left: auto; border: 1px solid; border-radius: 999px;
          padding: 2px 9px; font-size: 11px; font-weight: 700;
          white-space: nowrap;
        }

        .rc-progress-block {
          padding: 12px; border-radius: 14px;
          background: var(--sec-cardBg, #fff0f4);
          display: flex; flex-direction: column; gap: 7px;
        }

        .rc-progress-header {
          display: flex; justify-content: space-between;
          font-size: 11px; font-weight: 700; color: #bbb;
        }

        .rc-progress-track {
          height: 7px; background: rgba(0,0,0,0.08);
          border-radius: 999px; overflow: hidden;
        }

        .rc-progress-fill {
          height: 100%; border-radius: 999px; transition: width 0.5s ease;
        }

        .rc-days-remaining { margin: 0; font-size: 12px; font-weight: 700; text-align: center; }

        .rc-upcoming-tag {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1px solid; border-radius: 999px;
          padding: 6px 12px; font-size: 12px; font-weight: 600;
          align-self: flex-start;
        }

        .rc-notes-text {
          margin: 0; font-size: 12px; color: #888;
          font-style: italic; line-height: 1.5;
          border-top: 1px dashed #eee; padding-top: 8px;
        }

        /* ── Empty states ── */
        .rg-empty {
          text-align: center; padding: 40px 18px; color: #9a7b86;
          font-size: 14px; display: flex; flex-direction: column;
          align-items: center; gap: 10px;
          background: linear-gradient(135deg,#fff8fb 0%,#eff4ff 100%);
          border: 1.5px dashed rgba(255,143,177,0.42);
          border-radius: 22px;
        }

        .rg-empty-spinner {
          width: 28px; height: 28px; border-radius: 50%;
          border: 3px solid #ffd6e1; border-top-color: #ff8fb1;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        .rg-empty-hero {
          text-align: center; padding: 56px 24px;
          display: flex; flex-direction: column;
          align-items: center; gap: 14px;
          background:
            radial-gradient(circle at top left, rgba(255,143,177,0.18), transparent 32%),
            radial-gradient(circle at bottom right, rgba(95,141,255,0.16), transparent 34%),
            linear-gradient(135deg,#fff8fb 0%,#f7f9ff 54%,#edfaf4 100%);
          border-radius: 26px; border: 1.5px solid rgba(255,200,220,0.56);
          box-shadow: 0 8px 28px rgba(255,111,145,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
        }

        .rg-empty-hero-icon {
          width: 68px; height: 68px;
          display: flex; align-items: center; justify-content: center;
          font-size: 34px; line-height: 1; margin-bottom: 4px;
          background: rgba(255,255,255,0.72);
          border: 1px solid rgba(255,200,220,0.5);
          border-radius: 22px;
          box-shadow: 0 8px 22px rgba(255,111,145,0.1);
        }

        .rg-empty-hero h3 { margin: 0; font-size: 1.3rem; color: #333; font-weight: 700; }
        .rg-empty-hero p  { margin: 0; color: #8d7580; font-size: 14px; max-width: 340px; line-height: 1.6; }

        /* ── Shared buttons ── */
        .rg-primary-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white; border-radius: 999px; padding: 11px 20px;
          font-weight: 700; font-size: 13px; cursor: pointer;
          transition: 0.2s; white-space: nowrap;
          box-shadow: 0 4px 14px rgba(255,111,145,0.22);
          font-family: inherit;
        }

        .rg-primary-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(255,111,145,0.3); }
        .rg-primary-btn.small { padding: 8px 16px; font-size: 13px; }

        .rg-manage-btn {
          display: inline-flex; align-items: center; gap: 7px;
          border: 1.5px solid rgba(255,200,220,0.6);
          background: rgba(255,255,255,0.9); color: #aaa;
          border-radius: 999px; padding: 9px 16px;
          font-size: 12px; font-weight: 700; cursor: pointer;
          transition: all 0.2s; font-family: inherit;
        }

        .rg-manage-btn:hover {
          border-color: #ff8fb1; color: #ff5d8f;
          background: #fff0f4; box-shadow: 0 4px 14px rgba(255,111,145,0.12);
        }

        /* ─────────────────────────────────────────────
           ROTATION MODAL — NoteSection bottom-sheet style
        ───────────────────────────────────────────── */
        .rm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.28);
          backdrop-filter: blur(6px); z-index: 1000;
          display: flex; align-items: flex-end; justify-content: center;
        }

        .rm-sheet {
          background: white; width: 100%; max-width: 620px;
          border-radius: 28px 28px 0 0;
          box-shadow: 0 -8px 48px rgba(0,0,0,0.14);
          max-height: 92vh; display: flex; flex-direction: column;
          animation: rm-up 0.3s cubic-bezier(0.34,1.2,0.64,1) both;
          overflow: hidden;
        }

        @keyframes rm-up {
          from { transform: translateY(60px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }

        /* Colored header */
        .rm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 22px; gap: 12px; flex-shrink: 0;
          transition: background 0.25s ease;
        }

        .rm-header-left  { display: flex; align-items: center; gap: 11px; }
        .rm-header-icon  {
          width: 32px; height: 32px; border-radius: 10px;
          background: rgba(255,255,255,0.22);
          display: flex; align-items: center; justify-content: center;
        }
        .rm-header-title {
          font-size: 1.05rem; font-weight: 700; color: white;
          font-family: inherit;
        }
        .rm-header-close {
          border: none; background: rgba(255,255,255,0.2); border-radius: 9px;
          padding: 7px; cursor: pointer; display: flex; color: white; transition: 0.2s;
        }
        .rm-header-close:hover { background: rgba(255,255,255,0.32); }

        /* Scrollable form body */
        .rm-body {
          flex: 1; overflow-y: auto; padding: 22px;
          display: flex; flex-direction: column; gap: 16px;
        }

        /* Section pills */
        .rm-label-text {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #bbb; margin: 0 0 8px;
        }

        .rm-sec-pills { display: flex; flex-wrap: wrap; gap: 7px; }

        .rm-sec-pill {
          padding: 6px 13px; border-radius: 999px; border: 1.5px solid;
          background: transparent; font-size: 12px; font-weight: 600;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
          white-space: nowrap;
        }

        /* Field labels */
        .rm-field-label {
          display: flex; flex-direction: column; gap: 6px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em; color: #bbb;
        }

        /* Inputs */
        .rm-input {
          border: 1.5px solid rgba(255,200,220,0.6); background: #fff8fa;
          border-radius: 14px; padding: 13px 15px; font-size: 14px;
          outline: none; transition: 0.2s; color: #1c1412; font-family: inherit; width: 100%;
        }

        .rm-input:focus {
          border-color: var(--a, #ff8fb1); background: white;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--a, #ff8fb1) 18%, transparent);
        }

        .rm-textarea {
          border: 1.5px solid rgba(255,200,220,0.6); background: #fff8fa;
          border-radius: 14px; padding: 13px 15px; font-size: 14px;
          outline: none; transition: 0.2s; color: #444; resize: vertical;
          font-family: inherit; line-height: 1.6; width: 100%; min-height: 80px;
        }

        .rm-textarea:focus {
          border-color: var(--a, #ff8fb1); background: white;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--a, #ff8fb1) 18%, transparent);
        }

        /* Date row */
        .rm-date-row { display: flex; gap: 12px; }
        .rm-date-row > * { flex: 1; }

        /* Duration chip */
        .rm-duration-chip {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 9px 14px; border-radius: 12px; border: 1px solid;
          font-size: 13px;
        }

        /* Error */
        .rm-error {
          display: flex; align-items: flex-start; gap: 8px;
          background: #fde8e8; color: #c0392b; border-radius: 12px;
          padding: 11px 14px; font-size: 13px; line-height: 1.5;
        }

        /* Actions */
        .rm-actions { display: flex; gap: 10px; padding-top: 4px; }

        .rm-submit {
          display: inline-flex; align-items: center; gap: 7px; border: none;
          color: white; border-radius: 999px; padding: 13px 24px;
          font-size: 14px; font-weight: 700; cursor: pointer;
          transition: 0.2s; font-family: inherit;
        }
        .rm-submit:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,111,145,0.3); }
        .rm-submit:disabled { opacity: 0.65; cursor: not-allowed; }

        .rm-cancel {
          border: none; background: #f0ecea; color: #888;
          border-radius: 999px; padding: 13px 20px;
          font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
        }

        /* ── Procedure modal (old style, kept separate) ── */
        .rm-modal {
          background: white; border-radius: 28px; padding: 28px;
          width: 100%; max-width: 500px;
          box-shadow: 0 24px 60px rgba(255,111,145,0.2);
          border: 1px solid #ffe0ea; max-height: 92vh; overflow-y: auto;
        }
        .rm-header-old { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
        .rm-header-left-old { display: flex; align-items: center; gap: 12px; }
        .rm-header-icon-old { width: 42px; height: 42px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .rm-title-old { margin: 0; font-size: 1.1rem; color: #333; font-weight: 700; }
        .rm-sub-old   { margin: 3px 0 0; font-size: 12px; color: #bbb; }
        .rm-close-old { border: none; background: #f4f4f4; border-radius: 10px; padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; }
        .rm-close-old:hover { background: #ffe4ec; color: #ff5d8f; }
        .rm-form-old { display: flex; flex-direction: column; gap: 14px; }
        .rm-label-old { display: flex; flex-direction: column; gap: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: #bbb; }
        .rm-input-old { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; font-family: inherit; width: 100%; }
        .rm-input-old:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .rm-textarea-old { border: 1.5px solid #ffd6e1; background: #fff8fa; border-radius: 14px; padding: 11px 14px; font-size: 14px; outline: none; transition: 0.2s; color: #444; resize: vertical; font-family: inherit; line-height: 1.6; width: 100%; }
        .rm-textarea-old:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }
        .rm-error-old { display: flex; align-items: flex-start; gap: 8px; background: #fde8e8; color: #c0392b; border-radius: 12px; padding: 11px 14px; font-size: 13px; line-height: 1.5; }
        .rm-actions-old { display: flex; gap: 10px; padding-top: 4px; }
        .rm-primary-old { display: inline-flex; align-items: center; gap: 7px; border: none; background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white; border-radius: 999px; padding: 11px 20px; font-size: 13px; font-weight: 600; cursor: pointer; transition: 0.2s; font-family: inherit; }
        .rm-primary-old:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.28); }
        .rm-primary-old:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .rm-secondary-old { border: none; background: #f4f4f4; color: #666; border-radius: 999px; padding: 11px 18px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; }

        /* When procedure modal uses rm-overlay, center it */
        .rm-overlay:has(.rm-modal) {
          align-items: center;
        }

        /* ── Section Tabs (procedures) ── */
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

        .panel-header h3 { margin: 0 0 5px; font-size: 1.2rem; font-weight: 700; }
        .panel-header p  { margin: 0; font-size: 13px; opacity: 0.9; line-height: 1.5; max-width: 600px; }

        .panel-icon-wrap {
          width: 46px; height: 46px; border-radius: 16px;
          background: rgba(255,255,255,0.25);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        .sub-tabs {
          display: flex; border-bottom: 1px solid #ffe0ea;
          padding: 0 24px; background: white;
        }

        .sub-tab {
          padding: 13px 16px; border: none; border-bottom: 2.5px solid transparent;
          background: transparent; color: #bbb; font-size: 13px; font-weight: 600;
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
          border-radius: 999px; padding: 10px 34px 10px 34px;
          font-size: 13px; outline: none; transition: 0.2s; color: #444;
          font-family: inherit;
        }

        .search-input:focus { border-color: #ff8fb1; background: white; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }

        .search-clear {
          position: absolute; right: 12px; background: none; border: none;
          color: #bbb; cursor: pointer; padding: 0; display: flex;
        }

        .proc-list { display: flex; flex-direction: column; gap: 10px; }

        .proc-card {
          background: #fff8fa; border: 1.5px solid #ffe0ea;
          border-radius: 16px; overflow: hidden; transition: box-shadow 0.2s, border-color 0.2s;
        }

        .proc-card:hover { border-color: #ffb8ce; box-shadow: 0 4px 14px rgba(255,111,145,0.1); }
        .proc-card.expanded { border-color: #ff8fb1; }

        .proc-top { display: flex; align-items: center; justify-content: space-between; padding: 13px 15px; gap: 10px; }
        .proc-name-row { display: flex; align-items: center; gap: 10px; flex: 1; }
        .proc-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .proc-name-row strong { font-size: 14px; color: #333; }
        .proc-controls { display: flex; gap: 5px; align-items: center; }

        .proc-details {
          padding: 12px 15px 14px; display: flex; flex-direction: column; gap: 12px;
          border-top: 1px solid #ffe0ea;
        }

        .proc-detail-block p { margin: 4px 0 0; font-size: 13px; color: #666; line-height: 1.55; }
        .detail-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #ccc; }
        .safety-block { background: #fff5e6; padding: 10px 12px; border-radius: 12px; border: 1px solid #ffd6a0; }
        .safety-block .detail-label { color: #cc7a00; }
        .safety-block p { color: #885500; }

        /* Icon buttons */
        .icon-btn {
          border: none; background: #f0f0f0; padding: 7px; border-radius: 9px;
          cursor: pointer; display: flex; align-items: center; color: #aaa; transition: 0.2s;
        }
        .icon-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .icon-btn.danger { background: #f5f5f5; color: #ddd; }
        .icon-btn.danger:hover { background: #fde8e8; color: #e05555; }
        .expand-btn { background: #f0f0f0; color: #bbb; }
        .expand-btn:hover { background: #e8e8e8; color: #888; }

        /* ── Safety + Objectives (editable) ── */
        .sg-wrap, .obj-wrap { display: flex; flex-direction: column; gap: 14px; }

        .sg-toolbar {
          display: flex; align-items: center;
          justify-content: space-between; gap: 10px;
        }

        .sg-count { margin: 0; font-size: 12px; color: #bbb; font-weight: 600; }

        .sg-add-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: none; color: white; border-radius: 999px;
          padding: 7px 14px; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: 0.2s; font-family: inherit;
        }

        .sg-add-btn:hover { opacity: 0.85; transform: translateY(-1px); }

        .sg-add-form {
          background: #fff8fa; border: 1.5px solid #ffd6e1;
          border-radius: 14px; padding: 12px;
        }

        .sg-add-row {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
        }

        .sg-icon-input {
          width: 48px; border: 1.5px solid #ffd6e1; background: white;
          border-radius: 10px; padding: 8px; font-size: 16px; text-align: center;
          outline: none; flex-shrink: 0; font-family: inherit;
        }

        .sg-icon-input.small { width: 40px; padding: 5px; font-size: 14px; }

        .sg-text-input {
          flex: 1; min-width: 140px; border: 1.5px solid #ffd6e1; background: white;
          border-radius: 10px; padding: 9px 12px; font-size: 13px;
          outline: none; transition: 0.2s; color: #444; font-family: inherit;
        }

        .sg-text-input.small { padding: 6px 10px; font-size: 12px; }

        .sg-text-input:focus { border-color: #ff8fb1; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }

        .sg-save-btn {
          border: none; color: white; border-radius: 9px;
          width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.15s; flex-shrink: 0;
        }

        .sg-save-btn:hover { opacity: 0.82; }

        .sg-cancel-btn {
          border: none; background: #f0f0f0; color: #aaa;
          border-radius: 9px; width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: 0.15s; flex-shrink: 0;
        }

        .sg-cancel-btn:hover { background: #fde8e8; color: #e05555; }

        .safety-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px; }

        .safety-card {
          display: flex; align-items: flex-start; gap: 10px;
          background: #fff8fa; border: 1.5px solid #ffe0ea; border-radius: 16px; padding: 14px;
          transition: border-color 0.2s;
        }

        .safety-card:hover { border-color: #ffb8ce; }

        .safety-emoji { font-size: 20px; flex-shrink: 0; line-height: 1; }
        .safety-card p { margin: 0; font-size: 13px; color: #555; line-height: 1.55; }

        .sg-item-actions {
          display: flex; gap: 4px; flex-shrink: 0; margin-left: auto;
        }

        .sg-item-btn {
          border: none; background: transparent; color: #ddd;
          padding: 4px; border-radius: 7px; cursor: pointer;
          display: flex; align-items: center; transition: 0.15s;
        }

        .sg-item-btn:hover { background: #ffe4ec; color: #ff5d8f; }
        .sg-item-btn.danger:hover { background: #fde8e8; color: #e05555; }

        .sg-edit-row {
          display: flex; align-items: center; gap: 7px; width: 100%; flex-wrap: wrap;
        }

        /* Objectives */
        .objective-list {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 10px;
        }

        .objective-item {
          display: flex; align-items: center; gap: 12px;
          background: #fff8fa; border: 1.5px solid #ffe0ea;
          border-radius: 16px; padding: 14px;
          font-size: 14px; color: #444; line-height: 1.5;
          transition: border-color 0.2s;
        }

        .objective-item:hover { border-color: #ffb8ce; }

        .obj-num {
          width: 28px; height: 28px; border-radius: 50%;
          color: white; font-size: 12px; font-weight: 700;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }

        /* ── Manage Sections Modal ── */
        .msm-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.28);
          backdrop-filter: blur(6px); z-index: 1000;
          display: flex; align-items: center; justify-content: center; padding: 20px;
        }

        .msm-modal {
          background: white; border-radius: 28px; padding: 26px;
          width: 100%; max-width: 460px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.14);
          border: 1px solid rgba(255,200,220,0.4);
          max-height: 90vh; overflow-y: auto;
          display: flex; flex-direction: column; gap: 20px;
        }

        .msm-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
        .msm-head-left { display: flex; align-items: center; gap: 12px; }
        .msm-head-icon {
          width: 40px; height: 40px; border-radius: 14px;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0;
        }

        .msm-title { margin: 0 0 3px; font-size: 1.05rem; font-weight: 700; color: #222; }
        .msm-sub   { margin: 0; font-size: 12px; color: #bbb; }

        .msm-close {
          border: none; background: #f4f0f2; border-radius: 10px;
          padding: 7px; cursor: pointer; display: flex; color: #888; transition: 0.2s; flex-shrink:0;
        }

        .msm-close:hover { background: #ffe4ec; color: #ff5d8f; }

        .msm-box-label {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: #ccc; margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }

        .msm-count {
          display: inline-flex; align-items: center; justify-content: center;
          background: #fff0f4; color: #ff6f91; border-radius: 999px;
          padding: 1px 8px; font-size: 11px; font-weight: 700;
        }

        .msm-add-box {
          background: #fff8fa; border: 1px solid rgba(255,200,220,0.4);
          border-radius: 18px; padding: 16px;
        }

        .msm-add-row { display: flex; gap: 10px; align-items: center; }

        .msm-input {
          flex: 1 1 auto; min-width: 0; width: 100%; border: 1.5px solid rgba(255,200,220,0.6);
          background: white; border-radius: 12px; padding: 10px 14px;
          font-size: 14px; outline: none; transition: 0.2s; color: #444; font-family: inherit;
        }

        .msm-input:focus { border-color: #ff8fb1; box-shadow: 0 0 0 3px rgba(255,143,177,0.15); }

        .msm-add-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 0 0 auto; border: none;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91); color: white;
          border-radius: 12px; padding: 10px 16px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s; white-space: nowrap; font-family: inherit;
        }

        .msm-add-btn:hover { transform: translateY(-1px); box-shadow: 0 5px 14px rgba(255,111,145,0.25); }

        .msm-error {
          background: #fde8e8; color: #c0392b; border-radius: 10px;
          padding: 8px 12px; font-size: 12px; margin-top: 10px;
        }

        .msm-empty {
          text-align: center; padding: 24px 16px; background: #fff8fa;
          border-radius: 16px; border: 1px dashed rgba(255,200,220,0.5);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: #bbb; font-size: 13px;
        }

        .msm-list { display: flex; flex-direction: column; gap: 8px; }

        .msm-row {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 11px 13px; border-radius: 14px;
          border: 1.5px solid rgba(255,200,220,0.4); background: #fff8fa; transition: 0.2s;
        }

        .msm-row:hover { border-color: #ffb8ce; background: white; }
        .msm-row-rem   { border-color: #ffd0d0; background: #fff5f5; }

        .msm-row-main { display: flex; align-items: center; gap: 9px; min-width: 0; flex: 1; }

        .msm-sec-pill {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1.5px solid; border-radius: 999px; padding: 4px 11px;
          font-size: 12px; font-weight: 700; min-width: 0; overflow: hidden;
        }

        .msm-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

        .msm-color-ctrl {
          width: 28px; height: 28px; border: 1.5px solid rgba(255,200,220,0.5);
          background: white; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          cursor: pointer; flex-shrink: 0; position: relative; overflow: hidden;
        }

        .msm-color-ctrl input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }

        .msm-color-swatch { width: 15px; height: 15px; border-radius: 50%; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.08); }

        .msm-rm-btn {
          display: inline-flex; align-items: center; gap: 5px;
          border: 1.5px solid rgba(255,200,220,0.5); background: white; color: #ccc;
          border-radius: 999px; padding: 5px 11px; font-size: 11px; font-weight: 600;
          cursor: pointer; transition: 0.2s; font-family: inherit;
        }

        .msm-rm-btn:hover { border-color: #ffd0d0; background: #fde8e8; color: #e05555; }

        .msm-confirm {
          display: flex; align-items: center; gap: 6px; font-size: 11px; color: #888; font-weight: 600; flex-shrink: 0;
        }

        .msm-yes { border:none; background:linear-gradient(135deg,#ff8f8f,#e05555); color:white; border-radius:999px; padding:4px 11px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; }
        .msm-no  { border:none; background:#f0f0f0; color:#888; border-radius:999px; padding:4px 11px; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; }

        .msm-note {
          display: flex; align-items: flex-start; gap: 8px;
          background: #fff8fa; border: 1px solid rgba(255,200,220,0.4);
          border-radius: 14px; padding: 12px 14px; font-size: 12px;
          color: #ccc; line-height: 1.6;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .rg-page         { border-radius: 22px; padding: 20px 20px 56px; }
          .rg-title        { font-size: 1.7rem; }
          .rg-main-tabs    { gap: 8px; }
          .rg-main-tab     { padding: 12px 14px; border-radius: 16px; font-size: 13px; }
          .rg-main-tab svg { width: 34px; height: 34px; padding: 9px; border-radius: 11px; }
          .rt-toolbar      { flex-direction: column; }
          .rt-toolbar-actions { width: 100%; justify-content: flex-end; }
          .rt-cards-grid   { grid-template-columns: 1fr; }
          .rs-stats        { grid-template-columns: repeat(2, 1fr); }
          .rs-stat-n       { font-size: 1.6rem; }
          .safety-grid     { grid-template-columns: 1fr; }
          .section-tabs    { gap: 7px; }
          .section-tab     { padding: 8px 13px; font-size: 12px; }
          .panel-header    { padding: 18px; flex-direction: column; gap: 12px; }
          .tab-body        { padding: 18px; }
          .sub-tabs        { overflow-x: auto; gap: 0; }
          .sub-tab         { padding: 12px 13px; font-size: 12px; }
          .sg-add-row      { gap: 6px; }
          .msm-add-row     { gap: 8px; }
          .msm-add-btn     { padding-inline: 16px; }
          .rm-date-row     { flex-direction: column; }
          .rm-body         { padding: 18px; }
          .rm-sheet        { border-radius: 24px 24px 0 0; }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .rg-page      { padding: 24px; }
          .rg-title     { font-size: 1.8rem; }
          .rt-cards-grid { grid-template-columns: repeat(2,1fr); }
          .safety-grid   { grid-template-columns: 1fr; }
          .rs-stats      { grid-template-columns: repeat(4, 1fr); }
        }
      `}</style>

      <div className="rg-page">
        <div className="rg-header">
          <h1 className="rg-title">Rotation <span className="rg-title-accent">Guide</span></h1>
        </div>
        {/* Main tab switcher */}
        <div className="rg-main-tabs">
          <button
            className={`rg-main-tab ${mainTab==='rotations'?'active':''}`}
            onClick={() => setMainTab('rotations')}>
            <RotateCcw size={16} />
            <span className="rg-tab-copy">
              <span className="rg-tab-title">My Rotations</span>
            </span>
          </button>
          <button
            className={`rg-main-tab ${mainTab==='procedures'?'active':''}`}
            onClick={() => setMainTab('procedures')}>
            <Microscope size={16} />
            <span className="rg-tab-copy">
              <span className="rg-tab-title">Procedure Guide</span>
            </span>
          </button>
        </div>

        {mainTab === 'rotations'  && (
          <RotationsTab sections={sections} onManageSections={() => setShowSectionModal(true)} />
        )}
        {mainTab === 'procedures' && (
          <ProceduresTab sections={sections} />
        )}
      </div>

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