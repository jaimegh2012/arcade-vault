import {
  BASE_DROP_MS,
  DEFAULT_BLOCK_STYLE,
  DROP_STEP_MS,
  H,
  LINES_PER_LEVEL,
  LINE_SCORES,
  MAX_DT,
  MIN_DROP_MS,
  W,
  type BlockStyle,
} from "./constants";
import {
  clearLines,
  collide,
  createBoard,
  drawBoard,
  drawGhost,
  drawGrid,
  drawNext,
  drawPiece,
  ghostY,
  merge,
  randomPiece,
  tryRotate,
  type Board,
  type Piece,
} from "./entities";
import { attachInput, type TetrisAction } from "./input";

export type TetrisCallbacks = {
  onScore: (score: number) => void;
  onLines: (lines: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void;
};

export type TetrisGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  setBlockStyle(style: BlockStyle): void; // redibuja aunque esté en pausa
  destroy(): void; // cancela rAF y quita listeners
};

export function createTetrisGame(
  canvas: HTMLCanvasElement,
  callbacks: TetrisCallbacks,
): TetrisGame {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D no disponible");
  canvas.width = W;
  canvas.height = H;

  let detachInput: (() => void) | null = null;

  // ── Estado ─────────────────────────────────────────────────────────────────
  let board: Board = createBoard();
  let current: Piece = randomPiece();
  let next: Piece = randomPiece();
  let score = 0;
  let lines = 0;
  let level = 1;
  let dropInterval = BASE_DROP_MS;
  let dropAccum = 0;
  let gameOver = false;

  let rafId: number | null = null;
  let lastTime: number | null = null;
  let paused = false;
  let destroyed = false;
  let blockStyle: BlockStyle = DEFAULT_BLOCK_STYLE;

  // ── Setters que emiten solo en cambios reales ──────────────────────────────
  function setScore(v: number) {
    if (v === score) return;
    score = v;
    callbacks.onScore(score);
  }

  function setLines(v: number) {
    if (v === lines) return;
    lines = v;
    callbacks.onLines(lines);
  }

  function setLevel(v: number) {
    if (v === level) return;
    level = v;
    callbacks.onLevel(level);
  }

  // ── Lógica ─────────────────────────────────────────────────────────────────
  function initGame() {
    board = createBoard();
    gameOver = false;
    dropInterval = BASE_DROP_MS;
    dropAccum = 0;
    next = randomPiece();
    // El reinicio fuerza la emisión de los valores iniciales
    score = 0;
    lines = 0;
    level = 1;
    callbacks.onScore(score);
    callbacks.onLines(lines);
    callbacks.onLevel(level);
    spawn();
  }

  function spawn() {
    current = next;
    next = randomPiece();
    if (collide(board, current.shape, current.x, current.y)) endGame();
  }

  function endGame() {
    gameOver = true;
    stopLoop();
    callbacks.onGameOver(score);
  }

  function lockPiece() {
    merge(board, current);
    const cleared = clearLines(board);
    if (cleared) {
      setScore(score + (LINE_SCORES[cleared] ?? 0) * level);
      setLines(lines + cleared);
      setLevel(Math.floor(lines / LINES_PER_LEVEL) + 1);
      dropInterval = Math.max(MIN_DROP_MS, BASE_DROP_MS - (level - 1) * DROP_STEP_MS);
    }
    spawn();
  }

  function hardDrop() {
    const gy = ghostY(board, current);
    setScore(score + (gy - current.y) * 2);
    current.y = gy;
    lockPiece();
  }

  function softDrop() {
    if (!collide(board, current.shape, current.x, current.y + 1)) {
      current.y++;
      setScore(score + 1);
    } else {
      lockPiece();
    }
  }

  function handleAction(action: TetrisAction) {
    if (destroyed) return;
    if (action === "togglePause") {
      if (!gameOver) callbacks.onTogglePause();
      return;
    }
    if (paused || gameOver) return;
    switch (action) {
      case "left":
        if (!collide(board, current.shape, current.x - 1, current.y)) current.x--;
        break;
      case "right":
        if (!collide(board, current.shape, current.x + 1, current.y)) current.x++;
        break;
      case "softDrop":
        softDrop();
        break;
      case "rotate":
        tryRotate(board, current);
        break;
      case "hardDrop":
        hardDrop();
        break;
    }
  }

  function update(dtMs: number) {
    dropAccum += dtMs;
    if (dropAccum < dropInterval) return;
    dropAccum = 0;
    if (!collide(board, current.shape, current.x, current.y + 1)) current.y++;
    else lockPiece();
  }

  // ── Draw ───────────────────────────────────────────────────────────────────
  // El HUD, la pausa y el game over los dibuja React; aquí solo el tablero y NEXT.
  function draw(c: CanvasRenderingContext2D) {
    c.fillStyle = "#05050c";
    c.fillRect(0, 0, W, H);
    drawGrid(c);
    drawBoard(c, board, blockStyle);
    drawGhost(c, board, current, blockStyle);
    drawPiece(c, current, current.y, blockStyle);
    drawNext(c, next, blockStyle);
  }

  // ── Loop ───────────────────────────────────────────────────────────────────
  function loop(ts: number) {
    rafId = null;
    if (destroyed || paused || gameOver) return;
    const dt = lastTime === null ? 0 : Math.min(ts - lastTime, MAX_DT * 1000);
    lastTime = ts;
    update(dt);
    if (gameOver) return; // tras endGame no se dibuja ni se reprograma rAF
    draw(ctx!);
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

  // ── API pública ────────────────────────────────────────────────────────────
  return {
    start() {
      if (destroyed || detachInput) return; // ya iniciado
      detachInput = attachInput(handleAction);
      paused = false;
      initGame();
      draw(ctx);
      if (!gameOver) startLoop();
    },

    pause() {
      if (destroyed || paused) return;
      paused = true;
      stopLoop();
    },

    resume() {
      if (destroyed || !paused) return;
      paused = false;
      if (gameOver) return;
      startLoop(); // lastTime = null → primer dt = 0, sin saltos
    },

    restart() {
      if (destroyed) return;
      paused = false;
      initGame();
      draw(ctx);
      startLoop();
    },

    setBlockStyle(style) {
      if (destroyed || style === blockStyle) return;
      blockStyle = style;
      if (detachInput && !gameOver) draw(ctx);
    },

    destroy() {
      destroyed = true;
      stopLoop();
      detachInput?.();
      detachInput = null;
    },
  };
}
