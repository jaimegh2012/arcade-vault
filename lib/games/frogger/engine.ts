import {
  COLS,
  GOAL_COUNT,
  H,
  INITIAL_LIVES,
  JUMP_MS,
  MAX_DT,
  POINTS_PER_GOAL,
  POINTS_PER_ROW,
  POINTS_PER_TIME_SECOND,
  ROUND_TIME_MIN_S,
  ROUND_TIME_S,
  ROUND_TIME_STEP_S,
  ROW_GOALS,
  ROW_START,
  ROWS,
  START_COL,
  W,
} from "./constants";
import {
  buildLanes,
  checkRoadCollision,
  createFrog,
  DIR_VECTORS,
  drawBoard,
  drawFrogAt,
  drawGoals,
  drawLane,
  drawTimeBar,
  getSupport,
  goalIndexAt,
  isRiverRow,
  isRoadRow,
  updateLanes,
  type Dir,
  type Frog,
  type Lane,
} from "./entities";
import type { VirtualPad } from "../touch";
import { attachInput } from "./input";

export type FroggerCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void;
};

export type FroggerOptions = { pad?: VirtualPad };

export type FroggerGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF y quita listeners
};

type Phase = "waiting" | "playing" | "over";

/** Tiempo de ronda del nivel dado: baja ROUND_TIME_STEP_S por nivel hasta el suelo. */
function roundTime(level: number): number {
  return Math.max(ROUND_TIME_MIN_S, ROUND_TIME_S - (level - 1) * ROUND_TIME_STEP_S);
}

export function createFroggerGame(
  canvas: HTMLCanvasElement,
  callbacks: FroggerCallbacks,
  options: FroggerOptions = {},
): FroggerGame {
  const { pad } = options;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  let detachInput: (() => void) | null = null;

  // ── Estado ─────────────────────────────────────────────────────────────────
  let lanes: Lane[] = buildLanes(1);
  let frog: Frog = createFrog(START_COL, ROW_START);
  let goals: boolean[] = Array.from({ length: GOAL_COUNT }, () => false);
  let pendingDir: Dir | null = null;
  let score = 0;
  let lives = INITIAL_LIVES;
  let level = 1;
  let timeLeft = roundTime(1); // s
  let phase: Phase = "waiting";
  let bestRow = ROW_START; // fila más alta alcanzada en la ronda (puntos por avance)

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  let started = false;

  function initGame() {
    lanes = buildLanes(1);
    frog = createFrog(START_COL, ROW_START);
    goals = Array.from({ length: GOAL_COUNT }, () => false);
    pendingDir = null;
    score = 0;
    lives = INITIAL_LIVES;
    level = 1;
    timeLeft = roundTime(1);
    phase = "waiting";
    bestRow = ROW_START;
    // El reinicio fuerza la emisión de los valores iniciales
    callbacks.onScore(score);
    callbacks.onLives(lives);
    callbacks.onLevel(level);
  }

  // Función aparte: TS no ve que update() cambia `phase` y estrecha el tipo.
  function isOver() {
    return phase === "over";
  }

  function setScore(v: number) {
    if (v === score) return;
    score = v;
    callbacks.onScore(score);
  }

  /** Rana de vuelta a la salida con el temporizador completo. */
  function respawn() {
    frog = createFrog(START_COL, ROW_START);
    pendingDir = null;
    bestRow = ROW_START;
    timeLeft = roundTime(level);
  }

  // Resuelve la celda donde acaba de aterrizar la rana.
  function landFrog() {
    if (frog.row < bestRow) {
      setScore(score + (bestRow - frog.row) * POINTS_PER_ROW);
      bestRow = frog.row;
    }
    if (frog.row === ROW_GOALS) {
      const i = goalIndexAt(frog);
      if (i < 0 || goals[i]) {
        killFrog(); // muro entre bocas o boca ya ocupada
        return;
      }
      goals[i] = true;
      setScore(score + POINTS_PER_GOAL + Math.floor(timeLeft) * POINTS_PER_TIME_SECOND);
      if (goals.every(Boolean)) completeRound();
      else respawn();
    }
  }

  // Muertes por contacto, evaluadas cada frame con la rana quieta.
  function checkHazards() {
    if (frog.animating || frog.row === ROW_GOALS) return;
    if (isRoadRow(frog.row) && checkRoadCollision(frog, lanes)) killFrog();
    else if (isRiverRow(frog.row)) {
      // Sin apoyo (agua o tortuga sumergida) o arrastrada fuera por los bordes
      if (!getSupport(frog, lanes) || frog.col < -0.5 || frog.col > COLS - 0.5) killFrog();
    }
  }

  // Los pasos 6 y 7 del plan rellenan estos dos puntos de entrada.
  function completeRound() {
    // Siguiente ronda: nivel, carriles, bocas y temporizador
  }

  function killFrog() {
    // Restar vida, reiniciar posición/temporizador o terminar la partida
  }

  function startJump(dir: Dir) {
    const v = DIR_VECTORS[dir];
    const fromCol = Math.round(frog.col); // al saltar desde un tronco, se ajusta a la rejilla
    const targetCol = fromCol + v.col;
    const targetRow = frog.row + v.row;
    frog.facing = dir;
    // No se puede salir por los bordes laterales ni por arriba/abajo del mapa
    if (targetCol < 0 || targetCol >= COLS || targetRow < 0 || targetRow >= ROWS) return;
    frog.fromCol = frog.col;
    frog.fromRow = frog.row;
    frog.targetCol = targetCol;
    frog.targetRow = targetRow;
    frog.animating = true;
    frog.animT = 0;
  }

  function updateFrog(dt: number) {
    if (!frog.animating && pendingDir) {
      const dir = pendingDir;
      pendingDir = null;
      startJump(dir);
    }

    if (frog.animating) {
      frog.animT += dt * 1000;
      if (frog.animT >= JUMP_MS) {
        frog.col = frog.targetCol;
        frog.row = frog.targetRow;
        frog.animating = false;
        frog.animT = 0;
        landFrog();
      }
      return;
    }

    // En el río, la rana viaja con lo que la sostiene
    if (isRiverRow(frog.row)) {
      const support = getSupport(frog, lanes);
      if (support) frog.col += support.lane.speed * support.lane.dir * dt;
    }
  }

  function update(dt: number) {
    updateLanes(lanes, dt);
    updateFrog(dt);
    checkHazards();
    if (phase !== "playing") return;
    timeLeft = Math.max(0, timeLeft - dt);
    if (timeLeft === 0) killFrog();
  }

  // Score, vidas, nivel, pausa y fin los dibuja React; aquí solo mapa, entidades, rana y tiempo.
  function draw() {
    if (!ctx) return;
    drawBoard(ctx);
    for (const lane of lanes) drawLane(ctx, lane);
    drawGoals(ctx, goals);
    drawFrogAt(ctx, frog);
    drawTimeBar(ctx, timeLeft / roundTime(level));
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
    if (destroyed || !started || paused || phase === "over") return;
    if (phase === "waiting") phase = "playing"; // el tiempo corre desde el primer salto
    pendingDir = d;
  }

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (destroyed || detachInput) return; // ya iniciado
      detachInput = attachInput(
        {
          onDirection,
          onTogglePause: () => {
            if (!destroyed && phase !== "over") callbacks.onTogglePause();
          },
        },
        pad,
      );
      started = true;
      initGame();
      draw();
      if (!paused) startLoop();
    },

    pause() {
      if (destroyed || paused) return;
      paused = true;
      pad?.releaseAll();
      stopLoop();
    },

    resume() {
      if (destroyed || !paused) return;
      paused = false;
      if (phase === "over" || !started) return;
      startLoop(); // lastTime = null → primer dt = 0, sin saltos de tiempo
    },

    restart() {
      if (destroyed) return;
      paused = false;
      pad?.releaseAll();
      if (!started) return;
      stopLoop();
      initGame();
      draw();
      startLoop();
    },

    destroy() {
      destroyed = true;
      pad?.releaseAll();
      stopLoop();
      detachInput?.();
      detachInput = null;
    },
  };
}
