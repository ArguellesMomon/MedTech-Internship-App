import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { User, School, BookOpen, GraduationCap, Save } from 'lucide-react';

export default function Profile() {
  const { profile, user, upsertProfile } = useAuth();

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    year_level: '',
    program: '',
  });

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? '',
      school: profile?.school ?? '',
      year_level: profile?.year_level ?? '',
      program: profile?.program ?? '',
    });
  }, [profile]);

  function updateField(e) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus('Saving...');

    try {
      await upsertProfile({
        id: user.id,
        email: user.email,
        ...form,
      });

      setStatus('Profile updated successfully ✨');
    } catch (err) {
      setStatus(err.message);
    }

    setLoading(false);
  }

  return (
    <div className="dashboard-card profile-card">
      {/* HEADER */}
      <div className="card-header">
        <div className="card-icon blue">
          <User size={20} />
        </div>

        <div>
          <h3>Your Profile</h3>
          <p>Manage your academic information</p>
        </div>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="cute-form">
        <div className="input-group">
          <User size={16} className="input-icon" />
          <input
            name="full_name"
            placeholder="Full Name"
            value={form.full_name}
            onChange={updateField}
          />
        </div>

        <div className="input-group">
          <School size={16} className="input-icon" />
          <input
            name="school"
            placeholder="School"
            value={form.school}
            onChange={updateField}
          />
        </div>

        <div className="input-group">
          <GraduationCap size={16} className="input-icon" />
          <input
            name="year_level"
            placeholder="Year Level"
            value={form.year_level}
            onChange={updateField}
          />
        </div>

        <div className="input-group">
          <BookOpen size={16} className="input-icon" />
          <input
            name="program"
            placeholder="Program"
            value={form.program}
            onChange={updateField}
          />
        </div>

        <button className="primary-btn" type="submit" disabled={loading}>
          <Save size={16} />
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      {/* STATUS */}
      {status && <p className="status-text">{status}</p>}

      {/* STYLES */}
      <style>{`
        .profile-card {
          max-width: 520px;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff8fa;
          border: 1px solid #ffd6e1;
          padding: 12px 14px;
          border-radius: 16px;
        }

        .input-group input {
          border: none;
          outline: none;
          background: transparent;
          width: 100%;
          font-size: 14px;
          color: #444;
        }

        .input-icon {
          color: #ff6f91;
        }

        .status-text {
          margin-top: 12px;
          font-size: 13px;
          color: #888;
        }

        .cute-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 16px;
        }

        .primary-btn {
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}
