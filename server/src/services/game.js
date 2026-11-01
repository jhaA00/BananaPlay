import { query, withTransaction } from '../db.js';
import { ApiError } from '../utils/http.js';
import { publicGame, publicUser } from '../utils/presenters.js';
import { buildHint, fetchPuzzle } from './banana.js';
import {
  MISSION_COUNT,
  RESOURCE_LABELS,
  getMission,
  getTerminal,
  missionCatalog,
} from '../game/missions.js';
import { rankForScore } from '../game/ranks.js';
import { evaluateAchievements, loadAchievements } from '../game/achievements.js';

const STARTING_LIVES = 3;
const POINTS_PER_PUZZLE = 10;
const HINT_POINTS_PER_PUZZLE = 5;
const MISSION_BONUS = 100;
const VICTORY_BONUS = 250;

const exec = (client) => (text, values) => (client ? client.query(text, values) : query(text, values));

function secondsRemaining(row) {
  if (row.remaining_seconds !== undefined && row.remaining_seconds !== null) {
    return Math.max(0, Number(row.remaining_seconds));
  }
  if (!row.expires_at) return null;
  return Math.max(0, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1000));
}

function serializeRound(row) {
  if (!row) return null;

  const mission = getMission(row.mission_number);
  const terminal = mission?.terminals.find((item) => item.key === row.objective_key);

  return {
    id: row.id,
    missionNumber: row.mission_number === null ? null : Number(row.mission_number),
    objectiveKey: row.objective_key,
    objectiveLabel: terminal?.label ?? 'Security Terminal',
    imageUrl: row.question_url,
    hintUsed: row.hint_used,
    hint: row.hint_used ? buildHint(row.solution) : null,
    expiresAt: row.expires_at,
    secondsRemaining: secondsRemaining(row),
    status: row.status,
  };
}

async function loadUser(userId, client = null) {
  const { rows } = await exec(client)(`SELECT * FROM users WHERE id = $1`, [userId]);
  if (!rows[0]) throw new ApiError(404, 'Account not found.');
  return rows[0];
}

async function findActiveGame(userId, client = null) {
  const { rows } = await exec(client)(
    `SELECT * FROM games WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

async function ensureMissionRows(client, gameId) {
  await client.query(
    `INSERT INTO game_missions (game_id, mission_number, status)
     SELECT $1, n, CASE WHEN n = 1 THEN 'available' ELSE 'locked' END
       FROM generate_series(1, $2::int) AS n
     ON CONFLICT (game_id, mission_number) DO NOTHING`,
    [gameId, MISSION_COUNT],
  );
}

async function createActiveGame(client, userId) {
  const { rows } = await client.query(
    `INSERT INTO games (user_id, lives, current_mission) VALUES ($1, $2, 1) RETURNING *`,
    [userId, STARTING_LIVES],
  );
  const game = rows[0];
  await ensureMissionRows(client, game.id);
  return game;
}

async function getOrCreateActiveGame(client, userId) {
  return (await findActiveGame(userId, client)) || (await createActiveGame(client, userId));
}

async function loadOpenRound(gameId, client = null) {
  const { rows } = await exec(client)(
    `SELECT *,
            GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))::int AS remaining_seconds
       FROM rounds
      WHERE game_id = $1 AND status = 'open'
      ORDER BY id DESC
      LIMIT 1`,
    [gameId],
  );
  return rows[0] || null;
}

async function loadMissionRows(gameId, client = null) {
  const { rows } = await exec(client)(
    `SELECT mission_number, status, started_at, completed_at
       FROM game_missions
      WHERE game_id = $1
      ORDER BY mission_number`,
    [gameId],
  );
  return rows;
}

async function loadSolvedObjectives(gameId, client = null) {
  const { rows } = await exec(client)(
    `SELECT DISTINCT mission_number, objective_key
       FROM rounds
      WHERE game_id = $1 AND status = 'correct' AND mission_number IS NOT NULL`,
    [gameId],
  );

  const solved = new Map();
  for (const row of rows) {
    const list = solved.get(Number(row.mission_number)) ?? [];
    list.push(row.objective_key);
    solved.set(Number(row.mission_number), list);
  }
  return solved;
}

async function loadInventory(gameId, client = null) {
  const { rows } = await exec(client)(
    `SELECT resource_key, quantity FROM game_resources WHERE game_id = $1 ORDER BY resource_key`,
    [gameId],
  );

  return rows.map((row) => ({
    key: row.resource_key,
    label: RESOURCE_LABELS[row.resource_key] ?? row.resource_key,
    quantity: row.quantity,
  }));
}

async function logEvent(client, { userId, gameId, type, payload = {} }) {
  await client.query(
    `INSERT INTO game_events (user_id, game_id, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [userId, gameId ?? null, type, JSON.stringify(payload)],
  );
}

function buildMissions(missionRows, solvedMap) {
  const byNumber = new Map(missionRows.map((row) => [Number(row.mission_number), row]));

  return missionCatalog().map((mission) => {
    const row = byNumber.get(mission.number);
    const solvedObjectives = solvedMap.get(mission.number) ?? [];
    const completed = row?.status === 'completed' || solvedObjectives.length >= mission.terminals.length;

    return {
      ...mission,
      status: completed ? 'completed' : row?.status ?? 'locked',
      solvedObjectives,
      completedAt: row?.completed_at ?? null,
      startedAt: row?.started_at ?? null,
      progress: {
        solved: solvedObjectives.length,
        total: mission.terminals.length,
      },
      terminals: mission.terminals.map((terminal) => ({
        ...terminal,
        solved: solvedObjectives.includes(terminal.key),
      })),
    };
  });
}

export async function loadGameState(userId) {
  const user = await loadUser(userId);
  const game = await findActiveGame(userId);
  const achievements = await loadAchievements(userId);
  const rank = rankForScore(user.total_score);

  if (!game) {
    return {
      user: publicUser(user),
      rank,
      game: null,
      missions: buildMissions([], new Map()),
      round: null,
      inventory: [],
      achievements,
    };
  }

  const [missionRows, solvedMap, inventory, round] = await Promise.all([
    loadMissionRows(game.id),
    loadSolvedObjectives(game.id),
    loadInventory(game.id),
    loadOpenRound(game.id),
  ]);

  return {
    user: publicUser(user),
    rank,
    game: publicGame(game),
    missions: buildMissions(missionRows, solvedMap),
    round: serializeRound(round),
    inventory,
    achievements,
  };
}

async function finalizeRun(client, userId, game, outcome) {
  if (game.status !== 'active') {
    const user = await loadUser(userId, client);
    return { user, isNewBest: false };
  }

  const { rows: finishedRows } = await client.query(
    `UPDATE games
        SET status = 'finished',
            outcome = $1,
            finished_at = now()
      WHERE id = $2 AND status = 'active'
      RETURNING *`,
    [outcome, game.id],
  );

  if (!finishedRows[0]) {
    const user = await loadUser(userId, client);
    return { user, isNewBest: false };
  }

  const finished = finishedRows[0];
  const { rows: beforeRows } = await client.query(
    `SELECT best_score FROM users WHERE id = $1`,
    [userId],
  );
  const isNewBest = finished.score > (beforeRows[0]?.best_score ?? 0);

  const { rows } = await client.query(
    `UPDATE users
        SET total_score  = total_score + $1,
            games_played = games_played + 1,
            best_score   = GREATEST(best_score, $1),
            best_streak  = GREATEST(best_streak, $2)
      WHERE id = $3
      RETURNING *`,
    [finished.score, finished.max_streak, userId],
  );

  return { user: rows[0], isNewBest, finished };
}

/**
 * Applies one life loss to the locked game row and finalises the run if the
 * player has no lives left. Must be called inside a transaction that already
 * holds a lock on the game.
 */
async function loseLife(client, userId, game) {
  const { rows } = await client.query(
    `UPDATE games
        SET lives = GREATEST(lives - 1, 0),
            streak = 0
      WHERE id = $1
      RETURNING *`,
    [game.id],
  );
  const updated = rows[0];

  if (updated.lives > 0) {
    return { game: updated, gameOver: false, user: null };
  }

  const finalized = await finalizeRun(client, userId, updated, 'lost');
  return { game: finalized.finished ?? updated, gameOver: true, user: finalized.user };
}

async function missionCompletion(client, userId, game, missionNumber, unlocked) {
  const mission = getMission(missionNumber);
  if (!mission) return null;

  const { rows: missionRows } = await client.query(
    `SELECT * FROM game_missions WHERE game_id = $1 AND mission_number = $2 FOR UPDATE`,
    [game.id, missionNumber],
  );

  if (missionRows[0]?.status === 'completed') return null;

  const { rows: countRows } = await client.query(
    `SELECT COUNT(DISTINCT objective_key)::int AS solved
       FROM rounds
      WHERE game_id = $1 AND mission_number = $2 AND status = 'correct'`,
    [game.id, missionNumber],
  );

  if ((countRows[0]?.solved ?? 0) < mission.terminals.length) return null;

  await client.query(
    `INSERT INTO game_missions (game_id, mission_number, status, started_at, completed_at)
     VALUES ($1, $2, 'completed', now(), now())
     ON CONFLICT (game_id, mission_number)
     DO UPDATE SET status = 'completed',
                   completed_at = now(),
                   started_at = COALESCE(game_missions.started_at, now())`,
    [game.id, missionNumber],
  );

  const nextNumber = missionNumber + 1;
  if (nextNumber <= MISSION_COUNT) {
    await client.query(
      `INSERT INTO game_missions (game_id, mission_number, status)
       VALUES ($1, $2, 'available')
       ON CONFLICT (game_id, mission_number)
       DO UPDATE SET status = CASE
         WHEN game_missions.status = 'locked' THEN 'available'
         ELSE game_missions.status
       END`,
      [game.id, nextNumber],
    );
  }

  const { rows: updatedRows } = await client.query(
    `UPDATE games
        SET score = score + $1,
            missions_completed = GREATEST(missions_completed, $2),
            current_mission = LEAST($3::smallint, $4::smallint)
      WHERE id = $5
      RETURNING *`,
    [MISSION_BONUS, missionNumber, nextNumber, MISSION_COUNT, game.id],
  );

  let updated = updatedRows[0];

  for (const resource of mission.resources) {
    await client.query(
      `INSERT INTO game_resources (game_id, resource_key, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (game_id, resource_key)
       DO UPDATE SET quantity = game_resources.quantity + EXCLUDED.quantity`,
      [game.id, resource.key, resource.quantity],
    );
  }

  await logEvent(client, {
    userId,
    gameId: game.id,
    type: 'mission_completed',
    payload: { missionNumber, bonus: MISSION_BONUS, resources: mission.resources },
  });

  for (const resource of mission.resources) {
    await logEvent(client, {
      userId,
      gameId: game.id,
      type: 'resource_collected',
      payload: { key: resource.key, quantity: resource.quantity },
    });
  }

  const achievements = await evaluateAchievements(client, {
    userId,
    game: updated,
    missionNumber,
  });

  let victory = false;
  let user = null;

  if (missionNumber === MISSION_COUNT && !updated.final_bonus_awarded) {
    const { rows: victoryRows } = await client.query(
      `UPDATE games
          SET score = score + $1,
              final_bonus_awarded = true
        WHERE id = $2 AND final_bonus_awarded = false
        RETURNING *`,
      [VICTORY_BONUS, game.id],
    );

    if (victoryRows[0]) {
      updated = victoryRows[0];
      victory = true;

      const finalized = await finalizeRun(client, userId, updated, 'won');
      updated = finalized.finished ?? updated;
      user = finalized.user;
      const finalAchievements = await evaluateAchievements(client, {
        userId,
        game: finalized.finished ?? updated,
        missionNumber: null,
        outcome: 'won',
      });
      achievements.push(...finalAchievements);
      await logEvent(client, {
        userId,
        gameId: game.id,
        type: 'victory',
        payload: { score: updated.score, bonus: VICTORY_BONUS },
      });
    }
  }

  return {
    mission,
    bonus: MISSION_BONUS,
    victory,
    victoryBonus: victory ? VICTORY_BONUS : 0,
    achievements,
    user,
    game: updated,
    unlockedMission: nextNumber <= MISSION_COUNT ? nextNumber : null,
  };
}

/**
 * Starts a new run or resumes the current one. A brand new run never inherits
 * score, lives or progress from the previous run.
 */
export async function startRun(userId, mode = 'continue') {
  await withTransaction(async (client) => {
    const active = await findActiveGame(userId, client);

    if (active && mode === 'new') {
      const finalized = await finalizeRun(client, userId, active, 'abandoned');
      await logEvent(client, {
        userId,
        gameId: active.id,
        type: 'game_abandoned',
        payload: { score: active.score },
      });
      if (finalized.finished) {
        // The run is preserved in history; a new one replaces it below.
      }
    }

    const current = await findActiveGame(userId, client);
    if (!current) {
      const game = await createActiveGame(client, userId);
      await logEvent(client, { userId, gameId: game.id, type: 'game_started', payload: {} });
    }
  });

  return loadGameState(userId);
}

export async function startMission(userId, missionNumber) {
  const mission = getMission(missionNumber);
  if (!mission) throw new ApiError(404, 'That mission does not exist.');

  await withTransaction(async (client) => {
    const game = await findActiveGame(userId, client);
    if (!game) throw new ApiError(409, 'Start a new game before entering a mission.');

    await ensureMissionRows(client, game.id);
    const { rows } = await client.query(
      `SELECT * FROM game_missions WHERE game_id = $1 AND mission_number = $2 FOR UPDATE`,
      [game.id, missionNumber],
    );
    const row = rows[0];

    if (!row || row.status === 'locked') {
      throw new ApiError(409, 'That mission is still locked.');
    }

    if (row.status === 'available') {
      await client.query(
        `UPDATE game_missions
            SET status = 'in_progress', started_at = COALESCE(started_at, now())
          WHERE game_id = $1 AND mission_number = $2`,
        [game.id, missionNumber],
      );
      await client.query(`UPDATE games SET current_mission = $1 WHERE id = $2`, [
        missionNumber,
        game.id,
      ]);
      await logEvent(client, {
        userId,
        gameId: game.id,
        type: 'mission_started',
        payload: { missionNumber },
      });
    }
  });

  return loadGameState(userId);
}

export async function interact(userId, missionNumber, objectiveKey) {
  const terminal = getTerminal(missionNumber, objectiveKey);
  if (!terminal) throw new ApiError(400, 'That object is not a security terminal.');

  const active = await findActiveGame(userId);
  if (!active) throw new ApiError(409, 'Start a new game before using a terminal.');

  // Fast path: reuse a live puzzle instead of asking the Banana API again.
  const existing = await loadOpenRound(active.id);
  if (existing && secondsRemaining(existing) > 0) {
    if (
      Number(existing.mission_number) === Number(missionNumber) &&
      existing.objective_key === objectiveKey
    ) {
      return { round: serializeRound(existing), state: await loadGameState(userId) };
    }
    throw new ApiError(409, 'Finish the open security terminal before opening another.');
  }

  // Fetch outside the transaction so a slow external API never holds row locks.
  const puzzle = await fetchPuzzle();

  const result = await withTransaction(async (client) => {
    const { rows: gameRows } = await client.query(
      `SELECT * FROM games WHERE id = $1 AND user_id = $2 FOR UPDATE`,
      [active.id, userId],
    );
    const game = gameRows[0];
    if (!game || game.status !== 'active') {
      throw new ApiError(409, 'This run has already ended. Start a new one.');
    }

    const { rows: openRows } = await client.query(
      `SELECT *,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (expires_at - now()))))::int AS remaining_seconds
         FROM rounds
        WHERE game_id = $1 AND status = 'open'
        FOR UPDATE`,
      [game.id],
    );
    const openRound = openRows[0];

    let lifeLost = false;
    let gameOver = false;
    let currentGame = game;

    if (openRound) {
      if (secondsRemaining(openRound) > 0) {
        return { round: openRound, game: currentGame, lifeLost: false, gameOver: false };
      }

      await client.query(
        `UPDATE rounds SET status = 'expired', answered_at = now() WHERE id = $1 AND status = 'open'`,
        [openRound.id],
      );
      const loss = await loseLife(client, userId, currentGame);
      currentGame = loss.game;
      lifeLost = true;
      gameOver = loss.gameOver;

      await logEvent(client, {
        userId,
        gameId: game.id,
        type: 'life_lost',
        payload: { reason: 'timeout', roundId: openRound.id },
      });

      if (gameOver) {
        return { round: null, game: currentGame, lifeLost, gameOver };
      }
    }

    await ensureMissionRows(client, game.id);

    const { rows: missionRows } = await client.query(
      `SELECT * FROM game_missions WHERE game_id = $1 AND mission_number = $2 FOR UPDATE`,
      [game.id, missionNumber],
    );
    const missionRow = missionRows[0];

    if (!missionRow || missionRow.status === 'locked') {
      throw new ApiError(409, 'That mission is still locked.');
    }
    if (missionRow.status === 'completed') {
      throw new ApiError(409, 'That mission has already been completed.');
    }

    const { rowCount: solved } = await client.query(
      `SELECT 1 FROM rounds
        WHERE game_id = $1 AND mission_number = $2 AND objective_key = $3 AND status = 'correct'`,
      [game.id, missionNumber, objectiveKey],
    );
    if (solved > 0) {
      throw new ApiError(409, 'That terminal has already been bypassed.');
    }

    if (missionRow.status === 'available') {
      await client.query(
        `UPDATE game_missions
            SET status = 'in_progress', started_at = COALESCE(started_at, now())
          WHERE game_id = $1 AND mission_number = $2`,
        [game.id, missionNumber],
      );
      await logEvent(client, {
        userId,
        gameId: game.id,
        type: 'mission_started',
        payload: { missionNumber },
      });
    }

    const { rows: roundRows } = await client.query(
      `INSERT INTO rounds
         (game_id, question_url, solution, mission_number, objective_key, expires_at)
       VALUES ($1, $2, $3, $4, $5, now() + interval '45 seconds')
       RETURNING *, 45 AS remaining_seconds`,
      [game.id, puzzle.questionUrl, puzzle.solution, missionNumber, objectiveKey],
    );

    await logEvent(client, {
      userId,
      gameId: game.id,
      type: 'puzzle_generated',
      payload: { missionNumber, objectiveKey, roundId: roundRows[0].id },
    });

    return { round: roundRows[0], game: currentGame, lifeLost, gameOver: false };
  });

  return {
    round: serializeRound(result.round),
    lifeLost: result.lifeLost,
    gameOver: result.gameOver,
    game: result.game ? publicGame(result.game) : null,
    state: await loadGameState(userId),
  };
}

export async function submitAnswer(userId, roundId, answer) {
  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT r.*,
              g.user_id,
              g.status AS game_status,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (r.expires_at - now()))))::int AS remaining_seconds,
              (r.expires_at IS NOT NULL AND r.expires_at <= now()) AS expired
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

    const baseGame = {
      id: round.game_id,
      user_id: userId,
    };

    // Expired answers do not count. The round is closed first so a simultaneous
    // timeout request can never deduct a second life.
    if (round.expired) {
      await client.query(
        `UPDATE rounds
            SET status = 'expired', answered_at = now(), submitted_answer = $1
          WHERE id = $2 AND status = 'open'`,
        [answer, roundId],
      );
      const { rows: gameRows } = await client.query(
        `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
        [round.game_id],
      );
      const loss = await loseLife(client, userId, gameRows[0] ?? baseGame);
      await logEvent(client, {
        userId,
        gameId: round.game_id,
        type: 'life_lost',
        payload: { reason: 'timeout', roundId },
      });
      return {
        expired: true,
        correct: false,
        points: 0,
        lifeLost: true,
        gameOver: loss.gameOver,
        game: loss.game,
        user: loss.user,
        achievements: [],
      };
    }

    const correct = Number(answer) === Number(round.solution);
    const points = correct ? (round.hint_used ? HINT_POINTS_PER_PUZZLE : POINTS_PER_PUZZLE) : 0;

    await client.query(
      `UPDATE rounds
          SET status = $1,
              answered_at = now(),
              submitted_answer = $2,
              points_awarded = $3
        WHERE id = $4 AND status = 'open'`,
      [correct ? 'correct' : 'wrong', answer, points, roundId],
    );

    let game;
    let gameOver = false;
    let user = null;
    const achievements = [];

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

      await logEvent(client, {
        userId,
        gameId: game.id,
        type: 'puzzle_solved',
        payload: { roundId, points, missionNumber: round.mission_number, objectiveKey: round.objective_key },
      });

      const completion =
        round.mission_number !== null
          ? await missionCompletion(client, userId, game, Number(round.mission_number))
          : null;

      if (completion) {
        game = completion.game;
        achievements.push(...completion.achievements);
      }

      if (completion?.user) user = completion.user;

      if (completion?.victory) {
        gameOver = true;
      } else {
        const earned = await evaluateAchievements(client, {
          userId,
          game,
          missionNumber: null,
        });
        achievements.push(...earned);
      }

      return {
        expired: false,
        correct: true,
        points,
        correctAnswer: round.solution,
        missionCompleted: completion
          ? {
              number: completion.mission.number,
              title: completion.mission.title,
              bonus: completion.bonus,
              resources: completion.mission.resources,
              victory: completion.victory,
              victoryBonus: completion.victoryBonus,
              unlockedMission: completion.unlockedMission,
            }
          : null,
        lifeLost: false,
        gameOver,
        game,
        user,
        achievements,
      };
    }

    const { rows: gameRows } = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [round.game_id],
    );
    const loss = await loseLife(client, userId, gameRows[0] ?? baseGame);
    game = loss.game;
    gameOver = loss.gameOver;
    user = loss.user;

    await logEvent(client, {
      userId,
      gameId: round.game_id,
      type: 'life_lost',
      payload: { reason: 'wrong_answer', roundId },
    });

    if (gameOver) {
      await logEvent(client, {
        userId,
        gameId: round.game_id,
        type: 'game_over',
        payload: { score: game.score },
      });
    }

    return {
      expired: false,
      correct: false,
      points: 0,
      correctAnswer: round.solution,
      missionCompleted: null,
      lifeLost: true,
      gameOver,
      game,
      user,
      achievements: [],
    };
  });

  return {
    ...outcome,
    game: publicGame(outcome.game),
    user: outcome.user ? publicUser(outcome.user) : null,
    state: await loadGameState(userId),
  };
}

export async function useHint(userId, roundId) {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT r.*,
              g.status AS game_status,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (r.expires_at - now()))))::int AS remaining_seconds,
              (r.expires_at IS NOT NULL AND r.expires_at <= now()) AS expired
         FROM rounds r
         JOIN games g ON g.id = r.game_id
        WHERE r.id = $1 AND g.user_id = $2
        FOR UPDATE OF r, g`,
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
    if (round.expired) {
      await client.query(
        `UPDATE rounds SET status = 'expired', answered_at = now() WHERE id = $1 AND status = 'open'`,
        [roundId],
      );
      const { rows: gameRows } = await client.query(
        `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
        [round.game_id],
      );
      const loss = await loseLife(client, userId, gameRows[0]);
      await logEvent(client, {
        userId,
        gameId: round.game_id,
        type: 'life_lost',
        payload: { reason: 'timeout', roundId },
      });
      return { expired: true, gameOver: loss.gameOver, game: loss.game };
    }

    if (!round.hint_used) {
      await client.query(`UPDATE rounds SET hint_used = true WHERE id = $1`, [roundId]);
      const { rows: gameRows } = await client.query(
        `UPDATE games SET hints_used = hints_used + 1 WHERE id = $1 RETURNING *`,
        [round.game_id],
      );
      round.hint_used = true;
      await logEvent(client, {
        userId,
        gameId: round.game_id,
        type: 'hint_requested',
        payload: { roundId },
      });
      return { expired: false, gameOver: false, round, game: gameRows[0] };
    }

    const { rows: gameRows } = await client.query(`SELECT * FROM games WHERE id = $1`, [
      round.game_id,
    ]);
    return { expired: false, gameOver: false, round, game: gameRows[0] };
  });

  return {
    expired: result.expired,
    gameOver: result.gameOver,
    game: result.game ? publicGame(result.game) : null,
    round: result.round ? serializeRound(result.round) : null,
    state: await loadGameState(userId),
  };
}

export async function timeoutRound(userId, roundId) {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT r.*,
              g.status AS game_status,
              GREATEST(0, CEIL(EXTRACT(EPOCH FROM (r.expires_at - now()))))::int AS remaining_seconds,
              (r.expires_at IS NOT NULL AND r.expires_at <= now()) AS expired
         FROM rounds r
         JOIN games g ON g.id = r.game_id
        WHERE r.id = $1 AND g.user_id = $2
        FOR UPDATE OF r, g`,
      [roundId, userId],
    );

    const round = rows[0];
    if (!round) throw new ApiError(404, 'Puzzle not found.');

    if (round.status !== 'open') {
      return { expired: round.status === 'expired', alreadyHandled: true, gameOver: false };
    }

    if (!round.expired) {
      return { expired: false, alreadyHandled: true, gameOver: false };
    }

    await client.query(
      `UPDATE rounds SET status = 'expired', answered_at = now() WHERE id = $1 AND status = 'open'`,
      [roundId],
    );
    const { rows: gameRows } = await client.query(
      `SELECT * FROM games WHERE id = $1 FOR UPDATE`,
      [round.game_id],
    );
    const loss = await loseLife(client, userId, gameRows[0]);
    await logEvent(client, {
      userId,
      gameId: round.game_id,
      type: 'life_lost',
      payload: { reason: 'timeout', roundId },
    });

    if (loss.gameOver) {
      await logEvent(client, {
        userId,
        gameId: round.game_id,
        type: 'game_over',
        payload: { score: loss.game.score },
      });
    }

    return {
      expired: true,
      alreadyHandled: false,
      lifeLost: true,
      gameOver: loss.gameOver,
      game: loss.game,
    };
  });

  return {
    ...result,
    game: result.game ? publicGame(result.game) : null,
    state: await loadGameState(userId),
  };
}

export async function restartRun(userId) {
  return startRun(userId, 'new');
}

export async function abandonRun(userId) {
  await withTransaction(async (client) => {
    const active = await findActiveGame(userId, client);
    if (!active) return;

    const { rows: openRows } = await client.query(
      `SELECT id FROM rounds WHERE game_id = $1 AND status = 'open' FOR UPDATE`,
      [active.id],
    );
    if (openRows[0]) {
      await client.query(
        `UPDATE rounds SET status = 'expired', answered_at = now() WHERE id = $1`,
        [openRows[0].id],
      );
    }

    const finalized = await finalizeRun(client, userId, active, 'abandoned');
    await logEvent(client, {
      userId,
      gameId: active.id,
      type: 'game_abandoned',
      payload: { score: finalized.finished?.score ?? active.score },
    });
  });

  return loadGameState(userId);
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function parsePagination(page, pageSize) {
  const size = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number.parseInt(pageSize, 10) || DEFAULT_PAGE_SIZE),
  );
  const requested = Math.max(1, Number.parseInt(page, 10) || 1);

  return { requested, size };
}

function paginate(total, { requested, size }) {
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(requested, totalPages);
  const offset = (page - 1) * size;

  return { page, pageSize: size, totalPages, offset };
}

const RANKED_STATS_CTE = `WITH stats AS (
   SELECT u.id,
          u.username,
          u.best_score,
          u.best_streak,
          u.total_score,
          u.games_played,
          COALESCE(SUM(g.missions_completed), 0)::int AS missions_completed,
          COALESCE(MAX(g.score), 0)::int AS best_game_score
     FROM users u
     LEFT JOIN games g ON g.user_id = u.id AND g.status = 'finished'
    GROUP BY u.id
 ), ranked AS (
   SELECT *,
          ROW_NUMBER() OVER (
            ORDER BY total_score DESC, missions_completed DESC, best_score DESC, username ASC
          ) AS rank
     FROM stats
    WHERE games_played > 0
 )`;

function serializeLeaderboardRow(row) {
  return {
    id: row.id,
    username: row.username,
    bestScore: row.best_score,
    bestStreak: row.best_streak,
    totalScore: row.total_score,
    gamesPlayed: row.games_played,
    missionsCompleted: row.missions_completed,
    bestGameScore: row.best_game_score,
    rank: Number(row.rank),
  };
}

async function globalRankFor(userId) {
  const { rows } = await query(`${RANKED_STATS_CTE} SELECT rank FROM ranked WHERE id = $1`, [userId]);
  return rows[0] ? Number(rows[0].rank) : null;
}

export async function getLeaderboard(userId, { page, pageSize } = {}) {
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM users WHERE games_played > 0`,
  );
  const totalPlayers = countRows[0].total;
  const pagination = paginate(totalPlayers, parsePagination(page, pageSize));

  const { rows } = await query(
    `${RANKED_STATS_CTE}
     SELECT * FROM ranked ORDER BY rank LIMIT $1 OFFSET $2`,
    [pagination.pageSize, pagination.offset],
  );

  const { rows: meRows } = await query(
    `${RANKED_STATS_CTE} SELECT * FROM ranked WHERE id = $1`,
    [userId],
  );

  return {
    leaderboard: rows.map(serializeLeaderboardRow),
    me: meRows[0] ? serializeLeaderboardRow(meRows[0]) : null,
    totalPlayers,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
  };
}

async function loadCareerStats(userId) {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total_runs,
            COALESCE(SUM(CASE WHEN outcome = 'won' THEN 1 ELSE 0 END), 0)::int AS victories,
            COALESCE(SUM(missions_completed), 0)::int AS missions_completed,
            COALESCE(SUM(correct_answers), 0)::int AS puzzles_solved,
            COALESCE(SUM(hints_used), 0)::int AS hints_used
       FROM games
      WHERE user_id = $1 AND status = 'finished'`,
    [userId],
  );
  const stats = rows[0] ?? {};

  return {
    totalRuns: stats.total_runs ?? 0,
    victories: stats.victories ?? 0,
    missionsCompleted: stats.missions_completed ?? 0,
    puzzlesSolved: stats.puzzles_solved ?? 0,
    hintsUsed: stats.hints_used ?? 0,
  };
}

export async function getScoreSummary(userId) {
  const user = await loadUser(userId);

  return {
    user: publicUser(user),
    rank: rankForScore(user.total_score),
    globalRank: user.games_played > 0 ? await globalRankFor(userId) : null,
    stats: await loadCareerStats(userId),
    achievements: await loadAchievements(userId),
  };
}

export async function getPlayerProfile(username) {
  const { rows } = await query(
    `SELECT id, username, best_score, best_streak, total_score, games_played, created_at
       FROM users
      WHERE lower(username) = lower($1)
      LIMIT 1`,
    [String(username ?? '').trim()],
  );

  const user = rows[0];
  if (!user) return null;

  const history = await getHistory(user.id, { pageSize: 5 });

  return {
    user: {
      id: user.id,
      username: user.username,
      bestScore: user.best_score,
      totalScore: user.total_score,
      bestStreak: user.best_streak,
      gamesPlayed: user.games_played,
      createdAt: user.created_at,
    },
    rank: rankForScore(user.total_score),
    globalRank: user.games_played > 0 ? await globalRankFor(user.id) : null,
    stats: await loadCareerStats(user.id),
    achievements: await loadAchievements(user.id),
    runs: history.runs,
    totalRuns: history.totalRuns,
  };
}

export async function getHistory(userId, { page, pageSize } = {}) {
  const { rows: countRows } = await query(
    `SELECT COUNT(*)::int AS total FROM games WHERE user_id = $1 AND status = 'finished'`,
    [userId],
  );
  const totalRuns = countRows[0].total;
  const pagination = paginate(totalRuns, parsePagination(page, pageSize));

  const { rows } = await query(
    `SELECT id, score, missions_completed, outcome, correct_answers, max_streak,
            hints_used, started_at, finished_at
       FROM games
      WHERE user_id = $1 AND status = 'finished'
      ORDER BY finished_at DESC NULLS LAST
      LIMIT $2 OFFSET $3`,
    [userId, pagination.pageSize, pagination.offset],
  );

  return {
    runs: rows.map((row) => ({
      id: row.id,
      score: row.score,
      missionsCompleted: row.missions_completed,
      outcome: row.outcome,
      correctAnswers: row.correct_answers,
      maxStreak: row.max_streak,
      hintsUsed: row.hints_used,
      startedAt: row.started_at,
      finishedAt: row.finished_at,
    })),
    totalRuns,
    page: pagination.page,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
  };
}

export { STARTING_LIVES, MISSION_BONUS, VICTORY_BONUS, POINTS_PER_PUZZLE };
