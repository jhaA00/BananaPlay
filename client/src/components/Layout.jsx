import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Brand from './Brand.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/missions', label: 'Missions' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/history', label: 'History' },
  { to: '/profile', label: 'Profile' },
];

export default function Layout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="ls-shell">
      <header className="ls-header">
        <div className="ls-header-inner">
          <Brand to="/dashboard" />

          <nav className="ls-nav" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {user && (
            <div className="ls-user">
              <span className="ls-avatar" aria-hidden="true">
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="ls-user-name">{user.username}</span>
              <button
                type="button"
                className="ls-icon-btn"
                onClick={handleSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                  <path
                    d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l5-5-5-5M15 12H3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="ls-main">
        <Outlet />
      </main>

      <footer className="ls-footer">
        <span>The Last Signal · College project</span>
        <span>
          Decryption puzzles by{' '}
          <a href="https://marcconrad.com/uob/banana/" target="_blank" rel="noreferrer">
            UOB Banana
          </a>
        </span>
      </footer>
    </div>
  );
}
