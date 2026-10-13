import type { BlockColor } from "./sprites";

export const W = 800;
export const H = 600;

export const PADDLE_SPEED = 400; // px/s
export const PADDLE_W = 81;
export const PADDLE_H = 14;
export const PADDLE_Y = 560;

export const BALL_SIZE = 16;
export const BASE_BALL_VX = 200;
export const BASE_BALL_VY = -300;

export const BLOCK_COLS = 10;
export const BLOCK_ROWS = 6;
export const BLOCK_W = 64;
export const BLOCK_H = 24;
export const BLOCKS_ORIGIN_X = (W - BLOCK_COLS * BLOCK_W) / 2;
export const BLOCKS_ORIGIN_Y = 80;

export const POINTS_PER_BLOCK = 10;
export const INITIAL_LIVES = 3;
export const MAX_LEVEL = 5;
export const DEFAULT_VOLUME = 0.15; // 0–1
export const MAX_DT = 0.05; // s, tope para no saltar al volver de otra pestaña

// Pelotas de vida dibujadas en el canvas
export const LIFE_BALL_SIZE = 16;
export const LIFE_BALL_SPACING = 4;
export const LIFE_BALL_MARGIN = 10;
export const LIFE_BALL_Y = 10;

// Tolerancia vertical del rebote en la paleta
export const PADDLE_BOUNCE_TOLERANCE = 8;

// Skins de dibujo (mismos ids que tetris): `bisel` usa los sprites; el resto, primitivas de color
export { BLOCK_STYLES, DEFAULT_BLOCK_STYLE, type BlockStyle } from "@/lib/games/tetris/constants";
// Color aproximado de cada ladrillo del spritesheet (la clave es el id de color de levels.ts)
export const BLOCK_SKIN_COLORS: Record<BlockColor, string> = {
  red: "#d23c46",
  cyan: "#3cc8a0",
  green: "#3c8cf0",
  magenta: "#8c46dc",
  yellow: "#e6b43c",
  hotpink: "#f07828",
  gray: "#8c8c9a",
};
export const PADDLE_SKIN_COLOR = "#d8dce6";
export const SKIN_NEON_BLUR = 10;
export const SKIN_CONTOUR_FILL = "rgba(255,255,255,0.04)";

export const SPRITESHEET_URL = "/games/arkanoid/spritesheet-breakout.png";
export const BOUNCE_SOUND_URL = "/games/arkanoid/ball-bounce.mp3";
export const BREAK_SOUND_URL = "/games/arkanoid/break-sound.mp3";
