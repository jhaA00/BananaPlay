import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner } from '../components/Loader.jsx';

const OUTCOME_LABEL = {
  won: 'Signal sent',
  lost: 'Signal lost',
  abandoned: 'Abandoned',
};

const OUTCOME_CLASS = {
  won: 'is-completed',
  lost: 'is-locked',
  abandoned: 'is-available',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function History() {
  const { signOut } = useAuth();
  const [runs, setRuns] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await api('/scores/history');
      setRuns(data.runs);
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        return;
      }
      setError(requestError.message);
    }
  }, [signOut]);

  useEffect(() => {
    load();
  }, [load]);

  const played = runs?.length ?? 0;
  const victories = runs?.filter((run) => run.outcome === 'won').length ?? 0;
  const best = runs?.reduce((max, run) => Math.max(max, run.score), 0) ?? 0;

  return (
    <div className="ls-page">
      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">Survivor archive</p>
          <h1>Run history</h1>
          <p className="ls-page-sub">
            Every finished run is preserved — victories, losses and abandoned attempts. Scores and
            mission progress are recorded by the server.
          </p>
        </div>
        <Link to="/dashboard" className="ls-btn ls-btn-ghost">
          Dashboard
        </Link>
      </header>

      {error && (
        <div className="ls-alert is-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ls-link-btn" onClick={load}>
            Retry
          </button>
        </div>
      )}

      {runs === null ? (
        <div className="ls-loading-panel">
          <Spinner /> <span>Reading the archive…</span>
        </div>
      ) : (
        <>
          <section className="ls-stat-strip">
            <div>
              <span>Runs played</span>
              <strong>{played}</strong>
            </div>
            <div>
              <span>Signals sent</span>
              <strong>{victories}</strong>
            </div>
            <div>
              <span>Best run</span>
              <strong>{best}</strong>
            </div>
          </section>

          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Recent runs</p>
                <h2>Field records</h2>
              </div>
            </div>

            {played === 0 ? (
              <div className="ls-empty-panel-inline">
                <p>No finished runs yet. Start a run from the dashboard to write the first entry.</p>
              </div>
            ) : (
              <div className="ls-table-scroll">
                <table className="ls-table">
                  <thead>
                    <tr>
                      <th scope="col">Run</th>
                      <th scope="col">Outcome</th>
                      <th scope="col">Score</th>
                      <th scope="col">Missions</th>
                      <th scope="col">Solved</th>
                      <th scope="col">Hints</th>
                      <th scope="col">Finished</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((run) => (
                      <tr key={run.id}>
                        <td className="ls-table-rank">#{run.id}</td>
                        <td>
                          <span className={`ls-chip ${OUTCOME_CLASS[run.outcome] ?? 'is-available'}`}>
                            {OUTCOME_LABEL[run.outcome] ?? run.outcome ?? 'Finished'}
                          </span>
                        </td>
                        <td className="ls-table-score">{run.score}</td>
                        <td>{run.missionsCompleted}/5</td>
                        <td>{run.correctAnswers}</td>
                        <td>{run.hintsUsed}</td>
                        <td className="ls-table-date">{formatDate(run.finishedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
