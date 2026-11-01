import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Spinner } from '../components/Loader.jsx';
import SurvivalHud from '../components/SurvivalHud.jsx';
import useGameState from '../hooks/useGameState.js';

const STATUS_LABEL = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  completed: 'Complete',
};

export default function MissionMap() {
  const navigate = useNavigate();
  const { state, loading, error, reload } = useGameState();
  const game = state?.game;

  async function beginFromMap() {
    try {
      await api('/game/start', { method: 'POST', body: { mode: 'continue' } });
      reload();
    } catch (requestError) {
      window.alert(requestError.message);
    }
  }

  if (loading && !state) {
    return (
      <div className="ls-page">
        <div className="ls-loading-panel">
          <Spinner /> <span>Charting the route…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ls-page">
      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">Mission map</p>
          <h1>Route to the tower</h1>
          <p className="ls-page-sub">
            Five locations stand between the shelter and the last working transmitter. Complete each
            mission to unlock the next.
          </p>
        </div>
        <Link to="/dashboard" className="ls-btn ls-btn-ghost">
          Dashboard
        </Link>
      </header>

      {error && (
        <div className="ls-alert is-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ls-link-btn" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      {game ? (
        <>
          <SurvivalHud
            game={game}
            missions={state.missions}
            inventory={state.inventory}
            rank={state.rank}
          />

          <ol className="ls-map-grid">
            {state.missions.map((mission) => {
              const unlocked = mission.status !== 'locked';
              const progress = mission.progress;

              return (
                <li key={mission.number} className={`ls-map-card is-${mission.status}`}>
                  <div className="ls-map-card-top">
                    <span className="ls-map-index">{String(mission.number).padStart(2, '0')}</span>
                    <span className={`ls-chip is-${mission.status}`}>
                      {STATUS_LABEL[mission.status]}
                    </span>
                  </div>

                  <p className="ls-map-location">{mission.location}</p>
                  <h2>{mission.title}</h2>
                  <p className="ls-map-tagline">{mission.tagline}</p>

                  <div className="ls-map-progress">
                    <div className="ls-map-progress-row">
                      <span>
                        Terminals bypassed {progress.solved}/{progress.total}
                      </span>
                      <span>{mission.resources.length ? `${mission.resources.length} cache` : '—'}</span>
                    </div>
                    <div className="ls-map-progress-track">
                      <span style={{ width: `${(progress.solved / progress.total) * 100}%` }} />
                    </div>
                  </div>

                  {unlocked ? (
                    <button
                      type="button"
                      className={`ls-btn ${
                        mission.status === 'completed' ? 'ls-btn-ghost' : 'ls-btn-amber'
                      } ls-btn-block`}
                      onClick={() => navigate(`/missions/${mission.number}`)}
                    >
                      {mission.status === 'completed'
                        ? 'View mission'
                        : mission.status === 'in_progress'
                          ? 'Continue mission'
                          : 'Open briefing'}
                    </button>
                  ) : (
                    <button type="button" className="ls-btn ls-btn-ghost ls-btn-block" disabled>
                      Complete mission {mission.number - 1} to unlock
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : (
        <section className="ls-panel ls-empty-panel">
          <p className="ls-kicker">No active run</p>
          <h2>You are still inside the shelter</h2>
          <p>Start a run to open the mission map and begin the escape.</p>
          <button type="button" className="ls-btn ls-btn-amber" onClick={beginFromMap}>
            Start new run
          </button>
        </section>
      )}
    </div>
  );
}
