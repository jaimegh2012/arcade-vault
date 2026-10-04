"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AsteroidsCanvas } from "@/components/asteroids-canvas";
import type { Game } from "@/lib/data";
import { useUser } from "@/lib/session";
import { submitScore } from "@/app/juegos/[id]/jugar/actions";

export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();

  const user = useUser();
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [initialsOverride, setInitialsOverride] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [engineLevel, setEngineLevel] = useState(1);
  const [restartKey, setRestartKey] = useState(0);

  const isAsteroids = game.id === "asteroides";
  // Asteroides usa el nivel del motor; los placeholders lo derivan del score
  const level = isAsteroids ? engineLevel : Math.floor(score / 2500) + 1;
  const name = user ? user.name : "INVITADO";
  // Iniciales sugeridas a partir del usuario (A-Z0-9, máx. 3); vacío si no hay.
  const initials =
    initialsOverride ??
    (user
      ? user.name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 3)
      : "");

  useEffect(() => {
    if (isAsteroids || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [isAsteroids, over, paused]);

  const endGame = () => setOver(true);
  const save = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await submitScore({ gameId: game.id, name: initials, score });
      if (res.ok) setSaved(true);
      else setSaveError(res.error);
    } catch {
      setSaveError("Sin conexión. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };
  const restart = () => {
    setScore(0);
    setLives(3);
    setPaused(false);
    setOver(false);
    setInitialsOverride(null);
    setSaved(false);
    setSaving(false);
    setSaveError(null);
    setEngineLevel(1);
    setRestartKey((k) => k + 1);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {isAsteroids ? (
            <AsteroidsCanvas
              paused={paused || over}
              restartKey={restartKey}
              onScore={setScore}
              onLives={setLives}
              onLevel={setEngineLevel}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
              onAutoPause={() => setPaused(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {isAsteroids && (
        <div className="controls-hint">
          <span className="ctl">
            <kbd>←</kbd>
            <kbd>→</kbd>
            rotar
          </span>
          <span className="ctl">
            <kbd>↑</kbd>
            propulsar
          </span>
          <span className="ctl">
            <kbd>ESPACIO</kbd>
            disparar
          </span>
        </div>
      )}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <>
                <div className="input-row">
                  <input
                    value={initials}
                    onChange={(e) =>
                      setInitialsOverride(
                        e.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 3),
                      )
                    }
                    maxLength={3}
                    disabled={saving}
                    placeholder="TUS INICIALES"
                    aria-label="Tus iniciales (1 a 3 caracteres)"
                  />
                  <button className="btn yellow" onClick={save} disabled={saving}>
                    {saving ? "GUARDANDO…" : saveError ? "REINTENTAR" : "GUARDAR PUNTUACIÓN"}
                  </button>
                </div>
                {saveError && (
                  <div
                    role="alert"
                    className="mono"
                    style={{ color: "var(--magenta)", fontSize: 12, marginTop: 10 }}
                  >
                    ▸ {saveError}
                  </div>
                )}
              </>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/biblioteca")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
