export const W = 800;
export const H = 600;

// Indexados por tamaño de asteroide: 1 (pequeño), 2 (mediano), 3 (grande)
export const RADII = [0, 16, 30, 50] as const;
export const SPEEDS = [0, 85, 55, 32] as const;
export const POINTS = [0, 100, 50, 20] as const;

export const POWERUP_DROP_CHANCE = 0.15;
export const POWERUP_DURATION = 5;
export const POWERUP_TTL = 12;
export const TRIPLE_SPREAD = 0.18;

// Skins de dibujo (mismos ids que tetris); se aplican a la nave y los asteroides
export { BLOCK_STYLES, DEFAULT_BLOCK_STYLE, type BlockStyle } from "@/lib/games/tetris/constants";
export const SHIP_COLOR = "#fff";
export const ASTEROID_COLOR = "#fff";
export const SHIP_FLAT_FILL = "#fff"; // skin plano: relleno de la nave
export const ASTEROID_FLAT_FILL = "#8a8f98"; // skin plano: relleno gris roca
export const SKIN_NEON_BLUR = 10;
export const SKIN_CONTOUR_FILL = "rgba(255,255,255,0.04)";
