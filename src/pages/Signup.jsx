import ThemedIcon from '../components/ui/ThemedIcon';
import '../styles/features/Signup.css';
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import {
  Sparkles,
  Eye,
  EyeOff,
  User,
  School,
  GraduationCap,
  BookOpen,
  Mail,
  Lock,
  ChevronRight,
  ChevronLeft,
  Check,
  ArrowLeft,
} from 'lucide-react';
import Brand from '../components/layout/Brand';
import { ThemeToggle } from '../theme/ThemeProvider';

/* ─────────────────────────────────────────────
   STEP DEFINITIONS
───────────────────────────────────────────── */
const STEPS = [
  { id: 'personal', label: 'Personal', icon: User },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'account', label: 'Account', icon: Lock },
];

export default function Signup() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [animating, setAnimating] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    school: '',
    year_level: '',
    program: 'BS Medical Technology',
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
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
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 220);
  }

  function validateStep() {
    if (step === 0 && !form.full_name.trim()) {
      setError('Please enter your full name.');
      return false;
    }
    if (step === 2) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        setError('Please enter a valid email address.');
        return false;
      }
      if (form.password.length < 6) {
        setError('Password must be at least 6 characters.');
        return false;
      }
    }
    return true;
  }

  function handleNext() {
    if (validateStep()) goTo(step + 1);
  }
  function handleBack() {
    goTo(step - 1);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateStep()) return;
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
          (data.session
            ? 'Your workspace is ready.'
            : 'Your account is created. Check your email to confirm it, then come back to log in.'),
      );
      if (data.session) navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className={`su-page${keyboardOpen ? ' keyboard-open' : ''}`}>
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        {/* Back button to landing page */}
        <button
          className="back-btn"
          onClick={() => navigate('/')}
          aria-label="Back to landing page"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <div className="su-card">
          {/* Logo */}
          <div className="auth-brand">
            <Brand />
          </div>

          {/* Heading */}
          <div className="su-heading">
            <h1 className="su-title">
              Start your journey, <em>intern</em>.
            </h1>
            <p className="su-subtitle">
              Your medtech internship companion <ThemedIcon name="Sparkles" />
            </p>
          </div>

          {/* Step indicators */}
          <div className="su-steps">
            {STEPS.map((s, i) => {
              const StepIcon = s.icon;
              const state = i < step ? 'done' : i === step ? 'active' : 'upcoming';
              return (
                <div key={s.id} className="su-step-item">
                  <div className={`su-step-bubble ${state}`}>
                    {state === 'done' ? (
                      <Check size={14} strokeWidth={3} />
                    ) : (
                      <StepIcon size={14} />
                    )}
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
                  <p className="su-step-heading">
                    <ThemedIcon name="Hand" /> What's your name?
                  </p>
                  <p className="su-step-desc">Let's start with the basics.</p>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-fullname">
                      Full Name *
                    </label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon">
                        <User size={18} />
                      </span>
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
                  <p className="su-step-heading">
                    <ThemedIcon name="GraduationCap" /> Education details
                  </p>
                  <p className="su-step-desc">Tell us about your academic background.</p>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-school">
                      School / University
                    </label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon">
                        <School size={18} />
                      </span>
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
                    <label className="su-label" htmlFor="su-yearlevel">
                      Year Level
                    </label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon">
                        <GraduationCap size={18} />
                      </span>
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
                    <label className="su-label" htmlFor="su-program">
                      Program
                    </label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon">
                        <BookOpen size={18} />
                      </span>
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
                  <p className="su-step-heading">
                    <ThemedIcon name="LockKeyhole" /> Set up your account
                  </p>
                  <p className="su-step-desc">Your login credentials — keep them safe!</p>
                  <div className="su-group">
                    <label className="su-label" htmlFor="su-email">
                      Email Address *
                    </label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon">
                        <Mail size={18} />
                      </span>
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
                    <label className="su-label" htmlFor="su-password">
                      Password *
                    </label>
                    <div className="su-input-wrap">
                      <span className="su-input-icon">
                        <Lock size={18} />
                      </span>
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
                        onClick={() => setShowPassword((v) => !v)}
                      >
                        {showPassword ? (
                          <EyeOff size={18} strokeWidth={2} />
                        ) : (
                          <Eye size={18} strokeWidth={2} />
                        )}
                      </button>
                    </div>

                    {/* Password strength meter */}
                    {form.password.length > 0 &&
                      (() => {
                        const len = form.password.length;
                        const hasUpper = /[A-Z]/.test(form.password);
                        const hasNum = /[0-9]/.test(form.password);
                        const hasSymbol = /[^A-Za-z0-9]/.test(form.password);
                        const score =
                          (len >= 8 ? 1 : 0) +
                          (hasUpper ? 1 : 0) +
                          (hasNum ? 1 : 0) +
                          (hasSymbol ? 1 : 0);
                        const levels = ['weak', 'fair', 'good', 'strong'];
                        const labels = ['Weak', 'Fair', 'Good', 'Strong'];
                        const level = score <= 1 ? 0 : score === 2 ? 1 : score === 3 ? 2 : 3;
                        const cls = levels[level];
                        return (
                          <div className="su-strength">
                            <div className="su-strength-bars">
                              {[0, 1, 2, 3].map((i) => (
                                <div
                                  key={i}
                                  className={`su-strength-bar ${i <= level ? cls : ''}`}
                                />
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
              {error && (
                <div className="su-error">
                  <ThemedIcon name="TriangleAlert" /> {error}
                </div>
              )}
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
                    {submitting ? (
                      'Creating…'
                    ) : (
                      <>
                        <Sparkles size={15} /> Create Account
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="su-bottom">
            Already have an account?{' '}
            <Link to="/login" className="su-bottom-link">
              Log in
            </Link>
          </p>

          <p className="su-footer">
            © {new Date().getFullYear()} MedTech Mate. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
}
