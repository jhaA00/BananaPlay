/**
 * Low-level persistence for exploration state.
 *
 * This module deliberately has no dependency on the puzzle or scoring service
 * so it can be used inside existing game transactions without circular imports.
 */

import { getWorld, getWorldObject } from '../game/worlds.js';

export async function loadWorldStateRow(client, gameId, missionNumber) {
  const { rows } = await client.query(
    `SELECT * FROM game_world_state WHERE game_id = $1 AND mission_number = $2`,
    [gameId, missionNumber],
  );
  return rows[0] ?? null;
}

export async function loadObjectRows(client, gameId, missionNumber) {
  const { rows } = await client.query(
    `SELECT * FROM game_objects WHERE game_id = $1 AND mission_number = $2 ORDER BY object_key`,
    [gameId, missionNumber],
  );
  return rows;
}

export async function loadObjectiveRows(client, gameId, missionNumber) {
  const { rows } = await client.query(
    `SELECT * FROM game_objectives WHERE game_id = $1 AND mission_number = $2 ORDER BY objective_key`,
    [gameId, missionNumber],
  );
  return rows;
}

export async function loadInventory(client, gameId) {
  const { rows } = await client.query(
    `SELECT resource_key, quantity FROM game_resources
      WHERE game_id = $1 AND quantity > 0
      ORDER BY resource_key`,
    [gameId],
  );
  return rows.map((row) => ({ key: row.resource_key, quantity: Number(row.quantity) }));
}

async function logEvent(client, userId, gameId, type, payload) {
  if (!userId) return;
  await client.query(
    `INSERT INTO game_events (user_id, game_id, event_type, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [userId, gameId, type, JSON.stringify(payload)],
  );
}

export async function markAreaDiscovered(client, gameId, missionNumber, areaKey) {
  await client.query(
    `UPDATE game_objects
        SET status = CASE WHEN status = 'undiscovered' THEN 'discovered' ELSE status END,
            discovered_at = COALESCE(discovered_at, now())
      WHERE game_id = $1 AND mission_number = $2
        AND object_key = ANY($3::text[])`,
    [
      gameId,
      missionNumber,
      getWorld(missionNumber)
        ?.objects.filter((object) => object.areaKey === areaKey)
        .map((object) => object.key) ?? [],
    ],
  );
}

export async function syncObjectiveStates(client, gameId, missionNumber) {
  const world = getWorld(missionNumber);
  if (!world) return new Map();

  const rows = await loadObjectiveRows(client, gameId, missionNumber);
  const byKey = new Map(rows.map((row) => [row.objective_key, row]));
  const completed = new Set(
    rows.filter((row) => row.status === 'completed').map((row) => row.objective_key),
  );

  for (const objective of world.objectives) {
    const done = completed.has(objective.key);
    const requires = objective.requires ?? [];
    const unlocked = requires.every((key) => completed.has(key));
    const status = done ? 'completed' : unlocked ? 'pending' : 'locked';
    const row = byKey.get(objective.key);

    if (!row) {
      await client.query(
        `INSERT INTO game_objectives (game_id, mission_number, objective_key, status, completed_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (game_id, mission_number, objective_key) DO NOTHING`,
        [gameId, missionNumber, objective.key, status, done ? new Date() : null],
      );
    } else if (row.status !== status) {
      await client.query(
        `UPDATE game_objectives SET status = $1 WHERE game_id = $2 AND mission_number = $3 AND objective_key = $4`,
        [status, gameId, missionNumber, objective.key],
      );
    }
  }

  return completed;
}

export async function syncObjectStates(client, gameId, missionNumber) {
  const world = getWorld(missionNumber);
  if (!world) return;

  const state = await loadWorldStateRow(client, gameId, missionNumber);
  const rows = await loadObjectRows(client, gameId, missionNumber);
  const byKey = new Map(rows.map((row) => [row.object_key, row]));
  const { rows: objectiveRows } = await client.query(
    `SELECT objective_key FROM game_objectives
      WHERE game_id = $1 AND mission_number = $2 AND status = 'completed'`,
    [gameId, missionNumber],
  );
  const completedObjectives = new Set(objectiveRows.map((row) => row.objective_key));
  const inventory = new Map(
    (await loadInventory(client, gameId)).map((item) => [item.key, item.quantity]),
  );

  for (const object of world.objects) {
    const row = byKey.get(object.key);
    if (!row) continue;
    if (['completed', 'collected', 'unlocked', 'in_progress'].includes(row.status)) continue;

    const inCurrentArea = state?.area_key === object.areaKey;
    const discovered = Boolean(row.discovered_at) || inCurrentArea;
    if (discovered && !row.discovered_at) {
      await client.query(
        `UPDATE game_objects
            SET discovered_at = now(), status = 'discovered'
          WHERE game_id = $1 AND mission_number = $2 AND object_key = $3`,
        [gameId, missionNumber, object.key],
      );
    }

    const objectivesMet = (object.requiresObjectives ?? []).every((key) =>
      completedObjectives.has(key),
    );
    const itemMet =
      !object.requiresItem ||
      (inventory.get(object.requiresItem.key) ?? 0) >= object.requiresItem.quantity;
    const status = !discovered ? 'undiscovered' : objectivesMet && itemMet ? 'available' : 'locked';

    if (row.status !== status) {
      await client.query(
        `UPDATE game_objects SET status = $1
          WHERE game_id = $2 AND mission_number = $3 AND object_key = $4`,
        [status, gameId, missionNumber, object.key],
      );
    }
  }
}

/**
 * Creates any missing world rows, reconciles existing puzzle rounds and marks
 * the current area's objects as discovered. Safe to call repeatedly.
 */
export async function ensureWorldRows(
  client,
  { gameId, missionNumber, missionStatus, userId },
) {
  const world = getWorld(missionNumber);
  if (!world) return;

  const startingArea = world.areas[0];
  await client.query(
    `INSERT INTO game_world_state
       (game_id, mission_number, area_key, player_x, player_y, facing)
     VALUES ($1, $2, $3, $4, $5, 'down')
     ON CONFLICT (game_id, mission_number) DO NOTHING`,
    [gameId, missionNumber, startingArea.key, startingArea.spawn.x, startingArea.spawn.y],
  );

  for (const object of world.objects) {
    await client.query(
      `INSERT INTO game_objects (game_id, mission_number, object_key, status)
       VALUES ($1, $2, $3, 'undiscovered')
       ON CONFLICT (game_id, mission_number, object_key) DO NOTHING`,
      [gameId, missionNumber, object.key],
    );
  }

  for (const objective of world.objectives) {
    await client.query(
      `INSERT INTO game_objectives (game_id, mission_number, objective_key, status)
       VALUES ($1, $2, $3, 'locked')
       ON CONFLICT (game_id, mission_number, objective_key) DO NOTHING`,
      [gameId, missionNumber, objective.key],
    );
  }

  const { rows: solved } = await client.query(
    `SELECT DISTINCT objective_key FROM rounds
      WHERE game_id = $1 AND mission_number = $2 AND status = 'correct'`,
    [gameId, missionNumber],
  );
  for (const row of solved) {
    const object = getWorldObject(missionNumber, row.objective_key);
    if (!object) continue;
    const status = object.pickup?.length ? 'unlocked' : 'completed';
    await client.query(
      `UPDATE game_objects
          SET status = $1,
              completed_at = CASE WHEN $5::text = 'completed' THEN COALESCE(completed_at, now()) ELSE completed_at END,
              discovered_at = COALESCE(discovered_at, now())
        WHERE game_id = $2 AND mission_number = $3 AND object_key = $4
          AND status NOT IN ('completed', 'collected')`,
      [status, gameId, missionNumber, row.objective_key, status],
    );
    if (object.objectiveKey) {
      await client.query(
        `UPDATE game_objectives
            SET status = 'completed', completed_at = COALESCE(completed_at, now())
          WHERE game_id = $1 AND mission_number = $2 AND objective_key = $3`,
        [gameId, missionNumber, object.objectiveKey],
      );
    }
  }

  const { rows: open } = await client.query(
    `SELECT objective_key FROM rounds
      WHERE game_id = $1 AND mission_number = $2 AND status = 'open'`,
    [gameId, missionNumber],
  );
  for (const row of open) {
    await client.query(
      `UPDATE game_objects
          SET status = 'in_progress', discovered_at = COALESCE(discovered_at, now())
        WHERE game_id = $1 AND mission_number = $2 AND object_key = $3
          AND status NOT IN ('completed', 'collected', 'unlocked')`,
      [gameId, missionNumber, row.objective_key],
    );
  }

  if (missionStatus === 'completed') {
    await client.query(
      `UPDATE game_objectives
          SET status = 'completed', completed_at = COALESCE(completed_at, now())
        WHERE game_id = $1 AND mission_number = $2`,
      [gameId, missionNumber],
    );
    await client.query(
      `UPDATE game_objects
          SET status = CASE
                         WHEN status = 'collected' THEN 'collected'
                         WHEN object_key = ANY($3::text[]) THEN 'collected'
                         ELSE 'completed'
                       END,
              discovered_at = COALESCE(discovered_at, now()),
              completed_at = COALESCE(completed_at, now())
        WHERE game_id = $1 AND mission_number = $2`,
      [
        gameId,
        missionNumber,
        world.objects.filter((object) => object.pickup?.length).map((object) => object.key),
      ],
    );
  }

  const state = await loadWorldStateRow(client, gameId, missionNumber);
  await markAreaDiscovered(client, gameId, missionNumber, state.area_key);
  await syncObjectiveStates(client, gameId, missionNumber);
  await syncObjectStates(client, gameId, missionNumber);
}

export async function completeObjective(
  client,
  { gameId, missionNumber, objectiveKey, userId, log = true },
) {
  if (!objectiveKey) return;
  const { rowCount } = await client.query(
    `UPDATE game_objectives
        SET status = 'completed', completed_at = COALESCE(completed_at, now())
      WHERE game_id = $1 AND mission_number = $2 AND objective_key = $3
        AND status <> 'completed'`,
    [gameId, missionNumber, objectiveKey],
  );

  if (rowCount > 0 && log) {
    await logEvent(client, userId, gameId, 'objective_completed', {
      missionNumber,
      objectiveKey,
    });
  }

  await syncObjectiveStates(client, gameId, missionNumber);
  await syncObjectStates(client, gameId, missionNumber);
}

export async function setObjectStatus(
  client,
  { gameId, missionNumber, objectKey, status, userId, eventType, payload = {} },
) {
  await client.query(
    `UPDATE game_objects
        SET status = $1,
            interacted_at = now(),
            completed_at = CASE WHEN $5::text IN ('completed', 'collected') THEN now() ELSE completed_at END,
            discovered_at = COALESCE(discovered_at, now())
      WHERE game_id = $2 AND mission_number = $3 AND object_key = $4`,
    [status, gameId, missionNumber, objectKey, status],
  );

  if (eventType) {
    await logEvent(client, userId, gameId, eventType, {
      missionNumber,
      objectKey,
      ...payload,
    });
  }
}

/** Called after a Banana cipher is answered correctly. */
export async function markTerminalSolved(
  client,
  { gameId, missionNumber, objectiveKey, userId },
) {
  const world = getWorld(missionNumber);
  if (!world) return;
  const object = getWorldObject(missionNumber, objectiveKey);
  const nextStatus = object?.pickup?.length ? 'unlocked' : 'completed';

  await setObjectStatus(client, {
    gameId,
    missionNumber,
    objectKey: objectiveKey,
    status: nextStatus,
    userId,
    eventType: nextStatus === 'unlocked' ? 'object_unlocked' : 'object_completed',
  });

  if (object?.objectiveKey) {
    await completeObjective(client, {
      gameId,
      missionNumber,
      objectiveKey: object.objectiveKey,
      userId,
    });
  } else {
    await completeObjective(client, {
      gameId,
      missionNumber,
      objectiveKey,
      userId,
    });
  }
}

export async function applyPickup(
  client,
  { gameId, missionNumber, object, userId },
) {
  const items = object.pickup ?? [];
  for (const item of items) {
    await client.query(
      `INSERT INTO game_resources (game_id, resource_key, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (game_id, resource_key)
       DO UPDATE SET quantity = game_resources.quantity + EXCLUDED.quantity`,
      [gameId, item.key, item.quantity],
    );
    await logEvent(client, userId, gameId, 'resource_collected', {
      missionNumber,
      objectKey: object.key,
      key: item.key,
      quantity: item.quantity,
    });
  }

  await setObjectStatus(client, {
    gameId,
    missionNumber,
    objectKey: object.key,
    status: 'collected',
    userId,
    eventType: 'object_collected',
    payload: { items },
  });

  const objectiveKeys = new Set(
    [object.pickupObjective, object.objectiveKey].filter(Boolean),
  );
  for (const objectiveKey of objectiveKeys) {
    await completeObjective(client, {
      gameId,
      missionNumber,
      objectiveKey,
      userId,
    });
  }

  return items;
}

export async function consumeItem(
  client,
  { gameId, missionNumber, item, objectKey, userId },
) {
  const { rows } = await client.query(
    `UPDATE game_resources
        SET quantity = GREATEST(quantity - $1, 0)
      WHERE game_id = $2 AND resource_key = $3 AND quantity >= $1
      RETURNING quantity`,
    [item.quantity, gameId, item.key],
  );

  if (!rows[0]) {
    return false;
  }

  await logEvent(client, userId, gameId, 'resource_used', {
    missionNumber,
    objectKey,
    key: item.key,
    quantity: item.quantity,
  });
  return true;
}

export async function loadWorldSnapshot(client, gameId, missionNumber) {
  const state = await loadWorldStateRow(client, gameId, missionNumber);
  const objects = await loadObjectRows(client, gameId, missionNumber);
  const objectives = await loadObjectiveRows(client, gameId, missionNumber);
  const inventory = await loadInventory(client, gameId);

  return { state, objects, objectives, inventory };
}
