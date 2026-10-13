# GLOTÓN — variante A: mínima fiel

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
- **Fecha:** 2026-10-12
- **Game jam:** tema «laberinto de persecución — un glotón recorre un laberinto comiendo puntos mientras cuatro espectros lo cazan, hasta que una píldora invierte los papeles» · variante A de 3 · hermanas `B-juego-gloton.md`, `C-juego-gloton.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/10-juego-gloton.md` y ejecutar `/spec-impl 10-juego-gloton`

**Objetivo:** Un único laberinto de persecución jugable en `/juegos/gloton/jugar`, con 240 puntos, 4 píldoras de inversión, cuatro espectros con una sola regla de caza y leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, ya portados, y no hay assets de Glotón en `references/source-assets/`. El prototipo (`references/templates/data.jsx`) aporta únicamente la fila de catálogo y la portada. Las reglas, el trazado del laberinto, las constantes y la IA de los espectros se **definen aquí**, no se extraen de un `game.js`. Por eso las constantes de la sección Alcance son la fuente de verdad para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (insert, no update: la migración `20261005120000_remove_unimplemented_games.sql` borró la fila placeholder `gloton`, así que no queda ningún placeholder que reemplazar y `scores` no tiene filas con `game_id = 'gloton'`). Migración `supabase/migrations/<timestamp>_game_gloton.sql` aplicada con `apply_migration`:
   - `id: "gloton"`, `title: "GLOTÓN"`, `category: "ARCADE"`, `color: "yellow"`, `cover: "cover-glot"` (la clase **ya existe** en `app/globals.css`; no se crea ninguna portada), `sort_order: 4` (hueco libre: la tabla real usa 1, 2, 3 y 6).
   - `short` del prototipo: `Devora puntos y escapa de los fantasmas.`
   - `long` describe **este** juego: laberinto único de 28×31 celdas, 240 puntos, 4 píldoras que invierten los papeles 6 s, cadena de espectros 200/400/800/1600, 3 vidas, victoria al limpiar el laberinto. No menciona frutas, niveles, sonido ni personalidades de espectro (no existen aquí).
   - `lib/home-data.ts` ya usa `game: "Glotón"` en la actividad reciente: **no se toca**.
2. **Assets** — ninguno. Todo se dibuja con geometría de canvas 2D (arcos, rectángulos redondeados y gradientes). No se crea `public/games/gloton/`.
3. **Motor** en `lib/games/gloton/`: `constants.ts`, `levels.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createGlotonGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onGameOver(finalScore)`, `onTogglePause()`. Sin `onLevel` (un solo laberinto) ni `onLines`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms. `destroy()` cancela rAF y quita listeners.
   - **Geometría y laberinto** (`levels.ts` + `constants.ts`):
     - `COLS = 28`, `ROWS = 31`, `CELL = 20` px → canvas lógico **560×620**.
     - `MAZE` es un arreglo de 31 cadenas de 28 caracteres: `#` muro, `.` punto, `o` píldora, ` ` pasillo vacío, `-` puerta de la casa de espectros. Trazado **propio**, inspirado en el clásico, simétrico en el eje vertical, con exactamente **240 puntos** y **4 píldoras** (en `(1,3)`, `(26,3)`, `(1,23)`, `(26,23)`).
     - Casa de espectros: celdas `(11..16, 14..16)`, puerta en `(13..14, 13)`. Los muros de la casa son infranqueables para el glotón; la puerta sólo la cruzan los espectros.
     - **Túnel**: la fila `17` conecta la columna `0` con la `27` (wrap horizontal). No hay wrap vertical.
     - Posición inicial del glotón: centro de la celda `(13, 23)`, mirando a la izquierda, quieto.
     - Posiciones iniciales de espectros: rojo en `(13, 13)` (fuera, sobre la puerta), rosa en `(13, 15)`, cian en `(11, 15)`, naranja en `(16, 15)`.
   - **Movimiento** (glotón y espectros comparten el modelo de rejilla):
     - Cada actor tiene posición en píxeles y dirección; sólo puede cambiar de dirección cuando está a ≤ 2 px del centro de una celda, y sólo hacia una celda no-muro.
     - `GLOTON_SPEED = 150` px/s (7,5 celdas/s). El glotón mantiene la última dirección válida; si la siguiente celda es muro, se detiene pegado al centro de la celda actual y conserva la dirección pulsada como intención (se aplica en cuanto haya pasillo).
     - La partida arranca **quieta**: el glotón y el reloj de salida de espectros empiezan con la primera tecla de dirección (precedente de `specs/09-juego-snake.md`). `start()` no mueve nada por sí solo.
   - **IA de los espectros — simplificada a propósito (una sola regla para los cuatro):**
     - Estado `chase` por defecto. En el centro de cada celda que sea **intersección** (más de dos vecinos no-muro) o **callejón**, el espectro elige entre las direcciones no-muro **excluyendo la inversa de la actual** (prohibido el giro de 180°) la que minimice la distancia euclídea del centro de la celda vecina al centro de la celda del glotón. Empate → orden de preferencia `arriba, izquierda, abajo, derecha`. Fuera de intersecciones sigue recto o toma el único pasillo disponible.
     - `GHOST_SPEED = 130` px/s en `chase`; `GHOST_SPEED_FRIGHT = 85` px/s; `GHOST_SPEED_EYES = 250` px/s.
     - **Sin modo scatter, sin personalidades, sin temporizadores por nivel.** Los cuatro espectros se diferencian **sólo** en color (rojo, rosa, cian, naranja) y en el retardo de salida de la casa: `0 / 3000 / 6000 / 9000` ms desde el arranque del movimiento de cada vida. Salen subiendo por la puerta hasta `(13, 13)` y a partir de ahí entran en `chase`.
     - Dentro de la casa, antes de salir, el espectro oscila verticalmente entre `y` de la fila 15 ± 6 px (sólo animación, no decide direcciones).
   - **Píldoras e inversión de papeles:**
     - Comer una píldora pone a los cuatro espectros (los que están en `chase`, no los que van en estado `eyes`) en `frightened` durante `FRIGHT_MS = 6000` ms, invierte su dirección una vez (único giro de 180° permitido) y reinicia la cadena a 0.
     - En `frightened` el espectro se dibuja azul y elige en cada intersección una dirección **aleatoria** entre las no-muro excluyendo la inversa. Durante los últimos 1500 ms parpadea blanco/azul a 4 Hz.
     - Comer otra píldora mientras la inversión está activa **reinicia** el temporizador a 6000 ms y **reinicia la cadena a 0**.
   - **Puntuación (números exactos):**
     - Punto: **+10**. Píldora: **+50**.
     - Espectro comido durante una misma inversión: **200 / 400 / 800 / 1600** según el orden (1.º/2.º/3.º/4.º). El 5.º y siguientes de la misma inversión (imposible con 4 espectros, pero definido) valen 1600.
     - Sin frutas, sin bonus de nivel, sin vidas extra.
     - **Techo alcanzable:** `240 × 10 + 4 × 50 + 4 × (200 + 400 + 800 + 1600)` = `2400 + 200 + 12 000` = **14 600**, dentro de `0–9 999 999`.
   - **Vidas y fin:**
     - `LIVES = 3`. Contacto con un espectro en `chase` (solape de centros a < 10 px): −1 vida, congelación de 1000 ms, y reinicio de posiciones de glotón y espectros y del reloj de salida; **los puntos comidos no reaparecen** y la puntuación se conserva.
     - Comer un espectro en `frightened`: pasa a estado `eyes`, vuelve por los pasillos a la casa `(13, 15)` y al llegar entra en `chase` otra vez (sin esperar retardo).
     - Fin por vidas a 0 → `onGameOver(score)`.
     - **Victoria:** comer los 244 comestibles (240 puntos + 4 píldoras) → `onGameOver(score)` con el laberinto congelado. **No hay laberinto siguiente.**
     - Game over y victoria llaman a `onGameOver` **una sola vez**.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): muros como trazos de neón amarillo-cian de 3 px con glow, puntos como círculos de 3 px, píldoras como círculos de 7 px que pulsan a 2 Hz, glotón como arco amarillo con la boca abierta hacia su dirección animada a 6 Hz, espectros como cuerpo redondeado + dos ojos que miran en su dirección, estado `eyes` sólo ojos, y el valor del espectro comido (`200`…`1600`) como texto flotante 800 ms en la celda de la captura. **Nada de Score, vidas, nivel ni overlays de pausa/fin en canvas.**
   - Sin audio.
4. **Componente cliente** `components/gloton-canvas.tsx` (`"use client"`), mismo patrón que `components/snake-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **560×620** escalado por CSS dentro de `.crt-screen` con `aspect: "28 / 31"`.
5. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `gloton` **sin cambios en el contrato** (`GameEntry` y `GameCanvasProps` ya tienen `aspect`, `hasLives` y `onLives`):
   - HUD: puntuación y **vidas** (`hasLives: true`). `engineLevel: false` → el HUD sigue mostrando el nivel derivado (`floor(score / 2500) + 1`, que aquí va de `01` a `06`); aceptado, sin tocar `game-player.tsx`.
   - Sin chip de sonido (`hasSound` ausente), sin salto de nivel (`levelJump` ausente), sin líneas ni estilos de bloque.
6. **Controles:**
   - `←↑→↓` y `W A S D` fijan la dirección; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - `preventDefault` sólo en las flechas y `W A S D` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan modificadores `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada las direcciones no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← ↑ → ↓ / WASD mover · P pausa`.
7. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "gloton", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=gloton`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
8. **Pulido visual** con `/frontend-design`: marco CRT vertical para 560×620, regla nueva `.crt-tall:has(.crt-screen[style*="28 / 31"])` en `app/globals.css` con el mismo cálculo que las de 7/10 y 17/15 (precedente del SPEC 09), colores y glow de muros, puntos, glotón y espectros, hint de controles, overlay de pausa. `game-player.tsx` ya aplica `crt crt-tall` cuando la entrada declara `aspect`: verificar que el marco entero cabe sin scroll.
9. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Personalidades de espectro, modo scatter, temporizadores por nivel, contadores de puntos para la salida de la casa, ralentización en túnel, modo "Elroy".
- Más de un laberinto, niveles, aumento de velocidad, `levelJump`.
- Frutas, vidas extra por puntuación, bonus por laberinto limpio.
- Audio de cualquier tipo (y por tanto chip `SONIDO` y slider de volumen).
- Controles táctiles / swipe / móvil jugable, pantalla completa, guardado de partida en curso.
- Animación de muerte del glotón, animación de salida de la casa, cinemáticas.
- Assets externos (imágenes, spritesheets, sonidos) y portada nueva: se reutiliza `.cover-glot`.
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos del catálogo (Invasores, Ranaria, Duelo Pixel).
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Es un **insert**: la fila placeholder `gloton` ya no existe y, al haberse borrado con `on delete cascade`, tampoco hay `scores` con `game_id = 'gloton'`:

```sql
insert into public.games (id, title, short, long, category, cover, color, sort_order) values
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.',
   'Recorre un laberinto de 28×31 celdas devorando sus 240 puntos mientras cuatro espectros te cazan. Las 4 píldoras invierten los papeles durante 6 segundos: los espectros huyen y comerlos en cadena vale 200, 400, 800 y 1600 puntos. Tienes 3 vidas y un único laberinto: límpialo entero y ganas.',
   'ARCADE', 'cover-glot', 'yellow', 4);
```

Tipos públicos del motor:

```ts
export type GlotonCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onGameOver: (finalScore: number) => void; // captura final y victoria
  onTogglePause: () => void;
};

export type GlotonGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF y quita listeners
};

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };
export type GhostId = "red" | "pink" | "cyan" | "orange";
export type GhostMode = "house" | "chase" | "frightened" | "eyes";
export type Tile = "wall" | "dot" | "pill" | "empty" | "door";
```

Entrada del registro:

```ts
gloton: {
  Canvas: GlotonCanvas,
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "mover" },
    { keys: ["WASD"], label: "mover" },
    { keys: ["P"], label: "pausa" },
  ],
  engineLevel: false,
  hasLives: true,
  aspect: "28 / 31",
},
```

Archivos:

```
supabase/migrations/<timestamp>_game_gloton.sql   // nuevo: insert de la fila gloton
lib/games/gloton/constants.ts                     // nuevo: COLS, ROWS, CELL, velocidades, FRIGHT_MS, LIVES, retardos de salida, colores
lib/games/gloton/levels.ts                        // nuevo: MAZE (31 cadenas de 28 chars), parseo a rejilla de Tile, celdas iniciales, túnel, casa
lib/games/gloton/entities.ts                      // nuevo: glotón, espectros, movimiento en rejilla, colisiones, dibujo con ctx
lib/games/gloton/input.ts                         // nuevo: teclas, intención de dirección, attach/detach
lib/games/gloton/engine.ts                        // nuevo: createGlotonGame
components/gloton-canvas.tsx                      // nuevo
lib/games/registry.ts                             // modificado: entrada gloton
app/globals.css                                   // modificado: regla .crt-tall para el aspecto 28 / 31 y pulido
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `gloton` no existe en `games`, que `sort_order: 4` sigue libre y que no hay `scores` con `game_id = 'gloton'`.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`. Verificar que `/juegos/gloton` renderiza con la portada `cover-glot`, que aparece en biblioteca y home, y que el leaderboard está vacío. `/juegos/gloton/jugar` muestra aún el placeholder simulado (no hay entrada en el registro).
3. **Constantes y laberinto** — escribir `MAZE` y parsearlo a rejilla tipada; **contar por código los comestibles y comprobar que son 240 puntos + 4 píldoras**; validar simetría, que no hay celdas comestibles inalcanzables y que la fila 17 conecta ambos extremos.
4. **Entidades y movimiento** — glotón y espectros sobre la rejilla: alineación al centro de celda, prohibición de giro de 180° en espectros, wrap del túnel, dibujo de muros, puntos, píldoras, glotón y espectros.
5. **Input** — `attachInput()` que devuelve la limpieza; intención de dirección aplicada en el siguiente centro de celda válido; `preventDefault` sólo en flechas y WASD; ignora `input`/`textarea` y teclas con modificadores.
6. **IA de caza** — regla única de distancia euclídea en intersecciones, retardos de salida `0/3/6/9` s, modo `frightened` aleatorio con parpadeo final y modo `eyes` de vuelta a la casa.
7. **Motor** — estado en closure (`esperando`/`jugando`/`capturado`/`terminado`), `dt` ≤ 50 ms, puntuación y cadena, vidas, `pause`/`resume`/`restart`/`destroy`, una sola salida de fin (victoria y vidas a 0 llaman a `onGameOver` una vez).
8. **Componente `GlotonCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 560×620.
9. **Registro y reproductor (jugable)** — añadir la entrada `gloton` al registro. Verificar partida completa y que `asteroides`, `tetris`, `arkanoid` y `snake` siguen igual.
10. **Pulido y verificación manual** — con `/frontend-design`; regla `.crt-tall` del aspecto 28/31; partida completa (comer puntos, píldora e inversión, cadena de 4 espectros, captura y pérdida de vidas, túnel, pausa, victoria forzando el estado en desarrollo), guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil. Capturas en `.playwright-screenshot`.
11. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'gloton'`.

## Criterios de aceptación

- [ ] `/juegos/gloton/jugar` muestra el laberinto completo dentro del marco CRT con proporción 28/31, el glotón en la celda `(13, 23)` mirando a la izquierda y los cuatro espectros en sus posiciones iniciales; nada se mueve hasta pulsar una dirección.
- [ ] El laberinto contiene exactamente 240 puntos y 4 píldoras; todas las celdas comestibles son alcanzables.
- [ ] `←↑→↓` y `WASD` mueven el glotón a 150 px/s; la página no hace scroll con esas teclas; escribir `w`/`a`/`s`/`d` en el input del modal no mueve el glotón.
- [ ] Pulsar una dirección hacia un muro no mueve el glotón, y la dirección se aplica en cuanto hay pasillo en ese sentido.
- [ ] Entrar en la fila 17 por la columna 0 reaparece en la 27 y al revés; no hay wrap en ninguna otra fila ni columna.
- [ ] Cada punto suma exactamente 10 y cada píldora exactamente 50; el contador del HUD se actualiza al instante.
- [ ] Los cuatro espectros salen de la casa a los 0, 3, 6 y 9 s del primer movimiento de cada vida, y en `chase` nunca giran 180°.
- [ ] En `chase` los espectros reducen su distancia al glotón en cada intersección (con la regla euclídea declarada) y se mueven a 130 px/s.
- [ ] Comer una píldora pone en azul a los espectros en `chase` durante 6 s, invierte su dirección una vez, los baja a 85 px/s y los hace elegir direcciones aleatorias; parpadean los últimos 1,5 s.
- [ ] Comer espectros en una misma inversión suma 200, 400, 800 y 1600 en ese orden, con el valor visible 800 ms en la celda; una píldora nueva reinicia la cadena a 200.
- [ ] Un espectro comido vuelve a la casa como ojos a 250 px/s y reanuda `chase` al llegar, sin esperar retardo.
- [ ] El contacto con un espectro en `chase` resta una vida, congela 1 s y reinicia posiciones y relojes de salida sin devolver los puntos ya comidos ni la puntuación.
- [ ] La tercera captura abre el modal "FIN DEL JUEGO" con la puntuación correcta; el botón FIN también lo abre.
- [ ] Limpiar los 244 comestibles abre el modal "FIN DEL JUEGO" una sola vez, con un máximo alcanzable de 14 600 puntos, y el laberinto queda congelado.
- [ ] El HUD React muestra puntuación y vidas (3→0) en tiempo real y nivel derivado; no muestra líneas; el canvas no dibuja Score, vidas ni overlays.
- [ ] No hay audio ni chip `SONIDO` en Glotón.
- [ ] PAUSA congela glotón, espectros, animaciones y el temporizador de inversión, y REANUDAR continúa sin saltos ni tiempo de inversión consumido; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "gloton"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=gloton`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia puntuación 0, 3 vidas, laberinto lleno, posiciones iniciales y estado "esperando", sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` conservan comportamiento y HUD; los demás ids conservan el placeholder simulado.
- [ ] `games` contiene la fila `gloton` con `title: GLOTÓN`, `category: ARCADE`, `color: yellow`, `cover: cover-glot`, `sort_order: 4`, y respeta los `CHECK`.
- [ ] El marco CRT cabe sin scroll en escritorio y el canvas escala en móvil sin desbordar, manteniendo la proporción 28/31.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `insert` de una fila nueva `gloton` con `sort_order: 4` — la tabla real (consultada con `select`) sólo tiene `arkanoid` (1), `tetris` (2), `snake` (3) y `asteroides` (6); la fila placeholder `gloton` la borró `20261005120000_remove_unimplemented_games.sql`. **No:** `update` de un placeholder (no queda ninguno libre que encaje) ni `delete from scores` previo (la FK ya cascadeó al borrarse la fila).
- **Sí:** reutilizar la portada `.cover-glot` existente (`app/globals.css`), diseñada para este juego en el prototipo. **No:** crear `.cover-gloton` (duplicaría estilo y dejaría la clase vieja huérfana).
- **Sí:** una **única regla de IA** (distancia euclídea en intersecciones, sin giro de 180°) para los cuatro espectros, diferenciados sólo por color y retardo de salida — es el recorte deliberado que hace de esta variante la de menor riesgo. **No:** personalidades, scatter ni temporizadores por nivel (es el riesgo de motor que la ficha 006 de `references/game-suggestions-todo.md` señala; vive en la variante C).
- **Sí:** laberinto **propio** de 28×31 escrito a mano en `levels.ts`, simétrico y con 240 puntos verificados por código. **No:** calcar celda a celda el trazado del original.
- **Sí:** un solo laberinto y victoria al limpiarlo. **No:** progresión de niveles ni aumento de velocidad (eso es la variante C).
- **Sí:** puntuación clásica 10 / 50 / 200-400-800-1600, techo 14 600 dentro de `0–9 999 999`. **No:** frutas ni bonus (añaden balance que esta variante no necesita).
- **Sí:** 3 vidas con `hasLives: true` y `onLives`. **No:** vidas extra por puntuación.
- **Sí:** `engineLevel: false` aceptando el nivel derivado del HUD — precedente de `specs/09-juego-snake.md`. **No:** tocar `game-player.tsx` para ocultar el nivel (cambio de contrato fuera de alcance).
- **Sí:** arranque quieto hasta la primera dirección, como en Snake — da tiempo a leer el laberinto. **No:** mover desde el primer frame.
- **Sí:** `P`/`Escape` pausan vía `onTogglePause` hacia el reproductor. **No:** pausa interna del motor ni overlay de pausa en canvas.
- **Sí:** aspecto vertical `28 / 31` declarado en el `GameEntry` y regla `.crt-tall:has(...)` nueva, como hizo Snake con 17/15. **No:** forzar el laberinto a `4 / 3` (celdas aplastadas) ni recortar filas.
- **Sí:** sin audio y sin assets: todo geometría de canvas. **No:** spritesheet ni mp3 (no existen en `references/` para este juego).
- **Sí:** mostrar en canvas el valor del espectro comido 800 ms. **No:** dibujar Score, vidas o nivel en canvas (los muestra React).
- **Sí:** motor TypeScript con `createGlotonGame(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script`.
- **Sí:** tope de `dt` de 50 ms y pausa por `visibilitychange`. **No:** `setInterval`.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni localStorage para scores.

## Riesgos identificados

| Riesgo                                                             | Mitigación                                                                                                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode duplica loop o listeners                               | `destroy()` completo; criterio de aceptación explícito.                                                                                                              |
| Teclas del juego interfieren con el input del modal                | Ignorar eventos con target `input`/`textarea`; pausar al abrir el modal.                                                                                             |
| `dt` grande al volver a la pestaña                                 | Tope de 50 ms y pausa con `visibilitychange`; el temporizador de inversión usa el mismo `dt` acotado.                                                                |
| El laberinto escrito a mano deja puntos inalcanzables o asimetrías | Paso 3 cuenta comestibles y valida alcanzabilidad por inundación antes de seguir; criterio de aceptación.                                                            |
| La IA euclídea encierra al glotón en un callejón sin escapatoria   | Los cuatro espectros salen escalonados (0/3/6/9 s) y las píldoras están en las cuatro esquinas; ajustar `GHOST_SPEED` en el paso 10 si la partida resulta injugable. |
| La IA euclídea hace que los cuatro espectros sigan la misma ruta   | Aceptado y declarado: es el recorte de esta variante; los retardos de salida y la asimetría de rutas los separan.                                                    |
| Desalineación por píxeles hace que un actor atraviese un muro      | Cambio de dirección sólo a ≤ 2 px del centro de celda y reencaje al centro en cada giro.                                                                             |
| Giro de 180° de los espectros produce movimiento errático          | Prohibido salvo en la inversión por píldora, una sola vez.                                                                                                           |
| El wrap del túnel deja el actor medio dibujado o descolocado       | Wrap sólo en la fila 17 y sólo al cruzar el centro de la celda extrema; verificación manual en el paso 10.                                                           |
| Marco vertical de 560×620 no cabe en pantallas bajas               | Regla `.crt-tall:has(.crt-screen[style*="28 / 31"])` con el mismo cálculo que 7/10 y 17/15; criterio de aceptación.                                                  |
| Scores falsos con clave publishable                                | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                                                         |
| Un solo proyecto Supabase para dev y prod                          | Limpiar filas de prueba de `scores` al cerrar (paso 11).                                                                                                             |
| Un `id`/slug distinto del `id` de `games` rompe la ruta            | La fila, la ruta `/juegos/gloton` y la carpeta `lib/games/gloton` usan el mismo slug.                                                                                |
| Añadir la entrada al registro rompe los cuatro juegos existentes   | No se toca el contrato (sólo campos ya existentes); paso 9 y criterio de aceptación los verifican.                                                                   |

## Qué **no** está en este spec

- Personalidades de espectro, scatter, temporizadores por nivel, ralentización en túnel.
- Más de un laberinto, niveles, `levelJump`, aumento de velocidad.
- Frutas, vidas extra, bonus por laberinto limpio.
- Audio de cualquier tipo, chip `SONIDO` y slider de volumen.
- Táctil/swipe, pantalla completa, guardado de partida.
- Assets externos y portada nueva.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
