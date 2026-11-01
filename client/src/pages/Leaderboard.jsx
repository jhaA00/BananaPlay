import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { Spinner } from '../components/Loader.jsx';
import { rankForScore } from '../game/ranks.js';

export default function Leaderboard() {
  const { user, signOut } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api('/scores/leaderboard'));
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

  const board = data?.leaderboard ?? [];

  return (
    <div className="ls-page">
      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">Survivor network</p>
          <h1>Leaderboard</h1>
          <p className="ls-page-sub">
            Every survivor who has completed at least one run is ranked by lifetime score, then
            missions completed and best single run.
          </p>
        </div>
        <span className="ls-chip is-available">
          {data?.totalPlayers ?? 0} ranked survivor{(data?.totalPlayers ?? 0) === 1 ? '' : 's'}
        </span>
      </header>

      {error && (
        <div className="ls-alert is-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ls-link-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="ls-loading-panel">
          <Spinner /> <span>Scanning the survivor network…</span>
        </div>
      ) : (
        <>
          {data?.me && (
            <section className="ls-panel ls-me-panel">
              <div>
                <p className="ls-kicker">Your position</p>
                <h2>
                  #{data.me.rank} · {data.me.username}
                </h2>
              </div>
              <div className="ls-me-stats">
                <div>
                  <span>Lifetime score</span>
                  <strong>{data.me.totalScore}</strong>
                </div>
                <div>
                  <span>Missions</span>
                  <strong>{data.me.missionsCompleted}</strong>
                </div>
              </div>
              <RankBadge rank={rankForScore(data.me.totalScore)} />
            </section>
          )}

          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Top survivors</p>
                <h2>Global ranking</h2>
              </div>
            </div>

            <div className="ls-table-scroll">
              <table className="ls-table">
                <thead>
                  <tr>
                    <th scope="col">#</th>
                    <th scope="col">Survivor</th>
                    <th scope="col">Rank</th>
                    <th scope="col">Lifetime</th>
                    <th scope="col">Best run</th>
                    <th scope="col">Missions</th>
                  </tr>
                </thead>
                <tbody>
                  {board.map((entry) => (
                    <tr key={entry.id} className={entry.id === user?.id ? 'is-you' : ''}>
                      <td className="ls-table-rank">{entry.rank}</td>
                      <td>
                        <span className="ls-player-cell">
                          <span className="ls-avatar" aria-hidden="true">
                            {entry.username.slice(0, 1).toUpperCase()}
                          </span>
                          {entry.username}
                          {entry.id === user?.id && <span className="ls-you-tag">you</span>}
                        </span>
                      </td>
                      <td>
                        <RankBadge rank={rankForScore(entry.totalScore)} subtle />
                      </td>
                      <td className="ls-table-score">{entry.totalScore}</td>
                      <td>{entry.bestScore}</td>
                      <td>{entry.missionsCompleted}</td>
                    </tr>
                  ))}
                  {!board.length && (
                    <tr>
                      <td colSpan={6} className="ls-table-empty">
                        No finished runs yet. Complete a run to claim the first spot.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
