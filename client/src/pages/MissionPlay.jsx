import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import RankBadge from '../components/RankBadge.jsx';
import ExplorationScene from '../components/exploration/ExplorationScene.jsx';
import StoryIntro from '../components/exploration/StoryIntro.jsx';
import Modal from '../components/Modal.jsx';
import SecurityTerminal from '../components/SecurityTerminal.jsx';
import SurvivalHud from '../components/SurvivalHud.jsx';
import { Spinner } from '../components/Loader.jsx';
import useGameState from '../hooks/useGameState.js';

function endPayload({ game, user, state, fallbackOutcome }) {
  return {
    outcome: game?.outcome ?? fallbackOutcome ?? 'lost',
    score: game?.score ?? 0,
    missionsCompleted: game?.missionsCompleted ?? 0,
    achievements: state?.achievements ?? [],
    rank: state?.rank ?? null,
    user: user ?? state?.user ?? null,
  };
}

export default function MissionPlay() {
  const { missionNumber } = useParams();
  const navigate = useNavigate();
  const { state, setState, loading, error, reload } = useGameState();

  const [terminal, setTerminal] = useState(null);
  const [busyKey, setBusyKey] = useState(null);
  const [busy, setBusy] = useState(false);
  const [hintBusy, setHintBusy] = useState(false);
  const [flavor, setFlavor] = useState(null);
  const [missionResult, setMissionResult] = useState(null);
  const [endGame, setEndGame] = useState(null);
  const [toast, setToast] = useState(null);
  const [actionError, setActionError] = useState('');
  const [boardMe, setBoardMe] = useState(null);
  const [world, setWorld] = useState(null);
  const [worldLoading, setWorldLoading] = useState(false);
  const [worldError, setWorldError] = useState('');
  const [worldReloadKey, setWorldReloadKey] = useState(0);
  const [introOpen, setIntroOpen] = useState(false);
  const [introBusy, setIntroBusy] = useState(false);

  const mission = state?.missions?.find((item) => item.number === Number(missionNumber));
  const missionNumberValue = Number(missionNumber);

  useEffect(() => {
    if (!state || endGame) return;
    if (!state.game) {
      navigate('/dashboard', { replace: true });
      return;
    }
    if (mission?.status === 'locked') {
      navigate('/missions', { replace: true });
    }
  }, [state, endGame, mission?.status, navigate]);

  useEffect(() => {
    if (!mission || !state?.game) return undefined;
    let cancelled = false;

    async function loadWorld() {
      setWorldLoading(true);
      setWorldError('');
      try {
        const data = await api(`/game/missions/${missionNumberValue}/world`);
        if (cancelled) return;
        setWorld(data.world);
        if (data.state) setState(data.state);
        setIntroOpen(Boolean(data.world?.state && !data.world.state.introSeen && data.world.missionStatus !== 'completed'));
      } catch (requestError) {
        if (!cancelled) setWorldError(requestError.message);
      } finally {
        if (!cancelled) setWorldLoading(false);
      }
    }

    loadWorld();
    return () => {
      cancelled = true;
    };
  }, [missionNumberValue, state?.game?.id, setState, worldReloadKey]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 5200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (endGame?.outcome !== 'won') return;
    api('/scores/leaderboard')
      .then((data) => setBoardMe(data.me ?? null))
      .catch(() => setBoardMe(null));
  }, [endGame?.outcome]);

  function showAchievements(achievements = []) {
    const earned = achievements.filter(Boolean);
    if (!earned.length) return;
    setToast({
      title: 'Achievement unlocked',
      lines: earned.map((item) => `${item.icon ?? '★'} ${item.title}`),
    });
  }

  async function refreshWorld() {
    try {
      const data = await api(`/game/missions/${missionNumberValue}/world`);
      if (data.world) setWorld(data.world);
      if (data.state) setState(data.state);
      return data.world;
    } catch (requestError) {
      setActionError(requestError.message);
      return null;
    }
  }

  function saveWorldPosition(position) {
    api('/game/world/position', {
      method: 'POST',
      body: { missionNumber: missionNumberValue, ...position },
    }).catch(() => {});
  }

  async function beginMission() {
    setIntroBusy(true);
    try {
      await api('/game/world/intro', {
        method: 'POST',
        body: { missionNumber: missionNumberValue },
      });
    } catch {
      // The intro is presentation only; never block the mission on it.
    } finally {
      setIntroBusy(false);
      setIntroOpen(false);
    }
  }

  async function handleWorldInteract(object) {
    if (busyKey) return;
    setActionError('');
    setBusyKey(object.key);
    try {
      const data = await api('/game/world/interact', {
        method: 'POST',
        body: { missionNumber: missionNumberValue, objectKey: object.key },
      });

      if (data.state) setState(data.state);
      if (data.world) setWorld(data.world);

      if (data.gameOver) {
        setTerminal(null);
        setEndGame(endPayload({ game: data.game, state: data.state, fallbackOutcome: 'lost' }));
        return;
      }

      if (data.lifeLost) {
        setToast({
          title: 'Cipher window expired',
          lines: ['One life lost. A new security cipher is ready.'],
        });
      }

      if (data.kind === 'terminal' && data.round) {
        setTerminal({ round: data.round, result: null, feedback: null, resolved: false });
        return;
      }

      if (data.kind === 'exit') {
        setTerminal(null);
        if (data.missionCompleted) {
          setMissionResult({
            ...data.missionCompleted,
            score: data.state?.game?.score ?? data.game?.score ?? 0,
            achievements: data.achievements ?? [],
          });
          showAchievements(data.achievements);
        }
        if (data.missionCompleted?.victory) {
          setEndGame(
            endPayload({ game: data.game, user: data.user, state: data.state, fallbackOutcome: 'won' }),
          );
        }
        return;
      }

      if (data.kind === 'note') {
        setFlavor({ label: object.label, text: data.text });
        return;
      }

      if (data.kind === 'pickup') {
        setToast({ title: 'Pack updated', lines: [data.message] });
        return;
      }

      if (data.kind === 'action') {
        setToast({ title: object.label, lines: [data.message] });
        return;
      }

      if (data.kind === 'transition' && data.message) {
        setToast({ title: 'Route open', lines: [data.message] });
      }
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function handleAnswer(answer) {
    if (!terminal?.round) return;
    setBusy(true);
    try {
      const data = await api('/game/answer', {
        method: 'POST',
        body: { roundId: terminal.round.id, answer },
      });

      setState(data.state);
      showAchievements(data.achievements);
      setActionError('');

      if (data.gameOver) {
        setTerminal(null);
        if (data.missionCompleted?.victory) {
          setMissionResult({
            ...data.missionCompleted,
            score: data.game?.score ?? 0,
            achievements: data.achievements ?? [],
          });
          setEndGame(
            endPayload({ game: data.game, user: data.user, state: data.state, fallbackOutcome: 'won' }),
          );
        } else {
          setEndGame(
            endPayload({ game: data.game, state: data.state, fallbackOutcome: 'lost' }),
          );
        }
        return;
      }

      if (data.expired) {
        setTerminal((current) => ({
          ...current,
          resolved: true,
          result: { correct: false, expired: true, points: 0 },
          feedback: {
            type: 'error',
            title: 'Cipher window expired',
            text: 'The terminal locked itself before the answer arrived. One life lost.',
          },
        }));
        return;
      }

      if (data.correct) {
        setTerminal((current) => ({
          ...current,
          resolved: true,
          result: { correct: true, points: data.points },
          feedback: {
            type: 'success',
            title: 'Security bypassed',
            text: `Cipher accepted. +${data.points} points added to the run.`,
          },
        }));

        // The object, objective tracker and power state changed on the server.
        await refreshWorld();
        return;
      }

      setTerminal((current) => ({
        ...current,
        resolved: true,
        result: { correct: false, points: 0, correctAnswer: data.correctAnswer },
        feedback: {
          type: 'error',
          title: 'Cipher rejected',
          text: `The correct value was ${data.correctAnswer}. One life lost. Re-arm the terminal for a new cipher.`,
        },
      }));
    } catch (requestError) {
      setTerminal((current) => ({
        ...current,
        feedback: { type: 'error', title: 'Terminal error', text: requestError.message },
      }));
    } finally {
      setBusy(false);
    }
  }

  async function handleHint() {
    if (!terminal?.round) return;
    setHintBusy(true);
    try {
      const data = await api('/game/hint', {
        method: 'POST',
        body: { roundId: terminal.round.id },
      });
      setState(data.state);

      if (data.gameOver) {
        setTerminal(null);
        setEndGame(endPayload({ game: data.game, state: data.state, fallbackOutcome: 'lost' }));
        return;
      }

      if (data.expired) {
        setTerminal((current) => ({
          ...current,
          resolved: true,
          result: { correct: false, expired: true, points: 0 },
          feedback: {
            type: 'error',
            title: 'Cipher window expired',
            text: 'The hint arrived too late. One life lost.',
          },
        }));
        return;
      }

      setTerminal((current) => ({ ...current, round: data.round }));
    } catch (requestError) {
      setTerminal((current) => ({
        ...current,
        feedback: { type: 'error', title: 'Hint unavailable', text: requestError.message },
      }));
    } finally {
      setHintBusy(false);
    }
  }

  async function handleTimeout() {
    if (!terminal?.round) return;
    try {
      const data = await api('/game/timeout', {
        method: 'POST',
        body: { roundId: terminal.round.id },
      });
      setState(data.state);

      if (data.gameOver) {
        setTerminal(null);
        setEndGame(endPayload({ game: data.game, state: data.state, fallbackOutcome: 'lost' }));
        return;
      }

      if (data.expired) {
        setTerminal((current) => ({
          ...current,
          resolved: true,
          result: { correct: false, expired: true, points: 0 },
          feedback: {
            type: 'error',
            title: 'Cipher window expired',
            text: 'The signal died before the answer arrived. One life lost.',
          },
        }));
      }
    } catch (requestError) {
      setActionError(requestError.message);
    }
  }

  async function retryTerminal() {
    const objectiveKey = terminal?.round?.objectiveKey;
    setTerminal(null);
    if (!objectiveKey) return;

    setBusyKey(objectiveKey);
    setActionError('');
    try {
      const data = await api('/game/world/terminal', {
        method: 'POST',
        body: { missionNumber: missionNumberValue, objectKey: objectiveKey },
      });
      if (data.state) setState(data.state);
      if (data.world) setWorld(data.world);
      if (data.gameOver) {
        setEndGame(endPayload({ game: data.game, state: data.state, fallbackOutcome: 'lost' }));
        return;
      }
      if (data.lifeLost) {
        setToast({
          title: 'Cipher window expired',
          lines: ['One life lost. A new security cipher is ready.'],
        });
      }
      if (data.round) {
        setTerminal({ round: data.round, result: null, feedback: null, resolved: false });
      }
    } catch (requestError) {
      setActionError(requestError.message);
    } finally {
      setBusyKey(null);
    }
  }

  async function startFreshRun() {
    setBusy(true);
    setActionError('');
    try {
      const data = await api('/game/restart', { method: 'POST' });
      setState(data);
      setEndGame(null);
      setMissionResult(null);
      setTerminal(null);
      navigate('/missions');
    } catch (requestError) {
      setActionError(requestError.message);
      setBusy(false);
    }
  }

  const sceneActive = Boolean(world) && !terminal && !flavor && !introOpen && !missionResult && !endGame;
  const missionComplete = mission?.status === 'completed';

  if (loading && !state) {
    return (
      <div className="ls-page">
        <div className="ls-loading-panel">
          <Spinner /> <span>Entering the location…</span>
        </div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="ls-page">
        <section className="ls-panel ls-empty-panel">
          <p className="ls-kicker">Signal lost</p>
          <h2>Mission not found</h2>
          <Link to="/missions" className="ls-btn ls-btn-amber">
            Back to the mission map
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="ls-page ls-play-page">
      <div className="ls-play-top">
        <Link to={`/missions/${mission.number}`} className="ls-link-btn">
          ← Mission briefing
        </Link>
        <span className="ls-play-location">
          Mission {String(mission.number).padStart(2, '0')} · {mission.location}
        </span>
      </div>

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

      <header className="ls-play-head">
        <div>
          <h1>{mission.title}</h1>
          <p>{mission.tagline}</p>
        </div>
        <RankBadge rank={state?.rank} subtle />
      </header>

      {state?.game && (
        <SurvivalHud
          game={state.game}
          missions={state.missions}
          inventory={state.inventory}
          rank={state.rank}
        />
      )}

      {worldLoading && !world && (
        <div className="ls-explore-loading">
          <Spinner /> <span>Mapping the location…</span>
        </div>
      )}

      {worldError && !world && (
        <div className="ls-alert is-error" role="alert">
          <span>{worldError}</span>
          <button
            type="button"
            className="ls-link-btn"
            onClick={() => setWorldReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      )}

      {world && (
        <ExplorationScene
          mission={mission}
          world={world}
          active={sceneActive && !missionComplete}
          busy={Boolean(busyKey) || terminal !== null}
          onInteract={handleWorldInteract}
          onPosition={saveWorldPosition}
        />
      )}

      {mission.status === 'completed' && !endGame && (
        <div className="ls-scene-complete">
          <p className="ls-kicker">Mission complete</p>
          <h2>{mission.reward}</h2>
          <p>This location is secure. Continue to the next mission on the map.</p>
          <Link to="/missions" className="ls-btn ls-btn-amber">
            Back to the mission map
          </Link>
        </div>
      )}

      {introOpen && world && (
        <StoryIntro mission={mission} world={world} busy={introBusy} onBegin={beginMission} />
      )}

      {terminal && (
        <SecurityTerminal
          round={terminal.round}
          busy={busy}
          hintBusy={hintBusy}
          resolved={terminal.resolved}
          result={terminal.result}
          feedback={terminal.feedback}
          onAnswer={handleAnswer}
          onHint={handleHint}
          onRetry={retryTerminal}
          onTimeout={handleTimeout}
          onClose={() => setTerminal(null)}
        />
      )}

      {flavor && (
        <Modal onClose={() => setFlavor(null)} labelledBy="flavor-title">
          <div className="ls-modal-copy">
            <p className="ls-kicker">Field note</p>
            <h2 id="flavor-title">{flavor.label}</h2>
            <p>{flavor.text}</p>
            <div className="ls-modal-actions">
              <button type="button" className="ls-btn ls-btn-ghost" onClick={() => setFlavor(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {missionResult && (
        <div className="ls-result-overlay" role="dialog" aria-modal="true" aria-labelledby="mission-result-title">
          <div className="ls-result-card">
            <p className="ls-kicker">Mission {String(missionResult.number).padStart(2, '0')} complete</p>
            <h2 id="mission-result-title">{missionResult.title}</h2>
            <div className="ls-result-score">
              <strong>+{missionResult.bonus}</strong>
              <span>mission bonus</span>
            </div>

            {missionResult.resources?.length > 0 && (
              <div className="ls-result-resources">
                <h3>Recovered</h3>
                <ul>
                  {missionResult.resources.map((resource) => (
                    <li key={resource.key}>
                      <span>{resource.label}</span>
                      <strong>×{resource.quantity}</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {missionResult.achievements?.length > 0 && (
              <div className="ls-result-achievements">
                <h3>Unlocked</h3>
                <ul>
                  {missionResult.achievements.map((item) => (
                    <li key={item.key}>
                      <span aria-hidden="true">{item.icon ?? '★'}</span> {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="ls-result-note">
              {missionResult.victory
                ? `Final bonus +${missionResult.victoryBonus}. The transmitter is live.`
                : missionResult.unlockedMission
                  ? `Mission ${missionResult.unlockedMission} is now available.`
                  : 'Route secured.'}
            </p>

            <div className="ls-modal-actions">
              {missionResult.victory ? (
                <button
                  type="button"
                  className="ls-btn ls-btn-amber"
                  onClick={() => setMissionResult(null)}
                >
                  Transmit final report
                </button>
              ) : (
                <Link to="/missions" className="ls-btn ls-btn-amber">
                  Back to the mission map
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {endGame && !missionResult && (
        <div className={`ls-result-overlay${endGame.outcome === 'won' ? ' is-victory' : ''}`}>
          <div className="ls-result-card ls-end-card">
            <p className="ls-kicker">
              {endGame.outcome === 'won' ? 'Transmission live' : 'Signal lost'}
            </p>
            <h2 id="mission-result-title">
              {endGame.outcome === 'won' ? 'The Last Signal is live' : 'The silence won'}
            </h2>
            <p className="ls-end-lead">
              {endGame.outcome === 'won'
                ? 'The tower is transmitting. Somewhere beyond the ruins, someone just heard you.'
                : 'Your lives are exhausted. The route ends here — but the tower will still be waiting.'}
            </p>

            <div className="ls-end-stats">
              <div>
                <span>Final score</span>
                <strong>{endGame.score}</strong>
              </div>
              <div>
                <span>Missions completed</span>
                <strong>{endGame.missionsCompleted}/5</strong>
              </div>
              <div>
                <span>Survivor rank</span>
                <strong>{endGame.rank?.label ?? 'New Survivor'}</strong>
              </div>
              {boardMe && (
                <div>
                  <span>Global rank</span>
                  <strong>#{boardMe.rank}</strong>
                </div>
              )}
            </div>

            {endGame.achievements?.length > 0 && (
              <div className="ls-result-achievements">
                <h3>Achievements</h3>
                <ul>
                  {endGame.achievements.map((item) => (
                    <li key={item.key}>
                      <span aria-hidden="true">{item.icon ?? '★'}</span> {item.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="ls-modal-actions">
              <button
                type="button"
                className="ls-btn ls-btn-amber"
                onClick={startFreshRun}
                disabled={busy}
              >
                {busy ? 'Opening shelter…' : 'Start a new run'}
              </button>
              <button
                type="button"
                className="ls-btn ls-btn-ghost"
                onClick={() => navigate('/dashboard')}
              >
                Return to dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="ls-toast" role="status">
          <strong>{toast.title}</strong>
          {toast.lines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      )}
    </div>
  );
}
