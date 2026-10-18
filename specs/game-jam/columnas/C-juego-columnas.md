# COLUMNAS — variante C: de autor, «vetas profundas»

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 10
- **Fecha:** 2026-10-18
- **Game jam:** tema «COLUMNAS (`columnas`), el puzzle de tríos de gemas que caen y se destruyen al alinear tres iguales en cualquier dirección, con reacciones en cadena» · variante C de 3 · hermanas `A-juego-columnas.md`, `B-juego-columnas.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/NN-juego-columnas.md` y ejecutar `/spec-impl NN-juego-columnas`

**Objetivo:** Crear un Columnas de campaña en `/juegos/columnas/jugar` con **cinco vetas** de dificultad creciente (de 4 a 6 colores, gemas de roca a partir de la tercera), audio sintetizado y salto de veta, con fila nueva en el catálogo, portada propia y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, los tres ya portados, y `columnas` es el único candidato de `references/game-suggestions-todo.md` que **no viene del prototipo** `references/templates/`. Las reglas, constantes, puntuación, tabla de vetas y dibujo de esta variante se **definen aquí** (decisiones de la jam, derivadas del Columns de Sega de 1990 y de la ficha 009), no se extraen de un `game.js`. Las vetas, las gemas de roca y la banda sonora sintetizada son originales de esta jam. Por eso las constantes de la sección Alcance son la **fuente de verdad** para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## En qué se diferencia de TETRIS

La ficha 009 descartó este juego por **diversidad**: «aportaría un segundo juego que se _siente_ como el que ya existe (`tetris`)». Esta variante responde con las cinco diferencias estructurales del juego base más tres que sólo ella tiene. Si al implementarla alguna se pierde, la variante deja de cumplir su objetivo.

1. **La pieza no rota: se cicla.** En TETRIS hay 7 tetrominós de 4 bloques que giran en el plano y necesitan wall kicks `[0, -1, 1, -2, 2]`. Aquí hay **una sola pieza**, un trío vertical de 3 gemas que ocupa siempre 1 columna × 3 filas y **nunca cambia de forma**. `↑` **permuta los colores dentro de la columna**. No hay wall kicks porque no hay nada que desplazar.
2. **No existen las líneas.** Una fila llena **no hace nada** si los colores no casan. El HUD **no tiene el campo LÍNEAS** y el motor no implementa `onLines`.
3. **Se elimina en cuatro ejes, incluidas las dos diagonales.** Horizontal, vertical, diagonal ↘ y diagonal ↗: una dirección de juego que TETRIS no tiene en ninguna forma.
4. **Hay cascadas encadenadas.** En TETRIS las líneas se limpian a la vez y **nunca** encadenan. Aquí cada vuelta de la cascada multiplica (×1, ×2, ×4, ×8, ×16).
5. **El recurso del jugador es el color, no el espacio.** No puede haber huecos: la gravedad compacta cada columna. Pozo de **6×13** frente a 10×20 y pieza de **3** gemas frente a 4 bloques.
6. **El nivel no es «más rápido»: es otro juego.** En TETRIS el nivel sube cada 10 líneas y lo único que cambia es el intervalo de caída. Aquí cada veta cambia **cuántos colores hay en juego** (4 → 5 → 6), es decir, la probabilidad misma de que una alineación aparezca: la veta 1 es casi un tutorial y la veta 5 es un pozo de seis colores que casi nunca casa solo.
7. **Hay materia que no se puede casar.** Las **gemas de roca** desde la veta 3 no pertenecen a ningún color y sólo se rompen por contacto con una eliminación vecina. TETRIS no tiene nada equivalente: allí todos los bloques son intercambiables.
8. **La partida tiene final y se puede ganar.** TETRIS es infinito. Aquí hay un objetivo por veta y una **victoria** al completar la quinta, con un techo de puntuación acotado y demostrado (129 100).

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (`INSERT`, no `UPDATE`: `columnas` no viene del prototipo, nunca tuvo fila placeholder y nunca ha habido `scores` con ese `game_id`, así que tampoco hace falta `delete from public.scores`). Migración `supabase/migrations/<timestamp>_game_columnas.sql` aplicada con `apply_migration`:
   - `id: "columnas"`, `title: "COLUMNAS"`, `category: "PUZZLE"`, `color: "cyan"`, `cover: "cover-columnas"` (**clase nueva**, se crea en este spec), `sort_order: 8` (1, 2, 3, 5 y 6 están ocupados; el 4 está comprometido con la jam de `gloton` y el 7 con la de `invasores`).
   - `short`: `Alinea tres gemas iguales en cualquier dirección.`
   - `long` describe **sólo** lo que esta variante tiene: pozo 6×13, trío que se cicla, alineación en los cuatro ejes, cascadas con multiplicador, **cinco vetas** de 4 a 6 colores, **gemas de roca**, bonus por veta, victoria al completar la quinta y **sonido**. **No menciona** gema prisma ni vidas.
   - `lib/home-data.ts` no menciona «Columnas»: no se toca.
2. **Portada** — `.cover-columnas` nueva en `app/globals.css`, en el bloque `/* ===== Cover art generators (pure CSS) ===== */`, con el mismo patrón que `.cover-tetro` (clase base + `::after`): fondo `radial-gradient` oscuro azulado, tres columnas de gemas de colores y una veta de roca gris al fondo, con `drop-shadow` cian. Sin imágenes.
3. **Motor** en `lib/games/columnas/`: `constants.ts`, `levels.ts`, `entities.ts`, `input.ts`, `audio.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createColumnasGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy, setMuted, setVolume, jumpToLevel }`.
   - Callbacks: `onScore(score)`, `onLevel(veta)`, `onGameOver(finalScore)`, `onTogglePause()`. **Sin** `onLives`, **sin** `onLines`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms y acumulador de tiempo para la caída (paso discreto de una fila, no interpolado). `destroy()` cancela rAF, quita los listeners de teclado, la suscripción al mando virtual y cierra el `AudioContext`.
   - **Constantes base** (canvas lógico **360×520**):
     - Pozo: `COLS = 6`, `ROWS = 13`, `CELL = 40` → 240×520 px, origen en `(0, 0)`. Panel **SIGUIENTE** de `PANEL_W = 120` px a la derecha.
     - Gemas: `GEM_COLORS = 6` → cian `#00f5ff`, magenta `#ff006e`, amarillo `#f5ff00`, verde `#00ff88`, naranja `#ff7700`, violeta `#aa00ff`. Cada color lleva un **glifo** distinto centrado (círculo, rombo, cruz, triángulo, anillo, cuadrado). En cada veta sólo están en juego los `colores` que indica la tabla, siempre empezando por el cian.
     - Aparición: `SPAWN_COL = 3` (la cuarta de 6, índice 0), ocupando las filas 0, 1 y 2.
     - Descenso rápido: con `↓` mantenida el intervalo pasa a `SOFT_MS = 50` ms. Caída instantánea con `ESPACIO`. **Ninguno de los dos puntúa** (ver decisiones).
     - Resolución: `CLEAR_FLASH_MS = 180` de parpadeo antes de borrar; `CHAIN_MULT = [1, 2, 4, 8, 16]` (escalón 1..5+, tope ×16); `GEM_POINTS = 10`.
     - Roca: `ROCK_POINTS = 50`. Es un **séptimo valor de celda**, gris basalto `#6b6f76` con textura de grano y sin glifo de color.
     - Transición de veta: `LEVEL_CLEAR_MS = 1200`.
   - **Tabla de vetas** (`levels.ts`), la única fuente de dificultad:

     | Veta | Colores en juego | Objetivo (gemas eliminadas) | `dropInterval` | Rocas                 | Bonus al superarla |
     | ---- | ---------------- | --------------------------- | -------------- | --------------------- | ------------------ |
     | 1    | 4                | 30                          | 700 ms         | no                    | 1000               |
     | 2    | 5                | 40                          | 600 ms         | no                    | 2000               |
     | 3    | 6                | 50                          | 500 ms         | sí, 1 de cada 5 tríos | 3000               |
     | 4    | 6                | 60                          | 400 ms         | sí, 1 de cada 5 tríos | 4000               |
     | 5    | 6                | 70                          | 300 ms         | sí, 1 de cada 5 tríos | 5000               |

     Dentro de una veta la velocidad es **constante**: la dificultad sube por colores y por rocas, no por aceleración continua.

   - **Reglas base:**
     - `start()` empieza en la veta 1 con el pozo vacío, genera el primer trío y precalcula el **siguiente**, que se dibuja en el panel SIGUIENTE.
     - `←`/`→` mueven el trío una columna si la celda de destino de las tres gemas está libre; si no, el movimiento se ignora.
     - `↑`/`X` ciclan los colores del trío (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`); funciona pegado a la pared y durante el descenso rápido. Si el trío lleva una roca, la roca se cicla como una gema más.
     - El trío baja una fila cada `dropInterval` de su veta y se **posa** cuando la celda inmediatamente inferior a su gema de abajo está ocupada o es el suelo (`fila 12`). Al posarse se fija **al instante**, sin lock delay.
     - **Resolución** (bucle, cada vuelta es un escalón `k`, empezando en 1):
       1. Recorrer el pozo y marcar toda serie de **3 o más gemas consecutivas del mismo color** en los cuatro ejes: horizontal `→`, vertical `↓`, diagonal `↘` y diagonal `↗`. Las rocas **nunca** forman serie. Una gema en varias series se marca **una sola vez**.
       2. Si no hay nada marcado, la resolución acaba; se comprueba el objetivo de la veta y, si no se ha alcanzado, se genera el trío siguiente.
       3. Si hay `g` gemas marcadas: añadir al conjunto de borrado **toda roca ortogonalmente adyacente** a una gema marcada (`r` rocas). Sumar `g × GEM_POINTS × CHAIN_MULT[min(k, 5) − 1] + r × ROCK_POINTS`. Las rocas puntúan **a valor plano, sin multiplicador de cascada**. Parpadear `CLEAR_FLASH_MS`, borrar, compactar cada columna hacia abajo, `k++` y volver al paso 1.
     - Durante la resolución no hay trío controlable y las teclas de juego no actúan; `P`/`Escape` sí pausan y congelan también el parpadeo.
   - **Reglas de las vetas:**
     - El motor lleva `gemasDeLaVeta`, que cuenta **sólo gemas de color** eliminadas en la veta actual (las rocas no cuentan para el objetivo).
     - Al terminar una cascada completa, si `gemasDeLaVeta ≥ objetivo`:
       - Si la veta es la 1–4: suma el bonus de la tabla **una sola vez por veta y partida**, entra en la transición `LEVEL_CLEAR_MS = 1200` (el pozo se vacía con un barrido visual, sin puntuar las gemas restantes), avanza a la veta siguiente con el pozo vacío, `gemasDeLaVeta = 0`, y emite `onLevel(veta)`.
       - Si la veta es la 5: suma el bonus de 5000 y **victoria**: `onGameOver(score)` una sola vez.
     - **Gemas de roca** (vetas 3, 4 y 5): se lleva un contador de tríos generados en la veta; **uno de cada 5** tiene su gema **central** sustituida por una roca. La roca no casa con nada, ni con otra roca, y sólo sale del pozo cuando una gema ortogonalmente adyacente se elimina (entonces vale 50 puntos). Una roca en la fila 12 que nunca toque una eliminación se queda ahí el resto de la veta.
   - **Salto de veta** (`levelJump: 5`): el overlay de pausa muestra cinco chips. Saltar a la veta `n` vacía el pozo, pone `gemasDeLaVeta = 0`, aplica la configuración de esa veta y **no** concede los bonus de las vetas saltadas; además, una veta cuyo bonus ya se cobró no vuelve a pagarlo si se regresa a ella. Es el mismo mecanismo `jumpTo` que introdujo el SPEC 08 para Arkanoid.
   - **Puntuación:**
     - Gema de color eliminada: **10 puntos** × el multiplicador del escalón (×1, ×2, ×4, ×8, ×16).
     - Roca rota por contacto: **50 puntos** planos, sin multiplicador.
     - Bonus por veta superada: **1000 × número de veta** (1000, 2000, 3000, 4000, 5000), una sola vez por veta y partida.
     - El descenso rápido y la caída instantánea **no puntúan**.
     - **Puntuación máxima alcanzable: 129 100**, dentro de `0–9 999 999`. Demostración de la cota: el pozo tiene 78 celdas, así que una veta no puede eliminar más de `objetivo + 78` gemas de color (la resolución que cruza el objetivo borra como mucho un pozo entero) ni más de 78 rocas; con el multiplicador máximo ×16, la veta `n` vale como mucho `(objetivo + 78) × 10 × 16` en gemas más `78 × 50` en rocas:
       - Vetas: `108 × 160 + 118 × 160 + 128 × 160 + 138 × 160 + 148 × 160 = 102 400`.
       - Rocas (sólo vetas 3, 4 y 5): `78 × 50 × 3 = 11 700`.
       - Bonus: `1000 + 2000 + 3000 + 4000 + 5000 = 15 000`.
       - Total: **129 100**. Referencia práctica de una partida ganada: **25 000–40 000**.
   - **Fin de partida (inequívoco):** (a) **derrota**, al generar un trío nuevo si alguna de las celdas `(SPAWN_COL, fila 0)`, `(SPAWN_COL, fila 1)` o `(SPAWN_COL, fila 2)` está ocupada; (b) **victoria**, al alcanzar el objetivo de la veta 5. Los dos caminos llaman a `onGameOver(score)` **una sola vez** y dejan el canvas congelado.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): fondo del pozo con rejilla tenue de 40 px, gemas con su glifo, **rocas con su textura**, trío en caída, parpadeo de las gemas marcadas, **barrido de transición de veta** de 1200 ms y panel **SIGUIENTE**. Sin puntuación escrita, sin número de veta escrito, sin overlays.
4. **Audio** en `lib/games/columnas/audio.ts`, **sintetizado con Web Audio API**: sin ningún binario en `public/`. Siete efectos con osciladores y envolventes cortas: mover de columna, ciclar, posar el trío, eliminar (onda cuadrada cuya nota **sube un semitono por escalón de cascada**, base 440 Hz), romper roca (ruido filtrado breve), veta superada (arpegio ascendente de 4 notas) y fin de partida (glissando descendente). El `AudioContext` se crea en el **primer gesto del usuario** y se cierra en `destroy()`; `setMuted`/`setVolume` responden a las props `muted` y `volume` del reproductor. Sin música de fondo.
5. **Componente cliente** `components/columnas-canvas.tsx` (`"use client"`), mismo patrón que `components/arkanoid-canvas.tsx` (que ya usa `muted`, `volume` y `jumpTo`): callbacks vía ref, props `paused`, `restartKey`, `muted`, `volume` y `jumpTo`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **360×520** escalado por CSS dentro de `.crt-screen` con `aspect: "9 / 13"`.
6. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `columnas` **sin cambios en el contrato** (`GameEntry` y `GameCanvasProps` ya tienen todo lo necesario desde el SPEC 08):
   - HUD: puntuación y **nivel del motor** (`engineLevel: true`, la veta). `hasLives: false`, **`hasLines` ausente** (no hay líneas en este juego).
   - `hasSound: true` → chip `SONIDO` y slider de volumen del reproductor.
   - `levelJump: 5` → chips 1..5 en el overlay de pausa.
   - `blockStyles: BLOCK_STYLES` (reutiliza el selector que ya usan los cinco juegos).
   - Mando táctil: `touch: { dpad: ["up","down","left","right"], buttons: [{ id: "a", label: "CICLAR" }, { id: "b", label: "CAÍDA" }] }`, sobre el canal `VirtualPad` del SPEC 10.
7. **Controles:**
   - `←`/`→` mover de columna · `↓` descenso rápido · `↑` o `X` ciclar los colores del trío · `ESPACIO` caída instantánea · `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - En táctil: cruz de 4 direcciones (arriba = ciclar, abajo = descenso rápido) y botones **A** (CICLAR) y **B** (CAÍDA), leídos desde `pad` en `input.ts`.
   - `preventDefault` sólo en `ArrowLeft`, `ArrowRight`, `ArrowDown`, `ArrowUp` y `Space` (no en `X`, `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan `Ctrl`/`Meta`/`Alt`. Con la partida pausada, en transición de veta o terminada, las teclas de juego no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → mover · ↑ ciclar · ↓ bajar · ESPACIO caída · P pausa`.
8. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "columnas", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=columnas`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
9. **Pulido visual** con `/frontend-design`: portada `.cover-columnas`, paleta y glow de las seis gemas, **textura de la roca** (inconfundible con las gemas), barrido de transición de veta, parpadeo de eliminación, panel SIGUIENTE, chips de salto de veta, chip `SONIDO`, hint de controles y overlay de pausa. Verificar que `.crt-fit` limita bien el ancho con el aspecto 9/13.
10. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Gema prisma / gema mágica y cualquier otra pieza especial.
- Vidas, continuar, guardado de partida en curso, pantalla completa.
- Música de fondo, archivos de audio en `public/` y mezclador por canal.
- Más de 5 vetas, vetas generadas al azar, pozos precargados de gemas al empezar una veta.
- Rocas que se rompan a golpes, rocas que caigan solas o rocas que aparezcan ya en el pozo.
- Animación de caída de las gemas tras una eliminación (la gravedad es instantánea tras el parpadeo).
- Ciclado inverso del trío, hold, bolsa de piezas, fantasma de aterrizaje.
- Modo sin fin, modo contrarreloj y tamaños de pozo alternos.
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
  'Tríos de gemas caen en un pozo de 6×13. No puedes girar la pieza: sólo moverla de columna y rotar el orden de sus tres colores. Alinea tres o más gemas iguales en horizontal, vertical o en cualquiera de las dos diagonales y desaparecen; lo que quede encima cae y puede volver a casar, encadenando multiplicadores de hasta ×16. Son cinco vetas cada vez más profundas: empiezas con cuatro colores y acabas con seis, desde la tercera aparecen gemas de roca que sólo se rompen por contacto, y cada veta superada paga mil puntos por su número. Completa la quinta para ganar.',
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
  onLevel: (veta: number) => void; // 1..5
  onGameOver: (finalScore: number) => void; // derrota y victoria
  onTogglePause: () => void;
};

export type ColumnasGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void; // 0–1
  jumpToLevel(veta: number): void; // 1..5
  destroy(): void; // cancela rAF, quita listeners, desuscribe el pad y cierra el AudioContext
};

export type GemColor = 0 | 1 | 2 | 3 | 4 | 5;
export const ROCK = 6 as const; // séptimo valor de celda: la gema de roca
export type GemValue = GemColor | typeof ROCK;
export type Cell = GemValue | null; // null = celda vacía
export type Board = Cell[][]; // [fila][columna], 13 × 6
export type Trio = { col: number; row: number; gems: [GemValue, GemValue, GemValue] };
export type Phase = "falling" | "flashing" | "levelClear" | "over";

export type VetaConfig = {
  colores: number; // 4, 5 o 6
  objetivo: number; // gemas de color a eliminar
  dropMs: number;
  rocas: boolean;
  bonus: number;
};
export const VETAS: readonly VetaConfig[]; // 5 entradas
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
  engineLevel: true,
  hasLives: false,
  hasSound: true,
  levelJump: 5,
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
lib/games/columnas/constants.ts                     // nuevo: COLS, ROWS, CELL, PANEL_W, GEM_COLORS, GLYPHS, ROCK, SPAWN_COL, SOFT_MS, CLEAR_FLASH_MS, CHAIN_MULT, GEM_POINTS, ROCK_POINTS, LEVEL_CLEAR_MS
lib/games/columnas/levels.ts                        // nuevo: VETAS (colores, objetivo, dropMs, rocas, bonus)
lib/games/columnas/entities.ts                      // nuevo: pozo, trío, ciclado, colisión, series en 4 ejes, rocas adyacentes, gravedad por columna, dibujo de gema con glifo y de roca
lib/games/columnas/input.ts                         // nuevo: teclado + VirtualPad, attach/detach
lib/games/columnas/audio.ts                         // nuevo: 7 efectos sintetizados, AudioContext perezoso, setMuted/setVolume/close
lib/games/columnas/engine.ts                        // nuevo: createColumnasGame, cascadas, vetas, rocas, jumpToLevel
components/columnas-canvas.tsx                      // nuevo
lib/games/registry.ts                               // modificado: entrada columnas
app/globals.css                                     // modificado: .cover-columnas nueva (+ ajustes de pulido)
references/catalogo-juegos.md                       // modificado: añadir la fila al snapshot (y la de frogger, que falta)
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `games` no tiene fila `columnas` y que `sort_order: 8` sigue libre; comprobar con `grep '^\.cover-' app/globals.css` que `.cover-columnas` no existe; releer cómo el SPEC 08 cableó `hasSound`, `muted`, `volume`, `levelJump` y `jumpTo` en `game-player.tsx` y `arkanoid-canvas.tsx`.
2. **Migración del catálogo y portada** — SQL en `supabase/migrations/` + `apply_migration`; `.cover-columnas` en `app/globals.css`. Verificar `/juegos/columnas` con la portada nueva, la card en biblioteca y home, y el leaderboard vacío.
3. **Constantes y tabla de vetas** — portar a TypeScript estricto todos los números de la sección Alcance y la tabla de `levels.ts`.
4. **Entidades** — pozo como `Cell[13][6]`, trío con `col`/`row`/`gems`, ciclado, colisión, **búsqueda de series en los cuatro ejes con marcado en `Set`** (las rocas nunca forman serie), **rocas ortogonalmente adyacentes añadidas al borrado**, gravedad por columna, dibujo de gema con glifo y de roca con textura, todo recibiendo `ctx` por parámetro.
5. **Input** — `attachInput(canvas, pad)` que devuelve su limpieza; teclado y `VirtualPad`; `preventDefault` sólo en las teclas del juego; ignora `input`/`textarea` y modificadores.
6. **Motor base (jugable)** — fases `falling`/`flashing`/`over`, acumulador de caída con `dt` ≤ 50 ms, fijado inmediato, bucle de resolución con escalones y multiplicador, derrota por desbordamiento, todo en la veta 1 con 4 colores. Deja el juego funcional y verificable antes de añadir nada.
7. **Motor: vetas** — contador `gemasDeLaVeta`, fase `levelClear` de 1200 ms, bonus una vez por veta, avance 1→5, victoria al completar la 5, `onLevel`. Verificar el paso de veta y que el bonus no se paga dos veces.
8. **Motor: gemas de roca** — 1 de cada 5 tríos en las vetas 3–5, borrado por adyacencia ortogonal, 50 puntos planos. Verificar que una roca aislada no bloquea la veta de forma permanente.
9. **Audio** — `audio.ts` con los 7 efectos sintetizados, `AudioContext` perezoso en el primer gesto, nota de eliminación que sube por escalón, `setMuted`/`setVolume`, cierre en `destroy()`.
10. **Componente `ColumnasCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 360×520, `pad`, `muted`, `volume`, `jumpTo`.
11. **Registro y reproductor (jugable)** — añadir la entrada `columnas` al registro con `engineLevel`, `hasSound` y `levelJump`. Verificar el chip SONIDO, el slider de volumen y los cinco chips de salto de veta, y que `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` siguen igual.
12. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover, ciclar, descenso rápido, caída instantánea, alineación en los cuatro ejes, cascada de 2 y de 3 escalones, romper una roca por contacto, superar las vetas 1 a 5, ganar, perder por desbordamiento, saltar a la veta 4 y comprobar que no paga bonus atrasados, silenciar y ajustar volumen), guardar iniciales, ver la marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil con el mando táctil. Capturas en `.playwright-screenshot`. Actualizar `references/catalogo-juegos.md`.
13. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'columnas'`.

## Criterios de aceptación

- [ ] `/juegos/columnas/jugar` muestra el juego dentro del marco CRT con proporción 9/13 y canvas lógico 360×520: pozo de 6×13 celdas de 40 px y panel SIGUIENTE de 120 px.
- [ ] Al arrancar el HUD muestra `NIVEL 01`, hay un trío de 3 gemas en la columna 3 (la cuarta) ocupando las filas 0, 1 y 2, y **sólo aparecen 4 colores distintos** en toda la veta 1.
- [ ] En la veta 2 aparecen 5 colores y en las vetas 3, 4 y 5 aparecen los 6.
- [ ] `←`/`→` mueven el trío de columna y el movimiento se ignora si la columna destino no tiene libres las tres celdas; la página no hace scroll con las flechas ni con `ESPACIO`.
- [ ] `↑` y `X` **ciclan los colores** del trío (`[arriba, medio, abajo]` → `[abajo, arriba, medio]`) sin mover la pieza ni cambiar su forma, y funcionan pegado a ambas paredes.
- [ ] La pieza **nunca** cambia de forma: siempre ocupa 1 columna × 3 filas. No hay wall kicks ni piezas de 4 bloques.
- [ ] `↓` baja una fila cada 50 ms mientras se mantiene y `ESPACIO` posa el trío al instante; **ninguno de los dos suma puntos**.
- [ ] Tres gemas iguales en **horizontal**, en **vertical**, en **diagonal ↘** y en **diagonal ↗** se eliminan; una fila de 6 gemas de colores distintos **no** elimina nada.
- [ ] Una serie de 4 o 5 gemas iguales se elimina entera, y una gema que pertenece a dos series a la vez se cuenta **una sola vez**.
- [ ] El escalón 1 puntúa `gemas × 10`, el 2 `× 2`, el 3 `× 4`, el 4 `× 8` y del 5 en adelante `× 16`; una alineación de 3 en el escalón 1 da exactamente 30 puntos.
- [ ] El intervalo de caída es 700/600/500/400/300 ms según la veta y es **constante dentro de cada veta**.
- [ ] Desde la veta 3, uno de cada 5 tríos lleva una roca en su posición central; en las vetas 1 y 2 no aparece ninguna roca.
- [ ] Una roca no casa con nada, ni siquiera con otra roca, y desaparece sumando exactamente **50 puntos planos** cuando una gema ortogonalmente adyacente se elimina.
- [ ] Las rocas **no** cuentan para el objetivo de gemas de la veta.
- [ ] Al alcanzar el objetivo de la veta (30/40/50/60/70 gemas de color), se suma el bonus 1000/2000/3000/4000/5000, el pozo se vacía con el barrido de 1200 ms y el HUD sube de nivel.
- [ ] Completar el objetivo de la veta 5 abre el modal "FIN DEL JUEGO" con la puntuación final (victoria), **una sola vez**.
- [ ] Generar un trío con alguna de las celdas `(col 3, filas 0/1/2)` ocupada abre el modal "FIN DEL JUEGO" (derrota), **una sola vez**; el botón FIN también lo abre.
- [ ] Saltar a una veta desde el overlay de pausa vacía el pozo, aplica su configuración y **no** paga los bonus de las vetas saltadas; volver a una veta ya superada **no** vuelve a pagar su bonus.
- [ ] Una partida perfecta no puede superar los **129 100** puntos, y la puntuación emitida nunca supera 9 999 999.
- [ ] El HUD React muestra puntuación y nivel (la veta) del motor en tiempo real; **no** muestra vidas y **no** muestra LÍNEAS; el canvas no dibuja ninguno de los dos ni overlays.
- [ ] Cada color de gema lleva su glifo interior distinto y las seis gemas se distinguen en escala de grises; la roca se distingue de las seis.
- [ ] El reproductor muestra el chip `SONIDO` y el slider de volumen; silenciar corta todos los efectos sin pausar y el volumen los atenúa.
- [ ] El sonido de eliminación **sube de tono con cada escalón de cascada** y hay efecto distinto para mover, ciclar, posar, romper roca, superar veta y fin de partida.
- [ ] No hay ningún archivo de audio en `public/games/columnas/`: todo el sonido es sintetizado.
- [ ] PAUSA congela la caída, el parpadeo de una cascada en curso **y la transición de veta**; REANUDAR continúa sin saltos; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En móvil aparece el mando con cruz de 4 direcciones y botones CICLAR y CAÍDA, y el juego es jugable sólo con él.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "columnas"`; iniciales inválidas se rechazan sin cerrar el modal; escribir en el input del modal no mueve el trío.
- [ ] La marca aparece en `/salon?juego=columnas`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, veta 1 con 4 colores, pozo vacío y los bonus cobrados a cero, sin duplicar loop, listeners ni `AudioContext`; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid`, `snake` y `frogger` conservan comportamiento, HUD, sonido y salto de nivel.
- [ ] `games` contiene la fila `columnas` con `title: COLUMNAS`, `category: PUZZLE`, `color: cyan`, `cover: cover-columnas`, `sort_order: 8`, y respeta los `CHECK`.
- [ ] `.cover-columnas` existe en `app/globals.css` y se ve en la card, el detalle y el Salón.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 9/13.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `INSERT` de una fila nueva en `games` — `columnas` no viene del prototipo y nunca tuvo placeholder. **No:** `UPDATE` de una fila existente ni `delete from public.scores` previo (sería un no-op).
- **Sí:** `sort_order: 8`. **No:** el `4` (jam de `gloton`), el `5` (lo ocupó `frogger`) ni el `7` (jam de `invasores`).
- **Sí:** crear `.cover-columnas`, como avisaba la ficha 009. **No:** reutilizar `.cover-rana` ni `.cover-duelo`, las únicas huérfanas.
- **Sí:** `color: cyan`. **No:** `magenta`, que proponía la ficha 009: es el color de `tetris` y en la biblioteca los dos PUZZLE saldrían con el mismo neón.
- **Sí:** la dificultad de la veta se expresa en **número de colores**, no sólo en velocidad — es lo que hace que una veta se sienta distinta de la anterior y lo que separa el «nivel» de aquí del nivel de TETRIS. **No:** cinco vetas que sólo cambien el `dropInterval` (sería literalmente el sistema de niveles de TETRIS con otro nombre).
- **Sí:** velocidad **constante dentro de la veta**. **No:** aceleración continua además de la tabla (dos fuentes de dificultad a la vez, imposible de balancear a ciegas).
- **Sí:** objetivo de gemas por veta y **victoria** al completar la quinta, lo que acota el techo en 129 100 y hace comparables las partidas del Salón. **No:** modo sin fin (es lo que hacen las variantes A y B).
- **Sí:** el descenso rápido y la caída instantánea **no puntúan**. **No:** +1 por fila como en A y B: con objetivos por veta, premiar el descenso convierte el techo en no acotado y rompe la demostración de la cota.
- **Sí:** gemas de roca desde la veta 3, 1 de cada 5 tríos, que sólo se rompen por adyacencia ortogonal y valen 50 planos. **No:** rocas desde la veta 1 (arranque hostil), rocas que caigan solas (el jugador no podría planificar) ni rocas con multiplicador de cascada (serían la forma más rentable de puntuar y desplazarían a las gemas).
- **Sí:** las rocas no cuentan para el objetivo. **No:** contarlas (permitiría pasar de veta limpiando piedras en vez de casando colores).
- **Sí:** bonus por veta `1000 × veta`, una sola vez por veta y partida. **No:** bonus repetible (con `levelJump` sería farmeable en bucle).
- **Sí:** `levelJump: 5` con salto que vacía el pozo y no paga bonus atrasados. **No:** salto que conserve el pozo (dejaría un pozo de 4 colores dentro de una veta de 6) ni salto deshabilitado (el SPEC 08 ya lo ofrece y es útil para verificar).
- **Sí:** audio **sintetizado** con Web Audio API y `AudioContext` creado en el primer gesto. **No:** archivos `.wav`/`.ogg` en `public/` (binarios al repositorio y un paso más de assets) ni música de fondo.
- **Sí:** la nota del sonido de eliminación sube un semitono por escalón de cascada. **No:** un único sonido plano (la cascada es la mecánica estrella y debe oírse).
- **Sí:** eliminación en los cuatro ejes, incluidas las dos diagonales. **No:** recortar a horizontal y vertical.
- **Sí:** una gema en varias series se cuenta una sola vez, marcando en un `Set`. **No:** sumar por serie.
- **Sí:** fijado inmediato al posarse. **No:** lock delay estilo TETRIS moderno.
- **Sí:** glifo interior por color. **No:** gemas de color plano.
- **Sí:** `engineLevel: true` con la veta como nivel. **No:** nivel derivado del score (aquí el nivel es una fase real del juego).
- **Sí:** `aspect: "9 / 13"` con canvas lógico 360×520 y panel SIGUIENTE. **No:** 240×520 sin panel.
- **Sí:** mando táctil con cruz de 4 y botones A/B, calcado del de `tetris`. **No:** sólo izquierda/derecha.
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos. **No:** `setInterval`.
- **Sí:** motor TypeScript con `createColumnasGame(canvas, callbacks)`. **No:** `iframe` ni `next/script`.
- **Sí:** HUD y modal de fin en React. **No:** HUD ni overlays en canvas.
- **Sí:** guardado con `submitScore` existente. **No:** tablas por juego ni `localStorage`.

## Riesgos identificados

| Riesgo                                                                          | Mitigación                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **El juego acaba sintiéndose como TETRIS** y repite la objeción de la ficha 009 | La sección `## En qué se diferencia de TETRIS` lista ocho diferencias y cada una tiene su criterio de aceptación; ninguna es opcional.      |
| **Riesgo global alto y declarado:** es la variante más cara del lote            | El plan la parte en pasos jugables (6 deja el juego completo en la veta 1; 7 añade vetas; 8 rocas; 9 audio) para poder parar en cualquiera. |
| Strict Mode duplica loop, listeners o `AudioContext`                            | `destroy()` completo (rAF, teclado, pad y cierre del contexto); criterio de aceptación explícito.                                           |
| Teclas del juego interfieren con el input del modal                             | Ignorar eventos con target `input`/`textarea` y con modificadores; pausar al abrir el modal.                                                |
| `dt` grande al volver a la pestaña                                              | Tope de 50 ms y pausa con `visibilitychange`.                                                                                               |
| `levelJump` permite farmear bonus saltando entre vetas                          | El bonus se paga una sola vez por veta y partida; el salto no paga bonus atrasados; criterio de aceptación propio.                          |
| Una roca atrapada hace la veta imposible                                        | La roca sólo ocupa 1 celda, el pozo se vacía al pasar de veta y el objetivo cuenta sólo gemas de color; se valida en el paso 8.             |
| Las rocas se vuelven la forma más rentable de puntuar                           | 50 puntos planos sin multiplicador, frente a hasta 160 por gema encadenada.                                                                 |
| La tabla de 5 vetas queda mal balanceada                                        | Todos los números viven en `levels.ts` y se ajustan en un solo sitio; el paso 12 los verifica jugando las cinco con `levelJump`.            |
| El audio sintetizado suena desagradable o satura                                | Envolventes cortas, un solo `GainNode` maestro con el volumen del reproductor y validación en el paso 9; `muted` corta todo.                |
| `AudioContext` bloqueado por la política de autoplay                            | Se crea en el primer gesto del usuario, como ya hace Arkanoid (SPEC 08).                                                                    |
| La búsqueda de series cuenta dos veces una gema de un cruce                     | Marcado en un `Set` de celdas y suma única por escalón; criterio de aceptación propio.                                                      |
| La búsqueda en 4 ejes sobre 78 celdas cada frame es costosa                     | Sólo se ejecuta al fijar un trío y entre escalones, nunca por frame.                                                                        |
| Una cascada infinita bloquea el bucle                                           | Cada escalón borra al menos 3 gemas de un pozo de 78, así que termina en ≤ 26 escalones.                                                    |
| El parpadeo o la transición de veta no se congelan al pausar                    | Los tres temporizadores usan el mismo acumulador de `dt` que la caída; criterio de aceptación explícito.                                    |
| El bonus de veta se paga dos veces si la comprobación corre por dos caminos     | Una sola función de cierre de veta, protegida por un conjunto de vetas ya cobradas; criterio de aceptación de «una sola vez».               |
| Portada nueva desentona con las del prototipo                                   | `.cover-columnas` se construye con el mismo patrón que `.cover-tetro` y se revisa en el paso 12.                                            |
| Scores falsos con clave publishable                                             | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                                |
| Un solo proyecto Supabase para dev y prod                                       | Limpiar filas de prueba de `scores` al cerrar (paso 13).                                                                                    |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                         | La fila, la ruta `/juegos/columnas` y la carpeta `lib/games/columnas` usan el mismo slug.                                                   |
| `sort_order: 8` deja de estar libre si otra rama inserta antes                  | El paso 1 lo reconfirma con un `select` antes de escribir la migración.                                                                     |
| Ampliar el registro rompe los cinco juegos existentes                           | No se toca el contrato (todo viene del SPEC 08); paso 11 y criterio de aceptación verifican los cinco.                                      |

## Qué **no** está en este spec

- Gema prisma y cualquier otra pieza especial.
- Más de 5 vetas, vetas aleatorias y pozos precargados.
- Rocas que se rompan a golpes, que caigan solas o que aparezcan ya en el pozo.
- Música de fondo y archivos de audio en `public/`.
- Animación de caída tras eliminar, ciclado inverso, hold, bolsa de piezas y fantasma de aterrizaje.
- Vidas, continuar, pantalla completa y guardado de partida.
- Modo sin fin, modo contrarreloj y tamaños de pozo alternos.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
