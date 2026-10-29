import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setStoredToken } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!token) {
      setInitializing(false);
      return undefined;
    }

    let ignore = false;
    setInitializing(true);

    api('/auth/me')
      .then((data) => {
        if (!ignore) setUser(data.user);
      })
      .catch(() => {
        if (ignore) return;
        setStoredToken(null);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (!ignore) setInitializing(false);
      });

    return () => {
      ignore = true;
    };
  }, [token]);

  const signIn = useCallback(async ({ identifier, password }) => {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { identifier, password },
      auth: false,
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signUp = useCallback(async ({ username, email, password }) => {
    const data = await api('/auth/register', {
      method: 'POST',
      body: { username, email, password },
      auth: false,
    });
    setStoredToken(data.token);
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const signOut = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const value = useMemo(
    () => ({ user, token, initializing, signIn, signUp, signOut, updateUser }),
    [user, token, initializing, signIn, signUp, signOut, updateUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
