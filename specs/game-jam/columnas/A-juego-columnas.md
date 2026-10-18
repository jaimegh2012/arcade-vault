# COLUMNAS — variante A: mínima fiel

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 10
- **Fecha:** 2026-10-18
- **Game jam:** tema «COLUMNAS (`columnas`), el puzzle de tríos de gemas que caen y se destruyen al alinear tres iguales en cualquier dirección, con reacciones en cadena» · variante A de 3 · hermanas `B-juego-columnas.md`, `C-juego-columnas.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/NN-juego-columnas.md` y ejecutar `/spec-impl NN-juego-columnas`

**Objetivo:** Crear un Columnas clásico de modo sin fin en `/juegos/columnas/jugar` —trío vertical de gemas que se cicla, alineaciones de tres en los cuatro ejes y cascadas encadenadas— con fila nueva en el catálogo, portada propia y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, los tres ya portados, y `columnas` es el único candidato de `references/game-suggestions-todo.md` que **no viene del prototipo** `references/templates/`. Las reglas, constantes, puntuación y dibujo de esta variante se **definen aquí** (decisiones de la jam, derivadas del Columns de Sega de 1990 y de la ficha 009), no se extraen de un `game.js`. Por eso las constantes de la sección Alcance son la **fuente de verdad** para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## En qué se diferencia de TETRIS

La ficha 009 descartó este juego por **diversidad**: «aportaría un segundo juego que se _siente_ como el que ya existe (`tetris`)». Esta variante responde con cinco diferencias estructurales, no cosméticas. Si al implementarla alguna se pierde, la variante deja de cumplir su objetivo.

1. **La pieza no rota: se cicla.** En TETRIS hay 7 tetrominós de 4 bloques que giran en el plano y necesitan wall kicks `[0, -1, 1, -2, 2]`. Aquí hay **una sola pieza**, un trío vertical de 3 gemas que ocupa siempre 1 columna × 3 filas y **nunca cambia de forma**. `↑` no gira nada: **permuta los colores dentro de la columna** (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`). No hay wall kicks porque no hay nada que desplazar.
2. **No existen las líneas.** En TETRIS se elimina una fila completa de 10 celdas. Aquí una fila llena **no hace absolutamente nada** si los colores no casan, y tres gemas iguales en medio del pozo se borran aunque la fila esté medio vacía. El HUD de esta variante **no tiene el campo LÍNEAS** y el motor no implementa `onLines`.
3. **Se elimina en cuatro ejes, incluidas las dos diagonales.** Horizontal, vertical, diagonal ↘ y diagonal ↗. La diagonal es una dirección de juego que TETRIS no tiene en ninguna forma, y es la que obliga a leer el pozo como una rejilla de color y no como un perfil de alturas.
4. **Hay cascadas encadenadas.** En TETRIS las líneas se limpian a la vez y **nunca** encadenan: lo que cae después no vuelve a puntuar solo. Aquí, borrar gemas hace caer las de arriba, que pueden volver a casar, y cada vuelta multiplica (×1, ×2, ×4, ×8, ×16). Una jugada puede resolverse sola durante varios segundos mientras la puntuación sube.
5. **El recurso del jugador es el color, no el espacio.** En TETRIS el error se paga con huecos tapados que no se pueden recuperar. Aquí **no puede haber huecos**: la gravedad compacta cada columna, así que el pozo es siempre macizo y el reto es cromático. Además el pozo mide **6×13** y no 10×20, y la pieza tiene 3 gemas y no 4 bloques.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (`INSERT`, no `UPDATE`: `columnas` no viene del prototipo, nunca tuvo fila placeholder y nunca ha habido `scores` con ese `game_id`, así que tampoco hace falta `delete from public.scores`). Migración `supabase/migrations/<timestamp>_game_columnas.sql` aplicada con `apply_migration`:
   - `id: "columnas"`, `title: "COLUMNAS"`, `category: "PUZZLE"`, `color: "cyan"`, `cover: "cover-columnas"` (**clase nueva**, se crea en este spec), `sort_order: 8` (1, 2, 3, 5 y 6 están ocupados; el 4 está comprometido con la jam de `gloton` y el 7 con la de `invasores`).
   - `short`: `Alinea tres gemas iguales en cualquier dirección.`
   - `long` describe **sólo** lo que esta variante tiene: pozo 6×13, trío que se cicla, alineación en los cuatro ejes, cascadas con multiplicador, aceleración por gemas eliminadas y fin por desbordamiento. **No menciona** prisma, niveles, rocas, vidas ni sonido.
   - `lib/home-data.ts` no menciona «Columnas»: no se toca.
2. **Portada** — `.cover-columnas` nueva en `app/globals.css`, en el bloque `/* ===== Cover art generators (pure CSS) ===== */`, con el mismo patrón que `.cover-tetro` (clase base + `::after`): fondo `radial-gradient` oscuro azulado y tres columnas de gemas de colores con `drop-shadow` cian. Sin imágenes.
3. **Motor** en `lib/games/columnas/`: `constants.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createColumnasGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onGameOver(finalScore)`, `onTogglePause()`. **Sin** `onLives`, **sin** `onLines`, **sin** `onLevel`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms y acumulador de tiempo para la caída (paso discreto de una fila, no interpolado). `destroy()` cancela rAF, quita los listeners de teclado y la suscripción al mando virtual.
   - **Constantes** (canvas lógico **360×520**):
     - Pozo: `COLS = 6`, `ROWS = 13`, `CELL = 40` → 240×520 px, origen en `(0, 0)`. Panel **SIGUIENTE** de `PANEL_W = 120` px a la derecha.
     - Gemas: `GEM_COLORS = 6` → cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`, verde `#00ff88`, naranja `#ff7700`, violeta `#aa00ff`. Cada color lleva un **glifo** distinto centrado (círculo, rombo, cruz, triángulo, anillo, cuadrado) para que se distingan sin depender del color.
     - Trío: 3 gemas de color elegido uniformemente al azar entre los 6, con repetición permitida.
     - Aparición: `SPAWN_COL = 3` (la cuarta de 6, índice 0), ocupando las filas 0, 1 y 2.
     - Caída: `dropInterval = max(150, 800 − floor(gemasEliminadas / 15) × 50)` ms. Arranca en 800 ms y llega al suelo de 150 ms a las 195 gemas.
     - Descenso rápido: con `↓` mantenida el intervalo pasa a `SOFT_MS = 50` ms y cada fila ganada suma **+1 punto**.
     - Caída instantánea: `ESPACIO` baja el trío hasta posarse, **+1 punto por fila** recorrida, y lo fija en el acto.
     - Resolución: `CLEAR_FLASH_MS = 180` de parpadeo antes de borrar; `CHAIN_MULT = [1, 2, 4, 8, 16]` (escalón 1..5+, tope ×16); `GEM_POINTS = 10`.
   - **Reglas:**
     - `start()` genera el primer trío y arranca la caída; también se precalcula el **siguiente** trío, que se dibuja en el panel SIGUIENTE.
     - `←`/`→` mueven el trío una columna si la celda de destino de las tres gemas está libre; si no, el movimiento se ignora.
     - `↑`/`X` ciclan los colores del trío; el ciclado es siempre legal (no cambia las celdas ocupadas) y funciona también pegado a la pared y durante el descenso rápido.
     - El trío baja una fila cada `dropInterval`. Se **posa** cuando la celda inmediatamente inferior a su gema de abajo está ocupada o es el suelo (`fila 12`). Al posarse se fija **al instante**, sin lock delay, y las tres gemas pasan al pozo.
     - **Resolución** (bucle, cada vuelta es un escalón `k`, empezando en 1):
       1. Recorrer el pozo y marcar toda serie de **3 o más gemas consecutivas del mismo color** en los cuatro ejes: horizontal `→`, vertical `↓`, diagonal `↘` y diagonal `↗`. Una gema en varias series se marca **una sola vez**.
       2. Si no hay nada marcado, la resolución acaba y se genera el trío siguiente.
       3. Si hay `g` gemas marcadas: sumar `g × GEM_POINTS × CHAIN_MULT[min(k, 5) − 1]`, parpadear `CLEAR_FLASH_MS`, borrarlas, compactar cada columna hacia abajo (las gemas caen hasta apoyarse), `k++` y volver al paso 1.
     - Durante la resolución no hay trío controlable y las teclas de juego no actúan; `P`/`Escape` sí pausan y congelan también el parpadeo.
     - **Fin de partida (inequívoco):** al generar un trío nuevo, si alguna de las celdas `(SPAWN_COL, fila 0)`, `(SPAWN_COL, fila 1)` o `(SPAWN_COL, fila 2)` está ocupada → `onGameOver(score)` **una sola vez**; después el canvas queda congelado en el último estado. No hay victoria: es un modo sin fin.
   - **Puntuación:**
     - Gema eliminada: **10 puntos**, multiplicados por el escalón de cascada (×1, ×2, ×4, ×8, ×16).
     - Descenso rápido y caída instantánea: **+1 punto por fila** recorrida.
     - Ejemplo: una alineación de 3 en el escalón 1 da 30; si al caer se forma otra de 4 en el escalón 2, suma `4 × 10 × 2 = 80`; total 110.
     - **Puntuación máxima: no acotada por diseño**, igual que el TETRIS ya implementado (modo sin fin). El motor emite siempre `Math.min(score, 9_999_999)`, de modo que el `CHECK` de `scores` (`score between 0 and 9999999`) **no puede romperse** aunque la partida se alargue indefinidamente. Referencia práctica: una partida larga de un jugador competente queda entre **5 000 y 15 000**.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): fondo del pozo con rejilla tenue de 40 px, gemas del pozo con su glifo, trío en caída, parpadeo de las gemas marcadas y panel **SIGUIENTE** con el trío que viene. Sin puntuación escrita, sin overlay de pausa, sin overlay de fin, sin panel de controles.
   - Sin audio.
4. **Componente cliente** `components/columnas-canvas.tsx` (`"use client"`), mismo patrón que `components/tetris-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **360×520** escalado por CSS dentro de `.crt-screen` con `aspect: "9 / 13"`.
5. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `columnas` **sin cambios en el contrato** (`GameEntry` y `GameCanvasProps` ya tienen todo lo necesario):
   - HUD: puntuación y nada más. `hasLives: false`, **`hasLines` ausente** (no hay líneas en este juego), `engineLevel: false` → el HUD muestra el nivel derivado `floor(score / 2500) + 1`; aceptado, sin tocar `game-player.tsx`, igual que ya se aceptó en el SPEC 09.
   - `blockStyles: BLOCK_STYLES` (reutiliza el selector de estilo de bloque que ya usan los cinco juegos).
   - Sin chip de sonido (`hasSound` ausente) ni salto de nivel (`levelJump` ausente).
   - Mando táctil: `touch: { dpad: ["up","down","left","right"], buttons: [{ id: "a", label: "CICLAR" }, { id: "b", label: "CAÍDA" }] }`, sobre el canal `VirtualPad` del SPEC 10.
6. **Controles:**
   - `←`/`→` mover de columna · `↓` descenso rápido · `↑` o `X` ciclar los colores del trío · `ESPACIO` caída instantánea · `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - En táctil: cruz de 4 direcciones (arriba = ciclar, abajo = descenso rápido) y botones **A** (CICLAR) y **B** (CAÍDA), leídos desde `pad` en `input.ts`.
   - `preventDefault` sólo en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp` y `Space` (no en `X`, `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada las teclas de juego no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → mover · ↑ ciclar · ↓ bajar · ESPACIO caída · P pausa`.
7. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "columnas", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=columnas`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
8. **Pulido visual** con `/frontend-design`: portada `.cover-columnas`, paleta y glow de las seis gemas sobre el pozo, legibilidad de los glifos a tamaño 40 px y escalado, parpadeo de eliminación, panel SIGUIENTE, hint de controles y overlay de pausa. Verificar que `.crt-fit` limita bien el ancho con el aspecto 9/13.
9. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Gema prisma / gema mágica y cualquier pieza especial.
- Niveles, vetas, objetivos, salto de nivel (`levelJump`), gemas de roca u obstáculos.
- Vidas, continuar, guardado de partida en curso, pantalla completa.
- Audio de cualquier tipo (y por tanto chip `SONIDO` y slider de volumen).
- Animación de caída de las gemas tras una eliminación (la gravedad es instantánea tras el parpadeo).
- Modo contrarreloj, modo con pozo precargado de gemas, modos de dificultad o tamaños de pozo alternos.
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
  'Tríos de gemas caen en un pozo de 6×13. No puedes girar la pieza: sólo moverla de columna y rotar el orden de sus tres colores. Alinea tres o más gemas iguales en horizontal, vertical o en cualquiera de las dos diagonales y desaparecen; lo que quede encima cae y puede volver a casar, encadenando multiplicadores de hasta ×16. La caída se acelera según limpias gemas y la partida acaba cuando el pozo se desborda.',
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

export type GemColor = 0 | 1 | 2 | 3 | 4 | 5; // índice en GEM_COLORS
export type Cell = GemColor | null; // null = celda vacía
export type Board = Cell[][]; // [fila][columna], 13 × 6
export type Trio = { col: number; row: number; gems: [GemColor, GemColor, GemColor] }; // row = fila de la gema superior
export type Phase = "falling" | "flashing" | "over";
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
lib/games/columnas/constants.ts                     // nuevo: COLS, ROWS, CELL, PANEL_W, GEM_COLORS, GLYPHS, SPAWN_COL, dropInterval, SOFT_MS, CLEAR_FLASH_MS, CHAIN_MULT, GEM_POINTS
lib/games/columnas/entities.ts                      // nuevo: pozo, trío, ciclado, colisión, búsqueda de series en 4 ejes, gravedad por columna, dibujo de gema con glifo
lib/games/columnas/input.ts                         // nuevo: teclado + VirtualPad, attach/detach
lib/games/columnas/engine.ts                        // nuevo: createColumnasGame, bucle de resolución y cascadas
components/columnas-canvas.tsx                      // nuevo
lib/games/registry.ts                               // modificado: entrada columnas
app/globals.css                                     // modificado: .cover-columnas nueva (+ ajustes de pulido)
references/catalogo-juegos.md                       // modificado: añadir la fila al snapshot (y la de frogger, que falta)
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `games` no tiene fila `columnas` y que `sort_order: 8` sigue libre; comprobar con `grep '^\.cover-' app/globals.css` que `.cover-columnas` no existe.
2. **Migración del catálogo y portada** — SQL en `supabase/migrations/` + `apply_migration`; `.cover-columnas` en `app/globals.css`. Verificar `/juegos/columnas` con la portada nueva, la card en biblioteca y home, y el leaderboard vacío.
3. **Constantes** — portar a TypeScript estricto todos los números de la sección Alcance, con los 6 colores y los 6 glifos.
4. **Entidades** — pozo como `Cell[13][6]`, trío con `col`/`row`/`gems`, ciclado, comprobación de colisión, **búsqueda de series en los cuatro ejes con marcado en `Set`** (una gema nunca se cuenta dos veces), gravedad por columna, dibujo de gema con glifo recibiendo `ctx` por parámetro.
5. **Input** — `attachInput(canvas, pad)` que devuelve su limpieza; teclado y `VirtualPad`; `preventDefault` sólo en las teclas del juego; ignora `input`/`textarea` y modificadores.
6. **Motor** — estado en closure con las fases `falling`/`flashing`/`over`, acumulador de caída con `dt` ≤ 50 ms, fijado inmediato, bucle de resolución con escalones y multiplicador, `onScore` sólo en cambios reales, `pause`/`resume`/`restart`/`destroy`, una sola salida de fin.
7. **Componente `ColumnasCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 360×520, `pad`.
8. **Registro y reproductor (jugable)** — añadir la entrada `columnas` al registro. Verificar una partida completa y que `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` siguen igual.
9. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover, ciclar, descenso rápido, caída instantánea, alineación horizontal, vertical, en cada diagonal, cascada de 2 y de 3 escalones, aceleración, desbordar el pozo), guardar iniciales, ver la marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil con el mando táctil. Capturas en `.playwright-screenshot`. Actualizar `references/catalogo-juegos.md`.
10. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'columnas'`.

## Criterios de aceptación

- [ ] `/juegos/columnas/jugar` muestra el juego dentro del marco CRT con proporción 9/13 y canvas lógico 360×520: pozo de 6×13 celdas de 40 px a la izquierda y panel SIGUIENTE de 120 px a la derecha.
- [ ] Al arrancar hay un trío de 3 gemas en la columna 3 (la cuarta), ocupando las filas 0, 1 y 2, y el panel SIGUIENTE muestra el trío que viene.
- [ ] `←`/`→` mueven el trío de columna y el movimiento se ignora si la columna destino no tiene libres las tres celdas; la página no hace scroll con las flechas ni con `ESPACIO`.
- [ ] `↑` y `X` **ciclan los colores** del trío (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`) sin mover la pieza ni cambiar su forma, y funcionan pegado a ambas paredes.
- [ ] La pieza **nunca** cambia de forma: siempre ocupa 1 columna × 3 filas. No hay wall kicks ni piezas de 4 bloques.
- [ ] `↓` baja una fila cada 50 ms mientras se mantiene y suma +1 por fila; `ESPACIO` posa el trío al instante sumando +1 por fila recorrida.
- [ ] El trío se fija en cuanto se posa, sin lock delay, y sus tres gemas pasan al pozo.
- [ ] Tres gemas iguales en **horizontal** se eliminan; **en vertical** se eliminan; en **diagonal ↘** se eliminan; en **diagonal ↗** se eliminan.
- [ ] Una fila de 6 gemas **de colores distintos** no elimina nada: en este juego no existen las líneas completas.
- [ ] Una serie de 4 o 5 gemas iguales se elimina entera, y una gema que pertenece a dos series a la vez se cuenta **una sola vez** en la puntuación.
- [ ] Tras eliminar, cada columna compacta hacia abajo y se vuelve a comprobar: si se forma una serie nueva, se elimina en un escalón más (cascada) y el canvas lo muestra.
- [ ] El escalón 1 puntúa `gemas × 10`, el 2 `× 2`, el 3 `× 4`, el 4 `× 8` y del 5 en adelante `× 16`; una alineación de 3 en el escalón 1 da exactamente 30 puntos.
- [ ] El intervalo de caída es `max(150, 800 − floor(gemas / 15) × 50)` ms y se ve que la partida acelera al limpiar gemas.
- [ ] El HUD React muestra puntuación en tiempo real; **no** muestra vidas y **no** muestra LÍNEAS; el canvas no dibuja puntuación ni overlays.
- [ ] Cada color de gema lleva su glifo interior distinto y las seis gemas se distinguen en escala de grises.
- [ ] Generar un trío con alguna de las celdas `(col 3, filas 0/1/2)` ocupada abre el modal "FIN DEL JUEGO" con la puntuación correcta, **una sola vez**; el botón FIN también lo abre.
- [ ] No hay condición de victoria ni techo de puntuación; la puntuación emitida nunca supera 9 999 999.
- [ ] No hay audio ni chip `SONIDO` en Columnas.
- [ ] PAUSA congela la caída **y el parpadeo de una cascada en curso**; REANUDAR continúa sin saltos ni escalones perdidos; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En móvil aparece el mando con cruz de 4 direcciones y botones CICLAR y CAÍDA, y el juego es jugable sólo con él.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "columnas"`; iniciales inválidas se rechazan sin cerrar el modal; escribir en el input del modal no mueve el trío.
- [ ] La marca aparece en `/salon?juego=columnas`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, pozo vacío, intervalo de caída 800 ms y trío inicial, sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` conservan comportamiento y HUD.
- [ ] `games` contiene la fila `columnas` con `title: COLUMNAS`, `category: PUZZLE`, `color: cyan`, `cover: cover-columnas`, `sort_order: 8`, y respeta los `CHECK`.
- [ ] `.cover-columnas` existe en `app/globals.css` y se ve en la card, el detalle y el Salón.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 9/13.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `INSERT` de una fila nueva en `games` — `columnas` no viene del prototipo y nunca tuvo placeholder. **No:** `UPDATE` de una fila existente (no hay ninguna que reemplazar) ni `delete from public.scores` previo (sería un no-op: nunca ha habido `scores` con ese `game_id`).
- **Sí:** `sort_order: 8`. **No:** el `4` (comprometido con la jam de `gloton`), el `5` (lo ocupó `frogger`) ni el `7` (comprometido con la jam de `invasores`).
- **Sí:** crear `.cover-columnas` en `app/globals.css`, como avisaba la ficha 009. **No:** reutilizar `.cover-rana` ni `.cover-duelo`, las dos clases huérfanas: una es una rana sobre troncos y la otra dos palas de Pong, así que reutilizarlas obligaría a reescribirlas enteras con peor nombre.
- **Sí:** `color: cyan`. **No:** `magenta`, que proponía la ficha 009: es el color de `tetris` y en la biblioteca los dos PUZZLE saldrían con el mismo neón, justo la confusión que esta variante existe para evitar.
- **Sí:** alcance mínimo jugable: 6 colores fijos, modo sin fin, sin audio, sin niveles, sin piezas especiales. **No:** añadir prisma, rocas u objetivos — eso es el territorio de las variantes B y C.
- **Sí:** eliminación en los cuatro ejes, incluidas las dos diagonales, desde la primera versión. **No:** recortar a horizontal y vertical «para simplificar»: la diagonal es una de las cinco diferencias con TETRIS y sin ella la variante no cumple su objetivo.
- **Sí:** cascadas con multiplicador `[1, 2, 4, 8, 16]`. **No:** cascada sin multiplicador (sería un detalle visual sin consecuencia) ni multiplicador sin tope (una cascada de 8 escalones multiplicaría por 128 y una partida afortunada decidiría el Salón).
- **Sí:** una gema que pertenece a varias series se cuenta una sola vez, marcando en un `Set`. **No:** sumar por serie (un cruce en L puntuaría dos veces la misma gema).
- **Sí:** `↑` cicla los colores hacia abajo. **No:** `↑` como rotación de forma (no hay forma que rotar) ni ciclado en las dos direcciones (una tecla más sin ganancia clara; ver pregunta 7).
- **Sí:** fijado inmediato al posarse. **No:** lock delay estilo TETRIS moderno (permite deslizar la pieza y aquí no hay encaje de formas que lo justifique).
- **Sí:** aceleración por gemas eliminadas, sin campo de nivel. **No:** velocidad constante (un jugador bueno no perdería nunca) ni un «nivel» inventado para llenar el HUD con `engineLevel: true`.
- **Sí:** gravedad instantánea tras el parpadeo de 180 ms. **No:** animación de caída de las gemas (coste de motor sin efecto en la jugabilidad; candidata a un spec de pulido).
- **Sí:** panel SIGUIENTE dibujado en canvas, como el NEXT de TETRIS. **No:** segundo `<canvas>` React (acopla motor y página con un callback extra).
- **Sí:** glifo interior por color. **No:** gemas de color plano (seis neones en un pozo de 78 celdas son difíciles de separar para daltonismo).
- **Sí:** puntuación sin techo con clamp `Math.min(score, 9_999_999)` al emitir. **No:** cortar la partida al llegar al tope (sería un fin artificial) ni dejar el score sin clamp (rompería el `CHECK` en un caso extremo).
- **Sí:** HUD con puntuación y nada más, y `engineLevel: false` aceptando el nivel derivado `01`. **No:** declarar `hasLines: true` reutilizando el campo LÍNEAS para contar gemas: el HUD diría LÍNEAS y este juego no tiene líneas, que es precisamente la diferencia 2 con TETRIS.
- **Sí:** `aspect: "9 / 13"` con canvas lógico 360×520. **No:** 240×520 sin panel SIGUIENTE (el jugador necesita ver el trío que viene para planificar el color).
- **Sí:** mando táctil con cruz de 4 y botones A/B, calcado del de `tetris`. **No:** sólo izquierda/derecha (sin `↑` no se puede ciclar en móvil).
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos. **No:** `setInterval` (se desincroniza con la pausa y el `visibilitychange`).
- **Sí:** motor TypeScript con `createColumnasGame(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script`.
- **Sí:** HUD y modal de fin en React. **No:** HUD ni overlays dibujados en canvas.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni `localStorage` para scores.

## Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                                                      |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **El juego acaba sintiéndose como TETRIS** y repite la objeción de la ficha 009 | La sección `## En qué se diferencia de TETRIS` lista cinco diferencias y cada una tiene su criterio de aceptación; ninguna es opcional.         |
| Strict Mode duplica loop o listeners                                            | `destroy()` completo (rAF, teclado y desuscripción del pad); criterio de aceptación explícito.                                                  |
| Teclas del juego interfieren con el input del modal                             | Ignorar eventos con target `input`/`textarea` y con modificadores; pausar al abrir el modal.                                                    |
| `dt` grande al volver a la pestaña                                              | Tope de 50 ms y pausa con `visibilitychange`.                                                                                                   |
| La búsqueda de series cuenta dos veces una gema de un cruce                     | Marcado en un `Set` de celdas y suma única por escalón; criterio de aceptación propio.                                                          |
| La búsqueda en 4 ejes sobre 78 celdas cada frame es costosa                     | Sólo se ejecuta al fijar un trío y entre escalones de cascada, nunca por frame.                                                                 |
| Una cascada infinita bloquea el bucle                                           | Cada escalón borra al menos 3 gemas de un pozo de 78, así que termina en ≤ 26 escalones; además el bucle es asíncrono por parpadeo.             |
| El parpadeo no se congela al pausar y la cascada «salta»                        | El temporizador de parpadeo usa el mismo acumulador de `dt` que la caída; criterio de aceptación explícito.                                     |
| Seis neones en un pozo pequeño son difíciles de distinguir                      | Glifo interior por color + validación visual en el paso 9 con `/frontend-design`.                                                               |
| La partida sin fin desborda el `CHECK` de `scores`                              | `Math.min(score, 9_999_999)` al emitir; criterio de aceptación.                                                                                 |
| El leaderboard premia aguantar y no jugar bien                                  | Las cascadas multiplican hasta ×16, así que la diferencia entre partidas la marca la cadena y no el tiempo; declarado en el brief.              |
| Portada nueva desentona con las del prototipo                                   | `.cover-columnas` se construye con el mismo patrón que `.cover-tetro` (clase + `::after`, gradientes y `drop-shadow`) y se revisa en el paso 9. |
| Scores falsos con clave publishable                                             | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                                    |
| Un solo proyecto Supabase para dev y prod                                       | Limpiar filas de prueba de `scores` al cerrar (paso 10).                                                                                        |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                         | La fila, la ruta `/juegos/columnas` y la carpeta `lib/games/columnas` usan el mismo slug.                                                       |
| `sort_order: 8` deja de estar libre si otra rama inserta antes                  | El paso 1 lo reconfirma con un `select` antes de escribir la migración.                                                                         |
| Ampliar el registro rompe los cinco juegos existentes                           | No se toca el contrato; paso 8 y criterio de aceptación verifican los cinco.                                                                    |

## Qué **no** está en este spec

- Gema prisma, gemas de roca y cualquier pieza u obstáculo especial.
- Niveles, vetas, objetivos, salto de nivel y condición de victoria.
- Audio de cualquier tipo.
- Animación de caída tras eliminar, ciclado inverso, hold, bolsa de piezas y fantasma de aterrizaje.
- Vidas, continuar, pantalla completa y guardado de partida.
- Techo de puntuación, modos de dificultad y tamaños de pozo alternos.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
