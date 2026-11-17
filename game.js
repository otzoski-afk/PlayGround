const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const hpEl = document.getElementById('hp');
const messageEl = document.getElementById('message');
const startBtn = document.getElementById('startBtn');

const state = {
  running: false,
  score: 0,
  level: 1,
  highScore: 0,
  enemies: [],
  shots: [],
  particles: [],
  collectibles: [],
  stars: [],
  keys: {},
  pointerDown: false,
  lastFrame: 0,
  enemyTimer: 0,
  collectibleTimer: 0,
  waveTimer: 0,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height - 80,
  radius: 18,
  speed: 320,
  fireCooldown: 0,
  hp: 5,
  invulnerable: 0,
};

const controls = {
  up: false,
  down: false,
  left: false,
  right: false,
  firing: false,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function resetGame() {
  state.score = 0;
  state.level = 1;
  player.hp = 5;
  player.x = canvas.width / 2;
  player.y = canvas.height - 80;
  player.fireCooldown = 0;
  player.invulnerable = 0;
  state.enemies = [];
  state.shots = [];
  state.collectibles = [];
  state.particles = [];
  state.enemyTimer = 0;
  state.collectibleTimer = 0;
  state.waveTimer = 0;

  for (let i = 0; i < 120; i++) {
    state.stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.4 + 0.8,
      speed: Math.random() * 40 + 20,
    });
  }

  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = String(state.score);
  levelEl.textContent = String(state.level);
  hpEl.textContent = String(player.hp);
}

function showMessage(title, body, buttonText = 'Start Mission') {
  messageEl.classList.remove('hidden');
  messageEl.classList.add('visible');
  messageEl.innerHTML = `
    <div class="panel">
      <h1>${title}</h1>
      <p>${body}</p>
      <button id="startBtn" type="button">${buttonText}</button>
    </div>
  `;
  const button = document.getElementById('startBtn');
  button.addEventListener('click', startGame);
}

function startGame() {
  state.running = true;
  messageEl.classList.add('hidden');
  resetGame();
}

function createEnemy() {
  const size = 14 + Math.random() * 18;
  const x = 30 + Math.random() * (canvas.width - 60);
  const y = -size;
  state.enemies.push({
    x,
    y,
    radius: size,
    speed: 100 + Math.random() * 80 + state.level * 12,
    drift: (Math.random() - 0.5) * 60,
    fireTimer: Math.random() * 1.5,
    color: Math.random() > 0.5 ? '#f87171' : '#fbbf24',
  });
}

function createShot(x, y, vx, vy, team = 'player') {
  state.shots.push({
    x,
    y,
    vx,
    vy,
    radius: team === 'player' ? 4 : 5,
    damage: team === 'player' ? 1 : 1,
    color: team === 'player' ? '#6ee7ff' : '#f87171',
    team,
  });
}

function createCollectible(x, y) {
  state.collectibles.push({
    x,
    y,
    radius: 10,
    speed: 70,
    pulse: Math.random() * Math.PI * 2,
    value: 1,
  });
}

function spawnBurst(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 60 + Math.random() * 110;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.6 + Math.random() * 0.6,
      radius: 2 + Math.random() * 3,
      color,
    });
  }
}

function handleInput(dt) {
  let dx = 0;
  let dy = 0;
  if (controls.left) dx -= 1;
  if (controls.right) dx += 1;
  if (controls.up) dy -= 1;
  if (controls.down) dy += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    const moveX = (dx / len) * player.speed * dt;
    const moveY = (dy / len) * player.speed * dt;
    player.x = clamp(player.x + moveX, 22, canvas.width - 22);
    player.y = clamp(player.y + moveY, 28, canvas.height - 28);
  }

  if (controls.firing || state.pointerDown) {
    if (player.fireCooldown <= 0) {
      createShot(player.x, player.y - 18, 0, -420, 'player');
      createShot(player.x - 8, player.y - 16, -40, -390, 'player');
      createShot(player.x + 8, player.y - 16, 40, -390, 'player');
      player.fireCooldown = 0.18;
    }
  }
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
}

function updateGame(dt) {
  if (!state.running) return;

  state.level = 1 + Math.floor(state.score / 100);
  state.waveTimer += dt;
  state.enemyTimer -= dt;
  state.collectibleTimer -= dt;

  if (state.enemyTimer <= 0) {
    const count = 1 + Math.min(5, Math.floor(state.level / 2));
    for (let i = 0; i < count; i++) createEnemy();
    state.enemyTimer = Math.max(0.45, 1.2 - state.level * 0.08) + Math.random() * 0.5;
  }

  if (state.collectibleTimer <= 0) {
    createCollectible(40 + Math.random() * (canvas.width - 80), -10);
    state.collectibleTimer = 5 + Math.random() * 6;
  }

  handleInput(dt);

  for (const star of state.stars) {
    star.y += star.speed * dt;
    if (star.y > canvas.height) {
      star.y = -5;
      star.x = Math.random() * canvas.width;
    }
  }

  for (const shot of state.shots) {
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    if (shot.team === 'enemy') {
      shot.x += Math.sin((shot.y + performance.now() * 0.01) * 0.03) * 0.4;
    }
  }

  for (const enemy of state.enemies) {
    enemy.y += enemy.speed * dt;
    enemy.x += Math.sin((enemy.y + state.waveTimer) * 0.04) * enemy.drift * dt;
    enemy.x = clamp(enemy.x, 16, canvas.width - 16);

    if (Math.random() < 0.015 + state.level * 0.003) {
      const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
      createShot(enemy.x, enemy.y + 12, Math.cos(angle) * 180, Math.sin(angle) * 180, 'enemy');
    }
  }

  for (const item of state.collectibles) {
    item.y += item.speed * dt;
    item.pulse += dt * 4;
  }

  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
  }

  state.shots = state.shots.filter((shot) => {
    if (shot.y < -20 || shot.y > canvas.height + 20 || shot.x < -20 || shot.x > canvas.width + 20) return false;
    return true;
  });

  state.enemies = state.enemies.filter((enemy) => {
    const hit = state.shots.some((shot) => shot.team === 'player' && Math.hypot(shot.x - enemy.x, shot.y - enemy.y) < enemy.radius + shot.radius);
    if (hit) {
      spawnBurst(enemy.x, enemy.y, enemy.color, 15);
      state.score += 10;
      updateHUD();
      return false;
    }
    return enemy.y < canvas.height + enemy.radius + 20;
  });

  state.collectibles = state.collectibles.filter((item) => {
    const collected = Math.hypot(item.x - player.x, item.y - player.y) < item.radius + player.radius + 5;
    if (collected) {
      state.score += 25;
      spawnBurst(item.x, item.y, '#86efac', 18);
      updateHUD();
      return false;
    }
    return item.y < canvas.height + item.radius + 10;
  });

  state.shots = state.shots.filter((shot) => {
    if (shot.team === 'enemy') {
      const hitPlayer = Math.hypot(shot.x - player.x, shot.y - player.y) < player.radius + shot.radius;
      if (hitPlayer) {
        if (player.invulnerable <= 0) {
          player.hp -= 1;
          player.invulnerable = 1.1;
          spawnBurst(player.x, player.y, '#f87171', 18);
          updateHUD();
        }
        return false;
      }
    }
    return true;
  });

  if (player.hp <= 0) {
    state.running = false;
    state.highScore = Math.max(state.highScore, state.score);
    showMessage('Mission Failed', `Final score: ${state.score}. Survive and push deeper into the storm.`, 'Retry Mission');
  }

  player.invulnerable = Math.max(0, player.invulnerable - dt);
  state.particles = state.particles.filter((particle) => particle.life > 0);
  updateHUD();
}

function drawBackground() {
  ctx.fillStyle = '#020712';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#09192d');
  sky.addColorStop(1, '#010610');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of state.stars) {
    ctx.fillStyle = `rgba(255,255,255,${0.35 + star.r * 0.25})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(110, 231, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 15) % 2 === 0) {
    ctx.globalAlpha = 0.35;
  }

  ctx.fillStyle = '#6ee7ff';
  ctx.beginPath();
  ctx.moveTo(0, -18);
  ctx.lineTo(12, 14);
  ctx.lineTo(0, 7);
  ctx.lineTo(-12, 14);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#dffbff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 16);
  ctx.lineTo(0, -10);
  ctx.stroke();

  ctx.restore();
}

function drawEnemy(enemy) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = enemy.color;
  ctx.beginPath();
  ctx.moveTo(0, -enemy.radius);
  ctx.lineTo(enemy.radius, 0);
  ctx.lineTo(0, enemy.radius);
  ctx.lineTo(-enemy.radius, 0);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, -enemy.radius * 0.7);
  ctx.lineTo(0, enemy.radius * 0.7);
  ctx.stroke();
  ctx.restore();
}

function drawShot(shot) {
  ctx.fillStyle = shot.color;
  ctx.beginPath();
  ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCollectible(item) {
  const pulse = 1 + Math.sin(item.pulse) * 0.25;
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#86efac';
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 10);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(0, particle.life);
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();

  if (!state.running) {
    ctx.fillStyle = 'rgba(110, 231, 255, 0.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  for (const shot of state.shots) drawShot(shot);
  for (const item of state.collectibles) drawCollectible(item);
  for (const enemy of state.enemies) drawEnemy(enemy);
  drawPlayer();
  drawParticles();

  if (!state.running) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`Best ${state.highScore}`, canvas.width - 150, 36);
  }
}

function loop(timestamp) {
  const dt = Math.min((timestamp - state.lastFrame) / 1000 || 0.016, 0.033);
  state.lastFrame = timestamp;
  updateGame(dt);
  draw();
  requestAnimationFrame(loop);
}

function onKeyChange(event, pressed) {
  const code = event.code;
  if (['ArrowUp', 'KeyW'].includes(code)) controls.up = pressed;
  if (['ArrowDown', 'KeyS'].includes(code)) controls.down = pressed;
  if (['ArrowLeft', 'KeyA'].includes(code)) controls.left = pressed;
  if (['ArrowRight', 'KeyD'].includes(code)) controls.right = pressed;
  if (code === 'Space') {
    controls.firing = pressed;
    event.preventDefault();
  }
  if (pressed && code === 'Enter' && !state.running) {
    startGame();
  }
  state.keys[code] = pressed;
}

window.addEventListener('keydown', (event) => onKeyChange(event, true));
window.addEventListener('keyup', (event) => onKeyChange(event, false));
window.addEventListener('pointerdown', (event) => {
  const rect = canvas.getBoundingClientRect();
  state.pointerDown = true;
  const x = (event.clientX - rect.left) / rect.width * canvas.width;
  const y = (event.clientY - rect.top) / rect.height * canvas.height;
  if (x > canvas.width / 2) {
    controls.firing = true;
  } else {
    controls.firing = false;
  }
  player.x = clamp(x, 22, canvas.width - 22);
  player.y = clamp(y, 28, canvas.height - 28);
});
window.addEventListener('pointerup', () => {
  state.pointerDown = false;
  controls.firing = false;
});

const touchControls = document.querySelectorAll('.control');
for (const btn of touchControls) {
  const action = btn.dataset.control;
  const press = (isPressed) => {
    if (action === 'up') controls.up = isPressed;
    if (action === 'down') controls.down = isPressed;
    if (action === 'left') controls.left = isPressed;
    if (action === 'right') controls.right = isPressed;
  };
  btn.addEventListener('pointerdown', () => press(true));
  btn.addEventListener('pointerup', () => press(false));
  btn.addEventListener('pointerleave', () => press(false));
}

document.getElementById('fireBtn').addEventListener('pointerdown', () => {
  controls.firing = true;
});
document.getElementById('fireBtn').addEventListener('pointerup', () => {
  controls.firing = false;
});

document.getElementById('fireBtn').addEventListener('pointerleave', () => {
  controls.firing = false;
});

startBtn.addEventListener('click', startGame);
resetGame();
requestAnimationFrame(loop);
