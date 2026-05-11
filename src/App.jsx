import { Link, Navigate, Route, Routes } from 'react-router-dom';
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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppLayout({ children }) {
  const { user, signOut } = useAuth();

  return (
    <>
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          html,
          body,
          #root {
            margin: 0;
            padding: 0;
            width: 100%;
            min-height: 100vh;
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(
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
            display: flex;
            flex-direction: column;
          }

          .top-bar {
            width: 100%;
            height: 78px;
            background: rgba(255,255,255,0.85);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(255,255,255,0.4);

            display: flex;
            align-items: center;
            justify-content: space-between;

            padding: 0 32px;

            position: sticky;
            top: 0;
            z-index: 100;
          }

          .brand-link {
            font-size: 1.2rem;
            font-weight: 700;
            color: #ff5d8f;
            letter-spacing: 0.2px;
          }

          .top-nav {
            display: flex;
            align-items: center;
            gap: 18px;
          }

          .top-nav a {
            color: #666;
            font-weight: 500;
            transition: 0.2s ease;
          }

          .top-nav a:hover {
            color: #ff5d8f;
          }

          .top-nav button {
            border: none;
            background: linear-gradient(
              135deg,
              #ff8fb1,
              #ff6f91
            );
            color: white;
            padding: 10px 18px;
            border-radius: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: 0.2s ease;
          }

          .top-nav button:hover {
            transform: translateY(-1px);
          }

          .content-layout {
            flex: 1;
            display: flex;
          }

          .sidebar {
            width: 240px;
            background: rgba(255,255,255,0.65);
            backdrop-filter: blur(14px);
            border-right: 1px solid rgba(255,255,255,0.4);

            padding: 28px 20px;

            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .sidebar a,
          .sidebar span {
            padding: 14px 16px;
            border-radius: 16px;
            color: #666;
            font-weight: 500;
            transition: 0.2s ease;
            cursor: pointer;
          }

          .sidebar a:hover,
          .sidebar span:hover {
            background: #fff;
            color: #ff5d8f;
            box-shadow: 0 6px 18px rgba(255,111,145,0.12);
          }

          .main-content {
            flex: 1;
            padding: 32px;
          }

          /* iPhone */
          @media (max-width: 768px) {
            .top-bar {
              height: auto;
              flex-direction: column;
              gap: 14px;
              padding: 18px;
            }

            .brand-link {
              font-size: 1rem;
              text-align: center;
            }

            .content-layout {
              flex-direction: column;
            }

            .sidebar {
              width: 100%;
              flex-direction: row;
              overflow-x: auto;
              border-right: none;
              border-bottom: 1px solid rgba(255,255,255,0.4);
              padding: 14px;
            }

            .sidebar a,
            .sidebar span {
              white-space: nowrap;
              min-width: fit-content;
            }

            .main-content {
              padding: 18px;
            }
          }

          /* iPad */
          @media (min-width: 769px) and (max-width: 1024px) {
            .sidebar {
              width: 210px;
            }

            .main-content {
              padding: 24px;
            }
          }
        `}
      </style>

      <div className="app-shell">
        {/* HEADER */}
        <header className="top-bar">
          <Link to="/" className="brand-link">
            💖 MedTech Intern Companion
          </Link>

          <nav className="top-nav">
            {user ? (
              <>
                <Link to="/profile">Profile</Link>

                <button type="button" onClick={signOut}>
                  Log out
                </button>
              </>
            ) : (
              <>
                
              </>
            )}
          </nav>
        </header>

        {/* BODY */}
        <div className="content-layout">
          {user && (
            <aside className="sidebar">
              <Link to="/">🏠 Dashboard</Link>
              <Link to="/rotations">🩺 Rotations</Link>
              <Link to="/reports">📋 Daily Reports</Link>
              <Link to="/shifts">⏰ Shifts</Link>
              <Link to="/notes">📝 Notes</Link>
            </aside>
          )}

          <main className="main-content">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

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

        <Route path="/login" element={<Login />} />

        <Route path="/signup" element={<Signup />} />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/rotations" element={<ProtectedRoute><RotationGuide /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><DailyReportTracker /></ProtectedRoute>} />
        <Route path="/shifts" element={<ProtectedRoute><ShiftPlanner /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><NotesSection /></ProtectedRoute>} />
      </Routes>
    </AppLayout>
  );
}