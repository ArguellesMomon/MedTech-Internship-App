import { Component, useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import { useAuth } from './auth/AuthProvider';

import Dashboard          from './pages/Dashboard';
import Login              from './pages/Login';
import Profile            from './pages/Profile';
import Signup             from './pages/Signup';
import LandingPage        from './pages/LandingPage';

import About              from './components/About';
import RotationGuide      from './components/RotationGuide';
import DailyReportTracker from './components/QuotaTracker';
import ShiftPlanner       from './components/ShiftPlanner';
import NotesSection       from './components/NotesSection';
import DocumentsPage      from './components/DocumentsPage';

import { isSupabaseConfigured } from './lib/supabase';
import Logo from './assets/Logo.png';

import {
  Menu, X,
  LayoutDashboard, Microscope, ClipboardList,
  CalendarClock, NotebookPen,
  User, LogOut, Info, FolderOpen,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   SETUP REQUIRED
───────────────────────────────────────────── */
function SetupRequired() {
  return (
    <section style={{
      padding: '40px', background: 'white', borderRadius: '24px',
      maxWidth: '700px', margin: '40px auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    }}>
      <h1 style={{ marginBottom: '16px', color: '#ff5d8f' }}>Set up Supabase first</h1>
      <p style={{ lineHeight: 1.7 }}>
        The app is running, but it needs your Supabase URL and anon key before
        login, signup, and dashboard data can work.
      </p>
      <ol style={{ marginTop: '20px', lineHeight: 2 }}>
        <li>Copy <code>.env.example</code> to <code>.env</code></li>
        <li>Add your <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code></li>
        <li>Restart the Vite dev server</li>
      </ol>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PROTECTED ROUTE
   — redirects unauthenticated users to /landing
───────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh', display: 'flex',
        justifyContent: 'center', alignItems: 'center',
        fontSize: '18px', color: '#ff5d8f',
      }}>
        Loading session…
      </main>
    );
  }

  // Send unauthenticated visitors to the landing page
  if (!user) return <Navigate to="/landing" replace />;
  return children;
}

/* ─────────────────────────────────────────────
   NAV CONFIG
───────────────────────────────────────────── */
const MAIN_NAV = [
  { to: '/',          Icon: LayoutDashboard, label: 'Dashboard'      },
  { to: '/rotations', Icon: Microscope,      label: 'Rotations'      },
  { to: '/reports',   Icon: ClipboardList,   label: 'Daily Reports'  },
  { to: '/shifts',    Icon: CalendarClock,   label: 'Shifts & Exams' },
  { to: '/notes',     Icon: NotebookPen,     label: 'Notes'          },
  { to: '/documents', Icon: FolderOpen,      label: 'Documents'      },
  { to: '/about',     Icon: Info,            label: 'About'          },
];

/* ─────────────────────────────────────────────
   HAMBURGER MENU
───────────────────────────────────────────── */
function HamburgerMenu({ open, setOpen }) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name?.trim().split(/\s+/)[0] || 'there';
  const initial     = (profile?.full_name?.trim() || user?.email || 'M')[0].toUpperCase();
  const avatarUrl   = profile?.avatar_url;

  return (
    <>
      {open && <div className="menu-backdrop" onClick={() => setOpen(false)} />}
      <aside className={`side-menu ${open ? 'open' : ''}`}>
        <div className="menu-top">
          <span style={{ color: '#ff5d8f', fontSize: '1.15rem', fontWeight: 700 }}>✨ Menu</span>
          <button className="close-btn" onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* Profile chip */}
        <Link to="/profile" className="menu-profile-chip" onClick={() => setOpen(false)}>
          <div className="menu-avatar">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }}
              />
            ) : initial}
          </div>
          <div className="menu-profile-info">
            <span className="menu-profile-name">{displayName}</span>
            <span className="menu-profile-sub">View & edit profile →</span>
          </div>
        </Link>

        <div className="menu-divider" />

        {/* Main nav */}
        <div className="menu-links">
          {MAIN_NAV.map(({ to, Icon, label }) => {
            const isActive = to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={`menu-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="menu-divider" />

        {/* Log out */}
        <button className="menu-link menu-logout" onClick={signOut}>
          <LogOut size={17} />
          Log out
        </button>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────
   APP LAYOUT
   — hides the top bar + hamburger on pages that
     have their own full-screen chrome:
     /landing, /login, /signup
───────────────────────────────────────────── */
function AppLayout({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Pages that render their own full-screen layout
  const SHELL_FREE = ['/landing', '/login', '/signup'];
  const hideShell  = SHELL_FREE.includes(location.pathname);

  // If this page manages its own layout, just render children
  if (hideShell) {
    return <>{children}</>;
  }

  return (
    <>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }
        html, body, #root {
          margin: 0; padding: 0;
          width: 100%; min-height: 100vh;
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg,#fff5f7 0%,#ffe4ec 50%,#fff0e5 100%);
          overflow-x: hidden;
        }
        a { text-decoration: none; }
        .app-shell { min-height: 100vh; }

        /* ── TOP BAR ── */
        .top-bar {
          position: sticky; top: 0; z-index: 300;
          height: 68px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 20px;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255,255,255,0.45);
        }
        .brand-link {
          display: flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 1rem; color: #ff5d8f;
        }
        .brand-logo { height: 30px; width: auto; object-fit: contain; display: block; }
        .menu-toggle {
          width: 42px; height: 42px; border: none; border-radius: 14px;
          background: rgba(255,111,145,0.1); color: #ff5d8f;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: 0.2s;
        }
        .menu-toggle:hover { background: rgba(255,111,145,0.18); }

        /* ── MAIN ── */
        .main-content {
          width: 100%; min-height: calc(100vh - 68px);
          padding: 24px 20px calc(132px + env(safe-area-inset-bottom, 0px));
        }

        /* ── BACKDROP ── */
        .menu-backdrop {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.28);
          z-index: 399; backdrop-filter: blur(4px);
        }

        /* ── SIDE MENU ── */
        .side-menu {
          position: fixed; top: 0; right: -320px;
          width: 290px; max-width: 90vw; height: 100vh;
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(22px);
          z-index: 400; padding: 22px 18px;
          transition: right 0.28s cubic-bezier(0.32,0,0.18,1);
          box-shadow: -10px 0 32px rgba(0,0,0,0.08);
          display: flex; flex-direction: column; gap: 0;
        }
        .side-menu.open { right: 0; }

        .menu-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 18px;
        }
        .close-btn {
          width: 36px; height: 36px; border: none; border-radius: 11px;
          background: #fff0f4; color: #ff5d8f;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          transition: 0.2s;
        }
        .close-btn:hover { background: #ffd6e1; }

        /* Profile chip */
        .menu-profile-chip {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 14px; border-radius: 18px;
          background: linear-gradient(135deg, rgba(255,143,177,0.1), rgba(255,111,145,0.06));
          border: 1.5px solid rgba(255,143,177,0.25);
          margin-bottom: 14px; transition: 0.2s;
          text-decoration: none;
        }
        .menu-profile-chip:hover {
          background: linear-gradient(135deg, rgba(255,143,177,0.18), rgba(255,111,145,0.1));
          border-color: rgba(255,143,177,0.45);
          transform: translateY(-1px);
        }
        .menu-avatar {
          width: 40px; height: 40px; border-radius: 14px;
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; font-weight: 700; color: white;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(255,111,145,0.3);
          overflow: hidden;
        }
        .menu-profile-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .menu-profile-name {
          font-size: 14px; font-weight: 700; color: #333;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .menu-profile-sub { font-size: 11px; color: #ff8fb1; font-weight: 500; }

        /* Nav links */
        .menu-links { display: flex; flex-direction: column; gap: 4px; }
        .menu-link {
          width: 100%; border: none; background: transparent;
          padding: 13px 14px; border-radius: 16px;
          display: flex; align-items: center; gap: 12px;
          font-size: 14px; font-weight: 500; color: #666;
          cursor: pointer; transition: 0.2s; text-align: left;
          font-family: 'Poppins', sans-serif;
        }
        .menu-link:hover { background: rgba(255,111,145,0.07); color: #ff5d8f; transform: translateX(2px); }
        .menu-link.active {
          background: linear-gradient(135deg,#ff8fb1,#ff6f91);
          color: white;
          box-shadow: 0 6px 18px rgba(255,111,145,0.22);
        }
        .menu-divider { height: 1px; background: #ffd6e1; margin: 10px 0; flex-shrink: 0; }
        .menu-logout { color: #e05555 !important; margin-top: 2px; }
        .menu-logout:hover { background: #fde8e8 !important; color: #e05555 !important; transform: none !important; }

        /* ── RESPONSIVE ── */
        @media (min-width: 768px) {
          .top-bar { padding: 0 30px; }
          .main-content { padding: 8px 40px 115px; }
        }
        @media (min-width: 1024px) {
          .main-content { max-width: 1180px; margin: 0 auto; }
        }
      `}</style>

      <div className="app-shell">
        <header className="top-bar">
          <Link to="/" className="brand-link">
            <img src={Logo} alt="MedTech Mate Logo" className="brand-logo" />
          </Link>
          {user && (
            <button className="menu-toggle" onClick={() => setMenuOpen(true)}>
              <Menu size={20} />
            </button>
          )}
        </header>

        {user && <HamburgerMenu open={menuOpen} setOpen={setMenuOpen} />}

        <main className="main-content">
          {children}
        </main>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   APP ERROR BOUNDARY
───────────────────────────────────────────── */
class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App caught an error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <main style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', padding: '24px',
          color: '#333', background: '#fff7f8',
        }}>
          <h1 style={{ marginBottom: '16px' }}>Something went wrong</h1>
          <p style={{ maxWidth: '680px', textAlign: 'center', marginBottom: '18px' }}>
            An unexpected error occurred while rendering the app. Please refresh the page or try again.
          </p>
          <pre style={{
            width: '100%', maxWidth: '720px', whiteSpace: 'pre-wrap',
            wordBreak: 'break-word', background: '#fff', padding: '16px',
            borderRadius: '16px', border: '1px solid #ffd6e1',
          }}>
            {this.state.error.message}
          </pre>
        </main>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────────────────────────────
   APP ROOT
───────────────────────────────────────────── */
export default function App() {
  if (!isSupabaseConfigured) {
    return (
      <AppLayout>
        <SetupRequired />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <AppErrorBoundary>
        <Routes>
          {/* ── Public / shell-free routes ── */}
          <Route path="/landing"   element={<LandingPage />} />
          <Route path="/login"     element={<Login />} />
          <Route path="/signup"    element={<Signup />} />

          {/* ── Protected routes ── */}
          <Route path="/"          element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/rotations" element={<ProtectedRoute><RotationGuide /></ProtectedRoute>} />
          <Route path="/reports"   element={<ProtectedRoute><DailyReportTracker /></ProtectedRoute>} />
          <Route path="/shifts"    element={<ProtectedRoute><ShiftPlanner /></ProtectedRoute>} />
          <Route path="/notes"     element={<ProtectedRoute><NotesSection /></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/documents" element={<ProtectedRoute><DocumentsPage /></ProtectedRoute>} />

          {/* ── Public utility ── */}
          <Route path="/about"     element={<About />} />

          {/* ── Catch-all: unauthenticated → landing, authenticated → dashboard ── */}
          <Route path="*"          element={<Navigate to="/" replace />} />
        </Routes>
      </AppErrorBoundary>
    </AppLayout>
  );
}
