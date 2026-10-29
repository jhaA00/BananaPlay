import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

/**
 * Optional demo data so the leaderboard isn't empty during a presentation.
 * Every seeded account uses the password "banana123".
 */
const players = [
  { username: 'PixelPeeler', email: 'pixel@example.com', best: 180, streak: 18, games: 14, total: 1260 },
  { username: 'BananaBaron', email: 'baron@example.com', best: 150, streak: 15, games: 11, total: 980 },
  { username: 'CodeMonkey', email: 'monkey@example.com', best: 120, streak: 12, games: 9, total: 720 },
  { username: 'PeelGood', email: 'peel@example.com', best: 90, streak: 9, games: 7, total: 510 },
  { username: 'MangoMike', email: 'mango@example.com', best: 60, streak: 6, games: 4, total: 210 },
  { username: 'FruitLoop', email: 'fruit@example.com', best: 30, streak: 3, games: 2, total: 60 },
];

try {
  const passwordHash = await bcrypt.hash('banana123', 10);

  for (const player of players) {
    await pool.query(
      `INSERT INTO users
         (username, email, password_hash, best_score, total_score, best_streak, games_played)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         username    = EXCLUDED.username,
         best_score  = EXCLUDED.best_score,
         total_score = EXCLUDED.total_score,
         best_streak = EXCLUDED.best_streak,
         games_played = EXCLUDED.games_played`,
      [
        player.username,
        player.email,
        passwordHash,
        player.best,
        player.total,
        player.streak,
        player.games,
      ],
    );
  }

  console.log(`[seed] Added ${players.length} demo players (password: banana123).`);
} catch (error) {
  console.error('[seed] Failed:', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
