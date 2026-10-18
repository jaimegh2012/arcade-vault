# COLUMNAS — variante B: con twist «la gema prisma»

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 10
- **Fecha:** 2026-10-18
- **Game jam:** tema «COLUMNAS (`columnas`), el puzzle de tríos de gemas que caen y se destruyen al alinear tres iguales en cualquier dirección, con reacciones en cadena» · variante B de 3 · hermanas `A-juego-columnas.md`, `C-juego-columnas.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/NN-juego-columnas.md` y ejecutar `/spec-impl NN-juego-columnas`

**Objetivo:** Crear un Columnas de modo sin fin en `/juegos/columnas/jugar` en el que cada 25 gemas llega un **trío prisma** que borra del pozo todas las gemas del color sobre el que aterriza, con fila nueva en el catálogo, portada propia y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, los tres ya portados, y `columnas` es el único candidato de `references/game-suggestions-todo.md` que **no viene del prototipo** `references/templates/`. Las reglas, constantes, puntuación y dibujo de esta variante se **definen aquí** (decisiones de la jam, derivadas del Columns de Sega de 1990 y de la ficha 009), no se extraen de un `game.js`. La mecánica de la **gema prisma** y toda su aritmética son originales de esta jam. Por eso las constantes de la sección Alcance son la **fuente de verdad** para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## En qué se diferencia de TETRIS

La ficha 009 descartó este juego por **diversidad**: «aportaría un segundo juego que se _siente_ como el que ya existe (`tetris`)». Esta variante responde con cinco diferencias estructurales más una sexta que sólo ella tiene. Si al implementarla alguna se pierde, la variante deja de cumplir su objetivo.

1. **La pieza no rota: se cicla.** En TETRIS hay 7 tetrominós de 4 bloques que giran en el plano y necesitan wall kicks `[0, -1, 1, -2, 2]`. Aquí hay **una sola pieza**, un trío vertical de 3 gemas que ocupa siempre 1 columna × 3 filas y **nunca cambia de forma**. `↑` no gira nada: **permuta los colores dentro de la columna**. No hay wall kicks porque no hay nada que desplazar.
2. **No existen las líneas.** Una fila llena **no hace nada** si los colores no casan, y tres gemas iguales en medio del pozo se borran aunque la fila esté medio vacía. El HUD **no tiene el campo LÍNEAS** y el motor no implementa `onLines`.
3. **Se elimina en cuatro ejes, incluidas las dos diagonales.** Horizontal, vertical, diagonal ↘ y diagonal ↗. La diagonal es una dirección de juego que TETRIS no tiene en ninguna forma.
4. **Hay cascadas encadenadas.** En TETRIS las líneas se limpian a la vez y **nunca** encadenan. Aquí, borrar gemas hace caer las de arriba, que pueden volver a casar, y cada vuelta multiplica (×1, ×2, ×4, ×8, ×16).
5. **El recurso del jugador es el color, no el espacio.** No puede haber huecos: la gravedad compacta cada columna. Pozo de **6×13** frente a 10×20 y pieza de **3** gemas frente a 4 bloques.
6. **El prisma: una acción que en TETRIS no puede existir.** Cada 25 gemas llega un trío que, al posarse, **borra del pozo todas las gemas del color que tenga debajo**. Es una jugada cuyo valor depende por completo de la **composición cromática** del pozo —no de su forma—, y por tanto no tiene análogo posible en un juego donde el color de las piezas es decorativo. Es el motivo por el que esta variante es la que más distancia pone con TETRIS.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (`INSERT`, no `UPDATE`: `columnas` no viene del prototipo, nunca tuvo fila placeholder y nunca ha habido `scores` con ese `game_id`, así que tampoco hace falta `delete from public.scores`). Migración `supabase/migrations/<timestamp>_game_columnas.sql` aplicada con `apply_migration`:
   - `id: "columnas"`, `title: "COLUMNAS"`, `category: "PUZZLE"`, `color: "cyan"`, `cover: "cover-columnas"` (**clase nueva**, se crea en este spec), `sort_order: 8` (1, 2, 3, 5 y 6 están ocupados; el 4 está comprometido con la jam de `gloton` y el 7 con la de `invasores`).
   - `short`: `Alinea tres gemas iguales en cualquier dirección.`
   - `long` describe **sólo** lo que esta variante tiene: pozo 6×13, trío que se cicla, alineación en los cuatro ejes, cascadas con multiplicador, **trío prisma cada 25 gemas** y fin por desbordamiento. **No menciona** niveles, vetas, rocas, vidas ni sonido.
   - `lib/home-data.ts` no menciona «Columnas»: no se toca.
2. **Portada** — `.cover-columnas` nueva en `app/globals.css`, en el bloque `/* ===== Cover art generators (pure CSS) ===== */`, con el mismo patrón que `.cover-tetro` (clase base + `::after`): fondo `radial-gradient` oscuro azulado y tres columnas de gemas de colores, una de ellas con el destello del prisma, con `drop-shadow` cian. Sin imágenes.
3. **Motor** en `lib/games/columnas/`: `constants.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createColumnasGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onPrism(gemsLeft)`, `onGameOver(finalScore)`, `onTogglePause()`. **Sin** `onLives`, **sin** `onLines`, **sin** `onLevel`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms y acumulador de tiempo para la caída (paso discreto de una fila, no interpolado). `destroy()` cancela rAF, quita los listeners de teclado y la suscripción al mando virtual.
   - **Constantes base** (canvas lógico **360×520**):
     - Pozo: `COLS = 6`, `ROWS = 13`, `CELL = 40` → 240×520 px, origen en `(0, 0)`. Panel **SIGUIENTE** de `PANEL_W = 120` px a la derecha.
     - Gemas: `GEM_COLORS = 6` → cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`, verde `#00ff88`, naranja `#ff7700`, violeta `#aa00ff`. Cada color lleva un **glifo** distinto centrado (círculo, rombo, cruz, triángulo, anillo, cuadrado).
     - Trío normal: 3 gemas de color elegido uniformemente al azar entre los 6, con repetición permitida.
     - Aparición: `SPAWN_COL = 3` (la cuarta de 6, índice 0), ocupando las filas 0, 1 y 2.
     - Caída: `dropInterval = max(150, 800 − floor(gemasEliminadas / 15) × 50)` ms. Arranca en 800 ms y llega al suelo de 150 ms a las 195 gemas.
     - Descenso rápido: con `↓` mantenida el intervalo pasa a `SOFT_MS = 50` ms y cada fila ganada suma **+1 punto**.
     - Caída instantánea: `ESPACIO` baja el trío hasta posarse, **+1 punto por fila** recorrida, y lo fija en el acto.
     - Resolución: `CLEAR_FLASH_MS = 180` de parpadeo antes de borrar; `CHAIN_MULT = [1, 2, 4, 8, 16]` (escalón 1..5+, tope ×16); `GEM_POINTS = 10`.
   - **Constantes del twist:**
     - `PRISM_EVERY = 25` gemas eliminadas entre prisma y prisma.
     - `PRISM_MULT = 2` (el barrido puntúa a ×2 y cuenta como escalón 1).
     - `PRISM_BONUS = 200` por prisma que llega a barrer.
     - La gema prisma es un **séptimo valor de celda**, gris acero `#9aa7b4` con un destello giratorio y sin glifo de color: **no casa con ninguna gema, ni siquiera con otra prisma**.
   - **Reglas base:**
     - `start()` genera el primer trío y arranca la caída; también se precalcula el **siguiente** trío, que se dibuja en el panel SIGUIENTE (si el siguiente es un prisma, se ve como tal).
     - `←`/`→` mueven el trío una columna si la celda de destino de las tres gemas está libre; si no, el movimiento se ignora.
     - `↑`/`X` ciclan los colores del trío (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`); funciona pegado a la pared y durante el descenso rápido. En un trío prisma el ciclado es legal pero no cambia nada visible (las tres gemas son iguales).
     - El trío baja una fila cada `dropInterval` y se **posa** cuando la celda inmediatamente inferior a su gema de abajo está ocupada o es el suelo (`fila 12`). Al posarse se fija **al instante**, sin lock delay.
     - **Resolución** (bucle, cada vuelta es un escalón `k`, empezando en 1):
       1. Recorrer el pozo y marcar toda serie de **3 o más gemas consecutivas del mismo color** en los cuatro ejes: horizontal `→`, vertical `↓`, diagonal `↘` y diagonal `↗`. Las gemas prisma **nunca** forman serie. Una gema en varias series se marca **una sola vez**.
       2. Si no hay nada marcado, la resolución acaba y se genera el trío siguiente.
       3. Si hay `g` gemas marcadas: sumar `g × GEM_POINTS × CHAIN_MULT[min(k, 5) − 1]`, parpadear `CLEAR_FLASH_MS`, borrarlas, compactar cada columna hacia abajo, `k++` y volver al paso 1.
     - Durante la resolución no hay trío controlable y las teclas de juego no actúan; `P`/`Escape` sí pausan y congelan también el parpadeo.
   - **Reglas del twist «la gema prisma»:**
     - El motor lleva un contador `gemsToPrism`, que empieza en `PRISM_EVERY = 25` y baja 1 por **cada gema eliminada** (de alineación o de barrido; el descenso rápido no cuenta). Nunca baja de 0. `onPrism(gemsToPrism)` emite sólo en cambios reales.
     - En cuanto `gemsToPrism` llega a 0, **el siguiente trío que se genere** es un **trío prisma** (tres gemas prisma) y, en ese mismo instante, `gemsToPrism` vuelve a 25.
     - **Barrido:** al posarse un trío prisma, se mira la celda **inmediatamente debajo** de su gema inferior:
       - Si contiene una gema de color `C`, se eliminan del pozo **todas** las gemas de color `C` —estén donde estén— más las tres gemas prisma del trío. Puntúa `g × GEM_POINTS × PRISM_MULT` donde `g` es el número de gemas de color `C` eliminadas (las tres prisma **no** puntúan), más `PRISM_BONUS = 200`. El barrido cuenta como **escalón 1**, así que las cascadas que desencadene siguen en el escalón 2 (×2), 3 (×4), etc.
       - Si contiene una **gema prisma** inerte (ver abajo), el barrido elimina **todas las gemas prisma del pozo**, incluidas las tres del trío, a `GEM_POINTS × PRISM_MULT` cada una, más `PRISM_BONUS`.
       - Si no hay nada debajo porque el trío se posó en el suelo, **no hay barrido**: las tres gemas prisma se quedan en el pozo como **gemas inertes** y no se suma `PRISM_BONUS`. Las inertes sólo salen del pozo con un barrido posterior que aterrice sobre una de ellas.
     - Tras el barrido se compacta cada columna y la resolución continúa con el bucle normal.
   - **Puntuación:**
     - Gema eliminada por alineación: **10 puntos** × el multiplicador del escalón (×1, ×2, ×4, ×8, ×16).
     - Gema eliminada por barrido de prisma: **10 × 2 = 20 puntos**, más **200** de bonus por prisma barrido.
     - Descenso rápido y caída instantánea: **+1 punto por fila** recorrida.
     - Ejemplo: un prisma cae sobre un pozo con 11 gemas cianes → `11 × 10 × 2 + 200 = 420`; si al compactar se forma una alineación de 4, el escalón 2 suma `4 × 10 × 2 = 80`; total 500.
     - **Puntuación máxima: no acotada por diseño**, igual que el TETRIS ya implementado (modo sin fin). El motor emite siempre `Math.min(score, 9_999_999)`, de modo que el `CHECK` de `scores` **no puede romperse**. Referencia práctica: una partida larga de un jugador competente queda entre **15 000 y 40 000**, bastante por encima de la variante A porque el prisma convierte el pozo lleno en puntos en vez de en derrota.
   - **Fin de partida (inequívoco):** al generar un trío nuevo —normal o prisma—, si alguna de las celdas `(SPAWN_COL, fila 0)`, `(SPAWN_COL, fila 1)` o `(SPAWN_COL, fila 2)` está ocupada → `onGameOver(score)` **una sola vez**; después el canvas queda congelado. No hay victoria: es un modo sin fin.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): fondo del pozo con rejilla tenue de 40 px, gemas con su glifo, **gemas prisma con su destello**, trío en caída, parpadeo de las gemas marcadas, **destello de barrido** de 180 ms sobre todas las gemas del color barrido, y panel **SIGUIENTE**. Sin puntuación escrita, sin cuenta atrás del prisma escrita en canvas, sin overlays.
   - Sin audio.
4. **Componente cliente** `components/columnas-canvas.tsx` (`"use client"`), mismo patrón que `components/tetris-canvas.tsx` (que ya usa el callback opcional `onLines`): callbacks vía ref, props `paused` y `restartKey`, `onPrism` opcional, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **360×520** escalado por CSS dentro de `.crt-screen` con `aspect: "9 / 13"`.
5. **Ampliación del contrato (`hasPrism` / `onPrism`)** — calcada del par `hasLines` / `onLines` que introdujo el SPEC 07:
   - `lib/games/types.ts`: `GameCanvasProps` gana `onPrism?: (gemsLeft: number) => void`.
   - `lib/games/registry.ts`: `GameEntry` gana `hasPrism?: boolean // true: el HUD añade PRISMA`.
   - `components/game-player.tsx`: si la entrada tiene `hasPrism`, el HUD añade el campo `PRISMA` junto a PUNTOS/NIVEL, alimentado por `onPrism` y reiniciado a `PRISM_EVERY` en cada partida. Ningún juego existente declara `hasPrism`, así que ninguno cambia.
6. **Registro y reproductor** — entrada `columnas` con:
   - HUD: puntuación y **PRISMA** (`hasPrism: true`). `hasLives: false`, **`hasLines` ausente** (no hay líneas en este juego), `engineLevel: false` → el HUD muestra el nivel derivado `floor(score / 2500) + 1`; aceptado, sin lógica de nivel en el motor.
   - `blockStyles: BLOCK_STYLES` (reutiliza el selector que ya usan los cinco juegos).
   - Sin chip de sonido, sin salto de nivel.
   - Mando táctil: `touch: { dpad: ["up","down","left","right"], buttons: [{ id: "a", label: "CICLAR" }, { id: "b", label: "CAÍDA" }] }`, sobre el canal `VirtualPad` del SPEC 10.
7. **Controles:**
   - `←`/`→` mover de columna · `↓` descenso rápido · `↑` o `X` ciclar los colores del trío · `ESPACIO` caída instantánea · `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - En táctil: cruz de 4 direcciones (arriba = ciclar, abajo = descenso rápido) y botones **A** (CICLAR) y **B** (CAÍDA), leídos desde `pad` en `input.ts`.
   - `preventDefault` sólo en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp` y `Space` (no en `X`, `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada las teclas de juego no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → mover · ↑ ciclar · ↓ bajar · ESPACIO caída · P pausa`.
8. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "columnas", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=columnas`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
9. **Pulido visual** con `/frontend-design`: portada `.cover-columnas`, paleta y glow de las seis gemas, **tratamiento del prisma** (gris acero con destello, inconfundible con las seis gemas de color), destello del barrido, campo `PRISMA` del HUD, parpadeo de eliminación, panel SIGUIENTE, hint de controles y overlay de pausa. Verificar que `.crt-fit` limita bien el ancho con el aspecto 9/13.
10. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Niveles, vetas, objetivos, salto de nivel (`levelJump`), gemas de roca u obstáculos.
- Más de un prisma simultáneo, prismas que el jugador pueda guardar o invocar, o prismas que barran por forma en vez de por color.
- Vidas, continuar, guardado de partida en curso, pantalla completa.
- Audio de cualquier tipo (y por tanto chip `SONIDO` y slider de volumen).
- Animación de caída de las gemas tras una eliminación (la gravedad es instantánea tras el parpadeo).
- Modo contrarreloj, modo con pozo precargado, modos de dificultad o tamaños de pozo alternos.
- Ciclado inverso del trío, hold, bolsa de piezas, fantasma de aterrizaje.
- Un techo de puntuación o condición de victoria.
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos del catálogo (Glotón, Invasores, Duelo Pixel).
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Es un `INSERT`: no hay fila previa ni `scores` que borrar.

```sql
insert into public.games (id, title, short, long, category, color, cover, sort_order)
values (
  'columnas',
  'COLUMNAS',
  'Alinea tres gemas iguales en cualquier dirección.',
  'Tríos de gemas caen en un pozo de 6×13. No puedes girar la pieza: sólo moverla de columna y rotar el orden de sus tres colores. Alinea tres o más gemas iguales en horizontal, vertical o en cualquiera de las dos diagonales y desaparecen; lo que quede encima cae y puede volver a casar, encadenando multiplicadores de hasta ×16. Cada 25 gemas llega un trío prisma: allí donde lo poses borra del pozo todas las gemas del color que tenga debajo y suma doble. La partida acaba cuando el pozo se desborda.',
  'PUZZLE',
  'cyan',
  'cover-columnas',
  8
);
```

Tipos públicos del motor:

```ts
export type ColumnasCallbacks = {
  onScore: (score: number) => void;
  onPrism: (gemsLeft: number) => void; // gemas que faltan para el próximo prisma
  onGameOver: (finalScore: number) => void;
  onTogglePause: () => void;
};

export type ColumnasGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF, quita listeners de teclado y desuscribe el pad
};

export type GemColor = 0 | 1 | 2 | 3 | 4 | 5;
export const PRISM = 6 as const; // séptimo valor de celda: la gema prisma
export type GemValue = GemColor | typeof PRISM;
export type Cell = GemValue | null; // null = celda vacía
export type Board = Cell[][]; // [fila][columna], 13 × 6
export type Trio = {
  col: number;
  row: number;
  gems: [GemValue, GemValue, GemValue];
  prism: boolean;
};
export type Phase = "falling" | "flashing" | "sweeping" | "over";
```

Ampliación del contrato (dos líneas nuevas, patrón `hasLines`/`onLines` del SPEC 07):

```ts
// lib/games/types.ts — GameCanvasProps
onPrism?: (gemsLeft: number) => void;

// lib/games/registry.ts — GameEntry
hasPrism?: boolean; // true: el HUD añade PRISMA
```

Entrada del registro:

```ts
columnas: {
  Canvas: ColumnasCanvas,
  controls: [
    { keys: ["←", "→"], label: "mover" },
    { keys: ["↑"], label: "ciclar" },
    { keys: ["↓"], label: "bajar" },
    { keys: ["ESPACIO"], label: "caída" },
    { keys: ["P"], label: "pausa" },
  ],
  engineLevel: false,
  hasLives: false,
  hasPrism: true,
  blockStyles: BLOCK_STYLES,
  aspect: "9 / 13",
  touch: {
    dpad: ["up", "down", "left", "right"],
    buttons: [
      { id: "a", label: "CICLAR" },
      { id: "b", label: "CAÍDA" },
    ],
  },
},
```

Archivos:

```
supabase/migrations/<timestamp>_game_columnas.sql   // nuevo: INSERT de la fila
lib/games/columnas/constants.ts                     // nuevo: COLS, ROWS, CELL, PANEL_W, GEM_COLORS, GLYPHS, PRISM, SPAWN_COL, dropInterval, SOFT_MS, CLEAR_FLASH_MS, CHAIN_MULT, GEM_POINTS, PRISM_EVERY, PRISM_MULT, PRISM_BONUS
lib/games/columnas/entities.ts                      // nuevo: pozo, trío (normal y prisma), ciclado, colisión, series en 4 ejes, barrido por color, gravedad por columna, dibujo de gema con glifo y de prisma
lib/games/columnas/input.ts                         // nuevo: teclado + VirtualPad, attach/detach
lib/games/columnas/engine.ts                        // nuevo: createColumnasGame, cascadas y lógica del prisma
components/columnas-canvas.tsx                      // nuevo
lib/games/types.ts                                  // modificado: onPrism en GameCanvasProps
lib/games/registry.ts                               // modificado: hasPrism en GameEntry + entrada columnas
components/game-player.tsx                          // modificado: campo PRISMA del HUD cuando hasPrism
app/globals.css                                     // modificado: .cover-columnas nueva (+ campo PRISMA y ajustes de pulido)
references/catalogo-juegos.md                       // modificado: añadir la fila al snapshot (y la de frogger, que falta)
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `games` no tiene fila `columnas` y que `sort_order: 8` sigue libre; comprobar con `grep '^\.cover-' app/globals.css` que `.cover-columnas` no existe; releer cómo el SPEC 07 cableó `hasLines`/`onLines` en `game-player.tsx`.
2. **Migración del catálogo y portada** — SQL en `supabase/migrations/` + `apply_migration`; `.cover-columnas` en `app/globals.css`. Verificar `/juegos/columnas` con la portada nueva, la card en biblioteca y home, y el leaderboard vacío.
3. **Contrato `hasPrism`/`onPrism`** — añadir las dos líneas a `types.ts` y `registry.ts` y el campo `PRISMA` a `game-player.tsx`. Verificar que los cinco juegos existentes no cambian (ninguno declara `hasPrism`).
4. **Constantes** — portar a TypeScript estricto todos los números de la sección Alcance, incluidos los del twist.
5. **Entidades** — pozo como `Cell[13][6]`, trío con `col`/`row`/`gems`/`prism`, ciclado, colisión, **búsqueda de series en los cuatro ejes con marcado en `Set`** (las prisma nunca forman serie), **barrido por color**, gravedad por columna, dibujo de gema con glifo y de prisma con destello, todo recibiendo `ctx` por parámetro.
6. **Input** — `attachInput(canvas, pad)` que devuelve su limpieza; teclado y `VirtualPad`; `preventDefault` sólo en las teclas del juego; ignora `input`/`textarea` y modificadores.
7. **Motor base (jugable)** — fases `falling`/`flashing`/`over`, acumulador de caída con `dt` ≤ 50 ms, fijado inmediato, bucle de resolución con escalones y multiplicador, fin por desbordamiento. Sin prisma todavía: deja el juego funcional y verificable.
8. **Motor: la gema prisma** — contador `gemsToPrism`, generación del trío prisma, fase `sweeping`, barrido por color y por prisma inerte, `PRISM_BONUS`, encadenado con el escalón 2 en adelante. Verificar con una partida que el contador baja, que el prisma llega a las 25 gemas y que barrer el color dominante puntúa lo esperado.
9. **Componente `ColumnasCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 360×520, `pad`, `onPrism`.
10. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover, ciclar, descenso rápido, caída instantánea, alineación en los cuatro ejes, cascada de 2 y de 3 escalones, prisma sobre una gema, prisma en el suelo dejando inertes, prisma sobre una inerte, desbordar el pozo), guardar iniciales, ver la marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil con el mando táctil. Capturas en `.playwright-screenshot`. Actualizar `references/catalogo-juegos.md`.
11. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'columnas'`.

## Criterios de aceptación

- [ ] `/juegos/columnas/jugar` muestra el juego dentro del marco CRT con proporción 9/13 y canvas lógico 360×520: pozo de 6×13 celdas de 40 px y panel SIGUIENTE de 120 px.
- [ ] Al arrancar hay un trío de 3 gemas en la columna 3 (la cuarta), ocupando las filas 0, 1 y 2, el panel SIGUIENTE muestra el trío que viene y el HUD muestra `PRISMA 25`.
- [ ] `←`/`→` mueven el trío de columna y el movimiento se ignora si la columna destino no tiene libres las tres celdas; la página no hace scroll con las flechas ni con `ESPACIO`.
- [ ] `↑` y `X` **ciclan los colores** del trío (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`) sin mover la pieza ni cambiar su forma, y funcionan pegado a ambas paredes.
- [ ] La pieza **nunca** cambia de forma: siempre ocupa 1 columna × 3 filas. No hay wall kicks ni piezas de 4 bloques.
- [ ] `↓` baja una fila cada 50 ms mientras se mantiene y suma +1 por fila; `ESPACIO` posa el trío al instante sumando +1 por fila recorrida.
- [ ] Tres gemas iguales en **horizontal**, en **vertical**, en **diagonal ↘** y en **diagonal ↗** se eliminan; una fila de 6 gemas de colores distintos **no** elimina nada.
- [ ] Una serie de 4 o 5 gemas iguales se elimina entera, y una gema que pertenece a dos series a la vez se cuenta **una sola vez**.
- [ ] El escalón 1 puntúa `gemas × 10`, el 2 `× 2`, el 3 `× 4`, el 4 `× 8` y del 5 en adelante `× 16`; una alineación de 3 en el escalón 1 da exactamente 30 puntos.
- [ ] El campo `PRISMA` del HUD baja 1 por cada gema eliminada (de alineación o de barrido) y **no** baja con el descenso rápido.
- [ ] Al llegar `PRISMA` a 0, el siguiente trío generado es un trío prisma visualmente inconfundible, y el contador vuelve a 25 en ese instante.
- [ ] Un prisma posado sobre una gema de color `C` elimina **todas** las gemas de color `C` del pozo y las tres prisma, suma `gemas de C × 20 + 200` y deja que las cascadas sigan en el escalón 2.
- [ ] Un prisma posado en el suelo sin nada debajo **no** barre, **no** suma los 200 y deja tres gemas prisma inertes que no casan con nada.
- [ ] Un prisma posado sobre una gema prisma inerte elimina **todas** las gemas prisma del pozo y suma `prismas × 20 + 200`.
- [ ] Las gemas prisma **nunca** forman serie entre ellas ni con gemas de color.
- [ ] El HUD React muestra puntuación y PRISMA en tiempo real; **no** muestra vidas y **no** muestra LÍNEAS; el canvas no dibuja ninguno de los dos ni overlays.
- [ ] Cada color de gema lleva su glifo interior distinto y las seis gemas se distinguen en escala de grises; la prisma se distingue de las seis.
- [ ] Generar un trío con alguna de las celdas `(col 3, filas 0/1/2)` ocupada abre el modal "FIN DEL JUEGO" con la puntuación correcta, **una sola vez**; el botón FIN también lo abre.
- [ ] No hay condición de victoria ni techo de puntuación; la puntuación emitida nunca supera 9 999 999.
- [ ] No hay audio ni chip `SONIDO` en Columnas.
- [ ] PAUSA congela la caída, el parpadeo de una cascada en curso **y el destello de un barrido en curso**; REANUDAR continúa sin saltos; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En móvil aparece el mando con cruz de 4 direcciones y botones CICLAR y CAÍDA, y el juego es jugable sólo con él.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "columnas"`; iniciales inválidas se rechazan sin cerrar el modal; escribir en el input del modal no mueve el trío.
- [ ] La marca aparece en `/salon?juego=columnas`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, `PRISMA 25`, pozo vacío, intervalo de caída 800 ms y trío inicial, sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` conservan comportamiento y HUD, y **ninguno** muestra el campo PRISMA.
- [ ] `games` contiene la fila `columnas` con `title: COLUMNAS`, `category: PUZZLE`, `color: cyan`, `cover: cover-columnas`, `sort_order: 8`, y respeta los `CHECK`.
- [ ] `.cover-columnas` existe en `app/globals.css` y se ve en la card, el detalle y el Salón.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 9/13.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `INSERT` de una fila nueva en `games` — `columnas` no viene del prototipo y nunca tuvo placeholder. **No:** `UPDATE` de una fila existente ni `delete from public.scores` previo (sería un no-op).
- **Sí:** `sort_order: 8`. **No:** el `4` (jam de `gloton`), el `5` (lo ocupó `frogger`) ni el `7` (jam de `invasores`).
- **Sí:** crear `.cover-columnas`, como avisaba la ficha 009. **No:** reutilizar `.cover-rana` ni `.cover-duelo`, las únicas huérfanas: una rana y dos palas de Pong no representan gemas.
- **Sí:** `color: cyan`. **No:** `magenta`, que proponía la ficha 009: es el color de `tetris` y en la biblioteca los dos PUZZLE saldrían con el mismo neón.
- **Sí:** **una sola** mecánica propia, el prisma, elegida porque ataca directamente la objeción de diversidad de la ficha 009: es una acción basada en la **composición cromática** del pozo, imposible de replicar en TETRIS. **No:** apilar también rocas, objetivos o vetas (serían varias mecánicas y otro juego: eso es la variante C).
- **Sí:** el prisma barre el color que tiene **debajo**, así que el jugador decide dónde posarlo mirando qué color domina. **No:** barrer el color más abundante automáticamente (quitaría la decisión y convertiría el prisma en un botón de «más puntos»).
- **Sí:** barrido a ×2 contando como escalón 1, de modo que las cascadas que provoca siguen en ×2, ×4, ×8, ×16. **No:** barrido a ×1 (la fórmula de B dejaría de diferenciarse de la de A, que es el motivo de existir del twist) ni barrido a ×16 fijo (una sola jugada decidiría la partida).
- **Sí:** `PRISM_BONUS = 200` fijo por prisma barrido, para que el prisma valga la pena incluso sobre un color poco presente. **No:** bonus proporcional a las gemas barridas (ya lo cubre el ×2).
- **Sí:** cada 25 gemas eliminadas, contadas también las del propio barrido. **No:** cada N tríos (premiaría dejar caer piezas sin jugar) ni cada N segundos (premiaría esperar).
- **Sí:** un prisma posado en el suelo se queda inerte y penaliza al jugador por malgastarlo. **No:** que barra «el color más cercano» o que se autodestruya sin consecuencia (el error dejaría de costar).
- **Sí:** las gemas prisma inertes se limpian con un prisma posterior que aterrice sobre una de ellas. **No:** dejarlas imborrables (tres inertes mal puestas podrían hacer la partida injugable para siempre).
- **Sí:** las gemas prisma no casan con nada, ni entre ellas. **No:** que tres prismas alineadas cuenten como serie (haría trivial deshacerse de las inertes y rompería el castigo del punto anterior).
- **Sí:** ampliar el contrato con `hasPrism`/`onPrism`, calcado de `hasLines`/`onLines` del SPEC 07. **No:** reutilizar `onLines` con otro significado (el HUD diría LÍNEAS y este juego **no tiene líneas**, que es la diferencia 2 con TETRIS) ni dibujar la cuenta atrás en el canvas (el HUD React sí puede mostrarla).
- **Sí:** mantener intacta toda la base de la variante A (pozo, ciclado, 4 ejes, cascadas, aceleración, fin por desbordamiento). **No:** tocar velocidades ni balance para «compensar» el twist.
- **Sí:** eliminación en los cuatro ejes, incluidas las dos diagonales. **No:** recortar a horizontal y vertical: la diagonal es una de las diferencias con TETRIS.
- **Sí:** una gema en varias series se cuenta una sola vez, marcando en un `Set`. **No:** sumar por serie (un cruce en L puntuaría dos veces la misma gema).
- **Sí:** fijado inmediato al posarse. **No:** lock delay estilo TETRIS moderno.
- **Sí:** aceleración por gemas eliminadas, sin campo de nivel. **No:** velocidad constante ni un «nivel» inventado para llenar el HUD.
- **Sí:** glifo interior por color. **No:** gemas de color plano.
- **Sí:** puntuación sin techo con clamp `Math.min(score, 9_999_999)`. **No:** cortar la partida al llegar al tope.
- **Sí:** `aspect: "9 / 13"` con canvas lógico 360×520 y panel SIGUIENTE. **No:** 240×520 sin panel: con prisma en juego, saber si el siguiente trío es prisma es información crítica.
- **Sí:** mando táctil con cruz de 4 y botones A/B, calcado del de `tetris`. **No:** sólo izquierda/derecha.
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos. **No:** `setInterval`.
- **Sí:** motor TypeScript con `createColumnasGame(canvas, callbacks)`. **No:** `iframe` ni `next/script`.
- **Sí:** HUD y modal de fin en React. **No:** HUD ni overlays en canvas.
- **Sí:** guardado con `submitScore` existente. **No:** tablas por juego ni `localStorage`.

## Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                                              |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **El juego acaba sintiéndose como TETRIS** y repite la objeción de la ficha 009 | La sección `## En qué se diferencia de TETRIS` lista seis diferencias y cada una tiene su criterio de aceptación; ninguna es opcional.  |
| Strict Mode duplica loop o listeners                                            | `destroy()` completo (rAF, teclado y desuscripción del pad); criterio de aceptación explícito.                                          |
| Teclas del juego interfieren con el input del modal                             | Ignorar eventos con target `input`/`textarea` y con modificadores; pausar al abrir el modal.                                            |
| `dt` grande al volver a la pestaña                                              | Tope de 50 ms y pausa con `visibilitychange`.                                                                                           |
| El prisma sobre el color dominante regala puntuaciones enormes                  | El barrido es ×2 y no escala con el escalón; el techo práctico declarado (15 000–40 000) ya lo contempla y el bonus es fijo.            |
| El jugador acumula un solo color a propósito para farmear prismas               | Acumular un color sube el pozo y acerca el desbordamiento; el riesgo de la estrategia es su propio contrapeso. Se valida en el paso 10. |
| Las gemas prisma inertes dejan la partida injugable                             | Se limpian con un prisma posterior posado sobre una de ellas; criterio de aceptación propio.                                            |
| El prisma no se distingue de las gemas de color                                 | Gris acero sin glifo de color y con destello giratorio; validación visual en el paso 10 con `/frontend-design`.                         |
| Tocar `game-player.tsx` rompe el HUD de los cinco juegos existentes             | `hasPrism` es opcional y ningún juego lo declara; paso 3 y criterio de aceptación lo verifican antes de seguir.                         |
| `onPrism` emitiendo en cada frame provoca renders de más                        | El motor sólo llama al callback cuando el valor cambia, como ya hace `onLines` en Tetris.                                               |
| La búsqueda de series cuenta dos veces una gema de un cruce                     | Marcado en un `Set` de celdas y suma única por escalón; criterio de aceptación propio.                                                  |
| La búsqueda en 4 ejes sobre 78 celdas cada frame es costosa                     | Sólo se ejecuta al fijar un trío y entre escalones, nunca por frame.                                                                    |
| Una cascada infinita bloquea el bucle                                           | Cada escalón borra al menos 3 gemas de un pozo de 78, así que termina en ≤ 26 escalones.                                                |
| El parpadeo o el destello de barrido no se congelan al pausar                   | Ambos temporizadores usan el mismo acumulador de `dt` que la caída; criterio de aceptación explícito.                                   |
| La partida sin fin desborda el `CHECK` de `scores`                              | `Math.min(score, 9_999_999)` al emitir; criterio de aceptación.                                                                         |
| Portada nueva desentona con las del prototipo                                   | `.cover-columnas` se construye con el mismo patrón que `.cover-tetro` y se revisa en el paso 10.                                        |
| Scores falsos con clave publishable                                             | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                            |
| Un solo proyecto Supabase para dev y prod                                       | Limpiar filas de prueba de `scores` al cerrar (paso 11).                                                                                |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                         | La fila, la ruta `/juegos/columnas` y la carpeta `lib/games/columnas` usan el mismo slug.                                               |
| `sort_order: 8` deja de estar libre si otra rama inserta antes                  | El paso 1 lo reconfirma con un `select` antes de escribir la migración.                                                                 |

## Qué **no** está en este spec

- Niveles, vetas, objetivos, salto de nivel, gemas de roca y cualquier obstáculo.
- Varios prismas a la vez, prismas guardables o prismas que barran por forma.
- Audio de cualquier tipo.
- Animación de caída tras eliminar, ciclado inverso, hold, bolsa de piezas y fantasma de aterrizaje.
- Vidas, continuar, pantalla completa y guardado de partida.
- Techo de puntuación, condición de victoria, modos de dificultad y tamaños de pozo alternos.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
