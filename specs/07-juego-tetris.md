# 07 — Juego TETRIS jugable con leaderboard

- **Estado:** Implemented
- **Depende de:** SPEC 05, SPEC 06
- **Fecha:** 2026-10-04

**Objetivo:** Portar `references/started-games/03-tetris` a un módulo TypeScript jugable en `/juegos/tetris/jugar` (reemplazando el placeholder `caida` del catálogo) con su leaderboard en Supabase.

## Alcance

**Incluido:**

1. **Catálogo** — la fila `caida` de `games` pasa a `tetris` (update, no insert). Migración `supabase/migrations/<timestamp>_game_tetris.sql` aplicada con `apply_migration`:
   - `id: "tetris"`, `title: "TETRIS"`, `category: "PUZZLE"` (sin cambio), `color: "magenta"` (sin cambio), `cover: "cover-tetro"` (se reutiliza; no se crea `.cover-tetris`), `sort_order: 2` (sin cambio).
   - `short` se conserva: `Encaja las piezas antes de que el techo te aplaste.`
   - `long` se reescribe para describir el juego real: rotación con desplazamiento contra la pared, pieza fantasma, caída rápida, vista previa de la siguiente pieza y nivel que sube cada 10 líneas. No menciona mecánicas ausentes.
   - `/juegos/caida` y `/juegos/caida/jugar` devuelven 404 (sin alias, igual que `rocas` → `asteroides` en el SPEC 05).
   - `lib/home-data.ts`: la entrada de actividad reciente `game: "Caída"` pasa a `"Tetris"`.
2. **Motor** en `lib/games/tetris/`: `constants.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo ni `document.getElementById`; las funciones de dibujo reciben `ctx` por parámetro. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createTetrisGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onLines(lines)`, `onLevel(level)`, `onGameOver(finalScore)`, `onTogglePause()`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms (el original no lo limita; se añade para no saltar al volver de otra pestaña). `destroy()` cancela rAF y quita listeners.
   - Mecánica y constantes idénticas al código del original: tablero 10×20, bloque 30 px, `LINE_SCORES = [0, 100, 300, 500, 800]` × nivel, soft drop +1 por fila, hard drop +2 por celda recorrida, nivel = `floor(lines / 10) + 1`, `dropInterval = max(100, 1000 − (level − 1) × 90)` ms, rotación horaria con kicks `[0, -1, 1, -2, 2]`, aparición centrada en la fila 0, fin si la pieza nueva colisiona al aparecer, pieza fantasma con `globalAlpha = 0.2`, colores por pieza (`I` cian, `O` amarillo, `T` morado, `S` verde, `Z` rojo, `J` azul pálido, `L` naranja).
   - **Solo las 7 piezas estándar** (I, O, T, S, Z, J, L), elegidas con `Math.floor(Math.random() * 7) + 1`. Se descarta la pieza 8 "N / tuerca" que existe en el código pero no en el README.
   - Se elimina del canvas el overlay PAUSA/GAME OVER, el panel de controles y el toggle claro/oscuro (`localStorage` `tetris-theme`).
   - Se conserva dibujado en canvas lo que React no puede mostrar: el panel **NEXT** (pieza siguiente) a la derecha del tablero.
3. **Componente cliente** `components/tetris-canvas.tsx` (`"use client"`), mismo patrón que `components/asteroids-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **420×600** (tablero 300 + panel NEXT 120) escalado por CSS dentro de `.crt-screen`, con `aspect-ratio: 7/10`. `onTogglePause` se conecta al estado `paused` del reproductor.
4. **Registro de juegos** `lib/games/registry.ts` (no existe aún): mapa `id → GameEntry`.
   - Se crea en este spec y se migra `asteroides` al registro sin cambiar su comportamiento.
   - `components/game-player.tsx` sustituye `isAsteroids` por consulta al registro: canvas, HUD (vidas/nivel/líneas) y texto de controles (`.controls-hint`) salen de la entrada del juego. Los ids sin entrada mantienen el placeholder simulado.
   - HUD de `tetris`: puntuación, **líneas** (nuevo campo) y nivel del motor; **sin vidas** (`hasLives: false`).
5. **Controles** (solo teclado, mismas teclas que el original):
   - `←`/`→` mover, `↓` soft drop, `↑` o `X` rotar, `Espacio` hard drop, `P` alterna PAUSA/REANUDAR del reproductor vía `onTogglePause`.
   - `preventDefault` solo en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp` y `Space` (no en `X` ni `P`). Se ignoran las teclas con el foco en `input`/`textarea`. Con la partida pausada o terminada las teclas de juego no actúan; `P` sí alterna la pausa salvo en game over.
   - Texto de controles bajo el CRT: `← → mover · ↑ rotar · ↓ bajar · ESPACIO caída · P pausa`.
6. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "tetris", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=tetris`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí solo se verifica.
7. **Pulido visual** con `/frontend-design`: bloques con highlight superior y rejilla tenue sobre fondo oscuro integrados en el marco CRT, panel NEXT, hint de controles y overlay de pausa del reproductor.
8. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Controles táctiles / móvil jugable, audio, pantalla completa, guardado de partida en curso.
- Toggle claro/oscuro del original y overlay PAUSA/GAME OVER dibujado en canvas.
- La pieza "N / tuerca" y cualquier otra pieza o mecánica nueva (hold, bolsa de 7, T-spin, wall kicks SRS, DAS/ARR, puntuación moderna).
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos (Arkanoid y resto de placeholders).
- Pruebas automatizadas (no hay test runner).
- Nueva portada: se reutiliza `.cover-tetro`.

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Las filas de `scores` con `game_id = 'caida'` son pruebas del placeholder y se borran antes de renombrar, porque la FK `scores.game_id` no tiene `ON UPDATE CASCADE`:

```sql
delete from public.scores where game_id = 'caida';

update public.games set
  id    = 'tetris',
  title = 'TETRIS',
  long  = 'Siete piezas geométricas caen sobre un tablero de 10×20. Muévelas, rótalas (la pared te ayuda con un pequeño desplazamiento) y suéltalas al instante guiándote por la pieza fantasma. Completa líneas para subir de nivel cada 10: la caída se acelera sin piedad.'
where id = 'caida';
```

Tipos públicos del motor:

```ts
export type TetrisCallbacks = {
  onScore: (score: number) => void;
  onLines: (lines: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void;
};

export type TetrisGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF y quita listeners
};
```

Entrada del registro:

```ts
export type GameEntry = {
  Canvas: React.ComponentType<GameCanvasProps>; // paused, restartKey, callbacks, onAutoPause
  controls: { keys: string[]; label: string }[]; // para .controls-hint
  engineLevel: boolean; // true: el nivel viene del motor
  hasLives: boolean; // false: el HUD oculta VIDAS
  hasLines?: boolean; // true: el HUD añade LÍNEAS
};
```

`GameCanvasProps` unifica los callbacks opcionales (`onLives`, `onLines`, `onLevel`, `onTogglePause`) para que `AsteroidsCanvas` y `TetrisCanvas` encajen sin ramas por id.

Archivos:

```
supabase/migrations/<timestamp>_game_tetris.sql   // nuevo
lib/games/tetris/constants.ts                     // nuevo: COLS, ROWS, BLOCK, W, H, COLORS, PIECES, LINE_SCORES
lib/games/tetris/entities.ts                      // nuevo: tablero, pieza, colisión, rotación, dibujo de bloque
lib/games/tetris/input.ts                         // nuevo: teclas, attach/detach
lib/games/tetris/engine.ts                        // nuevo: createTetrisGame
components/tetris-canvas.tsx                      // nuevo
lib/games/registry.ts                             // nuevo: asteroides + tetris
components/asteroids-canvas.tsx                   // modificado: encaja en GameCanvasProps
components/game-player.tsx                        // modificado: usa el registro, HUD con líneas
lib/home-data.ts                                  // modificado: "Caída" → "Tetris"
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` el catálogo y que `scores` de `caida` está vacía o solo con pruebas.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`; actualizar `lib/home-data.ts`. Verificar `/juegos/tetris` con la portada `cover-tetro`, que `/juegos/caida` da 404 y que el leaderboard queda vacío.
3. **Constantes y entidades** — portar a TypeScript estricto, con 7 piezas; `ctx` por parámetro.
4. **Input** — `attachInput()` que devuelve la limpieza; `preventDefault` solo en las 5 teclas definidas; ignora `input`/`textarea`.
5. **Motor** — estado en closure, update/draw (tablero, rejilla, fantasma, pieza actual, panel NEXT), callbacks solo en cambios reales, `pause`/`resume`/`restart`/`destroy`, `dt` ≤ 50 ms.
6. **Componente `TetrisCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 420×600.
7. **Registro y reproductor** — crear `lib/games/registry.ts`, migrar `asteroides` al registro y `game-player.tsx` a consultarlo; añadir LÍNEAS al HUD y ocultar VIDAS según la entrada. Verificar que `asteroides` sigue igual antes de seguir.
8. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover, rotar, kicks, soft/hard drop, limpiar 1–4 líneas, subir de nivel, perder), guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil. Capturas en `.playwright-screenshot`.
9. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'tetris'`.

## Criterios de aceptación

- [ ] `/juegos/tetris/jugar` muestra el juego dentro del marco CRT y la partida arranca sola con una pieza cayendo y el panel NEXT visible.
- [ ] `/juegos/caida` y `/juegos/caida/jugar` devuelven 404; no queda `caida`/`Caída` en `app/`, `lib/` ni `components/`.
- [ ] La biblioteca, el home, el detalle y el Salón muestran "TETRIS" con la portada `cover-tetro`.
- [ ] `←`/`→` mueven, `↓` baja una fila (+1), `↑` y `X` rotan en sentido horario, `Espacio` hace caída instantánea (+2 por celda); la página no hace scroll con las flechas ni con Espacio.
- [ ] La rotación pegada a la pared aplica los desplazamientos `[0, -1, 1, -2, 2]` o se descarta si todos colisionan.
- [ ] Limpiar 1/2/3/4 líneas en nivel 1 suma 100/300/500/800; en nivel N multiplica por N.
- [ ] El nivel sube cada 10 líneas y el intervalo de caída es `max(100, 1000 − (nivel − 1) × 90)` ms.
- [ ] Solo aparecen 7 tipos de pieza (no existe la pieza gris "N").
- [ ] La pieza fantasma se dibuja con opacidad 0.2 en la posición de aterrizaje.
- [ ] El panel NEXT muestra la pieza siguiente y se actualiza al fijarse la actual.
- [ ] El HUD React muestra puntuación, líneas y nivel del motor en tiempo real; no muestra vidas; no hay HUD, overlay ni panel de controles dibujados en canvas salvo NEXT.
- [ ] Si la pieza nueva colisiona al aparecer se abre el modal "FIN DEL JUEGO" con la puntuación correcta; el botón FIN también lo abre.
- [ ] PAUSA congela la caída y REANUDAR continúa sin saltos; `P` alterna PAUSA/REANUDAR; cambiar de pestaña pausa. Con el modal abierto `P` no hace nada.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "tetris"`; iniciales inválidas se rechazan sin cerrar el modal; escribir en el input del modal no mueve piezas.
- [ ] La marca aparece en `/salon?juego=tetris`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, líneas 0, nivel 1 y tablero vacío sin duplicar loop ni listeners (la velocidad no aumenta tras reiniciar); Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides` conserva su comportamiento y su HUD (con vidas, sin líneas) tras el registro; los demás juegos conservan el placeholder simulado.
- [ ] `games` contiene la fila `tetris` con `title: TETRIS`, `category: PUZZLE`, `color: magenta`, `cover: cover-tetro`, `sort_order: 2`, y ya no existe `caida`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 7:10.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** reemplazar la fila `caida` por `tetris` (update de `id`) — el id debe coincidir con la ruta y con `lib/games/tetris`, como `rocas` → `asteroides`. **No:** conservar el id `caida` (la ruta no diría Tetris) ni insertar una fila nueva (duplicaría el concepto en el catálogo).
- **Sí:** borrar los `scores` de `caida` antes del update — son pruebas de un placeholder y la FK no tiene `ON UPDATE CASCADE`. **No:** añadir `ON UPDATE CASCADE` al esquema (cambio de esquema fuera de alcance).
- **Sí:** reutilizar `.cover-tetro`. **No:** crear `.cover-tetris` (renombrar sin ganancia visual).
- **Sí:** solo las 7 piezas estándar — decisión del usuario; el README las documenta así. **No:** portar la pieza "N / tuerca" que existe en `game.js` (aquí el usuario prefirió no seguir el código sobre el README, a diferencia de los power-ups de asteroides).
- **Sí:** motor TypeScript con `createTetrisGame(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script` con el `game.js` tal cual.
- **Sí:** HUD (puntuación, líneas, nivel) y modal de fin en React; NEXT dibujado en canvas. **No:** segundo `<canvas>` React para NEXT (acopla motor y página con un callback extra).
- **Sí:** `P` pausa a través de `onTogglePause` hacia el reproductor — una sola fuente de verdad del estado `paused`. **No:** pausa interna del motor ni overlay de pausa en canvas.
- **Sí:** registro `lib/games/registry.ts` — es el primer juego tras asteroides, así que se crea ahora. **No:** otro `isTetris` en `game-player.tsx`.
- **Sí:** canvas lógico 420×600 con `aspect-ratio: 7/10`. **No:** 300×600 sin NEXT.
- **Sí:** tope de `dt` de 50 ms aunque el original no lo tenga — evita que una pieza caiga varias filas al volver a la pestaña. No altera la jugabilidad normal.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni localStorage.
- **No:** toggle claro/oscuro del original — choca con el tema CRT del sitio.

## Riesgos identificados

| Riesgo                                                               | Mitigación                                                                                    |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Strict Mode duplica loop o listeners                                 | `destroy()` completo; criterio de aceptación explícito.                                       |
| Teclas del juego interfieren con el input del modal                  | Ignorar eventos con target `input`/`textarea`; pausar al abrir el modal.                      |
| `dt` grande al volver a la pestaña                                   | Tope de 50 ms y pausa con `visibilitychange`.                                                 |
| El `update` del `id` falla por FK si hay `scores` de `caida`         | La migración borra primero esas filas; el paso 1 las revisa antes.                            |
| Refactor del registro rompe `asteroides`                             | Paso 7 verifica asteroides completo antes de continuar; criterio de aceptación explícito.     |
| `P` alterna pausa también con el modal de fin abierto                | El motor ignora `P` en game over; verificado en criterios.                                    |
| El motor original ejecuta el bloqueo dentro del loop tras `gameOver` | Portar con una sola salida de fin: tras `endGame` no se dibuja ni se reprograma rAF.          |
| Scores falsos con clave publishable                                  | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango (0–9.999.999, inalcanzable aquí). |
| Un solo proyecto Supabase para dev y prod                            | Limpiar filas de prueba de `scores` al cerrar (paso 9).                                       |
| Canvas estrecho (7:10) se ve pequeño en escritorio dentro del CRT    | Centrar el marco y limitar su ancho; ajuste visual con `/frontend-design` en el paso 8.       |

## Qué **no** está en este spec

- Táctil, audio, pantalla completa, guardado de partida.
- La pieza "N / tuerca", hold, bolsa de 7, T-spin, SRS y otros cambios de mecánica o puntuación.
- Toggle claro/oscuro y overlays dibujados en canvas.
- Auth/anti-trampas y scores ligados a usuario.
- Arkanoid y el resto de juegos.
- Pruebas automatizadas.
