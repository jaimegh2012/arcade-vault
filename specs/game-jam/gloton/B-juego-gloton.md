# GLOTÓN — variante B: con twist «eco de la píldora»

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 09
- **Fecha:** 2026-10-12
- **Game jam:** tema «laberinto de persecución — un glotón recorre un laberinto comiendo puntos mientras cuatro espectros lo cazan, hasta que una píldora invierte los papeles» · variante B de 3 · hermanas `A-juego-gloton.md`, `C-juego-gloton.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/10-juego-gloton.md` y ejecutar `/spec-impl 10-juego-gloton`

**Objetivo:** Un laberinto de persecución jugable en `/juegos/gloton/jugar` donde cada espectro devorado alarga la inversión de papeles y encadena un multiplicador que no se reinicia mientras la caza siga viva.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, ya portados, y no hay assets de Glotón en `references/source-assets/`. El prototipo (`references/templates/data.jsx`) aporta únicamente la fila de catálogo y la portada. Las reglas, el trazado del laberinto, las constantes, la IA de los espectros y la mecánica del **eco de la píldora** se **definen aquí**, no se extraen de un `game.js`. Por eso las constantes de la sección Alcance son la fuente de verdad para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (insert, no update: la migración `20261005120000_remove_unimplemented_games.sql` borró la fila placeholder `gloton`, así que no queda ningún placeholder que reemplazar y `scores` no tiene filas con `game_id = 'gloton'`). Migración `supabase/migrations/<timestamp>_game_gloton.sql` aplicada con `apply_migration`:
   - `id: "gloton"`, `title: "GLOTÓN"`, `category: "ARCADE"`, `color: "yellow"`, `cover: "cover-glot"` (la clase **ya existe** en `app/globals.css`; no se crea ninguna portada), `sort_order: 4` (hueco libre: la tabla real usa 1, 2, 3 y 6).
   - `short` del prototipo: `Devora puntos y escapa de los fantasmas.`
   - `long` describe **este** juego: laberinto único de 28×31 celdas, 240 puntos, 4 píldoras, inversión que se alarga 1,5 s por espectro devorado y cadena que llega a 12 800 puntos, 3 vidas, victoria al limpiar el laberinto. No menciona frutas, niveles, sonido ni personalidades de espectro (no existen aquí).
   - `lib/home-data.ts` ya usa `game: "Glotón"` en la actividad reciente: **no se toca**.
2. **Assets** — ninguno. Todo se dibuja con geometría de canvas 2D (arcos, rectángulos redondeados y gradientes). No se crea `public/games/gloton/`.
3. **Motor** en `lib/games/gloton/`: `constants.ts`, `levels.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createGlotonGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onChain(chain)`, `onGameOver(finalScore)`, `onTogglePause()`. Sin `onLevel` (un solo laberinto) ni `onLines`.
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
     - `GLOTON_SPEED = 150` px/s (7,5 celdas/s). El glotón mantiene la última dirección válida; si la siguiente celda es muro, se detiene pegado al centro de la celda actual y conserva la dirección pulsada como intención.
     - La partida arranca **quieta**: el glotón y el reloj de salida de espectros empiezan con la primera tecla de dirección. `start()` no mueve nada por sí solo.
   - **IA de los espectros — una sola regla de caza para los cuatro:**
     - Estado `chase` por defecto. En el centro de cada celda que sea **intersección** (más de dos vecinos no-muro) o **callejón**, el espectro elige entre las direcciones no-muro **excluyendo la inversa de la actual** (prohibido el giro de 180°) la que minimice la distancia euclídea del centro de la celda vecina al centro de la celda del glotón. Empate → orden `arriba, izquierda, abajo, derecha`. Fuera de intersecciones sigue recto o toma el único pasillo disponible.
     - `GHOST_SPEED = 130` px/s en `chase`; `GHOST_SPEED_FRIGHT = 85` px/s; `GHOST_SPEED_EYES = 250` px/s.
     - **Sin modo scatter, sin personalidades, sin temporizadores por nivel.** Los cuatro espectros se diferencian **sólo** en color (rojo, rosa, cian, naranja) y en el retardo de salida de la casa: `0 / 3000 / 6000 / 9000` ms desde el arranque del movimiento de cada vida. Salen subiendo por la puerta hasta `(13, 13)` y a partir de ahí entran en `chase`.
     - Dentro de la casa oscilan verticalmente ± 6 px (sólo animación).
   - **Twist: el ECO DE LA PÍLDORA (la mecánica propia de esta variante).** La inversión de papeles no es un temporizador fijo que se consume: es un **eco recargable** que los espectros devorados alimentan, y la cadena sólo muere cuando el eco se apaga.
     - `FRIGHT_BASE_MS = 5000`: comer una píldora pone en `frightened` a los espectros en `chase`, invierte su dirección una vez y fija el eco restante en **al menos** 5000 ms (si ya quedaba más, se conserva el mayor).
     - `FRIGHT_BONUS_MS = 1500`: cada espectro devorado **suma** 1500 ms al eco restante, con tope `FRIGHT_CAP_MS = 12000`.
     - **La cadena no se reinicia por píldora**: el contador `chain` crece con cada espectro devorado y sólo vuelve a 0 cuando el eco llega a 0 (o al perder una vida, o al reiniciar). Comer una píldora **durante** un eco activo lo recarga sin tocar la cadena: así se puede hilar las cuatro píldoras en una sola caza.
     - El eco restante se dibuja en canvas como un anillo que se cierra alrededor del glotón (información espacial que el HUD no puede dar); el **valor de la cadena** sí va al HUD React (ver punto 5).
     - Los espectros en estado `eyes` (ya devorados, volviendo a la casa) no entran en `frightened` con una píldora nueva: al llegar a la casa reaparecen en `chase`, cazables de nuevo sólo con otra píldora.
   - **Puntuación (números exactos):**
     - Punto: **+10**. Píldora: **+50**.
     - Espectro devorado, según el valor de la cadena **acumulada durante el eco en curso**: 1.º **200**, 2.º **400**, 3.º **800**, 4.º **1600**, 5.º **3200**, 6.º **6400**, 7.º **12 800**, y del 8.º en adelante **12 800** fijo.
     - Sin frutas, sin bonus de nivel, sin vidas extra.
     - **Techo alcanzable (teórico, una sola cadena ininterrumpida de 16 espectros):** `240 × 10` (2400) `+ 4 × 50` (200) `+ (200 + 400 + 800 + 1600 + 3200 + 6400 + 12 800)` (25 400) `+ 9 × 12 800` (115 200) = **143 200**, dentro de `0–9 999 999`. Jugando sin encadenar entre píldoras el techo es 14 600, así que el twist es lo que separa una buena partida de una excelente.
   - **Vidas y fin:**
     - `LIVES = 3`. Contacto con un espectro en `chase` (solape de centros a < 10 px): −1 vida, congelación de 1000 ms, reinicio de posiciones y relojes de salida, **eco a 0 y cadena a 0**; los puntos comidos no reaparecen y la puntuación se conserva.
     - Espectro devorado en `frightened`: pasa a `eyes`, vuelve por los pasillos a la casa `(13, 15)` y al llegar entra en `chase` otra vez.
     - Fin por vidas a 0 → `onGameOver(score)`.
     - **Victoria:** comer los 244 comestibles (240 puntos + 4 píldoras) → `onGameOver(score)` con el laberinto congelado. **No hay laberinto siguiente.**
     - Game over y victoria llaman a `onGameOver` **una sola vez**.
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): muros de neón de 3 px con glow, puntos de 3 px, píldoras de 7 px que pulsan a 2 Hz, glotón como arco amarillo animado a 6 Hz, espectros con cuerpo redondeado y ojos orientados, estado `eyes` sólo ojos, el **anillo de eco** alrededor del glotón (arco que se cierra en proporción al eco restante, blanco cuando queda < 1500 ms) y el valor del espectro devorado (`200`…`12 800`) como texto flotante 800 ms en la celda de la captura. **Nada de Score, vidas, cadena, nivel ni overlays de pausa/fin en canvas.**
   - Sin audio.
4. **Componente cliente** `components/gloton-canvas.tsx` (`"use client"`), mismo patrón que `components/snake-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **560×620** escalado por CSS dentro de `.crt-screen` con `aspect: "28 / 31"`.
5. **Registro, contrato y reproductor** — `lib/games/registry.ts` añade la entrada `gloton` y el contrato se amplía con **un único campo de HUD nuevo**, calcado del par `hasLines`/`onLines` que introdujo el SPEC 07:
   - `GameEntry` gana `hasChain?: boolean`; `GameCanvasProps` gana `onChain?: (chain: number) => void`.
   - `components/game-player.tsx`: si la entrada declara `hasChain`, el HUD añade el campo **CADENA** con el valor `x0`–`x7+` (0 cuando no hay eco activo), con el mismo estilo que `LÍNEAS` de Tetris. Los juegos sin `hasChain` no cambian.
   - HUD de `gloton`: puntuación, **vidas** (`hasLives: true`) y **cadena** (`hasChain: true`). `engineLevel: false` → el HUD sigue mostrando el nivel derivado (`floor(score / 2500) + 1`); aceptado, sin más cambios en `game-player.tsx`.
   - Sin chip de sonido (`hasSound` ausente), sin salto de nivel (`levelJump` ausente), sin líneas ni estilos de bloque.
6. **Controles:**
   - `←↑→↓` y `W A S D` fijan la dirección; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - `preventDefault` sólo en las flechas y `W A S D` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan modificadores `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada las direcciones no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← ↑ → ↓ / WASD mover · P pausa`.
7. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "gloton", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=gloton`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
8. **Pulido visual** con `/frontend-design`: marco CRT vertical para 560×620, regla nueva `.crt-tall:has(.crt-screen[style*="28 / 31"])` en `app/globals.css` con el mismo cálculo que las de 7/10 y 17/15 (precedente del SPEC 09), estilo del campo CADENA en el HUD, anillo de eco, colores y glow del laberinto, hint de controles, overlay de pausa. `game-player.tsx` ya aplica `crt crt-tall` cuando la entrada declara `aspect`.
9. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Personalidades de espectro, modo scatter, temporizadores por nivel, contadores de puntos para la salida de la casa, ralentización en túnel.
- Más de un laberinto, niveles, aumento de velocidad, `levelJump`.
- Frutas, vidas extra por puntuación, bonus por laberinto limpio.
- Audio de cualquier tipo (y por tanto chip `SONIDO` y slider de volumen).
- Más campos de HUD que `CADENA` (por ejemplo un contador numérico de eco restante: el eco se ve como anillo en canvas).
- Controles táctiles / swipe / móvil jugable, pantalla completa, guardado de partida en curso.
- Animación de muerte del glotón, cinemáticas.
- Assets externos (imágenes, spritesheets, sonidos) y portada nueva: se reutiliza `.cover-glot`.
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos del catálogo (Invasores, Ranaria, Duelo Pixel).
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Es un **insert**: la fila placeholder `gloton` ya no existe y, al haberse borrado con `on delete cascade`, tampoco hay `scores` con `game_id = 'gloton'`:

```sql
insert into public.games (id, title, short, long, category, cover, color, sort_order) values
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.',
   'Recorre un laberinto de 28×31 celdas devorando sus 240 puntos mientras cuatro espectros te cazan. Cada píldora invierte los papeles y cada espectro devorado alarga esa inversión 1,5 segundos: si encadenas, la presa sube de 200 a 12 800 puntos por espectro. Tienes 3 vidas y un único laberinto: límpialo entero y ganas.',
   'ARCADE', 'cover-glot', 'yellow', 4);
```

Tipos públicos del motor:

```ts
export type GlotonCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onChain: (chain: number) => void; // espectros devorados en el eco en curso; 0 si no hay eco
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

// Valor del espectro n-ésimo del eco en curso (n ≥ 1)
export const CHAIN_VALUES = [200, 400, 800, 1600, 3200, 6400, 12800] as const;
```

Ampliación del contrato común y del registro (`lib/games/types.ts`, `lib/games/registry.ts`), calcada de `hasLines`/`onLines` del SPEC 07:

```ts
// GameCanvasProps — campo opcional nuevo
onChain?: (chain: number) => void;

// GameEntry — campo opcional nuevo
hasChain?: boolean; // true: el HUD añade CADENA
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
  hasChain: true,
  aspect: "28 / 31",
},
```

Archivos:

```
supabase/migrations/<timestamp>_game_gloton.sql   // nuevo: insert de la fila gloton
lib/games/gloton/constants.ts                     // nuevo: COLS, ROWS, CELL, velocidades, FRIGHT_BASE_MS/BONUS/CAP, CHAIN_VALUES, LIVES, retardos, colores
lib/games/gloton/levels.ts                        // nuevo: MAZE (31 cadenas de 28 chars), parseo a rejilla de Tile, celdas iniciales, túnel, casa
lib/games/gloton/entities.ts                      // nuevo: glotón, espectros, movimiento en rejilla, colisiones, anillo de eco, dibujo con ctx
lib/games/gloton/input.ts                         // nuevo: teclas, intención de dirección, attach/detach
lib/games/gloton/engine.ts                        // nuevo: createGlotonGame con el eco y la cadena
components/gloton-canvas.tsx                      // nuevo
lib/games/types.ts                                // modificado: onChain
lib/games/registry.ts                             // modificado: hasChain + entrada gloton
components/game-player.tsx                        // modificado: campo CADENA en el HUD cuando hasChain
app/globals.css                                   // modificado: regla .crt-tall para el aspecto 28 / 31, estilo del campo CADENA y pulido
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `gloton` no existe en `games`, que `sort_order: 4` sigue libre y que no hay `scores` con `game_id = 'gloton'`.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`. Verificar `/juegos/gloton` con la portada `cover-glot`, su presencia en biblioteca y home, y el leaderboard vacío. `/juegos/gloton/jugar` muestra aún el placeholder simulado.
3. **Constantes y laberinto** — escribir `MAZE` y parsearlo a rejilla tipada; **contar por código los comestibles y comprobar que son 240 puntos + 4 píldoras**; validar simetría, alcanzabilidad de todas las celdas comestibles y el wrap de la fila 17.
4. **Entidades y movimiento** — glotón y espectros sobre la rejilla: alineación al centro de celda, prohibición de giro de 180° en espectros, wrap del túnel, dibujo de muros, puntos, píldoras, glotón y espectros.
5. **Input** — `attachInput()` que devuelve la limpieza; intención de dirección aplicada en el siguiente centro de celda válido; `preventDefault` sólo en flechas y WASD; ignora `input`/`textarea` y teclas con modificadores.
6. **IA de caza** — regla única de distancia euclídea en intersecciones, retardos de salida `0/3/6/9` s, `frightened` aleatorio con parpadeo final y `eyes` de vuelta a la casa.
7. **Eco y cadena (el twist)** — temporizador de eco con base 5000 ms, bonus 1500 ms por espectro y tope 12 000 ms; cadena persistente mientras el eco siga vivo, recarga sin reinicio al comer otra píldora, reinicio a 0 al apagarse el eco, al perder vida y al reiniciar; `CHAIN_VALUES` aplicadas con tope en 12 800; anillo de eco dibujado en canvas.
8. **Motor** — estado en closure (`esperando`/`jugando`/`capturado`/`terminado`), `dt` ≤ 50 ms, puntuación, vidas, `onChain` sólo en cambios reales, `pause`/`resume`/`restart`/`destroy`, una sola salida de fin.
9. **Componente `GlotonCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 560×620, prop `onChain`.
10. **Contrato, registro y reproductor (jugable)** — añadir `onChain` a `GameCanvasProps`, `hasChain` a `GameEntry`, la entrada `gloton` y el campo CADENA al HUD. Verificar partida completa y que `asteroides`, `tetris`, `arkanoid` y `snake` siguen igual (en especial que `LÍNEAS` de Tetris no se ve afectado).
11. **Pulido y verificación manual** — con `/frontend-design`; regla `.crt-tall` del aspecto 28/31 y estilo de CADENA; partida completa (comer puntos, píldora, devorar 2 espectros, recargar con otra píldora sin perder la cadena, llegar a 3200, túnel, captura, pausa, victoria forzando el estado en desarrollo), guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil. Capturas en `.playwright-screenshot`.
12. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'gloton'`.

## Criterios de aceptación

- [ ] `/juegos/gloton/jugar` muestra el laberinto completo dentro del marco CRT con proporción 28/31, el glotón en `(13, 23)` mirando a la izquierda y los cuatro espectros en sus posiciones iniciales; nada se mueve hasta pulsar una dirección.
- [ ] El laberinto contiene exactamente 240 puntos y 4 píldoras, todas alcanzables.
- [ ] `←↑→↓` y `WASD` mueven el glotón a 150 px/s; la página no hace scroll con esas teclas; escribir `w`/`a`/`s`/`d` en el input del modal no mueve el glotón.
- [ ] Entrar en la fila 17 por la columna 0 reaparece en la 27 y al revés; no hay wrap en ninguna otra fila ni columna.
- [ ] Cada punto suma exactamente 10 y cada píldora exactamente 50.
- [ ] Los cuatro espectros salen a los 0, 3, 6 y 9 s del primer movimiento de cada vida y en `chase` nunca giran 180°.
- [ ] Comer una píldora sin eco activo pone el eco en 5,0 s exactos, pone en azul a los espectros en `chase` e invierte su dirección una vez.
- [ ] Devorar un espectro **suma 1,5 s** al eco restante, sin pasar de 12,0 s; el anillo de eco del canvas crece al hacerlo.
- [ ] Comer una píldora con eco activo recarga el eco a un mínimo de 5,0 s y **no reinicia la cadena**: el espectro siguiente vale el valor que le toca por cadena (p. ej. 3200 si ya se devoraron 4).
- [ ] La secuencia de valores por espectro devorado dentro de un mismo eco es exactamente 200, 400, 800, 1600, 3200, 6400, 12 800 y luego 12 800 fijo, con el valor visible 800 ms en la celda.
- [ ] Al llegar el eco a 0 la cadena vuelve a 0 y los espectros vuelven a `chase` a 130 px/s; perder una vida también pone eco y cadena a 0.
- [ ] El HUD React muestra puntuación, vidas (3→0) y **CADENA** en tiempo real; CADENA marca `x0` sin eco y sube con cada espectro devorado; el canvas no dibuja Score, vidas ni cadena.
- [ ] Tetris sigue mostrando `LÍNEAS` y ningún otro juego muestra `CADENA`.
- [ ] Un espectro devorado vuelve a la casa como ojos a 250 px/s, reanuda `chase` al llegar y no se vuelve azul con una píldora comida mientras era ojos.
- [ ] El contacto con un espectro en `chase` resta una vida, congela 1 s y reinicia posiciones y relojes sin devolver los puntos comidos; la tercera captura abre el modal "FIN DEL JUEGO" con la puntuación correcta; el botón FIN también lo abre.
- [ ] Limpiar los 244 comestibles abre el modal "FIN DEL JUEGO" una sola vez; el techo teórico es 143 200 puntos y el canvas queda congelado.
- [ ] No hay audio ni chip `SONIDO` en Glotón.
- [ ] PAUSA congela glotón, espectros, animaciones **y el eco** (al reanudar el eco restante es el mismo que al pausar); `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "gloton"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=gloton`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia puntuación 0, 3 vidas, cadena 0, eco 0, laberinto lleno y estado "esperando", sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` conservan comportamiento y HUD tras ampliar el contrato; los demás ids conservan el placeholder simulado.
- [ ] `games` contiene la fila `gloton` con `title: GLOTÓN`, `category: ARCADE`, `color: yellow`, `cover: cover-glot`, `sort_order: 4`, y respeta los `CHECK`.
- [ ] El marco CRT cabe sin scroll en escritorio y el canvas escala en móvil sin desbordar, manteniendo la proporción 28/31.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `insert` de una fila nueva `gloton` con `sort_order: 4` — la tabla real (consultada con `select`) sólo tiene `arkanoid` (1), `tetris` (2), `snake` (3) y `asteroides` (6); la fila placeholder `gloton` la borró `20261005120000_remove_unimplemented_games.sql`. **No:** `update` de un placeholder (no queda ninguno) ni `delete from scores` previo (la FK ya cascadeó).
- **Sí:** reutilizar la portada `.cover-glot` existente. **No:** crear `.cover-gloton`.
- **Sí:** el **eco de la píldora** como única mecánica propia: temporizador recargable (+1,5 s por espectro, tope 12 s) y cadena que no se reinicia entre píldoras. Es lo que convierte el tema («una píldora invierte los papeles») en una decisión de juego: ¿comes la píldora siguiente ya, para alargar la caza, o la guardas? **No:** dos o tres mecánicas nuevas (frutas, power-ups, atajos): el twist debe ser uno y medible.
- **Sí:** cadena extendida a 3200 / 6400 / 12 800 — sin ella el eco no cambiaría la fórmula de puntuación y el twist sería cosmético. **No:** multiplicador sobre los puntos del laberinto (haría ilegible de dónde vienen las marcas).
- **Sí:** tope de 12 800 por espectro y techo teórico 143 200, dentro de `0–9 999 999` con cuatro órdenes de magnitud de margen. **No:** cadena sin tope (abre la puerta a marcas absurdas con partidas larguísimas).
- **Sí:** **un único** campo de HUD nuevo, `CADENA`, con el par `hasChain`/`onChain` calcado de `hasLines`/`onLines` del SPEC 07. **No:** un segundo campo con el eco restante (va como anillo en canvas, que es información espacial) ni ramas `if (game.id === "gloton")` en `game-player.tsx`.
- **Sí:** una **única regla de IA** (distancia euclídea en intersecciones, sin giro de 180°) para los cuatro espectros, diferenciados por color y retardo de salida — mantiene el riesgo del motor acotado para que el presupuesto se gaste en el twist. **No:** personalidades, scatter ni temporizadores por nivel (es el riesgo que la ficha 006 de `references/game-suggestions-todo.md` señala; vive en la variante C).
- **Sí:** laberinto **propio** de 28×31 escrito a mano en `levels.ts`, con 240 puntos verificados por código. **No:** calcar celda a celda el trazado del original.
- **Sí:** un solo laberinto y victoria al limpiarlo. **No:** progresión de niveles ni aumento de velocidad.
- **Sí:** 3 vidas con `hasLives: true`; el eco y la cadena se pierden con la vida (hace que la caza larga tenga riesgo real). **No:** conservar la cadena entre vidas ni dar vidas extra por puntuación.
- **Sí:** `engineLevel: false` aceptando el nivel derivado del HUD — precedente de `specs/09-juego-snake.md`. **No:** tocar el HUD de nivel.
- **Sí:** arranque quieto hasta la primera dirección. **No:** mover desde el primer frame.
- **Sí:** `P`/`Escape` pausan vía `onTogglePause`, y la pausa congela el eco. **No:** pausa interna del motor ni dejar el eco corriendo en pausa (se perdería la caza sin jugar).
- **Sí:** aspecto vertical `28 / 31` en el `GameEntry` y regla `.crt-tall:has(...)` nueva, como hizo Snake con 17/15. **No:** forzar `4 / 3`.
- **Sí:** sin audio y sin assets: todo geometría de canvas. **No:** spritesheet ni mp3.
- **Sí:** motor TypeScript con `createGlotonGame(canvas, callbacks)`. **No:** `iframe` ni `next/script`.
- **Sí:** tope de `dt` de 50 ms y pausa por `visibilitychange`. **No:** `setInterval`.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni localStorage para scores.

## Riesgos identificados

| Riesgo                                                                | Mitigación                                                                                                                           |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Strict Mode duplica loop o listeners                                  | `destroy()` completo; criterio de aceptación explícito.                                                                              |
| Teclas del juego interfieren con el input del modal                   | Ignorar eventos con target `input`/`textarea`; pausar al abrir el modal.                                                             |
| `dt` grande al volver a la pestaña regala eco                         | Tope de 50 ms, pausa con `visibilitychange` y eco descontado con el mismo `dt` acotado; criterio de aceptación sobre la pausa.       |
| El eco recargable hace el juego trivial (caza permanente)             | Tope `FRIGHT_CAP_MS = 12 000`, sólo 4 píldoras en todo el laberinto y pérdida total de eco y cadena al ser capturado.                |
| La cadena extendida infla las marcas y aplasta a los demás juegos     | Los leaderboards son por `game_id`: no se comparan entre juegos. Techo 143 200, holgado dentro de `0–9 999 999`.                     |
| Ampliar `GameEntry`/`GameCanvasProps` rompe `tetris` (campo `LÍNEAS`) | Campos opcionales; paso 10 y criterio de aceptación verifican los cuatro juegos y en especial el HUD de Tetris.                      |
| El laberinto escrito a mano deja puntos inalcanzables o asimetrías    | Paso 3 cuenta comestibles y valida alcanzabilidad por inundación; criterio de aceptación.                                            |
| La IA euclídea encierra al glotón sin escapatoria                     | Salida escalonada (0/3/6/9 s), píldoras en las cuatro esquinas y el eco como válvula de escape; ajustar `GHOST_SPEED` en el paso 11. |
| Desalineación por píxeles hace que un actor atraviese un muro         | Cambio de dirección sólo a ≤ 2 px del centro de celda y reencaje al centro en cada giro.                                             |
| El anillo de eco tapa el laberinto alrededor del glotón               | Trazo fino y translúcido, radio dentro de la celda y media; revisión en el paso 11 con `/frontend-design`.                           |
| El wrap del túnel deja el actor medio dibujado o descolocado          | Wrap sólo en la fila 17 y sólo al cruzar el centro de la celda extrema; verificación manual.                                         |
| Marco vertical de 560×620 no cabe en pantallas bajas                  | Regla `.crt-tall:has(.crt-screen[style*="28 / 31"])`; criterio de aceptación.                                                        |
| Scores falsos con clave publishable                                   | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                         |
| Un solo proyecto Supabase para dev y prod                             | Limpiar filas de prueba de `scores` al cerrar (paso 12).                                                                             |
| Un `id`/slug distinto del `id` de `games` rompe la ruta               | La fila, la ruta `/juegos/gloton` y la carpeta `lib/games/gloton` usan el mismo slug.                                                |

## Qué **no** está en este spec

- Personalidades de espectro, scatter, temporizadores por nivel, ralentización en túnel.
- Más de un laberinto, niveles, `levelJump`, aumento de velocidad.
- Frutas, vidas extra, bonus por laberinto limpio.
- Audio de cualquier tipo, chip `SONIDO` y slider de volumen.
- Más campos de HUD que `CADENA`.
- Táctil/swipe, pantalla completa, guardado de partida.
- Assets externos y portada nueva.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
