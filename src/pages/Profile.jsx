import ProfilePreferences from '../components/ProfilePreferences';
import '../styles/features/Profile.css';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/useAuth';
import { supabase } from '../lib/supabase';
import {
  User,
  School,
  BookOpen,
  GraduationCap,
  Save,
  Edit3,
  Camera,
  X,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Calendar,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Sparkles,
  Shield,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
function getInitials(name, email) {
  if (name && name.trim()) {
    return name
      .trim()
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (email?.[0] ?? '?').toUpperCase();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr + 'T12:00:00').toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function daysFromDate(dateStr) {
  if (!dateStr) return null;
  const diff = Math.round((new Date() - new Date(dateStr + 'T12:00:00')) / (1000 * 60 * 60 * 24));
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
      {isSuccess ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
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
      {error && (
        <p className="pf-avatar-error">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
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
        <span className="pf-info-value">
          {value || <span className="pf-info-empty">Not set</span>}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN PROFILE PAGE
───────────────────────────────────────────── */
export default function Profile() {
  const { profile, user, upsertProfile } = useAuth();

  /* ── Avatar ── */
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const fileInputRef = useRef(null);

  /* ── Profile edit ── */
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'success' | 'error'
  const [saveMsg, setSaveMsg] = useState('');

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    year_level: '',
    program: '',
    internship_start_date: '',
  });

  /* ── Password ── */
  const [showPwSection, setShowPwSection] = useState(false);
  const [pwForm, setPwForm] = useState({
    new_password: '',
    confirm_password: '',
  });
  const [showPw, setShowPw] = useState({ new: false, confirm: false });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwStatus, setPwStatus] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  /* ── Init ── */
  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        school: profile.school ?? '',
        year_level: profile.year_level ?? '',
        program: profile.program ?? '',
        internship_start_date: profile.internship_start_date ?? '',
      });
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
    }
  }, [profile]);

  /* ── Derived ── */
  const initials = getInitials(profile?.full_name, user?.email);
  const daysInternship = daysFromDate(profile?.internship_start_date);
  const displayName = profile?.full_name || user?.email || 'MedTech Intern';

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
      const ext = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);

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
        full_name: profile.full_name ?? '',
        school: profile.school ?? '',
        year_level: profile.year_level ?? '',
        program: profile.program ?? '',
        internship_start_date: profile.internship_start_date ?? '',
      });
    }
    setIsEditing(false);
  };

  /* ── Password change ── */
  const handlePasswordChange = async () => {
    if (!pwForm.new_password) {
      setPwStatus('error');
      setPwMsg('Please enter a new password.');
      return;
    }
    if (pwForm.new_password.length < 6) {
      setPwStatus('error');
      setPwMsg('Password must be at least 6 characters.');
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      setPwStatus('error');
      setPwMsg("Passwords don't match.");
      return;
    }

    setPwSaving(true);
    setPwStatus('');
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.new_password });
      if (error) throw error;
      setPwStatus('success');
      setPwMsg('Password updated! ✨');
      setPwForm({ new_password: '', confirm_password: '' });
      setTimeout(() => {
        setPwStatus('');
        setShowPwSection(false);
      }, 3000);
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
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleAvatarChange}
      />

      <div className="pf-page">
        <ProfilePreferences />

        {/* ── Status toast ── */}
        <StatusToast status={saveStatus} message={saveMsg} />

        {/* ══════════════════════════════════
            HERO CARD
        ══════════════════════════════════ */}
        <div className="pf-hero-card">
          {/* Banner */}
          <div className="pf-hero-banner">
            {!isEditing && (
              <button className="pf-banner-edit-btn" onClick={() => setIsEditing(true)}>
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
              <InfoCard icon={Mail} label="Email" value={user?.email} color="#5f8dff" />
              <InfoCard icon={School} label="School" value={profile?.school} color="#ff6f91" />
              <InfoCard
                icon={GraduationCap}
                label="Year Level"
                value={profile?.year_level}
                color="#ff8c5a"
              />
              <InfoCard icon={BookOpen} label="Program" value={profile?.program} color="#4abf95" />
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
              <label htmlFor="field-profile-1" className="pf-field-label">
                Full Name
                <input
                  id="field-profile-1"
                  className="pf-input"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </label>

              {/* School + Year Level */}
              <div className="pf-edit-row">
                <label htmlFor="field-profile-2" className="pf-field-label">
                  School
                  <input
                    id="field-profile-2"
                    className="pf-input"
                    placeholder="Your school"
                    value={form.school}
                    onChange={(e) => setForm({ ...form, school: e.target.value })}
                  />
                </label>
                <label htmlFor="field-profile-3" className="pf-field-label">
                  Year Level
                  <input
                    id="field-profile-3"
                    className="pf-input"
                    placeholder="e.g. 4th Year"
                    value={form.year_level}
                    onChange={(e) => setForm({ ...form, year_level: e.target.value })}
                  />
                </label>
              </div>

              {/* Program + Internship Start */}
              <div className="pf-edit-row">
                <label htmlFor="field-profile-4" className="pf-field-label">
                  Program
                  <input
                    id="field-profile-4"
                    className="pf-input"
                    placeholder="e.g. BS Medical Technology"
                    value={form.program}
                    onChange={(e) => setForm({ ...form, program: e.target.value })}
                  />
                </label>
                <label htmlFor="field-profile-5" className="pf-field-label">
                  Internship Start Date
                  <input
                    id="field-profile-5"
                    type="date"
                    className="pf-input"
                    value={form.internship_start_date}
                    onChange={(e) => setForm({ ...form, internship_start_date: e.target.value })}
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="pf-form-actions">
                <button className="pf-save-btn" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 size={15} style={{ animation: 'pf-spin 1s linear infinite' }} />
                  ) : (
                    <Save size={15} />
                  )}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button className="pf-cancel-btn" onClick={handleCancelEdit} disabled={saving}>
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
          <button className="pf-pw-toggle" onClick={() => setShowPwSection((v) => !v)}>
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
              <label htmlFor="field-profile-6" className="pf-field-label">
                New Password
                <div className="pf-pw-input-wrap">
                  <input
                    id="field-profile-6"
                    type={showPw.new ? 'text' : 'password'}
                    className="pf-input"
                    placeholder="Enter new password"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="pf-pw-eye"
                    onClick={() => setShowPw((p) => ({ ...p, new: !p.new }))}
                  >
                    {showPw.new ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <p className="pf-pw-hint">Minimum 6 characters</p>

              {/* Confirm password */}
              <label htmlFor="field-profile-7" className="pf-field-label">
                Confirm New Password
                <div className="pf-pw-input-wrap">
                  <input
                    id="field-profile-7"
                    type={showPw.confirm ? 'text' : 'password'}
                    className="pf-input"
                    placeholder="Repeat new password"
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
                  />
                  <button
                    type="button"
                    className="pf-pw-eye"
                    onClick={() => setShowPw((p) => ({ ...p, confirm: !p.confirm }))}
                  >
                    {showPw.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {/* Match indicator */}
              {pwForm.confirm_password.length > 0 && (
                <p
                  style={{
                    fontSize: 12,
                    margin: '-8px 0 0',
                    paddingLeft: 2,
                    fontWeight: 600,
                    color: pwForm.new_password === pwForm.confirm_password ? '#4abf95' : '#e05555',
                  }}
                >
                  {pwForm.new_password === pwForm.confirm_password
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </p>
              )}

              <button className="pf-pw-save-btn" onClick={handlePasswordChange} disabled={pwSaving}>
                {pwSaving ? (
                  <Loader2 size={15} style={{ animation: 'pf-spin 1s linear infinite' }} />
                ) : (
                  <Shield size={15} />
                )}
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
