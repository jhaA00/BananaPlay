import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { Spinner } from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';
import useGameState from '../hooks/useGameState.js';

const STATUS_LABEL = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  completed: 'Complete',
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { state, loading, error, reload } = useGameState();
  const [confirmNew, setConfirmNew] = useState(false);
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState('');

  const game = state?.game ?? null;
  const missions = state?.missions ?? [];
  const completed = missions.filter((mission) => mission.status === 'completed').length;
  const nextMission =
    missions.find((mission) => mission.status === 'in_progress') ??
    missions.find((mission) => mission.status === 'available');

  async function startNewRun() {
    setStarting(true);
    setActionError('');
    try {
      await api('/game/start', { method: 'POST', body: { mode: 'new' } });
      setConfirmNew(false);
      navigate('/missions');
    } catch (requestError) {
      setActionError(requestError.message);
      setStarting(false);
    }
  }

  function handleStartClick() {
    if (game) setConfirmNew(true);
    else startNewRun();
  }

  return (
    <div className="ls-page">
      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">Survivor dashboard</p>
          <h1>Welcome back, {user?.username}</h1>
          <p className="ls-page-sub">
            {game
              ? 'Your run is active. Continue where you left off or start again from the shelter.'
              : 'No active run. The shelter is sealed and the tower is still out there.'}
          </p>
        </div>
        {state?.rank && <RankBadge rank={state.rank} />}
      </header>

      {error && (
        <div className="ls-alert is-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ls-link-btn" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {(actionError || confirmNew) && actionError && (
        <div className="ls-alert is-error" role="alert">
          {actionError}
        </div>
      )}

      {loading && !state ? (
        <div className="ls-loading-panel">
          <Spinner /> <span>Reading shelter telemetry…</span>
        </div>
      ) : (
        <div className="ls-dashboard-grid">
          <section className="ls-panel ls-run-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Active run</p>
                <h2>{game ? 'Run in progress' : 'No active run'}</h2>
              </div>
              {game && <span className="ls-status-dot">Live</span>}
            </div>

            {game ? (
              <>
                <div className="ls-run-stats">
                  <div>
                    <span>Score</span>
                    <strong>{game.score}</strong>
                  </div>
                  <div>
                    <span>Lives</span>
                    <strong className="ls-lives">
                      {[0, 1, 2].map((index) => (
                        <span key={index} className={index < game.lives ? 'is-full' : ''}>
                          ♥
                        </span>
                      ))}
                    </strong>
                  </div>
                  <div>
                    <span>Missions</span>
                    <strong>
                      {completed}
                      <small>/5</small>
                    </strong>
                  </div>
                  <div>
                    <span>Puzzles solved</span>
                    <strong>{game.correctAnswers}</strong>
                  </div>
                </div>

                <div className="ls-run-progress" aria-hidden="true">
                  <span style={{ width: `${(completed / 5) * 100}%` }} />
                </div>

                <div className="ls-run-actions">
                  <Link to="/missions" className="ls-btn ls-btn-amber">
                    Continue mission
                  </Link>
                  <button type="button" className="ls-btn ls-btn-ghost" onClick={handleStartClick}>
                    Start new run
                  </button>
                </div>

                {nextMission && (
                  <p className="ls-run-next">
                    Next objective: <strong>{nextMission.title}</strong> · {nextMission.location}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="ls-run-empty">
                  Start a new run to leave the shelter. You get three lives for all five missions,
                  and every cipher has a 45-second window.
                </p>
                <div className="ls-run-actions">
                  <button
                    type="button"
                    className="ls-btn ls-btn-amber"
                    onClick={startNewRun}
                    disabled={starting}
                  >
                    {starting ? (
                      <>
                        <Spinner /> Opening the shelter…
                      </>
                    ) : (
                      'Start new run'
                    )}
                  </button>
                  <Link to="/leaderboard" className="ls-btn ls-btn-ghost">
                    View leaderboard
                  </Link>
                </div>
              </>
            )}
          </section>

          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Survivor rank</p>
                <h2>{state?.rank?.label ?? 'New Survivor'}</h2>
              </div>
            </div>
            <div className="ls-rank-progress">
              <span className="ls-rank-total">{state?.rank?.minScore ?? 0} pts reached</span>
              {state?.rank?.nextRank ? (
                <>
                  <p>
                    {state.rank.pointsToNext} points to <strong>{state.rank.nextRank.label}</strong>
                  </p>
                  <div className="ls-rank-track">
                    <span
                      style={{
                        width: `${Math.max(
                          4,
                          Math.min(
                            100,
                            ((state.user.totalScore - state.rank.minScore) /
                              (state.rank.nextRank.minScore - state.rank.minScore)) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <p>Highest survival rank reached.</p>
              )}
            </div>

            <div className="ls-mini-stats">
              <div>
                <span>Total points</span>
                <strong>{state?.user?.totalScore ?? 0}</strong>
              </div>
              <div>
                <span>Best game</span>
                <strong>{state?.user?.bestScore ?? 0}</strong>
              </div>
              <div>
                <span>Achievements</span>
                <strong>{state?.achievements?.length ?? 0}</strong>
              </div>
            </div>

            <Link to="/profile" className="ls-btn ls-btn-ghost ls-btn-block">
              Open survivor profile
            </Link>
          </section>

          <section className="ls-panel ls-mission-overview">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Mission map</p>
                <h2>Route to the tower</h2>
              </div>
              <Link to="/missions" className="ls-link-btn">
                Open map
              </Link>
            </div>

            <ol className="ls-mission-list">
              {missions.map((mission) => (
                <li key={mission.number} className={`ls-mission-row is-${mission.status}`}>
                  <span className="ls-mission-number">{String(mission.number).padStart(2, '0')}</span>
                  <div className="ls-mission-row-copy">
                    <strong>{mission.title}</strong>
                    <span>{mission.location}</span>
                  </div>
                  <span className={`ls-chip is-${mission.status}`}>
                    {STATUS_LABEL[mission.status] ?? mission.status}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          <section className="ls-panel">
            <div className="ls-panel-head">
              <div>
                <p className="ls-kicker">Survivor records</p>
                <h2>Recent activity</h2>
              </div>
              <Link to="/history" className="ls-link-btn">
                Full history
              </Link>
            </div>
            <ul className="ls-achievement-list">
              {(state?.achievements ?? []).slice(0, 4).map((achievement) => (
                <li key={achievement.key} className="ls-achievement is-earned">
                  <span className="ls-achievement-icon" aria-hidden="true">
                    {achievement.icon}
                  </span>
                  <span className="ls-achievement-copy">
                    <strong>{achievement.title}</strong>
                    <span>{achievement.description}</span>
                  </span>
                </li>
              ))}
              {!state?.achievements?.length && (
                <li className="ls-empty-note">
                  No achievements yet. Complete the first mission to unlock one.
                </li>
              )}
            </ul>
          </section>
        </div>
      )}

      {confirmNew && (
        <Modal onClose={() => !starting && setConfirmNew(false)} labelledBy="new-run-title">
          <div className="ls-modal-copy">
            <p className="ls-kicker">Abandon current run?</p>
            <h2 id="new-run-title">Start from the shelter</h2>
            <p>
              Your current run will be saved to history as abandoned. Score, lives and mission
              progress will reset for the new run.
            </p>
            {actionError && <div className="ls-alert is-error">{actionError}</div>}
            <div className="ls-modal-actions">
              <button
                type="button"
                className="ls-btn ls-btn-ghost"
                onClick={() => setConfirmNew(false)}
                disabled={starting}
              >
                Keep current run
              </button>
              <button
                type="button"
                className="ls-btn ls-btn-danger"
                onClick={startNewRun}
                disabled={starting}
              >
                {starting ? 'Starting…' : 'Start new run'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
