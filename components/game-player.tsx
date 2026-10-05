"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { GAME_REGISTRY } from "@/lib/games/registry";
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
  const [lines, setLines] = useState(0);
  const [engineLevel, setEngineLevel] = useState(1);
  const [restartKey, setRestartKey] = useState(0);
  // Preferencia de estilo de bloques en localStorage (snapshot de servidor: "bisel")
  const styleKey = `av_block_style_${game.id}`;
  const blockStyle = useSyncExternalStore(
    (cb) => {
      window.addEventListener("av-block-style", cb);
      return () => window.removeEventListener("av-block-style", cb);
    },
    () => {
      try {
        return localStorage.getItem(styleKey) ?? "bisel";
      } catch {
        return "bisel";
      }
    },
    () => "bisel",
  );
  const pickBlockStyle = (id: string) => {
    try {
      localStorage.setItem(styleKey, id);
    } catch {}
    window.dispatchEvent(new Event("av-block-style"));
  };

  // Preferencia de sonido en localStorage (snapshot de servidor: sonido activado)
  const muted = useSyncExternalStore(
    (cb) => {
      window.addEventListener("av-muted", cb);
      return () => window.removeEventListener("av-muted", cb);
    },
    () => {
      try {
        return localStorage.getItem("av_muted") === "1";
      } catch {
        return false;
      }
    },
    () => false,
  );
  const toggleMuted = () => {
    try {
      localStorage.setItem("av_muted", muted ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event("av-muted"));
  };

  // Los juegos con motor están en el registro; el resto mantiene el placeholder simulado
  const entry = GAME_REGISTRY[game.id];
  const level = entry?.engineLevel ? engineLevel : Math.floor(score / 2500) + 1;
  const showLives = entry ? entry.hasLives : true;
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
    if (entry || over || paused) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [entry, over, paused]);

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
    setLines(0);
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
          {entry?.hasLines && (
            <div className="hud-stat">
              <div className="l">Líneas</div>
              <div className="v">{lines.toLocaleString("es-ES")}</div>
            </div>
          )}
          {showLives && (
            <div className="hud-stat lives">
              <div className="l">Vidas</div>
              <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
            </div>
          )}
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

      <div className={entry?.aspect ? "crt crt-tall" : "crt"}>
        <div
          className="crt-screen"
          style={entry?.aspect ? { aspectRatio: entry.aspect } : undefined}
        >
          {entry ? (
            <entry.Canvas
              paused={paused || over}
              restartKey={restartKey}
              onScore={setScore}
              onLives={setLives}
              onLines={setLines}
              onLevel={setEngineLevel}
              // Con el modal de fin abierto, P no hace nada
              onTogglePause={() => {
                if (!over) setPaused((p) => !p);
              }}
              onGameOver={(finalScore) => {
                setScore(finalScore);
                setOver(true);
              }}
              onAutoPause={() => setPaused(true)}
              blockStyle={blockStyle}
              muted={muted}
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

      {entry && (
        <div className="controls-hint">
          {entry.controls.map((c) => (
            <span className="ctl" key={`${c.keys.join("")}-${c.label}`}>
              {c.keys.map((k) => (
                <kbd key={k}>{k}</kbd>
              ))}
              {c.label}
            </span>
          ))}
          {entry.hasSound && (
            <button
              type="button"
              className={`chip sound-chip${muted ? "" : " active"}`}
              aria-pressed={!muted}
              aria-label="Sonido"
              onClick={toggleMuted}
            >
              {muted ? "SONIDO OFF" : "SONIDO ON"}
            </button>
          )}
        </div>
      )}

      {entry?.blockStyles && (
        <div className="block-styles" role="group" aria-label="Estilo de bloques">
          <span className="label">BLOQUES</span>
          {entry.blockStyles.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`chip${blockStyle === b.id ? " active" : ""}`}
              aria-pressed={blockStyle === b.id}
              onClick={() => pickBlockStyle(b.id)}
            >
              {b.label}
            </button>
          ))}
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
