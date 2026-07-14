(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const statusNode = document.getElementById("game-status");
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;
  const TAU = Math.PI * 2;

  ctx.imageSmoothingEnabled = false;

  const COLORS = {
    ink: "#20162f",
    deepInk: "#120d20",
    cream: "#fff1cf",
    paper: "#f7dfb2",
    gold: "#ffc857",
    orange: "#f47c20",
    coral: "#ff6f7d",
    pink: "#ff91b4",
    blue: "#5bc0eb",
    navy: "#29446b",
    purple: "#4f3b78",
    lavender: "#a78bca",
    green: "#65c18c",
    mint: "#9be7c4",
    white: "#fffaf0",
    red: "#d94c5c",
    brown: "#6c3b3d",
  };

  const GAME_KEYS = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowLeft",
    "ArrowDown",
    "ArrowRight",
  ]);

  const input = {
    held: new Set(),
    pressed: new Set(),
    released: new Set(),
    clearEdges() {
      this.pressed.clear();
      this.released.clear();
    },
    clearAll() {
      this.held.clear();
      this.clearEdges();
    },
    isDown(code) {
      return this.held.has(code);
    },
    wasPressed(code) {
      return this.pressed.has(code);
    },
  };

  window.addEventListener("keydown", (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    if (!input.held.has(event.code) && !event.repeat) input.pressed.add(event.code);
    input.held.add(event.code);
    audio.unlock();
    canvas.focus({ preventScroll: true });
  });

  window.addEventListener("keyup", (event) => {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    input.held.delete(event.code);
    input.released.add(event.code);
  });

  window.addEventListener("blur", () => {
    input.clearAll();
    hasFocus = false;
  });

  window.addEventListener("focus", () => {
    hasFocus = true;
  });

  canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  class TinyAudio {
    constructor() {
      this.context = null;
      this.master = null;
      this.enabled = true;
    }

    unlock() {
      if (!this.enabled) return;
      try {
        if (!this.context) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) return;
          this.context = new AudioContext();
          this.master = this.context.createGain();
          this.master.gain.value = 0.14;
          this.master.connect(this.context.destination);
        }
        if (this.context.state === "suspended") this.context.resume();
      } catch (_error) {
        this.enabled = false;
      }
    }

    tone(frequency, duration = 0.08, type = "square", volume = 0.22, delay = 0) {
      if (!this.context || !this.master || !this.enabled) return;
      const now = this.context.currentTime + delay;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.02);
    }

    jump() {
      this.tone(260, 0.08, "square", 0.14);
      this.tone(390, 0.06, "square", 0.09, 0.05);
    }

    collect() {
      this.tone(660, 0.07, "square", 0.16);
      this.tone(880, 0.09, "square", 0.13, 0.06);
    }

    bump() {
      this.tone(130, 0.11, "sawtooth", 0.13);
      this.tone(90, 0.1, "square", 0.08, 0.05);
    }

    select() {
      this.tone(440, 0.05, "square", 0.12);
      this.tone(660, 0.08, "square", 0.1, 0.045);
    }

    move() {
      this.tone(300, 0.035, "square", 0.07);
    }

    success() {
      [523, 659, 784, 1047].forEach((note, index) =>
        this.tone(note, 0.18, "square", 0.13, index * 0.09),
      );
    }

    fail() {
      [260, 220, 180, 130].forEach((note, index) =>
        this.tone(note, 0.14, "sawtooth", 0.1, index * 0.09),
      );
    }
  }

  const audio = new TinyAudio();

  const assetPaths = {
    grantStanding: "./grant_standing.png",
    grantRun1: "./grant_running1.png",
    grantRun2: "./grant_running2.png",
    grantRun3: "./grant_running3.png",
    emmaStanding: "./emma_standing.png",
    emmaRun1: "./emma_running1.png",
    emmaRun2: "./emma_running2.png",
    emmaRun3: "./emma_running3.png",
  };
  const images = {};

  function loadAssets() {
    return Promise.all(
      Object.entries(assetPaths).map(
        ([key, path]) =>
          new Promise((resolve) => {
            const image = new Image();
            image.onload = () => {
              images[key] = image;
              resolve();
            };
            image.onerror = () => resolve();
            image.src = path;
          }),
      ),
    );
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function approach(value, target, amount) {
    if (value < target) return Math.min(value + amount, target);
    return Math.max(value - amount, target);
  }

  function mod(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function distanceSquared(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  }

  function roundedPath(x, y, width, height, radius) {
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

  function fillRoundRect(x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    roundedPath(x, y, width, height, radius);
    ctx.fill();
  }

  function strokeRoundRect(x, y, width, height, radius, color, lineWidth = 2) {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    roundedPath(x, y, width, height, radius);
    ctx.stroke();
  }

  function setFont(size, color = COLORS.cream, align = "left", weight = "bold") {
    ctx.font = `${weight} ${size}px "Courier New", monospace`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "alphabetic";
  }

  function text(value, x, y, size = 20, color = COLORS.cream, align = "left", shadow = true) {
    setFont(size, color, align);
    if (shadow) {
      ctx.fillStyle = "rgba(20, 11, 35, .72)";
      ctx.fillText(String(value), Math.round(x) + 3, Math.round(y) + 3);
      ctx.fillStyle = color;
    }
    ctx.fillText(String(value), Math.round(x), Math.round(y));
  }

  function wrapText(value, x, y, maxWidth, lineHeight, size = 18, color = COLORS.cream, align = "left") {
    setFont(size, color, align);
    const words = String(value).split(/\s+/);
    const lines = [];
    let line = "";
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    lines.forEach((item, index) => text(item, x, y + index * lineHeight, size, color, align, false));
    return lines.length;
  }

  function drawPanel(x, y, width, height, color = "rgba(28, 19, 47, .92)", border = COLORS.lavender) {
    fillRoundRect(x + 5, y + 7, width, height, 10, "rgba(9, 6, 18, .42)");
    fillRoundRect(x, y, width, height, 10, color);
    strokeRoundRect(x, y, width, height, 10, border, 3);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(x + 7, y + 7, width - 14, 3);
  }

  function drawKey(label, x, y, size = 32, active = false) {
    fillRoundRect(x, y + 3, size, size, 4, COLORS.deepInk);
    fillRoundRect(x, y, size, size, 4, active ? COLORS.gold : COLORS.cream);
    strokeRoundRect(x, y, size, size, 4, active ? COLORS.white : COLORS.lavender, 2);
    text(label, x + size / 2, y + size * 0.69, Math.floor(size * 0.48), COLORS.ink, "center", false);
  }

  function drawHeart(x, y, size, color = COLORS.coral) {
    ctx.fillStyle = color;
    const unit = Math.max(2, Math.floor(size / 5));
    const px = Math.round(x - unit * 2.5);
    const py = Math.round(y - unit * 2);
    const cells = [
      [1, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [2, 4],
    ];
    cells.forEach(([cx, cy]) => ctx.fillRect(px + cx * unit, py + cy * unit, unit, unit));
  }

  function drawStar(x, y, outer = 15, inner = 7, color = COLORS.gold, rotation = -Math.PI / 2) {
    const traceStar = (centerX, centerY) => {
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? outer : inner;
        const angle = rotation + (point * Math.PI) / 5;
        const px = centerX + Math.cos(angle) * radius;
        const py = centerY + Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };
    traceStar(x + 3, y + 4);
    ctx.fillStyle = COLORS.deepInk;
    ctx.fill();
    traceStar(x, y);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = COLORS.cream;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawCharacterSprite(character, x, feetY, options = {}) {
    const {
      direction = 1,
      moving = false,
      jumping = false,
      animation = 0,
      scale = 3,
      alpha = 1,
      marker = true,
      label = false,
    } = options;
    const prefix = character === "grant" ? "grant" : "emma";
    let key = `${prefix}Standing`;
    if (moving || jumping) {
      const sequence = [1, 2, 3, 2];
      const frame = jumping ? 2 : sequence[Math.floor(animation / 0.11) % sequence.length];
      key = `${prefix}Run${frame}`;
    }
    const image = images[key];
    const cellWidth = 24 * scale;
    const cellHeight = 24 * scale;
    const drawX = Math.round(x - cellWidth / 2);
    const drawY = Math.round(feetY - cellHeight);

    ctx.save();
    ctx.globalAlpha = alpha;
    if (marker) {
      ctx.fillStyle = "rgba(22, 13, 34, .3)";
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(feetY + 2), 18 * (scale / 3), 6 * (scale / 3), 0, 0, TAU);
      ctx.fill();
    }
    if (image) {
      ctx.translate(Math.round(x), 0);
      ctx.scale(direction < 0 ? -1 : 1, 1);
      const naturalWidth = image.width * scale;
      const offsetX = -naturalWidth / 2;
      ctx.drawImage(image, Math.round(offsetX), drawY, naturalWidth, image.height * scale);
    } else {
      ctx.fillStyle = character === "grant" ? COLORS.blue : COLORS.pink;
      ctx.fillRect(drawX + 12, drawY + 5, cellWidth - 24, cellHeight - 5);
    }
    ctx.restore();

    if (label) {
      const badgeColor = character === "grant" ? COLORS.blue : COLORS.pink;
      fillRoundRect(x - 30, drawY - 21, 60, 18, 4, "rgba(24,15,40,.85)");
      text(character === "grant" ? "GRANT" : "EMMA", x, drawY - 7, 11, badgeColor, "center", false);
    }
  }

  class ParticleBurst {
    constructor() {
      this.items = [];
    }

    burst(x, y, color, count = 10, speed = 90) {
      for (let index = 0; index < count; index += 1) {
        const angle = (index / count) * TAU + Math.random() * 0.25;
        const magnitude = speed * (0.45 + Math.random() * 0.65);
        this.items.push({
          x,
          y,
          vx: Math.cos(angle) * magnitude,
          vy: Math.sin(angle) * magnitude - 35,
          life: 0.55 + Math.random() * 0.35,
          maxLife: 0.9,
          color,
          size: Math.random() > 0.5 ? 5 : 3,
        });
      }
    }

    update(dt) {
      this.items.forEach((item) => {
        item.life -= dt;
        item.x += item.vx * dt;
        item.y += item.vy * dt;
        item.vy += 180 * dt;
      });
      this.items = this.items.filter((item) => item.life > 0);
    }

    draw(cameraX = 0) {
      this.items.forEach((item) => {
        ctx.globalAlpha = clamp(item.life / item.maxLife, 0, 1);
        ctx.fillStyle = item.color;
        ctx.fillRect(Math.round(item.x - cameraX), Math.round(item.y), item.size, item.size);
      });
      ctx.globalAlpha = 1;
    }
  }

  class PlatformPlayer {
    constructor(character, x, feetY) {
      this.character = character;
      this.x = x;
      this.y = feetY;
      this.vx = 0;
      this.vy = 0;
      this.width = 34;
      this.height = 62;
      this.direction = 1;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.animation = Math.random();
      this.locked = false;
      this.arrived = false;
      this.invulnerable = 0.5;
      this.controls =
        character === "grant"
          ? { left: "KeyA", right: "KeyD", jump: "KeyW" }
          : { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" };
    }

    get rect() {
      return {
        x: this.x - this.width / 2,
        y: this.y - this.height,
        w: this.width,
        h: this.height,
      };
    }

    update(dt, solids, bounds = { minX: 0, maxX: Infinity }) {
      this.animation += dt;
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      if (this.locked) {
        this.vx = approach(this.vx, 0, 1100 * dt);
        return;
      }

      const left = input.isDown(this.controls.left);
      const right = input.isDown(this.controls.right);
      const axis = (right ? 1 : 0) - (left ? 1 : 0);
      const targetSpeed = axis * 190;
      const acceleration = axis === 0 ? 1250 : 1550;
      this.vx = approach(this.vx, targetSpeed, acceleration * dt);
      if (axis !== 0) this.direction = axis;
      if (input.wasPressed(this.controls.jump)) this.jumpBuffer = 0.13;
      else this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      if (this.onGround) this.coyote = 0.11;
      else this.coyote = Math.max(0, this.coyote - dt);

      if (this.jumpBuffer > 0 && this.coyote > 0) {
        this.vy = -440;
        this.onGround = false;
        this.coyote = 0;
        this.jumpBuffer = 0;
        audio.jump();
      }

      this.vy = Math.min(720, this.vy + 1120 * dt);

      this.x += this.vx * dt;
      this.x = clamp(this.x, bounds.minX + this.width / 2, bounds.maxX - this.width / 2);
      let playerRect = this.rect;
      for (const solid of solids) {
        if (!rectsOverlap(playerRect, solid)) continue;
        if (this.vx > 0) this.x = solid.x - this.width / 2;
        else if (this.vx < 0) this.x = solid.x + solid.w + this.width / 2;
        this.vx = 0;
        playerRect = this.rect;
      }

      const previousY = this.y;
      const previousTop = previousY - this.height;
      this.y += this.vy * dt;
      this.onGround = false;
      playerRect = this.rect;
      for (const solid of solids) {
        const horizontalOverlap = playerRect.x < solid.x + solid.w && playerRect.x + playerRect.w > solid.x;
        if (!horizontalOverlap) continue;
        if (this.vy >= 0 && previousY <= solid.y + 2 && this.y >= solid.y) {
          this.y = solid.y;
          this.vy = 0;
          this.onGround = true;
          playerRect = this.rect;
        } else if (this.vy < 0 && previousTop >= solid.y + solid.h - 2 && this.y - this.height <= solid.y + solid.h) {
          this.y = solid.y + solid.h + this.height;
          this.vy = 0;
          playerRect = this.rect;
        }
      }
    }

    draw(cameraX = 0, options = {}) {
      drawCharacterSprite(this.character, this.x - cameraX, this.y, {
        direction: this.direction,
        moving: Math.abs(this.vx) > 20,
        jumping: !this.onGround,
        animation: this.animation,
        label: options.label ?? true,
        marker: options.marker ?? true,
        alpha: this.invulnerable > 0 && Math.floor(this.invulnerable * 14) % 2 === 0 ? 0.55 : 1,
      });
    }
  }

  const levels = [
    {
      id: "1-1",
      chapter: "CHAPTER 1 · PURDUE UNIVERSITY",
      title: "OLD OAKEN BUCKET GAME",
      subtitle: "The Long Walk Home",
      playable: true,
      accent: COLORS.gold,
      story: "The Boilermakers won the Bucket, and West Lafayette is celebrating! Make it safely from Twisted Hammer back to Grant's dorm before the night leaves you behind.",
      objective: "Stay on screen, collect at least 12 stars, and use the buddy gates to reach the dorm together.",
      tip: "One player holds the near plate. The other crosses and steps on the far plate to latch each gate open.",
    },
    {
      id: "1-2",
      chapter: "CHAPTER 1 · PURDUE UNIVERSITY",
      title: "AROUND THE WORLD PARTY",
      subtitle: "Pi Kapps Passport Night",
      playable: true,
      accent: COLORS.coral,
      story: "The house is packed and every room is a new country. Collect the drinks, watch out for over-friendly partygoers, and make it to the exit together.",
      objective: "Collect 6 beers and 6 seltzers. Grant protects Emma from boys; Emma protects Grant from girls.",
      tip: "Body-block or jump on the right enemy. At the cooler, both players must push right at the same time.",
    },
    {
      id: "1-3",
      chapter: "CHAPTER 1 · PURDUE UNIVERSITY",
      title: "A MEMORY IN THE MAKING",
      subtitle: "Coming Soon",
      playable: false,
      accent: COLORS.lavender,
    },
    {
      id: "2-1",
      chapter: "CHAPTER 2 · UNIVERSITY OF TENNESSEE",
      title: "TENNESSEE FOOTBALL GAME",
      subtitle: "Front Row or Bust",
      playable: true,
      accent: COLORS.orange,
      story: "Emma scored front-row tickets in Neyland! There is only one catch: ninety thousand excited fans are between you and your seats.",
      objective: "Time each jump through the moving crowd. If either player is bumped, the whole team loses.",
      tip: "Meet on both colored ticket pads to open each checkpoint. Grant uses A/D/W; Emma uses arrows.",
    },
    {
      id: "2-2",
      chapter: "CHAPTER 2 · UNIVERSITY OF TENNESSEE",
      title: "LATE NIGHT SERENADE",
      subtitle: "One More Song",
      playable: true,
      accent: COLORS.blue,
      story: "Emma is nervous for her MCAT, so Grant picks up his guitar. A gentle song and a flock of sheep might be just what she needs to rest.",
      objective: "Grant plays notes with WASD while Emma counts sheep with the matching arrow keys.",
      tip: "Press when the notes reach the line and when sheep reach the fence. Both need 70% accuracy and 75% together.",
    },
    {
      id: "2-3",
      chapter: "CHAPTER 2 · UNIVERSITY OF TENNESSEE",
      title: "A MEMORY IN THE MAKING",
      subtitle: "Coming Soon",
      playable: false,
      accent: COLORS.lavender,
    },
    {
      id: "3-1",
      chapter: "CHAPTER 3 · TRAVELING",
      title: "CRUISE",
      subtitle: "Details TBD",
      playable: false,
      accent: COLORS.blue,
    },
    {
      id: "3-2",
      chapter: "CHAPTER 3 · TRAVELING",
      title: "EUROPE",
      subtitle: "Details TBD",
      playable: false,
      accent: COLORS.green,
    },
    {
      id: "3-3",
      chapter: "CHAPTER 3 · TRAVELING",
      title: "NEXT DESTINATION",
      subtitle: "Details TBD",
      playable: false,
      accent: COLORS.pink,
    },
  ];

  let completedLevels = new Set();
  try {
    completedLevels = new Set(JSON.parse(localStorage.getItem("grant-emma-completed") || "[]"));
  } catch (_error) {
    completedLevels = new Set();
  }

  function saveProgress() {
    try {
      localStorage.setItem("grant-emma-completed", JSON.stringify([...completedLevels]));
    } catch (_error) {
      // The game remains fully playable when storage is unavailable.
    }
  }

  let screen = "loading";
  let screenTime = 0;
  let transitionLock = 0;
  let selectedIndex = 0;
  let selectedLevel = levels[0];
  let activeLevel = null;
  let result = null;
  let resultOption = 0;
  let hasFocus = true;

  function announce(message) {
    if (statusNode) statusNode.textContent = message;
  }

  function goTo(nextScreen, announcement = "") {
    screen = nextScreen;
    screenTime = 0;
    transitionLock = 0.16;
    input.clearEdges();
    if (announcement) announce(announcement);
  }

  function menuLeftPressed() {
    return input.wasPressed("KeyA") || input.wasPressed("ArrowLeft");
  }

  function menuRightPressed() {
    return input.wasPressed("KeyD") || input.wasPressed("ArrowRight");
  }

  function menuSelectPressed() {
    return input.wasPressed("KeyW") || input.wasPressed("ArrowUp");
  }

  function drawDitheredSky(top, bottom) {
    const bands = 14;
    const parse = (hex) => [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
    const a = parse(top);
    const b = parse(bottom);
    for (let index = 0; index < bands; index += 1) {
      const t = index / (bands - 1);
      const color = a.map((value, channel) => Math.round(lerp(value, b[channel], t)));
      ctx.fillStyle = `rgb(${color[0]} ${color[1]} ${color[2]})`;
      ctx.fillRect(0, Math.floor((index * HEIGHT) / bands), WIDTH, Math.ceil(HEIGHT / bands) + 1);
    }
  }

  function drawPixelCloud(x, y, scale = 1, color = "#fff4d7") {
    ctx.fillStyle = color;
    const blocks = [
      [1, 1, 4, 1], [2, 0, 2, 1], [0, 2, 7, 1], [1, 3, 5, 1],
    ];
    blocks.forEach(([bx, by, bw, bh]) =>
      ctx.fillRect(Math.round(x + bx * 12 * scale), Math.round(y + by * 10 * scale), bw * 12 * scale, bh * 10 * scale),
    );
  }

  function drawTitleBackground(time) {
    drawDitheredSky("#4f3b78", "#f28c7c");
    const moonX = 780;
    const moonY = 95;
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(moonX - 32, moonY - 32, 64, 64);
    ctx.fillStyle = "#f2c98e";
    ctx.fillRect(moonX - 23, moonY - 24, 17, 12);
    ctx.fillRect(moonX + 7, moonY + 9, 13, 10);
    drawPixelCloud(mod(120 + time * 8, 1100) - 100, 92, 0.7, "rgba(255,241,207,.76)");
    drawPixelCloud(mod(630 + time * 5, 1150) - 100, 155, 0.5, "rgba(255,241,207,.58)");

    ctx.fillStyle = "#302446";
    for (let x = -30; x < WIDTH + 60; x += 95) {
      const height = 90 + mod(x * 7, 85);
      ctx.fillRect(x, HEIGHT - 125 - height, 82, height);
      ctx.fillStyle = "#ffd46b";
      for (let row = HEIGHT - 105 - height; row < HEIGHT - 145; row += 25) {
        ctx.fillRect(x + 13, row, 9, 12);
        ctx.fillRect(x + 48, row, 9, 12);
      }
      ctx.fillStyle = "#302446";
    }
    ctx.fillStyle = "#1c1833";
    ctx.fillRect(0, HEIGHT - 126, WIDTH, 126);
    ctx.fillStyle = "#3f3651";
    ctx.fillRect(0, HEIGHT - 126, WIDTH, 8);
    ctx.fillStyle = "#8c7b89";
    for (let x = mod(-time * 24, 95) - 95; x < WIDTH; x += 95) ctx.fillRect(x, HEIGHT - 65, 48, 5);
  }

  function updateTitle() {
    if (transitionLock > 0) return;
    if (menuSelectPressed()) {
      audio.select();
      goTo("levelSelect", "Level select. Use either player's left and right controls, then press up to choose.");
    }
  }

  function drawTitle() {
    drawTitleBackground(screenTime);
    const bob = Math.sin(screenTime * 2.3) * 3;
    drawCharacterSprite("grant", 285, 428 + bob, { scale: 4, moving: true, animation: screenTime, label: false });
    drawCharacterSprite("emma", 675, 428 - bob, {
      scale: 4,
      moving: true,
      direction: -1,
      animation: screenTime + 0.2,
      label: false,
    });
    drawHeart(480, 392 + Math.sin(screenTime * 3) * 4, 34, COLORS.coral);

    text("GRANT & EMMA", WIDTH / 2, 104, 55, COLORS.cream, "center");
    text("SIDE BY SIDE", WIDTH / 2, 158, 44, COLORS.gold, "center");
    text("A TWO-PLAYER LOVE STORY", WIDTH / 2, 193, 16, "#e9cce3", "center");

    const pulse = Math.floor(screenTime * 2) % 2 === 0;
    fillRoundRect(322, 238 + (pulse ? 0 : 2), 316, 92, 12, COLORS.deepInk);
    fillRoundRect(322, 230 + (pulse ? 0 : 2), 316, 92, 12, pulse ? COLORS.gold : "#f4b942");
    strokeRoundRect(322, 230 + (pulse ? 0 : 2), 316, 92, 12, COLORS.cream, 4);
    text("▶  PLAY  ◀", WIDTH / 2, 291 + (pulse ? 0 : 2), 38, COLORS.ink, "center", false);
    drawKey("W", 392, 345, 34, input.isDown("KeyW"));
    text("OR", 480, 371, 14, COLORS.cream, "center");
    drawKey("↑", 534, 345, 34, input.isDown("ArrowUp"));
    text("PRESS UP TO BEGIN", WIDTH / 2, 404, 14, COLORS.cream, "center");
    text("BEST EXPERIENCED TOGETHER", WIDTH / 2, 512, 13, "#a996bc", "center");
  }

  function updateLevelSelect() {
    if (transitionLock > 0) return;
    if (menuLeftPressed()) {
      selectedIndex = mod(selectedIndex - 1, levels.length);
      selectedLevel = levels[selectedIndex];
      audio.move();
      announce(`${selectedLevel.id}, ${selectedLevel.title}`);
    } else if (menuRightPressed()) {
      selectedIndex = mod(selectedIndex + 1, levels.length);
      selectedLevel = levels[selectedIndex];
      audio.move();
      announce(`${selectedLevel.id}, ${selectedLevel.title}`);
    } else if (menuSelectPressed()) {
      selectedLevel = levels[selectedIndex];
      audio.select();
      goTo(
        "briefing",
        selectedLevel.playable
          ? `${selectedLevel.title}. Press either up control to start.`
          : `${selectedLevel.title} is under construction.`,
      );
    }
  }

  function drawScrapbookBackground() {
    ctx.fillStyle = "#e8cda1";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "rgba(97,66,75,.08)";
    for (let y = 35; y < HEIGHT; y += 34) ctx.fillRect(0, y, WIDTH, 2);
    ctx.fillStyle = "rgba(188,85,90,.15)";
    ctx.fillRect(76, 0, 3, HEIGHT);
    for (let x = 20; x < WIDTH; x += 95) {
      ctx.fillStyle = x % 190 === 20 ? "rgba(79,59,120,.07)" : "rgba(244,124,32,.06)";
      ctx.fillRect(x, 0, 2, HEIGHT);
    }
  }

  function drawLevelIcon(level, x, y, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (level.id === "1-1") {
      ctx.fillStyle = "#25202e";
      ctx.fillRect(-55, 16, 110, 25);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(-46, -26, 92, 43);
      ctx.fillStyle = COLORS.ink;
      text("DORM", 0, 3, 17, COLORS.ink, "center", false);
      drawStar(-59, -30, 12, 5, COLORS.gold);
      drawStar(58, -14, 10, 4, COLORS.gold);
    } else if (level.id === "1-2") {
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(-58, -32, 116, 72);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(-58, -12, 116, 10);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(-36, -43, 15, 37);
      ctx.fillStyle = COLORS.blue;
      ctx.fillRect(20, -43, 15, 37);
      text("PARTY", 0, 26, 17, COLORS.cream, "center", false);
    } else if (level.id === "2-1") {
      ctx.fillStyle = COLORS.orange;
      ctx.fillRect(-60, -38, 120, 76);
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(-44, -25, 88, 8);
      ctx.fillRect(-44, 1, 88, 8);
      text("VOLS", 0, 30, 19, COLORS.white, "center", false);
    } else if (level.id === "2-2") {
      ctx.strokeStyle = COLORS.brown;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(-20, 2, 32, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = COLORS.brown;
      ctx.fillRect(7, -11, 65, 14);
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(29, -7, 4, 7);
      ctx.fillRect(43, -7, 4, 7);
      drawPixelSheep(55, -33, 0.55);
    } else if (level.id === "3-1") {
      ctx.fillStyle = COLORS.blue;
      ctx.fillRect(-70, 18, 140, 8);
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(-45, -22, 92, 42);
      ctx.fillStyle = COLORS.coral;
      ctx.fillRect(-16, -40, 30, 18);
      ctx.fillStyle = COLORS.navy;
      ctx.fillRect(-28, -12, 17, 14);
      ctx.fillRect(4, -12, 17, 14);
    } else if (level.id === "3-2") {
      ctx.fillStyle = COLORS.brown;
      ctx.fillRect(-50, 22, 100, 10);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(-34, -36, 12, 58);
      ctx.fillRect(22, -36, 12, 58);
      ctx.fillRect(-22, -23, 44, 10);
      ctx.beginPath();
      ctx.arc(0, -15, 26, Math.PI, 0);
      ctx.fill();
    } else {
      text("?", 0, 28, 88, level.accent, "center", false);
    }
    ctx.restore();
  }

  function drawLevelSelect() {
    drawScrapbookBackground();
    text("CHOOSE A MEMORY", WIDTH / 2, 52, 35, COLORS.ink, "center", false);
    text(selectedLevel.chapter, WIDTH / 2, 84, 17, "#74546a", "center", false);

    const spacing = 292;
    for (let index = 0; index < levels.length; index += 1) {
      const offset = index - selectedIndex;
      if (Math.abs(offset) > 2) continue;
      const x = WIDTH / 2 - 126 + offset * spacing;
      const selected = offset === 0;
      const y = selected ? 112 : 135;
      const card = levels[index];
      const alpha = selected ? 1 : 0.56;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(selected ? 0 : 0, 0);
      fillRoundRect(x + 8, y + 10, 252, 300, 10, "rgba(64,38,63,.24)");
      fillRoundRect(x, y, 252, 300, 10, selected ? "#fff1cf" : "#e6d0aa");
      strokeRoundRect(x, y, 252, 300, 10, selected ? card.accent : "#876e7f", selected ? 5 : 3);
      ctx.fillStyle = card.accent;
      ctx.fillRect(x, y, 252, 49);
      text(card.id, x + 18, y + 33, 22, COLORS.ink, "left", false);
      if (completedLevels.has(card.id)) {
        fillRoundRect(x + 189, y + 12, 47, 26, 5, COLORS.green);
        text("✓", x + 212, y + 32, 23, COLORS.white, "center", false);
      }
      drawLevelIcon(card, x + 126, y + 124, 0.9);
      wrapText(card.title, x + 126, y + 206, 212, 23, 19, COLORS.ink, "center");
      text(card.subtitle.toUpperCase(), x + 126, y + 269, 12, "#7b5e70", "center", false);
      fillRoundRect(x + 43, y + 278, 166, 33, 5, card.playable ? card.accent : "#8d7d8d");
      text(card.playable ? "PLAYABLE" : "UNDER CONSTRUCTION", x + 126, y + 300, 11, COLORS.ink, "center", false);
      ctx.restore();
    }

    drawKey("A", 266, 454, 36, input.isDown("KeyA"));
    drawKey("←", 307, 454, 36, input.isDown("ArrowLeft"));
    text("BROWSE", 389, 479, 14, "#684f65", "center", false);
    drawKey("D", 482, 454, 36, input.isDown("KeyD"));
    drawKey("→", 523, 454, 36, input.isDown("ArrowRight"));
    drawKey("W", 649, 454, 36, input.isDown("KeyW"));
    drawKey("↑", 690, 454, 36, input.isDown("ArrowUp"));
    text("SELECT", 779, 479, 14, "#684f65", "center", false);

    for (let index = 0; index < levels.length; index += 1) {
      ctx.fillStyle = index === selectedIndex ? selectedLevel.accent : "#a98e93";
      const size = index === selectedIndex ? 9 : 6;
      const dotX = WIDTH / 2 - levels.length * 10 + index * 20 - size / 2;
      const dotY = 518 - size / 2;
      ctx.fillRect(dotX, dotY, size, size);
      if (index === selectedIndex) {
        ctx.strokeStyle = COLORS.ink;
        ctx.lineWidth = 2;
        ctx.strokeRect(dotX - 2, dotY - 2, size + 4, size + 4);
      }
    }
  }

  function updateBriefing() {
    if (transitionLock > 0) return;
    if (menuLeftPressed()) {
      audio.move();
      goTo("levelSelect", "Level select.");
    } else if (menuSelectPressed()) {
      audio.select();
      if (selectedLevel.playable) startLevel(selectedLevel);
      else goTo("levelSelect", "Level select.");
    }
  }

  function drawBriefing() {
    drawScrapbookBackground();
    ctx.save();
    ctx.translate(55, 24);
    ctx.rotate(-0.012);
    fillRoundRect(8, 10, 850, 486, 8, "rgba(73,44,58,.22)");
    fillRoundRect(0, 0, 850, 486, 8, "#fff5d9");
    strokeRoundRect(0, 0, 850, 486, 8, selectedLevel.accent, 5);
    ctx.fillStyle = selectedLevel.accent;
    ctx.fillRect(0, 0, 850, 70);
    text(selectedLevel.id, 32, 47, 31, COLORS.ink, "left", false);
    text(selectedLevel.chapter, 815, 42, 15, COLORS.ink, "right", false);
    drawLevelIcon(selectedLevel, 142, 171, 1.15);

    if (!selectedLevel.playable) {
      text("UNDER CONSTRUCTION", 496, 155, 34, COLORS.ink, "center", false);
      wrapText(
        "This memory is still being made. Check back after Grant and Emma have added a few more pixels to the story!",
        496,
        205,
        560,
        30,
        19,
        "#675166",
        "center",
      );
      fillRoundRect(322, 314, 348, 62, 8, "#8d7d8d");
      text("PRESS UP TO GO BACK", 496, 354, 20, COLORS.cream, "center", false);
    } else {
      text(selectedLevel.title, 294, 120, 30, COLORS.ink, "left", false);
      text(selectedLevel.subtitle.toUpperCase(), 296, 150, 14, "#816078", "left", false);
      wrapText(selectedLevel.story, 294, 190, 505, 25, 17, "#59445a", "left");

      fillRoundRect(284, 276, 520, 80, 6, "#ead7b3");
      fillRoundRect(296, 285, 108, 23, 4, selectedLevel.accent);
      text("OBJECTIVE", 350, 302, 12, COLORS.ink, "center", false);
      wrapText(selectedLevel.objective, 302, 331, 484, 20, 14, COLORS.ink, "left");
      fillRoundRect(284, 361, 520, 70, 6, "#f2e6c9");
      fillRoundRect(296, 369, 128, 22, 4, "#cf7891");
      text("TEAMWORK TIP", 360, 385, 11, COLORS.ink, "center", false);
      wrapText(selectedLevel.tip, 302, 408, 484, 18, 13, "#59445a", "left");

      fillRoundRect(312, 439, 328, 38, 6, selectedLevel.accent);
      text("W / ↑  START MEMORY", 476, 464, 17, COLORS.ink, "center", false);
    }
    text("A / ←  BACK", 24, 472, 13, "#72586d", "left", false);
    ctx.restore();
  }

  function drawPixelSheep(x, y, scale = 1, direction = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(direction * scale, scale);
    ctx.fillStyle = COLORS.deepInk;
    ctx.fillRect(-27, -14, 46, 31);
    ctx.fillRect(15, -8, 19, 23);
    ctx.fillRect(-19, 14, 7, 13);
    ctx.fillRect(8, 14, 7, 13);
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(-29, -17, 43, 29);
    ctx.fillRect(-20, -22, 12, 9);
    ctx.fillRect(-4, -23, 13, 10);
    ctx.fillRect(10, -17, 10, 18);
    ctx.fillStyle = "#4f4254";
    ctx.fillRect(18, -9, 16, 19);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(28, -5, 3, 3);
    ctx.restore();
  }

  function startLevel(level) {
    selectedLevel = level;
    const factories = {
      "1-1": createBucketLevel,
      "1-2": createPartyLevel,
      "2-1": createCrowdLevel,
      "2-2": createSerenadeLevel,
    };
    activeLevel = factories[level.id]();
    result = null;
    goTo("playing", `${level.title} started.`);
  }

  function finishLevel(success, reason, stats = []) {
    if (screen !== "playing") return;
    result = { success, reason, stats };
    if (success) {
      completedLevels.add(selectedLevel.id);
      saveProgress();
      audio.success();
      resultOption = 1;
    } else {
      audio.fail();
      resultOption = 0;
    }
    goTo("result", success ? "Memory complete!" : `Try again. ${reason}`);
  }

  function updateResult() {
    if (transitionLock > 0) return;
    if (menuLeftPressed() || menuRightPressed()) {
      resultOption = resultOption === 0 ? 1 : 0;
      audio.move();
    } else if (menuSelectPressed()) {
      audio.select();
      if (resultOption === 0) startLevel(selectedLevel);
      else goTo("levelSelect", "Level select.");
    }
  }

  function drawResult() {
    if (activeLevel) activeLevel.draw(true);
    ctx.fillStyle = "rgba(12,8,22,.68)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const success = result?.success;
    drawPanel(180, 74, 600, 390, success ? "rgba(39,50,62,.97)" : "rgba(57,29,48,.97)", success ? COLORS.gold : COLORS.coral);
    text(success ? "MEMORY COMPLETE!" : "OH NO — STICK TOGETHER!", WIDTH / 2, 137, 32, success ? COLORS.gold : COLORS.coral, "center");
    if (success) {
      drawHeart(480, 180, 31, COLORS.coral);
      drawStar(425, 177, 17, 8, COLORS.gold, screenTime * 0.5);
      drawStar(535, 177, 17, 8, COLORS.gold, -screenTime * 0.5);
    } else {
      text("×", WIDTH / 2, 205, 58, COLORS.coral, "center");
    }
    wrapText(result?.reason || "", WIDTH / 2, 238, 510, 26, 17, COLORS.cream, "center");
    const stats = result?.stats || [];
    stats.forEach((stat, index) => {
      const x = WIDTH / 2 + (index - (stats.length - 1) / 2) * 170;
      fillRoundRect(x - 70, 284, 140, 54, 6, "rgba(255,255,255,.08)");
      text(stat.label, x, 304, 11, COLORS.lavender, "center", false);
      text(stat.value, x, 329, 20, stat.color || COLORS.cream, "center", false);
    });

    const options = ["RETRY", "LEVEL SELECT"];
    options.forEach((option, index) => {
      const x = index === 0 ? 285 : 493;
      const selected = resultOption === index;
      fillRoundRect(x, 376 + (selected ? 0 : 3), 182, 52, 6, selected ? (success ? COLORS.gold : COLORS.coral) : "#51435e");
      strokeRoundRect(x, 376 + (selected ? 0 : 3), 182, 52, 6, selected ? COLORS.cream : "#766884", 2);
      text(option, x + 91, 409 + (selected ? 0 : 3), 16, selected ? COLORS.ink : COLORS.cream, "center", false);
    });
    text("A / D  OR  ← / →  CHOOSE     ·     W / ↑  SELECT", WIDTH / 2, 448, 12, COLORS.lavender, "center", false);
  }

  function drawFocusOverlay() {
    ctx.fillStyle = "rgba(12,8,22,.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    drawPanel(270, 188, 420, 162, "rgba(30,20,49,.96)", COLORS.gold);
    text("GAME PAUSED", WIDTH / 2, 245, 31, COLORS.gold, "center");
    text("CLICK THE GAME OR PRESS A KEY", WIDTH / 2, 289, 16, COLORS.cream, "center");
    text("THEN KEEP GOING — TOGETHER!", WIDTH / 2, 320, 13, COLORS.lavender, "center");
  }

  function update(dt) {
    screenTime += dt;
    transitionLock = Math.max(0, transitionLock - dt);
    if (!hasFocus && screen === "playing") return;
    if (screen === "title") updateTitle(dt);
    else if (screen === "levelSelect") updateLevelSelect(dt);
    else if (screen === "briefing") updateBriefing(dt);
    else if (screen === "playing" && activeLevel) activeLevel.update(dt);
    else if (screen === "result") updateResult(dt);
  }

  function draw() {
    ctx.imageSmoothingEnabled = false;
    if (screen === "loading") {
      ctx.fillStyle = COLORS.deepInk;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      text("LOADING MEMORIES…", WIDTH / 2, HEIGHT / 2, 25, COLORS.gold, "center");
    } else if (screen === "title") drawTitle();
    else if (screen === "levelSelect") drawLevelSelect();
    else if (screen === "briefing") drawBriefing();
    else if (screen === "playing" && activeLevel) activeLevel.draw(false);
    else if (screen === "result") drawResult();
    if (!hasFocus && screen === "playing") drawFocusOverlay();
  }

  function drawGameHud(titleLabel, accent, items = []) {
    ctx.fillStyle = "rgba(16,11,28,.88)";
    ctx.fillRect(0, 0, WIDTH, 66);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 62, WIDTH, 4);
    text(selectedLevel.id, 20, 29, 17, accent, "left", false);
    text(titleLabel, 20, 52, 14, COLORS.cream, "left", false);
    let cursor = WIDTH - 18;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      const width = item.width || 145;
      cursor -= width;
      fillRoundRect(cursor, 12, width - 10, 40, 5, "rgba(255,255,255,.08)");
      text(item.label, cursor + 10, 29, 10, COLORS.lavender, "left", false);
      text(item.value, cursor + width - 22, 42, 18, item.color || COLORS.cream, "right", false);
    }
  }

  function drawToast(message, timer, accent = COLORS.gold) {
    if (!message || timer <= 0) return;
    const alpha = clamp(timer * 3, 0, 1);
    ctx.globalAlpha = alpha;
    setFont(14);
    const width = clamp(ctx.measureText(message).width + 52, 230, 690);
    fillRoundRect(WIDTH / 2 - width / 2, 82, width, 38, 6, "rgba(20,13,34,.91)");
    strokeRoundRect(WIDTH / 2 - width / 2, 82, width, 38, 6, accent, 2);
    text(message, WIDTH / 2, 107, 14, COLORS.cream, "center", false);
    ctx.globalAlpha = 1;
  }

  function drawPressurePlate(x, y, active, color, cameraX = 0, width = 72) {
    const screenX = Math.round(x - cameraX);
    ctx.fillStyle = COLORS.deepInk;
    ctx.fillRect(screenX, y - 5, width, 8);
    ctx.fillStyle = active ? color : "#73657d";
    ctx.fillRect(screenX + 5, y - (active ? 4 : 9), width - 10, active ? 5 : 9);
    ctx.fillStyle = active ? COLORS.white : "#a694ae";
    ctx.fillRect(screenX + 14, y - (active ? 4 : 8), width - 28, 2);
  }

  function createBucketLevel() {
    const worldWidth = 5900;
    const floorY = 466;
    const particles = new ParticleBurst();
    const players = [
      new PlatformPlayer("grant", 150, floorY),
      new PlatformPlayer("emma", 225, floorY),
    ];
    const platforms = [
      { x: 0, y: floorY, w: 890, h: 120 },
      { x: 990, y: floorY, w: 610, h: 120 },
      { x: 1680, y: floorY, w: 770, h: 120 },
      { x: 2560, y: floorY, w: 790, h: 120 },
      { x: 3450, y: floorY, w: 920, h: 120 },
      { x: 4480, y: floorY, w: 1420, h: 120 },
      { x: 500, y: 382, w: 180, h: 12 },
      { x: 1090, y: 370, w: 195, h: 12 },
      { x: 1395, y: 407, w: 132, h: 12 },
      { x: 2170, y: 370, w: 170, h: 12 },
      { x: 2750, y: 386, w: 180, h: 12 },
      { x: 3130, y: 332, w: 185, h: 12 },
      { x: 3590, y: 390, w: 145, h: 12 },
      { x: 4140, y: 346, w: 176, h: 12 },
      { x: 4690, y: 376, w: 180, h: 12 },
      { x: 5050, y: 332, w: 176, h: 12 },
    ];
    const gates = [
      { x: 2045, nearX: 1850, farX: 2140, latched: false, open: false, nearActive: false, farActive: false },
      { x: 3850, nearX: 3655, farX: 3945, latched: false, open: false, nearActive: false, farActive: false },
    ];
    const starPositions = [
      [365, 411], [585, 330], [815, 411], [1070, 411], [1187, 411],
      [1458, 357], [1760, 411], [1900, 411], [2190, 411], [2370, 411],
      [2650, 411], [2840, 411], [3218, 411], [3500, 411], [3670, 411],
      [4105, 411], [4755, 411], [5138, 279], [5485, 411],
    ];
    const stars = starPositions.map(([x, y], index) => ({ x, y, collected: false, phase: index * 0.67 }));
    const backgroundBuildings = [];
    for (let x = -150; x < worldWidth + 300; x += 210) {
      const seed = Math.abs(Math.floor(x / 210));
      backgroundBuildings.push({
        x,
        width: 150 + (seed % 3) * 18,
        height: 125 + ((seed * 47) % 145),
        color: ["#3c3053", "#463353", "#30304c"][seed % 3],
      });
    }
    let cameraX = 0;
    let countdown = 3;
    let starCount = 0;
    let toast = "Stay together — the city will not wait!";
    let toastTimer = 3.2;
    let thresholdAnnounced = false;
    let beatTimer = 0;

    function playerOnPlate(player, x) {
      return player.onGround && player.y >= floorY - 4 && Math.abs(player.x - (x + 36)) < 48;
    }

    function getSolids() {
      const solids = platforms.slice();
      gates.forEach((gate) => {
        if (!gate.open) solids.push({ x: gate.x, y: 208, w: 36, h: floorY - 208 });
      });
      return solids;
    }

    function setToast(message, duration = 2.4) {
      toast = message;
      toastTimer = duration;
    }

    function update(dt) {
      toastTimer = Math.max(0, toastTimer - dt);
      particles.update(dt);
      beatTimer -= dt;
      if (beatTimer <= 0 && countdown <= 0) {
        beatTimer += 0.72;
        audio.tone(110, 0.045, "square", 0.025);
      }
      if (countdown > 0) countdown -= dt;
      else cameraX = Math.min(worldWidth - WIDTH, cameraX + 68 * dt);

      gates.forEach((gate) => {
        gate.nearActive = players.some((player) => playerOnPlate(player, gate.nearX));
        gate.farActive = players.some((player) => playerOnPlate(player, gate.farX));
        gate.open = gate.latched || gate.nearActive;
      });

      const bounds = { minX: 0, maxX: Math.min(worldWidth, cameraX + WIDTH - 15) };
      const solids = getSolids();
      players.forEach((player) => player.update(dt, solids, bounds));

      gates.forEach((gate, index) => {
        gate.nearActive = players.some((player) => playerOnPlate(player, gate.nearX));
        gate.farActive = players.some((player) => playerOnPlate(player, gate.farX));
        if (!gate.latched && gate.nearActive && gate.farActive) {
          gate.latched = true;
          gate.open = true;
          particles.burst(gate.x + 18, 310, index === 0 ? COLORS.gold : COLORS.blue, 18, 125);
          audio.collect();
          setToast(`Buddy gate ${index + 1} latched — both players can pass!`, 3);
        } else {
          gate.open = gate.latched || gate.nearActive;
        }
      });

      for (const star of stars) {
        if (star.collected) continue;
        const collectedBy = players.find((player) => distanceSquared(player.x, player.y - 31, star.x, star.y) < 43 * 43);
        if (collectedBy) {
          star.collected = true;
          starCount += 1;
          particles.burst(star.x, star.y, COLORS.gold, 12, 105);
          audio.collect();
          if (starCount === 12 && !thresholdAnnounced) {
            thresholdAnnounced = true;
            setToast("12 stars! Now get both players safely to the dorm.", 3.3);
          }
        }
      }

      for (const player of players) {
        if (player.y > HEIGHT + 100) {
          finishLevel(false, `${player.character === "grant" ? "Grant" : "Emma"} missed a jump. When one falls, both go back together.`, [
            { label: "STARS", value: `${starCount}/12`, color: COLORS.gold },
          ]);
          return;
        }
        if (countdown <= 0 && player.x + player.width / 2 < cameraX + 5) {
          finishLevel(false, `${player.character === "grant" ? "Grant" : "Emma"} fell behind the moving night.`, [
            { label: "STARS", value: `${starCount}/12`, color: COLORS.gold },
          ]);
          return;
        }
        if (!player.arrived && player.x > 5680) {
          player.arrived = true;
          player.locked = true;
          player.x = player.character === "grant" ? 5740 : 5810;
          player.y = floorY;
          particles.burst(player.x, player.y - 45, player.character === "grant" ? COLORS.blue : COLORS.pink, 14, 90);
          setToast(`${player.character === "grant" ? "Grant" : "Emma"} made it! Waiting at the dorm…`, 2.4);
        }
      }

      if (players.every((player) => player.arrived)) {
        if (starCount >= 12) {
          finishLevel(true, "Home safe, with enough stars to remember the whole walk.", [
            { label: "STARS", value: `${starCount}/${stars.length}`, color: COLORS.gold },
            { label: "GATES", value: `${gates.filter((gate) => gate.latched).length}/2`, color: COLORS.blue },
          ]);
        } else {
          finishLevel(false, `You reached the dorm, but only found ${starCount} of the 12 stars you need.`, [
            { label: "STARS", value: `${starCount}/12`, color: COLORS.coral },
          ]);
        }
      }
    }

    function drawBackground() {
      drawDitheredSky("#382d61", "#e17f78");
      ctx.fillStyle = "#f8dda5";
      ctx.fillRect(800, 90, 62, 62);
      ctx.fillStyle = "#e6bb83";
      ctx.fillRect(814, 105, 16, 11);
      ctx.fillRect(842, 131, 10, 8);
      drawPixelCloud(mod(180 - cameraX * 0.07, 1200) - 120, 115, 0.65, "rgba(255,241,207,.65)");
      drawPixelCloud(mod(670 - cameraX * 0.04, 1300) - 130, 175, 0.52, "rgba(255,241,207,.42)");

      backgroundBuildings.forEach((building, index) => {
        const x = Math.round(building.x - cameraX * 0.38);
        if (x + building.width < 0 || x > WIDTH) return;
        const y = floorY - building.height;
        ctx.fillStyle = building.color;
        ctx.fillRect(x, y, building.width, building.height);
        ctx.fillStyle = index % 3 === 0 ? "#f6c86a" : "#d9a96a";
        for (let windowX = x + 17; windowX < x + building.width - 12; windowX += 35) {
          for (let windowY = y + 22; windowY < floorY - 25; windowY += 38) {
            if ((windowX + windowY + index) % 4 !== 0) ctx.fillRect(windowX, windowY, 10, 15);
          }
        }
      });
    }

    function drawGround() {
      for (const platform of platforms) {
        const x = Math.round(platform.x - cameraX);
        if (x + platform.w < -10 || x > WIDTH + 10) continue;
        if (platform.y === floorY) {
          ctx.fillStyle = "#29243b";
          ctx.fillRect(x, platform.y, platform.w, platform.h);
          ctx.fillStyle = "#766276";
          ctx.fillRect(x, platform.y, platform.w, 10);
          ctx.fillStyle = "#4e4258";
          for (let stripeX = x + mod(-platform.x, 120); stripeX < x + platform.w; stripeX += 120) {
            ctx.fillRect(stripeX, platform.y + 57, 62, 6);
          }
        } else {
          ctx.fillStyle = COLORS.deepInk;
          ctx.fillRect(x + 4, platform.y + 6, platform.w, platform.h);
          ctx.fillStyle = "#a3575c";
          ctx.fillRect(x, platform.y, platform.w, platform.h);
          ctx.fillStyle = "#dd8a71";
          ctx.fillRect(x, platform.y, platform.w, 6);
          for (let brickX = x + 15; brickX < x + platform.w; brickX += 42) ctx.fillRect(brickX, platform.y + 13, 22, 3);
        }
      }
      ctx.fillStyle = "#171426";
      const gaps = [[890, 990], [1600, 1680], [2450, 2560], [3350, 3450], [4370, 4480]];
      gaps.forEach(([start, end]) => {
        const x = start - cameraX;
        ctx.fillRect(x, floorY, end - start, HEIGHT - floorY);
        ctx.fillStyle = "#493c57";
        ctx.fillRect(x + 10, floorY + 17, end - start - 20, 5);
        ctx.fillStyle = "#171426";
      });
    }

    function drawLandmarks() {
      const hammerX = 52 - cameraX;
      if (hammerX > -240 && hammerX < WIDTH) {
        ctx.fillStyle = "#8f4652";
        ctx.fillRect(hammerX, 285, 220, 181);
        ctx.fillStyle = COLORS.cream;
        ctx.fillRect(hammerX + 18, 303, 184, 48);
        text("TWISTED", hammerX + 110, 325, 16, COLORS.ink, "center", false);
        text("HAMMER", hammerX + 110, 345, 16, COLORS.ink, "center", false);
      }

      const towerX = 2950 - cameraX;
      if (towerX > -140 && towerX < WIDTH + 140) {
        ctx.fillStyle = "#b06f62";
        ctx.fillRect(towerX, 225, 110, floorY - 225);
        ctx.fillStyle = "#76505b";
        ctx.fillRect(towerX - 15, 205, 140, 22);
        ctx.fillStyle = COLORS.cream;
        ctx.fillRect(towerX + 36, 251, 38, 38);
        ctx.fillStyle = COLORS.ink;
        ctx.fillRect(towerX + 52, 257, 4, 16);
        ctx.fillRect(towerX + 54, 271, 10, 4);
      }

      const dormX = 5590 - cameraX;
      if (dormX > -300 && dormX < WIDTH + 100) {
        ctx.fillStyle = "#9b625b";
        ctx.fillRect(dormX, 205, 310, floorY - 205);
        ctx.fillStyle = "#563b50";
        ctx.fillRect(dormX - 12, 188, 334, 23);
        ctx.fillStyle = COLORS.gold;
        ctx.fillRect(dormX + 26, 225, 257, 38);
        text("GRANT'S DORM", dormX + 154, 251, 18, COLORS.ink, "center", false);
        ctx.fillStyle = "#29243a";
        ctx.fillRect(dormX + 114, 356, 82, 110);
        ctx.fillStyle = COLORS.cream;
        ctx.fillRect(dormX + 171, 410, 6, 6);
      }
    }

    function drawGates() {
      gates.forEach((gate, index) => {
        const gateX = gate.x - cameraX;
        drawPressurePlate(gate.nearX, floorY, gate.nearActive, index === 0 ? COLORS.gold : COLORS.blue, cameraX);
        drawPressurePlate(gate.farX, floorY, gate.farActive || gate.latched, index === 0 ? COLORS.gold : COLORS.blue, cameraX);
        if (gateX < -100 || gateX > WIDTH + 100) return;
        ctx.fillStyle = "#2a2339";
        ctx.fillRect(gateX - 8, 197, 52, 16);
        ctx.fillRect(gateX - 8, 197, 9, floorY - 197);
        ctx.fillRect(gateX + 35, 197, 9, floorY - 197);
        const lift = gate.open ? 34 : floorY - 208;
        ctx.fillStyle = index === 0 ? "#c99c40" : "#4987a6";
        ctx.fillRect(gateX, 208, 36, lift);
        ctx.fillStyle = COLORS.deepInk;
        for (let y = 220; y < 208 + lift; y += 26) ctx.fillRect(gateX + 6, y, 24, 8);
        if (gate.latched) {
          fillRoundRect(gateX - 14, 165, 64, 26, 4, COLORS.green);
          text("OPEN", gateX + 18, 184, 12, COLORS.ink, "center", false);
        }
      });
    }

    function draw(dimmed = false) {
      drawBackground();
      drawLandmarks();
      drawGround();
      drawGates();

      stars.forEach((star) => {
        if (star.collected) return;
        const x = star.x - cameraX;
        if (x < -30 || x > WIDTH + 30) return;
        const bob = Math.sin(screenTime * 4 + star.phase) * 5;
        drawStar(x, star.y + bob, 16, 7, COLORS.gold, screenTime + star.phase);
      });
      particles.draw(cameraX);
      players.forEach((player) => player.draw(cameraX));

      for (const player of players) {
        const screenX = player.x - cameraX;
        if (screenX < 105 && countdown <= 0 && !player.arrived) {
          ctx.globalAlpha = 0.65 + Math.sin(screenTime * 10) * 0.25;
          text("! KEEP UP !", clamp(screenX, 70, 130), 145, 13, COLORS.coral, "center");
          ctx.globalAlpha = 1;
        }
      }

      const progress = clamp(cameraX / (worldWidth - WIDTH), 0, 1);
      ctx.fillStyle = "rgba(18,13,31,.72)";
      ctx.fillRect(18, HEIGHT - 22, WIDTH - 36, 10);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(20, HEIGHT - 20, (WIDTH - 40) * progress, 6);
      drawHeart(20 + (WIDTH - 40) * progress, HEIGHT - 17, 12, COLORS.coral);

      drawGameHud("THE LONG WALK HOME", COLORS.gold, [
        { label: "STARS", value: `${starCount}/12`, color: starCount >= 12 ? COLORS.green : COLORS.gold, width: 150 },
        { label: "BUDDY GATES", value: `${gates.filter((gate) => gate.latched).length}/2`, color: COLORS.blue, width: 170 },
      ]);
      drawToast(toast, toastTimer, COLORS.gold);
      if (countdown > 0 && !dimmed) {
        ctx.fillStyle = "rgba(17,11,29,.42)";
        ctx.fillRect(0, 66, WIDTH, HEIGHT - 66);
        const number = Math.ceil(countdown);
        text(number > 0 ? number : "GO!", WIDTH / 2, 310, 92, COLORS.gold, "center");
        text("THE NIGHT STARTS MOVING IN…", WIDTH / 2, 361, 16, COLORS.cream, "center");
      }
    }

    return { update, draw };
  }

  function drawBeer(x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.deepInk;
    ctx.fillRect(-12, -25, 25, 38);
    ctx.fillRect(12, -16, 9, 20);
    ctx.fillStyle = "#f4b942";
    ctx.fillRect(-9, -19, 19, 28);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(-11, -27, 23, 10);
    ctx.fillRect(-6, -31, 15, 7);
    ctx.fillStyle = "#ffe59a";
    ctx.fillRect(-4, -14, 4, 17);
    ctx.restore();
  }

  function drawSeltzer(x, y, scale = 1) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.fillStyle = COLORS.deepInk;
    ctx.fillRect(-11, -28, 22, 43);
    ctx.fillStyle = COLORS.blue;
    ctx.fillRect(-8, -25, 16, 37);
    ctx.fillStyle = COLORS.cream;
    ctx.fillRect(-8, -10, 16, 13);
    ctx.fillStyle = COLORS.coral;
    ctx.fillRect(-4, -7, 8, 7);
    ctx.fillStyle = "#c6b2d4";
    ctx.fillRect(-6, -29, 12, 4);
    ctx.restore();
  }

  function createPartyLevel() {
    const worldWidth = 5240;
    const floorY = 470;
    const particles = new ParticleBurst();
    const players = [
      new PlatformPlayer("grant", 115, floorY),
      new PlatformPlayer("emma", 185, floorY),
    ];
    const platforms = [
      { x: 0, y: floorY, w: worldWidth, h: 100 },
      { x: 820, y: 394, w: 180, h: 12 },
      { x: 1180, y: 354, w: 170, h: 12 },
      { x: 1690, y: 402, w: 175, h: 12 },
      { x: 3020, y: 388, w: 195, h: 12 },
      { x: 3580, y: 345, w: 175, h: 12 },
      { x: 4190, y: 394, w: 190, h: 12 },
      { x: 4720, y: 358, w: 170, h: 12 },
    ];
    const crate = { x: 2180, y: floorY - 70, w: 112, h: 70, targetX: 2475, placed: false };
    const gate = { x: 2705, open: false };
    const drinkData = [
      ["beer", 430, 424], ["seltzer", 610, 424], ["beer", 900, 424], ["seltzer", 1080, 424],
      ["beer", 1265, 424], ["seltzer", 1485, 424], ["beer", 1790, 353], ["seltzer", 1990, 424],
      ["beer", 2890, 424], ["seltzer", 3115, 424], ["beer", 3380, 424], ["seltzer", 3670, 424],
      ["beer", 4010, 424], ["seltzer", 4280, 345], ["beer", 4620, 424], ["seltzer", 4805, 309],
    ];
    const drinks = drinkData.map(([type, x, y], index) => ({ type, x, y, collected: false, phase: index * 0.55 }));
    const enemyData = [
      ["boy", 720], ["girl", 1020], ["boy", 1400], ["girl", 1780], ["boy", 2050],
      ["girl", 2940], ["boy", 3220], ["girl", 3560], ["boy", 3960], ["girl", 4300],
      ["boy", 4620], ["girl", 4930],
    ];
    const enemies = enemyData.map(([type, x], index) => ({
      type,
      x,
      y: floorY,
      spawnX: x,
      state: "idle",
      timer: 0,
      defeated: false,
      direction: index % 2 ? -1 : 1,
      speed: 92 + (index % 4) * 7,
      phase: index * 0.6,
    }));
    let cameraX = 0;
    let beers = 0;
    let seltzers = 0;
    let toast = "Collect 6 of each — and protect your partner!";
    let toastTimer = 3.4;
    let pushGlow = 0;
    let defended = 0;

    function setToast(message, duration = 2.5) {
      toast = message;
      toastTimer = duration;
    }

    function getSolids() {
      const solids = platforms.slice();
      solids.push({ x: crate.x, y: crate.y, w: crate.w, h: crate.h });
      if (!gate.open) solids.push({ x: gate.x, y: 105, w: 42, h: floorY - 105 });
      if (beers < 6 || seltzers < 6) solids.push({ x: 5085, y: 275, w: 38, h: floorY - 275 });
      return solids;
    }

    function update(dt) {
      toastTimer = Math.max(0, toastTimer - dt);
      pushGlow = Math.max(0, pushGlow - dt);
      particles.update(dt);
      players.forEach((player) => player.update(dt, getSolids(), { minX: 0, maxX: worldWidth }));

      const leftPlayer = players[0].x > players[1].x ? players[1] : players[0];
      const rightPlayer = leftPlayer === players[0] ? players[1] : players[0];
      if (rightPlayer.x - leftPlayer.x > 735) {
        rightPlayer.x = leftPlayer.x + 735;
        rightPlayer.vx = Math.min(0, rightPlayer.vx);
        if (toastTimer <= 0.2) setToast("Too far apart! Your partner needs you.", 1.8);
      }

      if (!crate.placed) {
        const bothPushing = players.every((player, index) => {
          const rightEdge = player.x + player.width / 2;
          const rightKey = index === 0 ? "KeyD" : "ArrowRight";
          return input.isDown(rightKey) && player.onGround && player.x < crate.x && rightEdge >= crate.x - 9;
        });
        if (bothPushing) {
          const move = Math.min(92 * dt, crate.targetX - crate.x);
          crate.x += move;
          players.forEach((player) => {
            player.x += move;
            player.animation += dt * 1.5;
          });
          pushGlow = 0.15;
          if (Math.floor(crate.x / 25) !== Math.floor((crate.x - move) / 25)) audio.tone(95, 0.04, "square", 0.035);
        }
        if (crate.x >= crate.targetX - 0.1) {
          crate.x = crate.targetX;
          crate.placed = true;
          gate.open = true;
          particles.burst(crate.x + crate.w / 2, crate.y + 20, COLORS.gold, 20, 130);
          audio.collect();
          setToast("Cooler parked! The passport gate is open.", 3.2);
        }
      }

      for (const drink of drinks) {
        if (drink.collected) continue;
        const player = players.find((candidate) => distanceSquared(candidate.x, candidate.y - 28, drink.x, drink.y) < 43 * 43);
        if (!player) continue;
        drink.collected = true;
        if (drink.type === "beer") beers += 1;
        else seltzers += 1;
        particles.burst(drink.x, drink.y, drink.type === "beer" ? COLORS.gold : COLORS.blue, 11, 105);
        audio.collect();
        if (beers === 6 && seltzers === 6) setToast("Drink limit reached! Both players head for the exit.", 3.2);
      }

      const leadX = Math.max(players[0].x, players[1].x);
      for (const enemy of enemies) {
        if (enemy.defeated) continue;
        if (enemy.state === "idle" && leadX > enemy.spawnX - 620) {
          enemy.state = "warning";
          enemy.timer = 0.82;
          audio.tone(170, 0.09, "square", 0.055);
        }
        if (enemy.state === "warning") {
          enemy.timer -= dt;
          if (enemy.timer <= 0) enemy.state = "chasing";
          continue;
        }
        if (enemy.state !== "chasing") continue;

        const target = enemy.type === "boy" ? players[1] : players[0];
        const defender = enemy.type === "boy" ? players[0] : players[1];
        const direction = Math.sign(target.x - enemy.x) || enemy.direction;
        enemy.direction = direction;
        enemy.x += direction * enemy.speed * dt;
        const enemyRect = { x: enemy.x - 19, y: enemy.y - 60, w: 38, h: 60 };
        if (rectsOverlap(defender.rect, enemyRect)) {
          enemy.defeated = true;
          defended += 1;
          defender.vy = Math.min(defender.vy, -180);
          particles.burst(enemy.x, enemy.y - 35, defender.character === "grant" ? COLORS.blue : COLORS.pink, 14, 120);
          audio.bump();
          setToast(`${defender.character === "grant" ? "Grant" : "Emma"} made the perfect save!`, 1.7);
          continue;
        }
        if (rectsOverlap(target.rect, enemyRect)) {
          finishLevel(
            false,
            `${enemy.type === "boy" ? "A boy reached Emma" : "A girl reached Grant"}. Only their partner can make the save!`,
            [
              { label: "BEERS", value: `${Math.min(beers, 6)}/6`, color: COLORS.gold },
              { label: "SELTZERS", value: `${Math.min(seltzers, 6)}/6`, color: COLORS.blue },
            ],
          );
          return;
        }
      }

      const averageX = (players[0].x + players[1].x) / 2;
      cameraX = lerp(cameraX, clamp(averageX - WIDTH / 2, 0, worldWidth - WIDTH), 1 - Math.pow(0.001, dt));
      if ((beers < 6 || seltzers < 6) && Math.max(players[0].x, players[1].x) > 4990 && toastTimer < 0.5) {
        setToast(`Exit locked: still need ${Math.max(0, 6 - beers)} beer and ${Math.max(0, 6 - seltzers)} seltzer.`, 2.4);
      }
      if (beers >= 6 && seltzers >= 6 && players.every((player) => player.x > 5100)) {
        finishLevel(true, "Passport stamped! You made it around the world and out of the party together.", [
          { label: "BEERS", value: `${beers}/6`, color: COLORS.gold },
          { label: "SELTZERS", value: `${seltzers}/6`, color: COLORS.blue },
          { label: "SAVES", value: defended, color: COLORS.green },
        ]);
      }
    }

    function drawPartyPerson(enemy) {
      const x = enemy.x - cameraX;
      if (x < -80 || x > WIDTH + 80) return;
      if (enemy.state === "warning") {
        ctx.globalAlpha = 0.55 + Math.sin(screenTime * 14) * 0.35;
        fillRoundRect(x - 25, 330, 50, 42, 7, COLORS.coral);
        text("!", x, 360, 30, COLORS.cream, "center", false);
        ctx.globalAlpha = 1;
        return;
      }
      if (enemy.state !== "chasing") return;
      const bob = Math.abs(Math.sin(screenTime * 8 + enemy.phase)) * 4;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(enemy.y - bob));
      ctx.scale(enemy.direction, 1);
      ctx.fillStyle = COLORS.deepInk;
      ctx.fillRect(-16, -56, 32, 21);
      ctx.fillStyle = "#e5ae83";
      ctx.fillRect(-13, -53, 26, 22);
      ctx.fillStyle = enemy.type === "boy" ? "#5877b6" : "#bd5f88";
      ctx.fillRect(-17, -31, 34, 29);
      ctx.fillStyle = "#32263d";
      ctx.fillRect(-14, -2, 10, 12);
      ctx.fillRect(5, -2, 10, 12);
      ctx.restore();
      fillRoundRect(x - 43, enemy.y - 91 - bob, 86, 21, 4, "rgba(25,16,39,.86)");
      text(enemy.type === "boy" ? "→ EMMA" : "→ GRANT", x, enemy.y - 76 - bob, 10, enemy.type === "boy" ? COLORS.pink : COLORS.blue, "center", false);
    }

    function drawBackground() {
      ctx.fillStyle = "#342443";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      const roomWidth = 620;
      const roomColors = ["#774456", "#315c6b", "#6c5141", "#4c456f", "#38634f", "#71445f", "#394f70", "#694b37", "#4e365d"];
      for (let index = 0; index < 10; index += 1) {
        const x = index * roomWidth - cameraX;
        if (x + roomWidth < 0 || x > WIDTH) continue;
        ctx.fillStyle = roomColors[index % roomColors.length];
        ctx.fillRect(x, 66, roomWidth, floorY - 66);
        ctx.fillStyle = "rgba(255,255,255,.06)";
        for (let stripe = x + 35; stripe < x + roomWidth; stripe += 70) ctx.fillRect(stripe, 66, 4, floorY - 66);
        ctx.fillStyle = COLORS.deepInk;
        ctx.fillRect(x + roomWidth - 8, 66, 8, floorY - 66);
        fillRoundRect(x + 190, 92, 240, 38, 5, "rgba(25,16,39,.65)");
        const labels = ["USA", "MEXICO", "GERMANY", "FRANCE", "IRELAND", "ITALY", "JAPAN", "SPAIN", "BRAZIL"];
        text(labels[index % labels.length], x + 310, 118, 18, COLORS.cream, "center", false);
        for (let light = 0; light < 9; light += 1) {
          const lx = x + 30 + light * 66;
          ctx.strokeStyle = COLORS.deepInk;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(lx, 68);
          ctx.lineTo(lx, 87 + (light % 2) * 8);
          ctx.stroke();
          drawStar(lx, 92 + (light % 2) * 8, 6, 3, [COLORS.gold, COLORS.coral, COLORS.blue][light % 3], 0);
        }
      }
    }

    function drawPlatforms() {
      platforms.forEach((platform) => {
        const x = platform.x - cameraX;
        if (x + platform.w < 0 || x > WIDTH) return;
        if (platform.y === floorY) {
          ctx.fillStyle = "#251b30";
          ctx.fillRect(x, floorY, platform.w, HEIGHT - floorY);
          ctx.fillStyle = "#9f775a";
          ctx.fillRect(x, floorY, platform.w, 9);
          for (let board = x; board < x + platform.w; board += 78) {
            ctx.fillStyle = board % 156 === 0 ? "#704b45" : "#62423e";
            ctx.fillRect(board, floorY + 9, 75, HEIGHT - floorY - 9);
          }
        } else {
          ctx.fillStyle = COLORS.deepInk;
          ctx.fillRect(x + 5, platform.y + 6, platform.w, platform.h);
          ctx.fillStyle = "#a9795e";
          ctx.fillRect(x, platform.y, platform.w, platform.h);
          ctx.fillStyle = COLORS.cream;
          ctx.fillRect(x + 10, platform.y + 5, platform.w - 20, 4);
        }
      });
    }

    function drawCrateAndGate() {
      const zoneX = crate.targetX - cameraX;
      ctx.fillStyle = "rgba(101,193,140,.25)";
      ctx.fillRect(zoneX, crate.y, crate.w, crate.h);
      ctx.strokeStyle = COLORS.green;
      ctx.lineWidth = 3;
      ctx.setLineDash([9, 7]);
      ctx.strokeRect(zoneX, crate.y, crate.w, crate.h);
      ctx.setLineDash([]);
      const crateX = crate.x - cameraX;
      ctx.fillStyle = COLORS.deepInk;
      ctx.fillRect(crateX + 5, crate.y + 6, crate.w, crate.h);
      ctx.fillStyle = pushGlow > 0 ? "#e3ab56" : "#b87745";
      ctx.fillRect(crateX, crate.y, crate.w, crate.h);
      ctx.fillStyle = "#79432f";
      ctx.fillRect(crateX + 9, crate.y + 8, crate.w - 18, 9);
      ctx.fillRect(crateX + 9, crate.y + crate.h - 18, crate.w - 18, 9);
      ctx.fillRect(crateX + 13, crate.y + 15, 8, crate.h - 30);
      ctx.fillRect(crateX + crate.w - 21, crate.y + 15, 8, crate.h - 30);
      text("2P", crateX + crate.w / 2, crate.y + 53, 25, COLORS.cream, "center", false);
      if (!crate.placed && Math.max(players[0].x, players[1].x) > 1850) {
        fillRoundRect(crateX - 29, crate.y - 44, 170, 29, 5, "rgba(22,13,34,.88)");
        text("BOTH PUSH  →", crateX + 56, crate.y - 24, 13, COLORS.gold, "center", false);
      }

      const gateX = gate.x - cameraX;
      if (gateX > -80 && gateX < WIDTH + 80) {
        ctx.fillStyle = COLORS.deepInk;
        ctx.fillRect(gateX - 9, 94, 60, 18);
        ctx.fillRect(gateX - 9, 94, 9, floorY - 94);
        ctx.fillRect(gateX + 42, 94, 9, floorY - 94);
        if (!gate.open) {
          ctx.fillStyle = COLORS.coral;
          ctx.fillRect(gateX, 108, 42, floorY - 108);
          ctx.fillStyle = COLORS.cream;
          for (let y = 128; y < floorY; y += 42) ctx.fillRect(gateX + 7, y, 28, 8);
        }
        fillRoundRect(gateX - 18, 69, 78, 23, 4, gate.open ? COLORS.green : COLORS.coral);
        text(gate.open ? "OPEN" : "PUSH!", gateX + 21, 86, 11, COLORS.ink, "center", false);
      }
    }

    function drawExit() {
      const x = 5065 - cameraX;
      if (x < -150 || x > WIDTH + 100) return;
      ctx.fillStyle = "#282035";
      ctx.fillRect(x, 230, 145, floorY - 230);
      ctx.fillStyle = COLORS.green;
      ctx.fillRect(x + 14, 245, 117, 44);
      text("EXIT", x + 72, 276, 26, COLORS.cream, "center", false);
      ctx.fillStyle = "#171120";
      ctx.fillRect(x + 41, 328, 66, floorY - 328);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(x + 91, 394, 6, 6);
      if (beers < 6 || seltzers < 6) {
        ctx.fillStyle = COLORS.coral;
        ctx.fillRect(x + 20, 300, 105, 13);
        ctx.fillRect(x + 20, 332, 105, 13);
        ctx.fillRect(x + 20, 364, 105, 13);
        fillRoundRect(x + 36, 404, 74, 28, 4, COLORS.deepInk);
        text("LOCKED", x + 73, 423, 11, COLORS.coral, "center", false);
      }
    }

    function draw(dimmed = false) {
      drawBackground();
      drawPlatforms();
      drawExit();
      drawCrateAndGate();
      drinks.forEach((drink) => {
        if (drink.collected) return;
        const x = drink.x - cameraX;
        if (x < -35 || x > WIDTH + 35) return;
        const y = drink.y + Math.sin(screenTime * 4 + drink.phase) * 4;
        if (drink.type === "beer") drawBeer(x, y);
        else drawSeltzer(x, y);
      });
      enemies.forEach(drawPartyPerson);
      particles.draw(cameraX);
      players.forEach((player) => player.draw(cameraX));
      drawGameHud("PI KAPPS PASSPORT NIGHT", COLORS.coral, [
        { label: "BEERS", value: `${Math.min(beers, 6)}/6`, color: COLORS.gold, width: 130 },
        { label: "SELTZERS", value: `${Math.min(seltzers, 6)}/6`, color: COLORS.blue, width: 150 },
        { label: "SAVES", value: defended, color: COLORS.green, width: 115 },
      ]);
      drawToast(toast, toastTimer, COLORS.coral);
    }

    return { update, draw };
  }

  function createCrowdLevel() {
    const particles = new ParticleBurst();
    const seatZones = { grant: 360, emma: 600 };
    const players = [
      {
        character: "grant",
        x: 405,
        y: 490,
        fromY: 490,
        toY: 490,
        hopTime: -1,
        hopDuration: 0.54,
        hopHeight: 0,
        direction: 1,
        animation: 0,
        invulnerable: 0.8,
        seated: false,
        controls: { left: "KeyA", right: "KeyD", jump: "KeyW" },
      },
      {
        character: "emma",
        x: 555,
        y: 490,
        fromY: 490,
        toY: 490,
        hopTime: -1,
        hopDuration: 0.54,
        hopHeight: 0,
        direction: -1,
        animation: 0.3,
        invulnerable: 0.8,
        seated: false,
        controls: { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" },
      },
    ];
    const rowData = [
      { y: 435, speed: 112, direction: 1, spacing: 166, offset: -90, color: "#6c4d79" },
      { y: 325, speed: 148, direction: -1, spacing: 154, offset: 25, color: "#3e7180" },
      { y: 215, speed: 126, direction: 1, spacing: 174, offset: -35, color: "#8c5260" },
      { y: 105, speed: 164, direction: -1, spacing: 150, offset: 70, color: "#5d5c8c" },
    ];
    const rows = rowData.map((row, rowIndex) => ({
      ...row,
      people: Array.from({ length: 8 }, (_, index) => ({
        x: row.offset + index * row.spacing,
        width: 40 + ((index + rowIndex) % 3) * 5,
        shirt: [row.color, COLORS.orange, "#857047", "#4e6688"][(index + rowIndex) % 4],
        phase: index * 0.7 + rowIndex,
      })),
    }));
    const gates = [
      {
        y: 380,
        barrierY: 350,
        grantX: 350,
        emmaX: 610,
        open: false,
        color: COLORS.gold,
        label: "TICKET CHECK 1",
      },
      {
        y: 270,
        barrierY: 240,
        grantX: 615,
        emmaX: 345,
        open: false,
        color: COLORS.blue,
        label: "TICKET CHECK 2",
      },
    ];
    let toast = "Jump through each crowd lane when you see a gap!";
    let toastTimer = 3.2;
    let crowdBeat = 0;

    function setToast(message, duration = 2.3) {
      toast = message;
      toastTimer = duration;
    }

    function isAt(player, y, x) {
      return player.hopTime < 0 && Math.abs(player.y - y) < 3 && Math.abs(player.x - x) < 46;
    }

    function openGatesIfReady() {
      gates.forEach((gate, index) => {
        if (gate.open) return;
        if (isAt(players[0], gate.y, gate.grantX) && isAt(players[1], gate.y, gate.emmaX)) {
          gate.open = true;
          particles.burst(gate.grantX, gate.y, COLORS.blue, 13, 105);
          particles.burst(gate.emmaX, gate.y, COLORS.pink, 13, 105);
          audio.collect();
          setToast(`Checkpoint ${index + 1} open! Jump forward together.`, 2.8);
        }
      });
    }

    function canHop(player) {
      if (Math.abs(player.y - 380) < 3 && !gates[0].open) {
        setToast("Both players must stand on their colored ticket pads!", 2.1);
        audio.bump();
        return false;
      }
      if (Math.abs(player.y - 270) < 3 && !gates[1].open) {
        setToast("Meet on the second pair of ticket pads!", 2.1);
        audio.bump();
        return false;
      }
      return player.y > 50;
    }

    function updatePlayer(player, dt) {
      player.animation += dt;
      player.invulnerable = Math.max(0, player.invulnerable - dt);
      if (player.seated) return;
      const left = input.isDown(player.controls.left);
      const right = input.isDown(player.controls.right);
      const axis = (right ? 1 : 0) - (left ? 1 : 0);
      if (axis !== 0) {
        player.x += axis * 195 * dt;
        player.direction = axis;
      }
      player.x = clamp(player.x, 72, WIDTH - 72);

      if (player.hopTime < 0 && input.wasPressed(player.controls.jump) && canHop(player)) {
        player.fromY = player.y;
        player.toY = Math.max(50, player.y - 110);
        player.hopTime = 0;
        audio.jump();
      }
      if (player.hopTime >= 0) {
        player.hopTime += dt;
        const t = clamp(player.hopTime / player.hopDuration, 0, 1);
        player.y = lerp(player.fromY, player.toY, easeInOut(t));
        player.hopHeight = Math.sin(t * Math.PI) * 22;
        if (t >= 1) {
          player.y = player.toY;
          player.hopTime = -1;
          player.hopHeight = 0;
        }
      }

      const seatX = seatZones[player.character];
      if (player.y <= 50 && Math.abs(player.x - seatX) < 63) {
        player.seated = true;
        player.x = seatX;
        player.y = 50;
        particles.burst(player.x, player.y + 4, player.character === "grant" ? COLORS.blue : COLORS.pink, 16, 95);
        audio.collect();
        setToast(`${player.character === "grant" ? "Grant" : "Emma"} found the front-row seat!`, 2.2);
      }
    }

    function update(dt) {
      toastTimer = Math.max(0, toastTimer - dt);
      particles.update(dt);
      crowdBeat -= dt;
      if (crowdBeat <= 0) {
        crowdBeat += 0.68;
        audio.tone(115, 0.045, "square", 0.025);
      }
      rows.forEach((row) => {
        row.people.forEach((person) => {
          person.x += row.speed * row.direction * dt;
          if (row.direction > 0 && person.x > WIDTH + 85) person.x = -85;
          if (row.direction < 0 && person.x < -85) person.x = WIDTH + 85;
        });
      });
      players.forEach((player) => updatePlayer(player, dt));
      openGatesIfReady();

      for (const player of players) {
        if (player.invulnerable > 0 || player.seated) continue;
        for (const row of rows) {
          if (Math.abs(player.y - row.y) > 25) continue;
          const hit = row.people.some((person) => Math.abs(player.x - person.x) < person.width / 2 + 15);
          if (hit) {
            finishLevel(false, `${player.character === "grant" ? "Grant" : "Emma"} was swept up by the Neyland crowd. One bump sends the team back.`, [
              { label: "CHECKPOINTS", value: `${gates.filter((gate) => gate.open).length}/2`, color: COLORS.orange },
              { label: "SEATS", value: `${players.filter((item) => item.seated).length}/2`, color: COLORS.blue },
            ]);
            return;
          }
        }
      }

      if (players.every((player) => player.seated)) {
        finishLevel(true, "Front row! You made it through the crowd with both tickets — and each other — intact.", [
          { label: "CHECKPOINTS", value: "2/2", color: COLORS.green },
          { label: "SEATS", value: "2/2", color: COLORS.orange },
        ]);
      }
    }

    function drawFan(person, row, rowIndex) {
      const bob = Math.sin(screenTime * 7 + person.phase) * 2;
      const x = Math.round(person.x);
      const y = Math.round(row.y + bob);
      ctx.fillStyle = "rgba(18,12,28,.25)";
      ctx.fillRect(x - person.width / 2, y + 13, person.width, 8);
      ctx.fillStyle = COLORS.deepInk;
      ctx.fillRect(x - person.width / 2, y - 15, person.width, 27);
      ctx.fillStyle = person.shirt;
      ctx.fillRect(x - person.width / 2 + 4, y - 11, person.width - 8, 21);
      ctx.fillStyle = ["#efbd91", "#b9795d", "#8c573f", "#dca77e"][(Math.floor(person.phase) + rowIndex) % 4];
      ctx.fillRect(x - 10, y - 28, 20, 17);
      ctx.fillStyle = ["#4a302d", "#d29a54", "#312633"][(Math.floor(person.phase * 2) + rowIndex) % 3];
      ctx.fillRect(x - 11, y - 31, 22, 7);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(x - 5, y - 21, 3, 3);
      ctx.fillRect(x + 4, y - 21, 3, 3);
      if (Math.floor(screenTime * 3 + person.phase) % 2 === 0) {
        ctx.fillStyle = COLORS.orange;
        ctx.fillRect(x - person.width / 2 - 5, y - 18, 6, 20);
        ctx.fillRect(x + person.width / 2 - 1, y - 18, 6, 20);
      }
    }

    function drawPad(x, y, color, active, character) {
      ctx.globalAlpha = active ? 1 : 0.76;
      ctx.fillStyle = "rgba(20,13,33,.35)";
      ctx.beginPath();
      ctx.ellipse(x, y + 23, 48, 19, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = active ? color : "#625970";
      ctx.beginPath();
      ctx.ellipse(x, y + 18, 43, 15, 0, 0, TAU);
      ctx.fill();
      text(character === "grant" ? "G" : "E", x, y + 23, 14, active ? COLORS.ink : COLORS.cream, "center", false);
      ctx.globalAlpha = 1;
    }

    function drawStadium() {
      ctx.fillStyle = "#d8c7aa";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#396c54";
      ctx.fillRect(0, 66, WIDTH, 50);
      ctx.fillStyle = "rgba(255,255,255,.5)";
      ctx.fillRect(0, 73, WIDTH, 4);
      ctx.fillRect(0, 104, WIDTH, 4);
      ctx.fillStyle = COLORS.orange;
      ctx.fillRect(0, 116, WIDTH, 18);

      const safeRows = [490, 380, 270, 160, 50];
      for (let index = 0; index < 4; index += 1) {
        const y = rowData[index].y;
        ctx.fillStyle = index % 2 === 0 ? "#b8aa96" : "#c4b59e";
        ctx.fillRect(0, y - 35, WIDTH, 70);
        ctx.fillStyle = "rgba(85,65,69,.18)";
        ctx.fillRect(0, y - 3, WIDTH, 6);
        ctx.fillStyle = rowData[index].direction > 0 ? "rgba(255,255,255,.46)" : "rgba(79,59,120,.2)";
        for (let x = 15; x < WIDTH; x += 84) {
          const px = rowData[index].direction > 0 ? x : WIDTH - x;
          ctx.beginPath();
          ctx.moveTo(px - 11, y);
          ctx.lineTo(px + 9, y - 9);
          ctx.lineTo(px + 9, y + 9);
          ctx.closePath();
          ctx.fill();
        }
      }
      safeRows.forEach((y) => {
        ctx.fillStyle = "rgba(255,241,207,.55)";
        ctx.fillRect(0, y + 33, WIDTH, 3);
      });
    }

    function drawGates() {
      gates.forEach((gate) => {
        const grantActive = isAt(players[0], gate.y, gate.grantX);
        const emmaActive = isAt(players[1], gate.y, gate.emmaX);
        drawPad(gate.grantX, gate.y, COLORS.blue, grantActive || gate.open, "grant");
        drawPad(gate.emmaX, gate.y, COLORS.pink, emmaActive || gate.open, "emma");
        if (!gate.open) {
          ctx.fillStyle = "rgba(31,22,46,.86)";
          ctx.fillRect(46, gate.barrierY - 7, WIDTH - 92, 14);
          ctx.fillStyle = gate.color;
          for (let x = 56; x < WIDTH - 55; x += 32) ctx.fillRect(x, gate.barrierY - 4, 18, 8);
          fillRoundRect(WIDTH / 2 - 82, gate.barrierY - 18, 164, 28, 4, COLORS.deepInk);
          text(gate.label, WIDTH / 2, gate.barrierY + 2, 11, gate.color, "center", false);
        }
      });
    }

    function drawSeats() {
      Object.entries(seatZones).forEach(([character, x]) => {
        const occupied = players.find((player) => player.character === character)?.seated;
        fillRoundRect(x - 68, 67, 136, 43, 7, occupied ? COLORS.green : "rgba(26,18,40,.8)");
        strokeRoundRect(x - 68, 67, 136, 43, 7, character === "grant" ? COLORS.blue : COLORS.pink, 3);
        text(character === "grant" ? "GRANT'S SEAT" : "EMMA'S SEAT", x, 94, 11, occupied ? COLORS.ink : COLORS.cream, "center", false);
      });
      text("FIELD  ↑", 874, 96, 13, COLORS.white, "center", false);
    }

    function draw(dimmed = false) {
      drawStadium();
      drawGates();
      rows.forEach((row, index) => row.people.forEach((person) => drawFan(person, row, index)));
      drawSeats();
      particles.draw();
      players.forEach((player) => {
        const feetY = player.seated ? 124 : player.y + 25 - player.hopHeight;
        const shadowY = player.seated ? 122 : player.y + 24;
        ctx.fillStyle = "rgba(25,16,38,.28)";
        ctx.beginPath();
        ctx.ellipse(player.x, shadowY, 21, 7, 0, 0, TAU);
        ctx.fill();
        drawCharacterSprite(player.character, player.x, feetY, {
          scale: 2,
          direction: player.direction,
          moving: player.hopTime >= 0 || input.isDown(player.controls.left) || input.isDown(player.controls.right),
          jumping: player.hopTime >= 0,
          animation: player.animation,
          label: false,
          marker: false,
          alpha: player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0 ? 0.55 : 1,
        });
        if (!player.seated) {
          fillRoundRect(player.x - 27, player.y + 33, 54, 16, 3, "rgba(23,15,36,.78)");
          text(player.character === "grant" ? "GRANT" : "EMMA", player.x, player.y + 45, 9, player.character === "grant" ? COLORS.blue : COLORS.pink, "center", false);
        }
      });
      drawGameHud("FRONT ROW OR BUST", COLORS.orange, [
        { label: "CHECKPOINTS", value: `${gates.filter((gate) => gate.open).length}/2`, color: COLORS.gold, width: 175 },
        { label: "FRONT ROW", value: `${players.filter((player) => player.seated).length}/2`, color: COLORS.orange, width: 150 },
      ]);
      drawToast(toast, toastTimer, COLORS.orange);
      if (screenTime < 2.8 && !dimmed) {
        fillRoundRect(260, 137, 440, 45, 6, "rgba(20,13,34,.88)");
        text("A / D / W     MOVE & JUMP     ← / → / ↑", WIDTH / 2, 165, 13, COLORS.cream, "center", false);
      }
    }

    return { update, draw };
  }

  function createSerenadeLevel() {
    const particles = new ParticleBurst();
    const duration = 42;
    const grantCodes = ["KeyW", "KeyA", "KeyS", "KeyD"];
    const emmaCodes = ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"];
    const labels = {
      KeyW: "W",
      KeyA: "A",
      KeyS: "S",
      KeyD: "D",
      ArrowLeft: "←",
      ArrowUp: "↑",
      ArrowDown: "↓",
      ArrowRight: "→",
    };
    const laneColors = {
      KeyW: COLORS.gold,
      KeyA: COLORS.coral,
      KeyS: COLORS.blue,
      KeyD: COLORS.green,
      ArrowLeft: COLORS.pink,
      ArrowUp: COLORS.gold,
      ArrowDown: COLORS.blue,
      ArrowRight: COLORS.green,
    };
    const guitarPattern = [0, 1, 2, 3, 0, 2, 1, 3, 1, 0, 3, 2, 0, 1, 3, 2];
    const sheepPattern = [1, 0, 3, 2, 1, 3, 0, 2, 3, 1, 2, 0];
    const guitarNotes = [];
    const sheepNotes = [];
    let noteIndex = 0;
    for (let time = 3.1; time < 39.4; time += noteIndex % 7 === 6 ? 0.84 : 0.61) {
      guitarNotes.push({ time, code: grantCodes[guitarPattern[noteIndex % guitarPattern.length]], resolved: false, hit: false, perfect: false });
      noteIndex += 1;
    }
    let sheepIndex = 0;
    for (let time = 3.6; time < 39.2; time += sheepIndex % 5 === 4 ? 1.35 : 1.03) {
      sheepNotes.push({
        time,
        code: emmaCodes[sheepPattern[sheepIndex % sheepPattern.length]],
        resolved: false,
        hit: false,
        perfect: false,
        lane: sheepPattern[sheepIndex % sheepPattern.length],
      });
      sheepIndex += 1;
    }
    let songTime = -3;
    let lastBeat = -1;
    let grantHits = 0;
    let grantPerfects = 0;
    let grantCombo = 0;
    let grantBestCombo = 0;
    let sheepHits = 0;
    let sheepPerfects = 0;
    let sheepCombo = 0;
    let sheepBestCombo = 0;
    let grantFlash = { timer: 0, text: "", color: COLORS.cream };
    let emmaFlash = { timer: 0, text: "", color: COLORS.cream };
    let evaluated = false;

    function resolvePress(code, notes, owner) {
      let nearest = null;
      let nearestDistance = Infinity;
      for (const note of notes) {
        if (note.resolved) continue;
        const distance = Math.abs(note.time - songTime);
        if (distance < nearestDistance) {
          nearest = note;
          nearestDistance = distance;
        }
      }
      if (!nearest || nearestDistance > 0.24) return;
      nearest.resolved = true;
      if (nearest.code === code) {
        nearest.hit = true;
        nearest.perfect = nearestDistance <= 0.1;
        const isGrant = owner === "grant";
        if (isGrant) {
          grantHits += 1;
          grantCombo += 1;
          grantBestCombo = Math.max(grantBestCombo, grantCombo);
          if (nearest.perfect) grantPerfects += 1;
          grantFlash = { timer: 0.38, text: nearest.perfect ? "PERFECT!" : "GOOD!", color: nearest.perfect ? COLORS.gold : COLORS.green };
          particles.burst(215, 423, laneColors[code], nearest.perfect ? 13 : 8, 95);
          audio.tone([660, 523, 440, 587][grantCodes.indexOf(code)], 0.1, "square", 0.105);
        } else {
          sheepHits += 1;
          sheepCombo += 1;
          sheepBestCombo = Math.max(sheepBestCombo, sheepCombo);
          if (nearest.perfect) sheepPerfects += 1;
          emmaFlash = { timer: 0.38, text: nearest.perfect ? "COUNTED!" : "GOT IT!", color: nearest.perfect ? COLORS.pink : COLORS.green };
          particles.burst(824, 245 + nearest.lane * 42, laneColors[code], nearest.perfect ? 13 : 8, 95);
          audio.tone([494, 659, 392, 587][emmaCodes.indexOf(code)], 0.11, "triangle", 0.105);
        }
      } else if (owner === "grant") {
        grantCombo = 0;
        grantFlash = { timer: 0.38, text: "WRONG NOTE", color: COLORS.coral };
        audio.bump();
      } else {
        sheepCombo = 0;
        emmaFlash = { timer: 0.38, text: "MISCOUNT", color: COLORS.coral };
        audio.bump();
      }
    }

    function markMisses(notes, owner) {
      for (const note of notes) {
        if (note.resolved || songTime - note.time <= 0.25) continue;
        note.resolved = true;
        if (owner === "grant") {
          grantCombo = 0;
          grantFlash = { timer: 0.26, text: "MISS", color: COLORS.coral };
        } else {
          sheepCombo = 0;
          emmaFlash = { timer: 0.26, text: "MISSED ONE", color: COLORS.coral };
        }
      }
    }

    function accuracy(hits, notes) {
      return Math.round((hits / notes.length) * 100);
    }

    function liveAccuracy(hits, notes) {
      const resolved = notes.filter((note) => note.resolved).length;
      return resolved === 0 ? 100 : Math.round((hits / resolved) * 100);
    }

    function update(dt) {
      songTime += dt;
      grantFlash.timer = Math.max(0, grantFlash.timer - dt);
      emmaFlash.timer = Math.max(0, emmaFlash.timer - dt);
      particles.update(dt);

      if (songTime >= 0) {
        const beat = Math.floor(songTime / 0.5);
        if (beat !== lastBeat) {
          lastBeat = beat;
          const bass = [110, 110, 147, 123][beat % 4];
          audio.tone(bass, 0.07, "square", beat % 2 === 0 ? 0.034 : 0.022);
          if (beat % 4 === 0) audio.tone(bass * 2, 0.13, "triangle", 0.025, 0.02);
        }
      }

      if (songTime >= 0 && songTime <= duration) {
        grantCodes.forEach((code) => {
          if (input.wasPressed(code)) resolvePress(code, guitarNotes, "grant");
        });
        emmaCodes.forEach((code) => {
          if (input.wasPressed(code)) resolvePress(code, sheepNotes, "emma");
        });
        markMisses(guitarNotes, "grant");
        markMisses(sheepNotes, "emma");
      }

      if (songTime > duration && !evaluated) {
        evaluated = true;
        guitarNotes.forEach((note) => {
          if (!note.resolved) note.resolved = true;
        });
        sheepNotes.forEach((note) => {
          if (!note.resolved) note.resolved = true;
        });
        const grantAccuracy = accuracy(grantHits, guitarNotes);
        const emmaAccuracy = accuracy(sheepHits, sheepNotes);
        const together = Math.round((grantAccuracy + emmaAccuracy) / 2);
        const success = grantAccuracy >= 70 && emmaAccuracy >= 70 && together >= 75;
        finishLevel(
          success,
          success
            ? "The last chord fades, the final sheep lands, and Emma can finally rest easy."
            : "The song got a little tangled. Both players need at least 70%, with 75% calm together.",
          [
            { label: "GRANT", value: `${grantAccuracy}%`, color: grantAccuracy >= 70 ? COLORS.blue : COLORS.coral },
            { label: "EMMA", value: `${emmaAccuracy}%`, color: emmaAccuracy >= 70 ? COLORS.pink : COLORS.coral },
            { label: "TOGETHER", value: `${together}%`, color: together >= 75 ? COLORS.green : COLORS.coral },
          ],
        );
      }
    }

    function drawBedroom() {
      drawDitheredSky("#1c1b3c", "#35315b");
      ctx.fillStyle = "#14152d";
      ctx.fillRect(0, 66, WIDTH, HEIGHT - 66);
      ctx.fillStyle = "#252443";
      for (let x = 0; x < WIDTH; x += 96) ctx.fillRect(x, 66, 48, HEIGHT - 66);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(835, 86, 54, 54);
      ctx.fillStyle = "#a7a0b2";
      ctx.fillRect(848, 99, 11, 8);
      ctx.fillRect(872, 118, 9, 7);
      ctx.fillStyle = "#8881a0";
      for (let index = 0; index < 22; index += 1) {
        const x = (index * 137 + 43) % WIDTH;
        const y = 80 + ((index * 71) % 170);
        ctx.fillRect(x, y, 3, 3);
      }
      ctx.fillStyle = "#4a3652";
      ctx.fillRect(0, 480, WIDTH, 60);
      ctx.fillStyle = "#6b4b59";
      for (let x = 0; x < WIDTH; x += 88) ctx.fillRect(x, 480, 84, 6);
    }

    function drawGuitarLane() {
      drawPanel(24, 82, 433, 381, "rgba(26,22,50,.86)", COLORS.blue);
      text("GRANT'S SERENADE", 240, 111, 17, COLORS.blue, "center", false);
      drawCharacterSprite("grant", 48, 124, { scale: 1.5, marker: false, label: false });
      const laneXs = [104, 194, 284, 374];
      const targetY = 417;
      laneXs.forEach((x, index) => {
        ctx.fillStyle = index % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.06)";
        ctx.fillRect(x - 35, 128, 70, 294);
        ctx.fillStyle = "rgba(255,255,255,.12)";
        ctx.fillRect(x - 1, 128, 2, 260);
      });
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(63, targetY - 4, 352, 5);

      guitarNotes.forEach((note) => {
        if (note.resolved) return;
        const timeAway = note.time - songTime;
        if (timeAway > 2.45 || timeAway < -0.27) return;
        const x = laneXs[grantCodes.indexOf(note.code)];
        const y = targetY - timeAway * 110;
        const near = Math.abs(timeAway) <= 0.24;
        fillRoundRect(x - 26, y - 15, 52, 30, 5, near ? COLORS.white : laneColors[note.code]);
        strokeRoundRect(x - 26, y - 15, 52, 30, 5, near ? laneColors[note.code] : COLORS.deepInk, 3);
        text(labels[note.code], x, y + 7, 18, COLORS.ink, "center", false);
      });

      grantCodes.forEach((code, index) => {
        const x = laneXs[index];
        drawKey(labels[code], x - 22, 426, 44, input.isDown(code));
      });
      if (grantFlash.timer > 0) {
        ctx.globalAlpha = clamp(grantFlash.timer * 5, 0, 1);
        text(grantFlash.text, 240, 155, 19, grantFlash.color, "center");
        ctx.globalAlpha = 1;
      }
      if (grantCombo >= 3) text(`${grantCombo} COMBO`, 240, 386, 13, COLORS.gold, "center", false);
    }

    function drawSheepLane() {
      drawPanel(503, 82, 433, 381, "rgba(30,28,53,.88)", COLORS.pink);
      text("EMMA COUNTS SHEEP", 720, 111, 17, COLORS.pink, "center", false);
      drawCharacterSprite("emma", 912, 124, { scale: 1.5, direction: -1, marker: false, label: false });
      const fenceX = 824;
      const laneYs = [201, 258, 315, 372];
      laneYs.forEach((y, index) => {
        ctx.fillStyle = index % 2 ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.06)";
        ctx.fillRect(524, y - 24, 376, 48);
      });
      ctx.fillStyle = "#8a5b42";
      ctx.fillRect(fenceX - 5, 149, 10, 259);
      ctx.fillRect(fenceX + 54, 149, 10, 259);
      for (let y = 166; y < 408; y += 44) ctx.fillRect(fenceX - 5, y, 69, 7);
      ctx.fillStyle = COLORS.cream;
      ctx.fillRect(fenceX - 2, 149, 4, 259);

      sheepNotes.forEach((note) => {
        if (note.resolved) return;
        const timeAway = note.time - songTime;
        if (timeAway > 3 || timeAway < -0.27) return;
        const x = fenceX - timeAway * 95;
        const y = laneYs[note.lane];
        const jump = Math.max(0, 1 - Math.abs(timeAway) / 0.5) * 24;
        drawPixelSheep(x, y - jump, 0.68, 1);
        fillRoundRect(x - 16, y - 54 - jump, 32, 27, 4, Math.abs(timeAway) <= 0.24 ? COLORS.white : laneColors[note.code]);
        text(labels[note.code], x, y - 35 - jump, 16, COLORS.ink, "center", false);
      });

      emmaCodes.forEach((code, index) => drawKey(labels[code], 538 + index * 58, 425, 43, input.isDown(code)));
      text(`COUNTED  ${sheepHits}`, 861, 450, 13, COLORS.cream, "center", false);
      if (emmaFlash.timer > 0) {
        ctx.globalAlpha = clamp(emmaFlash.timer * 5, 0, 1);
        text(emmaFlash.text, 720, 155, 19, emmaFlash.color, "center");
        ctx.globalAlpha = 1;
      }
      if (sheepCombo >= 3) text(`${sheepCombo} IN A ROW`, 720, 405, 13, COLORS.gold, "center", false);
    }

    function drawCalmMeter() {
      const gAccuracy = liveAccuracy(grantHits, guitarNotes);
      const eAccuracy = liveAccuracy(sheepHits, sheepNotes);
      const calm = Math.round((gAccuracy + eAccuracy) / 2);
      fillRoundRect(272, 490, 416, 29, 5, "rgba(13,10,25,.85)");
      ctx.fillStyle = calm >= 75 ? COLORS.green : calm >= 55 ? COLORS.gold : COLORS.coral;
      ctx.fillRect(280, 498, 4.0 * clamp(calm, 0, 100), 13);
      text(`EMMA'S CALM  ${calm}%`, WIDTH / 2, 511, 12, COLORS.cream, "center", false);
    }

    function draw(dimmed = false) {
      drawBedroom();
      drawGuitarLane();
      drawSheepLane();
      particles.draw();
      drawCalmMeter();
      const remaining = Math.max(0, Math.ceil(duration - Math.max(songTime, 0)));
      drawGameHud("LATE NIGHT SERENADE", COLORS.blue, [
        { label: "GRANT", value: `${liveAccuracy(grantHits, guitarNotes)}%`, color: COLORS.blue, width: 130 },
        { label: "EMMA", value: `${liveAccuracy(sheepHits, sheepNotes)}%`, color: COLORS.pink, width: 130 },
        { label: "TIME", value: `${remaining}s`, color: COLORS.cream, width: 105 },
      ]);
      if (songTime < 0 && !dimmed) {
        ctx.fillStyle = "rgba(12,9,24,.68)";
        ctx.fillRect(0, 66, WIDTH, HEIGHT - 66);
        text(Math.max(1, Math.ceil(-songTime)), WIDTH / 2, 300, 92, COLORS.gold, "center");
        text("GRANT: WASD NOTES     ·     EMMA: ARROW SHEEP", WIDTH / 2, 353, 15, COLORS.cream, "center");
      }
    }

    return { update, draw };
  }

  // Level factories are defined above so the menu can stay data-driven.

  let previousTime = performance.now();
  function frame(now) {
    const dt = Math.min(0.04, Math.max(0, (now - previousTime) / 1000));
    previousTime = now;
    update(dt);
    draw();
    input.clearEdges();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  loadAssets().then(() => {
    selectedLevel = levels[selectedIndex];
    goTo("title", "Grant and Emma: Side by Side. Press W or the up arrow to play.");
  });
})();
