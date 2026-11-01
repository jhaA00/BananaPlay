import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import AchievementBadge from '../components/AchievementBadge.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { Spinner } from '../components/Loader.jsx';
import { ACHIEVEMENTS } from '../game/achievements.js';

export default function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [gameState, leaderboard] = await Promise.all([
        api('/game/state'),
        api('/scores/leaderboard'),
      ]);
      setState(gameState);
      setBoard(leaderboard);
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    load();
  }, [load]);

  const profile = state?.user ?? user;
  const rank = state?.rank ?? null;
  const earned = state?.achievements ?? [];
  const earnedKeys = new Set(earned.map((item) => item.key));
  const rankPercent =
    rank?.nextRank && state
      ? Math.max(
          4,
          Math.min(
            100,
            ((profile.totalScore - rank.minScore) / (rank.nextRank.minScore - rank.minScore)) * 100,
          ),
        )
      : 100;

  return (
    <div className="ls-page">
      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">Survivor file</p>
          <h1>{profile?.username}</h1>
          <p className="ls-page-sub">
            Member since {new Date(profile?.createdAt ?? Date.now()).toLocaleDateString()} ·{' '}
            {profile?.email}
          </p>
        </div>
        <div className="ls-page-head-actions">
          {rank && <RankBadge rank={rank} />}
          <button
            type="button"
            className="ls-btn ls-btn-ghost"
            onClick={() => navigate('/dashboard')}
          >
            Dashboard
          </button>
        </div>
      </header>

      {error && (
        <div className="ls-alert is-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ls-link-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading && !state ? (
        <div className="ls-loading-panel">
          <Spinner /> <span>Opening survivor file…</span>
        </div>
      ) : (
        <div className="ls-dashboard-grid">
          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Career totals</p>
                <h2>Survival record</h2>
              </div>
            </div>
            <div className="ls-stat-grid">
              <div>
                <span>Lifetime score</span>
                <strong>{profile?.totalScore ?? 0}</strong>
              </div>
              <div>
                <span>Best run</span>
                <strong>{profile?.bestScore ?? 0}</strong>
              </div>
              <div>
                <span>Runs played</span>
                <strong>{profile?.gamesPlayed ?? 0}</strong>
              </div>
              <div>
                <span>Best streak</span>
                <strong>{profile?.bestStreak ?? 0}</strong>
              </div>
              <div>
                <span>Global rank</span>
                <strong>{board?.me ? `#${board.me.rank}` : 'Unranked'}</strong>
              </div>
              <div>
                <span>Achievements</span>
                <strong>
                  {earned.length}/{ACHIEVEMENTS.length}
                </strong>
              </div>
            </div>
          </section>

          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Survivor rank</p>
                <h2>{rank?.label ?? 'New Survivor'}</h2>
              </div>
            </div>
            {rank ? (
              <div className="ls-rank-progress">
                <span className="ls-rank-total">{rank.minScore} pts threshold</span>
                {rank.nextRank ? (
                  <>
                    <p>
                      {rank.pointsToNext} points to <strong>{rank.nextRank.label}</strong>
                    </p>
                    <div className="ls-rank-track">
                      <span style={{ width: `${rankPercent}%` }} />
                    </div>
                  </>
                ) : (
                  <p>Highest survival rank reached. The signal is yours.</p>
                )}
              </div>
            ) : (
              <p>Rank data is unavailable right now.</p>
            )}
            <Link to="/leaderboard" className="ls-btn ls-btn-ghost ls-btn-block">
              Compare against other survivors
            </Link>
          </section>

          <section className="ls-panel ls-achievements-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Badges</p>
                <h2>Achievements</h2>
              </div>
            </div>
            <ul className="ls-achievement-grid">
              {ACHIEVEMENTS.map((definition) => {
                const awarded = earned.find((item) => item.key === definition.key) ?? null;
                return (
                  <AchievementBadge
                    key={definition.key}
                    achievement={awarded ?? definition}
                    awarded={earnedKeys.has(definition.key)}
                  />
                );
              })}
            </ul>
          </section>

          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Archive</p>
                <h2>Recent runs</h2>
              </div>
              <Link to="/history" className="ls-link-btn">
                Full history
              </Link>
            </div>
            <p className="ls-empty-note">
              Your finished runs, scores and outcomes are stored in the survivor archive.
            </p>
            <button type="button" className="ls-btn ls-btn-ghost ls-btn-block" onClick={load}>
              Refresh profile
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
