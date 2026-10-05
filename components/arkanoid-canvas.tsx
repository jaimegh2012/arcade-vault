"use client";

import { useEffect, useRef } from "react";
import { createArkanoidGame, type ArkanoidGame } from "@/lib/games/arkanoid/engine";
import { H, W } from "@/lib/games/arkanoid/constants";
import type { GameCanvasProps } from "@/lib/games/types";

export function ArkanoidCanvas({
  paused,
  restartKey,
  onScore,
  onLives,
  onLevel,
  onGameOver,
  onTogglePause,
  onAutoPause,
  muted,
  volume,
  jumpTo,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<ArkanoidGame | null>(null);

  // Siempre los callbacks más recientes, sin recrear el motor
  const handlers = useRef({ onScore, onLives, onLevel, onGameOver, onTogglePause, onAutoPause });
  useEffect(() => {
    handlers.current = { onScore, onLives, onLevel, onGameOver, onTogglePause, onAutoPause };
  });

  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const mutedRef = useRef(!!muted);
  useEffect(() => {
    mutedRef.current = !!muted;
    gameRef.current?.setMuted(!!muted);
  }, [muted]);

  const volumeRef = useRef(volume);
  useEffect(() => {
    volumeRef.current = volume;
    if (volume !== undefined) gameRef.current?.setVolume(volume);
  }, [volume]);

  // Montaje: crea el motor y lo destruye al desmontar (Strict Mode safe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const game = createArkanoidGame(canvas, {
      onScore: (s) => handlers.current.onScore(s),
      onLives: (l) => handlers.current.onLives?.(l),
      onLevel: (l) => handlers.current.onLevel?.(l),
      onGameOver: (s) => handlers.current.onGameOver(s),
      onTogglePause: () => handlers.current.onTogglePause?.(),
    });
    gameRef.current = game;
    game.setMuted(mutedRef.current);
    if (volumeRef.current !== undefined) game.setVolume(volumeRef.current);
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

  // Salto de nivel: se ignora el seq inicial
  const lastJumpSeq = useRef(jumpTo?.seq);
  useEffect(() => {
    if (!jumpTo || lastJumpSeq.current === jumpTo.seq) return;
    lastJumpSeq.current = jumpTo.seq;
    gameRef.current?.jumpToLevel(jumpTo.level);
  }, [jumpTo]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      role="img"
      aria-label="Juego Arkanoid"
      className="absolute inset-0 block h-full w-full"
    />
  );
}
