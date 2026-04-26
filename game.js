const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const statusText = document.getElementById("statusText");
const aliveText = document.getElementById("aliveText");
const bombKeyLabel = document.getElementById("bombKeyLabel");
const touchPanel = document.getElementById("touchPanel");
const joystickZone = document.getElementById("joystickZone");
const joystickKnob = document.getElementById("joystickKnob");
const bombButton = document.getElementById("bombButton");

const TILE = 64;
const COLS = 32;
const ROWS = 32;
const WIDTH = TILE * COLS;
const HEIGHT = TILE * ROWS;
const BASE_SPEED = 210;
const MOVE_TIME = 0.18;
const BOMB_FUSE = 2.2;
const EXPLOSION_TIME = 0.55;
const RESPAWN_TIME = 2.2;
const MAX_BOTS = 5;

canvas.width = WIDTH;
canvas.height = HEIGHT;

const spawnPoints = [
  { x: 1, y: 1 },
  { x: 1, y: Math.floor(ROWS / 2) },
  { x: 1, y: ROWS - 2 },
  
  { x: Math.floor(COLS / 2), y: 1 },

  { x: Math.floor(COLS / 2), y: ROWS - 2 },

  { x: COLS - 2, y: ROWS - 2 },
  { x: COLS - 2, y: Math.floor(ROWS / 2) },
  { x: COLS - 2, y: 1 },
];

const colors = ["#ff6f59", "#5cc8ff", "#ffdd57", "#9cff57", "#f78bff", "#ff9fdb", "#80ffdb", "#ffb347", "#b28dff", "#ffff81"];

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  bombQueued: false,
  analogX: 0,
  analogY: 0,
  touchActive: false,
};

const game = {
  grid: [],
  bombs: [],
  explosions: [],
  players: [],
  human: null,
  round: 0,
  resetTimer: 0,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function tileCenter(n) {
  return n * TILE + TILE / 2;
}

function makePlayer(name, tileX, tileY, color, isHuman, id) {
  return {
    id,
    name,
    color,
    isHuman,
    alive: true,
    tileX,
    tileY,
    fromTileX: tileX,
    fromTileY: tileY,
    targetTileX: tileX,
    targetTileY: tileY,
    moveProgress: 0,
    moveTime: MOVE_TIME,
    queuedDir: null,
    currentDir: null,
    x: tileCenter(tileX),
    y: tileCenter(tileY),
    speed: BASE_SPEED,
    bombLimit: 1,
    flame: 2,
    activeBombs: 0,
    safeBombId: null,
    cpu: {
      thinkTimer: 0,
      desiredX: 0,
      desiredY: 0,
      planBomb: false,
      fearTimer: 0,
    },
  };
}

function generateGrid() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("empty"));
  const safe = new Set();

  for (const spawn of spawnPoints) {
    const cells = [
      `${spawn.x},${spawn.y}`,
      `${spawn.x + 1},${spawn.y}`,
      `${spawn.x - 1},${spawn.y}`,
      `${spawn.x},${spawn.y + 1}`,
      `${spawn.x},${spawn.y - 1}`,
    ];
    for (const key of cells) {
      safe.add(key);
    }
  }

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const border = x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1;
      const pillar = x % 2 === 0 && y % 2 === 0;

      if (border || pillar) {
        grid[y][x] = "hard";
      } else if (!safe.has(`${x},${y}`) && Math.random() < 0.68) {
        grid[y][x] = "soft";
      }
    }
  }

  return grid;
}

function resetRound() {
  game.round += 1;
  game.grid = generateGrid();
  game.bombs = [];
  game.explosions = [];
  game.players = [];

  const humanSpawn = spawnPoints[0];
  const human = makePlayer("You", humanSpawn.x, humanSpawn.y, colors[0], true, "human");
  game.players.push(human);
  game.human = human;

  for (let i = 0; i < MAX_BOTS; i += 1) {
    const spawn = spawnPoints[(i + 1) % spawnPoints.length];
    game.players.push(makePlayer(`CPU ${i + 1}`, spawn.x, spawn.y, colors[(i + 1) % colors.length], false, `cpu-${i}`));
  }

  game.resetTimer = 0;
  statusText.textContent = `Round ${game.round}: survive the nursery war`;
}

function isWithinBounds(tileX, tileY) {
  return tileX >= 0 && tileY >= 0 && tileX < COLS && tileY < ROWS;
}

function getBombAt(tileX, tileY) {
  return game.bombs.find((bomb) => bomb.tileX === tileX && bomb.tileY === tileY);
}

function isBlocked(tileX, tileY) {
  if (!isWithinBounds(tileX, tileY)) {
    return true;
  }

  const tile = game.grid[tileY][tileX];
  if (tile === "hard" || tile === "soft") {
    return true;
  }

  return Boolean(getBombAt(tileX, tileY));
}

function canWalkThroughBomb(player, tileX, tileY) {
  const bomb = getBombAt(tileX, tileY);
  return bomb && player.safeBombId === bomb.id;
}

function isTileWalkable(player, tileX, tileY) {
  if (!isWithinBounds(tileX, tileY)) {
    return false;
  }

  const tile = game.grid[tileY][tileX];
  if (tile === "hard" || tile === "soft") {
    return false;
  }

  const bomb = getBombAt(tileX, tileY);
  if (bomb && player.safeBombId !== bomb.id) {
    return false;
  }

  return true;
}

function directionFromInput(moveX, moveY) {
  if (Math.abs(moveX) > Math.abs(moveY)) {
    return { x: Math.sign(moveX), y: 0 };
  }
  if (Math.abs(moveY) > 0) {
    return { x: 0, y: Math.sign(moveY) };
  }
  return null;
}

function beginTileMove(player, dir) {
  if (!dir) {
    return false;
  }

  if (dir.x === 0 && dir.y === 0) {
    return false;
  }

  const nextTileX = player.tileX + dir.x;
  const nextTileY = player.tileY + dir.y;
  if (!isTileWalkable(player, nextTileX, nextTileY)) {
    return false;
  }

  player.fromTileX = player.tileX;
  player.fromTileY = player.tileY;
  player.targetTileX = nextTileX;
  player.targetTileY = nextTileY;
  player.currentDir = dir;
  player.moveProgress = 0;
  return true;
}

function movePlayer(player, desiredDir, dt) {
  if (!player.alive) {
    return;
  }

  if (desiredDir && (desiredDir.x !== 0 || desiredDir.y !== 0)) {
    player.queuedDir = desiredDir;
  } else if (!player.currentDir) {
    player.queuedDir = null;
  }

  if (player.currentDir) {
    player.moveProgress += dt / player.moveTime;
    const t = Math.min(player.moveProgress, 1);
    player.x = tileCenter(player.fromTileX) + (tileCenter(player.targetTileX) - tileCenter(player.fromTileX)) * t;
    player.y = tileCenter(player.fromTileY) + (tileCenter(player.targetTileY) - tileCenter(player.fromTileY)) * t;

    if (player.moveProgress >= 1) {
      player.tileX = player.targetTileX;
      player.tileY = player.targetTileY;
      player.x = tileCenter(player.tileX);
      player.y = tileCenter(player.tileY);
      player.currentDir = null;
      player.moveProgress = 0;

      const safeBomb = game.bombs.find((bomb) => bomb.id === player.safeBombId);
      if (!safeBomb || safeBomb.tileX !== player.tileX || safeBomb.tileY !== player.tileY) {
        player.safeBombId = null;
      }

      if (player.queuedDir && beginTileMove(player, player.queuedDir)) {
        return;
      }
    }
  }

  if (!player.currentDir && player.queuedDir) {
    beginTileMove(player, player.queuedDir);
  }
}

function placeBomb(player) {
  if (!player.alive || player.activeBombs >= player.bombLimit) {
    return;
  }

  const tileX = player.tileX;
  const tileY = player.tileY;

  if (getBombAt(tileX, tileY)) {
    return;
  }

  const bomb = {
    id: `${player.id}-${performance.now().toFixed(3)}-${Math.random().toString(16).slice(2, 6)}`,
    ownerId: player.id,
    tileX,
    tileY,
    timer: BOMB_FUSE,
    flame: player.flame,
  };

  game.bombs.push(bomb);
  player.activeBombs += 1;
  player.safeBombId = bomb.id;
}

function consumeBombQueue() {
  if (input.bombQueued) {
    placeBomb(game.human);
    input.bombQueued = false;
  }
}

function createExplosion(bomb) {
  const segments = [{ x: bomb.tileX, y: bomb.tileY }];
  const directions = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  for (const dir of directions) {
    for (let step = 1; step <= bomb.flame; step += 1) {
      const tileX = bomb.tileX + dir.x * step;
      const tileY = bomb.tileY + dir.y * step;
      if (!isWithinBounds(tileX, tileY)) {
        break;
      }

      const tile = game.grid[tileY][tileX];
      if (tile === "hard") {
        break;
      }

      segments.push({ x: tileX, y: tileY });

      if (tile === "soft") {
        game.grid[tileY][tileX] = "empty";
        break;
      }
    }
  }

  game.explosions.push({
    segments,
    timer: EXPLOSION_TIME,
  });

  for (const player of game.players) {
    if (player.id === bomb.ownerId) {
      player.activeBombs = Math.max(0, player.activeBombs - 1);
    }
  }
}

function updateBombs(dt) {
  for (const bomb of game.bombs) {
    bomb.timer -= dt;
  }

  const triggered = new Set();
  for (const explosion of game.explosions) {
    for (const segment of explosion.segments) {
      const bomb = getBombAt(segment.x, segment.y);
      if (bomb) {
        triggered.add(bomb.id);
      }
    }
  }

  const detonating = game.bombs.filter((bomb) => bomb.timer <= 0 || triggered.has(bomb.id));
  if (!detonating.length) {
    return;
  }

  game.bombs = game.bombs.filter((bomb) => !detonating.includes(bomb));
  for (const bomb of detonating) {
    createExplosion(bomb);
  }
}

function playerOnExplosion(player) {
  return game.explosions.some((explosion) =>
    explosion.segments.some((segment) => segment.x === player.tileX && segment.y === player.tileY),
  );
}

function updateExplosions(dt) {
  for (const explosion of game.explosions) {
    explosion.timer -= dt;
  }

  game.explosions = game.explosions.filter((explosion) => explosion.timer > 0);
}

function updateDeaths() {
  for (const player of game.players) {
    if (player.alive && playerOnExplosion(player)) {
      player.alive = false;
    }
  }

  const alivePlayers = game.players.filter((player) => player.alive);
  aliveText.textContent = String(alivePlayers.length);

  if (alivePlayers.length <= 1 && game.resetTimer <= 0) {
    game.resetTimer = RESPAWN_TIME;
    if (alivePlayers[0]) {
      statusText.textContent = `${alivePlayers[0].name} wins the round`;
    } else {
      statusText.textContent = "Everybody exploded. Beautiful.";
    }
  }
}

function dangerMap() {
  const danger = new Set();

  const projectBlast = (tileX, tileY, flame) => {
    danger.add(`${tileX},${tileY}`);
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    for (const dir of directions) {
      for (let step = 1; step <= flame; step += 1) {
        const tx = tileX + dir.x * step;
        const ty = tileY + dir.y * step;
        if (!isWithinBounds(tx, ty)) {
          break;
        }
        const tile = game.grid[ty][tx];
        if (tile === "hard") {
          break;
        }
        danger.add(`${tx},${ty}`);
        if (tile === "soft") {
          break;
        }
      }
    }
  };

  for (const explosion of game.explosions) {
    for (const segment of explosion.segments) {
      danger.add(`${segment.x},${segment.y}`);
    }
  }

  for (const bomb of game.bombs) {
    if (bomb.timer < 1.1) {
      projectBlast(bomb.tileX, bomb.tileY, bomb.flame);
    }
  }

  return danger;
}

function pickCpuMove(player, dt, danger) {
  const tileX = player.tileX;
  const tileY = player.tileY;
  const dangerHere = danger.has(`${tileX},${tileY}`);

  player.cpu.thinkTimer -= dt;
  if ((!player.currentDir && player.cpu.thinkTimer <= 0) || dangerHere) {
    player.cpu.thinkTimer = dangerHere ? 0.08 : 0.3 + Math.random() * 0.5;

    const options = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter((dir) => {
      const tx = tileX + dir.x;
      const ty = tileY + dir.y;
      if (!isWithinBounds(tx, ty)) {
        return false;
      }
      if (dir.x === 0 && dir.y === 0) {
        return true;
      }
      return isTileWalkable(player, tx, ty);
    });

    let preferred = options;
    if (dangerHere) {
      preferred = options.filter((dir) => !danger.has(`${tileX + dir.x},${tileY + dir.y}`));
      if (!preferred.length) {
        preferred = options;
      }
    }

    const choice = preferred[randInt(0, preferred.length - 1)];
    player.cpu.desiredX = choice.x;
    player.cpu.desiredY = choice.y;

    const shouldBomb = !dangerHere &&
      player.activeBombs < player.bombLimit &&
      (adjacentSoftBlock(tileX, tileY) || nearbyEnemy(player, tileX, tileY));
    player.cpu.planBomb = shouldBomb && Math.random() < 0.38;
  }

  movePlayer(player, { x: player.cpu.desiredX, y: player.cpu.desiredY }, dt);

  if (player.cpu.planBomb) {
    placeBomb(player);
    player.cpu.planBomb = false;
  }
}

function adjacentSoftBlock(tileX, tileY) {
  const neighbors = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  return neighbors.some((dir) => {
    const tx = tileX + dir.x;
    const ty = tileY + dir.y;
    return isWithinBounds(tx, ty) && game.grid[ty][tx] === "soft";
  });
}

function nearbyEnemy(player, tileX, tileY) {
  return game.players.some((other) => {
    if (!other.alive || other.id === player.id) {
      return false;
    }
    return Math.abs(other.tileX - tileX) + Math.abs(other.tileY - tileY) <= 2;
  });
}

function updatePlayers(dt) {
  const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0) + input.analogX;
  const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0) + input.analogY;
  movePlayer(game.human, directionFromInput(clamp(moveX, -1, 1), clamp(moveY, -1, 1)), dt);
  consumeBombQueue();

  const danger = dangerMap();
  for (const player of game.players) {
    if (!player.isHuman && player.alive) {
      pickCpuMove(player, dt, danger);
    }
  }
}

function update(dt) {
  if (game.resetTimer > 0) {
    game.resetTimer -= dt;
    if (game.resetTimer <= 0) {
      resetRound();
    }
  }

  updatePlayers(dt);
  updateBombs(dt);
  updateExplosions(dt);
  updateDeaths();
}

function drawArena() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = "#0f2434";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const px = x * TILE;
      const py = y * TILE;

      ctx.fillStyle = (x + y) % 2 === 0 ? "#15364d" : "#113146";
      ctx.fillRect(px, py, TILE, TILE);

      const tile = game.grid[y][x];
      if (tile === "hard") {
        ctx.fillStyle = "#7ed0ff";
        ctx.fillRect(px + 8, py + 8, TILE - 16, TILE - 16);
        ctx.fillStyle = "#d8f3ff";
        ctx.fillRect(px + 16, py + 16, TILE - 32, TILE - 32);
      } else if (tile === "soft") {
        ctx.fillStyle = "#ffca80";
        ctx.fillRect(px + 10, py + 10, TILE - 20, TILE - 20);
        ctx.fillStyle = "#ff9b54";
        ctx.fillRect(px + 18, py + 18, TILE - 36, TILE - 36);
      }
    }
  }
}

function drawBombs() {
  for (const bomb of game.bombs) {
    const x = tileCenter(bomb.tileX);
    const y = tileCenter(bomb.tileY);
    const pulse = 1 + Math.sin(bomb.timer * 10) * 0.06;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = "#23130a";
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(5, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawExplosions() {
  for (const explosion of game.explosions) {
    const alpha = clamp(explosion.timer / EXPLOSION_TIME, 0, 1);
    for (const segment of explosion.segments) {
      const x = segment.x * TILE;
      const y = segment.y * TILE;
      ctx.fillStyle = `rgba(255, 246, 160, ${0.55 * alpha})`;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = `rgba(255, 123, 114, ${0.95 * alpha})`;
      ctx.beginPath();
      ctx.arc(x + TILE / 2, y + TILE / 2, 20 + 10 * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawPlayers() {
  for (const player of game.players) {
    if (!player.alive) {
      continue;
    }

    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.28)";
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.beginPath();
    ctx.arc(-6, -8, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff7ef";
    ctx.beginPath();
    ctx.arc(-7, -5, 4, 0, Math.PI * 2);
    ctx.arc(7, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1d0f0c";
    ctx.beginPath();
    ctx.arc(-7, -5, 1.5, 0, Math.PI * 2);
    ctx.arc(7, -5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1d0f0c";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 4, 8, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.font = "bold 14px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(player.name, 0, -28);

    ctx.restore();
  }
}

function drawOverlay() {
  if (game.resetTimer > 0) {
    ctx.fillStyle = "rgba(5, 10, 18, 0.28)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function render() {
  drawArena();
  drawBombs();
  drawExplosions();
  drawPlayers();
  drawOverlay();
}

function setKeyState(code, pressed) {
  if (code === "KeyW" || code === "ArrowUp") {
    input.up = pressed;
  } else if (code === "KeyS" || code === "ArrowDown") {
    input.down = pressed;
  } else if (code === "KeyA" || code === "ArrowLeft") {
    input.left = pressed;
  } else if (code === "KeyD" || code === "ArrowRight") {
    input.right = pressed;
  } else if ((code === "Space" || code === "KeyJ") && pressed) {
    input.bombQueued = true;
  }
}

window.addEventListener("keydown", (event) => {
  if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    event.preventDefault();
  }
  setKeyState(event.code, true);
});

window.addEventListener("keyup", (event) => {
  setKeyState(event.code, false);
});

let activePointerId = null;
const joystickState = {
  originX: 0,
  originY: 0,
  radius: 42,
};

function updateJoystick(pointerX, pointerY) {
  const dx = pointerX - joystickState.originX;
  const dy = pointerY - joystickState.originY;
  const distance = Math.hypot(dx, dy);
  const limited = distance > joystickState.radius ? joystickState.radius / distance : 1;
  const finalX = dx * limited;
  const finalY = dy * limited;

  input.analogX = clamp(finalX / joystickState.radius, -1, 1);
  input.analogY = clamp(finalY / joystickState.radius, -1, 1);

  joystickKnob.style.transform = `translate(${finalX}px, ${finalY}px)`;
}

function resetJoystick() {
  input.analogX = 0;
  input.analogY = 0;
  joystickKnob.style.transform = "translate(0px, 0px)";
}

joystickZone.addEventListener("pointerdown", (event) => {
  activePointerId = event.pointerId;
  input.touchActive = true;
  const rect = joystickZone.getBoundingClientRect();
  joystickState.originX = rect.left + rect.width / 2;
  joystickState.originY = rect.top + rect.height / 2;
  updateJoystick(event.clientX, event.clientY);
  joystickZone.setPointerCapture(event.pointerId);
});

joystickZone.addEventListener("pointermove", (event) => {
  if (event.pointerId === activePointerId) {
    updateJoystick(event.clientX, event.clientY);
  }
});

function endJoystick(event) {
  if (event.pointerId === activePointerId) {
    activePointerId = null;
    input.touchActive = false;
    resetJoystick();
  }
}

joystickZone.addEventListener("pointerup", endJoystick);
joystickZone.addEventListener("pointercancel", endJoystick);

bombButton.addEventListener("pointerdown", () => {
  input.bombQueued = true;
});

if (window.matchMedia("(pointer: coarse)").matches) {
  touchPanel.style.display = window.innerWidth <= 820 ? "grid" : "flex";
}

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

bombKeyLabel.textContent = "Space / J";
resetRound();
requestAnimationFrame(frame);
