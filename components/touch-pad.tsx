"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import type { GameEntry } from "@/lib/games/registry";
import type { PadButton, PadDir, VirtualPad } from "@/lib/games/touch";

type TouchConfig = NonNullable<GameEntry["touch"]>;

// Fracción del radio de la cruz sin dirección (zona muerta) y umbral de diagonal (sen 22.5°)
const DEAD_ZONE = 0.22;
const DIAGONAL = 0.38;

const ALL_DIRS: PadDir[] = ["up", "down", "left", "right"];
const ALL_BUTTONS: PadButton[] = ["up", "down", "left", "right", "a", "b"];
// Triángulos de la referencia (gamepad.html), viewBox 24×24
const ARROW_PATHS: Record<PadDir, string> = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};
// Orden de la referencia: B a la izquierda, A a la derecha
const PAD_BUTTONS: ("b" | "a")[] = ["b", "a"];

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia("(pointer: coarse)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getCoarse = () => window.matchMedia("(pointer: coarse)").matches;
const getCoarseServer = () => false;

// Direcciones activas para un punto relativo al centro de la cruz (dx, dy en px, y hacia abajo)
function dirsAt(dx: number, dy: number, radius: number, config: TouchConfig): Set<PadDir> {
  const out = new Set<PadDir>();
  const dist = Math.hypot(dx, dy);
  if (dist < radius * DEAD_ZONE) return out;
  if (config.diagonals) {
    if (Math.abs(dx) / dist > DIAGONAL) out.add(dx < 0 ? "left" : "right");
    if (Math.abs(dy) / dist > DIAGONAL) out.add(dy < 0 ? "up" : "down");
  } else if (Math.abs(dx) > Math.abs(dy)) {
    out.add(dx < 0 ? "left" : "right");
  } else {
    out.add(dy < 0 ? "up" : "down");
  }
  for (const d of out) if (!config.dpad.includes(d)) out.delete(d);
  return out;
}

export function TouchPad({
  pad,
  config,
  hidden,
  widthClass,
  aspect,
}: {
  pad: VirtualPad;
  config: TouchConfig;
  // Modal de fin abierto: el mando no se dibuja
  hidden?: boolean;
  // Misma clase de ancho que el CRT (crt-fit / crt-tall) y su aspecto, para igualar el ancho
  widthClass?: string;
  aspect?: string;
}) {
  const coarse = useSyncExternalStore(subscribeCoarse, getCoarse, getCoarseServer);
  const crossRef = useRef<HTMLDivElement>(null);
  // Botones pulsados según el pad (fuente de verdad): también refleja los releaseAll externos
  // (pausa, modal, reinicio), de modo que nada se queda iluminado.
  const [downBtns, setDownBtns] = useState<PadButton[]>([]);
  useEffect(() => {
    const sync = () => setDownBtns(ALL_BUTTONS.filter((b) => pad.isDown(b)));
    sync();
    return pad.subscribe(sync);
  }, [pad]);

  if (!coarse || hidden) return null;

  const applyDirs = (next: Set<PadDir>) => {
    for (const d of ALL_DIRS) if (!next.has(d)) pad.release(d);
    for (const d of next) pad.press(d);
  };

  const onCrossMove = (e: PointerEvent<HTMLDivElement>) => {
    const el = crossRef.current;
    if (!el || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    applyDirs(dirsAt(dx, dy, r.width / 2, config));
  };

  const onCrossDown = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    onCrossMove(e);
  };

  const onCrossEnd = () => applyDirs(new Set());

  const setButton = (id: "a" | "b", down: boolean) => {
    if (down) pad.press(id);
    else pad.release(id);
  };

  return (
    <div
      className={`tpad ${widthClass ?? ""}`}
      data-aspect={aspect}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="tpad-body">
        <div
          ref={crossRef}
          className="tpad-dpad"
          onPointerDown={onCrossDown}
          onPointerMove={onCrossMove}
          onPointerUp={onCrossEnd}
          onPointerCancel={onCrossEnd}
          onLostPointerCapture={onCrossEnd}
        >
          {ALL_DIRS.map((d) => {
            const active = config.dpad.includes(d);
            return (
              <span
                key={d}
                className={`tpad-dp tpad-dp-${d}${active ? "" : " off"}${downBtns.includes(d) ? " on" : ""}`}
              >
                <svg className="tpad-dp-arrow" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={ARROW_PATHS[d]} fill="currentColor" />
                </svg>
              </span>
            );
          })}
          <span className="tpad-hub" aria-hidden="true">
            <span className="tpad-hub-gem" />
          </span>
        </div>
        <div className="tpad-actions">
          {PAD_BUTTONS.map((id) => {
            const def = config.buttons?.find((b) => b.id === id);
            const active = !!def;
            return (
              <div key={id} className={`tpad-ab-wrap tpad-${id}`}>
                <div
                  className={`tpad-ab${active ? "" : " off"}${active && downBtns.includes(id) ? " on" : ""}`}
                  {...(active && {
                    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      e.currentTarget.setPointerCapture(e.pointerId);
                      setButton(id, true);
                    },
                    onPointerUp: () => setButton(id, false),
                    onPointerCancel: () => setButton(id, false),
                    onLostPointerCapture: () => setButton(id, false),
                  })}
                >
                  <span className="tpad-ab-ring" />
                  <span className="tpad-ab-letter">{id.toUpperCase()}</span>
                </div>
                <small className="tpad-ab-label">{def?.label ?? ""}</small>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
