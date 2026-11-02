/**
 * Small, dependency-free 2D helpers used by the exploration loop.
 * Geometry is intentionally client-side for smooth movement; the backend still
 * validates area membership, proximity and every meaningful interaction.
 */

export const PLAYER_HALF_W = 13;
export const PLAYER_HALF_H = 10;
export const WORLD_MARGIN = 18;

const SOLID_PROP_KINDS = new Set([
  'crate',
  'turbine',
  'machine',
  'rack',
  'console',
  'tower',
  'rig',
  'hatch',
  'desk',
  'shelf',
  'debris',
]);

function overlaps(x, y, halfW, halfH, rect) {
  return (
    x + halfW > rect.x &&
    x - halfW < rect.x + rect.w &&
    y + halfH > rect.y &&
    y - halfH < rect.y + rect.h
  );
}

export function blockedRects(area) {
  return [...(area.walls ?? []), ...(area.props ?? []).filter((prop) => SOLID_PROP_KINDS.has(prop.kind))];
}

export function collidesAt(x, y, area, rects = blockedRects(area)) {
  if (
    x - PLAYER_HALF_W < WORLD_MARGIN ||
    y - PLAYER_HALF_H < WORLD_MARGIN ||
    x + PLAYER_HALF_W > area.width - WORLD_MARGIN ||
    y + PLAYER_HALF_H > area.height - WORLD_MARGIN
  ) {
    return true;
  }

  return rects.some((rect) => overlaps(x, y, PLAYER_HALF_W, PLAYER_HALF_H, rect));
}

/** Moves an entity with axis-separated collision and sub-pixel-safe steps. */
export function moveEntity({ x, y, dx, dy, area, rects }) {
  const distance = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(distance / 4));
  const stepX = dx / steps;
  const stepY = dy / steps;

  let nextX = x;
  let nextY = y;

  for (let index = 0; index < steps; index += 1) {
    if (stepX !== 0 && !collidesAt(nextX + stepX, nextY, area, rects)) {
      nextX += stepX;
    }
    if (stepY !== 0 && !collidesAt(nextX, nextY + stepY, area, rects)) {
      nextY += stepY;
    }
  }

  return { x: nextX, y: nextY };
}

export function nearestInteractable(player, objects, areaKey) {
  let best = null;
  let bestDistance = Infinity;

  for (const object of objects) {
    if (object.areaKey !== areaKey) continue;
    if (object.status === 'collected') continue;
    if (object.status === 'undiscovered') continue;
    if (object.terminal && object.status === 'completed') continue;

    const distance = Math.hypot(player.x - object.x, player.y - object.y);
    const radius = object.interactRadius ?? 86;
    if (distance <= radius && distance < bestDistance) {
      best = object;
      bestDistance = distance;
    }
  }

  return best;
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
