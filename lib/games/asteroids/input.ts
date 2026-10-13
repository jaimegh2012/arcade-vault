import type { PadButton, VirtualPad } from "../touch";
import type { Keys } from "./entities";

const GAME_KEYS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "Space"]);

// Botón del mando → código de tecla equivalente (↓ no se usa en Asteroids)
const PAD_TO_CODE: Partial<Record<PadButton, string>> = {
  left: "ArrowLeft",
  right: "ArrowRight",
  up: "ArrowUp",
  a: "Space",
};

function isTextTarget(target: EventTarget | null) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

export function createInput(pad?: VirtualPad) {
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
    pad?.releaseAll();
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

  // El mando táctil actúa como el teclado: mantener = tecla pulsada, A = flanco de Space
  function onPad(btn: PadButton, down: boolean) {
    const code = PAD_TO_CODE[btn];
    if (!code) return;
    if (down && !keys[code]) justPressed[code] = true;
    keys[code] = down;
  }

  // Registra los listeners y devuelve la función de limpieza
  function attachInput() {
    const unsubscribePad = pad?.subscribe(onPad);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", reset);
      unsubscribePad?.();
      reset();
    };
  }

  return { keys, pressed, reset, attachInput };
}

export type AsteroidsInput = ReturnType<typeof createInput>;
