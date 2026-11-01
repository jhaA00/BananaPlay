import { rankForScore } from '../game/ranks.js';

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function publicUser(row) {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    bestScore: row.best_score,
    totalScore: row.total_score,
    bestStreak: row.best_streak,
    gamesPlayed: row.games_played,
    createdAt: row.created_at,
    rank: rankForScore(row.total_score),
  };
}

export function publicGame(row) {
  return {
    id: row.id,
    score: row.score,
    lives: row.lives,
    streak: row.streak,
    maxStreak: row.max_streak,
    correctAnswers: row.correct_answers,
    hintsUsed: row.hints_used,
    status: row.status,
    outcome: row.outcome ?? null,
    currentMission: row.current_mission,
    missionsCompleted: row.missions_completed,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}
