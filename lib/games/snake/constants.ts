export const COLS = 17;
export const ROWS = 15;
export const CELL = 40; // px
export const W = COLS * CELL; // 680
export const H = ROWS * CELL; // 600

export const STEP_MS = 125; // 8 pasos/s, velocidad constante
export const MAX_DT = 0.05; // s, tope para no saltar al volver de otra pestaña
export const MAX_QUEUED_DIRS = 2;

export const INITIAL_LENGTH = 3;
export const INITIAL_HEAD = { col: 4, row: 7 } as const;
export const INITIAL_FRUIT = { col: 12, row: 7 } as const;

export const POINTS_PER_FRUIT = 10;
export const FRUIT_MARGIN = 2; // px de margen dentro de la celda

export const COLOR_TILE_A = "#0b1410";
export const COLOR_TILE_B = "#0f1c16";
export const COLOR_SNAKE = "#39ff88";
export const COLOR_SNAKE_HEAD = "#a6ffc9";
export const COLOR_SNAKE_GLOW = "rgba(57, 255, 136, 0.75)";
export const COLOR_EYE = "#06130c";

export const FRUITS_URL = "/games/snake/fruits.png";
