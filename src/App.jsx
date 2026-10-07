import { Component, lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/useAuth';
import AppLayout from './components/layout/AppLayout';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Profile = lazy(() => import('./pages/Profile'));
const About = lazy(() => import('./components/About'));
const RotationGuide = lazy(() => import('./components/RotationGuide'));
const Reports = lazy(() => import('./components/QuotaTracker'));
const ShiftPlanner = lazy(() => import('./components/ShiftPlanner'));
const Notes = lazy(() => import('./components/NotesSection'));
const Documents = lazy(() => import('./components/DocumentsPage'));
const AIChatbot = lazy(() => import('./components/AiChatbot'));
function Loading() {
  return (
    <div className="route-loading" role="status">
      <span className="loading-orbit" />
      <p>Getting your workspace ready…</p>
    </div>
  );
}
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/landing" replace />;
  return children;
}
class AppErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('App error', error, info);
  }
  render() {
    if (this.state.error)
      return (
        <div className="error-state">
          <h1>Let’s try that again.</h1>
          <p>Your workspace couldn’t load. Refresh the page to continue.</p>
          <button className="button primary" onClick={() => window.location.reload()}>
            Refresh workspace
          </button>
        </div>
      );
    return this.props.children;
  }
}
export default function App() {
  return (
    <AppErrorBoundary>
      <AppLayout>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/about" element={<About />} />
            {[
              ['/', Dashboard],
              ['/rotations', RotationGuide],
              ['/reports', Reports],
              ['/shifts', ShiftPlanner],
              ['/notes', Notes],
              ['/documents', Documents],
              ['/profile', Profile],
              ['/ai-chat', AIChatbot],
            ].map(([path, Page]) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedRoute>
                    <Page />
                  </ProtectedRoute>
                }
              />
            ))}
            <Route
              path="*"
              element={
                <div className="error-state">
                  <p className="eyebrow">404 · A little detour</p>
                  <h1>This page wandered off.</h1>
                  <p>Let’s get you back to your workspace.</p>
                  <a className="button primary" href="/">
                    Back home
                  </a>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </AppLayout>
    </AppErrorBoundary>
  );
}
