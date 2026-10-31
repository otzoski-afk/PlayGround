import { buildLevel, TILE, T } from './level.js';
import { render, VIEW_W, VIEW_H } from './render.js';
import { Sound } from './audio.js';

const PIXEL_SCALE = 2;
const GRAVITY = 1500;
const MAX_FALL = 520;
const WALK_SPEED = 100;
const RUN_SPEED = 172;
const ACCEL = 640;
const AIR_ACCEL = 520;
const FRICTION = 620;
const AIR_FRICTION = 120;
const JUMP_V = -468;
const JUMP_CUT = -165;
const COYOTE = 0.09;
const JUMP_BUFFER = 0.12;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d', { alpha: false });
canvas.width = VIEW_W * PIXEL_SCALE;
canvas.height = VIEW_H * PIXEL_SCALE;
ctx.imageSmoothingEnabled = false;

const overlay = document.getElementById('overlay');
const soundBtn = document.getElementById('soundBtn');
const pauseBtn = document.getElementById('pauseBtn');
const touch = document.getElementById('touch');
const sound = new Sound();

const input = {
  left: false, right: false, jump: false, run: false,
  jumpPressed: false, runPressed: false,
};

const G = {
  state: 'title',
  level: null,
  player: null,
  cam: { x: 0, y: 15 },
  score: 0,
  coinCount: 0,
  lives: 3,
  time: 300,
  t: 0,
  enemies: [],
  items: [],
  particles: [],
  coinList: [],
  bumps: new Map(),
  shake: 0,
  flagDrop: 0,
  flagPhase: '',
  stateTimer: 0,
  pixelScale: PIXEL_SCALE,
  viewW: VIEW_W,
  viewH: VIEW_H,
  stompCombo: 0,
};

// ---------------------------------------------------------------------------
// Setup / reset
// ---------------------------------------------------------------------------

function makePlayer() {
  return {
    x: 3 * TILE,
    y: G.level.groundTop - 15,
    w: 11,
    h: 15,
    vx: 0,
    vy: 0,
    onGround: true,
    facing: 1,
    power: 0,
    invuln: 0,
    walkPhase: 0,
    skid: false,
    dead: false,
    visible: true,
    coyote: 0,
    buffer: 0,
    jumpCut: false,
    fireCooldown: 0,
  };
}

function createEnemies(level) {
  return level.enemies.map((spawn) => {
    if (spawn.type === 'goomba') {
      return {
        type: 'goomba', x: spawn.tx * TILE + 1, y: level.groundTop - 14,
        w: 14, h: 14, vx: -42, vy: 0, state: 'walk', anim: 0, timer: 0,
        awake: false, remove: false,
      };
    }
    return {
      type: 'koopa', x: spawn.tx * TILE + 1, y: level.groundTop - 22,
      w: 14, h: 22, vx: -46, vy: 0, state: 'walk', anim: 0, timer: 0,
      awake: false, remove: false, facing: -1,
    };
  });
}

function createPiranhas(level) {
  const plants = [];
  for (const pipe of level.pipes) {
    if (!pipe.plant) continue;
    plants.push({
      type: 'piranha',
      x: pipe.x + pipe.w / 2 - 7,
      y: pipe.y,
      w: 14,
      h: 0,
      plantH: 0,
      phase: 'hidden',
      timer: 1 + Math.random() * 1.5,
      open: false,
      remove: false,
      awake: true,
    });
  }
  return plants;
}

function resetLevel() {
  G.level = buildLevel();
  G.player = makePlayer();
  G.enemies = [...createEnemies(G.level), ...createPiranhas(G.level)];
  G.items = [];
  G.particles = [];
  G.coinList = G.level.coins.map((c) => ({ ...c, taken: false }));
  G.bumps.clear();
  G.cam.x = 0;
  G.cam.y = G.level.height - VIEW_H;
  G.flagDrop = 0;
  G.flagPhase = '';
  G.stompCombo = 0;
  G.shake = 0;
}

function startGame() {
  sound.ensure();
  sound.setMuted(sound.muted);
  overlay.classList.remove('show');
  resetLevel();
  G.score = 0;
  G.coinCount = 0;
  G.lives = 3;
  G.time = 300;
  G.t = 0;
  G.state = 'play';
  G.stateTimer = 0;
  input.left = input.right = input.jump = input.run = false;
  input.jumpPressed = input.runPressed = false;
  sound.startMusic();
}

function respawn() {
  resetLevel();
  G.time = 300;
  G.state = 'play';
  G.stateTimer = 0;
  input.jumpPressed = input.runPressed = false;
  sound.startMusic();
}

// ---------------------------------------------------------------------------
// Collision helpers
// ---------------------------------------------------------------------------

function isSolid(tx, ty) {
  const level = G.level;
  if (tx < 0 || tx >= level.W) return true;
  if (ty < 0) return false;
  if (ty >= level.H) return false;
  return level.solid[ty * level.W + tx] === 1;
}

function moveX(e, dt, stopOnHit = true) {
  e.hitWall = false;
  e.x += e.vx * dt;
  const y0 = Math.floor(e.y / TILE);
  const y1 = Math.floor((e.y + e.h - 0.01) / TILE);

  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (isSolid(tx, ty)) {
        e.x = tx * TILE - e.w;
        e.hitWall = true;
        if (stopOnHit) e.vx = 0;
        return;
      }
    }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      if (isSolid(tx, ty)) {
        e.x = (tx + 1) * TILE;
        e.hitWall = true;
        if (stopOnHit) e.vx = 0;
        return;
      }
    }
  }
}

function moveY(e, dt, onHeadHit = null) {
  e.y += e.vy * dt;
  const x0 = Math.floor(e.x / TILE);
  const x1 = Math.floor((e.x + e.w - 0.01) / TILE);

  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tx, ty)) {
        e.y = ty * TILE - e.h;
        e.vy = 0;
        e.onGround = true;
        return;
      }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TILE);
    for (let tx = x0; tx <= x1; tx++) {
      if (isSolid(tx, ty)) {
        e.y = (ty + 1) * TILE;
        e.vy = 0;
        if (onHeadHit) onHeadHit(tx, ty);
        return;
      }
    }
  }
}

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

function spawnParticles(x, y, count, opts = {}) {
  const {
    color = '#ffd75e', speed = 90, size = 2, kind = 'spark', gravity = 600, life = 0.5, spread = Math.PI * 2,
  } = opts;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * spread - spread / 2 - Math.PI / 2;
    const mag = speed * (0.4 + Math.random() * 0.8);
    G.particles.push({
      kind,
      x, y,
      vx: Math.cos(angle) * mag,
      vy: Math.sin(angle) * mag,
      gravity,
      size: size * (0.6 + Math.random() * 0.8),
      color,
      life: life * (0.6 + Math.random() * 0.7),
      maxLife: life,
    });
  }
}

function popText(x, y, text, color = '#fff8ec') {
  G.particles.push({
    kind: 'text', x, y, vx: 0, vy: -42, gravity: 0, size: 1,
    color, text, life: 0.9, maxLife: 0.9,
  });
}

function dustPuff(x, y, dir = 0) {
  G.particles.push({
    kind: 'dust', x, y, vx: dir * 20 + (Math.random() - 0.5) * 20, vy: -12 - Math.random() * 12,
    gravity: -10, size: 2.5, color: 'rgba(255,255,255,0.85)', life: 0.35, maxLife: 0.35,
  });
}

function addScore(points, x, y) {
  G.score += points;
  if (x !== undefined) popText(x, y, String(points));
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------

function bumpBlock(tx, ty) {
  G.bumps.set(ty * G.level.W + tx, { t: 0, dur: 0.24 });
}

function breakBrick(tx, ty) {
  const level = G.level;
  const i = ty * level.W + tx;
  level.tiles[i] = T.EMPTY;
  level.solid[i] = 0;
  const cx = tx * TILE + 8;
  const cy = ty * TILE + 8;
  for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    G.particles.push({
      kind: 'debris', x: cx + dx * 4, y: cy + dy * 4,
      vx: dx * 90 + (Math.random() - 0.5) * 40,
      vy: dy * 140 - 120,
      gravity: 900, size: 4, color: dx * dy > 0 ? '#cf5a2e' : '#e8834f',
      life: 1, maxLife: 1,
    });
  }
  spawnParticles(cx, cy, 5, { color: '#ffd9a8', speed: 70, size: 2, life: 0.35 });
  sound.brick();
}

function spawnCoinPop(tx, ty) {
  G.particles.push({
    kind: 'coinpop', x: tx * TILE + 8, y: ty * TILE - 4,
    vx: 0, vy: -190, gravity: 700, size: 1, color: '#ffd75e',
    life: 0.55, maxLife: 0.55,
  });
}

function spawnPower(tx, ty) {
  const type = G.player.power === 0 ? 'mushroom' : 'flower';
  const w = 14;
  const h = 14;
  G.items.push({
    type,
    x: tx * TILE + 1,
    y: ty * TILE,
    w, h,
    vx: 0,
    vy: 0,
    emerge: 0.5,
    emergeFrom: ty * TILE,
    targetY: ty * TILE - h,
    onGround: false,
    remove: false,
  });
  sound.grow();
}

function hitBlock(tx, ty) {
  const level = G.level;
  const i = ty * level.W + tx;
  const type = level.tiles[i];

  if (type === T.BRICK) {
    if (G.player.power > 0) {
      breakBrick(tx, ty);
      addScore(50, tx * TILE + 8, ty * TILE);
    } else {
      bumpBlock(tx, ty);
      sound.bump();
    }
    bumpEnemiesOn(tx, ty);
  } else if (type === T.QCOIN || type === T.QPOWER) {
    level.tiles[i] = T.USED;
    bumpBlock(tx, ty);
    bumpEnemiesOn(tx, ty);
    if (type === T.QCOIN) {
      G.coinCount += 1;
      addScore(200, tx * TILE + 8, ty * TILE - 6);
      spawnCoinPop(tx, ty);
      sound.coin();
    } else {
      spawnPower(tx, ty);
    }
  } else if (type === T.STONE || type === T.USED || type === T.GROUND) {
    bumpBlock(tx, ty);
    sound.bump();
    bumpEnemiesOn(tx, ty);
  }
}

function bumpEnemiesOn(tx, ty) {
  const top = ty * TILE;
  for (const e of G.enemies) {
    if (e.remove || e.type === 'piranha') continue;
    const feet = e.y + e.h;
    if (Math.abs(feet - top) < 5 && e.x + e.w > tx * TILE && e.x < (tx + 1) * TILE) {
      e.state = 'flip';
      e.vy = -240;
      e.vx = (Math.random() - 0.5) * 40;
      addScore(100, e.x + e.w / 2, e.y);
    }
  }
}

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

function setPower(p, power) {
  const oldH = p.h;
  const oldW = p.w;
  p.power = power;
  p.h = power > 0 ? 28 : 15;
  p.w = power > 0 ? 12 : 11;
  p.y -= p.h - oldH;
  p.x += (oldW - p.w) / 2;
}

function damagePlayer() {
  const p = G.player;
  if (G.state !== 'play' || p.invuln > 0) return;
  if (p.power > 0) {
    setPower(p, 0);
    p.invuln = 2;
    G.shake = 0.25;
    sound.hurt();
    spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 8, { color: '#ffffff', speed: 80, size: 2, life: 0.4 });
  } else {
    killPlayer();
  }
}

function killPlayer() {
  const p = G.player;
  if (G.state === 'dead') return;
  G.state = 'dead';
  G.stateTimer = 0;
  p.dead = true;
  p.vx = 0;
  p.vy = -360;
  p.onGround = false;
  p.invuln = 0;
  G.shake = 0.3;
  sound.die();
  sound.stopMusic();
}

function collectCoin(coin) {
  coin.taken = true;
  G.coinCount += 1;
  G.score += 200;
  sound.coin();
  spawnParticles(coin.x, coin.y, 5, { color: '#ffe9a3', speed: 70, size: 2, life: 0.4 });
  if (G.coinCount >= 100) {
    G.coinCount -= 100;
    G.lives += 1;
    sound.power();
    popText(G.player.x + G.player.w / 2, G.player.y - 8, '1UP', '#8ef58e');
  }
}

function updatePlayer(dt) {
  const p = G.player;

  if (p.invuln > 0) p.invuln = Math.max(0, p.invuln - dt);
  if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);

  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const maxSpeed = input.run ? RUN_SPEED : WALK_SPEED;
  const accel = p.onGround ? ACCEL : AIR_ACCEL;

  p.skid = p.onGround && dir !== 0 && p.vx * dir < -8 && Math.abs(p.vx) > 24;

  if (dir !== 0) {
    if (p.skid) {
      p.vx += dir * accel * 2.1 * dt;
      if (Math.random() < 0.4) dustPuff(p.x + p.w / 2, p.y + p.h, -dir);
    } else {
      p.vx += dir * accel * dt;
    }
    p.facing = dir;
    if (Math.abs(p.vx) > maxSpeed) {
      const excess = Math.abs(p.vx) - maxSpeed;
      p.vx -= Math.sign(p.vx) * Math.min(excess, FRICTION * dt);
    }
  } else {
    const f = (p.onGround ? FRICTION : AIR_FRICTION) * dt;
    if (Math.abs(p.vx) <= f) p.vx = 0;
    else p.vx -= Math.sign(p.vx) * f;
  }

  // jump buffering + coyote time
  if (input.jumpPressed) {
    p.buffer = JUMP_BUFFER;
    input.jumpPressed = false;
  }
  if (p.onGround) p.coyote = COYOTE;
  else p.coyote = Math.max(0, p.coyote - dt);
  p.buffer = Math.max(0, p.buffer - dt);

  if (p.buffer > 0 && p.coyote > 0) {
    p.vy = JUMP_V - Math.min(Math.abs(p.vx), RUN_SPEED) * 0.1;
    p.buffer = 0;
    p.coyote = 0;
    p.onGround = false;
    p.jumpCut = false;
    if (p.power > 0) sound.bigJump(); else sound.jump();
    dustPuff(p.x + p.w / 2, p.y + p.h, 0);
  }

  if (!input.jump && p.vy < JUMP_CUT && !p.jumpCut) {
    p.vy = JUMP_CUT;
    p.jumpCut = true;
  }
  if (p.vy >= 0) p.jumpCut = false;

  // fireballs
  if (input.runPressed) {
    input.runPressed = false;
    if (p.power === 2 && p.fireCooldown <= 0) {
      const active = G.items.filter((it) => it.type === 'fireball' && !it.remove).length;
      if (active < 2) {
        G.items.push({
          type: 'fireball',
          x: p.facing > 0 ? p.x + p.w : p.x - 7,
          y: p.y + p.h * 0.4,
          w: 7, h: 7,
          vx: p.facing * 240,
          vy: 60,
          onGround: false,
          remove: false,
          life: 3,
        });
        p.fireCooldown = 0.22;
        sound.fire();
      }
    }
  }

  // gravity + movement
  p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
  p.onGround = false;
  moveX(p, dt, true);
  moveY(p, dt, hitBlock);

  if (p.onGround && Math.abs(p.vx) > 4) {
    p.walkPhase += Math.abs(p.vx) * dt * 0.075;
  } else if (p.onGround) {
    p.walkPhase = 0;
  }

  // pick up coins
  for (const coin of G.coinList) {
    if (coin.taken) continue;
    const box = { x: coin.x - 6, y: coin.y - 6, w: 12, h: 12 };
    if (overlaps(p, box)) collectCoin(coin);
  }

  if (p.x < 0) { p.x = 0; p.vx = Math.max(0, p.vx); }
  if (p.x + p.w > G.level.width) { p.x = G.level.width - p.w; p.vx = Math.min(0, p.vx); }

  if (p.y > G.level.height + 40) killPlayer();

  // flag pole
  if (p.x + p.w >= G.level.flagX && p.x < G.level.flagX + 10) startFlag();
}

// ---------------------------------------------------------------------------
// Enemies
// ---------------------------------------------------------------------------

function updateEnemies(dt) {
  const p = G.player;

  for (const e of G.enemies) {
    if (e.remove) continue;

    if (e.type === 'piranha') {
      updatePiranha(e, dt);
      if (e.plantH > 4 && G.state === 'play') {
        const box = { x: e.x + 1, y: e.y - e.plantH - 10, w: 12, h: e.plantH + 10 };
        if (overlaps(p, box)) damagePlayer();
      }
      continue;
    }

    if (!e.awake) {
      if (e.x < G.cam.x + VIEW_W + 140) e.awake = true;
      else continue;
    }

    if (e.state === 'squash') {
      e.timer -= dt;
      if (e.timer <= 0) e.remove = true;
      continue;
    }

    if (e.state === 'flip') {
      e.vy += GRAVITY * dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (e.y > G.level.height + 60) e.remove = true;
      continue;
    }

    e.anim += dt;
    e.vy = Math.min(MAX_FALL, e.vy + GRAVITY * dt);
    e.onGround = false;

    if (e.state === 'shell') {
      if (e.vx === 0) {
        e.timer += dt;
      }
      moveX(e, dt, false);
      if (e.hitWall) { e.vx = -e.vx; sound.bump(); }
      moveY(e, dt);
      if (e.y > G.level.height + 40) e.remove = true;
    } else {
      moveX(e, dt, false);
      if (e.hitWall) {
        e.vx = -e.vx;
        e.facing = e.vx > 0 ? 1 : -1;
      }
      moveY(e, dt);
      if (e.y > G.level.height + 40) e.remove = true;
    }

    if (G.state !== 'play') continue;

    // shell smashes other enemies
    if (e.type === 'koopa' && e.state === 'shell' && Math.abs(e.vx) > 100) {
      for (const other of G.enemies) {
        if (other === e || other.remove || other.type === 'piranha' || other.state === 'flip') continue;
        if (overlaps(e, other)) {
          other.state = 'flip';
          other.vy = -260;
          other.vx = Math.sign(e.vx) * 40;
          addScore(200, other.x + other.w / 2, other.y);
          sound.kick();
        }
      }
    }

    if (!overlaps(p, e)) continue;

    const feet = p.y + p.h;
    const stomping = p.vy > 0 && feet - e.y < 14;

    if (e.type === 'koopa' && e.state === 'shell') {
      if (stomping) {
        p.vy = input.jump ? -350 : -260;
        p.y = e.y - p.h;
        if (Math.abs(e.vx) > 100) {
          e.vx = 0;
          e.timer = 0;
          sound.stomp();
        } else {
          e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * 320;
          sound.kick();
          addScore(400, e.x + e.w / 2, e.y);
        }
      } else if (Math.abs(e.vx) > 100) {
        damagePlayer();
      } else {
        e.vx = (p.x + p.w / 2 < e.x + e.w / 2 ? 1 : -1) * 320;
        sound.kick();
        addScore(400, e.x + e.w / 2, e.y);
      }
      continue;
    }

    if (stomping) {
      p.vy = input.jump ? -360 : -260;
      p.y = e.y - p.h;
      G.stompCombo = Math.min(G.stompCombo + 1, 5);
      if (e.type === 'goomba') {
        e.state = 'squash';
        e.timer = 0.45;
        addScore(100 * G.stompCombo, e.x + e.w / 2, e.y);
      } else {
        const oldH = e.h;
        e.state = 'shell';
        e.h = 14;
        e.y += oldH - e.h;
        e.vx = 0;
        e.timer = 0;
        addScore(100, e.x + e.w / 2, e.y);
      }
      sound.stomp();
      G.shake = 0.12;
      spawnParticles(e.x + e.w / 2, e.y + 2, 4, { color: '#fff3d6', speed: 60, size: 2, life: 0.3 });
    } else {
      damagePlayer();
    }
  }
}

function updatePiranha(e, dt) {
  const p = G.player;
  const cx = e.x + e.w / 2;
  const near = Math.abs(p.x + p.w / 2 - cx) < 34;
  e.timer -= dt;

  if (e.phase === 'hidden') {
    if (e.timer <= 0 && !near) {
      e.phase = 'rise';
      e.timer = 0.45;
    }
  } else if (e.phase === 'rise') {
    e.plantH = Math.min(26, e.plantH + 70 * dt);
    if (e.plantH >= 26) {
      e.phase = 'out';
      e.timer = 1.5;
    }
  } else if (e.phase === 'out') {
    if (e.timer <= 0 || near) {
      e.phase = 'lower';
      e.timer = 0.35;
    }
  } else if (e.phase === 'lower') {
    e.plantH = Math.max(0, e.plantH - 90 * dt);
    if (e.plantH <= 0) {
      e.phase = 'hidden';
      e.timer = 2 + Math.random();
    }
  }
  e.open = e.phase === 'out' && Math.sin(G.t * 9) > 0.2;
}

// ---------------------------------------------------------------------------
// Items & fireballs
// ---------------------------------------------------------------------------

function updateItems(dt) {
  const p = G.player;

  for (const it of G.items) {
    if (it.remove) continue;

    if (it.type === 'fireball') {
      it.life -= dt;
      if (it.life <= 0) { it.remove = true; continue; }
      it.vy = Math.min(460, it.vy + 900 * dt);
      it.onGround = false;
      moveX(it, dt, true);
      if (it.hitWall) {
        it.remove = true;
        spawnParticles(it.x + 3, it.y + 3, 5, { color: '#ffb347', speed: 80, size: 2, life: 0.3 });
        continue;
      }
      const prevVy = it.vy;
      moveY(it, dt);
      if (it.onGround) {
        it.vy = -250;
      }
      if (it.y > G.level.height + 20) { it.remove = true; continue; }

      // hit enemies
      for (const e of G.enemies) {
        if (e.remove || e.state === 'squash') continue;
        const box = e.type === 'piranha'
          ? { x: e.x + 1, y: e.y - e.plantH - 10, w: 12, h: e.plantH + 10 }
          : e;
        if (e.type === 'piranha' && e.plantH < 4) continue;
        if (overlaps(it, box)) {
          e.remove = true;
          it.remove = true;
          addScore(200, e.x + e.w / 2, e.y);
          spawnParticles(e.x + e.w / 2, e.y, 10, { color: '#ffb347', speed: 110, size: 2.5, life: 0.45 });
          sound.kick();
          break;
        }
      }
      continue;
    }

    if (it.emerge > 0) {
      it.emerge = Math.max(0, it.emerge - dt);
      const k = 1 - it.emerge / 0.5;
      it.y = it.emergeFrom + (it.targetY - it.emergeFrom) * k;
      continue;
    }

    if (it.type === 'mushroom') {
      it.vx = it.vx || 58;
      it.vy = Math.min(MAX_FALL, it.vy + GRAVITY * dt);
      it.onGround = false;
      moveX(it, dt, false);
      if (it.hitWall) it.vx = -it.vx;
      moveY(it, dt);
      if (it.y > G.level.height + 30) it.remove = true;
    }

    if (G.state === 'play' && overlaps(p, it)) {
      it.remove = true;
      if (it.type === 'mushroom') {
        if (p.power === 0) {
          setPower(p, 1);
          sound.power();
          addScore(1000, p.x + p.w / 2, p.y);
          spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 12, { color: '#ffe9a3', speed: 100, size: 2.5, life: 0.5 });
        } else {
          addScore(1000, p.x + p.w / 2, p.y);
        }
      } else if (it.type === 'flower') {
        setPower(p, 2);
        sound.power();
        addScore(1000, p.x + p.w / 2, p.y);
        spawnParticles(p.x + p.w / 2, p.y + p.h / 2, 14, { color: '#ffb347', speed: 110, size: 2.5, life: 0.55 });
      }
    }
  }

  G.items = G.items.filter((it) => !it.remove);
  G.enemies = G.enemies.filter((e) => !e.remove);
}

// ---------------------------------------------------------------------------
// Level flow
// ---------------------------------------------------------------------------

function startFlag() {
  if (G.state !== 'play') return;
  G.state = 'flag';
  G.flagPhase = 'slide';
  G.stateTimer = 0;
  const p = G.player;
  p.vx = 0;
  p.vy = 0;
  p.x = G.level.flagX - p.w + 2;
  p.facing = 1;
  G.flagDrop = 0;
  G.score += Math.max(0, Math.round((G.level.groundTop - p.y - p.h) / 3));
  sound.flag();
  sound.stopMusic();
}

function updateFlag(dt) {
  const p = G.player;
  G.stateTimer += dt;
  G.flagDrop = Math.min(1, G.flagDrop + dt * 1.1);

  if (G.flagPhase === 'slide') {
    p.y += 95 * dt;
    if (p.y + p.h >= G.level.groundTop) {
      p.y = G.level.groundTop - p.h;
      G.flagPhase = 'walk';
      G.stateTimer = 0;
    }
  } else if (G.flagPhase === 'walk') {
    p.facing = 1;
    p.x += 74 * dt;
    p.walkPhase += dt * 6;
    p.onGround = true;
    if (p.x > G.level.castleX + 40) {
      G.flagPhase = 'done';
      G.stateTimer = 0;
      G.state = 'clear';
      p.visible = false;
      const bonus = Math.floor(G.time) * 10;
      G.score += bonus;
      if (bonus > 0) popText(p.x, p.y - 20, String(bonus), '#ffe9a3');
      sound.clear();
      setTimeout(() => {
        if (G.state === 'clear') showResult('Course Clear!', 'World 1-1 complete', `Score ${G.score} · Coins ${G.coinCount}`);
      }, 1400);
    }
  }
}

function showResult(title, kicker, sub) {
  G.state = 'over';
  overlay.innerHTML = `
    <div class="panel">
      <p class="eyebrow">${kicker}</p>
      <h1 class="result">${title}</h1>
      <p class="sub">${sub}</p>
      <button class="btn" type="button">Play Again</button>
      <p class="keys"><span class="desk">Press ENTER or tap the button</span><span class="touchhint">Tap to play again</span></p>
    </div>`;
  overlay.classList.add('show');
  sound.stopMusic();
}

function updateCamera(dt) {
  const p = G.player;
  const target = p.x + p.w / 2 - VIEW_W * 0.42;
  const maxX = Math.max(0, G.level.width - VIEW_W);
  G.cam.x += (target - G.cam.x) * Math.min(1, dt * 8);
  G.cam.x = Math.max(0, Math.min(maxX, G.cam.x));
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.gravity * dt;
  }
  G.particles = G.particles.filter((p) => p.life > 0);
}

function updateBumps(dt) {
  for (const [key, bump] of G.bumps) {
    bump.t += dt;
    if (bump.t >= bump.dur) G.bumps.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

function update(dt) {
  G.t += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt);

  if (G.state === 'title') {
    G.player.onGround = true;
    G.player.walkPhase = 0;
    return;
  }

  if (G.state === 'pause' || G.state === 'over') return;

  updateBumps(dt);
  updateParticles(dt);

  if (G.state === 'play') {
    G.time -= dt * 2.5;
    if (G.time <= 30 && Math.ceil(G.time) !== Math.ceil(G.time + dt * 2.5)) {
      if (G.time > 0) sound.tick();
    }
    if (G.time <= 0) {
      G.time = 0;
      killPlayer();
    }
    updatePlayer(dt);
    updateEnemies(dt);
    updateItems(dt);
    updateCamera(dt);
  } else if (G.state === 'dead') {
    G.stateTimer += dt;
    const p = G.player;
    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    p.y += p.vy * dt;
    if (G.stateTimer > 2.1) {
      G.lives -= 1;
      if (G.lives <= 0) {
        showResult('Game Over', 'Out of lives', `Score ${G.score} · Coins ${G.coinCount}`);
      } else {
        respawn();
      }
    }
  } else if (G.state === 'flag') {
    updateFlag(dt);
    updateEnemies(dt);
    updateCamera(dt);
  } else if (G.state === 'clear') {
    updateEnemies(dt);
    updateCamera(dt);
  }
}

let lastTime = performance.now();
let accumulator = 0;
const STEP = 1 / 120;

function frame(now) {
  const elapsed = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;
  accumulator += elapsed;
  let steps = 0;
  while (accumulator >= STEP && steps < 8) {
    update(STEP);
    accumulator -= STEP;
    steps += 1;
  }
  render(ctx, G);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function pressJump() {
  input.jump = true;
  input.jumpPressed = true;
  sound.ensure();
}

function releaseJump() {
  input.jump = false;
}

function pressRun() {
  input.run = true;
  input.runPressed = true;
  sound.ensure();
}

function releaseRun() {
  input.run = false;
}

function togglePause() {
  if (G.state === 'play') {
    G.state = 'pause';
    sound.stopMusic();
  } else if (G.state === 'pause') {
    G.state = 'play';
    input.jumpPressed = input.runPressed = false;
    sound.startMusic();
  }
}

function toggleMute() {
  sound.ensure();
  sound.setMuted(!sound.muted);
  soundBtn.classList.toggle('muted', sound.muted);
}

const KEY_LEFT = new Set(['ArrowLeft', 'KeyA']);
const KEY_RIGHT = new Set(['ArrowRight', 'KeyD']);
const KEY_JUMP = new Set(['Space', 'KeyZ', 'KeyW', 'ArrowUp']);
const KEY_RUN = new Set(['ShiftLeft', 'ShiftRight', 'KeyX']);

window.addEventListener('keydown', (event) => {
  const code = event.code;
  if (KEY_LEFT.has(code)) { input.left = true; event.preventDefault(); }
  else if (KEY_RIGHT.has(code)) { input.right = true; event.preventDefault(); }
  else if (KEY_JUMP.has(code)) {
    if (!event.repeat) pressJump();
    event.preventDefault();
  } else if (KEY_RUN.has(code)) {
    if (!event.repeat) pressRun();
    event.preventDefault();
  } else if (code === 'KeyP' || code === 'Escape') {
    togglePause();
    event.preventDefault();
  } else if (code === 'KeyM') {
    toggleMute();
  } else if (code === 'Enter') {
    if (G.state === 'title' || G.state === 'over') startGame();
  }

  if (G.state === 'title' && (KEY_JUMP.has(code) || code === 'Enter')) startGame();
}, { passive: false });

window.addEventListener('keyup', (event) => {
  const code = event.code;
  if (KEY_LEFT.has(code)) input.left = false;
  else if (KEY_RIGHT.has(code)) input.right = false;
  else if (KEY_JUMP.has(code)) releaseJump();
  else if (KEY_RUN.has(code)) releaseRun();
});

window.addEventListener('blur', () => {
  input.left = input.right = input.jump = input.run = false;
  if (G.state === 'play') togglePause();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.state === 'play') togglePause();
});

// touch controls
for (const button of touch.querySelectorAll('button[data-key]')) {
  const key = button.dataset.key;
  const down = (event) => {
    event.preventDefault();
    button.classList.add('pressed');
    if (button.setPointerCapture) {
      try { button.setPointerCapture(event.pointerId); } catch { /* ignore */ }
    }
    if (key === 'left') input.left = true;
    else if (key === 'right') input.right = true;
    else if (key === 'jump') pressJump();
    else if (key === 'run') pressRun();
  };
  const up = (event) => {
    event.preventDefault();
    button.classList.remove('pressed');
    if (key === 'left') input.left = false;
    else if (key === 'right') input.right = false;
    else if (key === 'jump') releaseJump();
    else if (key === 'run') releaseRun();
  };
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('lostpointercapture', up);
  button.addEventListener('contextmenu', (e) => e.preventDefault());
}

// swipe-free tap on the canvas jumps when playing on touch devices
canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse') return;
  if (G.state === 'play') pressJump();
  else if (G.state === 'title') startGame();
});
canvas.addEventListener('pointerup', (event) => {
  if (event.pointerType === 'mouse') return;
  releaseJump();
});

overlay.addEventListener('click', (event) => {
  if (event.target.closest('button')) startGame();
});

soundBtn.addEventListener('click', toggleMute);
pauseBtn.addEventListener('click', () => {
  if (G.state === 'title') return;
  togglePause();
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

resetLevel();
G.state = 'title';
window.__G = G;
requestAnimationFrame((now) => {
  lastTime = now;
  requestAnimationFrame(frame);
});
