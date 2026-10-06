import {
  CELL,
  COLS,
  COLOR_EYE,
  COLOR_SNAKE,
  COLOR_SNAKE_GLOW,
  COLOR_SNAKE_HEAD,
  COLOR_TILE_A,
  COLOR_TILE_B,
  H,
  INITIAL_HEAD,
  INITIAL_LENGTH,
  ROWS,
  W,
} from "./constants";
import { FRUIT_NAMES, type FruitName } from "./sprites";

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };

export const DIR_VECTORS: Record<Dir, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const OPPOSITE: Record<Dir, Dir> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function isOpposite(a: Dir, b: Dir): boolean {
  return OPPOSITE[a] === b;
}

export type Fruit = Cell & { name: FruitName };

/** Serpiente como arreglo de celdas: índice 0 = cabeza, último = cola. */
export function createSnake(): Cell[] {
  return Array.from({ length: INITIAL_LENGTH }, (_, i) => ({
    col: INITIAL_HEAD.col - i,
    row: INITIAL_HEAD.row,
  }));
}

export function nextHead(head: Cell, dir: Dir): Cell {
  const v = DIR_VECTORS[dir];
  return { col: head.col + v.col, row: head.row + v.row };
}

export function isOutOfBounds(c: Cell): boolean {
  return c.col < 0 || c.col >= COLS || c.row < 0 || c.row >= ROWS;
}

/**
 * ¿La nueva cabeza entra en el cuerpo? La cola se considera libre si la
 * serpiente no come en este paso (se retira); si come, la cola se queda.
 */
export function hitsBody(snake: Cell[], head: Cell, grows: boolean): boolean {
  const last = grows ? snake.length : snake.length - 1;
  for (let i = 0; i < last; i++) {
    if (snake[i].col === head.col && snake[i].row === head.row) return true;
  }
  return false;
}

export function randomFruitName(): FruitName {
  return FRUIT_NAMES[Math.floor(Math.random() * FRUIT_NAMES.length)];
}

/**
 * Fruta en una celda libre elegida al azar de la lista de celdas libres.
 * Devuelve null si no queda ninguna (victoria).
 */
export function spawnFruit(snake: Cell[]): Fruit | null {
  const occupied = new Set(snake.map((c) => c.row * COLS + c.col));
  const free: number[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    if (!occupied.has(i)) free.push(i);
  }
  if (free.length === 0) return null;
  const idx = free[Math.floor(Math.random() * free.length)];
  return { col: idx % COLS, row: Math.floor(idx / COLS), name: randomFruitName() };
}

export function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? COLOR_TILE_A : COLOR_TILE_B;
      ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
    }
  }
}

const SEG_INSET = 3;
const SEG_RADIUS = 9;

function drawEyes(ctx: CanvasRenderingContext2D, head: Cell, dir: Dir) {
  const cx = head.col * CELL + CELL / 2;
  const cy = head.row * CELL + CELL / 2;
  const v = DIR_VECTORS[dir];
  // Vector perpendicular para separar los ojos; avance hacia donde mira.
  const px = -v.row;
  const py = v.col;
  ctx.fillStyle = COLOR_EYE;
  for (const side of [-1, 1]) {
    const ex = cx + v.col * 7 + px * side * 8;
    const ey = cy + v.row * 7 + py * side * 8;
    ctx.beginPath();
    ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawSnake(ctx: CanvasRenderingContext2D, snake: Cell[], dir: Dir) {
  ctx.save();
  ctx.shadowColor = COLOR_SNAKE_GLOW;
  ctx.shadowBlur = 12;
  // De cola a cabeza: la cabeza queda encima.
  for (let i = snake.length - 1; i >= 0; i--) {
    const s = snake[i];
    ctx.fillStyle = i === 0 ? COLOR_SNAKE_HEAD : COLOR_SNAKE;
    const inset = i === 0 ? SEG_INSET - 1 : SEG_INSET;
    ctx.beginPath();
    ctx.roundRect(
      s.col * CELL + inset,
      s.row * CELL + inset,
      CELL - inset * 2,
      CELL - inset * 2,
      SEG_RADIUS,
    );
    ctx.fill();
  }
  ctx.restore();
  drawEyes(ctx, snake[0], dir);
}
