import { FRUITS_URL, FRUIT_MARGIN, CELL } from "./constants";

export type SpriteRect = { x: number; y: number; w: number; h: number };

/** Atlas de frutas de `fruits.png` (3790×442, fondo transparente). */
export const SPRITE_ATLAS = {
  source: FRUITS_URL,
  fruits: {
    banana: { x: 34, y: 136, w: 110, h: 160 },
    orange: { x: 186, y: 136, w: 150, h: 160 },
    grape: { x: 378, y: 136, w: 110, h: 160 },
    garlic: { x: 540, y: 136, w: 130, h: 160 },
    eggplant: { x: 712, y: 136, w: 130, h: 160 },
    strawberry: { x: 894, y: 136, w: 110, h: 160 },
    cherry: { x: 1066, y: 136, w: 110, h: 160 },
    carrot: { x: 1228, y: 136, w: 130, h: 160 },
    mushroom: { x: 1400, y: 136, w: 130, h: 160 },
    broccoli: { x: 1582, y: 136, w: 110, h: 160 },
    watermelon: { x: 1734, y: 136, w: 150, h: 160 },
    pepper: { x: 1906, y: 136, w: 150, h: 160 },
    kiwi: { x: 2068, y: 136, w: 170, h: 160 },
    lemon: { x: 2250, y: 136, w: 140, h: 160 },
    peach: { x: 2432, y: 136, w: 130, h: 160 },
    peanut: { x: 2604, y: 136, w: 130, h: 160 },
    apple: { x: 2786, y: 136, w: 110, h: 160 },
    tomato: { x: 2948, y: 136, w: 130, h: 160 },
    berries: { x: 3110, y: 136, w: 150, h: 160 },
    grapes2: { x: 3302, y: 136, w: 110, h: 160 },
    pineapple: { x: 3454, y: 136, w: 150, h: 160 },
    melon: { x: 3637, y: 136, w: 130, h: 160 },
  },
} as const satisfies { source: string; fruits: Record<string, SpriteRect> };

export type FruitName = keyof typeof SPRITE_ATLAS.fruits;

export const FRUIT_NAMES = Object.keys(SPRITE_ATLAS.fruits) as FruitName[];

export type Spritesheet = HTMLImageElement;

/** Carga el PNG de frutas; rechaza con AbortError si `signal` se aborta antes. */
export function loadFruitSheet(signal: AbortSignal): Promise<Spritesheet> {
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
      reject(new Error("No se pudo cargar las frutas de Snake"));
    };
    img.src = SPRITE_ATLAS.source;
  });
}

const FALLBACK_COLORS = ["#ff4d6d", "#ffb703", "#ff8c42", "#b5179e", "#9ef01a", "#ffd60a"];

/**
 * Dibuja la fruta en la celda (col,row), escalada sin deformar con margen y
 * centrada. Sin `sheet` (falló la carga) usa un círculo de color.
 */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  sheet: Spritesheet | null,
  name: FruitName,
  col: number,
  row: number,
) {
  const x0 = col * CELL;
  const y0 = row * CELL;
  const box = CELL - FRUIT_MARGIN * 2;

  if (!sheet) {
    const idx = FRUIT_NAMES.indexOf(name);
    ctx.save();
    ctx.fillStyle = FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
    ctx.beginPath();
    ctx.arc(x0 + CELL / 2, y0 + CELL / 2, box / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  const r: SpriteRect = SPRITE_ATLAS.fruits[name];
  const scale = Math.min(box / r.w, box / r.h);
  const dw = r.w * scale;
  const dh = r.h * scale;
  ctx.drawImage(
    sheet,
    r.x,
    r.y,
    r.w,
    r.h,
    x0 + (CELL - dw) / 2,
    y0 + (CELL - dh) / 2,
    dw,
    dh,
  );
}
