export const TILE = 16;

export const T = {
  EMPTY: 0,
  GROUND: 1,
  BRICK: 2,
  QCOIN: 3,
  QPOWER: 4,
  USED: 5,
  STONE: 6,
  PIPE: 7,
};

const GROUND_TOP = 13;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function buildLevel() {
  const W = 216;
  const H = 15;
  const tiles = new Uint8Array(W * H);
  const solid = new Uint8Array(W * H);
  const rng = makeRng(1337);

  const set = (x, y, type, isSolid = true) => {
    if (x < 0 || x >= W || y < 0 || y >= H) return;
    const i = y * W + x;
    tiles[i] = type;
    solid[i] = isSolid ? 1 : 0;
  };

  const ground = (x0, x1, top = GROUND_TOP) => {
    for (let x = x0; x <= x1; x++) {
      for (let y = top; y < H; y++) set(x, y, T.GROUND);
    }
  };

  const row = (x0, x1, y, type) => {
    for (let x = x0; x <= x1; x++) set(x, y, type);
  };

  // ---- terrain -------------------------------------------------------
  ground(0, 68);
  ground(71, 85);
  ground(89, 152);
  ground(155, 215);

  // ---- blocks --------------------------------------------------------
  set(16, 9, T.QCOIN);

  set(20, 9, T.BRICK);
  set(21, 9, T.QCOIN);
  set(22, 9, T.BRICK);
  set(23, 9, T.QPOWER);
  set(24, 9, T.BRICK);

  row(22, 26, 5, T.BRICK);
  set(24, 5, T.QCOIN);

  set(33, 9, T.BRICK);
  set(34, 9, T.QCOIN);
  set(35, 9, T.BRICK);

  set(44, 9, T.QCOIN);

  set(53, 9, T.QCOIN);

  set(63, 9, T.BRICK);
  set(64, 9, T.QCOIN);
  set(65, 9, T.BRICK);

  set(78, 9, T.QCOIN);

  set(92, 9, T.QPOWER);
  set(93, 9, T.BRICK);

  set(100, 9, T.BRICK);
  set(101, 9, T.QCOIN);
  set(102, 9, T.BRICK);
  row(100, 102, 5, T.BRICK);

  set(112, 9, T.QCOIN);
  set(113, 9, T.BRICK);
  set(114, 9, T.QCOIN);

  row(124, 128, 9, T.BRICK);
  set(126, 9, T.QPOWER);

  set(135, 9, T.QCOIN);

  set(145, 9, T.BRICK);
  set(146, 9, T.QCOIN);
  set(147, 9, T.BRICK);

  set(160, 9, T.QCOIN);

  set(170, 9, T.QCOIN);
  set(171, 9, T.BRICK);
  set(172, 9, T.QCOIN);

  row(176, 180, 9, T.BRICK);
  set(178, 9, T.QCOIN);

  // staircase before the flag
  for (let i = 0; i < 8; i++) {
    for (let y = GROUND_TOP - 1 - i; y < GROUND_TOP; y++) set(182 + i, y, T.STONE);
  }

  // ---- pipes ---------------------------------------------------------
  const pipes = [];
  const addPipe = (x, height, plant = false) => {
    pipes.push({ x: x * TILE, y: (GROUND_TOP - height) * TILE, w: TILE * 2, h: height * TILE, plant });
    for (let tx = x; tx < x + 2; tx++) {
      for (let ty = GROUND_TOP - height; ty < GROUND_TOP; ty++) set(tx, ty, T.PIPE);
    }
  };
  addPipe(28, 2);
  addPipe(38, 3, true);
  addPipe(46, 4);
  addPipe(57, 4, true);
  addPipe(168, 2);

  // ---- coins ---------------------------------------------------------
  const coins = [];
  const coin = (tx, ty) => coins.push({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 });

  // arcs over the gaps
  coin(69, 10); coin(70, 9); coin(71, 10);
  coin(86, 10); coin(87, 9); coin(88, 10);
  coin(153, 10); coin(154, 10);

  // floating rows
  for (let x = 51; x <= 54; x++) coin(x, 7);
  for (let x = 105; x <= 108; x++) coin(x, 7);
  for (let x = 130; x <= 133; x++) coin(x, 7);
  for (let x = 191; x <= 195; x++) coin(x, 7);
  coin(183, 3); coin(184, 2); coin(185, 3);

  // ---- enemies -------------------------------------------------------
  const enemies = [];
  const goomba = (tx, ty = GROUND_TOP - 1) => enemies.push({ type: 'goomba', tx, ty });
  const koopa = (tx, ty = GROUND_TOP - 1) => enemies.push({ type: 'koopa', tx, ty });

  goomba(22); goomba(41); goomba(52); goomba(53);
  goomba(79); goomba(96); goomba(97);
  goomba(118); goomba(119);
  goomba(138); goomba(161); goomba(174);
  koopa(63); koopa(108); koopa(144);
  goomba(178);

  // ---- decorations ---------------------------------------------------
  const hills = [];
  const bushes = [];
  const clouds = [];

  for (let x = -4; x < W + 10; x += 7 + Math.floor(rng() * 7)) {
    const size = 1 + Math.floor(rng() * 2);
    if (rng() < 0.62) hills.push({ x: x * TILE, size });
    if (rng() < 0.55) bushes.push({ x: x * TILE + rng() * 40, size: 1 + Math.floor(rng() * 2) });
  }
  for (let x = -2; x < W + 8; x += 9 + Math.floor(rng() * 10)) {
    clouds.push({ x: x * TILE, y: 22 + rng() * 58, size: 1 + Math.floor(rng() * 2), speed: 2 + rng() * 4 });
  }

  const flagX = 198 * TILE + 8;
  const castleX = 203 * TILE;

  return {
    W, H, tiles, solid, pipes, coins, enemies, hills, bushes, clouds,
    groundTop: GROUND_TOP * TILE,
    flagX,
    castleX,
    width: W * TILE,
    height: H * TILE,
    spawn: { x: 3 * TILE, y: (GROUND_TOP - 1) * TILE },
  };
}
