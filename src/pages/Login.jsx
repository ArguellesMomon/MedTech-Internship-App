import ThemedIcon from '../components/ui/ThemedIcon';
import '../styles/features/Login.css';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Sparkles, Eye, EyeOff, Mail, Lock, ArrowLeft } from 'lucide-react';
import Brand from '../components/layout/Brand';
import { ThemeToggle } from '../theme/ThemeProvider';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  const cardRef = useRef(null);
  const passwordRef = useRef(null);

  /* Keyboard detection */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      const shrinkRatio = vv.height / window.innerHeight;
      setKeyboardOpen(shrinkRatio < 0.75);
    }
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  /* Scroll active input into view */
  useEffect(() => {
    if (!keyboardOpen) return;
    const active = document.activeElement;
    if (active && active !== document.body) {
      setTimeout(() => {
        active.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [keyboardOpen]);

  function updateField(e) {
    setForm((cur) => ({ ...cur, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await signIn(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={`login-page${keyboardOpen ? ' keyboard-open' : ''}`}>
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        {/* Back button */}
        <button
          className="back-btn"
          onClick={() => navigate('/')}
          aria-label="Back to landing page"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <div className="login-card" ref={cardRef}>
          {/* Logo */}
          <div className="auth-brand">
            <Brand />
          </div>

          {/* Heading */}
          <div className="login-heading">
            <h1 className="login-title">
              Welcome back, <em>intern</em>.
            </h1>
            <p className="login-subtitle">Log in to continue your journey.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail size={18} />
                </span>
                <input
                  id="login-email"
                  className="form-input no-right-icon"
                  style={{ paddingRight: 16 }}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">
                Password
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  ref={passwordRef}
                  className="form-input"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={updateField}
                  placeholder="enter your password"
                  required
                />
                <button
                  type="button"
                  className="eye-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={2} />
                  ) : (
                    <Eye size={18} strokeWidth={2} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="error-box" role="alert">
                <ThemedIcon name="TriangleAlert" /> {error}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={submitting} className="submit-btn">
              <span className="btn-inner">
                <Sparkles size={16} />
                {submitting ? 'Logging in…' : 'Log in'}
              </span>
            </button>
          </form>

          <p className="bottom-text">
            New here?{' '}
            <Link to="/signup" className="bottom-link">
              Create an account
            </Link>
          </p>

          <p className="footer-note">
            © {new Date().getFullYear()} MedTech Mate. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
