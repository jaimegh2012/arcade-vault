"use client";

import { useEffect, useRef } from "react";
import {
  createAsteroidsGame,
  type AsteroidsCallbacks,
  type AsteroidsGame,
} from "@/lib/games/asteroids/engine";

type Props = AsteroidsCallbacks & {
  paused: boolean;
  // Al cambiar su valor se reinicia la partida
  restartKey: number;
  // El motor se pausó solo (pestaña oculta); la página debe reflejarlo
  onAutoPause?: () => void;
};

export function AsteroidsCanvas({
  paused,
  restartKey,
  onScore,
  onLives,
  onLevel,
  onGameOver,
  onAutoPause,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<AsteroidsGame | null>(null);

  // Siempre los callbacks más recientes, sin recrear el motor
  const handlers = useRef({ onScore, onLives, onLevel, onGameOver, onAutoPause });
  useEffect(() => {
    handlers.current = { onScore, onLives, onLevel, onGameOver, onAutoPause };
  });

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Montaje: crea el motor y lo destruye al desmontar (Strict Mode safe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createAsteroidsGame(canvas, {
      onScore: (s) => handlers.current.onScore(s),
      onLives: (l) => handlers.current.onLives(l),
      onLevel: (l) => handlers.current.onLevel(l),
      onGameOver: (s) => handlers.current.onGameOver(s),
    });
    gameRef.current = game;
    game.start();
    if (pausedRef.current) game.pause();

    const onVisibility = () => {
      if (document.hidden && !pausedRef.current) {
        game.pause();
        handlers.current.onAutoPause?.();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      game.destroy();
      gameRef.current = null;
    };
  }, []);

  // Pausa / reanudar controlados por la página
  useEffect(() => {
    if (paused) gameRef.current?.pause();
    else gameRef.current?.resume();
  }, [paused]);

  // Reinicio: se ignora el valor inicial (el motor ya arranca en el montaje)
  const lastRestartKey = useRef(restartKey);
  useEffect(() => {
    if (lastRestartKey.current === restartKey) return;
    lastRestartKey.current = restartKey;
    gameRef.current?.restart();
  }, [restartKey]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      role="img"
      aria-label="Juego Asteroides"
      className="absolute inset-0 block h-full w-full"
    />
  );
}
