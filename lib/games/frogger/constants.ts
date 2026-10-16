export const COLS = 16;
export const ROWS = 14;
export const CELL = 40; // px
export const W = COLS * CELL; // 640
export const H = ROWS * CELL; // 560

// Zonas (índice de fila, 0 = arriba)
export const ROW_GOALS = 0;
export const ROW_RIVER_TOP = 1;
export const ROW_RIVER_BOT = 6;
export const ROW_SAFE_MID = 7;
export const ROW_ROAD_TOP = 8;
export const ROW_ROAD_BOT = 12;
export const ROW_START = 13;
export const START_COL = COLS / 2 - 1; // columna central de salida

// Bocas destino: 5 de 2 columnas cada una, repartidas en la fila superior
export const GOAL_COUNT = 5;
export const GOAL_WIDTH = 2; // columnas por boca
export const GOAL_COLS = [1, 4, 7, 10, 13] as const; // columna izquierda de cada boca

export const MAX_DT = 0.05; // s, tope para no saltar al volver de otra pestaña
export const JUMP_MS = 120; // duración de la animación de salto

export const INITIAL_LIVES = 3;
export const ROUND_TIME_S = 15; // temporizador del nivel 1
export const ROUND_TIME_MIN_S = 8; // suelo del temporizador en niveles altos
export const ROUND_TIME_STEP_S = 1; // segundos que se restan por nivel
export const SPEED_PER_LEVEL = 1.15; // +15 % de velocidad por nivel

// Tortugas: ciclo de inmersión por grupo
export const TURTLE_VISIBLE_S = 3;
export const TURTLE_SUBMERGED_S = 1.5;

// Puntuación
export const POINTS_PER_ROW = 10; // por fila avanzada por primera vez en la ronda
export const POINTS_PER_GOAL = 50;
export const POINTS_PER_ROUND = 200;
export const POINTS_PER_TIME_SECOND = 10; // bonus = segundos restantes × 10

// Colores por zona
export const COLOR_ROAD = "#0b0b12";
export const COLOR_ROAD_LINE = "rgba(255, 255, 255, 0.18)";
export const COLOR_RIVER = "#0a2a5a";
export const COLOR_SAFE = "#0c3a1c";
export const COLOR_GOAL_ZONE = "#0f5a2a";
export const COLOR_GOAL_SLOT = "#06220f";
export const COLOR_GOAL_BORDER = "#f5c542";

// Entidades
export const COLOR_CARS = ["#ff3860", "#ffd400", "#2aa7ff"] as const;
export const COLOR_TRUCK = "#8a8fa3";
export const COLOR_TRUCK_CAB = "#c9cee0";
export const COLOR_WHEEL = "#06060a";
export const COLOR_LOG = "#8b5a2b";
export const COLOR_LOG_GRAIN = "#5e3b17";
export const COLOR_TURTLE = "#27c46b";
export const COLOR_TURTLE_SCALE = "#17803f";
export const COLOR_TURTLE_SUBMERGED = "rgba(39, 196, 107, 0.25)";

// Rana
export const COLOR_FROG = "#39ff88";
export const COLOR_FROG_EYE = "#ffffff";
export const COLOR_FROG_PUPIL = "#06130c";
export const FROG_BODY_W = 28; // px
export const FROG_BODY_H = 24; // px

// HUD interno del canvas
export const COLOR_HUD_TEXT = "#ffffff";
export const COLOR_TIME_OK = "#39ff88";
export const COLOR_TIME_WARN = "#ffd400";
export const COLOR_TIME_LOW = "#ff3860";
