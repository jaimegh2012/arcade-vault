# GLOTÓN — variante C: de autor, el cuarteto con personalidades

- **Estado:** Borrador
- **Depende de:** SPEC 05, SPEC 06, SPEC 07, SPEC 08, SPEC 09
- **Fecha:** 2026-10-12
- **Game jam:** tema «laberinto de persecución — un glotón recorre un laberinto comiendo puntos mientras cuatro espectros lo cazan, hasta que una píldora invierte los papeles» · variante C de 3 · hermanas `A-juego-gloton.md`, `B-juego-gloton.md`
- **Al aprobar:** poner `Estado: Aprobado`, copiar a `specs/10-juego-gloton.md` y ejecutar `/spec-impl 10-juego-gloton`

**Objetivo:** Un laberinto de persecución de cinco niveles jugable en `/juegos/gloton/jugar`, con cuatro espectros de personalidad distinta gobernados por una máquina de estados scatter/chase/frightened con temporizadores por nivel, frutas, sonido sintetizado y salto de nivel.

## Por qué existe este spec

No hay código original que portar: `references/started-games/` sólo contiene `02-asteroids`, `03-tetris` y `04-arkanoid`, ya portados, y no hay assets de Glotón en `references/source-assets/`. El prototipo (`references/templates/data.jsx`) aporta únicamente la fila de catálogo y la portada. Las reglas, los dos trazados de laberinto, las tablas de niveles, las personalidades de los espectros y los sonidos se **definen aquí**, no se extraen de un `game.js`. Por eso las constantes y las tablas de la sección Alcance son la fuente de verdad para `/spec-impl`, igual que en `specs/09-juego-snake.md`.

## Alcance

**Incluido:**

1. **Catálogo** — fila **nueva** en `games` (insert, no update: la migración `20261005120000_remove_unimplemented_games.sql` borró la fila placeholder `gloton`, así que no queda ningún placeholder que reemplazar y `scores` no tiene filas con `game_id = 'gloton'`). Migración `supabase/migrations/<timestamp>_game_gloton.sql` aplicada con `apply_migration`:
   - `id: "gloton"`, `title: "GLOTÓN"`, `category: "ARCADE"`, `color: "yellow"`, `cover: "cover-glot"` (la clase **ya existe** en `app/globals.css`; no se crea ninguna portada), `sort_order: 4` (hueco libre: la tabla real usa 1, 2, 3 y 6).
   - `short` del prototipo: `Devora puntos y escapa de los fantasmas.`
   - `long` describe **este** juego: cinco niveles sobre dos trazados de 28×31, cuatro espectros con conductas distintas que alternan patrulla y caza, píldoras que invierten los papeles, frutas, 3 vidas más una extra a los 10 000 puntos y sonido. No menciona mecánicas ausentes.
   - `lib/home-data.ts` ya usa `game: "Glotón"` en la actividad reciente: **no se toca**.
2. **Assets** — ninguno externo. El laberinto y los actores se dibujan con geometría de canvas 2D, y **el sonido se sintetiza con la Web Audio API** (`OscillatorNode` + `GainNode`): no se añaden mp3, ni imágenes, ni dependencias, ni `public/games/gloton/`.
3. **Motor** en `lib/games/gloton/`: `constants.ts`, `levels.ts`, `entities.ts`, `ai.ts`, `audio.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createGlotonGame(canvas, callbacks)` → `{ start, pause, resume, restart, jumpToLevel, setMuted, setVolume, destroy }`.
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onLevel(level)`, `onGameOver(finalScore)`, `onTogglePause()`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms. `destroy()` cancela rAF, quita listeners y cierra el `AudioContext`.
   - **Geometría y laberintos** (`levels.ts` + `constants.ts`):
     - `COLS = 28`, `ROWS = 31`, `CELL = 20` px → canvas lógico **560×620**.
     - Dos trazados **propios**, `MAZE_A` y `MAZE_B`, cada uno un arreglo de 31 cadenas de 28 caracteres (`#` muro, `.` punto, `o` píldora, ` ` pasillo, `-` puerta de la casa), simétricos en el eje vertical y con exactamente **240 puntos** y **4 píldoras** cada uno (píldoras en las cuatro esquinas jugables). `MAZE_B` cambia el trazado de pasillos y la posición de los túneles, no los recuentos.
     - Casa de espectros en ambos trazados: celdas `(11..16, 14..16)`, puerta en `(13..14, 13)`; glotón en `(13, 23)`; espectros: rojo `(13, 13)`, rosa `(13, 15)`, cian `(11, 15)`, naranja `(16, 15)`.
     - **Túnel**: `MAZE_A` conecta la fila `17` (col `0` ↔ `27`); `MAZE_B` conecta las filas `11` y `20`. En las celdas de túnel la velocidad de los espectros baja a `GHOST_SPEED_TUNNEL = 70` px/s; la del glotón no cambia.
   - **Tabla de niveles** (`LEVELS`, 5 entradas; `jumpToLevel` acepta 1–5):

     | Nivel | Trazado  | Glotón px/s | Espectros px/s | Inversión (ms) | Fruta (pts) | Horario scatter/chase (s)                |
     | ----- | -------- | ----------- | -------------- | -------------- | ----------- | ---------------------------------------- |
     | 1     | `MAZE_A` | 150         | 130            | 6000           | 100         | S7 · C20 · S7 · C20 · S5 · C20 · S5 · C∞ |
     | 2     | `MAZE_A` | 155         | 140            | 5000           | 300         | S7 · C20 · S7 · C20 · S5 · C25 · S5 · C∞ |
     | 3     | `MAZE_B` | 160         | 145            | 4000           | 500         | S5 · C20 · S5 · C20 · S5 · C25 · S5 · C∞ |
     | 4     | `MAZE_B` | 165         | 150            | 3000           | 700         | S5 · C20 · S5 · C20 · S5 · C30 · S5 · C∞ |
     | 5     | `MAZE_A` | 170         | 155            | 2000           | 1000        | S5 · C20 · S5 · C25 · S5 · C30 · S3 · C∞ |

     El reloj del horario avanza sólo mientras hay movimiento y **se congela durante la inversión** (precedente del clásico); al perder una vida se reinicia la fase actual del nivel.

   - **Movimiento** (glotón y espectros comparten el modelo de rejilla):
     - Posición en píxeles y dirección; el cambio de dirección sólo es posible a ≤ 2 px del centro de una celda y hacia una celda no-muro, con reencaje al centro en cada giro.
     - El glotón conserva la última dirección pulsada como intención y la aplica en el primer centro de celda donde sea legal; si choca con muro se detiene en el centro.
     - La partida arranca **quieta**: el movimiento y los relojes empiezan con la primera tecla de dirección de cada vida.
   - **IA: cuatro personalidades + máquina de estados (`ai.ts`)** — es el núcleo de esta variante y su mayor riesgo, asumido a propósito:
     - Estados: `house` → `scatter` ⇄ `chase` → `frightened` → `eyes` → `house`.
     - En `scatter` y `chase` cada espectro calcula una **celda objetivo** y, en el centro de cada intersección o callejón, elige entre las direcciones no-muro **excluyendo la inversa** (prohibido el giro de 180°) la que minimice la distancia euclídea del centro de la celda vecina al objetivo. Empate → orden `arriba, izquierda, abajo, derecha`.
     - **Objetivos en `chase`** (personalidades):
       - **Rojo — perseguidor:** la celda del glotón.
       - **Rosa — emboscador:** la celda 4 posiciones delante del glotón en su dirección actual (si está fuera de la rejilla, se recorta al borde).
       - **Cian — flanqueador:** sea `P` la celda 2 posiciones delante del glotón y `R` la celda del rojo; el objetivo es `P + (P − R)` (vector doblado), recortado a la rejilla.
       - **Naranja — tímido:** la celda del glotón si la distancia euclídea entre ambos es **> 8 celdas**; si es ≤ 8, su esquina de `scatter`.
     - **Objetivos en `scatter`** (esquinas fijas): rojo `(26, 1)`, rosa `(1, 1)`, cian `(26, 29)`, naranja `(1, 29)`.
     - **Salida de la casa por contador de puntos** (además del horario): rosa sale con 0 puntos comidos; cian con 30 en el nivel 1, 0 a partir del 2; naranja con 60 en el nivel 1, 50 en el 2, 0 a partir del 3. Válvula de escape: si pasan `HOUSE_FORCE_MS = 4000` ms sin comer ningún punto, sale el siguiente espectro de la cola. Al perder una vida los contadores se reinician y los tres vuelven a la casa.
     - `frightened`: dirección **aleatoria** entre las no-muro excluyendo la inversa, `GHOST_SPEED_FRIGHT = 85` px/s, dibujo azul y parpadeo blanco a 4 Hz durante el último 25 % del tiempo de inversión del nivel. Al terminar la inversión, cada espectro vuelve al estado del horario (`scatter` o `chase`) e invierte la dirección una vez.
     - `eyes`: vuelve por los pasillos a `(13, 15)` a `GHOST_SPEED_EYES = 250` px/s y reentra al estado del horario en cuanto llega (sin contador).
   - **Píldoras:** comer una píldora pone en `frightened` a los espectros en `scatter`/`chase`, invierte su dirección una vez, reinicia la cadena a 0 y fija la inversión en el valor del nivel. Comer otra píldora durante la inversión **reinicia** el temporizador y **la cadena a 0**.
   - **Frutas:** una fruta aparece en la celda `(13, 19)` al comer el punto **70** y otra al comer el **170** de cada nivel; dura `FRUIT_MS = 9000` ms y vale lo que diga el nivel (100 / 300 / 500 / 700 / 1000). Se dibuja como una figura geométrica distinta por nivel y, al comerla, su valor flota 1000 ms en la celda.
   - **Puntuación (números exactos):**
     - Punto **+10**, píldora **+50**, espectro en cadena por inversión **200 / 400 / 800 / 1600** (el 5.º y siguientes de la misma inversión valen 1600), fruta según nivel.
     - **Bonus por nivel limpio:** `1000 × nivel`. **Bonus de perfección:** `+2000` extra si ese nivel se limpió sin perder ninguna vida.
     - **Vida extra:** al cruzar los **10 000** puntos, una sola vez en la partida, `+1` vida (máximo 5 en el HUD).
     - **Techo alcanzable:** por nivel, `2400` (puntos) `+ 200` (píldoras) `+ 12 000` (4 × 3000 en cadenas) `+ 2 ×` fruta `+ 1000 × nivel + 2000`:
       - N1 **17 800** · N2 **19 200** · N3 **20 600** · N4 **22 000** · N5 **23 600** → total **103 200**, dentro de `0–9 999 999`.
   - **Vidas y fin:**
     - `LIVES = 3`. Contacto con un espectro en `scatter`/`chase` (centros a < 10 px): −1 vida, animación de muerte de 1200 ms (el glotón se cierra girando), reinicio de posiciones, relojes y contadores de casa; el laberinto conserva los puntos ya comidos y la puntuación.
     - Limpiar los 244 comestibles de un nivel → bonus, 1500 ms de transición y carga del nivel siguiente conservando puntuación y vidas.
     - **Victoria:** limpiar el nivel 5 → `onGameOver(score)`. **Fin:** vidas a 0 → `onGameOver(score)`. Una sola llamada en ambos casos.
   - **Audio sintetizado (`audio.ts`)** — `AudioContext` creado perezosamente en el primer input (evita el bloqueo de autoplay), con un `GainNode` maestro para volumen y silencio:
     - `punto`: pulso cuadrado de 50 ms alternando 440/466 Hz (el "waka").
     - `píldora`: barrido de 180 → 90 Hz, 250 ms.
     - `espectro devorado`: barrido ascendente 200 → 900 Hz, 300 ms.
     - `fruta`: dos tonos 660/880 Hz de 80 ms.
     - `muerte`: barrido descendente 600 → 80 Hz, 900 ms.
     - `sirena`: tono continuo de fondo en `scatter`/`chase` cuyo semitono sube en 4 escalones según los puntos restantes del nivel; se apaga en `frightened`, en pausa y tras el fin.
     - `setMuted(true)` silencia el nodo maestro sin pausar; `setVolume(0–1)` ajusta la ganancia (por defecto 0,15, como Arkanoid; con 0 no suena).
   - **Dibujo en canvas** (sólo lo que el HUD React no puede mostrar): muros de neón de 3 px con glow (color propio por trazado), puntos de 3 px, píldoras de 7 px pulsando a 2 Hz, glotón como arco animado a 6 Hz, espectros con cuerpo redondeado y ojos orientados (azul y parpadeo en `frightened`, sólo ojos en `eyes`), fruta, valores flotantes de cadena y fruta, y el **cartel de transición de nivel** ("NIVEL 2") durante los 1500 ms de cambio. **Nada de Score, vidas, nivel ni overlays de pausa/fin en canvas.**
4. **Componente cliente** `components/gloton-canvas.tsx` (`"use client"`), mismo patrón que `components/arkanoid-canvas.tsx`: callbacks vía ref, props `paused`, `restartKey`, `muted`, `volume` y `jumpTo`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **560×620** escalado por CSS dentro de `.crt-screen` con `aspect: "28 / 31"`.
5. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `gloton` **sin cambios en el contrato**: `aspect`, `hasLives`, `engineLevel`, `hasSound` y `levelJump` ya existen (SPEC 07 y SPEC 08), igual que `muted`, `volume` y `jumpTo` en `GameCanvasProps`.
   - HUD: puntuación, **vidas** (`hasLives: true`) y **nivel del motor** (`engineLevel: true`, 01–05). Sin líneas ni estilos de bloque.
   - **Sonido:** `hasSound: true` → el reproductor muestra el chip `SONIDO ON/OFF` (apagado por defecto, preferencia `av_muted`) y el slider de volumen (`av_volume`, por defecto 15), exactamente la UI que creó el SPEC 08.
   - **Salto de nivel:** `levelJump: 5` → chips `1`–`5` en el overlay de pausa; elegir uno carga ese nivel con su trazado, velocidades e inversión, **conservando puntuación y vidas**, y reanuda.
6. **Controles:**
   - `←↑→↓` y `W A S D` fijan la dirección; `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - `preventDefault` sólo en las flechas y `W A S D`. Se ignoran las teclas con el foco en `input`/`textarea` y las que llevan modificadores `Ctrl`/`Meta`/`Alt`. Con la partida pausada o terminada las direcciones no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← ↑ → ↓ / WASD mover · P pausa`.
7. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "gloton", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=gloton`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí sólo se verifica.
8. **Pulido visual** con `/frontend-design`: marco CRT vertical para 560×620, regla nueva `.crt-tall:has(.crt-screen[style*="28 / 31"])` en `app/globals.css` con el mismo cálculo que las de 7/10 y 17/15 (precedente del SPEC 09), paleta y glow de los dos trazados, espectros, fruta y cartel de transición, chips de sonido y de nivel ya existentes, hint de controles, overlay de pausa.
9. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Más de 5 niveles, más de 2 trazados, dificultad "Elroy" (aceleración del rojo con pocos puntos), dos píldoras simultáneas.
- Música, cinemáticas entre niveles, voces, assets de audio en archivo (todo el sonido es sintetizado).
- Controles táctiles / swipe / móvil jugable, pantalla completa, guardado de partida en curso.
- Mute o volumen global del sitio (el chip y el slider son los del reproductor, SPEC 08).
- Campos de HUD nuevos (cadena, inversión restante, frutas): todo lo extra se dibuja en canvas.
- Anti-farmeo del salto de nivel (ver riesgos), Auth, rate limit, scores ligados a usuario.
- Assets gráficos externos y portada nueva: se reutiliza `.cover-glot`.
- Los demás juegos del catálogo (Invasores, Ranaria, Duelo Pixel).
- Pruebas automatizadas (no hay test runner).

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Es un **insert**: la fila placeholder `gloton` ya no existe y, al haberse borrado con `on delete cascade`, tampoco hay `scores` con `game_id = 'gloton'`:

```sql
insert into public.games (id, title, short, long, category, cover, color, sort_order) values
  ('gloton', 'GLOTÓN', 'Devora puntos y escapa de los fantasmas.',
   'Cinco niveles sobre dos laberintos de 28×31 celdas: devora los 240 puntos de cada uno mientras cuatro espectros con conductas distintas alternan patrulla y caza. Las píldoras invierten los papeles y comer espectros en cadena vale 200, 400, 800 y 1600 puntos; las frutas suman de 100 a 1000. Empiezas con 3 vidas y ganas otra a los 10 000 puntos.',
   'ARCADE', 'cover-glot', 'yellow', 4);
```

Tipos públicos del motor:

```ts
export type GlotonCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void; // vidas a 0 y victoria en el nivel 5
  onTogglePause: () => void;
};

export type GlotonGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  jumpToLevel(level: number): void; // 1–5; conserva puntuación y vidas
  setMuted(muted: boolean): void;
  setVolume(volume: number): void; // 0–1
  destroy(): void; // cancela rAF, quita listeners, cierra el AudioContext
};

export type Dir = "up" | "down" | "left" | "right";
export type Cell = { col: number; row: number };
export type GhostId = "red" | "pink" | "cyan" | "orange";
export type GhostMode = "house" | "scatter" | "chase" | "frightened" | "eyes";
export type Tile = "wall" | "dot" | "pill" | "empty" | "door";

export type LevelConfig = {
  maze: readonly string[]; // MAZE_A | MAZE_B
  glotonSpeed: number; // px/s
  ghostSpeed: number; // px/s
  frightMs: number;
  fruitValue: number;
  schedule: readonly { mode: "scatter" | "chase"; ms: number }[]; // último tramo: ms = Infinity
  houseDots: Record<Exclude<GhostId, "red">, number>;
};
```

Entrada del registro (sin ampliar el contrato: todos los campos existen ya):

```ts
gloton: {
  Canvas: GlotonCanvas,
  controls: [
    { keys: ["←", "↑", "→", "↓"], label: "mover" },
    { keys: ["WASD"], label: "mover" },
    { keys: ["P"], label: "pausa" },
  ],
  engineLevel: true,
  hasLives: true,
  hasSound: true,
  levelJump: 5,
  aspect: "28 / 31",
},
```

Archivos:

```
supabase/migrations/<timestamp>_game_gloton.sql   // nuevo: insert de la fila gloton
lib/games/gloton/constants.ts                     // nuevo: COLS, ROWS, CELL, velocidades, LIVES, EXTRA_LIFE_AT, FRUIT_MS, HOUSE_FORCE_MS, colores
lib/games/gloton/levels.ts                        // nuevo: MAZE_A, MAZE_B, LEVELS (5), parseo a rejilla de Tile, túneles, casa, celdas iniciales
lib/games/gloton/entities.ts                      // nuevo: glotón, espectros, fruta, movimiento en rejilla, colisiones, dibujo con ctx
lib/games/gloton/ai.ts                            // nuevo: objetivos por personalidad, elección en intersección, horario scatter/chase, salida de la casa
lib/games/gloton/audio.ts                         // nuevo: AudioContext perezoso, 5 efectos y sirena, setMuted/setVolume
lib/games/gloton/input.ts                         // nuevo: teclas, intención de dirección, attach/detach
lib/games/gloton/engine.ts                        // nuevo: createGlotonGame con niveles, bonus y vida extra
components/gloton-canvas.tsx                      // nuevo: props paused, restartKey, muted, volume, jumpTo
lib/games/registry.ts                             // modificado: entrada gloton
app/globals.css                                   // modificado: regla .crt-tall para el aspecto 28 / 31 y pulido
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` que `gloton` no existe en `games`, que `sort_order: 4` sigue libre y que no hay `scores` con `game_id = 'gloton'`.
2. **Migración del catálogo** — SQL en `supabase/migrations/` + `apply_migration`. Verificar `/juegos/gloton` con la portada `cover-glot`, su presencia en biblioteca y home, y el leaderboard vacío. `/juegos/gloton/jugar` muestra aún el placeholder simulado.
3. **Constantes, trazados y tabla de niveles** — escribir `MAZE_A`, `MAZE_B` y `LEVELS`; parsear a rejilla tipada; **contar por código los comestibles de cada trazado y comprobar que son 240 puntos + 4 píldoras**; validar simetría, alcanzabilidad por inundación y los túneles de cada trazado.
4. **Entidades y movimiento** — glotón, espectros y fruta sobre la rejilla: alineación al centro de celda, prohibición de giro de 180°, wrap y ralentización de túnel, dibujo de muros, puntos, píldoras, actores y fruta.
5. **Input** — `attachInput()` que devuelve la limpieza; intención de dirección aplicada en el siguiente centro de celda válido; `preventDefault` sólo en flechas y WASD; ignora `input`/`textarea` y teclas con modificadores.
6. **IA, paso 1: objetivos y elección** — `ai.ts` con las cuatro personalidades y la elección por distancia al objetivo en intersecciones; verificar en desarrollo dibujando temporalmente la celda objetivo de cada espectro (se quita antes del cierre).
7. **IA, paso 2: máquina de estados** — horario `scatter`/`chase` por nivel congelado durante la inversión, `frightened` aleatorio con parpadeo, `eyes` de vuelta a la casa, salida por contador de puntos con válvula de 4 s, reinicio al perder vida.
8. **Motor y niveles** — estado en closure (`esperando`/`jugando`/`muriendo`/`transición`/`terminado`), `dt` ≤ 50 ms, puntuación con cadena, frutas, bonus de nivel y de perfección, vida extra a los 10 000, carga del nivel siguiente, `jumpToLevel`, `pause`/`resume`/`restart`/`destroy`, una sola salida de fin.
9. **Audio** — `audio.ts` con `AudioContext` perezoso, los 5 efectos, la sirena de 4 escalones, `setMuted` y `setVolume`; silencio en pausa, en `frightened` (sirena) y tras el fin.
10. **Componente `GlotonCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 560×620, props `muted`, `volume` y `jumpTo`.
11. **Registro y reproductor (jugable)** — añadir la entrada `gloton` con `hasSound` y `levelJump`; verificar el chip `SONIDO`, el slider de volumen y los chips `1`–`5` en pausa, y que `asteroides`, `tetris`, `arkanoid` y `snake` siguen igual.
12. **Pulido y verificación manual** — con `/frontend-design`; regla `.crt-tall` del aspecto 28/31; partida completa (las cuatro personalidades visibles, patrulla y caza, inversión y cadena de 4, frutas, túnel, muerte, cambio de nivel, salto de nivel, vida extra forzando puntuación en desarrollo, victoria del nivel 5), guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil. Capturas en `.playwright-screenshot`.
13. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'gloton'`.

## Criterios de aceptación

- [ ] `/juegos/gloton/jugar` muestra el trazado `MAZE_A` completo dentro del marco CRT con proporción 28/31, el glotón en `(13, 23)`, el rojo fuera de la casa y los otros tres dentro; nada se mueve hasta pulsar una dirección.
- [ ] `MAZE_A` y `MAZE_B` tienen cada uno exactamente 240 puntos y 4 píldoras, todos alcanzables.
- [ ] `←↑→↓` y `WASD` mueven el glotón a la velocidad del nivel (150 en el 1, 170 en el 5); la página no hace scroll con esas teclas; escribir `w`/`a`/`s`/`d` en el input del modal no mueve el glotón.
- [ ] En `MAZE_A` el wrap es sólo la fila 17 y en `MAZE_B` sólo las filas 11 y 20; los espectros bajan a 70 px/s en las celdas de túnel y el glotón no.
- [ ] Cada punto suma 10, cada píldora 50 y la fruta el valor del nivel (100/300/500/700/1000); la fruta aparece al punto 70 y al 170 en `(13, 19)` y desaparece a los 9 s.
- [ ] Las cuatro personalidades son distinguibles en `chase`: el rojo va al glotón, el rosa a 4 celdas delante, el cian al vector doblado y el naranja se retira a su esquina cuando está a 8 celdas o menos.
- [ ] En `scatter` cada espectro se dirige a su esquina (`(26,1)`, `(1,1)`, `(26,29)`, `(1,29)`) y el horario del nivel alterna los tramos de la tabla; el reloj se congela durante la inversión.
- [ ] Rosa, cian y naranja salen de la casa por los contadores de puntos del nivel (0/30/60 en el nivel 1) y la válvula de 4 s sin comer fuerza la salida del siguiente.
- [ ] Los espectros nunca giran 180° salvo al empezar y al terminar la inversión (una vez cada una).
- [ ] Comer una píldora pone en azul a los espectros en `scatter`/`chase` durante el tiempo del nivel (6 s en el 1, 2 s en el 5), los baja a 85 px/s, los hace elegir al azar y los hace parpadear el último 25 % del tiempo.
- [ ] Comer espectros en una misma inversión suma 200, 400, 800 y 1600 en ese orden, con el valor visible 800 ms; una píldora nueva reinicia la cadena a 200.
- [ ] Un espectro devorado vuelve a la casa como ojos a 250 px/s y reentra al estado del horario al llegar.
- [ ] El contacto con un espectro en `scatter`/`chase` resta una vida, reproduce la muerte de 1,2 s y reinicia posiciones, relojes y contadores de casa sin devolver los puntos comidos.
- [ ] Limpiar un nivel suma `1000 × nivel`, más 2000 si no se perdió ninguna vida en él, muestra el cartel de transición 1,5 s y carga el nivel siguiente conservando puntuación y vidas.
- [ ] Cruzar los 10 000 puntos da una vida extra una sola vez en la partida y el HUD lo refleja.
- [ ] Limpiar el nivel 5 abre el modal "FIN DEL JUEGO" una sola vez; el techo alcanzable es 103 200 puntos; las vidas a 0 también lo abren, igual que el botón FIN.
- [ ] El HUD React muestra puntuación, vidas y nivel del motor (01–05) en tiempo real; no muestra líneas; el canvas no dibuja Score, vidas, nivel ni overlays de pausa/fin.
- [ ] El chip `SONIDO` arranca en OFF, sólo aparece en juegos con `hasSound`, y al encenderlo suenan punto, píldora, espectro, fruta, muerte y la sirena de fondo; el slider (0–100, 15 por defecto) cambia el volumen, con 0 no suena, y ambas preferencias sobreviven a recargar; con `localStorage` bloqueado el juego funciona sin errores.
- [ ] No suena nada en pausa ni tras el fin; la sirena se apaga durante la inversión.
- [ ] El audio no requiere archivos: no hay peticiones a `public/games/gloton/` ni assets nuevos en el repositorio.
- [ ] PAUSA congela glotón, espectros, animaciones, horario e inversión, y REANUDAR continúa sin saltos; `P` y `Escape` alternan; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En pausa aparecen los chips `1`–`5` con el nivel actual resaltado; elegir uno carga su trazado, velocidades e inversión, conserva puntuación y vidas, actualiza el nivel del HUD y reanuda.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "gloton"`; iniciales inválidas se rechazan sin cerrar el modal.
- [ ] La marca aparece en `/salon?juego=gloton`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia puntuación 0, 3 vidas, nivel 1, trazado `MAZE_A` lleno, contadores de casa y estado "esperando", sin duplicar loop, listeners ni `AudioContext`; Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides`, `tetris`, `arkanoid` y `snake` conservan comportamiento y HUD; los demás ids conservan el placeholder simulado.
- [ ] `games` contiene la fila `gloton` con `title: GLOTÓN`, `category: ARCADE`, `color: yellow`, `cover: cover-glot`, `sort_order: 4`, y respeta los `CHECK`.
- [ ] El marco CRT cabe sin scroll en escritorio y el canvas escala en móvil sin desbordar, manteniendo la proporción 28/31.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** `insert` de una fila nueva `gloton` con `sort_order: 4` — la tabla real (consultada con `select`) sólo tiene `arkanoid` (1), `tetris` (2), `snake` (3) y `asteroides` (6); la fila placeholder `gloton` la borró `20261005120000_remove_unimplemented_games.sql`. **No:** `update` de un placeholder (no queda ninguno) ni `delete from scores` previo (la FK ya cascadeó).
- **Sí:** reutilizar la portada `.cover-glot` existente, que ya dibuja glotón, puntos y dos espectros. **No:** crear `.cover-gloton`.
- **Sí:** el **cuarteto con personalidades** y la máquina `scatter/chase/frightened` con horario por nivel — es la razón de ser de esta variante y lo que hace que el laberinto se juegue leyendo el comportamiento enemigo. **No:** una sola regla de caza para los cuatro (eso es la variante A) ni IA por búsqueda de camino (BFS/A\*) en cada frame: la elección greedy por objetivo en intersección es la que produce el comportamiento clásico y cuesta O(1).
- **Sí:** riesgo técnico asumido y declarado en la tabla de riesgos: es el motor más caro del catálogo hasta la fecha, como anticipó la ficha 006 de `references/game-suggestions-todo.md`. **No:** recortarlo a mitad de implementación sin actualizar el spec.
- **Sí:** 5 niveles sobre **2 trazados propios** (`A`, `A`, `B`, `B`, `A`) con velocidades e inversión por tabla. **No:** 1 solo trazado (la progresión se notaría sólo en velocidad) ni 5 trazados distintos (cinco laberintos a mano, con su validación, no caben en un spec).
- **Sí:** `levels.ts` como única fuente de los trazados y las tablas, según el patrón de **Game architecture** de `CLAUDE.md` y el precedente de `lib/games/arkanoid/levels.ts`. **No:** generar laberintos por algoritmo (imposible de balancear y de verificar los 240 puntos).
- **Sí:** frutas con valor por nivel, bonus de nivel limpio (`1000 × nivel`) y bonus de perfección (`+2000`) — premian limpiar y no morir, y hacen que las marcas crezcan con la profundidad de la partida. Techo 103 200, dentro de `0–9 999 999`. **No:** cadena extendida más allá de 1600 (eso es la variante B) ni multiplicadores globales.
- **Sí:** vida extra a los 10 000 puntos, una sola vez. **No:** vidas extra repetidas cada 10 000 (haría partidas interminables en un juego sin test runner que verificarlas).
- **Sí:** **sonido sintetizado con Web Audio API** (5 efectos + sirena) reutilizando el chip y el slider del SPEC 08, apagado por defecto. **No:** archivos mp3 (habría que crear binarios que no existen en `references/`) ni dependencias de audio, ni música completa.
- **Sí:** `engineLevel: true`, `hasLives: true`, `hasSound: true`, `levelJump: 5`, `aspect: "28 / 31"` — todos campos **ya existentes** del `GameEntry`: esta variante no amplía el contrato. **No:** campos de HUD nuevos (cadena, inversión restante): lo extra se dibuja en canvas.
- **Sí:** congelar el horario `scatter`/`chase` durante la inversión. **No:** dejarlo corriendo (la fase se consumiría mientras los espectros huyen y el ritmo del nivel se desdibujaría).
- **Sí:** salida de la casa por contador de puntos con válvula de 4 s. **No:** sólo retardos fijos (perdería la tensión de los primeros segundos de cada vida).
- **Sí:** ralentización de los espectros en túnel (70 px/s). **No:** ralentizar también al glotón.
- **Sí:** arranque quieto hasta la primera dirección en cada vida. **No:** mover desde el primer frame.
- **Sí:** `P`/`Escape` pausan vía `onTogglePause`, y la pausa congela horario, inversión y audio. **No:** pausa interna del motor ni overlay de pausa en canvas (el de React ya aloja los chips de nivel).
- **Sí:** aspecto vertical `28 / 31` y regla `.crt-tall:has(...)` nueva, como hizo Snake con 17/15. **No:** forzar `4 / 3` ni recortar filas.
- **Sí:** cartel de transición de nivel dibujado en canvas (el HUD React no tiene dónde ponerlo). **No:** dibujar también Score, vidas o nivel.
- **Sí:** motor TypeScript con `createGlotonGame(canvas, callbacks)` y `ai.ts`/`audio.ts` separados — sin globals, limpieza al desmontar incluido el `AudioContext`. **No:** `iframe` ni `next/script`.
- **Sí:** tope de `dt` de 50 ms y pausa por `visibilitychange`. **No:** `setInterval`.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni localStorage para scores.

## Riesgos identificados

| Riesgo                                                                             | Mitigación                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **La IA del cuarteto es el motor más caro del catálogo y puede desbordar el plan** | Se implementa en dos pasos separados (6: objetivos y elección; 7: máquina de estados), cada uno jugable, con depuración visual de la celda objetivo en desarrollo. |
| El cian (vector doblado) apunta fuera de la rejilla y el espectro se bloquea       | Objetivo recortado a `0..27 / 0..30`; el objetivo puede ser un muro (es legal: sólo mide distancia).                                                               |
| Un espectro queda atrapado oscilando entre dos intersecciones                      | Prohibición de giro de 180° + objetivo que cambia con el glotón; verificación manual en el paso 12 con la depuración visual.                                       |
| El horario por nivel hace el nivel 5 injugable                                     | Tabla de niveles en `levels.ts`, un solo sitio que ajustar; `jumpToLevel(5)` permite probarlo en segundos.                                                         |
| Dos trazados escritos a mano con recuentos distintos rompen la puntuación          | Paso 3 cuenta comestibles de **ambos** y valida alcanzabilidad; criterio de aceptación explícito.                                                                  |
| Strict Mode duplica loop, listeners o `AudioContext`                               | `destroy()` cierra el `AudioContext` y quita todo; criterio de aceptación explícito.                                                                               |
| Autoplay bloqueado hasta el primer gesto                                           | `AudioContext` creado perezosamente en el primer input; nada suena antes de mover.                                                                                 |
| La sirena continua resulta molesta o se queda colgada en pausa                     | Chip `SONIDO` apagado por defecto, volumen 0,15, sirena apagada en pausa, inversión y fin; `destroy()` la corta.                                                   |
| Teclas del juego interfieren con el input del modal                                | Ignorar eventos con target `input`/`textarea`; pausar al abrir el modal.                                                                                           |
| `dt` grande al volver a la pestaña                                                 | Tope de 50 ms y pausa con `visibilitychange`; horario e inversión usan el mismo `dt` acotado.                                                                      |
| Desalineación por píxeles hace que un actor atraviese un muro                      | Cambio de dirección sólo a ≤ 2 px del centro de celda y reencaje al centro en cada giro.                                                                           |
| Saltar de nivel permite farmear bonus de nivel limpio                              | Aceptado y declarado, como en `specs/08-juego-arkanoid.md`; el `CHECK` 0–9 999 999 acota el daño y anti-trampas queda para el spec de Auth.                        |
| El wrap y la ralentización de túnel descolocan al actor                            | Wrap sólo en las filas declaradas de cada trazado y sólo al cruzar el centro de la celda extrema; verificación manual.                                             |
| Marco vertical de 560×620 no cabe en pantallas bajas                               | Regla `.crt-tall:has(.crt-screen[style*="28 / 31"])`; criterio de aceptación.                                                                                      |
| Scores falsos con clave publishable                                                | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                                                       |
| Un solo proyecto Supabase para dev y prod                                          | Limpiar filas de prueba de `scores` al cerrar (paso 13).                                                                                                           |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                            | La fila, la ruta `/juegos/gloton` y la carpeta `lib/games/gloton` usan el mismo slug.                                                                              |
| Añadir la entrada al registro rompe los cuatro juegos existentes                   | No se toca el contrato (sólo campos ya existentes); paso 11 y criterio de aceptación los verifican.                                                                |

## Qué **no** está en este spec

- Más de 5 niveles, más de 2 trazados, modo "Elroy", dos píldoras simultáneas.
- Música, cinemáticas, voces y audio en archivo.
- Campos de HUD nuevos.
- Táctil/swipe, pantalla completa, guardado de partida.
- Mute o volumen global del sitio.
- Anti-farmeo del salto de nivel, Auth/anti-trampas y scores ligados a usuario.
- Assets gráficos externos y portada nueva.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
