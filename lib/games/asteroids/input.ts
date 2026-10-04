import type { Keys } from "./entities";

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function createInput() {
  const keys: Keys = {};
  const justPressed: Keys = {};

  // Devuelve true una sola vez por pulsación (consume el flag)
  function pressed(code: string) {
    const val = !!justPressed[code];
    justPressed[code] = false;
    return val;
  }

  // Suelta todas las teclas (p. ej. al pausar o reiniciar)
  function reset() {
    for (const code of Object.keys(keys)) keys[code] = false;
    for (const code of Object.keys(justPressed)) justPressed[code] = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code) || isTextTarget(e.target)) return;
    e.preventDefault();
    if (!keys[e.code]) justPressed[e.code] = true;
    keys[e.code] = true;
  }

  function onKeyUp(e: KeyboardEvent) {
    if (!GAME_KEYS.has(e.code)) return;
    keys[e.code] = false;
  }

  // Registra los listeners y devuelve la función de limpieza
  function attachInput() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", reset);
      reset();
    };
  }

  return { keys, pressed, reset, attachInput };
}

export type AsteroidsInput = ReturnType<typeof createInput>;
