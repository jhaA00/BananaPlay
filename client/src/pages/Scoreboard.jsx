import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

function rankLabel(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function formatRunDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function Scoreboard() {
  const { user, signOut } = useAuth();
  const [board, setBoard] = useState(null);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [leaderboardData, historyData] = await Promise.all([
        api('/scores/leaderboard'),
        api('/scores/history'),
      ]);
      setBoard(leaderboardData);
      setRuns(historyData.runs);
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

  return (
    <div className="scoreboard-page">
      <div className="board-head">
        <div>
          <p className="eyebrow">Hall of fame</p>
          <h1>Top banana</h1>
          <p className="page-sub">
            The sharpest peelers in the bunch. Rankings are based on your best single run.
          </p>
        </div>
        <Link to="/play" className="btn btn-primary btn-inline">
          Play a run
        </Link>
      </div>

      {error && (
        <div className="alert alert-error retry-alert" role="alert">
          <span>{error}</span>
          <button type="button" className="link-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="board-grid">
          <section className="panel leaderboard-panel">
            <div className="skeleton-block skeleton-title" />
            <div className="skeleton-block skeleton-row" />
            <div className="skeleton-block skeleton-row" />
            <div className="skeleton-block skeleton-row" />
            <div className="skeleton-block skeleton-row" />
            <div className="skeleton-block skeleton-row" />
          </section>
          <div className="board-side">
            <section className="panel">
              <div className="skeleton-block skeleton-title" />
              <div className="skeleton-block skeleton-row" />
            </section>
          </div>
        </div>
      ) : (
        <div className="board-grid">
          <section className="panel leaderboard-panel" aria-label="Leaderboard">
            <div className="panel-head">
              <h2>Leaderboard</h2>
              <span className="muted">
                {board?.totalPlayers ?? 0} {(board?.totalPlayers ?? 0) === 1 ? 'player' : 'players'}
              </span>
            </div>

            {board?.leaderboard.length ? (
              <div className="table-scroll">
                <table className="score-table">
                  <thead>
                    <tr>
                      <th scope="col">Rank</th>
                      <th scope="col">Player</th>
                      <th scope="col">Best score</th>
                      <th scope="col">Best streak</th>
                      <th scope="col" className="hide-sm">
                        Runs
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {board.leaderboard.map((entry) => (
                      <tr key={entry.id} className={entry.id === user?.id ? 'is-me' : ''}>
                        <td>
                          <span className={`rank-badge rank-${entry.rank}`}>
                            {rankLabel(entry.rank)}
                          </span>
                        </td>
                        <td>
                          <div className="player-cell">
                            <span className="mini-avatar" aria-hidden="true">
                              {entry.username.slice(0, 1).toUpperCase()}
                            </span>
                            <span>{entry.username}</span>
                            {entry.id === user?.id && <span className="you-tag">you</span>}
                          </div>
                        </td>
                        <td className="score-cell">{entry.bestScore}</td>
                        <td>🔥 {entry.bestStreak}</td>
                        <td className="hide-sm muted">{entry.gamesPlayed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-emoji" aria-hidden="true">
                  🍌
                </div>
                <h3>No scores yet</h3>
                <p>Be the first banana on the board.</p>
                <Link to="/play" className="btn btn-primary btn-inline">
                  Play now
                </Link>
              </div>
            )}
          </section>

          <div className="board-side">
            <section className="panel rank-panel" aria-label="Your rank">
              <p className="eyebrow">Your position</p>
              {board?.me ? (
                <>
                  <div className="rank-hero">{rankLabel(board.me.rank)}</div>
                  <p className="rank-sub">
                    of {board.totalPlayers} {board.totalPlayers === 1 ? 'player' : 'players'}
                  </p>
                  <div className="rank-stats">
                    <div>
                      <span>Best score</span>
                      <strong>{board.me.bestScore}</strong>
                    </div>
                    <div>
                      <span>Best streak</span>
                      <strong>🔥 {board.me.bestStreak}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <div className="rank-empty">
                  <div className="rank-hero is-muted">—</div>
                  <p>Finish a run to enter the leaderboard.</p>
                  <Link to="/play" className="btn btn-ghost btn-block btn-small">
                    Start a run
                  </Link>
                </div>
              )}
            </section>

            <section className="panel recent-panel" aria-label="Recent runs">
              <div className="panel-head">
                <h2>Recent runs</h2>
              </div>

              {runs.length ? (
                <ul className="run-list">
                  {runs.map((run) => (
                    <li key={run.id} className="run-row">
                      <span className="run-score">{run.score}</span>
                      <div className="run-meta">
                        <strong>
                          {run.correctAnswers} solved · 🔥 {run.maxStreak}
                        </strong>
                        <span>{formatRunDate(run.finishedAt)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="empty-state compact">
                  <div className="empty-emoji" aria-hidden="true">
                    🎮
                  </div>
                  <h3>No runs yet</h3>
                  <p>Your finished games will show up here.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
