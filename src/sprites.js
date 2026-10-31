// Hand-drawn pixel sprites. Everything is composed from small rectangles so the
// art stays crisp at any scale and the whole game ships without image assets.

const SKIN = '#ffc39b';
const SKIN_DARK = '#e09a70';
const HAIR = '#5a2c10';
const DARK = '#241407';
const SHOE = '#6b3a1a';
const WHITE = '#fff6e8';

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function marioPalette(power) {
  if (power === 2) {
    return { cap: '#f7f3e6', capDark: '#cfc6ae', shirt: '#f7f3e6', overall: '#e33127', overallDark: '#a81f1a' };
  }
  return { cap: '#e33127', capDark: '#a81f1a', shirt: '#e33127', overall: '#2f5fd0', overallDark: '#1d3f96' };
}

export function drawMario(ctx, x, y, w, h, o) {
  const scale = o.power > 0 ? 1.78 : 1;
  const spriteW = 12 * scale;
  const spriteH = 16 * scale;
  const ax = Math.round(x + w / 2 - spriteW / 2);
  const ay = Math.round(y + h - spriteH);
  const pal = marioPalette(o.power);
  const facing = o.facing < 0 ? -1 : 1;

  ctx.save();
  ctx.translate(ax + (facing < 0 ? spriteW : 0), ay);
  ctx.scale(facing < 0 ? -scale : scale, scale);

  const walking = o.onGround && Math.abs(o.vx) > 6 && !o.skid && !o.dead;
  const swing = walking ? Math.sin(o.walkPhase * Math.PI * 2) : 0;
  const bounce = walking ? (Math.abs(swing) > 0.7 ? -1 : 0) : 0;

  // --- legs & shoes -------------------------------------------------
  let frontLegX = 3;
  let backLegX = 7;
  let frontShoeX = 2;
  let backShoeX = 7;
  let frontShoeY = 14;
  let backShoeY = 14;

  if (o.dead) {
    frontLegX = 3; backLegX = 7;
    frontShoeX = 2; backShoeX = 7;
  } else if (!o.onGround) {
    frontLegX = 4; backLegX = 7;
    frontShoeX = 4; frontShoeY = 13;
    backShoeX = 8; backShoeY = 15;
  } else if (o.skid) {
    frontShoeX = 1; backShoeX = 8;
  } else if (walking) {
    frontLegX = 3 + Math.round(swing * 1.4);
    backLegX = 7 + Math.round(swing * 1.4);
    frontShoeX = 2 + Math.round(swing * 2);
    backShoeX = 7 + Math.round(swing * 2);
    frontShoeY = 14 + (swing > 0.75 ? -1 : 0);
  }

  px(ctx, frontLegX, 12 + bounce, 2, 2, pal.overallDark);
  px(ctx, backLegX, 12 + bounce, 2, 2, pal.overallDark);
  px(ctx, frontShoeX, frontShoeY + bounce, 4, 2, SHOE);
  px(ctx, backShoeX, backShoeY + bounce, 4, 2, SHOE);
  px(ctx, frontShoeX, frontShoeY + 1 + bounce, 4, 1, '#3f210e');
  px(ctx, backShoeX, backShoeY + 1 + bounce, 4, 1, '#3f210e');

  // --- torso ---------------------------------------------------------
  const bodyY = bounce;
  px(ctx, 3, 9 + bodyY, 7, 3, pal.overall);
  px(ctx, 3, 11 + bodyY, 7, 1, pal.overallDark);
  px(ctx, 3, 7 + bodyY, 7, 2, pal.shirt);
  px(ctx, 4, 7 + bodyY, 2, 2, pal.overall);
  px(ctx, 7, 7 + bodyY, 2, 2, pal.overall);
  px(ctx, 4, 9 + bodyY, 1, 1, '#ffd94a');
  px(ctx, 8, 9 + bodyY, 1, 1, '#ffd94a');

  // --- arms ----------------------------------------------------------
  if (o.dead) {
    px(ctx, 1, 6 + bodyY, 2, 3, pal.shirt);
    px(ctx, 9, 6 + bodyY, 2, 3, pal.shirt);
    px(ctx, 1, 4 + bodyY, 2, 2, SKIN);
    px(ctx, 9, 4 + bodyY, 2, 2, SKIN);
  } else if (!o.onGround) {
    px(ctx, 1, 7 + bodyY, 2, 3, pal.shirt);
    px(ctx, 9, 5 + bodyY, 2, 4, pal.shirt);
    px(ctx, 1, 9 + bodyY, 2, 2, SKIN);
    px(ctx, 9, 4 + bodyY, 2, 2, SKIN);
  } else if (o.skid) {
    px(ctx, 1, 7 + bodyY, 2, 3, pal.shirt);
    px(ctx, 9, 8 + bodyY, 2, 2, pal.shirt);
    px(ctx, 1, 10 + bodyY, 2, 1, SKIN);
    px(ctx, 10, 8 + bodyY, 2, 2, SKIN);
  } else if (walking) {
    px(ctx, 1, 8 + bodyY + Math.round(swing), 2, 3, pal.shirt);
    px(ctx, 9, 8 + bodyY - Math.round(swing), 2, 3, pal.shirt);
    px(ctx, 1, 11 + bodyY + Math.round(swing), 2, 1, SKIN);
    px(ctx, 9, 11 + bodyY - Math.round(swing), 2, 1, SKIN);
  } else {
    px(ctx, 2, 8 + bodyY, 1, 3, pal.shirt);
    px(ctx, 9, 8 + bodyY, 2, 3, pal.shirt);
    px(ctx, 2, 10 + bodyY, 1, 1, SKIN);
    px(ctx, 10, 10 + bodyY, 1, 1, SKIN);
  }

  // --- head ----------------------------------------------------------
  const headY = bodyY;
  px(ctx, 2, 0 + headY, 8, 2, pal.cap);
  px(ctx, 1, 2 + headY, 10, 1, pal.cap);
  px(ctx, 1, 2 + headY, 10, 1, pal.capDark);
  px(ctx, 2, 0 + headY, 8, 1, pal.cap);
  px(ctx, 3, 0 + headY, 4, 1, '#ff6f5e');

  px(ctx, 2, 3 + headY, 2, 3, HAIR);
  px(ctx, 4, 3 + headY, 6, 3, SKIN);
  px(ctx, 4, 3 + headY, 6, 1, SKIN_DARK);
  px(ctx, 7, 4 + headY, 1, 2, DARK);
  px(ctx, 8, 3 + headY, 1, 1, SKIN_DARK);
  px(ctx, 9, 5 + headY, 2, 2, SKIN);
  px(ctx, 10, 6 + headY, 1, 1, SKIN_DARK);
  px(ctx, 5, 6 + headY, 4, 1, HAIR);
  px(ctx, 4, 6 + headY, 1, 1, HAIR);
  px(ctx, 5, 7 + headY, 4, 1, SKIN_DARK);
  px(ctx, 3, 5 + headY, 1, 2, SKIN_DARK);

  // a tiny sparkle when invincible / powered up
  if (o.glow) {
    ctx.globalAlpha = 0.55;
    px(ctx, 0, 1 + headY, 1, 1, WHITE);
    px(ctx, 11, 3 + headY, 1, 1, WHITE);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

export function drawGoomba(ctx, x, y, w, h, o) {
  const facing = o.vx < 0 ? -1 : 1;
  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(y + h));
  ctx.scale(facing, 1);

  if (o.state === 'squash') {
    px(ctx, -7, -4, 14, 4, '#8b4a1f');
    px(ctx, -7, -4, 14, 1, '#b0662c');
    px(ctx, -6, -2, 3, 2, '#3a1f0c');
    px(ctx, 3, -2, 3, 2, '#3a1f0c');
    px(ctx, -5, -3, 3, 2, '#fff6e8');
    px(ctx, 2, -3, 3, 2, '#fff6e8');
    ctx.restore();
    return;
  }

  const step = Math.floor(o.anim * 8) % 2;
  // feet
  px(ctx, -7 + step, -4, 6, 4, '#3a1f0c');
  px(ctx, 1 - step, -4, 6, 4, '#3a1f0c');
  px(ctx, -7 + step, -1, 6, 1, '#241407');
  px(ctx, 1 - step, -1, 6, 1, '#241407');
  // body
  px(ctx, -6, -12, 12, 8, '#9a5423');
  px(ctx, -7, -9, 14, 5, '#9a5423');
  px(ctx, -6, -12, 12, 2, '#c07a3e');
  px(ctx, -5, -13, 10, 2, '#c07a3e');
  px(ctx, -5, -6, 10, 2, '#b0662c');
  px(ctx, -7, -5, 14, 1, '#7a3d18');
  // eyes
  px(ctx, -5, -10, 4, 5, '#fff6e8');
  px(ctx, 1, -10, 4, 5, '#fff6e8');
  px(ctx, -2, -9, 2, 3, DARK);
  px(ctx, 2, -9, 2, 3, DARK);
  px(ctx, -5, -10, 1, 5, '#d9c9ae');
  px(ctx, 4, -10, 1, 5, '#d9c9ae');
  // angry brows
  px(ctx, -6, -12, 4, 1, '#4a250e');
  px(ctx, 2, -12, 4, 1, '#4a250e');
  px(ctx, -5, -11, 2, 1, '#4a250e');
  px(ctx, 3, -11, 2, 1, '#4a250e');
  // fangs
  px(ctx, -3, -5, 2, 1, '#fff6e8');
  px(ctx, 1, -5, 2, 1, '#fff6e8');
  ctx.restore();
}

export function drawKoopa(ctx, x, y, w, h, o) {
  const facing = o.facing || 1;
  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(y + h));
  ctx.scale(facing, 1);

  if (o.state === 'shell') {
    px(ctx, -7, -12, 14, 10, '#2e9e3e');
    px(ctx, -7, -12, 14, 2, '#4dc45d');
    px(ctx, -8, -5, 16, 5, '#f0e2a2');
    px(ctx, -8, -5, 16, 1, '#c9b56f');
    px(ctx, -5, -10, 4, 4, '#1d6f2b');
    px(ctx, 1, -10, 4, 4, '#1d6f2b');
    px(ctx, -2, -8, 4, 4, '#1d6f2b');
    if (o.spin) {
      px(ctx, -8, -13, 2, 2, WHITE);
      px(ctx, 6, -13, 2, 2, WHITE);
    }
    ctx.restore();
    return;
  }

  const step = Math.floor(o.anim * 7) % 2;
  // feet
  px(ctx, -6 + step, -3, 5, 3, '#f2a03a');
  px(ctx, 1 - step, -3, 5, 3, '#f2a03a');
  // shell
  px(ctx, -7, -14, 14, 11, '#2e9e3e');
  px(ctx, -6, -15, 12, 2, '#4dc45d');
  px(ctx, -8, -6, 16, 4, '#f0e2a2');
  px(ctx, -8, -6, 16, 1, '#c9b56f');
  px(ctx, -4, -12, 4, 4, '#1d6f2b');
  px(ctx, 2, -12, 3, 3, '#1d6f2b');
  px(ctx, -1, -9, 4, 3, '#1d6f2b');
  // head
  px(ctx, 4, -19, 5, 6, '#f7e08a');
  px(ctx, 4, -19, 5, 1, '#fff2b8');
  px(ctx, 8, -18, 3, 4, '#f7e08a');
  px(ctx, 8, -17, 1, 2, DARK);
  px(ctx, 9, -14, 2, 1, '#c9a54a');
  // neck
  px(ctx, 2, -16, 4, 4, '#f7e08a');
  ctx.restore();
}

export function drawMushroom(ctx, x, y, w, h, o = {}) {
  const bob = o.bob ? Math.sin(o.bob * 6) * 0.5 : 0;
  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(y + h + bob));
  px(ctx, -6, -6, 12, 6, '#ffe9c9');
  px(ctx, -6, -6, 12, 1, '#fff8ec');
  px(ctx, -5, -4, 2, 2, DARK);
  px(ctx, 3, -4, 2, 2, DARK);
  px(ctx, -1, -2, 2, 1, '#d9b48c');
  // cap
  px(ctx, -7, -13, 14, 8, '#e33127');
  px(ctx, -6, -14, 12, 2, '#ff5a4a');
  px(ctx, -7, -13, 14, 1, '#b51a12');
  px(ctx, -5, -12, 3, 3, WHITE);
  px(ctx, 2, -12, 3, 3, WHITE);
  px(ctx, -2, -9, 4, 2, WHITE);
  ctx.restore();
}

export function drawFlower(ctx, x, y, w, h, t) {
  const sway = Math.sin(t * 3) * 0.7;
  ctx.save();
  ctx.translate(Math.round(x + w / 2), Math.round(y + h));
  // stem + leaves
  px(ctx, -1, -9, 2, 9, '#2e9e3e');
  px(ctx, -5, -6, 4, 2, '#4dc45d');
  px(ctx, 1, -4, 4, 2, '#4dc45d');
  // petals
  const petals = [
    [-5, -16], [1, -16], [-7, -12], [3, -12], [-3, -19], [-1, -8],
  ];
  for (const [px0, py0] of petals) px(ctx, px0 + sway, py0, 4, 4, '#ff8a2b');
  px(ctx, -4, -16, 4, 4, '#ffd94a');
  px(ctx, -5, -15, 2, 2, '#e33127');
  px(ctx, -3, -14, 1, 1, DARK);
  px(ctx, -1, -14, 1, 1, DARK);
  ctx.restore();
}

export function drawCoin(ctx, x, y, r, t) {
  const spin = Math.cos(t * 5);
  const sx = Math.max(0.18, Math.abs(spin));
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, 1);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#f2b33d';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd75e';
  ctx.fill();
  ctx.fillStyle = '#fff2b0';
  ctx.fillRect(-1, -r + 2.5, 2, r * 2 - 5);
  ctx.fillStyle = '#c9821f';
  ctx.fillRect(-r + 1, -r + 1, 1.5, r * 2 - 2);
  ctx.restore();
}

export function drawFireball(ctx, x, y, t) {
  const r = 4;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(t * 12);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ff7a1a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r - 1.6, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe066';
  ctx.fill();
  ctx.fillStyle = '#fff6c9';
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

export function drawPiranha(ctx, x, y, h, t, open) {
  const headH = 12;
  const top = -h - headH;
  const mouth = open ? 3 : 1;
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  // stem
  px(ctx, -4, -h, 8, h, '#2e9e3e');
  px(ctx, -4, -h, 3, h, '#4dc45d');
  px(ctx, -4, -h, 1, h, '#1d6f2b');
  // leaves
  px(ctx, -8, -h * 0.55, 5, 3, '#4dc45d');
  px(ctx, 3, -h * 0.32, 5, 3, '#4dc45d');
  px(ctx, -8, -h * 0.55, 5, 1, '#2e9e3e');
  // head: rounded top, flat mouth line
  ctx.fillStyle = '#d92a1f';
  ctx.beginPath();
  ctx.moveTo(-9, -h + 1);
  ctx.lineTo(-9, top + 4);
  ctx.quadraticCurveTo(-9, top, -5, top);
  ctx.lineTo(5, top);
  ctx.quadraticCurveTo(9, top, 9, top + 4);
  ctx.lineTo(9, -h + 1);
  ctx.closePath();
  ctx.fill();
  // crown highlight
  ctx.fillStyle = '#ff5a4a';
  ctx.fillRect(-6, top + 1, 9, 2);
  // white spots
  ctx.fillStyle = '#fff6e8';
  ctx.fillRect(-7, top + 4, 3, 3);
  ctx.fillRect(4, top + 4, 3, 3);
  // eyes
  ctx.fillStyle = '#fff6e8';
  ctx.fillRect(-6, top + 3, 4, 3);
  ctx.fillRect(2, top + 3, 4, 3);
  ctx.fillStyle = DARK;
  ctx.fillRect(-4, top + 4, 2, 2);
  ctx.fillRect(2, top + 4, 2, 2);
  // mouth
  ctx.fillStyle = '#7d100b';
  ctx.fillRect(-8, -h - 3, 16, mouth + 3);
  // teeth
  ctx.fillStyle = '#fff6e8';
  for (let i = -6; i < 6; i += 3) {
    ctx.fillRect(i, -h - 3, 2, 2);
    ctx.fillRect(i + 1, -h + mouth, 2, 1);
  }
  ctx.restore();
}
