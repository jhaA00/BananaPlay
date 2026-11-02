/**
 * Canvas renderer for the exploration scene. It receives only the sanitised
 * world payload, so it cannot reveal puzzle solutions or hidden game state.
 */

import { themeFor, iconFor } from '../themes.js';

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFloor(ctx, area, theme) {
  ctx.fillStyle = theme.floor;
  ctx.fillRect(0, 0, area.width, area.height);

  ctx.strokeStyle = theme.grid;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.5;
  for (let x = 0; x <= area.width; x += 70) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, area.height);
    ctx.stroke();
  }
  for (let y = 0; y <= area.height; y += 70) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(area.width, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = theme.wallTop;
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, area.width - 20, area.height - 20);
}

function drawRectBlock(ctx, rect, theme, { wall = false } = {}) {
  ctx.fillStyle = theme.wallShadow;
  roundRect(ctx, rect.x + 5, rect.y + 7, rect.w, rect.h, 10);
  ctx.fill();

  ctx.fillStyle = wall ? theme.wall : theme.prop;
  roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10);
  ctx.fill();

  ctx.fillStyle = wall ? theme.wallTop : theme.propTop;
  roundRect(ctx, rect.x + 4, rect.y + 4, rect.w - 8, 5, 3);
  ctx.fill();

  if (wall) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rect.x + 10, rect.y + 16);
    ctx.lineTo(rect.x + rect.w - 10, rect.y + 16);
    ctx.stroke();
  }
}

function drawLabel(ctx, text, x, y, theme, { accent = false } = {}) {
  ctx.font = '600 11px "Avenir Next", system-ui, sans-serif';
  const width = Math.min(220, ctx.measureText(text).width + 18);
  const left = x - width / 2;
  ctx.fillStyle = 'rgba(6, 8, 10, 0.86)';
  roundRect(ctx, left, y - 10, width, 20, 6);
  ctx.fill();
  ctx.strokeStyle = accent ? theme.accent : 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1;
  roundRect(ctx, left, y - 10, width, 20, 6);
  ctx.stroke();
  ctx.fillStyle = accent ? theme.accent : 'rgba(236, 230, 217, 0.82)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 0.5, width - 12);
}

function drawDoor(ctx, object, theme, near, time) {
  const open = object.status === 'completed' || object.status === 'unlocked';
  const w = object.w || 44;
  const h = object.h || 104;
  const x = object.x - w / 2;
  const y = object.y - h / 2;

  ctx.fillStyle = theme.wallShadow;
  ctx.fillRect(x + 3, y + 5, w, h);
  ctx.fillStyle = open ? '#050708' : theme.prop;
  roundRect(ctx, x, y, w, h, 6);
  ctx.fill();

  if (!open) {
    ctx.strokeStyle = object.status === 'locked' ? 'rgba(255, 140, 140, 0.55)' : theme.accent;
    ctx.lineWidth = 2;
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, 4);
    ctx.stroke();
    ctx.fillStyle = object.status === 'locked' ? '#ff8c8c' : theme.accent;
    roundRect(ctx, x + w / 2 - 3, y + h / 2 - 9, 6, 18, 3);
    ctx.fill();
  } else {
    const glow = 0.35 + Math.sin(time * 2.2) * 0.12;
    ctx.fillStyle = `rgba(110, 231, 168, ${glow * 0.35})`;
    ctx.fillRect(x + 5, y + 5, w - 10, h - 10);
    ctx.strokeStyle = 'rgba(110, 231, 168, 0.55)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 4);
    ctx.stroke();
  }

  if (near) drawLabel(ctx, object.label, object.x, y - 16, theme, { accent: true });
}

function drawExit(ctx, object, theme, near, time) {
  const w = object.w || 58;
  const h = object.h || 106;
  const x = object.x - w / 2;
  const y = object.y - h / 2;
  const pulse = 0.45 + Math.sin(time * 2.4) * 0.16;

  const halo = ctx.createRadialGradient(object.x, object.y, 6, object.x, object.y, 100);
  halo.addColorStop(0, `rgba(110, 231, 168, ${pulse * 0.5})`);
  halo.addColorStop(1, 'rgba(110, 231, 168, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(object.x - 110, object.y - 110, 220, 220);

  ctx.fillStyle = '#07100c';
  roundRect(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = `rgba(110, 231, 168, ${pulse + 0.25})`;
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, w, h, 10);
  ctx.stroke();

  ctx.fillStyle = 'rgba(110, 231, 168, 0.2)';
  roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 6);
  ctx.fill();

  ctx.font = '22px "Avenir Next", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(iconFor(object), object.x, object.y);
  if (near) drawLabel(ctx, object.label, object.x, y - 16, theme, { accent: true });
}

function drawObject(ctx, object, theme, near, time) {
  if (object.status === 'collected') return;
  if (object.action === 'transition' || object.kind === 'door') {
    drawDoor(ctx, object, theme, near, time);
    return;
  }
  if (object.action === 'exit' || object.kind === 'exit') {
    drawExit(ctx, object, theme, near, time);
    return;
  }

  const locked = object.status === 'locked';
  const done = object.status === 'completed';
  const active = !locked && !done;
  const w = Math.max(26, Math.min(object.w || 42, 64));
  const h = Math.max(26, Math.min(object.h || 42, 64));
  const x = object.x - w / 2;
  const y = object.y - h / 2;

  if (active) {
    const pulse = 0.28 + Math.sin(time * 2.6 + object.x * 0.01) * 0.1;
    const halo = ctx.createRadialGradient(object.x, object.y, 4, object.x, object.y, 58);
    halo.addColorStop(0, `rgba(242, 163, 60, ${pulse})`);
    halo.addColorStop(1, 'rgba(242, 163, 60, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(object.x - 60, object.y - 60, 120, 120);
  }

  ctx.fillStyle = theme.wallShadow;
  roundRect(ctx, x + 3, y + 5, w, h, 8);
  ctx.fill();

  ctx.fillStyle = locked ? '#191b1e' : done ? '#121a16' : theme.prop;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();

  ctx.strokeStyle = locked
    ? 'rgba(255, 140, 140, 0.4)'
    : done
      ? 'rgba(110, 231, 168, 0.4)'
      : theme.accent;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 8);
  ctx.stroke();

  if (object.terminal && active) {
    ctx.strokeStyle = `rgba(242, 163, 60, ${0.4 + Math.sin(time * 3) * 0.2})`;
    ctx.lineWidth = 1;
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 10);
    ctx.stroke();
  }

  ctx.font = `${Math.round(Math.min(w, h) * 0.52)}px "Avenir Next", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = locked ? 0.55 : done ? 0.68 : 1;
  ctx.fillText(iconFor(object), object.x, object.y + 1);
  ctx.globalAlpha = 1;

  if (near) drawLabel(ctx, object.label, object.x, y - 16, theme, { accent: true });
  else if (object.terminal) drawLabel(ctx, object.label, object.x, y - 16, theme, { accent: false });
}

function drawPlayer(ctx, player, theme, time, moving, facing) {
  const bob = moving ? Math.sin(time * 11) * 1.6 : Math.sin(time * 2.2) * 0.5;
  const x = player.x;
  const y = player.y;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y + 11, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  const legSwing = moving ? Math.sin(time * 11) * 4 : 0;
  ctx.strokeStyle = theme.playerDark;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 4, y + 2);
  ctx.lineTo(x - 4 + legSwing * 0.3, y + 10);
  ctx.moveTo(x + 4, y + 2);
  ctx.lineTo(x + 4 - legSwing * 0.3, y + 10);
  ctx.stroke();

  if (facing === 'up' || facing === 'left' || facing === 'right') {
    ctx.fillStyle = theme.playerPack;
    const packX = facing === 'left' ? x + 4 : facing === 'right' ? x - 4 : x;
    roundRect(ctx, packX - 7, y - 15 + bob, 14, 18, 5);
    ctx.fill();
  }

  ctx.fillStyle = theme.player;
  roundRect(ctx, x - 10, y - 14 + bob, 20, 24, 8);
  ctx.fill();

  ctx.fillStyle = theme.playerDark;
  roundRect(ctx, x - 10, y + 3 + bob, 20, 5, 3);
  ctx.fill();

  ctx.fillStyle = theme.player;
  ctx.beginPath();
  ctx.arc(x, y - 19 + bob, 7.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = theme.playerDark;
  if (facing === 'down') {
    ctx.beginPath();
    ctx.arc(x - 3, y - 19 + bob, 1.3, 0, Math.PI * 2);
    ctx.arc(x + 3, y - 19 + bob, 1.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (facing === 'left') {
    ctx.fillRect(x - 5, y - 19 + bob, 3, 1.6);
  } else if (facing === 'right') {
    ctx.fillRect(x + 2, y - 19 + bob, 3, 1.6);
  } else {
    ctx.fillStyle = theme.playerPack;
    roundRect(ctx, x - 6, y - 24 + bob, 12, 6, 3);
    ctx.fill();
  }

  ctx.strokeStyle = theme.accentSoft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y - 4, 24, 0, Math.PI * 2);
  ctx.stroke();
}

function drawDarkness(ctx, { viewport, player, camera, flashlight, time }) {
  const px = player.x - camera.x;
  const py = player.y - camera.y;
  const radius = flashlight ? 235 : 95;
  const flicker = flashlight ? 1 + Math.sin(time * 8) * 0.015 : 1;
  const gradient = ctx.createRadialGradient(px, py, radius * 0.12, px, py, radius * flicker);
  gradient.addColorStop(0, 'rgba(2, 4, 6, 0)');
  gradient.addColorStop(0.45, 'rgba(2, 4, 6, 0.28)');
  gradient.addColorStop(0.78, 'rgba(2, 4, 6, 0.78)');
  gradient.addColorStop(1, 'rgba(2, 4, 6, 0.96)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewport.width, viewport.height);

  ctx.fillStyle = 'rgba(2, 4, 6, 0.18)';
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}

export function drawScene(ctx, options) {
  const {
    area,
    areaKey,
    objects,
    player,
    camera,
    viewport,
    time,
    moving,
    facing,
    dark,
    flashlight,
    nearKey,
    width,
    height,
  } = options;

  const theme = themeFor(options.theme);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawFloor(ctx, area, theme);

  for (const wall of area.walls ?? []) {
    drawRectBlock(ctx, wall, theme, { wall: true });
  }
  for (const prop of area.props ?? []) {
    drawRectBlock(ctx, prop, theme);
  }

  const localObjects = objects.filter(
    (object) => object.areaKey === areaKey && object.status !== 'undiscovered',
  );
  const nearby = localObjects.filter((object) => object.y <= player.y);
  const distant = localObjects.filter((object) => object.y > player.y);

  for (const object of nearby) {
    drawObject(ctx, object, theme, object.key === nearKey, time);
  }

  drawPlayer(ctx, player, theme, time, moving, facing);

  for (const object of distant) {
    drawObject(ctx, object, theme, object.key === nearKey, time);
  }

  ctx.restore();

  if (dark) {
    drawDarkness(ctx, { viewport, player, camera, flashlight, time });
  }

  const vignette = ctx.createRadialGradient(
    viewport.width / 2,
    viewport.height / 2,
    Math.min(viewport.width, viewport.height) * 0.3,
    viewport.width / 2,
    viewport.height / 2,
    Math.max(viewport.width, viewport.height) * 0.75,
  );
  vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
}
