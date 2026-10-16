"use client";

import { useEffect, useRef } from "react";
import { createFroggerGame, type FroggerGame } from "@/lib/games/frogger/engine";
import { H, W } from "@/lib/games/frogger/constants";
import type { GameCanvasProps } from "@/lib/games/types";

export function FroggerCanvas({
  paused,
  restartKey,
  onScore,
  onLives,
  onLevel,
  onGameOver,
  onTogglePause,
  onAutoPause,
  pad,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<FroggerGame | null>(null);

  // Siempre los callbacks más recientes, sin recrear el motor
  const handlers = useRef({ onScore, onLives, onLevel, onGameOver, onTogglePause, onAutoPause });
  useEffect(() => {
    handlers.current = { onScore, onLives, onLevel, onGameOver, onTogglePause, onAutoPause };
  });

  // El pad es estable por partida: se lee al crear el motor, sin recrearlo
  const padRef = useRef(pad);
  useEffect(() => {
    padRef.current = pad;
  }, [pad]);

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  // Montaje: crea el motor y lo destruye al desmontar (Strict Mode safe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createFroggerGame(
      canvas,
      {
        onScore: (s) => handlers.current.onScore(s),
        onLives: (l) => handlers.current.onLives?.(l),
        onLevel: (l) => handlers.current.onLevel?.(l),
        onGameOver: (s) => handlers.current.onGameOver(s),
        onTogglePause: () => handlers.current.onTogglePause?.(),
      },
      { pad: padRef.current },
    );
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
      aria-label="Juego Frogger"
      className="absolute inset-0 block h-full w-full"
    />
  );
}
