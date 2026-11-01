import { query } from '../db.js';
import { MISSIONS } from './missions.js';
import { rankForScore } from './ranks.js';

/**
 * Achievement definitions. The key is stored in user_achievements; the label
 * and description are presentation only.
 */
export const ACHIEVEMENTS = [
  {
    key: 'first_transmission',
    title: 'First Transmission',
    description: 'Completed the first mission and escaped the shelter.',
    icon: '📡',
  },
  {
    key: 'supply_hunter',
    title: 'Supply Hunter',
    description: 'Raided the ruins and recovered essential supplies.',
    icon: '🎒',
  },
  {
    key: 'power_restored',
    title: 'Power Restored',
    description: 'Brought the district power grid back online.',
    icon: '⚡',
  },
  {
    key: 'network_reconnected',
    title: 'Network Reconnected',
    description: 'Repaired the communications network and found the tower uplink.',
    icon: '📶',
  },
  {
    key: 'last_signal',
    title: 'Last Signal',
    description: 'Completed all five missions and transmitted the Last Signal.',
    icon: '🔆',
  },
  {
    key: 'puzzle_specialist',
    title: 'Puzzle Specialist',
    description: 'Solved ten or more security puzzles.',
    icon: '🧩',
  },
  {
    key: 'perfect_survivor',
    title: 'Perfect Survivor',
    description: 'Completed the game without losing a single life.',
    icon: '🛡️',
  },
];

export const ACHIEVEMENT_BY_KEY = new Map(ACHIEVEMENTS.map((item) => [item.key, item]));

const MISSION_ACHIEVEMENTS = new Map(
  MISSIONS.map((mission) => [mission.number, mission.achievement]),
);

export function serializeAchievements(rows) {
  return rows
    .map((row) => {
      const definition = ACHIEVEMENT_BY_KEY.get(row.achievement_key);
      if (!definition) return null;
      return {
        ...definition,
        awardedAt: row.awarded_at,
        gameId: row.game_id,
      };
    })
    .filter(Boolean);
}

async function award(client, userId, key, gameId) {
  const { rows } = await client.query(
    `INSERT INTO user_achievements (user_id, achievement_key, game_id)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, achievement_key) DO NOTHING
     RETURNING achievement_key`,
    [userId, key, gameId],
  );

  return rows.length > 0 ? ACHIEVEMENT_BY_KEY.get(key) : null;
}

/**
 * Awards every achievement earned by the current game state. Safe to call more
 * than once: achievements are unique per user and the insert is a no-op when
 * the badge already exists.
 */
export async function evaluateAchievements(client, { userId, game, missionNumber, outcome }) {
  const unlocked = [];

  if (missionNumber) {
    const missionKey = MISSION_ACHIEVEMENTS.get(Number(missionNumber));
    if (missionKey) {
      const item = await award(client, userId, missionKey, game.id);
      if (item) unlocked.push(item);
    }
  }

  const { rows: solvedRows } = await client.query(
    `SELECT COUNT(*)::int AS solved
       FROM rounds r
       JOIN games g ON g.id = r.game_id
      WHERE g.user_id = $1 AND r.status = 'correct'`,
    [userId],
  );

  if ((solvedRows[0]?.solved ?? 0) >= 10) {
    const item = await award(client, userId, 'puzzle_specialist', game.id);
    if (item) unlocked.push(item);
  }

  if (outcome === 'won' && game.lives === 3) {
    const item = await award(client, userId, 'perfect_survivor', game.id);
    if (item) unlocked.push(item);
  }

  return unlocked;
}

export async function loadAchievements(userId) {
  const { rows } = await query(
    `SELECT achievement_key, game_id, awarded_at
       FROM user_achievements
      WHERE user_id = $1
      ORDER BY awarded_at ASC`,
    [userId],
  );
  return serializeAchievements(rows);
}

export function rankSummary(totalScore) {
  return rankForScore(totalScore);
}
