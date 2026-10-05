import {
  BLOCK,
  BOARD_W,
  COLORS,
  COLS,
  GHOST_ALPHA,
  H,
  PIECES,
  PIECE_TYPES,
  ROWS,
  WALL_KICKS,
  type Shape,
} from "./constants";

export type Board = number[][];

export type Piece = {
  type: number;
  shape: Shape;
  x: number;
  y: number;
};

// ── Tablero ───────────────────────────────────────────────────────────────────
export const createBoard = (): Board =>
  Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));

export function randomPiece(): Piece {
  const type = Math.floor(Math.random() * PIECE_TYPES) + 1;
  const shape = PIECES[type].map((row) => [...row]);
  return {
    type,
    shape,
    x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  };
}

export function collide(board: Board, shape: Shape, ox: number, oy: number): boolean {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

export function rotateCW(shape: Shape): Shape {
  const rows = shape.length;
  const cols = shape[0].length;
  const result: Shape = Array.from({ length: cols }, () => new Array<number>(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
  return result;
}

// Rota con desplazamientos contra la pared; si todos colisionan, no rota.
export function tryRotate(board: Board, piece: Piece): void {
  const rotated = rotateCW(piece.shape);
  for (const kick of WALL_KICKS) {
    if (!collide(board, rotated, piece.x + kick, piece.y)) {
      piece.shape = rotated;
      piece.x += kick;
      return;
    }
  }
}

export function merge(board: Board, piece: Piece): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c]) board[piece.y + r][piece.x + c] = piece.shape[r][c];
}

// Elimina las filas completas y devuelve cuántas fueron.
export function clearLines(board: Board): number {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every((v) => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array<number>(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  return cleared;
}

export function ghostY(board: Board, piece: Piece): number {
  let gy = piece.y;
  while (!collide(board, piece.shape, piece.x, gy + 1)) gy++;
  return gy;
}

// ── Dibujo ────────────────────────────────────────────────────────────────────
export function drawBlock(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  colorIndex: number,
  size: number,
  alpha = 1,
): void {
  if (!colorIndex) return;
  const px = x * size + 1;
  const py = y * size + 1;
  const s = size - 2;
  const edge = Math.max(2, Math.round(size / 9));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = COLORS[colorIndex];
  ctx.fillRect(px, py, s, s);
  // bisel: luz arriba/izquierda, sombra abajo/derecha
  ctx.fillStyle = "rgba(255,255,255,0.30)";
  ctx.fillRect(px, py, s, edge);
  ctx.fillRect(px, py, edge, s);
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ctx.fillRect(px, py + s - edge, s, edge);
  ctx.fillRect(px + s - edge, py, edge, s);
  ctx.globalAlpha = 1;
}

export function drawGrid(ctx: CanvasRenderingContext2D): void {
  ctx.strokeStyle = "rgba(0,245,255,0.07)";
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

export function drawBoard(ctx: CanvasRenderingContext2D, board: Board): void {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) drawBlock(ctx, c, r, board[r][c], BLOCK);
}

export function drawPiece(ctx: CanvasRenderingContext2D, piece: Piece, y: number, alpha = 1): void {
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      drawBlock(ctx, piece.x + c, y + r, piece.shape[r][c], BLOCK, alpha);
}

export function drawGhost(ctx: CanvasRenderingContext2D, board: Board, piece: Piece): void {
  drawPiece(ctx, piece, ghostY(board, piece), GHOST_ALPHA);
}

// Panel NEXT: a la derecha del tablero, pieza centrada en una caja de 4×4 bloques reducidos.
const NEXT_BLOCK = 22;

export function drawNext(ctx: CanvasRenderingContext2D, next: Piece): void {
  const panelW = ctx.canvas.width - BOARD_W;
  const box = 4 * NEXT_BLOCK;
  const left = BOARD_W + (panelW - box) / 2;
  const top = 56;

  // divisoria neón entre tablero y panel
  ctx.fillStyle = "rgba(0,245,255,0.35)";
  ctx.fillRect(BOARD_W, 0, 1, H);

  ctx.fillStyle = "#00f5ff";
  ctx.font = "bold 12px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("NEXT", BOARD_W + panelW / 2, top - 14);

  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fillRect(left, top, box, box);
  ctx.strokeStyle = "rgba(0,245,255,0.35)";
  ctx.lineWidth = 1;
  ctx.strokeRect(left - 0.5, top - 0.5, box + 1, box + 1);

  const shape = next.shape;
  const offX = (4 - shape[0].length) / 2;
  const offY = (4 - shape.length) / 2;
  ctx.save();
  ctx.translate(left, top);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(ctx, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
  ctx.restore();
}
