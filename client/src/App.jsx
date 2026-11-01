import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';
import Layout from './components/Layout.jsx';
import { FullPageLoader } from './components/Loader.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import History from './pages/History.jsx';
import Landing from './pages/Landing.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import MissionBriefing from './pages/MissionBriefing.jsx';
import MissionMap from './pages/MissionMap.jsx';
import MissionPlay from './pages/MissionPlay.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';

function GuestOnly({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <FullPageLoader label="Checking your session…" />;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <GuestOnly>
            <Landing />
          </GuestOnly>
        }
      />
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

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/missions" element={<MissionMap />} />
        <Route path="/missions/:missionNumber" element={<MissionBriefing />} />
        <Route path="/missions/:missionNumber/play" element={<MissionPlay />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />

        {/* Backwards-compatible links from the original Banana Puzzle UI. */}
        <Route path="/play" element={<Navigate to="/dashboard" replace />} />
        <Route path="/scoreboard" element={<Navigate to="/leaderboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
