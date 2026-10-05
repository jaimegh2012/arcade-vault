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

// Solo estas teclas bloquean el comportamiento del navegador (scroll); X y P no.
const PREVENT_DEFAULT = new Set(["ArrowLeft", "ArrowRight", "ArrowDown", "ArrowUp", "Space"]);

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// Registra el listener de teclado y devuelve la función de limpieza.
// Como el original, cada keydown (incluido el auto-repeat del SO) dispara una acción.
export function attachInput(onAction: (action: TetrisAction) => void): () => void {
  function onKeyDown(e: KeyboardEvent) {
    const action = ACTIONS[e.code];
    if (!action || isTextTarget(e.target)) return;
    if (PREVENT_DEFAULT.has(e.code)) e.preventDefault();
    onAction(action);
  }

  window.addEventListener("keydown", onKeyDown);
  return () => window.removeEventListener("keydown", onKeyDown);
}
