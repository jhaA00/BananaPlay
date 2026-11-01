import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import AchievementBadge from '../components/AchievementBadge.jsx';
import RankBadge from '../components/RankBadge.jsx';
import { Spinner } from '../components/Loader.jsx';
import { ACHIEVEMENTS } from '../game/achievements.js';

const OUTCOME_LABEL = {
  won: 'Signal sent',
  lost: 'Signal lost',
  abandoned: 'Abandoned',
};

const OUTCOME_CLASS = {
  won: 'is-completed',
  lost: 'is-locked',
  abandoned: 'is-available',
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export default function PublicProfile() {
  const { username } = useParams();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setProfile(await api(`/scores/players/${encodeURIComponent(username)}`));
    } catch (requestError) {
      if (requestError.status === 401) {
        signOut();
        return;
      }
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [signOut, username]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !profile) {
    return (
      <div className="ls-page">
        <div className="ls-loading-panel">
          <Spinner /> <span>Locating survivor file…</span>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="ls-page">
        <section className="ls-panel ls-empty-panel">
          <p className="ls-kicker">No transmission</p>
          <h1>{error || 'Survivor not found'}</h1>
          <p>The network has no record of this survivor.</p>
          <div className="ls-modal-actions">
            <button type="button" className="ls-btn ls-btn-ghost" onClick={load}>
              Retry
            </button>
            <Link to="/leaderboard" className="ls-btn ls-btn-amber">
              Back to the leaderboard
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const earnedKeys = new Set(profile.achievements.map((item) => item.key));
  const rank = profile.rank;

  return (
    <div className="ls-page">
      <header className="ls-page-head">
        <div>
          <p className="ls-kicker">Public survivor file</p>
          <h1>{profile.user.username}</h1>
          <p className="ls-page-sub">
            Transmitting since {formatDate(profile.user.createdAt)}
            {profile.globalRank ? ` · Global rank #${profile.globalRank}` : ' · Unranked'}
          </p>
        </div>
        <div className="ls-page-head-actions">
          {rank && <RankBadge rank={rank} />}
          <Link to="/leaderboard" className="ls-btn ls-btn-ghost">
            Leaderboard
          </Link>
        </div>
      </header>

      <div className="ls-dashboard-grid">
        <section className="ls-panel">
          <div className="ls-panel-head">
            <div>
              <p className="ls-kicker">Career totals</p>
              <h2>Survival record</h2>
            </div>
          </div>
          <div className="ls-stat-grid">
            <div>
              <span>Lifetime score</span>
              <strong>{profile.user.totalScore}</strong>
            </div>
            <div>
              <span>Best run</span>
              <strong>{profile.user.bestScore}</strong>
            </div>
            <div>
              <span>Runs played</span>
              <strong>{profile.user.gamesPlayed}</strong>
            </div>
            <div>
              <span>Missions cleared</span>
              <strong>{profile.stats.missionsCompleted}</strong>
            </div>
            <div>
              <span>Puzzles solved</span>
              <strong>{profile.stats.puzzlesSolved}</strong>
            </div>
            <div>
              <span>Signals sent</span>
              <strong>{profile.stats.victories}</strong>
            </div>
          </div>
        </section>

        <section className="ls-panel">
          <div className="ls-panel-head">
            <div>
              <p className="ls-kicker">Survivor rank</p>
              <h2>{rank?.label ?? 'New Survivor'}</h2>
            </div>
          </div>
          {rank && (
            <div className="ls-rank-progress">
              <span className="ls-rank-total">{rank.minScore} pts threshold</span>
              {rank.nextRank ? (
                <p>
                  {rank.pointsToNext} points to <strong>{rank.nextRank.label}</strong>
                </p>
              ) : (
                <p>Highest survival rank reached. The signal is theirs.</p>
              )}
            </div>
          )}
          <div className="ls-stat-grid">
            <div>
              <span>Achievements</span>
              <strong>
                {profile.achievements.length}/{ACHIEVEMENTS.length}
              </strong>
            </div>
            <div>
              <span>Best streak</span>
              <strong>{profile.user.bestStreak}</strong>
            </div>
            <div>
              <span>Hints used</span>
              <strong>{profile.stats.hintsUsed}</strong>
            </div>
          </div>
        </section>

        <section className="ls-panel ls-achievements-panel">
          <div className="ls-panel-head">
            <div>
              <p className="ls-kicker">Badges</p>
              <h2>Achievements</h2>
            </div>
          </div>
          <ul className="ls-achievement-grid">
            {ACHIEVEMENTS.map((definition) => {
              const awarded = profile.achievements.find((item) => item.key === definition.key) ?? null;
              return (
                <AchievementBadge
                  key={definition.key}
                  achievement={awarded ?? definition}
                  awarded={earnedKeys.has(definition.key)}
                />
              );
            })}
          </ul>
        </section>

        <section className="ls-panel">
          <div className="ls-panel-head">
            <div>
              <p className="ls-kicker">Archive</p>
              <h2>Recent runs</h2>
            </div>
            {profile.totalRuns > 5 && (
              <span className="ls-page-indicator">{profile.totalRuns} total</span>
            )}
          </div>
          {profile.runs.length === 0 ? (
            <p className="ls-empty-note">No finished runs yet.</p>
          ) : (
            <div className="ls-table-scroll">
              <table className="ls-table">
                <thead>
                  <tr>
                    <th scope="col">Run</th>
                    <th scope="col">Outcome</th>
                    <th scope="col">Score</th>
                    <th scope="col">Missions</th>
                    <th scope="col">Finished</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.runs.map((run) => (
                    <tr key={run.id}>
                      <td className="ls-table-rank">#{run.id}</td>
                      <td>
                        <span className={`ls-chip ${OUTCOME_CLASS[run.outcome] ?? 'is-available'}`}>
                          {OUTCOME_LABEL[run.outcome] ?? run.outcome ?? 'Finished'}
                        </span>
                      </td>
                      <td className="ls-table-score">{run.score}</td>
                      <td>{run.missionsCompleted}/5</td>
                      <td className="ls-table-date">{formatDate(run.finishedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
