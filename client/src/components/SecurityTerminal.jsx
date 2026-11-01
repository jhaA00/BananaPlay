import { useEffect, useMemo, useRef, useState } from 'react';
import useCountdown from '../hooks/useCountdown.js';

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

export default function SecurityTerminal({
  round,
  busy = false,
  hintBusy = false,
  resolved = false,
  result = null,
  feedback = null,
  onAnswer,
  onHint,
  onRetry,
  onClose,
  onTimeout,
}) {
  const [digit, setDigit] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageNonce, setImageNonce] = useState(0);
  const inputRef = useRef(null);
  const timeoutSent = useRef(false);

  const remaining = useCountdown(round.expiresAt, () => {
    if (timeoutSent.current || resolved) return;
    timeoutSent.current = true;
    onTimeout?.();
  });

  useEffect(() => {
    setDigit('');
    setImageError(false);
    setImageNonce(0);
    timeoutSent.current = false;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [round.id]);

  const totalSeconds = useMemo(() => {
    if (!round.expiresAt) return 45;
    const started = new Date(round.expiresAt).getTime() - 45_000;
    const seconds = Math.ceil((new Date(round.expiresAt).getTime() - started) / 1000);
    return Math.max(1, seconds);
  }, [round.expiresAt]);

  const timeLeft = remaining ?? totalSeconds;
  const percentage = Math.max(0, Math.min(100, (timeLeft / totalSeconds) * 100));
  const urgent = timeLeft <= 10 && !resolved;

  function submit(event) {
    event.preventDefault();
    if (!/^\d$/.test(digit) || busy || resolved) return;
    onAnswer(Number(digit));
  }

  const imageSrc = imageError ? null : `${round.imageUrl}${imageNonce ? `?r=${imageNonce}` : ''}`;

  return (
    <div className="ls-terminal-overlay" role="dialog" aria-modal="true" aria-labelledby="terminal-title">
      <div className="ls-terminal">
        <header className="ls-terminal-head">
          <div>
            <p className="ls-terminal-kicker">Security terminal</p>
            <h2 id="terminal-title">{round.objectiveLabel}</h2>
          </div>
          <button type="button" className="ls-terminal-close" onClick={onClose} aria-label="Close terminal">
            ✕
          </button>
        </header>

        <div className={`ls-terminal-timer${urgent ? ' is-urgent' : ''}`}>
          <div className="ls-terminal-timer-row">
            <span>Signal window</span>
            <strong>{resolved ? 'CLOSED' : `00:${String(timeLeft).padStart(2, '0')}`}</strong>
          </div>
          <div className="ls-terminal-timer-track">
            <span style={{ width: `${resolved ? 0 : percentage}%` }} />
          </div>
        </div>

        <div className="ls-terminal-body">
          <div className="ls-terminal-puzzle">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt="Numerical security puzzle. Find the missing digit."
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="ls-terminal-image-fallback">
                <span aria-hidden="true">📡</span>
                <p>The cipher image could not be loaded.</p>
                <button
                  type="button"
                  className="ls-btn ls-btn-ghost ls-btn-small"
                  onClick={() => {
                    setImageError(false);
                    setImageNonce((value) => value + 1);
                  }}
                >
                  Reload image
                </button>
              </div>
            )}
            <p className="ls-terminal-help">
              Decode the missing value. One digit. No second chances inside this window.
            </p>
          </div>

          <div className="ls-terminal-controls">
            <form onSubmit={submit}>
              <label className="ls-terminal-input-label" htmlFor="terminal-answer">
                Decryption value
              </label>
              <input
                id="terminal-answer"
                ref={inputRef}
                className="ls-terminal-input"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(event) => setDigit(event.target.value.replace(/\D/g, '').slice(0, 1))}
                disabled={busy || resolved}
                placeholder="?"
                autoComplete="off"
              />

              <div className="ls-keypad">
                {DIGITS.map((number) => (
                  <button
                    key={number}
                    type="button"
                    className="ls-key"
                    onClick={() => setDigit(String(number))}
                    disabled={busy || resolved}
                  >
                    {number}
                  </button>
                ))}
                <button
                  type="button"
                  className="ls-key ls-key-clear"
                  onClick={() => setDigit('')}
                  disabled={busy || resolved}
                >
                  Clear
                </button>
              </div>

              {!resolved && (
                <button type="submit" className="ls-btn ls-btn-amber ls-btn-block" disabled={busy || !digit}>
                  {busy ? 'Decrypting…' : 'Submit cipher'}
                </button>
              )}
            </form>

            {!resolved && (
              <div className="ls-terminal-hint">
                {round.hintUsed ? (
                  <p>
                    <strong>Hint:</strong> {round.hint}
                  </p>
                ) : (
                  <>
                    <p>Stuck? A hint narrows the range but halves this puzzle's reward.</p>
                    <button
                      type="button"
                      className="ls-btn ls-btn-ghost ls-btn-small"
                      onClick={onHint}
                      disabled={hintBusy || busy}
                    >
                      {hintBusy ? 'Decoding hint…' : 'Use hint (−5 points)'}
                    </button>
                  </>
                )}
              </div>
            )}

            {feedback && (
              <div className={`ls-terminal-feedback is-${feedback.type}`} role="status">
                <strong>{feedback.title}</strong>
                <p>{feedback.text}</p>
              </div>
            )}

            {resolved && (
              <div className="ls-terminal-actions">
                {result && !result.correct && (
                  <button type="button" className="ls-btn ls-btn-amber" onClick={onRetry} disabled={busy}>
                    Re-arm terminal
                  </button>
                )}
                <button type="button" className="ls-btn ls-btn-ghost" onClick={onClose}>
                  {result?.correct ? 'Continue' : 'Leave terminal'}
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="ls-terminal-foot">
          <span>UOB Banana decryption layer</span>
          <span>{result?.correct ? `+${result.points} points` : 'Secure channel'}</span>
        </footer>
      </div>
    </div>
  );
}
