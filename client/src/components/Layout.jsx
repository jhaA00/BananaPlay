import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Brand from './Brand.jsx';

export default function Layout() {
  const { user, signOut } = useAuth();

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <Brand />

          <nav className="main-nav" aria-label="Main navigation">
            <NavLink to="/play">Play</NavLink>
            <NavLink to="/scoreboard">Scoreboard</NavLink>
          </nav>

          {user && (
            <div className="header-user">
              <div className="user-chip">
                <span className="avatar" aria-hidden="true">
                  {user.username.slice(0, 1).toUpperCase()}
                </span>
                <span className="user-chip-name">{user.username}</span>
                <span className="user-chip-score">🏆 {user.bestScore}</span>
              </div>
              <button type="button" className="icon-btn" onClick={signOut} aria-label="Sign out" title="Sign out">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none">
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

      <main className="page">
        <Outlet />
      </main>

      <footer className="app-footer">
        <span>🍌 Banana Puzzle · College project</span>
        <span>
          Puzzles by{' '}
          <a href="https://marcconrad.com/uob/banana/" target="_blank" rel="noreferrer">
            UOB Banana
          </a>
        </span>
      </footer>
    </div>
  );
}
