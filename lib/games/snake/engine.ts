import { H, MAX_DT, POINTS_PER_FRUIT, STEP_MS, W, INITIAL_FRUIT } from "./constants";
import {
  createSnake,
  drawBoard,
  drawSnake,
  hitsBody,
  isOutOfBounds,
  nextHead,
  randomFruitName,
  spawnFruit,
  isOpposite,
  type Cell,
  type Dir,
  type Fruit,
} from "./entities";
import { attachInput, createDirQueue } from "./input";
import { drawFruit, loadFruitSheet, type Spritesheet } from "./sprites";

export type SnakeCallbacks = {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void; // choque y victoria
  onTogglePause: () => void;
};

export type SnakeGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF, quita listeners, aborta carga de sprites
};

type Phase = "waiting" | "playing" | "over";

export function createSnakeGame(canvas: HTMLCanvasElement, callbacks: SnakeCallbacks): SnakeGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  let sheet: Spritesheet | null = null; // null tras fallo → fruta de círculo
  let ready = false; // carga terminada (con o sin imagen)
  let detachInput: (() => void) | null = null;
  const abort = new AbortController();
  const queue = createDirQueue();

  // ── Estado ─────────────────────────────────────────────────────────────────
  let snake: Cell[] = createSnake();
  let fruit: Fruit | null = null;
  let dir: Dir = "right";
  let score = 0;
  let phase: Phase = "waiting";
  let accumulator = 0; // ms

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;

  function setScore(v: number) {
    if (v === score) return;
    score = v;
    callbacks.onScore(score);
  }

  function initGame() {
    snake = createSnake();
    fruit = { ...INITIAL_FRUIT, name: randomFruitName() };
    dir = "right";
    phase = "waiting";
    accumulator = 0;
    queue.clear();
    // El reinicio fuerza la emisión del valor inicial
    score = 0;
    callbacks.onScore(score);
  }

  // Función aparte: TS no ve que update() cambia `phase` y estrecha el tipo.
  function isOver() {
    return phase === "over";
  }

  function endGame() {
    phase = "over";
    callbacks.onGameOver(score);
  }

  function step() {
    const d = queue.take(dir);
    if (d) dir = d;

    const head = nextHead(snake[0], dir);
    const grows = !!fruit && head.col === fruit.col && head.row === fruit.row;
    if (isOutOfBounds(head) || hitsBody(snake, head, grows)) {
      endGame();
      return;
    }

    snake.unshift(head);
    if (!grows) {
      snake.pop();
      return;
    }
    setScore(score + POINTS_PER_FRUIT);
    fruit = spawnFruit(snake);
    if (!fruit) endGame(); // tablero lleno: victoria
  }

  function update(dt: number) {
    if (phase !== "playing") return;
    accumulator += dt * 1000;
    while (accumulator >= STEP_MS && phase === "playing") {
      accumulator -= STEP_MS;
      step();
    }
  }

  // Score, pausa y fin los dibuja React; aquí solo tablero, serpiente y fruta.
  function draw() {
    if (!ctx) return;
    drawBoard(ctx);
    if (fruit) drawFruit(ctx, sheet, fruit.name, fruit.col, fruit.row);
    drawSnake(ctx, snake, dir);
  }

  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused || phase === "over") return;
    const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, MAX_DT);
    lastTime = ts;
    update(dt);
    draw(); // también el último frame, para el fondo del modal
    if (isOver()) return;
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

  function onDirection(d: Dir) {
    if (destroyed || !ready || paused || phase === "over") return;
    if (phase === "waiting") {
      if (isOpposite(d, dir)) return; // hacia el cuerpo: no arranca
      phase = "playing";
      accumulator = 0;
    }
    queue.push(d, dir);
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (destroyed || detachInput) return; // ya iniciado
      detachInput = attachInput({
        onDirection,
        onTogglePause: () => {
          if (!destroyed && phase !== "over") callbacks.onTogglePause();
        },
      });

      loadFruitSheet(abort.signal)
        .then((img) => {
          sheet = img;
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          console.error(err); // la partida sigue con fruta de círculo
        })
        .then(() => {
          if (destroyed || abort.signal.aborted) return;
          ready = true;
          initGame();
          draw();
          if (!paused) startLoop();
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
      if (phase === "over" || !ready) return; // sin carga, el loop arranca al terminar
      startLoop(); // lastTime = null → primer dt = 0, sin pasos extra
    },

    restart() {
      if (destroyed) return;
      paused = false;
      if (!ready) return; // la carga en curso inicializa la partida
      stopLoop();
      initGame();
      draw();
      startLoop();
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
