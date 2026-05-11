import { useState } from 'react';
import {
  Link,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

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
  Menu,
  X,
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
    <section
      style={{
        padding: '40px',
        background: 'white',
        borderRadius: '24px',
        maxWidth: '700px',
        margin: '40px auto',
        boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
      }}
    >
      <h1
        style={{
          marginBottom: '16px',
          color: '#ff5d8f',
        }}
      >
        Set up Supabase first
      </h1>

      <p style={{ lineHeight: 1.7 }}>
        The app is running, but it needs your Supabase URL and anon key before
        login, signup, and dashboard data can work.
      </p>

      <ol
        style={{
          marginTop: '20px',
          lineHeight: 2,
        }}
      >
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
      <main
        style={{
          minHeight: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontSize: '18px',
          color: '#ff5d8f',
        }}
      >
        Loading session...
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

/* ─────────────────────────────────────────────
   NAV ITEMS
───────────────────────────────────────────── */
const NAV_ITEMS = [
  {
    to: '/',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    to: '/rotations',
    icon: Microscope,
    label: 'Rotations',
  },
  {
    to: '/reports',
    icon: ClipboardList,
    label: 'Daily Reports',
  },
  {
    to: '/shifts',
    icon: CalendarClock,
    label: 'Shifts',
  },
  {
    to: '/notes',
    icon: NotebookPen,
    label: 'Notes',
  },
];

/* ─────────────────────────────────────────────
   HAMBURGER MENU
───────────────────────────────────────────── */
function HamburgerMenu({ open, setOpen }) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <>
      {/* BACKDROP */}
      {open && (
        <div
          className="menu-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`side-menu ${open ? 'open' : ''}`}>
        <div className="menu-top">
          <h2>✨ Menu</h2>

          <button
            className="close-btn"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="menu-links">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const isActive =
              to === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(to);

            return (
              <Link
                key={to}
                to={to}
                className={`menu-link ${
                  isActive ? 'active' : ''
                }`}
                onClick={() => setOpen(false)}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}

          <div className="menu-divider" />

          <Link
            to="/profile"
            className="menu-link"
            onClick={() => setOpen(false)}
          >
            <User size={18} />
            Profile
          </Link>

          <button
            className="menu-link logout-btn"
            onClick={signOut}
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

/* ─────────────────────────────────────────────
   APP LAYOUT
───────────────────────────────────────────── */
function AppLayout({ children }) {
  const { user } = useAuth();

  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);

  const isAuthPage = ['/login', '/signup'].includes(
    location.pathname,
  );

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }

          html,
          body,
          #root {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100vh;
            font-family: 'Poppins', sans-serif;

            background:
              linear-gradient(
                135deg,
                #fff5f7 0%,
                #ffe4ec 50%,
                #fff0e5 100%
              );

            overflow-x: hidden;
          }

          a {
            text-decoration: none;
          }

          .app-shell {
            min-height: 100vh;
          }

          /* TOP BAR */

          .top-bar {
            position: sticky;
            top: 0;
            z-index: 300;

            height: 68px;

            display: flex;
            align-items: center;
            justify-content: space-between;

            padding: 0 20px;

            background: rgba(255,255,255,0.82);

            backdrop-filter: blur(16px);

            border-bottom:
              1px solid rgba(255,255,255,0.45);
          }

          .brand-link {
            display: flex;
            align-items: center;
            gap: 8px;

            font-weight: 700;
            font-size: 1rem;

            color: #ff5d8f;
          }

          .menu-toggle {
            width: 42px;
            height: 42px;

            border: none;

            border-radius: 14px;

            background:
              rgba(255,111,145,0.1);

            color: #ff5d8f;

            display: flex;
            align-items: center;
            justify-content: center;

            cursor: pointer;
          }

          /* MAIN */

          .main-content {
            padding: 22px;
          }

          /* BACKDROP */

          .menu-backdrop {
            position: fixed;
            inset: 0;

            background:
              rgba(0,0,0,0.3);

            z-index: 399;

            backdrop-filter: blur(4px);
          }

          /* SIDE MENU */

          .side-menu {
            position: fixed;

            top: 0;
            right: -320px;

            width: 290px;
            max-width: 90vw;

            height: 100vh;

            background:
              rgba(255,255,255,0.92);

            backdrop-filter: blur(20px);

            z-index: 400;

            padding: 24px 20px;

            transition: 0.28s ease;

            box-shadow:
              -10px 0 30px rgba(0,0,0,0.08);

            display: flex;
            flex-direction: column;
          }

          .side-menu.open {
            right: 0;
          }

          .menu-top {
            display: flex;
            align-items: center;
            justify-content: space-between;

            margin-bottom: 28px;
          }

          .menu-top h2 {
            margin: 0;
            color: #ff5d8f;
            font-size: 1.2rem;
          }

          .close-btn {
            width: 38px;
            height: 38px;

            border: none;

            border-radius: 12px;

            background: #fff0f4;

            color: #ff5d8f;

            display: flex;
            align-items: center;
            justify-content: center;

            cursor: pointer;
          }

          .menu-links {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }

          .menu-link {
            width: 100%;

            border: none;

            background: transparent;

            padding: 15px 16px;

            border-radius: 18px;

            display: flex;
            align-items: center;
            gap: 12px;

            font-size: 15px;
            font-weight: 500;

            color: #666;

            cursor: pointer;

            transition: 0.2s ease;
          }

          .menu-link:hover {
            background: #fff;

            color: #ff5d8f;

            transform: translateY(-1px);
          }

          .menu-link.active {
            background:
              linear-gradient(
                135deg,
                #ff8fb1,
                #ff6f91
              );

            color: white;

            box-shadow:
              0 8px 22px rgba(255,111,145,0.22);
          }

          .menu-divider {
            height: 1px;

            background: #ffd6e1;

            margin: 10px 0;
          }

          .logout-btn {
            text-align: left;
          }

          /* TABLET */

          @media (min-width: 768px) {
            .top-bar {
              padding: 0 30px;
            }

            .main-content {
              padding: 30px;
            }
          }

          /* DESKTOP */

          @media (min-width: 1024px) {
            .main-content {
              max-width: 1180px;
              margin: 0 auto;
            }
          }
        `}
      </style>

      <div className="app-shell">
        {/* TOP BAR */}
        <header className="top-bar">
          <Link to="/" className="brand-link">
            💖 MedTech Intern
          </Link>

          {user && !isAuthPage && (
            <button
              className="menu-toggle"
              onClick={() =>
                setMenuOpen(true)
              }
            >
              <Menu size={20} />
            </button>
          )}
        </header>

        {/* MENU */}
        {user && !isAuthPage && (
          <HamburgerMenu
            open={menuOpen}
            setOpen={setMenuOpen}
          />
        )}

        {/* CONTENT */}
        <main className="main-content">
          {children}
        </main>
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
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/signup"
          element={<Signup />}
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rotations"
          element={
            <ProtectedRoute>
              <RotationGuide />
            </ProtectedRoute>
          }
        />

        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <DailyReportTracker />
            </ProtectedRoute>
          }
        />

        <Route
          path="/shifts"
          element={
            <ProtectedRoute>
              <ShiftPlanner />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notes"
          element={
            <ProtectedRoute>
              <NotesSection />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AppLayout>
  );
}