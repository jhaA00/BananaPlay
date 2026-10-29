import { query, withTransaction } from '../db.js';
import { ApiError } from '../utils/http.js';
import { publicGame, publicUser } from '../utils/presenters.js';
import { buildHint, fetchPuzzle } from './banana.js';

const STARTING_LIVES = 3;
const POINTS_PER_PUZZLE = 10;
const HINT_POINTS_PER_PUZZLE = 5;

function serializeRound(row) {
  if (!row) return null;

  return {
    id: row.id,
    imageUrl: row.question_url,
    hintUsed: row.hint_used,
    hint: row.hint_used ? buildHint(row.solution) : null,
  };
}

async function findActiveGame(userId) {
  const { rows } = await query(
    `SELECT * FROM games WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function createActiveGame(userId) {
  try {
    const { rows } = await query(
      `INSERT INTO games (user_id, lives) VALUES ($1, $2) RETURNING *`,
      [userId, STARTING_LIVES],
    );
    return rows[0];
  } catch (error) {
    // A concurrent request may have created the run first.
    if (error.code === '23505') {
      const existing = await findActiveGame(userId);
      if (existing) return existing;
    }
    throw error;
  }
}

async function getOrCreateActiveGame(userId) {
  return (await findActiveGame(userId)) || createActiveGame(userId);
}

async function getOpenRound(gameId) {
  const { rows } = await query(
    `SELECT * FROM rounds WHERE game_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1`,
    [gameId],
  );
  return rows[0] || null;
}

async function createRound(gameId) {
  const puzzle = await fetchPuzzle();

  try {
    const { rows } = await query(
      `INSERT INTO rounds (game_id, question_url, solution) VALUES ($1, $2, $3) RETURNING *`,
      [gameId, puzzle.questionUrl, puzzle.solution],
    );
    return rows[0];
  } catch (error) {
    // Another request may have created the open round already.
    if (error.code === '23505') {
      const existing = await getOpenRound(gameId);
      if (existing) return existing;
    }
    throw error;
  }
}

async function loadUser(userId) {
  const { rows } = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw new ApiError(404, 'Account not found.');
  return rows[0];
}

async function finalizeRun(client, userId, game) {
  const { rows: beforeRows } = await client.query(
    `SELECT best_score FROM users WHERE id = $1`,
    [userId],
  );

  const isNewBest = game.score > (beforeRows[0]?.best_score ?? 0);

  const { rows } = await client.query(
    `UPDATE users
       SET total_score  = total_score + $1,
           games_played = games_played + 1,
           best_score   = GREATEST(best_score, $1),
           best_streak  = GREATEST(best_streak, $2)
     WHERE id = $3
     RETURNING *`,
    [game.score, game.max_streak, userId],
  );

  return { user: rows[0], isNewBest };
}

export async function loadGameState(userId) {
  const game = await getOrCreateActiveGame(userId);
  let round = await getOpenRound(game.id);
  if (!round) round = await createRound(game.id);
  const user = await loadUser(userId);

  return {
    user: publicUser(user),
    game: publicGame(game),
    round: serializeRound(round),
  };
}

export async function submitAnswer(userId, roundId, answer) {
  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT r.*,
              g.user_id,
              g.status AS game_status,
              g.max_streak,
              g.lives,
              g.score,
              g.streak
         FROM rounds r
         JOIN games g ON g.id = r.game_id
        WHERE r.id = $1 AND g.user_id = $2
        FOR UPDATE OF r, g`,
      [roundId, userId],
    );

    const round = rows[0];
    if (!round) throw new ApiError(404, 'Puzzle not found.');
    if (round.game_status !== 'active') {
      throw new ApiError(409, 'This run has already ended. Start a new one.');
    }
    if (round.status !== 'open') {
      throw new ApiError(409, 'This puzzle has already been answered.');
    }

    const correct = answer === round.solution;
    const points = correct ? (round.hint_used ? HINT_POINTS_PER_PUZZLE : POINTS_PER_PUZZLE) : 0;

    let game;
    if (correct) {
      const { rows: updated } = await client.query(
        `UPDATE games
            SET score           = score + $1,
                streak          = streak + 1,
                max_streak      = GREATEST(max_streak, streak + 1),
                correct_answers = correct_answers + 1
          WHERE id = $2
          RETURNING *`,
        [points, round.game_id],
      );
      game = updated[0];
    } else {
      const { rows: updated } = await client.query(
        `UPDATE games
            SET lives = GREATEST(lives - 1, 0),
                streak = 0
          WHERE id = $1
          RETURNING *`,
        [round.game_id],
      );
      game = updated[0];
    }

    await client.query(
      `UPDATE rounds SET status = $1, answered_at = now() WHERE id = $2`,
      [correct ? 'correct' : 'wrong', roundId],
    );

    let user = null;
    let isNewBest = false;
    let gameOver = false;

    if (!correct && game.lives === 0) {
      gameOver = true;

      const { rows: finished } = await client.query(
        `UPDATE games
            SET status = 'finished', finished_at = now()
          WHERE id = $1
          RETURNING *`,
        [game.id],
      );
      game = finished[0];

      const finalized = await finalizeRun(client, userId, game);
      user = finalized.user;
      isNewBest = finalized.isNewBest;
    }

    return {
      correct,
      points,
      correctAnswer: round.solution,
      game,
      user,
      isNewBest,
      gameOver,
    };
  });

  let nextRound = null;
  let notice = null;

  if (!outcome.gameOver) {
    try {
      nextRound = await createRound(outcome.game.id);
    } catch (error) {
      console.error('[game] Could not prepare the next puzzle:', error.message);
      notice = 'The next puzzle could not be loaded. Tap retry to continue.';
    }
  }

  return {
    correct: outcome.correct,
    points: outcome.points,
    correctAnswer: outcome.correctAnswer,
    game: publicGame(outcome.game),
    round: serializeRound(nextRound),
    gameOver: outcome.gameOver,
    isNewBest: outcome.isNewBest,
    user: outcome.user ? publicUser(outcome.user) : null,
    notice,
  };
}

export async function useHint(userId, roundId) {
  const { rows } = await query(
    `SELECT r.*, g.status AS game_status
       FROM rounds r
       JOIN games g ON g.id = r.game_id
      WHERE r.id = $1 AND g.user_id = $2`,
    [roundId, userId],
  );

  const round = rows[0];
  if (!round) throw new ApiError(404, 'Puzzle not found.');
  if (round.game_status !== 'active') {
    throw new ApiError(409, 'This run has already ended.');
  }
  if (round.status !== 'open') {
    throw new ApiError(409, 'This puzzle has already been answered.');
  }

  if (!round.hint_used) {
    const { rows: updated } = await query(
      `UPDATE rounds SET hint_used = true WHERE id = $1 AND hint_used = false RETURNING id`,
      [roundId],
    );
    if (updated.length > 0) {
      await query(`UPDATE games SET hints_used = hints_used + 1 WHERE id = $1`, [round.game_id]);
    }
    round.hint_used = true;
  }

  return { round: serializeRound(round) };
}

export async function restartRun(userId) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM games WHERE user_id = $1 AND status = 'active' FOR UPDATE`,
      [userId],
    );
    const game = rows[0];
    if (!game) return;

    const { rows: finished } = await client.query(
      `UPDATE games SET status = 'finished', finished_at = now() WHERE id = $1 RETURNING *`,
      [game.id],
    );
    await finalizeRun(client, userId, finished[0]);
  });

  return loadGameState(userId);
}

export async function getLeaderboard(userId) {
  const { rows } = await query(
    `WITH ranked AS (
       SELECT id, username, best_score, best_streak, total_score, games_played,
              ROW_NUMBER() OVER (
                ORDER BY best_score DESC, best_streak DESC, total_score DESC, username ASC
              ) AS rank
         FROM users
        WHERE games_played > 0
     )
     SELECT * FROM ranked
      WHERE rank <= 20 OR id = $1
      ORDER BY rank`,
    [userId],
  );

  const entries = rows.map((row) => ({
    id: row.id,
    username: row.username,
    bestScore: row.best_score,
    bestStreak: row.best_streak,
    totalScore: row.total_score,
    gamesPlayed: row.games_played,
    rank: Number(row.rank),
  }));

  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM users WHERE games_played > 0`,
  );

  return {
    leaderboard: entries.filter((entry) => entry.rank <= 20),
    me: entries.find((entry) => entry.id === userId) || null,
    totalPlayers: countRows[0].total,
  };
}

export async function getHistory(userId) {
  const { rows } = await query(
    `SELECT id, score, correct_answers, max_streak, hints_used, started_at, finished_at
       FROM games
      WHERE user_id = $1 AND status = 'finished'
      ORDER BY finished_at DESC NULLS LAST
      LIMIT 10`,
    [userId],
  );

  return rows.map((row) => ({
    id: row.id,
    score: row.score,
    correctAnswers: row.correct_answers,
    maxStreak: row.max_streak,
    hintsUsed: row.hints_used,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  }));
}
