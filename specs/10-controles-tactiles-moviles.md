# 10 — Controles táctiles para jugar en móvil

- **Estado:** Implementado
- **Depende de:** SPEC 05, SPEC 07, SPEC 08, SPEC 09
- **Fecha:** 2026-10-12

**Objetivo:** Hacer jugables en dispositivos táctiles los cuatro juegos con motor real (asteroides, tetris, arkanoid, snake) mediante un gamepad virtual superpuesto al canvas, con layout móvil del reproductor y pantalla completa.

## Por qué existe este spec

Los motores solo escuchan teclado (y ratón en Arkanoid): en un móvil no se puede jugar. Referencia visual del usuario: `references/source-assets/idea-canvas-controls.png` — cruz a la izquierda y botones a la derecha, **sobre** el área del canvas.

## Alcance

**Incluido:**

1. **Canal del mando virtual** `lib/games/touch.ts` (sin React, sin DOM):
   - Tipos `PadButton = "up" | "down" | "left" | "right" | "a" | "b"` y `VirtualPad`.
   - `createVirtualPad()` → `{ press(btn), release(btn), releaseAll(), isDown(btn), subscribe(listener) }`; `listener(btn, down)` solo se llama en cambios reales (pulsar algo ya pulsado no re-emite).
2. **Contrato**:
   - `GameCanvasProps` (`lib/games/types.ts`) añade `pad?: VirtualPad`.
   - `GameEntry` (`lib/games/registry.ts`) añade `touch?: { dpad: ("up" | "down" | "left" | "right")[]; diagonals?: boolean; buttons?: { id: "a" | "b"; label: string }[] }`. Sin `touch` → sin mando (placeholders simulados intactos).
3. **Mapeo por juego** (entradas del registro):
   - `asteroides`: dpad `left/up/right`, `diagonals: true` (girar + propulsar a la vez); botón `A` "DISPARAR". `left/right/up` = mantener `ArrowLeft/ArrowRight/ArrowUp`; `A` = pulsación de `Space` (flanco, igual que `pressed("Space")`). Multitáctil: propulsar/girar y disparar a la vez.
   - `tetris`: dpad 4 direcciones; `↑` y `A` "ROTAR" = rotar; `B` "CAÍDA" = caída dura; `←/→/↓` con auto-repetición al mantener (retardo 170 ms, cadencia 50 ms) implementada en `lib/games/tetris/input.ts`.
   - `arkanoid`: dpad `left/right` (= mantener flechas) + **arrastrar el dedo sobre el canvas** mueve la pala (pointer events `pointerType: "touch"` en `lib/games/arkanoid/input.ts`, misma conversión a coordenadas lógicas que `onMouseX`). Sin botones de acción.
   - `snake`: dpad 4 direcciones → `onDirection` (misma cola y bloqueo de reversa que el teclado; la primera dirección válida arranca la partida). Sin botones de acción.
   - La pausa sigue siendo el botón PAUSA del HUD (sin botón START en el mando).
4. **Motores** — cada `lib/games/<id>/input.ts` acepta el `pad` opcional y se suscribe junto al teclado, devolviendo la desuscripción en su limpieza; `create<Name>Game(canvas, callbacks, options?)` recibe `{ pad }`. Pausar, reiniciar, `blur` y `destroy` llaman a `releaseAll()`/reset para no dejar botones "pegados". Con la partida pausada o terminada el pad no actúa.
5. **Componentes `<id>-canvas.tsx`** — pasan `pad` al motor al crearlo (sin recrear el motor si cambia la referencia; el pad es estable por partida).
6. **Componente `components/touch-pad.tsx`** (`"use client"`):
   - Superpuesto dentro de `.crt-screen` (posición absoluta, z-index por debajo del overlay de pausa y del modal): cruz abajo-izquierda, botones abajo-derecha.
   - Cruz como **un solo elemento**: dirección por ángulo respecto al centro con zona muerta; `setPointerCapture` para deslizar el dedo entre direcciones sin levantarlo; con `diagonals` emite dos direcciones (p. ej. `up+left`); direcciones no listadas en `dpad` no se dibujan ni emiten.
   - Botones de acción redondos con etiqueta (`A`/`B` + texto corto), cada uno con su propio pointer → multitáctil.
   - Opacidad ~0.35 en reposo, ~0.7 pulsado; estilo neón del sitio (`/frontend-design`).
   - `pointerup`/`pointercancel`/`lostpointercapture` sueltan; `contextmenu` bloqueado; `user-select: none`.
   - Se renderiza solo si `(pointer: coarse)` (vía `useSyncExternalStore` + `matchMedia`, snapshot de servidor `false`), la entrada tiene `touch` y el modal de fin no está abierto.
7. **`GamePlayer`** (`components/game-player.tsx`): crea un `VirtualPad` estable (`useState(() => createVirtualPad())`), lo pasa como `pad` al canvas y al `TouchPad`; `releaseAll()` al pausar, al abrir el modal y al reiniciar. En táctil oculta las teclas `kbd` del `.controls-hint` (se mantienen chip de sonido y volumen).
8. **Bloqueo de gestos del navegador**: `touch-action: none` y `overscroll-behavior: none` en `.crt-screen` y el mando → sin scroll, pull-to-refresh ni zoom por doble toque al jugar. El resto de la página hace scroll normal.
9. **Layout móvil** (`app/globals.css`, `@media (pointer: coarse)` + breakpoints existentes):
   - Vertical: HUD compacto (menos gap/padding, botones más pequeños) y `.crt` con menos padding para que HUD + CRT quepan en 390×844 sin scroll una vez bajo la nav.
   - Horizontal: el CRT completo cabe en el alto de la ventana (ajustar `crt-fit`/`crt-tall` para `orientation: landscape`); el mando sigue superpuesto.
10. **Pantalla completa**: botón `⛶` en `.hud-actions` (aria-label "Pantalla completa" / "Salir de pantalla completa") que llama a `requestFullscreen` (o `webkitRequestFullscreen`) sobre `.av-player` (HUD + CRT + mando + modal). Se renderiza solo si la API existe (`document.fullscreenEnabled` o equivalente webkit) → no aparece en iPhone. También en escritorio. Estado sincronizado con `fullscreenchange`. Estilos `.av-player:fullscreen` con fondo del sitio y CRT ajustado a `100svh`.
11. Pulido visual con `/frontend-design`.

**No incluido:**

- Vibración/haptics, sonido del mando.
- Joystick analógico, botón START en el mando, mando reconfigurable o que se pueda ocultar/mover.
- Gestos (swipe/tap) en el canvas salvo el arrastre de Arkanoid.
- Bloqueo de orientación (`screen.orientation.lock`), PWA/instalable, modo offline.
- Pseudo-pantalla completa para iPhone.
- Rediseñar el HUD de escritorio, la nav o el resto de páginas en móvil.
- Placeholders simulados (sin `touch` en el registro).
- Pruebas automatizadas.

## Modelo de datos

Sin cambios de base de datos ni de persistencia (nada nuevo en `localStorage`).

```ts
// lib/games/touch.ts
export type PadDir = "up" | "down" | "left" | "right";
export type PadButton = PadDir | "a" | "b";
export type PadListener = (btn: PadButton, down: boolean) => void;

export type VirtualPad = {
  press(btn: PadButton): void;
  release(btn: PadButton): void;
  releaseAll(): void;
  isDown(btn: PadButton): boolean;
  subscribe(listener: PadListener): () => void;
};

// lib/games/registry.ts (GameEntry)
touch?: {
  dpad: PadDir[];
  diagonals?: boolean;
  buttons?: { id: "a" | "b"; label: string }[];
};

// lib/games/types.ts (GameCanvasProps)
pad?: VirtualPad;
```

Archivos:

```
lib/games/touch.ts                 // nuevo
components/touch-pad.tsx           // nuevo
lib/games/types.ts                 // modificado: pad
lib/games/registry.ts              // modificado: GameEntry.touch + 4 entradas
lib/games/{asteroids,tetris,arkanoid,snake}/input.ts   // modificados: suscripción al pad (+ arrastre Arkanoid, repetición Tetris)
lib/games/{asteroids,tetris,arkanoid,snake}/engine.ts  // modificados: options { pad }, releaseAll en pausa/reinicio
components/{asteroids,tetris,arkanoid,snake}-canvas.tsx // modificados: pasan pad
components/game-player.tsx         // modificado: pad, TouchPad, fullscreen, hint
app/globals.css                    // modificado: mando, touch-action, layout móvil, :fullscreen
```

## Plan de implementación

1. **Guía** — leer en `node_modules/next/dist/docs/` lo relevante de Client Components; revisar si `next dev` necesita `allowedDevOrigins` para probar desde la IP LAN del móvil (solo añadirlo si falla).
2. **Canal** — `lib/games/touch.ts` + tipos en `types.ts` y `registry.ts` (`touch` aún sin entradas). Todo sigue igual.
3. **Snake** — `input.ts`/`engine.ts`/`snake-canvas.tsx` aceptan `pad`; entrada `touch` en el registro; `GamePlayer` crea el pad y lo pasa. Verificable disparando `pad.press` desde consola.
4. **`TouchPad`** — componente con cruz por ángulo, pointer capture, multitáctil, detección `pointer: coarse`; montado en `GamePlayer`. Snake jugable en táctil.
5. **Asteroids** — mapeo a `keys`/`pressed`, diagonales, multitáctil disparo.
6. **Tetris** — mapeo + auto-repetición `←/→/↓` y botones A/B.
7. **Arkanoid** — dpad izquierda/derecha + arrastre en canvas.
8. **Bloqueo de gestos y layout móvil** — `touch-action`, HUD compacto, vertical/horizontal; ocultar `kbd` en táctil.
9. **Pantalla completa** — botón, detección de soporte, `fullscreenchange`, estilos `:fullscreen`.
10. **Pulido** con `/frontend-design`.
11. **Verificación** — Playwright MCP con contexto móvil emulado (`hasTouch`, `isMobile`, 390×844 y 844×390) vía `browser_run_code_unsafe` + prueba en dispositivo real por LAN; escritorio sin cambios. Capturas en `.playwright-screenshot/`. `npm run lint`, `npm run build`, `git status`; borrar filas de prueba de `scores`.

## Criterios de aceptación

- [ ] Con `(pointer: coarse)` los 4 juegos muestran el mando superpuesto (cruz abajo-izquierda, botones abajo-derecha) semitransparente; en escritorio con ratón no aparece y nada cambia.
- [ ] Los juegos sin entrada en el registro (placeholders) no muestran mando.
- [ ] Snake: la cruz cambia la dirección con la misma regla anti-reversa y cola de 2 que el teclado; la primera dirección válida arranca la partida.
- [ ] Asteroids: mantener ←/→ gira, ↑ propulsa, diagonal gira y propulsa a la vez, `A` dispara una vez por toque; se puede propulsar y disparar a la vez con dos dedos.
- [ ] Tetris: ←/→ mueven y repiten al mantener, ↓ baja y repite, ↑ y `A` rotan, `B` hace caída dura.
- [ ] Arkanoid: ←/→ mueven la pala mientras se mantienen; arrastrar el dedo en el canvas la sigue.
- [ ] Deslizar el dedo de una dirección a otra de la cruz cambia de dirección sin levantarlo; levantar o cancelar el toque suelta todo (sin botones pegados), también al pausar, abrir el modal o reiniciar.
- [ ] Con pausa o modal abierto el mando no actúa; el overlay de pausa (incl. chips de salto de nivel) y el modal quedan por encima y son pulsables.
- [ ] Tocar el canvas o el mando no hace scroll, zoom por doble toque, pull-to-refresh, selección de texto ni menú contextual.
- [ ] Vertical 390×844: HUD + CRT completos visibles sin scroll bajo la nav. Horizontal 844×390: el CRT entero cabe en el alto de la ventana.
- [ ] En táctil el `.controls-hint` no muestra teclas `kbd`; chip de sonido y volumen siguen visibles en Arkanoid.
- [ ] Botón pantalla completa visible solo si el navegador soporta la API; pone `.av-player` en pantalla completa, cambia su etiqueta, y salir (botón o gesto del sistema) restaura el layout. El modal de fin funciona en pantalla completa.
- [ ] Escritorio: teclado y ratón de los 4 juegos funcionan igual que antes; Strict Mode sin listeners ni suscripciones duplicadas.
- [ ] Guardar puntuación desde móvil crea la fila en `scores`.
- [ ] `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** gamepad virtual superpuesto al canvas (referencia del usuario). **No:** franja bajo el CRT (encoge el canvas en vertical); solo gestos (Asteroids incómodo).
- **Sí:** cruz digital por ángulo con pointer capture. **No:** joystick analógico (más complejo; motores basados en teclas).
- **Sí:** botones de acción solo los que usa cada juego, declarados en el registro. **No:** rombo fijo de 4 con botones muertos.
- **Sí:** canal tipado `VirtualPad` que cada `input.ts` consume. **No:** `KeyboardEvent` sintéticos (frágil, `isTrusted`, hacky).
- **Sí:** visible solo con `(pointer: coarse)`. **No:** por ancho de pantalla (falla en tablets/escritorio estrecho); toggle manual.
- **Sí:** pausa con el botón PAUSA del HUD. **No:** botón START en el mando.
- **Sí:** arrastre en canvas para Arkanoid además de la cruz (equivale al ratón). **No:** otros gestos en canvas.
- **Sí:** auto-repetición de Tetris en su `input.ts` (el teclado depende del auto-repeat del SO, que el táctil no tiene). **No:** repetición genérica en el mando.
- **Sí:** vertical y horizontal con mando superpuesto en ambas. **No:** aviso "gira el dispositivo".
- **Sí:** pantalla completa de `.av-player` oculta sin soporte. **No:** pseudo-fullscreen CSS para iPhone; fullscreen solo del canvas (ocultaría HUD y modal).
- **Sí:** sin haptics. **No:** `navigator.vibrate` (fuera de alcance).

## Riesgos identificados

| Riesgo                                                     | Mitigación                                                                                          |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Botones "pegados" si se pierde un `pointerup`              | `pointercancel`/`lostpointercapture`, `releaseAll()` en pausa, modal, reinicio, `blur` y `destroy`. |
| El mando tapa parte del juego en las esquinas              | Semitransparente; tamaños ajustados en pulido; aceptado.                                            |
| `touch-action` no bloquea doble toque en iOS antiguo       | `touch-action: none` en `.crt-screen` y mando + `preventDefault` en `pointerdown` del mando.        |
| `(pointer: coarse)` falso en portátiles táctiles con ratón | Aceptado: mando visible pero no rompe teclado/ratón.                                                |
| Fullscreen API no existe en iPhone                         | Botón oculto sin soporte; documentado.                                                              |
| Cambiar firmas de motores rompe escritorio                 | `pad` opcional; criterio de aceptación de regresión en escritorio.                                  |
| Strict Mode duplica suscripciones al pad                   | La suscripción vive en `attachInput` y su limpieza en `destroy()`.                                  |
| Probar desde el móvil por LAN bloqueado por Next 16 dev    | Añadir `allowedDevOrigins` en `next.config.ts` solo si hace falta.                                  |
| Playwright MCP no emula táctil con `browser_resize`        | Contexto con `hasTouch`/`isMobile` vía `browser_run_code_unsafe` + prueba en dispositivo real.      |

## Qué **no** está en este spec

- Haptics, joystick analógico, START en el mando, mando configurable.
- Gestos en canvas salvo arrastre de Arkanoid.
- Bloqueo de orientación, PWA, pseudo-fullscreen iPhone.
- Rediseño móvil de otras páginas.
- Pruebas automatizadas.
