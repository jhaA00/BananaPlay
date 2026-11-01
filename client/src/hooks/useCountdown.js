import { useEffect, useRef, useState } from 'react';

function secondsUntil(expiresAt) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/**
 * Displays a server-authored deadline. The server remains authoritative: this
 * hook only tells the UI when to ask the backend to process a timeout.
 */
export default function useCountdown(expiresAt, onExpire) {
  const [remaining, setRemaining] = useState(() => secondsUntil(expiresAt));
  const firedRef = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    firedRef.current = false;
    setRemaining(secondsUntil(expiresAt));

    if (!expiresAt) return undefined;

    const interval = window.setInterval(() => {
      const next = secondsUntil(expiresAt);
      setRemaining(next);

      if (next !== null && next <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current?.();
      }
    }, 250);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return remaining;
}
