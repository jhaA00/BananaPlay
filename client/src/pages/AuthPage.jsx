import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import Brand from '../components/Brand.jsx';
import { Spinner } from '../components/Loader.jsx';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;

export default function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    username: '',
    email: '',
    identifier: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const password = form.password;
    if (isRegister) {
      if (!USERNAME_PATTERN.test(form.username.trim())) {
        setError('Username must be 3–20 characters (letters, numbers or underscores).');
        return;
      }
      if (!EMAIL_PATTERN.test(form.email.trim())) {
        setError('Please enter a valid email address.');
        return;
      }
    } else if (!form.identifier.trim()) {
      setError('Enter your email or username.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await signUp({
          username: form.username.trim(),
          email: form.email.trim(),
          password,
        });
      } else {
        await signIn({ identifier: form.identifier.trim(), password });
      }
      navigate(location.state?.from || '/play', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-showcase">
        <div className="showcase-top">
          <Brand to={isRegister ? '/register' : '/login'} />
        </div>

        <div className="showcase-content">
          <p className="eyebrow">The daily brain snack</p>
          <h1>
            Crack the code.
            <br />
            <span>Climb the board.</span>
          </h1>
          <p className="showcase-lead">
            Every puzzle hides one missing digit. Solve it, protect your three lives and see how
            far up the leaderboard you can climb.
          </p>

          <ul className="showcase-points">
            <li>
              <span className="point-icon" aria-hidden="true">
                🧩
              </span>
              <div>
                <strong>Fresh puzzles every round</strong>
                <p>Real missing-number challenges, served hot from the UOB Banana API.</p>
              </div>
            </li>
            <li>
              <span className="point-icon" aria-hidden="true">
                💡
              </span>
              <div>
                <strong>Stuck? Take a hint</strong>
                <p>Narrow down the answer, but keep in mind that a hint halves the points.</p>
              </div>
            </li>
            <li>
              <span className="point-icon" aria-hidden="true">
                🏆
              </span>
              <div>
                <strong>Chase the top spot</strong>
                <p>Your best run is saved to a global scoreboard for everyone to see.</p>
              </div>
            </li>
          </ul>
        </div>

        <div className="showcase-art" aria-hidden="true">
          <div className="art-puzzle">
            <span className="art-label">Find the missing number</span>
            <div className="art-equation">
              <span>🍌</span>
              <span className="art-question">?</span>
              <span>🍌</span>
            </div>
            <span className="art-pill">+10 points</span>
          </div>
          <span className="art-chip art-chip-one">3 lives</span>
          <span className="art-chip art-chip-two">🔥 streak</span>
        </div>

        <p className="showcase-foot">React · Express · PostgreSQL</p>
      </aside>

      <main className="auth-form-side">
        <div className="auth-card">
          <div className="auth-mobile-brand">
            <Brand to={isRegister ? '/register' : '/login'} />
          </div>

          <p className="eyebrow">{isRegister ? 'Join the bunch' : 'Welcome back'}</p>
          <h2>{isRegister ? 'Create your account' : 'Sign in to play'}</h2>
          <p className="auth-sub">
            {isRegister
              ? 'Free to play. Three lives, endless puzzles.'
              : 'Your puzzles and best score are waiting for you.'}
          </p>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {isRegister && (
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="e.g. banana_boss"
                  value={form.username}
                  onChange={update('username')}
                  maxLength={20}
                  required
                />
                <span className="field-hint">3–20 characters, letters, numbers or underscores.</span>
              </div>
            )}

            {isRegister ? (
              <div className="field">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update('email')}
                  required
                />
              </div>
            ) : (
              <div className="field">
                <label htmlFor="identifier">Email or username</label>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="you@example.com"
                  value={form.identifier}
                  onChange={update('identifier')}
                  required
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="password">Password</label>
              <div className="password-wrap">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  placeholder={isRegister ? 'At least 6 characters' : 'Your password'}
                  value={form.password}
                  onChange={update('password')}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? (
                <>
                  <Spinner /> {isRegister ? 'Creating account…' : 'Signing in…'}
                </>
              ) : isRegister ? (
                'Create account'
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account? ' : 'New here? '}
            <Link to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign in' : 'Create an account'}
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
