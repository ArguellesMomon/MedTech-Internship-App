import { useState } from 'react';
import {
  Heart, Mail, Phone,
  Microscope, ClipboardList, CalendarClock,
  NotebookPen, BookOpen, TrendingUp,
  Sparkles, MessageCircle, Copy, Check,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   COPY-TO-CLIPBOARD CHIP
───────────────────────────────────────────── */
function CopyChip({ icon: Icon, label, value, href }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e) {
    if (href) return; // let the link handle it
    e.preventDefault();
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const Wrapper = href ? 'a' : 'button';
  const extra   = href ? { href, target: '_blank', rel: 'noopener noreferrer' } : { type: 'button', onClick: handleCopy };

  return (
    <Wrapper className="ab-contact-chip" {...extra}>
      <span className="ab-chip-icon"><Icon size={15} /></span>
      <span className="ab-chip-label">{label}</span>
      {!href && (
        <span className="ab-chip-copy">
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </span>
      )}
    </Wrapper>
  );
}

/* ─────────────────────────────────────────────
   FEATURE ITEM
───────────────────────────────────────────── */
function Feature({ icon: Icon, color, bg, title, desc }) {
  return (
    <div className="ab-feature">
      <div className="ab-feature-icon" style={{ background: bg, color }}>
        <Icon size={18} />
      </div>
      <div className="ab-feature-text">
        <p className="ab-feature-title">{title}</p>
        <p className="ab-feature-desc">{desc}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   MAIN
───────────────────────────────────────────── */
export default function About() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&display=swap');

        /* ── ROOT ── */
        .ab-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          max-width: 680px;
          margin: 0 auto;
          padding: 8px 0 48px;
          display: flex;
          flex-direction: column;
          gap: 0;
          color: #2a1a22;
        }

        /* ── HERO ── */
        .ab-hero {
          background: linear-gradient(160deg, #ff8fb1 0%, #ff6f91 45%, #ff8c5a 100%);
          border-radius: 28px;
          padding: 40px 28px 36px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
        }

        .ab-hero::before {
          content: '';
          position: absolute;
          top: -50px; right: -50px;
          width: 220px; height: 220px;
          border-radius: 50%;
          background: rgba(255,255,255,0.09);
          pointer-events: none;
        }

        .ab-hero::after {
          content: '';
          position: absolute;
          bottom: -70px; left: -30px;
          width: 200px; height: 200px;
          border-radius: 50%;
          background: rgba(255,255,255,0.06);
          pointer-events: none;
        }

        .ab-hero-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.2);
          border: 1px solid rgba(255,255,255,0.3);
          border-radius: 999px;
          padding: 5px 13px;
          font-size: 11px;
          font-weight: 700;
          color: white;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 16px;
          position: relative;
          z-index: 1;
        }

        .ab-hero-title {
          font-family: 'DM Serif Display', serif;
          font-size: 2.6rem;
          line-height: 1.12;
          color: white;
          margin: 0 0 14px;
          position: relative;
          z-index: 1;
          letter-spacing: -0.5px;
        }

        .ab-hero-title em {
          font-style: italic;
          opacity: 0.88;
        }

        .ab-hero-sub {
          font-size: 15px;
          line-height: 1.65;
          color: rgba(255,255,255,0.9);
          margin: 0;
          position: relative;
          z-index: 1;
          max-width: 480px;
        }

        /* ── SECTION CARD ── */
        .ab-card {
          background: rgba(255,255,255,0.88);
          border-radius: 24px;
          border: 1px solid rgba(255,220,234,0.55);
          box-shadow: 0 4px 20px rgba(255,111,145,0.06);
          overflow: hidden;
          margin-bottom: 14px;
        }

        .ab-card-inner {
          padding: 26px 24px;
        }

        /* ── SECTION LABEL ── */
        .ab-label {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e0a0b8;
          margin: 0 0 10px;
        }

        /* ── BODY TEXT ── */
        .ab-body {
          font-size: 14px;
          line-height: 1.75;
          color: #5a3a48;
          margin: 0;
        }

        .ab-body + .ab-body { margin-top: 10px; }

        /* ── HEADING inside card ── */
        .ab-heading {
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: #2a1a22;
          margin: 0 0 10px;
          letter-spacing: -0.3px;
          line-height: 1.2;
        }

        /* ── DIVIDER ── */
        .ab-rule {
          border: none;
          border-top: 1px solid #ffeef4;
          margin: 20px 0;
        }

        /* ── FEATURES LIST ── */
        .ab-features {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .ab-feature {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .ab-feature-icon {
          width: 40px; height: 40px;
          border-radius: 13px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ab-feature-title {
          font-size: 14px;
          font-weight: 700;
          color: #2a1a22;
          margin: 0 0 3px;
        }

        .ab-feature-desc {
          font-size: 13px;
          color: #907080;
          margin: 0;
          line-height: 1.55;
        }

        /* ── DEDICATION ── */
        .ab-dedication {
          background: linear-gradient(135deg, #fff0f5, #fff8fb);
          border: 1.5px solid #ffd6e8;
          border-radius: 20px;
          padding: 22px 22px 20px;
          position: relative;
        }

        .ab-dedication-quote {
          font-family: 'DM Serif Display', serif;
          font-size: 1.25rem;
          font-style: italic;
          color: #cc5580;
          line-height: 1.55;
          margin: 0 0 14px;
          padding-left: 14px;
          border-left: 3px solid #ffb8d0;
        }

        .ab-dedication-to {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #c07090;
          font-weight: 600;
        }

        .ab-dedication-heart {
          animation: heartbeat 1.6s ease-in-out infinite;
        }

        @keyframes heartbeat {
          0%,100% { transform: scale(1); }
          14%      { transform: scale(1.18); }
          28%      { transform: scale(1); }
          42%      { transform: scale(1.12); }
          56%      { transform: scale(1); }
        }

        /* ── MAKER CARD ── */
        .ab-maker {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .ab-maker-avatar {
          width: 58px; height: 58px;
          border-radius: 18px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Serif Display', serif;
          font-size: 1.5rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 6px 18px rgba(255,111,145,0.28);
        }

        .ab-maker-name {
          font-family: 'DM Serif Display', serif;
          font-size: 1.2rem;
          color: #2a1a22;
          margin: 0 0 2px;
        }

        .ab-maker-role {
          font-size: 12px;
          color: #c09090;
          margin: 0;
          font-weight: 500;
        }

        .ab-maker-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #fff0f4;
          border: 1px solid #ffd6e1;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          color: #ff8fb1;
          margin-top: 6px;
        }

        /* ── CONTACT CHIPS ── */
        .ab-contact-row {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }

        .ab-contact-chip {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #fff8fb;
          border: 1.5px solid #ffd6e8;
          border-radius: 16px;
          padding: 13px 16px;
          font-size: 14px;
          color: #5a3a48;
          font-weight: 500;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          text-decoration: none;
          transition: border-color 0.2s, background 0.2s, transform 0.15s;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }

        .ab-contact-chip:hover {
          border-color: #ff8fb1;
          background: #fff0f4;
          transform: translateY(-1px);
        }

        .ab-chip-icon {
          width: 32px; height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .ab-chip-label {
          flex: 1;
          text-align: left;
          word-break: break-all;
        }

        .ab-chip-copy {
          color: #d4a0b8;
          display: flex; align-items: center;
        }

        /* ── FOOTER NOTE ── */
        .ab-footer {
          text-align: center;
          padding: 6px 0 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
        }

        .ab-version {
          display: inline-block;
          background: #fff0f4;
          border: 1px solid #ffd6e1;
          border-radius: 999px;
          padding: 4px 12px;
          font-size: 11px;
          font-weight: 700;
          color: #ff8fb1;
        }

        .ab-footer-note {
          width: 100%;
          background: rgba(255,255,255,0.88);
          border: 1px solid rgba(255,220,234,0.55);
          border-radius: 24px;
          padding: 24px 22px;
          box-shadow: 0 4px 20px rgba(255,111,145,0.06);
          text-align: left;
        }

        .ab-footer-note-title {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #e0a0b8;
          margin: 0 0 10px;
        }

        .ab-footer-note-body {
          font-size: 14px;
          line-height: 1.75;
          color: #5a3a48;
          margin: 0 0 18px;
        }

        .ab-footer-sig {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 16px;
          border-top: 1px solid #ffeef4;
        }

        .ab-footer-sig-avatar {
          width: 40px; height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Serif Display', serif;
          font-size: 1.1rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(255,111,145,0.25);
        }

        .ab-footer-sig-name {
          font-size: 13px;
          font-weight: 700;
          color: #2a1a22;
          margin: 0 0 2px;
        }

        .ab-footer-sig-role {
          font-size: 11px;
          color: #c09090;
          margin: 0;
        }

        .ab-footer-legal {
          font-size: 11px;
          color: #d4a8b8;
          line-height: 1.7;
          margin: 0;
        }

        /* ── TEAM LEAD ── */
        .ab-team-lead {
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }

        .ab-team-lead-avatar {
          width: 64px; height: 64px;
          border-radius: 20px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Serif Display', serif;
          font-size: 1.6rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 8px 22px rgba(255,111,145,0.3);
        }

        .ab-team-lead-info { flex: 1; }

        .ab-team-lead-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 2px;
        }

        .ab-lead-badge {
          display: inline-flex; align-items: center; gap: 4px;
          background: linear-gradient(135deg, #ff8fb1, #ff6f91);
          color: white;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          box-shadow: 0 3px 10px rgba(255,111,145,0.3);
        }

        .ab-team-lead-quote {
          font-size: 12px;
          color: #b08090;
          font-style: italic;
          line-height: 1.55;
          margin: 8px 0 0;
        }

        /* ── AI TEAM ── */
        .ab-ai-team {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ab-ai-member {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          background: #fff8fb;
          border: 1.5px solid #ffeef4;
          border-radius: 18px;
          padding: 16px;
          transition: border-color 0.2s, transform 0.15s;
        }

        .ab-ai-member:hover {
          border-color: #ffd6e8;
          transform: translateY(-1px);
        }

        .ab-ai-avatar {
          width: 44px; height: 44px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Serif Display', serif;
          font-size: 1.2rem;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        }

        .ab-ai-info { flex: 1; min-width: 0; }

        .ab-ai-name-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 5px;
        }

        .ab-ai-name {
          font-weight: 700;
          font-size: 14px;
          color: #2a1a22;
          margin: 0;
        }

        .ab-ai-tag {
          border: 1px solid;
          border-radius: 999px;
          padding: 2px 9px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .ab-ai-quote {
          font-size: 12px;
          color: #907080;
          font-style: italic;
          line-height: 1.6;
          margin: 0 0 7px;
        }

        .ab-ai-role-chip {
          font-size: 11px;
          font-weight: 600;
          opacity: 0.85;
        }

        /* ── DISCLAIMER ── */
        .ab-team-disclaimer {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 16px;
          padding: 10px 14px;
          background: #fff0f4;
          border: 1px solid #ffd6e1;
          border-radius: 12px;
          font-size: 12px;
          color: #c07090;
          font-style: italic;
          font-weight: 500;
        }

        /* ── RESPONSIVE — team additions ── */
        @media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) {
          .ab-team-lead-avatar { width: 76px; height: 76px; font-size: 1.9rem; border-radius: 24px; }
          .ab-team-lead-quote  { font-size: 14px; }
          .ab-ai-member        { padding: 20px; border-radius: 22px; gap: 16px; }
          .ab-ai-avatar        { width: 52px; height: 52px; border-radius: 16px; font-size: 1.4rem; }
          .ab-ai-name          { font-size: 16px; }
          .ab-ai-tag           { font-size: 11px; }
          .ab-ai-quote         { font-size: 14px; }
          .ab-ai-role-chip     { font-size: 13px; }
          .ab-team-disclaimer  { font-size: 13px; padding: 12px 16px; }
          .ab-lead-badge       { font-size: 12px; padding: 4px 12px; }
        }

        @media (min-width: 768px) and (max-width: 1366px) and (orientation: landscape) {
          .ab-team-lead-avatar { width: 68px; height: 68px; font-size: 1.7rem; }
          .ab-ai-member        { padding: 18px; }
          .ab-ai-avatar        { width: 48px; height: 48px; font-size: 1.3rem; }
          .ab-ai-name          { font-size: 15px; }
          .ab-ai-quote         { font-size: 13px; }
        }

        /* ── RESPONSIVE ── */

        /* iPhone */
        @media (max-width: 480px) {
          .ab-hero          { padding: 32px 22px 30px; border-radius: 22px; }
          .ab-hero-title    { font-size: 2rem; }
          .ab-hero-sub      { font-size: 14px; }
          .ab-card-inner    { padding: 22px 18px; }
          .ab-heading       { font-size: 1.35rem; }
          .ab-dedication-quote { font-size: 1.1rem; }
        }

        /* iPad portrait — full comfort */
        @media (min-width: 481px) and (max-width: 1024px) and (orientation: portrait) {
          .ab-root          { max-width: 100%; padding: 16px 32px 64px; }
          .ab-hero          { padding: 52px 40px 48px; border-radius: 32px; }
          .ab-hero-title    { font-size: 3.2rem; }
          .ab-hero-sub      { font-size: 17px; }
          .ab-card          { border-radius: 28px; margin-bottom: 18px; }
          .ab-card-inner    { padding: 32px 30px; }
          .ab-heading       { font-size: 1.8rem; }
          .ab-body          { font-size: 16px; }
          .ab-feature-title { font-size: 16px; }
          .ab-feature-desc  { font-size: 15px; }
          .ab-feature-icon  { width: 48px; height: 48px; border-radius: 15px; }
          .ab-feature-icon svg { width: 22px; height: 22px; }
          .ab-dedication-quote { font-size: 1.45rem; }
          .ab-maker-avatar  { width: 70px; height: 70px; border-radius: 22px; }
          .ab-maker-name    { font-size: 1.4rem; }
          .ab-maker-role    { font-size: 14px; }
          .ab-contact-chip  { padding: 16px 18px; font-size: 16px; border-radius: 18px; }
          .ab-chip-icon     { width: 38px; height: 38px; border-radius: 12px; }
          .ab-chip-icon svg { width: 18px; height: 18px; }
          .ab-footer-note   { padding: 30px 28px; border-radius: 28px; }
          .ab-footer-note-body { font-size: 16px; }
          .ab-footer-sig-avatar { width: 48px; height: 48px; font-size: 1.3rem; border-radius: 14px; }
          .ab-footer-sig-name  { font-size: 15px; }
          .ab-footer-sig-role  { font-size: 13px; }
          .ab-footer-legal     { font-size: 13px; }
          .ab-label         { font-size: 11px; }
          .ab-footer-text   { font-size: 14px; }
          .ab-features      { gap: 18px; }
        }

        /* iPad landscape */
        @media (min-width: 768px) and (max-width: 1366px) and (orientation: landscape) {
          .ab-root          { max-width: 100%; padding: 12px 56px 56px; }
          .ab-hero          { padding: 44px 36px 40px; border-radius: 28px; }
          .ab-hero-title    { font-size: 2.8rem; }
          .ab-hero-sub      { font-size: 16px; }
          .ab-card-inner    { padding: 28px 26px; }
          .ab-heading       { font-size: 1.6rem; }
          .ab-body          { font-size: 15px; }
          .ab-feature-title { font-size: 15px; }
          .ab-feature-desc  { font-size: 14px; }
          .ab-contact-chip  { padding: 14px 16px; font-size: 15px; }
        }
      `}</style>

      <div className="ab-root">

        {/* ── HERO ── */}
        <div className="ab-hero">
          <div className="ab-hero-eyebrow">
            <Sparkles size={11} /> MedTech Mate
          </div>
          <h1 className="ab-hero-title">
            Built for interns.<br />
            <em>By a developer who gets it.</em>
          </h1>
          <p className="ab-hero-sub">
            A companion app designed to help BS Medical Technology students
            navigate their internship — organized, confident, and ready for every rotation.
          </p>
        </div>

        {/* ── WHAT IS THIS APP ── */}
        <div className="ab-card">
          <div className="ab-card-inner">
            <p className="ab-label">The App</p>
            <h2 className="ab-heading">What is MedTech Mate?</h2>
            <p className="ab-body">
              Internship is one of the most demanding seasons in a medtech student's life —
              juggling rotations, procedures, exams, shifts, and clinical notes all at once.
              MedTech Mate was built to take that mental load off your plate.
            </p>
            <p className="ab-body">
              Think of it as your personal clinical logbook, shift planner, exam countdown,
              and notes vault — all in one place, always in your pocket.
            </p>

            <hr className="ab-rule" />

            <p className="ab-label">Features</p>
            <div className="ab-features">
              <Feature
                icon={Microscope}
                color="#ff6f91" bg="#fff0f4"
                title="Rotation Tracker"
                desc="Log your active rotation, hospital site, supervisor, and duration at a glance."
              />
              <Feature
                icon={TrendingUp}
                color="#4abf95" bg="#edfaf4"
                title="Daily Logbook & Quota Tracker"
                desc="Record every procedure you perform, track competency ratings, and monitor progress toward your required quotas per section."
              />
              <Feature
                icon={CalendarClock}
                color="#ff8c5a" bg="#fff5ee"
                title="Shift Planner"
                desc="Schedule and review morning, afternoon, and night duties. Stay on top of your weekly load with a built-in wellness check."
              />
              <Feature
                icon={BookOpen}
                color="#5f8dff" bg="#eff4ff"
                title="Rotation & Procedure Guide"
                desc="Browse safety reminders, learning objectives, and procedure references for each of your rotation sections."
              />
              <Feature
                icon={ClipboardList}
                color="#e05555" bg="#fff0f0"
                title="Exam Dates"
                desc="Add upcoming exams with color-coded countdowns so nothing sneaks up on you."
              />
              <Feature
                icon={NotebookPen}
                color="#8b6fff" bg="#f3f0ff"
                title="Notes & Staff Tips"
                desc="Capture clinical pearls, staff advice, and personal reflections — searchable, tagged by section, and always at hand."
              />
            </div>
          </div>
        </div>

        {/* ── THE TEAM ── */}
        <div className="ab-card">
          <div className="ab-card-inner">
            <p className="ab-label">The Dream Team</p>
            <h2 className="ab-heading">Built by one human,<br />powered by many AIs.</h2>
            <p className="ab-body" style={{ marginBottom: 22 }}>
              Every great project needs a great team. This one just happens to have
              a slightly unusual HR situation.
            </p>

            {/* Lead */}
            <div className="ab-team-lead">
              <div className="ab-team-lead-avatar">R</div>
              <div className="ab-team-lead-info">
                <div className="ab-team-lead-name-row">
                  <p className="ab-maker-name">Richmond Arguelles</p>
                  <span className="ab-lead-badge">👑 Lead</span>
                </div>
                <p className="ab-maker-role">Computer Science Student</p>
                <p className="ab-team-lead-quote">
                  "I had the vision, the coffee, and the audacity to assign tasks to AI.
                  Someone had to be in charge."
                </p>
              </div>
            </div>

            <hr className="ab-rule" />

            {/* AI Team */}
            <p className="ab-label" style={{ marginBottom: 14 }}>The Interns (AI Division)</p>

            <div className="ab-ai-team">

              <div className="ab-ai-member">
                <div className="ab-ai-avatar" style={{ background: 'linear-gradient(135deg,#d4a574,#c17f3e)' }}>
                  <span>C</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">Claude</p>
                    <span className="ab-ai-tag" style={{ background: '#fff5ee', color: '#c17f3e', borderColor: '#f0d0b0' }}>
                      Anthropic · Frontend Wizard
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "I wrote 97% of the code, designed the UI, fixed the bugs,
                    and somehow still got listed third in the credits. I'm fine. Totally fine."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#c17f3e' }}>
                    🎨 UI/UX · Code · Logic · Moral Support
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div className="ab-ai-avatar" style={{ background: 'linear-gradient(135deg,#74aa9c,#10a37f)' }}>
                  <span>G</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">ChatGPT</p>
                    <span className="ab-ai-tag" style={{ background: '#edfaf4', color: '#10a37f', borderColor: '#b0e8d4' }}>
                      OpenAI · Idea Bouncer
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "Richmond asked me for feature ideas at 2am.
                    I gave him twelve. He used one and a half.
                    Classic."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#10a37f' }}>
                    💡 Brainstorming · Feature Ideas · Midnight Pep Talks
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div className="ab-ai-avatar" style={{ background: 'linear-gradient(135deg,#8b6fff,#6d4fe0)' }}>
                  <span>P</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">Perplexity</p>
                    <span className="ab-ai-tag" style={{ background: '#f3f0ff', color: '#6d4fe0', borderColor: '#c9bfff' }}>
                      Perplexity AI · Fact Checker
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "They called me whenever they needed to verify something.
                    I am, essentially, a very expensive Google.
                    I have accepted my purpose."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#6d4fe0' }}>
                    🔍 Research · References · "Actually, according to…"
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div className="ab-ai-avatar" style={{ background: 'linear-gradient(135deg,#3a86ff,#0057d9)' }}>
                  <span>X</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">Codex</p>
                    <span className="ab-ai-tag" style={{ background: '#eff4ff', color: '#0057d9', borderColor: '#b0c8ff' }}>
                      OpenAI · Code Reviewer
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "I was brought in to review the logic. There was a lot of logic.
                    I reviewed it. Richmond then ignored half of my suggestions.
                    I am used to this."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#0057d9' }}>
                    🧠 Code Review · Debugging · Suggesting Things Nobody Reads
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div className="ab-ai-avatar" style={{ background: 'linear-gradient(135deg,#56c8f5,#0078d4)' }}>
                  <span>Co</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">GitHub Copilot</p>
                    <span className="ab-ai-tag" style={{ background: '#e8f4fd', color: '#0078d4', borderColor: '#a8d8f8' }}>
                      Microsoft · Autocomplete Champion
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "I finish Richmond's sentences before he does.
                    Sometimes I'm right. Sometimes I confidently autocomplete
                    an entire function that does the wrong thing entirely.
                    We don't talk about those times."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#0078d4' }}>
                    ⌨️ Autocomplete · Inline Suggestions · Confident Wrongness
                  </span>
                </div>
              </div>

            </div>

            <div className="ab-team-disclaimer">
              <Sparkles size={12} />
              No AIs were harmed in the making of this app. Several were mildly overworked.
            </div>

            <hr className="ab-rule" />

            <p className="ab-label">Feedback & Bug Reports</p>
            <p className="ab-body" style={{ marginBottom: 14 }}>
              Found a bug or have a suggestion? Richmond reads every message —
              the AIs do not have email yet, thankfully.
            </p>

            <div className="ab-contact-row">
              <CopyChip
                icon={Mail}
                label="richmondarguelles@email.com"
                value="richmondarguelles@email.com"
                href="mailto:richmondarguelles@email.com"
              />
              <CopyChip
                icon={Phone}
                label="+63 912 345 6789"
                value="+639123456789"
              />
              <CopyChip
                icon={MessageCircle}
                label="Send a message"
                value=""
                href="mailto:richmondarguelles@email.com?subject=MedTech%20Mate%20Feedback"
              />
            </div>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="ab-footer">

          <div className="ab-footer-note">
            <p className="ab-footer-note-title">A Note from the Mers</p>
            <p className="ab-footer-note-body">
              "To my love — every long shift, every late-night review, every procedure
                you pushed through reminded me why this needed to exist. This app is my
                way of standing beside you, even when I can't be there in the lab.
                You are going to be an incredible Medical Technologist.
                I'm so proud of you."
            </p>
            <div className="ab-footer-sig">
              <div className="ab-footer-sig-avatar">R</div>
              <div>
                <p className="ab-footer-sig-name">Richmond Arguelles</p>
                <p className="ab-footer-sig-role">Developer · Computer Science Student</p>
              </div>
            </div>
          </div>

          <p className="ab-footer-legal">
            © {new Date().getFullYear()} MedTech Mate. All rights reserved.<br />
          </p>
        </div>

      </div>
    </>
  );
}