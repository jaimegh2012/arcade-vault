"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Game } from "@/lib/data";
import { GAME_REGISTRY } from "@/lib/games/registry";
import { createVirtualPad } from "@/lib/games/touch";
import { TouchPad } from "@/components/touch-pad";
import { useUser } from "@/lib/session";
import { submitScore } from "@/app/juegos/[id]/jugar/actions";

type FsDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void>;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

// La API de pantalla completa no existe en iPhone: ahí el botón no se dibuja
const fsSupported = () => {
  const d = document as FsDocument;
  return !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
};
const fsElement = () => {
  const d = document as FsDocument;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
};
const subscribeNever = () => () => {};
function subscribeFs(cb: () => void) {
  document.addEventListener("fullscreenchange", cb);
  document.addEventListener("webkitfullscreenchange", cb);
  return () => {
    document.removeEventListener("fullscreenchange", cb);
    document.removeEventListener("webkitfullscreenchange", cb);
  };
}

export default function GamePlayer({ game }: { game: Game }) {
  const router = useRouter();
  // Mando virtual estable por partida
  const [pad] = useState(() => createVirtualPad());

  const playerRef = useRef<HTMLDivElement>(null);
  const canFullscreen = useSyncExternalStore(subscribeNever, fsSupported, () => false);
  const isFullscreen = useSyncExternalStore(
    subscribeFs,
    () => !!fsElement() && fsElement() === playerRef.current,
    () => false,
  );
  const toggleFullscreen = () => {
    const d = document as FsDocument;
    if (fsElement()) {
      (d.exitFullscreen ?? d.webkitExitFullscreen)?.call(d)?.catch(() => {});
      return;
    }
    const el = playerRef.current as FsElement | null;
    (el?.requestFullscreen ?? el?.webkitRequestFullscreen)?.call(el)?.catch(() => {});
  };

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
  const [jumpTo, setJumpTo] = useState<{ level: number; seq: number }>();
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

  // Preferencia de sonido en localStorage; apagado por defecto (solo "0" lo activa)
  const muted = useSyncExternalStore(
    (cb) => {
      window.addEventListener("av-muted", cb);
      return () => window.removeEventListener("av-muted", cb);
    },
    () => {
      try {
        return localStorage.getItem("av_muted") !== "0";
      } catch {
        return true;
      }
    },
    () => true,
  );
  const toggleMuted = () => {
    try {
      localStorage.setItem("av_muted", muted ? "0" : "1");
    } catch {}
    window.dispatchEvent(new Event("av-muted"));
  };

  // Volumen 0–100 en localStorage (por defecto 15; valor inválido → 15)
  const volume = useSyncExternalStore(
    (cb) => {
      window.addEventListener("av-volume", cb);
      return () => window.removeEventListener("av-volume", cb);
    },
    () => {
      try {
        const v = Number(localStorage.getItem("av_volume"));
        const raw = localStorage.getItem("av_volume");
        return raw !== null && Number.isInteger(v) && v >= 0 && v <= 100 ? v : 15;
      } catch {
        return 15;
      }
    },
    () => 15,
  );
  const pickVolume = (v: number) => {
    try {
      localStorage.setItem("av_volume", String(v));
    } catch {}
    window.dispatchEvent(new Event("av-volume"));
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

  // Con pausa o modal abierto no deben quedar botones del mando pulsados
  useEffect(() => {
    if (paused || over) pad.releaseAll();
  }, [paused, over, pad]);

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
    pad.releaseAll();
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
    <div className="av-player fade-in" ref={playerRef}>
      <div className="player-hud">
        <div className="hud-stats">
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
          {canFullscreen && (
            <button
              className="btn ghost fs-btn"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            >
              {isFullscreen ? "✕" : "⛶"}
            </button>
          )}
          <button className="btn ghost" onClick={() => router.push(`/juegos/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className={entry?.aspect ? "crt crt-tall" : entry ? "crt crt-fit" : "crt"}>
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
              volume={volume / 100}
              jumpTo={jumpTo}
              pad={pad}
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
          {entry?.touch && <TouchPad pad={pad} config={entry.touch} hidden={over} />}
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
                {entry?.levelJump && (
                  <div className="level-jump" role="group" aria-label="Saltar al nivel">
                    <span className="label">SALTAR AL NIVEL</span>
                    <div className="level-jump-chips">
                      {Array.from({ length: entry.levelJump }, (_, i) => i + 1).map((n) => (
                        <button
                          key={n}
                          type="button"
                          className={`chip${engineLevel === n ? " active" : ""}`}
                          aria-pressed={engineLevel === n}
                          onClick={() => {
                            setJumpTo((j) => ({ level: n, seq: (j?.seq ?? 0) + 1 }));
                            setPaused(false);
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
          {entry.hasSound && (
            <label className="volume-ctl" data-muted={muted || undefined}>
              <input
                type="range"
                className="volume-slider"
                min={0}
                max={100}
                step={5}
                value={volume}
                aria-label="Volumen"
                onChange={(e) => pickVolume(Number(e.target.value))}
              />
              <span className="volume-value">{volume}%</span>
            </label>
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
