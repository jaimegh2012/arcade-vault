import {
  BOUNCE_SOUND_URL,
  BREAK_SOUND_URL,
  H,
  INITIAL_LIVES,
  MAX_DT,
  MAX_LEVEL,
  PADDLE_BOUNCE_TOLERANCE,
  PADDLE_SPEED,
  POINTS_PER_BLOCK,
  W,
} from "./constants";
import {
  clampPaddleX,
  collideAABB,
  createBall,
  createBlocks,
  createExplosion,
  createPaddle,
  drawBackground,
  drawBall,
  drawBlocks,
  drawExplosions,
  drawLives,
  drawPaddle,
  placeBall,
  type Ball,
  type Block,
  type Explosion,
  type Paddle,
} from "./entities";
import { attachInput, type ArkanoidKeys } from "./input";
import { EXPLOSION_DURATION, loadSpritesheet, type Spritesheet } from "./sprites";

export type ArkanoidCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void; // game over y victoria
  onTogglePause: () => void;
};

export type ArkanoidGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  jumpToLevel(level: number): void; // 1–5; conserva score y vidas
  setMuted(muted: boolean): void;
  destroy(): void; // cancela rAF, quita listeners, aborta carga de sprites
};

export function createArkanoidGame(
  canvas: HTMLCanvasElement,
  callbacks: ArkanoidCallbacks,
): ArkanoidGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  const bounceSound = new Audio(BOUNCE_SOUND_URL);
  const breakSound = new Audio(BREAK_SOUND_URL);
  let muted = false;

  let sheet: Spritesheet | null = null;
  let keys: ArkanoidKeys = { left: false, right: false };
  let detachInput: (() => void) | null = null;
  const abort = new AbortController();

  // ── Estado ─────────────────────────────────────────────────────────────────
  const paddle: Paddle = createPaddle();
  const ball: Ball = createBall();
  let blocks: Block[] = [];
  let explosions: Explosion[] = [];
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let gameOver = false;

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;

  // ── Setters que emiten solo en cambios reales ──────────────────────────────
  function setScore(v: number) {
    if (v === score) return;
    score = v;
    callbacks.onScore(score);
  }

  function setLives(v: number) {
    if (v === lives) return;
    lives = v;
    callbacks.onLives(lives);
  }

  function setLevel(v: number) {
    if (v === level) return;
    level = v;
    callbacks.onLevel(level);
  }

  function play(base: HTMLAudioElement) {
    if (muted) return;
    (base.cloneNode() as HTMLAudioElement).play().catch(() => {});
  }

  // ── Lógica ─────────────────────────────────────────────────────────────────
  function loadLevel(n: number) {
    blocks = createBlocks(n);
    explosions = [];
    placeBall(ball, paddle, n);
  }

  function initGame() {
    paddle.x = createPaddle().x;
    gameOver = false;
    // El reinicio fuerza la emisión de los valores iniciales
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    loadLevel(level);
    callbacks.onScore(score);
    callbacks.onLives(lives);
    callbacks.onLevel(level);
  }

  function endGame() {
    gameOver = true;
    callbacks.onGameOver(score);
  }

  function update(dt: number) {
    // Paleta
    if (keys.left) paddle.x = clampPaddleX(paddle.x - PADDLE_SPEED * dt);
    if (keys.right) paddle.x = clampPaddleX(paddle.x + PADDLE_SPEED * dt);

    // Pelota
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rebotes en paredes y techo
    if (ball.x <= 0) {
      ball.x = 0;
      ball.vx = Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.x + ball.w >= W) {
      ball.x = W - ball.w;
      ball.vx = -Math.abs(ball.vx);
      play(bounceSound);
    }
    if (ball.y <= 0) {
      ball.y = 0;
      ball.vy = Math.abs(ball.vy);
      play(bounceSound);
    }

    // Rebote en la paleta (solo bajando, sin ángulo)
    if (
      ball.vy > 0 &&
      ball.x + ball.w > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.y + ball.h >= paddle.y &&
      ball.y + ball.h <= paddle.y + paddle.h + PADDLE_BOUNCE_TOLERANCE
    ) {
      ball.y = paddle.y - ball.h;
      ball.vy = -Math.abs(ball.vy);
      play(bounceSound);
    }

    // Bloques: como máximo uno por frame
    for (const block of blocks) {
      if (!block.alive) continue;
      if (!collideAABB(ball, block)) continue;
      block.alive = false;
      explosions.push(createExplosion(block));
      setScore(score + POINTS_PER_BLOCK);
      ball.vy = -ball.vy;
      play(breakSound);
      if (blocks.every((b) => !b.alive)) {
        if (level < MAX_LEVEL) {
          setLevel(level + 1);
          loadLevel(level);
        } else {
          endGame();
          return;
        }
      }
      break;
    }

    // Explosiones
    for (const e of explosions) e.elapsed += dt * 1000;
    explosions = explosions.filter((e) => e.elapsed < EXPLOSION_DURATION);

    // Pelota perdida
    if (ball.y > H) {
      setLives(lives - 1);
      if (lives <= 0) {
        endGame();
        return;
      }
      placeBall(ball, paddle, level);
    }
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  // Score, nivel, pausa y fin los dibuja React; aquí solo el juego y las pelotas de vida.
  function draw() {
    if (!sheet || !ctx) return;
    drawBackground(ctx);
    drawBlocks(ctx, sheet, blocks);
    drawExplosions(ctx, sheet, explosions);
    drawPaddle(ctx, sheet, paddle);
    drawBall(ctx, sheet, ball);
    drawLives(ctx, sheet, lives);
  }

  // ── Loop ───────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused || gameOver) return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(); // también el último frame, para el fondo del modal
    if (gameOver) return;
    rafId = requestAnimationFrame(loop);
  }

  function startLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    lastTime = null;
    rafId = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function isActive() {
    return !!sheet && !paused && !gameOver && !destroyed;
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (destroyed || detachInput) return; // ya iniciado
      const input = attachInput(canvas, {
        onMouseX: (x) => {
          if (isActive()) paddle.x = clampPaddleX(x - paddle.w / 2);
        },
        onTogglePause: () => {
          if (!destroyed && !gameOver) callbacks.onTogglePause();
        },
      });
      keys = input.keys;
      detachInput = input.detach;

      loadSpritesheet(abort.signal)
        .then((img) => {
          if (destroyed) return;
          sheet = img;
          initGame();
          draw();
          if (!paused) startLoop();
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error(err);
        });
    },

    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
    },

    resume() {
      if (destroyed || !paused) return;
      paused = false;
      if (gameOver || !sheet) return; // sin sprites, el loop arranca al terminar la carga
      startLoop(); // lastTime = null → primer dt = 0, sin saltos
    },

    restart() {
      if (destroyed) return;
      paused = false;
      if (!sheet) return; // la carga en curso inicializa la partida
      stopLoop();
      initGame();
      draw();
      startLoop();
    },

    jumpToLevel(n) {
      if (destroyed || gameOver || !sheet) return;
      const target = Math.min(Math.max(Math.round(n), 1), MAX_LEVEL);
      setLevel(target);
      loadLevel(level);
      draw();
    },

    setMuted(m) {
      muted = m;
    },

    destroy() {
      destroyed = true;
      abort.abort();
      stopLoop();
      detachInput?.();
      detachInput = null;
    },
  };
}
