"use client";

import { useEffect, useRef } from "react";
import { createSnakeGame, type SnakeGame } from "@/lib/games/snake/engine";
import { H, W } from "@/lib/games/snake/constants";
import type { GameCanvasProps } from "@/lib/games/types";

export function SnakeCanvas({
  paused,
  restartKey,
  onScore,
  onGameOver,
  onTogglePause,
  onAutoPause,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SnakeGame | null>(null);

  // Siempre los callbacks más recientes, sin recrear el motor
  const handlers = useRef({ onScore, onGameOver, onTogglePause, onAutoPause });
  useEffect(() => {
    handlers.current = { onScore, onGameOver, onTogglePause, onAutoPause };
  });

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Montaje: crea el motor y lo destruye al desmontar (Strict Mode safe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createSnakeGame(canvas, {
      onScore: (s) => handlers.current.onScore(s),
      onGameOver: (s) => handlers.current.onGameOver(s),
      onTogglePause: () => handlers.current.onTogglePause?.(),
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
      width={W}
      height={H}
      role="img"
      aria-label="Juego Snake"
      className="absolute inset-0 block h-full w-full"
    />
  );
}
