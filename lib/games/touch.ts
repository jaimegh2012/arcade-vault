// Canal del mando virtual: el TouchPad escribe, los input.ts de cada motor escuchan.
// Sin React ni DOM.
export type PadDir = "up" | "down" | "left" | "right";
export type PadButton = PadDir | "a" | "b";
export type PadListener = (btn: PadButton, down: boolean) => void;

export type VirtualPad = {
  press(btn: PadButton): void;
  release(btn: PadButton): void;
  releaseAll(): void;
  isDown(btn: PadButton): boolean;
  // Devuelve la función para desuscribirse
  subscribe(listener: PadListener): () => void;
};

export function createVirtualPad(): VirtualPad {
  const down = new Set<PadButton>();
  const listeners = new Set<PadListener>();

  // Solo emite en cambios reales de estado
  const emit = (btn: PadButton, isDown: boolean) => {
    for (const l of [...listeners]) l(btn, isDown);
  };

  return {
    press(btn) {
      if (down.has(btn)) return;
      down.add(btn);
      emit(btn, true);
    },
    release(btn) {
      if (!down.delete(btn)) return;
      emit(btn, false);
    },
    releaseAll() {
      for (const btn of [...down]) {
        down.delete(btn);
        emit(btn, false);
      }
    },
    isDown: (btn) => down.has(btn),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
