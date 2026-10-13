import type { PadButton, VirtualPad } from "../touch";

export type TetrisAction = "left" | "right" | "softDrop" | "rotate" | "hardDrop" | "togglePause";

const ACTIONS: Record<string, TetrisAction> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowDown: "softDrop",
  ArrowUp: "rotate",
  KeyX: "rotate",
  Space: "hardDrop",
  KeyP: "togglePause",
};

// Mando táctil → acción. ← → ↓ se repiten al mantener (el táctil no tiene auto-repeat del SO).
const PAD_ACTIONS: Partial<Record<PadButton, TetrisAction>> = {
  left: "left",
  right: "right",
  down: "softDrop",
  up: "rotate",
  a: "rotate",
  b: "hardDrop",
};
const PAD_REPEATING = new Set<PadButton>(["left", "right", "down"]);
const PAD_REPEAT_DELAY = 170; // ms hasta la primera repetición
const PAD_REPEAT_RATE = 50; // ms entre repeticiones

// Solo estas teclas bloquean el comportamiento del navegador (scroll); X y P no.
const PREVENT_DEFAULT = new Set(["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"]);

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// Registra el listener de teclado y devuelve la función de limpieza.
// Como el original, cada keydown (incluido el auto-repeat del SO) dispara una acción.
export function attachInput(
  onAction: (action: TetrisAction) => void,
  pad?: VirtualPad,
): () => void {
  function onKeyDown(e: KeyboardEvent) {
    const action = ACTIONS[e.code];
    if (!action || isTextTarget(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    onAction(action);
  }

  // Repetición del mando: un temporizador por botón mantenido
  const timers = new Map<PadButton, ReturnType<typeof setTimeout>>();

  function stopRepeat(btn: PadButton) {
    const t = timers.get(btn);
    if (t === undefined) return;
    clearTimeout(t);
    timers.delete(btn);
  }

  function onPad(btn: PadButton, down: boolean) {
    const action = PAD_ACTIONS[btn];
    if (!action) return;
    if (!down) {
      stopRepeat(btn);
      return;
    }
    onAction(action);
    if (!PAD_REPEATING.has(btn)) return;
    const tick = () => {
      onAction(action);
      timers.set(btn, setTimeout(tick, PAD_REPEAT_RATE));
    };
    timers.set(btn, setTimeout(tick, PAD_REPEAT_DELAY));
  }

  const unsubscribePad = pad?.subscribe(onPad);
  const onBlur = () => pad?.releaseAll();

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("blur", onBlur);
  return () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("blur", onBlur);
    unsubscribePad?.();
    for (const btn of [...timers.keys()]) stopRepeat(btn);
  };
}
