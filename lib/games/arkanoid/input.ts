import type { PadButton, VirtualPad } from "../touch";

export type ArkanoidKeys = { left: boolean; right: boolean };

export type InputHandlers = {
  /** Posición X del cursor en coordenadas lógicas del canvas. */
  onMouseX: (x: number) => void;
  onTogglePause: () => void;
};

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// Registra teclado, ratón y mando táctil; devuelve el estado de las flechas (mutable) y la
// limpieza. Solo ArrowLeft/ArrowRight hacen preventDefault; P y Escape no. Con `pad`, la
// cruz equivale a mantener las flechas; arrastrar el dedo sobre el canvas equivale al ratón.
export function attachInput(
  canvas: HTMLCanvasElement,
  handlers: InputHandlers,
  pad?: VirtualPad,
): { keys: ArkanoidKeys; detach: () => void } {
  const keys: ArkanoidKeys = { left: false, right: false };

  function onKeyDown(e: KeyboardEvent) {
    if (isTextTarget(e.target)) return;
    if (e.code === "ArrowLeft") {
      e.preventDefault();
      keys.left = true;
    } else if (e.code === "ArrowRight") {
      e.preventDefault();
      keys.right = true;
    } else if (e.code === "KeyP" || e.code === "Escape") {
      if (!e.repeat) handlers.onTogglePause();
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    if (e.code === "ArrowLeft") keys.left = false;
    else if (e.code === "ArrowRight") keys.right = false;
  }

  function onBlur() {
    keys.left = false;
    keys.right = false;
    pad?.releaseAll();
  }

  // Misma conversión a coordenadas lógicas para ratón y dedo
  function emitX(clientX: number) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    handlers.onMouseX((clientX - rect.left) * (canvas.width / rect.width));
  }

  function onMouseMove(e: MouseEvent) {
    emitX(e.clientX);
  }

  function onPointer(e: PointerEvent) {
    if (e.pointerType !== "touch") return;
    emitX(e.clientX);
  }

  function onPad(btn: PadButton, down: boolean) {
    if (btn === "left") keys.left = down;
    else if (btn === "right") keys.right = down;
  }
  const unsubscribePad = pad?.subscribe(onPad);
  const prevTouchAction = canvas.style.touchAction;
  canvas.style.touchAction = "none"; // el arrastre no debe hacer scroll

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("pointerdown", onPointer);
  canvas.addEventListener("pointermove", onPointer);

  return {
    keys,
    detach: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("pointerdown", onPointer);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.style.touchAction = prevTouchAction;
      unsubscribePad?.();
    },
  };
}
