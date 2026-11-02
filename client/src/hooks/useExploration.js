import { useCallback, useEffect, useRef, useState } from 'react';
import {
  blockedRects,
  clamp,
  moveEntity,
  nearestInteractable,
} from '../game/engine/geometry.js';
import { drawScene } from '../game/engine/renderer.js';

const SPEED = 236;
const SYNC_INTERVAL = 900;
const STOP_SYNC_DELAY = 420;
const CAPTION_MS = 2100;

const MOVE_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'arrowup',
  'arrowdown',
  'arrowleft',
  'arrowright',
]);

function isTypingTarget(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Drives movement, collision, the camera and proximity detection. Position is
 * persisted at a human pace; every reward-granting action is still validated by
 * the server against the last saved position.
 */
export default function useExploration({ world, active = true, onInteract, onPosition }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  const worldRef = useRef(world);
  worldRef.current = world;

  const activeRef = useRef(active);
  activeRef.current = active;

  const onInteractRef = useRef(onInteract);
  onInteractRef.current = onInteract;

  const onPositionRef = useRef(onPosition);
  onPositionRef.current = onPosition;

  const playerRef = useRef({ x: 0, y: 0, facing: 'down' });
  const areaRef = useRef(null);
  const missionRef = useRef(null);
  const cameraRef = useRef({ x: 0, y: 0, ready: false });
  const sizeRef = useRef({ width: 960, height: 540, dpr: 1 });
  const keysRef = useRef(new Set());
  const virtualRef = useRef(new Set());
  const movingRef = useRef(false);
  const dirtyRef = useRef(false);
  const lastMoveRef = useRef(0);
  const lastSyncRef = useRef(0);
  const nearestRef = useRef(null);

  const [nearest, setNearest] = useState(null);
  const [areaCaption, setAreaCaption] = useState(null);

  // Apply the server position when the mission or area changes. Same-area
  // refreshes keep the local, smoother position.
  useEffect(() => {
    const state = world?.state;
    if (!world || !state) return;

    const sameMission = missionRef.current === world.missionNumber;
    const areaChanged = areaRef.current !== state.areaKey;
    if (sameMission && !areaChanged) return;

    missionRef.current = world.missionNumber;
    areaRef.current = state.areaKey;
    playerRef.current = {
      x: Number(state.playerX),
      y: Number(state.playerY),
      facing: state.facing ?? 'down',
    };
    cameraRef.current.ready = false;
    keysRef.current.clear();
    virtualRef.current.clear();

    const area = world.areas.find((item) => item.key === state.areaKey);
    if (area) {
      setAreaCaption({
        key: `${area.key}-${Date.now()}`,
        label: area.label,
        subtitle: area.subtitle ?? '',
      });
    }
  }, [world]);

  useEffect(() => {
    if (!areaCaption) return undefined;
    const timer = window.setTimeout(() => setAreaCaption(null), CAPTION_MS);
    return () => window.clearTimeout(timer);
  }, [areaCaption]);

  useEffect(() => {
    if (active) return;
    keysRef.current.clear();
    virtualRef.current.clear();
    movingRef.current = false;
  }, [active]);

  const syncPosition = useCallback(() => {
    if (!activeRef.current) return;
    const player = playerRef.current;
    if (!areaRef.current) return;
    lastSyncRef.current = performance.now();
    dirtyRef.current = false;
    onPositionRef.current?.({
      areaKey: areaRef.current,
      x: Math.round(player.x * 10) / 10,
      y: Math.round(player.y * 10) / 10,
      facing: player.facing,
    });
  }, []);

  const attemptInteract = useCallback(() => {
    if (!activeRef.current) return;
    const object = nearestRef.current;
    if (object) onInteractRef.current?.(object);
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (key === 'e' && !event.repeat) {
        if (activeRef.current) {
          event.preventDefault();
          attemptInteract();
        }
        return;
      }

      if (!MOVE_KEYS.has(key)) return;
      if (!activeRef.current) return;
      event.preventDefault();
      keysRef.current.add(key);
    };

    const onKeyUp = (event) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    const onBlur = () => {
      keysRef.current.clear();
      virtualRef.current.clear();
    };

    const onPointerEnd = () => virtualRef.current.clear();

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointerup', onPointerEnd);
      window.removeEventListener('pointercancel', onPointerEnd);
    };
  }, [attemptInteract]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, Math.round(rect.width));
      const height = Math.max(280, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      sizeRef.current = { width, height, dpr };
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    window.addEventListener('orientationchange', resize);
    return () => {
      observer.disconnect();
      window.removeEventListener('orientationchange', resize);
    };
  }, [world?.missionNumber]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    let frame = 0;
    let last = performance.now();

    const loop = (now) => {
      frame = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      const current = worldRef.current;
      const size = sizeRef.current;
      if (!current?.state || !areaRef.current) return;

      const area = current.areas.find((item) => item.key === areaRef.current);
      if (!area) return;

      if (activeRef.current) {
        let inputX = 0;
        let inputY = 0;
        const keys = keysRef.current;
        if (keys.has('a') || keys.has('arrowleft')) inputX -= 1;
        if (keys.has('d') || keys.has('arrowright')) inputX += 1;
        if (keys.has('w') || keys.has('arrowup')) inputY -= 1;
        if (keys.has('s') || keys.has('arrowdown')) inputY += 1;

        for (const direction of virtualRef.current) {
          if (direction === 'left') inputX -= 1;
          if (direction === 'right') inputX += 1;
          if (direction === 'up') inputY -= 1;
          if (direction === 'down') inputY += 1;
        }

        const length = Math.hypot(inputX, inputY);
        if (length > 0) {
          const normalX = inputX / length;
          const normalY = inputY / length;
          const moved = moveEntity({
            x: playerRef.current.x,
            y: playerRef.current.y,
            dx: normalX * SPEED * dt,
            dy: normalY * SPEED * dt,
            area,
            rects: blockedRects(area),
          });
          playerRef.current.x = moved.x;
          playerRef.current.y = moved.y;
          if (Math.abs(normalX) > Math.abs(normalY)) {
            playerRef.current.facing = normalX < 0 ? 'left' : 'right';
          } else if (normalY !== 0) {
            playerRef.current.facing = normalY < 0 ? 'up' : 'down';
          }
          movingRef.current = true;
          dirtyRef.current = true;
          lastMoveRef.current = now;

          if (now - lastSyncRef.current > SYNC_INTERVAL) {
            syncPosition();
          }
        } else {
          movingRef.current = false;
          if (dirtyRef.current && now - lastMoveRef.current > STOP_SYNC_DELAY) {
            syncPosition();
          }
        }
      } else {
        movingRef.current = false;
      }

      // Camera follow, clamped to the current area.
      const viewport = size;
      const targetX =
        area.width <= viewport.width ? (area.width - viewport.width) / 2 : playerRef.current.x - viewport.width / 2;
      const targetY =
        area.height <= viewport.height ? (area.height - viewport.height) / 2 : playerRef.current.y - viewport.height / 2;
      const clampedX = clamp(targetX, 0, Math.max(0, area.width - viewport.width));
      const clampedY = clamp(targetY, 0, Math.max(0, area.height - viewport.height));

      if (!cameraRef.current.ready) {
        cameraRef.current = { x: clampedX, y: clampedY, ready: true };
      } else {
        const ease = 1 - Math.exp(-dt * 9);
        cameraRef.current.x += (clampedX - cameraRef.current.x) * ease;
        cameraRef.current.y += (clampedY - cameraRef.current.y) * ease;
      }

      const found = nearestInteractable(
        playerRef.current,
        current.objects,
        areaRef.current,
      );
      const foundId = found ? `${found.key}:${found.status}` : null;
      const previousId = nearestRef.current
        ? `${nearestRef.current.key}:${nearestRef.current.status}`
        : null;
      if (foundId !== previousId) {
        nearestRef.current = found;
        setNearest(found);
      } else if (found) {
        nearestRef.current = found;
      }

      const objectiveMap = new Map(
        current.objectives.map((objective) => [objective.key, objective.status]),
      );
      const dark = current.missionNumber === 1 && objectiveMap.get('restore_power') !== 'completed';
      const flashlight = current.inventory.some((item) => item.key === 'flashlight');

      ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
      drawScene(ctx, {
        area,
        areaKey: areaRef.current,
        objects: current.objects,
        player: playerRef.current,
        camera: cameraRef.current,
        viewport: { width: size.width, height: size.height },
        width: size.width,
        height: size.height,
        time: now / 1000,
        moving: movingRef.current,
        facing: playerRef.current.facing,
        theme: current.theme,
        dark,
        flashlight,
        nearKey: found?.key ?? null,
      });
    };

    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [syncPosition, world?.missionNumber]);

  const pressDirection = useCallback((direction) => {
    virtualRef.current.add(direction);
  }, []);

  const releaseDirection = useCallback((direction) => {
    virtualRef.current.delete(direction);
  }, []);

  const clearDirections = useCallback(() => {
    virtualRef.current.clear();
  }, []);

  return {
    canvasRef,
    containerRef,
    nearest,
    areaCaption,
    attemptInteract,
    pressDirection,
    releaseDirection,
    clearDirections,
  };
}
