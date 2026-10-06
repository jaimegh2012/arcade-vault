import type { ComponentType } from "react";
import { ArkanoidCanvas } from "@/components/arkanoid-canvas";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { SnakeCanvas } from "@/components/snake-canvas";
import { TetrisCanvas } from "@/components/tetris-canvas";
import { BLOCK_STYLES } from "./tetris/constants";
import type { GameCanvasProps } from "./types";

export type GameEntry = {
  Canvas: ComponentType<GameCanvasProps>;
  controls: { keys: string[]; label: string }[]; // para .controls-hint
  engineLevel: boolean; // true: el nivel viene del motor
  hasLives: boolean; // false: el HUD oculta VIDAS
  hasLines?: boolean; // true: el HUD añade LÍNEAS
  blockStyles?: readonly { id: string; label: string }[]; // selector de estilo de bloque
  aspect?: string; // aspect-ratio de .crt-screen; por defecto 4 / 3
  hasSound?: boolean; // true: el reproductor muestra el chip SONIDO
  levelJump?: number; // n: el overlay de pausa muestra chips 1..n
};

// Juegos con motor real. Los ids sin entrada mantienen el placeholder simulado.
export const GAME_REGISTRY: Record<string, GameEntry> = {
  asteroides: {
    Canvas: AsteroidsCanvas,
    controls: [
      { keys: ["←", "→"], label: "rotar" },
      { keys: ["↑"], label: "propulsar" },
      { keys: ["ESPACIO"], label: "disparar" },
    ],
    engineLevel: true,
    hasLives: true,
  },
  tetris: {
    Canvas: TetrisCanvas,
    controls: [
      { keys: ["←", "→"], label: "mover" },
      { keys: ["↑"], label: "rotar" },
      { keys: ["↓"], label: "bajar" },
      { keys: ["ESPACIO"], label: "caída" },
      { keys: ["P"], label: "pausa" },
    ],
    engineLevel: true,
    hasLives: false,
    hasLines: true,
    blockStyles: BLOCK_STYLES,
    aspect: "7 / 10",
  },
  arkanoid: {
    Canvas: ArkanoidCanvas,
    controls: [
      { keys: ["←", "→"], label: "mover" },
      { keys: ["RATÓN"], label: "mover" },
      { keys: ["P"], label: "pausa" },
    ],
    engineLevel: true,
    hasLives: true,
    hasSound: true,
    levelJump: 5,
  },
  snake: {
    Canvas: SnakeCanvas,
    controls: [
      { keys: ["←", "↑", "→", "↓"], label: "mover" },
      { keys: ["WASD"], label: "mover" },
      { keys: ["P"], label: "pausa" },
    ],
    engineLevel: false,
    hasLives: false,
    aspect: "17 / 15",
  },
};
