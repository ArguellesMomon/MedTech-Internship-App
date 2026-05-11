import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthProvider';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Signup from './pages/Signup';
import RotationGuide from './components/RotationGuide';
import DailyReportTracker from './components/QuotaTracker';
import ShiftPlanner from './components/ShiftPlanner';
import NotesSection from './components/NotesSection';

import { isSupabaseConfigured } from './lib/supabase';
import {
  LayoutDashboard,
  Microscope,
  ClipboardList,
  CalendarClock,
  NotebookPen,
  User,
  LogOut,
} from 'lucide-react';

/* ─────────────────────────────────────────────
   SETUP REQUIRED SCREEN
───────────────────────────────────────────── */
function SetupRequired() {
  return (
    <section style={{
      padding: '40px',
      background: 'white',
      borderRadius: '24px',
      maxWidth: '700px',
      margin: '40px auto',
      boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    }}>
      <h1 style={{ marginBottom: '16px', color: '#ff5d8f' }}>
        Set up Supabase first
      </h1>
      <p style={{ lineHeight: 1.7 }}>
        The app is running, but it needs your Supabase URL and anon key before
        login, signup, and dashboard data can work.
      </p>
      <ol style={{ marginTop: '20px', lineHeight: 2 }}>
        <li>Copy `.env.example` to a new file named `.env`.</li>
        <li>Add your `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.</li>
        <li>Restart the Vite dev server.</li>
      </ol>
    </section>
  );
}

/* ─────────────────────────────────────────────
   PROTECTED ROUTE
───────────────────────────────────────────── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '18px',
        color: '#ff5d8f',
      }}>
        Loading session...
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* ─────────────────────────────────────────────
   BOTTOM NAV BAR
───────────────────────────────────────────── */
const NAV_ITEMS = [
  { to: '/',          icon: LayoutDashboard, label: 'Home'     },
  { to: '/rotations', icon: Microscope,       label: 'Rotations' },
  { to: '/reports',   icon: ClipboardList,    label: 'Reports'  },
  { to: '/shifts',    icon: CalendarClock,    label: 'Shifts'   },
  { to: '/notes',     icon: NotebookPen,      label: 'Notes'    },
];

function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
        // exact match for home, startsWith for others
        const isActive = to === '/'
          ? location.pathname === '/'
          : location.pathname.startsWith(to);

        return (
          <Link
            key={to}
            to={to}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={22} className="nav-icon" />
            <span className="nav-label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ─────────────────────────────────────────────
   APP LAYOUT
───────────────────────────────────────────── */
function AppLayout({ children }) {
  const { user, signOut } = useAuth();
  const location = useLocation();

  // Hide bottom nav on auth pages
  const isAuthPage = ['/login', '/signup'].includes(location.pathname);

  return (
    <>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
          -webkit-tap-highlight-color: transparent;
        }

        html, body, #root {
          margin: 0;
          padding: 0;
          width: 100%;
          min-height: 100vh;
          font-family: 'Poppins', sans-serif;
          background: linear-gradient(135deg, #fff5f7 0%, #ffe4ec 50%, #fff0e5 100%);
          overflow-x: hidden;
        }

        a { text-decoration: none; }

        /* ── App shell ── */
        .app-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Top bar ── */
        .top-bar {
          position: sticky;
          top: 0;
          z-index: 200;
          width: 100%;
          height: 64px;
          background: rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 200, 220, 0.35);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
        }

        .brand-link {
          font-size: 1rem;
          font-weight: 700;
          color: #ff5d8f;
          letter-spacing: 0.2px;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .brand-heart {
          font-size: 18px;
          line-height: 1;
        }

        .top-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .top-icon-btn {
          width: 38px;
          height: 38px;
          border: none;
          border-radius: 12px;
          background: rgba(255, 111, 145, 0.08);
          color: #ff6f91;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.18s ease;
          text-decoration: none;
        }

        .top-icon-btn:hover,
        .top-icon-btn:active {
          background: rgba(255, 111, 145, 0.18);
        }

        /* ── Main content ── */
        .main-content {
          flex: 1;
          padding: 20px;
          /* Reserve space for bottom nav when it's visible */
          padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px) + 48px);
        }

        .main-content.no-nav {
          padding-bottom: 20px;
        }

        /* ── Bottom nav ── */
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 200;

          height: calc(64px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);

          background: rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-top: 1px solid rgba(255, 200, 220, 0.4);

          display: flex;
          align-items: flex-start;
          justify-content: space-around;
        }

        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 14px 4px 8px;
          color: #bbb;
          transition: color 0.18s ease;
          min-width: 0;
          text-decoration: none;
          -webkit-user-select: none;
          user-select: none;
        }

        .nav-item:active {
          opacity: 0.7;
        }

        .nav-item.active {
          color: #ff5d8f;
        }

        .nav-item.active .nav-icon {
          filter: drop-shadow(0 0 6px rgba(255, 111, 145, 0.35));
        }

        .nav-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 56px;
        }

        /* ── iPad (portrait 768px) ── */
        @media (min-width: 768px) {
          .top-bar {
            height: 68px;
            padding: 0 28px;
          }

          .brand-link {
            font-size: 1.1rem;
          }

          .brand-heart {
            font-size: 20px;
          }

          .main-content {
            padding: 28px 32px;
            padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px) + 48px);
          }

          .main-content.no-nav {
            padding-bottom: 28px;
          }

          .bottom-nav {
            height: calc(72px + env(safe-area-inset-bottom, 0px));
          }

          .nav-item {
            gap: 5px;
            padding: 16px 6px 10px;
          }

          .nav-label {
            font-size: 11px;
            max-width: 80px;
          }
        }

        /* ── iPad landscape / large tablet (1024px+) ── */
        @media (min-width: 1024px) {
          .top-bar {
            padding: 0 40px;
          }

          .main-content {
            max-width: 1100px;
            margin: 0 auto;
            padding: 32px 40px;
            padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px) + 32px);
          }

          .main-content.no-nav {
            padding-bottom: 32px;
          }

          .bottom-nav {
            /* Centered pill nav for larger screens */
            left: 50%;
            transform: translateX(-50%);
            width: min(520px, 90vw);
            border-radius: 999px 999px 0 0;
            border-left: 1px solid rgba(255, 200, 220, 0.4);
            border-right: 1px solid rgba(255, 200, 220, 0.4);
            padding: 0 16px;
          }

          .nav-item {
            padding: 14px 8px 8px;
          }
        }
      `}</style>

      <div className="app-shell">
        {/* TOP BAR */}
        <header className="top-bar">
          <Link to="/" className="brand-link">
            <span className="brand-heart">💖</span>
            MedTech Intern
          </Link>

          {user && (
            <div className="top-actions">
              <Link to="/profile" className="top-icon-btn" title="Profile">
                <User size={18} />
              </Link>
              <button
                type="button"
                className="top-icon-btn"
                onClick={signOut}
                title="Log out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </header>

        {/* MAIN CONTENT */}
        <main className={`main-content ${isAuthPage || !user ? 'no-nav' : ''}`}>
          {children}
        </main>

        {/* BOTTOM NAV — only shown for logged-in, non-auth pages */}
        {user && !isAuthPage && <BottomNav />}
      </div>
    </>
  );
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
      <Routes>
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/rotations" element={<ProtectedRoute><RotationGuide /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><DailyReportTracker /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute><ShiftPlanner /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><NotesSection /></ProtectedRoute>} />
      </Routes>
    </AppLayout>
  );
}