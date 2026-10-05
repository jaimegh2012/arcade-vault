import { SPRITESHEET_URL } from "./constants";

export type Frame = { sx: number; sy: number; sw: number; sh: number };

export type BlockColor = "gray" | "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green";

export const EXPLOSION_DURATION = 150; // ms
export const EXPLOSION_FRAME_COUNT = 4;

// Fila de explosión por color; 4 frames de 32×16 desde x = 256. El gris reutiliza los rojos.
const EXPLOSION_ROW_Y: Record<BlockColor, number> = {
  red: 176,
  cyan: 192,
  green: 208,
  magenta: 224,
  yellow: 240,
  hotpink: 256,
  gray: 176,
};

export const EXPLOSION_FRAMES: Record<BlockColor, Frame[]> = Object.fromEntries(
  (Object.keys(EXPLOSION_ROW_Y) as BlockColor[]).map((color) => [
    color,
    Array.from({ length: EXPLOSION_FRAME_COUNT }, (_, i) => ({
      sx: 256 + i * 32,
      sy: EXPLOSION_ROW_Y[color],
      sw: 32,
      sh: 16,
    })),
  ]),
) as Record<BlockColor, Frame[]>;

export const SPRITES = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
} as const satisfies { paddle: Frame; ball: Frame; blocks: Record<BlockColor, Frame> };

export type Spritesheet = HTMLImageElement;

/** Carga el spritesheet; rechaza con AbortError si `signal` se aborta antes. */
export function loadSpritesheet(signal: AbortSignal): Promise<Spritesheet> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const img = new Image();
    const onAbort = () => {
      img.onload = null;
      img.onerror = null;
      img.src = "";
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    img.onload = () => {
      signal.removeEventListener("abort", onAbort);
      resolve(img);
    };
    img.onerror = () => {
      signal.removeEventListener("abort", onAbort);
      reject(new Error("No se pudo cargar el spritesheet de Arkanoid"));
    };
    img.src = SPRITESHEET_URL;
  });
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet,
  frame: Frame,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.drawImage(sheet, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
}

export function drawBlockSprite(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet,
  color: BlockColor,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  drawFrame(ctx, sheet, SPRITES.blocks[color], x, y, w, h);
}

export function drawPaddleSprite(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  drawFrame(ctx, sheet, SPRITES.paddle, x, y, w, h);
}

export function drawBallSprite(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  drawFrame(ctx, sheet, SPRITES.ball, x, y, w, h);
}
