import type { ComponentType } from "react";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import { TetrisCanvas } from "@/components/tetris-canvas";
import type { GameCanvasProps } from "./types";

export type GameEntry = {
  Canvas: ComponentType<GameCanvasProps>;
  controls: { keys: string[]; label: string }[]; // para .controls-hint
  engineLevel: boolean; // true: el nivel viene del motor
  hasLives: boolean; // false: el HUD oculta VIDAS
  hasLines?: boolean; // true: el HUD añade LÍNEAS
  aspect?: string; // aspect-ratio de .crt-screen; por defecto 4 / 3
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
    aspect: "7 / 10",
  },
};
