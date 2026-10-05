# 08 — Juego ARKANOID jugable con leaderboard

- **Estado:** Approved
- **Depende de:** SPEC 05, SPEC 06, SPEC 07
- **Fecha:** 2026-10-04

**Objetivo:** Portar `references/started-games/04-arkanoid` a un módulo TypeScript jugable en `/juegos/arkanoid/jugar` (reemplazando el placeholder `bloque-buster` del catálogo) con su leaderboard en Supabase.

## Alcance

**Incluido:**

1. **Catálogo** — la fila `bloque-buster` de `games` pasa a `arkanoid` (update, no insert). Migración `supabase/migrations/20261004140000_game_arkanoid.sql` aplicada con `apply_migration`:
   - `id: "arkanoid"`, `title: "ARKANOID"`, `category: "ARCADE"`, `color: "cyan"`, `cover: "cover-bricks"` (se reutiliza; no se crea `.cover-arkanoid`), `sort_order: 1` (sin cambio).
   - `short` se conserva: `Rebota la pelota y destruye muros de neón.`
   - `long` se reescribe para describir el juego real: paleta, pelota, 3 vidas, 5 niveles con patrones distintos y pelota un 10 % más rápida por nivel, 10 puntos por bloque, explosión al romper. No menciona power-ups, ni mecánicas ausentes.
   - `/juegos/bloque-buster` y `/juegos/bloque-buster/jugar` devuelven 404 (sin alias, igual que `caida` → `tetris` en el SPEC 07).
   - `lib/home-data.ts`: la entrada de actividad reciente `game: "Bloque Buster"` pasa a `"Arkanoid"`.
2. **Assets** en `public/games/arkanoid/`: `spritesheet-breakout.png`, `ball-bounce.mp3`, `break-sound.mp3` (copiados de `references/started-games/04-arkanoid/assets/`; la referencia no se modifica).
3. **Motor** en `lib/games/arkanoid/`: `constants.ts`, `levels.ts`, `entities.ts`, `sprites.ts`, `input.ts`, `engine.ts`.
   - Sin globals de módulo con estado ni `document.getElementById`; las funciones de dibujo reciben `ctx`. El motor no toca `localStorage` ni el DOM fuera del `canvas` recibido.
   - API: `createArkanoidGame(canvas, callbacks)` → `{ start, pause, resume, restart, jumpToLevel, setMuted, destroy }`.
   - Callbacks: `onScore(score)`, `onLives(lives)`, `onLevel(level)`, `onGameOver(finalScore)`, `onTogglePause()`.
   - Loop `requestAnimationFrame` con `dt` ≤ 50 ms (el original no lo limita; se añade para no saltar al volver de otra pestaña). `destroy()` cancela rAF, quita listeners y aborta una carga de sprites en curso.
   - Mecánica y constantes idénticas al código del original (`game.js` manda sobre el README):
     - Canvas lógico 800×600; paleta `w: 81, h: 14, y: 560`, `PADDLE_SPEED = 400` px/s, centrada al inicio; pelota 16×16 que sale pegada a la paleta con `vx = 200 × speed`, `vy = −300 × speed` (sin saque manual: se mueve desde el primer frame).
     - Rejilla de bloques 64×24 con origen `(80, 80)`: `BLOCKS_ORIGIN_X = (800 − 10 × 64) / 2`, `BLOCKS_ORIGIN_Y = 80`.
     - Rebote en paredes izquierda/derecha/techo; rebote en la paleta solo con `vy > 0` y solape vertical hasta `paddle.y + paddle.h + 8`, sin ángulo según el punto de impacto (`vy = −|vy|`).
     - Colisión AABB con bloques: un bloque por frame, `vy = −vy`, **+10 puntos**, explosión de 4 frames durante `EXPLOSION_DURATION = 150` ms.
     - Pelota perdida (`ball.y > 600`): −1 vida; con 0 vidas, game over; si no, la pelota reaparece sobre la paleta con la velocidad del nivel actual.
     - 5 niveles con `LEVELS` idéntico: velocidades `1.00, 1.10, 1.21, 1.33, 1.46` y patrones parrilla 10×6, pirámide, tablero de ajedrez, filas con huecos, marco + cruz central (colores por fila como en `levels.js`).
     - Limpiar los bloques de un nivel carga el siguiente conservando puntuación y vidas; limpiar el nivel 5 es victoria.
   - Se elimina del canvas: el texto `Score` y `Nivel`, el overlay `GAME OVER` / `¡Completaste el juego!` y el overlay de pausa con botones de nivel (los hace React).
   - **Se conserva dibujado en canvas** lo que el HUD React no sustituye: bloques, paleta, pelota, explosiones y las **pelotas de vida** (sprite `ball` 16×16, separación 4 px, alineadas a la derecha en `y = 10`).
   - **Audio** idéntico al original: `ball-bounce.mp3` en cada rebote (paredes, techo, paleta) y `break-sound.mp3` al romper un bloque, con `cloneNode().play()` y `.catch` del autoplay. No suena en pausa ni tras el fin; `setMuted(true)` silencia sin pausar.
4. **Componente cliente** `components/arkanoid-canvas.tsx` (`"use client"`), mismo patrón que `components/tetris-canvas.tsx`: callbacks vía ref, props `paused` y `restartKey`, `onAutoPause` con `visibilitychange`, seguro con Strict Mode. Canvas lógico fijo **800×600** escalado por CSS dentro de `.crt-screen` con el aspecto por defecto `4 / 3`. Props nuevas `muted` y `jumpTo` (ver Modelo de datos).
5. **Registro y reproductor** — `lib/games/registry.ts` añade la entrada `arkanoid`; `components/game-player.tsx` pasa a leer del registro dos capacidades nuevas:
   - **Sonido** (`hasSound`): chip `SONIDO ON/OFF` junto al hint de controles (patrón del selector de estilo de Tetris). Preferencia en `localStorage` clave `av_muted` con `try/catch` y `useSyncExternalStore` (snapshot de servidor: sonido activado). Solo aparece en juegos con sonido; asteroides y tetris no cambian.
   - **Salto de nivel** (`levelJump: 5`): en el overlay de pausa del reproductor, chips `1`–`5` con el nivel actual resaltado. Elegir uno carga ese nivel (bloques nuevos, pelota con la velocidad del nivel) **conservando puntuación y vidas**, y reanuda la partida, como el original.
   - HUD de `arkanoid`: puntuación, **vidas** (`hasLives: true`) y nivel del motor (`engineLevel: true`); sin líneas. Las vidas se ven además como pelotas en el canvas.
6. **Controles:**
   - `←`/`→` mueven la paleta; el **ratón** sobre el canvas la centra bajo el cursor (coordenadas escaladas por el tamaño CSS del canvas); `P` o `Escape` alternan PAUSA/REANUDAR vía `onTogglePause`.
   - `preventDefault` solo en `ArrowLeft` y `ArrowRight` (no en `P` ni `Escape`). Se ignoran las teclas con el foco en `input`/`textarea`. Con la partida pausada o terminada, las teclas de movimiento y el ratón no actúan; `P`/`Escape` alternan la pausa salvo tras el fin.
   - Texto de controles bajo el CRT: `← → mover · RATÓN mover · P pausa`.
7. **Leaderboard** — sin cambios de esquema: guardado con `submitScore({ gameId: "arkanoid", name, score })` y lectura por `game_id` en el Salón (`/salon?juego=arkanoid`), detalle y cards. Estado vacío con 0 partidas y revalidación ya cubiertos por el SPEC 06; aquí solo se verifica.
8. **Pulido visual** con `/frontend-design`: marco CRT para 800×600, fondo del canvas, chips de sonido y de salto de nivel, hint de controles, overlay de pausa.
9. `get_advisors` al cierre. `database.types.ts` no se regenera (el esquema no cambia).

**No incluido (fuera de alcance de este spec):**

- Controles táctiles / móvil jugable, pantalla completa, guardado de partida en curso.
- Mute global del sitio, volumen, música o más sonidos que los dos del original.
- Power-ups, ángulo de rebote según el impacto, bloques de varios golpes, más de 5 niveles o cualquier mecánica o balance nuevo.
- Bonus por vidas restantes al ganar.
- Auth, anti-trampas, rate limit, scores ligados a usuario (incluye impedir farmear puntos saltando de nivel).
- Los demás juegos del catálogo (Serpentina, Glotón, Invasores, Ranaria, Duelo Pixel).
- Pruebas automatizadas (no hay test runner).
- Nueva portada: se reutiliza `.cover-bricks`.

## Modelo de datos

Migración (valores reales; respeta los `CHECK` de `games`). Las filas de `scores` con `game_id = 'bloque-buster'` son pruebas del placeholder y se borran antes de renombrar, porque la FK `scores.game_id` no tiene `ON UPDATE CASCADE`:

```sql
delete from public.scores where game_id = 'bloque-buster';

update public.games set
  id    = 'arkanoid',
  title = 'ARKANOID',
  long  = 'Mueve la paleta, rebota la pelota y derriba los muros de neón. Tienes 3 vidas para superar 5 niveles con patrones distintos: parrilla, pirámide, tablero, huecos y marco con cruz. Cada bloque suma 10 puntos y la pelota se acelera un 10 % en cada nivel.'
where id = 'bloque-buster';
```

Tipos públicos del motor:

```ts
export type ArkanoidCallbacks = {
  onScore: (score: number) => void;
  onLives: (lives: number) => void;
  onLevel: (level: number) => void;
  onGameOver: (finalScore: number) => void; // game over y victoria
  onTogglePause: () => void;
};

export type ArkanoidGame = {
  start(): void;
  pause(): void;
  resume(): void;
  restart(): void;
  jumpToLevel(level: number): void; // 1–5; conserva score y vidas
  setMuted(muted: boolean): void;
  destroy(): void; // cancela rAF, quita listeners, aborta carga de sprites
};
```

Ampliación del contrato común y del registro (`lib/games/types.ts`, `lib/games/registry.ts`):

```ts
// GameCanvasProps — campos opcionales nuevos
muted?: boolean;
// Cambia `seq` para pedir un salto de nivel; el canvas llama a jumpToLevel(level)
jumpTo?: { level: number; seq: number };

// GameEntry — campos opcionales nuevos
hasSound?: boolean; // true: el reproductor muestra el chip SONIDO
levelJump?: number; // n: el overlay de pausa muestra chips 1..n
```

Entrada del registro:

```ts
arkanoid: {
  Canvas: ArkanoidCanvas,
  controls: [
    { keys: ["←", "→"], label: "mover" },
    { keys: ["RATÓN"], label: "mover" },
    { keys: ["P"], label: "pausa" },
  ],
  engineLevel: true,
  hasLives: true,
  hasSound: true,
  levelJump: 5,
},
```

Archivos:

```
supabase/migrations/20261004140000_game_arkanoid.sql   // nuevo
public/games/arkanoid/spritesheet-breakout.png         // nuevo (copia)
public/games/arkanoid/ball-bounce.mp3                  // nuevo (copia)
public/games/arkanoid/break-sound.mp3                  // nuevo (copia)
lib/games/arkanoid/constants.ts                        // nuevo: canvas, paleta, pelota, bloques, velocidades, URLs de assets
lib/games/arkanoid/levels.ts                           // nuevo: LEVELS (5 niveles, speed + blocks)
lib/games/arkanoid/sprites.ts                          // nuevo: SPRITES, EXPLOSION_FRAMES, carga del spritesheet, drawSprite/drawFrame con ctx
lib/games/arkanoid/entities.ts                         // nuevo: bloques, explosiones, colisión AABB, dibujo
lib/games/arkanoid/input.ts                            // nuevo: teclas, ratón, attach/detach
lib/games/arkanoid/engine.ts                           // nuevo: createArkanoidGame
components/arkanoid-canvas.tsx                         // nuevo
lib/games/types.ts                                     // modificado: muted, jumpTo
lib/games/registry.ts                                  // modificado: entrada arkanoid, hasSound, levelJump
components/game-player.tsx                             // modificado: chip SONIDO, chips de salto de nivel en pausa
lib/home-data.ts                                       // modificado: "Bloque Buster" → "Arkanoid"
app/globals.css                                        // modificado: estilos del chip de sonido y chips de nivel
```

## Plan de implementación

1. **Guía y estado base** — leer en `node_modules/next/dist/docs/` Client Components y rutas dinámicas de Next 16; confirmar con `list_tables`/`select` el catálogo y revisar los `scores` de `bloque-buster`.
2. **Migración del catálogo y assets** — SQL en `supabase/migrations/` + `apply_migration`; copiar los 3 assets a `public/games/arkanoid/`; actualizar `lib/home-data.ts`. Verificar `/juegos/arkanoid` con la portada `cover-bricks`, que `/juegos/bloque-buster` da 404 y que el leaderboard queda vacío.
3. **Constantes, niveles y sprites** — portar `LEVELS`, constantes y tablas del spritesheet a TypeScript estricto; carga del PNG con promesa cancelable; `ctx` por parámetro.
4. **Entidades** — bloques, explosiones, colisión AABB y dibujo (paleta, pelota, bloques, pelotas de vida).
5. **Input** — `attachInput()` que devuelve la limpieza; `preventDefault` solo en `ArrowLeft`/`ArrowRight`; ignora `input`/`textarea`; ratón con escala `canvas.width / rect.width`.
6. **Motor** — estado en closure, update/draw, callbacks solo en cambios reales, audio con `setMuted`, `pause`/`resume`/`restart`/`jumpToLevel`/`destroy`, `dt` ≤ 50 ms, una sola salida de fin (win y game over llaman a `onGameOver` una vez).
7. **Componente `ArkanoidCanvas`** — montaje en `useEffect`, Strict Mode, `visibilitychange`, escalado 800×600, props `muted` y `jumpTo`.
8. **Registro y reproductor (jugable)** — ampliar `GameCanvasProps` y `GameEntry`, añadir la entrada `arkanoid` y los HUD de vidas/nivel; sin chips aún. Verificar partida completa de Arkanoid y que `asteroides` y `tetris` siguen igual.
9. **Chip de sonido** — `hasSound` en el reproductor con `av_muted` en `localStorage`; pasar `muted` al canvas. Verificar que solo aparece en Arkanoid.
10. **Salto de nivel** — `levelJump` en el overlay de pausa; pasar `jumpTo` al canvas; reanudar tras elegir. Verificar que se conservan score y vidas y que el nivel del HUD cambia.
11. **Pulido y verificación manual** — con `/frontend-design`; partida completa (mover con teclado y ratón, rebotes, romper bloques, perder vidas, pasar niveles, ganar, perder), guardar iniciales, ver marca en Salón, detalle y card, jugar de nuevo, salir y volver, escritorio y ancho móvil. Capturas en `.playwright-screenshot`.
12. **Cierre** — `get_advisors`, `npm run lint`, `npm run build`, `git status`; borrar con `execute_sql` las filas de prueba de `scores` con `game_id = 'arkanoid'`.

## Criterios de aceptación

- [ ] `/juegos/arkanoid/jugar` muestra el juego dentro del marco CRT (proporción 4:3) y la partida arranca sola con el nivel 1 completo y la pelota en movimiento sobre la paleta.
- [ ] `/juegos/bloque-buster` y `/juegos/bloque-buster/jugar` devuelven 404; no queda `bloque-buster`/`Bloque Buster` en `app/`, `lib/` ni `components/`.
- [ ] La biblioteca, el home, el detalle y el Salón muestran "ARKANOID" con la portada `cover-bricks`.
- [ ] `←`/`→` mueven la paleta a 400 px/s sin salirse del canvas; el ratón sobre el canvas la centra bajo el cursor sin salirse; la página no hace scroll con las flechas.
- [ ] Cada bloque roto suma exactamente 10 puntos; se rompe como máximo un bloque por frame.
- [ ] La pelota rebota en paredes, techo y paleta; en la paleta solo cuando baja.
- [ ] Perder la pelota resta 1 vida y la pelota reaparece sobre la paleta con la velocidad del nivel; la 3ª pérdida abre el modal de fin.
- [ ] Hay 5 niveles con los patrones y velocidades `1.00 / 1.10 / 1.21 / 1.33 / 1.46`; limpiar el nivel N<5 carga el N+1 conservando puntuación y vidas.
- [ ] Limpiar el nivel 5 abre el modal "FIN DEL JUEGO" con la puntuación correcta (máximo 3000 sin saltos de nivel); el botón FIN también lo abre.
- [ ] Solo hay explosión de 4 frames de 150 ms por bloque roto, incluido el bloque gris (usa los frames rojos, como el original).
- [ ] El HUD React muestra puntuación, vidas (3→0) y nivel del motor (01–05) en tiempo real; no muestra líneas; el canvas no dibuja Score, Nivel ni overlays, solo las pelotas de vida.
- [ ] Suena el rebote en paredes/techo/paleta y el sonido de rotura al romper bloque; no suena en pausa ni tras el fin.
- [ ] El chip `SONIDO` solo aparece en Arkanoid; al apagarlo no suena nada y la preferencia sobrevive a recargar; con `localStorage` bloqueado el juego funciona sin errores.
- [ ] PAUSA congela pelota, paleta y explosiones y REANUDAR continúa sin saltos; `P` y `Escape` alternan PAUSA/REANUDAR; cambiar de pestaña pausa. Con el modal abierto `P`/`Escape` no hacen nada.
- [ ] En pausa aparecen los chips `1`–`5` con el nivel actual resaltado; elegir uno carga ese nivel, conserva puntuación y vidas, actualiza el nivel del HUD y reanuda.
- [ ] Guardar iniciales válidas crea una fila en `scores` con `game_id: "arkanoid"`; iniciales inválidas se rechazan sin cerrar el modal; escribir en el input del modal no mueve la paleta.
- [ ] La marca aparece en `/salon?juego=arkanoid`, en el sidebar del detalle y en `best`/`plays` de la card.
- [ ] Sin partidas: estado vacío en Salón y detalle.
- [ ] JUGAR DE NUEVO reinicia score 0, 3 vidas, nivel 1 y rejilla completa sin duplicar loop, listeners ni sonidos (la velocidad no aumenta tras reiniciar); Strict Mode sin duplicados ni errores en consola.
- [ ] `asteroides` y `tetris` conservan comportamiento y HUD tras ampliar el registro; los demás juegos conservan el placeholder simulado.
- [ ] `games` contiene la fila `arkanoid` con `title: ARKANOID`, `category: ARCADE`, `color: cyan`, `cover: cover-bricks`, `sort_order: 1`, y ya no existe `bloque-buster`.
- [ ] El canvas escala en móvil sin desbordar y mantiene la proporción 4:3.
- [ ] `get_advisors` sin problemas críticos nuevos; `npm run lint` y `npm run build` pasan.

## Decisiones tomadas y descartadas

- **Sí:** reemplazar la fila `bloque-buster` por `arkanoid` (update de `id`) — el id debe coincidir con la ruta y con `lib/games/arkanoid`, como `caida` → `tetris`. **No:** insertar fila nueva (duplicaría el concepto) ni conservar el id `bloque-buster` (la ruta no diría Arkanoid).
- **Sí:** borrar los `scores` de `bloque-buster` antes del update — son pruebas de un placeholder y la FK no tiene `ON UPDATE CASCADE`. **No:** añadir `ON UPDATE CASCADE` (cambio de esquema fuera de alcance).
- **Sí:** reutilizar `.cover-bricks`. **No:** crear `.cover-arkanoid`.
- **Sí:** spritesheet PNG original servido desde `public/games/arkanoid/` — fidelidad con el original. **No:** reemplazarlo por rectángulos neón (cambia el aspecto del juego).
- **Sí:** incluir los dos sonidos del original, con chip de mute persistido (`av_muted`, prefijo `av_` como `av_block_style_*`). **No:** mute global del sitio ni volumen — spec aparte si se quiere audio en más juegos.
- **Sí:** mantener el selector de salto de nivel, pero como UI React en el overlay de pausa (chips `1`–`5`) conservando puntuación y vidas, como el original. **No:** botones dibujados en canvas con `click` por coordenadas (rompería la fuente única del estado `paused` en React).
- **Sí:** el ratón mueve la paleta como en el original. **No:** quitarlo ni usar pointer lock.
- **Sí:** `P` y `Escape` pausan vía `onTogglePause` hacia el reproductor — una sola fuente de verdad. **No:** pausa interna del motor ni overlay de pausa en canvas.
- **Sí:** win y game over abren el mismo modal con `onGameOver(score)`; máximo 3000 puntos, dentro de 0–9.999.999. **No:** bonus por vidas restantes (mecánica nueva).
- **Sí:** vidas en HUD React **y** pelotas dibujadas en canvas — decisión del usuario; el canvas conserva solo ese elemento del HUD original. **No:** dibujar también Score y Nivel en canvas (los muestra React).
- **Sí:** la paleta mide 81 px como en `game.js` aunque el sprite y el README digan 162. **No:** corregir a 162 (el código manda; cambiaría la dificultad).
- **Sí:** el bloque gris reutiliza los frames de explosión rojos, como el original. **No:** crear frames nuevos.
- **Sí:** motor TypeScript con `createArkanoidGame(canvas, callbacks)` — sin globals, limpieza al desmontar. **No:** `iframe` ni `next/script` con el `game.js` tal cual.
- **Sí:** tope de `dt` de 50 ms aunque el original no lo tenga — evita que la pelota atraviese bloques al volver a la pestaña. No altera la jugabilidad normal.
- **Sí:** guardado con `submitScore` existente y `games` como fuente del catálogo. **No:** tablas por juego ni localStorage para scores.
- **Sí:** campos opcionales `hasSound` y `levelJump` en `GameEntry` y `muted`/`jumpTo` en `GameCanvasProps`. **No:** ramas `if (game.id === "arkanoid")` en `game-player.tsx`.

## Riesgos identificados

| Riesgo                                                                   | Mitigación                                                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Strict Mode duplica loop, listeners o carga del spritesheet              | `destroy()` completo y carga cancelable; criterio de aceptación explícito.                                                                          |
| Teclas del juego interfieren con el input del modal                      | Ignorar eventos con target `input`/`textarea`; pausar al abrir el modal.                                                                            |
| `dt` grande al volver a la pestaña                                       | Tope de 50 ms y pausa con `visibilitychange`.                                                                                                       |
| El `update` del `id` falla por FK si hay `scores` de `bloque-buster`     | La migración borra primero esas filas; el paso 1 las revisa antes.                                                                                  |
| Autoplay bloqueado hasta el primer input (juego solo con ratón)          | `play().catch(() => {})`; el primer rebote tras un gesto ya suena.                                                                                  |
| Muchos `cloneNode().play()` seguidos saturan el audio                    | Un sonido por evento y un bloque por frame; aceptado igual que el original.                                                                         |
| Saltar niveles permite farmear puntos (volver al nivel 1 repetidamente)  | Aceptado: es la decisión del usuario de conservar el selector; el rango `CHECK` 0–9.999.999 acota el daño. Anti-trampas queda para el spec de Auth. |
| Spritesheet tarda en cargar y la partida arranca en negro                | El motor espera la imagen antes de iniciar el loop; el HUD muestra 0 y 3 vidas hasta entonces.                                                      |
| El rebote de paleta sin ángulo puede dejar la pelota en bucles infinitos | Fiel al original; no se altera la física (fuera de alcance).                                                                                        |
| Ampliar `GameEntry`/`GameCanvasProps` rompe `asteroides` o `tetris`      | Campos opcionales; paso 8 y criterio de aceptación verifican ambos.                                                                                 |
| Scores falsos con clave publishable                                      | Aceptado hasta el spec de Auth; `CHECK`s de formato y rango.                                                                                        |
| Un solo proyecto Supabase para dev y prod                                | Limpiar filas de prueba de `scores` al cerrar (paso 12).                                                                                            |
| Un `id`/slug distinto del `id` de `games` rompe la ruta                  | La fila, la carpeta `lib/games/arkanoid` y `public/games/arkanoid` usan el mismo slug.                                                              |

## Qué **no** está en este spec

- Táctil, pantalla completa, guardado de partida.
- Mute global, volumen, música y sonidos extra.
- Power-ups, ángulo de rebote, bloques resistentes, niveles extra y cualquier cambio de mecánica o puntuación.
- Bonus por vidas al ganar.
- Auth/anti-trampas y scores ligados a usuario.
- Los demás juegos del catálogo.
- Pruebas automatizadas.
