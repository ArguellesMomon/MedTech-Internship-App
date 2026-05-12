import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import {
  Sparkles, Eye, EyeOff,
  User, School, GraduationCap, BookOpen,
  Mail, Lock, ChevronRight, ChevronLeft, Check,
} from 'lucide-react';
import Logo from '../assets/Logo.png';

/* ─────────────────────────────────────────────
   STEP DEFINITIONS
───────────────────────────────────────────── */
const STEPS = [
  { id: 'personal',  label: 'Personal',  icon: User          },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'account',   label: 'Account',   icon: Lock          },
];

export default function Signup() {
  const { signUp } = useAuth();
  const navigate   = useNavigate();

  const [step,      setStep]      = useState(0);
  const [direction, setDirection] = useState('forward');
  const [animating, setAnimating] = useState(false);

  const [form, setForm] = useState({
    full_name:  '',
    school:     '',
    year_level: '',
    program:    'BS Medical Technology',
    email:      '',
    password:   '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message,      setMessage]      = useState('');
  const [error,        setError]        = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);

  /* ── Keyboard detection ── */
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(vv.height / window.innerHeight < 0.75);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!keyboardOpen) return;
    const active = document.activeElement;
    if (active && active !== document.body) {
      setTimeout(() => active.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  }, [keyboardOpen]);

  function set(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  /* ── Step navigation ── */
  function goTo(next) {
    if (animating) return;
    setDirection(next > step ? 'forward' : 'back');
    setError('');
    setAnimating(true);
    setTimeout(() => { setStep(next); setAnimating(false); }, 220);
  }

  function validateStep() {
    if (step === 0 && !form.full_name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (step === 2) {
      if (!form.email.trim())        { setError('Please enter your email address.'); return false; }
      if (form.password.length < 6)  { setError('Password must be at least 6 characters.'); return false; }
    }
    return true;
  }

  function handleNext()  { if (validateStep()) goTo(step + 1); }
  function handleBack()  { goTo(step - 1); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateStep()) return;
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      const data = await signUp({
        email:    form.email,
        password: form.password,
        profileFields: {
          full_name:  form.full_name,
          school:     form.school,
          year_level: form.year_level,
          program:    form.program,
        },
      });
      setMessage(data.profileWarning ?? 'Account created! ✨ Check your email.');
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
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        html, body, #root {
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          overflow-x: hidden;
        }

        body {
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #fff5f7 0%, #ffe4ec 50%, #fff0e5 100%);
          background-attachment: fixed;
        }

        /* ── PAGE ── */
        .su-page {
          width: 100%;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 28px 20px;
          transition: justify-content 0.2s ease, padding 0.2s ease;
        }

        .su-page.keyboard-open {
          justify-content: flex-start;
          padding-top: 20px;
        }

        /* ── CARD ── */
        .su-card {
          width: 100%;
          max-width: 480px;
          background: rgba(255,255,255,0.93);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 32px;
          padding: 36px 30px 30px;
          box-shadow: 0 12px 48px rgba(255,111,145,0.18);
          border: 1px solid rgba(255,255,255,0.7);
          overflow: hidden;
        }

        /* ── LOGO ── */
        .su-logo-wrap {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 auto 12px;
          transition: transform 0.2s ease;
        }

        .su-logo-img {
          width: 110px;
          height: auto;
          object-fit: contain;
          display: block;
          background: transparent;
          transition: width 0.2s ease;
          -webkit-user-drag: none;
          user-select: none;
        }

        .keyboard-open .su-logo-wrap { margin-bottom: 4px; }
        .keyboard-open .su-logo-img  { width: 72px; }

        /* ── HEADER ── */
        .su-title {
          text-align: center;
          font-size: 1.9rem;
          font-weight: 700;
          color: #ff5d8f;
          margin-bottom: 4px;
          line-height: 1.15;
        }

        .su-subtitle {
          text-align: center;
          color: #999;
          font-size: 0.88rem;
          margin-bottom: 22px;
          transition: margin 0.2s ease;
        }

        .keyboard-open .su-subtitle { margin-bottom: 12px; }

        /* ── STEP INDICATORS ── */
        .su-steps {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 24px;
        }

        .su-step-item {
          display: flex;
          align-items: center;
          gap: 0;
        }

        .su-step-bubble {
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          transition: all 0.3s ease;
          position: relative;
          flex-shrink: 0;
        }

        .su-step-bubble.done {
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          box-shadow: 0 4px 12px rgba(255,111,145,0.35);
        }

        .su-step-bubble.active {
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          box-shadow: 0 4px 16px rgba(255,111,145,0.4);
          transform: scale(1.1);
        }

        .su-step-bubble.upcoming {
          background: #f0e6ea;
          color: #cca0b0;
        }

        .su-step-connector {
          width: 40px; height: 2px;
          background: #f0e6ea;
          transition: background 0.4s ease;
          flex-shrink: 0;
        }

        .su-step-connector.filled {
          background: linear-gradient(90deg, #ff8fb1, #ff6f91);
        }

        .su-step-label {
          position: absolute;
          top: 42px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 9px;
          font-weight: 600;
          white-space: nowrap;
          color: #cca0b0;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .su-step-bubble.active .su-step-label,
        .su-step-bubble.done  .su-step-label { color: #ff8fb1; }

        /* ── STEP PANEL ── */
        .su-panel-wrap {
          overflow: hidden;
          position: relative;
          min-height: 200px;
        }

        .su-panel {
          animation-duration: 220ms;
          animation-fill-mode: both;
          animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideInRight  { from { opacity:0; transform:translateX(32px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft   { from { opacity:0; transform:translateX(-32px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideOutLeft  { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(-32px); } }
        @keyframes slideOutRight { from { opacity:1; transform:translateX(0); } to { opacity:0; transform:translateX(32px);  } }

        .su-panel.enter-forward { animation-name: slideInRight; }
        .su-panel.enter-back    { animation-name: slideInLeft;  }
        .su-panel.exit-forward  { animation-name: slideOutLeft;  position:absolute; top:0; left:0; right:0; }
        .su-panel.exit-back     { animation-name: slideOutRight; position:absolute; top:0; left:0; right:0; }

        /* ── STEP HEADING ── */
        .su-step-heading {
          font-size: 1rem;
          font-weight: 700;
          color: #333;
          margin-bottom: 4px;
        }

        .su-step-desc {
          font-size: 12px;
          color: #bbb;
          margin-bottom: 18px;
        }

        /* ── INPUT GROUP ── */
        .su-group { margin-bottom: 14px; }

        .su-label {
          display: block;
          margin-bottom: 7px;
          font-size: 0.85rem;
          font-weight: 600;
          color: #666;
        }

        .su-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .su-input-icon {
          position: absolute;
          left: 14px;
          color: #ffaac5;
          pointer-events: none;
          display: flex;
          align-items: center;
          z-index: 1;
        }

        .su-input {
          width: 100%;
          border: 1.5px solid #ffd3df;
          background: #fff8fa;
          border-radius: 16px;
          padding: 13px 16px 13px 42px;
          font-size: 15px;
          font-family: 'Poppins', sans-serif;
          outline: none;
          transition: border-color 0.22s, box-shadow 0.22s, background 0.22s;
          color: #444;
          -webkit-appearance: none;
          appearance: none;
        }

        .su-input:focus {
          border-color: #ff8fb1;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(255,143,177,0.16);
        }

        .su-input.with-eye { padding-right: 50px; }

        .su-input[type="password"]::-ms-reveal,
        .su-input[type="password"]::-ms-clear { display: none !important; }
        .su-input::-webkit-credentials-auto-fill-button { display: none !important; visibility: hidden; pointer-events: none; }
        .su-input::-webkit-contacts-auto-fill-button    { display: none !important; visibility: hidden; pointer-events: none; }

        /* ── EYE TOGGLE ── */
        .su-eye-toggle {
          position: absolute;
          right: 0; top: 0; bottom: 0;
          width: 48px;
          display: flex; align-items: center; justify-content: center;
          background: transparent;
          border: none;
          cursor: pointer;
          color: #ffaac5;
          border-radius: 0 16px 16px 0;
          z-index: 2;
          flex-shrink: 0;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.18s, background 0.18s;
        }
        .su-eye-toggle:hover  { color: #ff6f91; background: rgba(255,111,145,0.07); }
        .su-eye-toggle:active { color: #ff6f91; background: rgba(255,111,145,0.14); }

        /* ── PASSWORD STRENGTH ── */
        .su-strength {
          margin-top: 7px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .su-strength-bars {
          display: flex;
          gap: 4px;
          flex: 1;
        }

        .su-strength-bar {
          flex: 1;
          height: 4px;
          border-radius: 999px;
          background: #f0e0e6;
          transition: background 0.3s ease;
        }

        .su-strength-bar.weak   { background: #ff6b6b; }
        .su-strength-bar.fair   { background: #ffb347; }
        .su-strength-bar.good   { background: #4abf95; }
        .su-strength-bar.strong { background: #2ecc71; }

        .su-strength-label {
          font-size: 10px;
          font-weight: 700;
          min-width: 40px;
          text-align: right;
        }

        .su-strength-label.weak   { color: #ff6b6b; }
        .su-strength-label.fair   { color: #ffb347; }
        .su-strength-label.good   { color: #4abf95; }
        .su-strength-label.strong { color: #2ecc71; }

        /* ── MESSAGES ── */
        .su-error {
          display: flex; align-items: flex-start; gap: 8px;
          background: #fff1f1;
          color: #c0392b;
          border: 1px solid #ffcfcf;
          padding: 11px 14px;
          border-radius: 13px;
          font-size: 13px;
          margin-bottom: 14px;
          line-height: 1.45;
        }

        .su-success {
          background: #f0fff4;
          color: #248f5a;
          border: 1px solid #c6f6d5;
          padding: 11px 14px;
          border-radius: 13px;
          font-size: 13px;
          margin-bottom: 14px;
        }

        /* ── NAVIGATION ── */
        .su-nav {
          display: flex;
          gap: 10px;
          margin-top: 18px;
        }

        .su-back-btn {
          display: flex; align-items: center; gap: 6px;
          border: 1.5px solid #ffd3df;
          background: transparent;
          color: #ff8fb1;
          border-radius: 16px;
          padding: 13px 18px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.22s ease;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          flex-shrink: 0;
        }
        .su-back-btn:hover { background: #fff0f4; border-color: #ff8fb1; }

        .su-next-btn {
          flex: 1;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          border: none;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          border-radius: 16px;
          padding: 13px 20px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Poppins', sans-serif;
          cursor: pointer;
          transition: all 0.22s ease;
          box-shadow: 0 8px 20px rgba(255,111,145,0.25);
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .su-next-btn:hover   { transform: translateY(-1px); box-shadow: 0 12px 26px rgba(255,111,145,0.35); }
        .su-next-btn:active  { transform: scale(0.98); }
        .su-next-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; box-shadow: none; }

        /* ── BOTTOM ── */
        .su-bottom {
          text-align: center;
          margin-top: 20px;
          font-size: 13px;
          color: #888;
        }

        .su-bottom-link {
          color: #ff5d8f;
          font-weight: 600;
          text-decoration: none;
        }
        .su-bottom-link:hover { text-decoration: underline; }

        .su-footer {
          text-align: center;
          margin-top: 14px;
          color: #bbb;
          font-size: 11px;
        }

        /* ── RESPONSIVE ── */
        @media (max-width: 480px) {
          .su-page  { padding: 16px; }
          .su-card  { padding: 28px 20px 24px; border-radius: 26px; }
          .su-title { font-size: 1.65rem; }
          .su-input { font-size: 16px; }
          .su-logo-img { width: 90px; }
          .su-next-btn, .su-back-btn { padding: 13px 16px; font-size: 14px; }
          .su-step-connector { width: 28px; }
        }

        @media (max-width: 812px) and (orientation: landscape) {
          .su-page  { justify-content: flex-start; padding-top: 14px; }
          .su-card  { padding: 20px 24px; border-radius: 22px; }
          .su-logo-img { width: 60px; }
          .su-title { font-size: 1.45rem; }
          .su-subtitle { margin-bottom: 10px; font-size: 0.8rem; }
          .su-steps { margin-bottom: 16px; }
          .su-group { margin-bottom: 10px; }
        }

        @media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) {
          .su-card  { max-width: 560px; padding: 44px 38px 36px; }
          .su-title { font-size: 2.2rem; }
          .su-logo-img { width: 120px; }
          .su-input { font-size: 16px; }
          .su-eye-toggle { width: 52px; }
          .su-next-btn, .su-back-btn { padding: 15px 22px; font-size: 15px; }
        }

        @media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
          .su-card  { max-width: 520px; padding: 36px 34px 30px; }
          .su-input { font-size: 16px; }
          .su-eye-toggle { width: 52px; }
        }
      `}</style>

      <div className={`su-page${keyboardOpen ? ' keyboard-open' : ''}`}>
        <div className="su-card">

          {/* Logo */}
          <div className="su-logo-wrap">
            <img
              src={Logo}
              alt="MedTech Mate"
              className="su-logo-img"
              draggable={false}
            />
          </div>

          {/* Title */}
          <h1 className="su-title">Create Account</h1>
          <p className="su-subtitle">Your medtech internship companion ✨</p>

          {/* Step indicators */}
          <div className="su-steps">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const state = i < step ? 'done' : i === step ? 'active' : 'upcoming';
              return (
                <div key={s.id} className="su-step-item">
                  <div className={`su-step-bubble ${state}`}>
                    {state === 'done'
                      ? <Check size={14} strokeWidth={3} />
                      : <StepIcon size={14} />}
                    <span className="su-step-label">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`su-step-connector ${i < step ? 'filled' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel */}
          <div className="su-panel-wrap">
            <div
              className={`su-panel ${animating ? `exit-${direction}` : `enter-${direction}`}`}
              key={step}
            >

              {/* ── STEP 0: Personal ── */}
              {step === 0 && (
                <>
                  <p className="su-step-heading">👋 What's your name?</p>
                  <p className="su-step-desc">Let's start with the basics.</p>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-fullname">Full Name *</label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon"><User size={16} /></span>
                      <input
                        id="su-fullname"
                        className="su-input"
                        name="full_name"
                        value={form.full_name}
                        onChange={set('full_name')}
                        placeholder="e.g. Maria Santos"
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 1: Education ── */}
              {step === 1 && (
                <>
                  <p className="su-step-heading">🎓 Education details</p>
                  <p className="su-step-desc">Tell us about your academic background.</p>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-school">School / University</label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon"><School size={16} /></span>
                      <input
                        id="su-school"
                        className="su-input"
                        name="school"
                        value={form.school}
                        onChange={set('school')}
                        placeholder="e.g. University of Santo Tomas"
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-yearlevel">Year Level</label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon"><GraduationCap size={16} /></span>
                      <input
                        id="su-yearlevel"
                        className="su-input"
                        name="year_level"
                        value={form.year_level}
                        onChange={set('year_level')}
                        placeholder="e.g. 4th Year"
                      />
                    </div>
                  </div>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-program">Program</label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon"><BookOpen size={16} /></span>
                      <input
                        id="su-program"
                        className="su-input"
                        name="program"
                        value={form.program}
                        onChange={set('program')}
                        placeholder="e.g. BS Medical Technology"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* ── STEP 2: Account ── */}
              {step === 2 && (
                <>
                  <p className="su-step-heading">🔐 Set up your account</p>
                  <p className="su-step-desc">Your login credentials — keep them safe!</p>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-email">Email Address *</label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon"><Mail size={16} /></span>
                      <input
                        id="su-email"
                        className="su-input"
                        type="email"
                        inputMode="email"
                        name="email"
                        value={form.email}
                        onChange={set('email')}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-password">Password *</label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon"><Lock size={16} /></span>
                      <input
                        id="su-password"
                        className="su-input with-eye"
                        type={showPassword ? 'text' : 'password'}
                        name="password"
                        value={form.password}
                        onChange={set('password')}
                        placeholder="at least 6 characters"
                        autoComplete="new-password"
                        required
                      />
                      <button
                        type="button"
                        className="su-eye-toggle"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          setShowPassword((v) => !v);
                        }}
                      >
                        {showPassword
                          ? <EyeOff size={17} strokeWidth={2} />
                          : <Eye    size={17} strokeWidth={2} />}
                      </button>
                    </div>

                    {/* Password strength meter */}
                    {form.password.length > 0 && (() => {
                      const len       = form.password.length;
                      const hasUpper  = /[A-Z]/.test(form.password);
                      const hasNum    = /[0-9]/.test(form.password);
                      const hasSymbol = /[^A-Za-z0-9]/.test(form.password);
                      const score  = (len >= 8 ? 1 : 0) + (hasUpper ? 1 : 0) + (hasNum ? 1 : 0) + (hasSymbol ? 1 : 0);
                      const levels = ['weak', 'fair', 'good', 'strong'];
                      const labels = ['Weak', 'Fair', 'Good', 'Strong'];
                      const level  = score <= 1 ? 0 : score === 2 ? 1 : score === 3 ? 2 : 3;
                      const cls    = levels[level];
                      return (
                        <div className="su-strength">
                          <div className="su-strength-bars">
                            {[0, 1, 2, 3].map((i) => (
                              <div key={i} className={`su-strength-bar ${i <= level ? cls : ''}`} />
                            ))}
                          </div>
                          <span className={`su-strength-label ${cls}`}>{labels[level]}</span>
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              {/* Messages */}
              {error   && <div className="su-error">⚠️ {error}</div>}
              {message && <div className="su-success">{message}</div>}

              {/* Navigation */}
              <div className="su-nav">
                {step > 0 && (
                  <button type="button" className="su-back-btn" onClick={handleBack}>
                    <ChevronLeft size={16} /> Back
                  </button>
                )}

                {step < STEPS.length - 1 ? (
                  <button type="button" className="su-next-btn" onClick={handleNext}>
                    Continue <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="su-next-btn"
                    disabled={submitting}
                    onClick={handleSubmit}
                  >
                    {submitting
                      ? 'Creating…'
                      : <><Sparkles size={15} /> Create Account</>}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="su-bottom">
            Already have an account?{' '}
            <Link to="/login" className="su-bottom-link">Log in</Link>
          </p>

          <p className="su-footer">
            © {new Date().getFullYear()} MedTech Mate. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}