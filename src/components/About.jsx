import '../styles/features/About.css';
import { useState } from 'react';
import {
  Heart,
  Mail,
  Phone,
  Microscope,
  ClipboardList,
  CalendarClock,
  NotebookPen,
  BookOpen,
  TrendingUp,
  Sparkles,
  MessageCircle,
  Copy,
  Check,
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
  const extra = href
    ? { href, target: '_blank', rel: 'noopener noreferrer' }
    : { type: 'button', onClick: handleCopy };

  return (
    <Wrapper className="ab-contact-chip" {...extra}>
      <span className="ab-chip-icon">
        <Icon size={15} />
      </span>
      <span className="ab-chip-label">{label}</span>
      {!href && (
        <span className="ab-chip-copy">{copied ? <Check size={12} /> : <Copy size={12} />}</span>
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
      <div className="ab-root">
        {/* ── HERO ── */}
        <div className="ab-hero">
          <div className="ab-hero-eyebrow">
            <Sparkles size={11} /> MedTech Mate
          </div>
          <h1 className="ab-hero-title">
            Built for interns.
            <br />
            <em>By a developer who gets it.</em>
          </h1>
          <p className="ab-hero-sub">
            A companion app designed to help BS Medical Technology students navigate their
            internship — organized, confident, and ready for every rotation.
          </p>
        </div>

        {/* ── WHAT IS THIS APP ── */}
        <div className="ab-card">
          <div className="ab-card-inner">
            <p className="ab-label">The App</p>
            <h2 className="ab-heading">What is MedTech Mate?</h2>
            <p className="ab-body">
              Internship is one of the most demanding seasons in a medtech student's life — juggling
              rotations, procedures, exams, shifts, and clinical notes all at once. MedTech Mate was
              built to take that mental load off your plate.
            </p>
            <p className="ab-body">
              Think of it as your personal clinical logbook, shift planner, exam countdown, and
              notes vault — all in one place, always in your pocket.
            </p>

            <hr className="ab-rule" />

            <p className="ab-label">Features</p>
            <div className="ab-features">
              <Feature
                icon={Microscope}
                color="#ff6f91"
                bg="#fff0f4"
                title="Rotation Tracker"
                desc="Log your active rotation, hospital site, supervisor, and duration at a glance."
              />
              <Feature
                icon={TrendingUp}
                color="#4abf95"
                bg="#edfaf4"
                title="Daily Logbook & Quota Tracker"
                desc="Record every procedure you perform, track competency ratings, and monitor progress toward your required quotas per section."
              />
              <Feature
                icon={CalendarClock}
                color="#ff8c5a"
                bg="#fff5ee"
                title="Shift Planner"
                desc="Schedule and review morning, afternoon, and night duties. Stay on top of your weekly load with a built-in wellness check."
              />
              <Feature
                icon={BookOpen}
                color="#5f8dff"
                bg="#eff4ff"
                title="Rotation & Procedure Guide"
                desc="Browse safety reminders, learning objectives, and procedure references for each of your rotation sections."
              />
              <Feature
                icon={ClipboardList}
                color="#e05555"
                bg="#fff0f0"
                title="Exam Dates"
                desc="Add upcoming exams with color-coded countdowns so nothing sneaks up on you."
              />
              <Feature
                icon={NotebookPen}
                color="#8b6fff"
                bg="#f3f0ff"
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
            <h2 className="ab-heading">
              Built by one human,
              <br />
              powered by many AIs.
            </h2>
            <p className="ab-body" style={{ marginBottom: 22 }}>
              Every great project needs a great team. This one just happens to have a slightly
              unusual HR situation.
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
                  "I had the vision, the coffee, and the audacity to assign tasks to AI. Someone had
                  to be in charge."
                </p>
              </div>
            </div>

            <hr className="ab-rule" />

            {/* AI Team */}
            <p className="ab-label" style={{ marginBottom: 14 }}>
              The Interns (AI Division)
            </p>

            <div className="ab-ai-team">
              <div className="ab-ai-member">
                <div
                  className="ab-ai-avatar"
                  style={{ background: 'linear-gradient(135deg,#d4a574,#c17f3e)' }}
                >
                  <span>C</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">Claude</p>
                    <span
                      className="ab-ai-tag"
                      style={{
                        background: 'var(--peach-soft)',
                        color: '#c17f3e',
                        borderColor: '#f0d0b0',
                      }}
                    >
                      Anthropic · Frontend Wizard
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "I wrote 97% of the code, designed the UI, fixed the bugs, and somehow still got
                    listed third in the credits. I'm fine. Totally fine."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#c17f3e' }}>
                    🎨 UI/UX · Code · Logic · Moral Support
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div
                  className="ab-ai-avatar"
                  style={{ background: 'linear-gradient(135deg,#74aa9c,#10a37f)' }}
                >
                  <span>G</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">ChatGPT</p>
                    <span
                      className="ab-ai-tag"
                      style={{
                        background: 'var(--sage-soft)',
                        color: '#10a37f',
                        borderColor: '#b0e8d4',
                      }}
                    >
                      OpenAI · Idea Bouncer
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "Richmond asked me for feature ideas at 2am. I gave him twelve. He used one and
                    a half. Classic."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#10a37f' }}>
                    💡 Brainstorming · Feature Ideas · Midnight Pep Talks
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div
                  className="ab-ai-avatar"
                  style={{ background: 'linear-gradient(135deg,#8b6fff,#6d4fe0)' }}
                >
                  <span>P</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">Perplexity</p>
                    <span
                      className="ab-ai-tag"
                      style={{
                        background: 'var(--lavender-soft)',
                        color: '#6d4fe0',
                        borderColor: '#c9bfff',
                      }}
                    >
                      Perplexity AI · Fact Checker
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "They called me whenever they needed to verify something. I am, essentially, a
                    very expensive Google. I have accepted my purpose."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#6d4fe0' }}>
                    🔍 Research · References · "Actually, according to…"
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div
                  className="ab-ai-avatar"
                  style={{ background: 'linear-gradient(135deg,#3a86ff,#0057d9)' }}
                >
                  <span>X</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">Codex</p>
                    <span
                      className="ab-ai-tag"
                      style={{
                        background: 'var(--lavender-soft)',
                        color: '#0057d9',
                        borderColor: '#b0c8ff',
                      }}
                    >
                      OpenAI · Code Reviewer
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "I was brought in to review the logic. There was a lot of logic. I reviewed it.
                    Richmond then ignored half of my suggestions. I am used to this."
                  </p>
                  <span className="ab-ai-role-chip" style={{ color: '#0057d9' }}>
                    🧠 Code Review · Debugging · Suggesting Things Nobody Reads
                  </span>
                </div>
              </div>

              <div className="ab-ai-member">
                <div
                  className="ab-ai-avatar"
                  style={{ background: 'linear-gradient(135deg,#56c8f5,#0078d4)' }}
                >
                  <span>Co</span>
                </div>
                <div className="ab-ai-info">
                  <div className="ab-ai-name-row">
                    <p className="ab-ai-name">GitHub Copilot</p>
                    <span
                      className="ab-ai-tag"
                      style={{ background: '#e8f4fd', color: '#0078d4', borderColor: '#a8d8f8' }}
                    >
                      Microsoft · Autocomplete Champion
                    </span>
                  </div>
                  <p className="ab-ai-quote">
                    "I finish Richmond's sentences before he does. Sometimes I'm right. Sometimes I
                    confidently autocomplete an entire function that does the wrong thing entirely.
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
              Found a bug or have a suggestion? Richmond reads every message — the AIs do not have
              email yet, thankfully.
            </p>

            <div className="ab-contact-row">
              <CopyChip
                icon={Mail}
                label="richmondarguelles@email.com"
                value="richmondarguelles@email.com"
                href="mailto:richmondarguelles@email.com"
              />
              <CopyChip icon={Phone} label="+63 912 345 6789" value="+639123456789" />
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
              "To my love — every long shift, every late-night review, every procedure you pushed
              through reminded me why this needed to exist. This app is my way of standing beside
              you, even when I can't be there in the lab. You are going to be an incredible Medical
              Technologist. I'm so proud of you."
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
            © {new Date().getFullYear()} MedTech Mate. All rights reserved.
            <br />
          </p>
        </div>
      </div>
    </>
  );
}
