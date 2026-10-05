export const COLS = 10;
export const ROWS = 20;
export const BLOCK = 30;

// Tablero (300) + panel NEXT (120) × alto del tablero (600)
export const BOARD_W = COLS * BLOCK;
export const W = 420;
export const H = ROWS * BLOCK;

export type Shape = number[][];

// Indexados por tipo de pieza 1–7 (I, O, T, S, Z, J, L)
export const COLORS = [
  "",
  "#4dd0e1", // I - cian
  "#ffd54f", // O - amarillo
  "#ba68c8", // T - morado
  "#81c784", // S - verde
  "#e57373", // Z - rojo
  "#90caf9", // J - azul pálido
  "#ffb74d", // L - naranja
] as const;

export const PIECES: readonly Shape[] = [
  [],
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
];

export const PIECE_TYPES = PIECES.length - 1;
export const LINE_SCORES = [0, 100, 300, 500, 800] as const;
export const WALL_KICKS = [0, -1, 1, -2, 2] as const;

export const LINES_PER_LEVEL = 10;
export const MAX_DT = 0.05; // s: tope por frame (volver de otra pestaña)
export const BASE_DROP_MS = 1000;
export const MIN_DROP_MS = 100;
export const DROP_STEP_MS = 90;
export const GHOST_ALPHA = 0.2;

// Estilos de dibujo de bloque seleccionables desde el reproductor
export const BLOCK_STYLES = [
  { id: "bisel", label: "BISEL" },
  { id: "plano", label: "PLANO" },
  { id: "neon", label: "NEÓN" },
  { id: "contorno", label: "CONTORNO" },
] as const;
export type BlockStyle = (typeof BLOCK_STYLES)[number]["id"];
export const DEFAULT_BLOCK_STYLE: BlockStyle = "bisel";
