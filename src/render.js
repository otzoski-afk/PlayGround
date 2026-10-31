import { drawText, textWidth } from './font.js';
import * as S from './sprites.js';
import { TILE, T } from './level.js';

export const VIEW_W = 400;
export const VIEW_H = 225;

const C = {
  ground: '#c97a3c',
  groundLight: '#e8a35e',
  groundHi: '#f6c98f',
  groundDark: '#8a4a1c',
  groundShade: '#a75f28',
  brick: '#cf5a2e',
  brickHi: '#ef8a58',
  brickDark: '#7c2f12',
  stone: '#cbb894',
  stoneHi: '#e9dcbc',
  stoneDark: '#8f7a55',
  pipe: '#2fa84f',
  pipeHi: '#7fe08a',
  pipeDark: '#146b31',
};

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function star(ctx, cx, cy, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function drawSky(ctx, cam, t) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#3d7ce4');
  g.addColorStop(0.45, '#63a3f2');
  g.addColorStop(0.8, '#a9d6ff');
  g.addColorStop(1, '#d8ecff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  const sun = ctx.createRadialGradient(340, 38, 4, 340, 38, 130);
  sun.addColorStop(0, 'rgba(255, 248, 205, 0.85)');
  sun.addColorStop(0.35, 'rgba(255, 240, 170, 0.22)');
  sun.addColorStop(1, 'rgba(255, 240, 170, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(180, 0, 220, 200);

  // soft cloud haze near the horizon
  const haze = ctx.createLinearGradient(0, VIEW_H - 80, 0, VIEW_H);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, 'rgba(255,255,255,0.35)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, VIEW_H - 80, VIEW_W, 80);
}

function drawCloud(ctx, x, y, size) {
  const s = size * 0.92;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  const puffs = [
    [-14 * s, 8 * s, 9 * s], [0, 2 * s, 12 * s], [15 * s, 5 * s, 10 * s],
    [-4 * s, 10 * s, 9 * s], [9 * s, 10 * s, 8 * s],
  ];
  // soft blue underside
  ctx.fillStyle = 'rgba(168, 205, 255, 0.85)';
  for (const [px, py, r] of puffs) {
    ctx.beginPath();
    ctx.arc(px, py + 2.4, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ffffff';
  for (const [px, py, r] of puffs) {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // bright crown highlight
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.beginPath();
  ctx.arc(0, 2 * s, 9 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHill(ctx, x, groundY, size) {
  const w = 52 + size * 28;
  const h = 30 + size * 17;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(groundY));
  ctx.fillStyle = '#37a84a';
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w * 0.32, -h * 0.96, 0, -h);
  ctx.quadraticCurveTo(w * 0.32, -h * 0.96, w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2b8c3c';
  ctx.beginPath();
  ctx.moveTo(0, -h);
  ctx.quadraticCurveTo(w * 0.32, -h * 0.96, w / 2, 0);
  ctx.lineTo(w * 0.14, 0);
  ctx.quadraticCurveTo(w * 0.18, -h * 0.66, 0, -h);
  ctx.closePath();
  ctx.fill();
  // little face-like spots, a nod to the classic hills
  ctx.fillStyle = '#257a34';
  const spots = [[-w * 0.17, -h * 0.42], [w * 0.13, -h * 0.46], [-w * 0.01, -h * 0.7]];
  for (const [sx, sy] of spots) {
    ctx.beginPath();
    ctx.ellipse(sx, sy, 2.6, 4.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBush(ctx, x, groundY, size) {
  const s = size;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(groundY));
  const lobes = [[0, -6 * s, 7 * s], [11 * s, -9 * s, 8.5 * s], [22 * s, -6 * s, 7 * s]];
  ctx.fillStyle = '#2b9440';
  for (const [px, py, r] of lobes) {
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(-6 * s, -7 * s, 34 * s, 7 * s);
  // sunlit tops
  ctx.fillStyle = '#4bc25f';
  for (const [px, py, r] of lobes) {
    ctx.beginPath();
    ctx.arc(px - 1.2 * s, py - 1.4 * s, r * 0.68, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function tileOffset(G, x, y) {
  const b = G.bumps.get(y * G.level.W + x);
  if (!b) return 0;
  return -7 * Math.sin(Math.PI * Math.min(1, b.t / b.dur));
}

function drawGroundTile(ctx, sx, sy, x, y, openAbove) {
  ctx.fillStyle = hash(x, y) > 0.5 ? '#c07234' : '#c97a3c';
  ctx.fillRect(sx, sy, 16, 16);

  // chipped stone texture
  for (let i = 0; i < 5; i++) {
    const hx = hash(x * 4 + i, y * 7 + 1);
    const hy = hash(x * 9 + 3, y * 3 + i);
    ctx.fillStyle = hx > 0.55 ? '#a75f28' : '#dd9250';
    ctx.fillRect(sx + 2 + Math.floor(hx * 11), sy + 5 + Math.floor(hy * 9), 2, 1);
  }

  ctx.fillStyle = '#8a4a1c';
  ctx.fillRect(sx, sy + 15, 16, 1);
  ctx.fillRect(sx + 15, sy, 1, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(sx, sy, 15, 1);
  ctx.fillRect(sx, sy, 1, 15);

  if (openAbove) {
    ctx.fillStyle = '#7a3f16';
    ctx.fillRect(sx, sy + 5, 16, 1);
    ctx.fillStyle = C.groundLight;
    ctx.fillRect(sx, sy + 2, 16, 3);
    ctx.fillStyle = C.groundHi;
    ctx.fillRect(sx, sy, 16, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(sx, sy, 16, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(sx, sy + 5, 16, 1);
  }
}

function drawBrickTile(ctx, sx, sy) {
  ctx.fillStyle = C.brick;
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = C.brickHi;
  ctx.fillRect(sx + 1, sy + 1, 14, 1);
  ctx.fillRect(sx + 1, sy + 1, 1, 6);
  ctx.fillStyle = C.brickDark;
  ctx.fillRect(sx, sy + 15, 16, 1);
  ctx.fillRect(sx + 15, sy, 1, 16);
  // mortar
  ctx.fillStyle = '#8f3a17';
  ctx.fillRect(sx + 1, sy + 7, 14, 1);
  ctx.fillRect(sx + 7, sy + 1, 1, 6);
  ctx.fillRect(sx + 3, sy + 8, 1, 7);
  ctx.fillRect(sx + 11, sy + 8, 1, 7);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(sx + 2, sy + 8, 5, 1);
}

function drawQuestionTile(ctx, sx, sy, t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);
  ctx.fillStyle = `rgba(255, 220, 120, ${0.16 + pulse * 0.2})`;
  ctx.fillRect(sx - 2, sy - 2, 20, 20);

  const g = ctx.createLinearGradient(0, sy, 0, sy + 16);
  g.addColorStop(0, '#ffe07a');
  g.addColorStop(0.5, '#f2b33d');
  g.addColorStop(1, '#d98d1c');
  ctx.fillStyle = g;
  ctx.fillRect(sx, sy, 16, 16);

  ctx.fillStyle = '#7a4a12';
  ctx.fillRect(sx, sy, 16, 1);
  ctx.fillRect(sx, sy + 15, 16, 1);
  ctx.fillRect(sx, sy, 1, 16);
  ctx.fillRect(sx + 15, sy, 1, 16);

  ctx.fillStyle = '#fff2b0';
  ctx.fillRect(sx + 1, sy + 1, 14, 1);
  ctx.fillRect(sx + 1, sy + 1, 1, 14);

  ctx.fillStyle = '#a86a12';
  for (const [dx, dy] of [[2, 2], [12, 2], [2, 12], [12, 12]]) {
    ctx.fillRect(sx + dx, sy + dy, 2, 2);
  }

  const bob = Math.round(Math.sin(t * 4) * 0.6);
  drawText(ctx, '?', sx + 8, sy + 3 + bob, 1, '#fff8e0', { align: 'center', shadow: '#9a5c0c' });
}

function drawUsedTile(ctx, sx, sy) {
  ctx.fillStyle = '#9c6238';
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = '#b97b4a';
  ctx.fillRect(sx + 1, sy + 1, 14, 2);
  ctx.fillStyle = '#6b3b1c';
  ctx.fillRect(sx, sy + 15, 16, 1);
  ctx.fillRect(sx + 15, sy, 1, 16);
  ctx.fillRect(sx, sy, 16, 1);
  ctx.fillRect(sx, sy, 1, 16);
  ctx.fillStyle = '#7f4c27';
  ctx.fillRect(sx + 2, sy + 4, 12, 1);
  ctx.fillRect(sx + 2, sy + 11, 12, 1);
}

function drawStoneTile(ctx, sx, sy) {
  ctx.fillStyle = C.stone;
  ctx.fillRect(sx, sy, 16, 16);
  ctx.fillStyle = C.stoneHi;
  ctx.fillRect(sx, sy, 16, 2);
  ctx.fillRect(sx, sy, 2, 16);
  ctx.fillStyle = C.stoneDark;
  ctx.fillRect(sx, sy + 15, 16, 1);
  ctx.fillRect(sx + 15, sy, 1, 16);
  ctx.fillStyle = 'rgba(0,0,0,0.08)';
  ctx.fillRect(sx + 4, sy + 6, 8, 1);
  ctx.fillRect(sx + 4, sy + 10, 8, 1);
}

function drawTiles(ctx, G) {
  const { level, cam } = G;
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const x1 = Math.min(level.W - 1, Math.ceil((cam.x + VIEW_W) / TILE));
  const sy0 = Math.floor(cam.y / TILE);

  for (let y = sy0; y < level.H; y++) {
    for (let x = x0; x <= x1; x++) {
      const type = level.tiles[y * level.W + x];
      if (!type || type === T.PIPE) continue;
      const off = tileOffset(G, x, y);
      const sx = Math.round(x * TILE - cam.x);
      const sy = Math.round(y * TILE - cam.y + off);
      if (sy > VIEW_H + 16 || sy < -20) continue;

      if (type === T.GROUND) {
        const above = y > 0 ? level.tiles[(y - 1) * level.W + x] : 0;
        drawGroundTile(ctx, sx, sy, x, y, !above);
      } else if (type === T.BRICK) drawBrickTile(ctx, sx, sy);
      else if (type === T.QCOIN || type === T.QPOWER) drawQuestionTile(ctx, sx, sy, G.t + x * 0.37);
      else if (type === T.USED) drawUsedTile(ctx, sx, sy);
      else if (type === T.STONE) drawStoneTile(ctx, sx, sy);
    }
  }
}

function drawPipe(ctx, pipe, cam) {
  const x = Math.round(pipe.x - cam.x);
  const y = Math.round(pipe.y - cam.y);
  const w = pipe.w;
  const h = pipe.h;
  if (x + w < -10 || x > VIEW_W + 10) return;

  const rimH = 14;
  // outline
  ctx.fillStyle = '#0b3d1b';
  ctx.fillRect(x - 1, y - 1, w + 2, rimH + 1);
  // body
  ctx.fillStyle = C.pipeDark;
  ctx.fillRect(x + 1, y + rimH - 2, w - 2, h - rimH + 2);
  ctx.fillStyle = C.pipe;
  ctx.fillRect(x + 3, y + rimH - 2, w - 6, h - rimH + 2);
  ctx.fillStyle = C.pipeHi;
  ctx.fillRect(x + 5, y + rimH - 2, 3, h - rimH + 2);
  ctx.fillStyle = 'rgba(0,0,0,0.14)';
  ctx.fillRect(x + w - 7, y + rimH - 2, 3, h - rimH + 2);

  // rim
  ctx.fillStyle = C.pipeDark;
  ctx.fillRect(x, y, w, rimH);
  ctx.fillStyle = C.pipe;
  ctx.fillRect(x + 1, y + 1, w - 2, rimH - 3);
  ctx.fillStyle = C.pipeHi;
  ctx.fillRect(x + 3, y + 2, 4, rimH - 5);
  ctx.fillStyle = '#0e4d22';
  ctx.fillRect(x, y + rimH - 2, w, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + 1, y + 1, w - 2, 1);
}

function drawFlag(ctx, G) {
  const { level, cam } = G;
  const x = Math.round(level.flagX - cam.x);
  const groundY = level.groundTop - cam.y;
  const topY = groundY - 148;

  ctx.fillStyle = '#cfe0ef';
  ctx.fillRect(x - 1, topY, 3, 148);
  ctx.fillStyle = '#8fa8bd';
  ctx.fillRect(x + 1, topY, 1, 148);

  // ball on top
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.arc(x, topY - 3, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2b0';
  ctx.beginPath();
  ctx.arc(x - 1, topY - 4, 2, 0, Math.PI * 2);
  ctx.fill();

  // flag cloth
  const drop = G.flagDrop || 0;
  const fy = topY + 6 + drop * 110;
  const wave = Math.sin(G.t * 4) * 2;
  ctx.fillStyle = '#fff8ec';
  ctx.beginPath();
  ctx.moveTo(x - 2, fy);
  ctx.lineTo(x - 30, fy + 7 + wave);
  ctx.lineTo(x - 2, fy + 18);
  ctx.closePath();
  ctx.fill();
  star(ctx, x - 12, fy + 9 + wave * 0.5, 4.6, '#e33127');
}

function drawCastle(ctx, level, cam) {
  const x = Math.round(level.castleX - cam.x);
  const groundY = level.groundTop - cam.y;
  const w = 112;
  const h = 96;
  const y = groundY - h;
  if (x > VIEW_W + 20 || x + w < -20) return;

  ctx.fillStyle = '#b04a2a';
  ctx.fillRect(x, y + 20, w, h - 20);
  ctx.fillStyle = '#c25a34';
  ctx.fillRect(x + 4, y + 24, w - 8, 10);

  // brick lines
  ctx.fillStyle = 'rgba(90, 30, 12, 0.45)';
  for (let row = 0; row < 5; row++) {
    ctx.fillRect(x, y + 34 + row * 12, w, 1);
    for (let col = 0; col < 7; col++) {
      ctx.fillRect(x + 8 + col * 16 + (row % 2) * 8, y + 34 + row * 12, 1, 12);
    }
  }

  // battlements
  ctx.fillStyle = '#b04a2a';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(x + 4 + i * 24, y, 14, 24);
    ctx.fillStyle = '#8f3a20';
    ctx.fillRect(x + 4 + i * 24, y + 20, 14, 4);
    ctx.fillStyle = '#b04a2a';
  }
  ctx.fillStyle = '#8f3a20';
  ctx.fillRect(x, y + 18, w, 4);

  // door
  ctx.fillStyle = '#2b1409';
  ctx.fillRect(x + w / 2 - 16, groundY - 46, 32, 46);
  ctx.beginPath();
  ctx.arc(x + w / 2, groundY - 46, 16, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#4a2412';
  ctx.fillRect(x + w / 2 - 12, groundY - 42, 24, 2);

  // windows
  ctx.fillStyle = '#2b1409';
  for (const wx of [x + 20, x + w - 32]) {
    ctx.fillRect(wx, y + 34, 12, 16);
    ctx.beginPath();
    ctx.arc(wx + 6, y + 34, 6, Math.PI, 0);
    ctx.fill();
  }

  // tower flag
  ctx.fillStyle = '#8fa8bd';
  ctx.fillRect(x + w / 2, y - 34, 2, 34);
  ctx.fillStyle = '#e33127';
  ctx.beginPath();
  ctx.moveTo(x + w / 2 + 2, y - 32);
  ctx.lineTo(x + w / 2 + 22, y - 26);
  ctx.lineTo(x + w / 2 + 2, y - 18);
  ctx.closePath();
  ctx.fill();
}

function drawHUD(ctx, G) {
  const t = G.t;
  const shadow = 'rgba(0,0,0,0.55)';
  const white = '#fff8ec';

  // soft scrim so the HUD stays readable over bright sky
  const g = ctx.createLinearGradient(0, 0, 0, 30);
  g.addColorStop(0, 'rgba(8, 18, 40, 0.35)');
  g.addColorStop(1, 'rgba(8, 18, 40, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, 30);

  drawText(ctx, 'MARIO', 12, 5, 1, white, { shadow });
  drawText(ctx, String(G.score).padStart(6, '0'), 12, 14, 1, white, { shadow });

  // coins
  S.drawCoin(ctx, 104, 11, 3.6, t);
  drawText(ctx, 'x' + String(G.coinCount).padStart(2, '0'), 112, 8, 1, white, { shadow });

  // lives
  ctx.save();
  ctx.translate(11, 23);
  ctx.scale(0.75, 0.75);
  ctx.fillStyle = '#e33127';
  ctx.fillRect(1, 0, 9, 3);
  ctx.fillRect(0, 3, 11, 1);
  ctx.fillStyle = '#ffc39b';
  ctx.fillRect(2, 4, 8, 5);
  ctx.fillStyle = '#5a2c10';
  ctx.fillRect(2, 4, 1, 3);
  ctx.fillStyle = '#241407';
  ctx.fillRect(7, 5, 1, 2);
  ctx.fillStyle = '#5a2c10';
  ctx.fillRect(4, 7, 4, 1);
  ctx.restore();
  drawText(ctx, 'x' + G.lives, 21, 23, 1, white, { shadow });

  // world
  drawText(ctx, 'WORLD', 200, 5, 1, white, { align: 'center', shadow });
  drawText(ctx, '1-1', 200, 14, 1, white, { align: 'center', shadow });

  // time
  drawText(ctx, 'TIME', 300, 5, 1, white, { align: 'center', shadow });
  const timeStr = String(Math.max(0, Math.ceil(G.time))).padStart(3, '0');
  drawText(ctx, timeStr, 300, 14, 1, G.time <= 30 ? '#ff8a7a' : white, { align: 'center', shadow });
}

function drawParticles(ctx, G) {
  const { cam } = G;
  for (const p of G.particles) {
    const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    const x = p.x - cam.x;
    const y = p.y - cam.y;
    ctx.globalAlpha = alpha;
    if (p.kind === 'debris') {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(x), Math.round(y), p.size, p.size);
    } else if (p.kind === 'spark') {
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(x - p.size / 2), Math.round(y - p.size / 2), p.size, p.size);
    } else if (p.kind === 'dust') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(x, y, p.size * (0.6 + (1 - alpha) * 1.2), 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'text') {
      drawText(ctx, p.text, x, y, 1, p.color, { align: 'center', shadow: 'rgba(0,0,0,0.5)' });
    } else if (p.kind === 'coinpop') {
      S.drawCoin(ctx, x, y, 5, G.t * 2);
    }
    ctx.globalAlpha = 1;
  }
}

function drawEnemies(ctx, G) {
  const { cam } = G;
  for (const e of G.enemies) {
    if (e.remove) continue;
    const x = e.x - cam.x;
    const y = e.y - cam.y;
    if (x > VIEW_W + 40 || x + e.w < -40) continue;
    if (e.type === 'goomba') {
      S.drawGoomba(ctx, x, y, e.w, e.h, e);
    } else if (e.type === 'koopa') {
      S.drawKoopa(ctx, x, y, e.w, e.h, e);
    } else if (e.type === 'piranha') {
      S.drawPiranha(ctx, x + e.w / 2, y + e.h, e.plantH, G.t, e.open);
    }
  }
}

function drawItems(ctx, G) {
  const { cam } = G;
  for (const it of G.items) {
    if (it.remove) continue;
    const x = it.x - cam.x;
    const y = it.y - cam.y;
    if (x > VIEW_W + 40 || x + it.w < -40) continue;
    if (it.type === 'mushroom') S.drawMushroom(ctx, x, y, it.w, it.h);
    else if (it.type === 'flower') S.drawFlower(ctx, x, y, it.w, it.h, G.t);
    else if (it.type === 'fireball') S.drawFireball(ctx, x + it.w / 2, y + it.h / 2, G.t);
  }
}

function drawPlayer(ctx, G) {
  const p = G.player;
  if (!p.visible) return;
  const x = p.x - G.cam.x;
  const y = p.y - G.cam.y;
  S.drawMario(ctx, x, y, p.w, p.h, {
    power: p.power,
    facing: p.facing,
    onGround: p.onGround,
    vx: p.vx,
    vy: p.vy,
    skid: p.skid,
    dead: p.dead,
    walkPhase: p.walkPhase,
    glow: p.invuln > 0 && Math.floor(G.t * 20) % 2 === 0,
  });
}

export function render(ctx, G) {
  const { level, cam } = G;
  const shakeX = G.shake > 0 ? (Math.random() - 0.5) * 4 : 0;
  const shakeY = G.shake > 0 ? (Math.random() - 0.5) * 4 : 0;

  ctx.save();
  ctx.setTransform(G.pixelScale, 0, 0, G.pixelScale, 0, 0);
  ctx.translate(shakeX, shakeY);

  drawSky(ctx, cam, G.t);

  for (const c of level.clouds) {
    const x = c.x - cam.x * 0.22;
    if (x < -120 || x > VIEW_W + 120) continue;
    drawCloud(ctx, x, c.y - cam.y * 0.2, c.size);
  }

  for (const h of level.hills) {
    const x = h.x - cam.x * 0.5;
    if (x < -120 || x > VIEW_W + 120) continue;
    drawHill(ctx, x, level.groundTop - cam.y + 1, h.size);
  }

  for (const b of level.bushes) {
    const x = b.x - cam.x;
    if (x < -80 || x > VIEW_W + 80) continue;
    drawBush(ctx, x, level.groundTop - cam.y + 2, b.size);
  }

  drawCastle(ctx, level, cam);

  for (const e of G.enemies) {
    if (e.type === 'piranha' && !e.remove) {
      const x = e.x + e.w / 2 - cam.x;
      if (x > -40 && x < VIEW_W + 40) {
        // draw the plant behind the pipe rim
        S.drawPiranha(ctx, x, e.y + e.h - cam.y, e.plantH, G.t, e.open);
      }
    }
  }

  for (const pipe of level.pipes) drawPipe(ctx, pipe, cam);

  drawTiles(ctx, G);

  for (const coin of G.coinList) {
    if (coin.taken) continue;
    const x = coin.x - cam.x;
    const y = coin.y - cam.y;
    if (x < -20 || x > VIEW_W + 20) continue;
    S.drawCoin(ctx, x, y + Math.sin(G.t * 3 + coin.x * 0.1) * 1.2, 5, G.t + coin.x * 0.05);
  }

  drawFlag(ctx, G);
  drawEnemies(ctx, G);
  drawItems(ctx, G);
  drawPlayer(ctx, G);
  drawParticles(ctx, G);
  if (G.state !== 'title') drawHUD(ctx, G);

  if (G.state === 'pause') {
    ctx.fillStyle = 'rgba(6, 10, 24, 0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawText(ctx, 'PAUSED', VIEW_W / 2, VIEW_H / 2 - 26, 3, '#fff8ec', { align: 'center', shadow: '#0a1024' });
    drawText(ctx, 'PRESS P TO RESUME', VIEW_W / 2, VIEW_H / 2 + 8, 1, '#cfd9f5', { align: 'center', shadow: '#0a1024' });
  }

  ctx.restore();
}
