import { Link } from 'react-router-dom';
import {
  ArrowRight,
  ArrowUpRight,
  Heart,
  Microscope,
  ClipboardList,
  CalendarDays,
  NotebookPen,
  FolderOpen,
  Sparkles,
  Check,
  Moon,
  Plus,
  LayoutDashboard,
} from 'lucide-react';
import { ThemeToggle } from '../theme/ThemeProvider';
import Brand from '../components/layout/Brand';
import { startDemo } from '../lib/demo';
import Hamster from '../assets/Hamster.webp';
const features = [
  {
    icon: Microscope,
    title: 'Find your rhythm.',
    label: 'ROTATIONS & GUIDES',
    description:
      'Keep your rotations together, with objectives, procedures, and reminders close at hand.',
    color: 'rose',
  },
  {
    icon: ClipboardList,
    title: 'Make progress visible.',
    label: 'LOGBOOK & QUOTAS',
    description: 'Record each procedure and see how your little wins add up toward your targets.',
    color: 'sage',
  },
  {
    icon: CalendarDays,
    title: 'A plan. And a breather.',
    label: 'SHIFTS & EXAMS',
    description: 'Know what’s next, make space for study, and remember to take care of yourself.',
    color: 'lavender',
  },
  {
    icon: NotebookPen,
    title: 'Keep the good tips.',
    label: 'NOTES & STAFF WISDOM',
    description: 'A personal notebook for the things textbooks miss and your seniors teach you.',
    color: 'peach',
  },
  {
    icon: FolderOpen,
    title: 'Everything in its place.',
    label: 'YOUR DOCUMENT LIBRARY',
    description: 'Bring your learning materials into one organized, searchable home.',
    color: 'rose',
  },
  {
    icon: Sparkles,
    title: 'A friend in your corner.',
    label: 'MEET PIP',
    description:
      'Your little hamster companion for study questions, encouragement, and a kinder day.',
    color: 'sage',
  },
];
function WorkspacePreview() {
  return (
    <div className="landing-preview">
      <div className="preview-browser">
        <span />
        <span />
        <span />
        <small>YOUR LITTLE CORNER OF THE LAB</small>
        <Heart size={12} />
      </div>
      <div className="preview-workspace">
        <aside>
          <div className="preview-logo">
            <Microscope size={20} />
            <strong>m.</strong>
          </div>
          {[LayoutDashboard, Microscope, ClipboardList, CalendarDays, NotebookPen].map(
            (Icon, i) => (
              <span className={i === 0 ? 'selected' : ''} key={i}>
                <Icon size={17} />
              </span>
            ),
          )}
          <img src={Hamster} alt="" />
        </aside>
        <div className="preview-main">
          <div className="preview-heading">
            <div>
              <small>YOUR INTERNSHIP, A LITTLE LIGHTER</small>
              <h3>
                Hey, future RMT. <span>✦</span>
              </h3>
              <p>You’re doing better than you think.</p>
            </div>
            <div className="preview-avatar">A</div>
          </div>
          <div className="preview-stats">
            <div>
              <span className="sage">
                <Check size={14} />
              </span>
              <strong>
                64<small>%</small>
              </strong>
              <p>Quota progress</p>
            </div>
            <div>
              <span className="lavender">
                <CalendarDays size={14} />
              </span>
              <strong>4</strong>
              <p>Shifts this week</p>
            </div>
            <div>
              <span className="peach">
                <NotebookPen size={14} />
              </span>
              <strong>12</strong>
              <p>Little notes</p>
            </div>
          </div>
          <div className="preview-rotation">
            <div>
              <small>
                <span className="status-dot" />
                CURRENT ROTATION
              </small>
              <h4>Hematology</h4>
              <p>One section. So much growth.</p>
              <span className="preview-link">
                Explore rotation <ArrowUpRight size={12} />
              </span>
            </div>
            <div className="preview-ring">
              <Microscope size={28} />
              <strong>
                12<small>days to go</small>
              </strong>
            </div>
          </div>
          <div className="preview-agenda">
            <div>
              <strong>A little look ahead</strong>
              <CalendarDays size={13} />
            </div>
            <div>
              <span className="preview-date">
                OCT<strong>08</strong>
              </span>
              <p>
                <strong>Morning duty</strong>
                <small>Hematology · 7 AM – 3 PM</small>
              </p>
              <span className="preview-tag">Tomorrow</span>
            </div>
          </div>
          <div className="preview-encouragement">
            <Heart size={14} />
            <p>
              Every little step counts.
              <br />
              <strong>And I’m cheering for all of them.</strong>
            </p>
            <span>♡</span>
          </div>
        </div>
      </div>
      <span className="preview-caption">A peek inside · illustrative sample data</span>
    </div>
  );
}
export default function LandingPage() {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#landing-main">
        Skip to content
      </a>
      <header className="landing-nav">
        <Brand />
        <nav aria-label="Website navigation">
          <a href="#features" className="landing-feature-link">
            What’s inside
          </a>
          <ThemeToggle />
          <Link to="/login" className="landing-login">
            Log in
          </Link>
          <Link to="/signup" className="button primary small">
            Get started
            <ArrowUpRight size={15} />
          </Link>
        </nav>
      </header>
      <main id="landing-main">
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <p className="hero-pill">
              <span className="status-dot" />
              FOR THE INTERN. AND THE HUMAN.
            </p>
            <h1>
              Your internship,
              <br />
              <em>a little lighter.</em>
              <span className="landing-star">✦</span>
            </h1>
            <p className="hero-description">
              Busy shifts. Big dreams. A hundred little things to remember. Meet your warm,
              organized corner of the lab—made to help you grow, one day at a time.
            </p>
            <div className="hero-actions">
              <Link className="button primary" to="/signup">
                Find your little workspace
                <ArrowRight size={17} />
              </Link>
              <button className="button text-button" onClick={startDemo}>
                Take a look around
                <ArrowUpRight size={17} />
              </button>
            </div>
            <p className="hero-footnote">
              <Heart size={13} />
              Made with love, for medical technology interns.
            </p>
            <div className="hero-trust">
              <span>
                <Check size={13} />
                Phone, iPad & desktop
              </span>
              <span>
                <Moon size={13} />
                Light & dark mode
              </span>
            </div>
          </div>
          <WorkspacePreview />
        </section>
        <div className="landing-love-line">
          <span>✦</span>
          <p>
            For the first-day nerves, the late-night reviews,
            <br className="mobile-break" /> and every <em>“I did it”</em> in between.
          </p>
          <span>✦</span>
        </div>
        <section id="features" className="landing-features">
          <div className="landing-section-heading">
            <p className="eyebrow">A HOME FOR YOUR INTERNSHIP</p>
            <h2>
              A little structure.
              <br />
              <em>A lot of heart.</em>
            </h2>
            <p>
              Everything you need to feel prepared.
              <br />A little encouragement to keep you going.
            </p>
          </div>
          <div className="landing-feature-grid">
            {features.map(({ icon: Icon, title, label, description, color }) => (
              <article className="landing-feature-card" key={label}>
                <span className={'feature-icon ' + color}>
                  <Icon size={23} strokeWidth={1.6} />
                </span>
                <p className="eyebrow">{label}</p>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-personal">
          <div className="personal-pip">
            <img src={Hamster} alt="Pip, the MedTech Mate hamster" />
            <span>Hi, I’m Pip. ♡</span>
          </div>
          <div>
            <p className="eyebrow">
              <Heart size={13} />
              BUILT WITH SOMEONE SPECIAL IN MIND
            </p>
            <h2>
              It started with love.
              <br />
              <em>There’s room for you, too.</em>
            </h2>
            <p>
              MedTech Mate was made for someone navigating the beautiful, messy journey of becoming
              a medical technologist. That same care is here for every intern who needs a little
              help along the way.
            </p>
            <Link to="/about">
              Read the story behind Mate
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
        <section className="landing-final">
          <p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p>
          <h2>
            You bring the dream.
            <br />
            <em>We’ll hold the little things.</em>
          </h2>
          <div>
            <Link to="/signup" className="button primary">
              Make yourself at home
              <ArrowRight size={17} />
            </Link>
            <button className="button secondary" onClick={startDemo}>
              Explore the demo
              <Plus size={16} />
            </button>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <Brand />
        <p>Made with love. Built for the journey.</p>
        <div>
          <Link to="/about">
            About Mate
            <ArrowUpRight size={14} />
          </Link>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
