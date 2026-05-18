import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, GraduationCap, StickyNote, Heart,
  ArrowRight, Sparkles, ChevronDown, Star,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   FEATURE DATA
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: CalendarDays,
    label: 'Shift Planner',
    desc: 'Log morning, afternoon, and night shifts. Track your weekly hours and stay on top of your rotation schedule.',
    color: '#ff6f91',
    bg: 'linear-gradient(135deg, #fff0f4, #ffd6e1)',
    pill: '#ff5d8f',
    emoji: '🗓️',
  },
  {
    icon: GraduationCap,
    label: 'Exam Tracker',
    desc: 'Never miss a department exam. Countdown timers, section tagging, and a monthly calendar view keep you prepared.',
    color: '#5f8dff',
    bg: 'linear-gradient(135deg, #eff4ff, #d6e4ff)',
    pill: '#4b7eff',
    emoji: '📋',
  },
  {
    icon: StickyNote,
    label: 'Notes & Tips',
    desc: 'Capture clinical tips from seniors, key procedures, and reference notes — all organized by section.',
    color: '#8b6fff',
    bg: 'linear-gradient(135deg, #f3f0ff, #dfd6ff)',
    pill: '#7c5fff',
    emoji: '📝',
  },
  {
    icon: Heart,
    label: 'Wellness Check',
    desc: 'Monitor fatigue, track hydration, and get wellness tips tailored to your internship schedule.',
    color: '#4abf95',
    bg: 'linear-gradient(135deg, #edfaf4, #c8f0de)',
    pill: '#3aad84',
    emoji: '💚',
  },
];

const STATS = [
  { value: '4', label: 'Core Modules' },
  { value: '5+', label: 'Lab Sections' },
  { value: '∞', label: 'Notes & Shifts' },
];

/* ─────────────────────────────────────────────
   ANIMATED BLOB
───────────────────────────────────────────── */
function Blob({ style }) {
  return <div className="lp-blob" style={style} />;
}

/* ─────────────────────────────────────────────
   FEATURE CARD
───────────────────────────────────────────── */
function FeatureCard({ feature, index }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`lp-feat-card ${visible ? 'lp-feat-visible' : ''}`}
      style={{ '--delay': `${index * 90}ms`, '--c': feature.color }}
    >
      <div className="lp-feat-bar" style={{ background: feature.color }} />
      <div className="lp-feat-body">
        <div className="lp-feat-icon-wrap" style={{ background: feature.bg }}>
          <span className="lp-feat-emoji">{feature.emoji}</span>
        </div>
        <div className="lp-feat-text">
          <span className="lp-feat-pill" style={{ background: feature.pill + '18', color: feature.pill }}>
            {feature.label}
          </span>
          <p className="lp-feat-desc">{feature.desc}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   PHONE MOCKUP
───────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="lp-phone-wrap">
      <div className="lp-phone">
        <div className="lp-phone-notch" />
        <div className="lp-phone-screen">
          <div className="lp-ps-header">
            <div className="lp-ps-avatar">M</div>
            <div className="lp-ps-greeting">
              <span className="lp-ps-hi">Good morning ☀️</span>
              <span className="lp-ps-name">MedTech Intern</span>
            </div>
            <div className="lp-ps-bell">🔔</div>
          </div>

          <div className="lp-ps-today">
            <span className="lp-ps-today-label">Today's Shift</span>
            <div className="lp-ps-shift-row">
              <div className="lp-ps-shift-pill morning">🌅 Morning</div>
              <span className="lp-ps-shift-time">7:00 – 3:00 PM</span>
            </div>
            <span className="lp-ps-shift-sec">Hematology</span>
          </div>

          <div className="lp-ps-exam-alert">
            <span>⚡</span>
            <div>
              <p className="lp-ps-ea-title">Exam in 2 days</p>
              <p className="lp-ps-ea-sub">Clinical Chemistry Finals</p>
            </div>
          </div>

          <div className="lp-ps-stats">
            <div className="lp-ps-stat">
              <span className="lp-ps-stat-n">12</span>
              <span className="lp-ps-stat-l">Shifts</span>
            </div>
            <div className="lp-ps-stat-div" />
            <div className="lp-ps-stat">
              <span className="lp-ps-stat-n" style={{ color: '#5f8dff' }}>3</span>
              <span className="lp-ps-stat-l">Exams</span>
            </div>
            <div className="lp-ps-stat-div" />
            <div className="lp-ps-stat">
              <span className="lp-ps-stat-n" style={{ color: '#4abf95' }}>8</span>
              <span className="lp-ps-stat-l">Notes</span>
            </div>
          </div>

          <div className="lp-ps-nav">
            <div className="lp-ps-nav-dot active" />
            <div className="lp-ps-nav-dot" />
            <div className="lp-ps-nav-dot" />
            <div className="lp-ps-nav-dot" />
          </div>
        </div>
      </div>

      {/* Floating badges */}
      <div className="lp-badge lp-badge-1">✅ 8h logged today</div>
      <div className="lp-badge lp-badge-2">💧 Hydration 6/8</div>
      <div className="lp-badge lp-badge-3">📚 Study tip ready</div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN LANDING PAGE
───────────────────────────────────────────── */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,600;1,9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

        /* ════ RESET & BASE ════ */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          font-family: 'DM Sans', sans-serif;
          background: #fdf5f7;
          color: #1c1012;
          overflow-x: hidden;
          min-height: 100dvh;
        }

        .lp-root::before {
          content: '';
          position: fixed; inset: 0; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");
          pointer-events: none;
        }

       
        /* ════ BLOBS ════ */
        .lp-blob {
          position: absolute; border-radius: 50%;
          filter: blur(70px); pointer-events: none;
          animation: lp-blob-drift 12s ease-in-out infinite alternate;
        }
        @keyframes lp-blob-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, -20px) scale(1.06); }
        }

        /* ════ HERO ════ */
        .lp-hero {
          position: relative;
          /* Default (mobile): stack vertically */
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 100px 24px 60px;
          gap: 40px;
          overflow: hidden;
          z-index: 1;
          min-height: 100dvh;
        }

        .lp-hero-blobs {
          position: absolute; inset: 0; z-index: 0; overflow: hidden;
          pointer-events: none;
        }

        .lp-hero-stripe {
          position: absolute; inset: 0; z-index: 0;
          background: repeating-linear-gradient(
            -48deg,
            transparent 0px, transparent 48px,
            rgba(255,200,220,0.07) 48px, rgba(255,200,220,0.07) 49px
          );
          pointer-events: none;
        }

        /* Left-side text block */
        .lp-hero-inner {
          position: relative; z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;   /* center on mobile */
          gap: 20px;
          max-width: 560px;
          width: 100%;
        }

        /* Eyebrow badge */
        .lp-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,200,220,0.5);
          border-radius: 999px; padding: 6px 14px;
          font-size: 12px; font-weight: 600; color: #ff5d8f;
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 12px rgba(255,111,145,0.1);
          animation: lp-fadein 0.6s ease both;
        }

        .lp-h1 {
          font-family: 'Fraunces', serif;
          font-size: clamp(2.6rem, 8vw, 4.2rem);
          font-weight: 700; line-height: 1.08;
          letter-spacing: -0.03em;
          color: #1c1012;
          animation: lp-up 0.7s ease 0.1s both;
        }
        .lp-h1-accent { color: #ff5d8f; font-style: italic; }
        .lp-h1-sub    { font-weight: 300; font-style: italic; color: #b08090; }

        .lp-hero-sub {
          font-size: 1.05rem; color: #7a5560;
          line-height: 1.65; font-weight: 400;
          max-width: 420px;
          animation: lp-up 0.7s ease 0.2s both;
        }

        .lp-hero-ctas {
          display: flex; align-items: center; gap: 12px;
          flex-wrap: wrap; justify-content: center;
          animation: lp-up 0.7s ease 0.3s both;
        }
        .lp-cta-primary {
          display: inline-flex; align-items: center; gap: 9px;
          background: linear-gradient(135deg, #ff8fb1, #ff5d8f);
          border: none; color: white; border-radius: 999px;
          padding: 15px 30px; font-size: 15px; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all 0.25s;
          box-shadow: 0 8px 28px rgba(255,93,143,0.38),
                      0 2px 0 rgba(255,255,255,0.18) inset;
        }
        .lp-cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 38px rgba(255,93,143,0.48), 0 2px 0 rgba(255,255,255,0.18) inset;
        }
        .lp-cta-secondary {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.85);
          border: 1.5px solid rgba(255,200,220,0.5);
          color: #ff5d8f; border-radius: 999px;
          padding: 14px 26px; font-size: 15px; font-weight: 600;
          cursor: pointer; font-family: inherit; transition: all 0.25s;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 16px rgba(255,111,145,0.1);
        }
        .lp-cta-secondary:hover {
          background: white; border-color: #ff8fb1;
          box-shadow: 0 8px 24px rgba(255,111,145,0.18);
          transform: translateY(-1px);
        }

        .lp-social-proof {
          display: flex; align-items: center; gap: 10px;
          animation: lp-up 0.7s ease 0.4s both;
        }
        .lp-sp-stars { display: flex; gap: 3px; }
        .lp-sp-text  { font-size: 12px; color: #b08090; font-weight: 500; }
        .lp-sp-text strong { color: #7a5560; }

        /* Mockup container — mobile: centered block */
        .lp-hero-mockup {
          position: relative; z-index: 2;
          display: flex; justify-content: center; align-items: center;
          flex-shrink: 0;
          animation: lp-up 0.8s ease 0.5s both;
          /* Extra padding so the floating badges are never clipped */
          padding: 20px 110px;
        }

        .lp-scroll-hint {
          position: absolute; bottom: 28px; left: 50%;
          transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 6px;
          color: #c8a0b0; font-size: 11px; font-weight: 600;
          letter-spacing: 0.08em; text-transform: uppercase;
          animation: lp-up 1s ease 1s both;
          z-index: 2;
        }
        .lp-scroll-arrow { animation: lp-bounce 1.6s ease-in-out infinite; }
        @keyframes lp-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(5px); }
        }

        /* ════ PHONE MOCKUP ════ */
        .lp-phone-wrap {
          position: relative;
          width: 240px; height: 420px;
          flex-shrink: 0;
        }
        .lp-phone {
          width: 240px; height: 420px;
          background: white;
          border-radius: 36px;
          border: 2.5px solid rgba(255,200,220,0.6);
          box-shadow:
            0 40px 80px rgba(255,93,143,0.18),
            0 12px 32px rgba(0,0,0,0.08),
            inset 0 0 0 1px rgba(255,255,255,0.8);
          overflow: hidden;
          position: relative;
          animation: lp-float 5s ease-in-out infinite;
        }
        @keyframes lp-float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-12px) rotate(-1deg); }
        }

        .lp-phone-notch {
          position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
          width: 70px; height: 10px; background: #f0e0e8;
          border-radius: 999px; z-index: 2;
        }

        .lp-phone-screen {
          padding: 36px 14px 14px;
          display: flex; flex-direction: column; gap: 10px;
          height: 100%;
          background: linear-gradient(180deg, #fff5f8 0%, #ffffff 60%);
        }

        .lp-ps-header { display: flex; align-items: center; gap: 8px; }
        .lp-ps-avatar {
          width: 28px; height: 28px; border-radius: 50%;
          background: linear-gradient(135deg, #ff8fb1, #ff5d8f);
          color: white; font-size: 11px; font-weight: 700;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lp-ps-greeting { flex: 1; display: flex; flex-direction: column; }
        .lp-ps-hi   { font-size: 8px; color: #ccc; }
        .lp-ps-name { font-size: 10px; font-weight: 700; color: #333; }
        .lp-ps-bell { font-size: 14px; }

        .lp-ps-today {
          background: linear-gradient(135deg, #fff0f4, #ffd6e1);
          border-radius: 14px; padding: 10px 12px;
          border: 1px solid rgba(255,200,220,0.4);
          display: flex; flex-direction: column; gap: 4px;
        }
        .lp-ps-today-label {
          font-size: 7.5px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em; color: #ffb8ce;
        }
        .lp-ps-shift-row { display: flex; align-items: center; justify-content: space-between; }
        .lp-ps-shift-pill {
          display: inline-flex; align-items: center; gap: 4px;
          border-radius: 999px; padding: 2px 8px;
          font-size: 9px; font-weight: 700;
        }
        .lp-ps-shift-pill.morning { background: #fff5ee; color: #ff8c5a; }
        .lp-ps-shift-time { font-size: 8px; color: #bbb; }
        .lp-ps-shift-sec  { font-size: 8px; color: #ff8fb1; font-weight: 600; }

        .lp-ps-exam-alert {
          display: flex; align-items: center; gap: 8px;
          background: #fffbeb; border: 1px solid #fde68a;
          border-radius: 12px; padding: 8px 10px;
        }
        .lp-ps-ea-title { font-size: 9px; font-weight: 700; color: #92400e; margin-bottom: 1px; }
        .lp-ps-ea-sub   { font-size: 7.5px; color: #b45309; }

        .lp-ps-stats {
          display: flex; align-items: center; justify-content: space-around;
          background: white; border: 1px solid #ffe0ea;
          border-radius: 12px; padding: 8px 10px;
        }
        .lp-ps-stat { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .lp-ps-stat-n { font-size: 14px; font-weight: 700; color: #ff5d8f; line-height: 1; }
        .lp-ps-stat-l { font-size: 7px; color: #ccc; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; }
        .lp-ps-stat-div { width: 1px; height: 22px; background: #ffe0ea; }

        .lp-ps-nav { display: flex; justify-content: center; gap: 5px; margin-top: auto; padding-bottom: 4px; }
        .lp-ps-nav-dot { width: 5px; height: 5px; border-radius: 50%; background: #ffe0ea; }
        .lp-ps-nav-dot.active { background: #ff5d8f; width: 14px; border-radius: 999px; }

        /* Floating badges — positioned relative to .lp-phone-wrap */
        .lp-badge {
          position: absolute;
          background: rgba(255,255,255,0.95);
          border: 1px solid rgba(255,200,220,0.5);
          border-radius: 999px;
          padding: 7px 13px;
          font-size: 11px; font-weight: 700; color: #7a5560;
          box-shadow: 0 8px 24px rgba(255,111,145,0.15);
          white-space: nowrap;
          backdrop-filter: blur(8px);
          z-index: 3;
        }
        /* Adjusted so badges sit visibly outside the phone but inside the padded mockup area */
        .lp-badge-1 { top: 40px;   left: -108px; animation: lp-float 6s ease-in-out 0.5s infinite; }
        .lp-badge-2 { bottom: 80px; left: -98px;  animation: lp-float 7s ease-in-out 1s infinite; }
        .lp-badge-3 { top: 80px;   right: -98px;  animation: lp-float 5.5s ease-in-out 1.5s infinite; }

        /* ════ STATS BAR ════ */
        .lp-stats-bar {
          position: relative; z-index: 1;
          display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #fff0f4, #fff8fb);
          border-top: 1px solid rgba(255,200,220,0.3);
          border-bottom: 1px solid rgba(255,200,220,0.3);
          padding: 28px 24px;
          overflow: hidden;
        }
        .lp-stats-bar::before {
          content: '';
          position: absolute; inset: 0;
          background: repeating-linear-gradient(
            90deg, transparent 0px, transparent 1px,
            rgba(255,200,220,0.06) 1px, rgba(255,200,220,0.06) 60px
          );
          pointer-events: none;
        }
        .lp-stat-item {
          flex: 1; text-align: center;
          padding: 8px 20px;
          position: relative; z-index: 1;
        }
        .lp-stat-item + .lp-stat-item::before {
          content: '';
          position: absolute; left: 0; top: 10%; height: 80%;
          width: 1px; background: rgba(255,200,220,0.5);
        }
        .lp-stat-n {
          font-family: 'Fraunces', serif;
          font-size: 2.4rem; font-weight: 700;
          color: #ff5d8f; line-height: 1;
          letter-spacing: -0.04em;
          display: block;
        }
        .lp-stat-l {
          font-size: 12px; color: #b08090; font-weight: 500;
          margin-top: 4px; display: block;
        }

        /* ════ FEATURES SECTION ════ */
        .lp-features {
          position: relative; z-index: 1;
          padding: 80px 24px 60px;
          max-width: 880px; margin: 0 auto;
        }
        .lp-sec-label {
          display: inline-flex; align-items: center; gap: 7px;
          background: rgba(255,255,255,0.8);
          border: 1px solid rgba(255,200,220,0.45);
          border-radius: 999px; padding: 5px 14px;
          font-size: 11px; font-weight: 700;
          color: #ff5d8f; letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
        }
        .lp-sec-title {
          font-family: 'Fraunces', serif;
          font-size: clamp(1.8rem, 4.5vw, 2.8rem);
          font-weight: 700; line-height: 1.15;
          letter-spacing: -0.025em;
          color: #1c1012; margin-bottom: 10px;
        }
        .lp-sec-title em { color: #ff5d8f; font-style: italic; }
        .lp-sec-sub {
          font-size: 1rem; color: #7a5560;
          line-height: 1.65; max-width: 480px;
          margin-bottom: 40px;
        }
        .lp-feat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .lp-feat-card {
          background: white;
          border: 1.5px solid rgba(255,200,220,0.35);
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 4px 20px rgba(255,111,145,0.07);
          opacity: 0; transform: translateY(24px);
          transition: opacity 0.55s ease var(--delay, 0ms),
                      transform 0.55s ease var(--delay, 0ms),
                      box-shadow 0.25s ease,
                      border-color 0.25s ease;
        }
        .lp-feat-card.lp-feat-visible { opacity: 1; transform: translateY(0); }
        .lp-feat-card:hover {
          border-color: color-mix(in srgb, var(--c) 40%, rgba(255,200,220,0.4));
          box-shadow: 0 12px 36px color-mix(in srgb, var(--c) 14%, rgba(0,0,0,0.04));
          transform: translateY(-4px);
        }

        .lp-feat-bar  { height: 4px; width: 100%; }
        .lp-feat-body { padding: 18px; display: flex; flex-direction: column; gap: 13px; }
        .lp-feat-icon-wrap {
          width: 52px; height: 52px; border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lp-feat-emoji { font-size: 22px; line-height: 1; }
        .lp-feat-text  { display: flex; flex-direction: column; gap: 6px; }
        .lp-feat-pill  {
          display: inline-flex; align-items: center;
          border-radius: 999px; padding: 3px 10px;
          font-size: 11px; font-weight: 700;
          align-self: flex-start;
        }
        .lp-feat-desc  { font-size: 12.5px; color: #7a6870; line-height: 1.65; }

        /* ════ CTA SECTION ════ */
        .lp-cta-section {
          position: relative; z-index: 1;
          padding: 80px 24px;
          text-align: center;
          overflow: hidden;
        }
        .lp-cta-section::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, #fff0f5 0%, #fce8f0 100%);
          z-index: 0;
        }
        .lp-cta-inner {
          position: relative; z-index: 1;
          max-width: 560px; margin: 0 auto;
          display: flex; flex-direction: column; align-items: center; gap: 20px;
        }
        .lp-cta-headline {
          font-family: 'Fraunces', serif;
          font-size: clamp(2rem, 5.5vw, 3rem);
          font-weight: 700; line-height: 1.1;
          letter-spacing: -0.03em; color: #1c1012;
        }
        .lp-cta-headline em { color: #ff5d8f; font-style: italic; }
        .lp-cta-body { font-size: 1rem; color: #7a5560; line-height: 1.65; }
        .lp-cta-big {
          display: inline-flex; align-items: center; gap: 10px;
          background: linear-gradient(135deg, #ff8fb1, #ff5d8f);
          border: none; color: white; border-radius: 999px;
          padding: 17px 36px; font-size: 16px; font-weight: 700;
          cursor: pointer; font-family: inherit; transition: all 0.25s;
          box-shadow: 0 12px 36px rgba(255,93,143,0.42), 0 2px 0 rgba(255,255,255,0.18) inset;
        }
        .lp-cta-big:hover {
          transform: translateY(-2px);
          box-shadow: 0 18px 44px rgba(255,93,143,0.52), 0 2px 0 rgba(255,255,255,0.18) inset;
        }
        .lp-cta-login-hint { font-size: 13px; color: #b08090; }
        .lp-cta-login-hint button {
          background: none; border: none; color: #ff5d8f;
          font-weight: 700; cursor: pointer; font-family: inherit;
          font-size: inherit; text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* ════ FOOTER ════ */
        .lp-footer {
          position: relative; z-index: 1;
          padding: 24px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          border-top: 1px solid rgba(255,200,220,0.2);
        }
        .lp-footer-logo { font-size: 16px; }
        .lp-footer-text { font-size: 12px; color: #c8a0b0; }
        .lp-footer-text strong { color: #b08090; }

        /* ════ ANIMATIONS ════ */
        @keyframes lp-fadein { from { opacity: 0; } to { opacity: 1; } }
        @keyframes lp-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ════ RESPONSIVE ════ */

        /* ── MOBILE (≤ 600px) ── */
        @media (max-width: 600px) {


          .lp-hero { padding: 90px 20px 80px; min-height: auto; gap: 32px; }
          .lp-h1 { font-size: 2.4rem; }
          .lp-hero-sub { font-size: 0.95rem; }
          .lp-cta-primary, .lp-cta-secondary { font-size: 14px; padding: 13px 22px; }

          /* Compact phone on mobile, hide badges so nothing overflows */
          .lp-hero-mockup { padding: 10px 20px; }
          .lp-phone-wrap  { width: 200px; height: 352px; }
          .lp-phone       { width: 200px; height: 352px; border-radius: 30px; }
          .lp-badge       { display: none; }

          .lp-stats-bar { padding: 20px 8px; }
          .lp-stat-n    { font-size: 2rem; }

          .lp-features  { padding: 60px 18px 40px; }
          .lp-feat-grid { grid-template-columns: 1fr; }
          .lp-sec-title { font-size: 1.8rem; }

          .lp-cta-section  { padding: 60px 20px; }
          .lp-cta-headline { font-size: 2rem; }
          .lp-cta-big      { padding: 14px 28px; font-size: 15px; }
        }

        /* ── TABLET (601–900px) ── */
        @media (min-width: 601px) and (max-width: 900px) {
          .lp-feat-grid { grid-template-columns: repeat(2, 1fr); }
        }

        /* ── DESKTOP (≥ 901px) ── */
        @media (min-width: 901px) {
          .lp-hero {
            flex-direction: row;           /* side-by-side */
            text-align: left;
            align-items: center;
            justify-content: center;
            gap: 60px;
            padding: 120px 80px 80px;
            min-height: 100dvh;
            overflow: visible;             /* let badges breathe */
          }

          .lp-hero-inner {
            align-items: flex-start;      /* left-align text */
            max-width: 520px;
            flex: 1 1 auto;
          }

          .lp-hero-ctas    { justify-content: flex-start; }
          .lp-social-proof { justify-content: flex-start; }

          .lp-hero-mockup {
            /* Fixed width so it doesn't stretch to fill remaining space */
            width: auto;
            flex: 0 0 auto;
            margin-top: 0;
            padding: 20px 120px;   /* room for the floating badges */
          }

          .lp-scroll-hint { display: none; }

          .lp-feat-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="lp-root">

        

        {/* ── HERO ── */}
        <section className="lp-hero">
          <div className="lp-hero-blobs">
            <Blob style={{ width: 480, height: 480, background: 'rgba(255,143,177,0.22)', top: -80, left: -120 }} />
            <Blob style={{ width: 360, height: 360, background: 'rgba(176,208,255,0.2)', top: '30%', right: -100, animationDelay: '3s' }} />
            <Blob style={{ width: 300, height: 300, background: 'rgba(164,222,195,0.18)', bottom: -40, left: '30%', animationDelay: '6s' }} />
          </div>
          <div className="lp-hero-stripe" />

          {/* Text copy */}
          <div className="lp-hero-inner">

            <h1 className="lp-h1">
              Your internship,{' '}
              <span className="lp-h1-accent">organized</span>
              <br />
              <span className="lp-h1-sub">beautifully.</span>
            </h1>

            <p className="lp-hero-sub">
              Track your rotation shifts, prepare for department exams, capture clinical tips,
              and monitor your wellness — all in one place.
            </p>

            <div className="lp-hero-ctas">
              <button className="lp-cta-primary" onClick={() => navigate('/signup')}>
                Start for free <ArrowRight size={16} />
              </button>
              <button className="lp-cta-secondary" onClick={() => navigate('/login')}>
                I have an account
              </button>
            </div>

            <div className="lp-social-proof">
              <div className="lp-sp-stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} fill="#f59e0b" color="#f59e0b" />
                ))}
              </div>
              <p className="lp-sp-text">
                <strong>Loved by interns</strong> across all 5 lab sections
              </p>
            </div>
          </div>

          {/* Phone mockup */}
          <div className="lp-hero-mockup">
            <PhoneMockup />
          </div>

          {/* Scroll hint (mobile only) */}
          <div className="lp-scroll-hint">
            <span>Scroll</span>
            <ChevronDown size={16} className="lp-scroll-arrow" />
          </div>
        </section>

        {/* ── STATS BAR ── */}
        <div className="lp-stats-bar">
          {STATS.map((s, i) => (
            <div key={i} className="lp-stat-item">
              <span className="lp-stat-n">{s.value}</span>
              <span className="lp-stat-l">{s.label}</span>
            </div>
          ))}
        </div>

        {/* ── FEATURES ── */}
        <section className="lp-features">
          <div className="lp-sec-label">
            <Sparkles size={12} /> Everything you need
          </div>
          <h2 className="lp-sec-title">
            Four modules,<br />
            <em>one focused app.</em>
          </h2>
          <p className="lp-sec-sub">
            Designed specifically for medical technology students navigating hospital rotations —
            no bloat, no fluff.
          </p>

          <div className="lp-feat-grid">
            {FEATURES.map((f, i) => (
              <FeatureCard key={f.label} feature={f} index={i} />
            ))}
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="lp-cta-section">
          <Blob style={{ width: 400, height: 400, background: 'rgba(255,143,177,0.18)', top: -80, right: -80, position: 'absolute', zIndex: 0 }} />
          <Blob style={{ width: 300, height: 300, background: 'rgba(164,222,195,0.14)', bottom: -60, left: -60, position: 'absolute', zIndex: 0, animationDelay: '4s' }} />

          <div className="lp-cta-inner">
            <h2 className="lp-cta-headline">
              Ready to own<br />
              <em>your internship?</em>
            </h2>
            <p className="lp-cta-body">
              Join your fellow interns. Track every shift, ace every exam, and never miss a tip
              from your seniors.
            </p>
            <button className="lp-cta-big" onClick={() => navigate('/signup')}>
              <Sparkles size={16} /> Create your free account
            </button>
            <p className="lp-cta-login-hint">
              Already have an account?{' '}
              <button onClick={() => navigate('/login')}>Log in here</button>
            </p>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="lp-footer">
          <span className="lp-footer-logo">🩺</span>
          <p className="lp-footer-text">
            <strong>InternTrack</strong> · Built for MedTech Interns
          </p>
        </footer>

      </div>
    </>
  );
}