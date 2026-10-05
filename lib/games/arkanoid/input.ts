export type ArkanoidKeys = { left: boolean; right: boolean };

export type InputHandlers = {
  /** Posición X del cursor en coordenadas lógicas del canvas. */
  onMouseX: (x: number) => void;
  onTogglePause: () => void;
};

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

// Registra teclado y ratón; devuelve el estado de las flechas (mutable) y la limpieza.
// Solo ArrowLeft/ArrowRight hacen preventDefault; P y Escape no.
export function attachInput(
  canvas: HTMLCanvasElement,
  handlers: InputHandlers,
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
  }

  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;
    handlers.onMouseX((e.clientX - rect.left) * (canvas.width / rect.width));
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  canvas.addEventListener("mousemove", onMouseMove);

  return {
    keys,
    detach: () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      canvas.removeEventListener("mousemove", onMouseMove);
    },
  };
}
