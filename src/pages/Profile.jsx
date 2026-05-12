import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../lib/supabase';
import {
  User, School, BookOpen, GraduationCap, Save,
  Edit3, Camera, X, Check, Eye, EyeOff, Lock,
  Mail, Calendar, ChevronDown, ChevronUp,
  AlertCircle, CheckCircle2, Loader2, Clock,
  Sparkles, Shield,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getInitials(name, email) {
  if (name && name.trim()) {
    return name.trim().split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
  });
}

function daysFromDate(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round(
    (new Date() - new Date(dateStr + 'T12:00:00')) / (1000 * 60 * 60 * 24)
  );
  return Math.max(0, diff);
}

/* ─────────────────────────────────────────────
   STATUS TOAST
───────────────────────────────────────────── */
function StatusToast({ status, message }) {
  if (!status || !message) return null;
  const isSuccess = status === 'success';
  return (
    <div className={`pf-toast ${isSuccess ? 'success' : 'error'}`}>
      {isSuccess
        ? <CheckCircle2 size={15} />
        : <AlertCircle size={15} />}
      <span>{message}</span>
    </div>
  );
}

/* ─────────────────────────────────────────────
   AVATAR COMPONENT
───────────────────────────────────────────── */
function AvatarBlock({ avatarUrl, initials, uploading, error, onClick }) {
  return (
    <div className="pf-avatar-section">
      <div className="pf-avatar-ring" onClick={onClick} title="Change profile picture">
        <div className="pf-avatar-circle">
          {uploading ? (
            <Loader2 size={28} className="pf-avatar-spinner" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="pf-avatar-img" />
          ) : (
            <span className="pf-avatar-initials">{initials}</span>
          )}
        </div>
        <div className="pf-avatar-overlay">
          <Camera size={17} />
          <span>Change</span>
        </div>
      </div>
      {error && <p className="pf-avatar-error"><AlertCircle size={12} />{error}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────
   PROFILE INFO CARD (view mode)
───────────────────────────────────────────── */
function InfoCard({ icon: Icon, label, value, color }) {
  return (
    <div className="pf-info-card" style={{ '--card-accent': color }}>
      <div className="pf-info-icon-wrap">
        <Icon size={16} />
      </div>
      <div className="pf-info-content">
        <span className="pf-info-label">{label}</span>
        <span className="pf-info-value">{value || <span className="pf-info-empty">Not set</span>}</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PROFILE PAGE
───────────────────────────────────────────── */
export default function Profile() {
  const { profile, user, upsertProfile, refreshProfile } = useAuth();

  /* ── Avatar ── */
  const [avatarUrl,       setAvatarUrl]       = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError,     setAvatarError]     = useState('');
  const fileInputRef = useRef(null);

  /* ── Profile edit ── */
  const [isEditing, setIsEditing] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'success' | 'error'
  const [saveMsg,    setSaveMsg]    = useState('');

  const [form, setForm] = useState({
    full_name:             '',
    school:                '',
    year_level:            '',
    program:               '',
    internship_start_date: '',
  });

  /* ── Password ── */
  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({
    new_password:     '',
    confirm_password: '',
  });
  const [showPw,   setShowPw]   = useState({ new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState('');
  const [pwMsg,    setPwMsg]    = useState('');

  /* ── Init ── */
  useEffect(() => {
    if (profile) {
      setForm({
        full_name:             profile.full_name             ?? '',
        school:                profile.school                ?? '',
        year_level:            profile.year_level            ?? '',
        program:               profile.program               ?? '',
        internship_start_date: profile.internship_start_date ?? '',
      });
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  /* ── Derived ── */
  const initials        = getInitials(profile?.full_name, user?.email);
  const daysInternship  = daysFromDate(profile?.internship_start_date);
  const displayName     = profile?.full_name || user?.email || 'MedTech Intern';

  /* ── Avatar upload ── */
  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setAvatarError('Please select an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Image must be under 5 MB.');
      return;
    }

    setAvatarUploading(true);
    setAvatarError('');

    // Instant local preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarUrl(previewUrl);

    try {
      const ext      = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Append timestamp to bust CDN cache
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setAvatarUrl(publicUrl);

      // Persist to profiles table directly (upsertProfile doesn't carry avatar_url)
await upsertProfile({ avatar_url: publicUrl });
    } catch (err) {
      setAvatarError('Upload failed: ' + (err.message ?? 'Unknown error'));
      setAvatarUrl(profile?.avatar_url ?? null);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  /* ── Profile save ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('');
    try {
      // upsertProfile handles standard fields
      await upsertProfile({ id: user.id, email: user.email, ...form });

      
      setSaveStatus('success');
      setSaveMsg('Profile updated successfully ✨');
      setIsEditing(false);
    } catch (err) {
      setSaveStatus('error');
      setSaveMsg(err.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(''), 4000);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setForm({
        full_name:             profile.full_name             ?? '',
        school:                profile.school                ?? '',
        year_level:            profile.year_level            ?? '',
        program:               profile.program               ?? '',
        internship_start_date: profile.internship_start_date ?? '',
      });
    }
    setIsEditing(false);
  };

  /* ── Password change ── */
  const handlePasswordChange = async () => {
    if (!pwForm.new_password) {
      setPwStatus('error'); setPwMsg('Please enter a new password.'); return;
    }
    if (pwForm.new_password.length < 6) {
      setPwStatus('error'); setPwMsg('Password must be at least 6 characters.'); return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwStatus('error'); setPwMsg("Passwords don't match."); return;
    }

    setPwSaving(true);
    setPwStatus('');
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.new_password });
      if (error) throw error;
      setPwStatus('success');
      setPwMsg('Password updated! ✨');
      setPwForm({ new_password: '', confirm_password: '' });
      setTimeout(() => { setPwStatus(''); setShowPwSection(false); }, 3000);
    } catch (err) {
      setPwStatus('error');
      setPwMsg(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  /* ── Render ── */
  return (
    <>
      <style>{`
        /* ── Page ── */
        .pf-page {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          padding-bottom: 32px;
        }

        /* ── Toast ── */
        .pf-toast {
          display: flex; align-items: center; gap: 10px;
          border-radius: 16px; padding: 13px 18px; font-size: 13px; font-weight: 600;
          animation: pf-slide-in 0.3s ease;
        }
        .pf-toast.success { background: #edfaf4; color: #2d8a61; border: 1px solid #b8f0da; }
        .pf-toast.error   { background: #fff0f0; color: #c0392b; border: 1px solid #ffd0d0; }
        @keyframes pf-slide-in {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0);     }
        }

        /* ── Hero card ── */
        .pf-hero-card {
          background: rgba(255,255,255,0.88);
          border-radius: 28px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 12px 36px rgba(255,111,145,0.1);
          overflow: hidden;
        }

        /* Gradient banner */
        .pf-hero-banner {
          height: 110px;
          background: linear-gradient(135deg, #ffb3cb 0%, #ff8fb1 40%, #ff6f91 80%, #ff9a72 100%);
          position: relative;
        }
        .pf-hero-banner::after {
          content: '';
          position: absolute;
          inset: 0;
          background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.06'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
        }

        /* Edit button in banner */
        .pf-banner-edit-btn {
          position: absolute;
          top: 14px; right: 16px;
          display: flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.22);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.4);
          color: white; border-radius: 999px;
          padding: 8px 16px; font-size: 13px; font-weight: 600;
          cursor: pointer; transition: 0.2s; z-index: 2;
        }
        .pf-banner-edit-btn:hover {
          background: rgba(255,255,255,0.35);
          transform: translateY(-1px);
        }

        /* ── Avatar ── */
        .pf-hero-body {
          padding: 0 24px 24px;
          display: flex; flex-direction: column; align-items: center;
          text-align: center; gap: 12px;
        }

        .pf-avatar-section { display: flex; flex-direction: column; align-items: center; gap: 6px; }

        .pf-avatar-ring {
          width: 96px; height: 96px;
          margin-top: -48px;
          border-radius: 50%;
          border: 4px solid white;
          box-shadow: 0 8px 24px rgba(255,111,145,0.22);
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s;
          flex-shrink: 0;
        }
        .pf-avatar-ring:hover { transform: scale(1.04); }

        .pf-avatar-circle {
          width: 100%; height: 100%;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          display: flex; align-items: center; justify-content: center;
        }

        .pf-avatar-img {
          width: 100%; height: 100%;
          object-fit: cover; border-radius: 50%;
        }

        .pf-avatar-initials {
          font-size: 32px; font-weight: 700; color: white;
          line-height: 1; user-select: none;
        }

        .pf-avatar-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.45);
          border-radius: 50%;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 3px;
          color: white; font-size: 11px; font-weight: 600;
          opacity: 0; transition: opacity 0.2s;
        }
        .pf-avatar-ring:hover .pf-avatar-overlay { opacity: 1; }

        @keyframes pf-spin {
          to { transform: rotate(360deg); }
        }
        .pf-avatar-spinner { animation: pf-spin 1s linear infinite; color: white; }

        .pf-avatar-error {
          display: flex; align-items: center; gap: 5px;
          font-size: 11px; color: #e05555; margin: 0;
        }

        /* ── Hero text ── */
        .pf-hero-name {
          font-size: 1.55rem; font-weight: 700;
          color: #333; margin: 0; line-height: 1.3;
        }

        .pf-hero-email {
          font-size: 13px; color: #aaa; margin: 0;
        }

        .pf-hero-chips {
          display: flex; align-items: center;
          justify-content: center; gap: 8px; flex-wrap: wrap;
        }

        .pf-program-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white; border-radius: 999px;
          padding: 6px 14px; font-size: 12px; font-weight: 600;
        }

        .pf-days-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: #eff4ff; color: #5f8dff;
          border: 1px solid #c5d9ff;
          border-radius: 999px; padding: 6px 14px;
          font-size: 12px; font-weight: 600;
        }

        /* ── Info grid ── */
        .pf-section-card {
          background: rgba(255,255,255,0.88);
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 8px 28px rgba(255,111,145,0.07);
          padding: 22px;
        }

        .pf-section-title {
          font-size: 13px; font-weight: 700; color: #bbb;
          text-transform: uppercase; letter-spacing: 0.08em;
          margin: 0 0 16px; display: flex; align-items: center; gap: 8px;
        }

        .pf-info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .pf-info-card {
          display: flex; align-items: flex-start; gap: 12px;
          background: #fff8fb;
          border: 1.5px solid #ffe0ea;
          border-radius: 18px;
          padding: 14px;
          transition: box-shadow 0.2s, transform 0.2s;
        }
        .pf-info-card:hover {
          box-shadow: 0 4px 14px rgba(255,111,145,0.1);
          transform: translateY(-1px);
        }

        .pf-info-icon-wrap {
          width: 34px; height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }

        .pf-info-content {
          display: flex; flex-direction: column; gap: 3px; min-width: 0;
        }

        .pf-info-label {
          font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #ccc; margin: 0;
        }

        .pf-info-value {
          font-size: 13px; font-weight: 600; color: #444; margin: 0;
          word-break: break-word; line-height: 1.4;
        }

        .pf-info-empty { color: #ddd; font-weight: 400; }

        /* ── Edit form ── */
        .pf-edit-grid {
          display: flex; flex-direction: column; gap: 14px;
        }

        .pf-edit-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .pf-field-label {
          display: flex; flex-direction: column; gap: 7px;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: #aaa;
        }

        .pf-input {
          border: 1.5px solid #ffd6e1;
          background: #fff8fa;
          border-radius: 14px;
          padding: 12px 14px;
          font-size: 14px; outline: none;
          transition: 0.2s; color: #444;
          font-family: inherit; width: 100%;
        }
        .pf-input:focus {
          border-color: #ff8fb1; background: white;
          box-shadow: 0 0 0 3px rgba(255,143,177,0.15);
        }

        .pf-form-actions {
          display: flex; gap: 10px; padding-top: 4px;
        }

        .pf-save-btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: none;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white; border-radius: 999px;
          padding: 12px 24px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: 0.2s;
        }
        .pf-save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(255,111,145,0.3); }
        .pf-save-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        .pf-cancel-btn {
          border: none; background: #f0f0f0; color: #666;
          border-radius: 999px; padding: 12px 20px;
          font-size: 14px; font-weight: 600; cursor: pointer; transition: 0.2s;
        }
        .pf-cancel-btn:hover { background: #e8e8e8; }

        /* ── Password section ── */
        .pf-pw-toggle {
          width: 100%;
          display: flex; align-items: center; gap: 10px;
          background: none; border: none;
          font-size: 14px; font-weight: 600; color: #666;
          cursor: pointer; padding: 0; transition: color 0.2s;
        }
        .pf-pw-toggle:hover { color: #ff5d8f; }
        .pf-pw-toggle-icon {
          width: 32px; height: 32px; border-radius: 10px;
          background: linear-gradient(135deg, #8b6fff, #7b5ce0);
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }
        .pf-pw-toggle-label { flex: 1; text-align: left; }
        .pf-pw-toggle-chevron { color: #ccc; margin-left: auto; }

        .pf-pw-form {
          display: flex; flex-direction: column; gap: 14px;
          padding-top: 18px;
          border-top: 1px solid #f5e6ea;
          margin-top: 18px;
          animation: pf-slide-in 0.25s ease;
        }

        .pf-pw-input-wrap { position: relative; }
        .pf-pw-input-wrap .pf-input { padding-right: 44px; }
        .pf-pw-eye {
          position: absolute; right: 13px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: #ccc; cursor: pointer;
          display: flex; align-items: center;
          transition: color 0.2s; padding: 0;
        }
        .pf-pw-eye:hover { color: #ff8fb1; }

        .pf-pw-hint {
          font-size: 11px; color: #ccc;
          margin: -8px 0 0; padding-left: 2px;
        }

        .pf-pw-save-btn {
          display: inline-flex; align-items: center; gap: 8px;
          border: none;
          background: linear-gradient(135deg, #a78bfa, #8b6fff);
          color: white; border-radius: 999px;
          padding: 12px 24px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: 0.2s; align-self: flex-start;
        }
        .pf-pw-save-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(139,111,255,0.3); }
        .pf-pw-save-btn:disabled { opacity: 0.65; cursor: not-allowed; }

        /* ── Responsive — iPhone (< 768px) ── */
        @media (max-width: 767px) {
          .pf-page            { gap: 16px; padding-bottom: 20px; }
          .pf-hero-banner     { height: 90px; }
          .pf-hero-body       { padding: 0 18px 20px; }
          .pf-avatar-ring     { width: 84px; height: 84px; margin-top: -42px; }
          .pf-avatar-initials { font-size: 28px; }
          .pf-hero-name       { font-size: 1.35rem; }
          .pf-section-card    { padding: 18px; border-radius: 20px; }
          .pf-info-grid       { grid-template-columns: 1fr; }
          .pf-edit-row        { grid-template-columns: 1fr; }
          .pf-form-actions    { flex-direction: column; }
          .pf-save-btn,
          .pf-cancel-btn      { width: 100%; justify-content: center; }
          .pf-pw-save-btn     { width: 100%; justify-content: center; }
          .pf-banner-edit-btn { padding: 7px 12px; font-size: 12px; }
        }

        /* ── Responsive — iPad portrait (768–1023px) ── */
        @media (min-width: 768px) and (max-width: 1023px) {
          .pf-page         { max-width: 640px; }
          .pf-hero-banner  { height: 120px; }
          .pf-avatar-ring  { width: 100px; height: 100px; margin-top: -50px; }
          .pf-info-grid    { grid-template-columns: repeat(2, 1fr); }
          .pf-edit-row     { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── iPad landscape (1024px+) ── */
        @media (min-width: 1024px) {
          .pf-info-grid { grid-template-columns: repeat(2, 1fr); }
          .pf-edit-row  { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

      <div className="pf-page">

        {/* ── Status toast ── */}
        <StatusToast status={saveStatus} message={saveMsg} />

        {/* ══════════════════════════════════
            HERO CARD
        ══════════════════════════════════ */}
        <div className="pf-hero-card">
          {/* Banner */}
          <div className="pf-hero-banner">
            {!isEditing && (
              <button
                className="pf-banner-edit-btn"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 size={14} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Body */}
          <div className="pf-hero-body">
            {/* Avatar */}
            <AvatarBlock
              avatarUrl={avatarUrl}
              initials={initials}
              uploading={avatarUploading}
              error={avatarError}
              onClick={handleAvatarClick}
            />

            {/* Name & info */}
            <h1 className="pf-hero-name">{displayName}</h1>
            <p className="pf-hero-email">{user?.email}</p>

            <div className="pf-hero-chips">
              {profile?.program && (
                <span className="pf-program-chip">
                  <GraduationCap size={13} />
                  {profile.program}
                </span>
              )}
              {daysInternship !== null && (
                <span className="pf-days-chip">
                  <Clock size={13} />
                  Day {daysInternship} of internship
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════
            PROFILE INFORMATION
        ══════════════════════════════════ */}
        <div className="pf-section-card">
          <p className="pf-section-title">
            <User size={13} />
            Profile Information
          </p>

          {/* ── VIEW MODE ── */}
          {!isEditing ? (
            <div className="pf-info-grid">
              <InfoCard
                icon={Mail}
                label="Email"
                value={user?.email}
                color="#5f8dff"
              />
              <InfoCard
                icon={School}
                label="School"
                value={profile?.school}
                color="#ff6f91"
              />
              <InfoCard
                icon={GraduationCap}
                label="Year Level"
                value={profile?.year_level}
                color="#ff8c5a"
              />
              <InfoCard
                icon={BookOpen}
                label="Program"
                value={profile?.program}
                color="#4abf95"
              />
              <InfoCard
                icon={Calendar}
                label="Internship Start"
                value={formatDate(profile?.internship_start_date)}
                color="#8b6fff"
              />
              <InfoCard
                icon={Sparkles}
                label="Member Since"
                value={formatDate(user?.created_at?.slice(0, 10))}
                color="#ff8fb1"
              />
            </div>
          ) : (
            /* ── EDIT MODE ── */
            <div className="pf-edit-grid">
              {/* Full name — full width */}
              <label className="pf-field-label">
                Full Name
                <input
                  className="pf-input"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                />
              </label>

              {/* School + Year Level */}
              <div className="pf-edit-row">
                <label className="pf-field-label">
                  School
                  <input
                    className="pf-input"
                    placeholder="Your school"
                    value={form.school}
                    onChange={e => setForm({ ...form, school: e.target.value })}
                  />
                </label>
                <label className="pf-field-label">
                  Year Level
                  <input
                    className="pf-input"
                    placeholder="e.g. 4th Year"
                    value={form.year_level}
                    onChange={e => setForm({ ...form, year_level: e.target.value })}
                  />
                </label>
              </div>

              {/* Program + Internship Start */}
              <div className="pf-edit-row">
                <label className="pf-field-label">
                  Program
                  <input
                    className="pf-input"
                    placeholder="e.g. BS Medical Technology"
                    value={form.program}
                    onChange={e => setForm({ ...form, program: e.target.value })}
                  />
                </label>
                <label className="pf-field-label">
                  Internship Start Date
                  <input
                    type="date"
                    className="pf-input"
                    value={form.internship_start_date}
                    onChange={e => setForm({ ...form, internship_start_date: e.target.value })}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="pf-form-actions">
                <button
                  className="pf-save-btn"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving
                    ? <Loader2 size={15} style={{ animation: 'pf-spin 1s linear infinite' }} />
                    : <Save size={15} />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  className="pf-cancel-btn"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════
            CHANGE PASSWORD
        ══════════════════════════════════ */}
        <div className="pf-section-card">
          {/* Toggle button */}
          <button
            className="pf-pw-toggle"
            onClick={() => setShowPwSection(v => !v)}
          >
            <div className="pf-pw-toggle-icon">
              <Lock size={15} />
            </div>
            <span className="pf-pw-toggle-label">Change Password</span>
            <span className="pf-pw-toggle-chevron">
              {showPwSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {/* Expandable form */}
          {showPwSection && (
            <div className="pf-pw-form">
              <StatusToast status={pwStatus} message={pwMsg} />

              {/* New password */}
              <label className="pf-field-label">
                New Password
                <div className="pf-pw-input-wrap">
                  <input
                    type={showPw.new ? 'text' : 'password'}
                    className="pf-input"
                    placeholder="Enter new password"
                    value={pwForm.new_password}
                    onChange={e => setPwForm({ ...pwForm, new_password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="pf-pw-eye"
                    onClick={() => setShowPw(p => ({ ...p, new: !p.new }))}
                  >
                    {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <p className="pf-pw-hint">Minimum 6 characters</p>

              {/* Confirm password */}
              <label className="pf-field-label">
                Confirm New Password
                <div className="pf-pw-input-wrap">
                  <input
                    type={showPw.confirm ? 'text' : 'password'}
                    className="pf-input"
                    placeholder="Repeat new password"
                    value={pwForm.confirm_password}
                    onChange={e => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="pf-pw-eye"
                    onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                  >
                    {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {/* Match indicator */}
              {pwForm.confirm_password.length > 0 && (
                <p style={{
                  fontSize: 12, margin: '-8px 0 0', paddingLeft: 2, fontWeight: 600,
                  color: pwForm.new_password === pwForm.confirm_password ? '#4abf95' : '#e05555',
                }}>
                  {pwForm.new_password === pwForm.confirm_password
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </p>
              )}

              <button
                className="pf-pw-save-btn"
                onClick={handlePasswordChange}
                disabled={pwSaving}
              >
                {pwSaving
                  ? <Loader2 size={15} style={{ animation: 'pf-spin 1s linear infinite' }} />
                  : <Shield size={15} />}
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>

      </div>
    </>
  );
}