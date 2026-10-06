# 09 — Juego SNAKE jugable con leaderboard

- **Estado:** Approved
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 08
- **Fecha:** 2026-10-05

**Objetivo:** Crear un Snake clásico estilo Google Snake en un módulo TypeScript jugable en `/juegos/snake/jugar` (reemplazando el placeholder `serpentina` del catálogo), usando como única referencia `references/source-assets/snake-assets` (frutas), con su leaderboard en Supabase.

## Por qué existe este spec

No hay código original que portar: `references/source-assets/snake-assets` solo trae el spritesheet de frutas (`fruits.png`) y su atlas (`sprites.js`). Las reglas, constantes y el dibujo de la serpiente se **definen aquí** (decisiones del usuario), no se extraen de un `game.js`. Por eso las constantes de la sección Alcance son la fuente de verdad para `/spec-impl`.

## Alcance

**Incluido:**

1. **Catálogo** — la fila `serpentina` de `games` pasa a `snake` (update, no insert). Migración `supabase/migrations/20261005120000_game_snake.sql` aplicada con `apply_migration`:
   - `id: "snake"`, `title: "SNAKE"`, `category: "ARCADE"`, `color: "green"`, `cover: "cover-snake"` (se reutiliza; no se crea `.cover-snake` nueva), `sort_order: 3` (sin cambio).
   - `short` se conserva: `Crece sin morder tu propia cola.`
   - `long` se reescribe para describir el juego real: tablero de 17×15, una fruta a la vez, +10 puntos por fruta, la serpiente crece, termina al chocar con pared o cuerpo, victoria al llenar el tablero. No menciona vidas, niveles, power-ups ni mecánicas ausentes.
   - `/juegos/serpentina` y `/juegos/serpentina/jugar` devuelven 404 (sin alias, igual que `caida` → `tetris` y `bloque-buster` → `arkanoid`).
   - `lib/home-data.ts`: la entrada de actividad reciente `game: "Serpentina"` pasa a `"Snake"`.
2. **Assets** en `public/games/snake/`: `fruits.png` (copia de `references/source-assets/snake-assets/fruits.png`; la referencia no se modifica).
3. **Motor** en `lib/games/snake/`: `constants.ts`, `sprites.ts`, `entities.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createSnakeGame(canvas, callbacks)` → `{ start, pause, resume, restart, destroy }`.
   - Callbacks: `onScore(score)`, `onGameOver(finalScore)`, `onTogglePause()`. Sin `onLives` ni `onLevel`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms y acumulador de tiempo: la serpiente avanza una celda cada `STEP_MS` (si se acumula más de un paso, se procesan en orden). `destroy()` cancela rAF, quita listeners y aborta una carga de sprites en curso.
   - Constantes definidas por el usuario:
     - Cuadrícula `COLS = 17`, `ROWS = 15`, `CELL = 40` px → canvas lógico **680×600**.
     - `STEP_MS = 125` (8 pasos/s), velocidad **constante** (sin aceleración, sin niveles).
     - Longitud inicial 3; cabeza en la celda `(col 4, row 7)` y cuerpo detrás, dirección inicial derecha.
     - Primera fruta en `(col 12, row 7)`; las siguientes en una celda libre aleatoria (que no ocupe la serpiente). Cada fruta usa un sprite elegido al azar de las 22 del atlas.
   - Reglas:
     - La partida arranca **quieta** (estado "esperando"); la serpiente empieza a moverse con la primera tecla de dirección válida (cualquier dirección salvo izquierda, que es hacia el cuerpo). `start()` no arranca el movimiento por sí solo.
     - Cada paso mueve la cabeza una celda en la dirección actual. Comer una fruta: **+10 puntos**, la serpiente crece 1 celda (no se quita la cola ese paso) y aparece una fruta nueva.
     - Dirección: no se admite giro de 180° (ignorar la tecla opuesta a la dirección **actual**); se guarda una cola de entrada de **máximo 2** direcciones para que giros rápidos entre pasos no se pierdan ni permitan reversa por doble tecla en el mismo paso.
     - Fin por choque: la cabeza sale del tablero o entra en una celda del cuerpo. La celda de la cola **se considera libre** si la serpiente no come en ese paso (la cola se retira); si come, la cola se queda y esa celda sí colisiona.
     - Victoria: la serpiente ocupa las 255 celdas (sin celda libre para fruta) → mismo `onGameOver(score)`. Puntuación máxima posible: `(255 − 3) × 10 = 2520`.
     - Win y game over llaman a `onGameOver` una sola vez; tras el fin, el canvas queda congelado en el último estado.
   - Dibujo en canvas (todo, incluido el tablero; no hay HUD ni overlays en canvas):
     - Tablero en cuadros oscuros alternos acordes al marco CRT.
     - Serpiente en neón verde: segmentos como rectángulos redondeados con glow, cabeza algo más clara con dos ojos orientados según la dirección.
     - Fruta con `drawImage` desde `fruits.png`, escalada **sin deformar** para caber en la celda con 2 px de margen y centrada.
   - Sin audio (los assets no incluyen sonidos).
4. **Atlas de sprites** `lib/games/snake/sprites.ts`: `SPRITE_ATLAS` tipado portado de `sprites.js` (22 frutas con `{ x, y, w, h }`, fuente `/games/snake/fruits.png`), sin `window`; carga del PNG con promesa cancelable; el motor espera la imagen antes de iniciar el loop. Si la imagen falla al cargar, la fruta se dibuja como círculo de color en lugar de abortar la partida.
5. **Componente cliente** `components/snake-canvas.tsx` (`"use client"`), mismo patrón que `components/arkanoid-canvas.tsx` y `components/tetris-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **680×600** escalado por CSS dentro de `.crt-screen` con `aspect: "17 / 15"`.
6. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `snake` **sin cambios en el contrato** (`GameEntry`/`GameCanvasProps` ya tienen todo lo necesario):
   - HUD: puntuación y **sin vidas** (`hasLives: false`). `engineLevel: false` → el HUD sigue mostrando el nivel derivado (`floor(score / 2500) + 1`, que en Snake siempre es `01` porque el máximo es 2520); aceptado, sin tocar `game-player.tsx`.
   - Sin chip de sonido (`hasSound` ausente) ni salto de nivel (`levelJump` ausente).
7. **Controles:**
   - `←↑→↓` y `W A S D` cambian la dirección; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - `preventDefault` solo en las flechas y `W A S D` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea` (también con modificadores `Ctrl`/`Meta`/`Alt` para no romper atajos del navegador). Con la partida pausada o terminada, las teclas de dirección no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← ↑ → ↓ / WASD mover · P pausa`.
8. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "snake", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=snake`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí solo se verifica.
9. **Pulido visual** con `/frontend-design`: marco CRT para 680×600 (aspecto 17/15), colores y glow del tablero y la serpiente, hint de controles, overlay de pausa. `.crt-fit` ya limita el ancho por el alto de la ventana; verificar que aplica al aspecto 17/15.
10. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Controles táctiles / swipe / móvil jugable, pantalla completa, guardado de partida en curso.
- Audio, música o efectos de sonido (y por tanto chip/slider de volumen).
- Niveles, aceleración, vidas, power-ups, frutas especiales, obstáculos, modo wrap-around, modos de dificultad o tamaños de tablero alternos.
- Animación de muerte o de comer; skins de serpiente.
- Un HUD de nivel que oculte el campo cuando el juego no tiene niveles (el HUD muestra `01`).
- Auth, anti-trampas, rate limit, scores ligados a usuario.
- Los demás juegos del catálogo (Glotón, Invasores, Ranaria, Duelo Pixel).
- Pruebas automatizadas (no hay test runner).
- Nueva portada: se reutiliza `.cover-snake`.

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Las filas de `scores` con `game_id = 'serpentina'` son pruebas del placeholder y se borran antes de renombrar, porque la FK `scores.game_id` no tiene `ON UPDATE CASCADE`:

```sql
delete from public.scores where game_id = 'serpentina';

update public.games set
  id    = 'snake',
  title = 'SNAKE',
  long  = 'Guía a la serpiente por un tablero de 17×15, come las frutas y crece sin chocar con las paredes ni con tu propio cuerpo. Cada fruta suma 10 puntos y la serpiente avanza a ritmo constante. Si llenas todo el tablero, ganas.'
where id = 'serpentina';
```

Tipos públicos del motor:

```ts
export type SnakeCallbacks = {
  onScore: (score: number) => void;
  onGameOver: (finalScore: number) => void; // choque y victoria
  onTogglePause: () => void;
};

export type SnakeGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  destroy(): void; // cancela rAF, quita listeners, aborta carga de sprites
};

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };

export type SpriteRect = { x: number; y: number; w: number; h: number };
export type FruitName = keyof typeof SPRITE_ATLAS.fruits; // 22 nombres
```

Entrada del registro:

```ts
snake: {
  Canvas: SnakeCanvas,
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "mover" },
    { keys: ["WASD"], label: "mover" },
    { keys: ["P"], label: "pausa" },
  ],
  engineLevel: false,
  hasLives: false,
  aspect: "17 / 15",
},
```

Archivos:

```
supabase/migrations/20261005120000_game_snake.sql   // nuevo
public/games/snake/fruits.png                       // nuevo (copia)
lib/games/snake/constants.ts                        // nuevo: COLS, ROWS, CELL, STEP_MS, longitud inicial, celdas iniciales, colores, URL del asset
lib/games/snake/sprites.ts                          // nuevo: SPRITE_ATLAS tipado, carga cancelable, drawFruit con ctx
lib/games/snake/entities.ts                         // nuevo: serpiente, fruta, colisiones, spawn en celda libre, dibujo
lib/games/snake/input.ts                            // nuevo: teclas, cola de direcciones, attach/detach
lib/games/snake/engine.ts                           // nuevo: createSnakeGame
components/snake-canvas.tsx                         // nuevo
lib/games/registry.ts                               // modificado: entrada snake
lib/home-data.ts                                    // modificado: "Serpentina" → "Snake"
app/globals.css                                     // modificado solo si el pulido lo requiere (aspecto 17/15, hint)
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` el catálogo y revisar los `scores` de `serpentina`.
2. **Migración del catálogo y assets** — SQL en `supabase/migrations/` + `apply_migration`; copiar `fruits.png` a `public/games/snake/`; actualizar `lib/home-data.ts`. Verificar `/juegos/snake` con la portada `cover-snake`, que `/juegos/serpentina` da 404 y que el leaderboard queda vacío.
3. **Constantes y atlas** — portar `SPRITE_ATLAS` y constantes a TypeScript estricto; carga del PNG con promesa cancelable; `ctx` por parámetro.
4. **Entidades** — serpiente (cuerpo como arreglo de celdas), fruta con spawn en celda libre, colisiones pared/cuerpo con la regla de la cola, dibujo de tablero, serpiente y fruta.
5. **Input** — `attachInput()` que devuelve la limpieza; cola de máximo 2 direcciones sin reversa; `preventDefault` solo en flechas y WASD; ignora `input`/`textarea` y teclas con modificadores.
6. **Motor** — estado en closure ("esperando"/"jugando"/"terminado"), acumulador de pasos con `dt` ≤ 50 ms, callbacks solo en cambios reales, `pause`/`resume`/`restart`/`destroy`, una sola salida de fin (win y choque llaman a `onGameOver` una vez).
7. **Componente `SnakeCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 680×600.
8. **Registro y reproductor (jugable)** — añadir la entrada `snake` al registro. Verificar partida completa de Snake y que `asteroides`, `tetris` y `arkanoid` siguen igual.
9. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover con flechas y WASD, comer, crecer, chocar con pared y con cuerpo, pausa, ganar si es viable forzando el estado en desarrollo), guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil. Capturas en `.playwright-screenshot`.
10. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'snake'`.

## Criterios de aceptación

- [ ] `/juegos/snake/jugar` muestra el juego dentro del marco CRT (proporción 17/15) con tablero de cuadros oscuros, serpiente de 3 celdas en `(col 4, row 7)` mirando a la derecha y una fruta en `(col 12, row 7)`; la serpiente no se mueve hasta pulsar una dirección válida.
- [ ] `/juegos/serpentina` y `/juegos/serpentina/jugar` devuelven 404; no queda `serpentina`/`Serpentina` en `app/`, `lib/` ni `components/`.
- [ ] La biblioteca, el home, el detalle y el Salón muestran "SNAKE" con la portada `cover-snake`.
- [ ] `←↑→↓` y `WASD` cambian la dirección; la página no hace scroll con esas teclas; escribir `w`/`a`/`s`/`d` en el input del modal no mueve la serpiente.
- [ ] La serpiente avanza una celda cada 125 ms a velocidad constante durante toda la partida.
- [ ] Pulsar la dirección opuesta a la actual se ignora; dos giros rápidos dentro del mismo paso se aplican uno por paso (máximo 2 en cola) sin provocar reversa ni choque indebido.
- [ ] Comer una fruta suma exactamente 10 puntos, alarga la serpiente 1 celda y genera una fruta nueva en una celda libre; el sprite de la fruta es uno de los 22 del atlas y se ve sin deformar y centrado en la celda.
- [ ] Salir del tablero o entrar en el cuerpo abre el modal "FIN DEL JUEGO" con la puntuación correcta; entrar en la celda de la cola que se retira ese mismo paso **no** es choque; entrar en ella cuando se come sí lo es.
- [ ] Ocupar las 255 celdas abre el modal "FIN DEL JUEGO" con 2520 puntos (una sola vez); el botón FIN también lo abre.
- [ ] El HUD React muestra puntuación en tiempo real, no muestra vidas ni líneas y muestra nivel `01`; el canvas no dibuja Score ni overlays.
- [ ] No hay audio ni chip de sonido en Snake.
- [ ] PAUSA congela la serpiente y REANUDAR continúa sin saltos (sin pasos extra por el tiempo en pausa); `P` y `Escape` alternan PAUSA/REANUDAR; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "snake"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=snake`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, longitud 3, posición y fruta iniciales, y estado "esperando" sin duplicar loop ni listeners; Strict Mode sin duplicados ni errores en consola.
- [ ] Si `fruits.png` no carga, la partida sigue con fruta de círculo de color y sin errores no controlados.
- [ ] `asteroides`, `tetris` y `arkanoid` conservan comportamiento y HUD; los demás juegos conservan el placeholder simulado.
- [ ] `games` contiene la fila `snake` con `title: SNAKE`, `category: ARCADE`, `color: green`, `cover: cover-snake`, `sort_order: 3`, y ya no existe `serpentina`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 17/15.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** reemplazar la fila `serpentina` por `snake` (update de `id`) — el id debe coincidir con la ruta y con `lib/games/snake`, como `caida` → `tetris` y `bloque-buster` → `arkanoid`. **No:** insertar fila nueva (dejaría el placeholder duplicado) ni conservar el id `serpentina` (la ruta no diría Snake).
- **Sí:** borrar los `scores` de `serpentina` antes del update — son pruebas de un placeholder y la FK no tiene `ON UPDATE CASCADE`. **No:** añadir `ON UPDATE CASCADE` (cambio de esquema fuera de alcance).
- **Sí:** reglas de Google Snake clásico (tablero 17×15, una fruta, muerte por pared o cuerpo, sin vidas ni niveles) — decisión del usuario. **No:** niveles de velocidad ni wrap-around.
- **Sí:** velocidad fija de 125 ms por paso y longitud inicial 3 — decisión del usuario sobre la base clásica. **No:** acelerar al comer.
- **Sí:** 10 puntos por fruta, fruta aleatoria entre las 22 del atlas — decisión del usuario; máximo 2520, dentro de 0–9.999.999. **No:** 1 punto por fruta (marcas muy bajas en el leaderboard) ni fruta única.
- **Sí:** arranque quieto hasta la primera dirección válida, como Google Snake. **No:** mover desde el primer frame (la serpiente chocaría antes de que el jugador reaccione).
- **Sí:** flechas y WASD, `P`/`Escape` para pausa por `onTogglePause` — una sola fuente de verdad en React. **No:** pausa interna del motor ni overlay de pausa en canvas.
- **Sí:** cola de entrada de máximo 2 direcciones y bloqueo de reversa contra la dirección actual. **No:** comprobar solo contra la última tecla pulsada (permite reversa al pulsar dos teclas en un paso).
- **Sí:** la celda de la cola cuenta como libre si no se come ese paso (comportamiento estándar). **No:** tratarla siempre como ocupada (mataría a la serpiente en giros legales).
- **Sí:** victoria al llenar las 255 celdas con el mismo modal de fin. **No:** bonus por victoria ni pantalla distinta (mecánica nueva).
- **Sí:** serpiente y tablero dibujados en canvas con estilo neón verde sobre cuadros oscuros, y frutas del atlas — decisión del usuario; los assets no traen sprites de serpiente. **No:** copiar el estilo azul/verde de Google (choca con la paleta del sitio).
- **Sí:** spritesheet `fruits.png` original servido desde `public/games/snake/` y atlas portado a `sprites.ts` tipado, sin `window`. **No:** `next/script` con `sprites.js` tal cual ni recortar 22 PNG individuales.
- **Sí:** fallback a círculo de color si falla la imagen. **No:** abortar la partida por un asset.
- **Sí:** sin audio. **No:** añadir sonidos que el material de origen no incluye.
- **Sí:** `engineLevel: false` y aceptar que el HUD muestra nivel `01`. **No:** modificar `game-player.tsx` para ocultar el nivel (cambio de contrato fuera de alcance; spec aparte si se quiere).
- **Sí:** tope de `dt` de 50 ms y acumulador de pasos — evita saltos al volver a la pestaña. **No:** `setInterval` (se desincroniza con la pausa y el `visibilitychange`).
- **Sí:** motor TypeScript con `createSnakeGame(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script`.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni localStorage para scores.
- **Sí:** reutilizar `.cover-snake`. **No:** crear portada nueva.

## Riesgos identificados

| Riesgo                                                                  | Mitigación                                                                                         |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Strict Mode duplica loop, listeners o carga del spritesheet             | `destroy()` completo y carga cancelable; criterio de aceptación explícito.                         |
| Teclas del juego interfieren con el input del modal                     | Ignorar eventos con target `input`/`textarea`; pausar al abrir el modal.                           |
| `dt` grande al volver a la pestaña                                      | Tope de 50 ms y pausa con `visibilitychange`.                                                      |
| El `update` del `id` falla por FK si hay `scores` de `serpentina`       | La migración borra primero esas filas; el paso 1 las revisa antes.                                 |
| Giros rápidos pierden o invierten la dirección                          | Cola de máximo 2 direcciones validadas contra la dirección actual; criterio de aceptación.         |
| Generar fruta con el tablero casi lleno es lento o infinito             | Elegir al azar entre la lista de celdas libres, no por reintento; sin celdas libres → victoria.    |
| Coordenadas del atlas (calculadas por análisis de píxeles) recortan mal | Verificar las 22 frutas visualmente en el paso 9; ajustar `x/y/w/h` en `sprites.ts` si hace falta. |
| Frutas con proporciones distintas se deforman en la celda de 40 px      | Escalado proporcional con margen de 2 px, centrado; criterio de aceptación.                        |
| El HUD muestra nivel `01` fijo sin sentido                              | Aceptado y documentado; spec aparte si se quiere ocultar.                                          |
| Imagen del atlas no carga                                               | Fallback a círculo de color; la partida continúa.                                                  |
| Scores falsos con clave publishable                                     | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                       |
| Un solo proyecto Supabase para dev y prod                               | Limpiar filas de prueba de `scores` al cerrar (paso 10).                                           |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                 | La fila, la carpeta `lib/games/snake` y `public/games/snake` usan el mismo slug.                   |
| Ampliar el registro rompe `asteroides`, `tetris` o `arkanoid`           | No se toca el contrato; paso 8 y criterio de aceptación verifican los tres.                        |

## Qué **no** está en este spec

- Táctil/swipe, pantalla completa, guardado de partida.
- Audio de cualquier tipo.
- Niveles, aceleración, vidas, power-ups, frutas especiales, obstáculos, wrap-around, modos de dificultad.
- Animaciones de muerte/comer y skins.
- Ocultar el nivel del HUD.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
