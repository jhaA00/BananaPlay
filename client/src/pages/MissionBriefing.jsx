import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import RankBadge from '../components/RankBadge.jsx';
import { Spinner } from '../components/Loader.jsx';
import useGameState from '../hooks/useGameState.js';

export default function MissionBriefing() {
  const { missionNumber } = useParams();
  const navigate = useNavigate();
  const { state, loading, error, reload } = useGameState();
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState('');

  const mission = state?.missions?.find((item) => item.number === Number(missionNumber));
  const game = state?.game;

  async function enterMission() {
    setStarting(true);
    setActionError('');
    try {
      await api(`/game/missions/${mission.number}/start`, { method: 'POST' });
      navigate(`/missions/${mission.number}/play`);
    } catch (requestError) {
      setActionError(requestError.message);
      setStarting(false);
    }
  }

  if (loading && !state) {
    return (
      <div className="ls-page">
        <div className="ls-loading-panel">
          <Spinner /> <span>Opening the mission file…</span>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="ls-page">
        <section className="ls-panel ls-empty-panel">
          <p className="ls-kicker">Unknown location</p>
          <h2>Mission not found</h2>
          <p>That mission does not exist in the current route.</p>
          <Link to="/missions" className="ls-btn ls-btn-amber">
            Back to the map
          </Link>
        </section>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="ls-page">
        <section className="ls-panel ls-empty-panel">
          <p className="ls-kicker">No active run</p>
          <h2>Start a run first</h2>
          <p>You need an active run before entering {mission.location}.</p>
          <Link to="/dashboard" className="ls-btn ls-btn-amber">
            Open dashboard
          </Link>
        </section>
      </div>
    );
  }

  if (mission.status === 'locked') {
    return (
      <div className="ls-page">
        <section className="ls-panel ls-empty-panel">
          <p className="ls-kicker">Access denied</p>
          <h2>Mission locked</h2>
          <p>Complete the previous mission to unlock {mission.location}.</p>
          <Link to="/missions" className="ls-btn ls-btn-amber">
            Back to the map
          </Link>
        </section>
      </div>
    );
  }

  const completed = mission.status === 'completed';

  return (
    <div className="ls-page ls-briefing">
      <div className="ls-briefing-top">
        <Link to="/missions" className="ls-link-btn">
          ← Mission map
        </Link>
        <RankBadge rank={state.rank} subtle />
      </div>

      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">
            Mission {String(mission.number).padStart(2, '0')} · {mission.location}
          </p>
          <h1>{mission.title}</h1>
          <p className="ls-page-sub">{mission.tagline}</p>
        </div>
        <span className={`ls-chip is-${mission.status}`}>
          {completed ? 'Complete' : mission.status === 'in_progress' ? 'In progress' : 'Available'}
        </span>
      </header>

      {error && (
        <div className="ls-alert is-error" role="alert">
          <span>{error}</span>
          <button type="button" className="ls-link-btn" onClick={reload}>
            Retry
          </button>
        </div>
      )}
      {actionError && (
        <div className="ls-alert is-error" role="alert">
          {actionError}
        </div>
      )}

      <div className="ls-briefing-grid">
        <section className="ls-panel ls-briefing-story">
          <p className="ls-kicker">Field report</p>
          <h2>What happened here</h2>
          <p>{mission.story}</p>

          <p className="ls-kicker ls-briefing-gap">Objectives</p>
          <ol className="ls-objective-list">
            {mission.objectives.map((objective, index) => {
              const done =
                mission.terminals.filter((terminal) => terminal.solved).length > index ||
                completed;
              return (
                <li key={objective} className={done ? 'is-done' : ''}>
                  <span className="ls-objective-mark" aria-hidden="true">
                    {done ? '✓' : String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{objective}</span>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="ls-briefing-side">
          <section className="ls-panel">
            <p className="ls-kicker">Security terminals</p>
            <h2>Protected objects</h2>
            <ul className="ls-terminal-list">
              {mission.terminals.map((terminal) => (
                <li key={terminal.key} className={terminal.solved ? 'is-solved' : ''}>
                  <span className="ls-terminal-list-icon" aria-hidden="true">
                    {terminal.solved ? '✓' : '🔒'}
                  </span>
                  <div>
                    <strong>{terminal.label}</strong>
                    <p>{terminal.description}</p>
                    <span>{terminal.solved ? 'Bypassed' : 'Locked — cipher required'}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="ls-panel ls-briefing-reward">
            <p className="ls-kicker">Mission reward</p>
            <h2>{completed ? 'Mission complete' : mission.reward}</h2>
            <ul className="ls-reward-list">
              <li>+100 points on completion</li>
              {mission.resources.map((resource) => (
                <li key={resource.key}>
                  {resource.quantity}× {resource.label}
                </li>
              ))}
              {mission.number === 5 && <li>+250 final signal bonus</li>}
            </ul>
            {completed ? (
              <button
                type="button"
                className="ls-btn ls-btn-ghost ls-btn-block"
                onClick={enterMission}
                disabled={starting}
              >
                Review completed location
              </button>
            ) : (
              <button
                type="button"
                className="ls-btn ls-btn-amber ls-btn-block"
                onClick={enterMission}
                disabled={starting}
              >
                {starting ? (
                  <>
                    <Spinner /> Entering…
                  </>
                ) : (
                  'Enter location'
                )}
              </button>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
