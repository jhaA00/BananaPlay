import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Spinner } from '../components/Loader.jsx';
import Modal from '../components/Modal.jsx';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

function Lives({ count }) {
  return (
    <span className="lives" aria-label={`${count} of 3 lives left`}>
      {[0, 1, 2].map((index) => (
        <span key={index} className={index < count ? 'life' : 'life is-lost'} aria-hidden="true">
          ♥
        </span>
      ))}
    </span>
  );
}

export default function Play() {
  const { user, updateUser, signOut } = useAuth();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hintLoading, setHintLoading] = useState(false);
  const [gameOver, setGameOver] = useState(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [reloading, setReloading] = useState(false);

  const [loadedRoundId, setLoadedRoundId] = useState(null);
  const [failedRoundId, setFailedRoundId] = useState(null);
  const [imageRetry, setImageRetry] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api('/game/state');
      setState(data);
      updateUser(data.user);
      setAnswer('');
      return true;
    } catch (error) {
      if (error.status === 401) {
        signOut();
        return false;
      }
      setLoadError(error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [signOut, updateUser]);

  useEffect(() => {
    load();
  }, [load]);

  function handleAnswerChange(event) {
    setAnswer(event.target.value.replace(/\D/g, '').slice(0, 1));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!state?.round || submitting) return;

    if (!/^\d$/.test(answer)) {
      setFeedback({ type: 'error', text: 'Pick a digit from 0 to 9.' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const data = await api('/game/answer', {
        method: 'POST',
        body: { roundId: state.round.id, answer: Number(answer) },
      });

      setState((current) => ({ ...current, game: data.game, round: data.round }));
      setAnswer('');

      if (data.user) updateUser(data.user);
      if (data.round) setLoadError('');
      else if (data.notice) setLoadError(data.notice);

      if (data.gameOver) {
        setFeedback(null);
        setGameOver({
          game: data.game,
          user: data.user,
          isNewBest: data.isNewBest,
          correctAnswer: data.correctAnswer,
        });
      } else if (data.correct) {
        setFeedback({ type: 'correct', points: data.points });
      } else {
        setFeedback({ type: 'wrong', correctAnswer: data.correctAnswer });
      }
    } catch (error) {
      if (error.status === 401) {
        signOut();
        return;
      }
      if (error.status === 409) {
        await load();
      }
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleHint() {
    if (!state?.round || hintLoading || state.round.hintUsed) return;

    setHintLoading(true);
    try {
      const data = await api('/game/hint', {
        method: 'POST',
        body: { roundId: state.round.id },
      });
      setState((current) => ({
        ...current,
        round: { ...current.round, ...data.round },
      }));
    } catch (error) {
      if (error.status === 401) {
        signOut();
        return;
      }
      if (error.status === 409) await load();
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setHintLoading(false);
    }
  }

  async function handlePlayAgain() {
    setReloading(true);
    const ok = await load();
    setReloading(false);
    if (ok) {
      setGameOver(null);
      setFeedback(null);
      setImageRetry(0);
      setLoadedRoundId(null);
      setFailedRoundId(null);
    }
  }

  async function handleEndRun() {
    setEnding(true);
    try {
      const data = await api('/game/restart', { method: 'POST' });
      setState(data);
      updateUser(data.user);
      setShowEndConfirm(false);
      setGameOver(null);
      setFeedback(null);
      setAnswer('');
      setImageRetry(0);
      setLoadedRoundId(null);
      setFailedRoundId(null);
    } catch (error) {
      if (error.status === 401) {
        signOut();
        return;
      }
      setShowEndConfirm(false);
      setFeedback({ type: 'error', text: error.message });
    } finally {
      setEnding(false);
    }
  }

  if (loading && !state) {
    return (
      <div className="full-loader" role="status" aria-live="polite">
        <div className="loader-banana" aria-hidden="true">
          🍌
        </div>
        <p>Shuffling the bananas…</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="empty-page">
        <div className="empty-emoji" aria-hidden="true">
          🍌
        </div>
        <h1>The puzzle patch is empty</h1>
        <p>{loadError || 'We could not load your game right now.'}</p>
        <button type="button" className="btn btn-primary btn-inline" onClick={load}>
          Try again
        </button>
      </div>
    );
  }

  const { game, round } = state;
  const player = state.user ?? user;
  const bestScore = Math.max(player?.bestScore ?? 0, game.score);
  const imageReady = loadedRoundId === round?.id;
  const imageFailed = failedRoundId === round?.id;
  const points = round?.hintUsed ? 5 : 10;

  return (
    <div className="play-page">
      <div className="play-head">
        <div>
          <p className="eyebrow">Run in progress</p>
          <h1>Crack the puzzle</h1>
          <p className="page-sub">One number is missing. Find it before your lives run out.</p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-small"
          onClick={() => setShowEndConfirm(true)}
          disabled={submitting}
        >
          End run
        </button>
      </div>

      <div className="hud-grid">
        <div className="hud-card">
          <span className="hud-icon" aria-hidden="true">
            🍌
          </span>
          <div>
            <span className="hud-label">Score</span>
            <span className="hud-value">{game.score}</span>
          </div>
        </div>
        <div className="hud-card">
          <span className="hud-icon" aria-hidden="true">
            ❤️
          </span>
          <div>
            <span className="hud-label">Lives</span>
            <Lives count={game.lives} />
          </div>
        </div>
        <div className="hud-card">
          <span className="hud-icon" aria-hidden="true">
            🔥
          </span>
          <div>
            <span className="hud-label">Streak</span>
            <span className="hud-value">{game.streak}</span>
          </div>
        </div>
        <div className="hud-card">
          <span className="hud-icon" aria-hidden="true">
            🏆
          </span>
          <div>
            <span className="hud-label">Best</span>
            <span className="hud-value">{bestScore}</span>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="alert alert-error retry-alert" role="alert">
          <span>{loadError}</span>
          <button type="button" className="link-btn" onClick={load} disabled={loading}>
            {loading ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}

      <div className="game-grid">
        <section className="puzzle-card" aria-label="Puzzle">
          <span className="puzzle-sticker" aria-hidden="true">
            🍌
          </span>

          {round ? (
            <>
              {!imageReady && !imageFailed && (
                <div className="puzzle-skeleton" role="status" aria-label="Loading puzzle image">
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {imageFailed ? (
                <div className="puzzle-error">
                  <span aria-hidden="true">🖼️</span>
                  <p>This puzzle image did not load.</p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      setLoadedRoundId(null);
                      setFailedRoundId(null);
                      setImageRetry((value) => value + 1);
                    }}
                  >
                    Reload image
                  </button>
                </div>
              ) : (
                <img
                  key={`${round.id}-${imageRetry}`}
                  src={round.imageUrl}
                  alt="Banana puzzle. Find the missing number in the equation."
                  className={`puzzle-image ${imageReady ? 'is-ready' : ''}`}
                  onLoad={() => setLoadedRoundId(round.id)}
                  onError={() => setFailedRoundId(round.id)}
                />
              )}

              <p className="puzzle-caption">Find the missing number</p>
            </>
          ) : (
            <div className="puzzle-empty">
              <span aria-hidden="true">🍌</span>
              <p>The next puzzle is taking a little nap.</p>
              <button type="button" className="btn btn-ghost btn-small" onClick={load}>
                Fetch a puzzle
              </button>
            </div>
          )}
        </section>

        <aside className="control-card">
          <div className="control-head">
            <h2>Your answer</h2>
            <span className={`points-pill ${round?.hintUsed ? 'is-reduced' : ''}`}>+{points} pts</span>
          </div>
          <p className="control-sub">Type or tap the digit that completes the puzzle.</p>

          <div aria-live="polite" className="feedback-region">
            {feedback?.type === 'correct' && (
              <div className="feedback feedback-correct">
                ✅ Correct! <strong>+{feedback.points} points</strong>. Next puzzle loaded.
              </div>
            )}
            {feedback?.type === 'wrong' && (
              <div className="feedback feedback-wrong">
                ❌ Not quite. The answer was <strong>{feedback.correctAnswer}</strong> — one life
                gone.
              </div>
            )}
            {feedback?.type === 'error' && (
              <div className="feedback feedback-error">{feedback.text}</div>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <label htmlFor="answer" className="sr-only">
              Your answer
            </label>
            <div className={`answer-box ${feedback?.type === 'wrong' ? 'shake' : ''}`}>
              <input
                id="answer"
                className="answer-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoComplete="off"
                placeholder="?"
                value={answer}
                onChange={handleAnswerChange}
                disabled={!round || submitting}
              />
            </div>

            <div className="digit-pad" role="group" aria-label="Answer keypad">
              {DIGITS.map((digit) => (
                <button
                  key={digit}
                  type="button"
                  className={`digit-btn ${answer === String(digit) ? 'is-selected' : ''}`}
                  onClick={() => setAnswer(String(digit))}
                  disabled={!round || submitting}
                  aria-pressed={answer === String(digit)}
                >
                  {digit}
                </button>
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={!round || submitting || answer === ''}
            >
              {submitting ? (
                <>
                  <Spinner /> Checking…
                </>
              ) : (
                'Submit answer'
              )}
            </button>
          </form>

          <div className="hint-area">
            {round?.hint ? (
              <div className="hint-box">
                <span aria-hidden="true">💡</span>
                <p>{round.hint}</p>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-ghost btn-block"
                onClick={handleHint}
                disabled={!round || hintLoading || submitting}
              >
                {hintLoading ? (
                  <>
                    <Spinner /> Fetching a hint…
                  </>
                ) : (
                  <>
                    💡 Use a hint <span className="muted">(−5 pts)</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="rules">
            <p className="rules-title">How it works</p>
            <ul>
              <li>+10 points for every correct answer.</li>
              <li>A hint halves the points for that puzzle.</li>
              <li>Wrong answer? You lose one of three lives.</li>
            </ul>
          </div>
        </aside>
      </div>

      {showEndConfirm && (
        <Modal onClose={() => setShowEndConfirm(false)} labelledBy="end-run-title">
          <div className="modal-emoji" aria-hidden="true">
            🏳️
          </div>
          <h2 id="end-run-title" className="modal-title">
            End this run?
          </h2>
          <p className="modal-copy">
            Your score of <strong>{game.score}</strong> will be saved to your profile and the
            leaderboard.
          </p>
          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleEndRun}
              disabled={ending}
            >
              {ending ? (
                <>
                  <Spinner /> Saving…
                </>
              ) : (
                'End run & save score'
              )}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              onClick={() => setShowEndConfirm(false)}
              disabled={ending}
            >
              Keep playing
            </button>
          </div>
        </Modal>
      )}

      {gameOver && (
        <Modal labelledBy="game-over-title" dismissible={false}>
          <div className="modal-emoji" aria-hidden="true">
            🍌
          </div>
          <p className="eyebrow">Run complete</p>
          <h2 id="game-over-title" className="modal-title">
            Game over!
          </h2>

          <div className="modal-score">{gameOver.game.score}</div>
          <p className="modal-score-label">final score</p>

          {gameOver.isNewBest ? (
            <div className="best-badge">🏆 New personal best!</div>
          ) : (
            <p className="modal-copy">
              The last answer was <strong>{gameOver.correctAnswer}</strong>. Better luck next
              time!
            </p>
          )}

          <div className="modal-stats">
            <div>
              <span>Solved</span>
              <strong>{gameOver.game.correctAnswers}</strong>
            </div>
            <div>
              <span>Best streak</span>
              <strong>{gameOver.game.maxStreak}</strong>
            </div>
            <div>
              <span>Your best</span>
              <strong>{gameOver.user?.bestScore ?? bestScore}</strong>
            </div>
          </div>

          {loadError && <div className="alert alert-error">{loadError}</div>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handlePlayAgain}
              disabled={reloading}
            >
              {reloading ? (
                <>
                  <Spinner /> Starting…
                </>
              ) : (
                'Play again'
              )}
            </button>
            <Link to="/scoreboard" className="btn btn-ghost btn-block">
              View scoreboard
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
