import Brand from './Brand';
import { navigation } from './navigation';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Heart, Settings2, LogOut, Menu, X, ArrowUpRight, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { ThemeToggle } from '../../theme/ThemeProvider';
import { isDemoMode, exitDemo } from '../../lib/demo';
import GlobalSearch from '../GlobalSearch';
import Dialog from '../ui/Dialog';
import Hamster from '../../assets/Hamster.webp';

function Navigation({ onNavigate }) {
  return (
    <nav className="workspace-nav" aria-label="Main navigation">
      {navigation.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          className={({ isActive }) => 'workspace-nav-link' + (isActive ? ' active' : '')}
        >
          <Icon size={19} />
          <span>{label}</span>
          <ChevronRight size={14} className="nav-chevron" />
        </NavLink>
      ))}
    </nav>
  );
}
export default function AppLayout({ children }) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [error, setError] = useState('');
  const shellFree = ['/landing', '/login', '/signup'].includes(location.pathname);
  const demo = isDemoMode();
  const name = profile?.full_name?.trim() || 'Your profile';
  const initial = name[0].toUpperCase();
  const page =
    navigation.find((item) => item.to === location.pathname)?.label ||
    {
      '/profile': 'Your profile',
      '/about': 'The story behind Mate',
      '/ai-chat': 'Pip, your study buddy',
    }[location.pathname] ||
    'MedTech Mate';
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => setKeyboardOpen(viewport.height / window.innerHeight < 0.75);
    viewport.addEventListener('resize', update);
    return () => viewport.removeEventListener('resize', update);
  }, []);
  async function logout() {
    try {
      await signOut();
    } catch (err) {
      setError(err.message);
    }
  }
  if (shellFree) return <>{children}</>;
  return (
    <div className={'workspace-shell' + (keyboardOpen ? ' keyboard-open' : '')}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="workspace-sidebar">
        <Brand />
        <p className="nav-eyebrow">YOUR WORKSPACE</p>
        <Navigation />
        <Link to="/ai-chat" className="pip-sidebar">
          <img src={Hamster} alt="" />
          <span>
            <strong>A little help from Pip</strong>
            <small>Your friendly study buddy</small>
          </span>
          <ArrowUpRight size={16} />
        </Link>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Heart size={16} />
            <p>
              Made with love.
              <br />
              <span>For every little step forward.</span>
            </p>
          </div>
          <NavLink to="/about" className="workspace-nav-link">
            <Heart size={18} />
            Behind the app
          </NavLink>
          <NavLink to="/profile" className="workspace-nav-link">
            <Settings2 size={18} />
            Profile & preferences
          </NavLink>
          {user && (
            <button className="workspace-nav-link" onClick={logout}>
              <LogOut size={18} />
              {demo ? 'Leave demo' : 'Log out'}
            </button>
          )}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="workspace-topbar">
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="workspace-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="topbar-actions">
            {user && <GlobalSearch />}
            <ThemeToggle />
            {user && (
              <Link className="profile-avatar" to="/profile" aria-label="Open your profile">
                {profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : initial}
              </Link>
            )}
            <button
              className="icon-button tablet-menu"
              aria-label="Open navigation"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
          </div>
        </header>
        {demo && (
          <div className="demo-notice">
            <span>
              <span className="status-dot" />
              Demo workspace · Sample data, saved on this device
            </span>
            <button onClick={exitDemo}>
              Exit demo <ArrowUpRight size={13} />
            </button>
          </div>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <main
          id="main-content"
          className={'workspace-main' + (location.pathname === '/ai-chat' ? ' chat-page' : '')}
          tabIndex={-1}
        >
          <div className="page-enter" key={location.pathname}>
            {children}
          </div>
        </main>
        <footer className="workspace-footer">
          <span>A little more confident, every day.</span>
          <Link to="/about">
            Made with love <Heart size={12} />
          </Link>
        </footer>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Quick navigation">
        {[navigation[0], navigation[2], navigation[3], navigation[4]].map(({ to, icon: Icon }) => (
          <NavLink
            to={to}
            end={to === '/'}
            key={to}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <Icon size={20} />
            <span>
              {to === '/'
                ? 'Home'
                : to === '/reports'
                  ? 'Logbook'
                  : to === '/shifts'
                    ? 'Schedule'
                    : 'Notes'}
            </span>
          </NavLink>
        ))}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="More navigation"
          aria-expanded={menuOpen}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
      {menuOpen && (
        <Dialog
          className="navigation-overlay"
          onClose={() => setMenuOpen(false)}
          label="Workspace navigation"
        >
          <div className="navigation-sheet">
            <div className="sheet-heading">
              <h2>Your workspace</h2>
              <button
                className="icon-button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X size={20} />
              </button>
            </div>
            <Navigation onNavigate={() => setMenuOpen(false)} />
            <div className="navigation-extras">
              {[
                ['/ai-chat', 'Chat with Pip'],
                ['/profile', 'Profile & preferences'],
                ['/about', 'The story behind Mate'],
              ].map(([to, label]) => (
                <Link key={to} to={to} onClick={() => setMenuOpen(false)}>
                  {label}
                  <ArrowUpRight size={16} />
                </Link>
              ))}
              {user && (
                <button onClick={logout}>
                  <LogOut size={16} />
                  {demo ? 'Leave demo' : 'Log out'}
                </button>
              )}
            </div>
            <p className="sheet-footnote">You belong here. Keep going. ♡</p>
          </div>
        </Dialog>
      )}
    </div>
  );
}
