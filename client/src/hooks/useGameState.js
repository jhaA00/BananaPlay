import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';

/** Shared loader for the authenticated game state. */
export default function useGameState({ auto = true } = {}) {
  const { signOut } = useAuth();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(auto);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api('/game/state');
      setState(data);
      return data;
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        return null;
      }
      setError(requestError.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [signOut]);

  useEffect(() => {
    if (auto) reload();
  }, [auto, reload]);

  return { state, setState, loading, error, reload };
}
