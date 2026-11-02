/**
 * Exploration service: loads the world, validates physical interactions and
 * persists object/objective/inventory progress. Every meaningful action is
 * checked on the server; the browser cannot declare an object unlocked.
 */

import { withTransaction } from '../db.js';
import { ApiError } from '../utils/http.js';
import { RESOURCE_LABELS } from '../game/missions.js';
import { getWorld, getWorldArea, publicWorld } from '../game/worlds.js';
import {
  applyPickup,
  completeObjective,
  consumeItem,
  ensureWorldRows,
  loadWorldSnapshot,
  markAreaDiscovered,
  setObjectStatus,
  syncObjectStates,
  syncObjectiveStates,
} from './world-state.js';
import { finishMission, interact as requestTerminalRound, loadGameState } from './game.js';
import { publicGame, publicUser } from '../utils/presenters.js';

const VALID_FACING = new Set(['up', 'down', 'left', 'right']);
const PLAYER_RADIUS = 14;

async function findActiveGame(client, userId, forUpdate = false) {
  const { rows } = await client.query(
    `SELECT * FROM games WHERE user_id = $1 AND status = 'active' ORDER BY id DESC LIMIT 1${
      forUpdate ? ' FOR UPDATE' : ''
    }`,
    [userId],
  );
  return rows[0] ?? null;
}

async function ensureMissionRow(client, gameId, missionNumber) {
  await client.query(
    `INSERT INTO game_missions (game_id, mission_number, status)
     VALUES ($1, $2, CASE WHEN $3::int = 1 THEN 'available' ELSE 'locked' END)
     ON CONFLICT (game_id, mission_number) DO NOTHING`,
    [gameId, missionNumber, missionNumber],
  );
  const { rows } = await client.query(
    `SELECT * FROM game_missions WHERE game_id = $1 AND mission_number = $2 FOR UPDATE`,
    [gameId, missionNumber],
  );
  return rows[0];
}

async function logEvent(client, userId, gameId, type, payload) {
  await client.query(
    `INSERT INTO game_events (user_id, game_id, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [userId, gameId, type, JSON.stringify(payload)],
  );
}

/**
 * Validates that the mission is unlocked, starts it when it is merely
 * available, creates any missing world rows and returns the locked snapshot.
 * Must be called inside an existing transaction.
 */
async function prepareContext(client, userId, missionNumber, objectKey = null) {
  const game = await findActiveGame(client, userId, true);
  if (!game) throw new ApiError(409, 'Start a new game before exploring.');

  const missionRow = await ensureMissionRow(client, game.id, missionNumber);
  if (!missionRow || missionRow.status === 'locked') {
    throw new ApiError(409, 'That mission is still locked.');
  }

  if (missionRow.status === 'available') {
    await client.query(
      `UPDATE game_missions
          SET status = 'in_progress', started_at = COALESCE(started_at, now())
        WHERE game_id = $1 AND mission_number = $2`,
      [game.id, missionNumber],
    );
    missionRow.status = 'in_progress';
    await client.query(`UPDATE games SET current_mission = $1 WHERE id = $2`, [
      missionNumber,
      game.id,
    ]);
    await logEvent(client, userId, game.id, 'mission_started', { missionNumber });
  }

  await ensureWorldRows(client, {
    gameId: game.id,
    missionNumber,
    missionStatus: missionRow.status,
    userId,
  });

  // Discovery and availability depend on the saved area, objectives and pack.
  await syncObjectiveStates(client, game.id, missionNumber);
  await syncObjectStates(client, game.id, missionNumber);

  const snapshot = await loadWorldSnapshot(client, game.id, missionNumber);
  const object = objectKey ? getWorld(missionNumber)?.objectMap.get(objectKey) ?? null : null;
  if (objectKey && !object) throw new ApiError(400, 'That object does not exist here.');

  return { game, missionRow, snapshot, object };
}

/** Builds the sanitised world payload. Must be called inside a transaction. */
async function buildWorldPayload(client, game, missionNumber, missionRow) {
  const definition = publicWorld(missionNumber);
  if (!definition) throw new ApiError(404, 'That location does not exist.');

  const snapshot = await loadWorldSnapshot(client, game.id, missionNumber);
  const objectRows = new Map(snapshot.objects.map((row) => [row.object_key, row]));
  const objectiveRows = new Map(snapshot.objectives.map((row) => [row.objective_key, row]));

  return {
    missionNumber,
    missionKey: definition.key,
    theme: definition.theme,
    missionStatus: missionRow?.status ?? 'in_progress',
    areas: definition.areas,
    objects: definition.objects.map((object) => {
      const row = objectRows.get(object.key);
      return {
        ...object,
        status: row?.status ?? 'undiscovered',
        discovered: Boolean(row?.discovered_at),
      };
    }),
    objectives: definition.objectives.map((objective) => {
      const row = objectiveRows.get(objective.key);
      return {
        ...objective,
        status: row?.status ?? 'locked',
      };
    }),
    state: {
      areaKey: snapshot.state.area_key,
      playerX: Number(snapshot.state.player_x),
      playerY: Number(snapshot.state.player_y),
      facing: snapshot.state.facing,
      introSeen: snapshot.state.intro_seen,
    },
    inventory: snapshot.inventory.map((item) => ({
      ...item,
      label: RESOURCE_LABELS[item.key] ?? item.key,
    })),
  };
}

function requireInRange(object, state) {
  const distance = Math.hypot(
    Number(state.player_x) - object.x,
    Number(state.player_y) - object.y,
  );
  const radius = object.interactRadius ?? 86;
  if (distance > radius) {
    throw new ApiError(409, `Move closer to ${object.label.toLowerCase()}.`);
  }
}

function requireObjectReady(object, snapshot) {
  const completed = new Set(
    snapshot.objectives
      .filter((row) => row.status === 'completed')
      .map((row) => row.objective_key),
  );
  const inventory = new Map(snapshot.inventory.map((item) => [item.key, item.quantity]));

  const missing = (object.requiresObjectives ?? []).filter((key) => !completed.has(key));
  if (missing.length > 0) {
    throw new ApiError(409, object.lockedLabel || 'This object is still locked.');
  }

  if (object.requiresItem) {
    const quantity = inventory.get(object.requiresItem.key) ?? 0;
    if (quantity < object.requiresItem.quantity) {
      throw new ApiError(409, `You need ${object.requiresItem.label}.`);
    }
  }
}

function clampPosition(area, x, y) {
  return {
    x: Math.min(Math.max(Number(x) || area.spawn.x, PLAYER_RADIUS), area.width - PLAYER_RADIUS),
    y: Math.min(Math.max(Number(y) || area.spawn.y, PLAYER_RADIUS), area.height - PLAYER_RADIUS),
  };
}

export async function loadWorld(userId, missionNumber) {
  if (!getWorld(missionNumber)) throw new ApiError(404, 'That location does not exist.');

  const world = await withTransaction(async (client) => {
    const { game, missionRow } = await prepareContext(client, userId, missionNumber);
    return buildWorldPayload(client, game, missionNumber, missionRow);
  });

  const state = await loadGameState(userId);
  return { world, state };
}

export async function savePosition(userId, missionNumber, input) {
  if (!getWorld(missionNumber)) throw new ApiError(404, 'That location does not exist.');

  const areaKey = String(input?.areaKey ?? '');
  const area = getWorldArea(missionNumber, areaKey);
  if (!area) throw new ApiError(400, 'Unknown area.');

  const facing = VALID_FACING.has(input?.facing) ? input.facing : 'down';
  const position = clampPosition(area, input?.x, input?.y);

  return withTransaction(async (client) => {
    const game = await findActiveGame(client, userId, true);
    if (!game) throw new ApiError(409, 'Start a new game before exploring.');

    const missionRow = await ensureMissionRow(client, game.id, missionNumber);
    if (!missionRow || missionRow.status === 'locked') {
      throw new ApiError(409, 'That mission is still locked.');
    }

    await ensureWorldRows(client, {
      gameId: game.id,
      missionNumber,
      missionStatus: missionRow.status,
      userId,
    });

    const { rows: previousRows } = await client.query(
      `SELECT area_key FROM game_world_state WHERE game_id = $1 AND mission_number = $2`,
      [game.id, missionNumber],
    );
    const previousArea = previousRows[0]?.area_key;

    await client.query(
      `UPDATE game_world_state
          SET area_key = $1, player_x = $2, player_y = $3, facing = $4, updated_at = now()
        WHERE game_id = $5 AND mission_number = $6`,
      [areaKey, position.x, position.y, facing, game.id, missionNumber],
    );

    await markAreaDiscovered(client, game.id, missionNumber, areaKey);

    if (previousArea !== areaKey) {
      await logEvent(client, userId, game.id, 'area_entered', {
        missionNumber,
        areaKey,
      });
    }

    await syncObjectiveStates(client, game.id, missionNumber);
    await syncObjectStates(client, game.id, missionNumber);

    return { state: { areaKey, ...position, facing } };
  });
}

export async function markIntroSeen(userId, missionNumber) {
  if (!getWorld(missionNumber)) throw new ApiError(404, 'That location does not exist.');

  await withTransaction(async (client) => {
    const { game } = await prepareContext(client, userId, missionNumber);
    await client.query(
      `UPDATE game_world_state SET intro_seen = true, updated_at = now()
        WHERE game_id = $1 AND mission_number = $2`,
      [game.id, missionNumber],
    );
  });

  return { ok: true };
}

/**
 * The single server-authoritative interaction endpoint. It validates area,
 * distance, prerequisites, item requirements and object state before applying
 * any reward. External puzzle requests happen outside the transaction.
 */
export async function interactWithObject(userId, missionNumber, objectKey) {
  if (!getWorld(missionNumber)) throw new ApiError(404, 'That location does not exist.');

  const outcome = await withTransaction(async (client) => {
    const { game, missionRow, snapshot, object } = await prepareContext(
      client,
      userId,
      missionNumber,
      objectKey,
    );

    if (missionRow.status === 'completed') {
      throw new ApiError(409, 'This location is already secure.');
    }

    if (object.areaKey !== snapshot.state.area_key) {
      throw new ApiError(
        409,
        `Move to the ${getWorldArea(missionNumber, object.areaKey)?.label ?? 'object'} first.`,
      );
    }

    requireInRange(object, snapshot.state);
    requireObjectReady(object, snapshot);

    const objectRow = snapshot.objects.find((row) => row.object_key === object.key);

    // A solved container can be opened once more to collect its contents.
    if (object.terminal && object.pickup?.length && objectRow.status === 'unlocked') {
      const items = await applyPickup(client, {
        gameId: game.id,
        missionNumber,
        object,
        userId,
      });
      return {
        kind: 'pickup',
        message: `Collected ${items.map((item) => `${item.label} ×${item.quantity}`).join(', ')}.`,
        items,
        world: await buildWorldPayload(client, game, missionNumber, missionRow),
      };
    }

    if (object.terminal) {
      if (objectRow.status === 'collected') {
        throw new ApiError(409, 'This container has already been emptied.');
      }
      if (objectRow.status === 'completed') {
        throw new ApiError(409, 'This terminal has already been bypassed.');
      }
      return { kind: 'terminal-pending' };
    }

    if (object.action === 'transition') {
      const target = getWorldArea(missionNumber, object.toArea);
      if (!target) throw new ApiError(409, 'That route is blocked.');

      await client.query(
        `UPDATE game_world_state
            SET area_key = $1, player_x = $2, player_y = $3, facing = 'down', updated_at = now()
          WHERE game_id = $4 AND mission_number = $5`,
        [
          target.key,
          object.spawn?.x ?? target.spawn.x,
          object.spawn?.y ?? target.spawn.y,
          game.id,
          missionNumber,
        ],
      );
      await markAreaDiscovered(client, game.id, missionNumber, target.key);
      await setObjectStatus(client, {
        gameId: game.id,
        missionNumber,
        objectKey: object.key,
        status: 'completed',
        userId,
        eventType: 'door_opened',
        payload: { toArea: object.toArea },
      });
      await logEvent(client, userId, game.id, 'area_entered', {
        missionNumber,
        areaKey: target.key,
      });
      await syncObjectiveStates(client, game.id, missionNumber);
      await syncObjectStates(client, game.id, missionNumber);

      return {
        kind: 'transition',
        message: target.label,
        areaKey: target.key,
        world: await buildWorldPayload(client, game, missionNumber, missionRow),
      };
    }

    if (object.action === 'exit') {
      if (object.objectiveKey) {
        await completeObjective(client, {
          gameId: game.id,
          missionNumber,
          objectiveKey: object.objectiveKey,
          userId,
        });
      }
      const completion = await finishMission(client, userId, game, missionNumber);
      if (completion) missionRow.status = 'completed';

      return {
        kind: 'exit',
        message: completion?.victory ? 'The Last Signal is live.' : 'Location secured.',
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
        game: completion?.game ? publicGame(completion.game) : null,
        user: completion?.user ? publicUser(completion.user) : null,
        achievements: completion?.achievements ?? [],
        world: await buildWorldPayload(client, game, missionNumber, missionRow),
      };
    }

    if (object.action === 'refuel' || object.action === 'repair' || object.action === 'activate') {
      if (object.requiresItem) {
        const consumed = await consumeItem(client, {
          gameId: game.id,
          missionNumber,
          item: object.requiresItem,
          objectKey: object.key,
          userId,
        });
        if (!consumed) throw new ApiError(409, `You need ${object.requiresItem.label}.`);
      }

      await setObjectStatus(client, {
        gameId: game.id,
        missionNumber,
        objectKey: object.key,
        status: 'completed',
        userId,
        eventType: 'equipment_activated',
        payload: { action: object.action },
      });
      await completeObjective(client, {
        gameId: game.id,
        missionNumber,
        objectiveKey: object.objectiveKey,
        userId,
      });

      return {
        kind: 'action',
        message:
          object.action === 'refuel'
            ? 'Generator refuelled.'
            : object.action === 'repair'
              ? 'Console repaired.'
              : 'Equipment activated.',
        world: await buildWorldPayload(client, game, missionNumber, missionRow),
      };
    }

    if (object.pickup?.length) {
      if (objectRow.status === 'collected') {
        throw new ApiError(409, 'This item has already been collected.');
      }
      const items = await applyPickup(client, {
        gameId: game.id,
        missionNumber,
        object,
        userId,
      });
      return {
        kind: 'pickup',
        message: `Collected ${items.map((item) => `${item.label} ×${item.quantity}`).join(', ')}.`,
        items,
        world: await buildWorldPayload(client, game, missionNumber, missionRow),
      };
    }

    await setObjectStatus(client, {
      gameId: game.id,
      missionNumber,
      objectKey: object.key,
      status: 'completed',
      userId,
      eventType: 'object_inspected',
    });
    await completeObjective(client, {
      gameId: game.id,
      missionNumber,
      objectiveKey: object.objectiveKey,
      userId,
    });

    return {
      kind: 'note',
      message: object.label,
      text: object.text || object.description || '',
      world: await buildWorldPayload(client, game, missionNumber, missionRow),
    };
  });

  if (outcome.kind === 'terminal-pending') {
    return openTerminal(userId, missionNumber, objectKey);
  }

  const state = await loadGameState(userId);
  return { ...outcome, state };
}

/**
 * Wraps terminal creation so the browser cannot open a puzzle without first
 * passing the proximity and prerequisite checks in interactWithObject.
 */
export async function openTerminal(userId, missionNumber, objectKey) {
  // Validate the object before loading any game state. An unknown or
  // non-terminal object must never open a cipher round, even when the player
  // has no active run.
  const definition = getWorld(missionNumber);
  if (!definition) throw new ApiError(404, 'That location does not exist.');
  if (!definition.objectMap.get(objectKey)?.terminal) {
    throw new ApiError(400, 'That object is not a security terminal.');
  }

  // Run the full validation and keep the puzzle request outside the transaction.
  const pending = await withTransaction(async (client) => {
    const { game, missionRow, snapshot, object } = await prepareContext(
      client,
      userId,
      missionNumber,
      objectKey,
    );

    // Reject unknown or non-terminal objects before touching mission state, so
    // a bad request can never consume a cipher round.
    if (!object?.terminal) throw new ApiError(400, 'That object is not a security terminal.');
    if (missionRow.status === 'completed') {
      throw new ApiError(409, 'This location is already secure.');
    }
    if (object.areaKey !== snapshot.state.area_key) {
      throw new ApiError(
        409,
        `Move to the ${getWorldArea(missionNumber, object.areaKey)?.label ?? 'object'} first.`,
      );
    }

    requireInRange(object, snapshot.state);
    requireObjectReady(object, snapshot);

    const objectRow = snapshot.objects.find((row) => row.object_key === object.key);
    if (objectRow.status === 'completed') {
      throw new ApiError(409, 'This terminal has already been bypassed.');
    }

    return { gameId: game.id };
  });

  const roundResult = await requestTerminalRound(userId, missionNumber, objectKey);

  const world = await withTransaction(async (client) => {
    const { game, missionRow } = await prepareContext(client, userId, missionNumber);
    await setObjectStatus(client, {
      gameId: pending.gameId,
      missionNumber,
      objectKey,
      status: 'in_progress',
      userId,
      eventType: 'object_interacted',
      payload: { kind: 'security_terminal' },
    });
    return buildWorldPayload(client, game, missionNumber, missionRow);
  });

  const state = roundResult.state ?? (await loadGameState(userId));
  return {
    kind: 'terminal',
    round: roundResult.round,
    lifeLost: roundResult.lifeLost,
    gameOver: roundResult.gameOver,
    game: roundResult.game ?? null,
    world,
    state,
  };
}

/**
 * @deprecated Compatibility alias for the original /game/interact endpoint.
 * Both routes now use the same proximity-validated interaction path.
 */
export async function legacyInteract(userId, missionNumber, objectKey) {
  const result = await openTerminal(userId, missionNumber, objectKey);
  if (result.kind !== 'terminal') return result;
  return {
    round: result.round,
    lifeLost: result.lifeLost,
    gameOver: result.gameOver,
    game: result.game,
    state: result.state,
  };
}

export async function worldForGame(gameId, missionNumber) {
  if (!getWorld(missionNumber)) return null;
  return withTransaction(async (client) => {
    const { rows } = await client.query(`SELECT * FROM games WHERE id = $1`, [gameId]);
    const game = rows[0];
    if (!game) return null;
    const { rows: missionRows } = await client.query(
      `SELECT * FROM game_missions WHERE game_id = $1 AND mission_number = $2`,
      [gameId, missionNumber],
    );
    return buildWorldPayload(client, game, missionNumber, missionRows[0]);
  });
}
