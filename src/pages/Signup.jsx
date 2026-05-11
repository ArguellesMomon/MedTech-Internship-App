import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Heart, Sparkles } from 'lucide-react';

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    school: '',
    year_level: '',
    program: 'BS Medical Technology',
  });

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSubmitting(true);
    setError('');
    setMessage('');

    try {
      const data = await signUp({
        email: form.email,
        password: form.password,
        profileFields: {
          full_name: form.full_name,
          school: form.school,
          year_level: form.year_level,
          program: form.program,
        },
      });

      setMessage(
        data.profileWarning ??
          'Account created successfully ✨ Please check your email.',
      );

      navigate('/');
    } catch (authError) {
      setError(authError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Ignore external style.css */}
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(
              135deg,
              #fff5f7 0%,
              #ffe4ec 50%,
              #fff0e5 100%
            );
          }

          .signup-page {
            min-height: 100vh;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }

          .signup-card {
            width: 100%;
            max-width: 520px;
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(14px);
            border-radius: 32px;
            padding: 40px 28px;
            box-shadow: 0 10px 40px rgba(255, 105, 135, 0.18);
            border: 1px solid rgba(255,255,255,0.6);
          }

          .logo-wrapper {
            width: 74px;
            height: 74px;
            border-radius: 999px;
            background: linear-gradient(135deg, #ff8fb1, #ff6f91);
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 18px;
            box-shadow: 0 8px 24px rgba(255, 111, 145, 0.35);
          }

          .title {
            text-align: center;
            font-size: 2rem;
            font-weight: 700;
            color: #ff5d8f;
            margin: 0;
          }

          .subtitle {
            text-align: center;
            color: #7d7d7d;
            font-size: 0.95rem;
            margin-top: 10px;
            margin-bottom: 32px;
          }

          .form-group {
            margin-bottom: 18px;
          }

          .label {
            display: block;
            margin-bottom: 8px;
            font-size: 0.92rem;
            font-weight: 500;
            color: #5f5f5f;
          }

          .input {
            width: 100%;
            border: 1px solid #ffd3df;
            background: #fff8fa;
            border-radius: 18px;
            padding: 15px 16px;
            font-size: 15px;
            outline: none;
            transition: all 0.25s ease;
            color: #444;
          }

          .input:focus {
            border-color: #ff8fb1;
            box-shadow: 0 0 0 4px rgba(255, 143, 177, 0.18);
            background: #fff;
          }

          .submit-btn {
            width: 100%;
            border: none;
            border-radius: 20px;
            padding: 16px;
            margin-top: 10px;
            background: linear-gradient(135deg, #ff8fb1, #ff6f91);
            color: white;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.25s ease;
            box-shadow: 0 8px 20px rgba(255, 111, 145, 0.25);
          }

          .submit-btn:hover {
            transform: translateY(-1px);
          }

          .submit-btn:active {
            transform: scale(0.98);
          }

          .submit-btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .message {
            margin-top: 14px;
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 14px;
          }

          .error {
            background: #fff1f1;
            color: #d12f2f;
            border: 1px solid #ffcfcf;
          }

          .success {
            background: #f0fff4;
            color: #248f5a;
            border: 1px solid #c6f6d5;
          }

          .bottom-text {
            text-align: center;
            margin-top: 24px;
            font-size: 14px;
            color: #777;
          }

          .bottom-link {
            color: #ff5d8f;
            font-weight: 600;
            text-decoration: none;
          }

          .bottom-link:hover {
            text-decoration: underline;
          }

          .footer-note {
            text-align: center;
            margin-top: 18px;
            color: #999;
            font-size: 12px;
          }

          /* iPhone Optimization */
          @media (max-width: 480px) {
            .signup-page {
              padding: 16px;
              align-items: flex-start;
            }

            .signup-card {
              border-radius: 28px;
              padding: 28px 20px;
              margin-top: 20px;
            }

            .title {
              font-size: 1.7rem;
            }

            .input {
              padding: 14px;
              font-size: 16px;
            }

            .submit-btn {
              padding: 15px;
            }
          }

          /* iPad Optimization */
          @media (min-width: 768px) and (max-width: 1024px) {
            .signup-card {
              max-width: 600px;
              padding: 48px;
            }

            .title {
              font-size: 2.3rem;
            }

            .input {
              padding: 16px;
              font-size: 16px;
            }

            .submit-btn {
              padding: 18px;
              font-size: 16px;
            }
          }
        `}
      </style>

      <div className="signup-page">
        <div className="signup-card">
          {/* Logo */}
          <div className="logo-wrapper">
            <Heart size={32} color="white" fill="white" />
          </div>

          {/* Header */}
          <h1 className="title">Create Account</h1>

          <p className="subtitle">
            Your medtech internship companion ✨
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="label">Full Name</label>
              <input
                className="input"
                name="full_name"
                value={form.full_name}
                onChange={updateField}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">School</label>
              <input
                className="input"
                name="school"
                value={form.school}
                onChange={updateField}
                placeholder="Your school"
              />
            </div>

            <div className="form-group">
              <label className="label">Year Level</label>
              <input
                className="input"
                name="year_level"
                value={form.year_level}
                onChange={updateField}
                placeholder="e.g. 4th Year"
              />
            </div>

            <div className="form-group">
              <label className="label">Program</label>
              <input
                className="input"
                name="program"
                value={form.program}
                onChange={updateField}
              />
            </div>

            <div className="form-group">
              <label className="label">Email Address</label>
              <input
                className="input"
                type="email"
                name="email"
                value={form.email}
                onChange={updateField}
                placeholder="example@email.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                name="password"
                value={form.password}
                onChange={updateField}
                placeholder="password must be at least 6 characters"
                required
              />
            </div>

            {error && (
              <div className="message error">
                {error}
              </div>
            )}

            {message && (
              <div className="message success">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <Sparkles size={16} />
                {submitting
                  ? 'Creating Account...'
                  : 'Create Account'}
              </span>
            </button>
          </form>

          <p className="bottom-text">
            Already have an account?{' '}
            <Link to="/login" className="bottom-link">
              Log in
            </Link>
          </p>

          <p className="footer-note">
          </p>
        </div>
      </div>
    </>
  );
}