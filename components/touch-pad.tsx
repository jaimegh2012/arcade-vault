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
const ARROWS: Record<PadDir, string> = { up: "▲", down: "▼", left: "◀", right: "▶" };

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
}: {
  pad: VirtualPad;
  config: TouchConfig;
  // Modal de fin abierto: el mando no se dibuja
  hidden?: boolean;
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
    <div className="touch-pad" onContextMenu={(e) => e.preventDefault()}>
      <div
        ref={crossRef}
        className="tp-cross"
        onPointerDown={onCrossDown}
        onPointerMove={onCrossMove}
        onPointerUp={onCrossEnd}
        onPointerCancel={onCrossEnd}
        onLostPointerCapture={onCrossEnd}
      >
        {config.dpad.map((d) => (
          <span key={d} className={`tp-arrow tp-${d}${downBtns.includes(d) ? " on" : ""}`}>
            {ARROWS[d]}
          </span>
        ))}
      </div>
      {config.buttons && (
        <div className="tp-actions">
          {config.buttons.map((b) => (
            <div
              key={b.id}
              className={`tp-btn tp-${b.id}${downBtns.includes(b.id) ? " on" : ""}`}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
                setButton(b.id, true);
              }}
              onPointerUp={() => setButton(b.id, false)}
              onPointerCancel={() => setButton(b.id, false)}
              onLostPointerCapture={() => setButton(b.id, false)}
            >
              <b>{b.id.toUpperCase()}</b>
              <small>{b.label}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
