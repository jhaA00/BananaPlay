import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import { FullPageLoader } from './components/Loader.jsx';
import AuthPage from './pages/AuthPage.jsx';
import NotFound from './pages/NotFound.jsx';
import Play from './pages/Play.jsx';
import Scoreboard from './pages/Scoreboard.jsx';

function GuestOnly({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader label="Checking your session…" />;
  if (user) return <Navigate to="/play" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnly>
            <AuthPage mode="login" />
          </GuestOnly>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnly>
            <AuthPage mode="register" />
          </GuestOnly>
        }
      />

      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/play" replace />} />
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <Play />
            </ProtectedRoute>
          }
        />
        <Route
          path="/scoreboard"
          element={
            <ProtectedRoute>
              <Scoreboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
