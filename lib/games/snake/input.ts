import { MAX_QUEUED_DIRS } from "./constants";
import { isOpposite, type Dir } from "./entities";
import type { PadButton, VirtualPad } from "../touch";

export type InputHandlers = {
  onDirection: (dir: Dir) => void;
  onTogglePause: () => void;
};

const PAD_TO_DIR: Partial<Record<PadButton, Dir>> = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
};

const KEY_TO_DIR: Record<string, Dir> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// Registra el teclado y devuelve la limpieza. Solo flechas y WASD hacen
// preventDefault; P y Escape no. Se ignora todo con foco en input/textarea
// o con Ctrl/Meta/Alt (atajos del navegador). Con `pad`, las pulsaciones de la
// cruz táctil entran por el mismo onDirection.
export function attachInput(handlers: InputHandlers, pad?: VirtualPad): () => void {
  function onKeyDown(e: KeyboardEvent) {
    if (isTextTarget(e.target)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const dir = KEY_TO_DIR[e.code];
    if (dir) {
      e.preventDefault();
      if (!e.repeat) handlers.onDirection(dir);
    } else if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat) handlers.onTogglePause();
    }
  }

  const unsubscribePad = pad?.subscribe((btn, down) => {
    const dir = PAD_TO_DIR[btn];
    if (dir && down) handlers.onDirection(dir);
  });

  window.addEventListener("keydown", onKeyDown);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    unsubscribePad?.();
  };
}

/**
 * Cola de entrada de máximo MAX_QUEUED_DIRS direcciones. Se descarta la
 * opuesta a la dirección actual (al encolar y de nuevo al consumir) y la
 * repetida respecto a la última encolada.
 */
export function createDirQueue() {
  let queue: Dir[] = [];
  return {
    push(dir: Dir, current: Dir) {
      if (queue.length >= MAX_QUEUED_DIRS) return;
      if (isOpposite(dir, current)) return;
      if (queue[queue.length - 1] === dir) return;
      queue.push(dir);
    },
    /** Siguiente dirección válida respecto a `current`, o null. */
    take(current: Dir): Dir | null {
      while (queue.length > 0) {
        const dir = queue.shift()!;
        if (dir !== current && !isOpposite(dir, current)) return dir;
      }
      return null;
    },
    clear() {
      queue = [];
    },
  };
}
