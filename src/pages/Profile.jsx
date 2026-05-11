import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../auth/AuthProvider';
import {
  User, School, BookOpen, GraduationCap, Save,
  Mail, Calendar, Clock, LogOut, CheckCircle2,
  AlertCircle, Edit3, X, Camera, Sparkles,
  Shield, Bell, ChevronRight, Hash,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getInitials(name) {
  if (!name) return '?';
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

function formatTime12(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#ff8fb1,#ff6f91)',
  'linear-gradient(135deg,#7ab6ff,#5f8dff)',
  'linear-gradient(135deg,#6dd6b1,#4abf95)',
  'linear-gradient(135deg,#ffb37a,#ff8c5a)',
  'linear-gradient(135deg,#c084fc,#a855f7)',
  'linear-gradient(135deg,#f97316,#ea580c)',
];

function pickGradient(name) {
  if (!name) return AVATAR_GRADIENTS[0];
  const code = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[code];
}

/* ─────────────────────────────────────────────
   TOAST
───────────────────────────────────────────── */
function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className={`pf-toast ${toast.type}`}>
      {toast.type === 'success'
        ? <CheckCircle2 size={15} />
        : <AlertCircle size={15} />}
      <span>{toast.message}</span>
      <button className="pf-toast-close" onClick={onDismiss}><X size={12} /></button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   FIELD ROW — inline editable
───────────────────────────────────────────── */
function FieldRow({ icon: Icon, label, value, displayValue, inputProps, isDirty }) {
  return (
    <div className={`pf-field ${isDirty ? 'dirty' : ''}`}>
      <div className="pf-field-icon">
        <Icon size={15} />
      </div>
      <div className="pf-field-body">
        <label className="pf-field-label">{label}</label>
        <div className="pf-field-input-wrap">
          {inputProps.type === 'textarea' ? (
            <textarea
              className="pf-input pf-textarea"
              value={value}
              {...inputProps}
              type={undefined}
            />
          ) : (
            <input
              className="pf-input"
              value={value}
              {...inputProps}
            />
          )}
          {isDirty && <span className="pf-dirty-dot" title="Unsaved change" />}
        </div>
        {displayValue && !value && (
          <span className="pf-field-placeholder">{displayValue}</span>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   STAT CHIP
───────────────────────────────────────────── */
function StatChip({ icon: Icon, label, value, color }) {
  return (
    <div className="pf-stat" style={{ '--chip-color': color }}>
      <div className="pf-stat-icon"><Icon size={14} /></div>
      <div>
        <p className="pf-stat-value">{value}</p>
        <p className="pf-stat-label">{label}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN
───────────────────────────────────────────── */
export default function Profile() {
  const { profile, user, upsertProfile, signOut } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    year_level: '',
    program: '',
    internship_start_date: '',
    preferred_reminder_time: '',
  });

  const [original, setOriginal] = useState({});
  const [loading, setLoading]   = useState(false);
  const [toast, setToast]       = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const formRef = useRef(null);

  // Populate from profile
  useEffect(() => {
    if (!profile) return;
    const data = {
      full_name:               profile.full_name               ?? '',
      school:                  profile.school                  ?? '',
      year_level:              profile.year_level              ?? '',
      program:                 profile.program                 ?? '',
      internship_start_date:   profile.internship_start_date   ?? '',
      preferred_reminder_time: profile.preferred_reminder_time ?? '',
    };
    setForm(data);
    setOriginal(data);
  }, [profile]);

  const isDirty = (field) => form[field] !== original[field];
  const hasAnyChanges = Object.keys(form).some((k) => form[k] !== original[k]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!hasAnyChanges) {
      setToast({ type: 'info', message: 'No changes to save.' });
      return;
    }
    setLoading(true);
    try {
      await upsertProfile({ id: user.id, email: user.email, ...form });
      setOriginal({ ...form });
      setToast({ type: 'success', message: 'Profile updated successfully ✨' });
    } catch (err) {
      setToast({ type: 'error', message: err.message });
    }
    setLoading(false);
  }

  function handleDiscard() {
    setForm({ ...original });
    setToast({ type: 'info', message: 'Changes discarded.' });
  }

  async function handleSignOut() {
    setSigningOut(true);
    try { await signOut(); }
    catch (err) { setToast({ type: 'error', message: err.message }); }
    setSigningOut(false);
    setConfirmSignOut(false);
  }

  const initials     = getInitials(form.full_name || profile?.full_name);
  const completeness = (() => {
    const fields = ['full_name', 'school', 'year_level', 'program'];
    const filled = fields.filter((f) => form[f]?.trim()).length;
    return Math.round((filled / fields.length) * 100);
  })();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,300&display=swap');

        .pf-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          max-width: 680px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* ── PAGE TITLE ── */
        .pf-page-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2.1rem;
          color: #2a1a22;
          margin: 0 0 2px;
          letter-spacing: -0.5px;
        }
        .pf-page-sub {
          font-size: 14px;
          color: #b08090;
          margin: 0 0 4px;
        }

        /* ── TOAST ── */
        .pf-toast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          box-shadow: 0 8px 32px rgba(0,0,0,0.14);
          animation: toastIn 0.3s cubic-bezier(.34,1.56,.64,1);
          white-space: nowrap;
        }
        .pf-toast.success { background: #1a2e25; color: #6dd6b1; }
        .pf-toast.error   { background: #2e1a1a; color: #ff8f8f; }
        .pf-toast.info    { background: #1f1f2e; color: #a0aeff; }

        .pf-toast-close {
          background: transparent; border: none;
          color: inherit; opacity: 0.6;
          cursor: pointer; padding: 0; display: flex;
          margin-left: 6px;
        }
        .pf-toast-close:hover { opacity: 1; }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }

        /* ── HERO CARD ── */
        .pf-hero {
          background: linear-gradient(135deg, #ff8fb1 0%, #ff6f91 45%, #ff8c5a 100%);
          border-radius: 28px;
          padding: 28px;
          display: flex;
          align-items: center;
          gap: 22px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(255,111,145,0.28);
        }

        .pf-hero::before {
          content: '';
          position: absolute;
          top: -40px; right: -40px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          pointer-events: none;
        }

        .pf-hero::after {
          content: '';
          position: absolute;
          bottom: -60px; left: 60px;
          width: 160px; height: 160px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
        }

        .pf-avatar {
          width: 88px;
          height: 88px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Serif Display', serif;
          font-size: 2rem;
          color: white;
          flex-shrink: 0;
          position: relative;
          border: 3px solid rgba(255,255,255,0.35);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18);
          z-index: 1;
          background: rgba(255,255,255,0.25);
          backdrop-filter: blur(8px);
        }

        .pf-avatar-initials {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: -1px;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .pf-hero-info {
          flex: 1;
          z-index: 1;
        }

        .pf-hero-name {
          font-family: 'DM Serif Display', serif;
          font-size: 1.7rem;
          color: white;
          margin: 0 0 4px;
          letter-spacing: -0.3px;
          text-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .pf-hero-program {
          font-size: 13px;
          color: rgba(255,255,255,0.88);
          margin: 0 0 3px;
          font-weight: 500;
        }

        .pf-hero-email {
          font-size: 12px;
          color: rgba(255,255,255,0.7);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .pf-hero-badges {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .pf-hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          backdrop-filter: blur(4px);
        }

        /* ── COMPLETENESS BAR ── */
        .pf-completeness {
          background: rgba(255,255,255,0.88);
          border-radius: 20px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 4px 16px rgba(255,111,145,0.07);
        }

        .pf-complete-label {
          font-size: 12px;
          font-weight: 700;
          color: #aa7080;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.07em;
        }

        .pf-complete-track {
          flex: 1;
          height: 8px;
          background: #f3dbe3;
          border-radius: 999px;
          overflow: hidden;
        }

        .pf-complete-fill {
          height: 100%;
          border-radius: 999px;
          background: linear-gradient(90deg, #ff8fb1, #ff6f91);
          transition: width 0.6s cubic-bezier(.34,1.56,.64,1);
        }

        .pf-complete-pct {
          font-size: 13px;
          font-weight: 700;
          color: #ff5d8f;
          white-space: nowrap;
          min-width: 36px;
          text-align: right;
        }

        /* ── SECTION CARD ── */
        .pf-section {
          background: rgba(255,255,255,0.88);
          border-radius: 24px;
          border: 1px solid rgba(255,220,234,0.6);
          box-shadow: 0 4px 20px rgba(255,111,145,0.06);
          overflow: hidden;
        }

        .pf-section-header {
          padding: 18px 22px 14px;
          border-bottom: 1px solid #ffeef4;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pf-section-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
          font-size: 15px;
        }

        .pf-section-icon.pink  { background: linear-gradient(135deg,#ff8fb1,#ff6f91); }
        .pf-section-icon.blue  { background: linear-gradient(135deg,#7ab6ff,#5f8dff); }
        .pf-section-icon.green { background: linear-gradient(135deg,#6dd6b1,#4abf95); }
        .pf-section-icon.dark  { background: linear-gradient(135deg,#6b7280,#4b5563); }

        .pf-section-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
          color: #2a1a22;
          letter-spacing: -0.2px;
        }

        .pf-section-header p {
          margin: 2px 0 0;
          font-size: 11px;
          color: #c08090;
        }

        .pf-section-body {
          padding: 6px 0;
        }

        /* ── FIELD ── */
        .pf-field {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 22px;
          border-bottom: 1px solid #fdf0f5;
          transition: background 0.15s;
        }

        .pf-field:last-child { border-bottom: none; }

        .pf-field:hover { background: rgba(255,240,247,0.5); }

        .pf-field.dirty {
          background: linear-gradient(90deg, rgba(255,143,177,0.06), transparent);
        }

        .pf-field-icon {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: #fff0f4;
          display: flex; align-items: center; justify-content: center;
          color: #ff8fb1; flex-shrink: 0; margin-top: 2px;
        }

        .pf-field-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .pf-field-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: #c09090;
        }

        .pf-field-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .pf-input {
          width: 100%;
          border: none;
          background: transparent;
          font-size: 14px;
          color: #2a1a22;
          font-family: 'DM Sans', sans-serif;
          font-weight: 500;
          outline: none;
          padding: 2px 0;
          transition: 0.2s;
          border-bottom: 1.5px solid transparent;
        }

        .pf-input:focus {
          border-bottom-color: #ff8fb1;
        }

        .pf-input::placeholder { color: #d4b0bc; font-weight: 400; }

        .pf-textarea {
          resize: vertical;
          min-height: 60px;
          line-height: 1.5;
        }

        .pf-dirty-dot {
          position: absolute;
          right: 0; top: 50%;
          transform: translateY(-50%);
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #ff8fb1;
          flex-shrink: 0;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%,100% { opacity: 1; transform: translateY(-50%) scale(1); }
          50%      { opacity: 0.5; transform: translateY(-50%) scale(0.7); }
        }

        /* ── READ-ONLY ROW ── */
        .pf-readonly-row {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 22px;
          border-bottom: 1px solid #fdf0f5;
        }
        .pf-readonly-row:last-child { border-bottom: none; }

        .pf-readonly-icon {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: #f4f4f8;
          display: flex; align-items: center; justify-content: center;
          color: #b0b0c0; flex-shrink: 0;
        }

        .pf-readonly-label {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.09em;
          color: #c09090; margin-bottom: 2px;
        }

        .pf-readonly-value {
          font-size: 14px; color: #2a1a22; font-weight: 500;
        }

        .pf-readonly-badge {
          margin-left: auto;
          background: #f4f4f8; color: #aaa;
          font-size: 10px; font-weight: 700;
          border-radius: 6px; padding: 3px 7px;
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        /* ── STATS ROW ── */
        .pf-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          padding: 16px 22px;
        }

        .pf-stat {
          background: #fff8fb;
          border: 1px solid #ffe8f0;
          border-radius: 16px;
          padding: 13px;
          display: flex;
          gap: 10px;
          align-items: center;
          transition: 0.2s;
        }
        .pf-stat:hover { border-color: var(--chip-color,#ff8fb1); transform: translateY(-1px); }

        .pf-stat-icon {
          color: var(--chip-color, #ff8fb1);
          flex-shrink: 0;
        }

        .pf-stat-value {
          margin: 0 0 1px;
          font-size: 13px; font-weight: 700;
          color: #2a1a22;
          white-space: nowrap;
        }

        .pf-stat-label {
          margin: 0;
          font-size: 10px; color: #c09090;
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        /* ── ACTION BAR ── */
        .pf-action-bar {
          background: rgba(255,255,255,0.88);
          border-radius: 20px;
          border: 1px solid rgba(255,220,234,0.6);
          box-shadow: 0 4px 20px rgba(255,111,145,0.06);
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .pf-action-bar.has-changes {
          border-color: #ff8fb1;
          background: linear-gradient(135deg, rgba(255,143,177,0.07), rgba(255,255,255,0.9));
          box-shadow: 0 4px 20px rgba(255,111,145,0.15);
          animation: barHighlight 0.3s ease;
        }

        @keyframes barHighlight {
          from { transform: translateY(3px); opacity: 0.8; }
          to   { transform: translateY(0); opacity: 1; }
        }

        .pf-changes-hint {
          font-size: 12px; color: #ff8fb1; font-weight: 600;
          display: flex; align-items: center; gap: 5px; flex: 1;
        }

        .pf-save-btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: none;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white; border-radius: 14px;
          padding: 12px 22px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: 0.2s;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 4px 16px rgba(255,111,145,0.25);
        }
        .pf-save-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255,111,145,0.35); }
        .pf-save-btn:active { transform: scale(0.98); }
        .pf-save-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; box-shadow: none; }

        .pf-discard-btn {
          display: inline-flex; align-items: center; gap: 6px;
          border: 1.5px solid #ffd6e1; background: transparent;
          color: #ff8fb1; border-radius: 14px;
          padding: 11px 18px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
          font-family: 'DM Sans', sans-serif;
        }
        .pf-discard-btn:hover { background: #fff0f4; border-color: #ff8fb1; color: #ff5d8f; }

        /* ── DANGER ZONE ── */
        .pf-danger-section {
          background: rgba(255,255,255,0.88);
          border-radius: 24px;
          border: 1px solid #ffe0e0;
          box-shadow: 0 4px 20px rgba(224,85,85,0.05);
          overflow: hidden;
        }

        .pf-danger-header {
          padding: 16px 22px 12px;
          border-bottom: 1px solid #fff0f0;
          display: flex; align-items: center; gap: 10px;
        }

        .pf-danger-icon {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg,#ff8f8f,#e05555);
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }

        .pf-danger-header h4 { margin: 0; font-size: 14px; font-weight: 700; color: #2a1a22; }
        .pf-danger-header p  { margin: 2px 0 0; font-size: 11px; color: #c08080; }

        .pf-signout-row {
          padding: 16px 22px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 14px;
        }

        .pf-signout-desc {
          font-size: 13px; color: #888;
          flex: 1; line-height: 1.5;
        }

        .pf-signout-btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1.5px solid #ffcaca; background: #fff0f0;
          color: #e05555; border-radius: 14px;
          padding: 10px 18px; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: 0.2s;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .pf-signout-btn:hover { background: #ffe0e0; border-color: #e05555; }

        /* ── CONFIRM SIGNOUT ── */
        .pf-confirm-signout {
          margin: 0 22px 16px;
          background: #fff0f0; border: 1px solid #ffcaca;
          border-radius: 16px; padding: 14px 16px;
          display: flex; flex-direction: column; gap: 10px;
        }

        .pf-confirm-text {
          font-size: 13px; color: #aa4444; line-height: 1.5;
        }

        .pf-confirm-actions {
          display: flex; gap: 8px;
        }

        .pf-confirm-yes {
          border: none; background: #e05555; color: white;
          border-radius: 10px; padding: 9px 16px;
          font-size: 13px; font-weight: 700;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
          transition: 0.2s;
        }
        .pf-confirm-yes:hover { background: #c0392b; }
        .pf-confirm-yes:disabled { opacity: 0.65; cursor: not-allowed; }

        .pf-confirm-no {
          border: none; background: #f4f4f4; color: #666;
          border-radius: 10px; padding: 9px 16px;
          font-size: 13px; font-weight: 600;
          cursor: pointer; font-family: 'DM Sans', sans-serif;
        }

        /* ── Responsive ── */
        @media (max-width: 600px) {
          .pf-hero { flex-direction: column; text-align: center; }
          .pf-hero-badges { justify-content: center; }
          .pf-hero-email { justify-content: center; }
          .pf-stats-row { grid-template-columns: 1fr 1fr; }
          .pf-action-bar { flex-direction: column; align-items: stretch; }
          .pf-save-btn, .pf-discard-btn { justify-content: center; }
          .pf-signout-row { flex-direction: column; align-items: flex-start; }
          .pf-avatar { width: 72px; height: 72px; }
          .pf-avatar-initials { font-size: 1.5rem; }
          .pf-hero-name { font-size: 1.4rem; }
        }
      `}</style>

      <div className="pf-root">
        <div>
          <h1 className="pf-page-title">My Profile</h1>
          <p className="pf-page-sub">Manage your identity and internship details</p>
        </div>

        {/* ── HERO ── */}
        <div className="pf-hero">
          <div className="pf-avatar">
            <span className="pf-avatar-initials">{initials}</span>
          </div>

          <div className="pf-hero-info">
            <h2 className="pf-hero-name">
              {form.full_name || 'Your Name'}
            </h2>
            {form.program && (
              <p className="pf-hero-program">{form.program}</p>
            )}
            <p className="pf-hero-email">
              <Mail size={11} /> {user?.email ?? '—'}
            </p>

            <div className="pf-hero-badges">
              {form.school && (
                <span className="pf-hero-badge">
                  <School size={10} /> {form.school}
                </span>
              )}
              {form.year_level && (
                <span className="pf-hero-badge">
                  <Hash size={10} /> {form.year_level}
                </span>
              )}
              {form.internship_start_date && (
                <span className="pf-hero-badge">
                  <Calendar size={10} /> Started {formatDate(form.internship_start_date)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── PROFILE COMPLETENESS ── */}
        <div className="pf-completeness">
          <span className="pf-complete-label">Profile</span>
          <div className="pf-complete-track">
            <div className="pf-complete-fill" style={{ width: `${completeness}%` }} />
          </div>
          <span className="pf-complete-pct">{completeness}%</span>
          {completeness < 100 && (
            <span style={{ fontSize: 11, color: '#d4a0b0', whiteSpace: 'nowrap' }}>
              Fill all fields ✨
            </span>
          )}
          {completeness === 100 && (
            <span style={{ fontSize: 11, color: '#4abf95', whiteSpace: 'nowrap' }}>
              Complete! 🎉
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} ref={formRef}>
          {/* ── PERSONAL INFO ── */}
          <div className="pf-section">
            <div className="pf-section-header">
              <div className="pf-section-icon pink"><User size={16} /></div>
              <div>
                <h4>Personal Information</h4>
                <p>Your name and identity</p>
              </div>
            </div>
            <div className="pf-section-body">
              <FieldRow
                icon={User}
                label="Full Name"
                value={form.full_name}
                isDirty={isDirty('full_name')}
                inputProps={{ placeholder: 'e.g. Maria Santos', onChange: set('full_name') }}
              />
              <FieldRow
                icon={Mail}
                label="Email Address"
                value={user?.email ?? ''}
                isDirty={false}
                inputProps={{ readOnly: true, style: { color: '#aaa', cursor: 'default' } }}
              />
            </div>
          </div>

          {/* ── ACADEMIC INFO ── */}
          <div className="pf-section" style={{ marginTop: 12 }}>
            <div className="pf-section-header">
              <div className="pf-section-icon blue"><GraduationCap size={16} /></div>
              <div>
                <h4>Academic Details</h4>
                <p>Your school and program information</p>
              </div>
            </div>
            <div className="pf-section-body">
              <FieldRow
                icon={School}
                label="School / University"
                value={form.school}
                isDirty={isDirty('school')}
                inputProps={{ placeholder: 'e.g. University of Santo Tomas', onChange: set('school') }}
              />
              <FieldRow
                icon={BookOpen}
                label="Program"
                value={form.program}
                isDirty={isDirty('program')}
                inputProps={{ placeholder: 'e.g. BS Medical Technology', onChange: set('program') }}
              />
              <FieldRow
                icon={GraduationCap}
                label="Year Level"
                value={form.year_level}
                isDirty={isDirty('year_level')}
                inputProps={{ placeholder: 'e.g. 4th Year', onChange: set('year_level') }}
              />
            </div>
          </div>


          {/* ── ACTION BAR ── */}
          <div className={`pf-action-bar ${hasAnyChanges ? 'has-changes' : ''}`} style={{ marginTop: 12 }}>
            {hasAnyChanges ? (
              <span className="pf-changes-hint">
                <Edit3 size={13} /> You have unsaved changes
              </span>
            ) : (
              <span style={{ fontSize: 12, color: '#ccc', flex: 1 }}>
                All changes saved
              </span>
            )}
            {hasAnyChanges && (
              <button type="button" className="pf-discard-btn" onClick={handleDiscard}>
                <X size={14} /> Discard
              </button>
            )}
            <button type="submit" className="pf-save-btn" disabled={loading || !hasAnyChanges}>
              {loading
                ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Saving…</>
                : <><Save size={15} /> Save Profile</>
              }
            </button>
          </div>
        </form>

        {/* ── DANGER ZONE ── */}
        <div className="pf-danger-section">
          <div className="pf-danger-header">
            <div className="pf-danger-icon"><LogOut size={16} /></div>
            <div>
              <h4>Account Actions</h4>
              <p>Sign out of your account</p>
            </div>
          </div>

          {!confirmSignOut ? (
            <div className="pf-signout-row">
              <p className="pf-signout-desc">
                Sign out from this device. Your data will be saved and you can log back in anytime.
              </p>
              <button
                type="button"
                className="pf-signout-btn"
                onClick={() => setConfirmSignOut(true)}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          ) : (
            <div className="pf-confirm-signout">
              <p className="pf-confirm-text">
                Are you sure you want to sign out? Any unsaved changes will be lost.
              </p>
              <div className="pf-confirm-actions">
                <button
                  type="button"
                  className="pf-confirm-yes"
                  onClick={handleSignOut}
                  disabled={signingOut}
                >
                  {signingOut ? 'Signing out…' : 'Yes, sign out'}
                </button>
                <button
                  type="button"
                  className="pf-confirm-no"
                  onClick={() => setConfirmSignOut(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </>
  );
}