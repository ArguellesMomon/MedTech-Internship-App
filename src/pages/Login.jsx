import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { Sparkles, Eye, EyeOff, Mail, Lock } from 'lucide-react';
import Logo from '../assets/Logo.png';

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

  /* ── Keyboard detection ── */
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

  /* ── Scroll active input into view when keyboard opens ── */
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
      <style>{`
        *,
        *::before,
        *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #root {
          width: 100%;
          min-height: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
        }

        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #fff5f7 0%, #ffe4ec 50%, #fff0e5 100%);
          background-attachment: fixed;
        }

        /* ── PAGE SHELL ── */
        .login-page {
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 28px 20px;
          transition: padding 0.25s ease;
        }

        .login-page.keyboard-open {
          justify-content: flex-start;
          padding-top: 20px;
        }

        /* ── CARD ── */
        .login-card {
          width: 100%;
          max-width: 480px;
          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 32px;
          padding: 42px 32px;
          box-shadow: 0 12px 48px rgba(255, 111, 145, 0.18);
          border: 1px solid rgba(255, 255, 255, 0.7);
          transition: padding 0.2s ease, border-radius 0.2s ease;
        }

        /* ── LOGO ── */
        .logo-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 10px;
          transition: transform 0.2s ease;
        }

        .logo-img {
          width: 500px;
          height: auto;
          object-fit: contain;
          display: block;
          /* Preserve transparency */
          background: transparent;
          transition: transform 0.2s ease, width 0.2s ease;
        }

        .keyboard-open .logo-wrapper {
          margin-bottom: 4px;
        }

        .keyboard-open .logo-img {
          width: 80px;
        }

        /* ── TITLE ── */
        .login-title {
          text-align: center;
          font-size: 2.1rem;
          font-weight: 700;
          color: #ff5d8f;
          margin-bottom: 0;
          line-height: 1;
          padding-bottom: 6px;
        }

        .keyboard-open .login-subtitle {
          margin-bottom: 18px;
        }

        /* ── FORM GROUP ── */
        .form-group {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #666;
          letter-spacing: 0.01em;
        }

        /* ── INPUT WRAPPER ── */
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 15px;
          color: #ffaac5;
          pointer-events: none;
          display: flex;
          align-items: center;
          z-index: 1;
          flex-shrink: 0;
        }

        .form-input {
          width: 100%;
          border: 1.5px solid #ffd3df;
          background: #fff8fa;
          border-radius: 18px;
          padding: 14px 48px 14px 44px;
          font-size: 15px;
          font-family: 'Poppins', sans-serif;
          outline: none;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          color: #444;
          -webkit-appearance: none;
          appearance: none;
        }

        .form-input:focus {
          border-color: #ff8fb1;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(255, 143, 177, 0.16);
        }

        .form-input.no-right-icon {
          padding-right: 16px;
        }

        /* ── Hide browser-native password icons ── */
        .form-input[type="password"]::-ms-reveal,
        .form-input[type="password"]::-ms-clear { display: none !important; }
        .form-input::-webkit-credentials-auto-fill-button { display: none !important; visibility: hidden; pointer-events: none; }
        .form-input::-webkit-contacts-auto-fill-button { display: none !important; visibility: hidden; pointer-events: none; }

        /* ── Eye toggle ── */
        .eye-toggle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #ffaac5;
          border-radius: 0 18px 18px 0;
          transition: color 0.18s, background 0.18s;
          flex-shrink: 0;
          z-index: 2;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }

        .eye-toggle:hover  { color: #ff6f91; background: rgba(255,111,145,0.06); }
        .eye-toggle:active { color: #ff6f91; background: rgba(255,111,145,0.12); }

        /* ── ERROR ── */
        .error-box {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: #fff1f1;
          color: #c0392b;
          border: 1px solid #ffcfcf;
          padding: 12px 14px;
          border-radius: 14px;
          font-size: 13px;
          margin-bottom: 14px;
          line-height: 1.45;
        }

        /* ── SUBMIT ── */
        .submit-btn {
          width: 100%;
          border: none;
          border-radius: 20px;
          padding: 15px;
          margin-top: 6px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: transform 0.22s, box-shadow 0.22s, opacity 0.22s;
          box-shadow: 0 8px 22px rgba(255, 111, 145, 0.28);
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .submit-btn:hover   { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(255,111,145,0.35); }
        .submit-btn:active  { transform: scale(0.98); }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

        .btn-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        /* ── BOTTOM ── */
        .bottom-text {
          text-align: center;
          margin-top: 22px;
          font-size: 14px;
          color: #888;
        }

        .bottom-link {
          color: #ff5d8f;
          font-weight: 600;
          text-decoration: none;
        }

        .bottom-link:hover { text-decoration: underline; }

        .footer-note {
          text-align: center;
          margin-top: 16px;
          color: #bbb;
          font-size: 12px;
        }

        /* ── RESPONSIVE ── */

        @media (max-width: 600px) {
          .login-page { padding: 20px 16px; }
          .login-card { border-radius: 26px; padding: 32px 22px; }
          .keyboard-open .login-card { padding-top: 24px; border-radius: 24px; }
          .login-title { font-size: 1.75rem; }
          .form-input { font-size: 16px; }
          .logo-img { width: 300px; }
          .eye-toggle { width: 48px; }
        }

        @media (max-width: 812px) and (orientation: landscape) {
          .login-page { justify-content: flex-start; padding-top: 16px; }
          .login-card { padding: 24px 28px; border-radius: 24px; }
          .logo-img { width: 300px; }
          .login-title { font-size: 1.5rem; }
          .form-group { margin-bottom: 12px; }
        }

        @media (min-width: 601px) and (max-width: 1024px) and (orientation: portrait) {
          .login-card { max-width: 520px; padding: 48px 40px; }
          .login-title { font-size: 2.3rem; }
          .logo-img { width: 500px; }
          .form-input { font-size: 16px; padding: 15px 50px 15px 46px; }
          .eye-toggle { width: 52px; }
          .submit-btn { padding: 17px; font-size: 16px; }
        }

        @media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
          .login-card { max-width: 500px; padding: 40px 36px; }
          .form-input { font-size: 16px; }
          .eye-toggle { width: 52px; }
        }
      `}</style>

      <div className={`login-page${keyboardOpen ? ' keyboard-open' : ''}`}>
        <div className="login-card" ref={cardRef}>

          {/* Logo */}
          <div className="logo-wrapper">
            <img
              src={Logo}
              alt="MedTech Mate"
              className="logo-img"
              draggable={false}
            />
          </div>


          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">
                Email Address
              </label>
              <div className="input-wrapper">
                <span className="input-icon">
                  <Mail size={17} />
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
                  <Lock size={17} />
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
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setShowPassword((v) => !v);
                  }}
                >
                  {showPassword
                    ? <EyeOff size={18} strokeWidth={2} />
                    : <Eye    size={18} strokeWidth={2} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="error-box" role="alert">
                ⚠️ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="submit-btn"
            >
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