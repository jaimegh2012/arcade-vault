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
export const DEFAULT_VOLUME = 0.7; // 0–1
export const MAX_DT = 0.05; // s, tope para no saltar al volver de otra pestaña

// Pelotas de vida dibujadas en el canvas
export const LIFE_BALL_SIZE = 16;
export const LIFE_BALL_SPACING = 4;
export const LIFE_BALL_MARGIN = 10;
export const LIFE_BALL_Y = 10;

// Tolerancia vertical del rebote en la paleta
export const PADDLE_BOUNCE_TOLERANCE = 8;

export const SPRITESHEET_URL = "/games/arkanoid/spritesheet-breakout.png";
export const BOUNCE_SOUND_URL = "/games/arkanoid/ball-bounce.mp3";
export const BREAK_SOUND_URL = "/games/arkanoid/break-sound.mp3";
